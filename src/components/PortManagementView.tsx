import React, { useState, useEffect } from 'react';
import { Server, Cable, Zap, Shield, ShieldCheck, Search, Filter, Edit3, Save, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import { Device, SwitchPort } from '../types';
import { fetchDevicePorts, updateSwitchPort, batchUpdateSwitchPorts } from '../services/api';
import { CiscoPortContextMenu } from './CiscoPortContextMenu';
import { CiscoCommandConfirmModal } from './CiscoCommandConfirmModal';
import { AssignVlanModal } from './AssignVlanModal';
import { NetworkPortSvg } from './NetworkPortSvg';
import { useLanguage } from '../i18n/LanguageContext';

interface PortManagementViewProps {
  devices: Device[];
}

export const PortManagementView: React.FC<PortManagementViewProps> = ({ devices }) => {
  const { t, isRtl, isEn } = useLanguage();
  const switchesAndRouters = devices.filter((d) => d.type === 'switch' || d.type === 'router');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
    switchesAndRouters[0]?.id || devices[0]?.id || ''
  );
  const [ports, setPorts] = useState<SwitchPort[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPort, setSelectedPort] = useState<SwitchPort | null>(null);

  // Multi-port selection and batch operations
  const [selectedPortIds, setSelectedPortIds] = useState<string[]>([]);
  const [isBatchApplying, setIsBatchApplying] = useState(false);
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(null);

  // Batch edit form values
  const [batchAdminStatus, setBatchAdminStatus] = useState<'no_change' | 'enabled' | 'disabled'>('no_change');
  const [batchMode, setBatchMode] = useState<'no_change' | 'access' | 'trunk'>('no_change');
  const [batchVlan, setBatchVlan] = useState<string>(''); // empty means no change
  const [batchAllowedVlans, setBatchAllowedVlans] = useState<string>('');
  const [batchPortSec, setBatchPortSec] = useState<'no_change' | 'enabled' | 'disabled'>('no_change');
  const [batchPortSecMode, setBatchPortSecMode] = useState<'sticky' | 'dynamic' | 'configured'>('sticky');
  const [batchPortSecMaxMac, setBatchPortSecMaxMac] = useState<number>(1);

  // Right-click Cisco Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    port: SwitchPort;
  } | null>(null);

  // Edit port state
  const [isEditing, setIsEditing] = useState(false);
  const [editAdminStatus, setEditAdminStatus] = useState<'enabled' | 'disabled'>('enabled');
  const [editMode, setEditMode] = useState<'trunk' | 'access'>('access');
  const [editVlan, setEditVlan] = useState(1);
  const [editAllowedVlans, setEditAllowedVlans] = useState('');
  const [editConnected, setEditConnected] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'up' | 'down' | 'trunk' | 'access'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const currentDevice = devices.find((d) => d.id === selectedDeviceId);

  useEffect(() => {
    if (selectedDeviceId) {
      loadPorts(selectedDeviceId);
    }
  }, [selectedDeviceId]);

  const loadPorts = async (devId: string) => {
    try {
      setLoading(true);
      const res = await fetchDevicePorts(devId);
      setPorts(res.ports);
      if (res.ports.length > 0) {
        setSelectedPort(res.ports[0]);
        setSelectedPortIds([res.ports[0].port_id]);
      }
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePortClick = (e: React.MouseEvent, port: SwitchPort) => {
    setBatchSuccessMessage(null);
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      setSelectedPortIds((prev) => {
        const exists = prev.includes(port.port_id);
        let updated: string[];
        if (exists) {
          updated = prev.filter((id) => id !== port.port_id);
          if (updated.length === 0) updated = [port.port_id];
        } else {
          updated = [...prev, port.port_id];
        }
        return updated;
      });
      setSelectedPort(port);
      setIsEditing(false);
    } else {
      setSelectedPort(port);
      setSelectedPortIds([port.port_id]);
      setIsEditing(false);
    }
  };

  const handleApplyBatch = async () => {
    if (!currentDevice || selectedPortIds.length <= 1) return;
    try {
      setIsBatchApplying(true);
      setBatchSuccessMessage(null);

      const updates: Partial<SwitchPort> = {};
      if (batchAdminStatus !== 'no_change') {
        updates.admin_status = batchAdminStatus;
        updates.status = batchAdminStatus === 'disabled' ? 'down' : 'up';
      }
      if (batchMode !== 'no_change') {
        updates.mode = batchMode;
      }
      if (batchVlan.trim() !== '') {
        const v = parseInt(batchVlan.trim(), 10);
        if (!isNaN(v) && v >= 1 && v <= 4094) {
          updates.vlan = v;
        }
      }
      if (batchAllowedVlans.trim() !== '') {
        updates.allowed_vlans = batchAllowedVlans.trim();
      }
      if (batchPortSec !== 'no_change') {
        updates.port_security_enabled = batchPortSec === 'enabled';
        if (batchPortSec === 'enabled') {
          updates.port_security_mode = batchPortSecMode;
          updates.port_security_max_mac = batchPortSecMaxMac;
        }
      }

      const res = await batchUpdateSwitchPorts(currentDevice.id, selectedPortIds, updates);

      const updatedPortMap = new Map(res.ports.map((p) => [p.port_id, p]));
      setPorts((prev) => prev.map((p) => updatedPortMap.get(p.port_id) || p));

      if (selectedPort && updatedPortMap.has(selectedPort.port_id)) {
        setSelectedPort(updatedPortMap.get(selectedPort.port_id)!);
      }

      currentDevice.has_unsaved_changes = true;
      setBatchSuccessMessage(
        isEn
          ? `Successfully applied batch configuration to ${res.updatedCount} ports!`
          : `تنظیمات با موفقیت روی ${res.updatedCount} پورت اعمال شد!`
      );

      setBatchAdminStatus('no_change');
      setBatchMode('no_change');
      setBatchVlan('');
      setBatchAllowedVlans('');
      setBatchPortSec('no_change');
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsBatchApplying(false);
    }
  };

  // Right-click action confirmation modal state (Yes/No with device CLI preview)
  const [confirmModalState, setConfirmModalState] = useState<{
    action: 'shutdown' | 'no_shutdown' | 'mode_trunk' | 'mode_access' | 'port_sec_disable';
    port: SwitchPort;
  } | null>(null);
  const [isExecutingConfirmAction, setIsExecutingConfirmAction] = useState(false);

  // Assign Access VLAN modal state
  const [vlanAssignModalPort, setVlanAssignModalPort] = useState<SwitchPort | null>(null);
  const [isAssigningVlan, setIsAssigningVlan] = useState(false);

  const handleExecuteContextMenuAction = async (action: string, extra?: any) => {
    if (!contextMenu || !currentDevice) return;
    const targetPort = contextMenu.port;

    // 1. Enable Port Security: Open edit mode directly for user configuration
    if (action === 'port_sec_enable') {
      startEdit(targetPort);
      setEditMode('access');
      setContextMenu(null);
      return;
    }

    // 2. Assign Access VLAN: Open dedicated modal with device VLAN list & custom input
    if (action === 'open_assign_vlan' || action === 'change_vlan') {
      setContextMenu(null);
      setVlanAssignModalPort(targetPort);
      return;
    }

    // 3. For other actions: Open confirmation dialog with CLI preview
    setContextMenu(null);
    setConfirmModalState({
      action: action as any,
      port: targetPort,
    });
  };

  const handleConfirmExecuteCommand = async () => {
    if (!confirmModalState || !currentDevice) return;
    const { action, port: targetPort } = confirmModalState;
    let updates: Partial<SwitchPort> = {};

    switch (action) {
      case 'shutdown':
        updates = { admin_status: 'disabled', status: 'down' };
        break;
      case 'no_shutdown':
        updates = { admin_status: 'enabled', status: 'up' };
        break;
      case 'mode_trunk':
        updates = { mode: 'trunk' };
        break;
      case 'mode_access':
        updates = { mode: 'access' };
        break;
      case 'port_sec_disable':
        updates = { port_security_enabled: false };
        break;
      default:
        break;
    }

    try {
      setIsExecutingConfirmAction(true);
      await updateSwitchPort(currentDevice.id, targetPort.port_id, updates);
      setPorts((prev) =>
        prev.map((p) => (p.port_id === targetPort.port_id ? { ...p, ...updates } : p))
      );
      if (selectedPort?.port_id === targetPort.port_id) {
        setSelectedPort((prev) => (prev ? { ...prev, ...updates } : null));
      }
      setConfirmModalState(null);
    } catch (err: any) {
      console.error('Failed to update port from context menu:', err);
    } finally {
      setIsExecutingConfirmAction(false);
    }
  };

  const handleConfirmAssignVlan = async (newVlan: number) => {
    if (!vlanAssignModalPort || !currentDevice) return;
    const targetPort = vlanAssignModalPort;
    const updates: Partial<SwitchPort> = {
      vlan: newVlan,
      mode: 'access',
    };

    try {
      setIsAssigningVlan(true);
      await updateSwitchPort(currentDevice.id, targetPort.port_id, updates);
      setPorts((prev) =>
        prev.map((p) => (p.port_id === targetPort.port_id ? { ...p, ...updates } : p))
      );
      if (selectedPort?.port_id === targetPort.port_id) {
        setSelectedPort((prev) => (prev ? { ...prev, ...updates } : null));
      }
      setVlanAssignModalPort(null);
    } catch (err: any) {
      console.error('Failed to assign VLAN:', err);
    } finally {
      setIsAssigningVlan(false);
    }
  };

  const startEdit = (port: SwitchPort) => {
    setSelectedPort(port);
    setEditAdminStatus(port.admin_status);
    setEditMode(port.mode);
    setEditVlan(port.vlan);
    setEditAllowedVlans(port.allowed_vlans);
    setEditConnected(port.connected_device);
    setEditDesc(port.description || '');
    setIsEditing(true);
  };

  const handleSavePort = async () => {
    if (!currentDevice || !selectedPort) return;
    try {
      setIsSaving(true);
      const res = await updateSwitchPort(currentDevice.id, selectedPort.port_id, {
        admin_status: editAdminStatus,
        status: editAdminStatus === 'disabled' ? 'down' : 'up',
        mode: editMode,
        vlan: editVlan,
        allowed_vlans: editAllowedVlans,
        connected_device: editConnected,
        description: editDesc,
      });

      setPorts((prev) =>
        prev.map((p) => (p.port_id === selectedPort.port_id ? res.port : p))
      );
      setSelectedPort(res.port);
      setIsEditing(false);
    } catch (err: any) {
      alert(t('ports_save_error', { error: err.message }));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPorts = ports.filter((p) => {
    if (filterMode === 'up' && p.status !== 'up') return false;
    if (filterMode === 'down' && p.status !== 'down') return false;
    if (filterMode === 'trunk' && p.mode !== 'trunk') return false;
    if (filterMode === 'access' && p.mode !== 'access') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.port_id.toLowerCase().includes(q) ||
        p.connected_device.toLowerCase().includes(q) ||
        String(p.vlan).includes(q) ||
        p.mode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCount = ports.filter((p) => p.status === 'up').length;
  const inactiveCount = ports.filter((p) => p.status === 'down').length;
  const trunkCount = ports.filter((p) => p.mode === 'trunk').length;

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`p-4 space-y-4 max-w-7xl mx-auto ${isRtl ? 'text-right' : 'text-left'}`}
    >
      {/* Header & Switch Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 spatial-glass p-3.5 rounded-xl border border-white/10 shadow-lg backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Cable className="w-5 h-5 text-indigo-400" />
              <span>{t('ports_title')}</span>
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold">
              {t('ports_tag')}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('ports_subtitle')}
          </p>
        </div>

        {/* Switch Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-300 font-medium">{t('ports_select_device')}</span>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-black/30 border border-white/15 text-indigo-300 font-mono text-xs focus:outline-none focus:border-indigo-400 font-semibold shadow-inner"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id} className="bg-slate-900 text-white">
                {d.name} ({d.ip}) - {d.role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Device Banner */}
      {currentDevice && (
        <div className="p-3.5 rounded-xl spatial-glass border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-md">
              <Server className="w-5 h-5 text-cyan-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white font-mono text-sm">{currentDevice.name}</span>
                <span className="text-cyan-300 font-mono font-bold">({currentDevice.ip})</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${
                    currentDevice.is_online
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {currentDevice.is_online ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {t('topology_details_model')}: {currentDevice.model} • {t('topology_details_building')}: {currentDevice.building} • {t('topology_details_floor')}: {currentDevice.floor} •{' '}
                {t('topology_details_unit')}: {currentDevice.unit} {currentDevice.rack ? `• ${t('topology_details_rack')}: ${currentDevice.rack}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 text-xs">
            <div className="text-center">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{t('ports_active_ports')}</div>
              <div className="text-emerald-400 font-bold font-mono text-base">{activeCount}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{t('ports_inactive_ports')}</div>
              <div className="text-slate-400 font-bold font-mono text-base">{inactiveCount}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{t('ports_trunk_ports')}</div>
              <div className="text-purple-400 font-bold font-mono text-base">{trunkCount}</div>
            </div>
          </div>
        </div>
      )}

      {/* Switch Faceplate (Visual Rack Interface) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 shadow-inner">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-200 font-mono">
              {isEn
                ? `Switch Faceplate: ${currentDevice?.model || 'Switch'} (${ports.length} Ports)`
                : `طرح فیزیکی پورت‌های روی بدنه سوئیچ: ${currentDevice?.model || 'سوئیچ'} (${ports.length} پورت)`}
            </span>
          </div>
          {/* Legend & Multi-select Hint */}
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{isEn ? 'Up' : 'فعال (Up)'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-600"></span>
              <span>{isEn ? 'Down' : 'غیرفعال (Down)'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>{isEn ? 'Disabled' : 'ادمین بسته (Disabled)'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2 rounded bg-purple-500"></span>
              <span>{isEn ? 'Trunk' : 'ترانک (Trunk)'}</span>
            </div>
            <div className="text-[10px] text-cyan-300 font-mono bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-500/30">
              {isEn ? '💡 Hold Ctrl + Click for multi-port select' : '💡 برای انتخاب چندتایی کلید Ctrl را نگه داشته و کلیک کنید'}
            </div>
          </div>
        </div>

        {/* Visual RJ45 Ports Matrix (2-row switch design) */}
        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs animate-pulse font-mono">
            {isEn ? 'Loading port statuses from backend...' : 'در حال بارگذاری وضعیت پورت‌ها از بک‌اند پایتون...'}
          </div>
        ) : ports.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs font-mono">
            {isEn ? 'No active ports recorded.' : 'پورت فعالی ثبت نشده است.'}
          </div>
        ) : (
          <div className="switch-faceplate-chassis rounded-xl p-3 border border-slate-800 shadow-inner">
            <div className="switch-faceplate-grid rounded-lg p-2.5 overflow-x-auto border border-slate-850">
              <div className="flex flex-wrap gap-2 justify-start min-w-[500px]">
                {ports.map((port) => (
                  <NetworkPortSvg
                    key={port.port_id}
                    port={port}
                    isSelected={selectedPortIds.includes(port.port_id)}
                    onClick={(e) => handlePortClick(e, port)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        port,
                      });
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Port Batch Operations Card */}
      {selectedPortIds.length > 1 && (
        <div className="port-sub-card bg-indigo-950/60 border-2 border-indigo-500/60 rounded-xl p-4 shadow-xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-indigo-500/30">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/30 text-indigo-200 border border-indigo-500/50 shadow-sm">
                <Layers className="w-5 h-5 text-indigo-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white font-mono">
                    {isEn
                      ? `Batch Configuration (${selectedPortIds.length} Ports Selected)`
                      : `پیکربندی گروهی پورت‌ها (${selectedPortIds.length} پورت انتخاب شده)`}
                  </h4>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold font-mono bg-indigo-600 text-white shadow-xs">
                    MULTI-PORT ACTIVE
                  </span>
                </div>
                <p className="text-[11px] text-indigo-200/90 font-mono mt-0.5 max-w-2xl truncate">
                  {isEn ? 'Selected Ports' : 'پورت‌های انتخاب شده'}: {selectedPortIds.join(', ')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedPortIds(ports.map((p) => p.port_id))}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-400/30 text-xs font-medium transition cursor-pointer"
              >
                {isEn ? 'Select All Ports' : 'انتخاب همه پورت‌ها'}
              </button>
              <button
                type="button"
                onClick={() => setSelectedPortIds(selectedPort ? [selectedPort.port_id] : [])}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 border border-white/10 text-xs transition cursor-pointer"
              >
                {isEn ? 'Deselect (Single Mode)' : 'لغو انتخاب گروهی'}
              </button>
            </div>
          </div>

          {batchSuccessMessage && (
            <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{batchSuccessMessage}</span>
            </div>
          )}

          {/* Batch Settings Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Admin Status */}
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
              <label className="text-slate-300 font-semibold block text-[11px]">
                {isEn ? 'Admin Status:' : 'وضعیت مدیریتی:'}
              </label>
              <select
                value={batchAdminStatus}
                onChange={(e: any) => setBatchAdminStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/20 text-white text-xs font-mono focus:border-indigo-400"
              >
                <option value="no_change" className="bg-slate-900 text-slate-300">{isEn ? '-- No Change --' : '-- بدون تغییر --'}</option>
                <option value="enabled" className="bg-slate-900 text-emerald-400">{isEn ? 'Enable (no shutdown)' : 'فعال (no shutdown)'}</option>
                <option value="disabled" className="bg-slate-900 text-rose-400">{isEn ? 'Disable (shutdown)' : 'غیرفعال (shutdown)'}</option>
              </select>
            </div>

            {/* Mode */}
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
              <label className="text-slate-300 font-semibold block text-[11px]">
                {isEn ? 'Switchport Mode:' : 'مود سوئیچ‌پورت:'}
              </label>
              <select
                value={batchMode}
                onChange={(e: any) => setBatchMode(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/20 text-white text-xs font-mono focus:border-indigo-400"
              >
                <option value="no_change" className="bg-slate-900 text-slate-300">{isEn ? '-- No Change --' : '-- بدون تغییر --'}</option>
                <option value="access" className="bg-slate-900 text-indigo-300">{isEn ? 'Access' : 'Access (اکسس)'}</option>
                <option value="trunk" className="bg-slate-900 text-purple-300">{isEn ? 'Trunk' : 'Trunk (ترانک)'}</option>
              </select>
            </div>

            {/* VLAN */}
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
              <label className="text-slate-300 font-semibold block text-[11px]">
                {isEn ? 'Assign VLAN (1-4094):' : 'تخصیص ویلن (VLAN):'}
              </label>
              <input
                type="number"
                min={1}
                max={4094}
                value={batchVlan}
                onChange={(e) => setBatchVlan(e.target.value)}
                placeholder={isEn ? 'Empty = No Change' : 'خالی = بدون تغییر'}
                className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/20 text-white text-xs font-mono focus:border-indigo-400 placeholder:text-slate-500"
              />
            </div>

            {/* Allowed VLANs (Trunk) */}
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1.5">
              <label className="text-slate-300 font-semibold block text-[11px]">
                {isEn ? 'Allowed VLANs (Trunk):' : 'ویلن‌های مجاز (ترانک):'}
              </label>
              <input
                type="text"
                value={batchAllowedVlans}
                onChange={(e) => setBatchAllowedVlans(e.target.value)}
                placeholder="1-4094 or 10,20"
                className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/20 text-white text-xs font-mono focus:border-indigo-400 placeholder:text-slate-500"
                dir="ltr"
              />
            </div>

            {/* Port Security */}
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 space-y-1.5 lg:col-span-2">
              <label className="text-slate-300 font-semibold block text-[11px]">
                {isEn ? 'Port Security:' : 'امنیت پورت (Port Security):'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={batchPortSec}
                  onChange={(e: any) => setBatchPortSec(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/20 text-white text-xs font-mono focus:border-indigo-400"
                >
                  <option value="no_change" className="bg-slate-900 text-slate-300">{isEn ? '-- No Change --' : '-- بدون تغییر --'}</option>
                  <option value="enabled" className="bg-slate-900 text-emerald-400">{isEn ? 'Enable Security' : 'فعال‌سازی امنیت پورت'}</option>
                  <option value="disabled" className="bg-slate-900 text-rose-400">{isEn ? 'Disable Security' : 'غیرفعال‌سازی امنیت'}</option>
                </select>
                {batchPortSec === 'enabled' && (
                  <select
                    value={batchPortSecMode}
                    onChange={(e: any) => setBatchPortSecMode(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/50 border border-white/20 text-white text-xs font-mono focus:border-indigo-400"
                  >
                    <option value="sticky" className="bg-slate-900 text-white">Sticky (MAC خودکار)</option>
                    <option value="dynamic" className="bg-slate-900 text-white">Dynamic</option>
                    <option value="configured" className="bg-slate-900 text-white">Configured</option>
                  </select>
                )}
              </div>
            </div>

            {/* Batch Action Submit Button */}
            <div className="p-2.5 rounded-lg bg-white/5 border border-white/10 flex items-end lg:col-span-2">
              <button
                type="button"
                onClick={handleApplyBatch}
                disabled={isBatchApplying}
                className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-lg transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isBatchApplying ? (
                  <span>{isEn ? 'Applying Batch...' : 'در حال اعمال تنظیمات روی پورت‌ها...'}</span>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>
                      {isEn
                        ? `Apply Batch to ${selectedPortIds.length} Ports`
                        : `اعمال تنظیمات روی ${selectedPortIds.length} پورت انتخابی`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Port Detailed Card */}
      {selectedPort && (
        <div className="port-sub-card bg-white/5 border border-white/10 rounded-xl p-3.5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-md">
                <Cable className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white font-mono">{selectedPort.name}</h4>
                  <span
                    data-badge={selectedPort.mode === 'trunk' ? 'port-mode-trunk' : 'port-mode-access'}
                    className={`text-[9px] px-2 py-0.5 rounded-md font-bold font-mono text-white shadow-xs ${
                      selectedPort.mode === 'trunk'
                        ? 'port-mode-badge-trunk bg-purple-600 border border-purple-500'
                        : 'port-mode-badge-access bg-indigo-600 border border-indigo-500'
                    }`}
                  >
                    {selectedPort.mode === 'trunk' ? (isEn ? 'TRUNK' : 'TRUNK (ترانک)') : (isEn ? 'ACCESS' : 'ACCESS (اکسس)')}
                  </span>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-md font-medium font-mono ${
                      selectedPort.status === 'up'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-white/5 text-slate-400 border border-white/10'
                    }`}
                  >
                    {selectedPort.status === 'up'
                      ? (isEn ? 'Connected (Up)' : 'فعال (Connected)')
                      : (isEn ? 'Disconnected (Down)' : 'غیرفعال (Disconnected)')}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  {isEn ? 'Speed' : 'سرعت'}: {selectedPort.speed} • {isEn ? 'Duplex' : 'داپلکس'}: {selectedPort.duplex}
                </p>
              </div>
            </div>

            {!isEditing ? (
              <button
                onClick={() => startEdit(selectedPort)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isEn ? 'Edit Port Settings' : 'ویرایش تنظیمات پورت'}</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs transition active:scale-95 cursor-pointer"
                >
                  {t('ports_btn_cancel')}
                </button>
                <button
                  onClick={handleSavePort}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-medium shadow-[0_0_15px_rgba(99,102,241,0.35)] transition disabled:opacity-50 border border-white/10 active:scale-95 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? t('ports_saving') : t('ports_apply_changes')}</span>
                </button>
              </div>
            )}
          </div>

          {/* View Mode */}
          {!isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <div className="port-sub-card p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">{isEn ? 'Connected Device / Host:' : 'تجهیز یا هاست متصل:'}</div>
                <div className="text-white font-bold font-mono text-xs truncate" title={selectedPort.connected_device}>
                  {selectedPort.connected_device || t('ports_device_not_connected')}
                </div>
                <div className="text-slate-400 text-[10px] mt-1 font-mono">
                  {isEn ? 'Type:' : 'نوع:'} {selectedPort.connected_type || 'Host'}
                </div>
              </div>

              <div className="port-sub-card p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">{isEn ? 'Assigned VLAN:' : 'ویلن (VLAN) تخصیص یافته:'}</div>
                <div className="text-indigo-300 font-bold font-mono text-xs">
                  VLAN {selectedPort.vlan}
                </div>
                <div className="text-slate-400 text-[10px] mt-1 font-mono truncate" title={selectedPort.allowed_vlans}>
                  {isEn ? 'Allowed Trunk VLANs:' : 'ویلن‌های مجاز ترانک:'} {selectedPort.allowed_vlans || t('ports_all_vlans')}
                </div>
              </div>

              <div className="port-sub-card p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">{isEn ? 'Admin Status:' : 'وضعیت مدیریتی پورت:'}</div>
                <div className="text-emerald-400 font-bold text-xs font-mono">
                  {selectedPort.admin_status === 'enabled' ? t('ports_admin_no_shutdown') : t('ports_admin_shutdown')}
                </div>
                <div className="text-slate-400 text-[10px] mt-1 font-mono">
                  {isEn ? 'Protocol:' : 'پروتکل:'} {selectedPort.mode === 'trunk' ? '802.1Q Encapsulation' : 'Access Native'}
                </div>
              </div>

              {/* Cisco Port Security Status */}
              <div
                className={`port-sub-card p-3 rounded-xl border transition ${
                  selectedPort.port_security_enabled
                    ? 'bg-emerald-950/30 border-emerald-500/40 shadow-sm'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{isEn ? 'Port Security:' : 'پورت سکیوریتی:'}</span>
                    <span className="layer2-security-badge text-[9px] font-mono px-1.5 py-0.2 rounded font-bold" data-badge="layer2-security">
                      Layer 2 Security
                    </span>
                  </div>
                  {selectedPort.port_security_enabled ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`font-bold font-mono text-xs ${
                      selectedPort.port_security_enabled ? 'text-emerald-300' : 'text-slate-400'
                    }`}
                  >
                    {selectedPort.port_security_enabled ? (isEn ? 'Secure' : 'فعال (Secure)') : (isEn ? 'Disabled' : 'غیرفعال (Disabled)')}
                  </span>
                </div>
                {selectedPort.port_security_enabled ? (
                  <div className="text-[10px] text-emerald-300 mt-1 font-mono space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span>
                        {isEn ? 'Mode' : 'مود'}: {selectedPort.port_security_mode === 'sticky' ? (isEn ? 'Sticky' : 'استیکی') : selectedPort.port_security_mode === 'configured' ? (isEn ? 'Configured' : 'کانفیگور') : (isEn ? 'Dynamic' : 'داینامیک')}
                      </span>
                      <span className="font-bold bg-emerald-500/20 text-emerald-300 px-1 rounded text-[9px] border border-emerald-500/30">
                        Max: {selectedPort.port_security_max_mac || 1}
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400 truncate" title={selectedPort.port_security_configured_mac || selectedPort.port_security_learned_macs?.join(', ')}>
                      MAC: {selectedPort.port_security_mode === 'configured'
                        ? (selectedPort.port_security_configured_mac || (isEn ? 'Static' : 'دستی'))
                        : (selectedPort.port_security_learned_macs?.[0] || (isEn ? 'Sticky learned' : 'Sticky کشف‌شده'))}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    {isEn ? 'Violation: Default' : 'بدون محدودیت مک'}
                  </div>
                )}
              </div>

              <div className="port-sub-card p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">{isEn ? 'PoE Status:' : 'توان برق (PoE Status):'}</div>
                <div className="flex items-center gap-1.5 text-white font-bold font-mono text-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{selectedPort.poe_power ? `${selectedPort.poe_power} W` : t('ports_poe_disabled')}</span>
                </div>
                <div className="text-slate-400 text-[10px] mt-1 font-mono">
                  {isEn ? 'State:' : 'وضعیت:'} {selectedPort.poe_status || 'off'}
                </div>
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 text-[11px] font-medium">{isEn ? 'Port Mode:' : 'حالت پورت (Port Mode):'}</label>
                <select
                  value={editMode}
                  onChange={(e) => setEditMode(e.target.value as 'trunk' | 'access')}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/30 border border-white/15 text-slate-100 text-xs font-mono focus:border-indigo-400 focus:outline-none"
                >
                  <option value="access" className="bg-slate-900 text-white">{isEn ? 'Access (Client / Host / PC)' : 'Access (اکسس - کلاینت / هاست / پی‌سی)'}</option>
                  <option value="trunk" className="bg-slate-900 text-white">{isEn ? 'Trunk (Switch-to-Switch / Router)' : 'Trunk (ترانک - ارتباط سوئیچ به سوئیچ / روتر)'}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 text-[11px] font-medium">{isEn ? 'VLAN ID:' : 'شماره ویلن (VLAN ID):'}</label>
                <input
                  type="number"
                  value={editVlan}
                  onChange={(e) => setEditVlan(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/30 border border-white/15 text-slate-100 text-xs font-mono text-left focus:border-indigo-400 focus:outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 text-[11px] font-medium">{isEn ? 'Allowed Trunk VLANs:' : 'ویلن‌های مجاز (Allowed VLANs):'}</label>
                <input
                  type="text"
                  value={editAllowedVlans}
                  onChange={(e) => setEditAllowedVlans(e.target.value)}
                  placeholder={isEn ? 'e.g. 1,10,20,30,50' : 'مثال: 1,10,20,30,50'}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/30 border border-white/15 text-slate-100 text-xs font-mono text-left focus:border-indigo-400 focus:outline-none"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 text-[11px] font-medium">{isEn ? 'Connected Device / Host:' : 'تجهیز یا هاست متصل:'}</label>
                <input
                  type="text"
                  value={editConnected}
                  onChange={(e) => setEditConnected(e.target.value)}
                  placeholder={isEn ? 'e.g. AP-WIFI-02 or Core Uplink' : 'مثال: AP-WIFI-02 یا Core Uplink'}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/30 border border-white/15 text-slate-100 text-xs focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 text-[11px] font-medium">{isEn ? 'Administrative Status:' : 'وضعیت مدیریتی پورت:'}</label>
                <select
                  value={editAdminStatus}
                  onChange={(e) => setEditAdminStatus(e.target.value as 'enabled' | 'disabled')}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/30 border border-white/15 text-slate-100 text-xs font-mono focus:border-indigo-400 focus:outline-none"
                >
                  <option value="enabled" className="bg-slate-900 text-white">{t('ports_admin_no_shutdown')}</option>
                  <option value="disabled" className="bg-slate-900 text-white">{t('ports_admin_shutdown')}</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 text-[11px] font-medium">{isEn ? 'Description:' : 'توضیحات (Description):'}</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder={isEn ? 'Description for this port' : 'توضیح مربوط به این پورت'}
                  className="w-full px-3 py-1.5 rounded-xl bg-black/30 border border-white/15 text-slate-100 text-xs focus:border-indigo-400 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ports Table */}
      <div className="spatial-glass border border-white/10 rounded-xl overflow-hidden shadow-lg">
        <div className="p-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-white font-mono">{t('ports_table_title', { count: filteredPorts.length })}</h4>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <input
              type="text"
              placeholder={t('ports_search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-black/30 border border-white/15 text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-400 w-44 shadow-inner"
            />

            <div className="flex items-center bg-black/20 rounded-xl p-1 border border-white/10">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                  filterMode === 'all' ? 'bg-indigo-600/40 text-white font-bold border border-indigo-500/40 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('ports_filter_all')}
              </button>
              <button
                onClick={() => setFilterMode('up')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                  filterMode === 'up' ? 'bg-indigo-600/40 text-white font-bold border border-indigo-500/40 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('ports_filter_up')}
              </button>
              <button
                onClick={() => setFilterMode('down')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                  filterMode === 'down' ? 'bg-indigo-600/40 text-white font-bold border border-indigo-500/40 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('ports_filter_down')}
              </button>
              <button
                onClick={() => setFilterMode('trunk')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                  filterMode === 'trunk' ? 'bg-purple-600/40 text-white font-bold border border-purple-500/40 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('ports_filter_trunk')}
              </button>
              <button
                onClick={() => setFilterMode('access')}
                className={`px-2.5 py-1 rounded-lg text-xs transition cursor-pointer ${
                  filterMode === 'access' ? 'bg-indigo-600/40 text-white font-bold border border-indigo-500/40 shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                {t('ports_filter_access')}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs`}>
            <thead>
              <tr className="bg-white/5 text-slate-300 border-b border-white/10 text-[11px] font-bold uppercase tracking-wider">
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredPorts.length > 0 && filteredPorts.every((p) => selectedPortIds.includes(p.port_id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPortIds(filteredPorts.map((p) => p.port_id));
                      } else {
                        setSelectedPortIds(selectedPort ? [selectedPort.port_id] : []);
                      }
                    }}
                    className="rounded text-indigo-600 bg-white/10 border-white/20 cursor-pointer"
                    title={isEn ? 'Select / Deselect all filtered ports' : 'انتخاب یا لغو انتخاب تمام پورت‌های فیلتر شده'}
                  />
                </th>
                <th className="p-3.5">{t('ports_col_id')}</th>
                <th className="p-3.5">{t('ports_col_status')}</th>
                <th className="p-3.5">{t('ports_col_mode')}</th>
                <th className="p-3.5">{t('ports_col_vlan')}</th>
                <th className="p-3.5">{t('ports_col_connected')}</th>
                <th className="p-3.5">{t('ports_col_speed')}</th>
                <th className="p-3.5">{t('ports_col_poe')}</th>
                <th className="p-3.5 text-center">{t('ports_col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 font-mono">
              {filteredPorts.map((port) => {
                const isSelected = selectedPortIds.includes(port.port_id);
                return (
                  <tr
                    key={port.port_id}
                    onClick={(e) => handlePortClick(e, port)}
                    className={`cursor-pointer transition ${
                      isSelected
                        ? 'bg-indigo-600/20 text-white border-l-2 border-indigo-400'
                        : 'hover:bg-white/5 text-slate-200'
                    }`}
                  >
                    <td className="p-3.5 w-10 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          handlePortClick(
                            { ctrlKey: true, metaKey: false, shiftKey: false } as any,
                            port
                          );
                        }}
                        className="rounded text-indigo-600 bg-white/10 border-white/20 cursor-pointer"
                      />
                    </td>
                    <td className="p-3.5 font-bold text-white">{port.port_id}</td>
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                        port.admin_status === 'disabled'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : port.status === 'up'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/5 text-slate-400 border border-white/10'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          port.admin_status === 'disabled'
                            ? 'bg-amber-400'
                            : port.status === 'up'
                            ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                            : 'bg-slate-500'
                        }`}
                      ></span>
                      {port.admin_status === 'disabled' ? 'Admin Down' : port.status === 'up' ? 'Up' : 'Down'}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      data-badge={port.mode === 'trunk' ? 'port-mode-trunk' : 'port-mode-access'}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono text-white shadow-xs ${
                        port.mode === 'trunk'
                          ? 'port-mode-badge-trunk bg-purple-600 border border-purple-500'
                          : 'port-mode-badge-access bg-indigo-600 border border-indigo-500'
                      }`}
                    >
                      {port.mode.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold text-indigo-300">VLAN {port.vlan}</td>
                  <td className="p-3.5 text-slate-300 font-sans text-xs">
                    {port.connected_device || '-'}
                  </td>
                  <td className="p-3.5 text-slate-300">{port.speed}</td>
                  <td className="p-3.5 text-slate-300">{port.poe_power ? `${port.poe_power}W` : 'Off'}</td>
                  <td className="p-3.5 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(port);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 hover:text-cyan-300 text-slate-200 text-xs font-sans transition border border-white/10 cursor-pointer"
                    >
                      {t('ports_btn_edit')}
                    </button>
                  </td>
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cisco Right-Click Port Actions Context Menu */}
      {contextMenu && currentDevice && (
        <CiscoPortContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          port={contextMenu.port}
          deviceName={currentDevice.name}
          onClose={() => setContextMenu(null)}
          onExecuteAction={handleExecuteContextMenuAction}
        />
      )}

      {/* Cisco CLI Command Confirmation Modal (Yes/No with Switch/Router CLI syntax) */}
      {confirmModalState && currentDevice && (
        <CiscoCommandConfirmModal
          isOpen={!!confirmModalState}
          onClose={() => setConfirmModalState(null)}
          onConfirm={handleConfirmExecuteCommand}
          action={confirmModalState.action}
          port={confirmModalState.port}
          device={currentDevice}
          isLoading={isExecutingConfirmAction}
        />
      )}

      {/* Assign Access VLAN Modal (With device VLANs list at top and custom ID input) */}
      {vlanAssignModalPort && currentDevice && (
        <AssignVlanModal
          isOpen={!!vlanAssignModalPort}
          onClose={() => setVlanAssignModalPort(null)}
          onAssign={handleConfirmAssignVlan}
          port={vlanAssignModalPort}
          device={currentDevice}
          isLoading={isAssigningVlan}
        />
      )}
    </div>
  );
};
