import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CopyPlus,
  Save,
  Play,
  FileCode2,
  Terminal,
  Sliders,
  Check,
  Eye,
  AlertCircle,
  ArrowRight,
  Sparkles,
  Info,
  Trash2,
  Plus
} from 'lucide-react';
import { ConfigTemplate, TemplateVariable, Device } from '../types';

interface CloneTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceTemplate: ConfigTemplate | null;
  onSaveClone: (clonedData: Partial<ConfigTemplate>) => Promise<ConfigTemplate>;
  onCloneAndApply?: (clonedTemplate: ConfigTemplate) => void;
}

export const CloneTemplateModal: React.FC<CloneTemplateModalProps> = ({
  isOpen,
  onClose,
  sourceTemplate,
  onSaveClone,
  onCloneAndApply,
}) => {
  const [name, setName] = useState('');
  const [vendor, setVendor] = useState<'cisco' | 'mikrotik' | 'generic'>('cisco');
  const [targetType, setTargetType] = useState<'switch' | 'router' | 'all'>('switch');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [defaultCliMode, setDefaultCliMode] = useState<'GLOBAL_CONFIG' | 'PRIVILEGED_EXEC' | 'ROUTEROS'>('GLOBAL_CONFIG');
  const [commands, setCommands] = useState('');
  const [variables, setVariables] = useState<TemplateVariable[]>([]);

  const [activeTab, setActiveTab] = useState<'editor' | 'variables' | 'preview'>('editor');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (sourceTemplate && isOpen) {
      setName(`${sourceTemplate.name} (کلون تجهیز جدید)`);
      setVendor(sourceTemplate.vendor);
      setTargetType(sourceTemplate.target_type);
      setRole(sourceTemplate.role);
      setDescription(sourceTemplate.description ? `${sourceTemplate.description} (نسخه سفارشی‌شده)` : '');
      setDefaultCliMode(sourceTemplate.default_cli_mode);
      setCommands(sourceTemplate.commands);
      // Deep clone variables
      setVariables(
        sourceTemplate.variables
          ? sourceTemplate.variables.map((v) => ({ ...v }))
          : []
      );
      setActiveTab('editor');
      setErrorMsg(null);
    }
  }, [sourceTemplate, isOpen]);

  if (!isOpen || !sourceTemplate) return null;

  // Insert variable tag into command textarea
  const insertVarTag = (varName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setCommands((prev) => `${prev} {{${varName}}}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const inserted = `{{${varName}}}`;
    const next = commands.substring(0, start) + inserted + commands.substring(end);
    setCommands(next);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + inserted.length, start + inserted.length);
    }, 50);
  };

  // Update a single variable default value or label
  const handleUpdateVar = (index: number, updates: Partial<TemplateVariable>) => {
    const copy = [...variables];
    copy[index] = { ...copy[index], ...updates };
    setVariables(copy);
  };

  // Add new variable
  const handleAddVar = () => {
    const num = variables.length + 1;
    setVariables([
      ...variables,
      {
        name: `VAR_${num}`,
        label: `متغیر جدید ${num}`,
        description: '',
        default_value: '',
        required: true,
        type: 'text',
      },
    ]);
  };

  // Remove variable
  const handleRemoveVar = (index: number) => {
    const copy = variables.filter((_, i) => i !== index);
    setVariables(copy);
  };

  // Render preview
  const getRenderedPreview = () => {
    let output = commands;
    variables.forEach((v) => {
      output = output.split(`{{${v.name}}}`).join(v.default_value || `[${v.name}]`);
    });
    return output;
  };

  // Validation
  const validate = () => {
    if (!name.trim()) {
      setErrorMsg('لطفاً نامی برای تمپلیت کلون شده وارد فرمایید.');
      return false;
    }
    if (!commands.trim()) {
      setErrorMsg('متن دستورات کلون شده نمی‌تواند خالی باشد.');
      return false;
    }
    return true;
  };

  // Save as new cloned template
  const handleSave = async (andApply: boolean = false) => {
    if (!validate()) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const clonedTemplate = await onSaveClone({
        name: name.trim(),
        vendor,
        target_type: targetType,
        role: role.trim() || 'Custom Clone',
        description: description.trim(),
        default_cli_mode: defaultCliMode,
        commands,
        variables,
      });

      if (andApply && onCloneAndApply) {
        onClose();
        onCloneAndApply(clonedTemplate);
      } else {
        onClose();
      }
    } catch (err: any) {
      console.error('Error saving clone:', err);
      setErrorMsg(err.message || 'خطا در ثبت تمپلیت کلون شده');
    } finally {
      setSaving(false);
    }
  };

  const commandLines = commands.split('\n');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-5xl max-h-[94vh] flex flex-col bg-slate-900/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_60px_rgba(6,182,212,0.25)] overflow-hidden text-slate-100 backdrop-blur-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <CopyPlus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  کلون‌گیری و انشعاب از تمپلیت (Clone Template)
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Fork & Customize
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                <span>الگوی مبدا:</span>
                <span className="font-semibold text-slate-200">«{sourceTemplate.name}»</span>
                <span className="text-slate-500">|</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-md font-bold transition-all shadow-sm ${
                    sourceTemplate.vendor === 'mikrotik'
                      ? 'vendor-badge-mikrotik'
                      : sourceTemplate.vendor === 'cisco'
                      ? 'vendor-badge-cisco'
                      : 'vendor-badge-generic'
                  }`}
                >
                  {sourceTemplate.vendor === 'mikrotik' ? 'MikroTik RouterOS' : 'Cisco IOS-XE'}
                </span>
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

        {/* Info Banner */}
        <div className="px-5 py-2.5 bg-gradient-to-r from-cyan-950/40 via-indigo-950/30 to-transparent border-b border-white/5 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>
              دستورات و متغیرها از تمپلیت اصلی کپی شده‌اند. می‌توانید نام جدید را وارد کرده و تغییرات جزیی مورد نیاز برای تجهیز دیگر را در متن دستورات اعمال فرمایید.
            </span>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 hidden md:inline">
            {commandLines.length} خط دستور | {variables.length} متغیر
          </span>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* New Metadata Form */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  نام تمپلیت جدید (Clone Name): <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: سوئیچ دسترسی طبقه دوم، روتر شعبه تبریز، کانفیگ استاندارد Core..."
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 shadow-inner"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  نقش تجهیز در شبکه (Role):
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="مثال: Access Switch, Branch Router..."
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  سازنده (Vendor):
                </label>
                <select
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="cisco">سیسکو (Cisco IOS-XE)</option>
                  <option value="mikrotik">میکروتیک (MikroTik RouterOS)</option>
                  <option value="generic">عمومی (Generic Network)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  نوع هدف:
                </label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="switch">سوئیچ (Switch)</option>
                  <option value="router">روتر (Router)</option>
                  <option value="all">هر دو (سوئیچ و روتر)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  توضیحات تمپلیت جدید:
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="توضیح کوتاه در مورد این کلون و هدف آن..."
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'editor'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>ویرایشگر دستورات CLI کلون‌شده</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                  {commandLines.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('variables')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'variables'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>تنظیم متغیرها و مقادیر پیش‌فرض</span>
                <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
                  {variables.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === 'preview'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>پیش‌نمایش نهایی دستورات</span>
              </button>
            </div>

            {/* Quick Helper */}
            {activeTab === 'editor' && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 hidden sm:flex">
                <span>کلیک برای درج متغیر در مکان مکان‌نما:</span>
              </div>
            )}
          </div>

          {/* TAB 1: COMMANDS EDITOR */}
          {activeTab === 'editor' && (
            <div className="space-y-3">
              {/* Quick Variables Insert Chips */}
              {variables.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-slate-950/70 border border-white/5">
                  <span className="text-[11px] text-slate-400 font-medium px-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>متغیرها:</span>
                  </span>
                  {variables.map((v) => (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => insertVarTag(v.name)}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/10 hover:border-cyan-500/30 transition flex items-center gap-1"
                      title={`درج {{${v.name}}} در دستورات (پیش‌فرض: ${v.default_value || 'خالی'})`}
                    >
                      <span>{`{{${v.name}}}`}</span>
                      <Plus className="w-2.5 h-2.5 text-cyan-400" />
                    </button>
                  ))}
                </div>
              )}

              {/* Monospace CLI Editor */}
              <div className="relative rounded-2xl bg-slate-950 border border-white/15 overflow-hidden focus-within:border-cyan-500/60 shadow-inner">
                <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10 text-[11px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>CLI Commands Script (ویرایش جزیی دستورات)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">
                    تغییرات جزئی مورد نظرتان را مستقیماً در خطوط زیر اعمال نمایید
                  </span>
                </div>
                <textarea
                  ref={textareaRef}
                  value={commands}
                  onChange={(e) => setCommands(e.target.value)}
                  rows={14}
                  className="w-full bg-slate-950 p-4 font-mono text-xs text-slate-200 leading-relaxed focus:outline-none resize-y dir-ltr text-left selection:bg-cyan-500/30"
                  placeholder="enable&#10;configure terminal&#10;..."
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {/* TAB 2: VARIABLES CONFIGURATION */}
          {activeTab === 'variables' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  می‌توانید مقادیر پیش‌فرض متغیرها را برای تجهیز جدید تغییر دهید (مثلاً سابنت یا گیت‌وی متفاوت).
                </p>
                <button
                  type="button"
                  onClick={handleAddVar}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs border border-indigo-500/30 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>افزودن متغیر جدید</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/60">
                <table className="w-full text-right text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-slate-400 font-medium">
                    <tr>
                      <th className="p-3">نام در دستورات</th>
                      <th className="p-3">عنوان متغیر (Label)</th>
                      <th className="p-3">نوع داده</th>
                      <th className="p-3">مقدار پیش‌فرض برای این کلون</th>
                      <th className="p-3 text-center">اجباری</th>
                      <th className="p-3 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {variables.map((v, idx) => (
                      <tr key={idx} className="hover:bg-white/5 transition">
                        <td className="p-3 font-mono text-cyan-300">
                          {`{{${v.name}}}`}
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={v.label}
                            onChange={(e) => handleUpdateVar(idx, { label: e.target.value })}
                            className="w-full bg-slate-900 border border-white/10 px-2.5 py-1 rounded-lg text-xs text-white"
                          />
                        </td>
                        <td className="p-2.5">
                          <select
                            value={v.type}
                            onChange={(e) => handleUpdateVar(idx, { type: e.target.value as any })}
                            className="bg-slate-900 border border-white/10 px-2 py-1 rounded-lg text-xs text-white"
                          >
                            <option value="text">متن (Text)</option>
                            <option value="ip">آدرس IP</option>
                            <option value="subnet">سابنت ماسک</option>
                            <option value="gateway">گیت‌وی</option>
                            <option value="vlan">شناسه ویلن</option>
                            <option value="password">رمز عبور</option>
                            <option value="number">عدد</option>
                          </select>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={v.default_value}
                            onChange={(e) => handleUpdateVar(idx, { default_value: e.target.value })}
                            placeholder="مقدار اولیه..."
                            className="w-full bg-slate-900 border border-white/10 px-2.5 py-1 rounded-lg text-xs font-mono text-emerald-300"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={v.required}
                            onChange={(e) => handleUpdateVar(idx, { required: e.target.checked })}
                            className="rounded text-cyan-500"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveVar(idx)}
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
          )}

          {/* TAB 3: PREVIEW */}
          {activeTab === 'preview' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>پیش‌نمایش فرامین CLI جایگذاری‌شده با مقادیر پیش‌فرض فعلی:</span>
                <span className="font-mono text-emerald-400">Ready to execute</span>
              </div>
              <div className="rounded-2xl bg-slate-950 border border-white/10 p-4 font-mono text-xs text-slate-200 max-h-96 overflow-y-auto dir-ltr text-left leading-relaxed">
                <pre>{getRenderedPreview()}</pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 sm:p-5 border-t border-white/10 bg-slate-950/70 shrink-0">
          <div className="text-xs text-slate-400">
            تمپلیت کلون شده به عنوان یک الگوی مجزا ذخیره خواهد شد و الگوی مبدا بدون تغییر باقی می‌ماند.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-medium transition"
            >
              انصراف
            </button>

            {onCloneAndApply && (
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSave(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-xs font-semibold shadow-[0_0_15px_rgba(16,185,129,0.2)] transition active:scale-95"
                title="ذخیره تمپلیت و باز کردن پنجره اعمال روی تجهیز"
              >
                <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                <span>ذخیره و اعمال روی تجهیز...</span>
              </button>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(6,182,212,0.35)] transition active:scale-95"
            >
              <CopyPlus className="w-4 h-4" />
              <span>{saving ? 'در حال ثبت کلون...' : 'ثبت و ذخیره تمپلیت جدید (Clone)'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
