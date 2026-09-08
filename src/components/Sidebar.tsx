import React from 'react';
import { LayoutDashboard, Network, Map, Cable, Radar, ShieldAlert } from 'lucide-react';

export type ActiveTab = 'dashboard' | 'devices' | 'schematic' | 'ports' | 'scanner';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  devicesCount: number;
  offlineCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  devicesCount,
  offlineCount,
}) => {
  const infraItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'داشبورد وضعیت شبکه',
      sublabel: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'schematic' as ActiveTab,
      label: 'نقشه شماتیک و موقعیت',
      sublabel: 'Topology Map',
      icon: Map,
      badge: 'نقشه',
    },
    {
      id: 'devices' as ActiveTab,
      label: 'موجودی تجهیزات شبکه',
      sublabel: 'Device Inventory',
      icon: Network,
      badge: `${devicesCount}`,
    },
  ];

  const monitorItems = [
    {
      id: 'ports' as ActiveTab,
      label: 'پایش پورت‌ها و ویلن‌ها',
      sublabel: 'Port & VLAN Analytics',
      icon: Cable,
      badge: 'پورت‌ها',
    },
    {
      id: 'scanner' as ActiveTab,
      label: 'اسکن همسایگی CDP/LLDP',
      sublabel: 'LLDP / CDP Engine',
      icon: Radar,
      badge: 'اسکن',
    },
  ];

  const renderItem = (item: typeof infraItems[0]) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        className={`sidebar-nav-item w-full flex items-center justify-between px-3 py-2 rounded-xl text-right text-xs transition-all ${
          isActive
            ? 'active bg-indigo-600/20 text-white font-semibold border-r-2 border-indigo-400 shadow-xs'
            : 'text-slate-300 hover:bg-white/5 hover:text-white'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
          <div className="truncate">
            <span className="block leading-tight font-medium">{item.label}</span>
          </div>
        </div>
        {item.badge && (
          <span
            className={`sidebar-badge text-[9px] font-mono px-1.5 py-0.5 rounded-md border transition-colors ${
              isActive
                ? 'active bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-bold shadow-xs'
                : 'bg-slate-900/60 text-slate-400 border-white/10'
            }`}
          >
            {item.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-full lg:w-56 spatial-glass text-slate-300 flex flex-col p-3 gap-1 shrink-0 border-b lg:border-b-0 lg:border-l border-white/10 backdrop-blur-2xl">
      {/* Infrastructure Section */}
      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
        <span>زیرساخت شبکه</span>
        <span className="sidebar-section-tag font-mono text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">INFRA</span>
      </div>
      <div className="space-y-1">{infraItems.map(renderItem)}</div>

      {/* Monitoring Section */}
      <div className="px-3 py-1.5 mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
        <span>پایش و آنالیز</span>
        <span className="sidebar-section-tag font-mono text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">MONITOR</span>
      </div>
      <div className="space-y-1">{monitorItems.map(renderItem)}</div>

      {/* Critical Offline Alert Box */}
      {offlineCount > 0 && (
        <div className="mx-1 mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs shadow-[0_0_15px_rgba(244,63,94,0.2)] backdrop-blur-md">
          <div className="flex items-center gap-2 font-bold text-[11px] text-rose-300">
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 animate-pulse" />
            <span>هشدار قطعی ({offlineCount} تجهیز)</span>
          </div>
          <p className="mt-1 text-[10px] text-rose-200/70 leading-relaxed">
            تجهیزات بدون پاسخ به ICMP در وضعیت Critical پایش می‌شوند.
          </p>
        </div>
      )}

      {/* Spatial System Status Widget */}
      <div className="mt-auto p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5 backdrop-blur-md shadow-xs">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <span>Python Backend</span>
          <span className="text-cyan-400 font-bold">v3.10 Fast</span>
        </div>
        <p className="text-[10px] text-emerald-400 leading-tight flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse"></span>
          <span>Core Telemetry: Live</span>
        </p>
        <div className="text-[9px] text-slate-500 font-mono pt-1 border-t border-white/5 flex items-center justify-between">
          <span>CDP/LLDP: ACTIVE</span>
          <span className="text-indigo-400">NOMINAL</span>
        </div>
      </div>
    </aside>
  );
};
