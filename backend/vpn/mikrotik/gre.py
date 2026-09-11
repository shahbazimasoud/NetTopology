"""
MikroTik GRE (Generic Routing Encapsulation) VPN Provider
Implements Point-to-Point GRE Tunnels with static routing and IPsec encapsulation support
for MikroTik RouterOS v6 and v7.
"""
import re
import ipaddress
from typing import Dict, Any, List, Optional
from backend.vpn.base import VPNProvider

class MikroTikGREProvider(VPNProvider):
    vpn_type = "gre"
    supported_modes = ["tunnel"]

    def get_capabilities(self, device: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "vpn_type": self.vpn_type,
            "name": "GRE (Generic Routing Encapsulation)",
            "description": "Point-to-point protocol for encapsulating arbitrary network layer protocols inside IPv4 packets",
            "supported_modes": [
                {
                    "mode": "tunnel",
                    "label": "Point-to-Point GRE Tunnel",
                    "description": "Establish a point-to-point tunnel between two routers for routed IP traffic with optional IPsec secret",
                    "default_mtu": 1476
                }
            ],
            "supports_keepalive": True,
            "supports_ipsec_secret": True,
            "default_mtu": 1476,
            "min_mtu": 68,
            "max_mtu": 1500
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
            errors.append(f"Mode '{mode}' is not supported for GRE. Supported: {self.supported_modes}")
            return {"valid": False, "errors": errors, "warnings": warnings}

        # Tunnel interface name
        name = str(config.get("name", "")).strip()
        if not name:
            errors.append("Tunnel Name (name) is required (e.g., 'gre-tunnel1').")
        elif not re.match(r'^[a-zA-Z0-9_\-]+$', name):
            errors.append(f"Tunnel Name '{name}' contains invalid characters. Use alphanumeric, dash, or underscore only.")

        # Local address (can be IPv4 or blank/0.0.0.0 for dynamic local binding)
        local_addr = str(config.get("local_address", "")).strip()
        if local_addr and local_addr != "0.0.0.0":
            try:
                ipaddress.IPv4Address(local_addr)
            except ValueError:
                warnings.append(f"Local address '{local_addr}' does not appear to be a standard IPv4 address.")

        # Remote address (mandatory IPv4)
        remote_addr = str(config.get("remote_address", "")).strip()
        if not remote_addr:
            errors.append("Remote Peer IPv4 Address (remote-address) is required.")
        else:
            try:
                ipaddress.IPv4Address(remote_addr)
            except ValueError:
                errors.append(f"Invalid remote peer IPv4 address: '{remote_addr}'")

        # Tunnel IP (point-to-point IP on the GRE interface)
        tunnel_ip = str(config.get("tunnel_ip", "")).strip()
        if not tunnel_ip:
            errors.append("Tunnel Point-to-Point IP address with CIDR (e.g. 10.255.0.1/30) is required.")
        else:
            try:
                ipaddress.IPv4Interface(tunnel_ip)
            except ValueError:
                errors.append(f"Invalid tunnel IP/CIDR format: '{tunnel_ip}'. Expected format like 10.255.0.1/30")

        # MTU validation
        mtu = config.get("mtu", 1476)
        try:
            mtu_val = int(mtu)
            if mtu_val < 68 or mtu_val > 1500:
                errors.append(f"MTU must be between 68 and 1500 (given: {mtu_val}). Recommended default is 1476.")
        except (ValueError, TypeError):
            errors.append(f"MTU must be an integer (given: '{mtu}').")

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

        name = str(config.get("name", "gre-tunnel1")).strip()
        local_addr = str(config.get("local_address", "")).strip()
        remote_addr = str(config.get("remote_address", "")).strip()
        tunnel_ip = str(config.get("tunnel_ip", "")).strip()
        mtu = int(config.get("mtu", 1476))
        keepalive = str(config.get("keepalive", "10s,3")).strip()
        comment = str(config.get("comment", f"GRE Tunnel {name}")).replace('"', '\\"')
        ipsec_secret = str(config.get("ipsec_secret", "")).strip()

        # 1. GRE Interface Add
        gre_cmd = f'/interface gre add name="{name}" remote-address={remote_addr} mtu={mtu} keepalive={keepalive} comment="{comment}" disabled=no'
        if local_addr and local_addr != "0.0.0.0":
            gre_cmd += f' local-address={local_addr}'
        if ipsec_secret:
            sec_val = "********" if mask_secrets else ipsec_secret.replace('"', '\\"')
            gre_cmd += f' ipsec-secret="{sec_val}"'
        commands.append(gre_cmd)

        # 2. IP Address on GRE Interface
        if tunnel_ip:
            commands.append(f'/ip address add address={tunnel_ip} interface="{name}" comment="IP for {name}"')

        # 3. Static Routes over GRE Interface
        routes = config.get("routes", [])
        for r in routes:
            dst = str(r.get("dst", "")).strip()
            dist = int(r.get("distance", 1))
            if dst:
                commands.append(f'/ip route add dst-address={dst} gateway="{name}" distance={dist} comment="GRE Route via {name}"')

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

        name = str(config.get("name", "gre-tunnel1")).strip()
        raw_commands = self.generate_configuration(device, mode, config, mask_secrets=False)
        preview_commands = self.generate_configuration(device, mode, config, mask_secrets=True)

        applied_steps = []
        failed_step = None
        error_message = None

        # Rollback stack for GRE
        rollback_stack = [
            (f'/ip route remove [find gateway="{name}"]', f"Remove Routes for {name}"),
            (f'/ip address remove [find interface="{name}"]', f"Remove IP on {name}"),
            (f'/interface gre remove [find name="{name}"]', f"Remove GRE Interface {name}")
        ]

        from backend.connections.ssh_manager import connection_manager

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

        # Immediate verification
        verification = self.verify(device, session, name, config)

        return {
            "success": True,
            "vpn_id": name,
            "vpn_type": self.vpn_type,
            "mode": mode,
            "applied_steps": applied_steps,
            "verification": verification,
            "message": f"MikroTik GRE Tunnel '{name}' successfully provisioned on router."
        }

    def verify(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_id: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        from backend.connections.ssh_manager import connection_manager

        # Query GRE interface detail
        gre_res = connection_manager.execute_command(device, f'/interface gre print detail where name="{vpn_id}" without-paging')
        gre_out = gre_res.get("output", "")

        # Query generic interface state for flags
        iface_res = connection_manager.execute_command(device, f'/interface print detail where name="{vpn_id}" without-paging')
        iface_out = iface_res.get("output", "")

        # Query IP address assigned
        ip_res = connection_manager.execute_command(device, f'/ip address print detail where interface="{vpn_id}" without-paging')
        ip_out = ip_res.get("output", "")

        # Query routes
        route_res = connection_manager.execute_command(device, f'/ip route print detail where gateway="{vpn_id}" without-paging')
        route_out = route_res.get("output", "")

        is_running = "running: yes" in iface_out.lower() or " R " in iface_out or "running=yes" in gre_out
        is_disabled = "disabled: yes" in iface_out.lower() or " X " in iface_out or "disabled=yes" in gre_out
        interface_exists = vpn_id in gre_out or vpn_id in iface_out

        operational_status = "down"
        if is_disabled:
            operational_status = "disabled"
        elif is_running:
            operational_status = "up"
        elif interface_exists:
            # Interface exists on router but peer is unreachable or standby
            operational_status = "standby"

        # Extract MTU and actual IP
        actual_mtu = 1476
        mtu_m = re.search(r'actual-mtu=(\d+)', gre_out + iface_out)
        if mtu_m:
            actual_mtu = int(mtu_m.group(1))

        assigned_ip = ""
        ip_m = re.search(r'address=([^\s\n]+)', ip_out)
        if ip_m:
            assigned_ip = ip_m.group(1)

        return {
            "vpn_id": vpn_id,
            "vpn_type": self.vpn_type,
            "interface_exists": interface_exists,
            "operational_status": operational_status,
            "is_running": is_running,
            "is_disabled": is_disabled,
            "actual_mtu": actual_mtu,
            "assigned_ip": assigned_ip,
            "routes_count": len([l for l in route_out.splitlines() if l.strip() and "dst-address" in l]),
            "raw_output": gre_out.strip() or iface_out.strip(),
            "verified_at": "Real-time query via SSH"
        }

    def get_status(self, device: Dict[str, Any], session: Any) -> List[Dict[str, Any]]:
        from backend.connections.ssh_manager import connection_manager

        items: List[Dict[str, Any]] = []

        gre_res = connection_manager.execute_command(device, "/interface gre print detail without-paging")
        gre_out = gre_res.get("output", "")

        for block in gre_out.split("\n\n"):
            block = block.strip()
            if not block or "name=" not in block:
                continue

            name_m = re.search(r'name="?([^"\s\n]+)"?', block)
            if not name_m:
                continue
            name = name_m.group(1)

            remote_m = re.search(r'remote-address=([^\s\n]+)', block)
            remote_addr = remote_m.group(1) if remote_m else ""

            local_m = re.search(r'local-address=([^\s\n]+)', block)
            local_addr = local_m.group(1) if local_m else ""

            mtu_m = re.search(r'mtu=(\d+)', block)
            mtu = int(mtu_m.group(1)) if mtu_m else 1476

            is_running = "running=yes" in block or " R " in block or "flags=R" in block
            is_disabled = "disabled=yes" in block or " X " in block

            status = "disabled" if is_disabled else ("up" if is_running else "standby")

            items.append({
                "id": f"gre-{name}",
                "name": name,
                "type": "gre",
                "mode": "tunnel",
                "status": status,
                "interface": name,
                "details": {
                    "local_address": local_addr,
                    "remote_address": remote_addr,
                    "mtu": mtu,
                    "has_ipsec": "ipsec-secret" in block,
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

        name = vpn_id.replace("gre-", "")

        cmds = [
            f'/ip route remove [find gateway="{name}"]',
            f'/ip address remove [find interface="{name}"]',
            f'/interface gre remove [find name="{name}"]'
        ]

        results = []
        for c in cmds:
            res = connection_manager.execute_command(device, c)
            results.append({"command": c, "success": res.get("success", True)})

        return {
            "success": True,
            "vpn_id": vpn_id,
            "message": f"GRE tunnel '{name}' and its associated IP addresses and routes removed from router.",
            "steps": results
        }
