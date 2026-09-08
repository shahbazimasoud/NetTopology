import React from 'react';
import {
  LayoutDashboard,
  Network,
  Map,
  Cable,
  Radar,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  Server,
  Sparkles,
  FileCode2
} from 'lucide-react';
import { APP_VERSION } from '../version';

export type ActiveTab = 'dashboard' | 'devices' | 'schematic' | 'templates' | 'ports' | 'scanner';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  devicesCount: number;
  offlineCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onOpenReleaseNotes?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  devicesCount,
  offlineCount,
  isCollapsed,
  onToggleCollapse,
  onOpenReleaseNotes,
}) => {
  const infraItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'داشبورد وضعیت شبکه',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'schematic' as ActiveTab,
      label: 'نقشه شماتیک و موقعیت',
      icon: Map,
      badge: null, // Removed UX clutter 'نقشه'
    },
    {
      id: 'devices' as ActiveTab,
      label: 'موجودی تجهیزات شبکه',
      icon: Network,
      badge: devicesCount > 0 ? `${devicesCount}` : null,
    },
    {
      id: 'templates' as ActiveTab,
      label: 'الگوها و تمپلیت‌ها (Template)',
      icon: FileCode2,
      badge: null,
    },
  ];

  const monitorItems = [
    {
      id: 'ports' as ActiveTab,
      label: 'پایش پورت‌ها و ویلن‌ها',
      icon: Cable,
      badge: null, // Removed UX clutter 'پورت‌ها'
    },
    {
      id: 'scanner' as ActiveTab,
      label: 'اسکن همسایگی CDP/LLDP',
      icon: Radar,
      badge: null, // Removed UX clutter 'اسکن'
    },
  ];

  const renderItem = (item: typeof infraItems[0]) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        title={isCollapsed ? item.label : undefined}
        className={`sidebar-nav-item w-full flex items-center ${
          isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
        } py-2.5 rounded-xl text-right text-xs transition-all duration-200 group relative shrink-0 ${
          isActive
            ? 'active bg-indigo-600/25 text-white font-semibold border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
            : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
        }`}
      >
        <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
          <Icon
            className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
              isActive ? 'text-cyan-400 scale-110' : 'text-slate-400 group-hover:text-slate-200'
            }`}
          />
          {!isCollapsed && (
            <span className="truncate font-medium text-[12px] leading-none select-none">
              {item.label}
            </span>
          )}
        </div>

        {!isCollapsed && item.badge && (
          <span
            className={`shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors ${
              isActive
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 font-bold'
                : 'bg-slate-900/60 text-slate-400 border-white/10'
            }`}
          >
            {item.badge}
          </span>
        )}

        {/* Collapsed Tooltip on Hover */}
        {isCollapsed && (
          <div className="hidden group-hover:flex absolute right-full mr-2 px-2.5 py-1.5 rounded-lg bg-slate-900/95 border border-white/20 text-white text-xs whitespace-nowrap shadow-xl z-50 pointer-events-none items-center gap-2">
            <span>{item.label}</span>
            {item.badge && (
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-300">
                {item.badge}
              </span>
            )}
          </div>
        )}
      </button>
    );
  };

  return (
    <aside
      className={`spatial-glass text-slate-300 flex flex-col p-2.5 shrink-0 border-b lg:border-b-0 lg:border-l border-white/10 backdrop-blur-2xl transition-all duration-300 z-20 sticky top-14 lg:sticky lg:top-14 lg:self-start h-auto lg:h-full lg:max-h-full overflow-hidden ${
        isCollapsed ? 'w-full lg:w-16' : 'w-full lg:w-60'
      }`}
    >
      {/* Collapse Toggle Button Header */}
      <div
        className={`flex items-center ${
          isCollapsed ? 'justify-center' : 'justify-between'
        } pb-2 mb-2 border-b border-white/10 shrink-0`}
      >
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-300 tracking-wider">منوی دسترسی</span>
            <button
              onClick={onOpenReleaseNotes}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 transition flex items-center gap-1"
              title="مشاهده یادداشت‌های نسخه"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>v{APP_VERSION}</span>
            </button>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
          title={isCollapsed ? 'گسترش سایدبار' : 'جمع‌کردن سایدبار (افزایش فضای صفحه)'}
        >
          {isCollapsed ? (
            <ChevronLeft className="w-4 h-4 text-cyan-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </div>

      {/* Scrollable Navigation Items Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-1 py-1 custom-scrollbar">
        {/* Infrastructure Section */}
        {!isCollapsed && (
          <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>زیرساخت شبکه</span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              INFRA
            </span>
          </div>
        )}
        <div className="space-y-1">{infraItems.map(renderItem)}</div>

        {/* Monitoring Section */}
        {!isCollapsed && (
          <div className="px-2 py-1 mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>پایش و آنالیز</span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              MONITOR
            </span>
          </div>
        )}
        <div className={`space-y-1 ${isCollapsed ? 'mt-2' : ''}`}>{monitorItems.map(renderItem)}</div>

        {/* Critical Offline Alert Box */}
        {offlineCount > 0 && (
          <div
            className={`mt-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs shadow-[0_0_15px_rgba(244,63,94,0.2)] backdrop-blur-md transition-all ${
              isCollapsed ? 'p-2 flex justify-center' : 'p-2.5 mx-0.5'
            }`}
            title={isCollapsed ? `هشدار قطعی (${offlineCount} تجهیز)` : undefined}
          >
            <div className="flex items-center gap-2 font-bold text-[11px] text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
              {!isCollapsed && <span>هشدار قطعی ({offlineCount} تجهیز)</span>}
            </div>
            {!isCollapsed && (
              <p className="mt-1 text-[10px] text-rose-200/70 leading-relaxed">
                تجهیزات بدون پاسخ به ICMP در وضعیت Critical هستند.
              </p>
            )}
          </div>
        )}
      </div>

      {/* System Status / Version Widget in Footer */}
      <div className="shrink-0 mt-auto pt-2 border-t border-white/5">
        {!isCollapsed ? (
          <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1.5 backdrop-blur-md shadow-xs">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Python Backend</span>
              <span className="text-cyan-400 font-bold">v3.10 Fast</span>
            </div>
            <p className="text-[10px] text-emerald-400 leading-tight flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse"></span>
              <span>Core Telemetry: Live</span>
            </p>
            <div className="text-[9px] text-slate-500 font-mono pt-1 border-t border-white/5 flex items-center justify-between">
              <button
                onClick={onOpenReleaseNotes}
                className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
              >
                <span>Release Notes</span>
                <span className="text-[8px] bg-indigo-500/20 px-1 rounded">v{APP_VERSION}</span>
              </button>
              <span className="text-emerald-400">NOMINAL</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <button
              onClick={onOpenReleaseNotes}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 transition"
              title={`نسخه ${APP_VERSION} - مشاهده تغییرات`}
            >
              <span className="font-mono text-[9px] font-bold">v{APP_VERSION.split('.')[0]}</span>
            </button>
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" title="سیستم آنلاین" />
          </div>
        )}
      </div>
    </aside>
  );
};
