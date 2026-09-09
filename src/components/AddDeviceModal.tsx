import React, { useState, useEffect } from 'react';
import { X, Network, Server, Wifi, Router as RouterIcon, ShieldCheck, MapPin, FileCode2, Activity, CheckCircle2, XCircle, RefreshCw, Terminal, Eye, EyeOff, Key } from 'lucide-react';
import { Device, DeviceType, ConfigTemplate, DeviceConnectionTestResult } from '../types';
import { fetchTemplates, testRawIpConnection } from '../services/api';
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
  const [sshPort, setSshPort] = useState(22);
  const [sshUsername, setSshUsername] = useState('admin');
  const [sshPassword, setSshPassword] = useState('cisco123');
  const [enablePassword, setEnablePassword] = useState('cisco');
  const [showPassword, setShowPassword] = useState(false);
  const [templates, setTemplates] = useState<ConfigTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTestingIp, setIsTestingIp] = useState(false);
  const [ipTestResult, setIpTestResult] = useState<DeviceConnectionTestResult | null>(null);

  const handleTestIp = async () => {
    if (!ip.trim()) {
      setError(isEn ? 'Please enter an IP address first' : 'لطفاً ابتدا یک آدرس IP وارد کنید');
      return;
    }
    setError(null);
    setIsTestingIp(true);
    try {
      const res = await testRawIpConnection(ip.trim());
      setIpTestResult(res);
    } catch {
      setIpTestResult({
        ip: ip.trim(),
        is_online: false,
        icmp_ping: false,
        latency_ms: null,
        ports: { ssh_22: false, telnet_23: false, http_80: false, https_443: false },
        diagnostics: ['Timeout or host unreachable'],
      });
    } finally {
      setIsTestingIp(false);
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
        type,
        role,
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-slate-700">
                    {isEn ? 'Management IP Address:' : 'آدرس آی‌پی مدیریتی (IP Address):'}
                  </label>
                  <button
                    type="button"
                    onClick={handleTestIp}
                    disabled={isTestingIp || !ip}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-40 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTestingIp ? 'animate-spin' : ''}`} />
                    <span>{isTestingIp ? (isEn ? 'Testing...' : 'در حال تست...') : (isEn ? 'Test Connection' : 'تست اتصال آی‌پی')}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={ip}
                  onChange={(e) => {
                    setIp(e.target.value);
                    setIpTestResult(null);
                  }}
                  placeholder={isEn ? 'e.g. 192.168.1.25' : 'مثلاً: 192.168.1.25'}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                  dir="ltr"
                />
                {ipTestResult && (
                  <div
                    className={`mt-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 ${
                      ipTestResult.is_online
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {ipTestResult.is_online ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>
                          {isEn
                            ? `Online • ${ipTestResult.latency_ms}ms • SSH: ${ipTestResult.ports.ssh_22 ? 'Open' : 'Closed'}`
                            : `آنلاین • تاخیر: ${ipTestResult.latency_ms}ms • پورت ۲۲ (SSH): ${ipTestResult.ports.ssh_22 ? 'باز' : 'بسته'}`}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>
                          {isEn ? 'Unreachable • Check IP or physical connection' : 'غیرقابل دسترس • اتصال یا IP را بررسی نمایید'}
                        </span>
                      </>
                    )}
                  </div>
                )}
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

            {/* SSH Credentials & Terminal Access */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2 text-indigo-700 text-xs font-bold">
                <Terminal className="w-4 h-4 text-indigo-600" />
                <span>{isEn ? 'SSH Credentials & Terminal Access:' : 'مشخصات دسترسی SSH و خط فرمان (CLI):'}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                <div>
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

                <div>
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

                <div>
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

                <div>
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

