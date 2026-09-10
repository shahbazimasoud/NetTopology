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
  ChevronDown,
  Monitor,
  Activity,
  ArrowRight,
  Sparkles,
  Sliders,
  Maximize2
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
type CommandGroupMode = 'device' | 'user' | 'timeline';

interface WatchLogSession {
  targetDeviceName: string;
  targetDeviceId: string;
  targetDeviceIp: string;
  targetDeviceVendor: string;
  targetDeviceModel?: string;
  targetDeviceLocation?: string;
  operatorUsername: string;
  operatorRole: string;
  operatorIp?: string;
  activityDates: string[];
  commands: DeviceCommandLogEntry[];
}

export const AuditLogsView: React.FC = () => {
  const { t, isEn, isRtl } = useLanguage();
  const [activeSection, setActiveSection] = useState<ActiveLogSection>('commands');
  const [commandGroupMode, setCommandGroupMode] = useState<CommandGroupMode>('device');

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

  // Selected entities in Grouped views
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);

  // Watch Log modal state
  const [activeWatchSession, setActiveWatchSession] = useState<WatchLogSession | null>(null);
  const [watchSearchQuery, setWatchSearchQuery] = useState('');

  // Modal inspection state for single items
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
        (cmd.deviceLocation && cmd.deviceLocation.toLowerCase().includes(q)) ||
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
    const deviceEvents = portalLogs.filter((p) => p.category === 'device_inventory').length;
    const criticalActions =
      portalLogs.filter((p) => p.severity === 'critical').length +
      commandLogs.filter((c) => c.riskLevel === 'critical' || c.status === 'denied').length;
    const blockedCount = commandLogs.filter((c) => c.status === 'denied').length;

    // Unique devices operated on
    const uniqueDevicesCount = new Set(commandLogs.map((c) => c.deviceName)).size;
    // Unique operators
    const uniqueUsersCount = new Set(commandLogs.map((c) => c.actor.username)).size;

    return { totalPortal, totalCommands, deviceEvents, criticalActions, blockedCount, uniqueDevicesCount, uniqueUsersCount };
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

  const formatDateOnly = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(isEn ? 'en-US' : 'fa-IR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return iso;
    }
  };

  // Grouped by Device Calculation
  const deviceGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        deviceId: string;
        deviceName: string;
        deviceIp: string;
        deviceVendor: 'cisco' | 'mikrotik' | 'linux';
        deviceModel?: string;
        deviceLocation?: string;
        totalCommands: number;
        lastActive: string;
        hasCritical: boolean;
        hasDenied: boolean;
        userMap: Map<
          string,
          {
            username: string;
            role: string;
            fullName?: string;
            ipAddress?: string;
            commands: DeviceCommandLogEntry[];
            activityDates: Set<string>;
          }
        >;
      }
    >();

    filteredCommandLogs.forEach((cmd) => {
      const key = cmd.deviceName || cmd.deviceId;
      if (!map.has(key)) {
        map.set(key, {
          deviceId: cmd.deviceId,
          deviceName: cmd.deviceName,
          deviceIp: cmd.deviceIp,
          deviceVendor: cmd.deviceVendor,
          deviceModel: cmd.deviceModel,
          deviceLocation: cmd.deviceLocation,
          totalCommands: 0,
          lastActive: cmd.timestamp,
          hasCritical: false,
          hasDenied: false,
          userMap: new Map(),
        });
      }

      const devEntry = map.get(key)!;
      devEntry.totalCommands += 1;
      if (new Date(cmd.timestamp) > new Date(devEntry.lastActive)) {
        devEntry.lastActive = cmd.timestamp;
      }
      if (cmd.riskLevel === 'critical') devEntry.hasCritical = true;
      if (cmd.status === 'denied') devEntry.hasDenied = true;

      const userKey = cmd.actor.username;
      if (!devEntry.userMap.has(userKey)) {
        devEntry.userMap.set(userKey, {
          username: cmd.actor.username,
          role: cmd.actor.role,
          ipAddress: cmd.actor.ipAddress,
          commands: [],
          activityDates: new Set(),
        });
      }

      const uEntry = devEntry.userMap.get(userKey)!;
      uEntry.commands.push(cmd);
      uEntry.activityDates.add(formatDateTime(cmd.timestamp));
    });

    return Array.from(map.values())
      .map((dev) => ({
        ...dev,
        users: Array.from(dev.userMap.values())
          .map((u) => ({
            username: u.username,
            role: u.role,
            ipAddress: u.ipAddress,
            commandsCount: u.commands.length,
            lastActive: u.commands[0]?.timestamp || '',
            hasCritical: u.commands.some((c) => c.riskLevel === 'critical'),
            hasDenied: u.commands.some((c) => c.status === 'denied'),
            activityDates: Array.from(u.activityDates),
            commands: u.commands.sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            ),
          }))
          .sort((a, b) => b.commandsCount - a.commandsCount),
      }))
      .sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());
  }, [filteredCommandLogs, isEn]);

  // Grouped by User Calculation
  const userGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        username: string;
        role: string;
        ipAddress?: string;
        totalCommands: number;
        lastActive: string;
        hasCritical: boolean;
        hasDenied: boolean;
        deviceMap: Map<
          string,
          {
            deviceId: string;
            deviceName: string;
            deviceIp: string;
            deviceVendor: 'cisco' | 'mikrotik' | 'linux';
            deviceModel?: string;
            deviceLocation?: string;
            commands: DeviceCommandLogEntry[];
            activityDates: Set<string>;
          }
        >;
      }
    >();

    filteredCommandLogs.forEach((cmd) => {
      const userKey = cmd.actor.username;
      if (!map.has(userKey)) {
        map.set(userKey, {
          username: cmd.actor.username,
          role: cmd.actor.role,
          ipAddress: cmd.actor.ipAddress,
          totalCommands: 0,
          lastActive: cmd.timestamp,
          hasCritical: false,
          hasDenied: false,
          deviceMap: new Map(),
        });
      }

      const userEntry = map.get(userKey)!;
      userEntry.totalCommands += 1;
      if (new Date(cmd.timestamp) > new Date(userEntry.lastActive)) {
        userEntry.lastActive = cmd.timestamp;
      }
      if (cmd.riskLevel === 'critical') userEntry.hasCritical = true;
      if (cmd.status === 'denied') userEntry.hasDenied = true;

      const devKey = cmd.deviceName || cmd.deviceId;
      if (!userEntry.deviceMap.has(devKey)) {
        userEntry.deviceMap.set(devKey, {
          deviceId: cmd.deviceId,
          deviceName: cmd.deviceName,
          deviceIp: cmd.deviceIp,
          deviceVendor: cmd.deviceVendor,
          deviceModel: cmd.deviceModel,
          deviceLocation: cmd.deviceLocation,
          commands: [],
          activityDates: new Set(),
        });
      }

      const devItem = userEntry.deviceMap.get(devKey)!;
      devItem.commands.push(cmd);
      devItem.activityDates.add(formatDateTime(cmd.timestamp));
    });

    return Array.from(map.values())
      .map((u) => ({
        ...u,
        devices: Array.from(u.deviceMap.values())
          .map((d) => ({
            deviceId: d.deviceId,
            deviceName: d.deviceName,
            deviceIp: d.deviceIp,
            deviceVendor: d.deviceVendor,
            deviceModel: d.deviceModel,
            deviceLocation: d.deviceLocation,
            commandsCount: d.commands.length,
            lastActive: d.commands[0]?.timestamp || '',
            hasCritical: d.commands.some((c) => c.riskLevel === 'critical'),
            hasDenied: d.commands.some((c) => c.status === 'denied'),
            activityDates: Array.from(d.activityDates),
            commands: d.commands.sort(
              (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            ),
          }))
          .sort((a, b) => b.commandsCount - a.commandsCount),
      }))
      .sort((a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime());
  }, [filteredCommandLogs, isEn]);

  // Set default selected device / user when list changes
  useEffect(() => {
    if (deviceGroups.length > 0 && (!selectedDeviceId || !deviceGroups.some((d) => d.deviceName === selectedDeviceId))) {
      setSelectedDeviceId(deviceGroups[0].deviceName);
    }
  }, [deviceGroups, selectedDeviceId]);

  useEffect(() => {
    if (userGroups.length > 0 && (!selectedUsername || !userGroups.some((u) => u.username === selectedUsername))) {
      setSelectedUsername(userGroups[0].username);
    }
  }, [userGroups, selectedUsername]);

  // Currently selected device object
  const activeDeviceGroup = useMemo(() => {
    if (!selectedDeviceId) return deviceGroups[0] || null;
    return deviceGroups.find((d) => d.deviceName === selectedDeviceId) || deviceGroups[0] || null;
  }, [deviceGroups, selectedDeviceId]);

  // Currently selected user object
  const activeUserGroup = useMemo(() => {
    if (!selectedUsername) return userGroups[0] || null;
    return userGroups.find((u) => u.username === selectedUsername) || userGroups[0] || null;
  }, [userGroups, selectedUsername]);

  // Filtered commands inside the Watch Log modal
  const filteredWatchCommands = useMemo(() => {
    if (!activeWatchSession) return [];
    if (!watchSearchQuery.trim()) return activeWatchSession.commands;
    const q = watchSearchQuery.toLowerCase();
    return activeWatchSession.commands.filter(
      (c) =>
        c.command.toLowerCase().includes(q) ||
        (c.notes && c.notes.toLowerCase().includes(q)) ||
        (c.outputSummary && c.outputSummary.toLowerCase().includes(q)) ||
        c.riskLevel.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q)
    );
  }, [activeWatchSession, watchSearchQuery]);

  // Badges
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
            {isEn ? 'CRITICAL' : 'بحرانی'}
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

  const getVendorBadge = (vendor: string) => {
    switch (vendor.toLowerCase()) {
      case 'mikrotik':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            MikroTik
          </span>
        );
      case 'linux':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            Linux
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            Cisco
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

  // Open Watch Log helper
  const handleOpenWatchLog = (
    deviceName: string,
    deviceId: string,
    deviceIp: string,
    deviceVendor: string,
    deviceModel: string | undefined,
    deviceLocation: string | undefined,
    user: {
      username: string;
      role: string;
      ipAddress?: string;
      activityDates: string[];
      commands: DeviceCommandLogEntry[];
    }
  ) => {
    setActiveWatchSession({
      targetDeviceName: deviceName,
      targetDeviceId: deviceId,
      targetDeviceIp: deviceIp,
      targetDeviceVendor: deviceVendor,
      targetDeviceModel: deviceModel,
      targetDeviceLocation: deviceLocation,
      operatorUsername: user.username,
      operatorRole: user.role,
      operatorIp: user.ipAddress,
      activityDates: user.activityDates,
      commands: user.commands,
    });
    setWatchSearchQuery('');
  };

  return (
    <div className="p-3 sm:p-5 md:p-6 space-y-6 max-w-7xl mx-auto font-sans animate-fadeIn">
      {/* Dynamic Header Banner - Theme Harmonized with spatial-glass */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 rounded-2xl audit-glass-panel shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-lg shadow-indigo-500/30 border border-white/20 shrink-0">
            <ScrollText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg md:text-xl font-bold text-white tracking-tight flex items-center gap-2 font-mono">
                <span>{isEn ? 'Audit & Command Logs' : 'مرکز ممیزی، لاگ‌ها و وقایع شبکه'}</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>SIEM Active</span>
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              {isEn
                ? 'Dual-stream operational audit trail: administrative lifecycle events, user actions, and device command execution with Watch Log inspection.'
                : 'ردیابی و ممیزی جامع وقایع پرتال، تغییرات تجهیزات و موجودی، و تفکیک فرامین اجرایی بر اساس دیوایس و اپراتور با قابلیت واچ لاگ.'}
            </p>
          </div>
        </div>

        {/* Global Toolbar Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : 'text-slate-300'}`} />
            <span>{isEn ? 'Refresh' : 'بروزرسانی'}</span>
          </button>

          <button
            onClick={() => {
              if (activeSection === 'portal') exportPortalLogsAsCsv();
              else exportCommandLogsAsCsv();
            }}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            title={isEn ? 'Export active view to CSV' : 'استخراج به فایل CSV'}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>{isEn ? 'Export CSV' : 'خروجی CSV'}</span>
          </button>

          <button
            onClick={exportAllLogsAsJson}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 active:scale-95 text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            title={isEn ? 'Export all logs as JSON for SIEM integration' : 'خروجی کامل به فرمت JSON برای ممیزی و SIEM'}
          >
            <FileJson className="w-3.5 h-3.5 text-cyan-400" />
            <span>{isEn ? 'SIEM JSON' : 'خروجی JSON'}</span>
          </button>

          <button
            onClick={() => setIsConfirmPurgeOpen(true)}
            className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            title={isEn ? 'Purge logs' : 'پاکسازی لاگ‌ها'}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isEn ? 'Clear' : 'پاکسازی'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row - Theme-Harmonized */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Portal Events */}
        <div className="p-4 rounded-2xl audit-glass-panel border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">
              {isEn ? 'Portal Audit Events' : 'وقایع پرتال و سیستم'}
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{stats.totalPortal}</span>
            <span className="text-[11px] text-slate-400 font-medium">{isEn ? 'events' : 'رویداد'}</span>
          </div>
        </div>

        {/* Devices Operated */}
        <div className="p-4 rounded-2xl audit-glass-panel border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">
              {isEn ? 'Devices with Activity' : 'دیوایس‌های دارای دستور'}
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
              <Server className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-400 font-mono">{stats.uniqueDevicesCount}</span>
            <span className="text-[11px] text-slate-400 font-medium">
              {isEn ? `from ${commandLogs.length} cmds` : `از ${commandLogs.length} دستور`}
            </span>
          </div>
        </div>

        {/* Active Operators */}
        <div className="p-4 rounded-2xl audit-glass-panel border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">
              {isEn ? 'Active Operators' : 'اپراتورهای مجری دستور'}
            </span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-400 font-mono">{stats.uniqueUsersCount}</span>
            <span className="text-[11px] text-slate-400 font-medium">{isEn ? 'active users' : 'کاربر فعال'}</span>
          </div>
        </div>

        {/* Blocked / Security Violations */}
        <div className="p-4 rounded-2xl audit-glass-panel border border-white/10 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300">
              {isEn ? 'RBAC Violations / Blocked' : 'فرامین مسدودشده امنیتی'}
            </span>
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/20">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400 font-mono">{stats.blockedCount}</span>
            <span className="text-[11px] text-rose-400/80 font-medium">{isEn ? 'denied' : 'مسدود امنیتی'}</span>
          </div>
        </div>
      </div>

      {/* Main Section Navigation Switcher (Two Core Streams) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 audit-glass-panel rounded-2xl border border-white/10">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {/* Section 2 (Commands & Device Logs - Priority) */}
          <button
            onClick={() => {
              setActiveSection('commands');
              setSelectedCategory('all');
            }}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSection === 'commands'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>{isEn ? 'Device Command & Execution Logs' : 'لاگ‌های فرامین و عملیات تجهیزات شبکه'}</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-black/20 text-white border border-white/10">
              {commandLogs.length}
            </span>
          </button>

          {/* Section 1: Portal & System Audit */}
          <button
            onClick={() => {
              setActiveSection('portal');
              setSelectedCategory('all');
            }}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSection === 'portal'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/40'
                : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{isEn ? 'Portal & Administrative Events' : 'لاگ‌های ثبتی پورتال و سیستم'}</span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono bg-black/20 text-white border border-white/10">
              {portalLogs.length}
            </span>
          </button>
        </div>

        {/* Timeframe Presets */}
        <div className="flex items-center gap-1.5 self-center sm:self-auto text-xs px-2 py-1 bg-black/20 rounded-xl border border-white/5">
          <span className="text-slate-400 text-[11px] hidden md:inline px-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{isEn ? 'Timeframe:' : 'بازه:'}</span>
          </span>
          {(['all', '1h', '24h', '7d'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedTimeframe(period)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                selectedTimeframe === period
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              {period === 'all'
                ? (isEn ? 'All' : 'کل')
                : period === '1h'
                ? (isEn ? '1h' : '۱ ساعت')
                : period === '24h'
                ? (isEn ? '24h' : '۲۴ ساعت')
                : (isEn ? '7d' : '۷ روز')}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 2: DEVICE COMMANDS - With Categorization by Device or User */}
      {activeSection === 'commands' && (
        <div className="space-y-4">
          {/* Sub-toolbar: Grouping Mode Switcher & Filter Toolbar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-3.5 rounded-2xl audit-glass-panel border border-white/10">
            {/* Grouping mode buttons */}
            <div className="flex items-center gap-1.5 p-1 bg-black/25 rounded-xl border border-white/5 overflow-x-auto shrink-0">
              <button
                onClick={() => setCommandGroupMode('device')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  commandGroupMode === 'device'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>{isEn ? 'Group by Device' : 'دسته‌بندی بر اساس دیوایس'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-white">
                  {deviceGroups.length}
                </span>
              </button>

              <button
                onClick={() => setCommandGroupMode('user')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  commandGroupMode === 'user'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>{isEn ? 'Group by User' : 'دسته‌بندی بر اساس کاربر'}</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 text-white">
                  {userGroups.length}
                </span>
              </button>

              <button
                onClick={() => setCommandGroupMode('timeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap ${
                  commandGroupMode === 'timeline'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{isEn ? 'All Commands Timeline' : 'لیست جامع زمانی'}</span>
              </button>
            </div>

            {/* Search and Filters */}
            <div className="flex items-center gap-2 flex-1 max-w-xl">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 text-slate-400 ltr:left-3 rtl:right-3" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={
                    commandGroupMode === 'device'
                      ? (isEn ? 'Search devices, IP, commands, user...' : 'جستجوی نام دیوایس، IP، کاربر، مکان، یا دستور...')
                      : commandGroupMode === 'user'
                      ? (isEn ? 'Search operator username, role, command...' : 'جستجوی نام کاربر، نقش، آی‌پی، یا دستور...')
                      : (isEn ? 'Search executed command text, device, user...' : 'جستجو در متن دستور، دیوایس، کاربر...')
                  }
                  className="w-full text-xs py-2 rounded-xl bg-black/20 hover:bg-black/30 focus:bg-black/30 border border-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ltr:pl-9 ltr:pr-8 rtl:pr-9 rtl:pl-8"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-white ltr:right-2.5 rtl:left-2.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Vendor filter */}
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="text-xs py-2 px-2.5 rounded-xl bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shrink-0"
              >
                <option value="all" className="bg-slate-900 text-white">{isEn ? 'All Vendors' : 'همه سازندگان'}</option>
                <option value="cisco" className="bg-slate-900 text-white">Cisco</option>
                <option value="mikrotik" className="bg-slate-900 text-white">MikroTik</option>
                <option value="linux" className="bg-slate-900 text-white">Linux</option>
              </select>
            </div>
          </div>

          {/* VIEW MODE 1: GROUP BY DEVICE (Requested primary view) */}
          {commandGroupMode === 'device' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left Column (5 cols): List of Devices with Activity */}
              <div className="lg:col-span-5 audit-glass-panel rounded-2xl border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs md:text-sm font-bold text-white">
                      {isEn ? 'Devices with Activity' : 'دیوایس‌های دارای سابقه عملیات'}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-300">
                    {deviceGroups.length} {isEn ? 'devices' : 'تجهیز'}
                  </span>
                </div>

                {/* Device Cards List */}
                <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1 custom-scrollbar">
                  {deviceGroups.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <Server className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                      <p className="text-xs">{isEn ? 'No devices found matching filters' : 'هیچ دیوایسی با این شرایط یافت نشد'}</p>
                    </div>
                  ) : (
                    deviceGroups.map((dev) => {
                      const isSelected = selectedDeviceId === dev.deviceName;
                      return (
                        <div
                          key={dev.deviceName}
                          onClick={() => setSelectedDeviceId(dev.deviceName)}
                          className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer audit-card-item relative ${
                            isSelected
                              ? 'active ring-1 ring-indigo-500/50 shadow-lg'
                              : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`p-2 rounded-lg border ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white border-indigo-400/40'
                                    : 'bg-white/5 text-slate-300 border-white/10'
                                }`}
                              >
                                <Server className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-white font-mono">
                                    {dev.deviceName}
                                  </span>
                                  {getVendorBadge(dev.deviceVendor)}
                                </div>
                                <span className="font-mono text-[11px] text-slate-300 block">
                                  {dev.deviceIp} {dev.deviceModel ? `• ${dev.deviceModel}` : ''}
                                </span>
                              </div>
                            </div>

                            {/* Badge count of commands */}
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                              {dev.totalCommands} {isEn ? 'cmds' : 'دستور'}
                            </span>
                          </div>

                          {/* Location & Meta info */}
                          {dev.deviceLocation && (
                            <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center gap-1.5 text-[11px] text-slate-400">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{dev.deviceLocation}</span>
                            </div>
                          )}

                          {/* Summary of operators and dates */}
                          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{dev.users.length} {isEn ? 'operators' : 'کاربر مجری'}</span>
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {formatDateTime(dev.lastActive)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column (7 cols): Selected Device Details & Users List */}
              <div className="lg:col-span-7 audit-glass-panel rounded-2xl border border-white/10 p-5 space-y-4">
                {activeDeviceGroup ? (
                  <>
                    {/* Device Header Banner */}
                    <div className="p-4 rounded-xl bg-black/25 border border-white/10 space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <h2 className="text-base font-bold text-white font-mono">
                              {activeDeviceGroup.deviceName}
                            </h2>
                            {getVendorBadge(activeDeviceGroup.deviceVendor)}
                            <span className="font-mono text-xs text-cyan-400 font-bold">
                              {activeDeviceGroup.deviceIp}
                            </span>
                          </div>
                          {activeDeviceGroup.deviceModel && (
                            <p className="text-xs text-slate-300 mt-0.5">
                              {activeDeviceGroup.deviceModel}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-left rtl:text-right">
                            <span className="text-[10px] text-slate-400 block">{isEn ? 'Total Commands' : 'مجموع فرامین'}</span>
                            <span className="font-mono font-bold text-white text-sm">{activeDeviceGroup.totalCommands}</span>
                          </div>
                          <div className="h-6 w-px bg-white/10 mx-1"></div>
                          <div className="text-left rtl:text-right">
                            <span className="text-[10px] text-slate-400 block">{isEn ? 'Distinct Users' : 'کاربران مجزا'}</span>
                            <span className="font-mono font-bold text-white text-sm">{activeDeviceGroup.users.length}</span>
                          </div>
                        </div>
                      </div>

                      {activeDeviceGroup.deviceLocation && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                          <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{activeDeviceGroup.deviceLocation}</span>
                        </div>
                      )}
                    </div>

                    {/* Section Title */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-indigo-400" />
                        <h3 className="text-sm font-bold text-white">
                          {isEn ? 'Operators who executed commands on this device:' : 'کاربرانی که روی این دیوایس دستور اجرا کرده‌اند:'}
                        </h3>
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        {activeDeviceGroup.users.length} {isEn ? 'records' : 'کاربر'}
                      </span>
                    </div>

                    {/* Users list with prominent WATCH LOG button */}
                    <div className="space-y-3">
                      {activeDeviceGroup.users.map((userItem) => {
                        return (
                          <div
                            key={userItem.username}
                            className="p-4 rounded-xl border border-white/10 hover:border-indigo-500/40 bg-white/[0.03] transition-all space-y-3 audit-card-item shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              {/* User identity */}
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600/30 to-purple-600/30 border border-indigo-500/30 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                  {userItem.username.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm font-mono">
                                      {userItem.username}
                                    </span>
                                    {userItem.hasCritical && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                        {isEn ? 'CRITICAL OPS' : 'عملیات بحرانی'}
                                      </span>
                                    )}
                                    {userItem.hasDenied && (
                                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                        {isEn ? 'BLOCKED OPS' : 'تلاش مسدودشده'}
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-400 block">
                                    {userItem.role} {userItem.ipAddress ? `• IP: ${userItem.ipAddress}` : ''}
                                  </span>
                                </div>
                              </div>

                              {/* Prominent WATCH LOG button */}
                              <button
                                onClick={() =>
                                  handleOpenWatchLog(
                                    activeDeviceGroup.deviceName,
                                    activeDeviceGroup.deviceId,
                                    activeDeviceGroup.deviceIp,
                                    activeDeviceGroup.deviceVendor,
                                    activeDeviceGroup.deviceModel,
                                    activeDeviceGroup.deviceLocation,
                                    userItem
                                  )
                                }
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-indigo-500/25 border border-indigo-400/40 cursor-pointer"
                                title={isEn ? 'Watch all commands executed by this user' : 'مشاهده لاگ تمام کامندهای اجرا شده'}
                              >
                                <Eye className="w-4 h-4" />
                                <span>{isEn ? 'Watch Log' : 'واچ لاگ'}</span>
                                <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180 text-white/70" />
                              </button>
                            </div>

                            {/* Activity dates & command overview */}
                            <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 text-slate-300">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>
                                  {isEn ? 'Active Timestamps:' : 'تاریخ‌ها و زمان‌های فعالیت:'}{' '}
                                  <span className="font-mono text-white text-[11px]">
                                    {userItem.activityDates.slice(0, 3).join(' ، ')}
                                    {userItem.activityDates.length > 3 ? ` و ${userItem.activityDates.length - 3} مورد دیگر` : ''}
                                  </span>
                                </span>
                              </div>

                              <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-[11px] text-cyan-400">
                                <Code2 className="w-3.5 h-3.5" />
                                <span>
                                  {userItem.commandsCount} {isEn ? 'commands recorded' : 'دستور ثبت‌شده'}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="py-16 text-center text-slate-400">
                    <Server className="w-10 h-10 mx-auto opacity-30 mb-2" />
                    <p className="text-sm">{isEn ? 'Select a device from the left list' : 'لطفاً یک دیوایس را از لیست سمت چپ انتخاب نمایید'}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW MODE 2: GROUP BY USER */}
          {commandGroupMode === 'user' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              {/* Left Column (5 cols): List of Users */}
              <div className="lg:col-span-5 audit-glass-panel rounded-2xl border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-purple-400" />
                    <h3 className="text-xs md:text-sm font-bold text-white">
                      {isEn ? 'Operators Active on Hardware' : 'کاربران مجری فرامین بر روی تجهیزات'}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-300">
                    {userGroups.length} {isEn ? 'operators' : 'اپراتور'}
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1 custom-scrollbar">
                  {userGroups.map((u) => {
                    const isSelected = selectedUsername === u.username;
                    return (
                      <div
                        key={u.username}
                        onClick={() => setSelectedUsername(u.username)}
                        className={`p-3.5 rounded-xl border transition-all duration-200 cursor-pointer audit-card-item ${
                          isSelected
                            ? 'active ring-1 ring-indigo-500/50 shadow-lg'
                            : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-400/40'
                                  : 'bg-white/5 text-slate-300 border-white/10'
                              }`}
                            >
                              {u.username.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-sm text-white font-mono block">
                                {u.username}
                              </span>
                              <span className="text-[11px] text-slate-300 block truncate max-w-[170px]">
                                {u.role}
                              </span>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
                            {u.totalCommands} {isEn ? 'cmds' : 'دستور'}
                          </span>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Server className="w-3 h-3 text-slate-400" />
                            <span>{u.devices.length} {isEn ? 'devices managed' : 'تجهیز مختلف'}</span>
                          </span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {formatDateTime(u.lastActive)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column (7 cols): Selected User's Devices */}
              <div className="lg:col-span-7 audit-glass-panel rounded-2xl border border-white/10 p-5 space-y-4">
                {activeUserGroup ? (
                  <>
                    <div className="p-4 rounded-xl bg-black/25 border border-white/10 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white font-bold text-base shadow-md">
                          {activeUserGroup.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-white font-mono">
                            {activeUserGroup.username}
                          </h2>
                          <span className="text-xs text-slate-300 block">
                            {activeUserGroup.role} {activeUserGroup.ipAddress ? `• IP: ${activeUserGroup.ipAddress}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-left rtl:text-right">
                          <span className="text-[10px] text-slate-400 block">{isEn ? 'Devices Operated' : 'دیوایس‌های مدیریت‌شده'}</span>
                          <span className="font-mono font-bold text-white text-sm">{activeUserGroup.devices.length}</span>
                        </div>
                        <div className="h-6 w-px bg-white/10 mx-1"></div>
                        <div className="text-left rtl:text-right">
                          <span className="text-[10px] text-slate-400 block">{isEn ? 'Total Commands' : 'مجموع دستورات'}</span>
                          <span className="font-mono font-bold text-white text-sm">{activeUserGroup.totalCommands}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-sm font-bold text-white">
                          {isEn ? 'Devices operated by this user:' : 'تجهیزاتی که این کاربر روی آن‌ها عملیات انجام داده:'}
                        </h3>
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        {activeUserGroup.devices.length} {isEn ? 'devices' : 'تجهیز'}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {activeUserGroup.devices.map((devItem) => {
                        return (
                          <div
                            key={devItem.deviceName}
                            className="p-4 rounded-xl border border-white/10 hover:border-indigo-500/40 bg-white/[0.03] transition-all space-y-3 audit-card-item shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-cyan-400">
                                  <Server className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-white text-sm font-mono">
                                      {devItem.deviceName}
                                    </span>
                                    {getVendorBadge(devItem.deviceVendor)}
                                    <span className="font-mono text-xs text-slate-400">
                                      {devItem.deviceIp}
                                    </span>
                                  </div>
                                  {devItem.deviceLocation && (
                                    <span className="text-xs text-slate-400 block mt-0.5">
                                      {devItem.deviceLocation}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                onClick={() =>
                                  handleOpenWatchLog(
                                    devItem.deviceName,
                                    devItem.deviceId,
                                    devItem.deviceIp,
                                    devItem.deviceVendor,
                                    devItem.deviceModel,
                                    devItem.deviceLocation,
                                    {
                                      username: activeUserGroup.username,
                                      role: activeUserGroup.role,
                                      ipAddress: activeUserGroup.ipAddress,
                                      activityDates: devItem.activityDates,
                                      commands: devItem.commands,
                                    }
                                  )
                                }
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-indigo-500/25 border border-indigo-400/40 cursor-pointer"
                                title={isEn ? 'Watch all commands executed on this device' : 'مشاهده لاگ دستورات اجرا شده روی این دیوایس'}
                              >
                                <Eye className="w-4 h-4" />
                                <span>{isEn ? 'Watch Log' : 'واچ لاگ'}</span>
                                <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180 text-white/70" />
                              </button>
                            </div>

                            <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 text-slate-300">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>
                                  {isEn ? 'Dates:' : 'تاریخ‌ها:'}{' '}
                                  <span className="font-mono text-white text-[11px]">
                                    {devItem.activityDates.slice(0, 3).join(' ، ')}
                                  </span>
                                </span>
                              </div>

                              <span className="font-mono text-[11px] text-cyan-400">
                                {devItem.commandsCount} {isEn ? 'commands recorded' : 'دستور ثبت‌شده'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="py-16 text-center text-slate-400">
                    <User className="w-10 h-10 mx-auto opacity-30 mb-2" />
                    <p className="text-sm">{isEn ? 'Select an operator from the left list' : 'لطفاً یک کاربر را از لیست انتخاب کنید'}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW MODE 3: TIMELINE (FLAT TABLE VIEW) */}
          {commandGroupMode === 'timeline' && (
            <div className="audit-glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-lg">
              <div className="p-4 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <h2 className="text-xs md:text-sm font-bold text-white">
                    {isEn ? 'Command Execution Raw Audit Records' : 'دفتر فرامین ارسالی: کلیه دستورات اجرا شده در ترمینال، تمپلیت و پورت‌ها'}
                  </h2>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {filteredCommandLogs.length} {isEn ? 'commands' : 'دستور'}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left rtl:text-right border-collapse text-xs audit-table">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-300 font-semibold">
                      <th className="py-3 px-3.5 w-32">{isEn ? 'Timestamp' : 'زمان'}</th>
                      <th className="py-3 px-3.5 w-40">{isEn ? 'Operator' : 'کاربر / اپراتور'}</th>
                      <th className="py-3 px-3.5 w-44">{isEn ? 'Target Device' : 'دیوایس مقصد'}</th>
                      <th className="py-3 px-3.5">{isEn ? 'Executed Command & Location' : 'دستور ارسالی (CLI Command)'}</th>
                      <th className="py-3 px-3.5 w-28 text-center">{isEn ? 'Risk' : 'ریسک'}</th>
                      <th className="py-3 px-3.5 w-24 text-center">{isEn ? 'Status' : 'وضعیت'}</th>
                      <th className="py-3 px-3.5 w-20 text-center">{isEn ? 'Inspect' : 'مشاهده'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {filteredCommandLogs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Terminal className="w-8 h-8 opacity-40 text-slate-400" />
                            <span className="text-sm">{isEn ? 'No commands found matching criteria.' : 'دستوری یافت نشد.'}</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredCommandLogs.map((cmd) => {
                        const isDenied = cmd.status === 'denied';
                        return (
                          <tr key={cmd.id} className="hover:bg-white/[0.03] transition">
                            <td className="py-3 px-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                              {formatDateTime(cmd.timestamp)}
                            </td>
                            <td className="py-3 px-3.5">
                              <span className="font-bold text-white flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" />
                                {cmd.actor.username}
                              </span>
                              <span className="text-[10px] text-slate-400 block truncate max-w-[130px]">
                                {cmd.actor.role}
                              </span>
                            </td>
                            <td className="py-3 px-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white font-mono">{cmd.deviceName}</span>
                                {getVendorBadge(cmd.deviceVendor)}
                              </div>
                              <span className="font-mono text-[11px] text-slate-400 block">
                                {cmd.deviceIp}
                              </span>
                            </td>
                            <td className="py-3 px-3.5">
                              <div className="relative group/cmd max-w-xl">
                                <pre className="p-2 rounded-lg bg-black/40 text-slate-100 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap leading-relaxed border border-white/10">
                                  <span className="text-emerald-400 select-none">$ </span>
                                  {cmd.command}
                                </pre>
                                <button
                                  onClick={() => handleCopy(cmd.command, cmd.id)}
                                  className="absolute top-1.5 ltr:right-1.5 rtl:left-1.5 p-1 rounded bg-black/60 hover:bg-black text-slate-300 opacity-0 group-hover/cmd:opacity-100 transition text-[10px]"
                                  title={isEn ? 'Copy command' : 'کپی دستور'}
                                >
                                  {copiedId === cmd.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-3.5 text-center">
                              {getRiskBadge(cmd.riskLevel)}
                            </td>
                            <td className="py-3 px-3.5 text-center whitespace-nowrap">
                              {cmd.status === 'success' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-500/15 text-emerald-400">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {isEn ? 'Success' : 'موفق'}
                                </span>
                              ) : isDenied ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/15 text-rose-400">
                                  <ShieldAlert className="w-3 h-3" />
                                  {isEn ? 'Blocked' : 'مسدود'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-red-500/15 text-red-400">
                                  <XCircle className="w-3 h-3" />
                                  {isEn ? 'Failed' : 'خطا'}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-3.5 text-center whitespace-nowrap">
                              <button
                                onClick={() => setSelectedCommandLog(cmd)}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition cursor-pointer"
                                title={isEn ? 'View output details' : 'مشاهده جزئیات'}
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
        </div>
      )}

      {/* SECTION 1: PORTAL & SYSTEM AUDIT LOGS TABLE */}
      {activeSection === 'portal' && (
        <div className="space-y-4">
          {/* Filters Bar for Portal */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-3.5 rounded-2xl audit-glass-panel border border-white/10">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 text-slate-400 ltr:left-3 rtl:right-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isEn ? 'Search by user, action, device name, IP, location...' : 'جستجو در نام کاربر، عملیات، نام دیوایس، IP، موقعیت مکانی و رک...'}
                className="w-full text-xs py-2 rounded-xl bg-black/20 hover:bg-black/30 focus:bg-black/30 border border-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ltr:pl-9 ltr:pr-8 rtl:pr-9 rtl:pl-8"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-white ltr:right-2.5 rtl:left-2.5">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs py-2 px-2.5 rounded-xl bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="all" className="bg-slate-900 text-white">{isEn ? 'All Categories' : 'تمام دسته‌بندی‌ها'}</option>
                <option value="device_inventory" className="bg-slate-900 text-white">{isEn ? 'Device Inventory & Locations' : 'موجودی تجهیزات و رک‌ها'}</option>
                <option value="user_management" className="bg-slate-900 text-white">{isEn ? 'User & Identity Management' : 'مدیریت کاربران و هویت'}</option>
                <option value="rbac_policy" className="bg-slate-900 text-white">{isEn ? 'Access Control & Policies' : 'سطوح دسترسی و پالیسی RBAC'}</option>
                <option value="backup_recovery" className="bg-slate-900 text-white">{isEn ? 'Backup & Disaster Recovery' : 'پشتیبان‌گیری و بازیابی'}</option>
                <option value="port_interface" className="bg-slate-900 text-white">{isEn ? 'Port & Interface Operations' : 'عملیات پورت و اینترفیس'}</option>
              </select>

              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="text-xs py-2 px-2.5 rounded-xl bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              >
                <option value="all" className="bg-slate-900 text-white">{isEn ? 'All Severities' : 'همه سطوح اهمیت'}</option>
                <option value="critical" className="bg-slate-900 text-white">{isEn ? 'Critical' : 'بحرانی'}</option>
                <option value="warning" className="bg-slate-900 text-white">{isEn ? 'Warning' : 'هشدار'}</option>
                <option value="notice" className="bg-slate-900 text-white">{isEn ? 'Notice' : 'توجه'}</option>
                <option value="info" className="bg-slate-900 text-white">{isEn ? 'Info' : 'اطلاع'}</option>
              </select>
            </div>
          </div>

          {/* Portal Records Table */}
          <div className="audit-glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-lg">
            <div className="p-4 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs md:text-sm font-bold text-white">
                  {isEn ? 'Administrative & Lifecycle Audit Records' : 'دفتر وقایع پرتال: کاربران، تغییرات سطوح دسترسی و تجهیزات'}
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {filteredPortalLogs.length} {isEn ? 'matches' : 'رویداد'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left rtl:text-right border-collapse text-xs audit-table">
                <thead>
                  <tr className="border-b border-white/10 text-slate-300 font-semibold">
                    <th className="py-3 px-3.5 w-32">{isEn ? 'Timestamp' : 'زمان ثبت'}</th>
                    <th className="py-3 px-3.5 w-44">{isEn ? 'Operator' : 'کاربر / اپراتور'}</th>
                    <th className="py-3 px-3.5 w-36">{isEn ? 'Action Code' : 'شناسه عملیات'}</th>
                    <th className="py-3 px-3.5">{isEn ? 'Target Resource & Details' : 'هدف، محل استقرار و شرح تغییرات'}</th>
                    <th className="py-3 px-3.5 w-24 text-center">{isEn ? 'Severity' : 'سطح اهمیت'}</th>
                    <th className="py-3 px-3.5 w-20 text-center">{isEn ? 'Details' : 'جزئیات'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {filteredPortalLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Layers className="w-8 h-8 opacity-40 text-slate-400" />
                          <span className="text-sm">{isEn ? 'No portal audit logs found.' : 'رویدادی با این مشخصات یافت نشد.'}</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPortalLogs.map((log) => {
                      const isCritical = log.severity === 'critical';
                      return (
                        <tr key={log.id} className="hover:bg-white/[0.03] transition">
                          <td className="py-3 px-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                            {formatDateTime(log.timestamp)}
                          </td>
                          <td className="py-3 px-3.5">
                            <span className="font-bold text-white flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              {log.actor.username}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[140px]">
                              {log.actor.role}
                            </span>
                          </td>
                          <td className="py-3 px-3.5">
                            {getActionPill(log.action)}
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-white">
                                  {isEn ? log.title_en : log.title}
                                </span>
                                {log.target.ip && (
                                  <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-white/5 text-cyan-400 border border-white/5">
                                    {log.target.ip}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-300 text-[11px] leading-relaxed">
                                {isEn ? log.details_en : log.details}
                              </p>
                              {log.target.location && (
                                <span className="text-slate-400 flex items-center gap-1 text-[10px]">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  <span>{log.target.location}</span>
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {getSeverityBadge(log.severity)}
                          </td>
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            <button
                              onClick={() => setSelectedPortalLog(log)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition cursor-pointer"
                              title={isEn ? 'View audit details' : 'مشاهده جزئیات کامل'}
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
        </div>
      )}

      {/* DEDICATED WATCH LOG INSPECTOR MODAL (Requested feature) */}
      {activeWatchSession && (
        <div className="fixed inset-0 z-50 modal-glass-backdrop flex items-center justify-center p-3 sm:p-5">
          <div className="audit-glass-panel border border-white/15 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 bg-black/30 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 text-white shadow-lg shrink-0">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      {isEn ? 'WATCH LOG SESSION' : 'واچ لاگ فرامین'}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white font-mono">
                      {activeWatchSession.operatorUsername} @ {activeWatchSession.targetDeviceName}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                    <span>IP: <strong className="text-white font-mono">{activeWatchSession.targetDeviceIp}</strong></span>
                    <span>•</span>
                    <span>{isEn ? 'Role:' : 'نقش:'} <strong className="text-white">{activeWatchSession.operatorRole}</strong></span>
                    {activeWatchSession.targetDeviceLocation && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{activeWatchSession.targetDeviceLocation}</span>
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    const allCmds = activeWatchSession.commands.map((c) => `[${c.timestamp}] (${c.actor.username}): ${c.command}`).join('\n\n');
                    handleCopy(allCmds, 'copy-all-session');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  title={isEn ? 'Copy all commands in this session' : 'کپی متن تمام دستورات این نشست'}
                >
                  {copiedId === 'copy-all-session' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{isEn ? 'Copy All' : 'کپی کل دستورات'}</span>
                </button>

                <button
                  onClick={() => setActiveWatchSession(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Sub-bar: Search within this watch log & stats */}
            <div className="px-5 py-3 bg-white/[0.02] border-b border-white/5 flex items-center justify-between gap-3 flex-wrap">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 text-slate-400 ltr:left-3 rtl:right-3" />
                <input
                  type="text"
                  value={watchSearchQuery}
                  onChange={(e) => setWatchSearchQuery(e.target.value)}
                  placeholder={isEn ? 'Filter within this session commands...' : 'جستجو در بین دستورات این اپراتور...'}
                  className="w-full text-xs py-1.5 rounded-lg bg-black/20 border border-white/10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 ltr:pl-8 ltr:pr-3 rtl:pr-8 rtl:pl-3"
                />
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span>
                  {isEn ? 'Commands count:' : 'تعداد کل دستورات:'}{' '}
                  <strong className="text-cyan-400 font-mono">{filteredWatchCommands.length}</strong>
                </span>
                <span>•</span>
                <span>
                  {isEn ? 'Successful:' : 'موفق:'}{' '}
                  <strong className="text-emerald-400 font-mono">
                    {filteredWatchCommands.filter((c) => c.status === 'success').length}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  {isEn ? 'Denied / Blocked:' : 'مسدود امنیتی:'}{' '}
                  <strong className="text-rose-400 font-mono">
                    {filteredWatchCommands.filter((c) => c.status === 'denied').length}
                  </strong>
                </span>
              </div>
            </div>

            {/* Modal Body: Chronological list of commands */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs max-h-[60vh] custom-scrollbar">
              {filteredWatchCommands.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <Code2 className="w-8 h-8 mx-auto opacity-30 mb-2" />
                  <p>{isEn ? 'No commands matching the search term.' : 'دستوری منطبق با عبارت جستجو یافت نشد.'}</p>
                </div>
              ) : (
                filteredWatchCommands.map((cmd, idx) => {
                  const isDenied = cmd.status === 'denied';
                  return (
                    <div
                      key={cmd.id}
                      className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                        isDenied
                          ? 'bg-rose-500/[0.06] border-rose-500/30'
                          : cmd.riskLevel === 'critical'
                          ? 'bg-amber-500/[0.04] border-amber-500/30'
                          : 'bg-white/[0.02] border-white/10'
                      }`}
                    >
                      {/* Meta header of command */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-white/10 font-mono text-[10px] flex items-center justify-center text-slate-300 font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDateTime(cmd.timestamp)}</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            (
                            {cmd.channel === 'terminal_interactive'
                              ? isEn ? 'Interactive Terminal' : 'ترمینال تعاملی'
                              : cmd.channel === 'template_push'
                              ? isEn ? 'Template Apply' : 'اعمال الگو'
                              : cmd.channel === 'port_context_menu'
                              ? isEn ? 'Port Context Menu' : 'منوی راست‌کلیک پورت'
                              : isEn ? 'Batch Config' : 'پیکربندی گروهی'}
                            )
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {getRiskBadge(cmd.riskLevel)}

                          {cmd.status === 'success' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              {isEn ? 'SUCCESS' : 'موفق'}
                            </span>
                          ) : isDenied ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400">
                              <ShieldAlert className="w-3 h-3" />
                              {isEn ? 'RBAC DENIED' : 'مسدود امنیتی'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400">
                              <XCircle className="w-3 h-3" />
                              {isEn ? 'FAILED' : 'ناموفق'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Command Code Block */}
                      <div className="relative group/singlecmd">
                        <pre className="p-3 rounded-xl bg-black/60 text-emerald-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed border border-white/10">
                          <span className="text-slate-500 select-none">[{activeWatchSession.targetDeviceName}#] </span>
                          {cmd.command}
                        </pre>
                        <button
                          onClick={() => handleCopy(cmd.command, cmd.id)}
                          className="absolute top-2 ltr:right-2 rtl:left-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] flex items-center gap-1 transition cursor-pointer"
                          title={isEn ? 'Copy command' : 'کپی دستور'}
                        >
                          {copiedId === cmd.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isEn ? 'Copy' : 'کپی'}</span>
                        </button>
                      </div>

                      {/* Output Summary & Notes */}
                      {cmd.outputSummary && (
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-bold block">{isEn ? 'Output / Response:' : 'پاسخ و خروجی تجهیز:'}</span>
                          <pre className="p-2.5 rounded-lg bg-black/30 text-slate-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-36 border border-white/5">
                            {cmd.outputSummary}
                          </pre>
                        </div>
                      )}

                      {cmd.notes && (
                        <div className="text-[11px] text-slate-400 italic flex items-center gap-1">
                          <span>یادداشت عملیات:</span>
                          <span className="text-slate-300">{cmd.notes}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-black/30 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                Session ID: watch-{activeWatchSession.operatorUsername}-{activeWatchSession.targetDeviceId}
              </span>
              <button
                onClick={() => setActiveWatchSession(null)}
                className="px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
              >
                {isEn ? 'Close' : 'بستن پنجره'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PORTAL LOG DETAIL INSPECTION MODAL */}
      {selectedPortalLog && (
        <div className="fixed inset-0 z-50 modal-glass-backdrop flex items-center justify-center p-4">
          <div className="audit-glass-panel border border-white/15 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                  <ScrollText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isEn ? selectedPortalLog.title_en : selectedPortalLog.title}
                  </h3>
                  <span className="font-mono text-xs text-slate-400">
                    ID: {selectedPortalLog.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPortalLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs custom-scrollbar">
              {/* Decommissioned Device Banner */}
              {selectedPortalLog.action.includes('DELETED') && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <Trash2 className="w-4 h-4" />
                    <span>{isEn ? 'Decommissioned Device Snapshot' : 'مشخصات شناسنامه‌ای تجهیز حذف‌شده'}</span>
                  </div>
                  <p className="text-slate-300">
                    {isEn
                      ? 'This device was deleted from inventory. Its full hardware identity and physical location were archived for audit compliance:'
                      : 'این تجهیز از موجودی سامانه حذف گردیده و مشخصات کامل سخت‌افزاری و محل استقرار آن جهت انطباق امنیتی در لاگ بایگانی شده است:'}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-[11px] bg-black/30 p-3 rounded-lg border border-white/5">
                    <div>
                      <span className="text-slate-400 block">{isEn ? 'Device Name:' : 'نام دیوایس:'}</span>
                      <span className="font-bold text-white">{selectedPortalLog.target.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">{isEn ? 'IP Address:' : 'آدرس IP:'}</span>
                      <span className="font-bold text-white">{selectedPortalLog.target.ip || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">{isEn ? 'Model:' : 'مدل دستگاه:'}</span>
                      <span className="font-bold text-white">{selectedPortalLog.target.model || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">{isEn ? 'Total Ports:' : 'تعداد پورت‌ها:'}</span>
                      <span className="font-bold text-white">{selectedPortalLog.target.portsCount || 'N/A'}</span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-white/5">
                      <span className="text-indigo-400 font-sans font-semibold flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {isEn ? 'Physical Location at Deletion:' : 'محل استقرار فیزیکی هنگام حذف:'}
                      </span>
                      <span className="font-bold text-white block mt-0.5">
                        {selectedPortalLog.target.location || 'محل نامشخص'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Event Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEn ? 'Operator:' : 'کاربر انجام‌دهنده:'}</span>
                  <span className="font-bold text-white">{selectedPortalLog.actor.username} ({selectedPortalLog.actor.role})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEn ? 'Operator IP:' : 'آدرس IP کاربر:'}</span>
                  <span className="font-mono text-slate-300">{selectedPortalLog.actor.ipAddress || '127.0.0.1'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEn ? 'Timestamp:' : 'زمان دقیق:'}</span>
                  <span className="font-mono text-slate-300">{new Date(selectedPortalLog.timestamp).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEn ? 'Action Code:' : 'کد رویداد:'}</span>
                  <span className="font-mono text-slate-300">{selectedPortalLog.action}</span>
                </div>
              </div>

              {/* Full Description */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 mb-1">
                  {isEn ? 'Full Description & Audit Record:' : 'شرح کامل رویداد:'}
                </h4>
                <div className="p-3 rounded-xl bg-black/30 border border-white/5 text-slate-200 leading-relaxed">
                  {isEn ? selectedPortalLog.details_en : selectedPortalLog.details}
                </div>
              </div>

              {/* Raw JSON Payload */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-slate-300">
                    {isEn ? 'Target Metadata (JSON):' : 'متادیتای کامل آبجکت (JSON):'}
                  </h4>
                  <button
                    onClick={() => handleCopy(JSON.stringify(selectedPortalLog.target, null, 2), 'target-json')}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === 'target-json' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{isEn ? 'Copy JSON' : 'کپی متادیتا'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-black/60 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48 border border-white/10">
                  {JSON.stringify(selectedPortalLog.target, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 border-t border-white/10 bg-black/30 flex justify-end">
              <button
                onClick={() => setSelectedPortalLog(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
              >
                {isEn ? 'Close' : 'بستن'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE COMMAND DETAIL INSPECTION MODAL */}
      {selectedCommandLog && (
        <div className="fixed inset-0 z-50 modal-glass-backdrop flex items-center justify-center p-4">
          <div className="audit-glass-panel border border-white/15 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isEn ? 'Executed Command Audit Record' : 'سند ممیزی اجرای فرمان سخت‌افزاری'}
                  </h3>
                  <span className="font-mono text-xs text-slate-400">
                    ID: {selectedCommandLog.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCommandLog(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs custom-scrollbar">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEn ? 'Device Name:' : 'نام دیوایس:'}</span>
                  <span className="font-bold text-white font-mono">{selectedCommandLog.deviceName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEn ? 'Device IP & Vendor:' : 'آدرس IP و سازنده:'}</span>
                  <span className="font-mono text-slate-200">{selectedCommandLog.deviceIp} ({selectedCommandLog.deviceVendor})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEn ? 'Operator:' : 'اپراتور:'}</span>
                  <span className="font-bold text-white">{selectedCommandLog.actor.username} ({selectedCommandLog.actor.role})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">{isEn ? 'Timestamp:' : 'زمان دقیق:'}</span>
                  <span className="font-mono text-slate-200">{new Date(selectedCommandLog.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs font-bold text-slate-300">
                    {isEn ? 'Executed CLI Command:' : 'دستور خط فرمان اجراشده:'}
                  </h4>
                  <button
                    onClick={() => handleCopy(selectedCommandLog.command, 'cli-copy')}
                    className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === 'cli-copy' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{isEn ? 'Copy' : 'کپی دستور'}</span>
                  </button>
                </div>
                <pre className="p-3.5 rounded-xl bg-black/60 text-emerald-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed border border-white/10">
                  <span className="text-slate-500 select-none">$ </span>
                  {selectedCommandLog.command}
                </pre>
              </div>

              {selectedCommandLog.outputSummary && (
                <div>
                  <h4 className="text-xs font-bold text-slate-300 mb-1">
                    {isEn ? 'Execution Output Response:' : 'خروجی دریافتی از تجهیز:'}
                  </h4>
                  <pre className="p-3 rounded-xl bg-black/40 text-slate-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-48 border border-white/5">
                    {selectedCommandLog.outputSummary}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 bg-black/30 flex justify-end">
              <button
                onClick={() => setSelectedCommandLog(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer"
              >
                {isEn ? 'Close' : 'بستن'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM PURGE MODAL */}
      {isConfirmPurgeOpen && (
        <div className="fixed inset-0 z-50 modal-glass-backdrop flex items-center justify-center p-4">
          <div className="audit-glass-panel border border-rose-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                {isEn ? 'Purge Audit Logs' : 'پاکسازی دائمی لاگ‌ها'}
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {isEn
                ? 'Are you sure you want to purge the current audit logs? This action will reset storage to initial default records.'
                : 'آیا از پاکسازی لاگ‌های این بخش اطمینان دارید؟ این عمل غیرقابل برگشت است و لاگ‌ها را به تنظیمات اولیه بازمی‌گرداند.'}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsConfirmPurgeOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
              >
                {isEn ? 'Cancel' : 'انصراف'}
              </button>
              <button
                onClick={() => {
                  if (activeSection === 'portal') clearPortalLogs();
                  else clearCommandLogs();
                  setIsConfirmPurgeOpen(false);
                  refreshData();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 cursor-pointer"
              >
                {isEn ? 'Confirm Purge' : 'تأیید و پاکسازی'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
