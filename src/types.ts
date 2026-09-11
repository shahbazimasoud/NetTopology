export type DeviceType = 'switch' | 'router' | 'access_point';

export type DevicePlatform =
  | 'cisco_ios_xe'
  | 'cisco_ios'
  | 'mikrotik_routeros'
  | 'generic_linux';

export type ConnectionMode = 'ssh' | 'simulator';

export interface DeviceConnection {
  protocol: 'ssh';
  host: string;
  port: number;
  username: string;
  password?: string;
  private_key?: string;
  connection_timeout?: number;
}

export interface PlatformCapabilities {
  vlan: boolean;
  interface_enable_disable: boolean;
  port_security: boolean;
  switchport_mode: boolean;
  trunk: boolean;
  save_config: boolean;
  interface_description: boolean;
  speed_duplex: boolean;
  poe: boolean;
  lldp_cdp: boolean;
}

export interface CommandGuideItem {
  cmd: string;
  desc: string;
  descEn?: string;
  category: 'show' | 'config' | 'action';
  mode: string;
}

export interface DevicePlatformInfo {
  platform: DevicePlatform;
  platform_name: string;
  capabilities: PlatformCapabilities;
  command_guide: CommandGuideItem[];
}

export function isMikroTikDevice(device?: Partial<Device> | null): boolean {
  if (!device) return false;
  if (device.platform === 'mikrotik_routeros') return true;
  const m = (device.model || '').toLowerCase();
  const n = (device.name || '').toLowerCase();
  const f = (device.firmware || '').toLowerCase();
  return (
    m.includes('mikrotik') ||
    m.includes('routerboard') ||
    m.includes('crs') ||
    m.includes('ccr') ||
    m.includes('hex') ||
    m.includes('hap') ||
    m.includes('rb') ||
    n.includes('mikrotik') ||
    n.includes('routerboard') ||
    f.includes('routeros')
  );
}

export function isGenericLinuxDevice(device?: Partial<Device> | null): boolean {
  if (!device) return false;
  return device.platform === 'generic_linux';
}

export interface Device {
  id: string;
  name: string;
  ip: string;
  type: DeviceType;
  role: string;
  model: string;
  platform?: DevicePlatform;
  connection_mode?: ConnectionMode;
  connection?: DeviceConnection;
  mac: string;
  building: string;
  floor: string;
  unit: string;
  rack?: string;
  is_online: boolean;
  latency_ms?: number | null;
  packet_loss?: number;
  uptime?: string;
  cdp_enabled: boolean;
  lldp_enabled: boolean;
  snmp_community?: string;
  firmware?: string;
  last_seen?: string;
  total_ports: number;
  has_unsaved_changes?: boolean;
  last_modified_time?: string;
  ssh_host?: string;
  ssh_port?: number;
  ssh_username?: string;
  ssh_password?: string;
  enable_password?: string;
  ssh_status?: 'connected' | 'authenticated' | 'disconnected' | 'failed';
  ssh_connected?: boolean;
}

export interface SwitchPort {
  port_id: string;
  name: string;
  status: 'up' | 'down';
  admin_status: 'enabled' | 'disabled';
  mode: 'trunk' | 'access';
  vlan: number;
  allowed_vlans: string;
  speed: string;
  duplex: string;
  connected_device: string;
  connected_type?: 'Switch' | 'Router' | 'Access Point' | 'Server' | 'Workstation' | 'Printer' | 'VoIP Phone' | 'Host' | 'None';
  poe_status?: 'delivering' | 'off' | 'disabled' | 'n/a';
  poe_power?: number;
  description?: string;
  // Cisco Port Security
  port_security_enabled?: boolean;
  port_security_max_mac?: number;
  port_security_mode?: 'sticky' | 'configured' | 'dynamic';
  port_security_configured_mac?: string;
  port_security_violation?: 'shutdown' | 'restrict' | 'protect';
  port_security_status?: 'secure-up' | 'secure-down' | 'secure-shutdown' | 'disabled';
  port_security_learned_macs?: string[];
}

