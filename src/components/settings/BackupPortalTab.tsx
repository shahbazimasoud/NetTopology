import React, { useState, useEffect, useRef } from 'react';
import {
  Archive,
  DownloadCloud,
  UploadCloud,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  FileCheck,
  FileX,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Clock,
  HardDrive,
  Database,
  Layers,
  Users,
  Eye,
  Trash2,
  Info,
  RefreshCw,
  Sparkles,
  FileText,
  Sliders,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  AccessPolicy,
  BackupScope,
  NetworkBackupPackage,
  BackupMetadata,
  BackupAuditEntry,
  Device
} from '../../types';
import {
  collectBackupPackage,
  downloadBackupPackage,
  inspectBackupFile,
  executeRestore,
  getSafetySnapshot,
  clearSafetySnapshot,
  loadBackupAuditLogs,
  logBackupAudit,
  clearBackupAuditLogs
} from '../../services/backupService';
import { APP_VERSION } from '../../version';

interface BackupPortalTabProps {
  isEn: boolean;
  activePolicy: AccessPolicy;
  allPolicies: AccessPolicy[];
  onSelectSimulatedPolicy: (policyId: string) => void;
  devices: Device[];
  onRefreshData?: () => void;
}

export const BackupPortalTab: React.FC<BackupPortalTabProps> = ({
  isEn,
  activePolicy,
  allPolicies,
  onSelectSimulatedPolicy,
  devices,
  onRefreshData
}) => {
  // RBAC Permission Check
  // By default, super admin or any policy with canExportBackup = true / canImportBackup = true
  const canExport = activePolicy.canExportBackup !== false && (activePolicy.id === 'policy-super-admin' || !!activePolicy.canExportBackup);
  const canImport = activePolicy.canImportBackup === true || activePolicy.id === 'policy-super-admin';

  // State: Export Configuration
  const [exportScope, setExportScope] = useState<BackupScope>('full');
  const [encryptExport, setEncryptExport] = useState<boolean>(false);
  const [exportPassphrase, setExportPassphrase] = useState<string>('');
  const [confirmPassphrase, setConfirmPassphrase] = useState<string>('');
  const [sanitizeSecrets, setSanitizeSecrets] = useState<boolean>(false);
  const [customNote, setCustomNote] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // State: Import / Restore
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [inspectionResult, setInspectionResult] = useState<{
    valid: boolean;
    isEncrypted: boolean;
    needsPassphrase: boolean;
    metadata?: BackupMetadata;
    unpackedData?: any;
    error?: string;
    checksumMatched: boolean;
  } | null>(null);
  const [importPassphrase, setImportPassphrase] = useState<string>('');
  const [restoreMode, setRestoreMode] = useState<'overwrite' | 'merge'>('overwrite');
  const [confirmKeyword, setConfirmKeyword] = useState<string>('');
  const [isRestoring, setIsRestoring] = useState<boolean>(false);
  const [restoreResult, setRestoreResult] = useState<{ success: boolean; message: string; details?: string } | null>(null);

  // State: Safety Snapshot & Rollback
  const [hasSnapshot, setHasSnapshot] = useState<boolean>(false);
  const [snapshotMeta, setSnapshotMeta] = useState<BackupMetadata | null>(null);
  const [isRollingBack, setIsRollingBack] = useState<boolean>(false);

  // State: Audit Logs
  const [auditLogs, setAuditLogs] = useState<BackupAuditEntry[]>([]);
  const [logFilter, setLogFilter] = useState<string>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load audit logs and snapshot presence on mount
  useEffect(() => {
    refreshAuditLogs();
    checkSafetySnapshot();
  }, []);

  const refreshAuditLogs = () => {
    setAuditLogs(loadBackupAuditLogs());
  };

  const checkSafetySnapshot = () => {
    const snap = getSafetySnapshot();
    if (snap) {
      setHasSnapshot(true);
      setSnapshotMeta(snap.metadata);
    } else {
      setHasSnapshot(false);
      setSnapshotMeta(null);
    }
  };

  // -------------------------------------------------------------
  // Export Handler
  // -------------------------------------------------------------
  const handleExport = async () => {
    if (!canExport) {
      logBackupAudit({
        action: 'export_blocked',
        username: activePolicy.subjectName,
        role: activePolicy.name,
        scope: exportScope,
        itemCount: 0,
        status: 'error',
        details: 'درخواست دانلود بکاپ به دلیل عدم دسترسی پالیسی فعال مسدود گردید (RBAC Blocked).'
      });
      refreshAuditLogs();
      return;
    }

    if (encryptExport) {
      if (!exportPassphrase || exportPassphrase.length < 4) {
        alert(isEn ? 'Please enter an encryption passphrase with at least 4 characters.' : 'لطفاً یک رمز عبور حداقل ۴ کاراکتری جهت رمزنگاری وارد کنید.');
        return;
      }
      if (exportPassphrase !== confirmPassphrase) {
        alert(isEn ? 'Passphrases do not match.' : 'تکرار کلمه عبور با رمز عبور مطابقت ندارد.');
        return;
      }
    }

    setIsExporting(true);
    setExportSuccessMsg(null);

    try {
      const pkg = await collectBackupPackage({
        scope: exportScope,
        sanitizeSecrets,
        passphrase: encryptExport ? exportPassphrase : undefined,
        createdBy: activePolicy.subjectName,
        createdRole: activePolicy.name,
        customNote: customNote.trim() || undefined
      });

      downloadBackupPackage(pkg);

      const totalItems =
        pkg.metadata.counts.devices +
        pkg.metadata.counts.customMaps +
        pkg.metadata.counts.accessPolicies +
        pkg.metadata.counts.deviceGroups;

      setExportSuccessMsg(
        isEn
          ? `Backup package (${pkg.metadata.scopeLabel}) exported successfully!`
          : `پکیج پشتیبان (${pkg.metadata.scopeLabel}) با موفقیت ایجاد و دانلود شد.`
      );

      logBackupAudit({
        action: 'export',
        username: activePolicy.subjectName,
        role: activePolicy.name,
        fileName: `nettopology-backup-${pkg.metadata.scope}.${pkg.metadata.isEncrypted ? 'enc.json' : 'json'}`,
        scope: pkg.metadata.scopeLabel,
        itemCount: totalItems,
        status: 'success',
        details: `تولید موفق پکیج بکاپ شامل ${pkg.metadata.counts.devices} تجهیز، ${pkg.metadata.counts.customMaps} نقشه، ${pkg.metadata.counts.accessPolicies} پالیسی. وضعیت سکرت‌ها: ${sanitizeSecrets ? 'پاکسازی‌شده' : 'عادی'}`,
        checksum: pkg.metadata.checksumSha256
      });

      refreshAuditLogs();
    } catch (err: any) {
      alert(`خطا در ایجاد پکیج بکاپ: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // -------------------------------------------------------------
  // File Upload & Inspection
  // -------------------------------------------------------------
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setInspectionResult(null);
    setRestoreResult(null);
    setConfirmKeyword('');
    setImportPassphrase('');

    const reader = new FileReader();
    setIsAnalyzing(true);
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      setFileContent(content);
      const res = await inspectBackupFile(content);
      setInspectionResult(res);
      setIsAnalyzing(false);
    };
    reader.onerror = () => {
      setIsAnalyzing(false);
      alert('خطا در خواندن فایل.');
    };
    reader.readAsText(file);
  };

  const handleDecryptInspection = async () => {
    if (!fileContent || !importPassphrase) return;
    setIsAnalyzing(true);
    const res = await inspectBackupFile(fileContent, importPassphrase);
    setInspectionResult(res);
    setIsAnalyzing(false);
  };

  // -------------------------------------------------------------
  // Restore Execution
  // -------------------------------------------------------------
  const handleRestore = async () => {
    if (!canImport) {
      logBackupAudit({
        action: 'import_blocked',
        username: activePolicy.subjectName,
        role: activePolicy.name,
        scope: inspectionResult?.metadata?.scopeLabel || 'Unknown',
        itemCount: 0,
        status: 'error',
        details: 'درخواست بازیابی و بازنویسی پایگاه داده به علت عدم مجوز امنیتی پالیسی فعال رد شد (RBAC Blocked).'
      });
      refreshAuditLogs();
      return;
    }

    if (!inspectionResult || !inspectionResult.valid || !inspectionResult.unpackedData) {
      alert('فایل پشتیبان تایید نشده است.');
      return;
    }

    if (restoreMode === 'overwrite' && confirmKeyword.trim().toUpperCase() !== 'RESTORE') {
      alert(isEn ? 'Please type RESTORE to confirm complete overwrite.' : 'برای تایید بازنویسی کامل، کلمه RESTORE را در کادر مربوطه تایپ کنید.');
      return;
    }

    setIsRestoring(true);
    setRestoreResult(null);

    try {
      const res = await executeRestore(inspectionResult.unpackedData, restoreMode);
      setRestoreResult(res);
      checkSafetySnapshot();

      logBackupAudit({
        action: 'import_success',
        username: activePolicy.subjectName,
        role: activePolicy.name,
        fileName: selectedFile?.name,
        scope: inspectionResult.metadata?.scopeLabel || 'Disaster Recovery',
        itemCount: inspectionResult.metadata?.counts.devices || 0,
        status: 'success',
        details: `بازیابی موفق (${restoreMode === 'overwrite' ? 'جایگزینی کامل' : 'ادغام هوشمند'}). ${res.details}`,
        checksum: inspectionResult.metadata?.checksumSha256
      });

      refreshAuditLogs();

      if (onRefreshData) {
        setTimeout(() => {
          onRefreshData();
        }, 600);
      }
    } catch (err: any) {
      setRestoreResult({
        success: false,
        message: 'خطا در بازیابی پایگاه داده: ' + err.message
      });

      logBackupAudit({
        action: 'import_failed',
        username: activePolicy.subjectName,
        role: activePolicy.name,
        fileName: selectedFile?.name,
        scope: inspectionResult.metadata?.scopeLabel || 'Disaster Recovery',
        itemCount: 0,
        status: 'error',
        details: `شکست عملیات بازیابی: ${err.message}`
      });

      refreshAuditLogs();
    } finally {
      setIsRestoring(false);
    }
  };

  // -------------------------------------------------------------
  // Rollback to Safety Snapshot
  // -------------------------------------------------------------
  const handleRollback = async () => {
    if (!canImport) {
      alert('شما مجوز اجرای بازیابی و Rollback را ندارید.');
      return;
    }

    const snap = getSafetySnapshot();
    if (!snap) {
      alert('نقطه بازیابی خودکار یافت نشد.');
      return;
    }

    const confirmed = window.confirm(
      isEn
        ? 'Are you sure you want to rollback to the safety snapshot captured before the last restore?'
        : 'آیا اطمینان دارید که می‌خواهید سامانه را به نقطه بازگشت امن قبل از آخرین بازیابی برگردانید؟'
    );
    if (!confirmed) return;

    setIsRollingBack(true);
    try {
      const { format, metadata, ...unpacked } = snap;
      await executeRestore(unpacked, 'overwrite');
      clearSafetySnapshot();
      checkSafetySnapshot();

      logBackupAudit({
        action: 'rollback',
        username: activePolicy.subjectName,
        role: activePolicy.name,
        scope: 'Safety Point Rollback',
        itemCount: metadata.counts.devices,
        status: 'warning',
        details: 'بازگشت موفقیت‌آمیز به نقطه پشتیبان خودکار (Instant Rollback).'
      });

      refreshAuditLogs();
      if (onRefreshData) onRefreshData();
      alert('سامانه با موفقیت به نقطه بازیابی قبلی بازگردانده شد.');
    } catch (err: any) {
      alert('خطا در Rollback: ' + err.message);
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* -------------------------------------------------------------
          Top Header & RBAC Identity Governance Banner
      ------------------------------------------------------------- */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/30 to-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-inner">
              <Archive className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg text-white">
                  {isEn ? 'Backup & Disaster Recovery Portal' : 'پورتال بکاپ و بازیابی اطلاعات شبکه (Disaster Recovery)'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono font-bold">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {isEn
                  ? 'Comprehensive enterprise snapshot engine: Export encrypted packages of topology maps, device telemetry, and access policies, with SHA-256 validation and pre-flight restore inspection.'
                  : 'موتور جامع پشتیبان‌گیری و تاب‌آوری سازمانی: تولید بسته‌های رمزنگاری‌شده از نقشه‌های شماتیک، ساختار فیزیکی، تجهیزات و پالیسی‌های امنیتی همراه با احراز اصالت SHA-256 و نقطه بازگشت خودکار.'}
              </p>
            </div>
          </div>

          {/* Active Role & Live Simulation Selector */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 flex flex-col sm:flex-row sm:items-center gap-3 min-w-[310px]">
            <div className="flex-1">
              <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isEn ? 'Active Security Role (RBAC):' : 'نقش فعال امنیتی جاری:'}</span>
              </div>
              <div className="font-bold text-xs text-white mt-0.5 truncate">
                {activePolicy.subjectName} ({activePolicy.name})
              </div>
            </div>

            <div className="flex items-center gap-1.5 border-t sm:border-t-0 sm:border-r sm:border-white/10 pt-2 sm:pt-0 sm:pr-3">
              <div
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border ${
                  canExport
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}
                title={canExport ? 'مجوز استخراج فعال است' : 'مجوز استخراج مسدود است'}
              >
                {canExport ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                <span>Export</span>
              </div>

              <div
                className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border ${
                  canImport
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}
                title={canImport ? 'مجوز بازیابی دیتابیس فعال است' : 'مجوز بازیابی مسدود است'}
              >
                {canImport ? <Check className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                <span>Restore</span>
              </div>
            </div>
          </div>
        </div>

        {/* Permission Warning if Restricted */}
        {(!canExport || !canImport) && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-200">
              <span className="font-bold">
                {isEn ? 'RBAC Policy Restriction Active: ' : 'محدودیت سطح دسترسی RBAC: '}
              </span>
              <span>
                {isEn
                  ? 'Your current simulated identity lacks full backup portal privileges. You can switch to Super Administrator in the simulation dropdown below to test administrative operations.'
                  : 'نقش شبیه‌سازی‌شده جاری شما اختیارات کامل پورتال پشتیبان‌گیری را ندارد. جهت آزمایش و مشاهده عملکرد ادمین، می‌توانید نقش خود را به «مدیر ارشد زیرساخت» تغییر دهید.'}
              </span>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] text-slate-300">{isEn ? 'Switch Role:' : 'تغییر نقش شبیه‌سازی:'}</span>
                <select
                  value={activePolicy.id}
                  onChange={(e) => onSelectSimulatedPolicy(e.target.value)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 border border-white/20 text-white text-[11px] focus:outline-none focus:border-cyan-400"
                >
                  {allPolicies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.canExportBackup ? 'Exp✓' : 'Exp✕'} / {p.canImportBackup ? 'Imp✓' : 'Imp✕'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------
          Live Network Infrastructure Telemetry KPIs
      ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold">{isEn ? 'Managed Devices' : 'تجهیزات فعال شبکه'}</div>
            <div className="text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
              <span>{devices.length}</span>
              <span className="text-[11px] text-blue-400 font-normal">Switch / Router</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold">{isEn ? 'Custom Topology Maps' : 'نقشه‌های شماتیک سفارشی'}</div>
            <div className="text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
              <span>
                {(() => {
                  try {
                    const m = JSON.parse(localStorage.getItem('nettopology_custom_maps_v2') || '[]');
                    return m.length;
                  } catch (e) {
                    return 0;
                  }
                })()}
              </span>
              <span className="text-[11px] text-purple-400 font-normal">Saved Views</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold">{isEn ? 'Access Policies & Users' : 'پالیسی‌های RBAC و کاربران'}</div>
            <div className="text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
              <span>{allPolicies.length}</span>
              <span className="text-[11px] text-indigo-400 font-normal">Active Policies</span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-white/10 flex items-center gap-3">
          <div className={`p-2.5 rounded-lg border ${hasSnapshot ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'}`}>
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold">{isEn ? 'Disaster Recovery Status' : 'آمادگی بازیابی از بحران'}</div>
            <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-1.5">
              {hasSnapshot ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <span>Safety Point Ready</span>
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <span>100% Operational</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          Main 2-Column Grid: Left (Export) / Right (Import & Restore)
      ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* =========================================================
            COLUMN 1: Export Network Backup Package
        ========================================================= */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-indigo-500/25 shadow-xl flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <DownloadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {isEn ? 'Export Network Backup Package' : 'استخراج و ایجاد پکیج پشتیبان (Export Backup)'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isEn
                      ? 'Select backup scope and export signed JSON with optional 256-bit encryption'
                      : 'انتخاب دامنه پشتیبان‌گیری و دانلود فایل با رمزنگاری اختیاری و هش SHA-256'}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${canExport ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                {canExport ? (isEn ? 'Authorized' : 'دارای مجوز') : (isEn ? 'Locked' : 'مسدود')}
              </span>
            </div>

            {/* Scope Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                {isEn ? 'Select Backup Scope:' : 'دامنه اطلاعات پکیج پشتیبان:'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  {
                    id: 'full',
                    title: isEn ? 'Full Disaster Recovery' : 'پکیج جامع فاجعه (Full DR)',
                    desc: isEn ? 'All devices, custom maps, hierarchy, RBAC, users & templates' : 'تمام تجهیزات، نقشه‌ها، سلسله‌مراتب، پالیسی‌ها و کاربران',
                    icon: Database
                  },
                  {
                    id: 'devices_topology',
                    title: isEn ? 'Devices & Topology Maps' : 'نقشه‌ها و موجودی تجهیزات',
                    desc: isEn ? 'Switch inventory, ports, links, coordinates & custom maps' : 'اطلاعات دیوایس‌ها، پورت‌ها، لینک‌ها و نقشه‌های شماتیک',
                    icon: Layers
                  },
                  {
                    id: 'security_rbac',
                    title: isEn ? 'Identity & Access Control' : 'هویت، امنیت و سطوح دسترسی',
                    desc: isEn ? 'Local users, groups, AD config & multi-vendor RBAC policies' : 'کاربران، گروه‌های امنیتی، کانفیگ AD و پالیسی‌های دسترسی',
                    icon: Shield
                  },
                  {
                    id: 'templates_only',
                    title: isEn ? 'Configuration Templates' : 'الگوها و تمپلیت‌های کانفیگ',
                    desc: isEn ? 'CLI templates, automation scripts & variables' : 'الگوهای دستوری سیسکو، میکروتیک و اسکریپت‌های شبکه',
                    icon: FileText
                  }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setExportScope(s.id as BackupScope)}
                    className={`p-3 rounded-xl border text-right transition cursor-pointer flex items-start gap-2.5 ${
                      exportScope === s.id
                        ? 'bg-blue-600/20 border-blue-500/60 text-white shadow-md'
                        : 'bg-slate-800/60 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <s.icon className={`w-4 h-4 mt-0.5 shrink-0 ${exportScope === s.id ? 'text-blue-400' : 'text-slate-500'}`} />
                    <div>
                      <div className="font-bold text-xs">{s.title}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-snug">{s.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Security Options (Sanitization & Passphrase Encryption) */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 space-y-3">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>{isEn ? 'Security Hardening & Privacy Settings' : 'تنظیمات امنیتی و محرمانگی داده‌ها'}</span>
              </div>

              {/* Credential Sanitization Toggle */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sanitizeSecrets}
                  onChange={(e) => setSanitizeSecrets(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-cyan-500 rounded"
                />
                <div>
                  <div className="text-xs font-semibold text-white">
                    {isEn ? 'Sanitize Passwords & Secrets (Auditing Safe)' : 'پاکسازی و ماسک کردن رمزهای عبور و سکرت‌ها'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isEn
                      ? 'Strips AD bind password, device SSH passwords, and community strings before export for safe sharing with auditors.'
                      : 'حذف رمز عبور بایند اکتیو دایرکتوری، کلمات عبور SSH تجهیزات و SNMP Community قبل از خروجی جهت اشتراک‌گذاری امن با حسابرسان.'}
                  </div>
                </div>
              </label>

              {/* Encryption Toggle */}
              <label className="flex items-start gap-2.5 cursor-pointer pt-1 border-t border-white/5">
                <input
                  type="checkbox"
                  checked={encryptExport}
                  onChange={(e) => setEncryptExport(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-indigo-500 rounded"
                />
                <div>
                  <div className="text-xs font-semibold text-white flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isEn ? 'Encrypt Package with AES-GCM 256-bit' : 'رمزنگاری پیشرفته پکیج با کلید AES-GCM (256-bit)'}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {isEn
                      ? 'Derives a key via PBKDF2 from a custom passphrase. The file will be unreadable without this password.'
                      : 'مشتق‌گیری کلید امن از طریق PBKDF2 با ۱۰۰ هزار تکرار. بدون داشتن رمز عبور، محتوای فایل به هیچ عنوان قابل مشاهده نخواهد بود.'}
                  </div>
                </div>
              </label>

              {/* Encryption Passphrase Inputs */}
              {encryptExport && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 animate-fadeIn">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">{isEn ? 'Passphrase' : 'رمز عبور فایل بکاپ:'}</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={exportPassphrase}
                      onChange={(e) => setExportPassphrase(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/20 text-white text-xs focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">{isEn ? 'Confirm Passphrase' : 'تکرار رمز عبور:'}</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassphrase}
                      onChange={(e) => setConfirmPassphrase(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/20 text-white text-xs focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>
              )}

              {/* Optional Custom Note */}
              <div className="pt-2 border-t border-white/5">
                <label className="block text-[11px] text-slate-300 mb-1">{isEn ? 'Backup Memo / Tag (Optional):' : 'یادداشت یا برچسب اختیاری برای بکاپ:'}</label>
                <input
                  type="text"
                  placeholder={isEn ? 'e.g. Pre-migration snapshot core switches' : 'مثال: بکاپ جامع قبل از ارتقای سیستم‌عامل سوئیچ‌های کور'}
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {exportSuccessMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{exportSuccessMsg}</span>
              </div>
            )}
          </div>

          {/* Action Trigger */}
          <div className="pt-3 border-t border-white/10">
            <button
              type="button"
              disabled={!canExport || isExporting}
              onClick={handleExport}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg ${
                canExport
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
              }`}
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isEn ? 'Generating Backup Package...' : 'در حال تولید پکیج پشتیبان و محاسبه هش...'}</span>
                </>
              ) : (
                <>
                  {canExport ? <DownloadCloud className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>
                    {canExport
                      ? isEn
                        ? 'Download Network Backup Package'
                        : 'تولید و دانلود فایل پشتیبان شبکه'
                      : isEn
                      ? 'Export Locked (RBAC Restricted)'
                      : 'قفل امنیتی: نیازمند مجوز Export در پالیسی'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* =========================================================
            COLUMN 2: Import & Restore Network Database
        ========================================================= */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/25 shadow-xl flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {isEn ? 'Import & Restore Network Data' : 'بازیابی و ایمپورت اطلاعات شبکه (Restore)'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isEn
                      ? 'Pre-flight integrity inspection and disaster recovery restoration'
                      : 'بررسی اصالت فایل، پیش‌نمایش محتوا و بازیابی ایمن با نقطه بازگشت خودکار'}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${canImport ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                {canImport ? (isEn ? 'Authorized' : 'دارای مجوز') : (isEn ? 'Locked' : 'مسدود')}
              </span>
            </div>

            {/* Dropzone */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            <div
              onClick={() => {
                if (canImport) fileInputRef.current?.click();
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (canImport && e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              className={`p-5 rounded-xl border-2 border-dashed text-center transition ${
                !canImport
                  ? 'border-white/10 bg-slate-950/40 opacity-60 cursor-not-allowed'
                  : 'border-cyan-500/40 hover:border-cyan-400 bg-slate-950/60 hover:bg-slate-950/90 cursor-pointer'
              }`}
            >
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="p-3 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="font-bold text-xs text-white">
                  {selectedFile
                    ? selectedFile.name
                    : isEn
                    ? 'Click or Drag & Drop Network Backup JSON File'
                    : 'کلیک کنید یا فایل پشتیبان شبکه (.json / .enc.json) را به اینجا بکشید'}
                </div>
                <div className="text-[10px] text-slate-400">
                  {selectedFile
                    ? `${(selectedFile.size / 1024).toFixed(1)} KB - آماده برای بازرسی امنیتی`
                    : isEn
                    ? 'Supported formats: NetTopology Enterprise Backup v1.0'
                    : 'فرمت‌های پشتیبانی شده: پکیج‌های رسمی نت‌توپولوژی نسخه ۱.۰'}
                </div>
              </div>
            </div>

            {/* Inspection & Pre-flight Result */}
            {isAnalyzing && (
              <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10 flex items-center justify-center gap-2 text-xs text-slate-300">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                <span>{isEn ? 'Inspecting integrity and verifying SHA-256 hash...' : 'در حال بررسی ساختار، کلید رمزنگاری و اعتبارسنجی هش SHA-256...'}</span>
              </div>
            )}

            {inspectionResult && (
              <div className="space-y-3 animate-fadeIn">
                {/* Needs Passphrase Prompt */}
                {inspectionResult.isEncrypted && inspectionResult.needsPassphrase && (
                  <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/40 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-300">
                      <Lock className="w-4 h-4" />
                      <span>{isEn ? 'Encrypted Package Detected' : 'این فایل پشتیبان دارای رمزنگاری AES-GCM است'}</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {isEn ? 'Please enter the passphrase used during export to inspect and restore:' : 'جهت رمزگشایی و مشاهده مشخصات فایل، رمز عبور را وارد کنید:'}
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={importPassphrase}
                        onChange={(e) => setImportPassphrase(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-white/20 text-white text-xs focus:outline-none focus:border-indigo-400"
                      />
                      <button
                        type="button"
                        onClick={handleDecryptInspection}
                        className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer transition"
                      >
                        {isEn ? 'Unlock' : 'رمزگشایی'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Box */}
                {!inspectionResult.valid && inspectionResult.error && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 flex items-start gap-2.5 text-xs text-rose-200">
                    <FileX className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">{isEn ? 'Verification Failed' : 'خطای اعتبارسنجی فایل پشتیبان'}</div>
                      <div className="text-[11px] text-rose-300 mt-0.5">{inspectionResult.error}</div>
                    </div>
                  </div>
                )}

                {/* Validated Pre-Flight Summary */}
                {inspectionResult.valid && inspectionResult.metadata && !inspectionResult.needsPassphrase && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                        <FileCheck className="w-4 h-4" />
                        <span>{isEn ? 'Pre-flight Integrity Check Passed' : 'تایید اصالت ساختار و بدون دستکاری (SHA-256 Valid)'}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 font-bold">
                        MATCHED
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] text-slate-300 pt-1">
                      <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5">
                        <span className="text-slate-400 block">{isEn ? 'Created By' : 'تهیه‌کننده:'}</span>
                        <span className="font-bold text-white truncate block">{inspectionResult.metadata.createdBy}</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5">
                        <span className="text-slate-400 block">{isEn ? 'Devices' : 'تعداد تجهیزات:'}</span>
                        <span className="font-bold text-white block">{inspectionResult.metadata.counts.devices} Switch/Router</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5">
                        <span className="text-slate-400 block">{isEn ? 'Custom Maps' : 'نقشه‌ها:'}</span>
                        <span className="font-bold text-white block">{inspectionResult.metadata.counts.customMaps} Maps</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900/60 border border-white/5">
                        <span className="text-slate-400 block">{isEn ? 'Policies' : 'پالیسی‌ها:'}</span>
                        <span className="font-bold text-white block">{inspectionResult.metadata.counts.accessPolicies} RBAC</span>
                      </div>
                    </div>

                    {/* Restore Mode Options */}
                    <div className="pt-2 border-t border-white/10 space-y-2">
                      <label className="block text-xs font-semibold text-slate-200">
                        {isEn ? 'Restore Strategy:' : 'روش اعمال و بازگردانی اطلاعات:'}
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 ${
                          restoreMode === 'overwrite' ? 'bg-amber-500/15 border-amber-500/40 text-amber-200' : 'bg-slate-900/60 border-white/10 text-slate-400'
                        }`}>
                          <input
                            type="radio"
                            name="restoreMode"
                            checked={restoreMode === 'overwrite'}
                            onChange={() => setRestoreMode('overwrite')}
                            className="mt-0.5 accent-amber-500"
                          />
                          <div>
                            <div className="font-bold text-xs text-white">{isEn ? 'Full Overwrite' : 'جایگزینی کامل (Disaster Recovery)'}</div>
                            <div className="text-[10px] text-slate-400 leading-snug">{isEn ? 'Replaces entire existing network state' : 'بازنویسی کلیه تجهیزات، نقشه‌ها و تنظیمات با فایل بکاپ'}</div>
                          </div>
                        </label>

                        <label className={`p-2.5 rounded-xl border cursor-pointer flex items-start gap-2 ${
                          restoreMode === 'merge' ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200' : 'bg-slate-900/60 border-white/10 text-slate-400'
                        }`}>
                          <input
                            type="radio"
                            name="restoreMode"
                            checked={restoreMode === 'merge'}
                            onChange={() => setRestoreMode('merge')}
                            className="mt-0.5 accent-cyan-500"
                          />
                          <div>
                            <div className="font-bold text-xs text-white">{isEn ? 'Smart Merge' : 'ادغام هوشمند (Incremental)'}</div>
                            <div className="text-[10px] text-slate-400 leading-snug">{isEn ? 'Appends new records without deleting current items' : 'افزودن دیوایس‌ها و نقشه‌های جدید بدون پاک کردن موارد فعلی'}</div>
                          </div>
                        </label>
                      </div>

                      {/* Safety confirmation if overwrite */}
                      {restoreMode === 'overwrite' && (
                        <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 space-y-1.5 animate-fadeIn">
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-300 font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{isEn ? 'Confirmation required for full overwrite:' : 'جهت اطمینان، کلمه RESTORE را در کادر زیر وارد کنید:'}</span>
                          </div>
                          <input
                            type="text"
                            placeholder="RESTORE"
                            value={confirmKeyword}
                            onChange={(e) => setConfirmKeyword(e.target.value)}
                            className="w-full px-3 py-1.5 rounded bg-slate-900 border border-amber-500/30 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {restoreResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                restoreResult.success
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-200'
              }`}>
                {restoreResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{restoreResult.message}</div>
                  {restoreResult.details && <div className="text-[11px] text-slate-300 mt-0.5">{restoreResult.details}</div>}
                </div>
              </div>
            )}
          </div>

          {/* Action Trigger */}
          <div className="pt-3 border-t border-white/10 space-y-2">
            <button
              type="button"
              disabled={
                !canImport ||
                isRestoring ||
                !inspectionResult?.valid ||
                inspectionResult?.needsPassphrase ||
                (restoreMode === 'overwrite' && confirmKeyword.trim().toUpperCase() !== 'RESTORE')
              }
              onClick={handleRestore}
              className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg ${
                canImport &&
                inspectionResult?.valid &&
                !inspectionResult?.needsPassphrase &&
                (restoreMode !== 'overwrite' || confirmKeyword.trim().toUpperCase() === 'RESTORE')
                  ? 'bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 hover:from-amber-500 hover:to-rose-500 text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
              }`}
            >
              {isRestoring ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isEn ? 'Restoring Network State & Safety Point...' : 'در حال بازیابی پایگاه داده و ذخیره نقطه بازگشت...'}</span>
                </>
              ) : (
                <>
                  {canImport ? <UploadCloud className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                  <span>
                    {canImport
                      ? isEn
                        ? 'Execute Disaster Recovery Restore'
                        : 'اجرای بازیابی اطلاعات شبکه (Apply Restore)'
                      : isEn
                      ? 'Restore Locked (RBAC Restricted)'
                      : 'قفل امنیتی: نیازمند مجوز Import در پالیسی'}
                  </span>
                </>
              )}
            </button>

            {/* Instant Rollback Button if Safety Snapshot exists */}
            {hasSnapshot && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-amber-200">
                  <RotateCcw className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="font-bold">{isEn ? 'Safety Point Available' : 'نقطه بازگشت امن موجود است:'}</span>
                    <span className="text-[10px] text-slate-400 block">
                      {snapshotMeta ? `${snapshotMeta.createdAt} (${snapshotMeta.counts.devices} تجهیز)` : 'آخرین وضعیت قبل از بازیابی'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!canImport || isRollingBack}
                  onClick={handleRollback}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow"
                >
                  {isRollingBack ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                  <span>{isEn ? 'Rollback Now' : 'بازگشت فوری (Rollback)'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------------
          Section 3: Disaster Recovery Audit Trail & Security Logs
      ------------------------------------------------------------- */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-800 text-indigo-300 border border-white/10">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                {isEn ? 'Disaster Recovery Audit Trail' : 'لاگ رویدادها و ممیزی امنیتی بکاپ (Audit Trail)'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {isEn
                  ? 'Detailed tamper-evident log of all export, import, blocked, and rollback operations'
                  : 'ثبت جامع و ممیزی‌پذیر تمامی رویدادهای تولید پشتیبان، بازیابی، رول‌بک و تلاش‌های مسدود شده توسط RBAC'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
            >
              <option value="all">{isEn ? 'All Actions' : 'تمامی رویدادها'}</option>
              <option value="export">{isEn ? 'Exports Only' : 'فقط استخراج‌ها'}</option>
              <option value="import_success">{isEn ? 'Restores' : 'فقط بازیابی‌ها'}</option>
              <option value="blocked">{isEn ? 'Blocked (RBAC)' : 'مسدودشده‌ها (RBAC)'}</option>
            </select>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('آیا از پاکسازی تاریخچه لاگ‌های بکاپ اطمینان دارید؟')) {
                  clearBackupAuditLogs();
                  refreshAuditLogs();
                }
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
              title={isEn ? 'Clear Audit Logs' : 'پاکسازی لاگ‌ها'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 text-[11px]">
                <th className="pb-2 font-semibold">{isEn ? 'Timestamp' : 'زمان رویداد'}</th>
                <th className="pb-2 font-semibold">{isEn ? 'User & Role' : 'کاربر و پالیسی جاری'}</th>
                <th className="pb-2 font-semibold">{isEn ? 'Action' : 'نوع عملیات'}</th>
                <th className="pb-2 font-semibold">{isEn ? 'Scope' : 'دامنه / فایل'}</th>
                <th className="pb-2 font-semibold">{isEn ? 'Status' : 'وضعیت'}</th>
                <th className="pb-2 font-semibold">{isEn ? 'Checksum (SHA-256)' : 'هش امنیتی SHA-256'}</th>
                <th className="pb-2 font-semibold">{isEn ? 'Details' : 'جزئیات رویداد'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {auditLogs
                .filter((l) => {
                  if (logFilter === 'all') return true;
                  if (logFilter === 'export') return l.action === 'export';
                  if (logFilter === 'import_success') return l.action === 'import_success' || l.action === 'rollback';
                  if (logFilter === 'blocked') return l.action === 'export_blocked' || l.action === 'import_blocked';
                  return true;
                })
                .map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-2.5 font-mono text-[11px] text-slate-300">{log.timestamp}</td>
                    <td className="py-2.5">
                      <div className="font-semibold text-white">{log.username}</div>
                      <div className="text-[10px] text-slate-400">{log.role}</div>
                    </td>
                    <td className="py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.action === 'export'
                          ? 'bg-blue-500/20 text-blue-300'
                          : log.action === 'import_success'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : log.action === 'rollback'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {log.action === 'export'
                          ? 'Export'
                          : log.action === 'import_success'
                          ? 'Restore'
                          : log.action === 'rollback'
                          ? 'Rollback'
                          : 'RBAC Blocked'}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-300 truncate max-w-[140px]">
                      {log.fileName || log.scope}
                    </td>
                    <td className="py-2.5">
                      <span className={`flex items-center gap-1 text-[11px] font-semibold ${
                        log.status === 'success'
                          ? 'text-emerald-400'
                          : log.status === 'warning'
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}>
                        {log.status === 'success' && <CheckCircle2 className="w-3 h-3" />}
                        {log.status === 'warning' && <AlertTriangle className="w-3 h-3" />}
                        {log.status === 'error' && <FileX className="w-3 h-3" />}
                        <span className="capitalize">{log.status}</span>
                      </span>
                    </td>
                    <td className="py-2.5 font-mono text-[10px] text-slate-400">
                      {log.checksum ? `${log.checksum.slice(0, 12)}...` : 'N/A'}
                    </td>
                    <td className="py-2.5 text-slate-300 text-[11px] max-w-xs truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-500 text-xs">
                    {isEn ? 'No audit records logged yet.' : 'هنوز رویدادی ثبت نشده است.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
