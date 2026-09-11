"""
MikroTik PPTP (Point-to-Point Tunneling Protocol) VPN Provider
Implements Remote Access PPTP Server and Client modes for RouterOS v6 and v7.
Note: PPTP uses MS-CHAPv2 and RC4 (MPPE) which are cryptographically broken.
This provider includes strict warnings and legacy flags.
"""
import re
import ipaddress
from typing import Dict, Any, List, Optional
from backend.vpn.base import VPNProvider

class MikroTikPPTPProvider(VPNProvider):
    vpn_type = "pptp"
    supported_modes = ["remote_access", "client"]

    def get_capabilities(self, device: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "vpn_type": self.vpn_type,
            "name": "PPTP (Point-to-Point Tunneling Protocol)",
            "description": "Legacy VPN protocol over TCP 1723 and GRE (protocol 47). Inherently insecure; use only for legacy compatibility.",
            "supported_modes": [
                {
                    "mode": "remote_access",
                    "label": "PPTP Server (Legacy)",
                    "description": "Provide legacy remote dial-in for older Windows XP/7 or embedded clients.",
                    "default_port": 1723
                },
                {
                    "mode": "client",
                    "label": "PPTP Client (Dial-out)",
                    "description": "Dial out to a legacy PPTP server endpoint.",
                    "default_port": 1723
                }
            ],
            "security_rating": "insecure",
            "is_deprecated": True,
            "security_warning": "Warning: PPTP is considered cryptographically insecure and vulnerable to offline dictionary attacks. Use WireGuard, L2TP/IPsec, or SSTP instead.",
            "default_port": 1723
        }

    def validate(
        self,
        device: Dict[str, Any],
        mode: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        errors = []
        warnings = [
            "PPTP is considered insecure and should only be used when legacy compatibility is strictly required."
        ]

        if mode not in self.supported_modes:
            errors.append(f"Mode '{mode}' is not supported for PPTP. Supported: {self.supported_modes}")
            return {"valid": False, "errors": errors, "warnings": warnings}

        if mode == "remote_access":
            pool_range = str(config.get("pool_range", "")).strip()
            if not pool_range:
                errors.append("Address Pool Range is required (e.g. 192.168.77.10-192.168.77.50).")

            local_addr = str(config.get("local_address", "")).strip()
            if not local_addr:
                errors.append("Router Gateway Local IP is required (e.g. 192.168.77.1).")
            else:
                try:
                    ipaddress.IPv4Address(local_addr)
                except ValueError:
                    errors.append(f"Invalid local gateway IP: '{local_addr}'")

            users = config.get("users", [])
            if not users or len(users) == 0:
                errors.append("At least one PPTP user credential (username & password) is required.")

        elif mode == "client":
            name = str(config.get("name", "")).strip()
            if not name:
                errors.append("Client interface name is required (e.g. 'pptp-out1').")
            elif not re.match(r'^[a-zA-Z0-9_\-]+$', name):
                errors.append(f"Interface name '{name}' contains invalid characters.")

            connect_to = str(config.get("connect_to", "")).strip()
            if not connect_to:
                errors.append("Remote PPTP Server IP/Host (connect-to) is required.")

            user = str(config.get("user", "")).strip()
            pwd = str(config.get("password", "")).strip()
            if not user or not pwd:
                errors.append("Both username and password are required for PPTP client.")

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
            pool_name = str(config.get("pool_name", "pool-pptp-vpn")).strip()
            pool_range = str(config.get("pool_range", "192.168.77.10-192.168.77.50")).strip()
            profile_name = str(config.get("profile_name", "profile-pptp")).strip()
            local_addr = str(config.get("local_address", "192.168.77.1")).strip()
            dns_servers = str(config.get("dns_servers", "8.8.8.8,1.1.1.1")).strip()
            auth = str(config.get("authentication", "mschap2,mschap1")).strip()

            commands.append(f'/ip pool add name="{pool_name}" ranges={pool_range} comment="PPTP Client Pool"')
            commands.append(
                f'/ppp profile add name="{profile_name}" local-address={local_addr} remote-address="{pool_name}" '
                f'dns-server="{dns_servers}" use-encryption=yes comment="PPTP Profile"'
            )
            commands.append(f'/interface pptp-server server set enabled=yes default-profile="{profile_name}" authentication={auth}')

            users = config.get("users", [])
            for u in users:
                uname = str(u.get("username", "")).strip()
                pwd = str(u.get("password", "")).strip()
                pwd_display = "********" if mask_secrets else pwd.replace('"', '\\"')
                if uname:
                    commands.append(
                        f'/ppp secret add name="{uname}" password="{pwd_display}" profile="{profile_name}" '
                        f'service=pptp comment="PPTP User"'
                    )

            for r in config.get("routes", []):
                dst = str(r.get("dst", "")).strip()
                if dst:
                    commands.append(f'/ip route add dst-address={dst} gateway={local_addr} comment="Route to PPTP Clients"')

        elif mode == "client":
            name = str(config.get("name", "pptp-out1")).strip()
            connect_to = str(config.get("connect_to", "")).strip()
            user = str(config.get("user", "")).strip()
            pwd = str(config.get("password", "")).strip()
            pwd_display = "********" if mask_secrets else pwd.replace('"', '\\"')
            add_def_route = "yes" if config.get("add_default_route", False) else "no"

            commands.append(
                f'/interface pptp-client add name="{name}" connect-to="{connect_to}" '
                f'user="{user}" password="{pwd_display}" add-default-route={add_def_route} disabled=no comment="PPTP Outgoing Client"'
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

        from backend.connections.ssh_manager import connection_manager

        name = str(config.get("name", config.get("profile_name", "pptp-server"))).strip()
        rollback_stack = []

        if mode == "remote_access":
            prof = str(config.get("profile_name", "profile-pptp")).strip()
            pool = str(config.get("pool_name", "pool-pptp-vpn")).strip()
            rollback_stack = [
                ('/interface pptp-server server set enabled=no', 'Disable PPTP Server'),
                (f'/ppp secret remove [find profile="{prof}"]', f'Remove PPP Secrets in {prof}'),
                (f'/ppp profile remove [find name="{prof}"]', f'Remove PPP Profile {prof}'),
                (f'/ip pool remove [find name="{pool}"]', f'Remove IP Pool {pool}')
            ]
        else:
            rollback_stack = [
                (f'/interface pptp-client remove [find name="{name}"]', f'Remove PPTP Client {name}')
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
            "message": f"MikroTik PPTP VPN '{name}' applied successfully."
        }

    def verify(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_id: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        from backend.connections.ssh_manager import connection_manager

        server_res = connection_manager.execute_command(device, '/interface pptp-server server print detail without-paging')
        server_out = server_res.get("output", "")

        active_res = connection_manager.execute_command(device, '/ppp active print detail where service=pptp without-paging')
        active_out = active_res.get("output", "")

        client_res = connection_manager.execute_command(device, f'/interface pptp-client print detail where name="{vpn_id}" without-paging')
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

        server_res = connection_manager.execute_command(device, '/interface pptp-server server print detail without-paging')
        server_out = server_res.get("output", "")
        if "enabled: yes" in server_out.lower() or "enabled=yes" in server_out.lower():
            active_res = connection_manager.execute_command(device, '/ppp active print detail where service=pptp without-paging')
            active_out = active_res.get("output", "")
            active_users = re.findall(r'name="?([^\s\n]+)"?', active_out)

            results.append({
                "id": "pptp-server",
                "name": "PPTP Server (Legacy)",
                "type": "pptp",
                "mode": "remote_access",
                "status": "up" if len(active_users) > 0 else "listening",
                "local_address": device.get("ip", "0.0.0.0"),
                "remote_address": "PPTP Clients (TCP 1723)",
                "active_users_count": len(active_users),
                "uptime": "Active Service",
                "port": 1723,
                "is_legacy": True
            })

        client_res = connection_manager.execute_command(device, '/interface pptp-client print detail without-paging')
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
                    "type": "pptp",
                    "mode": "client",
                    "status": "disabled" if is_dis else ("up" if is_run else "down"),
                    "local_address": device.get("ip", "0.0.0.0"),
                    "remote_address": conn,
                    "uptime": "Running" if is_run else "Disconnected",
                    "is_legacy": True
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

        if vpn_id == "pptp-server":
            connection_manager.execute_command(device, '/interface pptp-server server set enabled=no')
            connection_manager.execute_command(device, '/ppp secret remove [find service=pptp]')
            connection_manager.execute_command(device, '/ppp profile remove [find name="profile-pptp"]')
            connection_manager.execute_command(device, '/ip pool remove [find name="pool-pptp-vpn"]')
            return {"success": True, "message": "PPTP Server disabled."}
        else:
            connection_manager.execute_command(device, f'/interface pptp-client remove [find name="{vpn_id}"]')
            return {"success": True, "message": f"PPTP Client '{vpn_id}' removed."}
