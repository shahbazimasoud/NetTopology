"""
MikroTik VXLAN (Virtual Extensible LAN) Provider (RouterOS v7+ Native)
Implements Layer 2 / Layer 3 Overlay with 24-bit VNI, VTEPs (Virtual Tunnel Endpoints),
and optional Bridge port binding for multi-tenant data center and campus overlays.
"""
import re
import ipaddress
from typing import Dict, Any, List, Optional
from backend.vpn.base import VPNProvider

class MikroTikVXLANProvider(VPNProvider):
    vpn_type = "vxlan"
    supported_modes = ["overlay"]

    def get_capabilities(self, device: Dict[str, Any]) -> Dict[str, Any]:
        firmware = device.get("firmware", "RouterOS v7.14.3 (stable)")
        is_v7 = "7." in firmware or "v7" in firmware.lower()

        return {
            "vpn_type": self.vpn_type,
            "name": "VXLAN (Virtual Extensible LAN)",
            "description": "Standard Layer 2 overlay scheme over Layer 3 network with 24-bit VNI (up to 16 million network segments). RouterOS v7 native.",
            "supported_modes": [
                {
                    "mode": "overlay",
                    "label": "VXLAN Network Overlay",
                    "description": "Establish a scalable VXLAN tunnel with configured VTEPs (Virtual Tunnel Endpoints).",
                    "default_port": 4789
                }
            ],
            "is_supported": is_v7,
            "unsupported_reason": None if is_v7 else "VXLAN is only supported on RouterOS v7 or newer (v6 does not have VXLAN support).",
            "vni_range": [1, 16777215],
            "default_port": 4789,
            "default_mtu": 1500,
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
            errors.append("VXLAN is not supported on RouterOS v6. Please upgrade the router to RouterOS v7.")
            return {"valid": False, "errors": errors, "warnings": warnings}

        if mode not in self.supported_modes:
            errors.append(f"Mode '{mode}' is not supported for VXLAN. Supported: {self.supported_modes}")
            return {"valid": False, "errors": errors, "warnings": warnings}

        name = str(config.get("name", "")).strip()
        if not name:
            errors.append("VXLAN Interface Name is required (e.g. 'vxlan100').")
        elif not re.match(r'^[a-zA-Z0-9_\-]+$', name):
            errors.append(f"Interface name '{name}' contains invalid characters.")

        vni = config.get("vni")
        if vni is None or str(vni).strip() == "":
            errors.append("VNI (Virtual Network Identifier) is required (1 to 16,777,215).")
        else:
            try:
                vni_int = int(vni)
                if vni_int < 1 or vni_int > 16777215:
                    errors.append(f"VNI must be between 1 and 16,777,215 (given: {vni_int}).")
            except (ValueError, TypeError):
                errors.append(f"VNI must be an integer (given: '{vni}').")

        vteps = config.get("vteps", [])
        if not vteps or len(vteps) == 0:
            warnings.append("No remote VTEP (Virtual Tunnel Endpoint) configured. Traffic will rely on multicast or local flood.")
        else:
            for idx, vtep in enumerate(vteps):
                r_ip = str(vtep.get("remote_ip", "")).strip()
                if not r_ip:
                    errors.append(f"VTEP #{idx + 1}: Remote IP address is required.")
                else:
                    try:
                        ipaddress.IPv4Address(r_ip)
                    except ValueError:
                        errors.append(f"VTEP #{idx + 1}: Invalid remote IPv4 address '{r_ip}'")

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

        name = str(config.get("name", "vxlan100")).strip()
        vni = int(config.get("vni", 100))
        port = int(config.get("port", 4789))
        mtu = int(config.get("mtu", 1500))
        comment = str(config.get("comment", f"VXLAN VNI {vni}")).replace('"', '\\"')
        bridge = str(config.get("bridge", "")).strip()

        # 1. Add VXLAN Interface
        commands.append(
            f'/interface vxlan add name="{name}" vni={vni} port={port} mtu={mtu} comment="{comment}" disabled=no'
        )

        # 2. Add VTEPs
        vteps = config.get("vteps", [])
        for v in vteps:
            r_ip = str(v.get("remote_ip", "")).strip()
            v_port = int(v.get("port", port))
            if r_ip:
                commands.append(f'/interface vxlan vteps add interface="{name}" remote-ip={r_ip} port={v_port}')

        # 3. Optional Bridge Port
        if bridge:
            commands.append(f'/interface bridge port add bridge="{bridge}" interface="{name}" comment="VXLAN Bridge Port"')

        # 4. Optional IP assignment
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

        name = str(config.get("name", "vxlan100")).strip()

        from backend.connections.ssh_manager import connection_manager

        rollback_stack = [
            (f'/interface bridge port remove [find interface="{name}"]', f'Remove Bridge Port for {name}'),
            (f'/interface vxlan vteps remove [find interface="{name}"]', f'Remove VTEPs for {name}'),
            (f'/ip address remove [find interface="{name}"]', f'Remove IP on {name}'),
            (f'/interface vxlan remove [find name="{name}"]', f'Remove VXLAN Interface {name}')
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
            "message": f"VXLAN Interface '{name}' applied successfully on RouterOS v7."
        }

    def verify(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_id: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        from backend.connections.ssh_manager import connection_manager

        vxlan_res = connection_manager.execute_command(device, f'/interface vxlan print detail where name="{vpn_id}" without-paging')
        vxlan_out = vxlan_res.get("output", "")

        vtep_res = connection_manager.execute_command(device, f'/interface vxlan vteps print detail where interface="{vpn_id}" without-paging')
        vtep_out = vtep_res.get("output", "")

        is_running = "running: yes" in vxlan_out.lower() or " R " in vxlan_out or "running=yes" in vxlan_out
        is_disabled = "disabled: yes" in vxlan_out.lower() or " X " in vxlan_out or "disabled=yes" in vxlan_out
        exists = vpn_id in vxlan_out

        vtep_count = len(re.findall(r'remote-ip=([^\s\n]+)', vtep_out))

        operational_status = "down"
        if is_disabled:
            operational_status = "disabled"
        elif is_running:
            operational_status = "up"
        elif exists:
            operational_status = "standby"

        vni_val = None
        m_vni = re.search(r'vni=(\d+)', vxlan_out)
        if m_vni:
            vni_val = int(m_vni.group(1))

        return {
            "vpn_id": vpn_id,
            "vpn_type": self.vpn_type,
            "operational_status": operational_status,
            "interface_exists": exists,
            "is_running": is_running,
            "vni": vni_val,
            "vtep_count": vtep_count
        }

    def get_status(self, device: Dict[str, Any], session: Any) -> List[Dict[str, Any]]:
        from backend.connections.ssh_manager import connection_manager
        results: List[Dict[str, Any]] = []

        vxlan_res = connection_manager.execute_command(device, '/interface vxlan print detail without-paging')
        vxlan_out = vxlan_res.get("output", "")

        blocks = vxlan_out.split("\n\n")
        for blk in blocks:
            m_name = re.search(r'name="?([^"\s\n]+)"?', blk)
            if m_name:
                vname = m_name.group(1)
                m_vni = re.search(r'vni=(\d+)', blk)
                vni = m_vni.group(1) if m_vni else "?"

                # Count VTEPs
                vt_res = connection_manager.execute_command(device, f'/interface vxlan vteps print count-only where interface="{vname}"')
                vt_count = 0
                try:
                    vt_count = int(vt_res.get("output", "0").strip())
                except ValueError:
                    vt_count = len(re.findall(r'interface=' + vname, blk))

                is_run = "running: yes" in blk.lower() or "running=yes" in blk.lower()
                is_dis = "disabled: yes" in blk.lower() or "disabled=yes" in blk.lower()

                results.append({
                    "id": vname,
                    "name": vname,
                    "type": "vxlan",
                    "mode": "overlay",
                    "status": "disabled" if is_dis else ("up" if is_run else "standby"),
                    "local_address": f"{device.get('ip', '0.0.0.0')}:4789",
                    "remote_address": f"VNI {vni} ({vt_count} VTEPs)",
                    "uptime": "Active Overlay" if is_run else "Ready"
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
        connection_manager.execute_command(device, f'/interface vxlan vteps remove [find interface="{vpn_id}"]')
        connection_manager.execute_command(device, f'/ip address remove [find interface="{vpn_id}"]')
        connection_manager.execute_command(device, f'/interface vxlan remove [find name="{vpn_id}"]')

        return {"success": True, "message": f"VXLAN interface '{vpn_id}' and all VTEPs removed."}
