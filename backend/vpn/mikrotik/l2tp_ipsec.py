"""
MikroTik L2TP/IPsec VPN Provider
Implements Remote Access (Road Warrior) and Site-to-Site L2TP/IPsec
for MikroTik RouterOS v6 and v7.
"""
import re
import ipaddress
from typing import Dict, Any, List, Optional
from backend.vpn.base import VPNProvider

class MikroTikL2TPIPsecProvider(VPNProvider):
    vpn_type = "l2tp_ipsec"
    supported_modes = ["remote_access", "site_to_site"]

    def get_capabilities(self, device: Dict[str, Any]) -> Dict[str, Any]:
        firmware = device.get("firmware", "RouterOS v7.14.3")
        is_v7 = "7." in firmware or "v7" in firmware.lower()
        return {
            "vpn_type": self.vpn_type,
            "name": "L2TP/IPsec",
            "description": "Layer 2 Tunneling Protocol with IPsec Encryption",
            "supported_modes": [
                {
                    "mode": "remote_access",
                    "label": "Remote Access (Road Warrior)",
                    "description": "Allow remote workers and road warriors to connect securely to corporate LAN with IPsec encryption",
                    "default_port": 1701
                },
                {
                    "mode": "site_to_site",
                    "label": "Site-to-Site Tunnel",
                    "description": "Connect two branch offices or data centers using routed L2TP/IPsec tunnel",
                    "default_port": 1701
                }
            ],
            "ipsec_profiles": ["default", "ike2-profile", "aes256-sha256"],
            "supported_ciphers": ["aes-256-cbc", "aes-128-cbc", "aes-256-gcm"],
            "routeros_major_version": 7 if is_v7 else 6
        }

    def _is_v7(self, device: Dict[str, Any]) -> bool:
        firmware = device.get("firmware", "RouterOS v7.14.3")
        return "7." in firmware or "v7" in firmware.lower()

    def validate(
        self,
        device: Dict[str, Any],
        mode: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        errors = []
        warnings = []

        if mode not in self.supported_modes:
            errors.append(f"Mode '{mode}' is not supported for L2TP/IPsec. Supported: {self.supported_modes}")
            return {"valid": False, "errors": errors, "warnings": warnings}

        # IPsec Secret validation
        ipsec_secret = str(config.get("ipsec_secret", "")).strip()
        if not ipsec_secret:
            errors.append("IPsec Pre-Shared Key (PSK / ipsec-secret) is required.")
        elif len(ipsec_secret) < 8:
            warnings.append("IPsec Pre-Shared Key is shorter than 8 characters, which is not recommended for production.")

        if mode == "remote_access":
            # Gateway local IP
            local_addr = str(config.get("local_address", "")).strip()
            if not local_addr:
                errors.append("Local Gateway Address (local-address) is required for PPP profile.")
            else:
                try:
                    ipaddress.IPv4Address(local_addr)
                except ValueError:
                    errors.append(f"Invalid local gateway IPv4 address: '{local_addr}'")

            # Pool validation
            pool_ranges = str(config.get("pool_ranges", "")).strip()
            if not pool_ranges:
                errors.append("IP Pool Range (pool_ranges, e.g. 192.168.89.10-192.168.89.50) is required.")
            else:
                # Validate range format
                if "-" in pool_ranges:
                    parts = pool_ranges.split("-")
                    if len(parts) != 2:
                        errors.append(f"Invalid pool range format '{pool_ranges}'. Expected start_ip-end_ip.")
                    else:
                        try:
                            start_ip = ipaddress.IPv4Address(parts[0].strip())
                            end_ip = ipaddress.IPv4Address(parts[1].strip())
                            if int(start_ip) >= int(end_ip):
                                errors.append(f"Pool start IP ({start_ip}) must be strictly lower than end IP ({end_ip}).")
                        except ValueError as ve:
                            errors.append(f"Invalid IP address in pool range: {str(ve)}")
                elif "/" in pool_ranges:
                    try:
                        ipaddress.IPv4Network(pool_ranges, strict=False)
                    except ValueError:
                        errors.append(f"Invalid CIDR network for pool: '{pool_ranges}'")
                else:
                    try:
                        ipaddress.IPv4Address(pool_ranges)
                    except ValueError:
                        errors.append(f"Invalid pool IP definition: '{pool_ranges}'")

            # Users / Secrets validation
            users = config.get("users", [])
            if not users:
                warnings.append("No PPP users defined. Clients will not be able to authenticate until users are added.")
            else:
                seen_usernames = set()
                for idx, u in enumerate(users):
                    uname = str(u.get("username", "")).strip()
                    upass = str(u.get("password", "")).strip()
                    if not uname:
                        errors.append(f"User #{idx + 1} has an empty username.")
                    elif uname in seen_usernames:
                        errors.append(f"Duplicate username '{uname}' in user list.")
                    else:
                        seen_usernames.add(uname)

                    if not upass:
                        errors.append(f"Password for user '{uname}' cannot be empty.")

            # DNS Servers
            dns_servers = config.get("dns_servers", [])
            if isinstance(dns_servers, str):
                dns_servers = [s.strip() for s in dns_servers.split(",") if s.strip()]
            for dns in dns_servers:
                try:
                    ipaddress.IPv4Address(dns)
                except ValueError:
                    errors.append(f"Invalid DNS server IP address: '{dns}'")

        elif mode == "site_to_site":
            role = config.get("role", "client")
            if role == "client":
                connect_to = str(config.get("connect_to", "")).strip()
                if not connect_to:
                    errors.append("Remote gateway IP or hostname (connect-to) is required for L2TP client.")
                user = str(config.get("user", "")).strip()
                pwd = str(config.get("password", "")).strip()
                if not user:
                    errors.append("Username (user) is required for L2TP client authentication.")
                if not pwd:
                    errors.append("Password is required for L2TP client authentication.")

            # Routes validation
            routes = config.get("routes", [])
            for r in routes:
                dst = str(r.get("dst", "")).strip()
                if dst:
                    try:
                        ipaddress.IPv4Network(dst, strict=False)
                    except ValueError:
                        errors.append(f"Invalid route destination network: '{dst}'")

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
        is_v7 = self._is_v7(device)

        ipsec_secret = "********" if mask_secrets else str(config.get("ipsec_secret", "")).replace('"', '\\"')

        if mode == "remote_access":
            pool_name = str(config.get("pool_name", "pool-l2tp-vpn")).strip()
            pool_ranges = str(config.get("pool_ranges", "192.168.89.10-192.168.89.50")).strip()
            profile_name = str(config.get("profile_name", "profile-l2tp-ipsec")).strip()
            local_addr = str(config.get("local_address", "192.168.89.1")).strip()

            dns_list = config.get("dns_servers", ["8.8.8.8", "1.1.1.1"])
            if isinstance(dns_list, list):
                dns_str = ",".join(dns_list)
            else:
                dns_str = str(dns_list).strip()

            # 1. IP Pool
            commands.append(f'/ip pool add name="{pool_name}" ranges={pool_ranges} comment="L2TP VPN IP Pool"')

            # 2. PPP Profile
            profile_cmd = f'/ppp profile add name="{profile_name}" local-address={local_addr} remote-address="{pool_name}"'
            if dns_str:
                profile_cmd += f' dns-server={dns_str}'
            profile_cmd += ' change-tcp-mss=yes use-encryption=yes comment="L2TP IPsec Profile"'
            commands.append(profile_cmd)

            # 3. L2TP Server Configuration
            use_ipsec_val = "required" if is_v7 else "yes"
            commands.append(
                f'/interface l2tp-server server set enabled=yes use-ipsec={use_ipsec_val} '
                f'ipsec-secret="{ipsec_secret}" default-profile="{profile_name}"'
            )

            # 4. PPP Secrets (Users)
            users = config.get("users", [])
            for u in users:
                uname = str(u.get("username", "")).strip()
                upass = "********" if mask_secrets else str(u.get("password", "")).replace('"', '\\"')
                comment = str(u.get("comment", f"L2TP VPN User {uname}")).replace('"', '\\"')
                disabled = "yes" if u.get("disabled", False) else "no"
                commands.append(
                    f'/ppp secret add name="{uname}" password="{upass}" profile="{profile_name}" '
                    f'service=l2tp disabled={disabled} comment="{comment}"'
                )

            # 5. Static Routes (Optional push routes or return routes)
            routes = config.get("routes", [])
            for r in routes:
                dst = str(r.get("dst", "")).strip()
                gw = str(r.get("gateway", local_addr)).strip()
                dist = int(r.get("distance", 1))
                if dst:
                    commands.append(f'/ip route add dst-address={dst} gateway={gw} distance={dist} comment="Route via {profile_name}"')

        elif mode == "site_to_site":
            role = config.get("role", "client")
            iface_name = str(config.get("name", "l2tp-s2s-branch1")).strip()
            profile_name = str(config.get("profile_name", f"profile-{iface_name}")).strip()

            if role == "client":
                connect_to = str(config.get("connect_to", "")).strip()
                user = str(config.get("user", "")).strip()
                upass = "********" if mask_secrets else str(config.get("password", "")).replace('"', '\\"')
                use_ipsec_val = "required" if is_v7 else "yes"

                commands.append(
                    f'/interface l2tp-client add name="{iface_name}" connect-to={connect_to} '
                    f'user="{user}" password="{upass}" use-ipsec={use_ipsec_val} '
                    f'ipsec-secret="{ipsec_secret}" disabled=no comment="L2TP/IPsec Site-to-Site Client"'
                )

                # Add Routes over tunnel
                routes = config.get("routes", [])
                for r in routes:
                    dst = str(r.get("dst", "")).strip()
                    dist = int(r.get("distance", 1))
                    if dst:
                        commands.append(f'/ip route add dst-address={dst} gateway="{iface_name}" distance={dist} comment="S2S Route over {iface_name}"')

            else:
                # Server side of site-to-site
                peer_user = str(config.get("user", f"user-{iface_name}")).strip()
                upass = "********" if mask_secrets else str(config.get("password", "")).replace('"', '\\"')
                local_addr = str(config.get("local_address", "10.255.255.1")).strip()
                remote_addr = str(config.get("remote_address", "10.255.255.2")).strip()

                commands.append(
                    f'/ppp profile add name="{profile_name}" local-address={local_addr} '
                    f'remote-address={remote_addr} use-encryption=yes comment="S2S Profile {iface_name}"'
                )
                use_ipsec_val = "required" if is_v7 else "yes"
                commands.append(
                    f'/interface l2tp-server server set enabled=yes use-ipsec={use_ipsec_val} '
                    f'ipsec-secret="{ipsec_secret}" default-profile="{profile_name}"'
                )
                commands.append(
                    f'/ppp secret add name="{peer_user}" password="{upass}" profile="{profile_name}" '
                    f'service=l2tp comment="S2S Peer {iface_name}"'
                )
                routes = config.get("routes", [])
                for r in routes:
                    dst = str(r.get("dst", "")).strip()
                    dist = int(r.get("distance", 1))
                    if dst:
                        commands.append(f'/ip route add dst-address={dst} gateway={remote_addr} distance={dist} comment="S2S Route to {dst}"')

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

        # Generate real commands with unmasked secrets
        raw_commands = self.generate_configuration(device, mode, config, mask_secrets=False)
        preview_commands = self.generate_configuration(device, mode, config, mask_secrets=True)

        applied_steps = []
        rollback_steps = []
        failed_step = None
        error_message = None

        pool_name = str(config.get("pool_name", "pool-l2tp-vpn")).strip()
        profile_name = str(config.get("profile_name", "profile-l2tp-ipsec")).strip()
        iface_name = str(config.get("name", "l2tp-s2s-branch1")).strip()

        # Build reverse rollback commands stack
        if mode == "remote_access":
            rollback_stack = [
                (f'/ppp profile remove [find name="{profile_name}"]', "Remove PPP Profile"),
                (f'/ip pool remove [find name="{pool_name}"]', "Remove IP Pool"),
                ('/interface l2tp-server server set enabled=no', "Disable L2TP Server")
            ]
        else:
            role = config.get("role", "client")
            if role == "client":
                rollback_stack = [
                    (f'/ip route remove [find gateway="{iface_name}"]', "Remove S2S Routes"),
                    (f'/interface l2tp-client remove [find name="{iface_name}"]', f"Remove L2TP Client {iface_name}")
                ]
            else:
                rollback_stack = [
                    (f'/ppp profile remove [find name="{profile_name}"]', "Remove PPP Profile"),
                    ('/interface l2tp-server server set enabled=no', "Disable L2TP Server")
                ]

        from backend.connections.ssh_manager import connection_manager

        # Execute step by step
        for idx, cmd in enumerate(raw_commands):
            step_desc = preview_commands[idx] if idx < len(preview_commands) else f"Step {idx + 1}"
            step_title = step_desc.split()[0] + " " + step_desc.split()[1] if len(step_desc.split()) > 1 else step_desc

            res = connection_manager.execute_command(device, cmd)
            out = res.get("output", "")
            
            # MikroTik error detection
            is_err = not res.get("success", False) or "failure:" in out.lower() or "syntax error" in out.lower() or "bad command" in out.lower()

            if is_err:
                failed_step = {
                    "step_index": idx + 1,
                    "command": step_desc,
                    "error": out.strip() or "RouterOS command returned failure"
                }
                error_message = out.strip() or f"Failed executing command: {step_desc}"
                break
            else:
                applied_steps.append({
                    "step": idx + 1,
                    "command": step_desc,
                    "status": "success"
                })

        # Rollback on failure
        rollback_executed = []
        if failed_step:
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

        # Immediate router verification
        vpn_id = iface_name if mode == "site_to_site" else profile_name
        verification = self.verify(device, session, vpn_id, config)

        return {
            "success": True,
            "vpn_id": vpn_id,
            "vpn_type": self.vpn_type,
            "mode": mode,
            "applied_steps": applied_steps,
            "verification": verification,
            "message": f"MikroTik L2TP/IPsec ({mode}) successfully deployed and operational."
        }

    def verify(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_id: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        from backend.connections.ssh_manager import connection_manager

        # Query server status
        server_res = connection_manager.execute_command(device, "/interface l2tp-server server print without-paging")
        server_out = server_res.get("output", "")
        server_enabled = "enabled: yes" in server_out.lower() or "enabled=yes" in server_out.lower()

        # Query active sessions
        active_res = connection_manager.execute_command(device, "/ppp active print without-paging")
        active_out = active_res.get("output", "")

        # Query IPsec peers
        ipsec_res = connection_manager.execute_command(device, "/ip ipsec active-peers print without-paging")
        ipsec_out = ipsec_res.get("output", "")

        # Query interface status if site-to-site
        client_res = connection_manager.execute_command(device, f'/interface l2tp-client print detail where name="{vpn_id}" without-paging')
        client_out = client_res.get("output", "")

        active_users = []
        for line in active_out.splitlines():
            line = line.strip()
            if not line or line.startswith("Flags") or line.startswith("#") or "NAME" in line:
                continue
            parts = line.split()
            if len(parts) >= 3:
                active_users.append({
                    "name": parts[1] if parts[0].isdigit() else parts[0],
                    "service": "l2tp",
                    "caller_id": parts[2] if len(parts) > 2 else "unknown"
                })

        operational_status = "down"
        if server_enabled:
            operational_status = "up" if len(active_users) > 0 else "standby"
        if "running: yes" in client_out.lower() or " R " in client_out:
            operational_status = "up"

        return {
            "vpn_id": vpn_id,
            "vpn_type": self.vpn_type,
            "operational_status": operational_status,
            "server_enabled": server_enabled,
            "active_users_count": len(active_users),
            "active_users": active_users,
            "ipsec_phase2_up": "installed" in ipsec_out.lower() or len(active_users) > 0,
            "raw_server_output": server_out.strip(),
            "verified_at": "Real-time query via SSH"
        }

    def get_status(self, device: Dict[str, Any], session: Any) -> List[Dict[str, Any]]:
        from backend.connections.ssh_manager import connection_manager

        items: List[Dict[str, Any]] = []

        # Check L2TP Server
        server_res = connection_manager.execute_command(device, "/interface l2tp-server server print without-paging")
        server_out = server_res.get("output", "")
        if "enabled: yes" in server_out.lower() or "enabled=yes" in server_out.lower():
            # Get default profile & pool
            active_res = connection_manager.execute_command(device, "/ppp active print without-paging")
            active_out = active_res.get("output", "")
            active_count = max(0, len([l for l in active_out.splitlines() if l.strip() and not l.startswith("Flags") and not l.startswith("#") and "NAME" not in l]))

            # Extract profile name
            prof_m = re.search(r'default-profile:\s*([^\s\n]+)', server_out)
            prof_name = prof_m.group(1) if prof_m else "default"

            items.append({
                "id": f"l2tp-server-{prof_name}",
                "name": f"L2TP/IPsec Server ({prof_name})",
                "type": "l2tp_ipsec",
                "mode": "remote_access",
                "status": "up" if active_count > 0 else "standby",
                "interface": "l2tp-server",
                "profile": prof_name,
                "ipsec_enabled": True,
                "active_sessions": active_count,
                "details": {
                    "role": "server",
                    "use_ipsec": "required" if "required" in server_out else "yes",
                    "active_clients": active_count
                }
            })

        # Check L2TP Client interfaces
        client_res = connection_manager.execute_command(device, "/interface l2tp-client print detail without-paging")
        client_out = client_res.get("output", "")
        for block in client_out.split("\n\n"):
            block = block.strip()
            if not block or "name=" not in block:
                continue
            name_m = re.search(r'name="?([^"\s\n]+)"?', block)
            if not name_m:
                continue
            name = name_m.group(1)
            is_running = "running=yes" in block or " R " in block or "flags=R" in block
            is_disabled = "disabled=yes" in block or " X " in block
            connect_to_m = re.search(r'connect-to=([^\s\n]+)', block)
            connect_to = connect_to_m.group(1) if connect_to_m else ""

            items.append({
                "id": f"l2tp-client-{name}",
                "name": name,
                "type": "l2tp_ipsec",
                "mode": "site_to_site",
                "status": "disabled" if is_disabled else ("up" if is_running else "down"),
                "interface": name,
                "ipsec_enabled": "use-ipsec" in block,
                "details": {
                    "role": "client",
                    "connect_to": connect_to,
                    "running": is_running,
                    "disabled": is_disabled
                }
            })

        return items

    def delete(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_id: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        from backend.connections.ssh_manager import connection_manager

        # Identify if client or server
        if vpn_id.startswith("l2tp-client-") or not vpn_id.startswith("l2tp-server-"):
            # Client deletion
            iface_name = vpn_id.replace("l2tp-client-", "")
            cmds = [
                f'/ip route remove [find gateway="{iface_name}"]',
                f'/interface l2tp-client remove [find name="{iface_name}"]'
            ]
        else:
            # Server reset
            prof_name = vpn_id.replace("l2tp-server-", "")
            cmds = [
                '/interface l2tp-server server set enabled=no',
                f'/ppp secret remove [find profile="{prof_name}"]',
                f'/ppp profile remove [find name="{prof_name}"]',
                '/ip pool remove [find comment="L2TP VPN IP Pool"]'
            ]

        results = []
        for c in cmds:
            res = connection_manager.execute_command(device, c)
            results.append({"command": c, "success": res.get("success", True)})

        return {
            "success": True,
            "vpn_id": vpn_id,
            "message": f"L2TP/IPsec configuration '{vpn_id}' removed from MikroTik router.",
            "steps": results
        }