export interface CdpLldpNeighbor {
  local_device_id: string;
  local_port: string;
  neighbor_name: string;
  neighbor_ip: string;
  neighbor_port: string;
  neighbor_model: string;
  protocol: 'CDP' | 'LLDP';
  capabilities: string;
  vlan: number;
  holdtime: number;
  timestamp?: string;
}

export interface TopologyLink {
  id: string;
  source: string;
  target: string;
  source_port: string;
  target_port: string;
  type: 'trunk' | 'access';
  vlan?: number;
  speed?: string;
  protocol?: 'CDP' | 'LLDP';
  status: 'active' | 'down';
}

export interface CustomTopologyLink {
  id: string;
  sourceDeviceId: string;
  targetDeviceId: string;
  sourcePort: string;
  targetPort: string;
  sourceIp?: string;
  targetIp?: string;
  sourceMode: 'trunk' | 'access';
  targetMode: 'trunk' | 'access';
  sourceVlan?: number;
  targetVlan?: number;
  speed?: string;
  cableType?: 'copper' | 'fiber' | 'serial' | 'direct';
  notes?: string;
  status: 'active' | 'down' | 'testing';
}

export type RackUnitSize = 16 | 21 | 28 | 36 | 40 | 44;
export type RackDepth = 60 | 80 | 100 | 120;
export type RackViewMode = 'front' | 'rear';

export type NetworkPortType =
  | '1GbE RJ45'
  | '10GbE RJ45'
  | '10G SFP+'
  | '25G SFP28'
  | '40G QSFP+'
  | '100G QSFP28'
  | '8G FC'
  | '16G FC'
  | '32G FC';

export interface NetworkCardConfig {
  id: string;
  name: string;
  portCount: number;
  portType: NetworkPortType;
  slot?: string;
}

export type HardwareCategory =
  | 'hpe_server'
  | 'asus_server'
  | 'cisco_server'
  | 'patch_panel'
  | 'cable_management'
  | 'cisco_switch'
  | 'cisco_router'
  | 'hpe_storage'
  | 'emc_storage'
  | 'qnap_storage'
  | 'rackmount_case'
  | 'mikrotik_router'
  | 'firewall_fortigate'
  | 'firewall_sophos'
  | 'pdu'
  | 'ups_rackmount'
  | 'kvm_console'
  | 'fan_unit'
  | 'blank_panel';

export interface MountedHardwareDevice {
  id: string;
  name: string;
  category: HardwareCategory;
  brand: string;
  model: string;
  generation?: string;
  heightU: number;
  startU: number; // 1-indexed bottom U position
  networkCards: NetworkCardConfig[];
  ip?: string;
  serialNumber?: string;
  powerWatts?: number;
  powerSupplyCount?: number;
  pduOutletsCount?: number;
  pduOutletType?: string;
  pduAmperage?: number;
  notes?: string;
}

export interface CustomTopologyRack {
  id: string;
  name: string;
  units: RackUnitSize;
  depth: RackDepth;
  viewMode: RackViewMode;
  x: number;
  y: number;
  devices: MountedHardwareDevice[];
  color?: string;
  widthPx?: number;
}

export type StickyNoteColor = 'yellow' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'purple' | 'slate';

export interface CustomTopologyStickyNote {
  id: string;
  x: number;
  y: number;
  width?: number;
  title?: string;
  content: string;
  color: StickyNoteColor;
  linkedDeviceId?: string;
  createdAt: string;
  updatedAt: string;
}

export type DeviceCanvasDisplayMode = 'card' | 'physical';

export interface CustomTopologyMap {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  devicePositions: Record<string, { x: number; y: number }>;
  deviceIds: string[];
  links: CustomTopologyLink[];
  racks?: CustomTopologyRack[];
  stickyNotes?: CustomTopologyStickyNote[];
  deviceDisplayModes?: Record<string, DeviceCanvasDisplayMode>;
}

export interface TopologyNode extends Device {}

