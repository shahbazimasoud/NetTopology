import React, { useState, useEffect } from 'react';
import { Server, Cable, Zap, Shield, Search, Filter, Edit3, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { Device, SwitchPort } from '../types';
import { fetchDevicePorts, updateSwitchPort } from '../services/api';
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
      }
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
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

      {/* Switch Faceplate Visual */}
      <div className="spatial-glass border border-white/10 rounded-xl p-3.5 shadow-lg">
        <div className="flex items-center justify-between mb-2 text-xs">
          <div className="font-bold text-white flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse"></span>
            <span>{t('ports_faceplate_title')}</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>{t('ports_legend_up')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              <span>{t('ports_legend_down')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2 rounded bg-purple-500"></span>
              <span>{t('ports_legend_trunk')}</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400 text-xs animate-pulse font-mono">
            {t('ports_loading')}
          </div>
        ) : (
          <div className="bg-black/40 border border-white/10 rounded-xl p-3 overflow-x-auto shadow-inner">
            <div className="flex flex-wrap gap-2 justify-start min-w-[500px]">
              {ports.map((port) => {
                const isSelected = selectedPort?.port_id === port.port_id;
                const isUp = port.status === 'up';
                const isDisabled = port.admin_status === 'disabled';
                const isTrunk = port.mode === 'trunk';

                return (
                  <button
                    key={port.port_id}
                    onClick={() => {
                      setSelectedPort(port);
                      setIsEditing(false);
                    }}
                    className={`relative group p-1.5 rounded-xl border transition-all flex flex-col items-center w-12 cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/30 border-cyan-400 ring-2 ring-cyan-400/40 text-white shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                        : isDisabled
                        ? 'bg-black/40 border-amber-800/60 hover:border-amber-500 text-slate-300'
                        : isUp
                        ? 'bg-white/5 border-white/15 hover:border-cyan-400/80 text-slate-200'
                        : 'bg-black/30 border-white/5 hover:border-white/20 opacity-60 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center gap-0.5 mb-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isDisabled
                            ? 'bg-amber-400'
                            : isUp
                            ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]'
                            : 'bg-slate-600'
                        }`}
                      ></span>
                      {isTrunk && (
                        <span className="text-[7px] font-bold text-purple-300 bg-purple-900/80 px-0.5 rounded">
                          T
                        </span>
                      )}
                    </div>

                    <div className="w-7 h-5 rounded bg-black/60 border border-white/20 flex items-center justify-center text-[8px] font-mono text-slate-200 font-bold">
                      {port.port_id.replace('GigabitEthernet', 'Gi').replace('TenGigabitEthernet', 'Te').replace('1/0/', '').replace('0/', '')}
                    </div>

                    <div className="mt-1 text-[8px] font-mono text-indigo-300 font-bold">
                      V{port.vlan}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Port Detailed Card */}
      {selectedPort && (
        <div className="spatial-glass border border-white/10 rounded-xl p-4 shadow-lg space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-md">
                <Cable className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white font-mono">{selectedPort.name}</h4>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-md font-bold font-mono ${
                      selectedPort.mode === 'trunk'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">{isEn ? 'Connected Device / Host:' : 'تجهیز یا هاست متصل:'}</div>
                <div className="text-white font-bold font-mono text-xs">
                  {selectedPort.connected_device || t('ports_device_not_connected')}
                </div>
                <div className="text-slate-400 text-[10px] mt-1 font-mono">
                  {isEn ? 'Type:' : 'نوع:'} {selectedPort.connected_type || 'Host'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">{isEn ? 'Assigned VLAN:' : 'ویلن (VLAN) تخصیص یافته:'}</div>
                <div className="text-indigo-300 font-bold font-mono text-xs">
                  VLAN {selectedPort.vlan}
                </div>
                <div className="text-slate-400 text-[10px] mt-1 font-mono">
                  {isEn ? 'Allowed Trunk VLANs:' : 'ویلن‌های مجاز ترانک:'} {selectedPort.allowed_vlans || t('ports_all_vlans')}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">{isEn ? 'Admin Status:' : 'وضعیت مدیریتی پورت:'}</div>
                <div className="text-emerald-400 font-bold text-xs font-mono">
                  {selectedPort.admin_status === 'enabled' ? t('ports_admin_no_shutdown') : t('ports_admin_shutdown')}
                </div>
                <div className="text-slate-400 text-[10px] mt-1 font-mono">
                  {isEn ? 'Protocol:' : 'پروتکل:'} {selectedPort.mode === 'trunk' ? '802.1Q Encapsulation' : 'Access Native'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
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
              {filteredPorts.map((port) => (
                <tr
                  key={port.port_id}
                  onClick={() => {
                    setSelectedPort(port);
                    setIsEditing(false);
                  }}
                  className={`cursor-pointer transition ${
                    selectedPort?.port_id === port.port_id
                      ? 'bg-indigo-600/20 text-white border-l-2 border-indigo-400'
                      : 'hover:bg-white/5 text-slate-200'
                  }`}
                >
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
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono ${
                        port.mode === 'trunk'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
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
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
