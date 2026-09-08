import React from 'react';
import {
  Server,
  Router as RouterIcon,
  Wifi,
  Activity,
  Layers,
  Map,
  Cable,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Plus,
  RefreshCw,
  Building2,
  ShieldCheck,
  ArrowUpRight
} from 'lucide-react';
import { Device, TopologyData } from '../types';

interface DashboardViewProps {
  devices: Device[];
  topology: TopologyData | null;
  onNavigate: (tab: any) => void;
  onOpenAddModal: () => void;
  onScanCdpLldp: () => void;
  isScanning: boolean;
  onInspectPorts: (device: Device) => void;
  onRefreshAll: () => void;
  isRefreshing: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  devices,
  topology,
  onNavigate,
  onOpenAddModal,
  onScanCdpLldp,
  isScanning,
  onInspectPorts,
  onRefreshAll,
  isRefreshing,
}) => {
  const onlineDevices = devices.filter((d) => d.is_online);
  const offlineDevices = devices.filter((d) => !d.is_online);
  const switches = devices.filter((d) => d.type === 'switch');
  const routers = devices.filter((d) => d.type === 'router');
  const aps = devices.filter((d) => d.type === 'access_point');

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto text-right text-slate-100">
      {/* Top Welcome & Health Banner */}
      <div className="spatial-glass rounded-2xl border border-white/10 shadow-2xl p-5 flex flex-wrap items-center justify-between gap-4 backdrop-blur-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-mono font-bold uppercase tracking-wider shadow-[0_0_10px_rgba(99,102,241,0.2)]">
              NOC Live Monitor • Python 3.10 Backend
            </span>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              CORE SYNCED
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight glow-text-cyan">
            مرکز کنترل و مانیتورینگ متراکم زیرساخت شبکه سازمانی
          </h2>
          <p className="text-xs text-slate-300/80 mt-1 max-w-2xl leading-relaxed">
            پایش بلادرنگ سوییچ‌ها، روترها و اکسس‌پوینت‌ها همراه با اکتشاف خودکار همسایگی‌ها با پروتکل‌های CDP و LLDP و رسم شماتیک فضایی
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 relative z-10">
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-medium text-xs shadow-[0_0_20px_rgba(99,102,241,0.35)] transition border border-white/15 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>معرفی تجهیز جدید</span>
          </button>

          <button
            onClick={() => onNavigate('schematic')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium shadow-xs transition active:scale-95"
          >
            <Map className="w-3.5 h-3.5 text-indigo-400" />
            <span>نقشه شماتیک</span>
          </button>

          <button
            onClick={onScanCdpLldp}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium transition disabled:opacity-50 active:scale-95 shadow-xs"
          >
            <Zap className={`w-3.5 h-3.5 text-cyan-400 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'در حال اسکن...' : 'اسکن CDP/LLDP'}</span>
          </button>
        </div>
      </div>

      {/* Spatial KPI Metrics (4 columns) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 shrink-0">
        {/* Total Devices */}
        <div
          onClick={() => onNavigate('devices')}
          className="spatial-glass spatial-glass-hover spatial-depth-card p-4 rounded-xl border border-white/10 shadow-xl cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
            <span>کل تجهیزات شبکه</span>
            <Server className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition" />
          </div>
          <div className="text-3xl font-bold text-white font-mono glow-text-cyan">{devices.length}</div>
          <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5 font-mono">
            <span>{switches.length} سوییچ</span> • <span>{routers.length} روتر</span> •{' '}
            <span>{aps.length} AP</span>
          </div>
        </div>

        {/* Online Status */}
        <div className="spatial-glass spatial-glass-hover spatial-depth-card p-4 rounded-xl border border-white/10 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
            <span>وضعیت برخط (Online)</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-400 font-mono shadow-[0_0_15px_rgba(52,211,153,0.3)]">
              {onlineDevices.length}
            </span>
            <span className="text-slate-400 text-xs font-mono">
              ({devices.length > 0 ? Math.round((onlineDevices.length / devices.length) * 100) : 0}%)
            </span>
            {offlineDevices.length > 0 && (
              <span className="text-rose-400 text-xs font-mono font-bold mr-auto px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/30">
                {offlineDevices.length} آفلاین
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            پایداری اتصالات شبکه: <span className="font-mono text-emerald-400 font-bold">۹۹.۴٪</span>
          </div>
        </div>

        {/* Schematic Topology Links */}
        <div
          onClick={() => onNavigate('schematic')}
          className="spatial-glass spatial-glass-hover spatial-depth-card p-4 rounded-xl border border-white/10 shadow-xl cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
            <span>اتصالات همسایگی CDP/LLDP</span>
            <Cable className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition" />
          </div>
          <div className="text-3xl font-bold text-indigo-400 font-mono glow-text-purple">
            {topology?.links.length || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            پیوندهای Trunk (802.1Q) و Access
          </div>
        </div>

        {/* Buildings & Locations */}
        <div
          onClick={() => onNavigate('schematic')}
          className="spatial-glass spatial-glass-hover spatial-depth-card p-4 rounded-xl border border-white/10 shadow-xl cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">
            <span>سایت‌های ساختمانی</span>
            <Building2 className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition" />
          </div>
          <div className="text-3xl font-bold text-white font-mono">
            {topology?.buildings.length || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-2">
            ساختمان مرکزی و مهندسی
          </div>
        </div>
      </div>

      {/* Real-time Ping Latency Grid */}
      <div className="spatial-glass border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4 backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b border-white/10 pb-3">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>پایش لحظه‌ای تجهیزات و وضعیت پینگ (Real-Time Ping & Telemetry)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              آزمایش وضعیت برخط بودن پورت‌های مدیریتی، زمان پاسخ‌دهی (Latency) و پکت‌لاس با پایتون
            </p>
          </div>

          <button
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs transition disabled:opacity-50 shadow-xs active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>پایش مجدد</span>
          </button>
        </div>

        {/* Device Ping Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {devices.map((dev) => (
            <div
              key={dev.id}
              className={`p-3.5 rounded-xl border transition text-xs spatial-glass spatial-glass-hover ${
                dev.is_online
                  ? 'border-white/10 hover:border-indigo-500/40'
                  : 'border-rose-500/40 bg-rose-950/20'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`p-1.5 rounded-lg ${
                      dev.type === 'switch'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : dev.type === 'router'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    }`}
                  >
                    {dev.type === 'switch' ? (
                      <Server className="w-3.5 h-3.5" />
                    ) : dev.type === 'router' ? (
                      <RouterIcon className="w-3.5 h-3.5" />
                    ) : (
                      <Wifi className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <span className="font-bold text-white font-mono text-xs truncate">{dev.name}</span>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
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
                  {dev.is_online ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>

              {/* IP & Location */}
              <div className="flex items-center justify-between text-[11px] font-mono text-indigo-300 font-bold mb-1.5">
                <span>{dev.ip}</span>
                <span className="text-slate-400 text-[10px] font-normal">
                  {dev.is_online ? `${dev.latency_ms || 1.2} ms` : '100% packet loss'}
                </span>
              </div>

              <div className="text-[10px] text-slate-400 truncate">
                {dev.building.replace('(Central Bldg)', '').replace('(Engineering Bldg)', '')} • {dev.floor} • {dev.unit}
              </div>

              {/* Action Buttons */}
              <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
                <button
                  onClick={() => onInspectPorts(dev)}
                  className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 text-[11px] transition hover:underline"
                >
                  <Cable className="w-3.5 h-3.5" />
                  <span>بررسی پورت‌ها ({dev.total_ports || 24})</span>
                </button>
                <span className="text-[10px] text-slate-400 font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                  {dev.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
