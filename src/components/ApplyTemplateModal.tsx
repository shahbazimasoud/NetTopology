import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCode2,
  X,
  CheckCircle2,
  AlertTriangle,
  Play,
  Terminal,
  Copy,
  Check,
  Download,
  Server,
  Router as RouterIcon,
  ShieldAlert,
  ArrowRight,
  Info,
  RefreshCw,
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';
import { Device, ConfigTemplate, TemplateApplyResult, TemplateExecutionLog } from '../types';
import { fetchTemplates, applyTemplateToDevice } from '../services/api';

interface ApplyTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetDevice: Device | null;
  allDevices?: Device[];
  preselectedTemplateId?: string;
  onApplied?: (updatedDevice: Device) => void;
}

export const ApplyTemplateModal: React.FC<ApplyTemplateModalProps> = ({
  isOpen,
  onClose,
  targetDevice: initialTargetDevice,
  allDevices = [],
  preselectedTemplateId,
  onApplied,
}) => {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(initialTargetDevice);
  const [templates, setTemplates] = useState<ConfigTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [activeStep, setActiveStep] = useState<'variables' | 'preview' | 'executing' | 'done'>('variables');

  // Interactive Variables State
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [isIpConfirmed, setIsIpConfirmed] = useState<boolean>(true);
  const [copiedScript, setCopiedScript] = useState(false);

  // Execution state
  const [isApplying, setIsApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<TemplateApplyResult | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Update selected device if prop changes
  useEffect(() => {
    setSelectedDevice(initialTargetDevice);
  }, [initialTargetDevice]);

  // Load available templates
  useEffect(() => {
    if (!isOpen) return;
    setLoadingTemplates(true);
    fetchTemplates()
      .then((res) => {
        setTemplates(res.templates);
        if (preselectedTemplateId) {
          setSelectedTemplateId(preselectedTemplateId);
        } else if (res.templates.length > 0) {
          // Smart match based on selected device type and model
          const dev = selectedDevice || (allDevices.length > 0 ? allDevices[0] : null);
          if (dev) {
            const isMikroTik = dev.model?.toLowerCase().includes('mikrotik') || dev.model?.toLowerCase().includes('routerboard') || dev.model?.toLowerCase().includes('crs');
            const matched = res.templates.find((t) => {
              const vendorMatch = isMikroTik ? t.vendor === 'mikrotik' : t.vendor === 'cisco';
              const typeMatch = t.target_type === dev.type || t.target_type === 'all';
              return vendorMatch && typeMatch;
            });
            setSelectedTemplateId(matched ? matched.id : res.templates[0].id);
          } else {
            setSelectedTemplateId(res.templates[0].id);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load templates:', err);
      })
      .finally(() => {
        setLoadingTemplates(false);
      });
  }, [isOpen, preselectedTemplateId, selectedDevice, allDevices]);

  const currentTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

  // Pre-fill variable values based on current device and template
  useEffect(() => {
    if (!currentTemplate || !selectedDevice) return;

    const initialVars: Record<string, string> = {};
    currentTemplate.variables.forEach((v) => {
      let val = v.default_value || '';

      switch (v.name) {
        case 'DEVICE_NAME':
          val = selectedDevice.name || val;
          break;
        case 'IP_ADDRESS':
          val = selectedDevice.ip || val;
          break;
        case 'BUILDING':
          val = selectedDevice.building || val;
          break;
        case 'FLOOR':
          val = selectedDevice.floor || val;
          break;
        case 'UNIT':
          val = selectedDevice.unit || val;
          break;
        case 'RACK':
          val = selectedDevice.rack || val;
          break;
        case 'DEFAULT_GATEWAY':
          // Attempt to find gateway from IP or default
          if (selectedDevice.ip) {
            const parts = selectedDevice.ip.split('.');
            if (parts.length === 4) {
              val = `${parts[0]}.${parts[1]}.${parts[2]}.254`;
            }
          }
          break;
        case 'SUBNET_MASK':
          val = '255.255.255.0';
          break;
        case 'SUBNET_CIDR':
          val = '24';
          break;
        case 'MANAGEMENT_VLAN':
          val = '1';
          break;
        default:
          break;
      }

      initialVars[v.name] = val;
    });

    setVariableValues(initialVars);
    setIsIpConfirmed(true);
    setActiveStep('variables');
    setApplyResult(null);
    setApplyError(null);
  }, [currentTemplate, selectedDevice]);

  // Render script preview
  const renderedScript = useMemo(() => {
    if (!currentTemplate) return '';
    let script = currentTemplate.commands;
    Object.entries(variableValues).forEach(([k, v]) => {
      script = script.split(`{{${k}}}`).join(v || `[${k}]`);
    });
    return script;
  }, [currentTemplate, variableValues]);

  // Simple IPv4 format check
  const isIpValid = useMemo(() => {
    const ip = variableValues['IP_ADDRESS'];
    if (!ip) return false;
    const regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return regex.test(ip.trim());
  }, [variableValues]);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(renderedScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadScript = () => {
    const ext = currentTemplate?.vendor === 'mikrotik' ? 'rsc' : 'cfg';
    const blob = new Blob([renderedScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${variableValues['DEVICE_NAME'] || 'device-config'}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExecuteApply = async () => {
    if (!selectedDevice || !currentTemplate) return;

    if (!isIpConfirmed || !isIpValid) {
      alert('لطفاً صحت آدرس آی‌پی (IP Address) را بررسی و تایید نمایید.');
      return;
    }

    setIsApplying(true);
    setActiveStep('executing');
    setApplyError(null);

    try {
      const result = await applyTemplateToDevice({
        device_id: selectedDevice.id,
        template_id: currentTemplate.id,
        resolved_variables: variableValues,
      });

      setApplyResult(result);
      setActiveStep('done');
      if (onApplied) {
        onApplied(result.device);
      }
    } catch (err: any) {
      setApplyError(err.message || 'خطا در اعمال تمپلیت روی تجهیز');
      setActiveStep('preview');
    } finally {
      setIsApplying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 modal-backdrop-blur animate-fadeIn" data-modal-backdrop="true">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-slate-900/95 border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden text-slate-100 backdrop-blur-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white glow-text-cyan">
                  اعمال تعاملی تمپلیت کانفیگ (Apply Template)
                </h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold transition-all shadow-sm ${
                    currentTemplate?.vendor === 'mikrotik'
                      ? 'vendor-badge-mikrotik'
                      : currentTemplate?.vendor === 'cisco'
                      ? 'vendor-badge-cisco'
                      : 'vendor-badge-generic'
                  }`}
                >
                  {currentTemplate?.vendor === 'mikrotik'
                    ? 'MikroTik RouterOS'
                    : currentTemplate?.vendor === 'cisco'
                    ? 'Cisco IOS-XE'
                    : 'Generic CLI'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                بررسی پارامترها، تایید تعاملی آدرس‌های IP و تزریق هوشمند دستورات در مد مناسب تجهیز
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Workflow Steps Indicator */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-950/40 border-b border-white/5 text-xs">
          <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-1">
            <button
              onClick={() => setActiveStep('variables')}
              disabled={isApplying}
              className={`flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg transition ${
                activeStep === 'variables'
                  ? 'bg-indigo-600/30 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[10px] font-bold">
                ۱
              </span>
              <span>انتخاب تمپلیت و تایید آدرس IP</span>
            </button>

            <span className="text-slate-600">→</span>

            <button
              onClick={() => setActiveStep('preview')}
              disabled={isApplying}
              className={`flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg transition ${
                activeStep === 'preview'
                  ? 'bg-indigo-600/30 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[10px] font-bold">
                ۲
              </span>
              <span>پیش‌نمایش دستورات آماده اجرا</span>
            </button>

            <span className="text-slate-600">→</span>

            <div
              className={`flex items-center gap-1.5 font-medium px-2.5 py-1 rounded-lg ${
                activeStep === 'executing' || activeStep === 'done'
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-500'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold">
                ۳
              </span>
              <span>اجرای ترمینال و ذخیره دائم</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Target Device & Template Selector Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
            {/* Target Device Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                <span>تجهیز مقصد (Target Device):</span>
              </label>
              {allDevices.length > 0 ? (
                <select
                  value={selectedDevice?.id || ''}
                  onChange={(e) => {
                    const found = allDevices.find((d) => d.id === e.target.value);
                    if (found) setSelectedDevice(found);
                  }}
                  disabled={isApplying}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                >
                  {allDevices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.ip}) - {d.model} [{d.role}]
                    </option>
                  ))}
                </select>
              ) : selectedDevice ? (
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 font-mono text-xs text-cyan-300 flex items-center justify-between">
                  <span>{selectedDevice.name}</span>
                  <span className="text-slate-400">{selectedDevice.ip}</span>
                </div>
              ) : (
                <div className="text-xs text-rose-400">هیچ تجهیزی انتخاب نشده است.</div>
              )}
            </div>

            {/* Template Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileCode2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>تمپلیت مورد نظر (Config Template):</span>
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                disabled={isApplying || loadingTemplates}
                className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.vendor.toUpperCase()}] {t.name} ({t.target_type})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Error Banner if any */}
          {applyError && (
            <div className="p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{applyError}</span>
            </div>
          )}

          {/* STEP 1: Interactive Variables & IP Confirmation */}
          {activeStep === 'variables' && currentTemplate && (
            <div className="space-y-5 animate-fadeIn">
              {/* Interactive IP Confirmation Box (Crucial User Request) */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  isIpConfirmed && isIpValid
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-amber-500/15 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl mt-0.5 ${
                        isIpConfirmed && isIpValid
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300 animate-pulse'
                      }`}
                    >
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>بررسی و تایید تعاملی آدرس IP تجهیز</span>
                        {isIpValid ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            IPv4 معتبر
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            فرمت نامعتبر IP
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1">
                        آدرس آی‌پی استخراج شده برای این تجهیز{' '}
                        <strong className="text-cyan-300 font-mono font-bold">
                          {selectedDevice?.ip || variableValues['IP_ADDRESS']}
                        </strong>{' '}
                        است. آیا همین آدرس جهت اعمال دستورات تایید می‌شود، یا مایلید آدرس دیگری جایگزین شود؟
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsIpConfirmed(!isIpConfirmed)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition shadow-sm ${
                      isIpConfirmed
                        ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                        : 'bg-amber-600 text-white hover:bg-amber-500'
                    }`}
                  >
                    {isIpConfirmed ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>آدرس تایید شد</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>نیاز به بررسی و تایید</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Direct IP input override */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-3 border-t border-white/10">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      آدرس آی‌پی مدیریتی (IP Address):
                    </label>
                    <input
                      type="text"
                      value={variableValues['IP_ADDRESS'] || ''}
                      onChange={(e) => {
                        setVariableValues({ ...variableValues, IP_ADDRESS: e.target.value });
                        setIsIpConfirmed(false);
                      }}
                      placeholder="192.168.1.1"
                      className={`w-full bg-slate-950 border px-3 py-2 rounded-xl text-xs font-mono text-white focus:outline-none ${
                        isIpValid
                          ? 'border-white/15 focus:border-cyan-500'
                          : 'border-rose-500 focus:border-rose-400'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      ماسک شبکه یا پیشوند (Subnet):
                    </label>
                    <input
                      type="text"
                      value={
                        currentTemplate.vendor === 'mikrotik'
                          ? variableValues['SUBNET_CIDR'] || '24'
                          : variableValues['SUBNET_MASK'] || '255.255.255.0'
                      }
                      onChange={(e) => {
                        if (currentTemplate.vendor === 'mikrotik') {
                          setVariableValues({ ...variableValues, SUBNET_CIDR: e.target.value });
                        } else {
                          setVariableValues({ ...variableValues, SUBNET_MASK: e.target.value });
                        }
                      }}
                      className="w-full bg-slate-950 border border-white/15 px-3 py-2 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-1">
                      گیت‌وی خروجی (Default Gateway):
                    </label>
                    <input
                      type="text"
                      value={variableValues['DEFAULT_GATEWAY'] || ''}
                      onChange={(e) =>
                        setVariableValues({ ...variableValues, DEFAULT_GATEWAY: e.target.value })
                      }
                      placeholder="192.168.1.254"
                      className="w-full bg-slate-950 border border-white/15 px-3 py-2 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* Other Template Variables Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>سایر پارامترها و مشخصات فیزیکی استقرار:</span>
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    این متغیرها به صورت خودکار در متن دستورات تزریق می‌گردند
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {currentTemplate.variables
                    .filter((v) => !['IP_ADDRESS', 'SUBNET_MASK', 'SUBNET_CIDR', 'DEFAULT_GATEWAY'].includes(v.name))
                    .map((variable) => (
                      <div
                        key={variable.name}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 focus-within:border-cyan-500/50 transition"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] font-medium text-slate-200 truncate">
                            {variable.label}
                          </label>
                          <span className="text-[9px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20">
                            {`{{${variable.name}}}`}
                          </span>
                        </div>
                        <input
                          type={variable.type === 'password' ? 'password' : 'text'}
                          value={variableValues[variable.name] || ''}
                          onChange={(e) =>
                            setVariableValues({
                              ...variableValues,
                              [variable.name]: e.target.value,
                            })
                          }
                          placeholder={variable.default_value || ''}
                          className="w-full bg-slate-950 border border-white/10 px-2.5 py-1.5 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
                        />
                        {variable.description && (
                          <div className="text-[10px] text-slate-400 mt-1 truncate" title={variable.description}>
                            {variable.description}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>

              {/* Step 1 Footer Action */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="text-xs text-slate-400">
                  {isIpConfirmed && isIpValid ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      آماده پیش‌نمایش و اجرای دستورات
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      لطفاً پیش از ادامه، آدرس IP را بررسی و تایید فرمایید
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveStep('preview')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(99,102,241,0.3)] transition active:scale-95"
                >
                  <span>مشاهده پیش‌نمایش دستورات</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Live Command Preview (Dry Run) */}
          {activeStep === 'preview' && currentTemplate && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-200 font-medium">
                    دستورات پیکربندی آماده اجرا روی{' '}
                    <b className="text-white font-mono">{variableValues['DEVICE_NAME'] || selectedDevice?.name}</b>{' '}
                    (آدرس: <b className="text-cyan-300 font-mono">{variableValues['IP_ADDRESS']}</b>)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyScript}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-[11px] font-medium transition"
                  >
                    {copiedScript ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedScript ? 'کپی شد' : 'کپی دستورات'}</span>
                  </button>
                  <button
                    onClick={handleDownloadScript}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-slate-200 text-[11px] font-medium transition"
                  >
                    <Download className="w-3 h-3" />
                    <span>دانلود فایل کانفیگ</span>
                  </button>
                </div>
              </div>

              {/* Terminal Code View */}
              <div className="bg-slate-950 border border-white/15 rounded-xl p-4 font-mono text-xs text-slate-200 max-h-96 overflow-y-auto dir-ltr text-left selection:bg-cyan-500/30">
                <pre className="whitespace-pre font-mono leading-relaxed">{renderedScript}</pre>
              </div>

              {/* Step 2 Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setActiveStep('variables')}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-medium transition"
                >
                  ← بازگشت به ویرایش متغیرها
                </button>

                <button
                  type="button"
                  onClick={handleExecuteApply}
                  disabled={isApplying}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)] transition active:scale-95"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>تایید نهایی و اجرای دستورات روی تجهیز</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Live Terminal Execution Stream */}
          {(activeStep === 'executing' || activeStep === 'done') && (
            <div className="space-y-4 animate-fadeIn">
              {/* Execution Status Header */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  activeStep === 'done'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                    : 'bg-indigo-500/15 border-indigo-500/40 text-indigo-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  {activeStep === 'executing' ? (
                    <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                  <div>
                    <h4 className="font-bold text-sm text-white">
                      {activeStep === 'executing'
                        ? 'در حال اتصال و ارسال خط‌به‌خط دستورات به تجهیز...'
                        : 'دستورات تمپلیت با موفقیت کامل روی تجهیز اجرا و ذخیره شد'}
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      تجهیز: <span className="font-mono font-bold text-white">{selectedDevice?.name}</span> | آی‌پی جدید:{' '}
                      <span className="font-mono font-bold text-cyan-300">{selectedDevice?.ip}</span> | وضعیت: پایدار در دیتابیس
                    </p>
                  </div>
                </div>

                {activeStep === 'done' && (
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                    Running & Startup Synced
                  </span>
                )}
              </div>

              {/* Streaming Terminal Log Output */}
              <div className="bg-slate-950 border border-white/15 rounded-xl p-4 font-mono text-xs text-slate-300 max-h-96 overflow-y-auto dir-ltr text-left space-y-1.5 shadow-inner">
                {applyResult?.logs.map((log: TemplateExecutionLog, idx: number) => (
                  <div key={idx} className="leading-snug">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 select-none text-[10px] font-mono">[{log.timestamp}]</span>
                      <span className="text-cyan-400 font-bold select-none">{log.prompt}</span>
                      <span className="text-white font-medium">{log.command}</span>
                    </div>
                    {log.output && (
                      <div
                        className={`pl-4 select-text whitespace-pre-wrap ${
                          log.status === 'error'
                            ? 'text-rose-400'
                            : log.status === 'warn'
                            ? 'text-amber-400'
                            : 'text-emerald-400/90'
                        }`}
                      >
                        {log.output}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Done Modal Actions */}
              {activeStep === 'done' && (
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <button
                    onClick={handleDownloadScript}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>دانلود بک‌آپ اسکریپت اعمال شده</span>
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(99,102,241,0.4)] transition active:scale-95"
                  >
                    <span>تکمیل فرآیند و بستن پنجره</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