export interface TopologyData {
  nodes: TopologyNode[];
  links: TopologyLink[];
  buildings: string[];
  floors: string[];
  summary: {
    total_nodes: number;
    total_links: number;
    core_switches: number;
    access_switches: number;
    routers: number;
    access_points: number;
  };
}

export interface VlanInfo {
  id: number;
  name: string;
  subnet: string;
  color: string;
}

export type TemplateVendor = 'cisco' | 'mikrotik' | 'generic';
export type TemplateTargetType = 'switch' | 'router' | 'access_point' | 'all';

export interface TemplateVariable {
  name: string;
  label: string;
  description: string;
  default_value?: string;
  required: boolean;
  type: 'ip' | 'subnet' | 'gateway' | 'text' | 'number' | 'vlan' | 'password';
}

export interface ConfigTemplate {
  id: string;
  name: string;
  vendor: TemplateVendor;
  target_type: TemplateTargetType;
  role: string;
  description: string;
  default_cli_mode?: string;
  commands: string;
  variables: TemplateVariable[];
  author?: string;
  created_at?: string;
  updated_at?: string;
  is_builtin?: boolean;
}

export interface TemplateExecutionLog {
  timestamp: string;
  command: string;
  prompt: string;
  output: string;
  status: 'ok' | 'info' | 'warn' | 'error';
}

export interface TemplateApplyResult {
  success: boolean;
  message: string;
  device: Device;
  rendered_script: string;
  logs: TemplateExecutionLog[];
}

export interface DeviceConfigExtractOptions {
  auto_parameterize?: boolean;
  sanitize_secrets?: boolean;
  strip_ephemeral?: boolean;
  mikrotik_compact?: boolean;
}

export interface DeviceConfigExtractRequest {
  device_id?: string;
  ip: string;
  port?: number;
  protocol?: 'ssh' | 'telnet';
  vendor: TemplateVendor;
  target_type: TemplateTargetType;
  username?: string;
  password?: string;
  enable_password?: string;
  options?: DeviceConfigExtractOptions;
}

export interface DeviceConfigExtractResult {
  success: boolean;
  message?: string;
  raw_config: string;
  parameterized_commands: string;
  detected_variables: TemplateVariable[];
  detected_device_name: string;
  suggested_template_name: string;
  vendor: TemplateVendor;
  target_type: TemplateTargetType;
  role: string;
  description: string;
  logs: string[];
}

// ==========================================
// Settings: Device Grouping & Tagging
// ==========================================
export type GroupColor = 'amber' | 'indigo' | 'emerald' | 'cyan' | 'rose' | 'purple' | 'blue' | 'slate';

export interface DeviceGroup {
  id: string;
  name: string;
  description: string;
  color: GroupColor;
  icon?: string;
  deviceIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// Settings: Active Directory / LDAP Integration
// ==========================================
export interface ADSecurityGroup {
  dn: string;
  cn: string;
  description: string;
  memberCount: number;
}

export interface ADUser {
  dn: string;
  samAccountName: string;
  displayName: string;
  email: string;
  department: string;
  title: string;
  groups: string[];
  enabled: boolean;
}

export interface ActiveDirectoryConfig {
  enabled: boolean;
  server: string;
  port: number;
  useSsl: boolean;
  domain: string;
  baseDn: string;
  bindUser: string;
  bindPassword?: string;
  userSearchBase: string;
  groupSearchBase: string;
  lastSyncStatus: 'idle' | 'testing' | 'success' | 'failed';
  lastSyncMessage?: string;
  lastSyncTime?: string | null;
  syncedGroups: ADSecurityGroup[];
  syncedUsers: ADUser[];
}

export interface ADTestResult {
  success: boolean;
  latency_ms: number;
  message: string;
  serverBanner?: string;
  sslValid?: boolean;
  bindSuccess?: boolean;
  logs: string[];
}

// ==========================================
// Settings: Role-Based Access Control (RBAC) & Local Identity
// ==========================================
export interface LocalGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  memberUserIds: string[];
  createdAt: string;
  updatedAt: string;
  isBuiltin?: boolean;
}

