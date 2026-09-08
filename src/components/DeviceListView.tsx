import React, { useState } from 'react';
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
  FileCode2
} from 'lucide-react';
import { Device, DeviceType } from '../types';

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
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | DeviceType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'unsaved'>('all');
  const [buildingFilter, setBuildingFilter] = useState<string>('all');
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [writingId, setWritingId] = useState<string | null>(null);

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
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto text-right text-slate-100">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 spatial-glass p-5 rounded-2xl border border-white/10 shadow-xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base sm:text-lg font-bold text-white glow-text-cyan">موجودی و مدیریت تجهیزات شبکه</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
              {devices.length} تجهیز
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            ثبت، مدیریت و پایش برخط بودن سوئیچ‌ها، روترها و اکسس‌پوینت‌ها همراه با مشخصات استقرار (ساختمان، طبقه، واحد و رک)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium shadow-xs transition active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>پایش و پینگ همگانی</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-medium shadow-[0_0_15px_rgba(99,102,241,0.35)] transition border border-white/10 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>معرفی تجهیز جدید</span>
          </button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">سوئیچ‌های شبکه</div>
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
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">روترها و گیت‌وی‌ها</div>
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
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">اکسس‌پوینت‌های وای‌فای</div>
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
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">وضعیت آنلاین / آفلاین</div>
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
            placeholder="جستجوی نام، آدرس IP، مدل، ساختمان یا واحد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3.5 py-2 pr-9 rounded-xl bg-slate-900/70 border border-white/15 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 shadow-inner"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>

        {/* Filters */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-900/70 border border-white/15 text-slate-200 text-xs focus:outline-none focus:border-indigo-400"
          >
            <option value="all">همه انواع تجهیزات</option>
            <option value="switch">فقط سوئیچ‌ها (Switches)</option>
            <option value="router">فقط روترها (Routers)</option>
            <option value="access_point">فقط اکسس‌پوینت‌ها (APs)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-900/70 border border-white/15 text-slate-200 text-xs focus:outline-none focus:border-indigo-400"
          >
            <option value="all">همه وضعیت‌ها</option>
            <option value="online">آنلاین (Online)</option>
            <option value="offline">آفلاین (Offline)</option>
            <option value="unsaved">⚠️ تغییرات رایت‌نشده ({unsavedCount})</option>
          </select>

          {/* Building Filter */}
          <select
            value={buildingFilter}
            onChange={(e) => setBuildingFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-900/70 border border-white/15 text-slate-200 text-xs focus:outline-none focus:border-indigo-400"
          >
            <option value="all">همه ساختمان‌ها</option>
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
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-950/70 text-slate-400 border-b border-white/10 text-[11px] font-bold uppercase tracking-wider font-mono">
                <th className="p-3.5">نام و شناسه تجهیز</th>
                <th className="p-3.5">نوع و مدل</th>
                <th className="p-3.5">آدرس IP</th>
                <th className="p-3.5">محل استقرار (ساختمان / طبقه / واحد)</th>
                <th className="p-3.5">وضعیت لحظه‌ای</th>
                <th className="p-3.5">پروتکل همسایگی</th>
                <th className="p-3.5 text-center">پورت‌ها و ویلن</th>
                <th className="p-3.5 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    تجهیزی با معیارهای جستجو یافت نشد.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((dev) => {
                  const isPinging = pingingId === dev.id;
                  return (
                    <tr key={dev.id} className="hover:bg-white/5 transition">
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
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold" title="دارای تغییرات ذخیره نشده در Startup-Config (Running vs Startup)">
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
                                  className="px-2 py-0.5 rounded bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 border border-amber-500/50 font-bold text-[10px] transition flex items-center gap-1 shadow-sm"
                                  title="اجرای دستور write memory و ذخیره دائم در NVRAM"
                                >
                                  <Save className="w-2.5 h-2.5" />
                                  <span>{writingId === dev.id ? 'در حال رایت...' : 'Write Memory'}</span>
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
                        {dev.ip}
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
                            رک: {dev.rack}
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
                            <span>{dev.is_online ? 'آنلاین' : 'آفلاین'}</span>
                          </span>

                          <button
                            onClick={() => handlePing(dev.id)}
                            disabled={isPinging}
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition border border-white/10"
                            title="پینگ مجدد لحظه‌ای"
                          >
                            <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin text-indigo-400' : ''}`} />
                          </button>
                        </div>
                        {dev.is_online && dev.latency_ms !== null && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            تأخیر: {dev.latency_ms} ms
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-indigo-600/30 hover:text-white hover:border-indigo-400/50 text-slate-300 border border-white/10 transition text-xs shadow-xs"
                        >
                          <Cable className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{dev.total_ports || 24} پورت</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Cisco CLI Connect button for switches and routers */}
                          {(dev.type === 'switch' || dev.type === 'router') && onConnectTerminal && (
                            <button
                              onClick={() => onConnectTerminal(dev)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-medium shadow-[0_0_10px_rgba(16,185,129,0.2)] transition active:scale-95"
                              title="اتصال مستقیم به خط فرمان ترمینال سیسکو (CLI / SSH)"
                            >
                              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                              <span>کانکت</span>
                            </button>
                          )}

                          {/* Apply Template button */}
                          {onApplyTemplate && (
                            <button
                              onClick={() => onApplyTemplate(dev)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 font-sans text-xs font-medium shadow-[0_0_10px_rgba(6,182,212,0.15)] transition active:scale-95"
                              title="اعمال تعاملی تمپلیت کانفیگ استاندارد روی این تجهیز"
                            >
                              <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
                              <span>تمپلیت</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if (window.confirm(`آیا از حذف تجهیز ${dev.name} اطمینان دارید؟`)) {
                                onDeleteDevice(dev.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/20 transition border border-transparent hover:border-rose-500/30"
                            title="حذف تجهیز"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
    </div>
  );
};
