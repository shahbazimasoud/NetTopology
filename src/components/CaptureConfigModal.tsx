import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  DownloadCloud,
  Save,
  Play,
  FileCode2,
  Terminal,
  Sliders,
  Check,
  Eye,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info,
  Shield,
  Server,
  RefreshCw,
  Copy,
  CheckCircle2,
  Key,
  Network,
  Trash2,
  Plus
} from 'lucide-react';
import {
  Device,
  ConfigTemplate,
  TemplateVariable,
  TemplateVendor,
  TemplateTargetType,
  DeviceConfigExtractRequest,
  DeviceConfigExtractResult
} from '../types';
import { extractConfigFromDevice, createTemplate } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

interface CaptureConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
  onTemplateSaved: (newTemplate: ConfigTemplate) => void;
  onSaveAndApply?: (newTemplate: ConfigTemplate) => void;
}

export const CaptureConfigModal: React.FC<CaptureConfigModalProps> = ({
  isOpen,
  onClose,
  devices,
  onTemplateSaved,
  onSaveAndApply,
}) => {
  const { t, isEn } = useLanguage();

  // Step: 1 = Connection & Extract, 2 = Review, Parameterize & Save
  const [step, setStep] = useState<1 | 2>(1);

  // Connection source mode
  const [sourceMode, setSourceMode] = useState<'registered' | 'custom'>('registered');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Credentials & Device connection parameters
  const [vendor, setVendor] = useState<TemplateVendor>('cisco');
  const [targetType, setTargetType] = useState<TemplateTargetType>('switch');
  const [ip, setIp] = useState('192.168.1.1');
  const [port, setPort] = useState(22);
  const [protocol, setProtocol] = useState<'ssh' | 'telnet'>('ssh');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [enablePassword, setEnablePassword] = useState('');

  // Smart options
  const [autoParameterize, setAutoParameterize] = useState(true);
  const [sanitizeSecrets, setSanitizeSecrets] = useState(true);
  const [stripEphemeral, setStripEphemeral] = useState(true);
  const [mikrotikCompact, setMikrotikCompact] = useState(true);

  // Extraction Execution State
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [extractResult, setExtractResult] = useState<DeviceConfigExtractResult | null>(null);

  // Step 2 Template Details State
  const [templateName, setTemplateName] = useState('');
  const [templateRole, setTemplateRole] = useState('Access Switch');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateCommands, setTemplateCommands] = useState('');
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([]);
  const [reviewTab, setReviewTab] = useState<'editor' | 'raw' | 'variables' | 'logs'>('editor');
  const [saving, setSaving] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-sync form when registered device is selected
  useEffect(() => {
    if (devices.length > 0 && !selectedDeviceId) {
      const defaultDev = devices[0];
      setSelectedDeviceId(defaultDev.id);
      setIp(defaultDev.ip);
      setTargetType((defaultDev.type as TemplateTargetType) || 'switch');
      const isMikrotik = defaultDev.model?.toLowerCase().includes('mikrotik') || defaultDev.model?.toLowerCase().includes('routeros');
      setVendor(isMikrotik ? 'mikrotik' : 'cisco');
      setTemplateRole(defaultDev.role || (defaultDev.type === 'router' ? 'Edge Router' : 'Access Switch'));
    }
  }, [devices, selectedDeviceId]);

  const handleDeviceSelect = (devId: string) => {
    setSelectedDeviceId(devId);
    const dev = devices.find((d) => d.id === devId);
    if (dev) {
      setIp(dev.ip);
      setTargetType((dev.type as TemplateTargetType) || 'switch');
      const isMikrotik = dev.model?.toLowerCase().includes('mikrotik') || dev.model?.toLowerCase().includes('routeros');
      setVendor(isMikrotik ? 'mikrotik' : 'cisco');
      setTemplateRole(dev.role || (dev.type === 'router' ? 'Edge Router' : 'Access Switch'));
    }
  };

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setExtractError(null);
      setExtracting(false);
      setExtractResult(null);
      setReviewTab('editor');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Run live extraction
  const handleExtractConfig = async () => {
    if (!ip.trim()) {
      setExtractError(isEn ? 'Please enter a valid IP address or hostname.' : 'لطفاً آدرس IP یا نام میزبان معتبر را وارد نمایید.');
      return;
    }

    setExtracting(true);
    setExtractError(null);

    const requestPayload: DeviceConfigExtractRequest = {
      device_id: sourceMode === 'registered' ? selectedDeviceId : undefined,
      ip: ip.trim(),
      port: Number(port) || 22,
      protocol,
      vendor,
      target_type: targetType,
      username: username.trim(),
      password,
      enable_password: enablePassword,
      options: {
        auto_parameterize: autoParameterize,
        sanitize_secrets: sanitizeSecrets,
        strip_ephemeral: stripEphemeral,
        mikrotik_compact: mikrotikCompact,
      },
    };

    try {
      const res = await extractConfigFromDevice(requestPayload);
      setExtractResult(res);

      // Pre-fill Step 2 template fields
      setTemplateName(res.suggested_template_name);
      setTemplateRole(res.role || (targetType === 'router' ? 'Edge Router' : 'Access Switch'));
      setTemplateDesc(res.description);
      setTemplateCommands(res.parameterized_commands || res.raw_config);
      setTemplateVariables(res.detected_variables || []);
      setVendor(res.vendor);
      setTargetType(res.target_type);

      // Transition to Step 2
      setStep(2);
    } catch (err: any) {
      console.error('Extract config error:', err);
      setExtractError(err.message || (isEn ? 'Failed to connect to device and extract configuration.' : 'خطا در برقراری ارتباط با تجهیز و دریافت کانفیگ.'));
    } finally {
      setExtracting(false);
    }
  };

  // Save template to server
  const handleSaveTemplate = async (andApply: boolean = false) => {
    if (!templateName.trim()) {
      setExtractError(isEn ? 'Please enter a valid template name.' : 'لطفاً یک نام معتبر برای ذخیره این تمپلیت وارد نمایید.');
      return;
    }
    if (!templateCommands.trim()) {
      setExtractError(isEn ? 'Template configuration commands cannot be empty.' : 'متن فرامین کانفیگ نمی‌تواند خالی باشد.');
      return;
    }

    setSaving(true);
    setExtractError(null);

    const newTemplateData: Partial<ConfigTemplate> = {
      name: templateName.trim(),
      vendor,
      target_type: targetType,
      role: templateRole.trim() || (isEn ? 'Custom Extracted Template' : 'Custom Extracted Template'),
      description: templateDesc.trim(),
      default_cli_mode: vendor === 'mikrotik' ? 'ROUTEROS' : (targetType === 'router' ? 'PRIVILEGED_EXEC' : 'GLOBAL_CONFIG'),
      commands: templateCommands,
      variables: templateVariables,
    };

    try {
      const res = await createTemplate(newTemplateData);
      onTemplateSaved(res.template);

      if (andApply && onSaveAndApply) {
        onSaveAndApply(res.template);
      }
      onClose();
    } catch (err: any) {
      console.error('Save template error:', err);
      setExtractError(err.message || (isEn ? 'Failed to save template on server.' : 'خطا در ذخیره تمپلیت در سرور.'));
    } finally {
      setSaving(false);
    }
  };

  // Insert variable tag into command textarea
  const insertVarTag = (varName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setTemplateCommands((prev) => `${prev} {{${varName}}}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const inserted = `{{${varName}}}`;
    const next = templateCommands.substring(0, start) + inserted + templateCommands.substring(end);
    setTemplateCommands(next);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + inserted.length, start + inserted.length);
    }, 50);
  };

  const handleCopyRaw = () => {
    if (!extractResult) return;
    navigator.clipboard.writeText(extractResult.raw_config);
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  return (
    <div
      data-modal-backdrop="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md modal-backdrop-blur overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        dir={isEn ? 'ltr' : 'rtl'}
        className={`relative w-full max-w-5xl my-auto max-h-[92vh] sm:max-h-[90vh] rounded-2xl bg-slate-900/95 border border-cyan-500/30 shadow-[0_0_60px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden ${isEn ? 'text-left' : 'text-right'} text-slate-100 backdrop-blur-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <DownloadCloud className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  {isEn ? 'Live Device Config Extractor' : 'استخراج و تبدیل کانفیگ تجهیز زنده به تمپلیت'}
                </h3>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Live Config Extractor & Parameterizer
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isEn 
                  ? 'SSH/Telnet to switch, router or MikroTik, capture active configuration and convert to parametric template'
                  : 'اتصال SSH/Telnet به سوئیچ، روتر یا میکروتیک، دریافت کانفیگ فعال و تبدیل هوشمند به الگوی پارامتریک'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Step Indicators */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
              <span className={`px-2.5 py-0.5 rounded-lg font-bold transition ${step === 1 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'}`}>
                {isEn ? '1. Connect & Extract' : '۱. اتصال و استخراج'}
              </span>
              <span className="text-slate-500">{isEn ? '→' : '←'}</span>
              <span className={`px-2.5 py-0.5 rounded-lg font-bold transition ${step === 2 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'}`}>
                {isEn ? '2. Review & Save Template' : '۲. بررسی و ذخیره الگو'}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
              title={isEn ? 'Close' : 'بستن'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {extractError && (
          <div className="mx-6 mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="flex-1 font-medium">{extractError}</span>
            <button onClick={() => setExtractError(null)} className="text-rose-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {step === 1 ? (
            /* STEP 1: Connection & Smart Options */
            <div className="space-y-6">
              {/* Source Mode Selector */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Server className="w-4 h-4 text-cyan-400" />
                  <span>{isEn ? 'Source Device Connection Method:' : 'انتخاب روش اتصال به تجهیز مبدأ:'}</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSourceMode('registered')}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-semibold transition ${
                      sourceMode === 'registered'
                        ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Network className="w-4 h-4 text-cyan-400" />
                      <div className={isEn ? 'text-left' : 'text-right'}>
                        <div>{isEn ? 'Registered Network Device' : 'انتخاب از تجهیزات ثبت‌شده شبکه'}</div>
                        <div className="text-[10px] font-normal text-slate-400">
                          {isEn ? 'Switches and routers in panel inventory' : 'سوئیچ‌ها و روترهای موجود در دیتابیس پنل'}
                        </div>
                      </div>
                    </div>
                    {sourceMode === 'registered' && <Check className="w-4 h-4 text-cyan-400" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSourceMode('custom')}
                    className={`flex items-center justify-between p-3.5 rounded-xl border text-xs font-semibold transition ${
                      sourceMode === 'custom'
                        ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Sliders className="w-4 h-4 text-indigo-400" />
                      <div className={isEn ? 'text-left' : 'text-right'}>
                        <div>{isEn ? 'Direct Hostname / IP' : 'اتصال مستقیم به IP / هاست جدید'}</div>
                        <div className="text-[10px] font-normal text-slate-400">
                          {isEn ? 'Custom device outside inventory list' : 'ورود آدرس IP سفارشی خارج از لیست ثبت‌شده'}
                        </div>
                      </div>
                    </div>
                    {sourceMode === 'custom' && <Check className="w-4 h-4 text-cyan-400" />}
                  </button>
                </div>

                {/* Dropdown if registered mode */}
                {sourceMode === 'registered' && (
                  <div className="pt-2">
                    <label className="block text-xs text-slate-300 mb-1.5 font-medium">
                      {isEn ? 'Target Network Device:' : 'تجهیز شبکه هدف:'}
                    </label>
                    <select
                      value={selectedDeviceId}
                      onChange={(e) => handleDeviceSelect(e.target.value)}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
                    >
                      {devices.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.ip}) — {d.role} [{d.model || d.type}]
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Connection Credentials Form */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
                <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <Key className="w-4 h-4 text-cyan-400" />
                  <span>{isEn ? 'Connection Credentials & Protocol (SSH / Telnet)' : 'مشخصات ارتباطی و احراز هویت (SSH / Telnet)'}</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {isEn ? 'Platform / Vendor:' : 'سازنده / پلتفرم:'}
                    </label>
                    <select
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value as TemplateVendor)}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 shadow-inner"
                    >
                      <option value="cisco">{isEn ? 'Cisco (IOS / IOS-XE)' : 'سیسکو (Cisco IOS / IOS-XE)'}</option>
                      <option value="mikrotik">{isEn ? 'MikroTik (RouterOS)' : 'میکروتیک (MikroTik RouterOS)'}</option>
                      <option value="generic">{isEn ? 'Generic CLI / Other' : 'جنریک / سایر تجهیزات (Generic CLI)'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {isEn ? 'Device Type:' : 'نوع تجهیز:'}
                    </label>
                    <select
                      value={targetType}
                      onChange={(e) => setTargetType(e.target.value as TemplateTargetType)}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 shadow-inner"
                    >
                      <option value="switch">{isEn ? 'Network Switch' : 'سوئیچ شبکه (Switch)'}</option>
                      <option value="router">{isEn ? 'Router / Gateway' : 'روتر / گیت‌وی (Router)'}</option>
                      <option value="all">{isEn ? 'Firewall / Generic' : 'فایروال / کلی (Generic/All)'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {isEn ? 'IP Address or Hostname:' : 'آدرس IP یا Hostname:'}
                    </label>
                    <input
                      type="text"
                      value={ip}
                      onChange={(e) => setIp(e.target.value)}
                      placeholder="192.168.1.1"
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 text-left ltr shadow-inner"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        {isEn ? 'Port:' : 'پورت:'}
                      </label>
                      <input
                        type="number"
                        value={port}
                        onChange={(e) => setPort(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 text-center shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        {isEn ? 'Protocol:' : 'پروتکل:'}
                      </label>
                      <select
                        value={protocol}
                        onChange={(e) => {
                          const proto = e.target.value as 'ssh' | 'telnet';
                          setProtocol(proto);
                          if (proto === 'telnet' && port === 22) setPort(23);
                          if (proto === 'ssh' && port === 23) setPort(22);
                        }}
                        className="w-full bg-slate-950 border border-white/15 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono shadow-inner"
                      >
                        <option value="ssh">SSH v2</option>
                        <option value="telnet">Telnet</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {isEn ? 'Username:' : 'نام کاربری (Username):'}
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="admin"
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 text-left ltr shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {isEn ? 'Password:' : 'رمز عبور (Password):'}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 text-left ltr shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      {isEn 
                        ? (vendor === 'cisco' ? 'Enable / Secret Password:' : 'Enable Password (Optional):') 
                        : `رمز Enable / Secret ${vendor === 'cisco' ? '(سیسکو)' : '(اختیاری)'}:`}
                    </label>
                    <input
                      type="password"
                      value={enablePassword}
                      onChange={(e) => setEnablePassword(e.target.value)}
                      placeholder={isEn ? 'Password for # privileged' : 'رمز ورود به # privileged'}
                      className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 text-left ltr shadow-inner"
                    />
                  </div>
                </div>
              </div>

              {/* Smart Extraction Options */}
              <div className="p-4 rounded-xl bg-white/5 border border-cyan-500/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-white">
                      {isEn ? 'Smart Extraction & Parameterization Options' : 'تنظیمات هوشمند استخراج و تمپلیت‌سازی (Smart Options)'}
                    </h4>
                  </div>
                  <span className="text-[10px] text-cyan-300 font-mono px-2.5 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/40">
                    AI & Regex Engine
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {/* Option 1: Auto-Parameterize */}
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-white/10 hover:border-cyan-500/40 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoParameterize}
                      onChange={(e) => setAutoParameterize(e.target.checked)}
                      className="mt-0.5 accent-cyan-500 w-4 h-4 rounded"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        {isEn ? 'Auto-Parameterize Values into Template Variables' : 'تبدیل خودکار مقادیر اختصاصی به متغیرهای تمپلیت (Auto-Parameterize)'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {isEn 
                          ? 'Automatically detect hostname, management IP, subnet mask, gateway, DNS/NTP servers, and replace with dynamic tags like {{HOSTNAME}}'
                          : 'تشخیص خودکار نام تجهیز، آی‌پی مدیریتی، ماسک، گیت‌وی، سرور DNS/NTP و مکان، و جایگزینی با متغیرهای پویا مانند {{HOSTNAME}}'}
                      </div>
                    </div>
                  </label>

                  {/* Option 2: Sensitive Data Sanitization */}
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-white/10 hover:border-cyan-500/40 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sanitizeSecrets}
                      onChange={(e) => setSanitizeSecrets(e.target.checked)}
                      className="mt-0.5 accent-cyan-500 w-4 h-4 rounded"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isEn ? 'Sanitize Sensitive Credentials & Passwords' : 'پاکسازی و امن‌سازی اطلاعات حساس (Sanitize Secrets)'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {isEn 
                          ? 'Mask password hashes, enable secrets, and SNMP communities into secure variables to prevent leaks'
                          : 'ماسک کردن هش‌های پسورد، رمزهای Enable Secret و SNMP Community و تبدیل آن‌ها به پارامتر امن جهت جلوگیری از نشت اطلاعات'}
                      </div>
                    </div>
                  </label>

                  {/* Option 3: Strip Ephemeral */}
                  <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-white/10 hover:border-cyan-500/40 transition cursor-pointer">
                    <input
                      type="checkbox"
                      checked={stripEphemeral}
                      onChange={(e) => setStripEphemeral(e.target.checked)}
                      className="mt-0.5 accent-cyan-500 w-4 h-4 rounded"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-200">
                        {isEn ? 'Strip Ephemeral Timestamps & Runtime States' : 'حذف وضعیت‌های ناپایدار و زمان‌بندی‌های موقت (Strip Ephemeral)'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {isEn 
                          ? 'Remove timestamp comments and transient runtime data to produce clean configuration templates'
                          : 'حذف خطوط کامنت زمان استخراج و اطلاعات متغیر زمان اجرا برای بهینه‌سازی تمپلیت'}
                      </div>
                    </div>
                  </label>

                  {/* Option 4: MikroTik Compact Export */}
                  {vendor === 'mikrotik' && (
                    <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-white/10 hover:border-cyan-500/40 transition cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mikrotikCompact}
                        onChange={(e) => setMikrotikCompact(e.target.checked)}
                        className="mt-0.5 accent-cyan-500 w-4 h-4 rounded"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-200">
                          {isEn ? 'MikroTik Compact Export (/export compact)' : 'اکسپورت خلاصه و بهینه میکروتیک (/export compact)'}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {isEn 
                            ? 'Export only configurations changed from factory defaults (much cleaner template)'
                            : 'تنها استخراج تنظیماتی که نسبت به پیش‌فرض کارخانه تغییر یافته‌اند (بسیار تمیزتر برای تمپلیت)'}
                        </div>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: Review, Parameter Customization & Template Save */
            <div className="space-y-4">
              {/* Extraction Stats Banner */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold">{isEn ? 'Device config extracted and analyzed successfully:' : 'کانفیگ تجهیز با موفقیت استخراج و تحلیل گردید:'}</span>
                  <span className="font-mono text-white bg-slate-950 px-2 py-0.5 rounded border border-white/15">
                    {extractResult?.detected_device_name} ({ip})
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span>{isEn ? 'Identified variables:' : 'تعداد متغیرهای شناسایی‌شده:'} <strong className="text-white font-mono">{templateVariables.length}</strong></span>
                  <span>•</span>
                  <span>{isEn ? 'Config size:' : 'حجم کانفیگ:'} <strong className="text-white font-mono">{templateCommands.split('\n').length} {isEn ? 'lines' : 'سطر'}</strong></span>
                </div>
              </div>

              {/* Template Metadata Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    {isEn ? 'Template Name:' : 'نام تمپلیت دلخواه (Template Name):'} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder={isEn ? 'e.g., Standard Access Switch Floor 2 HQ' : 'مثال: کانفیگ استاندارد سوئیچ طبقه ۲ ساختمان مرکزی'}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-medium shadow-inner"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    {isEn ? 'Role / Category:' : 'نقش / دسته‌بندی (Role):'}
                  </label>
                  <input
                    type="text"
                    value={templateRole}
                    onChange={(e) => setTemplateRole(e.target.value)}
                    placeholder="Access Switch / Distribution"
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner"
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    {isEn ? 'Template Description:' : 'توضیحات تمپلیت:'}
                  </label>
                  <input
                    type="text"
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    placeholder={isEn ? 'Additional notes on how to use this template in network...' : 'توضیحات تکمیلی در رابطه با این کانفیگ و نحوه استفاده در شبکه...'}
                    className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner"
                  />
                </div>
              </div>

              {/* Tab Selector for Review */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewTab('editor')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      reviewTab === 'editor'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <FileCode2 className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Parameterized Template' : 'الگوی پارامتریک نهایی (Mustache Template)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewTab('variables')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      reviewTab === 'variables'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{isEn ? `Dynamic Variables (${templateVariables.length})` : `متغیرهای پویا (${templateVariables.length})`}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewTab('raw')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      reviewTab === 'raw'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Raw Extracted Config' : 'کانفیگ خام استخراج‌شده (Raw)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewTab('logs')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                      reviewTab === 'logs'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>{isEn ? `SSH Session Logs (${extractResult?.logs.length || 0})` : `لاگ‌های نشست SSH (${extractResult?.logs.length || 0})`}</span>
                  </button>
                </div>

                {reviewTab === 'raw' && (
                  <button
                    type="button"
                    onClick={handleCopyRaw}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-xs transition border border-white/10"
                  >
                    {copiedRaw ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedRaw ? (isEn ? 'Copied' : 'کپی شد') : (isEn ? 'Copy Raw Config' : 'کپی کانفیگ خام')}</span>
                  </button>
                )}
              </div>

              {/* Tab 1: Parameterized Template Editor */}
              {reviewTab === 'editor' && (
                <div className="space-y-3">
                  {/* Available variables chips */}
                  {templateVariables.length > 0 && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="text-[11px] text-slate-400 mb-2 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{isEn ? 'Click any variable to quickly insert into config:' : 'کلیک روی هر متغیر برای درج سریع در متن کانفیگ:'}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {templateVariables.map((v) => (
                          <button
                            key={v.name}
                            type="button"
                            onClick={() => insertVarTag(v.name)}
                            className="px-2.5 py-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-mono transition flex items-center gap-1 active:scale-95"
                            title={isEn ? `Click to insert {{${v.name}}} (Default: ${v.default_value || '-'})` : `کلیک برای درج {{${v.name}}} (پیش‌فرض: ${v.default_value || '-'})`}
                          >
                            <span>{`{{${v.name}}}`}</span>
                            <span className="text-[10px] text-slate-400">({v.label})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="relative rounded-2xl bg-slate-950 border border-white/15 overflow-hidden focus-within:border-cyan-500/60 shadow-inner">
                    <div className="flex items-center justify-between px-3.5 py-2 bg-white/5 border-b border-white/10 text-[11px] text-slate-400 font-mono">
                      <span>Mustache Parameterized Config Template</span>
                      <span className="text-[10px] text-cyan-400 font-mono">{'{{VARIABLE_NAME}}'} supported</span>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={templateCommands}
                      onChange={(e) => setTemplateCommands(e.target.value)}
                      rows={14}
                      className="w-full bg-slate-950 p-4 font-mono text-xs text-slate-200 leading-relaxed focus:outline-none resize-y dir-ltr text-left selection:bg-cyan-500/30"
                      placeholder={isEn ? 'Template configuration commands...' : 'متن فرامین کانفیگ تمپلیت...'}
                      spellCheck={false}
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Variables List & Edit */}
              {reviewTab === 'variables' && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-200 font-semibold">
                      {isEn ? 'Dynamic variables extracted from device configuration:' : 'لیست متغیرهای پویای استخراج‌شده از کانفیگ تجهیز:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newName = `VAR_${templateVariables.length + 1}`;
                        setTemplateVariables([
                          ...templateVariables,
                          {
                            name: newName,
                            label: isEn ? `Variable ${newName}` : `متغیر ${newName}`,
                            description: '',
                            default_value: '',
                            required: false,
                            type: 'text',
                          },
                        ]);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium hover:bg-cyan-500/30 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Add New Variable' : 'افزودن متغیر جدید'}</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[350px] overflow-y-auto">
                    {templateVariables.map((v, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 items-center text-xs"
                      >
                        <div className="sm:col-span-3">
                          <label className="text-[10px] text-slate-400 block sm:hidden mb-0.5">
                            {isEn ? 'Variable Key:' : 'شناسه متغیر:'}
                          </label>
                          <input
                            type="text"
                            value={v.name}
                            onChange={(e) => {
                              const copy = [...templateVariables];
                              copy[idx].name = e.target.value;
                              setTemplateVariables(copy);
                            }}
                            className="w-full bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 text-left ltr shadow-inner"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[10px] text-slate-400 block sm:hidden mb-0.5">
                            {isEn ? 'Display Label:' : 'عنوان:'}
                          </label>
                          <input
                            type="text"
                            value={v.label}
                            onChange={(e) => {
                              const copy = [...templateVariables];
                              copy[idx].label = e.target.value;
                              setTemplateVariables(copy);
                            }}
                            className="w-full bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 shadow-inner"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="text-[10px] text-slate-400 block sm:hidden mb-0.5">
                            {isEn ? 'Default Value:' : 'مقدار پیش‌فرض:'}
                          </label>
                          <input
                            type="text"
                            value={v.default_value || ''}
                            onChange={(e) => {
                              const copy = [...templateVariables];
                              copy[idx].default_value = e.target.value;
                              setTemplateVariables(copy);
                            }}
                            className="w-full bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500 text-left ltr shadow-inner"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <select
                            value={v.type}
                            onChange={(e) => {
                              const copy = [...templateVariables];
                              copy[idx].type = e.target.value as any;
                              setTemplateVariables(copy);
                            }}
                            className="w-full bg-slate-950 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 shadow-inner"
                          >
                            <option value="text">{isEn ? 'Text' : 'متن (Text)'}</option>
                            <option value="ip">{isEn ? 'IP Address' : 'آدرس IP'}</option>
                            <option value="subnet">{isEn ? 'Subnet Mask' : 'ماسک زیرشبکه'}</option>
                            <option value="gateway">{isEn ? 'Gateway' : 'گیت‌وی'}</option>
                            <option value="vlan">{isEn ? 'VLAN ID' : 'شماره VLAN'}</option>
                            <option value="password">{isEn ? 'Password' : 'رمز عبور'}</option>
                            <option value="number">{isEn ? 'Number' : 'عدد'}</option>
                          </select>
                        </div>

                        <div className="sm:col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              setTemplateVariables(templateVariables.filter((_, i) => i !== idx));
                            }}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
                            title={isEn ? 'Delete Variable' : 'حذف متغیر'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Raw Configuration View */}
              {reviewTab === 'raw' && (
                <div className="rounded-2xl overflow-hidden border border-white/15 bg-slate-950 p-4 font-mono text-xs text-slate-200 max-h-[350px] overflow-y-auto leading-relaxed select-text text-left ltr whitespace-pre shadow-inner">
                  {extractResult?.raw_config}
                </div>
              )}

              {/* Tab 4: Execution Logs */}
              {reviewTab === 'logs' && (
                <div className="rounded-2xl overflow-hidden border border-white/15 bg-slate-950 p-4 font-mono text-xs text-emerald-400 max-h-[350px] overflow-y-auto leading-relaxed select-text text-left ltr space-y-1 shadow-inner">
                  {extractResult?.logs.map((logLine, idx) => (
                    <div key={idx}>{logLine}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-white/10 bg-slate-950/70 shrink-0">
          <div>
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition border border-white/10"
              >
                {isEn ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                <span>{isEn ? 'Back to Connection Setup' : 'بازگشت به مشخصات اتصال'}</span>
              </button>
            ) : (
              <div className="text-[11px] text-slate-400">
                {isEn 
                  ? 'Full support for Cisco IOS/IOS-XE switches & routers and MikroTik RouterOS'
                  : 'پشتیبانی کامل از سوئیچ‌ها و روترهای سیسکو و سیستم‌عامل RouterOS میکروتیک'}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 text-xs font-medium transition"
            >
              {isEn ? 'Cancel' : 'انصراف'}
            </button>

            {step === 1 ? (
              <button
                type="button"
                onClick={handleExtractConfig}
                disabled={extracting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_0_25px_rgba(6,182,212,0.4)] transition disabled:opacity-50 active:scale-95"
              >
                {extracting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{isEn ? 'Connecting & extracting config...' : 'در حال اتصال و استخراج کانفیگ...'}</span>
                  </>
                ) : (
                  <>
                    <DownloadCloud className="w-4 h-4" />
                    <span>{isEn ? 'Connect & Extract Config' : 'اتصال و استخراج کانفیگ'}</span>
                  </>
                )}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleSaveTemplate(false)}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition disabled:opacity-50 active:scale-95"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{isEn ? 'Save to Templates' : 'ذخیره در لیست الگوها'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveTemplate(true)}
                  disabled={saving}
                  className="btn-apply-template flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] transition disabled:opacity-50 active:scale-95"
                >
                  <Play className="w-3.5 h-3.5 fill-white text-white" />
                  <span className="text-white">{isEn ? 'Save & Apply to Device' : 'ذخیره و اعمال روی تجهیز دیگر'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