export interface LocalUser {
  id: string;
  username: string;
  fullName: string;
  email: string;
  status: 'active' | 'disabled';
  role?: string;
  groupIds?: string[];
  passwordHash?: string;
  createdAt?: string;
  lastLogin?: string;
  isBuiltin?: boolean;
}

export interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  isBuiltin?: boolean;
  priority: number;
  // Subject: Who does this policy apply to?
  subjectType: 'local_user' | 'local_group' | 'ad_group' | 'ad_user';
  subjectId: string;
  subjectName: string;
  // Target: Which devices does this cover?
  targetScope: 'all' | 'groups' | 'specific';
  targetGroupIds: string[];
  targetDeviceIds: string[];
  // Page / Module Access: Where can they go?
  canViewDashboard: boolean;
  canViewTopology: boolean;
  canViewDevices: boolean;
  canViewPorts: boolean;
  canViewScanner: boolean;
  canViewTemplates: boolean;
  canViewSettings: boolean;

  // 1. Cisco IOS / IOS-XE Granular Capabilities
  terminalAccess: 'none' | 'view_only' | 'full';
  canToggleAdminStatus: boolean;      // shutdown / no shutdown
  canChangeVlan: boolean;             // assign VLAN
  canEditDescription: boolean;        // set port description
  canTogglePortSecurity: boolean;     // port security enable/disable
  canWriteMemory: boolean;            // copy run start / write memory

  // 2. MikroTik RouterOS Granular Capabilities
  mikrotikTerminalAccess?: 'none' | 'view_only' | 'full';
  canMikrotikToggleInterface?: boolean; // /interface/set disabled=yes/no
  canMikrotikBridgeVlan?: boolean;       // /interface/bridge/vlan & PVID
  canMikrotikComment?: boolean;          // /interface/set comment=...
  canMikrotikIpPool?: boolean;           // /ip/address & /ip/pool
  canMikrotikFirewall?: boolean;         // /ip/firewall filter/nat
  canMikrotikBackup?: boolean;           // /system/backup & /export
  canMikrotikSafeMode?: boolean;         // RouterOS Safe Mode Protection

  // 3. Generic & Linux Network Appliances
  genericTerminalAccess?: 'none' | 'view_only' | 'full';
  canGenericToggleLink?: boolean;        // ip link set dev up/down
  canGenericDiagnostics?: boolean;       // ping, traceroute, mtr
  canGenericConfigBackup?: boolean;      // system config snapshot

  // 4. Global Infrastructure Operations
  canManageDevices: boolean;          // add, edit, delete device
  canApplyTemplates: boolean;         // apply config template
  canBatchOperate: boolean;           // batch port configuration

  // 5. Backup & Disaster Recovery Operations
  canExportBackup?: boolean;          // Export full or partial network backup package
  canImportBackup?: boolean;          // Import and restore network backup package
}

export type BackupScope = 'full' | 'devices_topology' | 'security_rbac' | 'templates_only';

export interface BackupMetadata {
  version: string;
  appVersion: string;
  timestamp: string;
  createdAt: string;
  createdBy: string;
  createdRole: string;
  scope: BackupScope;
  scopeLabel: string;
  isEncrypted: boolean;
  isSanitized: boolean; // Passwords & secrets removed/masked
  checksumSha256: string;
  counts: {
    devices: number;
    customMaps: number;
    deviceGroups: number;
    localUsers: number;
    localGroups: number;
    accessPolicies: number;
    templates: number;
    hasActiveDirectory: boolean;
    hasCustomHierarchy: boolean;
  };
  environment?: {
    hostname?: string;
    userAgent?: string;
  };
}

