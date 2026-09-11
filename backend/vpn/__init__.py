"""
Network VPN Subsystem Factory
Routes requests to the correct platform provider based on device.platform.
"""
from typing import Dict, Any
from backend.vpn.base import VPNProvider
from backend.vpn.mikrotik.provider import MikroTikVPNProvider

_PROVIDER_CACHE = {}

def get_vpn_provider(platform: str) -> VPNProvider:
    plat = (platform or "").strip().lower()
    if plat == "mikrotik_routeros":
        if "mikrotik_routeros" not in _PROVIDER_CACHE:
            _PROVIDER_CACHE["mikrotik_routeros"] = MikroTikVPNProvider()
        return _PROVIDER_CACHE["mikrotik_routeros"]
    
    raise ValueError(
        f"VPN Builder is not supported for platform '{platform}'. "
        f"Platform must strictly be 'mikrotik_routeros'. Cisco and other platforms do not support this feature."
    )
