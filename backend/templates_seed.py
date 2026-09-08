"""
Network Configuration Templates Seed Data & Execution Engine
Covers Cisco IOS/IOS-XE (Switches, Routers) and MikroTik RouterOS/SwitchOS.
"""
import re
import time
import uuid

def get_default_templates():
    return [
        {
            "id": "tmpl-cisco-access-std",
            "name": "کانفیگ استاندارد سوئیچ لایه دسترسی سیسکو (Catalyst Access Switch)",
            "vendor": "cisco",
            "target_type": "switch",
            "role": "Access Switch",
            "description": "پیکربندی پایه سوئیچ‌های اکسس سیسکو شامل Hostname، SVI مدیریتی، Spanning-Tree، SSH v2، CDP/LLDP، NTP و خطوط VTY",
            "default_cli_mode": "GLOBAL_CONFIG",
            "is_builtin": True,
            "commands": """enable
configure terminal
hostname {{DEVICE_NAME}}
ip domain-name {{DOMAIN_NAME}}
crypto key generate rsa modulus 2048
ip ssh version 2
username admin privilege 15 secret {{ADMIN_PASSWORD}}
line vty 0 4
 transport input ssh
 login local
 exec-timeout 15 0
exit
! Management SVI
vlan {{MANAGEMENT_VLAN}}
 name MGT_VLAN
exit
interface vlan {{MANAGEMENT_VLAN}}
 description SVI - {{BUILDING}} {{FLOOR}} {{UNIT}}
 ip address {{IP_ADDRESS}} {{SUBNET_MASK}}
 no shutdown
exit
ip default-gateway {{DEFAULT_GATEWAY}}
! STP & Discovery Protocols
spanning-tree mode rapid-pvst
cdp run
lldp run
! Network Services
ntp server {{NTP_SERVER}}
logging host {{DEFAULT_GATEWAY}}
service timestamps log datetime msec
snmp-server community public RO
snmp-server location "{{BUILDING}}, {{FLOOR}}, {{UNIT}}, {{RACK}}"
end
write memory""",
            "variables": [
                {"name": "DEVICE_NAME", "label": "نام تجهیز (Hostname)", "description": "نام هاست دیوایس در شبکه", "default_value": "SW-ACCESS-01", "required": True, "type": "text"},
                {"name": "IP_ADDRESS", "label": "آدرس آی‌پی مدیریتی (Management IP)", "description": "آدرس IP جهت دسترسی و مدیریت سوئیچ", "default_value": "192.168.1.50", "required": True, "type": "ip"},
                {"name": "SUBNET_MASK", "label": "ماسک شبکه (Subnet Mask)", "description": "ماسک زیرشبکه آی‌پی", "default_value": "255.255.255.0", "required": True, "type": "subnet"},
                {"name": "DEFAULT_GATEWAY", "label": "گیت‌وی پیش‌فرض (Default Gateway)", "description": "آدرس روتر یا گیت‌وی خروجی", "default_value": "192.168.1.254", "required": True, "type": "gateway"},
                {"name": "MANAGEMENT_VLAN", "label": "شماره ویلن مدیریت (Management VLAN)", "description": "شناسه VLAN جهت ارتباط لایه ۳ SVI", "default_value": "1", "required": True, "type": "vlan"},
                {"name": "BUILDING", "label": "ساختمان استقرار", "description": "نام ساختمان محل نصب", "default_value": "ساختمان مرکزی", "required": False, "type": "text"},
                {"name": "FLOOR", "label": "طبقه", "description": "شماره یا نام طبقه", "default_value": "طبقه ۱", "required": False, "type": "text"},
                {"name": "UNIT", "label": "واحد / اتاق", "description": "واحد یا اتاق سرور", "default_value": "اتاق رک", "required": False, "type": "text"},
                {"name": "RACK", "label": "شماره رک", "description": "نام یا کد رک مستقر", "default_value": "Rack-01", "required": False, "type": "text"},
                {"name": "DOMAIN_NAME", "label": "دامنه شبکه (Domain Name)", "description": "دامنه مورد استفاده در SSH", "default_value": "corp.local", "required": True, "type": "text"},
                {"name": "ADMIN_PASSWORD", "label": "رمز عبور SSH کاربر admin", "description": "رمز عبور رمزنگاری شده کلاینت", "default_value": "Cisco@2026!", "required": True, "type": "password"},
                {"name": "NTP_SERVER", "label": "سرور زمان (NTP Server)", "description": "سرور هماهنگ‌سازی زمان شبکه", "default_value": "192.168.1.254", "required": False, "type": "ip"}
            ]
        },
        {
            "id": "tmpl-cisco-core-dist",
            "name": "کانفیگ سوئیچ Core / Distribution سیسکو (Routing & Trunk Matrix)",
            "vendor": "cisco",
            "target_type": "switch",
            "role": "Core Switch",
            "description": "پیکربندی سوئیچ لایه ۳ هسته شامل مسیریابی بین ویلن‌ها (Inter-VLAN Routing)، OSPF، پورت‌های ترانک آپ‌لینک و تعاریف VLANهای سازمانی",
            "default_cli_mode": "GLOBAL_CONFIG",
            "is_builtin": True,
            "commands": """enable
configure terminal
hostname {{DEVICE_NAME}}
ip routing
ip domain-name {{DOMAIN_NAME}}
crypto key generate rsa modulus 2048
ip ssh version 2
username admin privilege 15 secret {{ADMIN_PASSWORD}}
line vty 0 4
 transport input ssh
 login local
exit
! Enterprise VLAN Definitions
vlan 10
 name SERVERS_DMZ
vlan 20
 name STAFF_DATA
vlan 30
 name IP_TELEPHONY
vlan {{MANAGEMENT_VLAN}}
 name NETWORK_MANAGEMENT
exit
! Routing SVIs
interface vlan 10
 description Gateway for Servers
 ip address 10.10.10.1 255.255.255.0
 no shutdown
exit
interface vlan 20
 description Gateway for Staff Workstations
 ip address 10.20.20.1 255.255.255.0
 no shutdown
exit
interface vlan {{MANAGEMENT_VLAN}}
 description Core Switch SVI - {{BUILDING}}
 ip address {{IP_ADDRESS}} {{SUBNET_MASK}}
 no shutdown
exit
! Dynamic Routing OSPF
router ospf 1
 router-id {{IP_ADDRESS}}
 network 10.10.10.0 0.0.0.255 area 0
 network 10.20.20.0 0.0.0.255 area 0
 network {{IP_ADDRESS}} 0.0.0.0 area 0
exit
! Uplink Trunk Configuration
interface GigabitEthernet1/0/48
 description Trunk Uplink to Gateway {{DEFAULT_GATEWAY}}
 switchport mode trunk
 switchport trunk allowed vlan 10,20,30,{{MANAGEMENT_VLAN}}
 no shutdown
exit
spanning-tree mode rapid-pvst
spanning-tree root primary
cdp run
lldp run
end
write memory""",
            "variables": [
                {"name": "DEVICE_NAME", "label": "نام سوئیچ Core", "description": "نام هاست سوئیچ کور", "default_value": "SW-CORE-01", "required": True, "type": "text"},
                {"name": "IP_ADDRESS", "label": "آدرس آی‌پی مدیریتی SVI", "description": "آدرس IP مدیریتی سوئیچ کور", "default_value": "192.168.1.1", "required": True, "type": "ip"},
                {"name": "SUBNET_MASK", "label": "ماسک شبکه", "description": "ماسک زیرشبکه", "default_value": "255.255.255.0", "required": True, "type": "subnet"},
                {"name": "DEFAULT_GATEWAY", "label": "گیت‌وی روتر لبه", "description": "آدرس IP روتر اصلی", "default_value": "192.168.1.254", "required": True, "type": "gateway"},
                {"name": "MANAGEMENT_VLAN", "label": "ویلن مدیریت شبکه", "description": "شناسه VLAN مدیریت", "default_value": "1", "required": True, "type": "vlan"},
                {"name": "BUILDING", "label": "ساختمان", "description": "ساختمان محل استقرار", "default_value": "ساختمان مرکزی (Central Bldg)", "required": False, "type": "text"},
                {"name": "DOMAIN_NAME", "label": "دامنه شبکه", "description": "دامنه احراز هویت", "default_value": "corp.local", "required": True, "type": "text"},
                {"name": "ADMIN_PASSWORD", "label": "رمز عبور SSH", "description": "رمز عبور کاربر ادمین", "default_value": "CiscoCore@2026!", "required": True, "type": "password"}
            ]
        },
        {
            "id": "tmpl-cisco-router-edge",
            "name": "کانفیگ روتر لبه و شعبه سیسکو (Cisco ISR Edge Router - WAN/NAT/DHCP)",
            "vendor": "cisco",
            "target_type": "router",
            "role": "Edge Gateway",
            "description": "پیکربندی روتر شعبه یا مرزی سیسکو شامل تنظیمات اینترفیس WAN، LAN Gateway، NAT Overload، DHCP Pool و فایروال ACL",
            "default_cli_mode": "GLOBAL_CONFIG",
            "is_builtin": True,
            "commands": """enable
configure terminal
hostname {{DEVICE_NAME}}
ip domain-name {{DOMAIN_NAME}}
ip ssh version 2
username admin privilege 15 secret {{ADMIN_PASSWORD}}
line vty 0 4
 transport input ssh
 login local
exit
! WAN Internet Interface
interface GigabitEthernet0/0/0
 description WAN Internet Uplink - ISP
 ip address {{WAN_IP_ADDRESS}} 255.255.255.252
 ip nat outside
 no shutdown
exit
! LAN Gateway Interface
interface GigabitEthernet0/0/1
 description LAN Default Gateway - {{BUILDING}} {{FLOOR}}
 ip address {{IP_ADDRESS}} {{SUBNET_MASK}}
 ip nat inside
 no shutdown
exit
! Static Default Route to Internet
ip route 0.0.0.0 0.0.0.0 {{DEFAULT_GATEWAY}}
! NAT Overload PAT
access-list 100 permit ip 192.168.0.0 0.0.255.255 any
ip nat inside source list 100 interface GigabitEthernet0/0/0 overload
! LAN DHCP Service
ip dhcp pool LAN_CLIENTS
 network 192.168.1.0 255.255.255.0
 default-router {{IP_ADDRESS}}
 dns-server {{DNS_SERVER}} 1.1.1.1
 lease 1
exit
ntp server {{NTP_SERVER}}
service timestamps log datetime msec
logging buffered 64000
end
write memory""",
            "variables": [
                {"name": "DEVICE_NAME", "label": "نام روتر (Router Hostname)", "description": "نام روتر در شبکه", "default_value": "RT-EDGE-01", "required": True, "type": "text"},
                {"name": "IP_ADDRESS", "label": "آدرس آی‌پی گیت‌وی LAN (Gateway IP)", "description": "آدرس اینترفیس داخلی که گیت‌وی کلاینت‌هاست", "default_value": "192.168.1.254", "required": True, "type": "ip"},
                {"name": "SUBNET_MASK", "label": "ماسک شبکه LAN", "description": "سابنت ماسک شبکه محلی", "default_value": "255.255.255.0", "required": True, "type": "subnet"},
                {"name": "WAN_IP_ADDRESS", "label": "آدرس آی‌پی اینترفیس WAN", "description": "آدرس IP استاتیک دریافت شده از پرووایدر ISP", "default_value": "89.165.12.18", "required": True, "type": "ip"},
                {"name": "DEFAULT_GATEWAY", "label": "آدرس گیت‌وی اینترنت (ISP Gateway)", "description": "Next-hop گیت‌وی متصل به ISP", "default_value": "89.165.12.17", "required": True, "type": "gateway"},
                {"name": "BUILDING", "label": "ساختمان", "description": "محل استقرار روتر", "default_value": "ساختمان مرکزی (Central Bldg)", "required": False, "type": "text"},
                {"name": "FLOOR", "label": "طبقه", "description": "طبقه استقرار روتر", "default_value": "طبقه ۱ (Floor 1)", "required": False, "type": "text"},
                {"name": "DNS_SERVER", "label": "آدرس سرور DNS", "description": "دی‌ان‌اس کلاینت‌ها", "default_value": "8.8.8.8", "required": True, "type": "ip"},
                {"name": "NTP_SERVER", "label": "سرور زمان NTP", "description": "آدرس تایم‌سرور", "default_value": "pool.ntp.org", "required": False, "type": "text"},
                {"name": "DOMAIN_NAME", "label": "دامنه", "description": "Domain name", "default_value": "corp.local", "required": True, "type": "text"},
                {"name": "ADMIN_PASSWORD", "label": "رمز عبور ادمین", "description": "رمز عبور امنیتی SSH", "default_value": "Router@2026!", "required": True, "type": "password"}
            ]
        },
        {
            "id": "tmpl-mikrotik-router-gateway",
            "name": "کانفیگ روتر میکروتیک (MikroTik RouterOS Gateway & Firewall NAT)",
            "vendor": "mikrotik",
            "target_type": "router",
            "role": "Router / Gateway",
            "description": "پیکربندی کامل روتربورد میکروتیک شامل System Identity، بریج LAN، آی‌پی‌ها، روت دیفالت، فایروال Masquerade، FastTrack و DHCP Server",
            "default_cli_mode": "ROUTEROS",
            "is_builtin": True,
            "commands": """# MikroTik RouterOS Configuration Script
# Target: {{DEVICE_NAME}} - Location: {{BUILDING}} / {{FLOOR}}
/system identity set name="{{DEVICE_NAME}}"

# Create LAN Bridge and Assign Ports
/interface bridge add name=bridge-lan comment="Main Local Bridge - {{BUILDING}} {{FLOOR}}"
/interface bridge port add bridge=bridge-lan interface=ether2 comment="LAN Port 2"
/interface bridge port add bridge=bridge-lan interface=ether3 comment="LAN Port 3"
/interface bridge port add bridge=bridge-lan interface=ether4 comment="LAN Port 4"
/interface bridge port add bridge=bridge-lan interface=ether5 comment="LAN Port 5"

# IP Address Assignment
/ip address add address={{IP_ADDRESS}}/{{SUBNET_CIDR}} interface=bridge-lan comment="LAN Gateway IP"
/ip address add address={{WAN_IP_ADDRESS}}/30 interface=ether1 comment="WAN ISP Uplink"

# Default Gateway Route
/ip route add gateway={{DEFAULT_GATEWAY}} comment="Default Internet Gateway Route"

# DNS Resolution
/ip dns set servers={{DNS_SERVER}},1.1.1.1 allow-remote-requests=yes

# DHCP Server Setup
/ip pool add name=dhcp-pool-lan ranges=192.168.1.100-192.168.1.200
/ip dhcp-server add name=dhcp-lan interface=bridge-lan address-pool=dhcp-pool-lan disabled=no lease-time=12h
/ip dhcp-server network add address=192.168.1.0/24 gateway={{IP_ADDRESS}} dns-server={{DNS_SERVER}} comment="LAN Clients Subnet"

# Firewall & NAT Masquerade
/ip firewall nat add chain=srcnat out-interface=ether1 action=masquerade comment="WAN NAT Masquerade"
/ip firewall filter add chain=forward connection-state=established,related action=accept comment="FastTrack Established/Related"
/ip firewall filter add chain=forward connection-state=invalid action=drop comment="Drop Invalid Connections"

# Security Hardening
/ip service set telnet disabled=yes ftp disabled=yes www disabled=no api disabled=yes api-ssl disabled=yes

# Time and Localization
/system clock set time-zone-name=Asia/Tehran
/system ntp client set enabled=yes primary-ntp={{NTP_SERVER}}""",
            "variables": [
                {"name": "DEVICE_NAME", "label": "نام روتربورد (System Identity)", "description": "نام شناسه روتر در میکروتیک", "default_value": "RB-CORE-GATEWAY", "required": True, "type": "text"},
                {"name": "IP_ADDRESS", "label": "آدرس آی‌پی بریج محلی (LAN Gateway)", "description": "آدرس IP گیت‌وی LAN در اینترفیس bridge", "default_value": "192.168.1.254", "required": True, "type": "ip"},
                {"name": "SUBNET_CIDR", "label": "پیشوند شبکه (CIDR Prefix)", "description": "مثلا 24 برای 255.255.255.0", "default_value": "24", "required": True, "type": "number"},
                {"name": "WAN_IP_ADDRESS", "label": "آدرس آی‌پی اینترفیس WAN", "description": "آدرس IP روی اینترفیس ether1", "default_value": "89.165.12.18", "required": True, "type": "ip"},
                {"name": "DEFAULT_GATEWAY", "label": "آدرس گیت‌وی اینترنت (ISP Gateway)", "description": "گیت‌وی خروجی", "default_value": "89.165.12.17", "required": True, "type": "gateway"},
                {"name": "BUILDING", "label": "ساختمان", "description": "نام ساختمان", "default_value": "ساختمان مرکزی", "required": False, "type": "text"},
                {"name": "FLOOR", "label": "طبقه", "description": "طبقه استقرار", "default_value": "طبقه ۱", "required": False, "type": "text"},
                {"name": "DNS_SERVER", "label": "سرور DNS", "description": "آدرس سرور دی‌ان‌اس", "default_value": "8.8.8.8", "required": True, "type": "ip"},
                {"name": "NTP_SERVER", "label": "سرور زمان NTP", "description": "آی‌پی سرور زمان", "default_value": "192.168.1.254", "required": False, "type": "ip"}
            ]
        },
        {
            "id": "tmpl-mikrotik-crs-switch",
            "name": "کانفیگ سوئیچ میکروتیک (MikroTik CRS Switch + VLAN Hardware Filtering)",
            "vendor": "mikrotik",
            "target_type": "switch",
            "role": "Distribution Switch",
            "description": "پیکربندی سوئیچ‌های سری CRS/CSS میکروتیک با Hardware VLAN Filtering روی Bridge، اینترفیس مدیریتی VLAN و آپ‌لینک‌های ترانک",
            "default_cli_mode": "ROUTEROS",
            "is_builtin": True,
            "commands": """# MikroTik CRS Hardware VLAN Switch Configuration
/system identity set name="{{DEVICE_NAME}}"

# Define Hardware Offloaded Bridge with VLAN Filtering
/interface bridge add name=bridge-sw vlan-filtering=yes comment="Hardware VLAN Bridge - {{BUILDING}} {{FLOOR}}"

# Add Trunk Uplink Ports
/interface bridge port add bridge=bridge-sw interface=sfp-sfpplus1 frame-types=admit-only-vlan-tagged comment="Trunk Uplink"

# Add Access Ports for Users
/interface bridge port add bridge=bridge-sw interface=ether1 pvid=10 frame-types=admit-only-untagged-and-priority-tagged
/interface bridge port add bridge=bridge-sw interface=ether2 pvid=10 frame-types=admit-only-untagged-and-priority-tagged
/interface bridge port add bridge=bridge-sw interface=ether3 pvid=20 frame-types=admit-only-untagged-and-priority-tagged

# Bridge VLAN Table
/interface bridge vlan add bridge=bridge-sw tagged=bridge-sw,sfp-sfpplus1 vlan-ids={{MANAGEMENT_VLAN}} comment="Mgmt VLAN"
/interface bridge vlan add bridge=bridge-sw tagged=sfp-sfpplus1 untagged=ether1,ether2 vlan-ids=10 comment="Users"
/interface bridge vlan add bridge=bridge-sw tagged=sfp-sfpplus1 untagged=ether3 vlan-ids=20 comment="VoIP"

# Management Interface
/interface vlan add name=vlan-mgmt vlan-id={{MANAGEMENT_VLAN}} interface=bridge-sw comment="Management SVI"
/ip address add address={{IP_ADDRESS}}/{{SUBNET_CIDR}} interface=vlan-mgmt comment="Management IP"
/ip route add gateway={{DEFAULT_GATEWAY}} comment="Default Management Gateway"

# Services
/ip dns set servers={{DNS_SERVER}}
/system ntp client set enabled=yes primary-ntp={{NTP_SERVER}}""",
            "variables": [
                {"name": "DEVICE_NAME", "label": "نام سوئیچ میکروتیک (System Identity)", "description": "نام هاست سوئیچ", "default_value": "CRS-SW-01", "required": True, "type": "text"},
                {"name": "IP_ADDRESS", "label": "آدرس آی‌پی مدیریتی (Management IP)", "description": "آدرس IP سوئیچ", "default_value": "192.168.1.60", "required": True, "type": "ip"},
                {"name": "SUBNET_CIDR", "label": "پیشوند سابنت (CIDR)", "description": "مثلا 24 برای 255.255.255.0", "default_value": "24", "required": True, "type": "number"},
                {"name": "DEFAULT_GATEWAY", "label": "گیت‌وی پیش‌فرض", "description": "آدرس روتر یا گیت‌وی شبکه", "default_value": "192.168.1.254", "required": True, "type": "gateway"},
                {"name": "MANAGEMENT_VLAN", "label": "شماره ویلن مدیریت", "description": "شناسه VLAN مدیریت سوئیچ", "default_value": "1", "required": True, "type": "vlan"},
                {"name": "BUILDING", "label": "ساختمان", "description": "ساختمان استقرار", "default_value": "ساختمان مرکزی", "required": False, "type": "text"},
                {"name": "FLOOR", "label": "طبقه", "description": "طبقه استقرار", "default_value": "طبقه ۲", "required": False, "type": "text"},
                {"name": "DNS_SERVER", "label": "سرور DNS", "description": "آدرس دی‌ان‌اس", "default_value": "8.8.8.8", "required": False, "type": "ip"},
                {"name": "NTP_SERVER", "label": "سرور زمان NTP", "description": "آدرس NTP", "default_value": "192.168.1.254", "required": False, "type": "ip"}
            ]
        },
        {
            "id": "tmpl-floor-access-cisco",
            "name": "کانفیگ سوئیچ طبقات و واحدهای اداری (Building / Floor Customized Switch)",
            "vendor": "cisco",
            "target_type": "switch",
            "role": "Access Switch",
            "description": "پیکربندی اختصاصی متناسب با نام ساختمان، طبقه، شماره واحد، رک و بنر MOTD سازمانی استاندارد سیسکو",
            "default_cli_mode": "GLOBAL_CONFIG",
            "is_builtin": True,
            "commands": """enable
configure terminal
hostname {{DEVICE_NAME}}
banner motd ^C
********************************************************************
* NOTICE: AUTHORIZED CORPORATE ACCESS ONLY                         *
* LOCATION: {{BUILDING}} - {{FLOOR}} - {{UNIT}}                    *
* RACK ID: {{RACK}} | MGMT IP: {{IP_ADDRESS}}                      *
* ALL SESSIONS ARE MONITORED AND LOGGED.                           *
********************************************************************
^C
ip domain-name {{DOMAIN_NAME}}
ip ssh version 2
username admin privilege 15 secret {{ADMIN_PASSWORD}}
line vty 0 4
 transport input ssh
 login local
 exec-timeout 10 0
exit
interface vlan {{MANAGEMENT_VLAN}}
 description Floor Management - {{BUILDING}} {{FLOOR}}
 ip address {{IP_ADDRESS}} {{SUBNET_MASK}}
 no shutdown
exit
ip default-gateway {{DEFAULT_GATEWAY}}
cdp run
lldp run
ntp server {{NTP_SERVER}}
service timestamps log datetime msec
logging buffered 32000
snmp-server community public RO
snmp-server location "{{BUILDING}}, {{FLOOR}}, {{UNIT}}, {{RACK}}"
end
write memory""",
            "variables": [
                {"name": "DEVICE_NAME", "label": "نام تجهیز (Hostname)", "description": "نام سوئیچ در شبکه", "default_value": "SW-BLDG-B-FL1", "required": True, "type": "text"},
                {"name": "IP_ADDRESS", "label": "آدرس آی‌پی مدیریتی", "description": "آدرس IP سوئیچ", "default_value": "192.168.1.30", "required": True, "type": "ip"},
                {"name": "SUBNET_MASK", "label": "ماسک زیرشبکه", "description": "Subnet mask", "default_value": "255.255.255.0", "required": True, "type": "subnet"},
                {"name": "DEFAULT_GATEWAY", "label": "گیت‌وی پیش‌فرض", "description": "گیت‌وی شبکه", "default_value": "192.168.1.254", "required": True, "type": "gateway"},
                {"name": "MANAGEMENT_VLAN", "label": "شماره ویلن مدیریت", "description": "VLAN ID", "default_value": "1", "required": True, "type": "vlan"},
                {"name": "BUILDING", "label": "ساختمان استقرار", "description": "نام ساختمان", "default_value": "ساختمان اداری B", "required": True, "type": "text"},
                {"name": "FLOOR", "label": "طبقه", "description": "شماره یا نام طبقه", "default_value": "طبقه ۱ (Floor 1)", "required": True, "type": "text"},
                {"name": "UNIT", "label": "واحد / اتاق", "description": "واحد استقرار", "default_value": "واحد فناوری اطلاعات", "required": False, "type": "text"},
                {"name": "RACK", "label": "شماره رک", "description": "کابینت یا رک", "default_value": "Rack-B01", "required": False, "type": "text"},
                {"name": "DOMAIN_NAME", "label": "دامنه", "description": "Domain Name", "default_value": "corp.local", "required": True, "type": "text"},
                {"name": "ADMIN_PASSWORD", "label": "رمز عبور SSH", "description": "Password", "default_value": "Floor@2026!", "required": True, "type": "password"},
                {"name": "NTP_SERVER", "label": "سرور زمان NTP", "description": "NTP IP", "default_value": "192.168.1.254", "required": False, "type": "ip"}
            ]
        }
    ]

