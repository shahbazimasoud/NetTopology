import React, { useState, useEffect } from 'react';
import { X, Cable, Zap, Shield, ShieldCheck, ShieldAlert, CheckCircle2, AlertCircle, Edit3, Save, Power, Terminal, AlertTriangle, ArrowRight, Check, Lock, Key } from 'lucide-react';
import { Device, SwitchPort } from '../types';
import { fetchDevicePorts, updateSwitchPort, writeMemory } from '../services/api';
import { NetworkPortSvg } from './NetworkPortSvg';
import { useLanguage } from '../i18n/LanguageContext';

interface PortInspectorModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
  onPortUpdated?: () => void;
  onConnectTerminal?: (device: Device) => void;
  onWriteMemory?: (deviceId: string) => void;
}

export const PortInspectorModal: React.FC<PortInspectorModalProps> = ({
  device,
  isOpen,
  onClose,
  onPortUpdated,
  onConnectTerminal,
  onWriteMemory,
}) => {
  const { t, isEn } = useLanguage();
  const [ports, setPorts] = useState<SwitchPort[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPort, setSelectedPort] = useState<SwitchPort | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'up' | 'down' | 'trunk' | 'access' | 'port-sec'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editAdminStatus, setEditAdminStatus] = useState<'enabled' | 'disabled'>('enabled');
  const [editMode, setEditMode] = useState<'trunk' | 'access'>('access');
  const [editVlan, setEditVlan] = useState(1);
  const [editAllowedVlans, setEditAllowedVlans] = useState('');
  const [editConnected, setEditConnected] = useState('');
  const [editDesc, setEditDesc] = useState('');
  // Cisco Port Security Editing state
  const [editPortSecEnabled, setEditPortSecEnabled] = useState(false);
  const [editPortSecMaxMac, setEditPortSecMaxMac] = useState(1);
  const [editPortSecMode, setEditPortSecMode] = useState<'sticky' | 'configured' | 'dynamic'>('sticky');
  const [editPortSecConfiguredMac, setEditPortSecConfiguredMac] = useState('');
  const [editPortSecViolation, setEditPortSecViolation] = useState<'shutdown' | 'restrict' | 'protect'>('shutdown');
  const [isSaving, setIsSaving] = useState(false);

  // Confirmation Summary Modal state
  const [showConfirmSummary, setShowConfirmSummary] = useState(false);
  const [isWritingMem, setIsWritingMem] = useState(false);

  useEffect(() => {
    if (device && isOpen) {
      loadPorts();
    }
  }, [device, isOpen]);

  const loadPorts = async () => {
    if (!device) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchDevicePorts(device.id);
      setPorts(res.ports);
      if (res.ports.length > 0) {
        setSelectedPort(res.ports[0]);
      }
    } catch (err: any) {
      setError(err.message || 'خطا در بارگذاری اطلاعات پورت‌ها');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPort = (port: SwitchPort) => {
    setSelectedPort(port);
    setIsEditing(false);
  };

  const startEdit = (port: SwitchPort) => {
    setSelectedPort(port);
    setEditAdminStatus(port.admin_status);
    setEditMode(port.mode);
    setEditVlan(port.vlan);
    setEditAllowedVlans(port.allowed_vlans || '');
    setEditConnected(port.connected_device || '');
    setEditDesc(port.description || '');
    setEditPortSecEnabled(!!port.port_security_enabled);
    setEditPortSecMaxMac(port.port_security_max_mac || 1);
    setEditPortSecMode(port.port_security_mode || 'sticky');
    setEditPortSecConfiguredMac(port.port_security_configured_mac || '');
    setEditPortSecViolation(port.port_security_violation || 'shutdown');
    setIsEditing(true);
  };

  // Called when user clicks "ذخیره در سوئیچ" -> opens summary modal first
  const handleOpenSummary = () => {
    setShowConfirmSummary(true);
  };

  // Called after confirmation in summary modal
  const handleConfirmSave = async () => {
    if (!device || !selectedPort) return;
    try {
      setIsSaving(true);
      const res = await updateSwitchPort(device.id, selectedPort.port_id, {
        admin_status: editAdminStatus,
        status: editAdminStatus === 'disabled' ? 'down' : 'up',
        mode: editMode,
        vlan: editVlan,
        allowed_vlans: editAllowedVlans,
        connected_device: editConnected,
        description: editDesc,
        port_security_enabled: editPortSecEnabled,
        port_security_max_mac: editPortSecMaxMac,
        port_security_mode: editPortSecMode,
        port_security_configured_mac: editPortSecConfiguredMac,
        port_security_violation: editPortSecViolation,
      });

      // Update local ports
      setPorts((prev) =>
        prev.map((p) => (p.port_id === selectedPort.port_id ? res.port : p))
      );
      setSelectedPort(res.port);
      setIsEditing(false);
      setShowConfirmSummary(false);
      if (device) {
        device.has_unsaved_changes = true;
      }
      if (onPortUpdated) onPortUpdated();
    } catch (err: any) {
      alert('خطا در ذخیره پیکربندی پورت: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleWriteMemory = async () => {
    if (!device) return;
    try {
      setIsWritingMem(true);
      await writeMemory(device.id);
      device.has_unsaved_changes = false;
      if (onPortUpdated) onPortUpdated();
    } catch (err: any) {
      alert('خطا در ذخیره سازی در استارتاپ: ' + err.message);
    } finally {
      setIsWritingMem(false);
    }
  };

  if (!isOpen || !device) return null;

  // Build list of changed properties for the summary modal
  const changedFields: { label: string; oldVal: string; newVal: string }[] = [];
  if (selectedPort) {
    if (selectedPort.admin_status !== editAdminStatus) {
      changedFields.push({
        label: isEn ? 'Admin Status' : 'وضعیت مدیریتی پورت (Admin Status)',
        oldVal: selectedPort.admin_status === 'enabled' ? (isEn ? 'Enabled (No Shutdown)' : 'فعال (No Shutdown)') : (isEn ? 'Disabled (Shutdown)' : 'غیرفعال (Shutdown)'),
        newVal: editAdminStatus === 'enabled' ? (isEn ? 'Enabled (No Shutdown)' : 'فعال (No Shutdown)') : (isEn ? 'Disabled (Shutdown)' : 'غیرفعال (Shutdown)'),
      });
    }
    if (selectedPort.mode !== editMode) {
      changedFields.push({
        label: isEn ? 'Switchport Mode' : 'حالت پورت (Switchport Mode)',
        oldVal: selectedPort.mode === 'trunk' ? (isEn ? 'Trunk' : 'Trunk (ترانک)') : (isEn ? 'Access' : 'Access (اکسس)'),
        newVal: editMode === 'trunk' ? (isEn ? 'Trunk' : 'Trunk (ترانک)') : (isEn ? 'Access' : 'Access (اکسس)'),
      });
    }
    if (selectedPort.vlan !== editVlan) {
      changedFields.push({
        label: isEn ? 'Access VLAN ID' : 'شماره ویلن (Access VLAN ID)',
        oldVal: `VLAN ${selectedPort.vlan}`,
        newVal: `VLAN ${editVlan}`,
      });
    }
    if ((selectedPort.allowed_vlans || '') !== editAllowedVlans && editMode === 'trunk') {
      changedFields.push({
        label: isEn ? 'Allowed VLANs' : 'ویلن‌های مجاز عبور ترانک (Allowed VLANs)',
        oldVal: selectedPort.allowed_vlans || (isEn ? 'All' : 'همه'),
        newVal: editAllowedVlans || (isEn ? 'All' : 'همه'),
      });
    }
    if ((selectedPort.connected_device || '') !== editConnected) {
      changedFields.push({
        label: isEn ? 'Connected Device/Host' : 'تجهیز یا هاست متصل',
        oldVal: selectedPort.connected_device || (isEn ? 'None' : 'تجهیزی متصل نیست'),
        newVal: editConnected || (isEn ? 'Empty' : 'خالی'),
      });
    }
    if ((selectedPort.description || '') !== editDesc) {
      changedFields.push({
        label: isEn ? 'Port Description' : 'توضیحات پورت (Port Description)',
        oldVal: selectedPort.description || (isEn ? 'None' : 'ندارد'),
        newVal: editDesc || (isEn ? 'None' : 'ندارد'),
      });
    }

    // Port Security Changes Diff
    const oldSecEnabled = !!selectedPort.port_security_enabled;
    if (oldSecEnabled !== editPortSecEnabled) {
      changedFields.push({
        label: isEn ? 'Port Security Status' : 'وضعیت Port Security',
        oldVal: oldSecEnabled ? (isEn ? 'Enabled' : 'فعال (Enabled)') : (isEn ? 'Disabled' : 'غیرفعال (Disabled)'),
        newVal: editPortSecEnabled ? (isEn ? 'Enabled' : 'فعال (Enabled)') : (isEn ? 'Disabled' : 'غیرفعال (Disabled)'),
      });
    }

    if (editPortSecEnabled) {
      const oldMax = selectedPort.port_security_max_mac || 1;
      if (oldMax !== editPortSecMaxMac) {
        changedFields.push({
          label: isEn ? 'Maximum MACs' : 'حداکثر مک آدرس مجاز (Maximum MACs)',
          oldVal: `${oldMax} ${isEn ? 'MAC(s)' : 'آدرس'}`,
          newVal: `${editPortSecMaxMac} ${isEn ? 'MAC(s)' : 'آدرس'}`,
        });
      }

      const oldMode = selectedPort.port_security_mode || 'sticky';
      if (oldMode !== editPortSecMode) {
        const modeLabels: Record<string, string> = {
          sticky: isEn ? 'Sticky (Auto Learned)' : 'استیکی (Sticky - چسبنده خودکار)',
          configured: isEn ? 'Configured (Manual Static)' : 'کانفیگور (Configured - دستی)',
          dynamic: isEn ? 'Dynamic (CAM Memory)' : 'داینامیک (Dynamic - پویا)',
        };
        changedFields.push({
          label: isEn ? 'MAC Learning Mode' : 'تعریف مود یادگیری مک (Learning Mode)',
          oldVal: modeLabels[oldMode] || oldMode,
          newVal: modeLabels[editPortSecMode] || editPortSecMode,
        });
      }

      if (editPortSecMode === 'configured') {
        const oldConfMac = selectedPort.port_security_configured_mac || '';
        if (oldConfMac !== editPortSecConfiguredMac) {
          changedFields.push({
            label: isEn ? 'Configured Static MAC' : 'مک آدرس کانفیگ شده (Configured Static MAC)',
            oldVal: oldConfMac || (isEn ? 'None' : 'ثبت نشده'),
            newVal: editPortSecConfiguredMac || (isEn ? 'None' : 'ثبت نشده'),
          });
        }
      }

      const oldViolation = selectedPort.port_security_violation || 'shutdown';
      if (oldViolation !== editPortSecViolation) {
        const violLabels: Record<string, string> = {
          shutdown: isEn ? 'Shutdown (Err-Disable)' : 'Shutdown (خاموشی اینترفیس و Err-Disable)',
          restrict: isEn ? 'Restrict (Drop packet + Log/Trap)' : 'Restrict (مسدودسازی بسته و ارسال لاگ/Trap)',
          protect: isEn ? 'Protect (Drop packet silent)' : 'Protect (انداختن فریم بدون تولید لاگ)',
        };
        changedFields.push({
          label: isEn ? 'Violation Action' : 'سیاست برخورد با تخلف (Violation Action)',
          oldVal: violLabels[oldViolation] || oldViolation,
          newVal: violLabels[editPortSecViolation] || editPortSecViolation,
        });
      }
    }
  }

  // Generate Cisco CLI commands preview
  const generateCiscoCommands = () => {
    if (!selectedPort) return '';
    const lines = [
      `${device.name}# configure terminal`,
      `${device.name}(config)# interface ${selectedPort.port_id}`,
    ];
    if (editMode === 'trunk') {
      lines.push(`${device.name}(config-if)# switchport mode trunk`);
      if (editAllowedVlans) {
        lines.push(`${device.name}(config-if)# switchport trunk allowed vlan ${editAllowedVlans}`);
      }
    } else {
      lines.push(`${device.name}(config-if)# switchport mode access`);
      lines.push(`${device.name}(config-if)# switchport access vlan ${editVlan}`);
    }

    // Cisco Port Security commands
    if (editPortSecEnabled) {
      if (editMode !== 'access') {
        lines.push(`${device.name}(config-if)# switchport mode access`);
      }
      lines.push(`${device.name}(config-if)# switchport port-security`);
      lines.push(`${device.name}(config-if)# switchport port-security maximum ${editPortSecMaxMac}`);
      if (editPortSecMode === 'sticky') {
        lines.push(`${device.name}(config-if)# switchport port-security mac-address sticky`);
      } else if (editPortSecMode === 'configured' && editPortSecConfiguredMac) {
        lines.push(`${device.name}(config-if)# switchport port-security mac-address ${editPortSecConfiguredMac}`);
      }
      lines.push(`${device.name}(config-if)# switchport port-security violation ${editPortSecViolation}`);
    } else if (selectedPort.port_security_enabled && !editPortSecEnabled) {
      lines.push(`${device.name}(config-if)# no switchport port-security`);
    }

    if (editAdminStatus === 'disabled') {
      lines.push(`${device.name}(config-if)# shutdown`);
    } else {
      lines.push(`${device.name}(config-if)# no shutdown`);
    }
    if (editDesc) {
      lines.push(`${device.name}(config-if)# description ${editDesc}`);
    }
    lines.push(`${device.name}(config-if)# exit`);
    return lines.join('\n');
  };

  if (!isOpen || !device) return null;

  const filteredPorts = ports.filter((p) => {
    if (filterMode === 'up' && p.status !== 'up') return false;
    if (filterMode === 'down' && p.status !== 'down') return false;
    if (filterMode === 'trunk' && p.mode !== 'trunk') return false;
    if (filterMode === 'access' && p.mode !== 'access') return false;
    if (filterMode === 'port-sec' && !p.port_security_enabled) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.port_id.toLowerCase().includes(q) ||
        p.connected_device.toLowerCase().includes(q) ||
        String(p.vlan).includes(q) ||
        p.mode.toLowerCase().includes(q) ||
        (p.port_security_mode && p.port_security_mode.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const activeCount = ports.filter((p) => p.status === 'up').length;
  const inactiveCount = ports.filter((p) => p.status === 'down').length;
  const trunkCount = ports.filter((p) => p.mode === 'trunk').length;
  const portSecCount = ports.filter((p) => p.port_security_enabled).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 modal-backdrop-blur overflow-y-auto" data-modal-backdrop="true">
      <div 
        dir={isEn ? 'ltr' : 'rtl'}
        className={`port-inspector-modal spatial-glass border border-white/15 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] sm:max-h-[88vh] text-slate-100 ${isEn ? 'text-left' : 'text-right'}`}
      >
        {/* Header */}
        <div className="px-5 py-3 border-b border-white/10 bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-md">
              <Cable className="w-4 h-4 text-cyan-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-mono">{device.name}</h3>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-white/10 text-cyan-300 font-mono border border-white/15 font-bold" dir="ltr">
                  {device.ip}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                    device.is_online
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {device.is_online ? (isEn ? 'Online' : 'آنلاین') : (isEn ? 'Offline' : 'آفلاین')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                {device.building} • {device.floor} • {device.unit} {device.rack ? `• ${device.rack}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Unsaved changes badge & quick write */}
            {device.has_unsaved_changes && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] font-medium hidden sm:inline">{isEn ? 'Unsaved Changes' : 'تغییرات رایت‌نشده'}</span>
                <button
                  onClick={handleWriteMemory}
                  disabled={isWritingMem}
                  className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] transition flex items-center gap-1 cursor-pointer"
                  title={isEn ? 'Save running-config to startup-config (NVRAM)' : 'ذخیره تغییرات در NVRAM (Startup-Config)'}
                >
                  <Save className="w-3 h-3" />
                  <span>{isWritingMem ? (isEn ? 'Writing...' : 'در حال رایت...') : 'Write'}</span>
                </button>
              </div>
            )}

            {/* Direct Connect to Cisco Terminal */}
            {onConnectTerminal && (
              <button
                onClick={() => onConnectTerminal(device)}
                className="cisco-terminal-header-btn flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                title={isEn ? 'Direct connection to Cisco CLI Terminal' : 'اتصال مستقیم به خط فرمان ترمینال سیسکو (CLI)'}
              >
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-sans font-bold">{isEn ? 'Cisco Terminal' : 'ترمینال سیسکو'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Switch Faceplate (Visual Rack Interface) */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 shadow-inner">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-slate-200 font-mono">
                  Switch Faceplate: {device.model} ({ports.length} Ports)
                </span>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>{isEn ? 'Up' : 'فعال (Up)'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                  <span>{isEn ? 'Down' : 'غیرفعال (Down)'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>{isEn ? 'Disabled' : 'ادمین بسته (Disabled)'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2 rounded bg-purple-500"></span>
                  <span>{isEn ? 'Trunk' : 'ترانک (Trunk)'}</span>
                </div>
              </div>
            </div>

            {/* Visual RJ45 Ports Matrix (2-row switch design) */}
            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs animate-pulse">
                {isEn ? 'Loading port statuses from backend...' : 'در حال بارگذاری وضعیت پورت‌ها از بک‌اند پایتون...'}
              </div>
            ) : ports.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">{isEn ? 'No active ports recorded.' : 'پورت فعالی ثبت نشده است.'}</div>
            ) : (
              <div className="switch-faceplate-chassis rounded-xl p-3 border border-slate-800 shadow-inner">
                <div className="switch-faceplate-grid rounded-lg p-2.5 overflow-x-auto border border-slate-850">
                  <div className="flex flex-wrap gap-2 justify-start min-w-[500px]">
                    {ports.map((port) => (
                      <NetworkPortSvg
                        key={port.port_id}
                        port={port}
                        isSelected={selectedPort?.port_id === port.port_id}
                        onClick={() => handleSelectPort(port)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Detailed Inspector & Editor Card */}
          {selectedPort && (
            <div className="port-sub-card bg-white/5 border border-white/10 rounded-xl p-3.5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <Cable className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white font-mono">{selectedPort.name}</h4>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                          selectedPort.mode === 'trunk'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        }`}
                      >
                        {selectedPort.mode === 'trunk' ? (isEn ? 'TRUNK' : 'TRUNK (ترانک)') : (isEn ? 'ACCESS' : 'ACCESS (اکسس)')}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium font-mono ${
                          selectedPort.status === 'up'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-white/5 text-slate-400 border border-white/10'
                        }`}
                      >
                        {selectedPort.status === 'up' ? (isEn ? 'Connected' : 'فعال (Connected)') : (isEn ? 'Disconnected' : 'غیرفعال (Disconnected)')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">
                      {isEn ? 'Speed' : 'سرعت'}: {selectedPort.speed} • {isEn ? 'Duplex' : 'داپلکس'}: {selectedPort.duplex}
                    </p>
                  </div>
                </div>

                {!isEditing ? (
                  <button
                    onClick={() => startEdit(selectedPort)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium transition cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isEn ? 'Edit Port Settings' : 'ویرایش تنظیمات پورت'}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs transition cursor-pointer"
                    >
                      {isEn ? 'Cancel' : 'انصراف'}
                    </button>
                    <button
                      onClick={handleOpenSummary}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-medium shadow-md transition disabled:opacity-50 cursor-pointer border border-white/10"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Save & Apply (Preview)' : 'ذخیره در سوئیچ (پیش‌نمایش و تایید)'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* View / Edit Mode Form */}
              {!isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-3 text-xs">
                  {/* Connected Device */}
                  <div className="port-sub-card p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">{isEn ? 'Connected Host / Device:' : 'تجهیز یا هاست متصل:'}</div>
                    <div className="text-white font-semibold font-mono text-xs truncate" title={selectedPort.connected_device}>
                      {selectedPort.connected_device || (isEn ? 'No device connected' : 'تجهیزی متصل نیست')}
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5 font-mono">
                      {isEn ? 'Type' : 'نوع'}: {selectedPort.connected_type || 'Host'}
                    </div>
                  </div>

                  {/* VLAN Configuration */}
                  <div className="port-sub-card p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">{isEn ? 'Assigned VLAN:' : 'ویلن تخصیص یافته (VLAN):'}</div>
                    <div className="text-indigo-300 font-bold font-mono text-xs">
                      VLAN {selectedPort.vlan}
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5 font-mono truncate" title={selectedPort.allowed_vlans}>
                      {isEn ? 'Allowed' : 'مجاز'}: {selectedPort.allowed_vlans || (isEn ? 'All (1-4094)' : 'همه (1-4094)')}
                    </div>
                  </div>

                  {/* Port Mode & Admin Status */}
                  <div className="port-sub-card p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">{isEn ? 'Admin Status:' : 'وضعیت مدیریتی پورت:'}</div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-semibold ${
                          selectedPort.admin_status === 'enabled' ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {selectedPort.admin_status === 'enabled' ? (isEn ? 'Enabled (No Shutdown)' : 'فعال (No Shutdown)') : (isEn ? 'Disabled (Shutdown)' : 'غیرفعال (Shutdown)')}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5 font-mono">
                      {isEn ? 'Mode' : 'پروتکل'}: {selectedPort.mode === 'trunk' ? '802.1Q Trunk' : 'Access'}
                    </div>
                  </div>

                  {/* Cisco Port Security Status */}
                  <div
                    className={`port-sub-card p-3 rounded-xl border transition ${
                      selectedPort.port_security_enabled
                        ? 'bg-emerald-950/30 border-emerald-500/40 shadow-sm'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{isEn ? 'Port Security:' : 'پورت سکیوریتی:'}</span>
                      {selectedPort.port_security_enabled ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Shield className="w-3.5 h-3.5 text-slate-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`font-bold font-mono text-xs ${
                          selectedPort.port_security_enabled ? 'text-emerald-300' : 'text-slate-400'
                        }`}
                      >
                        {selectedPort.port_security_enabled ? (isEn ? 'Secure' : 'فعال (Secure)') : (isEn ? 'Disabled' : 'غیرفعال (Disabled)')}
                      </span>
                    </div>
                    {selectedPort.port_security_enabled ? (
                      <div className="text-[10px] text-emerald-300 mt-1 font-mono space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span>
                            {isEn ? 'Mode' : 'مود'}: {selectedPort.port_security_mode === 'sticky' ? (isEn ? 'Sticky' : 'استیکی') : selectedPort.port_security_mode === 'configured' ? (isEn ? 'Configured' : 'کانفیگور') : (isEn ? 'Dynamic' : 'داینامیک')}
                          </span>
                          <span className="font-bold bg-emerald-500/20 text-emerald-300 px-1 rounded text-[9px] border border-emerald-500/30">
                            Max: {selectedPort.port_security_max_mac || 1}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-400 truncate" title={selectedPort.port_security_configured_mac || selectedPort.port_security_learned_macs?.join(', ')}>
                          MAC: {selectedPort.port_security_mode === 'configured'
                            ? (selectedPort.port_security_configured_mac || (isEn ? 'Static' : 'دستی'))
                            : (selectedPort.port_security_learned_macs?.[0] || (isEn ? 'Sticky learned' : 'Sticky کشف‌شده'))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-500 text-[10px] mt-1 font-sans">
                        {isEn ? 'No MAC limit applied' : 'محدودیت مک‌ اعمال نشده'}
                      </div>
                    )}
                  </div>

                  {/* PoE Power Status */}
                  <div className="port-sub-card p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">{isEn ? 'PoE Status:' : 'توان برق (PoE Status):'}</div>
                    <div className="flex items-center gap-1.5 text-white font-semibold font-mono text-xs">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>{selectedPort.poe_power ? `${selectedPort.poe_power} W` : (isEn ? 'Off' : 'غیرفعال')}</span>
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5 font-mono">
                      {isEn ? 'Status' : 'وضعیت'}: {selectedPort.poe_status || 'off'}
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit Form */
                <div className="mt-3 space-y-4 text-xs">
                  {/* General Port Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 mb-1 font-medium">{isEn ? 'Port Mode:' : 'نوع پورت (Port Mode):'}</label>
                      <select
                        value={editMode}
                        onChange={(e) => {
                          const newMode = e.target.value as 'trunk' | 'access';
                          setEditMode(newMode);
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-indigo-400"
                      >
                        <option value="access" className="bg-slate-900 text-white">{isEn ? 'Access (Client/Host port)' : 'Access (پورت کلاینت و هاست معمولی)'}</option>
                        <option value="trunk" className="bg-slate-900 text-white">{isEn ? 'Trunk (Uplink to Switch/Router)' : 'Trunk (پورت اتصال به سوئیچ یا روتر)'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-medium">{isEn ? 'VLAN ID:' : 'شماره ویلن (VLAN ID):'}</label>
                      <input
                        type="number"
                        value={editVlan}
                        onChange={(e) => setEditVlan(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/15 text-white text-xs font-mono text-left focus:outline-none focus:border-indigo-400"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-medium">{isEn ? 'Allowed VLANs:' : 'ویلن‌های مجاز (Allowed VLANs):'}</label>
                      <input
                        type="text"
                        value={editAllowedVlans}
                        onChange={(e) => setEditAllowedVlans(e.target.value)}
                        placeholder={isEn ? 'e.g. 1,10,20,30,50' : 'مثال: 1,10,20,30,50'}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/15 text-white text-xs font-mono text-left focus:outline-none focus:border-indigo-400"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-medium">{isEn ? 'Connected Host / Device:' : 'تجهیز یا هاست متصل:'}</label>
                      <input
                        type="text"
                        value={editConnected}
                        onChange={(e) => setEditConnected(e.target.value)}
                        placeholder={isEn ? 'e.g. AP-WIFI-02 or Workstation' : 'مثال: AP-WIFI-02 یا Workstation'}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/15 text-white text-xs focus:outline-none focus:border-indigo-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-medium">{isEn ? 'Admin Status (Shutdown / No Shutdown):' : 'وضعیت ادمین (Shutdown / No Shutdown):'}</label>
                      <select
                        value={editAdminStatus}
                        onChange={(e) => setEditAdminStatus(e.target.value as 'enabled' | 'disabled')}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/15 text-white text-xs font-mono focus:outline-none focus:border-indigo-400"
                      >
                        <option value="enabled" className="bg-slate-900 text-white">{isEn ? 'Enabled (No Shutdown)' : 'فعال (No Shutdown)'}</option>
                        <option value="disabled" className="bg-slate-900 text-white">{isEn ? 'Disabled (Shutdown)' : 'غیرفعال (Shutdown)'}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-medium">{isEn ? 'Port Description:' : 'توضیحات پورت (Description):'}</label>
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder={isEn ? 'Port description or role' : 'توضیحات کاربردی پورت'}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/15 text-white text-xs focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>

                  {/* Cisco Port Security Configuration Box (تنظیمات پورت سکیوریتی سیسکو) */}
                  <div className="port-sub-card border border-indigo-500/30 rounded-xl overflow-hidden bg-white/5 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between p-3 bg-gradient-to-r from-indigo-950/50 to-slate-900/60 border-b border-indigo-500/20 gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white shadow-md">
                          <ShieldCheck className="w-4 h-4 text-cyan-200" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-white text-xs">{isEn ? 'Cisco Port Security' : 'امنیت پورت سیسکو (Cisco Port Security)'}</h5>
                            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono px-1.5 py-0.5 rounded">
                              Layer 2 Security
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-0.5">
                            {isEn ? 'Control and restrict MAC addresses on access ports to prevent MAC Flooding and unauthorized access' : 'محدودسازی و کنترل دسترسی مک آدرس‌های متصل به پورت به منظور جلوگیری از حملات MAC Flooding و نفوذ غیرمجاز'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        id="port-security-toggle-btn"
                        onClick={() => {
                          const nextState = !editPortSecEnabled;
                          setEditPortSecEnabled(nextState);
                          if (nextState && editMode === 'trunk') {
                            setEditMode('access');
                          }
                        }}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs border cursor-pointer ${
                          editPortSecEnabled
                            ? 'port-sec-btn-active bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                            : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                        }`}
                        title={isEn ? 'Toggle Cisco Layer 2 Port Security' : 'فعال یا غیرفعال‌سازی سکیوریتی پورت لایه ۲ سیسکو'}
                      >
                        {editPortSecEnabled ? (
                          <ShieldCheck className="w-4 h-4 text-white shrink-0" />
                        ) : (
                          <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className={editPortSecEnabled ? 'text-white' : 'text-slate-300'}>
                          {editPortSecEnabled ? (isEn ? 'Enabled (switchport port-security)' : 'فعال (switchport port-security)') : (isEn ? 'Enable Port Security' : 'فعال‌سازی Port Security')}
                        </span>
                      </button>
                    </div>

                    {editPortSecEnabled && (
                      <div className="p-3.5 bg-black/20 space-y-3.5">
                        {editMode === 'trunk' && (
                          <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-200 text-[11px] flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>
                              <b>{isEn ? 'Cisco Best Practice Warning:' : 'هشدار استاندارد سیسکو:'}</b> {isEn ? 'Port Security can only be configured on Access ports. Mode will be switched to Access automatically.' : 'Port Security معمولاً روی پورت‌های اکسس (Access) اعمال می‌شود. پورت به طور خودکار به مود Access منتقل خواهد شد.'}
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          {/* 1. Definition Mode Dropdown */}
                          <div>
                            <label className="block text-slate-300 font-semibold mb-1">
                              {isEn ? 'MAC Definition Mode:' : 'تعریف مود یادگیری مک (MAC Definition Mode):'}
                            </label>
                            <select
                              value={editPortSecMode}
                              onChange={(e) => setEditPortSecMode(e.target.value as 'sticky' | 'configured' | 'dynamic')}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/15 text-white text-xs font-mono font-medium focus:border-indigo-400"
                            >
                              <option value="sticky" className="bg-slate-900 text-white">{isEn ? 'Sticky (Auto Learn & Save to Running-Config)' : 'استیکی (Sticky - چسبنده خودکار در Running-Config)'}</option>
                              <option value="configured" className="bg-slate-900 text-white">{isEn ? 'Configured (Manual Static Definition)' : 'کانفیگور (Configured - تعریف دستی و استاتیک مک)'}</option>
                              <option value="dynamic" className="bg-slate-900 text-white">{isEn ? 'Dynamic (Learn in CAM Memory)' : 'داینامیک (Dynamic - یادگیری در CAM بدون ذخیره دائم)'}</option>
                            </select>
                            <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                              {editPortSecMode === 'sticky' && (isEn ? 'MACs are learned dynamically upon connection and saved into running-config.' : 'مک‌ها با اتصال اولین کلاینت‌ها خودکار فراگرفته شده و در Running-Config درج می‌شوند.')}
                              {editPortSecMode === 'configured' && (isEn ? 'Administrator explicitly specifies permitted hardware MAC address.' : 'ادمین مک آدرس مجاز سخت‌افزاری را به صورت صریح تعریف می‌کند.')}
                              {editPortSecMode === 'dynamic' && (isEn ? 'MACs are learned dynamically in CAM memory and reset upon reload.' : 'مک‌ها به طور موقت در جدول حافظه CAM ثبت شده و پس از ریبوت بازنشانی می‌شوند.')}
                            </p>
                          </div>

                          {/* 2. Maximum MACs */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-slate-300 font-semibold">
                                {isEn ? 'Maximum MACs:' : 'حداکثر مک آدرس‌های مجاز (Maximum MACs):'}
                              </label>
                              <span className="text-[11px] font-mono font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-1.5 py-0.5 rounded">
                                {editPortSecMaxMac} {isEn ? 'MAC(s)' : 'آدرس'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={1024}
                                value={editPortSecMaxMac}
                                onChange={(e) => setEditPortSecMaxMac(Math.max(1, Math.min(1024, Number(e.target.value) || 1)))}
                                className="w-20 px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/15 text-white text-xs font-mono text-center font-bold focus:border-indigo-400"
                                dir="ltr"
                              />
                              <div className="flex items-center gap-1 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => setEditPortSecMaxMac(1)}
                                  className={`px-2 py-1 rounded-lg border transition cursor-pointer ${
                                    editPortSecMaxMac === 1
                                      ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                                  }`}
                                  title={isEn ? 'Single host standard' : 'استاندارد سیسکو برای پورت تک کاربر'}
                                >
                                  {isEn ? '1 MAC' : '۱ مک'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditPortSecMaxMac(2)}
                                  className={`px-2 py-1 rounded-lg border transition cursor-pointer ${
                                    editPortSecMaxMac === 2
                                      ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                                  }`}
                                  title={isEn ? 'Ideal for PC + IP Phone' : 'مناسب برای PC به همراه IP Phone سیسکو'}
                                >
                                  {isEn ? '2 MACs' : '۲ مک'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditPortSecMaxMac(5)}
                                  className={`px-2 py-1 rounded-lg border transition cursor-pointer ${
                                    editPortSecMaxMac === 5
                                      ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                                  }`}
                                >
                                  {isEn ? '5 MACs' : '۵ مک'}
                                </button>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {isEn ? 'CLI equivalent:' : 'دستور معادل:'} <code className="font-mono text-indigo-300 bg-indigo-500/20 px-1 rounded border border-indigo-500/30" dir="ltr">switchport port-security maximum {editPortSecMaxMac}</code>
                            </p>
                          </div>

                          {/* 3. Violation Action */}
                          <div>
                            <label className="block text-slate-300 font-semibold mb-1">
                              {isEn ? 'Violation Action:' : 'سیاست برخورد با تخلف (Violation Action):'}
                            </label>
                            <select
                              value={editPortSecViolation}
                              onChange={(e) => setEditPortSecViolation(e.target.value as 'shutdown' | 'restrict' | 'protect')}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/15 text-white text-xs font-mono font-medium focus:border-indigo-400"
                            >
                              <option value="shutdown" className="bg-slate-900 text-white">{isEn ? 'Shutdown (Err-Disable - Cisco Default)' : 'Shutdown (خاموشی خودکار و Err-Disable - پیش‌فرض سیسکو)'}</option>
                              <option value="restrict" className="bg-slate-900 text-white">{isEn ? 'Restrict (Drop packet + Log & SNMP Trap)' : 'Restrict (مسدودسازی بسته متخلف + ارسال لاگ و SNMP Trap)'}</option>
                              <option value="protect" className="bg-slate-900 text-white">{isEn ? 'Protect (Silent drop without logging)' : 'Protect (مسدودسازی بی‌صدا بدون ثبت در لاگ)'}</option>
                            </select>
                            <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                              {editPortSecViolation === 'shutdown' && (isEn ? 'If threshold exceeded, interface enters err-disabled state immediately.' : 'در صورت عبور از سقف مک، پورت فورا خاموش شده و نیاز به shut / no shut دارد.')}
                              {editPortSecViolation === 'restrict' && (isEn ? 'Port stays up, unauthorized packets dropped, violation counter increments with syslog.' : 'پورت روشن می‌ماند اما فریم‌های مک غیرمجاز دور ریخته شده و کانتر تخلف افزایش می‌یابد.')}
                              {editPortSecViolation === 'protect' && (isEn ? 'Unauthorized traffic dropped silently without counter increment or trap.' : 'ترافیک غیرمجاز دور ریخته می‌شود بدون ارسال اعلان یا افزایش کانتر.')}
                            </p>
                          </div>
                        </div>

                        {/* Static MAC Input when Configured mode is selected */}
                        {editPortSecMode === 'configured' && (
                          <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex flex-wrap items-center gap-3">
                            <div className="flex-1 min-w-[260px]">
                              <label className="block text-white font-bold mb-1">
                                {isEn ? 'Configured Static MAC:' : 'مک آدرس مجاز استاتیک (Configured Static MAC):'}
                              </label>
                              <input
                                type="text"
                                value={editPortSecConfiguredMac}
                                onChange={(e) => setEditPortSecConfiguredMac(e.target.value)}
                                placeholder={isEn ? 'e.g. 0050.56a1.2b3c or 00:50:56:A1:2B:3C' : 'مثال: 0050.56a1.2b3c یا 00:50:56:A1:2B:3C'}
                                className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/15 text-white text-xs font-mono text-left font-semibold focus:border-indigo-400"
                                dir="ltr"
                              />
                            </div>
                            <div className="pt-4 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditPortSecConfiguredMac('0050.56a1.2b3c')}
                                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium transition cursor-pointer"
                              >
                                {isEn ? 'Insert Sample MAC' : 'درج مک آدرس نمونه'}
                              </button>
                              {selectedPort.connected_device && (
                                <button
                                  type="button"
                                  onClick={() => setEditPortSecConfiguredMac('001c.23b4.6789')}
                                  className="px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/30 text-[11px] font-medium transition cursor-pointer"
                                >
                                  {isEn ? `Host MAC (${selectedPort.connected_device})` : `مک هاست فعلی (${selectedPort.connected_device})`}
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Real-time Cisco IOS CLI Preview */}
                        <div className="p-3 rounded-xl bg-slate-950/90 text-emerald-400 font-mono text-[11px] text-left overflow-x-auto shadow-inner border border-white/10" dir="ltr">
                          <div className="text-slate-400 text-[10px] mb-1 flex items-center justify-between border-b border-white/10 pb-1">
                            <span># Cisco IOS-XE Port Security Running-Config Preview:</span>
                            <span className="text-indigo-300 font-sans">{isEn ? 'Auto-generated CLI' : 'تولید خودکار دستورات سیسکو'}</span>
                          </div>
                          <div className="text-slate-300">{device.name}(config-if)# switchport mode access</div>
                          <div>{device.name}(config-if)# switchport port-security</div>
                          <div>{device.name}(config-if)# switchport port-security maximum {editPortSecMaxMac}</div>
                          {editPortSecMode === 'sticky' ? (
                            <div className="text-amber-300">{device.name}(config-if)# switchport port-security mac-address sticky</div>
                          ) : editPortSecMode === 'configured' ? (
                            <div className="text-cyan-300">
                              {device.name}(config-if)# switchport port-security mac-address {editPortSecConfiguredMac || '0050.56a1.2b3c'}
                            </div>
                          ) : null}
                          <div>{device.name}(config-if)# switchport port-security violation {editPortSecViolation}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ports List Table */}
          <div className="port-sub-card bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-sm">
            <div className="p-3 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-black/10">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-white font-mono">
                  {isEn ? `All Switch Ports (${ports.length})` : `لیست تمامی پورت‌های سوئیچ (${ports.length})`}
                </h4>
                <span className="text-[10px] text-slate-400">
                  {isEn
                    ? `${activeCount} active • ${inactiveCount} inactive • ${trunkCount} trunk • ${portSecCount} port security`
                    : `${activeCount} پورت فعال • ${inactiveCount} پورت خاموش • ${trunkCount} ترانک • ${portSecCount} با Port Security`}
                </span>
              </div>

              {/* Filters */}
              <div className="flex items-center flex-wrap gap-2 text-xs">
                <input
                  type="text"
                  placeholder={isEn ? 'Search port, VLAN, device, sec...' : 'جستجوی پورت، ویلن، تجهیز یا سکیوریتی...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/15 text-white placeholder-slate-400 text-xs focus:outline-none focus:border-indigo-400 w-48 font-mono"
                />

                <div className="flex items-center bg-black/20 rounded-lg p-0.5 border border-white/10">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                      filterMode === 'all' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isEn ? 'All' : 'همه'}
                  </button>
                  <button
                    onClick={() => setFilterMode('up')}
                    className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                      filterMode === 'up' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isEn ? 'Up' : 'فعال'}
                  </button>
                  <button
                    onClick={() => setFilterMode('down')}
                    className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                      filterMode === 'down' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isEn ? 'Down' : 'خاموش'}
                  </button>
                  <button
                    onClick={() => setFilterMode('trunk')}
                    className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                      filterMode === 'trunk' ? 'bg-purple-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isEn ? 'Trunk' : 'ترانک'}
                  </button>
                  <button
                    onClick={() => setFilterMode('access')}
                    className={`px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                      filterMode === 'access' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isEn ? 'Access' : 'اکسس'}
                  </button>
                  <button
                    onClick={() => setFilterMode('port-sec')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition cursor-pointer ${
                      filterMode === 'port-sec' ? 'bg-emerald-600 text-white font-medium shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                    title={isEn ? 'Show ports with active Port Security' : 'نمایش پورت‌های دارای Port Security فعال'}
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>Port Sec ({portSecCount})</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className={`w-full ${isEn ? 'text-left' : 'text-right'} text-xs`}>
                <thead>
                  <tr className="bg-white/5 text-slate-300 border-b border-white/10 font-bold uppercase tracking-wider text-[11px]">
                    <th className="px-3 py-2.5">{isEn ? 'Port Name' : 'نام پورت'}</th>
                    <th className="px-3 py-2.5">{isEn ? 'Status' : 'وضعیت پورت'}</th>
                    <th className="px-3 py-2.5">{isEn ? 'Mode' : 'نوع (Mode)'}</th>
                    <th className="px-3 py-2.5">{isEn ? 'VLAN' : 'ویلن (VLAN)'}</th>
                    <th className="px-3 py-2.5">{isEn ? 'Security' : 'امنیت (Port Sec)'}</th>
                    <th className="px-3 py-2.5">{isEn ? 'Connected Device' : 'تجهیز متصل (Connected)'}</th>
                    <th className="px-3 py-2.5">{isEn ? 'Speed' : 'سرعت'}</th>
                    <th className="px-3 py-2.5">PoE</th>
                    <th className="px-3 py-2.5 text-center">{isEn ? 'Actions' : 'عملیات'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {filteredPorts.map((port) => {
                    const isSelected = selectedPort?.port_id === port.port_id;
                    return (
                      <tr
                        key={port.port_id}
                        onClick={() => handleSelectPort(port)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-indigo-500/20 text-white font-medium' : 'hover:bg-white/5 text-slate-300'
                        }`}
                      >
                        <td className="px-3 py-2.5 font-bold text-white">{port.port_id}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans font-medium border ${
                              port.admin_status === 'disabled'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : port.status === 'up'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-white/5 text-slate-400 border-white/10'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                port.admin_status === 'disabled'
                                  ? 'bg-amber-400'
                                  : port.status === 'up'
                                  ? 'bg-emerald-400 animate-pulse'
                                  : 'bg-slate-500'
                              }`}
                            ></span>
                            {port.admin_status === 'disabled' ? 'Admin Down' : port.status === 'up' ? 'Up' : 'Down'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              port.mode === 'trunk'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            }`}
                          >
                            {port.mode.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-bold text-indigo-300">VLAN {port.vlan}</td>
                        <td className="px-3 py-2.5">
                          {port.port_security_enabled ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium"
                              title={`Port Security Active\nMode: ${port.port_security_mode || 'sticky'}\nMax MACs: ${port.port_security_max_mac || 1}\nViolation: ${port.port_security_violation || 'shutdown'}`}
                            >
                              <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span className="font-mono">
                                {port.port_security_mode === 'sticky' ? 'Sticky' : port.port_security_mode === 'configured' ? 'Config' : 'Dynamic'}
                              </span>
                              <span className="bg-emerald-500/30 text-emerald-200 px-1 rounded text-[9px] font-mono font-bold border border-emerald-500/40">
                                {port.port_security_max_mac || 1}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans text-slate-500">
                              <Shield className="w-3 h-3 text-slate-500 shrink-0" />
                              <span>Off</span>
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-slate-200 font-sans text-xs">
                          {port.connected_device || '-'}
                        </td>
                        <td className="px-3 py-2.5 text-slate-400 text-[11px]">{port.speed}</td>
                        <td className="px-3 py-2.5 text-slate-400 text-[11px]">
                          {port.poe_power ? `${port.poe_power}W` : 'Off'}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(port);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-indigo-300 hover:text-white border border-white/10 text-[11px] font-sans transition cursor-pointer"
                          >
                            {isEn ? 'Edit' : 'ویرایش'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Confirmation Summary Modal (سامری تغییرات پورت و تایید نهایی) */}
        {showConfirmSummary && selectedPort && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 modal-backdrop-blur overflow-y-auto" data-modal-backdrop="true" dir={isEn ? 'ltr' : 'rtl'}>
            <div className="spatial-glass border border-white/20 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden my-auto flex flex-col max-h-[92vh] sm:max-h-[88vh] text-slate-100">
              {/* Header */}
              <div className="px-5 py-4 bg-white/5 border-b border-white/10 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <Save className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">
                      {isEn ? 'Confirm & Apply Port Configuration Changes' : 'پیش‌نمایش و تایید نهایی تغییرات پورت'}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {device.name} ({device.ip}) • {isEn ? 'Port' : 'پورت'} {selectedPort.port_id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConfirmSummary(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body Content */}
              <div className="p-5 space-y-4 flex-1 overflow-y-auto">
                <p className="text-xs text-slate-300 leading-relaxed">
                  {isEn ? (
                    <>The following changes will be applied to port <b className="font-mono text-white">{selectedPort.port_id}</b>. Please review and confirm before applying:</>
                  ) : (
                    <>تغییرات زیر روی پورت <b className="font-mono text-white">{selectedPort.port_id}</b> اعمال خواهند شد. لطفاً مقادیر جدید را قبل از ذخیره نهایی بررسی و تایید نمایید:</>
                  )}
                </p>

                {/* Diff Comparison Table */}
                <div className="border border-white/10 rounded-xl overflow-hidden text-xs bg-black/20">
                  <table className={`w-full ${isEn ? 'text-left' : 'text-right'}`}>
                    <thead className="bg-white/5 text-slate-300 border-b border-white/10 text-[11px] font-bold">
                      <tr>
                        <th className="p-2.5">{isEn ? 'Parameter' : 'پارامتر تنظیماتی'}</th>
                        <th className="p-2.5">{isEn ? 'Previous Value' : 'مقدار قبلی'}</th>
                        <th className="p-2.5 text-indigo-300">{isEn ? 'New Proposed Value' : 'مقدار جدید پیشنهادی'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {changedFields.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-slate-400">
                            {isEn ? 'No changes detected in port configuration.' : 'تغییری در پارامترهای پورت داده نشده است.'}
                          </td>
                        </tr>
                      ) : (
                        changedFields.map((field, idx) => (
                          <tr key={idx} className="hover:bg-white/5">
                            <td className="p-2.5 font-medium text-slate-200">{field.label}</td>
                            <td className="p-2.5 text-slate-400 font-mono">{field.oldVal}</td>
                            <td className="p-2.5 font-mono font-bold text-indigo-300 bg-indigo-500/10">
                              {field.newVal}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Cisco CLI Script Preview */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-300 font-medium">
                    <span>{isEn ? 'Cisco IOS Commands (Running-Config):' : 'دستورات معادل در سیسکو IOS (Running-Config):'}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded vendor-badge-cisco font-bold">Cisco IOS-XE Script</span>
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-950/90 border border-white/10 text-emerald-400 font-mono text-xs overflow-x-auto text-left leading-relaxed select-all" dir="ltr">
                    {generateCiscoCommands()}
                  </pre>
                </div>

                {/* Warning Alert about Running vs Startup */}
                <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <b>{isEn ? 'Important Cisco Notice:' : 'توجه مهم سیسکو:'}</b> {isEn ? (
                      <>These changes will immediately apply to active Running-Config. The device will be flagged in the topology with <b>"Unsaved Changes"</b> until you execute <code className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold border border-amber-500/30">write memory</code> to persist into NVRAM.</>
                    ) : (
                      <>این تغییرات بلافاصله در حافظه جاری (Running-Config) سوئیچ اعمال می‌شود. پس از ذخیره، این تجهیز در پنل با وضعیت <b>«تغییرات رایت‌نشده»</b> مشخص خواهد شد تا مهندس شبکه دستور <code className="bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold border border-amber-500/30">write memory</code> را برای ذخیره دائم در NVRAM اجرا نماید.</>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-5 py-3.5 bg-black/20 border-t border-white/10 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  onClick={() => setShowConfirmSummary(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 text-xs font-medium transition cursor-pointer"
                >
                  {isEn ? 'Cancel & Modify' : 'انصراف و اصلاح'}
                </button>
                <button
                  onClick={handleConfirmSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-medium shadow-md transition disabled:opacity-50 cursor-pointer border border-white/10"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? (isEn ? 'Applying to Switch...' : 'در حال اعمال در سوئیچ...') : (isEn ? 'Confirm & Apply' : 'تایید و اعمال تغییرات')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
