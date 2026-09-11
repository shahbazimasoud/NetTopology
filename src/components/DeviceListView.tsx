import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Plus,
  Server,
  Router as RouterIcon,
  Wifi,
  MapPin,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  Cable,
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle,
  Terminal,
  AlertTriangle,
  Save,
  FileCode2,
  MoreVertical,
  Edit3
} from 'lucide-react';
import { Device, DeviceType } from '../types';
import { useLanguage } from '../i18n';
import { updateDevice } from '../services/api';
import { EditDeviceModal } from './EditDeviceModal';

interface DeviceListViewProps {
  devices: Device[];
  onOpenAddModal: () => void;
  onPingDevice: (id: string) => Promise<void>;
  onDeleteDevice: (id: string) => Promise<void>;
  onInspectPorts: (device: Device) => void;
  onConnectTerminal?: (device: Device) => void;
  onApplyTemplate?: (device: Device) => void;
  onWriteMemory?: (deviceId: string) => Promise<void>;
  onRefreshAll: () => void;
  isRefreshing: boolean;
  onEditDevice?: (device: Device) => void;
}

export const DeviceListView: React.FC<DeviceListViewProps> = ({
  devices,
  onOpenAddModal,
  onPingDevice,
  onDeleteDevice,
  onInspectPorts,
  onConnectTerminal,
  onApplyTemplate,
  onWriteMemory,
  onRefreshAll,
  isRefreshing,
  onEditDevice,
}) => {
  const { t, isRtl, isEn } = useLanguage();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | DeviceType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'unsaved'>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [writingId, setWritingId] = useState<string | null>(null);
  const [internalEditingDevice, setInternalEditingDevice] = useState<Device | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{
    id: string;
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
    device: Device;
  } | null>(null);

  // Close 3-dots action menu on outside scroll or window resize
  useEffect(() => {
    if (!menuAnchor) return;
    const handleClose = () => setMenuAnchor(null);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    return () => {
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, [menuAnchor]);

  const handleToggleActionMenu = (e: React.MouseEvent<HTMLButtonElement>, dev: Device) => {
    e.stopPropagation();
    if (menuAnchor?.id === dev.id) {
      setMenuAnchor(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuEstimatedHeight = 330;
    const menuWidth = 256;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < menuEstimatedHeight && rect.top > menuEstimatedHeight;

    const pos: {
      id: string;
      top?: number;
      bottom?: number;
      left?: number;
      right?: number;
      device: Device;
    } = {
      id: dev.id,
      device: dev,
    };

    if (openUpwards) {
      pos.bottom = window.innerHeight - rect.top + 6;
    } else {
      pos.top = rect.bottom + 6;
    }

    if (isRtl) {
      // In RTL, align left side of dropdown with left side of button, bounded
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - menuWidth - 12));
      pos.left = left;
    } else {
      // In LTR, align right side of dropdown with right side of button, bounded
      const right = Math.max(12, Math.min(window.innerWidth - rect.right, window.innerWidth - menuWidth - 12));
      pos.right = right;
    }

    setMenuAnchor(pos);
  };

  const buildings = Array.from(new Set(devices.map((d) => d.building).filter(Boolean)));
  const unsavedCount = devices.filter((d) => d.has_unsaved_changes).length;

  const filteredDevices = devices.filter((d) => {
    if (typeFilter !== 'all' && d.type !== typeFilter) return false;
    if (statusFilter === 'online' && !d.is_online) return false;
    if (statusFilter === 'offline' && d.is_online) return false;
    if (statusFilter === 'unsaved' && !d.has_unsaved_changes) return false;
    if (buildingFilter !== 'all' && d.building !== buildingFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.ip.toLowerCase().includes(q) ||
        d.model.toLowerCase().includes(q) ||
        d.building.toLowerCase().includes(q) ||
        d.floor.toLowerCase().includes(q) ||
        d.unit.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handlePing = async (id: string) => {
    try {
      setPingingId(id);
      await onPingDevice(id);
    } finally {
      setPingingId(null);
    }
  };

  const handleWriteMem = async (id: string) => {
    if (!onWriteMemory) return;
    try {
      setWritingId(id);
      await onWriteMemory(id);
    } finally {
      setWritingId(null);
    }
  };

  const onlineCount = devices.filter((d) => d.is_online).length;
  const offlineCount = devices.filter((d) => !d.is_online).length;

  return (
    <div className={`p-4 sm:p-6 space-y-4 max-w-7xl mx-auto ${isRtl ? 'text-right' : 'text-left'} text-slate-100`}>
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 spatial-glass p-5 rounded-2xl border border-white/10 shadow-xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-white glow-text-cyan">
              {t('devicelist_title')}
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
              {t('status_devices_count', { count: devices.length })}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            {t('devicelist_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium shadow-xs transition active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{t('devicelist_btn_ping_all')}</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-medium shadow-[0_0_15px_rgba(99,102,241,0.35)] transition border border-white/10 active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('devicelist_btn_add_device')}</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              {t('dashboard_card_switches')}
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-1 glow-text-cyan">
              {devices.filter((d) => d.type === 'switch').length}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Server className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              {t('dashboard_card_routers')}
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-1">
              {devices.filter((d) => d.type === 'router').length}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <RouterIcon className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              {t('dashboard_card_aps')}
            </div>
            <div className="text-2xl font-bold text-white font-mono mt-1">
              {devices.filter((d) => d.type === 'access_point').length}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Wifi className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              {isEn ? 'Reachability Status' : 'وضعیت آنلاین / آفلاین'}
            </div>
            <div className="text-2xl font-bold font-mono mt-1">
              <span className="text-emerald-400">{onlineCount}</span> /{' '}
              <span className="text-rose-400">{offlineCount}</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 text-slate-300 border border-white/10">
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 rounded-xl spatial-glass border border-white/10 shadow-lg flex flex-wrap items-center justify-between gap-3 text-xs backdrop-blur-xl">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <input
            type="text"
            placeholder={isEn ? 'Search by name, IP, model, building or unit...' : 'جستجوی نام، آدرس IP، مدل، ساختمان یا واحد...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full px-3.5 py-2 ${isRtl ? 'pr-9 pl-3.5' : 'pl-9 pr-3.5'} rounded-xl bg-slate-900/70 border border-white/15 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 shadow-inner`}
          />
          <Search className={`w-4 h-4 text-slate-400 absolute ${isRtl ? 'right-3' : 'left-3'} top-2.5`} />
        </div>

        {/* Filters */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-900/70 border border-white/15 text-slate-200 text-xs focus:outline-none focus:border-indigo-400 cursor-pointer"
          >
            <option value="all">{isEn ? 'All Equipment Types' : 'همه انواع تجهیزات'}</option>
            <option value="switch">{isEn ? 'Switches Only' : 'فقط سوئیچ‌ها (Switches)'}</option>
            <option value="router">{isEn ? 'Routers Only' : 'فقط روترها (Routers)'}</option>
            <option value="access_point">{isEn ? 'Access Points Only' : 'فقط اکسس‌پوینت‌ها (APs)'}</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-900/70 border border-white/15 text-slate-200 text-xs focus:outline-none focus:border-indigo-400 cursor-pointer"
          >
            <option value="all">{isEn ? 'All Statuses' : 'همه وضعیت‌ها'}</option>
            <option value="online">{isEn ? 'Online (Reachable)' : 'آنلاین (Online)'}</option>
            <option value="offline">{isEn ? 'Offline (Critical)' : 'آفلاین (Offline)'}</option>
            <option value="unsaved">
              {isEn ? `Unsaved Changes (${unsavedCount})` : `⚠️ تغییرات رایت‌نشده (${unsavedCount})`}
            </option>
          </select>

          {/* Building Filter */}
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900/70 border border-white/15 text-slate-200 text-xs focus:outline-none focus:border-indigo-400 cursor-pointer"
          >
            <option value="all">{isEn ? 'All Buildings' : 'همه ساختمان‌ها'}</option>
            {buildings.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Devices List Table */}
      <div className="spatial-glass border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto min-h-[380px]">
          <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs device-table`}>
            <thead>
              <tr className="bg-slate-950/80 text-slate-300 border-b-2 border-white/15 text-[11px] font-bold uppercase tracking-wider font-mono">
                <th className={`p-3.5 ${isRtl ? 'border-l' : 'border-r'} border-white/15`}>
                  {isEn ? 'Device Name & ID' : 'نام و شناسه تجهیز'}
                </th>
                <th className={`p-3.5 ${isRtl ? 'border-l' : 'border-r'} border-white/15`}>
                  {isEn ? 'Role & Model' : 'نوع و مدل'}
                </th>
                <th className={`p-3.5 ${isRtl ? 'border-l' : 'border-r'} border-white/15`}>
                  {isEn ? 'IP Address' : 'آدرس IP'}
                </th>
                <th className={`p-3.5 ${isRtl ? 'border-l' : 'border-r'} border-white/15`}>
                  {isEn ? 'Location (Rack / Room)' : 'محل استقرار (ساختمان / طبقه / واحد)'}
                </th>
                <th className={`p-3.5 ${isRtl ? 'border-l' : 'border-r'} border-white/15`}>
                  {isEn ? 'Live Status' : 'وضعیت لحظه‌ای'}
                </th>
                <th className={`p-3.5 ${isRtl ? 'border-l' : 'border-r'} border-white/15`}>
                  {isEn ? 'Discovery' : 'پروتکل همسایگی'}
                </th>
                <th className={`p-3.5 ${isRtl ? 'border-l' : 'border-r'} border-white/15 text-center`}>
                  {isEn ? 'Ports & VLAN' : 'پورت‌ها و ویلن'}
                </th>
                <th className="p-3.5 text-center">
                  {isEn ? 'Actions' : 'عملیات'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    {t('devicelist_no_devices')}
                  </td>
                </tr>
              ) : (
                filteredDevices.map((dev) => {
                  const isPinging = pingingId === dev.id;
                  return (
                    <tr key={dev.id} className="border-b border-white/10 hover:bg-white/5 transition-colors group">
                      {/* Name & Role */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-xl ${
                              dev.type === 'switch'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : dev.type === 'router'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            {dev.type === 'switch' ? (
                              <Server className="w-4 h-4" />
                            ) : dev.type === 'router' ? (
                              <RouterIcon className="w-4 h-4" />
                            ) : (
                              <Wifi className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white font-mono text-xs">{dev.name}</span>
                              {dev.has_unsaved_changes && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold" title={isEn ? 'Unsaved changes in NVRAM (Startup-Config)' : 'دارای تغییرات ذخیره نشده در Startup-Config (Running vs Startup)'}>
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                                  <span>Write Needed</span>
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">{dev.role}</div>

                            {/* If unsaved changes, quick write button */}
                            {dev.has_unsaved_changes && onWriteMemory && (
                              <div className="flex items-center gap-1 mt-1.5">
                                <button
                                  onClick={() => handleWriteMem(dev.id)}
                                  disabled={writingId === dev.id}
                                  className="px-2 py-0.5 rounded bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 border border-amber-500/50 font-bold text-[10px] transition flex items-center gap-1 shadow-sm cursor-pointer"
                                  title={isEn ? 'Execute "write memory" to commit running-config to NVRAM' : 'اجرای دستور write memory و ذخیره دائم در NVRAM'}
                                >
                                  <Save className="w-2.5 h-2.5" />
                                  <span>{writingId === dev.id ? (isEn ? 'Writing...' : 'در حال رایت...') : 'Write Memory'}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Model */}
                      <td className="p-3.5">
                        <div className="font-mono text-slate-200 text-xs">{dev.model}</div>
                        <div className="text-[10px] text-slate-400 font-mono">MAC: {dev.mac}</div>
                      </td>

                      {/* IP */}
                      <td className="p-3.5 font-mono font-bold text-indigo-400 text-xs">
                        <div>{dev.ip}</div>
                        {dev.ssh_host && dev.ssh_host !== dev.ip && (
                          <div className="text-[10px] text-slate-400 font-normal mt-0.5" title={isEn ? "SSH Target Host" : "آدرس اتصال SSH"}>
                            SSH: {dev.ssh_host}:{dev.ssh_port || 22}
                          </div>
                        )}
                      </td>

                      {/* Location (Building, Floor, Unit, Rack) */}
                      <td className="p-3.5">
                        <div className="text-slate-200 font-medium text-xs">
                          {dev.building}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-indigo-400" />
                          <span>{dev.floor} • {dev.unit}</span>
                        </div>
                        {dev.rack && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {isEn ? 'Rack:' : 'رک:'} {dev.rack}
                          </div>
                        )}
                      </td>

                      {/* Online/Offline Status */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              dev.is_online
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                dev.is_online ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-rose-500'
                              }`}
                            ></span>
                            <span>{dev.is_online ? (isEn ? 'Online' : 'آنلاین') : (isEn ? 'Offline' : 'آفلاین')}</span>
                          </span>

                          <button
                            onClick={() => handlePing(dev.id)}
                            disabled={isPinging}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition border border-white/10 cursor-pointer"
                            title={isEn ? 'Ping device now' : 'پینگ مجدد لحظه‌ای'}
                          >
                            <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin text-indigo-400' : ''}`} />
                          </button>
                        </div>
                        {dev.is_online && dev.latency_ms !== null && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {isEn ? 'Latency:' : 'تأخیر:'} {dev.latency_ms} ms
                          </div>
                        )}
                      </td>

                      {/* Protocols */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-mono">
                          {dev.cdp_enabled && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                              CDP
                            </span>
                          )}
                          {dev.lldp_enabled && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                              LLDP
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ports & VLAN Trigger */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => onInspectPorts(dev)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-indigo-600/30 hover:text-white hover:border-indigo-400/50 text-slate-300 border border-white/10 transition text-xs shadow-xs cursor-pointer"
                        >
                          <Cable className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{dev.total_ports || 24} {isEn ? 'Ports' : 'پورت'}</span>
                        </button>
                      </td>

                      {/* Actions with 3-Dots Menu */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={(e) => handleToggleActionMenu(e, dev)}
                            className={`p-1.5 sm:p-2 rounded-xl border transition active:scale-95 shadow-xs cursor-pointer ${
                              menuAnchor?.id === dev.id
                                ? 'bg-indigo-600 text-white border-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.4)]'
                                : 'bg-white/5 hover:bg-white/15 text-slate-300 border-white/10 hover:text-white'
                            }`}
                            title={isEn ? 'Actions & Options' : 'عملیات و گزینه‌ها'}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating 3-Dots Action Dropdown Menu (Portal) */}
      {menuAnchor &&
        createPortal(
          <>
            {/* Transparent backdrop */}
            <div
              className="fixed inset-0 z-50 bg-black/5"
              onClick={(e) => {
                e.stopPropagation();
                setMenuAnchor(null);
              }}
            />

            <div
              style={{
                position: 'fixed',
                top: menuAnchor.top !== undefined ? `${menuAnchor.top}px` : undefined,
                bottom: menuAnchor.bottom !== undefined ? `${menuAnchor.bottom}px` : undefined,
                left: menuAnchor.left !== undefined ? `${menuAnchor.left}px` : undefined,
                right: menuAnchor.right !== undefined ? `${menuAnchor.right}px` : undefined,
              }}
              className={`w-64 z-50 rounded-2xl shadow-2xl p-1.5 border border-white/15 backdrop-blur-2xl bg-slate-950/95 font-sans device-action-dropdown animate-fadeIn ${
                isRtl ? 'text-right' : 'text-left'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold text-white truncate max-w-[120px]">{menuAnchor.device.name}</span>
                <span className="text-indigo-400 font-semibold">{menuAnchor.device.ip}</span>
              </div>

              <div className="py-1 space-y-0.5">
                {/* Cisco CLI Connect */}
                {(menuAnchor.device.type === 'switch' || menuAnchor.device.type === 'router') && onConnectTerminal && (
                  <button
                    onClick={() => {
                      const dev = menuAnchor.device;
                      setMenuAnchor(null);
                      onConnectTerminal(dev);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-emerald-300 hover:bg-emerald-500/15 hover:text-emerald-200 transition ${
                      isRtl ? 'text-right' : 'text-left'
                    } group/item cursor-pointer`}
                  >
                    <Terminal className="w-4 h-4 text-emerald-400 group-hover/item:scale-110 transition shrink-0" />
                    <div className="flex flex-col">
                      <span>{isEn ? 'SSH Console Direct' : 'کانکت به ترمینال سیسکو'}</span>
                      <span className="text-[10px] text-emerald-500/80 font-mono">CLI Terminal</span>
                    </div>
                  </button>
                )}

                {/* Apply Template */}
                {onApplyTemplate && (
                  <button
                    onClick={() => {
                      const dev = menuAnchor.device;
                      setMenuAnchor(null);
                      onApplyTemplate(dev);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-cyan-300 hover:bg-cyan-500/15 hover:text-cyan-200 transition ${
                      isRtl ? 'text-right' : 'text-left'
                    } group/item cursor-pointer`}
                  >
                    <FileCode2 className="w-4 h-4 text-cyan-400 group-hover/item:scale-110 transition shrink-0" />
                    <div className="flex flex-col">
                      <span>{isEn ? 'Apply Config Template' : 'اعمال تمپلیت کانفیگ'}</span>
                      <span className="text-[10px] text-cyan-400/70">{isEn ? 'Variables & Deploy' : 'تکمیل متغیرها و اجرا'}</span>
                    </div>
                  </button>
                )}

                {/* Edit Device Properties */}
                <button
                  onClick={() => {
                    const dev = menuAnchor.device;
                    setMenuAnchor(null);
                    if (onEditDevice) {
                      onEditDevice(dev);
                    } else {
                      setInternalEditingDevice(dev);
                    }
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-amber-300 hover:bg-amber-500/15 hover:text-amber-200 transition ${
                    isRtl ? 'text-right' : 'text-left'
                  } group/item cursor-pointer`}
                >
                  <Edit3 className="w-4 h-4 text-amber-400 group-hover/item:scale-110 transition shrink-0" />
                  <div className="flex flex-col">
                    <span>{isEn ? 'Edit Device Properties' : 'ویرایش مشخصات تجهیز'}</span>
                    <span className="text-[10px] text-amber-400/80 font-mono">Hostname, IP, Role & Location</span>
                  </div>
                </button>

                {/* Quick Ping */}
                <button
                  onClick={() => {
                    const devId = menuAnchor.device.id;
                    setMenuAnchor(null);
                    handlePing(devId);
                  }}
                  disabled={pingingId === menuAnchor.device.id}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/10 transition ${
                    isRtl ? 'text-right' : 'text-left'
                  } cursor-pointer`}
                >
                  <RefreshCw className={`w-4 h-4 text-indigo-400 shrink-0 ${pingingId === menuAnchor.device.id ? 'animate-spin' : ''}`} />
                  <div className="flex flex-col">
                    <span>{isEn ? 'Ping & Keepalive Telemetry' : 'تست پینگ و تاخیر لحظه‌ای'}</span>
                    <span className="text-[10px] text-slate-400 font-mono">ICMP Keepalive Check</span>
                  </div>
                </button>

                {/* Ports Inspector */}
                <button
                  onClick={() => {
                    const dev = menuAnchor.device;
                    setMenuAnchor(null);
                    onInspectPorts(dev);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-200 hover:bg-white/10 transition ${
                    isRtl ? 'text-right' : 'text-left'
                  } cursor-pointer`}
                >
                  <Cable className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div className="flex flex-col">
                    <span>{isEn ? 'Inspect Interfaces & VLANs' : 'مشاهده وضعیت پورت‌ها و VLAN'}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{menuAnchor.device.total_ports || 24} Interfaces</span>
                  </div>
                </button>

                {/* Write Memory */}
                {menuAnchor.device.has_unsaved_changes && onWriteMemory && (
                  <button
                    onClick={() => {
                      const devId = menuAnchor.device.id;
                      setMenuAnchor(null);
                      handleWriteMem(devId);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-300 hover:bg-amber-500/15 transition ${
                      isRtl ? 'text-right' : 'text-left'
                    } cursor-pointer`}
                  >
                    <Save className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="flex flex-col">
                      <span>{isEn ? 'Save to NVRAM (Write Memory)' : 'ذخیره در NVRAM (Write Memory)'}</span>
                      <span className="text-[10px] text-amber-400/80 font-mono">Running &gt; Startup Config</span>
                    </div>
                  </button>
                )}

                <div className="my-1 border-t border-white/10" />

                {/* Delete Device */}
                <button
                  onClick={() => {
                    const dev = menuAnchor.device;
                    setMenuAnchor(null);
                    const confirmMsg = isEn
                      ? `Are you sure you want to remove device "${dev.name}" from the inventory?`
                      : `آیا از حذف تجهیز «${dev.name}» از لیست اطمینان دارید؟`;
                    if (window.confirm(confirmMsg)) {
                      onDeleteDevice(dev.id);
                    }
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition ${
                    isRtl ? 'text-right' : 'text-left'
                  } cursor-pointer`}
                >
                  <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{isEn ? 'Delete Device from System' : 'حذف تجهیز از سیستم'}</span>
                </button>
              </div>
            </div>
          </>,
          document.body
        )}

      {/* Internal Edit Device Modal fallback */}
      {internalEditingDevice && (
        <EditDeviceModal
          isOpen={!!internalEditingDevice}
          device={internalEditingDevice}
          onClose={() => setInternalEditingDevice(null)}
          onSave={async (deviceId, updates) => {
            await updateDevice(deviceId, updates);
            onRefreshAll();
            setInternalEditingDevice(null);
          }}
        />
      )}
    </div>
  );
};
