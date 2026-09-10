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
  ChevronUp,
  Search,
  ArrowRight,
  Maximize2,
  Minimize2,
  Trash2,
  Layers,
  Server,
  Router as RouterIcon,
  Cable,
  Check,
  Play,
  Palette,
  PanelRightClose,
  PanelRightOpen,
  History as HistoryIcon,
  Clock,
} from 'lucide-react';
import { Device, SwitchPort, VlanInfo } from '../types';
import {
  fetchDevicePorts,
  updateSwitchPort,
  writeMemory,
  fetchVlans,
  sshConnect,
  sshExecute,
  sshDisconnect,
} from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import { logDeviceCommand, evaluateCommandRisk } from '../services/auditLogger';

interface CiscoTerminalModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
  onDeviceUpdated?: () => void;
}

type CliMode = 'USER_EXEC' | 'PRIVILEGED_EXEC' | 'GLOBAL_CONFIG' | 'INTERFACE_CONFIG' | 'VLAN_CONFIG';

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'error' | 'success';
  text: string;
}

interface CommandGuideItem {
  cmd: string;
  desc: string;
  descEn: string;
  category: 'exec' | 'config' | 'show' | 'action';
  mode: CliMode;
  forType?: 'switch' | 'router' | 'mikrotik' | 'all';
}

const TERMINAL_BG_OPTIONS = [
  { id: 'slate', color: '#020617', nameEn: 'Slate (Default)', nameFa: 'سرمه‌ای تیره (پیش‌فرض)' },
  { id: 'black', color: '#000000', nameEn: 'Pitch Black', nameFa: 'مشکی خالص (OLED)' },
  { id: 'navy', color: '#081026', nameEn: 'Midnight Navy', nameFa: 'سرمه‌ای اقیانوسی' },
  { id: 'matrix', color: '#03170e', nameEn: 'Matrix Dark Green', nameFa: 'سبز تیره ماتریکس' },
  { id: 'purple', color: '#160824', nameEn: 'Cyberpunk Violet', nameFa: 'بنفش سایبرپانک' },
  { id: 'teal', color: '#001e26', nameEn: 'Solarized Dark', nameFa: 'آبی‌نفتی سولارایزد' },
  { id: 'charcoal', color: '#18181b', nameEn: 'Zinc Charcoal', nameFa: 'زغالی مات' },
];

