import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  X,
  Send,
  HelpCircle,
  Save,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Search,
  Maximize2,
  Minimize2,
  Trash2,
  Layers,
  Server,
  Play,
  Palette,
  Type,
  History as HistoryIcon,
  Clock,
  Cpu,
  Sparkles,
  Columns,
  ArrowLeftRight,
  RefreshCw,
  Lock,
  Unlock,
} from 'lucide-react';
import { Device, SwitchPort } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { fetchDevicePorts } from '../services/api';
import { CompactTerminalFaceplate } from './terminal/CompactTerminalFaceplate';

export interface MikroTikTerminalModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
  onDeviceUpdated?: () => void;
  isLightMode?: boolean;
  isEmbedded?: boolean;
  onSplitScreen?: () => void;
  onSwap?: () => void;
  paneIndex?: number;
  totalPanes?: number;
  onMovePane?: (fromIndex: number, toIndex: number) => void;
  onClosePane?: () => void;
  onChangeDevice?: () => void;
  allDevices?: Device[];
}

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'error' | 'success';
  text: string;
}

const TERMINAL_BG_OPTIONS_DARK = [
  { id: 'slate', color: '#09131f', nameEn: 'RouterOS Slate', nameFa: 'سرمه‌ای روتر او اس' },
  { id: 'black', color: '#000000', nameEn: 'Pitch Black', nameFa: 'مشکی خالص (OLED)' },
  { id: 'navy', color: '#081026', nameEn: 'Midnight Navy', nameFa: 'سرمه‌ای اقیانوسی' },
  { id: 'teal', color: '#042f2e', nameEn: 'MikroTik Teal', nameFa: 'آبی‌نفتی میکروتیک' },
  { id: 'matrix', color: '#022c22', nameEn: 'Matrix Green', nameFa: 'سبز ماتریکس' },
  { id: 'charcoal', color: '#18181b', nameEn: 'Zinc Charcoal', nameFa: 'زغالی' },
];

const TERMINAL_BG_OPTIONS_LIGHT = [
  { id: 'winbox-silver', color: '#f1f5f9', nameEn: 'WinBox Silver', nameFa: 'نقره‌ای وین‌باکس' },
  { id: 'paper-white', color: '#ffffff', nameEn: 'Paper White', nameFa: 'سفید خالص' },
  { id: 'soft-sand', color: '#fafaf9', nameEn: 'Soft Sand', nameFa: 'کرمی ملایم' },
  { id: 'light-cyan', color: '#ecfeff', nameEn: 'MikroTik Light', nameFa: 'آبی فیروزه‌ای روشن' },
  { id: 'slate-dark', color: '#09131f', nameEn: 'RouterOS Slate (Dark)', nameFa: 'تیره روتر او اس' },
  { id: 'charcoal-dark', color: '#18181b', nameEn: 'Zinc Charcoal (Dark)', nameFa: 'زغالی تیره' },
];

