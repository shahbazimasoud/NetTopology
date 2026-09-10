import React, { useState, useEffect, useMemo } from 'react';
import {
  ScrollText,
  Terminal,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Download,
  Trash2,
  RefreshCw,
  Clock,
  User,
  MapPin,
  Server,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  Code2,
  Copy,
  Check,
  Layers,
  Database,
  Lock,
  Calendar,
  Eye,
  X,
  FileSpreadsheet,
  FileJson,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import {
  PortalAuditLogEntry,
  DeviceCommandLogEntry,
  AuditLogCategory,
  AuditLogSeverity,
  CommandRiskLevel,
  CommandChannel
} from '../../types';
import {
  loadPortalAuditLogs,
  loadDeviceCommandLogs,
  exportPortalLogsAsCsv,
  exportCommandLogsAsCsv,
  exportAllLogsAsJson,
  clearPortalLogs,
  clearCommandLogs,
  AUDIT_LOG_UPDATED_EVENT
} from '../../services/auditLogger';
import { useLanguage } from '../../i18n/LanguageContext';

type ActiveLogSection = 'portal' | 'commands';

export const AuditLogsView: React.FC = () => {
  const { t, isEn, isRtl } = useLanguage();
  const [activeSection, setActiveSection] = useState<ActiveLogSection>('portal');

  // Logs state
  const [portalLogs, setPortalLogs] = useState<PortalAuditLogEntry[]>([]);
  const [commandLogs, setCommandLogs] = useState<DeviceCommandLogEntry[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | '1h' | '24h' | '7d'>('all');

  // Modal inspection state
  const [selectedPortalLog, setSelectedPortalLog] = useState<PortalAuditLogEntry | null>(null);
  const [selectedCommandLog, setSelectedCommandLog] = useState<DeviceCommandLogEntry | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isConfirmPurgeOpen, setIsConfirmPurgeOpen] = useState(false);

  // Load logs initially and subscribe to live update events
  const refreshData = () => {
    setIsRefreshing(true);
    setPortalLogs(loadPortalAuditLogs());
    setCommandLogs(loadDeviceCommandLogs());
    setTimeout(() => setIsRefreshing(false), 400);
  };

  useEffect(() => {
    refreshData();

    const handleUpdate = () => {
      setPortalLogs(loadPortalAuditLogs());
      setCommandLogs(loadDeviceCommandLogs());
    };

    window.addEventListener(AUDIT_LOG_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(AUDIT_LOG_UPDATED_EVENT, handleUpdate);
  }, []);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Timeframe filter calculation
  const isWithinTimeframe = (timestamp: string): boolean => {
    if (selectedTimeframe === 'all') return true;
    const logTime = new Date(timestamp).getTime();
    const now = Date.now();
    const diff = now - logTime;
    if (selectedTimeframe === '1h') return diff <= 1000 * 60 * 60;
    if (selectedTimeframe === '24h') return diff <= 1000 * 60 * 60 * 24;
    if (selectedTimeframe === '7d') return diff <= 1000 * 60 * 60 * 24 * 7;
    return true;
  };

  // Filtered portal logs
  const filteredPortalLogs = useMemo(() => {
    return portalLogs.filter((log) => {
      if (!isWithinTimeframe(log.timestamp)) return false;
      if (selectedCategory !== 'all' && log.category !== selectedCategory) return false;
      if (selectedSeverity !== 'all' && log.severity !== selectedSeverity) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        log.title.toLowerCase().includes(q) ||
        log.title_en.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q) ||
        log.details_en.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.actor.username.toLowerCase().includes(q) ||
        log.actor.role.toLowerCase().includes(q) ||
        log.target.name.toLowerCase().includes(q) ||
        (log.target.location && log.target.location.toLowerCase().includes(q)) ||
        (log.target.ip && log.target.ip.includes(q))
      );
    });
  }, [portalLogs, searchQuery, selectedCategory, selectedSeverity, selectedTimeframe]);

  // Filtered command logs
  const filteredCommandLogs = useMemo(() => {
    return commandLogs.filter((cmd) => {
      if (!isWithinTimeframe(cmd.timestamp)) return false;
      if (selectedVendor !== 'all' && cmd.deviceVendor !== selectedVendor) return false;
      if (selectedSeverity !== 'all' && cmd.riskLevel !== selectedSeverity) return false;
      if (selectedCategory !== 'all' && cmd.channel !== selectedCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        cmd.command.toLowerCase().includes(q) ||
        cmd.deviceName.toLowerCase().includes(q) ||
        cmd.deviceIp.includes(q) ||
        cmd.deviceLocation.toLowerCase().includes(q) ||
        cmd.actor.username.toLowerCase().includes(q) ||
        cmd.actor.role.toLowerCase().includes(q) ||
        (cmd.notes && cmd.notes.toLowerCase().includes(q))
      );
    });
  }, [commandLogs, searchQuery, selectedVendor, selectedSeverity, selectedCategory, selectedTimeframe]);

  // KPIs
  const stats = useMemo(() => {
    const totalPortal = portalLogs.length;
    const totalCommands = commandLogs.length;
    const deviceEvents = portalLogs.filter(p => p.category === 'device_inventory').length;
    const criticalActions = portalLogs.filter(p => p.severity === 'critical').length +
      commandLogs.filter(c => c.riskLevel === 'critical' || c.status === 'denied').length;
    const blockedCount = commandLogs.filter(c => c.status === 'denied').length;

    return { totalPortal, totalCommands, deviceEvents, criticalActions, blockedCount };
  }, [portalLogs, commandLogs]);

  // Formatting date
  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(isEn ? 'en-US' : 'fa-IR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (e) {
      return iso;
    }
  };

  const getSeverityBadge = (severity: AuditLogSeverity) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3 h-3" />
            {isEn ? 'CRITICAL' : 'بحرانی'}
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3 h-3" />
            {isEn ? 'WARNING' : 'هشدار'}
          </span>
        );
      case 'notice':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            <Shield className="w-3 h-3" />
            {isEn ? 'NOTICE' : 'توجه'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
            {isEn ? 'INFO' : 'اطلاع'}
          </span>
        );
    }
  };

  const getRiskBadge = (risk: CommandRiskLevel) => {
    switch (risk) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3 h-3" />
            {isEn ? 'DESTRUCTIVE / CRITICAL' : 'بحرانی / مخرب'}
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30">
            <AlertTriangle className="w-3 h-3" />
            {isEn ? 'HIGH RISK' : 'ریسک بالا'}
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            {isEn ? 'CONFIG WRITE' : 'تغییر کانفیگ'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            {isEn ? 'READ-ONLY' : 'خواندن / پایش'}
          </span>
        );
    }
  };

  const getActionPill = (action: string) => {
    if (action.includes('DELETE')) {
      return (
        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-rose-500/20 text-rose-500 border border-rose-500/40">
          {action}
        </span>
      );
    }
    if (action.includes('CREATED') || action.includes('ADDED')) {
      return (
        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/40">
          {action}
        </span>
      );
    }
    if (action.includes('BACKUP')) {
      return (
        <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/40">
          {action}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded font-mono text-[10px] font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
        {action}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
              <ScrollText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{isEn ? 'Audit & Activity Logs' : 'مرکز ممیزی، لاگ‌ها و وقایع شبکه'}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  SIEM Engine v1.0
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {isEn
                  ? 'Comprehensive operational audit trail: administrative portal events, device lifecycle & terminal command execution logs'
                  : 'ردیابی و ممیزی جامع وقایع پرتال، تغییرات تجهیزات و موجودی، مدیریت کاربران و فرامین ارسالی به ترمینال تجهیزات'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
            <span>{isEn ? 'Refresh' : 'بروزرسانی'}</span>
          </button>

          <button
            onClick={() => {
              if (activeSection === 'portal') exportPortalLogsAsCsv();
              else exportCommandLogsAsCsv();
            }}
            className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            title={isEn ? 'Export active view to CSV' : 'استخراج به فایل CSV'}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>{isEn ? 'Export CSV' : 'خروجی اکسل / CSV'}</span>
          </button>

          <button
            onClick={exportAllLogsAsJson}
            className="px-3 py-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            title={isEn ? 'Export all logs as JSON for SIEM integration' : 'خروجی کامل به فرمت JSON برای ممیزی و SIEM'}
          >
            <FileJson className="w-3.5 h-3.5 text-blue-500" />
            <span>{isEn ? 'SIEM JSON' : 'خروجی SIEM (JSON)'}</span>
          </button>

          <button
            onClick={() => setIsConfirmPurgeOpen(true)}
            className="px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold flex items-center gap-1.5 transition"
            title={isEn ? 'Purge logs' : 'پاکسازی لاگ‌ها'}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isEn ? 'Clear' : 'پاکسازی'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {/* Total Portal Events */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isEn ? 'Portal Audit Events' : 'کل وقایع پرتال و سیستم'}
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{stats.totalPortal}</span>
            <span className="text-[11px] text-slate-400 font-medium">{isEn ? 'recorded' : 'ثبت‌شده'}</span>
          </div>
        </div>

        {/* Device Lifecycle Changes */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isEn ? 'Device Lifecycle Ops' : 'عملیات ثبت/حذف تجهیزات'}
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">{stats.deviceEvents}</span>
            <span className="text-[11px] text-slate-400 font-medium">{isEn ? 'lifecycle ops' : 'تغییر موجودی'}</span>
          </div>
        </div>

        {/* Commands Executed */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isEn ? 'Device Commands' : 'فرامین ارسالی به تجهیزات'}
            </span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-500">
              <Terminal className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400 font-mono">{stats.totalCommands}</span>
            <span className="text-[11px] text-slate-400 font-medium">{isEn ? 'CLI executions' : 'دستور ترمینال'}</span>
          </div>
        </div>

        {/* Blocked / Security Violations */}
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {isEn ? 'RBAC Violations / Blocked' : 'فرامین مسدودشده RBAC'}
            </span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">{stats.blockedCount}</span>
            <span className="text-[11px] text-rose-500 font-medium">{isEn ? 'access denied' : 'مسدود امنیتی'}</span>
          </div>
        </div>
      </div>

      {/* Main Section Navigation Switcher (Two Core Sections) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60">
        <div className="flex items-center gap-1.5 flex-1">
          {/* Section 1: Portal & System Audit */}
          <button
            onClick={() => {
              setActiveSection('portal');
              setSelectedCategory('all');
            }}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeSection === 'portal'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{isEn ? '1. Portal & System Audit Logs' : '۱. لاگ‌های ثبتی پورتال و سیستم'}</span>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {portalLogs.length}
            </span>
          </button>

          {/* Section 2: Device Commands & Terminal Execution */}
          <button
            onClick={() => {
              setActiveSection('commands');
              setSelectedCategory('all');
            }}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeSection === 'commands'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>{isEn ? '2. Device Commands & CLI Logs' : '۲. لاگ فرامین و دستورات تجهیزات'}</span>
            <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {commandLogs.length}
            </span>
          </button>
        </div>

        {/* Timeframe Presets */}
        <div className="flex items-center gap-1 self-center sm:self-auto text-xs">
          <span className="text-slate-400 text-[11px] hidden md:inline px-1">
            {isEn ? 'Period:' : 'بازه:'}
          </span>
          {(['all', '1h', '24h', '7d'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedTimeframe(period)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                selectedTimeframe === period
                  ? 'bg-emerald-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              {period === 'all'
                ? (isEn ? 'All Time' : 'کل')
                : period === '1h'
                ? (isEn ? '1 Hour' : '۱ ساعت')
                : period === '24h'
                ? (isEn ? '24 Hours' : '۲۴ ساعت')
                : (isEn ? '7 Days' : '۷ روز')}
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 text-slate-400 ltr:left-3 rtl:right-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeSection === 'portal'
                ? (isEn ? 'Search by user, action, device name, IP, physical location...' : 'جستجو در نام کاربر، عملیات، نام دیوایس، IP، موقعیت مکانی و رک...')
                : (isEn ? 'Search executed command, target switch/router, IP, user...' : 'جستجو در متن دستور CLI، سوئیچ/روتر، IP، کاربر، تنظیمات...')
            }
            className="w-full text-xs md:text-sm py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 ltr:pl-9 ltr:pr-3 rtl:pr-9 rtl:pl-3"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 ltr:right-3 rtl:left-3"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter for Portal */}
          {activeSection === 'portal' ? (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs py-2 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">{isEn ? 'All Categories' : 'تمام دسته‌بندی‌ها'}</option>
              <option value="device_inventory">{isEn ? 'Device Inventory & Locations' : 'موجودی تجهیزات و رک‌ها'}</option>
              <option value="user_management">{isEn ? 'User & Identity Management' : 'مدیریت کاربران و هویت'}</option>
              <option value="rbac_policy">{isEn ? 'Access Control & Policies' : 'سطوح دسترسی و پالیسی RBAC'}</option>
              <option value="backup_recovery">{isEn ? 'Backup & Disaster Recovery' : 'پشتیبان‌گیری و بازیابی'}</option>
              <option value="port_interface">{isEn ? 'Port & Interface Operations' : 'عملیات پورت و اینترفیس'}</option>
            </select>
          ) : (
            /* Channel Filter for Commands */
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs py-2 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">{isEn ? 'All Channels' : 'همه کانال‌های اجرا'}</option>
              <option value="terminal_interactive">{isEn ? 'Interactive Terminal (CLI)' : 'ترمینال تعاملی (CLI)'}</option>
              <option value="template_push">{isEn ? 'Template Push' : 'اعمال قالب پیکربندی'}</option>
              <option value="port_context_menu">{isEn ? 'Port Context Menu / Shutdown' : 'منوی راست‌کلیک پورت'}</option>
              <option value="batch_config">{isEn ? 'Batch Switchport Config' : 'پیکربندی گروهی پورت‌ها'}</option>
            </select>
          )}

          {/* Vendor Filter (for Commands) */}
          {activeSection === 'commands' && (
            <select
              value={selectedVendor}
              onChange={(e) => setSelectedVendor(e.target.value)}
              className="text-xs py-2 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="all">{isEn ? 'All Vendors' : 'تمام سازندگان (وندور)'}</option>
              <option value="cisco">Cisco Systems</option>
              <option value="mikrotik">MikroTik RouterOS</option>
              <option value="linux">Linux Server / Appliance</option>
            </select>
          )}

          {/* Severity / Risk Filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="text-xs py-2 px-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">{isEn ? 'All Severities / Risks' : 'همه سطوح ریسک'}</option>
            <option value="critical">{isEn ? 'Critical / Destructive' : 'بحرانی / دستورات مخرب'}</option>
            <option value="warning">{isEn ? 'Warning / High' : 'هشدار / تغییرات عمده'}</option>
            <option value="notice">{isEn ? 'Notice / Medium' : 'توجه / تغییر کانفیگ'}</option>
            <option value="info">{isEn ? 'Info / Low' : 'عادی / پایش و خواندن'}</option>
          </select>
        </div>
      </div>

      {/* SECTION 1: PORTAL & SYSTEM AUDIT LOGS TABLE */}
      {activeSection === 'portal' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {isEn ? 'Administrative & Lifecycle Audit Records' : 'دفتر وقایع پرتال: کاربران، تغییرات سطوح دسترسی و تجهیزات'}
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {filteredPortalLogs.length} {isEn ? 'matches' : 'رویداد'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-3.5 w-32">{isEn ? 'Timestamp' : 'زمان ثبت'}</th>
                  <th className="py-3 px-3.5 w-44">{isEn ? 'Operator / Actor' : 'کاربر / اپراتور'}</th>
                  <th className="py-3 px-3.5 w-36">{isEn ? 'Action Code' : 'شناسه عملیات'}</th>
                  <th className="py-3 px-3.5">{isEn ? 'Target Resource & Details' : 'هدف، محل استقرار و شرح تغییرات'}</th>
                  <th className="py-3 px-3.5 w-24 text-center">{isEn ? 'Severity' : 'سطح اهمیت'}</th>
                  <th className="py-3 px-3.5 w-20 text-center">{isEn ? 'Action' : 'جزئیات'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {filteredPortalLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ScrollText className="w-8 h-8 opacity-40 text-slate-400" />
                        <span className="text-sm">{isEn ? 'No portal audit logs found matching criteria.' : 'هیچ لاگی مطابق فیلترهای انتخابی یافت نشد.'}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPortalLogs.map((log) => {
                    const isDeletion = log.action.includes('DELETED');
                    const isCreation = log.action.includes('CREATED') || log.action.includes('ADDED');
                    return (
                      <tr
                        key={log.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group ${
                          isDeletion ? 'bg-rose-500/[0.02]' : isCreation ? 'bg-emerald-500/[0.02]' : ''
                        }`}
                      >
                        {/* Timestamp */}
                        <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatDateTime(log.timestamp)}
                        </td>

                        {/* Actor */}
                        <td className="py-3 px-3.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              {log.actor.username}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[160px]" title={log.actor.role}>
                              {log.actor.role}
                            </span>
                            {log.actor.ipAddress && (
                              <span className="text-[10px] font-mono text-slate-400">
                                IP: {log.actor.ipAddress}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Action Code */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          {getActionPill(log.action)}
                        </td>

                        {/* Target & Details */}
                        <td className="py-3 px-3.5">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 dark:text-slate-100">
                                {isEn ? log.title_en : log.title}
                              </span>
                              {log.target.name && (
                                <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                                  isDeletion ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}>
                                  {log.target.name}
                                </span>
                              )}
                              {log.target.ip && (
                                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                  [{log.target.ip}]
                                </span>
                              )}
                            </div>

                            {/* Detailed Description */}
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                              {isEn ? log.details_en : log.details}
                            </p>

                            {/* Physical Location Badge - Critical for user request! */}
                            {log.target.location && (
                              <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span>{isEn ? 'Location:' : 'محل فیزیکی:'}</span>
                                <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/40 font-semibold">
                                  {log.target.location}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Severity */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          {getSeverityBadge(log.severity)}
                        </td>

                        {/* Detail Modal Action */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <button
                            onClick={() => setSelectedPortalLog(log)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition"
                            title={isEn ? 'View full log audit details' : 'مشاهده جزئیات کامل این رویداد'}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: DEVICE COMMANDS & CLI EXECUTION LOGS TABLE */}
      {activeSection === 'commands' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {isEn ? 'Hardware CLI Command & Terminal Execution Audit' : 'دفتر فرامین ارسالی: کلیه دستورات اجرا شده در ترمینال، تمپلیت و پورت‌ها'}
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {filteredCommandLogs.length} {isEn ? 'commands' : 'دستور'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left rtl:text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3 px-3.5 w-32">{isEn ? 'Timestamp' : 'زمان'}</th>
                  <th className="py-3 px-3.5 w-40">{isEn ? 'Operator' : 'کاربر / اپراتور'}</th>
                  <th className="py-3 px-3.5 w-44">{isEn ? 'Target Device' : 'دیوایس مقصد'}</th>
                  <th className="py-3 px-3.5">{isEn ? 'Executed Command & Location' : 'دستور ارسالی (CLI Command) و مکان فیزیکی'}</th>
                  <th className="py-3 px-3.5 w-32 text-center">{isEn ? 'Risk & Channel' : 'کانال و سطح ریسک'}</th>
                  <th className="py-3 px-3.5 w-24 text-center">{isEn ? 'Status' : 'وضعیت'}</th>
                  <th className="py-3 px-3.5 w-16 text-center">{isEn ? 'View' : 'مشاهده'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                {filteredCommandLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Terminal className="w-8 h-8 opacity-40 text-slate-400" />
                        <span className="text-sm">{isEn ? 'No executed commands found matching criteria.' : 'هیچ دستور ثبت‌شده‌ای مطابق فیلترها یافت نشد.'}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredCommandLogs.map((cmd) => {
                    const isDenied = cmd.status === 'denied';
                    const isCritical = cmd.riskLevel === 'critical';
                    return (
                      <tr
                        key={cmd.id}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group ${
                          isDenied ? 'bg-rose-500/[0.04]' : isCritical ? 'bg-amber-500/[0.02]' : ''
                        }`}
                      >
                        {/* Timestamp */}
                        <td className="py-3 px-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {formatDateTime(cmd.timestamp)}
                        </td>

                        {/* Actor */}
                        <td className="py-3 px-3.5">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              {cmd.actor.username}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[140px]" title={cmd.actor.role}>
                              {cmd.actor.role}
                            </span>
                            {cmd.actor.ipAddress && (
                              <span className="text-[10px] font-mono text-slate-400">
                                {cmd.actor.ipAddress}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Target Device */}
                        <td className="py-3 px-3.5">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white">
                                {cmd.deviceName}
                              </span>
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                cmd.deviceVendor === 'mikrotik'
                                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                  : cmd.deviceVendor === 'linux'
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                  : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                              }`}>
                                {cmd.deviceVendor}
                              </span>
                            </div>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              IP: {cmd.deviceIp}
                            </span>
                            {cmd.deviceModel && (
                              <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                {cmd.deviceModel}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Executed Command & Physical Location */}
                        <td className="py-3 px-3.5">
                          <div className="space-y-1.5">
                            {/* Command Snippet Block */}
                            <div className="relative group/cmd">
                              <pre className="p-2 rounded-lg bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-w-xl whitespace-pre-wrap leading-relaxed border border-slate-800">
                                <span className="text-emerald-400 select-none">$ </span>
                                {cmd.command}
                              </pre>
                              <button
                                onClick={() => handleCopy(cmd.command, cmd.id)}
                                className="absolute top-1.5 ltr:right-1.5 rtl:left-1.5 p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 opacity-0 group-hover/cmd:opacity-100 transition text-[10px] flex items-center gap-1"
                                title={isEn ? 'Copy command' : 'کپی دستور'}
                              >
                                {copiedId === cmd.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>

                            {/* Location & Operator Notes */}
                            <div className="flex items-center gap-2 flex-wrap text-[11px]">
                              {cmd.deviceLocation && (
                                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  <span>{cmd.deviceLocation}</span>
                                </span>
                              )}
                              {cmd.notes && (
                                <span className="text-slate-400 dark:text-slate-500 italic">
                                  — {cmd.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Channel & Risk */}
                        <td className="py-3 px-3.5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {getRiskBadge(cmd.riskLevel)}
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              {cmd.channel === 'terminal_interactive'
                                ? (isEn ? 'Interactive CLI' : 'ترمینال تعاملی')
                                : cmd.channel === 'template_push'
                                ? (isEn ? 'Template Apply' : 'اعمال الگو')
                                : cmd.channel === 'port_context_menu'
                                ? (isEn ? 'Port Context Menu' : 'راست‌کلیک پورت')
                                : (isEn ? 'Batch Config' : 'پیکربندی گروهی')}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          {cmd.status === 'success' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {isEn ? 'Success' : 'موفق'}
                            </span>
                          ) : cmd.status === 'denied' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400" title={isEn ? 'Blocked by RBAC Access Policy' : 'مسدودشده توسط پالیسی‌های امنیتی'}>
                              <ShieldAlert className="w-3.5 h-3.5" />
                              {isEn ? 'RBAC Blocked' : 'مسدود امنیتی'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/15 text-red-600 dark:text-red-400">
                              <XCircle className="w-3.5 h-3.5" />
                              {isEn ? 'Failed' : 'ناموفق'}
                            </span>
                          )}
                        </td>

                        {/* Action View */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <button
                            onClick={() => setSelectedCommandLog(cmd)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 text-slate-600 dark:text-slate-300 hover:text-cyan-600 transition"
                            title={isEn ? 'View output & details' : 'مشاهده خروجی و جزئیات'}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PORTAL LOG DETAIL INSPECTION MODAL */}
      {selectedPortalLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                  <ScrollText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {isEn ? selectedPortalLog.title_en : selectedPortalLog.title}
                  </h3>
                  <span className="font-mono text-xs text-slate-400">
                    ID: {selectedPortalLog.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPortalLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* If Decommissioned Device: Highlight Location & Specs banner */}
              {selectedPortalLog.action.includes('DELETED') && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-2">
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                    <Trash2 className="w-4 h-4" />
                    <span>{isEn ? 'Decommissioned Device Snapshot' : 'مشخصات شناسنامه‌ای تجهیز حذف‌شده'}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300">
                    {isEn
                      ? 'This device was completely deleted from inventory. Its full hardware identity and physical location were archived for audit compliance:'
                      : 'این تجهیز از موجودی سامانه حذف گردیده و مشخصات کامل سخت‌افزاری و محل استقرار آن جهت انطباق امنیتی در لاگ بایگانی شده است:'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[11px] bg-white dark:bg-slate-900 p-3 rounded-lg border border-rose-200 dark:border-rose-900/40">
                    <div>
                      <span className="text-slate-400 block">{isEn ? 'Device Name:' : 'نام دیوایس:'}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{selectedPortalLog.target.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">{isEn ? 'IP Address:' : 'آدرس IP:'}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{selectedPortalLog.target.ip || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">{isEn ? 'Model:' : 'مدل دستگاه:'}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{selectedPortalLog.target.model || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">{isEn ? 'Total Ports:' : 'تعداد پورت‌ها:'}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{selectedPortalLog.target.portsCount || 'N/A'}</span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-indigo-500 font-sans font-semibold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {isEn ? 'Physical Location at Deletion:' : 'محل استقرار فیزیکی هنگام حذف:'}
                      </span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 block mt-0.5">
                        {selectedPortalLog.target.location || 'محل نامشخص'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Event Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEn ? 'Operator:' : 'کاربر انجام‌دهنده:'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedPortalLog.actor.username} ({selectedPortalLog.actor.role})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEn ? 'Operator IP:' : 'آدرس IP کاربر:'}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedPortalLog.actor.ipAddress || '127.0.0.1'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEn ? 'Timestamp:' : 'زمان دقیق:'}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{new Date(selectedPortalLog.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEn ? 'Action Code:' : 'کد رویداد:'}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedPortalLog.action}</span>
                </div>
              </div>

              {/* Full Details Text */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {isEn ? 'Full Description & Audit Record:' : 'شرح کامل رویداد:'}
                </h4>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed">
                  {isEn ? selectedPortalLog.details_en : selectedPortalLog.details}
                </div>
              </div>

              {/* Raw JSON Payload */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {isEn ? 'Target Metadata (JSON):' : 'متادیتای کامل آبجکت (JSON):'}
                  </h4>
                  <button
                    onClick={() => handleCopy(JSON.stringify(selectedPortalLog.target, null, 2), 'target-json')}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    {copiedId === 'target-json' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{isEn ? 'Copy JSON' : 'کپی متادیتا'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48 border border-slate-800">
                  {JSON.stringify(selectedPortalLog.target, null, 2)}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
              <button
                onClick={() => setSelectedPortalLog(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                {isEn ? 'Close' : 'بستن'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMMAND LOG DETAIL INSPECTION MODAL */}
      {selectedCommandLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-500">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{selectedCommandLog.deviceName}</span>
                    <span className="font-mono text-xs text-slate-400">({selectedCommandLog.deviceIp})</span>
                  </h3>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {selectedCommandLog.deviceLocation}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCommandLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Status Alert if Blocked */}
              {selectedCommandLog.status === 'denied' && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <div>
                    <span className="font-bold block">{isEn ? 'Blocked by Security Access Policy (RBAC)' : 'مسدودشده توسط پالیسی امنیتی سامانه'}</span>
                    <span className="text-[11px] text-rose-700 dark:text-rose-300">
                      {isEn ? 'This command was blocked before reaching the network device due to privilege restrictions.' : 'این دستور به دلیل عدم تطابق سطح دسترسی کاربر، پیش از ارسال به دستگاه متوقف و ممیزی شد.'}
                    </span>
                  </div>
                </div>
              )}

              {/* Command Details Header Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEn ? 'Operator:' : 'اپراتور فرمان:'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedCommandLog.actor.username} ({selectedCommandLog.actor.role})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEn ? 'Channel:' : 'کانال اجرا:'}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedCommandLog.channel}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEn ? 'Risk Level:' : 'سطح ریسک دستور:'}</span>
                  <span className="mt-0.5 inline-block">{getRiskBadge(selectedCommandLog.riskLevel)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEn ? 'Execution Time:' : 'مدت اجرا:'}</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300">{selectedCommandLog.durationMs ? `${selectedCommandLog.durationMs} ms` : 'Instant'}</span>
                </div>
              </div>

              {/* Exact Executed Command Block */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-cyan-500" />
                    <span>{isEn ? 'CLI Command Syntax:' : 'متن دستور ارسالی به تجهیز:'}</span>
                  </h4>
                  <button
                    onClick={() => handleCopy(selectedCommandLog.command, 'cmd-code')}
                    className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    {copiedId === 'cmd-code' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{isEn ? 'Copy Command' : 'کپی دستور'}</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-slate-950 text-cyan-300 font-mono text-xs overflow-x-auto border border-slate-800 whitespace-pre-wrap">
                  {selectedCommandLog.command}
                </pre>
              </div>

              {/* Execution Output / Terminal Response */}
              {selectedCommandLog.outputSummary && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{isEn ? 'Hardware Output Response:' : 'پاسخ و خروجی دریافتی از دستگاه:'}</span>
                    </h4>
                    <button
                      onClick={() => handleCopy(selectedCommandLog.outputSummary || '', 'output-code')}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      {copiedId === 'output-code' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{isEn ? 'Copy Output' : 'کپی پاسخ'}</span>
                    </button>
                  </div>
                  <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-56 border border-slate-800 whitespace-pre-wrap">
                    {selectedCommandLog.outputSummary}
                  </pre>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
              <button
                onClick={() => setSelectedCommandLog(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                {isEn ? 'Close' : 'بستن'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PURGE CONFIRMATION MODAL */}
      {isConfirmPurgeOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isEn ? 'Clear Audit Trail?' : 'تایید پاکسازی دفتر وقایع ممیزی'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isEn
                    ? 'Are you sure you want to clear the logs for the active view?'
                    : 'آیا از پاکسازی لاگ‌های این بخش اطمینان دارید؟ این عملیات غیرقابل بازگشت است.'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
              {activeSection === 'portal'
                ? (isEn ? 'This will delete all Portal administrative audit events.' : 'این کار تمام رویدادهای اداری، تغییرات کاربر و تجهیزات را پاک می‌کند.')
                : (isEn ? 'This will delete all Device CLI execution logs.' : 'این کار تمام تاریخچه دستورات ارسالی به تجهیزات را پاک می‌کند.')}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsConfirmPurgeOpen(false)}
                className="px-4 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
              >
                {isEn ? 'Cancel' : 'انصراف'}
              </button>
              <button
                onClick={() => {
                  if (activeSection === 'portal') clearPortalLogs();
                  else clearCommandLogs();
                  refreshData();
                  setIsConfirmPurgeOpen(false);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm"
              >
                {isEn ? 'Yes, Purge Logs' : 'بله، پاکسازی شود'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
