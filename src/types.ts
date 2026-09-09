export type DeviceType = 'switch' | 'router' | 'access_point';

export interface Device {
  id: string;
  name: string;
  ip: string;
  type: DeviceType;
  role: string;
  model: string;
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

export interface CustomTopologyMap {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  devicePositions: Record<string, { x: number; y: number }>;
  deviceIds: string[];
  links: CustomTopologyLink[];
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
