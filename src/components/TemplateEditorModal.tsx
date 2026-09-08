import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Plus,
  Trash2,
  FileCode2,
  Terminal,
  Layers,
  Sparkles,
  HelpCircle,
  Save,
  Check,
  Eye,
  Sliders,
  Cpu,
  ShieldCheck,
  CopyPlus
} from 'lucide-react';
import { ConfigTemplate, TemplateVariable } from '../types';

interface TemplateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateToEdit?: ConfigTemplate | null;
  onSave: (template: Partial<ConfigTemplate>) => Promise<void>;
  onSaveAsClone?: (template: Partial<ConfigTemplate>) => Promise<void>;
}

const COMMON_VARS: { name: string; label: string; default_value: string; type: TemplateVariable['type'] }[] = [
  { name: 'DEVICE_NAME', label: 'نام تجهیز (Hostname)', default_value: 'SW-ACCESS-01', type: 'text' },
  { name: 'IP_ADDRESS', label: 'آدرس آی‌پی (Management IP)', default_value: '192.168.1.50', type: 'ip' },
  { name: 'SUBNET_MASK', label: 'ماسک شبکه (Subnet Mask)', default_value: '255.255.255.0', type: 'subnet' },
  { name: 'SUBNET_CIDR', label: 'پیشوند شبکه (CIDR Prefix)', default_value: '24', type: 'number' },
  { name: 'DEFAULT_GATEWAY', label: 'گیت‌وی پیش‌فرض (Gateway)', default_value: '192.168.1.254', type: 'gateway' },
  { name: 'MANAGEMENT_VLAN', label: 'ویلن مدیریت (VLAN ID)', default_value: '1', type: 'vlan' },
  { name: 'BUILDING', label: 'ساختمان استقرار', default_value: 'ساختمان مرکزی', type: 'text' },
  { name: 'FLOOR', label: 'طبقه استقرار', default_value: 'طبقه ۱', type: 'text' },
  { name: 'UNIT', label: 'واحد / اتاق', default_value: 'واحد شبکه', type: 'text' },
  { name: 'RACK', label: 'شماره رک', default_value: 'Rack-01', type: 'text' },
  { name: 'DOMAIN_NAME', label: 'دامنه شبکه (Domain)', default_value: 'corp.local', type: 'text' },
  { name: 'ADMIN_PASSWORD', label: 'رمز عبور ادمین', default_value: 'Admin@2026!', type: 'password' },
  { name: 'NTP_SERVER', label: 'سرور زمان NTP', default_value: '192.168.1.254', type: 'ip' },
  { name: 'DNS_SERVER', label: 'سرور DNS', default_value: '8.8.8.8', type: 'ip' }
];

