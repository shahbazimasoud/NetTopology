import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCode2,
  Plus,
  Search,
  Filter,
  Terminal,
  Play,
  Edit,
  Trash2,
  Copy,
  Check,
  Server,
  Layers,
  Sparkles,
  RefreshCw,
  Sliders,
  Shield,
  ArrowRight,
  ExternalLink,
  Code2,
  CheckCircle2,
  AlertCircle,
  CopyPlus,
  DownloadCloud
} from 'lucide-react';
import { ConfigTemplate, Device } from '../types';
import { fetchTemplates, createTemplate, updateTemplate, deleteTemplate } from '../services/api';
import { TemplateEditorModal } from './TemplateEditorModal';
import { ApplyTemplateModal } from './ApplyTemplateModal';
import { CloneTemplateModal } from './CloneTemplateModal';
import { CaptureConfigModal } from './CaptureConfigModal';

interface TemplateManagementViewProps {
  devices: Device[];
  onDeviceUpdated?: (device: Device) => void;
  onOpenTerminal?: (device: Device) => void;
}

export const TemplateManagementView: React.FC<TemplateManagementViewProps> = ({
  devices,
  onDeviceUpdated,
  onOpenTerminal,
}) => {
  const [templates, setTemplates] = useState<ConfigTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [vendorFilter, setVendorFilter] = useState<'all' | 'cisco' | 'mikrotik' | 'generic'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'switch' | 'router'>('all');

  // Modals state
  const [editorOpen, setEditorOpen] = useState(false);
  const [templateToEdit, setTemplateToEdit] = useState<ConfigTemplate | null>(null);

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyTargetTemplateId, setApplyTargetTemplateId] = useState<string | undefined>(undefined);
  const [applyTargetDevice, setApplyTargetDevice] = useState<Device | null>(null);

  // Clone Modal state
  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [cloneSourceTemplate, setCloneSourceTemplate] = useState<ConfigTemplate | null>(null);

  // Capture Live Config Modal state
  const [captureModalOpen, setCaptureModalOpen] = useState(false);

  // Feedback notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTemplates();
      setTemplates(res.templates);
    } catch (err: any) {
      console.error('Failed to load templates:', err);
      setError('خطا در دریافت لیست تمپلیت‌ها از سرور');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filtered list
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.commands.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.role.toLowerCase().includes(searchTerm.toLowerCase());

      const matchVendor = vendorFilter === 'all' || t.vendor === vendorFilter;
      const matchType = typeFilter === 'all' || t.target_type === typeFilter || t.target_type === 'all';

      return matchSearch && matchVendor && matchType;
    });
  }, [templates, searchTerm, vendorFilter, typeFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = templates.length;
    const ciscoCount = templates.filter((t) => t.vendor === 'cisco').length;
    const mikrotikCount = templates.filter((t) => t.vendor === 'mikrotik').length;
    const switchCount = templates.filter((t) => t.target_type === 'switch').length;
    const routerCount = templates.filter((t) => t.target_type === 'router').length;
    return { total, ciscoCount, mikrotikCount, switchCount, routerCount };
  }, [templates]);

  // Save or update handler
  const handleSaveTemplate = async (templateData: Partial<ConfigTemplate>) => {
    if (templateToEdit) {
      const res = await updateTemplate(templateToEdit.id, templateData);
      showToast(res.message);
    } else {
      const res = await createTemplate(templateData);
      showToast(res.message);
    }
    await loadTemplates();
  };

  // Delete handler
  const handleDeleteTemplate = async (t: ConfigTemplate) => {
    if (!window.confirm(`آیا از حذف تمپلیت «${t.name}» اطمینان دارید؟`)) return;
    try {
      const res = await deleteTemplate(t.id);
      showToast(res.message);
      await loadTemplates();
    } catch (err: any) {
      alert(err.message || 'خطا در حذف تمپلیت');
    }
  };

  // Duplicate template (quick identical copy)
  const handleDuplicateTemplate = async (t: ConfigTemplate) => {
    try {
      const duplicated: Partial<ConfigTemplate> = {
        name: `${t.name} (نسخه کپی)`,
        vendor: t.vendor,
        target_type: t.target_type,
        role: t.role,
        description: t.description,
        default_cli_mode: t.default_cli_mode,
        commands: t.commands,
        variables: t.variables,
      };
      const res = await createTemplate(duplicated);
      showToast(`تمپلیت «${res.template.name}» تکثیر شد.`);
      await loadTemplates();
    } catch (err: any) {
      alert(err.message || 'خطا در تکثیر تمپلیت');
    }
  };

  // Open Clone Modal for customizing with a new name and minor command adjustments
  const handleOpenClone = (t: ConfigTemplate) => {
    setCloneSourceTemplate(t);
    setCloneModalOpen(true);
  };

  // Save cloned template handler
  const handleSaveClone = async (clonedData: Partial<ConfigTemplate>): Promise<ConfigTemplate> => {
    const res = await createTemplate(clonedData);
    showToast(res.message || `تمپلیت کلون شده «${res.template.name}» با موفقیت ذخیره گردید.`);
    await loadTemplates();
    return res.template;
  };

  // Clone & immediately apply
  const handleCloneAndApply = (clonedTemplate: ConfigTemplate) => {
    handleOpenApply(clonedTemplate.id);
  };

  // Copy template raw code
  const handleCopyCommands = (id: string, commands: string) => {
    navigator.clipboard.writeText(commands);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open apply modal for template
  const handleOpenApply = (templateId: string) => {
    setApplyTargetTemplateId(templateId);
    setApplyTargetDevice(devices.length > 0 ? devices[0] : null);
    setApplyModalOpen(true);
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto text-right text-slate-100 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-300 text-xs shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl spatial-glass border border-white/10 backdrop-blur-xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
              <FileCode2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>الگوها و تمپلیت‌های کانفیگ تجهیزات شبکه</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Cisco & MikroTik Templates
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تعریف الگوهای استاندارد فرامین سوئیچ و روتر با پشتیبانی از متغیرهای پویا و تایید تعاملی آدرس‌های IP
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCaptureModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-[0_0_20px_rgba(16,185,129,0.35)] transition active:scale-95 border border-emerald-400/30"
            title="اتصال SSH/Telnet به سوئیچ، روتر یا میکروتیک و استخراج خودکار کانفیگ و تبدیل به تمپلیت"
          >
            <DownloadCloud className="w-4 h-4 text-emerald-200" />
            <span>استخراج الگو از تجهیز زنده</span>
          </button>

          <button
            onClick={() => {
              setTemplateToEdit(null);
              setEditorOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-[0_0_20px_rgba(6,182,212,0.35)] transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>تعریف تمپلیت جدید</span>
          </button>

          {templates.length > 0 && (
            <button
              onClick={() => handleOpenClone(templates[0])}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-semibold shadow-[0_0_15px_rgba(6,182,212,0.15)] transition active:scale-95"
              title="کلون‌گیری از یک تمپلیت با نام جدید و ویرایش جزیی دستورات"
            >
              <CopyPlus className="w-4 h-4 text-cyan-400" />
              <span>کلون از الگوها</span>
            </button>
          )}

          <button
            onClick={() => {
              setApplyTargetTemplateId(templates.length > 0 ? templates[0].id : undefined);
              setApplyTargetDevice(devices.length > 0 ? devices[0] : null);
              setApplyModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-medium border border-white/10 transition active:scale-95"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            <span>اعمال سریع روی تجهیز</span>
          </button>

          <button
            onClick={loadTemplates}
            title="بروزرسانی لیست تمپلیت‌ها"
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">کل تمپلیت‌های فعال</div>
            <div className="text-xl font-bold text-white font-mono mt-0.5">{stats.total}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">الگوهای سیسکو (IOS-XE)</div>
            <div className="text-xl font-bold text-cyan-400 font-mono mt-0.5">{stats.ciscoCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Terminal className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">الگوهای میکروتیک (RouterOS)</div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{stats.mikrotikCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Code2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">سوئیچ‌ها / روترها</div>
            <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">
              {stats.switchCount} <span className="text-xs text-slate-400 font-normal">/</span> {stats.routerCount}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Server className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 rounded-xl spatial-glass border border-white/10 shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو در عنوان، کامندها یا متغیرها..."
            className="w-full bg-slate-900/70 border border-white/15 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {/* Vendor Filter */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs template-filter-group">
            <span className="text-[11px] text-slate-400 px-2 font-medium">سازنده:</span>
            <button
              onClick={() => setVendorFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition text-xs ${
                vendorFilter === 'all'
                  ? 'bg-cyan-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              همه
            </button>
            <button
              onClick={() => setVendorFilter('cisco')}
              className={`px-2.5 py-1 rounded-lg transition text-xs ${
                vendorFilter === 'cisco'
                  ? 'bg-cyan-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              سیسکو
            </button>
            <button
              onClick={() => setVendorFilter('mikrotik')}
              className={`px-2.5 py-1 rounded-lg transition text-xs ${
                vendorFilter === 'mikrotik'
                  ? 'bg-cyan-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              میکروتیک
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs template-filter-group">
            <span className="text-[11px] text-slate-400 px-2 font-medium">تجهیز:</span>
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition text-xs ${
                typeFilter === 'all'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              همه
            </button>
            <button
              onClick={() => setTypeFilter('switch')}
              className={`px-2.5 py-1 rounded-lg transition text-xs ${
                typeFilter === 'switch'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              سوئیچ
            </button>
            <button
              onClick={() => setTypeFilter('router')}
              className={`px-2.5 py-1 rounded-lg transition text-xs ${
                typeFilter === 'router'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              روتر
            </button>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-xs">در حال بارگذاری الگوهای کانفیگ...</span>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="p-12 rounded-2xl spatial-glass border border-white/10 text-center space-y-3">
          <FileCode2 className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">هیچ تمپلیتی با این مشخصات یافت نشد</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            می‌توانید فیلترهای جستجو را پاک کنید یا با استفاده از دکمه «تعریف تمپلیت جدید» الگوی اختصاصی خود را بسازید.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTemplates.map((tmpl) => {
            const commandLines = tmpl.commands.split('\n').filter((l) => l.trim().length > 0);
            return (
              <div
                key={tmpl.id}
                className="flex flex-col justify-between p-5 rounded-2xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 hover:border-cyan-500/40 transition-all duration-300 shadow-xl group hover:shadow-[0_0_30px_rgba(6,182,212,0.15)]"
              >
                <div>
                  {/* Card Header & Badges */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg border transition-all shadow-sm ${
                          tmpl.vendor === 'mikrotik'
                            ? 'vendor-badge-mikrotik'
                            : tmpl.vendor === 'cisco'
                            ? 'vendor-badge-cisco'
                            : 'vendor-badge-generic'
                        }`}
                      >
                        {tmpl.vendor === 'mikrotik' ? 'MikroTik RouterOS' : tmpl.vendor === 'cisco' ? 'Cisco IOS-XE' : 'Generic CLI'}
                      </span>

                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/10 template-meta-badge">
                        {tmpl.target_type === 'switch' ? 'سوئیچ' : tmpl.target_type === 'router' ? 'روتر' : 'همگانی'}
                      </span>

                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono template-role-badge">
                        {tmpl.role}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleOpenClone(tmpl)}
                        title="کلون‌گیری با نام جدید برای تجهیز دیگر (Clone)"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition text-[11px] font-medium"
                      >
                        <CopyPlus className="w-3.5 h-3.5" />
                        <span>کلون</span>
                      </button>

                      <button
                        onClick={() => handleDuplicateTemplate(tmpl)}
                        title="تکثیر سریع این تمپلیت"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setTemplateToEdit(tmpl);
                          setEditorOpen(true);
                        }}
                        title="ویرایش تمپلیت"
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {!tmpl.is_builtin && (
                        <button
                          onClick={() => handleDeleteTemplate(tmpl)}
                          title="حذف تمپلیت"
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-bold text-sm text-white group-hover:text-cyan-300 transition">
                    {tmpl.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {tmpl.description || 'بدون توضیحات تکمیلی.'}
                  </p>

                  {/* Dynamic Variables Pill Box */}
                  {tmpl.variables && tmpl.variables.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Sliders className="w-3 h-3 text-cyan-400" />
                          <span>متغیرهای تعاملی فرم ({tmpl.variables.length} متغیر):</span>
                        </span>
                        <span className="font-mono text-cyan-400/80">Dynamic Parameters</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tmpl.variables.slice(0, 6).map((v) => (
                          <span
                            key={v.name}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 template-var-pill"
                            title={`${v.label}: پیش‌فرض ${v.default_value}`}
                          >
                            {`{{${v.name}}}`}
                          </span>
                        ))}
                        {tmpl.variables.length > 6 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-lg bg-white/5 text-slate-400 border border-white/10 template-var-pill">
                            +{tmpl.variables.length - 6} متغیر دیگر
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Script Preview Box */}
                  <div className="mt-3 relative rounded-xl bg-slate-950 border border-white/10 p-3 font-mono text-[11px] text-slate-300 max-h-36 overflow-hidden dir-ltr text-left template-code-preview">
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
                      <button
                        onClick={() => handleCopyCommands(tmpl.id, tmpl.commands)}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-300 text-[10px] flex items-center gap-1 transition"
                      >
                        {copiedId === tmpl.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === tmpl.id ? 'کپی شد' : 'کپی'}</span>
                      </button>
                    </div>
                    <pre className="text-slate-400 leading-tight">
                      {tmpl.commands.slice(0, 240)}
                      {tmpl.commands.length > 240 ? '\n...' : ''}
                    </pre>
                    <div className="absolute bottom-0 inset-x-0 h-10 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none" />
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    {commandLines.length} خط دستور CLI
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenClone(tmpl)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition active:scale-95"
                      title="کلون‌گیری با نام جدید برای تجهیز دیگر با تغییرات جزیی"
                    >
                      <CopyPlus className="w-3.5 h-3.5" />
                      <span>کلون با نام دیگر...</span>
                    </button>

                    <button
                      onClick={() => handleOpenApply(tmpl.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>اعمال روی تجهیز...</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Template Editor Modal */}
      <TemplateEditorModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        templateToEdit={templateToEdit}
        onSave={handleSaveTemplate}
        onSaveAsClone={handleSaveClone}
      />

      {/* Clone Template Modal */}
      <CloneTemplateModal
        isOpen={cloneModalOpen}
        onClose={() => {
          setCloneModalOpen(false);
          setCloneSourceTemplate(null);
        }}
        sourceTemplate={cloneSourceTemplate}
        onSaveClone={handleSaveClone}
        onCloneAndApply={handleCloneAndApply}
      />

      {/* Apply Template Modal */}
      <ApplyTemplateModal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        targetDevice={applyTargetDevice}
        allDevices={devices}
        preselectedTemplateId={applyTargetTemplateId}
        onApplied={(updatedDevice) => {
          showToast(`تمپلیت با موفقیت روی «${updatedDevice.name}» اعمال شد.`);
          if (onDeviceUpdated) onDeviceUpdated(updatedDevice);
        }}
      />

      {/* Capture Live Config as Template Modal */}
      <CaptureConfigModal
        isOpen={captureModalOpen}
        onClose={() => setCaptureModalOpen(false)}
        devices={devices}
        onTemplateSaved={(newTmpl) => {
          showToast(`تمپلیت «${newTmpl.name}» با موفقیت از کانفیگ تجهیز استخراج و ذخیره گردید.`);
          loadTemplates();
        }}
        onSaveAndApply={(newTmpl) => {
          showToast(`تمپلیت «${newTmpl.name}» ذخیره شد. در حال باز کردن فرم اعمال روی تجهیز...`);
          loadTemplates();
          handleOpenApply(newTmpl.id);
        }}
      />
    </div>
  );
};
