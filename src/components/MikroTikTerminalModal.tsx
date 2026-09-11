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
  Sparkles
} from 'lucide-react';
import { Device, SwitchPort } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

export interface MikroTikTerminalModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
  onDeviceUpdated?: () => void;
  isLightMode?: boolean;
}

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'error' | 'success';
  text: string;
}

const TERMINAL_BG_OPTIONS = [
  { id: 'slate', color: '#09131f', nameEn: 'RouterOS Slate', nameFa: 'سرمه‌ای روتر او اس' },
  { id: 'black', color: '#000000', nameEn: 'Pitch Black', nameFa: 'مشکی خالص (OLED)' },
  { id: 'navy', color: '#081026', nameEn: 'Midnight Navy', nameFa: 'سرمه‌ای اقیانوسی' },
  { id: 'teal', color: '#042f2e', nameEn: 'MikroTik Teal', nameFa: 'آبی‌نفتی میکروتیک' },
  { id: 'matrix', color: '#022c22', nameEn: 'Matrix Green', nameFa: 'سبز ماتریکس' },
  { id: 'charcoal', color: '#18181b', nameEn: 'Zinc Charcoal', nameFa: 'زغالی' },
];

export const MikroTikTerminalModal: React.FC<MikroTikTerminalModalProps> = ({
  device,
  isOpen,
  onClose,
  onDeviceUpdated,
  isLightMode = false,
}) => {
  const { t, isEn } = useLanguage();
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [bgChoice, setBgChoice] = useState('slate');
  const [textColor, setTextColor] = useState('#22d3ee'); // Cyan default for MikroTik
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

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

  const currentBg = TERMINAL_BG_OPTIONS.find((b) => b.id === bgChoice)?.color || '#09131f';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`relative w-full ${
          isFullScreen ? 'h-full max-w-none' : 'max-w-5xl h-[85vh]'
        } rounded-2xl border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 flex flex-col overflow-hidden transition-all bg-slate-950`}
      >
        {/* Terminal Window Titlebar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/90 select-none">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <div className="flex items-center gap-2">
              <TerminalIcon className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-white">
                MikroTik RouterOS CLI — {device.name} ({device.ip})
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700 font-mono">
                RouterOS v7
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Color Palette Selector */}
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
              <Palette className="w-3.5 h-3.5 text-slate-400" />
              {TERMINAL_BG_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setBgChoice(opt.id)}
                  style={{ backgroundColor: opt.color }}
                  className={`w-3.5 h-3.5 rounded-full border ${
                    bgChoice === opt.id ? 'border-cyan-400 ring-1 ring-cyan-400' : 'border-slate-700'
                  }`}
                  title={isEn ? opt.nameEn : opt.nameFa}
                />
              ))}
            </div>

            <button
              onClick={() => setShowGuide(!showGuide)}
              className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${
                showGuide ? 'bg-cyan-950 text-cyan-300 border-cyan-500/50' : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title="Toggle Command Guide"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body (Screen + Guide Sidebar) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Terminal Screen */}
          <div
            className="flex-1 flex flex-col p-4 overflow-y-auto font-mono text-xs leading-relaxed"
            style={{ backgroundColor: currentBg, color: textColor }}
            onClick={() => inputRef.current?.focus()}
          >
            <div className="flex-1 space-y-1.5 overflow-y-auto">
              {lines.map((l) => (
                <div key={l.id} className="whitespace-pre-wrap">
                  {l.type === 'system' && (
                    <span className="text-cyan-400 font-semibold opacity-90">{l.text}</span>
                  )}
                  {l.type === 'input' && (
                    <span className="text-emerald-400 font-bold">{l.text}</span>
                  )}
                  {l.type === 'output' && (
                    <span className="opacity-95">{l.text}</span>
                  )}
                  {l.type === 'error' && (
                    <span className="text-rose-400 font-bold">{l.text}</span>
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
              className="mt-3 flex items-center gap-2 border-t border-slate-800/80 pt-2 shrink-0"
            >
              <span className="font-bold text-emerald-400 shrink-0 select-none">
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
                className="flex-1 bg-transparent border-none outline-none font-mono text-xs text-white focus:ring-0"
                placeholder={isEn ? "Type a RouterOS command (e.g. '/interface print')..." : "دستور روتر او اس را وارد کنید (مانند '/interface print')..."}
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Send className="w-3 h-3" />
                <span>{isEn ? 'Send' : 'ارسال'}</span>
              </button>
            </form>
          </div>

          {/* RouterOS Command Guide Sidebar */}
          {showGuide && (
            <div className="w-80 border-l border-slate-800 bg-slate-900/90 flex flex-col overflow-hidden text-xs select-none">
              <div className="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  {isEn ? 'RouterOS Command Guide' : 'راهنمای دستورات روتر او اس'}
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">/ (Slash)</span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-4">
                {/* Interface Section */}
                <div>
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Server className="w-3.5 h-3.5 text-cyan-400" />
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
                        className="w-full text-left p-1.5 rounded hover:bg-cyan-950/60 hover:text-cyan-300 group border border-transparent hover:border-cyan-500/30 transition-all font-mono text-[11px] flex flex-col"
                      >
                        <span className="font-bold text-cyan-400 group-hover:text-cyan-200">{item.cmd}</span>
                        <span className="text-[9.5px] text-slate-400 font-sans">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* IP & Routing */}
                <div>
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
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
                        className="w-full text-left p-1.5 rounded hover:bg-emerald-950/60 hover:text-emerald-300 group border border-transparent hover:border-emerald-500/30 transition-all font-mono text-[11px] flex flex-col"
                      >
                        <span className="font-bold text-emerald-400 group-hover:text-emerald-200">{item.cmd}</span>
                        <span className="text-[9.5px] text-slate-400 font-sans">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* System Resources */}
                <div>
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
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
                        className="w-full text-left p-1.5 rounded hover:bg-purple-950/60 hover:text-purple-300 group border border-transparent hover:border-purple-500/30 transition-all font-mono text-[11px] flex flex-col"
                      >
                        <span className="font-bold text-purple-400 group-hover:text-purple-200">{item.cmd}</span>
                        <span className="text-[9.5px] text-slate-400 font-sans">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
