"""
Base Network Device Driver Interface
Defines the standard contract for platform-specific drivers (Cisco, MikroTik, etc.)
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class NetworkDeviceDriver(ABC):
    platform: str = "generic"
    platform_name: str = "Generic Network Device"
    default_prompt_suffix: str = "#"

    # Declared feature matrix for frontend UI adaptation
    capabilities: Dict[str, bool] = {
        "vlan": True,
        "interface_enable_disable": True,
        "port_security": False,
        "switchport_mode": False,
        "trunk": False,
        "save_config": False,
        "interface_description": True,
        "speed_duplex": True,
        "poe": False,
        "lldp_cdp": True,
    }

    @abstractmethod
    def get_prompt(self, hostname: str, mode: str = "exec", context: str = "") -> str:
        """Returns the appropriate CLI prompt for the platform and current mode."""
        pass

    @abstractmethod
    def get_command_help(self) -> List[Dict[str, Any]]:
        """Returns platform-specific command guide entries for the terminal sidebar."""
        pass

    @abstractmethod
    def generate_action_cli(self, action: str, interface: str, params: Optional[Dict[str, Any]] = None) -> str:
        """Generates real platform CLI syntax for a high-level action (e.g. shutdown, vlan assign)."""
        pass

    @abstractmethod
    def parse_interfaces(self, raw_output: str) -> List[Dict[str, Any]]:
        """Parses raw CLI command output into normalized SwitchPort dictionaries."""
        pass

    @abstractmethod
    def get_interface_query_commands(self) -> List[str]:
        """Returns the list of commands needed to poll interface statuses from a live device."""
        pass

    @abstractmethod
    def get_default_ports(self, count: int = 24) -> List[Dict[str, Any]]:
        """Generates realistic default normalized ports for this hardware platform if not seeded."""
        pass

    def get_capabilities(self) -> Dict[str, Any]:
        """Returns metadata and capability flags for this driver."""
        return {
            "platform": self.platform,
            "platform_name": self.platform_name,
            "capabilities": self.capabilities,
            "command_guide": self.get_command_help(),
        }
