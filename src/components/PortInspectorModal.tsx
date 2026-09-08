import React, { useState, useEffect } from 'react';
import { X, Cable, Zap, Shield, ShieldCheck, ShieldAlert, CheckCircle2, AlertCircle, Edit3, Save, Power, Terminal, AlertTriangle, ArrowRight, Check, Lock, Key } from 'lucide-react';
import { Device, SwitchPort } from '../types';
import { fetchDevicePorts, updateSwitchPort, writeMemory } from '../services/api';
import { NetworkPortSvg } from './NetworkPortSvg';

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
        label: 'وضعیت مدیریتی پورت (Admin Status)',
        oldVal: selectedPort.admin_status === 'enabled' ? 'فعال (No Shutdown)' : 'غیرفعال (Shutdown)',
        newVal: editAdminStatus === 'enabled' ? 'فعال (No Shutdown)' : 'غیرفعال (Shutdown)',
      });
    }
    if (selectedPort.mode !== editMode) {
      changedFields.push({
        label: 'حالت پورت (Switchport Mode)',
        oldVal: selectedPort.mode === 'trunk' ? 'Trunk (ترانک)' : 'Access (اکسس)',
        newVal: editMode === 'trunk' ? 'Trunk (ترانک)' : 'Access (اکسس)',
      });
    }
    if (selectedPort.vlan !== editVlan) {
      changedFields.push({
        label: 'شماره ویلن (Access VLAN ID)',
        oldVal: `VLAN ${selectedPort.vlan}`,
        newVal: `VLAN ${editVlan}`,
      });
    }
    if ((selectedPort.allowed_vlans || '') !== editAllowedVlans && editMode === 'trunk') {
      changedFields.push({
        label: 'ویلن‌های مجاز عبور ترانک (Allowed VLANs)',
        oldVal: selectedPort.allowed_vlans || 'همه',
        newVal: editAllowedVlans || 'همه',
      });
    }
    if ((selectedPort.connected_device || '') !== editConnected) {
      changedFields.push({
        label: 'تجهیز یا هاست متصل',
        oldVal: selectedPort.connected_device || 'تجهیزی متصل نیست',
        newVal: editConnected || 'خالی',
      });
    }
    if ((selectedPort.description || '') !== editDesc) {
      changedFields.push({
        label: 'توضیحات پورت (Port Description)',
        oldVal: selectedPort.description || 'ندارد',
        newVal: editDesc || 'ندارد',
      });
    }

    // Port Security Changes Diff
    const oldSecEnabled = !!selectedPort.port_security_enabled;
    if (oldSecEnabled !== editPortSecEnabled) {
      changedFields.push({
        label: 'وضعیت Port Security',
        oldVal: oldSecEnabled ? 'فعال (Enabled)' : 'غیرفعال (Disabled)',
        newVal: editPortSecEnabled ? 'فعال (Enabled)' : 'غیرفعال (Disabled)',
      });
    }

    if (editPortSecEnabled) {
      const oldMax = selectedPort.port_security_max_mac || 1;
      if (oldMax !== editPortSecMaxMac) {
        changedFields.push({
          label: 'حداکثر مک آدرس مجاز (Maximum MACs)',
          oldVal: `${oldMax} آدرس`,
          newVal: `${editPortSecMaxMac} آدرس`,
        });
      }

      const oldMode = selectedPort.port_security_mode || 'sticky';
      if (oldMode !== editPortSecMode) {
        const modeLabels: Record<string, string> = {
          sticky: 'استیکی (Sticky - چسبنده خودکار)',
          configured: 'کانفیگور (Configured - دستی)',
          dynamic: 'داینامیک (Dynamic - پویا)',
        };
        changedFields.push({
          label: 'تعریف مود یادگیری مک (Learning Mode)',
          oldVal: modeLabels[oldMode] || oldMode,
          newVal: modeLabels[editPortSecMode] || editPortSecMode,
        });
      }

      if (editPortSecMode === 'configured') {
        const oldConfMac = selectedPort.port_security_configured_mac || '';
        if (oldConfMac !== editPortSecConfiguredMac) {
          changedFields.push({
            label: 'مک آدرس کانفیگ شده (Configured Static MAC)',
            oldVal: oldConfMac || 'ثبت نشده',
            newVal: editPortSecConfiguredMac || 'ثبت نشده',
          });
        }
      }

      const oldViolation = selectedPort.port_security_violation || 'shutdown';
      if (oldViolation !== editPortSecViolation) {
        const violLabels: Record<string, string> = {
          shutdown: 'Shutdown (خاموشی اینترفیس و Err-Disable)',
          restrict: 'Restrict (مسدودسازی بسته و ارسال لاگ/Trap)',
          protect: 'Protect (انداختن فریم بدون تولید لاگ)',
        };
        changedFields.push({
          label: 'سیاست برخورد با تخلف (Violation Action)',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 modal-backdrop-blur overflow-y-auto" data-modal-backdrop="true">
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-5xl shadow-xl overflow-hidden my-4 text-right flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Cable className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 font-mono">{device.name}</h3>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono border border-slate-200">
                  {device.ip}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                    device.is_online
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {device.is_online ? 'آنلاین' : 'آفلاین'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {device.building} • {device.floor} • {device.unit} {device.rack ? `• ${device.rack}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Unsaved changes badge & quick write */}
            {device.has_unsaved_changes && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 border border-amber-300 text-amber-800 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="text-[11px] font-medium hidden sm:inline">تغییرات رایت‌نشده</span>
                <button
                  onClick={handleWriteMemory}
                  disabled={isWritingMem}
                  className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] transition flex items-center gap-1"
                  title="ذخیره تغییرات در NVRAM (Startup-Config)"
                >
                  <Save className="w-3 h-3" />
                  <span>{isWritingMem ? 'در حال رایت...' : 'Write'}</span>
                </button>
              </div>
            )}

            {/* Direct Connect to Cisco Terminal */}
            {onConnectTerminal && (
              <button
                onClick={() => onConnectTerminal(device)}
                className="cisco-terminal-header-btn flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                title="اتصال مستقیم به خط فرمان ترمینال سیسکو (CLI)"
              >
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-sans font-bold">ترمینال سیسکو</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded hover:bg-slate-100 transition"
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
                  <span>فعال (Up)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                  <span>غیرفعال (Down)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span>ادمین بسته (Disabled)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2 rounded bg-purple-500"></span>
                  <span>ترانک (Trunk)</span>
                </div>
              </div>
            </div>

            {/* Visual RJ45 Ports Matrix (2-row switch design) */}
            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs animate-pulse">
                در حال بارگذاری وضعیت پورت‌ها از بک‌اند پایتون...
              </div>
            ) : ports.length === 0 ? (
              <div className="py-6 text-center text-slate-500 text-xs">پورت فعالی ثبت نشده است.</div>
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
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
                    <Cable className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 font-mono">{selectedPort.name}</h4>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${
                          selectedPort.mode === 'trunk'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {selectedPort.mode === 'trunk' ? 'TRUNK (ترانک)' : 'ACCESS (اکسس)'}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          selectedPort.status === 'up'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {selectedPort.status === 'up' ? 'فعال (Connected)' : 'غیرفعال (Disconnected)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                      سرعت: {selectedPort.speed} • داپلکس: {selectedPort.duplex}
                    </p>
                  </div>
                </div>

                {!isEditing ? (
                  <button
                    onClick={() => startEdit(selectedPort)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium transition"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ویرایش تنظیمات پورت</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs transition"
                    >
                      انصراف
                    </button>
                    <button
                      onClick={handleOpenSummary}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>ذخیره در سوئیچ (پیش‌نمایش و تایید)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* View / Edit Mode Form */}
              {!isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-3 text-xs">
                  {/* Connected Device */}
                  <div className="p-3 rounded bg-white border border-slate-200">
                    <div className="text-slate-500 text-[11px] mb-0.5">تجهیز یا هاست متصل:</div>
                    <div className="text-slate-900 font-semibold font-mono text-xs truncate" title={selectedPort.connected_device}>
                      {selectedPort.connected_device || 'تجهیزی متصل نیست'}
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5 font-mono">
                      نوع: {selectedPort.connected_type || 'Host'}
                    </div>
                  </div>

                  {/* VLAN Configuration */}
                  <div className="p-3 rounded bg-white border border-slate-200">
                    <div className="text-slate-500 text-[11px] mb-0.5">ویلن تخصیص یافته (VLAN):</div>
                    <div className="text-indigo-600 font-bold font-mono text-xs">
                      VLAN {selectedPort.vlan}
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5 font-mono truncate" title={selectedPort.allowed_vlans}>
                      مجاز: {selectedPort.allowed_vlans || 'همه (1-4094)'}
                    </div>
                  </div>

                  {/* Port Mode & Admin Status */}
                  <div className="p-3 rounded bg-white border border-slate-200">
                    <div className="text-slate-500 text-[11px] mb-0.5">وضعیت مدیریتی پورت:</div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-semibold ${
                          selectedPort.admin_status === 'enabled' ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {selectedPort.admin_status === 'enabled' ? 'فعال (No Shutdown)' : 'غیرفعال (Shutdown)'}
                      </span>
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5 font-mono">
                      پروتکل: {selectedPort.mode === 'trunk' ? '802.1Q Trunk' : 'Access'}
                    </div>
                  </div>

                  {/* Cisco Port Security Status */}
                  <div
                    className={`p-3 rounded border transition ${
                      selectedPort.port_security_enabled
                        ? 'bg-emerald-50/50 border-emerald-300 shadow-sm'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] mb-0.5">
                      <span className="text-slate-600 font-medium">پورت سکیوریتی:</span>
                      {selectedPort.port_security_enabled ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span
                        className={`font-bold font-mono text-xs ${
                          selectedPort.port_security_enabled ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        {selectedPort.port_security_enabled ? 'فعال (Secure)' : 'غیرفعال (Disabled)'}
                      </span>
                    </div>
                    {selectedPort.port_security_enabled ? (
                      <div className="text-[10px] text-emerald-800 mt-1 font-mono space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span>
                            مود: {selectedPort.port_security_mode === 'sticky' ? 'استیکی' : selectedPort.port_security_mode === 'configured' ? 'کانفیگور' : 'داینامیک'}
                          </span>
                          <span className="font-bold bg-emerald-100 text-emerald-900 px-1 rounded text-[9px]">
                            Max: {selectedPort.port_security_max_mac || 1}
                          </span>
                        </div>
                        <div className="text-[9px] text-slate-500 truncate" title={selectedPort.port_security_configured_mac || selectedPort.port_security_learned_macs?.join(', ')}>
                          مک: {selectedPort.port_security_mode === 'configured'
                            ? (selectedPort.port_security_configured_mac || 'دستی')
                            : (selectedPort.port_security_learned_macs?.[0] || 'Sticky کشف‌شده')}
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-400 text-[10px] mt-1 font-sans">
                        محدودیت مک‌ اعمال نشده
                      </div>
                    )}
                  </div>

                  {/* PoE Power Status */}
                  <div className="p-3 rounded bg-white border border-slate-200">
                    <div className="text-slate-500 text-[11px] mb-0.5">توان برق (PoE Status):</div>
                    <div className="flex items-center gap-1.5 text-slate-800 font-semibold font-mono">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>{selectedPort.poe_power ? `${selectedPort.poe_power} W` : 'غیرفعال'}</span>
                    </div>
                    <div className="text-slate-400 text-[10px] mt-0.5 font-mono">
                      وضعیت: {selectedPort.poe_status || 'off'}
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit Form */
                <div className="mt-3 space-y-4 text-xs">
                  {/* General Port Settings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 mb-1">نوع پورت (Port Mode):</label>
                      <select
                        value={editMode}
                        onChange={(e) => {
                          const newMode = e.target.value as 'trunk' | 'access';
                          setEditMode(newMode);
                          if (newMode === 'trunk' && editPortSecEnabled) {
                            // Cisco best practice: port-security is only for access ports
                            // Keep user informed or disable
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-800 text-xs font-mono"
                      >
                        <option value="access">Access (پورت کلاینت و هاست معمولی)</option>
                        <option value="trunk">Trunk (پورت اتصال به سوئیچ یا روتر)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1">شماره ویلن (VLAN ID):</label>
                      <input
                        type="number"
                        value={editVlan}
                        onChange={(e) => setEditVlan(Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-800 text-xs font-mono text-left"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1">ویلن‌های مجاز (Allowed VLANs):</label>
                      <input
                        type="text"
                        value={editAllowedVlans}
                        onChange={(e) => setEditAllowedVlans(e.target.value)}
                        placeholder="مثال: 1,10,20,30,50"
                        className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-800 text-xs font-mono text-left"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1">تجهیز یا هاست متصل:</label>
                      <input
                        type="text"
                        value={editConnected}
                        onChange={(e) => setEditConnected(e.target.value)}
                        placeholder="مثال: AP-WIFI-02 یا Workstation"
                        className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-800 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1">وضعیت ادمین (Shutdown / No Shutdown):</label>
                      <select
                        value={editAdminStatus}
                        onChange={(e) => setEditAdminStatus(e.target.value as 'enabled' | 'disabled')}
                        className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-800 text-xs font-mono"
                      >
                        <option value="enabled">فعال (No Shutdown)</option>
                        <option value="disabled">غیرفعال (Shutdown)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 mb-1">توضیحات پورت (Description):</label>
                      <input
                        type="text"
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="توضیحات کاربردی پورت"
                        className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-800 text-xs"
                      />
                    </div>
                  </div>

                  {/* Cisco Port Security Configuration Box (تنظیمات پورت سکیوریتی سیسکو) */}
                  <div className="border border-indigo-200 rounded-lg overflow-hidden bg-white shadow-xs">
                    <div className="flex flex-wrap items-center justify-between p-3 bg-gradient-to-r from-indigo-50/90 to-slate-50 border-b border-indigo-100 gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-indigo-600 text-white">
                          <ShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-slate-900 text-xs">امنیت پورت سیسکو (Cisco Port Security)</h5>
                            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-mono px-1.5 py-0.5 rounded">
                              Layer 2 Security
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            محدودسازی و کنترل دسترسی مک آدرس‌های متصل به پورت به منظور جلوگیری از حملات MAC Flooding و نفوذ غیرمجاز
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
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs border ${
                          editPortSecEnabled
                            ? 'port-sec-btn-active bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-700 ring-2 ring-emerald-500/20'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                        title="فعال یا غیرفعال‌سازی سکیوریتی پورت لایه ۲ سیسکو"
                      >
                        {editPortSecEnabled ? (
                          <ShieldCheck className="w-4 h-4 text-white shrink-0" />
                        ) : (
                          <Shield className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span className={editPortSecEnabled ? 'text-white' : 'text-slate-800'}>
                          {editPortSecEnabled ? 'فعال (switchport port-security)' : 'فعال‌سازی Port Security'}
                        </span>
                      </button>
                    </div>

                    {editPortSecEnabled && (
                      <div className="p-3.5 bg-slate-50/50 space-y-3.5">
                        {editMode === 'trunk' && (
                          <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>
                              <b>هشدار استاندارد سیسکو:</b> Port Security معمولاً روی پورت‌های اکسس (Access) اعمال می‌شود. پورت به طور خودکار به مود Access منتقل خواهد شد.
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                          {/* 1. Definition Mode Dropdown: Sticky & Configured */}
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">
                              تعریف مود یادگیری مک (MAC Definition Mode):
                            </label>
                            <select
                              value={editPortSecMode}
                              onChange={(e) => setEditPortSecMode(e.target.value as 'sticky' | 'configured' | 'dynamic')}
                              className="w-full px-2.5 py-1.5 rounded bg-white border border-indigo-300 text-slate-900 text-xs font-mono font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="sticky">استیکی (Sticky - چسبنده خودکار در Running-Config)</option>
                              <option value="configured">کانفیگور (Configured - تعریف دستی و استاتیک مک)</option>
                              <option value="dynamic">داینامیک (Dynamic - یادگیری در CAM بدون ذخیره دائم)</option>
                            </select>
                            <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                              {editPortSecMode === 'sticky' && 'مک‌ها با اتصال اولین کلاینت‌ها خودکار فراگرفته شده و در Running-Config درج می‌شوند.'}
                              {editPortSecMode === 'configured' && 'ادمین مک آدرس مجاز سخت‌افزاری را به صورت صریح تعریف می‌کند.'}
                              {editPortSecMode === 'dynamic' && 'مک‌ها به طور موقت در جدول حافظه CAM ثبت شده و پس از ریبوت بازنشانی می‌شوند.'}
                            </p>
                          </div>

                          {/* 2. Maximum MACs: ماکزیمم های مک ها */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-slate-700 font-semibold">
                                حداکثر مک آدرس‌های مجاز (Maximum MACs):
                              </label>
                              <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded">
                                {editPortSecMaxMac} آدرس
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={1024}
                                value={editPortSecMaxMac}
                                onChange={(e) => setEditPortSecMaxMac(Math.max(1, Math.min(1024, Number(e.target.value) || 1)))}
                                className="w-20 px-2.5 py-1.5 rounded bg-white border border-indigo-300 text-slate-900 text-xs font-mono text-center font-bold"
                                dir="ltr"
                              />
                              <div className="flex items-center gap-1 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => setEditPortSecMaxMac(1)}
                                  className={`px-2 py-1 rounded border transition ${
                                    editPortSecMaxMac === 1
                                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                  }`}
                                  title="استاندارد سیسکو برای پورت تک کاربر"
                                >
                                  ۱ مک (تک کلاینت)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditPortSecMaxMac(2)}
                                  className={`px-2 py-1 rounded border transition ${
                                    editPortSecMaxMac === 2
                                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                  }`}
                                  title="مناسب برای PC به همراه IP Phone سیسکو"
                                >
                                  ۲ مک (VoIP+PC)
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditPortSecMaxMac(5)}
                                  className={`px-2 py-1 rounded border transition ${
                                    editPortSecMaxMac === 5
                                      ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                  }`}
                                >
                                  ۵ مک
                                </button>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                              دستور معادل: <code className="font-mono text-indigo-700 bg-indigo-50 px-1 rounded">switchport port-security maximum {editPortSecMaxMac}</code>
                            </p>
                          </div>

                          {/* 3. Violation Action: واکنش تخلف */}
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">
                              سیاست برخورد با تخلف (Violation Action):
                            </label>
                            <select
                              value={editPortSecViolation}
                              onChange={(e) => setEditPortSecViolation(e.target.value as 'shutdown' | 'restrict' | 'protect')}
                              className="w-full px-2.5 py-1.5 rounded bg-white border border-indigo-300 text-slate-900 text-xs font-mono font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="shutdown">Shutdown (خاموشی خودکار و Err-Disable - پیش‌فرض سیسکو)</option>
                              <option value="restrict">Restrict (مسدودسازی بسته متخلف + ارسال لاگ و SNMP Trap)</option>
                              <option value="protect">Protect (مسدودسازی بی‌صدا بدون ثبت در لاگ)</option>
                            </select>
                            <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                              {editPortSecViolation === 'shutdown' && 'در صورت عبور از سقف مک، پورت فورا خاموش شده و نیاز به shut / no shut دارد.'}
                              {editPortSecViolation === 'restrict' && 'پورت روشن می‌ماند اما فریم‌های مک غیرمجاز دور ریخته شده و کانتر تخلف افزایش می‌یابد.'}
                              {editPortSecViolation === 'protect' && 'ترافیک غیرمجاز دور ریخته می‌شود بدون ارسال اعلان یا افزایش کانتر.'}
                            </p>
                          </div>
                        </div>

                        {/* Static MAC Input when Configured mode is selected */}
                        {editPortSecMode === 'configured' && (
                          <div className="p-2.5 rounded-md bg-indigo-50/70 border border-indigo-200 flex flex-wrap items-center gap-3">
                            <div className="flex-1 min-w-[260px]">
                              <label className="block text-slate-800 font-bold mb-1">
                                مک آدرس مجاز استاتیک (Configured Static MAC):
                              </label>
                              <input
                                type="text"
                                value={editPortSecConfiguredMac}
                                onChange={(e) => setEditPortSecConfiguredMac(e.target.value)}
                                placeholder="مثال: 0050.56a1.2b3c یا 00:50:56:A1:2B:3C"
                                className="w-full px-2.5 py-1.5 rounded bg-white border border-indigo-300 text-slate-900 text-xs font-mono text-left font-semibold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                dir="ltr"
                              />
                            </div>
                            <div className="pt-4 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditPortSecConfiguredMac('0050.56a1.2b3c')}
                                className="px-2.5 py-1.5 rounded bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-300 text-[11px] font-medium transition"
                              >
                                درج مک آدرس نمونه
                              </button>
                              {selectedPort.connected_device && (
                                <button
                                  type="button"
                                  onClick={() => setEditPortSecConfiguredMac('001c.23b4.6789')}
                                  className="px-2.5 py-1.5 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-800 text-[11px] font-medium transition"
                                >
                                  مک هاست فعلی ({selectedPort.connected_device})
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Real-time Cisco IOS CLI Preview */}
                        <div className="p-2.5 rounded-md bg-slate-900 text-emerald-400 font-mono text-[11px] text-left overflow-x-auto shadow-inner" dir="ltr">
                          <div className="text-slate-500 text-[10px] mb-1 flex items-center justify-between border-b border-slate-800 pb-1">
                            <span># Cisco IOS-XE Port Security Running-Config Preview:</span>
                            <span className="text-indigo-400 font-sans">تولید خودکار دستورات سیسکو</span>
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
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
            <div className="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-slate-800">لیست تمامی پورت‌های سوئیچ ({ports.length})</h4>
                <span className="text-[10px] text-slate-500">
                  {activeCount} پورت فعال • {inactiveCount} پورت خاموش • {trunkCount} ترانک • {portSecCount} با Port Security
                </span>
              </div>

              {/* Filters */}
              <div className="flex items-center flex-wrap gap-2 text-xs">
                <input
                  type="text"
                  placeholder="جستجوی پورت، ویلن، تجهیز یا سکیوریتی..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 w-48"
                />

                <div className="flex items-center bg-slate-100 rounded p-0.5 border border-slate-200">
                  <button
                    onClick={() => setFilterMode('all')}
                    className={`px-2 py-0.5 rounded text-[11px] transition ${
                      filterMode === 'all' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    همه
                  </button>
                  <button
                    onClick={() => setFilterMode('up')}
                    className={`px-2 py-0.5 rounded text-[11px] transition ${
                      filterMode === 'up' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    فعال
                  </button>
                  <button
                    onClick={() => setFilterMode('down')}
                    className={`px-2 py-0.5 rounded text-[11px] transition ${
                      filterMode === 'down' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    خاموش
                  </button>
                  <button
                    onClick={() => setFilterMode('trunk')}
                    className={`px-2 py-0.5 rounded text-[11px] transition ${
                      filterMode === 'trunk' ? 'bg-purple-600 text-white font-medium shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ترانک
                  </button>
                  <button
                    onClick={() => setFilterMode('access')}
                    className={`px-2 py-0.5 rounded text-[11px] transition ${
                      filterMode === 'access' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    اکسس
                  </button>
                  <button
                    onClick={() => setFilterMode('port-sec')}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition ${
                      filterMode === 'port-sec' ? 'bg-emerald-700 text-white font-medium shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="نمایش پورت‌های دارای Port Security فعال"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>Port Sec ({portSecCount})</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-medium">
                    <th className="px-3 py-2">نام پورت</th>
                    <th className="px-3 py-2">وضعیت پورت</th>
                    <th className="px-3 py-2">نوع (Mode)</th>
                    <th className="px-3 py-2">ویلن (VLAN)</th>
                    <th className="px-3 py-2">امنیت (Port Sec)</th>
                    <th className="px-3 py-2">تجهیز متصل (Connected)</th>
                    <th className="px-3 py-2">سرعت</th>
                    <th className="px-3 py-2">PoE</th>
                    <th className="px-3 py-2 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredPorts.map((port) => {
                    const isSelected = selectedPort?.port_id === port.port_id;
                    return (
                      <tr
                        key={port.port_id}
                        onClick={() => handleSelectPort(port)}
                        className={`cursor-pointer transition ${
                          isSelected ? 'bg-indigo-50/70 text-indigo-900 font-medium' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <td className="px-3 py-2 font-semibold text-slate-900">{port.port_id}</td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans ${
                              port.admin_status === 'disabled'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : port.status === 'up'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                port.admin_status === 'disabled'
                                  ? 'bg-amber-500'
                                  : port.status === 'up'
                                  ? 'bg-emerald-500'
                                  : 'bg-slate-400'
                              }`}
                            ></span>
                            {port.admin_status === 'disabled' ? 'Admin Down' : port.status === 'up' ? 'Up' : 'Down'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              port.mode === 'trunk'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {port.mode.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-bold text-indigo-600">VLAN {port.vlan}</td>
                        <td className="px-3 py-2">
                          {port.port_security_enabled ? (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans bg-emerald-50 text-emerald-800 border border-emerald-300 font-medium"
                              title={`Port Security Active\nMode: ${port.port_security_mode || 'sticky'}\nMax MACs: ${port.port_security_max_mac || 1}\nViolation: ${port.port_security_violation || 'shutdown'}`}
                            >
                              <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="font-mono">
                                {port.port_security_mode === 'sticky' ? 'Sticky' : port.port_security_mode === 'configured' ? 'Config' : 'Dynamic'}
                              </span>
                              <span className="bg-emerald-200/80 text-emerald-900 px-1 rounded text-[9px] font-mono font-bold">
                                {port.port_security_max_mac || 1}
                              </span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-sans text-slate-400">
                              <Shield className="w-3 h-3 text-slate-300 shrink-0" />
                              <span>Off</span>
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-800 font-sans text-xs">
                          {port.connected_device || '-'}
                        </td>
                        <td className="px-3 py-2 text-slate-500 text-[11px]">{port.speed}</td>
                        <td className="px-3 py-2 text-slate-500 text-[11px]">
                          {port.poe_power ? `${port.poe_power}W` : 'Off'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEdit(port);
                            }}
                            className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-indigo-600 text-[11px] font-sans transition"
                          >
                            ویرایش
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop-blur" data-modal-backdrop="true" dir="rtl">
            <div className="bg-white border border-slate-300 rounded-xl shadow-2xl max-w-xl w-full overflow-hidden text-right">
              {/* Header */}
              <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded bg-indigo-600/30 text-indigo-400 border border-indigo-500/40">
                    <Save className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">پیش‌نمایش و تایید نهایی تغییرات پورت</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      {device.name} ({device.ip}) • پورت {selectedPort.port_id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowConfirmSummary(false)}
                  className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body Content */}
              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                <p className="text-xs text-slate-600 leading-relaxed">
                  تغییرات زیر روی پورت <b className="font-mono text-slate-900">{selectedPort.port_id}</b> اعمال خواهند شد. لطفاً مقادیر جدید را قبل از ذخیره نهایی بررسی و تایید نمایید:
                </p>

                {/* Diff Comparison Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-right">
                    <thead className="bg-slate-100 text-slate-700 text-[11px]">
                      <tr>
                        <th className="p-2.5 font-bold">پارامتر تنظیماتی</th>
                        <th className="p-2.5 font-bold">مقدار قبلی</th>
                        <th className="p-2.5 font-bold text-indigo-600">مقدار جدید پیشنهادی</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {changedFields.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="p-4 text-center text-slate-500">
                            تغییری در پارامترهای پورت داده نشده است.
                          </td>
                        </tr>
                      ) : (
                        changedFields.map((field, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 font-medium text-slate-800">{field.label}</td>
                            <td className="p-2.5 text-slate-500 font-mono">{field.oldVal}</td>
                            <td className="p-2.5 font-mono font-bold text-indigo-700 bg-indigo-50/50">
                              {field.newVal}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Cisco CLI Script Preview */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium">
                    <span>دستورات معادل در سیسکو IOS (Running-Config):</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded vendor-badge-cisco font-bold">Cisco IOS-XE Script</span>
                  </div>
                  <pre className="p-3 rounded-lg bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto text-left leading-relaxed select-all" dir="ltr">
                    {generateCiscoCommands()}
                  </pre>
                </div>

                {/* Warning Alert about Running vs Startup */}
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <b>توجه مهم سیسکو:</b> این تغییرات بلافاصله در حافظه جاری (Running-Config) سوئیچ اعمال می‌شود. پس از ذخیره، این تجهیز در پنل با وضعیت <b>«تغییرات رایت‌نشده»</b> مشخص خواهد شد تا مهندس شبکه دستور <code className="bg-amber-100 text-amber-900 px-1 rounded font-mono font-bold">write memory</code> را برای ذخیره دائم در NVRAM اجرا نماید.
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-5 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  onClick={() => setShowConfirmSummary(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-medium transition"
                >
                  انصراف و اصلاح
                </button>
                <button
                  onClick={handleConfirmSave}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSaving ? 'در حال اعمال در سوئیچ...' : 'تایید و اعمال تغییرات'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
