"""
Drivers Package
Provides factory method to resolve the appropriate NetworkDeviceDriver based on platform and connection mode.
"""
from typing import Dict, Any, Optional
from backend.drivers.base import NetworkDeviceDriver
from backend.drivers.cisco import CiscoDriver
from backend.drivers.mikrotik import MikroTikDriver
from backend.drivers.simulator import SimulatorDriver

SUPPORTED_PLATFORMS = {
    "cisco_ios_xe": CiscoDriver,
    "cisco_ios": CiscoDriver,
    "mikrotik_routeros": MikroTikDriver,
}

def get_driver(platform: str, connection_mode: str = "ssh") -> NetworkDeviceDriver:
    clean_platform = (platform or "cisco_ios_xe").strip().lower()
    
    # Normalize synonyms
    if "mikrotik" in clean_platform or "routeros" in clean_platform:
        clean_platform = "mikrotik_routeros"
    elif "ios_xe" in clean_platform or "ios-xe" in clean_platform:
        clean_platform = "cisco_ios_xe"
    elif "cisco" in clean_platform or "ios" in clean_platform:
        clean_platform = "cisco_ios"

    driver_cls = SUPPORTED_PLATFORMS.get(clean_platform, CiscoDriver)

    if connection_mode == "simulator":
        return SimulatorDriver(clean_platform)

    return driver_cls(clean_platform)

def detect_platform_from_model(model: str) -> str:
    """Intelligently suggests a platform based on model name, without blindly forcing it."""
    m = (model or "").lower()
    if "mikrotik" in m or "routerboard" in m or "ccr" in m or "crs" in m or "rb" in m or "hap" in m:
        return "mikrotik_routeros"
    if "catalyst" in m or "9300" in m or "9500" in m or "3850" in m or "9200" in m:
        return "cisco_ios_xe"
    if "cisco" in m or "2960" in m or "isr" in m or "asr" in m:
        return "cisco_ios"
    return "cisco_ios_xe"
