"""
Cisco IOS / IOS-XE Platform Driver
Implements commands, prompt handling, output normalization and action generation for Cisco devices.
"""
from typing import Dict, Any, List, Optional
import re
from backend.drivers.base import NetworkDeviceDriver

class CiscoDriver(NetworkDeviceDriver):
    def __init__(self, platform: str = "cisco_ios_xe"):
        self.platform = platform
        self.platform_name = "Cisco IOS-XE" if platform == "cisco_ios_xe" else "Cisco IOS"
        self.capabilities = {
            "vlan": True,
            "interface_enable_disable": True,
            "port_security": True,
            "switchport_mode": True,
            "trunk": True,
            "save_config": True,
            "interface_description": True,
            "speed_duplex": True,
            "poe": True,
            "lldp_cdp": True,
        }

    def get_prompt(self, hostname: str, mode: str = "exec", context: str = "") -> str:
        clean_host = hostname or "Switch"
        if mode == "USER_EXEC":
            return f"{clean_host}>"
        elif mode == "PRIVILEGED_EXEC":
            return f"{clean_host}#"
        elif mode == "GLOBAL_CONFIG":
            return f"{clean_host}(config)#"
        elif mode == "INTERFACE_CONFIG":
            return f"{clean_host}(config-if)#"
        elif mode == "VLAN_CONFIG":
            return f"{clean_host}(config-vlan)#"
        return f"{clean_host}#"

    def get_command_help(self) -> List[Dict[str, Any]]:
        return [
            # Monitoring
            {"cmd": "show interfaces status", "desc": "نمایش وضعیت خلاصه تمام پورت‌ها", "descEn": "Display port status summary", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "show ip interface brief", "desc": "نمایش خلاصه IP و وضعیت پورت‌ها", "descEn": "Brief IP & line status of interfaces", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "show vlan brief", "desc": "نمایش لیست VLANها و پورت‌های منتسب", "descEn": "Display VLANs and assigned ports", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "show running-config", "desc": "نمایش پیکربندی جاری در حافظه RAM", "descEn": "Display active running configuration", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "show cdp neighbors detail", "desc": "نمایش مشخصات همسایگان متصل با پروتکل CDP", "descEn": "Detailed CDP neighbor discovery", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "show lldp neighbors", "desc": "نمایش جدول همسایگان پروتکل LLDP", "descEn": "Display LLDP neighbor topology table", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "show port-security", "desc": "بررسی جدول امنیت آدرس MAC پورت‌ها", "descEn": "Port-Security status & violation counts", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "show environment power", "desc": "بررسی توان مصرفی و منابع تغذیه PoE", "descEn": "Hardware environment & PoE power status", "category": "show", "mode": "PRIVILEGED_EXEC"},
            # Configuration
            {"cmd": "configure terminal", "desc": "ورود به محیط پیکربندی سراسری", "descEn": "Enter Global Configuration mode", "category": "config", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "interface GigabitEthernet1/0/1", "desc": "ورود به محیط کانفیگ اینترفیس", "descEn": "Enter Interface Configuration mode", "category": "config", "mode": "GLOBAL_CONFIG"},
            {"cmd": "shutdown", "desc": "غیرفعال‌سازی و خاموش کردن پورت (Admin Down)", "descEn": "Administratively disable the interface", "category": "action", "mode": "INTERFACE_CONFIG"},
            {"cmd": "no shutdown", "desc": "فعال‌سازی مجدد پورت (Admin Up)", "descEn": "Enable interface operational link", "category": "action", "mode": "INTERFACE_CONFIG"},
            {"cmd": "switchport mode access", "desc": "تنظیم مد پورت به دسترسی (Access)", "descEn": "Set interface switchport mode to access", "category": "config", "mode": "INTERFACE_CONFIG"},
            {"cmd": "switchport access vlan 10", "desc": "تخصیص شماره VLAN به پورت", "descEn": "Assign access VLAN membership", "category": "config", "mode": "INTERFACE_CONFIG"},
            {"cmd": "switchport mode trunk", "desc": "تنظیم پورت به عنوان ترانک 802.1Q", "descEn": "Set interface mode to IEEE 802.1Q Trunk", "category": "config", "mode": "INTERFACE_CONFIG"},
            {"cmd": "switchport port-security", "desc": "فعال‌سازی محدودیت امنیتی MAC پورت", "descEn": "Enable Port-Security feature on port", "category": "action", "mode": "INTERFACE_CONFIG"},
            {"cmd": "write memory", "desc": "ذخیره تغییرات در حافظه پایدار NVRAM", "descEn": "Save running-config to startup NVRAM", "category": "action", "mode": "PRIVILEGED_EXEC"},
        ]

    def generate_action_cli(self, action: str, interface: str, params: Optional[Dict[str, Any]] = None) -> str:
        params = params or {}
        if action == "shutdown":
            return f"configure terminal\ninterface {interface}\n shutdown\nexit\nexit"
        elif action == "no_shutdown":
            return f"configure terminal\ninterface {interface}\n no shutdown\nexit\nexit"
        elif action == "mode_trunk":
            return f"configure terminal\ninterface {interface}\n switchport trunk encapsulation dot1q\n switchport mode trunk\nexit\nexit"
        elif action == "mode_access":
            vlan = params.get("vlan", 1)
            return f"configure terminal\ninterface {interface}\n switchport mode access\n switchport access vlan {vlan}\nexit\nexit"
        elif action == "set_vlan":
            vlan = params.get("vlan", 1)
            return f"configure terminal\ninterface {interface}\n switchport mode access\n switchport access vlan {vlan}\nexit\nexit"
        elif action == "port_sec_enable":
            max_mac = params.get("max_mac", 1)
            violation = params.get("violation", "restrict")
            return f"configure terminal\ninterface {interface}\n switchport mode access\n switchport port-security\n switchport port-security maximum {max_mac}\n switchport port-security violation {violation}\n switchport port-security mac-address sticky\nexit\nexit"
        elif action == "port_sec_disable":
            return f"configure terminal\ninterface {interface}\n no switchport port-security\nexit\nexit"
        elif action == "set_description":
            desc = params.get("description", "")
            return f"configure terminal\ninterface {interface}\n description {desc}\nexit\nexit"
        elif action == "save_config":
            return "copy running-config startup-config"
        return f"# Cisco command for {action} on {interface}"

    def get_interface_query_commands(self) -> List[str]:
        return [
            "terminal length 0",
            "show interfaces status",
            "show ip interface brief"
        ]

    def parse_interfaces(self, raw_output: str) -> List[Dict[str, Any]]:
        """
        Parses standard Cisco 'show interfaces status' output table:
        Port      Name               Status       Vlan       Duplex  Speed Type
        Gi1/0/1   Uplink-Core        connected    trunk        a-full a-1000 10/100/1000BaseTX
        Gi1/0/2                      notconnect   10           auto   auto 10/100/1000BaseTX
        """
        ports = []
        lines = raw_output.splitlines()
        header_found = False

        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue
            if "Port" in line_str and "Status" in line_str and "Vlan" in line_str:
                header_found = True
                continue
            if not header_found:
                continue

            # Tokenize row
            parts = line_str.split()
            if len(parts) >= 6:
                port_id = parts[0]
                status_raw = parts[2] if len(parts) >= 6 else parts[1]
                vlan_raw = parts[3] if len(parts) >= 6 else "1"

                is_connected = "connect" in status_raw and "notconnect" not in status_raw and "disabled" not in status_raw
                is_disabled = "disabled" in status_raw or "err-disabled" in status_raw

                mode = "trunk" if "trunk" in vlan_raw.lower() else "access"
                vlan_num = 1
                try:
                    vlan_num = int(vlan_raw) if mode == "access" else 1
                except ValueError:
                    vlan_num = 1

                ports.append({
                    "port_id": port_id,
                    "name": port_id,
                    "status": "up" if is_connected else "down",
                    "admin_status": "disabled" if is_disabled else "enabled",
                    "mode": mode,
                    "vlan": vlan_num,
                    "allowed_vlans": "1-4094" if mode == "trunk" else str(vlan_num),
                    "speed": "1 Gbps",
                    "duplex": "Full",
                    "connected_device": "Active Link" if is_connected else "Disconnected",
                    "connected_type": "Host" if is_connected else "None",
                    "port_security_enabled": False,
                })

        return ports

    def get_default_ports(self, count: int = 24) -> List[Dict[str, Any]]:
        generated = []
        for i in range(1, count + 1):
            p_status = "up" if i <= 4 else ("down" if i % 3 == 0 else "up")
            is_trunk = (i <= 2)
            vlan_num = 1 if is_trunk else ((i % 4 + 1) * 10)
            generated.append({
                "port_id": f"Gi1/0/{i}",
                "name": f"GigabitEthernet1/0/{i}",
                "status": p_status,
                "admin_status": "enabled",
                "mode": "trunk" if is_trunk else "access",
                "vlan": vlan_num,
                "allowed_vlans": "1,10,20,30,50" if is_trunk else str(vlan_num),
                "speed": "1 Gbps",
                "duplex": "Full",
                "connected_device": f"Client-PC-{i}" if p_status == "up" else "Disconnected",
                "connected_type": "Host" if p_status == "up" else "None",
                "poe_status": "delivering" if (i % 2 == 1 and p_status == "up") else "off",
                "poe_power": 12.5 if (i % 2 == 1 and p_status == "up") else 0,
                "description": f"Port {i} Access",
                "port_security_enabled": True if (i > 2 and i % 2 == 1) else False,
                "port_security_max_mac": 1 if i % 4 != 3 else 2,
                "port_security_mode": "sticky" if i % 2 == 1 else "configured",
                "port_security_configured_mac": f"0050.56a1.{i:02x}01" if (i > 2 and i % 2 == 0) else "",
                "port_security_violation": "shutdown",
                "port_security_status": ("secure-up" if p_status == "up" else "secure-down") if (i > 2 and i % 2 == 1) else "disabled",
                "port_security_learned_macs": [f"0050.56a1.{i:02x}fe"] if (i > 2 and i % 2 == 1 and p_status == "up") else []
            })
        return generated
