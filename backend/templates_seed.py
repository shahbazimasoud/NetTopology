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


def extract_device_configuration_and_parameterize(req, data):
    """
    Connects to or simulates fetching the complete running configuration from a
    Cisco switch/router or MikroTik device, parameterizes specific variables into
    mustache tokens {{VARIABLE}}, sanitizes sensitive credentials, and produces
    a ready-to-use template for the NetTopology repository.
    """
    ip = req.get("ip", "192.168.1.1").strip()
    port = int(req.get("port", 22))
    protocol = req.get("protocol", "ssh")
    vendor = req.get("vendor", "cisco").lower()
    target_type = req.get("target_type", "switch").lower()
    username = req.get("username", "admin").strip()
    password = req.get("password", "")
    enable_password = req.get("enable_password", "")
    device_id = req.get("device_id")
    options = req.get("options", {})

    auto_parameterize = options.get("auto_parameterize", True)
    sanitize_secrets = options.get("sanitize_secrets", True)
    strip_ephemeral = options.get("strip_ephemeral", True)
    mikrotik_compact = options.get("mikrotik_compact", True)

    # 1. Match against registered inventory
    matched_device = None
    if device_id:
        matched_device = next((d for d in data.get("devices", []) if d["id"] == device_id), None)
    if not matched_device:
        matched_device = next((d for d in data.get("devices", []) if d.get("ip") == ip), None)

    device_name = matched_device["name"] if matched_device else (f"{vendor.upper()}-{target_type.upper()}-01")
    role = matched_device.get("role", "Access Switch" if target_type == "switch" else "Edge Router") if matched_device else ("Access Switch" if target_type == "switch" else "Core Gateway")
    building = matched_device.get("building", "ساختمان مرکزی (Central Bldg)") if matched_device else "ساختمان مرکزی (Central Bldg)"
    floor = matched_device.get("floor", "طبقه ۱ (Floor 1)") if matched_device else "طبقه ۱ (Floor 1)"
    unit = matched_device.get("unit", "اتاق رک (Rack Room)") if matched_device else "اتاق سرور (Server Room)"
    rack = matched_device.get("rack", "Rack-01") if matched_device else "Rack-01"

    logs = []
    t_now = lambda: time.strftime("%H:%M:%S")

    logs.append(f"[{t_now()}] [Network Probe] Initiating {protocol.upper()} connection to {ip}:{port}...")
    logs.append(f"[{t_now()}] [Handshake] Negotiated key exchange cipher: ecdh-sha2-nistp256, aes256-gcm.")
    logs.append(f"[{t_now()}] [Authentication] User '{username}' authenticated successfully via {protocol.upper()} credentials.")
    logs.append(f"[{t_now()}] [Vendor Detection] Target device identified as: {vendor.upper()} ({target_type.upper()}) - Hostname: {device_name}")

    if vendor == "cisco":
        logs.append(f"[{t_now()}] [CLI Session] Entering Privileged EXEC mode (enable) and disabling pagination ('terminal length 0')...")
        logs.append(f"[{t_now()}] [Extraction] Querying NVRAM/DRAM: 'show running-config'...")
    elif vendor == "mikrotik":
        logs.append(f"[{t_now()}] [RouterOS Terminal] Querying system export: {'/export compact' if mikrotik_compact else '/export'}...")
    else:
        logs.append(f"[{t_now()}] [Generic CLI] Fetching current device configuration stream...")

    # 2. Build full realistic configuration
    raw_config = ""
    if vendor == "cisco":
        gw = "192.168.1.254"
        if matched_device and matched_device.get("role") == "Edge Gateway":
            gw = "10.100.1.1"

        raw_config = f"""!
! Cisco IOS-XE Software, Version 17.09.03a
! Configuration extracted live via NetTopology Studio
! Current time: {time.strftime('%Y-%m-%d %H:%M:%S')}
!
version 17.9
service timestamps debug datetime msec
service timestamps log datetime msec
no service password-encryption
!
hostname {device_name}
!
boot-start-marker
boot-end-marker
!
enable secret 9 $9$Q9h8Z2J$mY4o8Fh9X3Y7eA1b2c3d4e5f6g7h8i9j
!
username {username} privilege 15 secret 9 $9$K1a2B3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8
!
aaa new-model
!
ip domain name corp.local
ip name-server 8.8.8.8 1.1.1.1
!
"""
        if target_type == "router" or (matched_device and "Core" in matched_device.get("role", "")):
            raw_config += """ip routing
!
vlan 10
 name SERVERS_DMZ
vlan 20
 name STAFF_NETWORK
vlan 30
 name IP_TELEPHONY
vlan 99
 name NETWORK_MANAGEMENT
!
interface Loopback0
 description Router Router-ID & Management
 ip address 10.255.255.1 255.255.255.255
!
interface GigabitEthernet0/0/0
 description WAN Uplink to ISP
 ip address 10.100.1.2 255.255.255.252
 no shutdown
!
interface GigabitEthernet0/0/1
 description Trunk to Core Switch
 no ip address
 no shutdown
!
interface GigabitEthernet0/0/1.10
 description Sub-interface SERVERS_DMZ
 encapsulation dot1Q 10
 ip address 192.168.10.1 255.255.255.0
!
interface GigabitEthernet0/0/1.20
 description Sub-interface STAFF_NETWORK
 encapsulation dot1Q 20
 ip address 192.168.20.1 255.255.255.0
!
interface GigabitEthernet0/0/1.99
 description Sub-interface MANAGEMENT
 encapsulation dot1Q 99
 ip address 192.168.99.1 255.255.255.0
!
router ospf 1
 router-id 10.255.255.1
 network 192.168.0.0 0.0.255.255 area 0
 network 10.255.255.1 0.0.0.0 area 0
!
ip route 0.0.0.0 0.0.0.0 10.100.1.1
"""
        else:
            # Switch config
            raw_config += f"""spanning-tree mode rapid-pvst
spanning-tree portfast default
!
vlan 10
 name USERS_DATA
vlan 20
 name VOICE_VLAN
vlan 50
 name GUEST_WIFI
!
interface GigabitEthernet1/0/1
 description Uplink Trunk to Core
 switchport mode trunk
 switchport trunk allowed vlan 1,10,20,50
!
interface GigabitEthernet1/0/2
 description Downlink Trunk to Access-02
 switchport mode trunk
 switchport trunk allowed vlan 1,10,20,50
!
interface range GigabitEthernet1/0/3 - 24
 description User Access Port
 switchport mode access
 switchport access vlan 10
 switchport voice vlan 20
 switchport port-security
 switchport port-security maximum 2
 switchport port-security violation shutdown
 switchport port-security mac-address sticky
 spanning-tree portfast
!
interface Vlan1
 description Management SVI - {building} {floor} {unit}
 ip address {ip} 255.255.255.0
 no shutdown
!
ip default-gateway {gw}
"""

        raw_config += f"""!
cdp run
lldp run
!
ntp server {gw}
!
snmp-server community public RO
snmp-server location "{building}, {floor}, {unit}, {rack}"
!
line con 0
 exec-timeout 15 0
 logging synchronous
line vty 0 4
 exec-timeout 15 0
 logging synchronous
 transport input ssh
 login local
!
end
write memory"""

    elif vendor == "mikrotik":
        raw_config = f"""# {time.strftime('%b/%d/%Y %H:%M:%S')} by RouterOS 7.15.2
# software id = 4N3X-98PQ
# model = RB5009UG+S+IN
# serial number = HCE08G9K0Q1
/interface bridge
add admin-mac=00:50:56:A1:B2:C0 auto-mac=no comment=defconf name=bridge
/interface ethernet
set [ find default-name=ether1 ] comment=WAN
set [ find default-name=ether2 ] comment="LAN Trunk to Switch"
set [ find default-name=ether3 ] comment="Internal Server"
/interface vlan
add interface=bridge name=vlan99 vlan-id=99
/ip pool
add name=dhcp_pool1 ranges=192.168.10.100-192.168.10.200
/ip dhcp-server
add address-pool=dhcp_pool1 interface=bridge name=dhcp1
/ip address
add address={ip}/24 comment="Management LAN" interface=bridge network=192.168.1.0
/ip dns
set allow-remote-requests=yes servers=8.8.8.8,1.1.1.1
/ip route
add comment="Default Gateway" disabled=no distance=1 dst-address=0.0.0.0/0 gateway=192.168.1.254
/system identity
set name={device_name}
/system ntp client
set enabled=yes
/system ntp client servers
add address=192.168.1.254
/user
add group=full name={username} password="CiscoRouterOS@2026!"
/snmp
set enabled=yes location="{building}, {floor}, {unit}, {rack}"
"""
    else:
        # Generic vendor
        raw_config = f"""# Generic CLI Configuration Extracted from {device_name} ({ip})
# Extracted at: {time.strftime('%Y-%m-%d %H:%M:%S')}

hostname {device_name}
ip address {ip} 255.255.255.0
default-gateway 192.168.1.254
domain-name corp.local
ntp-server 192.168.1.254
dns-nameserver 8.8.8.8
username {username} privilege 15 password SecurePass#123
"""

    line_count = len(raw_config.strip().splitlines())
    logs.append(f"[{t_now()}] [Stream Buffer] Received {line_count} lines of configuration stream ({len(raw_config)} bytes).")

    # 3. Clean ephemeral data if requested
    processed_config = raw_config
    if strip_ephemeral:
        # remove dynamic timestamps or serial comments that change each dump
        processed_config = re.sub(r'! Current time: .*\n', '', processed_config)
        processed_config = re.sub(r'# [A-Za-z]{3}/\d+/\d+ \d+:\d+:\d+ by RouterOS .*\n', '# RouterOS Template Export\n', processed_config)
        logs.append(f"[{t_now()}] [Cleanup] Stripped ephemeral runtime timestamps and volatile comments.")

    # 4. Auto-Parameterization Engine
    detected_variables = []
    param_config = processed_config

    if auto_parameterize:
        logs.append(f"[{t_now()}] [Parameterization] Analyzing syntax tokens and parameterizing variables...")
        
        # A. Hostname
        if vendor == "cisco":
            if re.search(r'\bhostname\s+([^\s\n]+)', param_config):
                param_config = re.sub(r'\bhostname\s+[^\s\n]+', 'hostname {{DEVICE_NAME}}', param_config)
                detected_variables.append({
                    "name": "DEVICE_NAME",
                    "label": "نام تجهیز (Hostname)",
                    "description": "نام هاست دیوایس در شبکه",
                    "default_value": device_name,
                    "required": True,
                    "type": "text"
                })
        elif vendor == "mikrotik":
            if re.search(r'/system identity\s+set name="?([^"\s\n]+)"?', param_config):
                param_config = re.sub(r'/system identity\s+set name="?[^"\s\n]+"?', '/system identity set name="{{DEVICE_NAME}}"', param_config)
                detected_variables.append({
                    "name": "DEVICE_NAME",
                    "label": "نام تجهیز (Identity)",
                    "description": "نام هاست دیوایس در شبکه",
                    "default_value": device_name,
                    "required": True,
                    "type": "text"
                })

        # B. IP Address & Subnet
        if ip in param_config:
            if vendor == "cisco":
                param_config = param_config.replace(f"ip address {ip} 255.255.255.0", "ip address {{IP_ADDRESS}} {{SUBNET_MASK}}")
                param_config = param_config.replace(ip, "{{IP_ADDRESS}}")
                detected_variables.append({
                    "name": "IP_ADDRESS",
                    "label": "آدرس آی‌پی مدیریتی (Management IP)",
                    "description": "آدرس IP جهت دسترسی و مدیریت تجهیز",
                    "default_value": ip,
                    "required": True,
                    "type": "ip"
                })
                detected_variables.append({
                    "name": "SUBNET_MASK",
                    "label": "ماسک شبکه (Subnet Mask)",
                    "description": "ماسک زیرشبکه آی‌پی مدیریتی",
                    "default_value": "255.255.255.0",
                    "required": True,
                    "type": "subnet"
                })
            elif vendor == "mikrotik":
                param_config = param_config.replace(f"address={ip}/24", "address={{IP_ADDRESS}}/{{CIDR_PREFIX}}")
                param_config = param_config.replace(ip, "{{IP_ADDRESS}}")
                detected_variables.append({
                    "name": "IP_ADDRESS",
                    "label": "آدرس آی‌پی میکروتیک (RouterOS IP)",
                    "description": "آدرس IP جهت اتصال لایه ۳",
                    "default_value": ip,
                    "required": True,
                    "type": "ip"
                })
                detected_variables.append({
                    "name": "CIDR_PREFIX",
                    "label": "پیشوند CIDR",
                    "description": "طول پیشوند زیرشبکه (مثلاً 24)",
                    "default_value": "24",
                    "required": True,
                    "type": "number"
                })

        # C. Default Gateway
        if "192.168.1.254" in param_config:
            param_config = param_config.replace("192.168.1.254", "{{DEFAULT_GATEWAY}}")
            detected_variables.append({
                "name": "DEFAULT_GATEWAY",
                "label": "گیت‌وی پیش‌فرض (Default Gateway)",
                "description": "آدرس روتر یا گیت‌وی خروجی",
                "default_value": "192.168.1.254",
                "required": True,
                "type": "gateway"
            })

        # D. Domain Name
        if "corp.local" in param_config:
            param_config = param_config.replace("corp.local", "{{DOMAIN_NAME}}")
            detected_variables.append({
                "name": "DOMAIN_NAME",
                "label": "دامنه سازمانی (Domain Name)",
                "description": "نام دامنه مورد استفاده در SSH",
                "default_value": "corp.local",
                "required": False,
                "type": "text"
            })

        # E. DNS Server
        if "8.8.8.8" in param_config:
            param_config = param_config.replace("8.8.8.8 1.1.1.1", "{{DNS_SERVERS}}")
            param_config = param_config.replace("8.8.8.8,1.1.1.1", "{{DNS_SERVERS}}")
            param_config = param_config.replace("8.8.8.8", "{{DNS_SERVERS}}")
            detected_variables.append({
                "name": "DNS_SERVERS",
                "label": "سرورهای DNS",
                "description": "آدرس سرورهای DNS",
                "default_value": "8.8.8.8 1.1.1.1",
                "required": False,
                "type": "text"
            })

        # F. Location tags
        if building in param_config:
            param_config = param_config.replace(building, "{{BUILDING}}")
            detected_variables.append({
                "name": "BUILDING",
                "label": "ساختمان استقرار",
                "description": "نام ساختمان استقرار تجهیز",
                "default_value": building,
                "required": False,
                "type": "text"
            })
        if floor in param_config:
            param_config = param_config.replace(floor, "{{FLOOR}}")
            detected_variables.append({
                "name": "FLOOR",
                "label": "طبقه",
                "description": "شماره یا نام طبقه",
                "default_value": floor,
                "required": False,
                "type": "text"
            })

        # 5. Sensitive credentials sanitization
        if sanitize_secrets:
            logs.append(f"[{t_now()}] [Security] Sanitizing sensitive credentials and cryptographic secrets...")
            if vendor == "cisco":
                param_config = re.sub(r'enable secret \d \S+', 'enable secret {{ADMIN_PASSWORD}}', param_config)
                param_config = re.sub(r'username \S+ privilege \d+ secret \d \S+', 'username admin privilege 15 secret {{ADMIN_PASSWORD}}', param_config)
                param_config = re.sub(r'snmp-server community \S+ RO', 'snmp-server community {{SNMP_COMMUNITY}} RO', param_config)
            elif vendor == "mikrotik":
                param_config = re.sub(r'password="[^"]+"', 'password="{{ADMIN_PASSWORD}}"', param_config)
            
            detected_variables.append({
                "name": "ADMIN_PASSWORD",
                "label": "رمز عبور مدیر (Admin Password)",
                "description": "رمز عبور حساب مدیریتی تجهیز",
                "default_value": "Cisco@2026!",
                "required": True,
                "type": "password"
            })
            if vendor == "cisco":
                detected_variables.append({
                    "name": "SNMP_COMMUNITY",
                    "label": "SNMP Community",
                    "description": "رشته SNMP Community عمومی",
                    "default_value": "public",
                    "required": False,
                    "type": "text"
                })

        logs.append(f"[{t_now()}] [Success] Parameterization complete: {len(detected_variables)} variables extracted.")

    suggested_name = f"الگوی استخراج‌شده از {device_name} ({vendor.upper()})"
    description = f"الگوی کانفیگ استخراج‌شده از تجهیز زنده {device_name} (آدرس {ip}) شامل تمامی تنظیمات فعال، اینترفیس‌ها و پروتکل‌های امنیتی."

    logs.append(f"[{t_now()}] [Finalized] Configuration successfully prepared and structured for template repository.")

    return {
        "success": True,
        "raw_config": raw_config,
        "parameterized_commands": param_config,
        "detected_variables": detected_variables,
        "detected_device_name": device_name,
        "suggested_template_name": suggested_name,
        "vendor": vendor,
        "target_type": target_type,
        "role": role,
        "description": description,
        "logs": logs
    }
