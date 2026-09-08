import React, { useState } from 'react';
import { RefreshCw, Zap, Palette, ChevronDown, Check, Globe } from 'lucide-react';
import { APP_VERSION } from '../version';
import { useLanguage, Language } from '../i18n';

export type ThemeType = 'obsidian' | 'emerald' | 'cobalt' | 'rose' | 'amber' | 'light';

interface NavbarProps {
  onRefreshAll: () => void;
  isRefreshing: boolean;
  onQuickScan: () => void;
  isScanning: boolean;
  onResetDemo: () => void;
  onlineCount: number;
  totalDevices: number;
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
  onlineCount,
  totalDevices,
  panelTheme,
  onChangeTheme,
  onOpenReleaseNotes,
}) => {
  const { t, language, setLanguage, isRtl, isEn } = useLanguage();
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const offlineCount = Math.max(0, totalDevices - onlineCount);

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
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] text-sm font-mono pulse-glow-cyan border border-white/20">
          NT
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold tracking-tight text-white font-mono glow-text-cyan flex items-center gap-1.5">
              {t('app_title')} <span className="text-indigo-400 text-xs font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30">{t('app_edition')}</span>
            </h1>
            <button
              onClick={onOpenReleaseNotes}
              className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 transition flex items-center gap-1 active:scale-95 cursor-pointer"
              title={t('app_version_tooltip')}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]"></span>
              <span>v{APP_VERSION}</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 hidden sm:block font-sans">
            {t('app_subtitle')}
          </p>
        </div>
      </div>

      {/* Center/Right Status, Language, Theme Selector & Action Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Live Network Status Badges */}
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-bold shadow-[0_0_12px_rgba(16,185,129,0.15)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse"></span>
            <span>{t('status_online_count', { count: onlineCount })}</span>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition ${
              offlineCount > 0
                ? 'bg-rose-500/15 border border-rose-500/40 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                : 'bg-white/5 border border-white/10 text-slate-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                offlineCount > 0 ? 'bg-rose-500 animate-ping' : 'bg-slate-500'
              }`}
            ></span>
            <span>{t('status_critical_count', { count: offlineCount })}</span>
          </div>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

        {/* Multi-Language Switcher */}
        <div className="relative">
          <button
            onClick={() => {
              setLangDropdownOpen(!langDropdownOpen);
              setThemeDropdownOpen(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 transition shadow-xs cursor-pointer active:scale-95"
            title={isEn ? 'Switch Language (English / Persian)' : 'تغییر زبان (انگلیسی / فارسی)'}
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono font-bold text-[11px] text-cyan-300 uppercase tracking-wider">
              {language === 'en' ? 'EN' : 'FA'}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {langDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setLangDropdownOpen(false)}
              ></div>
              <div
                className={`absolute ${isRtl ? 'left-0 text-right' : 'right-0 text-left'} mt-2 w-44 rounded-xl spatial-glass border border-white/15 p-1.5 shadow-2xl z-50 backdrop-blur-2xl`}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 border-b border-white/10 mb-1 flex items-center justify-between">
                  <span>{t('language_switcher')}</span>
                  <Globe className="w-3 h-3 text-cyan-400" />
                </div>
                <div className="space-y-0.5">
                  <button
                    onClick={() => {
                      setLanguage('en');
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition cursor-pointer ${
                      language === 'en'
                        ? 'bg-cyan-600/30 text-white font-bold border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-cyan-300">EN</span>
                      <span>English</span>
                    </div>
                    {language === 'en' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>

                  <button
                    onClick={() => {
                      setLanguage('fa');
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition cursor-pointer ${
                      language === 'fa'
                        ? 'bg-cyan-600/30 text-white font-bold border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-cyan-300">FA</span>
                      <span>فارسی</span>
                    </div>
                    {language === 'fa' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Theme Switcher Button with Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setThemeDropdownOpen(!themeDropdownOpen);
              setLangDropdownOpen(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 transition shadow-xs cursor-pointer active:scale-95"
            title={isEn ? 'Change UI Theme & Palette' : 'تغییر تم و استایل رابط کاربری'}
          >
            <Palette className="w-3.5 h-3.5 text-indigo-400" />
            <span className={`w-2 h-2 rounded-full ${currentThemeObj.bgClass} shadow-xs`}></span>
            <span className="hidden xl:inline text-[11px]">{t(currentThemeObj.nameKey as any).split(' ')[0]}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {themeDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setThemeDropdownOpen(false)}
              ></div>
              <div
                className={`absolute ${isRtl ? 'left-0 text-right' : 'right-0 text-left'} mt-2 w-56 rounded-xl spatial-glass border border-white/15 p-1.5 shadow-2xl z-50 backdrop-blur-2xl`}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 border-b border-white/10 mb-1 flex items-center justify-between">
                  <span>{t('theme_select_title')}</span>
                  <span className="font-mono text-indigo-400">{t('theme_label')}</span>
                </div>
                <div className="space-y-0.5">
                  {themeOptions.map((opt) => {
                    const isSelected = panelTheme === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => {
                          onChangeTheme(opt.id);
                          setThemeDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/30 text-white font-bold border border-indigo-500/40 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shadow-xs"
                            style={{ backgroundColor: opt.color }}
                          ></span>
                          <span>{t(opt.nameKey as any)}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-white/10 hidden sm:block"></div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
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
            className="text-[11px] text-slate-400 hover:text-indigo-300 underline decoration-white/20 hover:decoration-indigo-400 px-1 py-1 transition cursor-pointer"
            title={t('action_demo_data_title')}
          >
            {t('action_demo_data')}
          </button>
        </div>
      </div>
    </header>
  );
};
