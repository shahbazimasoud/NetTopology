import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Network,
  Map,
  Cable,
  Radar,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Sparkles,
  FileCode2,
  Layers,
  Activity
} from 'lucide-react';
import { APP_VERSION } from '../version';
import { useLanguage } from '../i18n';

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

interface NavItem {
  id: ActiveTab;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
}

interface NavParentGroup {
  id: 'infra' | 'monitor';
  titleKey: string;
  tagKey: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  items: NavItem[];
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
  const { t, isRtl } = useLanguage();

  const navGroups: NavParentGroup[] = [
    {
      id: 'infra',
      titleKey: 'parent_infra_title',
      tagKey: 'parent_infra_tag',
      icon: Layers,
      colorClass: 'text-indigo-400 border-indigo-500/30 bg-indigo-500/10',
      items: [
        {
          id: 'dashboard',
          labelKey: 'tab_dashboard',
          icon: LayoutDashboard,
          badge: null,
        },
        {
          id: 'schematic',
          labelKey: 'tab_schematic',
          icon: Map,
          badge: null,
        },
        {
          id: 'devices',
          labelKey: 'tab_devices',
          icon: Network,
          badge: devicesCount > 0 ? `${devicesCount}` : null,
        },
        {
          id: 'templates',
          labelKey: 'tab_templates',
          icon: FileCode2,
          badge: null,
        },
      ],
    },
    {
      id: 'monitor',
      titleKey: 'parent_monitor_title',
      tagKey: 'parent_monitor_tag',
      icon: Activity,
      colorClass: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
      items: [
        {
          id: 'ports',
          labelKey: 'tab_ports',
          icon: Cable,
          badge: null,
        },
        {
          id: 'scanner',
          labelKey: 'tab_scanner',
          icon: Radar,
          badge: null,
        },
      ],
    },
  ];

  // Which parent accordion is currently expanded (Default state is open: 'infra')
  const [expandedParentId, setExpandedParentId] = useState<string>('infra');

  // Keep expanded parent synced with activeTab so active item is always visible
  useEffect(() => {
    const parentForActive = navGroups.find((g) => g.items.some((i) => i.id === activeTab));
    if (parentForActive && parentForActive.id !== expandedParentId) {
      setExpandedParentId(parentForActive.id);
    }
  }, [activeTab]);

  // Accordion toggle: Clicking a parent opens it, and closes all other parents
  const handleParentClick = (groupId: string) => {
    if (isCollapsed) {
      onToggleCollapse(); // Auto expand sidebar if collapsed
      setExpandedParentId(groupId);
      return;
    }

    if (expandedParentId === groupId) {
      // Toggle or keep open
      setExpandedParentId('');
    } else {
      // Open this parent and close others
      setExpandedParentId(groupId);
    }
  };

