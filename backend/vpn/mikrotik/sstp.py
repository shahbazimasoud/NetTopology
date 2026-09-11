"""
MikroTik SSTP (Secure Socket Tunneling Protocol) VPN Provider
Implements Remote Access Server (over HTTPS/443 with SSL Certificate) and Client modes
for MikroTik RouterOS v6 and v7.
"""
import re
import ipaddress
from typing import Dict, Any, List, Optional
from backend.vpn.base import VPNProvider

class MikroTikSSTPProvider(VPNProvider):
    vpn_type = "sstp"
    supported_modes = ["remote_access", "client"]

    def get_capabilities(self, device: Dict[str, Any]) -> Dict[str, Any]:
        firmware = device.get("firmware", "RouterOS v7.14.3 (stable)")
        is_v7 = "7." in firmware or "v7" in firmware.lower()
        return {
            "vpn_type": self.vpn_type,
            "name": "SSTP (Secure Socket Tunneling)",
            "description": "Encapsulates PPP traffic over HTTPS (TCP 443). Bypasses strict firewalls and NAT using SSL certificates.",
            "supported_modes": [
                {
                    "mode": "remote_access",
                    "label": "Remote Access SSTP Server",
                    "description": "Allow remote workers and branch clients to connect securely over port 443 with certificate authentication.",
                    "default_port": 443
                },
                {
                    "mode": "client",
                    "label": "SSTP Client (Dial-out)",
                    "description": "Establish an outgoing SSTP tunnel to a central corporate router or cloud gateway over HTTPS.",
                    "default_port": 443
                }
            ],
            "requires_certificate": True,
            "default_port": 443,
            "protocols_supported": ["mschap2", "mschap1", "chap", "pap"],
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

        if mode not in self.supported_modes:
            errors.append(f"Mode '{mode}' is not supported for SSTP. Supported: {self.supported_modes}")
            return {"valid": False, "errors": errors, "warnings": warnings}

        if mode == "remote_access":
            cert = str(config.get("certificate", "")).strip()
            if not cert:
                errors.append("SSL Certificate is required for SSTP Server. Please import or select a certificate from the router.")

            pool_range = str(config.get("pool_range", "")).strip()
            if not pool_range:
                errors.append("Address Pool Range is required (e.g. 192.168.89.10-192.168.89.50).")

            local_addr = str(config.get("local_address", "")).strip()
            if not local_addr:
                errors.append("Router Gateway Local IP is required (e.g. 192.168.89.1).")
            else:
                try:
                    ipaddress.IPv4Address(local_addr)
                except ValueError:
                    errors.append(f"Invalid local gateway IP address: '{local_addr}'")

            users = config.get("users", [])
            if not users or len(users) == 0:
                errors.append("At least one VPN user credential (username & password) is required.")
            else:
                for idx, u in enumerate(users):
                    uname = str(u.get("username", "")).strip()
                    pwd = str(u.get("password", "")).strip()
                    if not uname:
                        errors.append(f"User #{idx + 1} must have a valid username.")
                    if not pwd or len(pwd) < 4:
                        errors.append(f"User '{uname or idx + 1}' must have a password with at least 4 characters.")

        elif mode == "client":
            name = str(config.get("name", "")).strip()
            if not name:
                errors.append("Client interface name is required (e.g. 'sstp-out1').")
            elif not re.match(r'^[a-zA-Z0-9_\-]+$', name):
                errors.append(f"Client interface name '{name}' contains invalid characters.")

            connect_to = str(config.get("connect_to", "")).strip()
            if not connect_to:
                errors.append("Remote SSTP Server Host/IP (connect-to) is required.")

            user = str(config.get("user", "")).strip()
            pwd = str(config.get("password", "")).strip()
            if not user:
                errors.append("Username is required for SSTP client.")
            if not pwd:
                errors.append("Password is required for SSTP client.")

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

        if mode == "remote_access":
            pool_name = str(config.get("pool_name", "pool-sstp-vpn")).strip()
            pool_range = str(config.get("pool_range", "192.168.89.10-192.168.89.50")).strip()
            profile_name = str(config.get("profile_name", "profile-sstp")).strip()
            local_addr = str(config.get("local_address", "192.168.89.1")).strip()
            dns_servers = str(config.get("dns_servers", "8.8.8.8,1.1.1.1")).strip()
            cert = str(config.get("certificate", "sstp-cert")).strip()
            port = int(config.get("port", 443))
            auth = str(config.get("authentication", "mschap2")).strip()

            # 1. IP Pool
            commands.append(f'/ip pool add name="{pool_name}" ranges={pool_range} comment="SSTP Remote Clients Pool"')

            # 2. PPP Profile
            commands.append(
                f'/ppp profile add name="{profile_name}" local-address={local_addr} remote-address="{pool_name}" '
                f'dns-server="{dns_servers}" use-encryption=yes comment="SSTP VPN Profile"'
            )

            # 3. SSTP Server enable
            commands.append(
                f'/interface sstp-server server set enabled=yes port={port} default-profile="{profile_name}" '
                f'certificate="{cert}" authentication={auth}'
            )

            # 4. PPP Secrets (Users)
            users = config.get("users", [])
            for u in users:
                uname = str(u.get("username", "")).strip()
                pwd = str(u.get("password", "")).strip()
                pwd_display = "********" if mask_secrets else pwd.replace('"', '\\"')
                if uname:
                    commands.append(
                        f'/ppp secret add name="{uname}" password="{pwd_display}" profile="{profile_name}" '
                        f'service=sstp comment="SSTP Client User"'
                    )

            # 5. Optional static routes
            for r in config.get("routes", []):
                dst = str(r.get("dst", "")).strip()
                if dst:
                    commands.append(f'/ip route add dst-address={dst} gateway={local_addr} comment="Route to SSTP Network"')

        elif mode == "client":
            name = str(config.get("name", "sstp-out1")).strip()
            connect_to = str(config.get("connect_to", "")).strip()
            port = int(config.get("port", 443))
            user = str(config.get("user", "")).strip()
            pwd = str(config.get("password", "")).strip()
            pwd_display = "********" if mask_secrets else pwd.replace('"', '\\"')
            verify_cert = "yes" if config.get("verify_server_certificate", False) else "no"
            add_def_route = "yes" if config.get("add_default_route", False) else "no"
            profile = str(config.get("profile", "default-encryption")).strip()

            commands.append(
                f'/interface sstp-client add name="{name}" connect-to="{connect_to}" port={port} '
                f'user="{user}" password="{pwd_display}" profile="{profile}" '
                f'verify-server-certificate={verify_cert} add-default-route={add_def_route} disabled=no comment="SSTP Dial-out Tunnel"'
            )

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

        applied_steps = []
        failed_step = None
        error_message = None

        from backend.connections.ssh_manager import connection_manager

        name = str(config.get("name", config.get("profile_name", "sstp-server"))).strip()

        # Build rollback stack
        rollback_stack = []
        if mode == "remote_access":
            prof = str(config.get("profile_name", "profile-sstp")).strip()
            pool = str(config.get("pool_name", "pool-sstp-vpn")).strip()
            rollback_stack = [
                ('/interface sstp-server server set enabled=no', 'Disable SSTP Server'),
                (f'/ppp secret remove [find profile="{prof}"]', f'Remove PPP Secrets in {prof}'),
                (f'/ppp profile remove [find name="{prof}"]', f'Remove PPP Profile {prof}'),
                (f'/ip pool remove [find name="{pool}"]', f'Remove IP Pool {pool}')
            ]
        else:
            rollback_stack = [
                (f'/interface sstp-client remove [find name="{name}"]', f'Remove SSTP Client {name}')
            ]

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
            "message": f"MikroTik SSTP VPN '{name}' successfully provisioned and verified."
        }

    def verify(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_id: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        from backend.connections.ssh_manager import connection_manager

        # Query SSTP Server status
        server_res = connection_manager.execute_command(device, '/interface sstp-server server print detail without-paging')
        server_out = server_res.get("output", "")

        # Query active PPP connections
        active_res = connection_manager.execute_command(device, '/ppp active print detail where service=sstp without-paging')
        active_out = active_res.get("output", "")

        # Query SSTP client interfaces
        client_res = connection_manager.execute_command(device, f'/interface sstp-client print detail where name="{vpn_id}" without-paging')
        client_out = client_res.get("output", "")

        is_server_enabled = "enabled: yes" in server_out.lower() or "enabled=yes" in server_out.lower()
        active_count = len(re.findall(r'name="?([^\s\n]+)"?', active_out))

        is_client_running = "running: yes" in client_out.lower() or "running=yes" in client_out.lower()
        is_client_disabled = "disabled: yes" in client_out.lower() or "disabled=yes" in client_out.lower()

        operational_status = "down"
        if is_server_enabled:
            operational_status = "up" if active_count > 0 else "listening"
        elif is_client_running:
            operational_status = "up"
        elif is_client_disabled:
            operational_status = "disabled"

        return {
            "vpn_id": vpn_id,
            "vpn_type": self.vpn_type,
            "operational_status": operational_status,
            "is_server_enabled": is_server_enabled,
            "active_clients_count": active_count,
            "is_client_running": is_client_running,
            "details": {
                "server_config": server_out.strip()[:200] if server_out else "",
                "active_sessions": active_out.strip()[:200] if active_out else ""
            }
        }

    def get_status(self, device: Dict[str, Any], session: Any) -> List[Dict[str, Any]]:
        from backend.connections.ssh_manager import connection_manager
        results: List[Dict[str, Any]] = []

        server_res = connection_manager.execute_command(device, '/interface sstp-server server print detail without-paging')
        server_out = server_res.get("output", "")
        if "enabled: yes" in server_out.lower() or "enabled=yes" in server_out.lower():
            active_res = connection_manager.execute_command(device, '/ppp active print detail where service=sstp without-paging')
            active_out = active_res.get("output", "")
            active_users = re.findall(r'name="?([^\s\n]+)"?', active_out)

            results.append({
                "id": "sstp-server",
                "name": "SSTP Server",
                "type": "sstp",
                "mode": "remote_access",
                "status": "up" if len(active_users) > 0 else "listening",
                "local_address": device.get("ip", "0.0.0.0"),
                "remote_address": "SSL Clients (TCP 443)",
                "active_users_count": len(active_users),
                "uptime": "Active Service",
                "port": 443
            })

        client_res = connection_manager.execute_command(device, '/interface sstp-client print detail without-paging')
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
                    "type": "sstp",
                    "mode": "client",
                    "status": "disabled" if is_dis else ("up" if is_run else "down"),
                    "local_address": device.get("ip", "0.0.0.0"),
                    "remote_address": conn,
                    "uptime": "Running" if is_run else "Disconnected"
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

        if vpn_id == "sstp-server":
            connection_manager.execute_command(device, '/interface sstp-server server set enabled=no')
            connection_manager.execute_command(device, '/ppp secret remove [find service=sstp]')
            connection_manager.execute_command(device, '/ppp profile remove [find name="profile-sstp"]')
            connection_manager.execute_command(device, '/ip pool remove [find name="pool-sstp-vpn"]')
            return {"success": True, "message": "SSTP Server disabled and configurations cleaned up."}
        else:
            res = connection_manager.execute_command(device, f'/interface sstp-client remove [find name="{vpn_id}"]')
            return {"success": True, "message": f"SSTP client interface '{vpn_id}' removed."}
