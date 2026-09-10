"""
MikroTik RouterOS Platform Driver
Implements commands, prompt handling, output normalization and action generation for MikroTik RouterOS devices.
"""
from typing import Dict, Any, List, Optional
import re
from backend.drivers.base import NetworkDeviceDriver

class MikroTikDriver(NetworkDeviceDriver):
    def __init__(self, platform: str = "mikrotik_routeros"):
        self.platform = platform
        self.platform_name = "MikroTik RouterOS"
        self.capabilities = {
            "vlan": True,
            "interface_enable_disable": True,
            "port_security": False,
            "switchport_mode": False,
            "trunk": False,
            "save_config": False,  # RouterOS auto-commits commands immediately to persistent storage
            "interface_description": True,
            "speed_duplex": True,
            "poe": True,
            "lldp_cdp": True,
        }

    def get_prompt(self, hostname: str, mode: str = "exec", context: str = "") -> str:
        clean_host = hostname or "MikroTik"
        if context:
            clean_ctx = context.strip("/")
            return f"[admin@{clean_host}] /{clean_ctx}> "
        return f"[admin@{clean_host}] > "

    def get_command_help(self) -> List[Dict[str, Any]]:
        return [
            # System & Resource
            {"cmd": "/system resource print", "desc": "نمایش منابع سیستم، CPU، حافظه RAM و آپ‌تایم", "descEn": "Display CPU, Memory, Uptime and OS build", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/system identity print", "desc": "نمایش هاست‌نیم و شناسه دستگاه میکروتیک", "descEn": "Print system hostname identity", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/system health print", "desc": "بررسی ولتاژ، دما و سلامت سخت‌افزاری روتربورد", "descEn": "Display system voltage, temperature and fan sensors", "category": "show", "mode": "PRIVILEGED_EXEC"},
            # Interfaces & Ethernet
            {"cmd": "/interface print", "desc": "نمایش تمام اینترفیس‌ها و وضعیت پیوند (R = Running)", "descEn": "List all interfaces with running/disabled status", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/interface ethernet print", "desc": "نمایش اینترفیس‌های اترنت فیزیکی و سرعت لینک", "descEn": "Print physical ethernet interfaces & negotiation", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/interface ethernet monitor ether1 once", "desc": "مانیتورینگ بلادرنگ پورت ether1 (نرخ ارسال/دریافت)", "descEn": "Monitor live status and traffic on ether1", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/interface disable [find name=\"ether1\"]", "desc": "غیرفعال‌سازی و خاموش کردن اینترفیس ether1", "descEn": "Administratively disable interface ether1", "category": "action", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/interface enable [find name=\"ether1\"]", "desc": "فعال‌سازی و روشن کردن مجدد اینترفیس ether1", "descEn": "Administratively enable interface ether1", "category": "action", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/interface set [find name=\"ether1\"] comment=\"Uplink-Core\"", "desc": "ثبت کامنت و توضیحات شناسایی روی پورت", "descEn": "Set descriptive comment label on interface", "category": "config", "mode": "PRIVILEGED_EXEC"},
            # IP & Routing
            {"cmd": "/ip address print", "desc": "نمایش آدرس‌های IP و ماسک شبکه تخصیص‌یافته به پورت‌ها", "descEn": "Print IP address bindings and subnets", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/ip route print", "desc": "نمایش جدول مسیریابی و گیت‌وی‌های فعال (Active Routes)", "descEn": "Display IP routing table and active gateways", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/ip neighbor print", "desc": "کشف تجهیزات مجاور با پروتکل‌های MNDP، CDP و LLDP", "descEn": "List discovered neighbors via MNDP/CDP/LLDP", "category": "show", "mode": "PRIVILEGED_EXEC"},
            # VLAN & Bridge
            {"cmd": "/interface bridge port print", "desc": "نمایش پورت‌های عضو بریج و شناسه PVID", "descEn": "List bridge member ports and default PVIDs", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/interface vlan print", "desc": "نمایش اینترفیس‌های مجازی VLAN فعال روی روتر", "descEn": "Print virtual 802.1Q VLAN sub-interfaces", "category": "show", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/interface vlan add name=vlan10 vlan-id=10 interface=ether1", "desc": "ایجاد یک زیرپورت VLAN با تگ 10 روی اینترفیس", "descEn": "Create 802.1Q tagged VLAN interface", "category": "config", "mode": "PRIVILEGED_EXEC"},
            {"cmd": "/export compact", "desc": "استخراج کامل کانفیگ متنی روتر او اس (خروجی متنی)", "descEn": "Export concise active configuration script", "category": "show", "mode": "PRIVILEGED_EXEC"},
        ]

    def generate_action_cli(self, action: str, interface: str, params: Optional[Dict[str, Any]] = None) -> str:
        params = params or {}
        clean_iface = interface.strip()

        if action == "shutdown" or action == "disable_interface":
            return f"/interface set [find name=\"{clean_iface}\"] disabled=yes"
        elif action == "no_shutdown" or action == "enable_interface":
            return f"/interface set [find name=\"{clean_iface}\"] disabled=no"
        elif action == "set_description":
            desc = params.get("description", "")
            return f"/interface set [find name=\"{clean_iface}\"] comment=\"{desc}\""
        elif action == "set_vlan":
            vlan = params.get("vlan", 1)
            # Standard RouterOS VLAN assignment on bridge or sub-interface
            return f"/interface bridge port set [find interface=\"{clean_iface}\"] pvid={vlan}\n/interface vlan add name=\"vlan{vlan}-{clean_iface}\" vlan-id={vlan} interface=\"{clean_iface}\" disabled=no"
        elif action == "save_config":
            return "# [RouterOS Info] Configurations in MikroTik RouterOS are committed automatically to persistent storage."
        elif action in ("port_sec_enable", "port_sec_disable"):
            return "# [Unsupported] Cisco Port-Security is not applicable to MikroTik RouterOS. Use Bridge Filter / MAC Filter instead."
        return f"# MikroTik command for {action} on {clean_iface}"

    def get_interface_query_commands(self) -> List[str]:
        return [
            "/interface print detail without-paging",
            "/interface ethernet print detail without-paging",
            "/ip address print without-paging"
        ]

    def parse_interfaces(self, raw_output: str) -> List[Dict[str, Any]]:
        """
        Parses MikroTik RouterOS '/interface print detail' or '/interface ethernet print':
        Flags: D - dynamic, X - disabled, R - running, S - slave
         0  R  name="ether1" default-name="ether1" type="ether" mtu=1500 actual-mtu=1500
               mac-address=48:8F:5A:12:34:56
         1     name="ether2" default-name="ether2" type="ether" mtu=1500 actual-mtu=1500
        """
        ports = []
        entries = re.split(r'\n\s*(?=\d+\s+)', raw_output)

        for entry in entries:
            entry_str = entry.strip()
            if not entry_str:
                continue

            name_match = re.search(r'name="([^"]+)"', entry_str)
            if not name_match:
                # Try unquoted name=ether1
                name_match = re.search(r'name=([^\s]+)', entry_str)

            if name_match:
                port_id = name_match.group(1)
                flags_match = re.match(r'^\d+\s+([A-Z\s]+)', entry_str)
                flags = flags_match.group(1) if flags_match else ""

                is_disabled = "X" in flags or "disabled=yes" in entry_str
                is_running = "R" in flags or "running=yes" in entry_str

                ports.append({
                    "port_id": port_id,
                    "name": port_id,
                    "status": "up" if is_running else "down",
                    "admin_status": "disabled" if is_disabled else "enabled",
                    "mode": "access",
                    "vlan": 1,
                    "allowed_vlans": "1",
                    "speed": "1 Gbps" if "sfp" not in port_id.lower() else "10 Gbps",
                    "duplex": "Full",
                    "connected_device": "Link Connected" if is_running else "Disconnected",
                    "connected_type": "Host" if is_running else "None",
                    "port_security_enabled": False,
                })

        return ports

    def get_default_ports(self, count: int = 16) -> List[Dict[str, Any]]:
        generated = []
        # Standard MikroTik CCR / CRS layout: ether1 to ether(count-2), plus 2 SFP+ ports
        sfp_count = 2 if count >= 10 else 0
        eth_count = count - sfp_count

        for i in range(1, eth_count + 1):
            p_status = "up" if i <= 3 else ("down" if i % 2 == 0 else "up")
            generated.append({
                "port_id": f"ether{i}",
                "name": f"ether{i}",
                "status": p_status,
                "admin_status": "enabled",
                "mode": "access",
                "vlan": 1 if i == 1 else ((i % 3 + 1) * 10),
                "allowed_vlans": "1",
                "speed": "1 Gbps",
                "duplex": "Full",
                "connected_device": f"LAN-Host-{i}" if p_status == "up" else "Disconnected",
                "connected_type": "Host" if p_status == "up" else "None",
                "poe_status": "delivering" if (i == 1 and p_status == "up") else "off",
                "poe_power": 15.4 if (i == 1 and p_status == "up") else 0,
                "description": f"MikroTik LAN Port {i}",
                "port_security_enabled": False,
            })

        for s in range(1, sfp_count + 1):
            sfp_id = f"sfp-sfpplus{s}"
            generated.append({
                "port_id": sfp_id,
                "name": sfp_id,
                "status": "up" if s == 1 else "down",
                "admin_status": "enabled",
                "mode": "access",
                "vlan": 1,
                "allowed_vlans": "1-4094",
                "speed": "10 Gbps",
                "duplex": "Full",
                "connected_device": "Fiber Uplink" if s == 1 else "Disconnected",
                "connected_type": "Switch" if s == 1 else "None",
                "poe_status": "off",
                "poe_power": 0,
                "description": f"SFP+ 10G Optical Uplink {s}",
                "port_security_enabled": False,
            })

        return generated