export const TemplateEditorModal: React.FC<TemplateEditorModalProps> = ({
  isOpen,
  onClose,
  templateToEdit,
  onSave,
  onSaveAsClone,
}) => {
  const [name, setName] = useState('');
  const [vendor, setVendor] = useState<'cisco' | 'mikrotik' | 'generic'>('cisco');
  const [targetType, setTargetType] = useState<'switch' | 'router' | 'all'>('switch');
  const [role, setRole] = useState('Access Switch');
  const [description, setDescription] = useState('');
  const [defaultCliMode, setDefaultCliMode] = useState<'GLOBAL_CONFIG' | 'PRIVILEGED_EXEC' | 'ROUTEROS'>('GLOBAL_CONFIG');
  const [commands, setCommands] = useState('');
  const [variables, setVariables] = useState<TemplateVariable[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (templateToEdit) {
      setName(templateToEdit.name);
      setVendor(templateToEdit.vendor);
      setTargetType(templateToEdit.target_type);
      setRole(templateToEdit.role);
      setDescription(templateToEdit.description);
      setDefaultCliMode(templateToEdit.default_cli_mode);
      setCommands(templateToEdit.commands);
      setVariables(templateToEdit.variables || []);
    } else {
      setName('');
      setVendor('cisco');
      setTargetType('switch');
      setRole('Access Switch');
      setDescription('');
      setDefaultCliMode('GLOBAL_CONFIG');
      setCommands(`enable
configure terminal
hostname {{DEVICE_NAME}}
ip domain-name {{DOMAIN_NAME}}
crypto key generate rsa modulus 2048
username admin privilege 15 secret {{ADMIN_PASSWORD}}
line vty 0 4
 transport input ssh
 login local
exit
interface vlan {{MANAGEMENT_VLAN}}
 description SVI - {{BUILDING}} {{FLOOR}}
 ip address {{IP_ADDRESS}} {{SUBNET_MASK}}
 no shutdown
exit
ip default-gateway {{DEFAULT_GATEWAY}}
cdp run
lldp run
end
write memory`);
      setVariables([
        { name: 'DEVICE_NAME', label: 'نام تجهیز (Hostname)', description: 'نام سوئیچ در شبکه', default_value: 'SW-NEW-01', required: true, type: 'text' },
        { name: 'IP_ADDRESS', label: 'آدرس آی‌پی مدیریتی', description: 'آدرس IP سوئیچ', default_value: '192.168.1.100', required: true, type: 'ip' },
        { name: 'SUBNET_MASK', label: 'ماسک زیرشبکه', description: 'ماسک شبکه', default_value: '255.255.255.0', required: true, type: 'subnet' },
        { name: 'DEFAULT_GATEWAY', label: 'گیت‌وی پیش‌فرض', description: 'گیت‌وی خروجی', default_value: '192.168.1.254', required: true, type: 'gateway' },
        { name: 'MANAGEMENT_VLAN', label: 'ویلن مدیریت', description: 'شماره VLAN', default_value: '1', required: true, type: 'vlan' },
        { name: 'BUILDING', label: 'ساختمان', description: 'ساختمان محل نصب', default_value: 'ساختمان مرکزی', required: false, type: 'text' },
        { name: 'FLOOR', label: 'طبقه', description: 'طبقه محل نصب', default_value: 'طبقه ۱', required: false, type: 'text' },
        { name: 'DOMAIN_NAME', label: 'دامنه شبکه', description: 'دامنه', default_value: 'corp.local', required: true, type: 'text' },
        { name: 'ADMIN_PASSWORD', label: 'رمز عبور SSH', description: 'رمز عبور کاربر ادمین', default_value: 'Admin@2026!', required: true, type: 'password' },
      ]);
    }
    setErrorMsg(null);
  }, [templateToEdit, isOpen]);

  // Insert variable into textarea cursor position
  const insertVariableAtCursor = (varName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setCommands((prev) => `${prev} {{${varName}}}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textToInsert = `{{${varName}}}`;
    const newText = commands.substring(0, start) + textToInsert + commands.substring(end);
    setCommands(newText);

    // Auto add to variables list if not already present
    if (!variables.some((v) => v.name === varName)) {
      const foundCommon = COMMON_VARS.find((c) => c.name === varName);
      setVariables((prev) => [
        ...prev,
        {
          name: varName,
          label: foundCommon?.label || varName,
          description: '',
          default_value: foundCommon?.default_value || '',
          required: true,
          type: foundCommon?.type || 'text',
        },
      ]);
    }

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 50);
  };

  // Detect any variables in command text that aren't defined
  const detectedVarNames = Array.from(new Set(Array.from(commands.matchAll(/\{\{([A-Za-z0-9_]+)\}\}/g)).map((m) => m[1])));

  const handleAddMissingDetectedVars = () => {
    const newVars = [...variables];
    detectedVarNames.forEach((varName) => {
      if (!newVars.some((v) => v.name === varName)) {
        const foundCommon = COMMON_VARS.find((c) => c.name === varName);
        newVars.push({
          name: varName,
          label: foundCommon?.label || varName,
          description: '',
          default_value: foundCommon?.default_value || '',
          required: true,
          type: foundCommon?.type || 'text',
        });
      }
    });
    setVariables(newVars);
  };

  const handleRemoveVariable = (varName: string) => {
    setVariables(variables.filter((v) => v.name !== varName));
  };

  const handleUpdateVariable = (idx: number, updates: Partial<TemplateVariable>) => {
    const copy = [...variables];
    copy[idx] = { ...copy[idx], ...updates };
    setVariables(copy);
  };

  const handleAddNewCustomVar = () => {
    const uniqueNum = variables.length + 1;
    setVariables([
      ...variables,
      {
        name: `CUSTOM_VAR_${uniqueNum}`,
        label: `متغیر جدید ${uniqueNum}`,
        description: '',
        default_value: '',
        required: false,
        type: 'text',
      },
    ]);
  };

  // Preview rendered code with current default values
  const previewScript = () => {
    let script = commands;
    variables.forEach((v) => {
      script = script.split(`{{${v.name}}}`).join(v.default_value || `[${v.name}]`);
    });
    return script;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('لطفاً عنوان تمپلیت را وارد فرمایید.');
      return;
    }
    if (!commands.trim()) {
      setErrorMsg('متن دستورات تمپلیت نمی‌تواند خالی باشد.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await onSave({
        name: name.trim(),
        vendor,
        target_type: targetType,
        role,
        description: description.trim(),
        default_cli_mode: defaultCliMode,
        commands,
        variables,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ذخیره تمپلیت');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsClone = async () => {
    if (!commands.trim()) {
      setErrorMsg('متن دستورات نمی‌تواند خالی باشد.');
      return;
    }
    const defaultCloneName = name ? `${name} (نسخه جدید)` : 'تمپلیت کلون شده جدید';
    const newName = window.prompt('لطفاً عنوان و نام تمپلیت کلون شده را وارد فرمایید:', defaultCloneName);
    if (!newName || !newName.trim()) return;

    setSaving(true);
    setErrorMsg(null);
    try {
      if (onSaveAsClone) {
        await onSaveAsClone({
          name: newName.trim(),
          vendor,
          target_type: targetType,
          role: role.trim() || 'Custom Clone',
          description: description.trim(),
          default_cli_mode: defaultCliMode,
          commands,
          variables,
        });
      } else {
        await onSave({
          name: newName.trim(),
          vendor,
          target_type: targetType,
          role: role.trim() || 'Custom Clone',
          description: description.trim(),
          default_cli_mode: defaultCliMode,
          commands,
          variables,
        });
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'خطا در ثبت کلون تمپلیت');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 modal-backdrop-blur animate-fadeIn" data-modal-backdrop="true">
      <div className="w-full max-w-5xl max-h-[94vh] flex flex-col bg-slate-900/95 border border-white/10 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden text-slate-100 backdrop-blur-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-cyan-400 border border-cyan-500/30">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                {templateToEdit ? 'ویرایش تمپلیت کانفیگ' : 'تعریف تمپلیت جدید کانفیگ تجهیز'}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                تنظیم دستورات استاندارد سیسکو و میکروتیک به همراه متغیرهای پویا و تعاملی
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

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs">
              {errorMsg}
            </div>
          )}

          {/* Basic Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                عنوان و نام تمپلیت: <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً: کانفیگ سوئیچ طبقات سیسکو (Cisco Floor Switch)"
                className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                سازنده و سیستم‌عامل (Vendor):
              </label>
              <select
                value={vendor}
                onChange={(e) => {
                  const v = e.target.value as any;
                  setVendor(v);
                  if (v === 'mikrotik') setDefaultCliMode('ROUTEROS');
                  else setDefaultCliMode('GLOBAL_CONFIG');
                }}
                className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="cisco">Cisco (IOS / IOS-XE)</option>
                <option value="mikrotik">MikroTik (RouterOS / SwitchOS)</option>
                <option value="generic">Generic / Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                نوع دیوایس هدف (Device Type):
              </label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as any)}
                className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="switch">سوئیچ (Switch)</option>
                <option value="router">روتر (Router)</option>
                <option value="all">همگانی (All Devices)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                نقش عملیاتی در شبکه (Role):
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="مثلاً: Access Switch, Core Switch"
                className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                مد خط فرمان پیش‌فرض:
              </label>
              <select
                value={defaultCliMode}
                onChange={(e) => setDefaultCliMode(e.target.value as any)}
                className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="GLOBAL_CONFIG">Cisco Global Config (conf t)</option>
                <option value="PRIVILEGED_EXEC">Cisco Privileged Exec (#)</option>
                <option value="ROUTEROS">MikroTik RouterOS Shell (/)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                توضیحات و کاربرد:
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="توضیح کوتاه در رابطه با نوع سناریو یا محل استفاده این تمپلیت..."
                className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Command Script Editor */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <span>مجموعه کامندها و دستورات پیکربندی (CLI Command Set):</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition ${
                    showPreview
                      ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/40'
                      : 'bg-white/10 hover:bg-white/15 text-slate-300'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showPreview ? 'مخفی‌سازی پیش‌نمایش' : 'پیش‌نمایش زنده'}</span>
                </button>
              </div>
            </div>

            {/* Quick Variable Insert Bar */}
            <div className="p-2.5 rounded-xl bg-slate-950/70 border border-white/10 space-y-1.5">
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>کلیک برای درج خودکار متغیر پویا در مکان نشانگر موس:</span>
                {detectedVarNames.length > variables.length && (
                  <button
                    type="button"
                    onClick={handleAddMissingDetectedVars}
                    className="text-cyan-400 hover:text-cyan-300 text-[10px] font-bold underline"
                  >
                    + همگام‌سازی متغیرهای شناسایی شده در متن
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {COMMON_VARS.map((cv) => (
                  <button
                    key={cv.name}
                    type="button"
                    onClick={() => insertVariableAtCursor(cv.name)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-200 border border-white/10 hover:border-cyan-500/40 text-[10px] font-mono transition"
                    title={cv.label}
                  >
                    <span>+</span>
                    <span>{`{{${cv.name}}}`}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Editor Textarea */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className={showPreview ? 'block' : 'col-span-2'}>
                <textarea
                  ref={textareaRef}
                  value={commands}
                  onChange={(e) => setCommands(e.target.value)}
                  rows={14}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl p-3.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500 dir-ltr text-left leading-relaxed selection:bg-cyan-500/30"
                  placeholder="دستورات خط فرمان را خط به خط اینجا بنویسید..."
                  required
                />
              </div>

              {showPreview && (
                <div className="bg-slate-950 border border-cyan-500/30 rounded-xl p-3.5 max-h-[360px] overflow-y-auto dir-ltr text-left">
                  <div className="text-[10px] font-mono text-cyan-400 mb-2 border-b border-white/10 pb-1 flex items-center justify-between">
                    <span># LIVE DRY-RUN PREVIEW</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${vendor === 'mikrotik' ? 'vendor-badge-mikrotik' : vendor === 'cisco' ? 'vendor-badge-cisco' : 'vendor-badge-generic'}`}>
                      {vendor === 'mikrotik' ? 'MikroTik RouterOS' : vendor === 'cisco' ? 'Cisco IOS-XE' : vendor.toUpperCase()}
                    </span>
                  </div>
                  <pre className="text-xs font-mono text-emerald-400/90 whitespace-pre leading-relaxed">
                    {previewScript()}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Variables Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400" />
                  <span>تعریف و تنظیمات متغیرهای تعاملی (Interactive Variables):</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  هنگام اعمال تمپلیت، سیستم این فیلدها را به صورت تعاملی و هوشمند از کاربر سوال خواهد کرد.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddNewCustomVar}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن متغیر سفارشی</span>
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-white/10 text-slate-400 font-medium">
                    <th className="p-2.5">نام فنی متغیر</th>
                    <th className="p-2.5">عنوان نمایشی در فرم</th>
                    <th className="p-2.5">نوع داده</th>
                    <th className="p-2.5">مقدار پیش‌فرض</th>
                    <th className="p-2.5">اجباری؟</th>
                    <th className="p-2.5 text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {variables.map((v, idx) => (
                    <tr key={idx} className="hover:bg-white/5">
                      <td className="p-2.5 font-mono text-cyan-300">
                        {`{{${v.name}}}`}
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={v.label}
                          onChange={(e) => handleUpdateVariable(idx, { label: e.target.value })}
                          className="w-full bg-slate-950 border border-white/10 px-2 py-1 rounded text-xs text-white"
                        />
                      </td>
                      <td className="p-2.5">
                        <select
                          value={v.type}
                          onChange={(e) => handleUpdateVariable(idx, { type: e.target.value as any })}
                          className="bg-slate-950 border border-white/10 px-2 py-1 rounded text-xs text-white"
                        >
                          <option value="text">متن (Text)</option>
                          <option value="ip">آدرس آی‌پی (IPv4)</option>
                          <option value="subnet">سابنت ماسک (Mask)</option>
                          <option value="gateway">گیت‌وی (Gateway)</option>
                          <option value="vlan">شناسه ویلن (VLAN)</option>
                          <option value="password">رمز عبور (Password)</option>
                          <option value="number">عدد (Number)</option>
                        </select>
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={v.default_value}
                          onChange={(e) => handleUpdateVariable(idx, { default_value: e.target.value })}
                          className="w-full bg-slate-950 border border-white/10 px-2 py-1 rounded text-xs font-mono text-white"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={v.required}
                          onChange={(e) => handleUpdateVariable(idx, { required: e.target.checked })}
                          className="rounded text-cyan-500 focus:ring-0"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveVariable(v.name)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer Save / Cancel */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-medium transition"
            >
              انصراف
            </button>

            <div className="flex items-center gap-2">
              {templateToEdit && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSaveAsClone}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.15)] transition active:scale-95"
                  title="ذخیره این تغییرات به عنوان یک تمپلیت کلون شده جدید با نام دلخواه بدون تغییر تمپلیت اصلی"
                >
                  <CopyPlus className="w-3.5 h-3.5" />
                  <span>ذخیره به عنوان کلون با نام جدید...</span>
                </button>
              )}

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] transition active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'در حال ذخیره‌سازی...' : templateToEdit ? 'ذخیره تغییرات تمپلیت' : 'ذخیره تمپلیت در پایگاه الگوها'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