def render_template_commands(command_text, variables):
    """
    Replace {{VAR_NAME}} with corresponding value in variables dict.
    """
    rendered = command_text
    for k, v in variables.items():
        val_str = str(v) if v is not None else ""
        rendered = rendered.replace(f"{{{{{k}}}}}", val_str)
    return rendered

def simulate_device_execution(template, rendered_commands, device):
    """
    Simulate realistic terminal stream logs for Cisco IOS or MikroTik RouterOS.
    """
    lines = rendered_commands.split("\n")
    logs = []
    vendor = template.get("vendor", "cisco").lower()
    dev_name = device.get("name", "Device")
    
    current_prompt = f"{dev_name}>" if vendor == "cisco" else f"[admin@{dev_name}] >"
    
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("!"):
            continue
        
        # Handle comment or banner in terminal
        if stripped.startswith("#"):
            logs.append({
                "timestamp": time.strftime("%H:%M:%S"),
                "command": stripped,
                "prompt": current_prompt,
                "output": "",
                "status": "info"
            })
            continue

        prompt_before = current_prompt
        output = ""
        status = "ok"

        if vendor == "cisco":
            if stripped == "enable":
                current_prompt = f"{dev_name}#"
                output = ""
            elif stripped in ["configure terminal", "conf t"]:
                current_prompt = f"{dev_name}(config)#"
                output = "Enter configuration commands, one per line.  End with CNTL/Z."
            elif stripped.startswith("interface") or stripped.startswith("int "):
                if "(config)" in current_prompt:
                    current_prompt = f"{dev_name}(config-if)#"
            elif stripped.startswith("vlan "):
                if "(config)" in current_prompt:
                    current_prompt = f"{dev_name}(config-vlan)#"
            elif stripped.startswith("line "):
                if "(config)" in current_prompt:
                    current_prompt = f"{dev_name}(config-line)#"
            elif stripped.startswith("router "):
                if "(config)" in current_prompt:
                    current_prompt = f"{dev_name}(config-router)#"
            elif stripped in ["exit", "ex"]:
                if "(config-" in current_prompt:
                    current_prompt = f"{dev_name}(config)#"
                elif "(config)" in current_prompt:
                    current_prompt = f"{dev_name}#"
            elif stripped in ["end"]:
                current_prompt = f"{dev_name}#"
            elif stripped in ["write memory", "write", "wr", "copy run start"]:
                output = "Building configuration...\n[OK]"
            elif stripped.startswith("crypto key generate"):
                output = "% The key-pair has been generated with modulus 2048 bits."
            elif stripped.startswith("hostname "):
                new_host = stripped.split()[1]
                dev_name = new_host
                current_prompt = re.sub(r'^[^\(#>]+', new_host, current_prompt)
        elif vendor == "mikrotik":
            if stripped.startswith("/system identity set name="):
                m = re.search(r'name="?([^"\s]+)"?', stripped)
                if m:
                    dev_name = m.group(1)
                    current_prompt = f"[admin@{dev_name}] >"
            output = "[OK]"

        logs.append({
            "timestamp": time.strftime("%H:%M:%S"),
            "command": stripped,
            "prompt": prompt_before,
            "output": output,
            "status": status
        })

    return logs
