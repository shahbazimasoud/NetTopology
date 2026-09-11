"""
MikroTik OpenVPN Provider
Supports OpenVPN Server (TCP/UDP, SSL/TLS Certificates, Auth & Cipher suites) and Client modes
with RouterOS v7 vs v6 capability awareness.
"""
import re
import ipaddress
from typing import Dict, Any, List, Optional
from backend.vpn.base import VPNProvider

class MikroTikOpenVPNProvider(VPNProvider):
    vpn_type = "openvpn"
    supported_modes = ["remote_access", "client"]

    def get_capabilities(self, device: Dict[str, Any]) -> Dict[str, Any]:
        firmware = device.get("firmware", "RouterOS v7.14.3 (stable)")
        is_v7 = "7." in firmware or "v7" in firmware.lower()

        return {
            "vpn_type": self.vpn_type,
            "name": "OpenVPN (SSL/TLS)",
            "description": "Enterprise-grade SSL/TLS virtual private network supporting user authentication and PKI certificates.",
            "supported_modes": [
                {
                    "mode": "remote_access",
                    "label": "OpenVPN Server",
                    "description": "SSL VPN Server for road-warriors and OpenVPN community clients.",
                    "default_port": 1194
                },
                {
                    "mode": "client",
                    "label": "OpenVPN Client",
                    "description": "Connect to external OpenVPN access servers or corporate endpoints.",
                    "default_port": 1194
                }
            ],
            "supports_udp": is_v7,
            "supports_gcm_ciphers": is_v7,
            "requires_certificate": True,
            "default_port": 1194,
            "protocols": ["udp", "tcp"] if is_v7 else ["tcp"],
            "ciphers": ["aes256-gcm", "aes128-gcm", "aes256-cbc", "aes128-cbc"] if is_v7 else ["aes256-cbc", "aes128-cbc", "blowfish128"],
            "auth_algorithms": ["sha256", "sha512", "sha1"],
            "routeros_major_version": 7 if is_v7 else 6
        }

    def validate(
        self,
        device: Dict[str, Any],
        mode: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        errors = []
        warnings = []

        firmware = device.get("firmware", "")
        is_v7 = "7." in firmware or "v7" in firmware.lower()

        if mode not in self.supported_modes:
            errors.append(f"Mode '{mode}' is not supported for OpenVPN. Supported: {self.supported_modes}")
            return {"valid": False, "errors": errors, "warnings": warnings}

        proto = str(config.get("protocol", "tcp")).lower()
        if proto == "udp" and not is_v7 and "v6" in firmware.lower():
            errors.append("OpenVPN over UDP requires RouterOS v7. RouterOS v6 only supports TCP.")

        if mode == "remote_access":
            cert = str(config.get("certificate", "")).strip()
            if not cert:
                errors.append("SSL Server Certificate is required for OpenVPN Server.")

            pool_range = str(config.get("pool_range", "")).strip()
            if not pool_range:
                errors.append("Address pool range is required (e.g. 10.8.0.10-10.8.0.100).")

            local_addr = str(config.get("local_address", "")).strip()
            if not local_addr:
                errors.append("Gateway local IP is required (e.g. 10.8.0.1).")
            else:
                try:
                    ipaddress.IPv4Address(local_addr)
                except ValueError:
                    errors.append(f"Invalid local gateway IP: '{local_addr}'")

            users = config.get("users", [])
            if not users or len(users) == 0:
                errors.append("At least one OpenVPN user account is required.")

        elif mode == "client":
            name = str(config.get("name", "")).strip()
            if not name:
                errors.append("Client interface name is required (e.g. 'ovpn-out1').")
            elif not re.match(r'^[a-zA-Z0-9_\-]+$', name):
                errors.append(f"Interface name '{name}' contains invalid characters.")

            connect_to = str(config.get("connect_to", "")).strip()
            if not connect_to:
                errors.append("Remote OpenVPN Server IP/Host (connect-to) is required.")

            user = str(config.get("user", "")).strip()
            pwd = str(config.get("password", "")).strip()
            if not user or not pwd:
                errors.append("Username and password are required for OpenVPN client.")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }

    def generate_configuration(
        self,
        device: Dict[str, Any],
        mode: str,
        config: Dict[str, Any],
        mask_secrets: bool = False
    ) -> List[str]:
        commands: List[str] = []

        firmware = device.get("firmware", "")
        is_v7 = "7." in firmware or "v7" in firmware.lower()

        if mode == "remote_access":
            pool_name = str(config.get("pool_name", "pool-ovpn")).strip()
            pool_range = str(config.get("pool_range", "10.8.0.10-10.8.0.100")).strip()
            profile_name = str(config.get("profile_name", "profile-ovpn")).strip()
            local_addr = str(config.get("local_address", "10.8.0.1")).strip()
            dns_servers = str(config.get("dns_servers", "8.8.8.8,1.1.1.1")).strip()
            cert = str(config.get("certificate", "ovpn-server-cert")).strip()
            port = int(config.get("port", 1194))
            proto = str(config.get("protocol", "tcp")).lower()
            if not is_v7 and proto == "udp":
                proto = "tcp"

            cipher = str(config.get("cipher", "aes256" if not is_v7 else "aes256-gcm")).strip()
            auth = str(config.get("auth", "sha256")).strip()
            req_client_cert = "yes" if config.get("require_client_certificate", False) else "no"

            # 1. IP Pool
            commands.append(f'/ip pool add name="{pool_name}" ranges={pool_range} comment="OpenVPN Pool"')

            # 2. PPP Profile
            commands.append(
                f'/ppp profile add name="{profile_name}" local-address={local_addr} remote-address="{pool_name}" '
                f'dns-server="{dns_servers}" use-encryption=yes comment="OpenVPN Profile"'
            )

            # 3. OpenVPN Server
            if is_v7:
                commands.append(
                    f'/interface ovpn-server server set enabled=yes port={port} protocol={proto} '
                    f'certificate="{cert}" default-profile="{profile_name}" auth={auth} cipher={cipher} '
                    f'require-client-certificate={req_client_cert}'
                )
            else:
                commands.append(
                    f'/interface ovpn-server server set enabled=yes port={port} '
                    f'certificate="{cert}" default-profile="{profile_name}" auth={auth} cipher={cipher} '
                    f'require-client-certificate={req_client_cert}'
                )

            # 4. PPP Secrets
            users = config.get("users", [])
            for u in users:
                uname = str(u.get("username", "")).strip()
                pwd = str(u.get("password", "")).strip()
                pwd_display = "********" if mask_secrets else pwd.replace('"', '\\"')
                if uname:
                    commands.append(
                        f'/ppp secret add name="{uname}" password="{pwd_display}" profile="{profile_name}" '
                        f'service=ovpn comment="OpenVPN Client"'
                    )

        elif mode == "client":
            name = str(config.get("name", "ovpn-out1")).strip()
            connect_to = str(config.get("connect_to", "")).strip()
            port = int(config.get("port", 1194))
            user = str(config.get("user", "")).strip()
            pwd = str(config.get("password", "")).strip()
            pwd_display = "********" if mask_secrets else pwd.replace('"', '\\"')
            proto = str(config.get("protocol", "tcp")).lower()
            auth = str(config.get("auth", "sha256")).strip()
            cipher = str(config.get("cipher", "aes256" if not is_v7 else "aes256-gcm")).strip()
            add_def_route = "yes" if config.get("add_default_route", False) else "no"

            client_cmd = (
                f'/interface ovpn-client add name="{name}" connect-to="{connect_to}" port={port} '
                f'user="{user}" password="{pwd_display}" auth={auth} cipher={cipher} '
                f'add-default-route={add_def_route} disabled=no comment="OpenVPN Client"'
            )
            if is_v7:
                client_cmd += f' protocol={proto}'
            commands.append(client_cmd)

        return commands

    def apply(
        self,
        device: Dict[str, Any],
        session: Any,
        mode: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        val = self.validate(device, mode, config)
        if not val["valid"]:
            return {
                "success": False,
                "error": "Validation failed: " + "; ".join(val["errors"]),
                "validation_errors": val["errors"]
            }

        raw_commands = self.generate_configuration(device, mode, config, mask_secrets=False)
        preview_commands = self.generate_configuration(device, mode, config, mask_secrets=True)

        from backend.connections.ssh_manager import connection_manager

        name = str(config.get("name", config.get("profile_name", "ovpn-server"))).strip()
        rollback_stack = []

        if mode == "remote_access":
            prof = str(config.get("profile_name", "profile-ovpn")).strip()
            pool = str(config.get("pool_name", "pool-ovpn")).strip()
            rollback_stack = [
                ('/interface ovpn-server server set enabled=no', 'Disable OpenVPN Server'),
                (f'/ppp secret remove [find profile="{prof}"]', f'Remove PPP Secrets in {prof}'),
                (f'/ppp profile remove [find name="{prof}"]', f'Remove PPP Profile {prof}'),
                (f'/ip pool remove [find name="{pool}"]', f'Remove IP Pool {pool}')
            ]
        else:
            rollback_stack = [
                (f'/interface ovpn-client remove [find name="{name}"]', f'Remove OpenVPN Client {name}')
            ]

        applied_steps = []
        failed_step = None
        error_message = None

        for idx, cmd in enumerate(raw_commands):
            step_desc = preview_commands[idx] if idx < len(preview_commands) else f"Step {idx + 1}"
            res = connection_manager.execute_command(device, cmd)
            out = res.get("output", "")
            is_err = not res.get("success", False) or "failure:" in out.lower() or "syntax error" in out.lower() or "bad command" in out.lower()

            if is_err:
                failed_step = {
                    "step_index": idx + 1,
                    "command": step_desc,
                    "error": out.strip() or "RouterOS command failed"
                }
                error_message = out.strip() or f"Failed executing command: {step_desc}"
                break
            else:
                applied_steps.append({
                    "step": idx + 1,
                    "command": step_desc,
                    "status": "success"
                })

        if failed_step:
            rollback_executed = []
            for rb_cmd, rb_title in rollback_stack:
                try:
                    rb_res = connection_manager.execute_command(device, rb_cmd)
                    rollback_executed.append({
                        "action": rb_title,
                        "success": rb_res.get("success", True)
                    })
                except Exception as e:
                    rollback_executed.append({
                        "action": rb_title,
                        "success": False,
                        "error": str(e)
                    })

            return {
                "success": False,
                "error": error_message,
                "failed_step": failed_step,
                "applied_steps": applied_steps,
                "rollback": {
                    "attempted": True,
                    "success": all(r.get("success") for r in rollback_executed),
                    "steps": rollback_executed
                }
            }

        verification = self.verify(device, session, name, config)

        return {
            "success": True,
            "vpn_id": name,
            "vpn_type": self.vpn_type,
            "mode": mode,
            "applied_steps": applied_steps,
            "verification": verification,
            "message": f"OpenVPN '{name}' successfully provisioned and running."
        }

    def verify(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_id: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        from backend.connections.ssh_manager import connection_manager

        server_res = connection_manager.execute_command(device, '/interface ovpn-server server print detail without-paging')
        server_out = server_res.get("output", "")

        active_res = connection_manager.execute_command(device, '/ppp active print detail where service=ovpn without-paging')
        active_out = active_res.get("output", "")

        client_res = connection_manager.execute_command(device, f'/interface ovpn-client print detail where name="{vpn_id}" without-paging')
        client_out = client_res.get("output", "")

        is_server_enabled = "enabled: yes" in server_out.lower() or "enabled=yes" in server_out.lower()
        active_count = len(re.findall(r'name="?([^\s\n]+)"?', active_out))
        is_client_running = "running: yes" in client_out.lower() or "running=yes" in client_out.lower()

        operational_status = "down"
        if is_server_enabled:
            operational_status = "up" if active_count > 0 else "listening"
        elif is_client_running:
            operational_status = "up"

        return {
            "vpn_id": vpn_id,
            "vpn_type": self.vpn_type,
            "operational_status": operational_status,
            "is_server_enabled": is_server_enabled,
            "active_clients_count": active_count,
            "is_client_running": is_client_running
        }

    def get_status(self, device: Dict[str, Any], session: Any) -> List[Dict[str, Any]]:
        from backend.connections.ssh_manager import connection_manager
        results: List[Dict[str, Any]] = []

        server_res = connection_manager.execute_command(device, '/interface ovpn-server server print detail without-paging')
        server_out = server_res.get("output", "")
        if "enabled: yes" in server_out.lower() or "enabled=yes" in server_out.lower():
            active_res = connection_manager.execute_command(device, '/ppp active print detail where service=ovpn without-paging')
            active_out = active_res.get("output", "")
            active_users = re.findall(r'name="?([^\s\n]+)"?', active_out)

            m_port = re.search(r'port=(\d+)', server_out)
            port = int(m_port.group(1)) if m_port else 1194

            results.append({
                "id": "ovpn-server",
                "name": "OpenVPN Server",
                "type": "openvpn",
                "mode": "remote_access",
                "status": "up" if len(active_users) > 0 else "listening",
                "local_address": f"{device.get('ip', '0.0.0.0')}:{port}",
                "remote_address": "SSL Clients",
                "active_users_count": len(active_users),
                "uptime": "Active Service",
                "port": port
            })

        client_res = connection_manager.execute_command(device, '/interface ovpn-client print detail without-paging')
        client_out = client_res.get("output", "")
        blocks = client_out.split("\n\n")
        for blk in blocks:
            m_name = re.search(r'name="?([^"\s\n]+)"?', blk)
            if m_name:
                cname = m_name.group(1)
                m_conn = re.search(r'connect-to="?([^"\s\n]+)"?', blk)
                conn = m_conn.group(1) if m_conn else "Unknown"
                is_run = "running: yes" in blk.lower() or "running=yes" in blk.lower()
                is_dis = "disabled: yes" in blk.lower() or "disabled=yes" in blk.lower()
                results.append({
                    "id": cname,
                    "name": cname,
                    "type": "openvpn",
                    "mode": "client",
                    "status": "disabled" if is_dis else ("up" if is_run else "down"),
                    "local_address": device.get("ip", "0.0.0.0"),
                    "remote_address": conn,
                    "uptime": "Connected" if is_run else "Disconnected"
                })

        return results

    def delete(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_id: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        from backend.connections.ssh_manager import connection_manager

        if vpn_id == "ovpn-server":
            connection_manager.execute_command(device, '/interface ovpn-server server set enabled=no')
            connection_manager.execute_command(device, '/ppp secret remove [find service=ovpn]')
            connection_manager.execute_command(device, '/ppp profile remove [find name="profile-ovpn"]')
            connection_manager.execute_command(device, '/ip pool remove [find name="pool-ovpn"]')
            return {"success": True, "message": "OpenVPN Server disabled."}
        else:
            connection_manager.execute_command(device, f'/interface ovpn-client remove [find name="{vpn_id}"]')
            return {"success": True, "message": f"OpenVPN Client '{vpn_id}' removed."}
