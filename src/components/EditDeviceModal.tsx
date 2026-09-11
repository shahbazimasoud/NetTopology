import React, { useState, useEffect } from 'react';
import {
  X,
  Edit3,
  Server,
  Router as RouterIcon,
  Wifi,
  Shield,
  HardDrive,
  MapPin,
  Terminal,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Cpu,
  Radio
} from 'lucide-react';
import { Device, DeviceType, DevicePlatform, ConnectionMode } from '../types';
import { testDeviceConnection, pingDevice } from '../services/api';
import { useLanguage } from '../i18n';

export interface EditDeviceModalProps {
  isOpen: boolean;
  device: Device | null;
  onClose: () => void;
  onSave: (deviceId: string, updates: Partial<Device>) => Promise<void>;
}

export const EditDeviceModal: React.FC<EditDeviceModalProps> = ({
  isOpen,
  device,
  onClose,
  onSave,
}) => {
  const { isRtl, isEn } = useLanguage();

  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [platform, setPlatform] = useState<DevicePlatform>('cisco_ios');
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('ssh');
  const [type, setType] = useState<DeviceType>('switch');
  const [role, setRole] = useState('Access Switch');
  const [model, setModel] = useState('');
  const [building, setBuilding] = useState('');
  const [floor, setFloor] = useState('');
  const [unit, setUnit] = useState('');
  const [rack, setRack] = useState('');
  const [totalPorts, setTotalPorts] = useState(24);
  const [isOnline, setIsOnline] = useState(true);
  const [cdpEnabled, setCdpEnabled] = useState(true);
  const [lldpEnabled, setLldpEnabled] = useState(true);
  const [snmpCommunity, setSnmpCommunity] = useState('public');

  // SSH Credentials
  const [sshHost, setSshHost] = useState('');
  const [sshPort, setSshPort] = useState(22);
  const [sshUsername, setSshUsername] = useState('admin');
  const [sshPassword, setSshPassword] = useState('');
  const [enablePassword, setEnablePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [isTestingSsh, setIsTestingSsh] = useState(false);
  const [sshTestResult, setSshTestResult] = useState<{ success: boolean; message: string; latency_ms?: number } | null>(null);
  const [isTestingPing, setIsTestingPing] = useState(false);
  const [pingTestResult, setPingTestResult] = useState<{ success: boolean; message: string; latency_ms?: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when device prop changes or modal opens
  useEffect(() => {
    if (!device || !isOpen) return;
    setName(device.name || '');
    setIp(device.ip || '');
    setPlatform(device.platform || 'cisco_ios');
    setConnectionMode(device.connection_mode || 'ssh');
    setType(device.type || 'switch');
    setRole(device.role || 'Access Switch');
    setModel(device.model || '');
    setBuilding(device.building || '');
    setFloor(device.floor || '');
    setUnit(device.unit || '');
    setRack(device.rack || '');
    setTotalPorts(device.total_ports || 24);
    setIsOnline(Boolean(device.is_online));
    setCdpEnabled(device.cdp_enabled ?? true);
    setLldpEnabled(device.lldp_enabled ?? true);
    setSnmpCommunity(device.snmp_community || 'public');

    setSshHost(device.ssh_host || device.ip || '');
    setSshPort(device.ssh_port || 22);
    setSshUsername(device.ssh_username || 'admin');
    setSshPassword(device.ssh_password || '');
    setEnablePassword(device.enable_password || '');

    setSshTestResult(null);
    setPingTestResult(null);
    setError(null);
  }, [device, isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !device) return null;

  const handleTestSsh = async () => {
    const targetHost = (sshHost.trim() || ip.trim());
    if (!targetHost) {
      setError(isEn ? 'Please enter a target host or IP for SSH connection' : 'لطفاً ابتدا آدرس IP تجهیز را وارد کنید');
      return;
    }
    try {
      setIsTestingSsh(true);
      setSshTestResult(null);
      setError(null);
      const res = await testDeviceConnection({
        ip: targetHost,
        ssh_host: targetHost,
        ssh_port: Number(sshPort) || 22,
        ssh_username: sshUsername.trim(),
        ssh_password: sshPassword,
        enable_password: enablePassword,
      });
      setSshTestResult({
        success: true,
        message: res.message || (isEn ? 'SSH authentication successful!' : 'اتصال SSH برقرار و احراز هویت شد!'),
        latency_ms: res.latency_ms,
      });
    } catch (err: any) {
      setSshTestResult({
        success: false,
        message: err.message || (isEn ? 'SSH connection failed' : 'اتصال SSH ناموفق بود'),
      });
    } finally {
      setIsTestingSsh(false);
    }
  };

  const handleTestPing = async () => {
    const targetIp = ip.trim();
    if (!targetIp) {
      setError(isEn ? 'Please enter an IP address to ping' : 'لطفاً آدرس IP را وارد کنید');
      return;
    }
    try {
      setIsTestingPing(true);
      setPingTestResult(null);
      setError(null);
      const res = await pingDevice(device.id);
      const online = Boolean(res.device.is_online);
      setIsOnline(online);
      setPingTestResult({
        success: online,
        message: online
          ? (isEn ? `Host is reachable (Latency: ${res.device.latency_ms} ms)` : `میزبان در دسترس است (تاخیر: ${res.device.latency_ms} میلی‌ثانیه)`)
          : (isEn ? 'Host did not respond to ICMP ping (Offline)' : 'تجهیز به پینگ ICMP پاسخ نداد (آفلاین)'),
        latency_ms: res.device.latency_ms ?? undefined,
      });
    } catch (err: any) {
      setPingTestResult({
        success: false,
        message: err.message || (isEn ? 'Ping test failed' : 'تست پینگ ناموفق بود'),
      });
    } finally {
      setIsTestingPing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(isEn ? 'Device hostname cannot be empty' : 'نام یا شناسه تجهیز نمی‌تواند خالی باشد');
      return;
    }
    if (!ip.trim() || !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip.trim())) {
      setError(isEn ? 'Please enter a valid IP address (e.g. 192.168.1.50)' : 'لطفاً یک آدرس IP معتبر وارد کنید (مثال: 192.168.1.50)');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave(device.id, {
        name: name.trim(),
        ip: ip.trim(),
        ssh_host: sshHost.trim() || ip.trim(),
        type,
        role: role.trim(),
        platform,
        connection_mode: connectionMode,
        connection: {
          protocol: 'ssh',
          host: sshHost.trim() || ip.trim(),
          port: Number(sshPort) || 22,
          username: sshUsername.trim() || 'admin',
          password: sshPassword,
          connection_timeout: 4000,
        },
        model: model.trim(),
        building: building.trim(),
        floor: floor.trim(),
        unit: unit.trim(),
        rack: rack.trim(),
        total_ports: Number(totalPorts),
        is_online: isOnline,
        cdp_enabled: cdpEnabled,
        lldp_enabled: lldpEnabled,
        snmp_community: snmpCommunity.trim(),
        ssh_port: Number(sshPort) || 22,
        ssh_username: sshUsername.trim() || 'admin',
        ssh_password: sshPassword,
        enable_password: enablePassword,
        ssh_status: sshTestResult?.success ? 'authenticated' : (device.ssh_status || 'configured'),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || (isEn ? 'Failed to update device' : 'خطا در به‌روزرسانی مشخصات تجهیز'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 modal-backdrop-blur overflow-y-auto"
      data-modal-backdrop="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[94vh] sm:max-h-[90vh] flex flex-col text-slate-100 animate-fadeIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  {isEn ? 'Edit Device Properties' : 'ویرایش مشخصات تجهیز شبکه'}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  {device.name}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isEn ? 'Update hardware, management IP, credentials and location metadata' : 'ویرایش نام، آدرس IP، مشخصات سخت‌افزاری، موقعیت مکانی و دسترسی SSH'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Platform & OS Driver Selector */}
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
                  <Cpu className="w-4 h-4" />
                  <span>{isEn ? 'Hardware Platform & Network OS:' : 'پلتفرم سخت‌افزاری و سیستم‌عامل شبکه:'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400">{isEn ? 'Driver Mode:' : 'حالت اجرا:'}</span>
                  <button
                    type="button"
                    onClick={() => setConnectionMode('ssh')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                      connectionMode === 'ssh'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    SSH Live
                  </button>
                  <button
                    type="button"
                    onClick={() => setConnectionMode('simulator')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer ${
                      connectionMode === 'simulator'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Simulator
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPlatform('cisco_ios')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition cursor-pointer ${
                    platform === 'cisco_ios'
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm ring-1 ring-indigo-500/30'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold font-mono">Cisco IOS</span>
                  <span className="text-[10px] text-slate-400">Catalyst 2960/3750</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlatform('cisco_ios_xe')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition cursor-pointer ${
                    platform === 'cisco_ios_xe'
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm ring-1 ring-indigo-500/30'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold font-mono">Cisco IOS-XE</span>
                  <span className="text-[10px] text-slate-400">Cat 9300 / ISR 4k</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlatform('mikrotik_routeros')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition cursor-pointer ${
                    platform === 'mikrotik_routeros'
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm ring-1 ring-indigo-500/30'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold font-mono">MikroTik RouterOS</span>
                  <span className="text-[10px] text-slate-400">CRS / CCR / RB</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlatform('generic_linux')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition cursor-pointer ${
                    platform === 'generic_linux'
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm ring-1 ring-indigo-500/30'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold font-mono">Generic Linux</span>
                  <span className="text-[10px] text-slate-400">Ubuntu / Server</span>
                </button>
              </div>
            </div>

            {/* Device Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {isEn ? 'Device Role & Category:' : 'رده و نوع تجهیز (Device Type):'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setType('switch');
                    if (role === 'Edge Gateway' || role === 'Wireless AP') setRole('Access Switch');
                  }}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                    type === 'switch'
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Server className="w-4 h-4" />
                  <span className="text-xs font-bold">{isEn ? 'Switch' : 'سوئیچ (Switch)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType('router');
                    if (role !== 'Edge Gateway') setRole('Edge Gateway');
                  }}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                    type === 'router'
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <RouterIcon className="w-4 h-4" />
                  <span className="text-xs font-bold">{isEn ? 'Router' : 'روتر (Router)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType('access_point');
                    setRole('Wireless AP');
                    setTotalPorts(2);
                  }}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                    type === 'access_point'
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Wifi className="w-4 h-4" />
                  <span className="text-xs font-bold">{isEn ? 'Access Point' : 'اکسس‌پوینت (AP)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType('firewall');
                    setRole('Security Appliance');
                  }}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition cursor-pointer ${
                    type === 'firewall'
                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-sm'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span className="text-xs font-bold">{isEn ? 'Firewall' : 'فایروال (Firewall)'}</span>
                </button>
              </div>
            </div>

            {/* Hostname & IP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isEn ? 'Device Hostname:' : 'نام یا شناسه تجهیز (Hostname):'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="SW-ACC-BLDG-A-F2"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-300">
                    {isEn ? 'Management IP Address:' : 'آدرس آی‌پی مدیریتی (IP Address):'}
                  </label>
                  <button
                    type="button"
                    onClick={handleTestPing}
                    disabled={isTestingPing}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTestingPing ? 'animate-spin' : ''}`} />
                    <span>{isEn ? 'Ping Host' : 'تست پینگ'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  placeholder="192.168.1.32"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500 font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Ping Result Banner */}
            {pingTestResult && (
              <div
                className={`p-2.5 rounded-xl flex items-center gap-2 text-xs ${
                  pingTestResult.success
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                }`}
              >
                {pingTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{pingTestResult.message}</span>
              </div>
            )}

            {/* Model, Role & Total Ports */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isEn ? 'Equipment Role:' : 'نقش در شبکه (Role):'}
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="Core Switch">{isEn ? 'Core Switch' : 'Core Switch (سوئیچ اصلی)'}</option>
                  <option value="Distribution Switch">{isEn ? 'Distribution Switch' : 'Distribution Switch (سوئیچ توزیع)'}</option>
                  <option value="Access Switch">{isEn ? 'Access Switch' : 'Access Switch (سوئیچ دسترسی)'}</option>
                  <option value="Edge Gateway">{isEn ? 'Edge Gateway / Router' : 'Edge Gateway / Router (مسیریاب مرزی)'}</option>
                  <option value="Wireless AP">{isEn ? 'Wireless Access Point' : 'Wireless AP (اکسس‌پوینت وای‌فای)'}</option>
                  <option value="Security Appliance">{isEn ? 'Security Appliance / Firewall' : 'فایروال و امنیت شبکه'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isEn ? 'Hardware Model:' : 'مدل سخت‌افزاری (Model):'}
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Cisco Catalyst 9200L / MikroTik CCR"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {isEn ? 'Total Ports Count:' : 'تعداد کل پورت‌ها:'}
                </label>
                <select
                  value={totalPorts}
                  onChange={(e) => setTotalPorts(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500 font-mono text-left"
                  dir="ltr"
                >
                  <option value={2}>2 Ports ({isEn ? 'AP / Gateway' : 'برای AP یا گیت‌وی'})</option>
                  <option value={8}>8 Ports ({isEn ? 'Router / Mini Switch' : 'روتر یا سوئیچ ۸ پورت'})</option>
                  <option value={16}>16 Ports</option>
                  <option value={24}>24 Ports</option>
                  <option value={28}>28 Ports (24 Copper + 4 SFP+)</option>
                  <option value={48}>48 Ports</option>
                  <option value={52}>52 Ports (48 Copper + 4 SFP+)</option>
                </select>
              </div>
            </div>

            {/* Operational & Reachability Status Toggle */}
            <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/80 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-slate-200">
                  {isEn ? 'Device Administrative Status:' : 'وضعیت پاسخ‌دهی و آنلاین بودن تجهیز:'}
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isEn ? 'Sets whether this node is considered active or unreachable in telemetry' : 'تعیین وضعیت فعال یا قطع بودن در پایش کلی مانیتورینگ'}
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isOnline}
                  onChange={(e) => setIsOnline(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 relative"></div>
                <span className={`text-xs font-mono font-bold ${isOnline ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {isOnline ? (isEn ? 'Online' : 'آنلاین') : (isEn ? 'Offline' : 'آفلاین')}
                </span>
              </label>
            </div>

            {/* SSH Credentials & Terminal Access Section */}
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  <span>{isEn ? 'SSH Credentials & Terminal Access:' : 'مشخصات دسترسی SSH و کنسول خط فرمان:'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleTestSsh}
                  disabled={isTestingSsh}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isTestingSsh ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>{isEn ? 'Testing...' : 'در حال تست...'}</span>
                    </>
                  ) : (
                    <>
                      <Terminal className="w-3 h-3" />
                      <span>{isEn ? 'Test SSH Connection' : 'تست اتصال SSH'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* SSH Test Result */}
              {sshTestResult && (
                <div
                  className={`p-2.5 rounded-lg flex items-start gap-2 text-xs ${
                    sshTestResult.success
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                  }`}
                >
                  {sshTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold">{sshTestResult.message}</div>
                    {sshTestResult.latency_ms !== undefined && (
                      <div className="text-[11px] text-emerald-400/80 mt-0.5 font-mono">
                        {isEn ? 'Latency' : 'تاخیر اتصال'}: {sshTestResult.latency_ms} ms
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-8">
                  <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center justify-between">
                    <span className="font-semibold text-indigo-300">{isEn ? 'SSH Target Host / IP:' : 'آدرس IP اتصال SSH:'}</span>
                    <span className="text-[10px] text-slate-400">{isEn ? 'Terminal target IP' : 'آدرس مقصد برای کنسول'}</span>
                  </label>
                  <input
                    type="text"
                    value={sshHost}
                    onChange={(e) => setSshHost(e.target.value)}
                    placeholder={ip || '192.168.1.50'}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-indigo-500/40 text-white text-xs focus:outline-none focus:border-indigo-400 font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    {isEn ? 'SSH Port:' : 'پورت SSH:'}
                  </label>
                  <input
                    type="number"
                    value={sshPort}
                    onChange={(e) => setSshPort(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    {isEn ? 'SSH Username:' : 'نام کاربری SSH:'}
                  </label>
                  <input
                    type="text"
                    value={sshUsername}
                    onChange={(e) => setSshUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center justify-between">
                    <span>{isEn ? 'SSH Password:' : 'رمز عبور SSH:'}</span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={sshPassword}
                    onChange={(e) => setSshPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>

                {platform !== 'mikrotik_routeros' && platform !== 'generic_linux' ? (
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      {isEn ? 'Enable Secret Password:' : 'رمز Enable (اختیاری):'}
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={enablePassword}
                      onChange={(e) => setEnablePassword(e.target.value)}
                      placeholder="cisco"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500 font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                ) : (
                  <div className="sm:col-span-4 flex items-center">
                    <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] leading-relaxed">
                      {isEn
                        ? 'RouterOS / Linux uses direct user permissions; no enable secret required.'
                        : 'سیستم‌عامل انتخابی نیازی به رمز Enable ندارد؛ سطح دسترسی مستقیماً از کاربر خوانده می‌شود.'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Physical Location Hierarchy */}
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2.5">
              <div className="flex items-center gap-1.5 text-indigo-400 text-xs font-bold">
                <MapPin className="w-3.5 h-3.5" />
                <span>{isEn ? 'Physical Location & Rack Placement:' : 'موقعیت فیزیکی استقرار تجهیز (Location & Rack):'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    {isEn ? 'Building:' : 'نام ساختمان (Building):'}
                  </label>
                  <input
                    type="text"
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    placeholder={isEn ? 'Central Building' : 'ساختمان مرکزی'}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    {isEn ? 'Floor:' : 'طبقه (Floor):'}
                  </label>
                  <input
                    type="text"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder={isEn ? 'Floor 2' : 'طبقه ۲'}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    {isEn ? 'Room / Unit:' : 'واحد یا اتاق (Unit / Room):'}
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder={isEn ? 'IT Server Room' : 'اتاق سرور'}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    {isEn ? 'Rack / Cabinet:' : 'شماره رک یا کابینت (Rack):'}
                  </label>
                  <input
                    type="text"
                    value={rack}
                    onChange={(e) => setRack(e.target.value)}
                    placeholder="Rack-B02"
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Discovery Protocols & SNMP */}
            <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  {isEn ? 'Discovery Protocols & SNMP Management:' : 'پروتکل‌های کشف همسایگی و مدیریت SNMP:'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={cdpEnabled}
                    onChange={(e) => setCdpEnabled(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <span>CDP (Cisco Discovery Protocol)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 hover:text-white">
                  <input
                    type="checkbox"
                    checked={lldpEnabled}
                    onChange={(e) => setLldpEnabled(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <span>LLDP (IEEE 802.1AB)</span>
                </label>

                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-[11px] text-slate-400 font-mono">SNMP Community:</span>
                  <input
                    type="text"
                    value={snmpCommunity}
                    onChange={(e) => setSnmpCommunity(e.target.value)}
                    placeholder="public"
                    className="w-28 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-xs font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-800 bg-slate-950/80 shrink-0">
            <div className="text-[11px] text-slate-400 font-mono">
              ID: <span className="text-slate-300">{device.id}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition cursor-pointer"
              >
                {isEn ? 'Cancel' : 'انصراف'}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{isEn ? 'Saving Changes...' : 'در حال ذخیره‌سازی...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Save Changes' : 'ذخیره تغییرات'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
