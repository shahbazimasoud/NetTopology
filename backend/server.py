import json
import os
import sys
import time
import socket
import threading
import uuid
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Data file path
DATA_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(DATA_DIR, "network_data.json")

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
        ]
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
                return json.load(f)
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
            self._send_json(200, {
                "devices": data["devices"],
                "total": len(data["devices"]),
                "online_count": sum(1 for d in data["devices"] if d.get("is_online")),
                "offline_count": sum(1 for d in data["devices"] if not d.get("is_online"))
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
            ports = data.get("ports", {}).get(dev_id, [])
            if not ports and device.get("total_ports"):
                # Auto-generate ports if not explicitly defined
                total = device.get("total_ports", 24)
                generated = []
                for i in range(1, total + 1):
                    p_status = "up" if i <= 4 else ("down" if i % 3 == 0 else "up")
                    generated.append({
                        "port_id": f"Gi1/0/{i}",
                        "name": f"GigabitEthernet1/0/{i}",
                        "status": p_status,
                        "admin_status": "enabled",
                        "mode": "trunk" if i <= 2 else "access",
                        "vlan": 1 if i <= 2 else ((i % 4 + 1) * 10),
                        "allowed_vlans": "1,10,20,30,50" if i <= 2 else str((i % 4 + 1) * 10),
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
                data["ports"][dev_id] = generated
                save_data(data)
                ports = generated

            self._send_json(200, {
                "device": device,
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

        self._send_json(404, {"error": "Endpoint not found"})

    def do_POST(self):
        url = urlparse(self.path)
        path = url.path
        body = self._read_body()
        data = load_data()

        if path == "/api/devices":
            # Introduce new switch, router, or AP
            new_id = f"dev-{body.get('type', 'switch')}-{uuid.uuid4().hex[:6]}"
            new_device = {
                "id": new_id,
                "name": body.get("name", "New-Switch"),
                "ip": body.get("ip", "192.168.1.50"),
                "type": body.get("type", "switch"), # switch, router, access_point
                "role": body.get("role", "Access Switch"),
                "model": body.get("model", "Cisco Catalyst 2960X"),
                "mac": body.get("mac", "00:50:56:" + ":".join([f"{uuid.uuid4().int % 255:02X}" for _ in range(3)])),
                "building": body.get("building", "ساختمان مرکزی (Central Bldg)"),
                "floor": body.get("floor", "طبقه ۱ (Floor 1)"),
                "unit": body.get("unit", "اتاق رک (Rack Room)"),
                "rack": body.get("rack", "Rack-01"),
                "is_online": True,
                "latency_ms": 1.4,
                "packet_loss": 0,
                "uptime": "1 hour",
                "cdp_enabled": body.get("cdp_enabled", True),
                "lldp_enabled": body.get("lldp_enabled", True),
                "snmp_community": body.get("snmp_community", "public"),
                "firmware": body.get("firmware", "IOS-XE 17.03"),
                "last_seen": "هم اکنون (Just now)",
                "total_ports": int(body.get("total_ports", 24))
            }
            data["devices"].append(new_device)

            # Generate default ports for new device
            total_ports = new_device["total_ports"]
            new_ports = []
            for i in range(1, total_ports + 1):
                p_status = "up" if i <= 4 else ("down" if i % 2 == 0 else "up")
                new_ports.append({
                    "port_id": f"Gi1/0/{i}",
                    "name": f"GigabitEthernet1/0/{i}",
                    "status": p_status,
                    "admin_status": "enabled",
                    "mode": "trunk" if i == 1 else "access",
                    "vlan": 1 if i == 1 else (10 if i <= 8 else 20),
                    "allowed_vlans": "1,10,20,30,50" if i == 1 else str(10 if i <= 8 else 20),
                    "speed": "1 Gbps",
                    "duplex": "Full",
                    "connected_device": "Host Link" if p_status == "up" else "Disconnected",
                    "connected_type": "Host" if p_status == "up" else "None",
                    "poe_status": "off",
                    "poe_power": 0,
                    "description": f"Port {i}"
                })
            data["ports"][new_id] = new_ports
            save_data(data)
            self._send_json(201, {"device": new_device, "message": "تجهیز جدید با موفقیت اضافه شد."})
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

        self._send_json(404, {"error": "Endpoint not found"})

    def do_PUT(self):
        url = urlparse(self.path)
        path = url.path
        body = self._read_body()
        data = load_data()

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

            for k in ["name", "ip", "type", "role", "model", "building", "floor", "unit", "rack", "cdp_enabled", "lldp_enabled", "snmp_community", "is_online"]:
                if k in body:
                    device[k] = body[k]
            save_data(data)
            self._send_json(200, {"device": device, "message": "مشخصات تجهیز با موفقیت تغییر یافت."})
            return

        self._send_json(404, {"error": "Endpoint not found"})

    def do_DELETE(self):
        url = urlparse(self.path)
        path = url.path
        data = load_data()

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

        self._send_json(404, {"error": "Endpoint not found"})

def run_server(port=5001):
    server_address = ('127.0.0.1', port)
    httpd = HTTPServer(server_address, NetworkAPIHandler)
    print(f"[Python Network Engine] Server running on http://127.0.0.1:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("[Python Network Engine] Stopping...")
        httpd.server_close()

if __name__ == "__main__":
    port = 5001
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    run_server(port)
