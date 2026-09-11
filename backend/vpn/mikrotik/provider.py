"""
MikroTik RouterOS VPN Master Provider
Dispatches to specific VPN protocol providers:
- L2TP/IPsec
- GRE Tunnel
- SSTP
- PPTP
- WireGuard (v7+)
- OpenVPN
- IPsec Site-to-Site
- EoIP Tunnel
- VXLAN Overlay (v7+)
"""
from typing import Dict, Any, List, Optional
from backend.vpn.base import VPNProvider
from backend.vpn.mikrotik.l2tp_ipsec import MikroTikL2TPIPsecProvider
from backend.vpn.mikrotik.gre import MikroTikGREProvider
from backend.vpn.mikrotik.sstp import MikroTikSSTPProvider
from backend.vpn.mikrotik.pptp import MikroTikPPTPProvider
from backend.vpn.mikrotik.wireguard import MikroTikWireGuardProvider
from backend.vpn.mikrotik.openvpn import MikroTikOpenVPNProvider
from backend.vpn.mikrotik.ipsec import MikroTikIPsecSiteToSiteProvider
from backend.vpn.mikrotik.eoip import MikroTikEoIPProvider
from backend.vpn.mikrotik.vxlan import MikroTikVXLANProvider

class MikroTikVPNProvider(VPNProvider):
    def __init__(self):
        self.providers: Dict[str, VPNProvider] = {
            "l2tp_ipsec": MikroTikL2TPIPsecProvider(),
            "gre": MikroTikGREProvider(),
            "sstp": MikroTikSSTPProvider(),
            "pptp": MikroTikPPTPProvider(),
            "wireguard": MikroTikWireGuardProvider(),
            "openvpn": MikroTikOpenVPNProvider(),
            "ipsec_site_to_site": MikroTikIPsecSiteToSiteProvider(),
            "ipsec": MikroTikIPsecSiteToSiteProvider(),
            "eoip": MikroTikEoIPProvider(),
            "vxlan": MikroTikVXLANProvider()
        }

    def _get_provider(self, vpn_type: str) -> VPNProvider:
        vpn_type_norm = (vpn_type or "").strip().lower()
        provider = self.providers.get(vpn_type_norm)
        if not provider:
            supported_types = sorted(list(set(self.providers.keys())))
            raise ValueError(f"VPN protocol '{vpn_type}' is not recognized. Supported: {', '.join(supported_types)}.")
        return provider

    def get_capabilities(self, device: Dict[str, Any]) -> Dict[str, Any]:
        firmware = device.get("firmware", "RouterOS v7.14.3 (stable)")
        is_v7 = "7." in firmware or "v7" in firmware.lower()
        sub_caps = [p.get_capabilities(device) for k, p in self.providers.items() if k != "ipsec"]

        return {
            "platform": "mikrotik_routeros",
            "platform_name": "MikroTik RouterOS",
            "firmware": firmware,
            "routeros_major_version": 7 if is_v7 else 6,
            "phase": 2,
            "available_vpns": sub_caps,
            "supported_catalog": [
                {
                    "type": "wireguard",
                    "name": "WireGuard",
                    "description": "State-of-the-art cryptographic tunnel. Extreme throughput and minimal latency.",
                    "status": "available" if is_v7 else "unsupported",
                    "unsupported_reason": None if is_v7 else "WireGuard requires MikroTik RouterOS v7 or newer.",
                    "modes": ["remote_access", "site_to_site"],
                    "phase": 2,
                    "recommended": True,
                    "recommended_for": ["High throughput site-to-site", "Mobile road-warriors", "Cross-cloud links"]
                },
                {
                    "type": "l2tp_ipsec",
                    "name": "L2TP/IPsec",
                    "description": "Remote access for mobile users & branch office site-to-site with IPsec hardware encryption.",
                    "status": "available",
                    "modes": ["remote_access", "site_to_site"],
                    "phase": 1,
                    "recommended_for": ["Native Windows/macOS/iOS built-in clients", "Branch routers"]
                },
                {
                    "type": "sstp",
                    "name": "SSTP (SSL/TLS)",
                    "description": "Secure Socket Tunneling Protocol over HTTPS port 443. Penetrates strict firewalls and NAT.",
                    "status": "available",
                    "modes": ["remote_access", "client"],
                    "phase": 2,
                    "requires_certificate": True,
                    "recommended_for": ["Restricted network bypass", "Windows native VPN clients", "TCP 443 traversal"]
                },
                {
                    "type": "openvpn",
                    "name": "OpenVPN",
                    "description": "Enterprise SSL/TLS virtual private network supporting user authentication and PKI certificates.",
                    "status": "available",
                    "modes": ["remote_access", "client"],
                    "phase": 2,
                    "requires_certificate": True,
                    "recommended_for": ["Multi-platform secure access", "Corporate remote workforce"]
                },
                {
                    "type": "ipsec_site_to_site",
                    "name": "IPsec Site-to-Site",
                    "description": "Direct policy-based hardware-accelerated IPsec tunnel interconnecting LAN subnets.",
                    "status": "available",
                    "modes": ["site_to_site"],
                    "phase": 2,
                    "recommended_for": ["Router-to-Router branch connections", "Cisco/Fortinet/PaloAlto interop"]
                },
                {
                    "type": "gre",
                    "name": "GRE Tunnel",
                    "description": "Point-to-point Generic Routing Encapsulation tunnel with routing & optional IPsec secret.",
                    "status": "available",
                    "modes": ["tunnel"],
                    "phase": 1,
                    "recommended_for": ["Dynamic routing overlays (OSPF/BGP)", "Direct router interconnects"]
                },
                {
                    "type": "eoip",
                    "name": "EoIP (Ethernet over IP)",
                    "description": "MikroTik Layer 2 Ethernet tunneling protocol to transparently bridge subnets across WAN.",
                    "status": "available",
                    "modes": ["tunnel"],
                    "phase": 2,
                    "recommended_for": ["Layer 2 LAN extension", "VLAN trunk transport over WAN", "Seamless roaming"]
                },
                {
                    "type": "vxlan",
                    "name": "VXLAN Overlay",
                    "description": "Scalable Layer 2/Layer 3 overlay with 24-bit VNI (up to 16 million network segments).",
                    "status": "available" if is_v7 else "unsupported",
                    "unsupported_reason": None if is_v7 else "VXLAN requires MikroTik RouterOS v7 or newer.",
                    "modes": ["overlay"],
                    "phase": 2,
                    "recommended_for": ["Multi-tenant datacenter interconnects", "Campus network virtualization"]
                },
                {
                    "type": "pptp",
                    "name": "PPTP (Legacy)",
                    "description": "Point-to-Point Tunneling Protocol over TCP 1723. Insecure legacy protocol.",
                    "status": "available",
                    "is_deprecated": True,
                    "security_warning": "Warning: PPTP is cryptographically insecure. Use only for legacy compatibility.",
                    "modes": ["remote_access", "client"],
                    "phase": 2,
                    "recommended_for": ["Legacy embedded systems only"]
                }
            ]
        }

    def validate(
        self,
        device: Dict[str, Any],
        vpn_type: str,
        mode: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        try:
            provider = self._get_provider(vpn_type)
            return provider.validate(device, mode, config)
        except ValueError as ve:
            return {
                "valid": False,
                "errors": [str(ve)],
                "warnings": []
            }

    def generate_configuration(
        self,
        device: Dict[str, Any],
        vpn_type: str,
        mode: str,
        config: Dict[str, Any],
        mask_secrets: bool = False
    ) -> List[str]:
        provider = self._get_provider(vpn_type)
        return provider.generate_configuration(device, mode, config, mask_secrets=mask_secrets)

    def apply(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_type: str,
        mode: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        provider = self._get_provider(vpn_type)
        return provider.apply(device, session, mode, config)

    def verify(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_id: str,
        vpn_type: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        provider = self._get_provider(vpn_type)
        return provider.verify(device, session, vpn_id, config)

    def get_status(self, device: Dict[str, Any], session: Any) -> List[Dict[str, Any]]:
        all_items: List[Dict[str, Any]] = []
        seen_ids = set()
        for k, p in self.providers.items():
            if k == "ipsec":
                continue
            try:
                items = p.get_status(device, session)
                for itm in items:
                    uid = f"{itm.get('type')}:{itm.get('id')}"
                    if uid not in seen_ids:
                        seen_ids.add(uid)
                        all_items.append(itm)
            except Exception as e:
                print(f"[MikroTikVPNProvider] Error querying status for {k}: {e}")
        return all_items

    def delete(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_id: str,
        vpn_type: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        provider = self._get_provider(vpn_type)
        return provider.delete(device, session, vpn_id, config)