export const MikroTikTerminalModal: React.FC<MikroTikTerminalModalProps> = ({
  device,
  isOpen,
  onClose,
  onDeviceUpdated,
  isLightMode = false,
  isEmbedded = false,
  onSplitScreen,
  onSwap,
  paneIndex,
  totalPanes,
  onMovePane,
  onClosePane,
  onChangeDevice,
  allDevices,
}) => {
  const { t, isEn } = useLanguage();
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [bgChoice, setBgChoice] = useState(isLightMode ? 'winbox-silver' : 'slate');
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [ports, setPorts] = useState<SwitchPort[]>([]);
  const [selectedPort, setSelectedPort] = useState<SwitchPort | null>(null);
  const [selectedPortIds, setSelectedPortIds] = useState<string[]>([]);
  const [showAppearanceMenu, setShowAppearanceMenu] = useState(false);
  const appearanceMenuRef = useRef<HTMLDivElement>(null);
  const lastClickedPortRef = useRef<SwitchPort | null>(null);
  const lastInsertedPortTextRef = useRef<string | null>(null);

  const [preventBackdropClose, setPreventBackdropClose] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nettop_terminal_lock_backdrop') === 'true';
    } catch {
      return false;
    }
  });

  const togglePreventBackdropClose = () => {
    setPreventBackdropClose((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nettop_terminal_lock_backdrop', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (!device || !isOpen) return;
    fetchDevicePorts(device.id)
      .then((res) => {
        if (res && res.ports) setPorts(res.ports);
      })
      .catch((err) => console.warn('Failed to fetch ports for MikroTik terminal', err));
  }, [device?.id, isOpen]);

  // Close appearance menu on click outside
  useEffect(() => {
    if (!showAppearanceMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (appearanceMenuRef.current && !appearanceMenuRef.current.contains(e.target as Node)) {
        setShowAppearanceMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAppearanceMenu]);

  // Handle MikroTik port click with intelligent insertion and Ctrl+Click range support
  const handlePortClick = (port: SwitchPort, e: React.MouseEvent) => {
    const isRangeAction = (e.ctrlKey || e.metaKey || e.shiftKey) && lastClickedPortRef.current !== null;
    let newSelectedIds: string[] = [];
    let isRange = false;
    let rangeStr = '';

    if (isRangeAction && lastClickedPortRef.current) {
      const idxA = ports.findIndex((p) => p.port_id === lastClickedPortRef.current?.port_id);
      const idxB = ports.findIndex((p) => p.port_id === port.port_id);
      if (idxA !== -1 && idxB !== -1) {
        const minIdx = Math.min(idxA, idxB);
        const maxIdx = Math.max(idxA, idxB);
        const rangePorts = ports.slice(minIdx, maxIdx + 1);
        newSelectedIds = rangePorts.map((p) => p.port_id);
        isRange = true;
        rangeStr = rangePorts.map((p) => p.port_id).join(',');
      } else {
        newSelectedIds = [port.port_id];
        lastClickedPortRef.current = port;
      }
    } else {
      newSelectedIds = [port.port_id];
      lastClickedPortRef.current = port;
    }

    setSelectedPort(port);
    setSelectedPortIds(newSelectedIds);

    const targetText = isRange ? rangeStr : port.port_id;

    setInput((prevInput) => {
      // 1. If empty or whitespace only
      if (!prevInput.trim()) {
        lastInsertedPortTextRef.current = targetText;
        if (isRange) {
          return `/interface print where name in (${newSelectedIds.map((id) => `"${id}"`).join(',')})`;
        }
        return `/interface print where name="${port.port_id}"`;
      }

      // 2. If prevInput contains the previously inserted port/range token
      const lastInserted = lastInsertedPortTextRef.current;
      if (lastInserted && prevInput.includes(lastInserted)) {
        lastInsertedPortTextRef.current = targetText;
        return prevInput.replace(lastInserted, targetText);
      }

      // 3. If prevInput contains any known port ID from current device
      for (const p of ports) {
        if (prevInput.includes(p.port_id)) {
          lastInsertedPortTextRef.current = targetText;
          return prevInput.replace(p.port_id, targetText);
        }
      }

      // 4. Regex for interface tokens like ether1, sfp-sfpplus1
      const mtkRegex = /\b(?:ether\d+|sfp(?:-sfpplus)?\d+)\b/i;
      const match = prevInput.match(mtkRegex);
      if (match) {
        lastInsertedPortTextRef.current = targetText;
        return prevInput.replace(match[0], targetText);
      }

      // 5. Append target port/range to user's existing typed command without clearing
      lastInsertedPortTextRef.current = targetText;
      const needsSpace = prevInput.length > 0 && !prevInput.endsWith(' ');
      return `${prevInput}${needsSpace ? ' ' : ''}${targetText}`;
    });

    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const bgOptions = isLightMode ? TERMINAL_BG_OPTIONS_LIGHT : TERMINAL_BG_OPTIONS_DARK;
  const currentBgOpt = bgOptions.find((b) => b.id === bgChoice) || bgOptions[0];
  const currentBg = currentBgOpt.color;

  // Check if current terminal screen background is light
  const isScreenLight = ['#ffffff', '#f1f5f9', '#fafaf9', '#ecfeff'].includes(currentBg.toLowerCase());

  // Dynamic text colors based on screen luminance
  const screenTextColor = isScreenLight ? '#0f172a' : '#22d3ee';
  const screenSystemColor = isScreenLight ? 'text-sky-700' : 'text-cyan-400';
  const screenInputColor = isScreenLight ? 'text-emerald-700' : 'text-emerald-400';
  const screenPromptColor = isScreenLight ? 'text-sky-700 font-bold' : 'text-emerald-400 font-bold';
  const screenOutputColor = isScreenLight ? 'text-slate-800' : 'opacity-95';
  const screenErrorColor = isScreenLight ? 'text-rose-600' : 'text-rose-400';

  const identity = device?.name || 'MikroTik';
  const prompt = `[admin@${identity}] > `;

  // Initialize terminal banner
  useEffect(() => {
    if (!device || !isOpen) return;

    const banner: TerminalLine[] = [
      {
        id: '1',
        type: 'system',
        text: `  MMM      MMM       KKK                          TTTTTTTTTTT kkk\n  MMMM    MMMM       KKK                              TTT     kkk\n  MMM MMMM MMM  iii  KKK  kkk  rrr rrr    oooo   www  TTT     kkk  www\n  MMM  MM  MMM  iii  KKKKK     rrrr   r  oo  oo  www  TTT     kkk  www\n  MMM      MMM  iii  KKK kkk   rrr       oo  oo  www  TTT     kkk  www\n  MMM      MMM  iii  KKK  kkk  rrr        oooo    www TTT     kkk  www\n\n  MikroTik RouterOS 7.14 (c) 1999-2026       http://www.mikrotik.com/`
      },
      {
        id: '2',
        type: 'system',
        text: `Session established to ${device.ip || '192.168.88.1'} (${device.model || 'CCR2004'}) via Secure SSH Tunnel.`
      },
      {
        id: '3',
        type: 'output',
        text: `Type '/help' or select commands from the right sidebar guide to begin.`
      }
    ];
    setLines(banner);
    setInput('');
    setTimeout(() => inputRef.current?.focus(), 150);
  }, [device, isOpen]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  if (!isOpen || !device) return null;

  const handleSendCommand = (cmdToRun?: string) => {
    const rawCmd = (cmdToRun !== undefined ? cmdToRun : input).trim();
    if (!rawCmd) return;

    const userLine: TerminalLine = {
      id: String(Date.now()),
      type: 'input',
      text: `${prompt}${rawCmd}`
    };

    setHistory((prev) => [rawCmd, ...prev.filter((c) => c !== rawCmd)].slice(0, 50));
    setHistoryIndex(-1);
    lastInsertedPortTextRef.current = null;

    // Simulate response based on command
    let responseText = '';
    const cmdLower = rawCmd.toLowerCase();

    if (cmdLower === '/interface print' || cmdLower === 'interface print') {
      responseText = `Flags: R - RUNNING; X - DISABLED\nColumns: NAME, TYPE, ACTUAL-MTU, MAC-ADDRESS\n#   NAME           TYPE   ACTUAL-MTU  MAC-ADDRESS\n0 R ether1         ether        1500  48:8F:5A:11:22:01\n1 R ether2         ether        1500  48:8F:5A:11:22:02\n2 R ether3         ether        1500  48:8F:5A:11:22:03\n3   ether4         ether        1500  48:8F:5A:11:22:04\n4 X ether5         ether        1500  48:8F:5A:11:22:05\n5 R sfp-sfpplus1   ether        1500  48:8F:5A:11:22:06`;
    } else if (cmdLower === '/ip address print' || cmdLower === 'ip address print') {
      responseText = `Flags: X - DISABLED, I - INVALID, D - DYNAMIC\nColumns: ADDRESS, NETWORK, INTERFACE\n#   ADDRESS            NETWORK          INTERFACE\n0   ${device.ip || '192.168.88.1'}/24      192.168.88.0     bridge1\n1   10.0.0.1/24        10.0.0.0         ether1`;
    } else if (cmdLower === '/system resource print' || cmdLower === 'system resource print') {
      responseText = `                   uptime: 42d 18h 32m\n                  version: 7.14 (stable)\n               build-time: Feb/20/2026 10:14:22\n         factory-software: 7.1\n              free-memory: 3412.5MiB\n             total-memory: 4096.0MiB\n                      cpu: ARM64\n                cpu-count: 4\n            cpu-frequency: 2000MHz\n                 cpu-load: 14%\n           free-hdd-space: 94.2MiB\n          total-hdd-space: 128.0MiB\n  write-sect-since-reboot: 18452\n         write-sect-total: 194821\n               bad-blocks: 0.0%\n        architecture-name: arm64\n               board-name: CCR2004-16G-2S+\n                 platform: MikroTik`;
    } else if (cmdLower === '/ip route print' || cmdLower === 'ip route print') {
      responseText = `Flags: D - DYNAMIC; A - ACTIVE; c - CONNECT, s - STATIC\nColumns: DST-ADDRESS, GATEWAY, DISTANCE\n  DST-ADDRESS     GATEWAY       DISTANCE\nDAc 192.168.88.0/24 bridge1              0\nDAc 10.0.0.0/24     ether1               0\nAs  0.0.0.0/0       10.0.0.254           1`;
    } else if (cmdLower === '/interface bridge print' || cmdLower === 'interface bridge print') {
      responseText = `Flags: R - RUNNING\nColumns: NAME, MTU, MAC-ADDRESS, PROTOCOL-MODE\n#   NAME     MTU  MAC-ADDRESS        PROTOCOL-MODE\n0 R bridge1 1500  48:8F:5A:11:22:00  rstp`;
    } else if (cmdLower.startsWith('/interface ethernet set') || cmdLower.startsWith('/interface enable') || cmdLower.startsWith('/interface disable')) {
      responseText = `[admin@${identity}] > # Interface settings updated and committed.`;
    } else if (cmdLower === 'clear' || cmdLower === '/clear') {
      setLines([]);
      setInput('');
      return;
    } else if (cmdLower === '/help' || cmdLower === 'help' || cmdLower === '?') {
      responseText = `Available RouterOS command sections:\n  /interface     - Physical interfaces, Ethernet, Bridges, VLANs\n  /ip            - IP Addressing, ARP, DNS, Firewall, Routes, Pool\n  /system        - Reboot, Identity, Resource, Clock, Package\n  /tool          - Ping, Traceroute, Torch, Profile, Speed-test\n  /export        - Export configuration to .rsc format`;
    } else {
      responseText = `[admin@${identity}] > Command executed successfully on RouterOS.`;
    }

    const outputLine: TerminalLine = {
      id: String(Date.now() + 1),
      type: 'output',
      text: responseText
    };

    setLines((prev) => [...prev, userLine, outputLine]);
    setInput('');
  };

  const modalContent = (
    <div
      className={`relative w-full ${
        isEmbedded
          ? 'h-full rounded-xl border-cyan-500/30'
          : isFullScreen
          ? 'h-full max-w-none rounded-none'
          : 'max-w-5xl h-[85vh] rounded-2xl'
      } border flex flex-col overflow-hidden transition-all ${
        isLightMode
          ? 'bg-slate-100 border-cyan-500/40 shadow-2xl shadow-slate-500/20 text-slate-800'
          : 'bg-slate-950 border-cyan-500/40 shadow-2xl shadow-cyan-950/60 text-slate-100'
      }`}
    >
        {/* Terminal Window Titlebar */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-b select-none ${
            isLightMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900/90 border-slate-800 text-white'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <div className="flex items-center gap-2">
              <TerminalIcon className={`w-4 h-4 ${isLightMode ? 'text-cyan-600' : 'text-cyan-400'}`} />
              <span className={`text-xs font-mono font-bold ${isLightMode ? 'text-slate-800' : 'text-white'}`}>
                MikroTik RouterOS CLI — {device.name} ({device.ip})
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isLightMode
                    ? 'bg-cyan-50 text-cyan-700 border border-cyan-300'
                    : 'bg-cyan-950 text-cyan-300 border border-cyan-700'
                }`}
              >
                RouterOS v7
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Terminal Appearance Menu Popover (Button-based to prevent clutter) */}
            <div className="relative" ref={appearanceMenuRef}>
              <button
                type="button"
                onClick={() => setShowAppearanceMenu(!showAppearanceMenu)}
                className={`px-2 py-1 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                  showAppearanceMenu
                    ? isLightMode
                      ? 'bg-cyan-100 text-cyan-800 border-cyan-400 shadow-xs'
                      : 'bg-cyan-600 text-white border-cyan-400 shadow-xs'
                    : isLightMode
                    ? 'bg-slate-50 text-slate-700 hover:text-slate-900 border-slate-200 hover:bg-slate-100'
                    : 'bg-slate-950/90 text-slate-300 hover:text-white border-slate-800 hover:bg-slate-900'
                }`}
                title={isEn ? "Terminal Theme & Colors" : "تنظیم تم و رنگ کنسول میکروتیک"}
              >
                <Palette className="w-3.5 h-3.5 text-cyan-500" />
                <span className="hidden sm:inline font-medium text-[11px]">{isEn ? 'Appearance' : 'رنگ و تم'}</span>
                <span
                  className="w-3 h-3 rounded-full border border-black/20 dark:border-white/40 inline-block shrink-0 shadow-xs"
                  style={{ backgroundColor: currentBg }}
                />
              </button>

              {showAppearanceMenu && (
                <div
                  className={`absolute top-full mt-1.5 right-0 z-50 w-72 p-3 rounded-xl backdrop-blur-md border shadow-2xl animate-in fade-in zoom-in-95 ${
                    isLightMode
                      ? 'bg-white/95 border-slate-200 text-slate-800'
                      : 'bg-slate-900/95 border-slate-700 text-slate-200'
                  }`}
                  dir={isEn ? 'ltr' : 'rtl'}
                >
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Palette className="w-4 h-4 text-cyan-500" />
                      {isEn ? 'RouterOS Terminal Theme' : 'تنظیمات پس‌زمینه و تم روتر او اس'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAppearanceMenu(false)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      ✕
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] font-medium mb-2">
                      <span>{isEn ? 'Color Scheme:' : 'طرح رنگ ترمینال:'}</span>
                      <span className="font-mono text-[10px] text-cyan-600 dark:text-cyan-400">
                        {isEn ? currentBgOpt.nameEn : currentBgOpt.nameFa}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {bgOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setBgChoice(opt.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg border text-left text-[11px] transition-all cursor-pointer ${
                            bgChoice === opt.id
                              ? 'border-cyan-500 ring-2 ring-cyan-500/40 font-semibold ' +
                                (isLightMode ? 'bg-cyan-50 text-cyan-900' : 'bg-slate-800 text-white')
                              : isLightMode
                              ? 'border-slate-200 hover:border-slate-300 bg-slate-50/70 text-slate-600 hover:text-slate-900'
                              : 'border-slate-800 hover:border-slate-700 bg-slate-950/60 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span
                            className="w-4 h-4 rounded-full border border-black/20 dark:border-white/20 shrink-0 shadow-xs"
                            style={{ backgroundColor: opt.color }}
                          />
                          <span className="truncate">{isEn ? opt.nameEn : opt.nameFa}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Split Screen Button (Request 6) */}
            {onSplitScreen && (
              <button
                type="button"
                onClick={onSplitScreen}
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                  isLightMode
                    ? 'bg-cyan-50 text-cyan-700 border-cyan-300 hover:bg-cyan-100'
                    : 'bg-cyan-950/60 text-cyan-300 border-cyan-600/50 hover:bg-cyan-900/60'
                }`}
                title={isEn ? 'Split Screen / Multi-Terminal' : 'تقسیم صفحه به چند ترمینال همزمان'}
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-medium">{isEn ? 'Split' : 'تقسیم'}</span>
              </button>
            )}

            {/* Swap Button (Request 6) */}
            {totalPanes !== undefined && totalPanes > 1 && onSwap && (
              <button
                type="button"
                onClick={onSwap}
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                  isLightMode
                    ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                    : 'bg-amber-950/60 text-amber-300 border-amber-600/50 hover:bg-amber-900/60'
                }`}
                title={isEn ? 'Swap Panes Left/Right' : 'جابجایی چپ و راست'}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span className="hidden sm:inline font-medium">{isEn ? 'Swap' : 'جابجایی'}</span>
              </button>
            )}

            {/* Change Device Button (embedded mode) */}
            {isEmbedded && onChangeDevice && (
              <button
                type="button"
                onClick={onChangeDevice}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isLightMode
                    ? 'bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                }`}
                title={isEn ? 'Change Device in this pane' : 'تغییر دیوایس این پنجره'}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => setShowGuide(!showGuide)}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                showGuide
                  ? isLightMode
                    ? 'bg-cyan-50 text-cyan-700 border-cyan-300 shadow-xs'
                    : 'bg-cyan-950 text-cyan-300 border-cyan-500/50'
                  : isLightMode
                  ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Toggle Command Guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            {!isEmbedded && (
              <button
                type="button"
                onClick={togglePreventBackdropClose}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  preventBackdropClose
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                    : isLightMode
                    ? 'bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
                    : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                }`}
                title={
                  preventBackdropClose
                    ? (isEn ? 'Terminal Locked: Clicking outside will NOT close it (Click to unlock)' : 'ترمینال قفل است: کلیک بیرون پنجره آن را نمی‌بندد (جهت باز کردن کلیک کنید)')
                    : (isEn ? 'Lock Terminal: Prevent closing when clicking outside' : 'قفل ترمینال: جلوگیری از بسته شدن با کلیک بیرون پنجره')
                }
              >
                {preventBackdropClose ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4" />}
              </button>
            )}

            {!isEmbedded && (
              <button
                onClick={() => setIsFullScreen(!isFullScreen)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isLightMode
                    ? 'bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-200'
                    : 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                }`}
              >
                {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={() => {
                if (isEmbedded && onClosePane) {
                  onClosePane();
                } else {
                  onClose();
                }
              }}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                isLightMode
                  ? 'bg-slate-100 text-slate-600 hover:text-rose-600 border-slate-200 hover:bg-rose-50 hover:border-rose-300'
                  : 'bg-slate-800 text-slate-400 hover:text-rose-400 border-slate-700 hover:border-rose-500/50'
              }`}
              title={isEmbedded ? (isEn ? 'Close Pane' : 'بستن این پنجره') : (isEn ? 'Close Terminal' : 'بستن ترمینال')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Graphic Port Faceplate Box (Half-size ports - Request 5) */}
        {ports && ports.length > 0 && (
          <CompactTerminalFaceplate
            device={device}
            ports={ports}
            isMikroTik={true}
            onPortClick={handlePortClick}
            selectedPortId={selectedPort?.port_id}
            selectedPortIds={selectedPortIds}
          />
        )}

        {/* Body (Screen + Guide Sidebar) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Terminal Screen */}
          <div
            className="flex-1 flex flex-col p-4 overflow-y-auto font-mono text-xs leading-relaxed transition-colors"
            style={{ backgroundColor: currentBg, color: screenTextColor }}
            onClick={() => inputRef.current?.focus()}
          >
            <div className="flex-1 space-y-1.5 overflow-y-auto">
              {lines.map((l) => (
                <div key={l.id} className="whitespace-pre-wrap">
                  {l.type === 'system' && (
                    <span className={`${screenSystemColor} font-semibold opacity-95`}>{l.text}</span>
                  )}
                  {l.type === 'input' && (
                    <span className={`${screenInputColor} font-bold`}>{l.text}</span>
                  )}
                  {l.type === 'output' && (
                    <span className={`${screenOutputColor}`}>{l.text}</span>
                  )}
                  {l.type === 'error' && (
                    <span className={`${screenErrorColor} font-bold`}>{l.text}</span>
                  )}
                </div>
              ))}
              <div ref={terminalEndRef} />
            </div>

            {/* Input Prompt Row */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendCommand();
              }}
              className={`mt-3 flex items-center gap-2 border-t pt-2 shrink-0 ${
                isScreenLight ? 'border-slate-300/80' : 'border-slate-800/80'
              }`}
            >
              <span className={`shrink-0 select-none ${screenPromptColor}`}>
                {prompt}
              </span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (history.length > 0 && historyIndex < history.length - 1) {
                      const next = historyIndex + 1;
                      setHistoryIndex(next);
                      setInput(history[next]);
                    }
                  } else if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (historyIndex > 0) {
                      const prev = historyIndex - 1;
                      setHistoryIndex(prev);
                      setInput(history[prev]);
                    } else if (historyIndex === 0) {
                      setHistoryIndex(-1);
                      setInput('');
                    }
                  }
                }}
                className={`flex-1 bg-transparent border-none outline-none font-mono text-xs focus:ring-0 ${
                  isScreenLight ? 'text-slate-900 placeholder:text-slate-400' : 'text-white placeholder:text-slate-500'
                }`}
                placeholder={
                  isEn
                    ? "Type a RouterOS command (e.g. '/interface print')..."
                    : "دستور روتر او اس را وارد کنید (مانند '/interface print')..."
                }
                autoFocus
              />
              <button
                type="submit"
                className={`px-3 py-1 rounded font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-xs ${
                  isLightMode
                    ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-black'
                }`}
              >
                <Send className="w-3 h-3" />
                <span>{isEn ? 'Send' : 'ارسال'}</span>
              </button>
            </form>
          </div>

          {/* RouterOS Command Guide Sidebar */}
          {showGuide && (
            <div
              className={`w-80 border-l flex flex-col overflow-hidden text-xs select-none ${
                isLightMode ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900/90 border-slate-800 text-slate-200'
              }`}
            >
              <div
                className={`p-3 border-b flex items-center justify-between ${
                  isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <span className={`font-bold flex items-center gap-1.5 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                  <Cpu className={`w-4 h-4 ${isLightMode ? 'text-cyan-600' : 'text-cyan-400'}`} />
                  {isEn ? 'RouterOS Command Guide' : 'راهنمای دستورات روتر او اس'}
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isLightMode ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'text-cyan-400'
                  }`}
                >
                  / (Slash)
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* Interface Section */}
                <div>
                  <div
                    className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${
                      isLightMode ? 'text-slate-700' : 'text-slate-300'
                    }`}
                  >
                    <Server className={`w-3.5 h-3.5 ${isLightMode ? 'text-cyan-600' : 'text-cyan-400'}`} />
                    <span>Interfaces & Ethernet</span>
                  </div>
                  <div className="space-y-1">
                    {[
                      { cmd: '/interface print', desc: 'List all interfaces' },
                      { cmd: '/interface ethernet print', desc: 'Ethernet port status & flags' },
                      { cmd: '/interface bridge print', desc: 'Bridge configuration' },
                      { cmd: '/interface bridge port print', desc: 'Bridge port membership' },
                    ].map((item) => (
                      <button
                        key={item.cmd}
                        onClick={() => handleSendCommand(item.cmd)}
                        className={`w-full text-left p-1.5 rounded group border transition-all font-mono text-[11px] flex flex-col cursor-pointer ${
                          isLightMode
                            ? 'hover:bg-cyan-50/80 hover:border-cyan-300 border-transparent text-slate-800'
                            : 'hover:bg-cyan-950/60 hover:text-cyan-300 border-transparent hover:border-cyan-500/30'
                        }`}
                      >
                        <span
                          className={`font-bold ${
                            isLightMode ? 'text-cyan-700 group-hover:text-cyan-900' : 'text-cyan-400 group-hover:text-cyan-200'
                          }`}
                        >
                          {item.cmd}
                        </span>
                        <span className={`text-[9.5px] font-sans ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          {item.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* IP & Routing */}
                <div>
                  <div
                    className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${
                      isLightMode ? 'text-slate-700' : 'text-slate-300'
                    }`}
                  >
                    <Layers className={`w-3.5 h-3.5 ${isLightMode ? 'text-emerald-600' : 'text-emerald-400'}`} />
                    <span>IP & Routing</span>
                  </div>
                  <div className="space-y-1">
                    {[
                      { cmd: '/ip address print', desc: 'IP addresses assigned' },
                      { cmd: '/ip route print', desc: 'Routing table & gateways' },
                      { cmd: '/ip firewall print', desc: 'Firewall filter rules' },
                      { cmd: '/ip pool print', desc: 'DHCP pools' },
                    ].map((item) => (
                      <button
                        key={item.cmd}
                        onClick={() => handleSendCommand(item.cmd)}
                        className={`w-full text-left p-1.5 rounded group border transition-all font-mono text-[11px] flex flex-col cursor-pointer ${
                          isLightMode
                            ? 'hover:bg-emerald-50/80 hover:border-emerald-300 border-transparent text-slate-800'
                            : 'hover:bg-emerald-950/60 hover:text-emerald-300 border-transparent hover:border-emerald-500/30'
                        }`}
                      >
                        <span
                          className={`font-bold ${
                            isLightMode ? 'text-emerald-700 group-hover:text-emerald-900' : 'text-emerald-400 group-hover:text-emerald-200'
                          }`}
                        >
                          {item.cmd}
                        </span>
                        <span className={`text-[9.5px] font-sans ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          {item.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* System Resources */}
                <div>
                  <div
                    className={`text-[11px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1 ${
                      isLightMode ? 'text-slate-700' : 'text-slate-300'
                    }`}
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isLightMode ? 'text-purple-600' : 'text-purple-400'}`} />
                    <span>System & Tools</span>
                  </div>
                  <div className="space-y-1">
                    {[
                      { cmd: '/system resource print', desc: 'CPU, RAM, Uptime' },
                      { cmd: '/system identity print', desc: 'Router hostname' },
                      { cmd: '/tool ping 8.8.8.8 count=4', desc: 'ICMP ping probe' },
                      { cmd: '/export hide-sensitive', desc: 'Full config dump' },
                    ].map((item) => (
                      <button
                        key={item.cmd}
                        onClick={() => handleSendCommand(item.cmd)}
                        className={`w-full text-left p-1.5 rounded group border transition-all font-mono text-[11px] flex flex-col cursor-pointer ${
                          isLightMode
                            ? 'hover:bg-purple-50/80 hover:border-purple-300 border-transparent text-slate-800'
                            : 'hover:bg-purple-950/60 hover:text-purple-300 border-transparent hover:border-purple-500/30'
                        }`}
                      >
                        <span
                          className={`font-bold ${
                            isLightMode ? 'text-purple-700 group-hover:text-purple-900' : 'text-purple-400 group-hover:text-purple-200'
                          }`}
                        >
                          {item.cmd}
                        </span>
                        <span className={`text-[9.5px] font-sans ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          {item.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  );

  if (isEmbedded) {
    return modalContent;
  }

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !preventBackdropClose) {
          onClose();
        }
      }}
      className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-xs animate-in fade-in duration-200 ${
        isLightMode ? 'bg-slate-900/50' : 'bg-black/85'
      }`}
    >
      {modalContent}
    </div>
  );
};
