import {
  Device,
  SwitchPort,
  CdpLldpNeighbor,
  TopologyData,
  VlanInfo,
  ConfigTemplate,
  TemplateApplyResult,
  DeviceConfigExtractRequest,
  DeviceConfigExtractResult
} from '../types';

const API_BASE = '/api';

export async function fetchHealth(): Promise<any> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchDevices(): Promise<{ devices: Device[]; total: number; online_count: number; offline_count: number }> {
  const res = await fetch(`${API_BASE}/devices`);
  if (!res.ok) throw new Error('Failed to fetch devices');
  return res.json();
}

export async function addDevice(device: Partial<Device>): Promise<{ device: Device; message: string }> {
  const res = await fetch(`${API_BASE}/devices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(device),
  });
  if (!res.ok) throw new Error('Failed to add device');
  return res.json();
}

export async function updateDevice(id: string, updates: Partial<Device>): Promise<{ device: Device; message: string }> {
  const res = await fetch(`${API_BASE}/devices/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update device');
  return res.json();
}

export async function deleteDevice(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/devices/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete device');
  return res.json();
}

export async function fetchDevicePorts(deviceId: string): Promise<{
  device: Device;
  ports: SwitchPort[];
  active_count: number;
  inactive_count: number;
  admin_disabled_count: number;
}> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/ports`);
  if (!res.ok) throw new Error('Failed to fetch ports');
  return res.json();
}

export async function updateSwitchPort(
  deviceId: string,
  portId: string,
  updates: Partial<SwitchPort>
): Promise<{ port: SwitchPort; message: string }> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/ports/${encodeURIComponent(portId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update port');
  return res.json();
}

export async function batchUpdateSwitchPorts(
  deviceId: string,
  portIds: string[],
  updates: Partial<SwitchPort>
): Promise<{ success: boolean; updatedCount: number; message: string; ports: SwitchPort[] }> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/ports/batch`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ port_ids: portIds, updates }),
  });
  if (!res.ok) throw new Error('Failed to batch update ports');
  return res.json();
}

export async function testDeviceConnection(data: {
  ip: string;
  ssh_port?: number;
  ssh_username?: string;
  ssh_password?: string;
  enable_password?: string;
}): Promise<{
  success: boolean;
  message: string;
  latency_ms?: number;
  banner?: string;
  protocol?: string;
}> {
  const res = await fetch(`${API_BASE}/devices/test-connection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Connection failed' }));
    throw new Error(err.error || 'Connection failed');
  }
  return res.json();
}

export async function writeMemory(deviceId: string): Promise<{ success: boolean; device: Device; message: string }> {
  const res = await fetch(`${API_BASE}/devices/${deviceId}/write-memory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to write memory');
  return res.json();
}

export async function fetchTopology(): Promise<TopologyData> {
  const res = await fetch(`${API_BASE}/topology`);
  if (!res.ok) throw new Error('Failed to fetch topology');
  return res.json();
}

export async function fetchCdpLldpNeighbors(protocol?: 'CDP' | 'LLDP'): Promise<{
  neighbors: CdpLldpNeighbor[];
  total: number;
  cdp_count: number;
  lldp_count: number;
}> {
  const url = protocol ? `${API_BASE}/cdp-lldp/neighbors?protocol=${protocol}` : `${API_BASE}/cdp-lldp/neighbors`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch CDP/LLDP neighbors');
  return res.json();
}

export async function runCdpLldpScan(): Promise<{
  success: boolean;
  message: string;
  neighbors: CdpLldpNeighbor[];
  links: any[];
  timestamp: string;
}> {
  const res = await fetch(`${API_BASE}/scan/cdp-lldp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to run CDP/LLDP scan');
  return res.json();
}

export async function pingAllDevices(): Promise<{ message: string; results: any[] }> {
  const res = await fetch(`${API_BASE}/ping-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to ping devices');
  return res.json();
}

export async function pingDevice(id: string): Promise<{ device: Device; ping_result: any }> {
  const res = await fetch(`${API_BASE}/ping/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to ping device');
  return res.json();
}

export async function fetchVlans(): Promise<{ vlans: VlanInfo[] }> {
  const res = await fetch(`${API_BASE}/vlans`);
  if (!res.ok) throw new Error('Failed to fetch VLANs');
  return res.json();
}

export async function resetDemoData(): Promise<any> {
  const res = await fetch(`${API_BASE}/reset-demo`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to reset demo');
  return res.json();
}

export async function fetchTemplates(): Promise<{ templates: ConfigTemplate[]; total: number }> {
  const res = await fetch(`${API_BASE}/templates`);
  if (!res.ok) throw new Error('Failed to fetch templates');
  return res.json();
}

export async function fetchTemplate(id: string): Promise<{ template: ConfigTemplate }> {
  const res = await fetch(`${API_BASE}/templates/${id}`);
  if (!res.ok) throw new Error('Failed to fetch template');
  return res.json();
}

export async function createTemplate(template: Partial<ConfigTemplate>): Promise<{ template: ConfigTemplate; message: string }> {
  const res = await fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
  if (!res.ok) throw new Error('Failed to create template');
  return res.json();
}

export async function updateTemplate(
  id: string,
  updates: Partial<ConfigTemplate>
): Promise<{ template: ConfigTemplate; message: string }> {
  const res = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update template');
  return res.json();
}

export async function deleteTemplate(id: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/templates/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete template');
  return res.json();
}

export async function applyTemplateToDevice(params: {
  device_id: string;
  template_id: string;
  resolved_variables: Record<string, string | number>;
}): Promise<TemplateApplyResult> {
  const res = await fetch(`${API_BASE}/templates/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to apply template to device');
  }
  return res.json();
}

export async function extractConfigFromDevice(
  params: DeviceConfigExtractRequest
): Promise<DeviceConfigExtractResult> {
  const res = await fetch(`${API_BASE}/templates/extract-from-device`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || 'خطا در اتصال به تجهیز و استخراج کانفیگ');
  }
  return res.json();
}

export async function sshConnect(params: {
  host: string;
  port?: number;
  username?: string;
  password?: string;
  timeout?: number;
}): Promise<{
  success: boolean;
  mode: 'real_ssh' | 'unreachable';
  banner?: string;
  cipher?: string;
  latency_ms?: number;
  error?: string;
  code?: string;
}> {
  const res = await fetch(`${API_BASE}/ssh/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

export async function sshExecute(params: {
  host: string;
  port?: number;
  username?: string;
  password?: string;
  command: string;
  timeout?: number;
}): Promise<{
  success: boolean;
  output: string;
  isReal: boolean;
  exitCode?: number;
  error?: string;
}> {
  const res = await fetch(`${API_BASE}/ssh/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}