export interface NetworkBackupPackage {
  format: 'nettopology-backup-v1';
  metadata: BackupMetadata;
  // Payload items (optionally omitted depending on scope)
  devices?: Device[];
  topologyData?: TopologyData;
  customMaps?: any[];
  nodePositions?: Record<string, { x: number; y: number }>;
  viewport?: { zoom: number; pan: { x: number; y: number } };
  physicalHierarchy?: {
    buildings: string[];
    floors: Record<string, string[]>;
    units: Record<string, string[]>;
    racks: Record<string, string[]>;
  };
  deviceGroups?: DeviceGroup[];
  localUsers?: LocalUser[];
  localGroups?: LocalGroup[];
  activeDirectory?: ActiveDirectoryConfig;
  accessPolicies?: AccessPolicy[];
  templates?: ConfigTemplate[];
  // If encrypted, the encrypted payload blob
  encryptedData?: string;
  salt?: string;
  iv?: string;
}

export interface BackupAuditEntry {
  id: string;
  timestamp: string;
  action: 'export' | 'export_blocked' | 'import_success' | 'import_failed' | 'import_blocked' | 'rollback';
  username: string;
  role: string;
  fileName?: string;
  fileSizeKb?: number;
  scope: string;
  itemCount: number;
  status: 'success' | 'warning' | 'error';
  details: string;
  checksum?: string;
}

// ==========================================
// Centralized Enterprise Audit & Activity Logs System
// ==========================================

export type AuditLogCategory = 
  | 'user_management'
  | 'rbac_policy'
  | 'device_inventory'
  | 'backup_recovery'
  | 'topology_network'
  | 'port_interface'
  | 'system_auth';

export type AuditLogSeverity = 'info' | 'notice' | 'warning' | 'critical';
export type AuditLogStatus = 'success' | 'failed' | 'denied';

export interface AuditActor {
  username: string;
  role: string;
  ipAddress?: string;
}

export interface AuditTarget {
  type: 'user' | 'group' | 'policy' | 'device' | 'backup' | 'map' | 'port' | 'template';
  id?: string;
  name: string;
  ip?: string;
  model?: string;
  vendor?: string;
  location?: string; // e.g. "ساختمان مرکزی > طبقه ۲ > اتاق IT > رک B02"
  portsCount?: number;
  metadata?: Record<string, any>;
}

export interface PortalAuditLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  category: AuditLogCategory;
  action: string;
  title: string;
  title_en: string;
  actor: AuditActor;
  target: AuditTarget;
  severity: AuditLogSeverity;
  status: AuditLogStatus;
  details: string;
  details_en: string;
  changesDiff?: {
    field: string;
    before?: any;
    after?: any;
  }[];
}

export type CommandRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type CommandChannel = 
  | 'terminal_interactive'
  | 'template_push'
  | 'port_context_menu'
  | 'batch_config'
  | 'api_script';

export interface DeviceCommandLogEntry {
  id: string;
  timestamp: string; // ISO 8601
  actor: AuditActor;
  deviceId: string;
  deviceName: string;
  deviceIp: string;
  deviceVendor: 'cisco' | 'mikrotik' | 'linux' | 'generic';
  deviceModel?: string;
  deviceLocation: string;
  channel: CommandChannel;
  command: string;
  riskLevel: CommandRiskLevel;
  status: 'success' | 'failed' | 'denied';
  outputSummary?: string;
  durationMs?: number;
  notes?: string;
}

// -------------------------------------------------------------
// MikroTik VPN Types (Phase 1: L2TP/IPsec & GRE)
// -------------------------------------------------------------

export type VPNType =
  | 'l2tp_ipsec'
  | 'gre'
  | 'wireguard'
  | 'openvpn'
  | 'sstp'
  | 'pptp'
  | 'ipsec'
  | 'ipsec_site_to_site'
  | 'eoip'
  | 'vxlan';

export type VPNMode = 'remote_access' | 'site_to_site' | 'tunnel' | 'client' | 'overlay';

export interface VPNUserConfig {
  username: string;
  password?: string;
  comment?: string;
  disabled?: boolean;
}

export interface VPNRouteConfig {
  dst: string;
  gateway?: string;
  distance?: number;
  comment?: string;
}

export interface WireGuardPeerConfig {
  public_key: string;
  allowed_address?: string;
  allowed_ips?: string;
  endpoint_address?: string;
  endpoint_port?: number;
  preshared_key?: string;
  comment?: string;
}

