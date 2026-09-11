"""
VPN Provider Base Architecture
Defines the core abstract contracts for platform VPN providers.
Extensible for future protocols (PPTP, SSTP, WireGuard, OpenVPN, etc.).
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional

class VPNProvider(ABC):
    """
    Abstract Base Class for Network Platform VPN Providers.
    Any platform (MikroTik RouterOS, future Cisco, VyOS, Linux) must implement this contract.
    """

    @abstractmethod
    def get_capabilities(self, device: Dict[str, Any]) -> Dict[str, Any]:
        """Returns platform-specific VPN capabilities and supported protocols."""
        pass

    @abstractmethod
    def validate(
        self,
        device: Dict[str, Any],
        vpn_type: str,
        mode: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validates configuration before generation.
        Returns:
            {
                "valid": bool,
                "errors": List[str],
                "warnings": List[str]
            }
        """
        pass

    @abstractmethod
    def generate_configuration(
        self,
        device: Dict[str, Any],
        vpn_type: str,
        mode: str,
        config: Dict[str, Any],
        mask_secrets: bool = False
    ) -> List[str]:
        """
        Generates platform native CLI commands.
        If mask_secrets=True, sensitive values (passwords, pre-shared keys)
        must be masked with '********'.
        """
        pass

    @abstractmethod
    def apply(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_type: str,
        mode: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Executes configuration commands via the provided device session.
        Implements atomic execution with step tracking and rollback on failure.
        """
        pass

    @abstractmethod
    def verify(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_id: str,
        vpn_type: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Directly queries the device to verify interface existence,
        flags, running state, and session statistics.
        """
        pass

    @abstractmethod
    def get_status(self, device: Dict[str, Any], session: Any) -> List[Dict[str, Any]]:
        """
        Queries all configured and active VPN tunnels/servers of supported types on the device.
        """
        pass

    @abstractmethod
    def delete(
        self,
        device: Dict[str, Any],
        session: Any,
        vpn_id: str,
        vpn_type: str,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Removes the specified VPN instance and cleans up associated pools,
        profiles, routes, or interfaces on the device.
        """
        pass
