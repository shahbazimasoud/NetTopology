"""
Simulator Driver
Provides in-memory CLI interpretation and emulation for test/demo devices
completely segregated from live hardware SSH connections.
"""
from typing import Dict, Any, List, Optional
from backend.drivers.base import NetworkDeviceDriver
from backend.drivers.cisco import CiscoDriver
from backend.drivers.mikrotik import MikroTikDriver

# In-memory VPN state for simulated MikroTik devices
_SIMULATED_MK_STATE: Dict[str, Dict[str, Any]] = {}

def _get_mk_state(dev_id: str) -> Dict[str, Any]:
    if dev_id not in _SIMULATED_MK_STATE:
        _SIMULATED_MK_STATE[dev_id] = {
            "l2tp_server": {
                "enabled": False,
                "use_ipsec": "required",
                "default_profile": "default",
                "ipsec_secret": ""
            },
            "sstp_server": {
                "enabled": False,
                "port": 443,
                "certificate": "sstp-server-cert",
                "default_profile": "default"
            },
            "pptp_server": {
                "enabled": False,
                "default_profile": "default"
            },
            "ovpn_server": {
                "enabled": False,
                "port": 1194,
                "protocol": "tcp",
                "certificate": "ovpn-server-cert",
                "default_profile": "default"
            },
            "gre_tunnels": {},
            "sstp_clients": {},
            "pptp_clients": {},
            "ovpn_clients": {},
            "wireguard_interfaces": {},
            "wireguard_peers": {},
            "ipsec_peers": {},
            "eoip_tunnels": {},
            "vxlan_interfaces": {},
            "vxlan_vteps": {},
            "bridge_ports": {},
            "certificates": [
                {
                    "name": "sstp-server-cert",
                    "common_name": "vpn.mikrotik.lan",
                    "ca": "yes",
                    "expired": False,
                    "invalid_before": "2024-01-01",
                    "invalid_after": "2029-01-01"
                },
                {
                    "name": "ovpn-server-cert",
                    "common_name": "ovpn.mikrotik.lan",
                    "ca": "yes",
                    "expired": False,
                    "invalid_before": "2024-01-01",
                    "invalid_after": "2029-01-01"
                }
            ],
            "ppp_profiles": {"default": {"local": "192.168.88.1", "remote": ""}},
            "ip_pools": {},
            "ppp_secrets": {},
            "active_sessions": [],
            "ip_routes": []
        }
    return _SIMULATED_MK_STATE[dev_id]

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

            elif "interface l2tp-server" in cmd_lower:
                dev_id = device.get("id", "dev")
                state = _get_mk_state(dev_id)
                if "server set" in cmd_lower:
                    if "enabled=yes" in cmd_lower:
                        state["l2tp_server"]["enabled"] = True
                    elif "enabled=no" in cmd_lower:
                        state["l2tp_server"]["enabled"] = False
                    if "default-profile=" in cmd_lower:
                        import re
                        m = re.search(r'default-profile="?([^"\s\n]+)"?', cmd)
                        if m:
                            state["l2tp_server"]["default_profile"] = m.group(1)
                    return {"success": True, "output": ""}
                elif "server print" in cmd_lower:
                    srv = state["l2tp_server"]
                    en_str = "yes" if srv["enabled"] else "no"
                    return {
                        "success": True,
                        "output": f"          enabled: {en_str}\n              mtu: 1450\n              mru: 1450\n  default-profile: {srv['default_profile']}\n        use-ipsec: {srv['use_ipsec']}\n     ipsec-secret: ********"
                    }
                elif "client add" in cmd_lower:
                    import re
                    m_name = re.search(r'name="?([^"\s]+)"?', cmd)
                    name = m_name.group(1) if m_name else "l2tp-out1"
                    m_conn = re.search(r'connect-to=([^\s]+)', cmd)
                    conn = m_conn.group(1) if m_conn else ""
                    state.setdefault("l2tp_clients", {})[name] = {
                        "name": name,
                        "connect_to": conn,
                        "running": True,
                        "disabled": False
                    }
                    return {"success": True, "output": ""}
                elif "client print" in cmd_lower:
                    clients = state.get("l2tp_clients", {})
                    blocks = []
                    for idx, (cname, cdata) in enumerate(clients.items()):
                        flag_r = "running=yes" if cdata.get("running") else "running=no"
                        flag_d = "disabled=yes" if cdata.get("disabled") else "disabled=no"
                        blocks.append(f'{idx}  R name="{cname}" connect-to={cdata.get("connect_to")} {flag_r} {flag_d} use-ipsec=yes')
                    return {"success": True, "output": "\n\n".join(blocks)}
                return {"success": True, "output": ""}

            elif "interface gre" in cmd_lower:
                dev_id = device.get("id", "dev")
                state = _get_mk_state(dev_id)
                if "add" in cmd_lower:
                    import re
                    m_name = re.search(r'name="?([^"\s]+)"?', cmd)
                    name = m_name.group(1) if m_name else "gre-tunnel1"
                    m_remote = re.search(r'remote-address=([^\s]+)', cmd)
                    remote = m_remote.group(1) if m_remote else "192.168.99.1"
                    m_local = re.search(r'local-address=([^\s]+)', cmd)
                    local = m_local.group(1) if m_local else ""
                    m_mtu = re.search(r'mtu=(\d+)', cmd)
                    mtu = int(m_mtu.group(1)) if m_mtu else 1476
                    state["gre_tunnels"][name] = {
                        "name": name,
                        "remote_address": remote,
                        "local_address": local,
                        "mtu": mtu,
                        "running": True,
                        "disabled": False
                    }
                    return {"success": True, "output": ""}
                elif "remove" in cmd_lower:
                    import re
                    m_name = re.search(r'name="?([^"\]\s]+)"?', cmd)
                    if m_name and m_name.group(1) in state["gre_tunnels"]:
                        del state["gre_tunnels"][m_name.group(1)]
                    return {"success": True, "output": ""}
                elif "print" in cmd_lower:
                    tunnels = state["gre_tunnels"]
                    blocks = []
                    for idx, (tname, tdata) in enumerate(tunnels.items()):
                        blocks.append(
                            f' {idx}  R  name="{tname}" mtu={tdata["mtu"]} actual-mtu={tdata["mtu"]} '
                            f'local-address={tdata["local_address"]} remote-address={tdata["remote_address"]} '
                            f'running=yes disabled=no keepalive=10s,3'
                        )
                    return {"success": True, "output": "\n\n".join(blocks) if blocks else ""}
                return {"success": True, "output": ""}

            elif "ppp active print" in cmd_lower:
                dev_id = device.get("id", "dev")
                state = _get_mk_state(dev_id)
                # If L2TP server enabled and secrets exist, simulate active connection for demo
                srv = state["l2tp_server"]
                if srv["enabled"] and state["ppp_secrets"]:
                    first_user = list(state["ppp_secrets"].keys())[0]
                    return {
                        "success": True,
                        "output": f"Flags: R - radius\n #   NAME         SERVICE CALLER-ID       ADDRESS         UPTIME   ENCODING\n 0   {first_user:<12} l2tp    198.51.100.45   192.168.89.10   01:14:22 CBC&SHA"
                    }
                return {"success": True, "output": "Flags: R - radius\n #   NAME         SERVICE CALLER-ID       ADDRESS         UPTIME   ENCODING"}

            elif "ppp secret" in cmd_lower:
                dev_id = device.get("id", "dev")
                state = _get_mk_state(dev_id)
                if "add" in cmd_lower:
                    import re
                    m_name = re.search(r'name="?([^"\s]+)"?', cmd)
                    uname = m_name.group(1) if m_name else "vpnuser"
                    state["ppp_secrets"][uname] = {"name": uname, "service": "l2tp"}
                    return {"success": True, "output": ""}
                elif "print" in cmd_lower:
                    lines = ["Flags: X - disabled", " #   NAME         SERVICE CALLER-ID       PASSWORD   PROFILE"]
                    for idx, (un, ud) in enumerate(state["ppp_secrets"].items()):
                        lines.append(f" {idx}   {un:<12} l2tp                           ********   profile-l2tp-ipsec")
                    return {"success": True, "output": "\n".join(lines)}
                return {"success": True, "output": ""}

            elif "interface sstp-server" in cmd_lower:
                dev_id = device.get("id", "dev")
                state = _get_mk_state(dev_id)
                if "server set" in cmd_lower:
                    state["sstp_server"]["enabled"] = "enabled=yes" in cmd_lower
                    return {"success": True, "output": ""}
                elif "server print" in cmd_lower:
                    en = "yes" if state["sstp_server"]["enabled"] else "no"
                    return {"success": True, "output": f"          enabled: {en}\n             port: {state['sstp_server']['port']}\n      certificate: {state['sstp_server']['certificate']}\n  default-profile: {state['sstp_server']['default_profile']}"}
                return {"success": True, "output": ""}

            elif "interface sstp-client" in cmd_lower:
                dev_id = device.get("id", "dev")
                state = _get_mk_state(dev_id)
                if "add" in cmd_lower:
                    import re
                    m_name = re.search(r'name="?([^"\s]+)"?', cmd)
                    name = m_name.group(1) if m_name else "sstp-out1"
                    m_conn = re.search(r'connect-to="?([^"\s]+)"?', cmd)
                    conn = m_conn.group(1) if m_conn else "198.51.100.10"
                    state["sstp_clients"][name] = {"name": name, "connect_to": conn, "running": True, "disabled": False}
                    return {"success": True, "output": ""}
                elif "remove" in cmd_lower:
                    import re
                    m_name = re.search(r'name="?([^"\]\s]+)"?', cmd)
                    if m_name and m_name.group(1) in state["sstp_clients"]:
                        del state["sstp_clients"][m_name.group(1)]
                    return {"success": True, "output": ""}
                elif "print" in cmd_lower:
                    blocks = []
                    for idx, (cname, cdata) in enumerate(state["sstp_clients"].items()):
                        blocks.append(f' {idx}  R  name="{cname}" connect-to="{cdata["connect_to"]}" running=yes disabled=no')
                    return {"success": True, "output": "\n\n".join(blocks)}
                return {"success": True, "output": ""}

            elif "interface pptp-server" in cmd_lower:
                dev_id = device.get("id", "dev")
                state = _get_mk_state(dev_id)
                if "server set" in cmd_lower:
                    state["pptp_server"]["enabled"] = "enabled=yes" in cmd_lower
                    return {"success": True, "output": ""}
                elif "server print" in cmd_lower:
                    en = "yes" if state["pptp_server"]["enabled"] else "no"
                    return {"success": True, "output": f"          enabled: {en}\n  default-profile: {state['pptp_server']['default_profile']}"}
                return {"success": True, "output": ""}

            elif "interface pptp-client" in cmd_lower:
                dev_id = device.get("id", "dev")
                state = _get_mk_state(dev_id)
                if "add" in cmd_lower:
                    import re
                    m_name = re.search(r'name="?([^"\s]+)"?', cmd)
                    name = m_name.group(1) if m_name else "pptp-out1"
                    m_conn = re.search(r'connect-to="?([^"\s]+)"?', cmd)
                    conn = m_conn.group(1) if m_conn else "198.51.100.10"
                    state["pptp_clients"][name] = {"name": name, "connect_to": conn, "running": True, "disabled": False}
                    return {"success": True, "output": ""}
                elif "remove" in cmd_lower:
                    import re
                    m_name = re.search(r'name="?([^"\]\s]+)"?', cmd)
                    if m_name and m_name.group(1) in state["pptp_clients"]:
                        del state["pptp_clients"][m_name.group(1)]
                    return {"success": True, "output": ""}
                elif "print" in cmd_lower:
                    blocks = []
                    for idx, (cname, cdata) in enumerate(state["pptp_clients"].items()):
                        blocks.append(f' {idx}  R  name="{cname}" connect-to="{cdata["connect_to"]}" running=yes disabled=no')
                    return {"success": True, "output": "\n\n".join(blocks)}
                return {"success": True, "output": ""}

            elif "interface wireguard" in cmd_lower:
                dev_id = device.get("id", "dev")
                state = _get_mk_state(dev_id)
                if "peers add" in cmd_lower:
                    import re
                    m_if = re.search(r'interface="?([^"\s]+)"?', cmd)
                    m_pub = re.search(r'public-key="?([^"\s]+)"?', cmd)
                    m_al = re.search(r'allowed-address="?([^"\s]+)"?', cmd)
                    pub = m_pub.group(1) if m_pub else "demo-pub-key="
                    iface = m_if.group(1) if m_if else "wg0"
                    state["wireguard_peers"].setdefault(iface, []).append({
                        "public_key": pub,
                        "allowed_address": m_al.group(1) if m_al else "0.0.0.0/0"
                    })
                    return {"success": True, "output": ""}
                elif "peers remove" in cmd_lower:
                    import re
                    m_if = re.search(r'interface="?([^"\]\s]+)"?', cmd)
                    if m_if and m_if.group(1) in state["wireguard_peers"]:
                        del state["wireguard_peers"][m_if.group(1)]
                    return {"success": True, "output": ""}
                elif "peers print" in cmd_lower:
                    if "count-only" in cmd_lower:
                        return {"success": True, "output": "1"}
                    import re
                    m_if = re.search(r'interface="?([^"\s]+)"?', cmd)
                    iface = m_if.group(1) if m_if else ""
                    peers = state["wireguard_peers"].get(iface, [{"public_key": "vPzF8xQ+DemoPublicKey=", "allowed_address": "10.200.0.2/32"}])
                    blocks = []
                    for idx, p in enumerate(peers):
                        blocks.append(f' {idx} interface="{iface or "wg0"}" public-key="{p["public_key"]}" allowed-address={p["allowed_address"]}')
                    return {"success": True, "output": "\n".join(blocks)}
                elif "add" in cmd_lower:
                    import re
                    m_name = re.search(r'name="?([^"\s]+)"?', cmd)
                    wname = m_name.group(1) if m_name else "wg0"
                    m_port = re.search(r'listen-port=(\d+)', cmd)
                    port = int(m_port.group(1)) if m_port else 13231
                    state["wireguard_interfaces"][wname] = {
                        "name": wname,
                        "listen_port": port,
                        "public_key": "vPzF8xQ+DemoServerPublicKeyABC123=",
                        "running": True,
                        "disabled": False
                    }
                    return {"success": True, "output": ""}
                elif "remove" in cmd_lower:
                    import re
                    m_name = re.search(r'name="?([^"\]\s]+)"?', cmd)
                    if m_name and m_name.group(1) in state["wireguard_interfaces"]:
                        del state["wireguard_interfaces"][m_name.group(1)]
                    return {"success": True, "output": ""}
                elif "print" in cmd_lower:
                    blocks = []
                    for idx, (wname, wdata) in enumerate(state["wireguard_interfaces"].items()):
                        blocks.append(f' {idx}  R  name="{wname}" listen-port={wdata["listen_port"]} mtu=1420 public-key="{wdata["public_key"]}" running=yes disabled=no')
                    return {"success": True, "output": "\n\n".join(blocks)}
                return {"success": True, "output": ""}

            elif "interface ovpn-server" in cmd_lower:
                dev_id = device.get("id", "dev")
                state = _get_mk_state(dev_id)
                if "server set" in cmd_lower:
                    state["ovpn_server"]["enabled"] = "enabled=yes" in cmd_lower
                    return {"success": True, "output": ""}
                elif "server print" in cmd_lower:
                    en = "yes" if state["ovpn_server"]["enabled"] else "no"
                    return {"success": True, "output": f"          enabled: {en}\n             port: {state['ovpn_server']['port']}\n             mode: ip\n         protocol: tcp\n      certificate: {state['ovpn_server']['certificate']}"}
                return {"success": True, "output": ""}

            elif "interface ovpn-client" in cmd_lower:
                dev_id = device.get("id", "dev")
                state = _get_mk_state(dev_id)
                if "add" in cmd_lower:
                    import re
                    m_name = re.search(r'name="?([^"\s]+)"?', cmd)
                    name = m_name.group(1) if m_name else "ovpn-out1"
                    m_conn = re.search(r'connect-to="?([^"\s]+)"?', cmd)
                    conn = m_conn.group(1) if m_conn else "198.51.100.10"
                    state["ovpn_clients"][name] = {"name": name, "connect_to": conn, "running": True, "disabled": False}
                    return {"success": True, "output": ""}
                elif "remove" in cmd_lower:
                    import re
                    m_name = re.search(r'name="?([^"\]\s]+)"?', cmd)
                    if m_name and m_name.group(1) in state["ovpn_clients"]:
                        del state["ovpn_clients"][m_name.group(1)]
                    return {"success": True, "output": ""}
                elif "print" in cmd_lower:
                    blocks = []
                    for idx, (cname, cdata) in enumerate(state["ovpn_clients"].items()):
                        blocks.append(f' {idx}  R  name="{cname}" connect-to="{cdata["connect_to"]}" running=yes disabled=no')
                    return {"success": True, "output": "\n\n".join(blocks)}
                return {"success": True, "output": ""}

            elif "interface eoip" in cmd_lower:
                dev_id = device.get("id", "dev")
                state = _get_mk_state(dev_id)
                if "add" in cmd_lower:
                    import re
                    m_name = re.search(r'name="?([^"\s]+)"?', cmd)
                    name = m_name.group(1) if m_name else "eoip-tunnel1"
                    m_remote = re.search(r'remote-address=([^\s]+)', cmd)
                    m_tid = re.search(r'tunnel-id=(\d+)', cmd)
                    state["eoip_tunnels"][name] = {
                        "name": name,
                        "remote_address": m_remote.group(1) if m_remote else "198.51.100.2",
                        "tunnel_id": int(m_tid.group(1)) if m_tid else 10,
                        "running": True,
                        "disabled": False
                    }
                    return {"success": True, "output": ""}
                elif "remove" in cmd_lower:
                    import re
                    m_name = re.search(r'name="?([^"\]\s]+)"?', cmd)
                    if m_name and m_name.group(1) in state["eoip_tunnels"]:
                        del state["eoip_tunnels"][m_name.group(1)]
                    return {"success": True, "output": ""}
                elif "print" in cmd_lower:
                    blocks = []
                    for idx, (tname, tdata) in enumerate(state["eoip_tunnels"].items()):
                        blocks.append(f' {idx}  R  name="{tname}" remote-address={tdata["remote_address"]} tunnel-id={tdata["tunnel_id"]} running=yes disabled=no')
                    return {"success": True, "output": "\n\n".join(blocks)}
                return {"success": True, "output": ""}

            elif "interface vxlan" in cmd_lower:
                dev_id = device.get("id", "dev")
                state = _get_mk_state(dev_id)
                if "vteps add" in cmd_lower:
                    import re
                    m_if = re.search(r'interface="?([^"\s]+)"?', cmd)
                    m_rip = re.search(r'remote-ip=([^\s]+)', cmd)
                    iface = m_if.group(1) if m_if else "vxlan100"
                    state["vxlan_vteps"].setdefault(iface, []).append(m_rip.group(1) if m_rip else "198.51.100.2")
                    return {"success": True, "output": ""}
                elif "vteps remove" in cmd_lower:
                    import re
                    m_if = re.search(r'interface="?([^"\]\s]+)"?', cmd)
                    if m_if and m_if.group(1) in state["vxlan_vteps"]:
                        del state["vxlan_vteps"][m_if.group(1)]
                    return {"success": True, "output": ""}
                elif "vteps print" in cmd_lower:
                    if "count-only" in cmd_lower:
                        return {"success": True, "output": "1"}
                    return {"success": True, "output": " 0 interface=vxlan100 remote-ip=198.51.100.2 port=4789"}
                elif "add" in cmd_lower:
                    import re
                    m_name = re.search(r'name="?([^"\s]+)"?', cmd)
                    vname = m_name.group(1) if m_name else "vxlan100"
                    m_vni = re.search(r'vni=(\d+)', cmd)
                    vni = int(m_vni.group(1)) if m_vni else 100
                    state["vxlan_interfaces"][vname] = {
                        "name": vname,
                        "vni": vni,
                        "running": True,
                        "disabled": False
                    }
                    return {"success": True, "output": ""}
                elif "remove" in cmd_lower:
                    import re
                    m_name = re.search(r'name="?([^"\]\s]+)"?', cmd)
                    if m_name and m_name.group(1) in state["vxlan_interfaces"]:
                        del state["vxlan_interfaces"][m_name.group(1)]
                    return {"success": True, "output": ""}
                elif "print" in cmd_lower:
                    blocks = []
                    for idx, (vname, vdata) in enumerate(state["vxlan_interfaces"].items()):
                        blocks.append(f' {idx}  R  name="{vname}" vni={vdata["vni"]} port=4789 mtu=1500 running=yes disabled=no')
                    return {"success": True, "output": "\n\n".join(blocks)}
                return {"success": True, "output": ""}

            elif "interface bridge port" in cmd_lower:
                return {"success": True, "output": ""}

            elif "certificate print" in cmd_lower:
                dev_id = device.get("id", "dev")
                state = _get_mk_state(dev_id)
                lines = ["Flags: K - private-key, D - dsa, L - crl, C - smart-card-key, A - authority, I - issued, R - revoked, E - expired, T - trusted", " #         NAME               COMMON-NAME        EXPIRED"]
                for idx, c in enumerate(state.get("certificates", [])):
                    flag = "KAT" if c.get("ca") == "yes" else "KT "
                    exp = "yes" if c.get("expired") else "no"
                    lines.append(f" {idx} {flag} {c['name']:<18} {c['common_name']:<18} {exp}")
                return {"success": True, "output": "\n".join(lines)}

            elif "ip ipsec" in cmd_lower:
                dev_id = device.get("id", "dev")
                state = _get_mk_state(dev_id)
                if "peer add" in cmd_lower:
                    import re
                    m_name = re.search(r'name="?([^"\s]+)"?', cmd)
                    pname = m_name.group(1) if m_name else "ipsec-site1"
                    m_addr = re.search(r'address=([^\s]+)', cmd)
                    addr = m_addr.group(1) if m_addr else "198.51.100.2/32"
                    state["ipsec_peers"][pname] = {"name": pname, "address": addr}
                    return {"success": True, "output": ""}
                elif "peer remove" in cmd_lower:
                    import re
                    m_name = re.search(r'name="?([^"\]\s]+)"?', cmd)
                    if m_name and m_name.group(1) in state["ipsec_peers"]:
                        del state["ipsec_peers"][m_name.group(1)]
                    return {"success": True, "output": ""}
                elif "active-peers print" in cmd_lower:
                    if state.get("ipsec_peers"):
                        first_peer = list(state["ipsec_peers"].keys())[0]
                        return {"success": True, "output": f"Flags: R - responder\n #   PEER       ID      STATE       UPTIME\n 0 R {first_peer:<12} 198.51.100.2 state=established 02:45:10"}
                    return {"success": True, "output": "Flags: R - responder\n #   PEER       ID      STATE       UPTIME"}
                elif "installed-sa print" in cmd_lower:
                    if state.get("ipsec_peers"):
                        return {"success": True, "output": "Flags: A - active, H - hw-accel\n 0 AH spi=0x2f9011 src=192.168.88.1 dst=198.51.100.2 state=installed"}
                    return {"success": True, "output": ""}
                elif "peer print" in cmd_lower:
                    blocks = []
                    for idx, (pname, pdata) in enumerate(state.get("ipsec_peers", {}).items()):
                        blocks.append(f' {idx} name="{pname}" address={pdata["address"]} profile=default exchange-mode=ike2')
                    return {"success": True, "output": "\n\n".join(blocks)}
                elif state["l2tp_server"]["enabled"]:
                    return {"success": True, "output": "Flags: R - responder\n #   PEER       ID      STATE       UPTIME\n 0 R 198.51.100.45      installed   01:14:20"}
                return {"success": True, "output": "Flags: R - responder\n #   PEER       ID      STATE       UPTIME"}

            elif "ip pool" in cmd_lower or "ppp profile" in cmd_lower:
                return {"success": True, "output": ""}

            elif "ip route" in cmd_lower:
                return {"success": True, "output": "Flags: D - dynamic, A - active, c - connect, s - static\n #      DST-ADDRESS        GATEWAY       DISTANCE\n 0 A s  10.0.50.0/24       gre-tunnel1   1"}

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
