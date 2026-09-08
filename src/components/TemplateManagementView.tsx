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
import { useLanguage } from '../i18n';

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
  const { t, isRtl, isEn } = useLanguage();
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
      setError(isEn ? 'Failed to fetch templates from server' : 'خطا در دریافت لیست تمپلیت‌ها از سرور');
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
      showToast(isEn ? ((res as any).message_en || 'Template updated successfully') : res.message);
    } else {
      const res = await createTemplate(templateData);
      showToast(isEn ? ((res as any).message_en || 'Template created successfully') : res.message);
    }
    await loadTemplates();
  };

  // Delete handler
  const handleDeleteTemplate = async (tmpl: ConfigTemplate) => {
    const confirmPrompt = t('templates_delete_confirm', { name: tmpl.name });
    if (!window.confirm(confirmPrompt)) return;
    try {
      const res = await deleteTemplate(tmpl.id);
      showToast(isEn ? ((res as any).message_en || 'Template deleted successfully') : res.message);
      await loadTemplates();
    } catch (err: any) {
      alert(err.message || (isEn ? 'Failed to delete template' : 'خطا در حذف تمپلیت'));
    }
  };

  // Duplicate template (quick identical copy)
  const handleDuplicateTemplate = async (tmpl: ConfigTemplate) => {
    try {
      const copySuffix = isEn ? '(Copy)' : '(نسخه کپی)';
      const duplicated: Partial<ConfigTemplate> = {
        name: `${tmpl.name} ${copySuffix}`,
        vendor: tmpl.vendor,
        target_type: tmpl.target_type,
        role: tmpl.role,
        description: tmpl.description,
        default_cli_mode: tmpl.default_cli_mode,
        commands: tmpl.commands,
        variables: tmpl.variables,
      };
      const res = await createTemplate(duplicated);
      showToast(isEn ? `Template "${res.template.name}" duplicated.` : `تمپلیت «${res.template.name}» تکثیر شد.`);
      await loadTemplates();
    } catch (err: any) {
      alert(err.message || (isEn ? 'Failed to duplicate template' : 'خطا در تکثیر تمپلیت'));
    }
  };

  // Open Clone Modal
  const handleOpenClone = (tmpl: ConfigTemplate) => {
    setCloneSourceTemplate(tmpl);
    setCloneModalOpen(true);
  };

  // Save cloned template handler
  const handleSaveClone = async (clonedData: Partial<ConfigTemplate>): Promise<ConfigTemplate> => {
    const res = await createTemplate(clonedData);
    showToast(isEn ? `Cloned template "${res.template.name}" saved successfully.` : (res.message || `تمپلیت کلون شده «${res.template.name}» با موفقیت ذخیره گردید.`));
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
    <div className={`p-4 sm:p-6 space-y-4 max-w-7xl mx-auto ${isRtl ? 'text-right' : 'text-left'} text-slate-100 animate-fadeIn`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-6 ${isRtl ? 'left-6' : 'right-6'} z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-300 text-xs shadow-[0_0_25px_rgba(16,185,129,0.3)] animate-fadeIn`}>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header with Harmonized Button Sizes (Matches DeviceListView) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl spatial-glass border border-white/10 backdrop-blur-xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
              <FileCode2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{t('templates_title')}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {t('templates_badge')}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
                {t('templates_subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Top Action Buttons - Unified size with DeviceListView: px-3.5 py-1.5 rounded-xl text-xs font-medium gap-1.5 */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Extract Live Config Button */}
          <button
            onClick={() => setCaptureModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-medium shadow-[0_0_15px_rgba(16,185,129,0.3)] transition active:scale-95 border border-emerald-400/30 cursor-pointer"
            title={t('templates_btn_extract_live_title')}
          >
            <DownloadCloud className="w-3.5 h-3.5 text-emerald-200" />
            <span>{t('templates_btn_extract_live')}</span>
          </button>

          {/* New Template Button */}
          <button
            onClick={() => {
              setTemplateToEdit(null);
              setEditorOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-medium shadow-[0_0_15px_rgba(99,102,241,0.35)] transition border border-white/10 active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('templates_btn_create_new')}</span>
          </button>

          {/* Clone from Templates Button */}
          {templates.length > 0 && (
            <button
              onClick={() => handleOpenClone(templates[0])}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-medium shadow-xs transition active:scale-95 cursor-pointer"
              title={t('templates_btn_clone_top_title')}
            >
              <CopyPlus className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('templates_btn_clone_top')}</span>
            </button>
          )}

          {/* Refresh List Button */}
          <button
            onClick={loadTemplates}
            title={t('action_refresh')}
            className="flex items-center justify-center p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">{t('templates_stat_total')}</div>
            <div className="text-xl font-bold text-white font-mono mt-0.5">{stats.total}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Layers className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">{t('templates_stat_cisco')}</div>
            <div className="text-xl font-bold text-cyan-400 font-mono mt-0.5">{stats.ciscoCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Terminal className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">{t('templates_stat_mikrotik')}</div>
            <div className="text-xl font-bold text-emerald-400 font-mono mt-0.5">{stats.mikrotikCount}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Code2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400 font-medium">{isEn ? 'Switches / Routers' : 'سوئیچ‌ها / روترها'}</div>
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
          <Search className={`w-4 h-4 text-slate-400 absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2`} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('templates_search_placeholder')}
            className={`w-full bg-slate-900/70 border border-white/15 rounded-xl ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500`}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {/* Vendor Filter */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs template-filter-group">
            <span className="text-[11px] text-slate-400 px-2 font-medium">
              {isEn ? 'Vendor:' : 'سازنده:'}
            </span>
            <button
              onClick={() => setVendorFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition text-xs cursor-pointer ${
                vendorFilter === 'all'
                  ? 'bg-cyan-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isEn ? 'All' : 'همه'}
            </button>
            <button
              onClick={() => setVendorFilter('cisco')}
              className={`px-2.5 py-1 rounded-lg transition text-xs cursor-pointer ${
                vendorFilter === 'cisco'
                  ? 'bg-cyan-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cisco
            </button>
            <button
              onClick={() => setVendorFilter('mikrotik')}
              className={`px-2.5 py-1 rounded-lg transition text-xs cursor-pointer ${
                vendorFilter === 'mikrotik'
                  ? 'bg-cyan-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              MikroTik
            </button>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-white/10 text-xs template-filter-group">
            <span className="text-[11px] text-slate-400 px-2 font-medium">
              {isEn ? 'Type:' : 'تجهیز:'}
            </span>
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition text-xs cursor-pointer ${
                typeFilter === 'all'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isEn ? 'All' : 'همه'}
            </button>
            <button
              onClick={() => setTypeFilter('switch')}
              className={`px-2.5 py-1 rounded-lg transition text-xs cursor-pointer ${
                typeFilter === 'switch'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isEn ? 'Switch' : 'سوئیچ'}
            </button>
            <button
              onClick={() => setTypeFilter('router')}
              className={`px-2.5 py-1 rounded-lg transition text-xs cursor-pointer ${
                typeFilter === 'router'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isEn ? 'Router' : 'روتر'}
            </button>
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-400 space-y-3">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
          <span className="text-xs">{isEn ? 'Loading config templates...' : 'در حال بارگذاری الگوهای کانفیگ...'}</span>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="p-12 rounded-2xl spatial-glass border border-white/10 text-center space-y-3">
          <FileCode2 className="w-10 h-10 text-slate-500 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-300">{t('templates_no_templates')}</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {isEn
              ? 'Clear search filters or click "Define New Template" to create a custom configuration pattern.'
              : 'می‌توانید فیلترهای جستجو را پاک کنید یا با استفاده از دکمه «تعریف تمپلیت جدید» الگوی اختصاصی خود را بسازید.'}
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
                        {tmpl.target_type === 'switch'
                          ? (isEn ? 'Switch' : 'سوئیچ')
                          : tmpl.target_type === 'router'
                          ? (isEn ? 'Router' : 'روتر')
                          : (isEn ? 'Universal' : 'همگانی')}
                      </span>

                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono template-role-badge">
                        {tmpl.role}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => handleOpenClone(tmpl)}
                        title={isEn ? 'Clone with a new name (Clone)' : 'کلون‌گیری با نام جدید برای تجهیز دیگر (Clone)'}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition text-[11px] font-medium cursor-pointer"
                      >
                        <CopyPlus className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Clone' : 'کلون'}</span>
                      </button>

                      <button
                        onClick={() => handleDuplicateTemplate(tmpl)}
                        title={t('templates_card_duplicate')}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setTemplateToEdit(tmpl);
                          setEditorOpen(true);
                        }}
                        title={t('templates_card_edit')}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-cyan-300 transition cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {!tmpl.is_builtin && (
                        <button
                          onClick={() => handleDeleteTemplate(tmpl)}
                          title={t('templates_card_delete')}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition cursor-pointer"
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
                    {tmpl.description || (isEn ? 'No description available.' : 'بدون توضیحات تکمیلی.')}
                  </p>

                  {/* Dynamic Variables Pill Box */}
                  {tmpl.variables && tmpl.variables.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Sliders className="w-3 h-3 text-cyan-400" />
                          <span>
                            {isEn
                              ? `Interactive Form Variables (${tmpl.variables.length} parameters):`
                              : `متغیرهای تعاملی فرم (${tmpl.variables.length} متغیر):`}
                          </span>
                        </span>
                        <span className="font-mono text-cyan-400/80">Dynamic Parameters</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tmpl.variables.slice(0, 6).map((v) => (
                          <span
                            key={v.name}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 template-var-pill"
                            title={`${v.label}: ${isEn ? 'Default' : 'پیش‌فرض'} ${v.default_value}`}
                          >
                            {`{{${v.name}}}`}
                          </span>
                        ))}
                        {tmpl.variables.length > 6 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-lg bg-white/5 text-slate-400 border border-white/10 template-var-pill">
                            +{tmpl.variables.length - 6} {isEn ? 'more' : 'متغیر دیگر'}
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
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-300 text-[10px] flex items-center gap-1 transition cursor-pointer"
                      >
                        {copiedId === tmpl.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === tmpl.id ? (isEn ? 'Copied' : 'کپی شد') : (isEn ? 'Copy' : 'کپی')}</span>
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
                    {commandLines.length} {isEn ? 'CLI lines' : 'خط دستور CLI'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenClone(tmpl)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition active:scale-95 cursor-pointer"
                      title={isEn ? 'Clone as a new template with slight changes' : 'کلون‌گیری با نام جدید برای تجهیز دیگر با تغییرات جزیی'}
                    >
                      <CopyPlus className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Clone...' : 'کلون با نام دیگر...'}</span>
                    </button>

                    <button
                      onClick={() => handleOpenApply(tmpl.id)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] transition active:scale-95 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>{isEn ? 'Apply to Device...' : 'اعمال روی تجهیز...'}</span>
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
          showToast(isEn ? `Template applied successfully to "${updatedDevice.name}".` : `تمپلیت با موفقیت روی «${updatedDevice.name}» اعمال شد.`);
          if (onDeviceUpdated) onDeviceUpdated(updatedDevice);
        }}
      />

      {/* Capture Live Config as Template Modal */}
      <CaptureConfigModal
        isOpen={captureModalOpen}
        onClose={() => setCaptureModalOpen(false)}
        devices={devices}
        onTemplateSaved={(newTmpl) => {
          showToast(isEn ? `Template "${newTmpl.name}" extracted and saved from live device config.` : `تمپلیت «${newTmpl.name}» با موفقیت از کانفیگ تجهیز استخراج و ذخیره گردید.`);
          loadTemplates();
        }}
        onSaveAndApply={(newTmpl) => {
          showToast(isEn ? `Template "${newTmpl.name}" saved. Opening device apply modal...` : `تمپلیت «${newTmpl.name}» ذخیره شد. در حال باز کردن فرم اعمال روی تجهیز...`);
          loadTemplates();
          handleOpenApply(newTmpl.id);
        }}
      />
    </div>
  );
};
