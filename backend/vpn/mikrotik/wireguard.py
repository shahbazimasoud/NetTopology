"""
MikroTik WireGuard VPN Provider (RouterOS v7+ Native)
Implements modern, high-performance WireGuard interfaces, peer management,
and routing with strict private key protection and RouterOS v7 capability detection.
"""
import re
import ipaddress
import secrets
import base64
from typing import Dict, Any, List, Optional
from backend.vpn.base import VPNProvider

class MikroTikWireGuardProvider(VPNProvider):
    vpn_type = "wireguard"
    supported_modes = ["remote_access", "site_to_site"]

    def get_capabilities(self, device: Dict[str, Any]) -> Dict[str, Any]:
        firmware = device.get("firmware", "RouterOS v7.14.3 (stable)")
        is_v7 = "7." in firmware or "v7" in firmware.lower()

        return {
            "vpn_type": self.vpn_type,
            "name": "WireGuard",
            "description": "Extremely fast, modern cryptographic tunnel protocol. Native to MikroTik RouterOS v7.",
            "supported_modes": [
                {
                    "mode": "remote_access",
                    "label": "Remote Access Hub / Server",
                    "description": "Act as a WireGuard concentrator for remote workstations, phones, and branch routers.",
                    "default_port": 13231
                },
                {
                    "mode": "site_to_site",
                    "label": "Site-to-Site Tunnel",
                    "description": "Establish a point-to-point WireGuard link with another router or cloud VPC.",
                    "default_port": 13231
                }
            ],
            "is_supported": is_v7,
            "unsupported_reason": None if is_v7 else "WireGuard requires MikroTik RouterOS v7 or newer (v6 is not supported).",
            "default_port": 13231,
            "default_mtu": 1420,
            "recommended": True,
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
        if not is_v7 and "v6" in firmware.lower():
            errors.append("WireGuard is not supported on RouterOS v6. Upgrade the router to RouterOS v7 to use WireGuard.")
            return {"valid": False, "errors": errors, "warnings": warnings}

        if mode not in self.supported_modes:
            errors.append(f"Mode '{mode}' is not supported for WireGuard. Supported: {self.supported_modes}")
            return {"valid": False, "errors": errors, "warnings": warnings}

        # Interface name
        name = str(config.get("name", "")).strip()
        if not name:
            errors.append("WireGuard interface name is required (e.g. 'wg-vpn1').")
        elif not re.match(r'^[a-zA-Z0-9_\-]+$', name):
            errors.append(f"Interface name '{name}' contains invalid characters.")

        # Listen Port
        port = config.get("listen_port", 13231)
        try:
            p_val = int(port)
            if p_val < 1 or p_val > 65535:
                errors.append(f"Listen port must be between 1 and 65535 (given: {p_val}).")
        except (ValueError, TypeError):
            errors.append("Listen port must be a valid integer.")

        # MTU
        mtu = config.get("mtu", 1420)
        try:
            m_val = int(mtu)
            if m_val < 1280 or m_val > 1500:
                warnings.append(f"Standard WireGuard MTU is 1420 (given: {m_val}).")
        except (ValueError, TypeError):
            errors.append("MTU must be an integer.")

        # Tunnel IP
        tunnel_ip = str(config.get("tunnel_ip", "")).strip()
        if not tunnel_ip:
            errors.append("Interface Tunnel IP with CIDR is required (e.g. 10.200.0.1/24).")
        else:
            try:
                ipaddress.IPv4Interface(tunnel_ip)
            except ValueError:
                errors.append(f"Invalid tunnel IP/CIDR: '{tunnel_ip}'. Expected e.g. 10.200.0.1/24.")

        # Peers validation
        peers = config.get("peers", [])
        for idx, p in enumerate(peers):
            p_pub = str(p.get("public_key", "")).strip()
            if not p_pub:
                errors.append(f"Peer #{idx + 1}: Public Key is required.")
            elif len(p_pub) < 32:
                errors.append(f"Peer #{idx + 1}: Public Key appears invalid or too short.")

            p_allowed = str(p.get("allowed_address", "")).strip()
            if not p_allowed:
                errors.append(f"Peer #{idx + 1}: Allowed IPs is required (e.g. 10.200.0.2/32).")

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

        name = str(config.get("name", "wg0")).strip()
        listen_port = int(config.get("listen_port", 13231))
        mtu = int(config.get("mtu", 1420))
        comment = str(config.get("comment", f"WireGuard {mode}")).replace('"', '\\"')
        tunnel_ip = str(config.get("tunnel_ip", "10.200.0.1/24")).strip()

        priv_key = str(config.get("private_key", "")).strip()
        priv_display = "********" if mask_secrets else priv_key.replace('"', '\\"')

        # 1. WireGuard Interface
        if priv_key:
            commands.append(
                f'/interface wireguard add name="{name}" listen-port={listen_port} mtu={mtu} '
                f'private-key="{priv_display}" comment="{comment}" disabled=no'
            )
        else:
            commands.append(
                f'/interface wireguard add name="{name}" listen-port={listen_port} mtu={mtu} '
                f'comment="{comment}" disabled=no'
            )

        # 2. Assign IP to Interface
        if tunnel_ip:
            commands.append(f'/ip address add address={tunnel_ip} interface="{name}" comment="WireGuard IP for {name}"')

        # 3. WireGuard Peers
        peers = config.get("peers", [])
        for p in peers:
            pub_key = str(p.get("public_key", "")).strip()
            allowed = str(p.get("allowed_address", "0.0.0.0/0")).strip()
            endpoint = str(p.get("endpoint_address", "")).strip()
            endpoint_port = p.get("endpoint_port")
            keepalive = p.get("persistent_keepalive", 25)
            p_comment = str(p.get("comment", "WireGuard Peer")).replace('"', '\\"')

            peer_cmd = f'/interface wireguard peers add interface="{name}" public-key="{pub_key}" allowed-address="{allowed}"'
            if endpoint:
                peer_cmd += f' endpoint-address="{endpoint}"'
            if endpoint_port:
                peer_cmd += f' endpoint-port={endpoint_port}'
            if keepalive:
                peer_cmd += f' persistent-keepalive={keepalive}'
            peer_cmd += f' comment="{p_comment}"'
            commands.append(peer_cmd)

        # 4. Optional routes
        routes = config.get("routes", [])
        for r in routes:
            dst = str(r.get("dst", "")).strip()
            dist = int(r.get("distance", 1))
            if dst:
                commands.append(f'/ip route add dst-address={dst} gateway="{name}" distance={dist} comment="WireGuard Route via {name}"')

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

        name = str(config.get("name", "wg0")).strip()

        from backend.connections.ssh_manager import connection_manager

        rollback_stack = [
            (f'/ip route remove [find gateway="{name}"]', f'Remove Routes for {name}'),
            (f'/interface wireguard peers remove [find interface="{name}"]', f'Remove Peers on {name}'),
            (f'/ip address remove [find interface="{name}"]', f'Remove IP on {name}'),
            (f'/interface wireguard remove [find name="{name}"]', f'Remove WireGuard Interface {name}')
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
            "message": f"WireGuard interface '{name}' successfully provisioned on MikroTik."
        }

    def verify(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_id: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        from backend.connections.ssh_manager import connection_manager

        wg_res = connection_manager.execute_command(device, f'/interface wireguard print detail where name="{vpn_id}" without-paging')
        wg_out = wg_res.get("output", "")

        peers_res = connection_manager.execute_command(device, f'/interface wireguard peers print detail where interface="{vpn_id}" without-paging')
        peers_out = peers_res.get("output", "")

        is_running = "running: yes" in wg_out.lower() or " R " in wg_out or "running=yes" in wg_out
        is_disabled = "disabled: yes" in wg_out.lower() or " X " in wg_out or "disabled=yes" in wg_out
        interface_exists = vpn_id in wg_out

        peer_count = len(re.findall(r'public-key="?([^"\s\n]+)"?', peers_out))

        operational_status = "down"
        if is_disabled:
            operational_status = "disabled"
        elif is_running or interface_exists:
            operational_status = "up"

        # Public key extracted safely (no private key returned!)
        public_key = ""
        m_pub = re.search(r'public-key="?([^"\s\n]+)"?', wg_out)
        if m_pub:
            public_key = m_pub.group(1)

        listen_port = 13231
        m_port = re.search(r'listen-port=(\d+)', wg_out)
        if m_port:
            listen_port = int(m_port.group(1))

        return {
            "vpn_id": vpn_id,
            "vpn_type": self.vpn_type,
            "operational_status": operational_status,
            "interface_exists": interface_exists,
            "is_running": is_running,
            "is_disabled": is_disabled,
            "public_key": public_key,
            "listen_port": listen_port,
            "peer_count": peer_count
        }

    def get_status(self, device: Dict[str, Any], session: Any) -> List[Dict[str, Any]]:
        from backend.connections.ssh_manager import connection_manager
        results: List[Dict[str, Any]] = []

        wg_res = connection_manager.execute_command(device, '/interface wireguard print detail without-paging')
        wg_out = wg_res.get("output", "")

        blocks = wg_out.split("\n\n")
        for blk in blocks:
            m_name = re.search(r'name="?([^"\s\n]+)"?', blk)
            if m_name:
                wname = m_name.group(1)
                is_run = "running: yes" in blk.lower() or "running=yes" in blk.lower()
                is_dis = "disabled: yes" in blk.lower() or "disabled=yes" in blk.lower()

                m_port = re.search(r'listen-port=(\d+)', blk)
                port = int(m_port.group(1)) if m_port else 13231

                m_pub = re.search(r'public-key="?([^"\s\n]+)"?', blk)
                pub = m_pub.group(1) if m_pub else ""

                # Query peers on this interface
                p_res = connection_manager.execute_command(device, f'/interface wireguard peers print count-only where interface="{wname}"')
                p_count = 0
                try:
                    p_count = int(p_res.get("output", "0").strip())
                except ValueError:
                    p_count = len(re.findall(r'interface=' + wname, blk))

                results.append({
                    "id": wname,
                    "name": wname,
                    "type": "wireguard",
                    "mode": "site_to_site" if p_count == 1 else "remote_access",
                    "status": "disabled" if is_dis else ("up" if is_run else "down"),
                    "local_address": f"{device.get('ip', '0.0.0.0')}:{port}",
                    "remote_address": f"{p_count} Peer(s)",
                    "uptime": "Active" if is_run else "Ready",
                    "public_key": pub,
                    "listen_port": port,
                    "peer_count": p_count
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

        # Check dependencies
        connection_manager.execute_command(device, f'/ip route remove [find gateway="{vpn_id}"]')
        connection_manager.execute_command(device, f'/interface wireguard peers remove [find interface="{vpn_id}"]')
        connection_manager.execute_command(device, f'/ip address remove [find interface="{vpn_id}"]')
        res = connection_manager.execute_command(device, f'/interface wireguard remove [find name="{vpn_id}"]')

        return {
            "success": True,
            "message": f"WireGuard interface '{vpn_id}' and all associated peers/routes removed."
        }
