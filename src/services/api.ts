import { Device, SwitchPort, CdpLldpNeighbor, TopologyData, VlanInfo } from '../types';

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
