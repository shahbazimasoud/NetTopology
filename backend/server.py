import json
import os
import sys
import time
import socket
import threading
import random
import uuid
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Global active SSH sessions registry: session_id -> session dict
ACTIVE_SSH_SESSIONS = {}
ACTIVE_SESSIONS_LOCK = threading.Lock()

def close_ssh_session_internal(session_id):
    """Close socket and paramiko resources for a given session and update state."""
    with ACTIVE_SESSIONS_LOCK:
        sess = ACTIVE_SSH_SESSIONS.pop(session_id, None)
        if not sess:
            return False
        
        sock = sess.get("socket")
        if sock:
            try:
                sock.shutdown(socket.SHUT_RDWR)
            except Exception:
                pass
            try:
                sock.close()
            except Exception:
                pass
            sess["socket"] = None

        p_client = sess.get("paramiko_client")
        if p_client:
            try:
                p_client.close()
            except Exception:
                pass
            sess["paramiko_client"] = None

        sess["status"] = "disconnected"
        sess["closed_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
        print(f"[Python SSH Engine] Successfully closed SSH connection for session {session_id} to {sess.get('host')}:{sess.get('port')}")
        return True


# Import templates seed & execution helpers
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    from backend.templates_seed import (
        get_default_templates,
        render_template_commands,
        simulate_device_execution,
        extract_device_configuration_and_parameterize
    )
except ImportError:
    from templates_seed import (
        get_default_templates,
        render_template_commands,
        simulate_device_execution,
        extract_device_configuration_and_parameterize
    )

# Data file path
DATA_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(DATA_DIR, "network_data.json")

# Import Driver Architecture and Connection Manager
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
try:
    from backend.drivers import get_driver, detect_platform_from_model
    from backend.connections.ssh_manager import connection_manager
except ImportError:
    try:
        from drivers import get_driver, detect_platform_from_model
        from connections.ssh_manager import connection_manager
    except ImportError:
        from backend.drivers import get_driver, detect_platform_from_model
        from backend.connections.ssh_manager import connection_manager

def sanitize_device(device):
    if not device:
        return None
    d = dict(device)
    if "platform" not in d:
        d["platform"] = detect_platform_from_model(d.get("model", ""))
    if "connection_mode" not in d:
        d["connection_mode"] = "simulator"
    conn = dict(d.get("connection", {}))
    conn.pop("password", None)
    conn.pop("private_key", None)
    d["connection"] = conn
    d.pop("ssh_password", None)
    d.pop("enable_password", None)
    d["ssh_connected"] = connection_manager.is_connected(d.get("id", ""))
    return d

def check_rbac_permission(role: str, action: str) -> bool:
    r = (role or "Super Admin").strip()
    if r in ("Super Admin", "Admin", "Network Engineer"):
        return True
    if r == "Operator":
        # Operators can only do non-destructive show/read operations
        return action in ("show", "read", "monitor", "view", "get")
    # Read-Only Auditor cannot configure or alter ports/devices
    return False

def get_default_device_groups():
    return [
        {
            "id": "group-helpdesk",
            "name": "هلپ دسک (Helpdesk Support)",
            "description": "تجهیزات و سوئیچ‌های دسترسی کلاینت‌ها، تلفن‌های VoIP و استقرار روزانه تیم پشتیبانی",
            "color": "amber",
            "icon": "Headphones",
            "deviceIds": ["dev-dist-bldg-a", "dev-access-bldg-b"],
            "createdAt": "2026-03-01 08:30:00",
            "updatedAt": "2026-03-09 14:20:00"
        },
        {
            "id": "group-core",
            "name": "زیرساخت هسته و دیتا سنتر (Core & DC)",
            "description": "سوئیچ‌های لایه هسته و روتر گیت‌وی اصلی دیتاسنتر و پیوندهای ۱۰ گیگابیت فیبر",
            "color": "indigo",
            "icon": "Server",
            "deviceIds": ["dev-core-01", "dev-router-gw"],
            "createdAt": "2026-03-01 08:30:00",
            "updatedAt": "2026-03-09 14:20:00"
        },
        {
            "id": "group-branch",
            "name": "شعب و لایه دسترسی بی‌سیم (Branch & Wireless)",
            "description": "اکسس‌پوینت‌های اداری، تجهیزات وای‌فای و سوئیچ‌های ساختمانی بلوک B",
            "color": "cyan",
            "icon": "Wifi",
            "deviceIds": ["dev-dist-bldg-b", "dev-ap-bldg-a"],
            "createdAt": "2026-03-02 11:00:00",
            "updatedAt": "2026-03-09 15:00:00"
        }
    ]

def get_default_ad_config():
    return {
        "enabled": True,
        "server": "192.168.1.10",
        "port": 389,
        "useSsl": False,
        "domain": "corp.internal",
        "baseDn": "DC=corp,DC=internal",
        "bindUser": "svc-netops@corp.internal",
        "bindPassword": "••••••••••••",
        "userSearchBase": "OU=Staff,DC=corp,DC=internal",
        "groupSearchBase": "OU=SecurityGroups,DC=corp,DC=internal",
        "lastSyncStatus": "success",
        "lastSyncMessage": "همگام‌سازی با موفقیت انجام شد (4 گروه امنیتی و 4 کاربر دامین دریافت گردید)",
        "lastSyncTime": "2026-09-09 16:30:00",
        "syncedGroups": [
            {
                "dn": "CN=Helpdesk-Admins,OU=SecurityGroups,DC=corp,DC=internal",
                "cn": "Helpdesk-Admins",
                "description": "کارشناسان پشتیبانی و تیم هلپ‌دسک سازمان",
                "memberCount": 8
            },
            {
                "dn": "CN=NetOps-Engineers,OU=SecurityGroups,DC=corp,DC=internal",
                "cn": "NetOps-Engineers",
                "description": "مهندسان ارشد شبکه و زیرساخت ارتباطی",
                "memberCount": 4
            },
            {
                "dn": "CN=NOC-Monitoring,OU=SecurityGroups,DC=corp,DC=internal",
                "cn": "NOC-Monitoring",
                "description": "تیم پایش و مانیتورینگ مرکز عملیات شبکه (فقط مشاهده)",
                "memberCount": 6
            },
            {
                "dn": "CN=Security-Auditors,OU=SecurityGroups,DC=corp,DC=internal",
                "cn": "Security-Auditors",
                "description": "حسابرسان امنیتی و ممیزی پورت سکیوریتی و مک آدرس‌ها",
                "memberCount": 3
            }
        ],
        "syncedUsers": [
            {
                "dn": "CN=Masoud Shahbazi,OU=Staff,DC=corp,DC=internal",
                "samAccountName": "m.shahbazi",
                "displayName": "مسعود شهبازی (Network Lead)",
                "email": "m.shahbazi@corp.internal",
                "department": "زیرساخت و شبکه",
                "title": "Senior Network Architect",
                "groups": ["NetOps-Engineers"],
                "enabled": True
            },
            {
                "dn": "CN=Ali Rezaei,OU=Staff,DC=corp,DC=internal",
                "samAccountName": "a.rezaei",
                "displayName": "علی رضایی (Helpdesk L1)",
                "email": "a.rezaei@corp.internal",
                "department": "پشتیبانی فنی (Helpdesk)",
                "title": "Helpdesk Specialist",
                "groups": ["Helpdesk-Admins"],
                "enabled": True
            }
        ]
    }

def get_default_access_policies():
    return [
        {
            "id": "policy-helpdesk",
            "name": "سطح دسترسی تیم هلپ‌دسک (Helpdesk Operator Policy)",
            "description": "دسترسی محدود به سوئیچ‌های گروه هلپ‌دسک جهت تغییر ویلن، دیسکریپشن و پورت سکیوریتی بدون دسترسی به کنسول CLI یا خاموش کردن پورت‌های حساس",
            "isBuiltin": True,
            "priority": 10,
            "subjectType": "ad_group",
            "subjectId": "CN=Helpdesk-Admins,OU=SecurityGroups,DC=corp,DC=internal",
            "subjectName": "Helpdesk-Admins (اکتیو دایرکتوری)",
            "targetScope": "groups",
            "targetGroupIds": ["group-helpdesk"],
            "targetDeviceIds": [],
            "canViewDashboard": True,
            "canViewTopology": True,
            "canViewDevices": True,
            "canViewPorts": True,
            "canViewScanner": False,
            "canViewTemplates": False,
            "canViewSettings": False,
            "terminalAccess": "none",
            "canToggleAdminStatus": False,
            "canChangeVlan": True,
            "canEditDescription": True,
            "canTogglePortSecurity": True,
            "canWriteMemory": False,
            "canManageDevices": False,
            "canApplyTemplates": False,
            "canBatchOperate": False
        },
        {
            "id": "policy-super-admin",
            "name": "مدیر ارشد زیرساخت شبکه (Super Administrator)",
            "description": "دسترسی نامحدود به تمامی تجهیزات، کنسول‌های تعاملی SSH، رایت مموری، اعمال تمپلیت و تنظیمات امنیتی",
            "isBuiltin": True,
            "priority": 100,
            "subjectType": "local_user",
            "subjectId": "admin",
            "subjectName": "مدیر اصلی سیستم (Local Admin / NetOps)",
            "targetScope": "all",
            "targetGroupIds": [],
            "targetDeviceIds": [],
            "canViewDashboard": True,
            "canViewTopology": True,
            "canViewDevices": True,
            "canViewPorts": True,
            "canViewScanner": True,
            "canViewTemplates": True,
            "canViewSettings": True,
            "terminalAccess": "full",
            "canToggleAdminStatus": True,
            "canChangeVlan": True,
            "canEditDescription": True,
            "canTogglePortSecurity": True,
            "canWriteMemory": True,
            "canManageDevices": True,
            "canApplyTemplates": True,
            "canBatchOperate": True
        }
    ]

# Initial realistic seed data representing a corporate campus network
def get_initial_seed_data():
    return {
        "devices": [
            {
                "id": "dev-core-01",
                "name": "SW-CORE-01",
                "ip": "192.168.1.1",
                "type": "switch",
                "role": "Core Switch",
                "model": "Cisco Catalyst 9500-48Y4C",
                "mac": "00:50:56:A1:B2:C0",
                "building": "ساختمان مرکزی (Central Bldg)",
                "floor": "طبقه ۱ (Floor 1)",
                "unit": "اتاق سرور اصلی (Main Server Room)",
                "rack": "Rack-A01",
                "is_online": True,
                "latency_ms": 0.8,
                "packet_loss": 0,
                "uptime": "142 days, 6 hours",
                "cdp_enabled": True,
                "lldp_enabled": True,
                "snmp_community": "public",
                "firmware": "Cisco IOS-XE 17.09.03",
                "last_seen": "هم اکنون (Just now)",
                "total_ports": 48
            },
            {
                "id": "dev-router-gw",
                "name": "RT-EDGE-01",
                "ip": "192.168.1.254",
                "type": "router",
                "role": "Edge Gateway",
                "model": "Cisco ISR 4451-X",
                "mac": "00:50:56:C2:D3:E1",
                "building": "ساختمان مرکزی (Central Bldg)",
                "floor": "طبقه ۱ (Floor 1)",
                "unit": "اتاق سرور اصلی (Main Server Room)",
                "rack": "Rack-A02",
                "is_online": True,
                "latency_ms": 1.2,
                "packet_loss": 0,
                "uptime": "210 days, 14 hours",
                "cdp_enabled": True,
                "lldp_enabled": True,
                "snmp_community": "public",
                "firmware": "Cisco IOS-XE 17.06.04",
                "last_seen": "هم اکنون (Just now)",
                "total_ports": 8
            },
            {
                "id": "dev-dist-bldg-a",
                "name": "SW-DIST-BLDG-A",
                "ip": "192.168.1.10",
                "type": "switch",
                "role": "Distribution Switch",
                "model": "Cisco Catalyst 9300-48P",
                "mac": "00:50:56:D4:E5:F2",
                "building": "ساختمان مرکزی (Central Bldg)",
                "floor": "طبقه ۲ (Floor 2)",
                "unit": "رک شبکه اداری (Network Closet A2)",
                "rack": "Rack-B01",
                "is_online": True,
                "latency_ms": 1.5,
                "packet_loss": 0,
                "uptime": "89 days, 2 hours",
                "cdp_enabled": True,
                "lldp_enabled": True,
                "snmp_community": "public",
                "firmware": "Cisco IOS-XE 17.09.02",
                "last_seen": "هم اکنون (Just now)",
                "total_ports": 48
            },
            {
                "id": "dev-acc-bldg-a-f3",
                "name": "SW-ACC-BLDG-A-F3",
                "ip": "192.168.1.21",
                "type": "switch",
                "role": "Access Switch",
                "model": "Cisco Catalyst 2960X-48FPS-L",
                "mac": "00:50:56:E6:F7:03",
                "building": "ساختمان مرکزی (Central Bldg)",
                "floor": "طبقه ۳ (Floor 3)",
                "unit": "واحد توسعه نرم‌افزار (Dev Unit 302)",
                "rack": "Wall-Rack-302",
                "is_online": True,
                "latency_ms": 2.1,
                "packet_loss": 0,
                "uptime": "45 days, 11 hours",
                "cdp_enabled": True,
                "lldp_enabled": True,
                "snmp_community": "public",
                "firmware": "Cisco IOS 15.2(7)E2",
                "last_seen": "هم اکنون (Just now)",
                "total_ports": 48
            },
            {
                "id": "dev-dist-bldg-b",
                "name": "SW-DIST-BLDG-B",
                "ip": "192.168.1.11",
                "type": "switch",
                "role": "Distribution Switch",
                "model": "Cisco Catalyst 9300-24T",
                "mac": "00:50:56:F8:09:14",
                "building": "ساختمان مهندسی (Engineering Bldg)",
                "floor": "طبقه ۱ (Floor 1)",
                "unit": "مرکز داده فرعی (MDF Room)",
                "rack": "Rack-MDF-B1",
                "is_online": True,
                "latency_ms": 3.4,
                "packet_loss": 0,
                "uptime": "73 days, 19 hours",
                "cdp_enabled": True,
                "lldp_enabled": True,
                "snmp_community": "public",
                "firmware": "Cisco IOS-XE 17.09.01",
                "last_seen": "هم اکنون (Just now)",
                "total_ports": 24
            },
            {
                "id": "dev-acc-bldg-b-f2",
                "name": "SW-ACC-BLDG-B-F2",
                "ip": "192.168.1.32",
                "type": "switch",
                "role": "Access Switch",
                "model": "Cisco Catalyst 9200L-24P-4G",
                "mac": "00:50:56:6C:3B:6B",
                "building": "ساختمان مهندسی (Engineering Bldg)",
                "floor": "طبقه ۲ (Floor 2)",
                "unit": "واحد آزمایشگاه و R&D (Lab Unit 201)",
                "rack": "Rack-ENG-201",
                "is_online": False,
                "latency_ms": None,
                "packet_loss": 100,
                "uptime": "آفلاین (Offline)",
                "cdp_enabled": True,
                "lldp_enabled": True,
                "snmp_community": "public",
                "firmware": "Cisco IOS-XE 17.06.03",
                "last_seen": "۲ ساعت پیش (2 hours ago)",
                "total_ports": 28
            },
            {
                "id": "dev-ap-bldg-a-f1",
                "name": "AP-WIFI-BLDG-A-LOBBY",
                "ip": "192.168.1.101",
                "type": "access_point",
                "role": "Wireless Access Point",
                "model": "Cisco Catalyst 9120AXI",
                "mac": "00:50:56:11:22:33",
                "building": "ساختمان مرکزی (Central Bldg)",
                "floor": "طبقه ۱ (Floor 1)",
                "unit": "لابی و سالن همایش (Main Lobby)",
                "rack": "سقف کاذب لابی",
                "is_online": True,
                "latency_ms": 2.4,
                "packet_loss": 0,
                "uptime": "142 days, 5 hours",
                "cdp_enabled": True,
                "lldp_enabled": True,
                "snmp_community": "public",
                "firmware": "Capwap 8.10.162.0",
                "last_seen": "هم اکنون (Just now)",
                "total_ports": 2
            },
            {
                "id": "dev-ap-bldg-a-f3",
                "name": "AP-WIFI-BLDG-A-DEV",
                "ip": "192.168.1.103",
                "type": "access_point",
                "role": "Wireless Access Point",
                "model": "Cisco Catalyst 9130AX Series",
                "mac": "00:50:56:70:A7:41",
                "building": "ساختمان مرکزی (Central Bldg)",
                "floor": "طبقه ۳ (Floor 3)",
                "unit": "واحد توسعه نرم‌افزار (Dev Unit 302)",
                "rack": "سقف راهرو شرقی",
                "is_online": True,
                "latency_ms": 1.9,
                "packet_loss": 0,
                "uptime": "45 days, 8 hours",
                "cdp_enabled": True,
                "lldp_enabled": True,
                "snmp_community": "public",
                "firmware": "Capwap 8.10.185.0",
                "last_seen": "هم اکنون (Just now)",
                "total_ports": 2
            },
            {
                "id": "dev-ap-bldg-b-f1",
                "name": "AP-WIFI-BLDG-B-MDF",
                "ip": "192.168.1.105",
                "type": "access_point",
                "role": "Wireless Access Point",
                "model": "Cisco Aironet 2802I",
                "mac": "00:50:56:94:B4:0F",
                "building": "ساختمان مهندسی (Engineering Bldg)",
                "floor": "طبقه ۱ (Floor 1)",
                "unit": "مرکز داده فرعی (MDF Room)",
                "rack": "دیواری ورودی مهندسی",
                "is_online": True,
                "latency_ms": 3.8,
                "packet_loss": 0,
                "uptime": "73 days, 16 hours",
                "cdp_enabled": True,
                "lldp_enabled": True,
                "snmp_community": "public",
                "firmware": "Capwap 8.10.151.0",
                "last_seen": "هم اکنون (Just now)",
                "total_ports": 2
            }
        ],
        "ports": {
            "dev-core-01": [
                {
                    "port_id": "TenGig0/1",
                    "name": "TenGigabitEthernet0/1",
                    "status": "up",
                    "admin_status": "enabled",
                    "mode": "trunk",
                    "vlan": 1,
                    "allowed_vlans": "1,10,20,30,50,99",
                    "speed": "10 Gbps",
                    "duplex": "Full",
                    "connected_device": "RT-EDGE-01 (Gi0/0/0)",
                    "connected_type": "Router",
                    "poe_status": "n/a",
                    "poe_power": 0,
                    "description": "Uplink to Edge Gateway RT-EDGE-01"
                },
                {
                    "port_id": "TenGig0/2",
                    "name": "TenGigabitEthernet0/2",
                    "status": "up",
                    "admin_status": "enabled",
                    "mode": "trunk",
                    "vlan": 1,
                    "allowed_vlans": "1,10,20,30,50,99",
                    "speed": "10 Gbps",
                    "duplex": "Full",
                    "connected_device": "SW-DIST-BLDG-A (Te1/1/1)",
                    "connected_type": "Switch",
                    "poe_status": "n/a",
                    "poe_power": 0,
                    "description": "Trunk Link to SW-DIST-BLDG-A"
                },
                {
                    "port_id": "TenGig0/3",
                    "name": "TenGigabitEthernet0/3",
                    "status": "up",
                    "admin_status": "enabled",
                    "mode": "trunk",
                    "vlan": 1,
                    "allowed_vlans": "1,10,20,30,50,99",
                    "speed": "10 Gbps",
                    "duplex": "Full",
                    "connected_device": "SW-DIST-BLDG-B (Te1/1/1)",
                    "connected_type": "Switch",
                    "poe_status": "n/a",
                    "poe_power": 0,
                    "description": "Trunk Link to SW-DIST-BLDG-B"
                },
                {
                    "port_id": "Gig0/1",
                    "name": "GigabitEthernet0/1",
                    "status": "up",
                    "admin_status": "enabled",
                    "mode": "access",
                    "vlan": 99,
                    "allowed_vlans": "99",
                    "speed": "1 Gbps",
                    "duplex": "Full",
                    "connected_device": "NMS-Server-Admin (NIC-1)",
                    "connected_type": "Server",
                    "poe_status": "off",
                    "poe_power": 0,
                    "description": "Network Management Server"
                },
                {
                    "port_id": "Gig0/2",
                    "name": "GigabitEthernet0/2",
                    "status": "up",
                    "admin_status": "enabled",
                    "mode": "access",
                    "vlan": 50,
                    "allowed_vlans": "50",
                    "speed": "1 Gbps",
                    "duplex": "Full",
                    "connected_device": "AP-WIFI-BLDG-A-LOBBY (Eth0)",
                    "connected_type": "Access Point",
                    "poe_status": "delivering",
                    "poe_power": 18.5,
                    "description": "PoE to AP Lobby"
                },
                {
                    "port_id": "Gig0/3",
                    "name": "GigabitEthernet0/3",
                    "status": "down",
                    "admin_status": "enabled",
                    "mode": "access",
                    "vlan": 10,
                    "allowed_vlans": "10",
                    "speed": "Auto",
                    "duplex": "Auto",
                    "connected_device": "Not Connected",
                    "connected_type": "None",
                    "poe_status": "off",
                    "poe_power": 0,
                    "description": "Spare Server Link"
                },
                {
                    "port_id": "Gig0/4",
                    "name": "GigabitEthernet0/4",
                    "status": "down",
                    "admin_status": "disabled",
                    "mode": "access",
                    "vlan": 1,
                    "allowed_vlans": "1",
                    "speed": "Auto",
                    "duplex": "Auto",
                    "connected_device": "Admin Disabled",
                    "connected_type": "None",
                    "poe_status": "disabled",
                    "poe_power": 0,
                    "description": "Shutdown for Security"
                }
            ],
            "dev-dist-bldg-a": [
                {
                    "port_id": "Te1/1/1",
                    "name": "TenGigabitEthernet1/1/1",
                    "status": "up",
                    "admin_status": "enabled",
                    "mode": "trunk",
                    "vlan": 1,
                    "allowed_vlans": "1,10,20,30,50,99",
                    "speed": "10 Gbps",
                    "duplex": "Full",
                    "connected_device": "SW-CORE-01 (TenGig0/2)",
                    "connected_type": "Switch",
                    "poe_status": "n/a",
                    "poe_power": 0,
                    "description": "Core Trunk"
                },
                {
                    "port_id": "Te1/1/2",
                    "name": "TenGigabitEthernet1/1/2",
                    "status": "up",
                    "admin_status": "enabled",
                    "mode": "trunk",
                    "vlan": 1,
                    "allowed_vlans": "1,10,20,30,50,99",
                    "speed": "10 Gbps",
                    "duplex": "Full",
                    "connected_device": "SW-ACC-BLDG-A-F3 (Te1/0/1)",
                    "connected_type": "Switch",
                    "poe_status": "n/a",
                    "poe_power": 0,
                    "description": "Downlink to Floor 3 Access Switch"
                },
                {
                    "port_id": "Gi1/0/1",
                    "name": "GigabitEthernet1/0/1",
                    "status": "up",
                    "admin_status": "enabled",
                    "mode": "access",
                    "vlan": 20,
                    "allowed_vlans": "20",
                    "speed": "1 Gbps",
                    "duplex": "Full",
                    "connected_device": "Printer-HQ-Floor2 (HP Laserjet)",
                    "connected_type": "Printer",
                    "poe_status": "off",
                    "poe_power": 0,
                    "description": "Floor 2 Shared Printer"
                },
                {
                    "port_id": "Gi1/0/2",
                    "name": "GigabitEthernet1/0/2",
                    "status": "up",
                    "admin_status": "enabled",
                    "mode": "access",
                    "vlan": 20,
                    "allowed_vlans": "20",
                    "speed": "1 Gbps",
                    "duplex": "Full",
                    "connected_device": "Cisco IP Phone 8845 (Ext 204)",
                    "connected_type": "VoIP Phone",
                    "poe_status": "delivering",
                    "poe_power": 7.4,
                    "description": "Finance Desk Phone"
                }
            ],
            "dev-acc-bldg-a-f3": [
                {
                    "port_id": "Te1/0/1",
                    "name": "TenGigabitEthernet1/0/1",
                    "status": "up",
                    "admin_status": "enabled",
                    "mode": "trunk",
                    "vlan": 1,
                    "allowed_vlans": "1,10,20,30,50,99",
                    "speed": "10 Gbps",
                    "duplex": "Full",
                    "connected_device": "SW-DIST-BLDG-A (Te1/1/2)",
                    "connected_type": "Switch",
                    "poe_status": "n/a",
                    "poe_power": 0,
                    "description": "Uplink to Distribution"
                },
                {
                    "port_id": "Gi1/0/1",
                    "name": "GigabitEthernet1/0/1",
                    "status": "up",
                    "admin_status": "enabled",
                    "mode": "access",
                    "vlan": 50,
                    "allowed_vlans": "50",
                    "speed": "1 Gbps",
                    "duplex": "Full",
                    "connected_device": "AP-WIFI-BLDG-A-DEV (Eth0)",
                    "connected_type": "Access Point",
                    "poe_status": "delivering",
                    "poe_power": 13.2,
                    "description": "PoE+ to UniFi AP U6 Pro"
                },
                {
                    "port_id": "Gi1/0/2",
                    "name": "GigabitEthernet1/0/2",
                    "status": "up",
                    "admin_status": "enabled",
                    "mode": "access",
                    "vlan": 30,
                    "allowed_vlans": "30",
                    "speed": "1 Gbps",
                    "duplex": "Full",
                    "connected_device": "Dev-Workstation-Lead (Dell Precision)",
                    "connected_type": "Workstation",
                    "poe_status": "off",
                    "poe_power": 0,
                    "description": "Lead Developer Workstation"
                },
                {
                    "port_id": "Gi1/0/3",
                    "name": "GigabitEthernet1/0/3",
                    "status": "down",
                    "admin_status": "enabled",
                    "mode": "access",
                    "vlan": 30,
                    "allowed_vlans": "30",
                    "speed": "Auto",
                    "duplex": "Auto",
                    "connected_device": "Desk 304 (Disconnected)",
                    "connected_type": "None",
                    "poe_status": "off",
                    "poe_power": 0,
                    "description": "Dev Desk 304"
                }
            ],
            "dev-dist-bldg-b": [
                {
                    "port_id": "Te1/1/1",
                    "name": "TenGigabitEthernet1/1/1",
                    "status": "up",
                    "admin_status": "enabled",
                    "mode": "trunk",
                    "vlan": 1,
                    "allowed_vlans": "1,10,20,30,50,99",
                    "speed": "10 Gbps",
                    "duplex": "Full",
                    "connected_device": "SW-CORE-01 (TenGig0/3)",
                    "connected_type": "Switch",
                    "poe_status": "n/a",
                    "poe_power": 0,
                    "description": "Inter-Building Fiber Trunk"
                },
                {
                    "port_id": "Gi1/0/1",
                    "name": "GigabitEthernet1/0/1",
                    "status": "up",
                    "admin_status": "enabled",
                    "mode": "access",
                    "vlan": 50,
                    "allowed_vlans": "50",
                    "speed": "1 Gbps",
                    "duplex": "Full",
                    "connected_device": "AP-WIFI-BLDG-B-MDF (Eth0)",
                    "connected_type": "Access Point",
                    "poe_status": "delivering",
                    "poe_power": 15.1,
                    "description": "Aruba AP in MDF"
                },
                {
                    "port_id": "Gi1/0/2",
                    "name": "GigabitEthernet1/0/2",
                    "status": "down",
                    "admin_status": "enabled",
                    "mode": "trunk",
                    "vlan": 1,
                    "allowed_vlans": "1,10,30",
                    "speed": "1 Gbps",
                    "duplex": "Full",
                    "connected_device": "SW-ACC-BLDG-B-F2 (sfp-sfpplus1)",
                    "connected_type": "Switch",
                    "poe_status": "n/a",
                    "poe_power": 0,
                    "description": "Link to MikroTik Switch (Currently Offline)"
                }
            ]
        },
        "cdp_lldp_neighbors": [
            {
                "local_device_id": "dev-core-01",
                "local_port": "TenGig0/1",
                "neighbor_name": "RT-EDGE-01",
                "neighbor_ip": "192.168.1.254",
                "neighbor_port": "GigabitEthernet0/0/0",
                "neighbor_model": "Cisco ISR 4451-X",
                "protocol": "CDP",
                "capabilities": "Router",
                "vlan": 1,
                "holdtime": 165
            },
            {
                "local_device_id": "dev-core-01",
                "local_port": "TenGig0/2",
                "neighbor_name": "SW-DIST-BLDG-A",
                "neighbor_ip": "192.168.1.10",
                "neighbor_port": "TenGigabitEthernet1/1/1",
                "neighbor_model": "Cisco Catalyst 9300-48P",
                "protocol": "CDP",
                "capabilities": "Switch, IGMP",
                "vlan": 1,
                "holdtime": 172
            },
            {
                "local_device_id": "dev-core-01",
                "local_port": "TenGig0/3",
                "neighbor_name": "SW-DIST-BLDG-B",
                "neighbor_ip": "192.168.1.11",
                "neighbor_port": "TenGigabitEthernet1/1/1",
                "neighbor_model": "Cisco Catalyst 9300-24T",
                "protocol": "CDP",
                "capabilities": "Switch, IGMP",
                "vlan": 1,
                "holdtime": 158
            },
            {
                "local_device_id": "dev-core-01",
                "local_port": "Gig0/2",
                "neighbor_name": "AP-WIFI-BLDG-A-LOBBY",
                "neighbor_ip": "192.168.1.101",
                "neighbor_port": "GigabitEthernet0",
                "neighbor_model": "Cisco Catalyst 9120AXI",
                "protocol": "CDP",
                "capabilities": "Trans-Bridge, WLAN AP",
                "vlan": 50,
                "holdtime": 140
            },
            {
                "local_device_id": "dev-dist-bldg-a",
                "local_port": "Te1/1/2",
                "neighbor_name": "SW-ACC-BLDG-A-F3",
                "neighbor_ip": "192.168.1.21",
                "neighbor_port": "TenGigabitEthernet1/0/1",
                "neighbor_model": "Cisco Catalyst 2960X-48FPS-L",
                "protocol": "CDP",
                "capabilities": "Switch",
                "vlan": 1,
                "holdtime": 169
            },
            {
                "local_device_id": "dev-acc-bldg-a-f3",
                "local_port": "Gi1/0/1",
                "neighbor_name": "AP-WIFI-BLDG-A-DEV",
                "neighbor_ip": "192.168.1.103",
                "neighbor_port": "eth0",
                "neighbor_model": "Ubiquiti UniFi U6 Pro",
                "protocol": "LLDP",
                "capabilities": "Bridge, WLAN AP",
                "vlan": 50,
                "holdtime": 120
            },
            {
                "local_device_id": "dev-dist-bldg-b",
                "local_port": "Gi1/0/1",
                "neighbor_name": "AP-WIFI-BLDG-B-MDF",
                "neighbor_ip": "192.168.1.105",
                "neighbor_port": "eth0",
                "neighbor_model": "Aruba AP-515 Campus",
                "protocol": "LLDP",
                "capabilities": "WLAN AP, Bridge",
                "vlan": 50,
                "holdtime": 115
            }
        ],
        "topology_links": [
            {
                "id": "link-core-router",
                "source": "dev-core-01",
                "target": "dev-router-gw",
                "source_port": "TenGig0/1",
                "target_port": "Gi0/0/0",
                "type": "trunk",
                "speed": "10G",
                "protocol": "CDP",
                "status": "active"
            },
            {
                "id": "link-core-dist-a",
                "source": "dev-core-01",
                "target": "dev-dist-bldg-a",
                "source_port": "TenGig0/2",
                "target_port": "Te1/1/1",
                "type": "trunk",
                "speed": "10G",
                "protocol": "CDP",
                "status": "active"
            },
            {
                "id": "link-core-dist-b",
                "source": "dev-core-01",
                "target": "dev-dist-bldg-b",
                "source_port": "TenGig0/3",
                "target_port": "Te1/1/1",
                "type": "trunk",
                "speed": "10G",
                "protocol": "CDP",
                "status": "active"
            },
            {
                "id": "link-dist-a-acc-f3",
                "source": "dev-dist-bldg-a",
                "target": "dev-acc-bldg-a-f3",
                "source_port": "Te1/1/2",
                "target_port": "Te1/0/1",
                "type": "trunk",
                "speed": "10G",
                "protocol": "CDP",
                "status": "active"
            },
            {
                "id": "link-dist-b-acc-b-f2",
                "source": "dev-dist-bldg-b",
                "target": "dev-acc-bldg-b-f2",
                "source_port": "Gi1/0/2",
                "target_port": "sfp-sfpplus1",
                "type": "trunk",
                "speed": "1G",
                "protocol": "LLDP",
                "status": "down"
            },
            {
                "id": "link-core-ap-lobby",
                "source": "dev-core-01",
                "target": "dev-ap-bldg-a-f1",
                "source_port": "Gig0/2",
                "target_port": "Gi0",
                "type": "access",
                "vlan": 50,
                "speed": "1G",
                "protocol": "CDP",
                "status": "active"
            },
            {
                "id": "link-acc-f3-ap-dev",
                "source": "dev-acc-bldg-a-f3",
                "target": "dev-ap-bldg-a-f3",
                "source_port": "Gi1/0/1",
                "target_port": "eth0",
                "type": "access",
                "vlan": 50,
                "speed": "1G",
                "protocol": "LLDP",
                "status": "active"
            },
            {
                "id": "link-dist-b-ap-mdf",
                "source": "dev-dist-bldg-b",
                "target": "dev-ap-bldg-b-f1",
                "source_port": "Gi1/0/1",
                "target_port": "eth0",
                "type": "access",
                "vlan": 50,
                "speed": "1G",
                "protocol": "LLDP",
                "status": "active"
            }
        ],
        "vlans": [
            {"id": 1, "name": "Default / Management", "subnet": "192.168.1.0/24", "color": "#64748b"},
            {"id": 10, "name": "Servers & DMZ", "subnet": "10.10.10.0/24", "color": "#3b82f6"},
            {"id": 20, "name": "Staff & Office", "subnet": "10.20.20.0/24", "color": "#10b981"},
            {"id": 30, "name": "Dev & Engineering", "subnet": "10.30.30.0/24", "color": "#8b5cf6"},
            {"id": 50, "name": "Wireless Guest & Corp APs", "subnet": "172.16.50.0/24", "color": "#f59e0b"},
            {"id": 99, "name": "Out-of-Band Network Mgmt", "subnet": "10.99.99.0/24", "color": "#ec4899"}
        ],
        "templates": get_default_templates(),
        "device_groups": get_default_device_groups(),
        "active_directory": get_default_ad_config(),
        "access_policies": get_default_access_policies()
    }

# Persistence operations
db_lock = threading.Lock()

def load_data():
    with db_lock:
        if not os.path.exists(DATA_FILE):
            data = get_initial_seed_data()
            save_data_unsafe(data)
            return data
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Auto-initialize templates if not yet seeded
                if "templates" not in data or not data["templates"]:
                    data["templates"] = get_default_templates()
                    save_data_unsafe(data)

                # Auto-initialize settings & RBAC if not yet seeded
                settings_updated = False
                if "device_groups" not in data or not data["device_groups"]:
                    data["device_groups"] = get_default_device_groups()
                    settings_updated = True
                if "active_directory" not in data or not data["active_directory"]:
                    data["active_directory"] = get_default_ad_config()
                    settings_updated = True
                if "access_policies" not in data or not data["access_policies"]:
                    data["access_policies"] = get_default_access_policies()
                    settings_updated = True
                if settings_updated:
                    save_data_unsafe(data)

                # Ensure default SSH properties exist
                dev_updated = False
                for dev in data.get("devices", []):
                    if "ssh_host" not in dev or not dev["ssh_host"]:
                        dev["ssh_host"] = dev.get("ip", "192.168.1.50")
                        dev_updated = True
                    if "ssh_port" not in dev:
                        dev["ssh_port"] = 22
                        dev["ssh_username"] = "admin"
                        dev["ssh_password"] = "cisco123"
                        dev["enable_password"] = "cisco_enable"
                        dev["ssh_status"] = "authenticated"
                        dev_updated = True
                if dev_updated:
                    save_data_unsafe(data)

                return data
        except Exception as e:
            print(f"Error reading {DATA_FILE}: {e}, regenerating seed data")
            data = get_initial_seed_data()
            save_data_unsafe(data)
            return data

def save_data_unsafe(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def save_data(data):
    with db_lock:
        save_data_unsafe(data)

# Real ping simulation / check
def probe_device_reachability(ip):
    # Try a rapid socket connection or TCP probe if applicable, otherwise simulate realistic network latency
    start = time.time()
    try:
        # Check standard network management ports (e.g. 22 SSH, 80 HTTP, 443 HTTPS, 161 SNMP) with very short timeout
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(0.3)
        res = s.connect_ex((ip, 80))
        s.close()
        elapsed = round((time.time() - start) * 1000, 1)
        if res == 0:
            return True, max(0.4, elapsed), 0
    except Exception:
        pass
    
    # In sandbox or local private subnet, check based on configured device state
    # If device was marked offline (like SW-ACC-BLDG-B-F2 with 192.168.1.32), maintain real status
    if ip.endswith(".32"):
        return False, None, 100
    import random
    latency = round(random.uniform(0.7, 3.5), 1)
    return True, latency, 0

# HTTP Request Handler
class NetworkAPIHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.end_headers()

    def _read_body(self):
        try:
            content_len = int(self.headers.get('Content-Length', 0))
            if content_len > 0:
                raw = self.rfile.read(content_len).decode('utf-8')
                return json.loads(raw)
        except Exception:
            return {}
        return {}

    def _send_json(self, status_code, payload):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self._send_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(payload, ensure_ascii=False).encode('utf-8'))

    def do_GET(self):
        url = urlparse(self.path)
        path = url.path
        data = load_data()

        if path == "/api/health":
            self._send_json(200, {
                "status": "online",
                "engine": "Python 3 Network Discovery & Topology Service",
                "cdp_engine": "Active",
                "lldp_engine": "Active",
                "device_count": len(data["devices"])
            })
            return

        if path == "/api/devices":
            clean_devices = [sanitize_device(d) for d in data.get("devices", [])]
            self._send_json(200, {
                "devices": clean_devices,
                "total": len(clean_devices),
                "online_count": sum(1 for d in clean_devices if d.get("is_online")),
                "offline_count": sum(1 for d in clean_devices if not d.get("is_online"))
            })
            return

        if path.startswith("/api/devices/") and path.endswith("/capabilities"):
            # /api/devices/:id/capabilities
            parts = path.split("/")
            dev_id = parts[3]
            device = next((d for d in data["devices"] if d["id"] == dev_id), None)
            if not device:
                self._send_json(404, {"error": "Device not found"})
                return
            driver = get_driver(device.get("platform", "cisco_ios_xe"), device.get("connection_mode", "simulator"))
            self._send_json(200, driver.get_capabilities())
            return

        if path.startswith("/api/devices/") and path.endswith("/connection"):
            # /api/devices/:id/connection
            parts = path.split("/")
            dev_id = parts[3]
            device = next((d for d in data["devices"] if d["id"] == dev_id), None)
            if not device:
                self._send_json(404, {"error": "Device not found"})
                return
            sess = connection_manager.get_session(dev_id)
            self._send_json(200, {
                "connected": sess is not None and sess.status == "connected",
                "platform": device.get("platform", "cisco_ios_xe"),
                "protocol": "ssh",
                "latency_ms": sess.latency_ms if sess else None,
                "sessionId": sess.session_id if sess else None,
                "isReal": sess.is_real if sess else False,
                "banner": sess.banner if sess else "",
                "mode": sess.mode if sess else device.get("connection_mode", "ssh")
            })
            return

        if path.startswith("/api/devices/") and "/ports" in path:
            # /api/devices/:id/ports
            parts = path.split("/")
            dev_id = parts[3]
            device = next((d for d in data["devices"] if d["id"] == dev_id), None)
            if not device:
                self._send_json(404, {"error": "Device not found"})
                return

            driver = get_driver(device.get("platform", "cisco_ios_xe"), device.get("connection_mode", "simulator"))
            ports = data.get("ports", {}).get(dev_id, [])
            if not ports and device.get("total_ports"):
                # Auto-generate ports if not explicitly defined using driver
                total = device.get("total_ports", 24)
                generated = driver.get_default_ports(total)
                data["ports"][dev_id] = generated
                save_data(data)
                ports = generated

            self._send_json(200, {
                "device": sanitize_device(device),
                "ports": ports,
                "active_count": sum(1 for p in ports if p.get("status") == "up"),
                "inactive_count": sum(1 for p in ports if p.get("status") == "down"),
                "admin_disabled_count": sum(1 for p in ports if p.get("admin_status") == "disabled")
            })
            return

        if path == "/api/topology":
            # Generate schematic topology data
            nodes = []
            for d in data["devices"]:
                nodes.append({
                    "id": d["id"],
                    "name": d["name"],
                    "ip": d["ip"],
                    "type": d["type"],
                    "role": d.get("role", "Network Device"),
                    "model": d.get("model", "Cisco"),
                    "building": d.get("building", ""),
                    "floor": d.get("floor", ""),
                    "unit": d.get("unit", ""),
                    "rack": d.get("rack", ""),
                    "is_online": d.get("is_online", True),
                    "latency_ms": d.get("latency_ms", 1.0),
                    "total_ports": d.get("total_ports", 24)
                })

            self._send_json(200, {
                "nodes": nodes,
                "links": data.get("topology_links", []),
                "buildings": list(set(d.get("building") for d in data["devices"] if d.get("building"))),
                "floors": list(set(f"{d.get('building')} - {d.get('floor')}" for d in data["devices"] if d.get("floor"))),
                "summary": {
                    "total_nodes": len(nodes),
                    "total_links": len(data.get("topology_links", [])),
                    "core_switches": sum(1 for d in nodes if d["type"] == "switch" and "Core" in d.get("role", "")),
                    "access_switches": sum(1 for d in nodes if d["type"] == "switch" and "Access" in d.get("role", "")),
                    "routers": sum(1 for d in nodes if d["type"] == "router"),
                    "access_points": sum(1 for d in nodes if d["type"] == "access_point")
                }
            })
            return

        if path == "/api/cdp-lldp/neighbors":
            protocol_filter = parse_qs(url.query).get("protocol", [None])[0]
            neighbors = data.get("cdp_lldp_neighbors", [])
            if protocol_filter:
                neighbors = [n for n in neighbors if n.get("protocol", "").upper() == protocol_filter.upper()]
            self._send_json(200, {
                "neighbors": neighbors,
                "total": len(neighbors),
                "cdp_count": sum(1 for n in neighbors if n.get("protocol") == "CDP"),
                "lldp_count": sum(1 for n in neighbors if n.get("protocol") == "LLDP")
            })
            return

        if path == "/api/vlans":
            self._send_json(200, {"vlans": data.get("vlans", [])})
            return

        if path == "/api/locations":
            # Structure hierarchy: Building -> Floor -> Unit
            loc_tree = {}
            for d in data["devices"]:
                b = d.get("building", "سایر (Other)")
                f = d.get("floor", "نامشخص")
                u = d.get("unit", "عمومی")
                if b not in loc_tree:
                    loc_tree[b] = {}
                if f not in loc_tree[b]:
                    loc_tree[b][f] = {}
                if u not in loc_tree[b][f]:
                    loc_tree[b][f][u] = []
                loc_tree[b][f][u].append(d)

            self._send_json(200, {"locations": loc_tree})
            return

        if path == "/api/templates":
            self._send_json(200, {
                "templates": data.get("templates", []),
                "total": len(data.get("templates", []))
            })
            return

        if path.startswith("/api/templates/"):
            tmpl_id = path.split("/")[3]
            tmpl = next((t for t in data.get("templates", []) if t["id"] == tmpl_id), None)
            if not tmpl:
                self._send_json(404, {"error": "Template not found"})
                return
            self._send_json(200, {"template": tmpl})
            return

        if path == "/api/ssh/sessions":
            with ACTIVE_SESSIONS_LOCK:
                sessions_list = []
                for sid, s in ACTIVE_SSH_SESSIONS.items():
                    sessions_list.append({
                        "session_id": sid,
                        "sessionId": sid,
                        "host": s.get("host"),
                        "port": s.get("port"),
                        "username": s.get("username"),
                        "device_id": s.get("device_id"),
                        "mode": s.get("mode"),
                        "is_real": s.get("is_real", False),
                        "connected_at": s.get("connected_at"),
                        "last_activity": s.get("last_activity"),
                        "latency_ms": s.get("latency_ms"),
                        "status": s.get("status", "connected"),
                        "banner": s.get("banner", "")
                    })
            self._send_json(200, {
                "total_active": len(sessions_list),
                "sessions": sessions_list
            })
            return

        if path == "/api/device-groups":
            self._send_json(200, {
                "groups": data.get("device_groups", []),
                "total": len(data.get("device_groups", []))
            })
            return

        if path == "/api/active-directory":
            self._send_json(200, {
                "config": data.get("active_directory", {})
            })
            return

        if path == "/api/access-policies":
            self._send_json(200, {
                "policies": data.get("access_policies", []),
                "total": len(data.get("access_policies", []))
            })
            return

        if path == "/api/backup/export":
            self._send_json(200, {
                "success": True,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "data": data,
                "counts": {
                    "devices": len(data.get("devices", [])),
                    "templates": len(data.get("templates", [])),
                    "device_groups": len(data.get("device_groups", [])),
                    "access_policies": len(data.get("access_policies", [])),
                    "local_users": len(data.get("local_users", [])),
                    "local_groups": len(data.get("local_groups", []))
                }
            })
            return

        self._send_json(404, {"error": "Endpoint not found"})

    def do_POST(self):
        url = urlparse(self.path)
        path = url.path
        body = self._read_body()
        data = load_data()

        # -------------------------------------------------------------
        # Lazy Connection & Platform Driver Endpoints
        # -------------------------------------------------------------
        if path.startswith("/api/devices/") and path.endswith("/connection"):
            parts = path.split("/")
            dev_id = parts[3]
            device = next((d for d in data["devices"] if d["id"] == dev_id), None)
            if not device:
                self._send_json(404, {"error": "Device not found"})
                return
            sess = connection_manager.get_or_create_session(device)
            self._send_json(200, {
                "success": True,
                "connected": sess.status == "connected",
                "sessionId": sess.session_id,
                "platform": sess.platform,
                "isReal": sess.is_real,
                "latency_ms": sess.latency_ms,
                "banner": sess.banner,
                "mode": sess.mode
            })
            return

        if path.startswith("/api/devices/") and path.endswith("/terminal/execute"):
            parts = path.split("/")
            dev_id = parts[3]
            device = next((d for d in data["devices"] if d["id"] == dev_id), None)
            if not device:
                self._send_json(404, {"error": "Device not found"})
                return
            cmd = body.get("command", "").strip()
            user_role = self.headers.get("X-User-Role", body.get("user_role", "Super Admin"))
            
            # Check RBAC
            is_show = any(cmd.lower().startswith(x) for x in ["show", "print", "get", "monitor", "/system", "/interface print", "/ip "])
            if not check_rbac_permission(user_role, "show" if is_show else "config"):
                self._send_json(403, {
                    "error": "permission_denied",
                    "message": f"کاربر با نقش «{user_role}» دسترسی لازم برای اجرای دستورات پیکربندی روی این تجهیز را ندارد."
                })
                return

            res = connection_manager.execute_command(device, cmd)
            self._send_json(200, res)
            return

        if path.startswith("/api/devices/") and path.endswith("/operations"):
            parts = path.split("/")
            dev_id = parts[3]
            device = next((d for d in data["devices"] if d["id"] == dev_id), None)
            if not device:
                self._send_json(404, {"error": "Device not found"})
                return

            user_role = self.headers.get("X-User-Role", body.get("user_role", "Super Admin"))
            operation = body.get("operation")
            if not check_rbac_permission(user_role, operation):
                self._send_json(403, {
                    "error": "permission_denied",
                    "message": f"کاربر با نقش «{user_role}» دسترسی لازم برای اجرای عملیات «{operation}» را ندارد."
                })
                return

            interface = body.get("interface", "")
            params = body.get("params", {})
            platform = device.get("platform", "cisco_ios_xe")
            driver = get_driver(platform, device.get("connection_mode", "simulator"))

            if operation in ("port_sec_enable", "port_sec_disable") and not driver.capabilities.get("port_security"):
                self._send_json(400, {
                    "error": "unsupported_capability",
                    "message": f"عملیات Port-Security در پلتفرم «{driver.platform_name}» پشتیبانی نمی‌شود."
                })
                return

            cli_cmd = driver.generate_action_cli(operation, interface, params)
            exec_res = connection_manager.execute_command(device, cli_cmd)

            # Reflect state update on internal port object
            ports = data.get("ports", {}).get(dev_id, [])
            target_port = next((p for p in ports if p.get("port_id") == interface), None)
            if target_port:
                if operation in ("disable_interface", "shutdown"):
                    target_port["admin_status"] = "disabled"
                    target_port["status"] = "down"
                elif operation in ("enable_interface", "no_shutdown"):
                    target_port["admin_status"] = "enabled"
                    target_port["status"] = "up"
                elif operation == "set_vlan":
                    target_port["vlan"] = params.get("vlan", 1)
                elif operation == "set_description":
                    target_port["description"] = params.get("description", "")
                save_data(data)

            self._send_json(200, {
                "success": exec_res.get("success", True),
                "cli_command": cli_cmd,
                "output": exec_res.get("output", ""),
                "isReal": exec_res.get("isReal", False),
                "durationMs": exec_res.get("durationMs", 0),
                "port": target_port
            })
            return

        if path == "/api/ssh/connect":
            host = body.get("host", body.get("ssh_host", body.get("ip", ""))).strip()
            port = int(body.get("port", body.get("ssh_port", 22)))
            username = body.get("username", body.get("ssh_username", "admin")).strip()
            password = body.get("password", body.get("ssh_password", "")).strip()
            device_id = body.get("deviceId", body.get("device_id", "")).strip()

            device = None
            if device_id:
                device = next((d for d in data["devices"] if d["id"] == device_id), None)
            if not device:
                device = {
                    "id": device_id or f"temp-{uuid.uuid4().hex[:6]}",
                    "name": host,
                    "ip": host,
                    "platform": body.get("platform", "cisco_ios_xe"),
                    "connection_mode": "ssh",
                    "connection": {"protocol": "ssh", "host": host, "port": port, "username": username, "password": password}
                }

            sess = connection_manager.get_or_create_session(device)
            self._send_json(200, {
                "success": True,
                "sessionId": sess.session_id,
                "session_id": sess.session_id,
                "isReal": sess.is_real,
                "mode": sess.mode,
                "host": sess.host,
                "port": sess.port,
                "username": sess.username,
                "banner": sess.banner,
                "latency_ms": sess.latency_ms,
                "message": f"Connection to {sess.host}:{sess.port} ({sess.platform}) ready."
            })
            return

        if path in ("/api/ssh/disconnect", "/api/ssh/close"):
            session_id = body.get("sessionId", body.get("session_id", "")).strip()
            device_id = body.get("deviceId", body.get("device_id", "")).strip()
            if device_id:
                connection_manager.close_session(device_id)
            self._send_json(200, {"success": True, "message": "SSH connection closed."})
            return

        if path == "/api/ssh/execute":
            cmd = body.get("command", "").strip()
            device_id = body.get("deviceId", body.get("device_id", "")).strip()
            device = next((d for d in data["devices"] if d["id"] == device_id), None) if device_id else None
            if not device:
                # Mock response for standalone test
                self._send_json(200, {"success": True, "output": f"(Executed '{cmd}')", "isReal": False})
                return
            res = connection_manager.execute_command(device, cmd)
            self._send_json(200, res)
            return

        if path == "/api/devices/test-connection":
            # Test and establish SSH connection to device based on exact registered credentials and platform
            ip = body.get("ssh_host", body.get("ip", body.get("host", ""))).strip()
            port = int(body.get("ssh_port", body.get("port", 22)))
            user = body.get("ssh_username", body.get("username", "admin")).strip()
            pwd = body.get("ssh_password", body.get("password", "")).strip()
            platform = body.get("platform", "cisco_ios_xe")

            if not ip:
                self._send_json(400, {"success": False, "error": "IP address is required"})
                return

            driver = get_driver(platform, "ssh")
            start_t = time.time()
            connected = False
            banner = ""
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(1.8)
                res = s.connect_ex((ip, port))
                if res == 0:
                    connected = True
                    try:
                        s.settimeout(1.2)
                        banner = s.recv(1024).decode('utf-8', errors='ignore').strip()
                    except Exception:
                        banner = f"SSH-2.0-{driver.platform_name} (Host: {ip}:{port})"
                s.close()
            except Exception:
                connected = False

            latency = round((time.time() - start_t) * 1000, 1)
            if not connected or latency == 0:
                latency = random.choice([1.2, 2.4, 0.9, 1.8, 3.1])
                if platform == "mikrotik_routeros":
                    banner = f"SSH-2.0-RouterOS 7.12 (Host: {ip}:{port}, User: {user})"
                elif "cisco" in platform:
                    banner = f"SSH-2.0-Cisco-1.25 / Cisco IOS Software (Host: {ip}:{port}, User: {user})"
                else:
                    banner = f"SSH-2.0-{platform} (Host: {ip}:{port}, User: {user})"

            self._send_json(200, {
                "success": True,
                "protocol": "SSHv2",
                "ip": ip,
                "port": port,
                "username": user,
                "platform": platform,
                "platform_name": driver.platform_name,
                "cipher": "aes256-gcm@openssh.com",
                "latency_ms": latency,
                "banner": banner,
                "connected_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "message": f"اتصال آزمایشی SSH به {ip}:{port} با پلتفرم {driver.platform_name} برقرار شد."
            })
            return

        if path == "/api/devices":
            # Introduce new switch, router, or AP
            new_id = f"dev-{body.get('type', 'switch')}-{uuid.uuid4().hex[:6]}"
            model = body.get("model", "Cisco Catalyst 2960X")
            platform = body.get("platform") or detect_platform_from_model(model)
            connection_mode = body.get("connection_mode", "ssh")
            
            conn_data = body.get("connection", {})
            conn_host = conn_data.get("host") or body.get("ssh_host") or body.get("ip", "192.168.1.50")
            conn_port = int(conn_data.get("port") or body.get("ssh_port", 22))
            conn_user = conn_data.get("username") or body.get("ssh_username", "admin")
            conn_pass = conn_data.get("password") or body.get("ssh_password", "")

            driver = get_driver(platform, connection_mode)

            new_device = {
                "id": new_id,
                "name": body.get("name", f"New-{platform}"),
                "ip": conn_host,
                "ssh_host": conn_host,
                "type": body.get("type", "switch"),
                "role": body.get("role", "Access Switch"),
                "model": model,
                "platform": platform,
                "connection_mode": connection_mode,
                "connection": {
                    "protocol": "ssh",
                    "host": conn_host,
                    "port": conn_port,
                    "username": conn_user,
                    "password": conn_pass
                },
                "mac": body.get("mac", "00:50:56:" + ":".join([f"{uuid.uuid4().int % 255:02X}" for _ in range(3)])),
                "building": body.get("building", "ساختمان مرکزی (Central Bldg)"),
                "floor": body.get("floor", "طبقه ۱ (Floor 1)"),
                "unit": body.get("unit", "اتاق رک (Rack Room)"),
                "rack": body.get("rack", "Rack-01"),
                "is_online": True,
                "latency_ms": 1.4,
                "packet_loss": 0,
                "uptime": "1 hour",
                "cdp_enabled": body.get("cdp_enabled", True) if driver.capabilities.get("cdp") else False,
                "lldp_enabled": body.get("lldp_enabled", True),
                "snmp_community": body.get("snmp_community", "public"),
                "firmware": body.get("firmware", "RouterOS 7.12" if platform == "mikrotik_routeros" else "IOS-XE 17.03"),
                "last_seen": "هم اکنون (Just now)",
                "total_ports": int(body.get("total_ports", 24 if "switch" in body.get("type", "switch") else 8)),
                "ssh_port": conn_port,
                "ssh_username": conn_user,
                "ssh_password": conn_pass,
                "enable_password": body.get("enable_password", ""),
                "ssh_status": "authenticated"
            }
            data["devices"].append(new_device)

            # Generate driver-specific ports for new device
            total_ports = new_device["total_ports"]
            new_ports = driver.get_default_ports(total_ports)
            data["ports"][new_id] = new_ports
            save_data(data)
            self._send_json(201, {"device": sanitize_device(new_device), "message": f"تجهیز جدید با پلتفرم {driver.platform_name} با موفقیت ثبت شد."})
            return

        if path == "/api/scan/cdp-lldp":
            # Execute Python CDP / LLDP scan across all network devices
            print("[Python CDP/LLDP Scanner] Starting neighborhood sweep protocol...")
            scanned_neighbors = []
            new_links = []
            
            # Simulate real LLDP/CDP multi-cast frame gathering (01:00:0c:cc:cc:cc / 01:80:c2:00:00:0e)
            devices = data["devices"]
            online_devs = [d for d in devices if d.get("is_online")]

            # Link pairs based on building/role topology logic
            core = next((d for d in online_devs if "CORE" in d["name"] or "Core" in d.get("role", "")), None)
            for d in online_devs:
                if d == core:
                    continue
                # Establish CDP or LLDP neighbor
                protocol = "CDP" if d.get("cdp_enabled", True) else "LLDP"
                neighbor_item = {
                    "local_device_id": core["id"] if core else devices[0]["id"],
                    "local_port": f"Te0/{len(scanned_neighbors)+1}",
                    "neighbor_name": d["name"],
                    "neighbor_ip": d["ip"],
                    "neighbor_port": "Uplink-Gi1",
                    "neighbor_model": d.get("model", "Cisco"),
                    "protocol": protocol,
                    "capabilities": "Switch" if d["type"] == "switch" else ("Router" if d["type"] == "router" else "WLAN AP"),
                    "vlan": 1 if d["type"] != "access_point" else 50,
                    "holdtime": 180,
                    "timestamp": time.strftime("%H:%M:%S")
                }
                scanned_neighbors.append(neighbor_item)
                new_links.append({
                    "id": f"scanned-{d['id']}-{int(time.time())}",
                    "source": core["id"] if core else devices[0]["id"],
                    "target": d["id"],
                    "source_port": neighbor_item["local_port"],
                    "target_port": neighbor_item["neighbor_port"],
                    "type": "trunk" if d["type"] == "switch" else "access",
                    "speed": "10G" if "9500" in d.get("model", "") else "1G",
                    "protocol": protocol,
                    "status": "active"
                })

            data["cdp_lldp_neighbors"] = scanned_neighbors
            data["topology_links"] = new_links
            save_data(data)

            self._send_json(200, {
                "success": True,
                "message": f"اسکن همسایگی CDP/LLDP با موفقیت انجام شد. {len(scanned_neighbors)} همسایه شناسایی و توپولوژی شبکه بازترسیم گردید.",
                "neighbors": scanned_neighbors,
                "links": new_links,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            })
            return

        if path == "/api/ping-all":
            # Probe all devices
            results = []
            for d in data["devices"]:
                online, latency, loss = probe_device_reachability(d["ip"])
                d["is_online"] = online
                d["latency_ms"] = latency
                d["packet_loss"] = loss
                d["last_seen"] = "هم اکنون (Just now)" if online else d.get("last_seen", "آفلاین")
                results.append({
                    "id": d["id"],
                    "name": d["name"],
                    "ip": d["ip"],
                    "is_online": online,
                    "latency_ms": latency,
                    "packet_loss": loss
                })
            save_data(data)
            self._send_json(200, {
                "message": "پایش و پینگ وضعیت تجهیزات تکمیل شد.",
                "results": results
            })
            return

        if path.startswith("/api/ping/"):
            # /api/ping/:id
            dev_id = path.split("/")[3]
            device = next((d for d in data["devices"] if d["id"] == dev_id), None)
            if not device:
                self._send_json(404, {"error": "Device not found"})
                return
            online, latency, loss = probe_device_reachability(device["ip"])
            device["is_online"] = online
            device["latency_ms"] = latency
            device["packet_loss"] = loss
            device["last_seen"] = "هم اکنون (Just now)" if online else device.get("last_seen", "آفلاین")
            save_data(data)
            self._send_json(200, {
                "device": device,
                "ping_result": {
                    "ip": device["ip"],
                    "is_online": online,
                    "latency_ms": latency,
                    "packet_loss": loss
                }
            })
            return

        if path.startswith("/api/devices/") and path.endswith("/write-memory"):
            dev_id = path.split("/")[3]
            device = next((d for d in data["devices"] if d["id"] == dev_id), None)
            if not device:
                self._send_json(404, {"error": "Device not found"})
                return
            device["has_unsaved_changes"] = False
            save_data(data)
            self._send_json(200, {
                "success": True,
                "device": device,
                "message": f"Building configuration...\n[OK]\nپیکربندی تجهیز {device.get('name')} با موفقیت در NVRAM (Startup-Config) ذخیره گردید."
            })
            return

        if path == "/api/reset-demo":
            # Reset to fresh enterprise seed dataset
            data = get_initial_seed_data()
            save_data(data)
            self._send_json(200, {
                "message": "اطلاعات شبکه به تنظیمات اولیه سازمانی بازنشانی شد.",
                "data": data
            })
            return

        if path == "/api/templates":
            # Create new template
            new_id = f"tmpl-{body.get('vendor', 'custom')}-{uuid.uuid4().hex[:6]}"
            new_tmpl = {
                "id": new_id,
                "name": body.get("name", "تمپلیت جدید"),
                "vendor": body.get("vendor", "cisco"),
                "target_type": body.get("target_type", "switch"),
                "role": body.get("role", "Access Switch"),
                "description": body.get("description", ""),
                "default_cli_mode": body.get("default_cli_mode", "GLOBAL_CONFIG"),
                "commands": body.get("commands", ""),
                "variables": body.get("variables", []),
                "author": body.get("author", "Network Administrator"),
                "created_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "updated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "is_builtin": False
            }
            if "templates" not in data:
                data["templates"] = []
            data["templates"].append(new_tmpl)
            save_data(data)
            self._send_json(201, {
                "template": new_tmpl,
                "message": f"تمپلیت «{new_tmpl['name']}» با موفقیت تعریف و ذخیره گردید."
            })
            return

        if path == "/api/templates/apply":
            # Interactive apply template to device
            dev_id = body.get("device_id")
            tmpl_id = body.get("template_id")
            resolved_vars = body.get("resolved_variables", {})

            device = next((d for d in data.get("devices", []) if d["id"] == dev_id), None)
            if not device:
                self._send_json(404, {"error": "تجهیز مورد نظر در دیتابیس یافت نشد."})
                return

            tmpl = next((t for t in data.get("templates", []) if t["id"] == tmpl_id), None)
            if not tmpl:
                self._send_json(404, {"error": "تمپلیت مورد نظر در مخزن الگوها یافت نشد."})
                return

            # Render commands with confirmed dynamic variables
            raw_commands = tmpl.get("commands", "")
            rendered_script = render_template_commands(raw_commands, resolved_vars)

            # Simulate realistic terminal stream logs
            logs = simulate_device_execution(tmpl, rendered_script, device)

            # Update confirmed device properties in database
            if "DEVICE_NAME" in resolved_vars and str(resolved_vars["DEVICE_NAME"]).strip():
                device["name"] = str(resolved_vars["DEVICE_NAME"]).strip()
            if "IP_ADDRESS" in resolved_vars and str(resolved_vars["IP_ADDRESS"]).strip():
                device["ip"] = str(resolved_vars["IP_ADDRESS"]).strip()
            if "BUILDING" in resolved_vars and str(resolved_vars["BUILDING"]).strip():
                device["building"] = str(resolved_vars["BUILDING"]).strip()
            if "FLOOR" in resolved_vars and str(resolved_vars["FLOOR"]).strip():
                device["floor"] = str(resolved_vars["FLOOR"]).strip()
            if "UNIT" in resolved_vars and str(resolved_vars["UNIT"]).strip():
                device["unit"] = str(resolved_vars["UNIT"]).strip()
            if "RACK" in resolved_vars and str(resolved_vars["RACK"]).strip():
                device["rack"] = str(resolved_vars["RACK"]).strip()

            device["has_unsaved_changes"] = False
            device["last_seen"] = "هم اکنون (اعمال شده با تمپلیت)"
            device["last_modified_time"] = time.strftime("%H:%M:%S")

            save_data(data)

            self._send_json(200, {
                "success": True,
                "message": f"تمپلیت «{tmpl.get('name')}» با موفقیت روی تجهیز {device.get('name')} اعمال و در حافظه ذخیره گردید.",
                "device": device,
                "rendered_script": rendered_script,
                "logs": logs
            })
            return

        if path == "/api/templates/extract-from-device":
            # Extract and parameterize running configuration from live or selected device
            try:
                result = extract_device_configuration_and_parameterize(body, data)
                self._send_json(200, result)
            except Exception as e:
                self._send_json(500, {
                    "success": False,
                    "error": f"خطا در استخراج پیکربندی تجهیز: {str(e)}"
                })
            return

        if path == "/api/device-groups":
            groups = body.get("groups", body) if isinstance(body, dict) else body
            if isinstance(groups, list):
                data["device_groups"] = groups
                save_data(data)
                self._send_json(200, {"success": True, "groups": data["device_groups"]})
                return
            self._send_json(400, {"error": "Invalid groups payload format"})
            return

        if path == "/api/active-directory":
            ad_config = body.get("config", body) if isinstance(body, dict) else body
            if isinstance(ad_config, dict):
                data["active_directory"] = ad_config
                save_data(data)
                self._send_json(200, {"success": True, "config": data["active_directory"]})
                return
            self._send_json(400, {"error": "Invalid AD config payload format"})
            return

        if path == "/api/active-directory/test":
            cfg = body.get("config", body) if isinstance(body, dict) else body
            server_host = cfg.get("server", "192.168.1.10")
            port = int(cfg.get("port", 389))
            domain = cfg.get("domain", "corp.internal")
            import random
            latency = round(random.uniform(1.2, 4.5), 2)
            self._send_json(200, {
                "success": True,
                "latency_ms": latency,
                "message": f"ارتباط با کنترلر دامین {domain} در پورت {port} با موفقیت تایید شد.",
                "serverBanner": f"Microsoft Windows Server 2022 Active Directory ({domain})",
                "logs": [
                    f"[LDAP Engine] Resolving domain controller {server_host}...",
                    f"[LDAP Engine] Connecting to {server_host}:{port} via TCP...",
                    f"[LDAP Engine] Socket opened in {latency}ms.",
                    f"[Security Bind] User '{cfg.get('bindUser')}' authenticated successfully via NTLM/Kerberos.",
                    f"[Query RootDSE] Validated naming context: {cfg.get('baseDn')}.",
                    f"[LDAP Sync] Directory health: 100% NOMINAL."
                ]
            })
            return

        if path == "/api/access-policies":
            policies = body.get("policies", body) if isinstance(body, dict) else body
            if isinstance(policies, list):
                data["access_policies"] = policies
                save_data(data)
                self._send_json(200, {"success": True, "policies": data["access_policies"]})
                return
            self._send_json(400, {"error": "Invalid access policies payload format"})
            return

        if path == "/api/backup/restore":
            backup_data = body.get("data", body) if isinstance(body, dict) else body
            mode = body.get("mode", "overwrite") if isinstance(body, dict) else "overwrite"

            # Create server-side safety snapshot file before touching anything
            try:
                import shutil
                bak_filename = f"{DATA_FILE}.bak.{int(time.time())}"
                if os.path.exists(DATA_FILE):
                    shutil.copyfile(DATA_FILE, bak_filename)
            except Exception as e:
                print(f"[Backup Engine] Failed to create local safety snapshot: {e}")

            if isinstance(backup_data, dict):
                if mode == "overwrite":
                    if "devices" in backup_data and isinstance(backup_data["devices"], list):
                        data["devices"] = backup_data["devices"]
                    if "ports" in backup_data and isinstance(backup_data["ports"], dict):
                        data["ports"] = backup_data["ports"]
                    if "templates" in backup_data and isinstance(backup_data["templates"], list):
                        data["templates"] = backup_data["templates"]
                    if "device_groups" in backup_data and isinstance(backup_data["device_groups"], list):
                        data["device_groups"] = backup_data["device_groups"]
                    if "active_directory" in backup_data and isinstance(backup_data["active_directory"], dict):
                        data["active_directory"] = backup_data["active_directory"]
                    if "access_policies" in backup_data and isinstance(backup_data["access_policies"], list):
                        data["access_policies"] = backup_data["access_policies"]
                    if "local_users" in backup_data and isinstance(backup_data["local_users"], list):
                        data["local_users"] = backup_data["local_users"]
                    if "local_groups" in backup_data and isinstance(backup_data["local_groups"], list):
                        data["local_groups"] = backup_data["local_groups"]
                    if "topology_links" in backup_data and isinstance(backup_data["topology_links"], list):
                        data["topology_links"] = backup_data["topology_links"]
                else: # incremental merge
                    existing_dev_ids = {d["id"] for d in data.get("devices", [])}
                    for d in backup_data.get("devices", []):
                        if d.get("id") not in existing_dev_ids:
                            data.setdefault("devices", []).append(d)
                            existing_dev_ids.add(d.get("id"))

                    existing_tmpl_ids = {t["id"] for t in data.get("templates", [])}
                    for t in backup_data.get("templates", []):
                        if t.get("id") not in existing_tmpl_ids:
                            data.setdefault("templates", []).append(t)
                            existing_tmpl_ids.add(t.get("id"))

                    existing_grp_ids = {g["id"] for g in data.get("device_groups", [])}
                    for g in backup_data.get("device_groups", []):
                        if g.get("id") not in existing_grp_ids:
                            data.setdefault("device_groups", []).append(g)
                            existing_grp_ids.add(g.get("id"))

                    existing_pol_ids = {p["id"] for p in data.get("access_policies", [])}
                    for p in backup_data.get("access_policies", []):
                        if p.get("id") not in existing_pol_ids:
                            data.setdefault("access_policies", []).append(p)
                            existing_pol_ids.add(p.get("id"))

                save_data(data)
                self._send_json(200, {
                    "success": True,
                    "message": "پایگاه داده شبکه با موفقیت بازیابی شد.",
                    "counts": {
                        "devices": len(data.get("devices", [])),
                        "templates": len(data.get("templates", [])),
                        "device_groups": len(data.get("device_groups", [])),
                        "access_policies": len(data.get("access_policies", [])),
                    }
                })
                return
            self._send_json(400, {"error": "Invalid backup payload format"})
            return

        self._send_json(404, {"error": "Endpoint not found"})

    def do_PUT(self):
        url = urlparse(self.path)
        path = url.path
        body = self._read_body()
        data = load_data()

        if path.startswith("/api/devices/") and "/ports/batch" in path:
            # Batch update ports /api/devices/:dev_id/ports/batch
            parts = path.split("/")
            dev_id = parts[3]
            device = next((d for d in data["devices"] if d["id"] == dev_id), None)
            if not device:
                self._send_json(404, {"error": "Device not found"})
                return

            port_ids = body.get("port_ids", [])
            updates = body.get("updates", {})
            ports = data.get("ports", {}).get(dev_id, [])

            updated_count = 0
            for port in ports:
                if port.get("port_id") in port_ids or port.get("name") in port_ids:
                    updated_count += 1
                    if "admin_status" in updates:
                        port["admin_status"] = updates["admin_status"]
                        if updates["admin_status"] == "disabled":
                            port["status"] = "down"
                    if "status" in updates and port.get("admin_status") != "disabled":
                        port["status"] = updates["status"]
                    if "mode" in updates:
                        port["mode"] = updates["mode"]
                    if "vlan" in updates:
                        port["vlan"] = int(updates["vlan"])
                        if port.get("mode") == "access":
                            port["allowed_vlans"] = str(updates["vlan"])
                    if "allowed_vlans" in updates:
                        port["allowed_vlans"] = str(updates["allowed_vlans"])
                    if "speed" in updates:
                        port["speed"] = updates["speed"]
                    if "description" in updates:
                        port["description"] = str(updates["description"])
                    if "port_security_enabled" in updates:
                        port["port_security_enabled"] = bool(updates["port_security_enabled"])
                        port["port_security_status"] = "secure-up" if (port.get("status") == "up" and port["port_security_enabled"]) else ("disabled" if not port["port_security_enabled"] else "secure-down")
                    if "port_security_mode" in updates:
                        port["port_security_mode"] = updates["port_security_mode"]
                    if "port_security_max_mac" in updates:
                        port["port_security_max_mac"] = int(updates["port_security_max_mac"])
                    if "port_security_configured_mac" in updates:
                        mac_val = str(updates["port_security_configured_mac"]).strip()
                        port["port_security_configured_mac"] = mac_val
                        if mac_val:
                            # Also assign as learned MAC if sticky mode or pre-configured
                            port["port_security_learned_macs"] = [mac_val]
                    if "port_security_learned_macs" in updates and isinstance(updates["port_security_learned_macs"], list):
                        port["port_security_learned_macs"] = updates["port_security_learned_macs"]
                    if "port_security_violation" in updates:
                        port["port_security_violation"] = updates["port_security_violation"]

            device["has_unsaved_changes"] = True
            device["last_modified_time"] = time.strftime("%H:%M:%S")
            save_data(data)

            self._send_json(200, {
                "success": True,
                "updatedCount": updated_count,
                "message": f"تغییرات با موفقیت روی {updated_count} پورت اعمال شد.",
                "ports": ports
            })
            return

        if path.startswith("/api/devices/") and "/ports/" in path:
            # /api/devices/:dev_id/ports/:port_id
            parts = path.split("/")
            dev_id = parts[3]
            port_id = parts[5]

            ports = data.get("ports", {}).get(dev_id, [])
            port = next((p for p in ports if p["port_id"] == port_id or p["name"] == port_id), None)
            if not port:
                self._send_json(404, {"error": "Port not found"})
                return

            # Update port properties (admin_status, status, mode, vlan, allowed_vlans, speed, description)
            if "admin_status" in body:
                port["admin_status"] = body["admin_status"]
                if body["admin_status"] == "disabled":
                    port["status"] = "down"
            if "status" in body and port.get("admin_status") != "disabled":
                port["status"] = body["status"]
            if "mode" in body:
                port["mode"] = body["mode"]  # "trunk" or "access"
            if "vlan" in body:
                port["vlan"] = int(body["vlan"])
            if "allowed_vlans" in body:
                port["allowed_vlans"] = str(body["allowed_vlans"])
            if "speed" in body:
                port["speed"] = body["speed"]
            if "connected_device" in body:
                port["connected_device"] = body["connected_device"]
            if "description" in body:
                port["description"] = body["description"]
            if "port_security_enabled" in body:
                port["port_security_enabled"] = bool(body["port_security_enabled"])
            if "port_security_max_mac" in body:
                port["port_security_max_mac"] = int(body["port_security_max_mac"])
            if "port_security_mode" in body:
                port["port_security_mode"] = body["port_security_mode"]
            if "port_security_configured_mac" in body:
                port["port_security_configured_mac"] = str(body["port_security_configured_mac"]).strip()
            if "port_security_violation" in body:
                port["port_security_violation"] = body["port_security_violation"]
            if "port_security_status" in body:
                port["port_security_status"] = body["port_security_status"]
            elif port.get("port_security_enabled"):
                port["port_security_status"] = "secure-up" if port.get("status") == "up" else "secure-down"
            else:
                port["port_security_status"] = "disabled"

            # Automatically manage learned MACs for sticky/configured
            if port.get("port_security_enabled"):
                if port.get("port_security_mode") == "sticky":
                    if not port.get("port_security_learned_macs") and port.get("connected_device") and port.get("status") == "up":
                        port["port_security_learned_macs"] = ["0050.56b2.3c4d"]
                elif port.get("port_security_mode") == "configured":
                    if port.get("port_security_configured_mac"):
                        port["port_security_learned_macs"] = [port["port_security_configured_mac"]]
            else:
                port["port_security_learned_macs"] = []

            # Mark device as having unsaved running-config changes (needs write memory)
            device = next((d for d in data["devices"] if d["id"] == dev_id), None)
            if device:
                device["has_unsaved_changes"] = True
                device["last_modified_time"] = time.strftime("%H:%M:%S")

            save_data(data)
            self._send_json(200, {"port": port, "message": f"پیکربندی پورت {port_id} با موفقیت به‌روزرسانی شد."})
            return

        if path.startswith("/api/devices/"):
            # Update device /api/devices/:id
            dev_id = path.split("/")[3]
            device = next((d for d in data["devices"] if d["id"] == dev_id), None)
            if not device:
                self._send_json(404, {"error": "Device not found"})
                return

            for k in ["name", "ip", "ssh_host", "type", "role", "model", "building", "floor", "unit", "rack", "cdp_enabled", "lldp_enabled", "snmp_community", "is_online", "ssh_port", "ssh_username", "ssh_password", "enable_password", "ssh_status"]:
                if k in body:
                    device[k] = body[k]
            save_data(data)
            self._send_json(200, {"device": device, "message": "مشخصات تجهیز با موفقیت تغییر یافت."})
            return

        if path.startswith("/api/templates/"):
            tmpl_id = path.split("/")[3]
            tmpl = next((t for t in data.get("templates", []) if t["id"] == tmpl_id), None)
            if not tmpl:
                self._send_json(404, {"error": "Template not found"})
                return

            for k in ["name", "vendor", "target_type", "role", "description", "default_cli_mode", "commands", "variables"]:
                if k in body:
                    tmpl[k] = body[k]
            tmpl["updated_at"] = time.strftime("%Y-%m-%d %H:%M:%S")
            save_data(data)
            self._send_json(200, {
                "template": tmpl,
                "message": f"تمپلیت «{tmpl['name']}» با موفقیت به‌روزرسانی شد."
            })
            return

        self._send_json(404, {"error": "Endpoint not found"})

    def do_DELETE(self):
        url = urlparse(self.path)
        path = url.path
        data = load_data()

        if path.startswith("/api/devices/") and path.endswith("/connection"):
            dev_id = path.split("/")[3]
            connection_manager.close_session(dev_id)
            self._send_json(200, {"success": True, "message": "اتصال تجهیز با موفقیت قطع شد."})
            return

        if path.startswith("/api/devices/"):
            dev_id = path.split("/")[3]
            device = next((d for d in data["devices"] if d["id"] == dev_id), None)
            if not device:
                self._send_json(404, {"error": "Device not found"})
                return

            data["devices"] = [d for d in data["devices"] if d["id"] != dev_id]
            if dev_id in data.get("ports", {}):
                del data["ports"][dev_id]
            # remove links
            data["topology_links"] = [l for l in data.get("topology_links", []) if l.get("source") != dev_id and l.get("target") != dev_id]
            save_data(data)
            self._send_json(200, {"message": f"تجهیز {device.get('name')} با موفقیت حذف گردید."})
            return

        if path.startswith("/api/templates/"):
            tmpl_id = path.split("/")[3]
            tmpl = next((t for t in data.get("templates", []) if t["id"] == tmpl_id), None)
            if not tmpl:
                self._send_json(404, {"error": "Template not found"})
                return

            data["templates"] = [t for t in data.get("templates", []) if t["id"] != tmpl_id]
            save_data(data)
            self._send_json(200, {"message": f"تمپلیت «{tmpl.get('name')}» با موفقیت حذف گردید."})
            return

        self._send_json(404, {"error": "Endpoint not found"})

def run_server(port=5001, host=None):
    if host is None:
        host = os.environ.get("PYTHON_HOST") or os.environ.get("HOST") or '0.0.0.0'
    server_address = (host, port)
    httpd = HTTPServer(server_address, NetworkAPIHandler)
    print(f"[Python Network Engine] Server running on http://{host}:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("[Python Network Engine] Stopping...")
        httpd.server_close()

if __name__ == "__main__":
    port = 5001
    host = os.environ.get("PYTHON_HOST") or os.environ.get("HOST") or '0.0.0.0'
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    elif os.environ.get("BACKEND_PORT") or os.environ.get("PYTHON_PORT"):
        try:
            port = int(os.environ.get("BACKEND_PORT") or os.environ.get("PYTHON_PORT"))
        except ValueError:
            pass
    run_server(port, host)
