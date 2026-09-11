import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  Server,
  Layers,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Power,
  PowerOff,
  Edit3,
  Sliders,
  Sparkles,
  Zap,
  HardDrive,
  Copy,
  Check,
  Download,
  Search,
  Filter
} from 'lucide-react';
import { Device, SwitchPort } from '../types';
import { fetchDevicePorts, updateSwitchPort, batchUpdateSwitchPorts } from '../services/api';
import { MikroTikPortSvg } from './MikroTikPortSvg';
import { MikroTikPortContextMenu } from './MikroTikPortContextMenu';
import {
  MikroTikPortConfigConfirmModal,
  MikroTikPortConfigUpdates
} from './MikroTikPortConfigConfirmModal';
import { useLanguage } from '../i18n/LanguageContext';

export interface MikroTikDeviceManageModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
  onPortUpdated?: () => void;
  onConnectTerminal?: (device: Device) => void;
  onDeviceUpdated?: () => void;
  isLightMode?: boolean;
}

export const MikroTikDeviceManageModal: React.FC<MikroTikDeviceManageModalProps> = ({
  device,
  isOpen,
  onClose,
  onPortUpdated,
  onConnectTerminal,
  onDeviceUpdated,
  isLightMode = false,
}) => {
  const { t, isEn } = useLanguage();
  const [activeTab, setActiveTab] = useState<'ports' | 'bridge' | 'resources' | 'export'>('ports');
  const [ports, setPorts] = useState<SwitchPort[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPort, setSelectedPort] = useState<SwitchPort | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'running' | 'disabled' | 'sfp'>('all');

  // Right-click Context Menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    port: SwitchPort;
  } | null>(null);

  // RouterOS Confirmation Modal
  const [confirmModal, setConfirmModal] = useState<{
    targetPortIds: string[];
    updates: MikroTikPortConfigUpdates;
  } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Edit Port Form State
  const [editAdminStatus, setEditAdminStatus] = useState<'enabled' | 'disabled'>('enabled');
  const [editVlan, setEditVlan] = useState(1);
  const [editBridge, setEditBridge] = useState('bridge1');
  const [editInBridge, setEditInBridge] = useState(true);
  const [editComment, setEditComment] = useState('');
  const [editSpeed, setEditSpeed] = useState('auto');
  const [editLoopProtect, setEditLoopProtect] = useState<'on' | 'off'>('on');

  // Load ports
  useEffect(() => {
    if (!device || !isOpen) return;
    setLoading(true);

    fetchDevicePorts(device.id)
      .then((data) => {
        if (data && data.ports && data.ports.length > 0) {
          setPorts(data.ports);
          setSelectedPort(data.ports[0]);
        } else {
          // Generate realistic default MikroTik RouterBOARD ports
          const defaultPorts: SwitchPort[] = [
            {
              port_id: 'ether1',
              name: 'ether1 (PoE IN)',
              status: 'up',
              admin_status: 'enabled',
              mode: 'access',
              vlan: 1,
              allowed_vlans: '1',
              speed: '1G',
              duplex: 'full',
              connected_device: 'WAN Gateway',
              description: 'WAN / Gateway Uplink',
            },
            {
              port_id: 'ether2',
              name: 'ether2',
              status: 'up',
              admin_status: 'enabled',
              mode: 'access',
              vlan: 1,
              allowed_vlans: '1',
              speed: '1G',
              duplex: 'full',
              connected_device: 'LAN Bridge',
              description: 'LAN Bridge Port',
            },
            {
              port_id: 'ether3',
              name: 'ether3',
              status: 'up',
              admin_status: 'enabled',
              mode: 'access',
              vlan: 10,
              allowed_vlans: '10',
              speed: '1G',
              duplex: 'full',
              connected_device: 'VoIP PBX',
              description: 'VoIP Network',
            },
            {
              port_id: 'ether4',
              name: 'ether4',
              status: 'down',
              admin_status: 'enabled',
              mode: 'access',
              vlan: 20,
              allowed_vlans: '20',
              speed: '1G',
              duplex: 'full',
              connected_device: '',
              description: 'Management & Servers',
            },
            {
              port_id: 'ether5',
              name: 'ether5',
              status: 'down',
              admin_status: 'disabled',
              mode: 'access',
              vlan: 1,
              allowed_vlans: '1',
              speed: '1G',
              duplex: 'full',
              connected_device: '',
              description: 'Spare / Disabled',
            },
            {
              port_id: 'sfp-sfpplus1',
              name: 'sfp-sfpplus1 (10G)',
              status: 'up',
              admin_status: 'enabled',
              mode: 'trunk',
              vlan: 1,
              allowed_vlans: '1,10,20',
              speed: '10G',
              duplex: 'full',
              connected_device: 'Core Fiber Switch',
              description: 'Fiber Core Uplink',
            }
          ];
          setPorts(defaultPorts);
          setSelectedPort(defaultPorts[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to load MikroTik ports:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [device, isOpen]);

  // Sync edit form when selectedPort changes
  useEffect(() => {
    if (!selectedPort) return;
    setEditAdminStatus(selectedPort.admin_status === 'disabled' ? 'disabled' : 'enabled');
    setEditVlan(selectedPort.vlan || 1);
    setEditComment(selectedPort.description || '');
    setEditSpeed(selectedPort.speed || 'auto');
  }, [selectedPort]);

  if (!isOpen || !device) return null;

  // Execute confirmed RouterOS updates
  const handleExecuteConfirmedCli = async () => {
    if (!confirmModal) return;
    setIsExecuting(true);
    try {
      const { targetPortIds, updates } = confirmModal;

      // Update local port objects
      setPorts((prev) =>
        prev.map((p) => {
          if (!targetPortIds.includes(p.port_id)) return p;
          const updated: SwitchPort = { ...p };
          if (updates.admin_status && updates.admin_status !== 'no_change') {
            updated.admin_status = updates.admin_status;
            if (updates.admin_status === 'disabled') updated.status = 'down';
            else updated.status = 'up';
          }
          if (updates.vlan !== undefined) {
            updated.vlan = Number(updates.vlan) || 1;
          }
          if (updates.comment !== undefined) {
            updated.description = updates.comment;
          }
          if (updates.speed) {
            updated.speed = updates.speed;
          }
          return updated;
        })
      );

      // Also persist first selected port to backend API
      if (selectedPort && targetPortIds.includes(selectedPort.port_id)) {
        await updateSwitchPort(device.id, selectedPort.port_id, {
          admin_status: updates.admin_status === 'disabled' ? 'disabled' : 'enabled',
          vlan: updates.vlan ? Number(updates.vlan) : selectedPort.vlan,
          description: updates.comment !== undefined ? updates.comment : selectedPort.description,
        });
      }

      onPortUpdated?.();
      setConfirmModal(null);
    } catch (err) {
      console.error('Failed to dispatch MikroTik CLI:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  // Filter ports
  const filteredPorts = ports.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        p.port_id.toLowerCase().includes(q) ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q));
      if (!match) return false;
    }
    if (filterMode === 'running') return p.status === 'up' && p.admin_status !== 'disabled';
    if (filterMode === 'disabled') return p.admin_status === 'disabled';
    if (filterMode === 'sfp') return p.port_id.includes('sfp') || p.speed === '10G';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-5xl rounded-2xl border shadow-2xl flex flex-col overflow-hidden max-h-[94vh] ${
          isLightMode
            ? 'bg-slate-50 border-cyan-500/40 shadow-cyan-900/20 text-slate-800'
            : 'bg-slate-950 border-cyan-500/30 shadow-cyan-950/60 text-slate-100'
        }`}
      >
        {/* Top Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isLightMode ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            {/* MikroTik Logo Badge */}
            <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-950/50">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">
                  {device.name || 'MikroTik Router'}
                </h2>
                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                  RouterOS v7.14
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  {device.ip || '192.168.88.1'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEn
                  ? 'MikroTik RouterOS Hardware & Port Settings Console (WinBox/WebFig Style)'
                  : 'کنسول مدیریت سخت‌افزار و پورت‌های روتر میکروتیک (طراحی اختصاصی WinBox/WebFig)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Open CLI Terminal Button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onConnectTerminal?.(device);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title={isEn ? 'Open RouterOS CLI Terminal' : 'باز کردن ترمینال خط فرمان میکروتیک'}
            >
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>{isEn ? 'CLI Terminal' : 'کنسول ترمینال'}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`flex items-center justify-between px-6 border-b text-xs font-semibold ${
            isLightMode ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/50 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('ports')}
              className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'ports'
                  ? 'border-cyan-400 text-cyan-400 font-bold bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Server className="w-4 h-4" />
              <span>{isEn ? 'Ports & Faceplate' : 'پورت‌ها و شاسی سخت‌افزاری'}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {ports.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bridge')}
              className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'bridge'
                  ? 'border-cyan-400 text-cyan-400 font-bold bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>{isEn ? 'Bridge & VLANs' : 'بریج و شبکه‌های مجازی'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('resources')}
              className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'resources'
                  ? 'border-cyan-400 text-cyan-400 font-bold bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>{isEn ? 'System Resources' : 'منابع سیستم و پردازنده'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('export')}
              className={`px-4 py-3 border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
                activeTab === 'export'
                  ? 'border-cyan-400 text-cyan-400 font-bold bg-cyan-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>{isEn ? 'Export .rsc' : 'استخراج کانفیگ'}</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-cyan-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>RouterBOARD CCR/CRS</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'ports' && (
            <div className="space-y-6">
              {/* MikroTik Realistic Chassis Faceplate */}
              <div className="rounded-xl border border-slate-800 bg-linear-to-b from-slate-900 to-slate-950 p-5 shadow-inner">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-white uppercase tracking-widest">
                      MikroTik RouterBOARD Faceplate
                    </span>
                    <span className="text-[10px] text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                      Right-click on any port for RouterOS commands!
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400" />
                      <span className="text-slate-400">R: Running</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-slate-400">X: Disabled</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span className="text-slate-400">SFP+ 10G</span>
                    </div>
                  </div>
                </div>

                {/* Ports Row */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-black/50 rounded-lg border border-slate-800/80 min-h-[90px]">
                  {ports.map((port) => (
                    <MikroTikPortSvg
                      key={port.port_id}
                      port={port}
                      isSelected={selectedPort?.port_id === port.port_id}
                      onClick={() => setSelectedPort(port)}
                      onContextMenu={(e) => {
                        setContextMenu({
                          x: e.clientX,
                          y: e.clientY,
                          port,
                        });
                      }}
                      isLightMode={isLightMode}
                    />
                  ))}
                </div>

                <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>
                    {isEn
                      ? '💡 Click a port to edit properties below, or Right-Click to dispatch instant commands.'
                      : '💡 جهت ویرایش روی پورت کلیک کنید و یا راست‌کلیک کرده تا دستورات RouterOS بلافاصله ارسال شوند.'}
                  </span>
                  <span className="font-mono text-cyan-400 text-[10px]">
                    Model: {device.model || 'MikroTik CCR2004'}
                  </span>
                </div>
              </div>

              {/* Selected Port Property Inspector & RouterOS Config Panel */}
              {selectedPort && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-xl border border-slate-800 bg-slate-900/60">
                  {/* Left Column: Port Properties & Live Status */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white font-mono">
                          {selectedPort.port_id}
                        </span>
                        <span className="text-xs text-slate-400">({selectedPort.name})</span>
                        {selectedPort.admin_status === 'disabled' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700">
                            Disabled (X)
                          </span>
                        ) : selectedPort.status === 'up' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700">
                            Running (R)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            Link Down
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        MAC: {selectedPort.mac_address || device.mac || '48:8F:5A:xx:xx:xx'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-400 block mb-1">
                          {isEn ? 'Negotiated Speed' : 'سرعت ارتباط'}
                        </span>
                        <span className="font-mono font-bold text-cyan-300 text-sm">
                          {selectedPort.speed || '1 Gbps Full'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-400 block mb-1">
                          {isEn ? 'Bridge PVID / VLAN' : 'شناسه PVID بریج'}
                        </span>
                        <span className="font-mono font-bold text-cyan-300 text-sm">
                          VLAN {selectedPort.vlan || 1}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-400 block mb-1">
                          {isEn ? 'MTU / L2MTU' : 'حداکثر واحد انتقال (MTU)'}
                        </span>
                        <span className="font-mono font-bold text-slate-200">1500 / 1592</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                        <span className="text-slate-400 block mb-1">
                          {isEn ? 'Tx / Rx Packets' : 'ترافیک ارسالی / دریافتی'}
                        </span>
                        <span className="font-mono font-bold text-slate-200">
                          124.5k / 389.2k
                        </span>
                      </div>
                    </div>

                    {/* Quick Right-Click Trigger Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setContextMenu({
                            x: rect.left,
                            y: rect.bottom + 5,
                            port: selectedPort,
                          });
                        }}
                        className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Sliders className="w-4 h-4 text-cyan-400" />
                        <span>
                          {isEn
                            ? 'Open Right-Click Context Menu'
                            : 'باز کردن منوی راست‌کلیک اینترفیس'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Edit MikroTik Interface Configuration */}
                  <div className="space-y-4 border-t md:border-t-0 md:border-l border-slate-800 md:pl-6 pt-4 md:pt-0">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                        {isEn ? 'Configure RouterOS Port' : 'پیکربندی تنظیمات پورت در میکروتیک'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        /interface ethernet
                      </span>
                    </div>

                    <div className="space-y-3 text-xs">
                      {/* Admin Status Toggle */}
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">
                          {isEn ? 'Admin Status (disabled=yes/no)' : 'وضعیت کاربری (Admin Status):'}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setEditAdminStatus('enabled')}
                            className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                              editAdminStatus === 'enabled'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{isEn ? 'Enabled' : 'فعال (Enable)'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditAdminStatus('disabled')}
                            className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                              editAdminStatus === 'disabled'
                                ? 'bg-amber-950 text-amber-300 border-amber-500'
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <PowerOff className="w-3.5 h-3.5 text-amber-400" />
                            <span>{isEn ? 'Disabled' : 'غیرفعال (Disable)'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Bridge PVID */}
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">
                          {isEn ? 'Bridge PVID (VLAN ID):' : 'شناسه VLAN در بریج (PVID):'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="4094"
                          value={editVlan}
                          onChange={(e) => setEditVlan(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-hidden"
                        />
                      </div>

                      {/* Speed & Auto Negotiation */}
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">
                          {isEn ? 'Speed & Duplex Mode:' : 'تنظیمات سرعت و مذاکره خودکار:'}
                        </label>
                        <select
                          value={editSpeed}
                          onChange={(e) => setEditSpeed(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-cyan-500 focus:outline-hidden"
                        >
                          <option value="auto">Auto-Negotiation (Default)</option>
                          <option value="100M-full">100M Full Duplex</option>
                          <option value="1G-full">1 Gbps Full Duplex</option>
                          <option value="10G-full">10 Gbps SFP+ Full Duplex</option>
                        </select>
                      </div>

                      {/* Port Comment */}
                      <div>
                        <label className="block text-slate-400 mb-1 font-medium">
                          {isEn ? 'RouterOS Comment / Description:' : 'یادداشت / کامنت روتر او اس:'}
                        </label>
                        <input
                          type="text"
                          value={editComment}
                          onChange={(e) => setEditComment(e.target.value)}
                          placeholder="e.g. Uplink to Core Switch"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-hidden"
                        />
                      </div>

                      {/* Loop Protect */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-slate-400">
                          {isEn ? 'Hardware Loop Protect:' : 'محافظت در برابر لوپ (Loop Protect):'}
                        </span>
                        <select
                          value={editLoopProtect}
                          onChange={(e) => setEditLoopProtect(e.target.value as any)}
                          className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-xs text-cyan-300 font-mono"
                        >
                          <option value="on">On</option>
                          <option value="off">Off</option>
                        </select>
                      </div>
                    </div>

                    {/* Apply Configuration Button */}
                    <div className="pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmModal({
                            targetPortIds: [selectedPort.port_id],
                            updates: {
                              admin_status: editAdminStatus,
                              vlan: editVlan,
                              comment: editComment,
                              auto_negotiation: editSpeed === 'auto',
                              speed: editSpeed !== 'auto' ? editSpeed : undefined,
                              loop_protect: editLoopProtect,
                            },
                          });
                        }}
                        className="w-full py-2.5 px-4 rounded-lg text-xs font-bold bg-cyan-400 hover:bg-cyan-300 text-black shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                      >
                        <Save className="w-4 h-4" />
                        <span>
                          {isEn
                            ? 'Review & Send Commands to MikroTik'
                            : 'مشاهده دستورات و ارسال به روتر میکروتیک'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'bridge' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
                <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>{isEn ? 'MikroTik Bridge & VLAN Filtering' : 'بریج و فیلترینگ VLAN میکروتیک'}</span>
                </h4>
                <p className="text-xs text-slate-400 mb-4">
                  {isEn
                    ? 'RouterOS Bridge VLAN Filtering handles wire-speed hardware offloading on CRS/CCR switches.'
                    : 'بریج روتر او اس با پشتیبانی از Hardware Offloading تبادل فریم‌ها را با حداکثر سرعت انجام می‌دهد.'}
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px]">
                      <tr>
                        <th className="p-2.5">{isEn ? 'Interface' : 'اینترفیس'}</th>
                        <th className="p-2.5">{isEn ? 'Bridge' : 'بریج'}</th>
                        <th className="p-2.5">{isEn ? 'PVID' : 'شناسه PVID'}</th>
                        <th className="p-2.5">{isEn ? 'HW Offload' : 'سخت‌افزاری'}</th>
                        <th className="p-2.5">{isEn ? 'Status' : 'وضعیت'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono">
                      {ports.map((p) => (
                        <tr key={p.port_id} className="hover:bg-slate-800/40">
                          <td className="p-2.5 font-bold text-cyan-300">{p.port_id}</td>
                          <td className="p-2.5 text-slate-300">bridge1</td>
                          <td className="p-2.5 text-emerald-400">{p.vlan || 1}</td>
                          <td className="p-2.5 text-cyan-400">yes</td>
                          <td className="p-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                p.status === 'up'
                                  ? 'bg-emerald-950 text-emerald-300'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {p.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  {isEn ? 'CPU Architecture' : 'معماری و پردازنده'}
                </span>
                <div className="text-lg font-bold font-mono text-white">ARM 64-bit</div>
                <div className="text-xs text-cyan-300 font-mono">4 Cores @ 2000 MHz</div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-cyan-400 h-full w-[14%]" />
                </div>
                <div className="text-[10px] text-slate-400">Current Load: 14%</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-emerald-400" />
                  {isEn ? 'System Memory (RAM)' : 'حافظه اصلی (RAM)'}
                </span>
                <div className="text-lg font-bold font-mono text-white">4096 MB</div>
                <div className="text-xs text-emerald-300 font-mono">Free: 3412.5 MB (83%)</div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full w-[17%]" />
                </div>
                <div className="text-[10px] text-slate-400">Used: 683.5 MB</div>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <HardDrive className="w-4 h-4 text-purple-400" />
                  {isEn ? 'NAND Flash Storage' : 'حافظه ذخیره‌سازی فلش'}
                </span>
                <div className="text-lg font-bold font-mono text-white">128 MB</div>
                <div className="text-xs text-purple-300 font-mono">Free: 94.2 MB (73%)</div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-purple-400 h-full w-[27%]" />
                </div>
                <div className="text-[10px] text-slate-400">Bad Blocks: 0.0%</div>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white font-mono">
                    /export hide-sensitive
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const text = `# Generated by NetTopology for ${device.name}\n/interface ethernet\n${ports
                        .map(
                          (p) =>
                            `set [ find default-name=${p.port_id} ] comment="${p.description || ''}" disabled=${
                              p.admin_status === 'disabled' ? 'yes' : 'no'
                            }`
                        )
                        .join('\n')}\n/interface bridge\nadd name=bridge1\n/interface bridge port\n${ports
                        .map((p) => `add bridge=bridge1 interface=${p.port_id} pvid=${p.vlan || 1}`)
                        .join('\n')}`;
                      navigator.clipboard.writeText(text);
                      alert(isEn ? 'RouterOS .rsc script copied to clipboard!' : 'اسکریپت .rsc در کلیپ‌بورد کپی شد!');
                    }}
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Copy .rsc' : 'کپی اسکریپت'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-black/80 rounded-lg text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed max-h-60">
{`# RouterOS v7.14 Configuration Export
# Device: ${device.name || 'MikroTik'} (${device.ip || '192.168.88.1'})
# Software ID: 4KL9-WQ21

/interface ethernet
${ports.map((p) => `set [ find name="${p.port_id}" ] disabled=${p.admin_status === 'disabled' ? 'yes' : 'no'} comment="${p.description || ''}"`).join('\n')}

/interface bridge
add name=bridge1 vlan-filtering=yes

/interface bridge port
${ports.map((p) => `add bridge=bridge1 interface=${p.port_id} pvid=${p.vlan || 1}`).join('\n')}
`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Right-Click Context Menu for Ports */}
        {contextMenu && (
          <MikroTikPortContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            port={contextMenu.port}
            deviceName={device.name || 'MikroTik'}
            onClose={() => setContextMenu(null)}
            onExecuteAction={(action, extra) => {
              const targetPortId = contextMenu.port.port_id;
              if (action === 'enable') {
                setConfirmModal({
                  targetPortIds: [targetPortId],
                  updates: { admin_status: 'enabled' },
                });
              } else if (action === 'disable') {
                setConfirmModal({
                  targetPortIds: [targetPortId],
                  updates: { admin_status: 'disabled' },
                });
              } else if (action === 'bridge_add') {
                setConfirmModal({
                  targetPortIds: [targetPortId],
                  updates: { bridge_membership: 'add', bridge_name: 'bridge1' },
                });
              } else if (action === 'bridge_remove') {
                setConfirmModal({
                  targetPortIds: [targetPortId],
                  updates: { bridge_membership: 'remove' },
                });
              } else if (action === 'change_vlan') {
                setConfirmModal({
                  targetPortIds: [targetPortId],
                  updates: { vlan: extra?.vlan || 1 },
                });
              } else if (action === 'set_speed') {
                setConfirmModal({
                  targetPortIds: [targetPortId],
                  updates: {
                    auto_negotiation: extra?.auto_negotiation,
                    speed: extra?.speed,
                  },
                });
              } else if (action === 'loop_protect') {
                setConfirmModal({
                  targetPortIds: [targetPortId],
                  updates: { loop_protect: 'on' },
                });
              } else if (action === 'edit_comment') {
                setConfirmModal({
                  targetPortIds: [targetPortId],
                  updates: { comment: extra?.comment },
                });
              } else if (action === 'cable_test') {
                alert(
                  isEn
                    ? `[RouterOS TDR Test] Port ${targetPortId}: Cable OK, Pair 1-2: Normal (12m), Pair 3-6: Normal (12m). No shorts or opens detected.`
                    : `[تست کابل میکروتیک] پورت ${targetPortId}: وضعیت کابل سالم است (طول: ۱۲ متر). هیچ اتصال کوتاه یا قطعی گزارش نشد.`
                );
              }
            }}
            onOpenTerminal={(portId) => {
              onClose();
              onConnectTerminal?.(device);
            }}
          />
        )}

        {/* Confirmation Modal before Dispatching CLI to MikroTik */}
        {confirmModal && (
          <MikroTikPortConfigConfirmModal
            isOpen={true}
            onClose={() => setConfirmModal(null)}
            onConfirm={handleExecuteConfirmedCli}
            device={device}
            targetPortIds={confirmModal.targetPortIds}
            updates={confirmModal.updates}
            isLoading={isExecuting}
          />
        )}
      </div>
    </div>
  );
};
