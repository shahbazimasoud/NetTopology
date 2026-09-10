import React, { useState, useEffect } from 'react';
import { X, Network, Server, Wifi, Router as RouterIcon, ShieldCheck, MapPin, FileCode2, Terminal, Key, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Cpu, Radio } from 'lucide-react';
import { Device, DeviceType, DevicePlatform, ConnectionMode, ConfigTemplate } from '../types';
import { fetchTemplates, testDeviceConnection } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (device: Partial<Device>) => Promise<Device | void>;
  onDeviceCreatedWithTemplate?: (device: Device, templateId: string) => void;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  onDeviceCreatedWithTemplate,
}) => {
  const { t, isEn } = useLanguage();
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [platform, setPlatform] = useState<DevicePlatform>('cisco_ios');
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>('ssh');
  const [type, setType] = useState<DeviceType>('switch');
  const [role, setRole] = useState('Access Switch');
  const [model, setModel] = useState('Cisco Catalyst 2960X-48FPS-L');
  const [building, setBuilding] = useState(isEn ? 'HQ Central Building' : 'ساختمان مرکزی');
  const [floor, setFloor] = useState(isEn ? 'Floor 2' : 'طبقه ۲');
  const [unit, setUnit] = useState(isEn ? 'IT Server Room' : 'اتاق سرور و رک');
  const [rack, setRack] = useState('Rack-B02');
  const [totalPorts, setTotalPorts] = useState(24);
  const [cdpEnabled, setCdpEnabled] = useState(true);
  const [lldpEnabled, setLldpEnabled] = useState(true);
  const [snmpCommunity, setSnmpCommunity] = useState('public');
  const [sshHost, setSshHost] = useState('');
  const [sshPort, setSshPort] = useState(22);
  const [sshUsername, setSshUsername] = useState('admin');
  const [sshPassword, setSshPassword] = useState('cisco123');
  const [enablePassword, setEnablePassword] = useState('cisco');
  const [showPassword, setShowPassword] = useState(false);
  const [isTestingSsh, setIsTestingSsh] = useState(false);
  const [sshTestResult, setSshTestResult] = useState<{ success: boolean; message: string; latency_ms?: number } | null>(null);
  const [templates, setTemplates] = useState<ConfigTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlatformChange = (newPlatform: DevicePlatform) => {
    setPlatform(newPlatform);
    if (newPlatform === 'mikrotik_routeros') {
      if (model.includes('Cisco') || model.includes('Ubuntu')) {
        setModel('MikroTik RouterBOARD CRS328-24P-4S+RM');
      }
      setRole('Core Switch / Router');
      setSshUsername('admin');
      setSshPassword('');
    } else if (newPlatform === 'generic_linux') {
      if (model.includes('Cisco') || model.includes('MikroTik')) {
        setModel('Ubuntu 22.04 LTS / OpenSwitch');
      }
      setRole('Network Gateway / Server');
      setSshUsername('root');
      setSshPassword('');
    } else if (newPlatform === 'cisco_ios_xe') {
      if (model.includes('2960') || model.includes('MikroTik')) {
        setModel('Cisco Catalyst 9300-24P');
      }
      setSshUsername('admin');
      setSshPassword('cisco123');
    } else if (newPlatform === 'cisco_ios') {
      if (model.includes('9300') || model.includes('MikroTik')) {
        setModel('Cisco Catalyst 2960X-48FPS-L');
      }
      setSshUsername('admin');
      setSshPassword('cisco123');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchTemplates()
      .then((res) => {
        setTemplates(res.templates);
      })
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    const targetHost = (sshHost.trim() || ip.trim());
    if (!targetHost || !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(targetHost)) {
      setError(isEn ? 'Please enter a valid IP address for SSH connection' : 'لطفاً ابتدا آدرس IP معتبر وارد کنید تا اتصال تست شود');
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
        message: res.message || (isEn ? 'SSH Connection successful!' : 'اتصال SSH برقرار و احراز هویت شد!'),
        latency_ms: res.latency_ms,
      });
    } catch (err: any) {
      setSshTestResult({
        success: false,
        message: err.message || (isEn ? 'Connection failed' : 'اتصال SSH ناموفق بود'),
      });
    } finally {
      setIsTestingSsh(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(isEn ? 'Please enter device name' : 'لطفاً نام تجهیز را وارد کنید');
      return;
    }
    if (!ip.trim() || !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip.trim())) {
      setError(isEn ? 'Please enter a valid IP address (e.g. 192.168.1.50)' : 'لطفاً آدرس IP معتبر وارد کنید (مثال: 192.168.1.50)');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const created = await onAdd({
        name: name.trim(),
        ip: ip.trim(),
        ssh_host: sshHost.trim() || ip.trim(),
        type,
        role,
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
        cdp_enabled: cdpEnabled,
        lldp_enabled: lldpEnabled,
        snmp_community: snmpCommunity.trim(),
        ssh_port: Number(sshPort) || 22,
        ssh_username: sshUsername.trim() || 'admin',
        ssh_password: sshPassword,
        enable_password: enablePassword,
        ssh_status: sshTestResult?.success ? 'authenticated' : 'configured',
      });
      onClose();

      // If user selected a template for this newly introduced device, trigger interactive template applicator
      if (selectedTemplateId && onDeviceCreatedWithTemplate && created) {
        onDeviceCreatedWithTemplate(created as Device, selectedTemplateId);
      }
    } catch (err: any) {
      setError(err.message || (isEn ? 'Error adding device' : 'خطا در ثبت تجهیز'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 modal-backdrop-blur overflow-y-auto"
      data-modal-backdrop="true"
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] sm:max-h-[88vh] flex flex-col text-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('add_device_title')}</h3>
              <p className="text-[11px] text-slate-500">{t('add_device_subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
            aria-label={t('action_close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4">
            {error && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {error}
              </div>
            )}

            {/* Platform & OS Driver Selector */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold">
                  <Cpu className="w-4 h-4" />
                  <span>{isEn ? 'Hardware Platform & Network OS:' : 'پلتفرم سخت‌افزاری و سیستم‌عامل شبکه:'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="text-slate-500">{isEn ? 'Driver Mode:' : 'حالت اجرا:'}</span>
                  <button
                    type="button"
                    onClick={() => setConnectionMode('ssh')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                      connectionMode === 'ssh'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    SSH Live
                  </button>
                  <button
                    type="button"
                    onClick={() => setConnectionMode('simulator')}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                      connectionMode === 'simulator'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    Simulator
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handlePlatformChange('cisco_ios')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition cursor-pointer ${
                    platform === 'cisco_ios'
                      ? 'bg-white border-indigo-600 text-indigo-700 shadow-sm ring-2 ring-indigo-500/20'
                      : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold font-mono">Cisco IOS</span>
                  <span className="text-[10px] text-slate-400">Catalyst 2960 / 3750</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePlatformChange('cisco_ios_xe')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition cursor-pointer ${
                    platform === 'cisco_ios_xe'
                      ? 'bg-white border-indigo-600 text-indigo-700 shadow-sm ring-2 ring-indigo-500/20'
                      : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold font-mono">Cisco IOS-XE</span>
                  <span className="text-[10px] text-slate-400">Cat 9300 / ISR 4k</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePlatformChange('mikrotik_routeros')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition cursor-pointer ${
                    platform === 'mikrotik_routeros'
                      ? 'bg-white border-indigo-600 text-indigo-700 shadow-sm ring-2 ring-indigo-500/20'
                      : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold font-mono">MikroTik RouterOS</span>
                  <span className="text-[10px] text-slate-400">CRS / CCR / RB</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePlatformChange('generic_linux')}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-center transition cursor-pointer ${
                    platform === 'generic_linux'
                      ? 'bg-white border-indigo-600 text-indigo-700 shadow-sm ring-2 ring-indigo-500/20'
                      : 'bg-white/80 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold font-mono">Generic Linux</span>
                  <span className="text-[10px] text-slate-400">Ubuntu / VyOS / SONiC</span>
                </button>
              </div>
            </div>

            {/* Device Type Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {isEn ? 'Device Role & Type:' : 'نوع تجهیز (Device Type):'}
              </label>
              <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setType('switch');
                    setRole('Access Switch');
                    setModel('Cisco Catalyst 2960X-48FPS-L');
                    setTotalPorts(24);
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                    type === 'switch'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Server className="w-4 h-4" />
                  <span className="text-xs font-bold">{isEn ? 'Switch' : 'سوییچ شبکه (Switch)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType('router');
                    setRole('Edge Gateway');
                    setModel('Cisco ISR 4451-X');
                    setTotalPorts(8);
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                    type === 'router'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <RouterIcon className="w-4 h-4" />
                  <span className="text-xs font-bold">{isEn ? 'Router' : 'روتر شبکه (Router)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setType('access_point');
                    setRole('Wireless AP');
                    setModel('Cisco Catalyst 9120AXI');
                    setTotalPorts(2);
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition ${
                    type === 'access_point'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Wifi className="w-4 h-4" />
                  <span className="text-xs font-bold">{isEn ? 'Access Point' : 'اکسس پوینت (AP)'}</span>
                </button>
              </div>
            </div>

            {/* Identity & IP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {isEn ? 'Device Hostname:' : 'نام یا شناسه تجهیز (Hostname):'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isEn ? 'e.g. SW-ACC-BLDG-A-F2' : 'مثلاً: SW-ACC-BLDG-A-F2'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {isEn ? 'Management IP Address:' : 'آدرس آی‌پی مدیریتی (IP Address):'}
                </label>
                <input
                  type="text"
                  required
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  placeholder={isEn ? 'e.g. 192.168.1.25' : 'مثلاً: 192.168.1.25'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Model & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {isEn ? 'Equipment Role:' : 'نقش تجهیز (Role):'}
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Core Switch">{isEn ? 'Core Switch' : 'Core Switch (سوئیچ اصلی)'}</option>
                  <option value="Distribution Switch">{isEn ? 'Distribution Switch' : 'Distribution Switch (سوئیچ توزیع)'}</option>
                  <option value="Access Switch">{isEn ? 'Access Switch' : 'Access Switch (سوئیچ دسترسی)'}</option>
                  <option value="Edge Gateway">{isEn ? 'Edge Gateway / Router' : 'Edge Gateway / Router (مسیریاب مرزی)'}</option>
                  <option value="Wireless AP">{isEn ? 'Wireless Access Point' : 'Wireless Access Point (اکسس‌پوینت وای‌فای)'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {isEn ? 'Hardware Model:' : 'مدل سخت‌افزاری (Hardware Model):'}
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="Cisco Catalyst / MikroTik / Aruba"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {isEn ? 'Total Ports:' : 'تعداد پورت‌ها (Total Ports):'}
                </label>
                <select
                  value={totalPorts}
                  onChange={(e) => setTotalPorts(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                  dir="ltr"
                >
                  <option value={2}>2 Ports ({isEn ? 'for AP' : 'برای AP'})</option>
                  <option value={8}>8 Ports ({isEn ? 'for Router/Mini SW' : 'برای روتر/سوئیچ کوچک'})</option>
                  <option value={16}>16 Ports</option>
                  <option value={24}>24 Ports</option>
                  <option value={48}>48 Ports</option>
                </select>
              </div>
            </div>

            {/* SSH Credentials & Connection Verification */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold">
                  <Terminal className="w-4 h-4 text-indigo-600" />
                  <span>{isEn ? 'SSH Credentials & Terminal Access:' : 'مشخصات دسترسی SSH و خط فرمان (CLI):'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingSsh}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-semibold transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {isTestingSsh ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>{isEn ? 'Testing...' : 'در حال تست...'}</span>
                    </>
                  ) : (
                    <>
                      <Terminal className="w-3 h-3" />
                      <span>{isEn ? 'Test Connection' : 'تست اتصال SSH'}</span>
                    </>
                  )}
                </button>
              </div>

              {/* SSH Test Status Result Banner */}
              {sshTestResult && (
                <div
                  className={`p-2.5 rounded-lg flex items-start gap-2 text-xs font-sans ${
                    sshTestResult.success
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  {sshTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold">{sshTestResult.message}</div>
                    {sshTestResult.latency_ms !== undefined && (
                      <div className="text-[11px] opacity-80 mt-0.5 font-mono">
                        {isEn ? 'Latency' : 'پینگ / تاخیر'}: {sshTestResult.latency_ms}ms
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-8">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1 flex items-center justify-between">
                    <span className="font-semibold text-indigo-700">{isEn ? 'SSH Target Host / IP:' : 'آدرس IP اتصال SSH (کانکشن اصلی):'}</span>
                    <span className="text-[10px] text-slate-500">{isEn ? 'Terminal connection target' : 'مقصد اتصال ترمینال مودال‌ها'}</span>
                  </label>
                  <input
                    type="text"
                    value={sshHost}
                    onChange={(e) => setSshHost(e.target.value)}
                    placeholder={ip || '192.168.1.50'}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-indigo-200 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    {isEn ? 'SSH Port:' : 'پورت SSH:'}
                  </label>
                  <input
                    type="number"
                    value={sshPort}
                    onChange={(e) => setSshPort(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    {isEn ? 'SSH Username:' : 'نام کاربری SSH:'}
                  </label>
                  <input
                    type="text"
                    value={sshUsername}
                    onChange={(e) => setSshUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-medium text-slate-700 mb-1 flex items-center justify-between">
                    <span>{isEn ? 'SSH Password:' : 'رمز عبور SSH:'}</span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={sshPassword}
                    onChange={(e) => setSshPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 font-mono text-left"
                    dir="ltr"
                  />
                </div>

                {platform !== 'mikrotik_routeros' && platform !== 'generic_linux' ? (
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-medium text-slate-700 mb-1">
                      {isEn ? 'Enable Secret:' : 'رمز Enable (اختیاری):'}
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={enablePassword}
                      onChange={(e) => setEnablePassword(e.target.value)}
                      placeholder="cisco"
                      className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 font-mono text-left"
                      dir="ltr"
                    />
                  </div>
                ) : (
                  <div className="sm:col-span-4 flex items-center">
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] leading-relaxed">
                      {isEn
                        ? 'RouterOS / Linux uses direct user permissions; no enable password required.'
                        : 'سیستم‌عامل انتخابی نیازی به رمز Enable ندارد؛ سطح دسترسی مستقیماً از کاربر اعمال می‌شود.'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Location Fields (Building, Floor, Unit, Rack) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-1.5 text-indigo-700 text-xs font-bold">
                <MapPin className="w-3.5 h-3.5" />
                <span>{isEn ? 'Physical Placement Location:' : 'موقعیت استقرار فیزیکی تجهیز (Physical Location):'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    {isEn ? 'Building:' : 'کدام ساختمان؟ (Building):'}
                  </label>
                  <input
                    type="text"
                    required
                    value={building}
                    onChange={(e) => setBuilding(e.target.value)}
                    placeholder={isEn ? 'e.g. Central Building' : 'مثلاً: ساختمان مرکزی'}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    {isEn ? 'Floor:' : 'کدام طبقه؟ (Floor):'}
                  </label>
                  <input
                    type="text"
                    required
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder={isEn ? 'e.g. Ground Floor, Floor 2' : 'مثلاً: طبقه همکف، طبقه ۱'}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    {isEn ? 'Room / Unit:' : 'کدام واحد یا اتاق؟ (Unit / Room):'}
                  </label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder={isEn ? 'e.g. Server Room, Room 302' : 'مثلاً: اتاق سرور، واحد مالی'}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    {isEn ? 'Rack / Cabinet:' : 'شماره رک یا موقعیت (Rack / Cabinet):'}
                  </label>
                  <input
                    type="text"
                    value={rack}
                    onChange={(e) => setRack(e.target.value)}
                    placeholder={isEn ? 'e.g. Rack-A01' : 'مثلاً: Rack-A01'}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Configuration Template Selection */}
            <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                  <FileCode2 className="w-4 h-4 text-indigo-600" />
                  <span>{isEn ? 'Initial Configuration Template:' : 'الگوی کانفیگ اولیه خودکار (Configuration Template):'}</span>
                </label>
                <span className="text-[10px] text-indigo-600 font-medium font-mono">Cisco / MikroTik</span>
              </div>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-indigo-200 text-slate-800 text-xs focus:outline-none focus:border-indigo-500 font-sans"
              >
                <option value="">{isEn ? '-- No Template (Register in Inventory Only) --' : '-- بدون تمپلیت (فقط ثبت در دیتابیس) --'}</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.vendor.toUpperCase()}] {t.name} ({t.role})
                  </option>
                ))}
              </select>
              {selectedTemplateId && (
                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  {isEn
                    ? 'After registration, the interactive deployment wizard will open to resolve variables and deploy commands to this device.'
                    : 'پس از زدن دکمه «ثبت تجهیز»، صفحه تایید تعاملی آدرس IP و متغیرهای کانفیگ با مشخصات همین تجهیز باز خواهد شد تا دستورات در مد مناسب به تجهیز ارسال گردند.'}
                </p>
              )}
            </div>

            {/* Discovery Protocols CDP & LLDP */}
            <div className="flex flex-wrap items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-600 font-medium text-[11px]">
                {isEn ? 'Discovery Protocols:' : 'پروتکل‌های اسکن همسایگی:'}
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={cdpEnabled}
                  onChange={(e) => setCdpEnabled(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 bg-white border-slate-300"
                />
                <span>CDP (Cisco Discovery Protocol)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="checkbox"
                  checked={lldpEnabled}
                  onChange={(e) => setLldpEnabled(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 bg-white border-slate-300"
                />
                <span>LLDP (IEEE 802.1AB)</span>
              </label>
            </div>
          </div>

          {/* Form Actions (Pinned Footer) */}
          <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-slate-200 bg-slate-50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-medium transition"
            >
              {t('action_cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
            >
              {isSubmitting ? t('add_device_btn_saving') : t('add_device_btn_submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

