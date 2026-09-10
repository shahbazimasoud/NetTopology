"""
SSH Connection Manager & Device Session Registry
Provides thread-safe session pooling, connection lifecycle management,
lazy connection instantiation, and session reuse per device.
"""
import time
import socket
import threading
import uuid
from typing import Dict, Any, Optional
from backend.drivers import get_driver

class DeviceSession:
    def __init__(self, device_id: str, host: str, port: int, username: str, platform: str, mode: str = "ssh"):
        self.session_id = f"sess-{uuid.uuid4().hex[:8]}"
        self.device_id = device_id
        self.host = host
        self.port = port
        self.username = username
        self.platform = platform
        self.mode = mode  # 'ssh' or 'simulator'
        self.connected_at = time.time()
        self.last_activity = time.time()
        self.paramiko_client = None
        self.shell_channel = None
        self.banner = ""
        self.latency_ms = 0.0
        self.is_real = False
        self.status = "connected"

    def is_alive(self, timeout_seconds: int = 600) -> bool:
        if self.status != "connected":
            return False
        if time.time() - self.last_activity > timeout_seconds:
            return False
        if self.mode == "simulator":
            return True
        if self.paramiko_client:
            try:
                transport = self.paramiko_client.get_transport()
                return transport is not None and transport.is_active()
            except Exception:
                return False
        return False

    def close(self):
        self.status = "closed"
        if self.shell_channel:
            try:
                self.shell_channel.close()
            except Exception:
                pass
            self.shell_channel = None
        if self.paramiko_client:
            try:
                self.paramiko_client.close()
            except Exception:
                pass
            self.paramiko_client = None

class SSHConnectionManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(SSHConnectionManager, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return
        self.sessions: Dict[str, DeviceSession] = {}
        self.sessions_lock = threading.Lock()
        self._initialized = True
        print("[SSHConnectionManager] Initialized. Ready for on-demand lazy connections.")

    def get_session(self, device_id: str) -> Optional[DeviceSession]:
        with self.sessions_lock:
            sess = self.sessions.get(device_id)
            if sess and sess.is_alive():
                return sess
            elif sess:
                sess.close()
                del self.sessions[device_id]
            return None

    def is_connected(self, device_id: str) -> bool:
        sess = self.get_session(device_id)
        return sess is not None and sess.status == "connected"

    def get_or_create_session(self, device: Dict[str, Any], force_reconnect: bool = False) -> DeviceSession:
        device_id = device.get("id", "")
        with self.sessions_lock:
            existing = self.sessions.get(device_id)
            if existing and existing.is_alive() and not force_reconnect:
                existing.last_activity = time.time()
                return existing
            if existing:
                existing.close()
                self.sessions.pop(device_id, None)

        # Connection details
        conn = device.get("connection", {})
        host = conn.get("host") or device.get("ssh_host") or device.get("ip", "")
        port = int(conn.get("port") or device.get("ssh_port") or 22)
        username = conn.get("username") or device.get("ssh_username") or "admin"
        password = conn.get("password") or device.get("ssh_password") or ""
        platform = device.get("platform", "cisco_ios_xe")
        conn_mode = device.get("connection_mode", "ssh")

        session = DeviceSession(device_id, host, port, username, platform, mode=conn_mode)

        if conn_mode == "simulator":
            session.is_real = False
            session.latency_ms = 1.5
            session.banner = f"Simulated OS ({platform}) for {host}:{port}"
            with self.sessions_lock:
                self.sessions[device_id] = session
            return session

        # Real SSH Attempt via Paramiko
        start_t = time.time()
        connected = False
        banner = ""
        p_client = None

        try:
            import paramiko
            p_client = paramiko.SSHClient()
            p_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            p_client.connect(
                hostname=host,
                port=port,
                username=username,
                password=password,
                timeout=4.0,
                look_for_keys=False,
                allow_agent=False
            )
            connected = True
            transport = p_client.get_transport()
            banner = transport.get_banner() if transport else f"SSH-2.0-Device ({platform})"
            if isinstance(banner, bytes):
                banner = banner.decode('utf-8', errors='ignore')
        except Exception as err:
            connected = False
            err_msg = str(err)
            if p_client:
                try:
                    p_client.close()
                except Exception:
                    pass
                p_client = None

        session.latency_ms = round((time.time() - start_t) * 1000, 1)

        if connected and p_client:
            session.is_real = True
            session.paramiko_client = p_client
            session.banner = banner or f"SSH-2.0 / {platform} connected"
            session.status = "connected"
        else:
            # Fallback to emulator if hardware is temporarily unreachable
            session.is_real = False
            session.banner = f"Fallback session for {host}:{port} ({platform})"
            session.status = "connected"

        with self.sessions_lock:
            self.sessions[device_id] = session

        return session

    def execute_command(self, device: Dict[str, Any], command: str) -> Dict[str, Any]:
        device_id = device.get("id", "")
        session = self.get_or_create_session(device)
        session.last_activity = time.time()
        start_t = time.time()

        if session.is_real and session.paramiko_client:
            try:
                stdin, stdout, stderr = session.paramiko_client.exec_command(command, timeout=8)
                out = stdout.read().decode('utf-8', errors='ignore')
                err = stderr.read().decode('utf-8', errors='ignore')
                duration = round((time.time() - start_t) * 1000, 1)
                full_out = out if not err else (f"{out}\n{err}" if out else err)
                return {
                    "success": True,
                    "output": full_out,
                    "isReal": True,
                    "durationMs": duration,
                    "exitCode": stdout.channel.recv_exit_status() if stdout.channel else 0
                }
            except Exception as e:
                # If command execution failed on connection, mark session for reconnect
                session.close()
                with self.sessions_lock:
                    self.sessions.pop(device_id, None)
                return {
                    "success": False,
                    "output": f"SSH Execution Error: {str(e)}",
                    "isReal": True,
                    "durationMs": round((time.time() - start_t) * 1000, 1)
                }

        # Emulated execution via platform SimulatorDriver
        driver = get_driver(device.get("platform", "cisco_ios_xe"), connection_mode="simulator")
        sim_res = driver.execute_simulated_command(device, [], command)
        sim_res["isReal"] = False
        sim_res["durationMs"] = round((time.time() - start_t) * 1000, 1)
        return sim_res

    def close_session(self, device_id: str) -> bool:
        with self.sessions_lock:
            sess = self.sessions.pop(device_id, None)
            if sess:
                sess.close()
                return True
        return False

    def close_all(self):
        with self.sessions_lock:
            for s in self.sessions.values():
                s.close()
            self.sessions.clear()

# Global Singleton
connection_manager = SSHConnectionManager()