  const renderChildItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const label = t(item.labelKey as any);

    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        title={isCollapsed ? label : undefined}
        className={`sidebar-nav-item w-full flex items-center ${
          isCollapsed ? 'justify-center px-2' : isRtl ? 'justify-between pr-3 pl-2.5 text-right' : 'justify-between pl-3 pr-2.5 text-left'
        } py-2 rounded-xl text-xs transition-all duration-200 group relative shrink-0 cursor-pointer ${
          isActive
            ? 'active bg-indigo-600/30 text-white font-semibold border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.25)]'
            : 'text-slate-300 hover:bg-white/5 hover:text-white border border-transparent'
        }`}
      >
        <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
          <Icon
            className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
              isActive ? 'text-cyan-400 scale-110' : 'text-slate-400 group-hover:text-slate-200'
            }`}
          />
          {!isCollapsed && (
            <span className="truncate font-medium text-[12px] leading-none select-none">
              {label}
            </span>
          )}
        </div>

        {!isCollapsed && item.badge && (
          <span
            className={`shrink-0 text-[10px] font-mono px-2 py-0.5 rounded-full border transition-colors ${
              isActive
                ? 'bg-indigo-500/25 text-indigo-200 border-indigo-500/50 font-bold'
                : 'bg-slate-900/60 text-slate-400 border-white/10'
            }`}
          >
            {item.badge}
          </span>
        )}

        {/* Collapsed Tooltip on Hover */}
        {isCollapsed && (
          <div
            className={`hidden group-hover:flex absolute ${
              isRtl ? 'right-full mr-2' : 'left-full ml-2'
            } px-2.5 py-1.5 rounded-lg bg-slate-900/95 border border-white/20 text-white text-xs whitespace-nowrap shadow-xl z-50 pointer-events-none items-center gap-2`}
          >
            <span>{label}</span>
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
      className={`spatial-glass text-slate-300 flex flex-col p-2.5 shrink-0 border-b lg:border-b-0 ${
        isRtl ? 'lg:border-l' : 'lg:border-r'
      } border-white/10 backdrop-blur-2xl transition-all duration-300 z-20 sticky top-14 lg:sticky lg:top-14 lg:self-start h-auto lg:h-full lg:max-h-full overflow-hidden ${
        isCollapsed ? 'w-full lg:w-16' : 'w-full lg:w-64'
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
            <span className="text-[11px] font-bold text-slate-300 tracking-wider">
              {t('sidebar_menu_title')}
            </span>
            <button
              onClick={onOpenReleaseNotes}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 transition flex items-center gap-1 cursor-pointer"
              title={t('app_version_tooltip')}
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>v{APP_VERSION}</span>
            </button>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
          title={isCollapsed ? t('sidebar_expand_tooltip') : t('sidebar_collapse_tooltip')}
        >
          {isCollapsed ? (
            isRtl ? <ChevronLeft className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4 text-cyan-400" />
          ) : (
            isRtl ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronLeft className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </div>

      {/* Scrollable Navigation Area with Interactive Accordion Parents */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden space-y-2 py-1 custom-scrollbar">
        {navGroups.map((group) => {
          const isExpanded = expandedParentId === group.id;
          const GroupIcon = group.icon;
          const hasActiveChild = group.items.some((i) => i.id === activeTab);

          return (
            <div
              key={group.id}
              className={`rounded-2xl transition-all duration-200 ${
                isCollapsed
                  ? 'space-y-1'
                  : 'border border-white/10 bg-white/[0.02] p-1 shadow-xs'
              }`}
            >
              {/* Accordion Parent Header Button */}
              {!isCollapsed ? (
                <button
                  onClick={() => handleParentClick(group.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer select-none ${
                    isExpanded
                      ? 'bg-white/10 text-white shadow-xs border border-white/10'
                      : hasActiveChild
                      ? 'bg-indigo-600/15 text-slate-200 hover:bg-white/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 rounded-lg border ${group.colorClass}`}>
                      <GroupIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-bold text-[12px] truncate">
                      {t(group.titleKey as any)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                      {t(group.tagKey as any)}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180 text-cyan-400' : isRtl ? '-rotate-90 text-slate-500' : 'rotate-0 text-slate-500'
                      }`}
                    />
                  </div>
                </button>
              ) : (
                /* Collapsed Icon-only parent indicator */
                <div
                  className="flex justify-center py-1 cursor-pointer"
                  onClick={() => handleParentClick(group.id)}
                  title={t(group.titleKey as any)}
                >
                  <div className={`p-1.5 rounded-lg border ${group.colorClass}`}>
                    <GroupIcon className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}

              {/* Children Items Container (Accordion Collapsible) */}
              {(!isCollapsed ? isExpanded : true) && (
                <div
                  className={`${
                    !isCollapsed
                      ? `${isRtl ? 'pr-2 mr-1 border-r' : 'pl-2 ml-1 border-l'} border-white/10 mt-1 space-y-1 animate-fadeIn`
                      : 'space-y-1'
                  }`}
                >
                  {group.items.map(renderChildItem)}
                </div>
              )}
            </div>
          );
        })}

        {/* Critical Offline Alert Box */}
        {offlineCount > 0 && (
          <div
            className={`mt-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs shadow-[0_0_15px_rgba(244,63,94,0.2)] backdrop-blur-md transition-all ${
              isCollapsed ? 'p-2 flex justify-center' : 'p-2.5 mx-0.5'
            }`}
            title={isCollapsed ? t('sidebar_offline_alert_title', { count: offlineCount }) : undefined}
          >
            <div className="flex items-center gap-2 font-bold text-[11px] text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
              {!isCollapsed && (
                <span>{t('sidebar_offline_alert_title', { count: offlineCount })}</span>
              )}
            </div>
            {!isCollapsed && (
              <p className="mt-1 text-[10px] text-rose-200/70 leading-relaxed">
                {t('sidebar_offline_alert_desc')}
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
              <span>{t('sidebar_backend_version')}</span>
              <span className="text-cyan-400 font-bold">v3.10 Fast</span>
            </div>
            <p className="text-[10px] text-emerald-400 leading-tight flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse"></span>
              <span>{t('sidebar_telemetry_live')}</span>
            </p>
            <div className="text-[9px] text-slate-500 font-mono pt-1 border-t border-white/5 flex items-center justify-between">
              <button
                onClick={onOpenReleaseNotes}
                className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>{t('sidebar_release_notes')}</span>
                <span className="text-[8px] bg-indigo-500/20 px-1 rounded">v{APP_VERSION}</span>
              </button>
              <span className="text-emerald-400">{t('sidebar_system_nominal')}</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-1">
            <button
              onClick={onOpenReleaseNotes}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-cyan-400 border border-white/10 transition cursor-pointer"
              title={`v${APP_VERSION}`}
            >
              <span className="font-mono text-[9px] font-bold">v{APP_VERSION.split('.')[0]}</span>
            </button>
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
};
