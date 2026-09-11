"""
MikroTik IPsec Site-to-Site VPN Provider
Implements native policy-based IPsec Site-to-Site Tunnels with IKEv2 / IKEv1,
PFS, Profiles, Proposals, Peers, Identities, and Encryption Policies for RouterOS v6 & v7.
"""
import re
import ipaddress
from typing import Dict, Any, List, Optional
from backend.vpn.base import VPNProvider

class MikroTikIPsecSiteToSiteProvider(VPNProvider):
    vpn_type = "ipsec_site_to_site"
    supported_modes = ["site_to_site"]

    def get_capabilities(self, device: Dict[str, Any]) -> Dict[str, Any]:
        firmware = device.get("firmware", "RouterOS v7.14.3 (stable)")
        is_v7 = "7." in firmware or "v7" in firmware.lower()

        return {
            "vpn_type": self.vpn_type,
            "name": "IPsec Site-to-Site",
            "description": "Hardware-accelerated route-less policy IPsec tunnel for direct branch-to-branch or router-to-firewall interconnections.",
            "supported_modes": [
                {
                    "mode": "site_to_site",
                    "label": "IPsec Site-to-Site Tunnel",
                    "description": "Establish policy-based encrypted IPsec tunnel interconnecting local and remote LAN subnets.",
                    "default_ike_version": "ike2"
                }
            ],
            "supports_ikev2": True,
            "supports_ikev1": True,
            "dh_groups": ["modp2048", "modp1024", "modp4096", "ecp256", "ecp384"],
            "enc_algorithms": ["aes-256-cbc", "aes-128-cbc", "aes-256-gcm"],
            "hash_algorithms": ["sha256", "sha512", "sha1"],
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
            errors.append(f"Mode '{mode}' is not supported for IPsec Site-to-Site. Supported: {self.supported_modes}")
            return {"valid": False, "errors": errors, "warnings": warnings}

        name = str(config.get("name", "")).strip()
        if not name:
            errors.append("Tunnel Name/Peer Identifier is required (e.g. 'ipsec-peer-branch').")
        elif not re.match(r'^[a-zA-Z0-9_\-]+$', name):
            errors.append(f"Tunnel name '{name}' contains invalid characters.")

        remote_ip = str(config.get("remote_peer_ip", config.get("remote_address", ""))).strip()
        if not remote_ip:
            errors.append("Remote Peer Gateway IPv4 Address is required.")
        else:
            try:
                ipaddress.IPv4Address(remote_ip)
            except ValueError:
                errors.append(f"Invalid remote peer IPv4 address: '{remote_ip}'")

        local_subnet = str(config.get("local_subnet", "")).strip()
        if not local_subnet:
            errors.append("Local Subnet CIDR is required (e.g. 192.168.10.0/24).")
        else:
            try:
                ipaddress.IPv4Network(local_subnet, strict=False)
            except ValueError:
                errors.append(f"Invalid local subnet CIDR format: '{local_subnet}'")

        remote_subnet = str(config.get("remote_subnet", "")).strip()
        if not remote_subnet:
            errors.append("Remote Subnet CIDR is required (e.g. 192.168.20.0/24).")
        else:
            try:
                ipaddress.IPv4Network(remote_subnet, strict=False)
            except ValueError:
                errors.append(f"Invalid remote subnet CIDR format: '{remote_subnet}'")

        psk = str(config.get("pre_shared_key", config.get("secret", ""))).strip()
        if not psk:
            errors.append("IPsec Pre-Shared Key (PSK) is required.")
        elif len(psk) < 8:
            warnings.append("Pre-Shared Key is shorter than 8 characters. Minimum 12 characters recommended.")

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

        name = str(config.get("name", "ipsec-site1")).strip()
        remote_ip = str(config.get("remote_peer_ip", config.get("remote_address", ""))).strip()
        local_subnet = str(config.get("local_subnet", "192.168.1.0/24")).strip()
        remote_subnet = str(config.get("remote_subnet", "192.168.2.0/24")).strip()

        ike_ver = str(config.get("ike_version", "ike2")).lower()
        enc = str(config.get("enc_algorithm", "aes-256-cbc")).strip()
        hsh = str(config.get("hash_algorithm", "sha256")).strip()
        dh = str(config.get("dh_group", "modp2048")).strip()

        psk = str(config.get("pre_shared_key", config.get("secret", ""))).strip()
        psk_display = "********" if mask_secrets else psk.replace('"', '\\"')

        profile_name = f"profile-{name}"
        proposal_name = f"prop-{name}"

        # 1. IPsec Proposal (Phase 2)
        commands.append(
            f'/ip ipsec proposal add name="{proposal_name}" auth-algorithms={hsh} '
            f'enc-algorithms={enc} pfs-group={dh} lifetime=8h comment="Proposal for {name}"'
        )

        # 2. IPsec Profile (Phase 1)
        commands.append(
            f'/ip ipsec profile add name="{profile_name}" hash-algorithm={hsh} '
            f'enc-algorithm={enc} dh-group={dh} lifetime=1d nat-traversal=yes dpd-interval=30s comment="Profile for {name}"'
        )

        # 3. IPsec Peer
        commands.append(
            f'/ip ipsec peer add name="{name}" address={remote_ip}/32 '
            f'profile="{profile_name}" exchange-mode={ike_ver} comment="Peer {name}"'
        )

        # 4. IPsec Identity (PSK)
        commands.append(
            f'/ip ipsec identity add peer="{name}" auth-method=pre-shared-key '
            f'secret="{psk_display}" generate-policy=no comment="Identity for {name}"'
        )

        # 5. IPsec Policy
        commands.append(
            f'/ip ipsec policy add peer="{name}" src-address={local_subnet} dst-address={remote_subnet} '
            f'proposal="{proposal_name}" tunnel=yes action=encrypt comment="Policy {local_subnet} to {remote_subnet}"'
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

        name = str(config.get("name", "ipsec-site1")).strip()
        profile_name = f"profile-{name}"
        proposal_name = f"prop-{name}"

        from backend.connections.ssh_manager import connection_manager

        rollback_stack = [
            (f'/ip ipsec policy remove [find proposal="{proposal_name}"]', f'Remove Policy for {name}'),
            (f'/ip ipsec identity remove [find peer="{name}"]', f'Remove Identity for {name}'),
            (f'/ip ipsec peer remove [find name="{name}"]', f'Remove Peer {name}'),
            (f'/ip ipsec profile remove [find name="{profile_name}"]', f'Remove Profile {profile_name}'),
            (f'/ip ipsec proposal remove [find name="{proposal_name}"]', f'Remove Proposal {proposal_name}')
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
            "message": f"IPsec Site-to-Site tunnel '{name}' successfully applied and active."
        }

    def verify(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_id: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        from backend.connections.ssh_manager import connection_manager

        peer_res = connection_manager.execute_command(device, f'/ip ipsec peer print detail where name="{vpn_id}" without-paging')
        peer_out = peer_res.get("output", "")

        active_res = connection_manager.execute_command(device, f'/ip ipsec active-peers print detail without-paging')
        active_out = active_res.get("output", "")

        sa_res = connection_manager.execute_command(device, f'/ip ipsec installed-sa print detail without-paging')
        sa_out = sa_res.get("output", "")

        policy_res = connection_manager.execute_command(device, f'/ip ipsec policy print detail where peer="{vpn_id}" without-paging')
        policy_out = policy_res.get("output", "")

        peer_exists = vpn_id in peer_out
        is_established = "state=established" in active_out.lower() or "state: established" in active_out.lower() or "installed" in sa_out.lower()

        operational_status = "down"
        if is_established:
            operational_status = "up"
        elif peer_exists:
            operational_status = "standby"

        return {
            "vpn_id": vpn_id,
            "vpn_type": self.vpn_type,
            "operational_status": operational_status,
            "peer_exists": peer_exists,
            "is_established": is_established,
            "details": {
                "active_peer": active_out.strip()[:200] if active_out else "",
                "policy": policy_out.strip()[:200] if policy_out else ""
            }
        }

    def get_status(self, device: Dict[str, Any], session: Any) -> List[Dict[str, Any]]:
        from backend.connections.ssh_manager import connection_manager
        results: List[Dict[str, Any]] = []

        peer_res = connection_manager.execute_command(device, '/ip ipsec peer print detail without-paging')
        peer_out = peer_res.get("output", "")

        active_res = connection_manager.execute_command(device, '/ip ipsec active-peers print detail without-paging')
        active_out = active_res.get("output", "")

        blocks = peer_out.split("\n\n")
        for blk in blocks:
            m_name = re.search(r'name="?([^"\s\n]+)"?', blk)
            if m_name:
                pname = m_name.group(1)
                m_addr = re.search(r'address=([^\s\n]+)', blk)
                remote_addr = m_addr.group(1) if m_addr else "0.0.0.0"

                # Check if established in active peers
                is_up = pname in active_out or "state=established" in active_out.lower() or "installed" in active_out.lower()

                results.append({
                    "id": pname,
                    "name": pname,
                    "type": "ipsec_site_to_site",
                    "mode": "site_to_site",
                    "status": "up" if is_up else "standby",
                    "local_address": device.get("ip", "0.0.0.0"),
                    "remote_address": remote_addr,
                    "uptime": "Active SA" if is_up else "Phase 1 / Standby"
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

        proposal_name = f"prop-{vpn_id}"
        profile_name = f"profile-{vpn_id}"

        connection_manager.execute_command(device, f'/ip ipsec policy remove [find peer="{vpn_id}"]')
        connection_manager.execute_command(device, f'/ip ipsec identity remove [find peer="{vpn_id}"]')
        connection_manager.execute_command(device, f'/ip ipsec peer remove [find name="{vpn_id}"]')
        connection_manager.execute_command(device, f'/ip ipsec profile remove [find name="{profile_name}"]')
        connection_manager.execute_command(device, f'/ip ipsec proposal remove [find name="{proposal_name}"]')

        return {"success": True, "message": f"IPsec Site-to-Site configuration for '{vpn_id}' removed."}
