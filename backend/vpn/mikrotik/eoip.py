"""
MikroTik EoIP (Ethernet over IP) Tunnel Provider
Implements Layer 2 Ethernet over IP tunneling with Tunnel ID, optional IPsec secret,
and optional Bridge port binding for bridging LANs transparently across WAN.
"""
import re
import ipaddress
from typing import Dict, Any, List, Optional
from backend.vpn.base import VPNProvider

class MikroTikEoIPProvider(VPNProvider):
    vpn_type = "eoip"
    supported_modes = ["tunnel"]

    def get_capabilities(self, device: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "vpn_type": self.vpn_type,
            "name": "EoIP (Ethernet over IP)",
            "description": "MikroTik Layer 2 tunneling protocol that encapsulates Ethernet frames in IP packets to transparently bridge subnets across WAN.",
            "supported_modes": [
                {
                    "mode": "tunnel",
                    "label": "Layer 2 EoIP Tunnel",
                    "description": "Point-to-point Ethernet tunnel with optional bridge port membership and IPsec encryption.",
                    "default_mtu": 1500
                }
            ],
            "supports_bridge_binding": True,
            "supports_ipsec_secret": True,
            "tunnel_id_range": [0, 65535],
            "default_mtu": 1500
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
            errors.append(f"Mode '{mode}' is not supported for EoIP. Supported: {self.supported_modes}")
            return {"valid": False, "errors": errors, "warnings": warnings}

        name = str(config.get("name", "")).strip()
        if not name:
            errors.append("EoIP Interface Name is required (e.g. 'eoip-tunnel1').")
        elif not re.match(r'^[a-zA-Z0-9_\-]+$', name):
            errors.append(f"Interface name '{name}' contains invalid characters.")

        remote_addr = str(config.get("remote_address", "")).strip()
        if not remote_addr:
            errors.append("Remote Peer Gateway IPv4 Address is required.")
        else:
            try:
                ipaddress.IPv4Address(remote_addr)
            except ValueError:
                errors.append(f"Invalid remote peer IPv4 address: '{remote_addr}'")

        tid = config.get("tunnel_id")
        if tid is None or str(tid).strip() == "":
            errors.append("Tunnel ID is required (must match on both routers, 0-65535).")
        else:
            try:
                tid_int = int(tid)
                if tid_int < 0 or tid_int > 65535:
                    errors.append(f"Tunnel ID must be between 0 and 65535 (given: {tid_int}).")
            except (ValueError, TypeError):
                errors.append(f"Tunnel ID must be an integer (given: '{tid}').")

        mtu = config.get("mtu", 1500)
        try:
            mtu_int = int(mtu)
            if mtu_int < 68 or mtu_int > 65535:
                errors.append("MTU must be at least 68.")
        except (ValueError, TypeError):
            errors.append("MTU must be an integer.")

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

        name = str(config.get("name", "eoip-tunnel1")).strip()
        remote_addr = str(config.get("remote_address", "")).strip()
        local_addr = str(config.get("local_address", "")).strip()
        tunnel_id = int(config.get("tunnel_id", 10))
        mtu = int(config.get("mtu", 1500))
        comment = str(config.get("comment", f"EoIP Tunnel {name}")).replace('"', '\\"')
        ipsec_secret = str(config.get("ipsec_secret", "")).strip()
        bridge = str(config.get("bridge", "")).strip()

        eoip_cmd = f'/interface eoip add name="{name}" remote-address={remote_addr} tunnel-id={tunnel_id} mtu={mtu} comment="{comment}" disabled=no'
        if local_addr and local_addr != "0.0.0.0":
            eoip_cmd += f' local-address={local_addr}'
        if ipsec_secret:
            sec_val = "********" if mask_secrets else ipsec_secret.replace('"', '\\"')
            eoip_cmd += f' ipsec-secret="{sec_val}"'
        commands.append(eoip_cmd)

        if bridge:
            commands.append(f'/interface bridge port add bridge="{bridge}" interface="{name}" comment="EoIP Bridge Port"')

        # Optional IP assignment
        tunnel_ip = str(config.get("tunnel_ip", "")).strip()
        if tunnel_ip:
            commands.append(f'/ip address add address={tunnel_ip} interface="{name}" comment="IP for {name}"')

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

        name = str(config.get("name", "eoip-tunnel1")).strip()

        from backend.connections.ssh_manager import connection_manager

        rollback_stack = [
            (f'/interface bridge port remove [find interface="{name}"]', f'Remove Bridge Port for {name}'),
            (f'/ip address remove [find interface="{name}"]', f'Remove IP on {name}'),
            (f'/interface eoip remove [find name="{name}"]', f'Remove EoIP Interface {name}')
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
            "message": f"MikroTik EoIP Tunnel '{name}' applied successfully."
        }

    def verify(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_id: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        from backend.connections.ssh_manager import connection_manager

        eoip_res = connection_manager.execute_command(device, f'/interface eoip print detail where name="{vpn_id}" without-paging')
        eoip_out = eoip_res.get("output", "")

        bridge_res = connection_manager.execute_command(device, f'/interface bridge port print detail where interface="{vpn_id}" without-paging')
        bridge_out = bridge_res.get("output", "")

        is_running = "running: yes" in eoip_out.lower() or " R " in eoip_out or "running=yes" in eoip_out
        is_disabled = "disabled: yes" in eoip_out.lower() or " X " in eoip_out or "disabled=yes" in eoip_out
        exists = vpn_id in eoip_out

        operational_status = "down"
        if is_disabled:
            operational_status = "disabled"
        elif is_running:
            operational_status = "up"
        elif exists:
            operational_status = "standby"

        tid = None
        m_tid = re.search(r'tunnel-id=(\d+)', eoip_out)
        if m_tid:
            tid = int(m_tid.group(1))

        return {
            "vpn_id": vpn_id,
            "vpn_type": self.vpn_type,
            "operational_status": operational_status,
            "interface_exists": exists,
            "is_running": is_running,
            "tunnel_id": tid,
            "is_bridged": vpn_id in bridge_out
        }

    def get_status(self, device: Dict[str, Any], session: Any) -> List[Dict[str, Any]]:
        from backend.connections.ssh_manager import connection_manager
        results: List[Dict[str, Any]] = []

        eoip_res = connection_manager.execute_command(device, '/interface eoip print detail without-paging')
        eoip_out = eoip_res.get("output", "")

        blocks = eoip_out.split("\n\n")
        for blk in blocks:
            m_name = re.search(r'name="?([^"\s\n]+)"?', blk)
            if m_name:
                ename = m_name.group(1)
                m_remote = re.search(r'remote-address=([^\s\n]+)', blk)
                remote = m_remote.group(1) if m_remote else "0.0.0.0"

                m_tid = re.search(r'tunnel-id=(\d+)', blk)
                tid = m_tid.group(1) if m_tid else "?"

                is_run = "running: yes" in blk.lower() or "running=yes" in blk.lower()
                is_dis = "disabled: yes" in blk.lower() or "disabled=yes" in blk.lower()

                results.append({
                    "id": ename,
                    "name": ename,
                    "type": "eoip",
                    "mode": "tunnel",
                    "status": "disabled" if is_dis else ("up" if is_run else "standby"),
                    "local_address": device.get("ip", "0.0.0.0"),
                    "remote_address": f"{remote} (TID: {tid})",
                    "uptime": "Active L2 Tunnel" if is_run else "Ready"
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

        connection_manager.execute_command(device, f'/interface bridge port remove [find interface="{vpn_id}"]')
        connection_manager.execute_command(device, f'/ip address remove [find interface="{vpn_id}"]')
        connection_manager.execute_command(device, f'/interface eoip remove [find name="{vpn_id}"]')

        return {"success": True, "message": f"EoIP tunnel '{vpn_id}' removed."}