export interface VXLANVtepConfig {
  remote_ip: string;
  port?: number;
}

export interface RouterCertificate {
  name: string;
  common_name: string;
  ca: boolean;
  expired: boolean;
}

export interface VPNConfigPayload {
  name?: string;
  role?: 'server' | 'client';
  pool_name?: string;
  pool_ranges?: string;
  pool_start?: string;
  pool_end?: string;
  local_address?: string;
  remote_address?: string;
  connect_to?: string;
  tunnel_ip?: string;
  mtu?: number;
  port?: number;
  listen_port?: number;
  keepalive?: string;
  ipsec_secret?: string;
  secret?: string;
  profile_name?: string;
  dns_servers?: string[];
  users?: VPNUserConfig[];
  routes?: VPNRouteConfig[];
  comment?: string;
  user?: string;
  password?: string;
  // Certificate & SSL
  certificate?: string;
  require_client_certificate?: boolean;
  protocol?: 'tcp' | 'udp';
  auth?: string;
  cipher?: string;
  // WireGuard
  private_key?: string;
  public_key?: string;
  peers?: WireGuardPeerConfig[];
  // IPsec Site-to-Site
  peer_address?: string;
  preshared_key?: string;
  local_subnet?: string;
  remote_subnet?: string;
  exchange_mode?: string;
  ike_version?: string;
  auth_algorithm?: string;
  enc_algorithm?: string;
  proposal_enc_algorithms?: string[];
  proposal_auth_algorithms?: string[];
  proposal_pfs_group?: string;
  nat_traversal?: boolean;
  // EoIP & L2
  tunnel_id?: number;
  bridge?: string;
  mac_address?: string;
  // VXLAN
  vni?: number;
  vteps?: VXLANVtepConfig[];
}

export interface VPNItem {
  id: string;
  name: string;
  type: VPNType;
  mode: VPNMode;
  status: 'up' | 'standby' | 'down' | 'disabled';
  interface: string;
  profile?: string;
  ipsec_enabled?: boolean;
  active_sessions?: number;
  details?: Record<string, any>;
}

export interface VPNCapabilitiesResponse {
  platform: string;
  platform_name: string;
  firmware: string;
  routeros_major_version: number;
  phase: number;
  available_vpns: Array<{
    vpn_type: string;
    name: string;
    description: string;
    supported_modes: Array<{
      mode: string;
      label: string;
      description: string;
      default_port?: number;
      default_mtu?: number;
    }>;
    ipsec_profiles?: string[];
    supported_ciphers?: string[];
    supports_keepalive?: boolean;
    supports_ipsec_secret?: boolean;
    default_mtu?: number;
  }>;
  supported_catalog: Array<{
    type: string;
    name: string;
    description: string;
    status: 'available' | 'coming_soon' | 'disabled';
    modes: string[];
    phase: number;
    recommended_for?: string[];
    note?: string;
  }>;
}

export interface VPNValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface VPNPreviewResult {
  vpn_type: string;
  mode: string;
  commands: string[];
  script?: string;
  count: number;
}

export interface VPNAppliedStep {
  step: number;
  command: string;
  status: 'success' | 'failed';
}

export interface VPNApplyResult {
  success: boolean;
  vpn_id?: string;
  vpn_type?: string;
  mode?: string;
  applied_steps?: VPNAppliedStep[];
  verification?: {
    vpn_id: string;
    vpn_type: string;
    operational_status: string;
    server_enabled?: boolean;
    active_users_count?: number;
    active_users?: Array<{ name: string; service: string; caller_id: string }>;
    ipsec_phase2_up?: boolean;
    raw_server_output?: string;
    verified_at?: string;
  };
  message?: string;
  error?: string;
  failed_step?: {
    step_index: number;
    command: string;
    error: string;
  };
  rollback?: {
    attempted: boolean;
    success: boolean;
    steps: Array<{ action: string; success: boolean; error?: string }>;
  };
}


