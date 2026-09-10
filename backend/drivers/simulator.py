"""
Simulator Driver
Provides in-memory CLI interpretation and emulation for test/demo devices
completely segregated from live hardware SSH connections.
"""
from typing import Dict, Any, List, Optional
from backend.drivers.base import NetworkDeviceDriver
from backend.drivers.cisco import CiscoDriver
from backend.drivers.mikrotik import MikroTikDriver

class SimulatorDriver(NetworkDeviceDriver):
    def __init__(self, platform: str = "cisco_ios_xe"):
        self.platform = platform
        if "mikrotik" in platform:
            self._underlying = MikroTikDriver(platform)
        else:
            self._underlying = CiscoDriver(platform)
        self.platform_name = f"{self._underlying.platform_name} (Simulator)"
        self.capabilities = self._underlying.capabilities

    def get_prompt(self, hostname: str, mode: str = "exec", context: str = "") -> str:
        return self._underlying.get_prompt(hostname, mode, context)

    def get_command_help(self) -> List[Dict[str, Any]]:
        return self._underlying.get_command_help()

    def generate_action_cli(self, action: str, interface: str, params: Optional[Dict[str, Any]] = None) -> str:
        return self._underlying.generate_action_cli(action, interface, params)

    def get_interface_query_commands(self) -> List[str]:
        return self._underlying.get_interface_query_commands()

    def parse_interfaces(self, raw_output: str) -> List[Dict[str, Any]]:
        return self._underlying.parse_interfaces(raw_output)

    def get_default_ports(self, count: int = 24) -> List[Dict[str, Any]]:
        return self._underlying.get_default_ports(count)

    def execute_simulated_command(self, device: Dict[str, Any], ports: List[Dict[str, Any]], command: str, cli_mode: str = "USER_EXEC") -> Dict[str, Any]:
        """
        Executes a command inside the simulation context, returning simulated terminal output
        matched to the platform.
        """
        cmd = command.strip()
        cmd_lower = cmd.lower()
        dev_name = device.get("name", "Device")
        platform = self.platform

        if "mikrotik" in platform:
            # MikroTik RouterOS emulation
            if cmd == "/interface print" or cmd == "interface print":
                lines = ["Flags: D - dynamic, X - disabled, R - running, S - slave", " #    NAME                                TYPE       ACTUAL-MTU L2MTU  MAX-L2MTU"]
                for idx, p in enumerate(ports):
                    flag = "R " if p.get("status") == "up" else "  "
                    if p.get("admin_status") == "disabled":
                        flag = "X "
                    lines.append(f" {idx:<4} {flag} {p.get('port_id'):<35} ether      1500       1580   10218")
                return {"success": True, "output": "\n".join(lines)}

            elif "/system resource print" in cmd_lower:
                uptime = device.get("uptime", "42d 08:14:22")
                return {"success": True, "output": f"                   uptime: {uptime}\n                  version: 7.14.3 (stable)\n               build-time: Feb/21/2026 10:14:02\n         factory-software: 7.8\n              free-memory: 3874.2MiB\n             total-memory: 4096.0MiB\n                      cpu: ARM64\n                cpu-count: 4\n            cpu-frequency: 1400MHz\n                 cpu-load: 8%\n           free-hdd-space: 112.4MiB\n          total-hdd-space: 128.0MiB\n  write-sect-since-reboot: 18420\n         write-sect-total: 219400\n               architecture-name: arm64\n               board-name: CCR2004-16G-2S+\n                 platform: MikroTik"}

            elif "/system identity print" in cmd_lower:
                return {"success": True, "output": f"name: {dev_name}"}

            elif "/ip address print" in cmd_lower:
                ip = device.get("ip", "192.168.88.1")
                return {"success": True, "output": f"Flags: X - disabled, I - invalid, D - dynamic \n #   ADDRESS            NETWORK         INTERFACE\n 0   {ip}/24     192.168.88.0    ether1\n 1   10.10.10.1/24      10.10.10.0      sfp-sfpplus1"}

            elif "disable" in cmd_lower:
                return {"success": True, "output": "[admin@" + dev_name + "] > "}

            elif "enable" in cmd_lower:
                return {"success": True, "output": "[admin@" + dev_name + "] > "}

            elif cmd_lower.startswith("show "):
                return {"success": False, "output": f"bad command name {cmd.split()[0]} (line 1 column 1)\nDid you mean '/interface print' or '/system resource print'?"}

            else:
                return {"success": True, "output": f"[admin@{dev_name}] > "}

        else:
            # Cisco emulation
            if cmd_lower in ("show version", "sh ver"):
                return {"success": True, "output": f"Cisco IOS XE Software, Version 17.09.03a\nCisco IOS Software [Cupertino], Catalyst L3 Switch Software\nSystem image file is \"bootflash:packages.conf\"\ncisco {device.get('model', 'Catalyst 9300-48P')} with 8388608K bytes of physical memory.\nUptime is {device.get('uptime', '34 weeks, 2 days, 11 hours')}\nBase Ethernet MAC Address: {device.get('mac', '00:50:56:A1:02:01')}"}

            elif cmd_lower in ("show ip interface brief", "sh ip int br"):
                lines = ["Interface              IP-Address      OK? Method Status                Protocol"]
                for p in ports:
                    p_id = p.get("port_id", "Gi1/0/1")
                    stat = "up" if p.get("status") == "up" else "down"
                    if p.get("admin_status") == "disabled":
                        stat = "administratively down"
                    proto = "up" if p.get("status") == "up" and p.get("admin_status") != "disabled" else "down"
                    ip_addr = device.get("ip", "unassigned") if p.get("mode") == "routed" else "unassigned"
                    lines.append(f"{p_id:<22} {ip_addr:<15} YES unset  {stat:<21} {proto}")
                return {"success": True, "output": "\n".join(lines)}

            elif cmd_lower in ("show interfaces status", "sh int status"):
                lines = ["Port      Name               Status       Vlan       Duplex  Speed Type"]
                for p in ports:
                    p_id = p.get("port_id", "Gi1/0/1")
                    desc = (p.get("description") or "")[:18]
                    stat = "connected" if p.get("status") == "up" else "notconnect"
                    if p.get("admin_status") == "disabled":
                        stat = "disabled"
                    vlan_label = "trunk" if p.get("mode") == "trunk" else str(p.get("vlan", 1))
                    lines.append(f"{p_id:<9} {desc:<18} {stat:<12} {vlan_label:<10} a-full  a-1000 10/100/1000BaseTX")
                return {"success": True, "output": "\n".join(lines)}

            elif cmd_lower in ("write memory", "wr", "copy running-config startup-config", "copy run start"):
                return {"success": True, "output": "Building configuration...\n[OK]\nNVRAM committed successfully."}

            elif cmd_lower.startswith("/"):
                return {"success": False, "output": f"% Invalid input detected at '^' marker: {cmd}\n(Note: Device platform is Cisco IOS-XE. Use Cisco CLI commands such as 'show interfaces' or 'configure terminal')."}

            else:
                return {"success": True, "output": f"Executed '{cmd}' on {dev_name} (Cisco IOS-XE simulator)."}
