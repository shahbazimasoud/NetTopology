import React, { useState } from 'react';
import { RefreshCw, Zap, Palette, ChevronDown, Check, Globe, User, ShieldCheck, FileText } from 'lucide-react';
import { APP_VERSION } from '../version';
import { useLanguage } from '../i18n';

export type ThemeType = 'obsidian' | 'emerald' | 'cobalt' | 'rose' | 'amber' | 'light';

interface NavbarProps {
  onRefreshAll: () => void;
  isRefreshing: boolean;
  onQuickScan: () => void;
  isScanning: boolean;
  onResetDemo: () => void;
  onlineCount?: number;
  totalDevices?: number;
  panelTheme: ThemeType;
  onChangeTheme: (theme: ThemeType) => void;
  onOpenReleaseNotes?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onRefreshAll,
  isRefreshing,
  onQuickScan,
  isScanning,
  onResetDemo,
  panelTheme,
  onChangeTheme,
  onOpenReleaseNotes,
}) => {
  const { t, language, setLanguage, isRtl, isEn } = useLanguage();
  const [profileOpen, setProfileOpen] = useState(false);

  const themeOptions: { id: ThemeType; nameKey: string; color: string; bgClass: string }[] = [
    { id: 'obsidian', nameKey: 'theme_obsidian', color: '#6366f1', bgClass: 'bg-indigo-600' },
    { id: 'emerald', nameKey: 'theme_emerald', color: '#10b981', bgClass: 'bg-emerald-500' },
    { id: 'cobalt', nameKey: 'theme_cobalt', color: '#0284c7', bgClass: 'bg-sky-600' },
    { id: 'rose', nameKey: 'theme_rose', color: '#f43f5e', bgClass: 'bg-rose-500' },
    { id: 'amber', nameKey: 'theme_amber', color: '#f59e0b', bgClass: 'bg-amber-500' },
    { id: 'light', nameKey: 'theme_light', color: '#64748b', bgClass: 'bg-slate-400' },
  ];

  const currentThemeObj = themeOptions.find((t) => t.id === panelTheme) || themeOptions[0];

  return (
    <header className="h-14 spatial-glass text-white flex items-center justify-between px-4 lg:px-6 shrink-0 border-b border-white/10 sticky top-0 z-30 shadow-xl backdrop-blur-xl">
      {/* Brand & Identity */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] text-xs font-mono pulse-glow-cyan border border-white/20">
          NT
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white font-mono glow-text-cyan flex items-center gap-1.5">
              {t('app_title')} <span className="text-indigo-400 text-[11px] font-semibold px-1.5 py-0.2 rounded bg-indigo-500/20 border border-indigo-500/30">{t('app_edition')}</span>
            </h1>

            {/* Ultra-Compact Discreet Version Tag */}
            <button
              onClick={onOpenReleaseNotes}
              className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300/80 hover:text-cyan-200 border border-cyan-500/20 transition flex items-center gap-1 active:scale-95 cursor-pointer"
              title={t('app_version_tooltip')}
            >
              <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
              <span>v{APP_VERSION}</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 hidden sm:block font-sans">
            {t('app_subtitle')}
          </p>
        </div>
      </div>

      {/* Clean Uncluttered Header Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick CDP/LLDP Scan Button */}
        <button
          onClick={onQuickScan}
          disabled={isScanning}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-medium text-xs shadow-[0_0_15px_rgba(99,102,241,0.35)] transition disabled:opacity-50 border border-white/10 active:scale-95 cursor-pointer"
          title={t('action_quick_scan_title')}
        >
          <Zap className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">
            {isScanning ? t('action_quick_scan_active') : t('action_quick_scan')}
          </span>
        </button>

        {/* Refresh / Ping Button */}
        <button
          onClick={onRefreshAll}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs transition disabled:opacity-50 shadow-xs active:scale-95 cursor-pointer"
          title={t('action_live_ping_title')}
        >
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          <span className="hidden lg:inline">{t('action_live_ping')}</span>
        </button>

        {/* Reset Demo Data */}
        <button
          onClick={onResetDemo}
          className="hidden sm:inline text-[11px] text-slate-400 hover:text-indigo-300 underline decoration-white/20 hover:decoration-indigo-400 px-1 py-1 transition cursor-pointer"
          title={t('action_demo_data_title')}
        >
          {t('action_demo_data')}
        </button>

        {/* Separator */}
        <div className="h-5 w-px bg-white/10"></div>

        {/* Unified Profile & Preferences Button */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 transition shadow-xs cursor-pointer active:scale-95"
            title={t('profile_menu_title')}
            id="profile-dropdown-btn"
          >
            {/* Avatar Circle with Status Dot */}
            <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-500 text-white font-bold text-xs shadow-inner">
              <User className="w-4 h-4" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-slate-900 shadow-[0_0_4px_rgba(52,211,153,0.9)]"></span>
            </div>

            {/* Language & Theme Micro Indicators on Button */}
            <div className="hidden sm:flex flex-col text-left text-[10px] leading-tight">
              <span className="font-bold text-white text-[11px] flex items-center gap-1">
                Admin
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentThemeObj.color }}></span>
              </span>
              <span className="text-slate-400 font-mono text-[9px] uppercase tracking-wider">{language.toUpperCase()}</span>
            </div>

            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
          </button>

          {/* Profile & Settings Dropdown Menu */}
          {profileOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileOpen(false)}
              ></div>

              <div
                className={`absolute ${isRtl ? 'left-0 text-right' : 'right-0 text-left'} mt-2 w-72 rounded-2xl spatial-glass border border-white/15 p-3 shadow-2xl z-50 backdrop-blur-2xl`}
              >
                {/* Profile Header Card */}
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-md">
                    <ShieldCheck className="w-5 h-5 text-cyan-200" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-bold text-white text-xs truncate">
                        {t('profile_admin_name')}
                      </span>
                      <span
                        className="inline-flex items-center p-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shrink-0"
                        title={t('profile_active_session')}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse" />
                      </span>
                    </div>
                    <p className="text-[10px] text-indigo-300 font-mono mt-0.5 truncate">
                      {t('profile_admin_role')}
                    </p>
                    <p className="text-[9px] text-slate-400 font-mono truncate">
                      {t('profile_admin_email')}
                    </p>
                  </div>
                </div>

                {/* Section 1: Language Switcher */}
                <div className="mb-3">
                  <div className="px-1 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>{t('profile_language_title')}</span>
                    <Globe className="w-3 h-3 text-cyan-400" />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    <button
                      onClick={() => setLanguage('en')}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                        language === 'en'
                          ? 'bg-cyan-600/30 text-white font-bold border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                          : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <span className="font-mono font-bold text-[10px] px-1 py-0.2 rounded bg-white/10 text-cyan-300">EN</span>
                      <span>English</span>
                      {language === 'en' && <Check className="w-3 h-3 text-cyan-400 ml-auto" />}
                    </button>

                    <button
                      onClick={() => setLanguage('fa')}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs transition cursor-pointer ${
                        language === 'fa'
                          ? 'bg-cyan-600/30 text-white font-bold border border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                          : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <span className="font-mono font-bold text-[10px] px-1 py-0.2 rounded bg-white/10 text-cyan-300">FA</span>
                      <span>فارسی</span>
                      {language === 'fa' && <Check className="w-3 h-3 text-cyan-400 ml-auto" />}
                    </button>
                  </div>
                </div>

                {/* Section 2: Theme Switcher */}
                <div className="mb-3">
                  <div className="px-1 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>{t('profile_theme_title')}</span>
                    <Palette className="w-3 h-3 text-indigo-400" />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 mt-1">
                    {themeOptions.map((opt) => {
                      const isSelected = panelTheme === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => onChangeTheme(opt.id)}
                          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition cursor-pointer text-left ${
                            isSelected
                              ? 'bg-indigo-600/30 text-white font-bold border border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                              : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                            style={{ backgroundColor: opt.color }}
                          ></span>
                          <span className="truncate text-[11px]">{t(opt.nameKey as any).split(' ')[0]}</span>
                          {isSelected && <Check className="w-3 h-3 text-indigo-400 ml-auto shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Section 3: Release Notes & System Status Link */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      if (onOpenReleaseNotes) onOpenReleaseNotes();
                    }}
                    className="flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200 transition cursor-pointer"
                  >
                    <FileText className="w-3 h-3" />
                    <span>v{APP_VERSION} {t('sidebar_release_notes')}</span>
                  </button>

                  <span className="text-[10px] text-slate-400 font-mono">
                    Cisco IOS-XE
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