export const CiscoTerminalModal: React.FC<CiscoTerminalModalProps> = ({
  device,
  isOpen,
  onClose,
  onDeviceUpdated,
}) => {
  const { t, isEn } = useLanguage();
  const [terminalBgColor, setTerminalBgColor] = useState<string>(() => {
    try {
      return localStorage.getItem('cisco_terminal_bg_color') || '#020617';
    } catch {
      return '#020617';
    }
  });

  const handleSelectBgColor = (color: string) => {
    setTerminalBgColor(color);
    try {
      localStorage.setItem('cisco_terminal_bg_color', color);
    } catch {}
  };
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [cliMode, setCliMode] = useState<CliMode>('USER_EXEC');
  const [currentInterface, setCurrentInterface] = useState<string>('');
  const [currentVlanId, setCurrentVlanId] = useState<number>(1);
  const [hostname, setHostname] = useState<string>('Switch');
  const [ports, setPorts] = useState<SwitchPort[]>([]);
  const [vlans, setVlans] = useState<VlanInfo[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isInterfaceDropdownOpen, setIsInterfaceDropdownOpen] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('cisco_terminal_sidebar_open');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isWritingMemory, setIsWritingMemory] = useState(false);
  const [sshSessionMode, setSshSessionMode] = useState<'connecting' | 'real_ssh' | 'fallback_emulation'>('connecting');
  const [sshLatency, setSshLatency] = useState<number | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const interfaceDropdownRef = useRef<HTMLDivElement>(null);
  const historyDropdownRef = useRef<HTMLDivElement>(null);
  const activeSessionIdRef = useRef<string | null>(null);
  const draftInputRef = useRef<string>('');

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cisco_terminal_sidebar_open', String(next));
      } catch {}
      return next;
    });
  };

  const handleCloseModal = () => {
    if (device) {
      const targetHost = device.ssh_host || device.ip;
      const sshPort = device.ssh_port || 22;
      sshDisconnect({
        sessionId: activeSessionIdRef.current || undefined,
        deviceId: device.id,
        host: targetHost,
        port: sshPort,
      }).catch(() => {});
      activeSessionIdRef.current = null;
    }
    onClose();
  };

  // Close dropdown on click outside
  useEffect(() => {
    if (!isInterfaceDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (interfaceDropdownRef.current && !interfaceDropdownRef.current.contains(e.target as Node)) {
        setIsInterfaceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isInterfaceDropdownOpen]);

  // Close history dropdown on click outside
  useEffect(() => {
    if (!isHistoryOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(e.target as Node)) {
        setIsHistoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isHistoryOpen]);

  // Initialize terminal session
  useEffect(() => {
    if (isOpen && device) {
      const devHost = device.name.toUpperCase();
      const targetHost = device.ssh_host || device.ip;
      const sshPort = device.ssh_port || 22;
      const sshUser = device.ssh_username || 'admin';
      const sshPass = device.ssh_password || 'cisco123';

      setHostname(devHost);
      setCliMode('USER_EXEC');
      setCurrentInterface('');
      setHasUnsavedChanges(!!device.has_unsaved_changes);
      setSshSessionMode('connecting');
      setSshLatency(null);
      loadPortsAndVlans(device.id);

      setLines([
        {
          id: 'sys-init-1',
          type: 'system',
          text: `[SSH CLIENT v2.5] Initiating direct SSH socket connection to ${device.name} (Host: ${targetHost}:${sshPort})...`,
        },
        {
          id: 'sys-init-2',
          type: 'system',
          text: `[CREDENTIALS] Target User: '${sshUser}' | Target Host: '${targetHost}' | Auth: RSA/ECDSA Key & Password Verification`,
        },
      ]);

      // Attempt real SSH connection via backend Python client
      sshConnect({
        host: targetHost,
        port: sshPort,
        username: sshUser,
        password: device.ssh_password || '',
        enable_password: device.enable_password || '',
        deviceId: device.id,
        timeout: 3500,
      })
        .then((res) => {
          if (res.sessionId || res.session_id) {
            activeSessionIdRef.current = res.sessionId || res.session_id || null;
          }
          if (res.success) {
            setSshSessionMode('real_ssh');
            setSshLatency(res.latency_ms || 2.2);
            appendLines([
              {
                id: 'sys-ssh-ok',
                type: 'success',
                text: `[LIVE SSH ESTABLISHED] Authenticated to ${targetHost}:${sshPort} in ${res.latency_ms || 2}ms.\nCipher: ${res.cipher || 'aes256-gcm@openssh.com'} | MAC: hmac-sha2-512\nBanner: ${res.banner || 'Cisco IOS Software, Catalyst Series'}\nActive Session ID: ${activeSessionIdRef.current || 'online'}`,
              },
              {
                id: 'sys-ssh-ready',
                type: 'system',
                text: isEn
                  ? "Live SSH session active. Terminal commands execute directly on target device via Python SSH engine."
                  : "نشست لایو SSH فعال شد. دستورات مستقیماً از طریق موتور پایتون روی تجهیز اجرا می‌شوند.",
              },
            ]);
          } else {
            setSshSessionMode('fallback_emulation');
            appendLines([
              {
                id: 'sys-ssh-err',
                type: 'system',
                text: `[SSH STATUS] Socket probe to ${targetHost}:${sshPort} unreachable (${res.error || 'Connection timed out'}). Switching to managed Cisco IOS CLI emulation.`,
              },
              {
                id: 'sys-ssh-banner',
                type: 'output',
                text: `User Access Verification\nUsername: ${sshUser}\nPassword: ${'*'.repeat(Math.max(6, sshPass.length))}\n\n************************************************************************\n* Cisco Systems Corporate Network Infrastructure - Authorized Access * \n* Device: ${device.model} | Role: ${device.role} \n* Connection Host: ${targetHost}:${sshPort} | Management IP: ${device.ip} \n* Software: ${device.firmware || 'Cisco IOS-XE 17.09.03'} \n* Location: ${device.building} - ${device.floor} (${device.unit}) \n************************************************************************\n`,
              },
              {
                id: 'sys-ssh-ready',
                type: 'system',
                text: isEn
                  ? "Cisco IOS CLI is ready. Type 'enable' to begin or use the command guide sidebar."
                  : "Cisco IOS CLI آماده است. برای شروع دستور 'enable' را وارد کنید یا از سایدبار دستورات راهنما استفاده نمایید.",
              },
            ]);
          }
        })
        .catch((err) => {
          setSshSessionMode('fallback_emulation');
          appendLines([
            {
              id: 'sys-ssh-err',
              type: 'system',
              text: `[SSH CLIENT] Connection status: ${err.message || 'Host unreachable'}. Managed CLI ready.`,
            },
          ]);
        });

      const timer = setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 150);

      return () => {
        clearTimeout(timer);
        const curTarget = device.ssh_host || device.ip;
        sshDisconnect({
          sessionId: activeSessionIdRef.current || undefined,
          deviceId: device.id,
          host: curTarget,
          port: device.ssh_port || 22,
        }).catch(() => {});
        activeSessionIdRef.current = null;
      };
    }
  }, [isOpen, device, isEn]);

  // Auto scroll to bottom of terminal
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const loadPortsAndVlans = async (devId: string) => {
    try {
      const [portsRes, vlanRes] = await Promise.all([
        fetchDevicePorts(devId),
        fetchVlans(),
      ]);
      setPorts(portsRes.ports);
      setVlans(vlanRes.vlans);
    } catch (e) {
      console.error('Failed to load device ports/vlans for CLI:', e);
    }
  };

  if (!isOpen || !device) return null;

  const isMikroTik =
    !!device.model?.toLowerCase().includes('mikrotik') ||
    !!device.model?.toLowerCase().includes('routerboard') ||
    !!device.model?.toLowerCase().includes('crs') ||
    !!device.model?.toLowerCase().includes('ccr') ||
    !!device.name?.toLowerCase().includes('mikrotik') ||
    !!device.firmware?.toLowerCase().includes('routeros');

  const isRouter = device.type === 'router' && !isMikroTik;
  const isSwitch = device.type === 'switch' && !isMikroTik;

  // Compute Current Prompt
  const getPrompt = (): string => {
    if (isMikroTik) {
      return `[admin@${hostname}] >`;
    }
    switch (cliMode) {
      case 'USER_EXEC':
        return `${hostname}>`;
      case 'PRIVILEGED_EXEC':
        return `${hostname}#`;
      case 'GLOBAL_CONFIG':
        return `${hostname}(config)#`;
      case 'INTERFACE_CONFIG':
        return `${hostname}(config-if)#`;
      case 'VLAN_CONFIG':
        return `${hostname}(config-vlan)#`;
      default:
        return `${hostname}>`;
    }
  };

  // Helper to append line
  const appendLines = (newLines: TerminalLine[]) => {
    setLines((prev) => [...prev, ...newLines]);
  };

  // Handle Write Memory
  const handleExecuteWriteMemory = async () => {
    try {
      setIsWritingMemory(true);
      appendLines([
        { id: String(Date.now()), type: 'input', text: `${getPrompt()} write memory` },
        { id: String(Date.now() + 1), type: 'system', text: 'Building configuration...' },
      ]);

      await writeMemory(device.id);
      setHasUnsavedChanges(false);

      appendLines([
        {
          id: String(Date.now() + 2),
          type: 'success',
          text: `[OK]\nNVRAM update complete. Configuration saved to startup-config successfully.`,
        },
      ]);

      if (onDeviceUpdated) onDeviceUpdated();
    } catch (err: any) {
      appendLines([
        { id: String(Date.now() + 3), type: 'error', text: `% Error writing configuration to NVRAM: ${err.message}` },
      ]);
    } finally {
      setIsWritingMemory(false);
    }
  };

  // Cisco IOS Command Execution Engine
  const executeCommand = async (rawCmd: string) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) {
      appendLines([{ id: String(Date.now()), type: 'input', text: getPrompt() }]);
      return;
    }

    // Save to history
    setHistory((prev) => [trimmed, ...prev]);
    setHistoryIndex(-1);

    const cmdLower = trimmed.toLowerCase();
    const promptText = getPrompt();

    // 1. Clear terminal
    if (cmdLower === 'clear' || cmdLower === 'cls') {
      setLines([
        { id: String(Date.now()), type: 'system', text: `Terminal display cleared. Current session: ${promptText}` },
      ]);
      return;
    }

    // Append input line
    const inputLine: TerminalLine = { id: String(Date.now()), type: 'input', text: `${promptText} ${trimmed}` };

    // Audit Log command execution
    if (device && cmdLower !== '?' && cmdLower !== 'help') {
      try {
        logDeviceCommand({
          deviceId: device.id,
          deviceName: device.name,
          deviceIp: device.ip,
          deviceVendor: isMikroTik ? 'mikrotik' : 'cisco',
          deviceModel: device.model,
          deviceLocation: [device.building, device.floor, device.unit, device.rack ? `رک ${device.rack}` : ''].filter(Boolean).join(' > '),
          channel: 'terminal_interactive',
          command: trimmed,
          riskLevel: evaluateCommandRisk(trimmed),
          status: 'success',
          notes: `اجرای تعاملی در مد ${cliMode}`,
        });
      } catch (err) {
        console.warn('Failed to audit command:', err);
      }
    }

    // If active in real SSH session, attempt direct hardware command execution
    if (sshSessionMode === 'real_ssh' && device) {
      try {
        const targetHost = device.ssh_host || device.ip;
        const res = await sshExecute({
          host: targetHost,
          port: device.ssh_port || 22,
          username: device.ssh_username || 'admin',
          password: device.ssh_password || '',
          command: trimmed,
          sessionId: activeSessionIdRef.current || undefined,
        });
        if (res.success && res.isReal && res.output !== undefined) {
          appendLines([
            inputLine,
            { id: String(Date.now() + 1), type: 'output', text: res.output || '(Command executed on device)' },
          ]);
          return;
        }
      } catch (err) {
        console.warn('Direct hardware SSH execution error, using local CLI engine:', err);
      }
    }

    // 2. Help
    if (trimmed === '?' || cmdLower === 'help') {
      const helpOutput = generateHelpOutput(cliMode, isRouter);
      appendLines([inputLine, { id: String(Date.now() + 1), type: 'output', text: helpOutput }]);
      return;
    }

    // 3. Mode Transitions
    if (cmdLower === 'enable' || cmdLower === 'en') {
      if (cliMode === 'USER_EXEC') {
        setCliMode('PRIVILEGED_EXEC');
        appendLines([inputLine]);
      } else {
        appendLines([inputLine, { id: String(Date.now() + 1), type: 'system', text: 'Already in privileged EXEC mode.' }]);
      }
      return;
    }

    if (cmdLower === 'disable' || cmdLower === 'dis') {
      if (cliMode !== 'USER_EXEC') {
        setCliMode('USER_EXEC');
        setCurrentInterface('');
        appendLines([inputLine]);
      } else {
        appendLines([inputLine]);
      }
      return;
    }

    if (cmdLower === 'configure terminal' || cmdLower === 'conf t' || cmdLower === 'config t') {
      if (cliMode === 'USER_EXEC') {
        appendLines([
          inputLine,
          { id: String(Date.now() + 1), type: 'error', text: `% Unknown command or not in privileged EXEC mode. Type 'enable' first.` },
        ]);
        return;
      }
      setCliMode('GLOBAL_CONFIG');
      appendLines([
        inputLine,
        { id: String(Date.now() + 1), type: 'system', text: 'Enter configuration commands, one per line. End with CNTL/Z or "exit".' },
      ]);
      return;
    }

    if (cmdLower === 'exit') {
      if (cliMode === 'INTERFACE_CONFIG' || cliMode === 'VLAN_CONFIG') {
        setCliMode('GLOBAL_CONFIG');
        setCurrentInterface('');
        appendLines([inputLine]);
      } else if (cliMode === 'GLOBAL_CONFIG') {
        setCliMode('PRIVILEGED_EXEC');
        appendLines([inputLine]);
      } else if (cliMode === 'PRIVILEGED_EXEC') {
        setCliMode('USER_EXEC');
        appendLines([inputLine]);
      } else {
        const targetHost = device ? (device.ssh_host || device.ip) : 'foreign host';
        appendLines([inputLine, { id: String(Date.now() + 1), type: 'system', text: `% Connection to ${targetHost} closed by foreign host.` }]);
        setTimeout(() => {
          handleCloseModal();
        }, 350);
      }
      return;
    }

    if (cmdLower === 'end') {
      if (cliMode !== 'USER_EXEC' && cliMode !== 'PRIVILEGED_EXEC') {
        setCliMode('PRIVILEGED_EXEC');
        setCurrentInterface('');
        appendLines([inputLine]);
      } else {
        appendLines([inputLine]);
      }
      return;
    }

    // 4. Interface Command (in GLOBAL_CONFIG or INTERFACE_CONFIG)
    if (cmdLower.startsWith('interface ') || cmdLower.startsWith('int ')) {
      if (cliMode !== 'GLOBAL_CONFIG' && cliMode !== 'INTERFACE_CONFIG') {
        appendLines([
          inputLine,
          { id: String(Date.now() + 1), type: 'error', text: `% Command only valid in Global Configuration Mode (configure terminal).` },
        ]);
        return;
      }
      const ifName = trimmed.replace(/^interface\s+|^int\s+/i, '').trim();
      // Match port
      const matchedPort = ports.find(
        (p) =>
          p.port_id.toLowerCase() === ifName.toLowerCase() ||
          p.name.toLowerCase() === ifName.toLowerCase() ||
          p.port_id.toLowerCase().includes(ifName.toLowerCase())
      );
      const targetIf = matchedPort ? matchedPort.port_id : ifName;
      setCurrentInterface(targetIf);
      setCliMode('INTERFACE_CONFIG');
      appendLines([
        inputLine,
        { id: String(Date.now() + 1), type: 'system', text: `Configuring interface ${targetIf}...` },
      ]);
      return;
    }

    // 5. VLAN Command (in GLOBAL_CONFIG)
    if (cmdLower.startsWith('vlan ')) {
      if (cliMode !== 'GLOBAL_CONFIG') {
        appendLines([
          inputLine,
          { id: String(Date.now() + 1), type: 'error', text: `% Command only valid in Global Configuration Mode.` },
        ]);
        return;
      }
      const vlanNum = parseInt(trimmed.replace(/^vlan\s+/i, '').trim());
      if (isNaN(vlanNum) || vlanNum < 1 || vlanNum > 4094) {
        appendLines([inputLine, { id: String(Date.now() + 1), type: 'error', text: `% Invalid VLAN number. Range is 1-4094.` }]);
        return;
      }
      setCurrentVlanId(vlanNum);
      setCliMode('VLAN_CONFIG');
      setHasUnsavedChanges(true);
      appendLines([inputLine]);
      return;
    }

    // 6. Hostname command
    if (cmdLower.startsWith('hostname ')) {
      if (cliMode !== 'GLOBAL_CONFIG') {
        appendLines([inputLine, { id: String(Date.now() + 1), type: 'error', text: `% Command only valid in Global Configuration Mode.` }]);
        return;
      }
      const newHost = trimmed.replace(/^hostname\s+/i, '').trim().toUpperCase();
      if (newHost) {
        setHostname(newHost);
        setHasUnsavedChanges(true);
        appendLines([inputLine]);
      }
      return;
    }

    // 7. Write Memory / Copy Run Start
    if (
      cmdLower === 'write memory' ||
      cmdLower === 'wr' ||
      cmdLower === 'write' ||
      cmdLower === 'copy run start' ||
      cmdLower === 'copy running-config startup-config'
    ) {
      if (cliMode === 'USER_EXEC') {
        appendLines([
          inputLine,
          { id: String(Date.now() + 1), type: 'error', text: `% Command only valid in Privileged EXEC mode (#). Type 'enable' first.` },
        ]);
        return;
      }
      await handleExecuteWriteMemory();
      return;
    }

    // 8. Interface Subcommands (when in INTERFACE_CONFIG)
    if (cliMode === 'INTERFACE_CONFIG') {
      const port = ports.find((p) => p.port_id === currentInterface || p.name === currentInterface);

      if (cmdLower === 'shutdown') {
        if (port) {
          await updateSwitchPort(device.id, port.port_id, { admin_status: 'disabled', status: 'down' });
          setPorts((prev) =>
            prev.map((p) => (p.port_id === port.port_id ? { ...p, admin_status: 'disabled', status: 'down' } : p))
          );
        }
        setHasUnsavedChanges(true);
        appendLines([
          inputLine,
          { id: String(Date.now() + 1), type: 'system', text: `%LINK-5-CHANGED: Interface ${currentInterface}, changed state to administratively down` },
          { id: String(Date.now() + 2), type: 'system', text: `%LINEPROTO-5-UPDOWN: Line protocol on Interface ${currentInterface}, changed state to down` },
        ]);
        return;
      }

      if (cmdLower === 'no shutdown' || cmdLower === 'no shut') {
        if (port) {
          await updateSwitchPort(device.id, port.port_id, { admin_status: 'enabled', status: 'up' });
          setPorts((prev) =>
            prev.map((p) => (p.port_id === port.port_id ? { ...p, admin_status: 'enabled', status: 'up' } : p))
          );
        }
        setHasUnsavedChanges(true);
        appendLines([
          inputLine,
          { id: String(Date.now() + 1), type: 'system', text: `%LINK-3-UPDOWN: Interface ${currentInterface}, changed state to up` },
          { id: String(Date.now() + 2), type: 'system', text: `%LINEPROTO-5-UPDOWN: Line protocol on Interface ${currentInterface}, changed state to up` },
        ]);
        return;
      }

      if (cmdLower.startsWith('switchport mode ')) {
        const mode = cmdLower.includes('trunk') ? 'trunk' : 'access';
        if (port) {
          await updateSwitchPort(device.id, port.port_id, { mode });
          setPorts((prev) =>
            prev.map((p) => (p.port_id === port.port_id ? { ...p, mode } : p))
          );
        }
        setHasUnsavedChanges(true);
        appendLines([inputLine]);
        return;
      }

      if (cmdLower.startsWith('switchport access vlan ')) {
        const vlanVal = parseInt(trimmed.replace(/^switchport access vlan\s+/i, '').trim());
        if (!isNaN(vlanVal) && port) {
          await updateSwitchPort(device.id, port.port_id, { vlan: vlanVal });
          setPorts((prev) =>
            prev.map((p) => (p.port_id === port.port_id ? { ...p, vlan: vlanVal } : p))
          );
          setHasUnsavedChanges(true);
        }
        appendLines([inputLine]);
        return;
      }

      if (cmdLower.startsWith('switchport trunk allowed vlan ')) {
        const allowed = trimmed.replace(/^switchport trunk allowed vlan\s+/i, '').trim();
        if (port) {
          await updateSwitchPort(device.id, port.port_id, { allowed_vlans: allowed });
          setPorts((prev) =>
            prev.map((p) => (p.port_id === port.port_id ? { ...p, allowed_vlans: allowed } : p))
          );
          setHasUnsavedChanges(true);
        }
        appendLines([inputLine]);
        return;
      }

      if (cmdLower.startsWith('description ') || cmdLower.startsWith('desc ')) {
        const descText = trimmed.replace(/^description\s+|^desc\s+/i, '').trim();
        if (port) {
          await updateSwitchPort(device.id, port.port_id, { description: descText });
          setPorts((prev) =>
            prev.map((p) => (p.port_id === port.port_id ? { ...p, description: descText } : p))
          );
          setHasUnsavedChanges(true);
        }
        appendLines([inputLine]);
        return;
      }

      if (cmdLower.startsWith('ip address ')) {
        const parts = trimmed.split(/\s+/);
        const ip = parts[2];
        const mask = parts[3];
        setHasUnsavedChanges(true);
        appendLines([
          inputLine,
          { id: String(Date.now() + 1), type: 'success', text: `IP address ${ip} ${mask} configured on ${currentInterface}.` },
        ]);
        return;
      }
    }

    // 9. Show Commands
    if (cmdLower === 'show ip interface brief' || cmdLower === 'sh ip int br' || cmdLower === 'sh ip int brief') {
      const output = formatShowIpIntBrief(ports, device);
      appendLines([inputLine, { id: String(Date.now() + 1), type: 'output', text: output }]);
      return;
    }

    if (cmdLower === 'show interfaces status' || cmdLower === 'sh int status' || cmdLower === 'sh int stat') {
      const output = formatShowInterfacesStatus(ports);
      appendLines([inputLine, { id: String(Date.now() + 1), type: 'output', text: output }]);
      return;
    }

    if (cmdLower === 'show vlan brief' || cmdLower === 'sh vlan br' || cmdLower === 'sh vlan') {
      const output = formatShowVlanBrief(vlans, ports);
      appendLines([inputLine, { id: String(Date.now() + 1), type: 'output', text: output }]);
      return;
    }

    if (cmdLower === 'show running-config' || cmdLower === 'sh run') {
      if (cliMode === 'USER_EXEC') {
        appendLines([
          inputLine,
          { id: String(Date.now() + 1), type: 'error', text: `% Command authorization failed. Type 'enable' first.` },
        ]);
        return;
      }
      const output = formatShowRunningConfig(hostname, device, ports, vlans);
      appendLines([inputLine, { id: String(Date.now() + 1), type: 'output', text: output }]);
      return;
    }

    if (cmdLower === 'show version' || cmdLower === 'sh ver') {
      const output = formatShowVersion(device);
      appendLines([inputLine, { id: String(Date.now() + 1), type: 'output', text: output }]);
      return;
    }

    if (cmdLower.startsWith('show cdp neighbor') || cmdLower.startsWith('sh cdp nei')) {
      const output = formatShowCdpNeighbors(device, ports);
      appendLines([inputLine, { id: String(Date.now() + 1), type: 'output', text: output }]);
      return;
    }

    if (cmdLower.startsWith('show mac address-table') || cmdLower.startsWith('sh mac')) {
      const output = formatShowMacTable(ports);
      appendLines([inputLine, { id: String(Date.now() + 1), type: 'output', text: output }]);
      return;
    }

    if (cmdLower === 'show port-security' || cmdLower === 'sh port-sec' || cmdLower === 'sh port-security') {
      const output = formatShowPortSecurity(ports);
      appendLines([inputLine, { id: String(Date.now() + 1), type: 'output', text: output }]);
      return;
    }

    if (cmdLower.startsWith('show port-security interface') || cmdLower.startsWith('sh port-sec int')) {
      const parts = trimmed.split(/\s+/);
      const targetInt = parts[parts.length - 1];
      const foundPort = ports.find((p) => p.port_id.toLowerCase() === targetInt.toLowerCase());
      if (foundPort) {
        const output = formatShowPortSecurityInterface(foundPort);
        appendLines([inputLine, { id: String(Date.now() + 1), type: 'output', text: output }]);
      } else {
        appendLines([inputLine, { id: String(Date.now() + 1), type: 'error', text: `% Port ${targetInt} not found on this device.` }]);
      }
      return;
    }

    if (cmdLower === 'show ip route' || cmdLower === 'sh ip route' || cmdLower === 'sh ip ro') {
      const output = formatShowIpRoute(device);
      appendLines([inputLine, { id: String(Date.now() + 1), type: 'output', text: output }]);
      return;
    }

    if (cmdLower.startsWith('ping ')) {
      const target = trimmed.split(' ')[1] || '8.8.8.8';
      const output = `Sending 5, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:\n!!!!!\nSuccess rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms`;
      appendLines([inputLine, { id: String(Date.now() + 1), type: 'output', text: output }]);
      return;
    }

    // MikroTik RouterOS command emulation handlers
    if (isMikroTik) {
      if (cmdLower === '/ip address print' || cmdLower === 'ip address print' || cmdLower === '/ip address pr' || cmdLower === 'ip address pr') {
        const out = `Flags: X - disabled, I - invalid, D - dynamic \n #   ADDRESS            NETWORK         INTERFACE\n 0   ${device.ip}/24    ${device.ip.split('.').slice(0, 3).join('.')}.0    ether1\n 1   192.168.88.1/24    192.168.88.0    bridge1`;
        appendLines([inputLine, { id: String(Date.now() + 1), type: 'output', text: out }]);
        return;
      }
      if (cmdLower === '/interface print' || cmdLower === 'interface print' || cmdLower === '/interface pr' || cmdLower === 'interface pr') {
        const portLines = ports.length > 0
          ? ports.map((p, i) => ` ${i}  R  ${p.name || `ether${i + 1}`}                              ether            1500`).join('\n')
          : ` 0  R  ether1                              ether            1500\n 1  R  ether2                              ether            1500\n 2  R  bridge1                             bridge           1500`;
        const out = `Flags: D - dynamic, X - disabled, R - running, S - slave \n #     NAME                                TYPE       ACTUAL-MTU\n${portLines}`;
        appendLines([inputLine, { id: String(Date.now() + 1), type: 'output', text: out }]);
        return;
      }
      if (cmdLower === '/ip route print' || cmdLower === 'ip route print' || cmdLower === '/ip route pr') {
        const out = `Flags: X - disabled, A - active, D - dynamic, C - connect, S - static, r - rip, b - bgp, o - ospf \n #      DST-ADDRESS        PREF-SRC        GATEWAY            DISTANCE\n 0 A S  0.0.0.0/0                          192.168.88.254            1\n 1 ADC  192.168.88.0/24    ${device.ip}    ether1                    0`;
        appendLines([inputLine, { id: String(Date.now() + 1), type: 'output', text: out }]);
        return;
      }
      if (cmdLower === '/system resource print' || cmdLower === 'system resource print') {
        const out = `                   uptime: 42d 16h 24m 12s\n                  version: 7.15.2 (stable)\n               build-time: Jun/12/2024 10:14:00\n              free-memory: 842.6MiB\n             total-memory: 1024.0MiB\n                      cpu: ARM64\n                cpu-count: 4\n            cpu-frequency: 1400MHz\n                 cpu-load: 3%\n           free-hdd-space: 112.4MiB\n          total-hdd-space: 128.0MiB`;
        appendLines([inputLine, { id: String(Date.now() + 1), type: 'output', text: out }]);
        return;
      }
      if (cmdLower === '/system identity print' || cmdLower === 'system identity print') {
        const out = `  name: "${hostname}"`;
        appendLines([inputLine, { id: String(Date.now() + 1), type: 'output', text: out }]);
        return;
      }
      if (cmdLower.startsWith('/system identity set name=') || cmdLower.startsWith('system identity set name=')) {
        const newName = trimmed.split('=')[1] || hostname;
        setHostname(newName.trim().replace(/["']/g, ''));
        appendLines([inputLine, { id: String(Date.now() + 1), type: 'success', text: `System identity changed to: ${newName}` }]);
        return;
      }
      if (cmdLower === '/export compact' || cmdLower === '/export' || cmdLower === 'export compact' || cmdLower === 'export') {
        const out = `# ${new Date().toISOString()} by RouterOS 7.15.2\n# model = ${device.model}\n/interface bridge\nadd name=bridge1\n/ip address\nadd address=${device.ip}/24 interface=ether1 network=192.168.88.0\n/system identity\nset name=${hostname}`;
        appendLines([inputLine, { id: String(Date.now() + 1), type: 'output', text: out }]);
        return;
      }
      if (cmdLower === '/system reboot' || cmdLower === 'system reboot') {
        appendLines([
          inputLine,
          { id: String(Date.now() + 1), type: 'system', text: 'Rebooting system...\nBroadcast message from admin: System will reboot now!' },
        ]);
        return;
      }
      if (cmdLower === 'quit' || cmdLower === '/quit') {
        appendLines([inputLine, { id: String(Date.now() + 1), type: 'system', text: 'Closing session...' }]);
        setTimeout(() => handleCloseModal(), 400);
        return;
      }
    }

    // 10. Default / Unrecognized Cisco CLI output
    appendLines([
      inputLine,
      {
        id: String(Date.now() + 1),
        type: 'error',
        text: isEn
          ? `% Invalid input detected at '^' marker.\n  ${trimmed}\n  ^\nCommand not valid in current mode (${cliMode}) or missing parameters. Use '?' or the sidebar guide.`
          : `% Invalid input detected at '^' marker.\n  ${trimmed}\n  ^\nدستور در این مرحله (${cliMode}) معتبر نیست یا نیاز به پارامترهای دیگر دارد. از '?' یا سایدبار راهنما کمک بگیرید.`,
      },
    ]);
  };

  // Get available commands tailored for Cisco Switch, Cisco Router, or MikroTik RouterOS
  const getAvailableCommands = (): string[] => {
    if (isMikroTik) {
      return [
        '/ip address print',
        '/ip address add',
        '/ip address remove',
        '/ip route print',
        '/ip route add',
        '/ip pool print',
        '/ip pool add',
        '/ip dhcp-server print',
        '/ip dhcp-server network print',
        '/ip dhcp-client print',
        '/ip firewall filter print',
        '/ip firewall filter add',
        '/ip firewall nat print',
        '/ip firewall nat add',
        '/ip firewall mangle print',
        '/ip dns print',
        '/ip dns set servers=',
        '/ip service print',
        '/ip neighbor print',
        '/ip arp print',
        '/interface print',
        '/interface ethernet print',
        '/interface ethernet set',
        '/interface bridge print',
        '/interface bridge port print',
        '/interface bridge port add',
        '/interface vlan print',
        '/interface vlan add',
        '/interface wireless print',
        '/interface wireguard print',
        '/system identity print',
        '/system identity set name=',
        '/system resource print',
        '/system routerboard print',
        '/system health print',
        '/system clock print',
        '/system reboot',
        '/system reset-configuration',
        '/system backup save name=',
        '/system package print',
        '/system user print',
        '/system logging print',
        '/routing ospf instance print',
        '/routing bgp connection print',
        '/tool ping',
        '/tool traceroute',
        '/tool profile',
        '/tool torch',
        '/export compact',
        '/export file=',
        '/log print',
        '/ping',
        'quit',
        'exit',
        'clear',
      ];
    }

    if (isRouter) {
      switch (cliMode) {
        case 'USER_EXEC':
          return [
            'enable',
            'ping',
            'traceroute',
            'show version',
            'show ip interface brief',
            'show ip route',
            'show clock',
            'exit',
            'quit',
            'clear',
          ];
        case 'PRIVILEGED_EXEC':
          return [
            'configure terminal',
            'disable',
            'write memory',
            'copy running-config startup-config',
            'show running-config',
            'show startup-config',
            'show version',
            'show ip interface brief',
            'show ip route',
            'show ip route summary',
            'show ip protocols',
            'show ip ospf neighbor',
            'show ip bgp summary',
            'show ip nat translations',
            'show interfaces',
            'show arp',
            'show cdp neighbors',
            'show lldp neighbors',
            'show access-lists',
            'show ip dhcp binding',
            'show logging',
            'reload',
            'terminal length 0',
            'ping',
            'traceroute',
            'exit',
            'quit',
            'clear',
          ];
        case 'GLOBAL_CONFIG':
          return [
            'hostname',
            'interface',
            ...ports.map((p) => `interface ${p.port_id}`),
            'ip route 0.0.0.0 0.0.0.0',
            'router ospf 1',
            'router bgp',
            'ip dhcp pool',
            'ip dhcp excluded-address',
            'ip nat inside source list 1 interface',
            'ip domain-name',
            'crypto key generate rsa',
            'access-list',
            'line console 0',
            'line vty 0 4',
            'enable secret',
            'banner motd',
            'do show ip route',
            'do show ip interface brief',
            'do show running-config',
            'do write memory',
            'exit',
            'end',
            'clear',
          ];
        case 'INTERFACE_CONFIG':
          return [
            'ip address',
            'no ip address',
            'ip nat inside',
            'ip nat outside',
            'encapsulation dot1Q',
            'description',
            'bandwidth',
            'clock rate 64000',
            'ip ospf 1 area 0',
            'shutdown',
            'no shutdown',
            'do show ip interface brief',
            'do write memory',
            'exit',
            'end',
            'clear',
          ];
        default:
          return ['enable', 'show ip route', 'show ip interface brief', 'exit'];
      }
    }

    // Default: Cisco Switch
    switch (cliMode) {
      case 'USER_EXEC':
        return [
          'enable',
          'ping',
          'traceroute',
          'show version',
          'show ip interface brief',
          'show interfaces status',
          'show clock',
          'show terminal',
          'exit',
          'quit',
          'clear',
        ];
      case 'PRIVILEGED_EXEC':
        return [
          'configure terminal',
          'disable',
          'write memory',
          'copy running-config startup-config',
          'show running-config',
          'show startup-config',
          'show version',
          'show ip interface brief',
          'show interfaces status',
          'show interfaces trunk',
          'show vlan brief',
          'show vlan summary',
          'show mac address-table',
          'show cdp neighbors',
          'show cdp neighbors detail',
          'show lldp neighbors',
          'show spanning-tree',
          'show spanning-tree summary',
          'show port-security',
          'show port-security address',
          'show power inline',
          'show environment',
          'show ip route',
          'show arp',
          'show logging',
          'show clock',
          'show inventory',
          'reload',
          'clear counters',
          'clear mac address-table',
          'terminal length 0',
          'ping',
          'traceroute',
          'exit',
          'quit',
          'clear',
        ];
      case 'GLOBAL_CONFIG':
        return [
          'hostname',
          'interface',
          ...ports.map((p) => `interface ${p.port_id}`),
          'interface range',
          'interface vlan 1',
          'vlan',
          ...vlans.map((v) => `vlan ${v.id}`),
          'ip default-gateway',
          'ip routing',
          'spanning-tree mode rapid-pvst',
          'spanning-tree portfast default',
          'banner motd',
          'enable secret',
          'service password-encryption',
          'line console 0',
          'line vty 0 15',
          'snmp-server community',
          'ntp server',
          'logging buffered',
          'do show running-config',
          'do show ip interface brief',
          'do show vlan brief',
          'do show interfaces status',
          'do write memory',
          'exit',
          'end',
          'clear',
        ];
      case 'INTERFACE_CONFIG':
        return [
          'switchport mode access',
          'switchport mode trunk',
          'switchport access vlan 10',
          'switchport access vlan 20',
          'switchport access vlan 30',
          'switchport trunk allowed vlan 1,10,20,30,50',
          'switchport trunk allowed vlan add',
          'switchport trunk native vlan 1',
          'switchport nonegotiate',
          'switchport port-security',
          'switchport port-security maximum 2',
          'switchport port-security violation shutdown',
          'switchport port-security violation restrict',
          'switchport port-security mac-address sticky',
          'spanning-tree portfast',
          'spanning-tree bpduguard enable',
          'description',
          'speed 1000',
          'duplex full',
          'shutdown',
          'no shutdown',
          'no switchport',
          'ip address',
          'no ip address',
          'do show running-config',
          'do show ip interface brief',
          'do write memory',
          'exit',
          'end',
          'clear',
        ];
      case 'VLAN_CONFIG':
        return [
          'name',
          'state active',
          'state suspend',
          'no shutdown',
          'shutdown',
          'exit',
          'end',
          'clear',
        ];
      default:
        return ['enable', 'show ip interface brief', 'show vlan brief', 'exit'];
    }
  };

  // Tab Autocomplete / Suggestion Handler
  const handleTabCompletion = () => {
    const input = currentInput.trimStart();
    const available = getAvailableCommands();
    const promptText = getPrompt();

    if (!input) {
      const topList = available.slice(0, 15);
      const devTitle = isMikroTik
        ? 'MikroTik RouterOS'
        : isRouter
        ? 'Cisco Router'
        : 'Cisco Switch';
      appendLines([
        { id: String(Date.now()), type: 'input', text: promptText },
        {
          id: String(Date.now() + 1),
          type: 'output',
          text:
            (isEn ? `Available commands for ${devTitle} (${isMikroTik ? 'RouterOS' : cliMode}):\n` : `دستورات قابل استفاده برای ${devTitle} (${isMikroTik ? 'RouterOS' : cliMode}):\n`) +
            topList.map((c) => `  ${c}`).join('\n') +
            (available.length > 15 ? `\n  ... (+${available.length - 15} ${isEn ? 'more in guide' : 'مورد دیگر در راهنما'})` : ''),
        },
      ]);
      return;
    }

    const inputLower = input.toLowerCase();

    // 1. Exact or prefix matches
    let matches = available.filter((c) => c.toLowerCase().startsWith(inputLower));

    // 2. Substring matches if prefix not matched
    if (matches.length === 0) {
      matches = available.filter((c) => c.toLowerCase().includes(inputLower));
    }

    if (matches.length === 1) {
      // Exactly one unique match - auto-complete!
      const completed = matches[0];
      setCurrentInput(completed);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const len = completed.length;
          inputRef.current.setSelectionRange(len, len);
        }
      }, 0);
    } else if (matches.length > 1) {
      // Multiple matches: find longest common prefix (LCP)
      let lcp = matches[0];
      for (let i = 1; i < matches.length; i++) {
        let j = 0;
        while (
          j < lcp.length &&
          j < matches[i].length &&
          lcp[j].toLowerCase() === matches[i][j].toLowerCase()
        ) {
          j++;
        }
        lcp = lcp.slice(0, j);
      }

      if (lcp.length > input.length) {
        setCurrentInput(lcp);
      }

      // Display candidate suggestions in the terminal
      appendLines([
        { id: String(Date.now()), type: 'input', text: `${promptText} ${input}` },
        {
          id: String(Date.now() + 1),
          type: 'output',
          text:
            (isEn ? '% Possible completions:\n' : '% گزینه‌های پیشنهادی برای تکمیل:\n') +
            matches.slice(0, 18).map((m) => `  ${m}`).join('\n') +
            (matches.length > 18 ? `\n  ... (+${matches.length - 18} ${isEn ? 'more' : 'مورد دیگر'})` : ''),
        },
      ]);
    } else {
      // No match
      appendLines([
        { id: String(Date.now()), type: 'input', text: `${promptText} ${input}` },
        {
          id: String(Date.now() + 1),
          type: 'error',
          text: isEn
            ? `% No matching commands found for '${input}'. Press '?' or see Command Guide.`
            : `% هیچ دستور منطبقی برای '${input}' یافت نشد. از کلید '?' یا سایدبار راهنما استفاده کنید.`,
        },
      ]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeCommand(currentInput);
      setCurrentInput('');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleTabCompletion();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        if (historyIndex === -1) {
          draftInputRef.current = currentInput;
        }
        const nextIdx = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(nextIdx);
        const val = history[nextIdx];
        setCurrentInput(val);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(val.length, val.length);
          }
        }, 0);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        const val = history[nextIdx];
        setCurrentInput(val);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(val.length, val.length);
          }
        }, 0);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        const draft = draftInputRef.current;
        setCurrentInput(draft);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(draft.length, draft.length);
          }
        }, 0);
      }
    }
  };

  // Sidebar commands guide data
  const COMMAND_GUIDES: CommandGuideItem[] = [
    // MIKROTIK COMMANDS
    { cmd: '/ip address print', desc: 'نمایش آدرس‌های IP تنظیم‌شده روی اینترفیس‌های میکروتیک', descEn: 'Print IP addresses configured on MikroTik interfaces', category: 'show', mode: 'USER_EXEC', forType: 'mikrotik' },
    { cmd: '/interface print', desc: 'مشاهده لیست تمامی کارت‌های شبکه، پورت‌ها و بریج‌ها', descEn: 'Display list of network interfaces, ports and bridges', category: 'show', mode: 'USER_EXEC', forType: 'mikrotik' },
    { cmd: '/ip route print', desc: 'نمایش جدول روتینگ کامل RouterOS (استاتیک، متصل و داینامیک)', descEn: 'Display complete RouterOS IP routing table', category: 'show', mode: 'USER_EXEC', forType: 'mikrotik' },
    { cmd: '/interface ethernet print', desc: 'مشاهده مشخصات فیزیکی، سرعت، Duplex پورت‌های اترنت', descEn: 'Display physical Ethernet port details and speed', category: 'show', mode: 'USER_EXEC', forType: 'mikrotik' },
    { cmd: '/ip firewall nat print', desc: 'نمایش رول‌های NAT فعال (مانند Masquerade یا Port Forwarding)', descEn: 'Display active NAT firewall rules (masquerade/port-forward)', category: 'show', mode: 'USER_EXEC', forType: 'mikrotik' },
    { cmd: '/ip firewall filter print', desc: 'مشاهده قوانین فیلترینگ و دیوار آتشین امنیتی RouterOS', descEn: 'Display firewall traffic security and filter rules', category: 'show', mode: 'USER_EXEC', forType: 'mikrotik' },
    { cmd: '/ip dhcp-server print', desc: 'نمایش تنظیمات و وضعیت سرور DHCP در میکروتیک', descEn: 'Display active DHCP server configuration and status', category: 'show', mode: 'USER_EXEC', forType: 'mikrotik' },
    { cmd: '/ip pool print', desc: 'مشاهده استخرهای آدرس IP تعریف‌شده برای شبکه', descEn: 'Display defined IP address pools', category: 'show', mode: 'USER_EXEC', forType: 'mikrotik' },
    { cmd: '/system resource print', desc: 'نمایش آمار سخت‌افزاری: مصرف CPU، رم، حافظه دیسک و نسخه', descEn: 'Display hardware specs: CPU load, RAM, disk and version', category: 'show', mode: 'USER_EXEC', forType: 'mikrotik' },
    { cmd: '/system routerboard print', desc: 'مشاهده مدل سخت‌افزار، شماره سریال و نسخه RouterBOOT', descEn: 'Display RouterBOARD model, serial and firmware info', category: 'show', mode: 'USER_EXEC', forType: 'mikrotik' },
    { cmd: '/system identity set name=MikroTik-HQ', desc: 'تغییر نام و شناسه هاست روتربورد در شبکه', descEn: 'Set device identity and hostname', category: 'config', mode: 'USER_EXEC', forType: 'mikrotik' },
    { cmd: '/interface bridge add name=bridge1', desc: 'ساخت اینترفیس جدید Bridge جهت تجمیع پورت‌ها', descEn: 'Create a new bridge interface to aggregate ports', category: 'config', mode: 'USER_EXEC', forType: 'mikrotik' },
    { cmd: '/interface bridge port add bridge=bridge1 interface=ether2', desc: 'افزودن پورت فیزیکی به عضویت اینترفیس Bridge', descEn: 'Add physical port into bridge membership', category: 'config', mode: 'USER_EXEC', forType: 'mikrotik' },
    { cmd: '/ip address add address=192.168.88.1/24 interface=bridge1', desc: 'اختصاص آدرس IP جدید و ساب‌نت به اینترفیس مورد نظر', descEn: 'Assign new IP address and subnet to an interface', category: 'config', mode: 'USER_EXEC', forType: 'mikrotik' },
    { cmd: '/export compact', desc: 'اکسپورت کانفیگ خلاصه و فعال RouterOS به صورت اسکریپت', descEn: 'Export active compact configuration script', category: 'action', mode: 'USER_EXEC', forType: 'mikrotik' },
    { cmd: '/ping 8.8.8.8', desc: 'تست ارسال پاکت‌های پینگ ICMP جهت بررسی ارتباط شبکه', descEn: 'Test network connectivity using ICMP ping', category: 'action', mode: 'USER_EXEC', forType: 'mikrotik' },
    { cmd: '/system reboot', desc: 'راه‌اندازی مجدد و ریبوت دستگاه روتربورد میکروتیک', descEn: 'Reboot MikroTik RouterBOARD system', category: 'action', mode: 'USER_EXEC', forType: 'mikrotik' },
    // USER_EXEC
    { cmd: 'enable', desc: 'ورود به حالت دسترسی ویژه و مدیریتی (Privileged EXEC #)', descEn: 'Enter Privileged EXEC mode (level 15 #)', category: 'exec', mode: 'USER_EXEC' },
    { cmd: 'show version', desc: 'نمایش نسخه IOS-XE، مشخصات سخت‌افزار، حافظه و Uptime', descEn: 'Display IOS-XE version, hardware specs, memory and uptime', category: 'show', mode: 'USER_EXEC' },
    { cmd: 'show ip interface brief', desc: 'مشاهده خلاصه وضعیت اینترفیس‌ها، آی‌پی و لایه فیزیکی', descEn: 'Display interface status, IP addresses, and Layer 1/2 state', category: 'show', mode: 'USER_EXEC' },
    { cmd: 'ping 192.168.1.254', desc: 'تست ارسال بسته‌های ICMP Echo به مقصد شبکه', descEn: 'Send ICMP Echo packets to target network destination', category: 'action', mode: 'USER_EXEC' },
    { cmd: 'exit', desc: 'بستن نشست SSH و خروج از ترمینال', descEn: 'Close SSH session and disconnect', category: 'action', mode: 'USER_EXEC' },

    // PRIVILEGED_EXEC
    { cmd: 'configure terminal', desc: 'ورود به مد تنظیمات کلی سیستم (Global Configuration)', descEn: 'Enter Global Configuration mode (config #)', category: 'config', mode: 'PRIVILEGED_EXEC' },
    { cmd: 'show running-config', desc: 'نمایش پیکربندی فعال و زنده در حافظه موقت (RAM)', descEn: 'Display active configuration currently in RAM', category: 'show', mode: 'PRIVILEGED_EXEC' },
    { cmd: 'show interfaces status', desc: 'نمایش مشخصات پورت‌ها: وضعیت، حالت Trunk/Access، سرعت و VLAN', descEn: 'Display port status, duplex, speed, and VLAN assignment', category: 'show', mode: 'PRIVILEGED_EXEC' },
    { cmd: 'show ip interface brief', desc: 'خلاصه تمامی اینترفیس‌ها، IPها و وضعیت Up/Down', descEn: 'Summary of all interfaces, IPs, and Up/Down status', category: 'show', mode: 'PRIVILEGED_EXEC' },
    { cmd: 'show vlan brief', desc: 'لیست تمامی ویلن‌های موجود در دیتابیس سوئیچ و پورت‌های منتسب', descEn: 'List VLAN database and port assignments', category: 'show', mode: 'PRIVILEGED_EXEC', forType: 'switch' },
    { cmd: 'show mac address-table', desc: 'مشاهده جدول آدرس‌های مک پویای یادگرفته‌شده روی پورت‌ها', descEn: 'Display dynamic MAC address forwarding table', category: 'show', mode: 'PRIVILEGED_EXEC', forType: 'switch' },
    { cmd: 'show cdp neighbors', desc: 'شناسایی و مشاهده تجهیزات سیسکوی متصل به این پورت‌ها', descEn: 'Discover directly connected Cisco neighbor devices', category: 'show', mode: 'PRIVILEGED_EXEC' },
    { cmd: 'show ip route', desc: 'مشاهده جدول مسیریابی IP (Direct, Static, OSPF)', descEn: 'Display IP routing table (Direct, Static, OSPF)', category: 'show', mode: 'PRIVILEGED_EXEC' },
    { cmd: 'write memory', desc: 'ذخیره دائم تغییرات Running-Config در NVRAM (Startup-Config)', descEn: 'Save active running-config to NVRAM (startup-config)', category: 'action', mode: 'PRIVILEGED_EXEC' },
    { cmd: 'disable', desc: 'بازگشت به سطح کاربری عادی User EXEC (>)', descEn: 'Exit Privileged EXEC and return to User EXEC (>)', category: 'action', mode: 'PRIVILEGED_EXEC' },

    // GLOBAL_CONFIG
    { cmd: 'hostname SW-CORE-HQ', desc: 'تغییر نام و شناسه تجهیز در شبکه', descEn: 'Configure device hostname and network identity', category: 'config', mode: 'GLOBAL_CONFIG' },
    { cmd: `interface ${ports[0]?.port_id || 'GigabitEthernet1/0/1'}`, desc: 'ورود به پیکربندی اختصاصی اینترفیس مشخص (config-if)', descEn: 'Enter specific interface configuration mode (config-if)', category: 'config', mode: 'GLOBAL_CONFIG' },
    { cmd: 'vlan 20', desc: 'ساخت یا ورود به تنظیمات شماره ویلن در دیتابیس (config-vlan)', descEn: 'Create or configure VLAN in database (config-vlan)', category: 'config', mode: 'GLOBAL_CONFIG', forType: 'switch' },
    { cmd: 'ip default-gateway 192.168.1.254', desc: 'تنظیم گیت‌وی پیش‌فرض سوئیچ لایه ۲ برای مدیریت از راه دور', descEn: 'Configure default gateway for Layer 2 management', category: 'config', mode: 'GLOBAL_CONFIG', forType: 'switch' },
    { cmd: 'ip route 0.0.0.0 0.0.0.0 192.168.1.254', desc: 'تنظیم دیفالت روت به سمت روتر گیت‌وی لبه', descEn: 'Set default static route to edge gateway router', category: 'config', mode: 'GLOBAL_CONFIG' },
    { cmd: 'do write memory', desc: 'اجرای دستور ذخیره مستقیم بدون خروج از مد کانفیگ (با پیشوند do)', descEn: 'Execute write memory from config mode using "do" prefix', category: 'action', mode: 'GLOBAL_CONFIG' },
    { cmd: 'exit', desc: 'بازگشت به سطح Privileged EXEC (#)', descEn: 'Return to Privileged EXEC level (#)', category: 'action', mode: 'GLOBAL_CONFIG' },
    { cmd: 'end', desc: 'خروج مستقیم به ریشه فرامین مدیریتی (#)', descEn: 'Direct exit to root Privileged EXEC (#)', category: 'action', mode: 'GLOBAL_CONFIG' },

    // INTERFACE_CONFIG
    { cmd: 'switchport mode access', desc: 'تعیین حالت پورت به عنوان Access برای اتصال هاست یا پرینتر', descEn: 'Set port mode to Access for host/printer endpoints', category: 'config', mode: 'INTERFACE_CONFIG', forType: 'switch' },
    { cmd: 'switchport mode trunk', desc: 'تعیین حالت پورت به عنوان Trunk برای عبور ترافیک چند ویلن', descEn: 'Set port mode to Trunk to pass multiple VLAN traffic', category: 'config', mode: 'INTERFACE_CONFIG', forType: 'switch' },
    { cmd: 'switchport access vlan 20', desc: 'انتساب پورت اکسس به شناسه ویلن مشخص (مثلاً VLAN 20)', descEn: 'Assign access port to specific VLAN ID (e.g., VLAN 20)', category: 'config', mode: 'INTERFACE_CONFIG', forType: 'switch' },
    { cmd: 'switchport trunk allowed vlan 1,10,20,50', desc: 'محدودسازی ویلن‌های مجاز به عبور از روی ترانک', descEn: 'Filter and restrict allowed VLANs on trunk port', category: 'config', mode: 'INTERFACE_CONFIG', forType: 'switch' },
    { cmd: 'spanning-tree portfast', desc: 'فعال‌سازی PortFast جهت حذف تاخیر همگرایی STP روی پورت‌های کلاینت', descEn: 'Enable PortFast to eliminate STP convergence delay on host ports', category: 'config', mode: 'INTERFACE_CONFIG', forType: 'switch' },
    { cmd: 'ip address 192.168.10.1 255.255.255.0', desc: 'تخصیص آدرس IP و ساب‌نت ماسک به اینترفیس روتر یا SVI', descEn: 'Assign IP address and subnet mask to router or SVI interface', category: 'config', mode: 'INTERFACE_CONFIG' },
    { cmd: 'description Link to Server-Farm', desc: 'توضیحات و برچسب مستندسازی روی اینترفیس', descEn: 'Set interface documentation label and description', category: 'config', mode: 'INTERFACE_CONFIG' },
    { cmd: 'shutdown', desc: 'خاموش و غیرفعال‌سازی پورت از نظر مدیریتی (Admin Disabled)', descEn: 'Administratively shutdown and disable the interface', category: 'action', mode: 'INTERFACE_CONFIG' },
    { cmd: 'no shutdown', desc: 'روشن و فعال‌سازی مجدد پورت (Up)', descEn: 'Administratively enable and bring interface up (no shutdown)', category: 'action', mode: 'INTERFACE_CONFIG' },
    { cmd: 'exit', desc: 'خروج از اینترفیس و بازگشت به Global Config', descEn: 'Exit interface and return to Global Configuration', category: 'action', mode: 'INTERFACE_CONFIG' },

    // VLAN_CONFIG
    { cmd: 'name Staff-Office', desc: 'نام‌گذاری شناسه ویلن جاری', descEn: 'Assign descriptive name to current VLAN ID', category: 'config', mode: 'VLAN_CONFIG', forType: 'switch' },
    { cmd: 'exit', desc: 'خروج و ذخیره تغییرات ویلن در دیتابیس', descEn: 'Exit and save VLAN changes to switch database', category: 'action', mode: 'VLAN_CONFIG', forType: 'switch' },
  ];

  // Filter commands for sidebar
  const relevantCommands = COMMAND_GUIDES.filter((item) => {
    if (isMikroTik) {
      if (item.forType !== 'mikrotik') return false;
    } else {
      if (item.forType === 'mikrotik') return false;
      if (item.mode !== cliMode) return false;
      if (item.forType === 'switch' && isRouter) return false;
      if (item.forType === 'router' && !isRouter) return false;
    }
    if (commandSearch) {
      const q = commandSearch.toLowerCase();
      const descText = isEn ? item.descEn : item.desc;
      return item.cmd.toLowerCase().includes(q) || descText.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 modal-backdrop-blur overflow-y-auto"
      data-modal-backdrop="true"
      dir={isEn ? 'ltr' : 'rtl'}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCloseModal();
        }
      }}
    >
      <div
        className={`bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 transition-all my-auto max-h-[94vh] sm:max-h-[90vh] ${
          isFullscreen ? 'w-full h-full max-h-screen rounded-none' : 'w-full max-w-6xl'
        }`}
      >
        {/* Top Header Bar */}
        <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isRouter ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'
              }`}
            >
              <TerminalIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white font-mono text-sm tracking-wide">{device.name}</span>
                <span className="terminal-header-ip text-xs font-mono font-bold px-2 py-0.5 rounded-md shadow-xs" title={isEn ? "SSH Connection Target Host" : "آدرس اتصال و پورت SSH"}>
                  {device.ssh_host || device.ip}:{device.ssh_port || 22}
                </span>
                {device.ssh_host && device.ssh_host !== device.ip && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700" title={isEn ? "Device Management IP" : "آدرس IP تجهیز"}>
                    IP: {device.ip}
                  </span>
                )}
                {sshSessionMode === 'real_ssh' ? (
                  <span className="terminal-header-ssh text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-xs" title="Connected via Real SSH Socket">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    LIVE SSH ({sshLatency ? `${sshLatency}ms` : 'Active'})
                  </span>
                ) : (
                  <span className="terminal-header-ssh text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs" title={isEn ? "SSH Protocol Version" : "نسخه پروتکل SSH"}>
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    SSH-2.0 ({device.ssh_username || 'admin'})
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                <span>{device.model}</span>
                <span>•</span>
                <span className="vendor-badge-cisco px-1.5 py-0.5 rounded text-[10px] font-bold">
                  {device.firmware || 'Cisco IOS-XE'}
                </span>
              </div>
            </div>
          </div>

          {/* Center Actions: Write Memory Alert + Dropdown of Interfaces */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Unsaved Changes Warning Badge */}
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px]">{isEn ? 'Unsaved running-config changes' : 'تغییرات در Running-Config ذخیره نشده در استارتاپ'}</span>
                <button
                  onClick={handleExecuteWriteMemory}
                  disabled={isWritingMemory}
                  className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-[10px] transition flex items-center gap-1"
                  title={isEn ? "Execute write memory command directly" : "اجرای مستقیم دستور write memory"}
                >
                  <Save className="w-3 h-3" />
                  <span>Write Memory</span>
                </button>
              </div>
            )}

            {/* Quick Interfaces Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsInterfaceDropdownOpen(!isInterfaceDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition shadow-sm"
              >
                <Cable className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isEn ? `Interfaces (${ports.length})` : `لیست کشویی اینترفیس‌ها (${ports.length})`}</span>
                {isInterfaceDropdownOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {/* Collapsible Interface Table / Drawer */}
              {isInterfaceDropdownOpen && (
                <div
                  ref={interfaceDropdownRef}
                  className={`absolute top-full mt-2 w-[min(440px,calc(100vw-2.5rem))] max-h-[min(360px,50vh)] overflow-y-auto overflow-x-hidden bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50 text-xs custom-scrollbar ${
                    isEn ? 'right-0' : 'left-0'
                  }`}
                  style={{ maxWidth: 'calc(100vw - 2rem)' }}
                  dir={isEn ? 'ltr' : 'rtl'}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                    <span className="font-bold text-slate-200 text-xs">
                      {isEn ? `${device.name} Interfaces` : `اینترفیس‌های ${device.name} (بدون نیاز به بازگشت به صفحه قبل)`}
                    </span>
                    <button
                      onClick={() => setIsInterfaceDropdownOpen(false)}
                      className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {ports.map((p) => {
                      const isUp = p.status === 'up';
                      return (
                        <div
                          key={p.port_id}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 transition gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isUp ? 'bg-emerald-400 shadow-sm shadow-emerald-500' : 'bg-rose-500'
                              }`}
                            ></span>
                            <div className="truncate">
                              <div className="font-mono font-bold text-white text-xs">{p.port_id}</div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {p.connected_device !== 'Disconnected'
                                  ? p.connected_device
                                  : (isEn ? 'Empty / Disconnected' : 'خالی / بدون اتصال')}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] font-mono shrink-0">
                            <span
                              data-badge={p.mode === 'trunk' ? 'port-mode-trunk' : 'port-mode-access'}
                              className={`px-2 py-0.5 rounded font-bold font-mono text-white shadow-xs ${
                                p.mode === 'trunk'
                                  ? 'port-mode-badge-trunk bg-purple-600 border border-purple-500'
                                  : 'port-mode-badge-access bg-indigo-600 border border-indigo-500'
                              }`}
                              style={{ color: '#ffffff', fontWeight: 700 }}
                            >
                              {p.mode.toUpperCase()}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-bold">
                              VLAN {p.vlan}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setIsInterfaceDropdownOpen(false);
                                executeCommand(`interface ${p.port_id}`);
                              }}
                              className="px-2 py-1 rounded bg-indigo-600/80 hover:bg-indigo-600 text-white text-[10px] font-medium transition"
                              title={isEn ? "Select interface in CLI" : "ورود به مد کانفیگ این پورت در ترمینال"}
                            >
                              {isEn ? "Select in CLI" : "انتخاب در CLI"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Terminal Background Color Selector */}
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 shadow-inner" title={isEn ? "Terminal Background Color" : "رنگ پس‌زمینه کنسول ترمینال"}>
              <Palette className="w-3.5 h-3.5 text-slate-400 hidden sm:inline-block" />
              <div className="flex items-center gap-1">
                {TERMINAL_BG_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectBgColor(opt.color)}
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded transition-all cursor-pointer border ${
                      terminalBgColor === opt.color
                        ? 'scale-110 border-white ring-2 ring-indigo-500 shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                        : 'border-white/20 hover:scale-110 hover:border-white/60 opacity-80 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: opt.color }}
                    title={`${isEn ? opt.nameEn : opt.nameFa} (${opt.color})`}
                    aria-label={opt.nameEn}
                  />
                ))}
              </div>
            </div>

            {/* Window & View Controls */}
            <button
              onClick={handleToggleSidebar}
              className={`p-1.5 rounded transition ${
                isSidebarOpen
                  ? 'text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={
                isSidebarOpen
                  ? (isEn ? 'Collapse Command Guide Sidebar' : 'جمع کردن سایدبار راهنما برای بزرگ‌تر شدن ترمینال')
                  : (isEn ? 'Expand Command Guide Sidebar' : 'نمایش سایدبار راهنمای دستورات')
              }
            >
              {isSidebarOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title={isFullscreen ? (isEn ? 'Exit Fullscreen' : 'حالت پنجره') : (isEn ? 'Fullscreen' : 'تمام صفحه')}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={handleCloseModal}
              className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              title={isEn ? 'Close Terminal' : 'بستن ترمینال'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Body: Terminal Screen + Sidebar Guides */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Terminal Console View */}
          <div
            className="cisco-terminal-screen flex-1 flex flex-col p-3.5 overflow-hidden font-mono text-xs select-text transition-colors duration-200"
            style={{
              backgroundColor: terminalBgColor,
              '--cisco-terminal-bg': terminalBgColor,
            } as React.CSSProperties}
          >
            {/* Output Lines Canvas */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 pb-2 scrollbar-thin scrollbar-thumb-slate-700" dir="ltr">
              {lines.map((line) => {
                if (line.type === 'input') {
                  return (
                    <div key={line.id} className="text-emerald-400 font-bold">
                      {line.text}
                    </div>
                  );
                }
                if (line.type === 'system') {
                  return (
                    <div key={line.id} className="text-sky-400 font-medium italic">
                      {line.text}
                    </div>
                  );
                }
                if (line.type === 'error') {
                  return (
                    <div key={line.id} className="text-rose-400 font-medium whitespace-pre-wrap">
                      {line.text}
                    </div>
                  );
                }
                if (line.type === 'success') {
                  return (
                    <div key={line.id} className="text-emerald-300 font-bold whitespace-pre-wrap">
                      {line.text}
                    </div>
                  );
                }
                const isLoginBanner =
                  line.id === 'sys-3' ||
                  line.id === 'sys-4' ||
                  line.id === 'sys-ssh-banner' ||
                  line.text.includes('User Access Verification') ||
                  line.text.includes('Username:') ||
                  line.text.includes('Password:') ||
                  line.text.includes('****************');

                return (
                  <div
                    key={line.id}
                    className={`${
                      isLoginBanner
                        ? 'cisco-terminal-login-banner text-slate-700 dark:text-slate-400 font-semibold'
                        : 'text-slate-200'
                    } whitespace-pre-wrap font-mono`}
                  >
                    {line.text}
                  </div>
                );
              })}
              <div ref={terminalEndRef} />
            </div>

            {/* Input Prompt Box */}
            <div className="mt-2 pt-2 border-t border-slate-800/90 flex items-center gap-2 bg-slate-900/60 px-3 py-1.5 rounded-lg relative" dir="ltr">
              <span className="text-emerald-400 font-bold whitespace-nowrap font-mono">{getPrompt()}</span>
              <input
                ref={inputRef}
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isMikroTik
                    ? (isEn ? "Type RouterOS command (e.g. /ip address print, /interface print, Tab to autocomplete)..." : "دستور میکروتیک را تایپ کنید (مثلاً ip address print/، کلید Tab برای تکمیل)...")
                    : (isEn ? "Type Cisco IOS command (e.g. enable, show ip int brief, Tab to autocomplete)..." : "دستور سیسکو را تایپ کنید (مثلاً enable یا show ip int brief، کلید Tab برای تکمیل)...")
                }
                className="cisco-cli-input flex-1 bg-transparent font-mono outline-none border-none text-xs"
                autoFocus
                dir="ltr"
              />

              {/* History Button & Dropdown Menu */}
              <div className="relative" ref={historyDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition shadow-sm border ${
                    isHistoryOpen
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                  }`}
                  title={isEn ? "Command History (Click to view & select)" : "تاریخچه دستورات ترمینال (کلیک برای مشاهده و انتخاب)"}
                >
                  <HistoryIcon className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">{isEn ? 'History' : 'تاریخچه'}</span>
                  {history.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/30 text-indigo-200 font-mono">
                      {history.length}
                    </span>
                  )}
                </button>

                {/* History Dropdown Menu */}
                {isHistoryOpen && (
                  <div
                    className="absolute bottom-full mb-2 right-0 w-72 sm:w-80 max-h-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col font-sans"
                    dir={isEn ? 'ltr' : 'rtl'}
                  >
                    <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{isEn ? 'Command History' : 'تاریخچه دستورات کاربر'}</span>
                      </div>
                      {history.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setHistory([]);
                            setHistoryIndex(-1);
                          }}
                          className="text-[10px] text-rose-400 hover:text-rose-300 transition"
                          title={isEn ? 'Clear command history' : 'پاک کردن کل تاریخچه'}
                        >
                          {isEn ? 'Clear' : 'پاک‌سازی'}
                        </button>
                      )}
                    </div>

                    <div className="overflow-y-auto max-h-52 p-1.5 space-y-1">
                      {history.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-500 font-mono">
                          {isEn ? 'No commands entered yet' : 'هنوز دستوری در این ترمینال تایپ نشده است'}
                        </div>
                      ) : (
                        history.map((cmd, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setCurrentInput(cmd);
                              setIsHistoryOpen(false);
                              setTimeout(() => {
                                if (inputRef.current) {
                                  inputRef.current.focus();
                                  const len = cmd.length;
                                  inputRef.current.setSelectionRange(len, len);
                                }
                              }, 0);
                            }}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono text-emerald-400 hover:bg-slate-800 hover:text-emerald-300 transition flex items-center justify-between group border border-transparent hover:border-slate-700"
                            dir="ltr"
                          >
                            <span className="truncate flex-1 font-mono">{cmd}</span>
                            <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition whitespace-nowrap ml-2">
                              {isEn ? 'Insert' : 'انتخاب'}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Send Button */}
              <button
                onClick={() => {
                  executeCommand(currentInput);
                  setCurrentInput('');
                }}
                className="cisco-btn-exec px-3 py-1.5 rounded-lg text-white text-xs font-mono font-bold flex items-center gap-1.5 transition shadow-sm shrink-0"
              >
                <Send className="w-3 h-3" />
                <span className="hidden sm:inline">{isEn ? 'Send' : 'ارسال'}</span>
              </button>
            </div>
          </div>

          {/* Context-Aware Cisco / MikroTik Commands Sidebar */}
          {isSidebarOpen && (
            <div className={`cisco-sidebar-guide w-full md:w-80 lg:w-96 border-t md:border-t-0 ${isEn ? 'md:border-l' : 'md:border-r'} flex flex-col overflow-hidden ${isEn ? 'text-left' : 'text-right'}`}>
              {/* Sidebar Header */}
              <div className="p-3 bg-white/50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{isEn ? 'Command Guide' : 'راهنمای هوشمند دستورات'}</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800 font-bold">
                      {isMikroTik ? 'RouterOS' : cliMode}
                    </span>
                    <button
                      onClick={handleToggleSidebar}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                      title={isEn ? 'Collapse Sidebar' : 'جمع کردن سایدبار'}
                    >
                      <PanelRightClose className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Search Commands */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder={isEn ? "Search command or description..." : "جستجوی دستور یا کاربرد..."}
                    value={commandSearch}
                    onChange={(e) => setCommandSearch(e.target.value)}
                    className={`w-full px-2.5 py-1.5 ${isEn ? 'pl-7 pr-2.5' : 'pr-7 pl-2.5'} rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white text-[11px] placeholder:text-slate-400 focus:outline-none focus:border-indigo-500`}
                  />
                  <Search className={`w-3.5 h-3.5 text-slate-400 absolute ${isEn ? 'left-2' : 'right-2'} top-2`} />
                </div>
              </div>

            {/* Current Mode Badge Explanation */}
            <div className="p-2.5 bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
              <div className="font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                <span>{isEn ? 'Current Prompt:' : 'مرحله فعلی:'}</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">{getPrompt()}</span>
              </div>
              <div className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed">
                {cliMode === 'USER_EXEC' &&
                  (isEn
                    ? 'User EXEC mode (>). Basic monitoring and ping commands allowed. Type enable to enter Privileged mode.'
                    : 'حالت کاربری ابتدایی (User EXEC). فقط دستورات اولیه مانیتورینگ و تست پینگ مجاز هستند. برای دسترسی به تنظیمات دستور enable را اجرا کنید.')}
                {cliMode === 'PRIVILEGED_EXEC' &&
                  (isEn
                    ? 'Privileged EXEC mode (#). Full Show, Write Memory, Debug, and configure terminal available.'
                    : 'حالت دسترسی ویژه مدیریتی (Privileged EXEC #). می‌توانید دستورات کامل Show، Write Memory، Debug و ورود به configure terminal را اجرا کنید.')}
                {cliMode === 'GLOBAL_CONFIG' &&
                  (isEn
                    ? 'Global Configuration mode. Set hostname, create VLANs, enter interfaces, routing, and services.'
                    : 'حالت تنظیمات کلی سیستم (Global Config). تنظیم نام هاست، ساخت ویلن، ورود به اینترفیس‌ها، روتینگ و سرویس‌ها در این مد انجام می‌شود.')}
                {cliMode === 'INTERFACE_CONFIG' &&
                  (isEn
                    ? `Interface ${currentInterface || ''} configuration. Set Access/Trunk mode, VLAN, admin status, and STP.`
                    : `حالت پیکربندی پورت ${currentInterface || ''}. تنظیم مود Access/Trunk، ویلن، وضعیت خاموش/روشن، توضیحات پورت و Spanning-Tree.`)}
                {cliMode === 'VLAN_CONFIG' &&
                  (isEn
                    ? `VLAN ${currentVlanId} database configuration. Name and activate VLAN in switch database.`
                    : `حالت تنظیمات دیتابیس VLAN ${currentVlanId}. نام‌گذاری و فعال‌سازی ویلن در سوئیچ.`)}
              </div>
            </div>

            {/* Command Cards List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin scrollbar-thumb-slate-700">
              {relevantCommands.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  {isEn ? 'No commands found for this filter in the current mode.' : 'دستوری با این فیلتر در مد فعلی یافت نشد.'}
                </div>
              ) : (
                relevantCommands.map((item, idx) => (
                  <div
                    key={idx}
                    className="cisco-guide-card p-3 rounded-xl transition-all group"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <code className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-300 group-hover:text-indigo-700 dark:group-hover:text-indigo-200 select-all" dir="ltr">
                        {item.cmd}
                      </code>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-md uppercase font-bold font-mono ${
                          item.category === 'show'
                            ? 'bg-sky-100 text-sky-700 border border-sky-200 dark:bg-sky-950 dark:text-sky-400 dark:border-sky-800'
                            : item.category === 'config'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800'
                            : item.category === 'action'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                            : 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {item.category}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                      {isEn ? item.descEn : item.desc}
                    </p>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        onClick={() => {
                          setCurrentInput(item.cmd);
                          if (inputRef.current) inputRef.current.focus();
                        }}
                        className="cisco-btn-insert px-2.5 py-1 rounded-lg text-[10px] font-semibold transition active:scale-95"
                      >
                        {isEn ? 'Insert' : 'درج در خط فرمان'}
                      </button>
                      <button
                        onClick={() => executeCommand(item.cmd)}
                        className="cisco-btn-exec px-3 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 active:scale-95"
                      >
                        <Play className="w-2.5 h-2.5 fill-current" />
                        <span>{isEn ? 'Run' : 'اجرا'}</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Quick Helper Bar */}
            <div className="p-2.5 bg-white/50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <span>{isEn ? 'Tip: Press Tab to auto-complete' : 'راهنما: برای تکمیل Tab بزنید'}</span>
              <button
                onClick={() => executeCommand('?')}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-mono font-bold"
              >
                {isEn ? '? Command' : 'دستور ?'}
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== Cisco Formatting Helpers ====================

function generateHelpOutput(mode: CliMode, isRouter: boolean): string {
  if (mode === 'USER_EXEC') {
    return `Exec commands:
  enable            Turn on privileged commands
  exit              Exit from the EXEC
  help              Description of the interactive help system
  ping              Send echo messages
  show              Show running system information
  terminal          Set terminal line parameters
  traceroute        Trace route to destination`;
  }
  if (mode === 'PRIVILEGED_EXEC') {
    return `Privileged EXEC commands:
  configure         Enter configuration mode
  copy              Copy from one file to another (e.g. copy run start)
  disable           Turn off privileged commands
  exit              Exit from the EXEC
  ping              Send echo messages
  reload            Halt and perform a cold restart
  show              Show running system information
  write             Write running configuration to memory (NVRAM)`;
  }
  if (mode === 'GLOBAL_CONFIG') {
    return `Configure commands:
  banner            Define a login banner
  default-gateway   Specify default gateway (if not routing IP)
  end               Exit to privileged EXEC mode
  exit              Exit from configure mode
  hostname          Set system's network name
  interface         Select an interface to configure
  ip                Global IP configuration subcommands
  line              Configure a terminal line
  vlan              VLAN configuration commands`;
  }
  if (mode === 'INTERFACE_CONFIG') {
    return `Interface configuration commands:
  bandwidth         Set bandwidth informational parameter
  description       Interface specific description
  duplex            Configure duplex operation
  end               Exit to privileged EXEC mode
  exit              Exit from interface configuration mode
  ip                Interface Internet Protocol config commands
  no                Negate a command or set its defaults
  shutdown          Shut down the selected interface
  speed             Configure speed operation
  switchport        Set switching characteristics of the interface`;
  }
  return `VLAN configuration commands:\n  name     Ascii name of the VLAN\n  exit     Apply changes and bump to previous mode`;
}

function formatShowIpIntBrief(ports: SwitchPort[], device: Device): string {
  let res = 'Interface                  IP-Address      OK? Method Status                Protocol\n';
  res += '----------------------------------------------------------------------------------------\n';
  // Vlan1 / Management
  res += `Vlan1                      ${device.ip.padEnd(15)} YES NVRAM  up                    up\n`;
  for (const p of ports) {
    const ipStr = p.mode === 'trunk' ? 'unassigned' : 'unassigned';
    const st = p.status === 'up' ? 'up' : (p.admin_status === 'disabled' ? 'administratively down' : 'down');
    const proto = p.status === 'up' ? 'up' : 'down';
    res += `${p.port_id.padEnd(26)} ${ipStr.padEnd(15)} YES unset  ${st.padEnd(21)} ${proto}\n`;
  }
  return res;
}

function formatShowInterfacesStatus(ports: SwitchPort[]): string {
  let res = 'Port         Name               Status       Vlan       Duplex  Speed Type\n';
  res += '--------------------------------------------------------------------------------\n';
  for (const p of ports) {
    const st = p.status === 'up' ? 'connected' : (p.admin_status === 'disabled' ? 'disabled' : 'notconnect');
    const vlanStr = p.mode === 'trunk' ? 'trunk' : String(p.vlan);
    const desc = (p.description || p.connected_device || '--').slice(0, 18);
    res += `${p.port_id.padEnd(12)} ${desc.padEnd(18)} ${st.padEnd(12)} ${vlanStr.padEnd(10)} ${p.duplex.padEnd(7)} ${p.speed.padEnd(5)} 10/100/1000BaseTX\n`;
  }
  return res;
}

function formatShowVlanBrief(vlans: VlanInfo[], ports: SwitchPort[]): string {
  let res = 'VLAN Name                             Status    Ports\n';
  res += '---- -------------------------------- --------- ---------------------------------------\n';
  for (const v of vlans) {
    const assignedPorts = ports.filter((p) => p.vlan === v.id && p.mode === 'access').map((p) => p.port_id);
    const portsList = assignedPorts.length > 0 ? assignedPorts.slice(0, 6).join(', ') : '';
    res += `${String(v.id).padEnd(4)} ${v.name.padEnd(32)} active    ${portsList}\n`;
  }
  return res;
}

function formatShowRunningConfig(hostname: string, device: Device, ports: SwitchPort[], vlans: VlanInfo[]): string {
  let res = `Building configuration...\n\nCurrent configuration : 3845 bytes\n!\nversion 17.9\nservice timestamps debug datetime msec\nservice timestamps log datetime msec\nno service password-encryption\n!\nhostname ${hostname}\n!\nspanning-tree mode rapid-pvst\nspanning-tree extend system-id\n!\n`;
  for (const v of vlans) {
    res += `vlan ${v.id}\n name ${v.name.replace(/\s+/g, '_')}\n!\n`;
  }
  for (const p of ports.slice(0, 10)) {
    res += `interface ${p.port_id}\n`;
    if (p.description) res += ` description ${p.description}\n`;
    if (p.mode === 'trunk') {
      res += ` switchport mode trunk\n switchport trunk allowed vlan ${p.allowed_vlans}\n`;
    } else {
      res += ` switchport mode access\n switchport access vlan ${p.vlan}\n`;
    }
    if (p.admin_status === 'disabled') {
      res += ` shutdown\n`;
    }
    res += `!\n`;
  }
  res += `interface Vlan1\n ip address ${device.ip} 255.255.255.0\n no shutdown\n!\nip default-gateway 192.168.1.254\n!\nline con 0\nline vty 0 4\n transport input ssh\n!\nend`;
  return res;
}

function formatShowVersion(device: Device): string {
  return `Cisco IOS XE Software, Version 17.09.03\nCisco IOS Software [Cupertino], Catalyst L3 Switch Software (CAT9K_IOSXE), Version 17.9.3, RELEASE SOFTWARE (fc3)\nTechnical Support: http://www.cisco.com/techsupport\nCopyright (c) 1986-2023 by Cisco Systems, Inc.\n\nROM: IOS-XE ROMMON\n${device.name} uptime is ${device.uptime || '142 days, 6 hours'}\nUptime for this control processor is ${device.uptime || '142 days, 6 hours'}\nSystem image file is "bootflash:packages.conf"\n\ncisco ${device.model} (X86) processor with 3298456K/6147K bytes of memory.\nProcessor board ID FOC2239401A\n1 Virtual Ethernet interface\n${device.total_ports || 48} Gigabit Ethernet interfaces\nBase Ethernet MAC Address: ${device.mac}\nConfiguration register is 0x102`;
}

function formatShowCdpNeighbors(device: Device, ports: SwitchPort[]): string {
  let res = 'Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge\n';
  res += '                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone, D - Remote\n\n';
  res += 'Device ID        Local Intrfce     Holdtme    Capability  Platform  Port ID\n';
  res += '-------------------------------------------------------------------------------\n';
  for (const p of ports.filter((pt) => pt.connected_device && pt.connected_device !== 'Disconnected' && pt.status === 'up').slice(0, 5)) {
    const devId = p.connected_device.split(' ')[0];
    res += `${devId.padEnd(16)} ${p.port_id.padEnd(17)} 165        S I         C9300     Gi1/0/1\n`;
  }
  return res;
}

function formatShowMacTable(ports: SwitchPort[]): string {
  let res = '          Mac Address Table\n';
  res += '-------------------------------------------\n';
  res += 'Vlan    Mac Address       Type        Ports\n';
  res += '----    -----------       --------    -----\n';
  let i = 1;
  for (const p of ports.filter((pt) => pt.status === 'up')) {
    const macEntries: { mac: string; type: string }[] = [];
    if (p.port_security_configured_mac) {
      macEntries.push({ mac: p.port_security_configured_mac, type: 'STATIC' });
    }
    if (p.port_security_learned_macs && p.port_security_learned_macs.length > 0) {
      p.port_security_learned_macs.forEach((m) => {
        macEntries.push({ mac: m, type: p.port_security_mode === 'sticky' ? 'STICKY' : 'DYNAMIC' });
      });
    }
    if (macEntries.length === 0) {
      macEntries.push({ mac: `0050.56a1.b2${(10 + i).toString(16).padStart(2, '0')}`, type: 'DYNAMIC' });
    }
    for (const entry of macEntries) {
      res += `${String(p.vlan).padEnd(7)} ${entry.mac.padEnd(17)} ${entry.type.padEnd(11)} ${p.port_id}\n`;
    }
    i++;
  }
  return res;
}

function formatShowPortSecurity(ports: SwitchPort[]): string {
  let res = 'Secure Port  MaxSecureAddr  CurrentAddr  SecurityViolation  Security Action\n';
  res += '                (Count)       (Count)          (Count)\n';
  res += '---------------------------------------------------------------------------\n';
  const secPorts = ports.filter((p) => p.port_security_enabled);
  if (secPorts.length === 0) {
    return 'No secure ports configured on this device.\n';
  }
  for (const p of secPorts) {
    const maxAddr = p.port_security_max_mac || 1;
    const currAddr = (p.port_security_learned_macs?.length || 0) + (p.port_security_configured_mac ? 1 : 0);
    const action = (p.port_security_violation || 'shutdown').charAt(0).toUpperCase() + (p.port_security_violation || 'shutdown').slice(1);
    res += `${p.port_id.padEnd(12)} ${String(maxAddr).padEnd(14)} ${String(currAddr).padEnd(12)} 0                  ${action}\n`;
  }
  res += '---------------------------------------------------------------------------\n';
  res += `Total Addresses in System (excluding one max per port)     : 0\n`;
  res += `Max Addresses limit in System (excluding one max per port) : 4096\n`;
  return res;
}

function formatShowPortSecurityInterface(p: SwitchPort): string {
  const isEnabled = !!p.port_security_enabled;
  const status = isEnabled ? (p.port_security_status || 'Secure-up') : 'Disabled';
  const violation = (p.port_security_violation || 'shutdown').charAt(0).toUpperCase() + (p.port_security_violation || 'shutdown').slice(1);
  const maxMacs = p.port_security_max_mac || 1;
  const currMacs = (p.port_security_learned_macs?.length || 0) + (p.port_security_configured_mac ? 1 : 0);
  const stickyCount = p.port_security_mode === 'sticky' ? (p.port_security_learned_macs?.length || 0) : 0;
  const lastMac = p.port_security_configured_mac || p.port_security_learned_macs?.[0] || '0000.0000.0000';

  let res = `Port Security              : ${isEnabled ? 'Enabled' : 'Disabled'}\n`;
  res += `Port Status                : ${status}\n`;
  res += `Violation Mode             : ${violation}\n`;
  res += `Aging Time                 : 0 mins\n`;
  res += `Aging Type                 : Absolute\n`;
  res += `SecureStatic Address Aging : Disabled\n`;
  res += `Maximum MAC Addresses      : ${maxMacs}\n`;
  res += `Total MAC Addresses        : ${currMacs}\n`;
  res += `Configured MAC Addresses   : ${p.port_security_configured_mac ? 1 : 0}\n`;
  res += `Sticky MAC Addresses       : ${stickyCount}\n`;
  res += `Last Source Address:Vlan   : ${lastMac}:${p.vlan}\n`;
  res += `Security Violation Count   : 0\n`;
  return res;
}

function formatShowIpRoute(device: Device): string {
  return `Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP\n       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area\n\nGateway of last resort is 192.168.1.254 to network 0.0.0.0\n\nS*    0.0.0.0/0 [1/0] via 192.168.1.254\nC     192.168.1.0/24 is directly connected, Vlan1\nL     ${device.ip}/32 is directly connected, Vlan1\nC     10.10.10.0/24 is directly connected, Vlan10\nC     10.20.20.0/24 is directly connected, Vlan20\nC     10.30.30.0/24 is directly connected, Vlan30`;
}
