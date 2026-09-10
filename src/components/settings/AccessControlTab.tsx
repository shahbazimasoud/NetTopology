import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Users,
  User,
  FolderTree,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  Lock,
  Unlock,
  Terminal,
  Power,
  FileText,
  Sliders,
  CheckSquare,
  Square,
  Sparkles,
  HelpCircle,
  Eye,
  Activity,
  Layers,
  Save,
  Radio,
  Server,
  Cpu,
  Router as RouterIcon,
  Globe,
  Wrench,
  HardDrive,
  Archive,
  DownloadCloud,
  UploadCloud
} from 'lucide-react';
import {
  AccessPolicy,
  DeviceGroup,
  Device,
  ActiveDirectoryConfig,
  LocalUser,
  LocalGroup
} from '../../types';
import {
  loadLocalUsers,
  loadLocalGroups,
  loadSimulatedRoleId,
  saveSimulatedRoleId
} from '../../services/settingsStorage';
import { useLanguage } from '../../i18n';

interface AccessControlTabProps {
  policies: AccessPolicy[];
  groups: DeviceGroup[];
  devices: Device[];
  adConfig: ActiveDirectoryConfig;
  onSavePolicies: (policies: AccessPolicy[]) => void;
  activeSimulatedPolicyId: string;
  onSelectSimulatedPolicy: (id: string) => void;
  localUsers?: LocalUser[];
  localGroups?: LocalGroup[];
}

export const AccessControlTab: React.FC<AccessControlTabProps> = ({
  policies,
  groups,
  devices,
  adConfig,
  onSavePolicies,
  activeSimulatedPolicyId,
  onSelectSimulatedPolicy,
  localUsers = loadLocalUsers(),
  localGroups = loadLocalGroups(),
}) => {
  const { isRtl, isEn } = useLanguage();
  const [editingPolicy, setEditingPolicy] = useState<AccessPolicy | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [vendorFilter, setVendorFilter] = useState<'all' | 'cisco' | 'mikrotik' | 'generic'>('all');

  // Initial template for new policy
  const getBlankPolicy = (): AccessPolicy => ({
    id: `policy-${Date.now().toString(36)}`,
    name: isEn ? 'New Custom Access Policy' : 'پالیسی جدید سطح دسترسی',
    description: isEn ? 'Custom multi-vendor access control rule' : 'قانون دسترسی سفارشی برای تجهیزات چند وندوری شبکه',
    priority: 50,
    subjectType: 'local_group',
    subjectId: localGroups[0]?.id || 'group-helpdesk-ops',
    subjectName: localGroups[0]?.name || 'تیم هلپ‌دسک و پشتیبانی',
    targetScope: 'groups',
    targetGroupIds: [groups[0]?.id || 'group-helpdesk'],
    targetDeviceIds: [],
    // Page modules
    canViewDashboard: true,
    canViewTopology: true,
    canViewDevices: true,
    canViewPorts: true,
    canViewScanner: false,
    canViewTemplates: false,
    canViewSettings: false,
    // Cisco capabilities
    terminalAccess: 'none',
    canToggleAdminStatus: false,
    canChangeVlan: true,
    canEditDescription: true,
    canTogglePortSecurity: true,
    canWriteMemory: false,
    // MikroTik capabilities
    mikrotikTerminalAccess: 'none',
    canMikrotikToggleInterface: false,
    canMikrotikBridgeVlan: true,
    canMikrotikComment: true,
    canMikrotikIpPool: false,
    canMikrotikFirewall: false,
    canMikrotikBackup: false,
    canMikrotikSafeMode: true,
    // Generic / Linux capabilities
    genericTerminalAccess: 'none',
    canGenericToggleLink: false,
    canGenericDiagnostics: true,
    canGenericConfigBackup: false,
    // Global capabilities
    canManageDevices: false,
    canApplyTemplates: false,
    canBatchOperate: false,
    // Backup & Disaster Recovery
    canExportBackup: false,
    canImportBackup: false,
  });

  const handleStartCreate = () => {
    setEditingPolicy(getBlankPolicy());
    setIsCreating(true);
    setVendorFilter('all');
  };

  const handleStartEdit = (policy: AccessPolicy) => {
    setEditingPolicy({ ...policy });
    setIsCreating(false);
    setVendorFilter('all');
  };

  const handleDeletePolicy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (policies.length <= 1) {
      alert(isEn ? 'At least one policy must remain.' : 'حداقل یک سطح دسترسی باید وجود داشته باشد.');
      return;
    }
    const confirmed = window.confirm(
      isEn ? 'Are you sure you want to delete this access policy?' : 'آیا از حذف این پالیسی دسترسی اطمینان دارید؟'
    );
    if (!confirmed) return;

    const updated = policies.filter((p) => p.id !== id);
    onSavePolicies(updated);
    if (activeSimulatedPolicyId === id) {
      onSelectSimulatedPolicy(updated[0]?.id || '');
    }
  };

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPolicy) return;

    let updated: AccessPolicy[];
    if (isCreating) {
      updated = [...policies, editingPolicy];
    } else {
      updated = policies.map((p) => (p.id === editingPolicy.id ? editingPolicy : p));
    }
    onSavePolicies(updated);
    setEditingPolicy(null);
    setIsCreating(false);
  };

  const activePolicyObj = policies.find((p) => p.id === activeSimulatedPolicyId) || policies[0];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Role Simulator Header Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-cyan-900/30 border border-indigo-500/30 shadow-lg backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-inner">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">
                {isEn ? 'Multi-Vendor Granular RBAC Engine' : 'موتور کنترل دسترسی مبتنی بر نقش (RBAC چند وندوری)'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {isEn ? 'Cisco • MikroTik • Linux' : 'سیسکو • میکروتیک • لینوکس'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              {isEn
                ? 'Control exact CLI commands, port states, and modal privileges per vendor across network nodes.'
                : 'مدیریت تفکیک‌شده اختیارات ترمینال، تغییرات پورت، ویلن و کانفیگ برای تجهیزات سیسکو، میکروتیک و لینوکس'}
            </p>
          </div>
        </div>

        {/* Live Simulator Role Selector */}
        <div className="flex items-center gap-2 p-1.5 rounded-xl bg-slate-900/80 border border-white/10 self-start md:self-auto">
          <span className="text-[11px] font-semibold text-amber-300 pl-2 rtl:pr-2 flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>{isEn ? 'Active Test Role:' : 'نقش تستی فعال:'}</span>
          </span>
          <select
            value={activeSimulatedPolicyId}
            onChange={(e) => onSelectSimulatedPolicy(e.target.value)}
            className="px-3 py-1 rounded-lg bg-slate-800 border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.subjectName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Policies List Header & New Policy Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>{isEn ? 'Configured Access Policies' : 'پالیسی‌های دسترسی تعریف‌شده'}</span>
          </h3>
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 border border-white/10 text-slate-300 font-mono">
            {policies.length}
          </span>
        </div>

        <button
          onClick={handleStartCreate}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isEn ? 'Create Access Policy' : 'تعریف پالیسی جدید'}</span>
        </button>
      </div>

      {/* Grid of Policies */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {policies.map((policy) => {
          const isCurrent = policy.id === activeSimulatedPolicyId;

          return (
            <div
              key={policy.id}
              className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                isCurrent
                  ? 'bg-slate-900/90 border-cyan-500/60 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-900/60 border-white/10 hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                      {policy.subjectType === 'ad_group' ? (
                        <Users className="w-4 h-4 text-cyan-400" />
                      ) : policy.subjectType === 'ad_user' ? (
                        <User className="w-4 h-4 text-emerald-400" />
                      ) : policy.subjectType === 'local_group' ? (
                        <FolderTree className="w-4 h-4 text-purple-400" />
                      ) : (
                        <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-white">{policy.name}</h4>
                      <span className="text-[10px] text-cyan-300 font-mono">
                        {policy.subjectName}
                      </span>
                    </div>
                  </div>

                  {isCurrent && (
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-500/40 font-bold">
                      {isEn ? 'ACTIVE' : 'فعال'}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 mt-2 line-clamp-2">{policy.description}</p>

                {/* Target Scope Pill */}
                <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-mono text-slate-300">
                  <FolderTree className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEn ? 'Target:' : 'محدوده:'}</span>
                  {policy.targetScope === 'all' && (
                    <span className="text-emerald-400 font-semibold">{isEn ? 'All Network Devices' : 'تمام تجهیزات شبکه'}</span>
                  )}
                  {policy.targetScope === 'groups' && (
                    <span className="text-amber-300 font-semibold truncate max-w-[180px]">
                      {policy.targetGroupIds.map((gid) => groups.find((g) => g.id === gid)?.name || gid).join(', ')}
                    </span>
                  )}
                  {policy.targetScope === 'specific' && (
                    <span className="text-cyan-300 font-semibold">
                      {policy.targetDeviceIds.length} {isEn ? 'Devices' : 'دستگاه مشخص'}
                    </span>
                  )}
                </div>

                {/* Multi-Vendor Badges */}
                <div className="flex flex-wrap gap-1 mt-2.5 pt-2 border-t border-white/5">
                  {/* Cisco Badge */}
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-500/15 text-blue-300 border border-blue-500/30 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                    <span>Cisco:</span>
                    <span className="font-mono">
                      {policy.canChangeVlan ? 'VLAN ' : ''}
                      {policy.canTogglePortSecurity ? 'Sec ' : ''}
                      {policy.canToggleAdminStatus ? 'Shut ' : ''}
                      {policy.terminalAccess !== 'none' ? 'CLI' : ''}
                      {!policy.canChangeVlan && !policy.canTogglePortSecurity && !policy.canToggleAdminStatus && policy.terminalAccess === 'none' ? 'Restricted' : ''}
                    </span>
                  </span>

                  {/* MikroTik Badge */}
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span>MikroTik:</span>
                    <span className="font-mono">
                      {policy.canMikrotikBridgeVlan ? 'Bridge ' : ''}
                      {policy.canMikrotikToggleInterface ? 'Port ' : ''}
                      {policy.canMikrotikBackup ? 'Backup ' : ''}
                      {policy.mikrotikTerminalAccess && policy.mikrotikTerminalAccess !== 'none' ? 'ROS-CLI' : ''}
                      {!policy.canMikrotikBridgeVlan && !policy.canMikrotikToggleInterface && (!policy.mikrotikTerminalAccess || policy.mikrotikTerminalAccess === 'none') ? 'Restricted' : ''}
                    </span>
                  </span>

                  {/* Generic Badge */}
                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Linux:</span>
                    <span className="font-mono">
                      {policy.canGenericDiagnostics ? 'Diag ' : ''}
                      {policy.canGenericToggleLink ? 'Link ' : ''}
                      {policy.genericTerminalAccess && policy.genericTerminalAccess !== 'none' ? 'Shell' : ''}
                    </span>
                  </span>

                  {/* Backup & DR Badge */}
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold flex items-center gap-1 border ${
                    policy.canImportBackup
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : policy.canExportBackup
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-slate-800 text-slate-500 border-white/5'
                  }`}>
                    <Archive className="w-2.5 h-2.5" />
                    <span>Backup:</span>
                    <span className="font-mono">
                      {policy.canImportBackup ? 'Full (Exp+Imp)' : policy.canExportBackup ? 'Export' : 'Locked'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-2 mt-3 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSelectSimulatedPolicy(policy.id)}
                  className={`text-[11px] font-semibold cursor-pointer transition ${
                    isCurrent ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {isCurrent ? (isEn ? '● Current Test Role' : '● نقش جاری در حال اجرا') : (isEn ? 'Select for Simulation' : 'انتخاب جهت شبیه‌سازی')}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleStartEdit(policy)}
                    className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition cursor-pointer"
                    title={isEn ? 'Edit Policy' : 'ویرایش پالیسی'}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  {policies.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleDeletePolicy(policy.id, e)}
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      title={isEn ? 'Delete Policy' : 'حذف پالیسی'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comprehensive Policy Editor Drawer / Form Modal */}
      {editingPolicy && (
        <div className="p-5 rounded-2xl bg-slate-900/95 border border-indigo-500/40 shadow-2xl space-y-5 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  {isCreating ? (isEn ? 'Create Access Policy' : 'تعریف پالیسی سطح دسترسی جدید') : (isEn ? 'Edit Access Policy' : 'ویرایش پالیسی سطح دسترسی')}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {isEn
                    ? 'Configure permissions across Cisco, MikroTik RouterOS, and Linux systems.'
                    : 'تنظیم جامع اختیارات و محدودیت‌های عملیاتی برای تجهیزات سیسکو، میکروتیک و لینوکس'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditingPolicy(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSavePolicy} className="space-y-5">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isEn ? 'Policy Name' : 'عنوان پالیسی دسترسی (مثال: دسترسی تیم هلپ‌دسک)'}
                </label>
                <input
                  type="text"
                  required
                  value={editingPolicy.name}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {isEn ? 'Description' : 'توضیحات و دامنه اختیارات'}
                </label>
                <input
                  type="text"
                  value={editingPolicy.description}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            {/* Section 1: Subject (Who) */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
              <h4 className="font-bold text-xs text-cyan-300 flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{isEn ? '1. Subject: Who does this policy apply to?' : '۱. هویت و کاربر: این پالیسی به چه کسی یا گروهی اعمال شود؟'}</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">{isEn ? 'Subject Type' : 'نوع هویت'}</label>
                  <select
                    value={editingPolicy.subjectType}
                    onChange={(e) => {
                      const type = e.target.value as any;
                      let defaultId = '';
                      let defaultName = '';
                      if (type === 'ad_group') {
                        defaultId = adConfig.syncedGroups[0]?.dn || 'Helpdesk-Admins';
                        defaultName = adConfig.syncedGroups[0]?.cn || 'Helpdesk-Admins';
                      } else if (type === 'ad_user') {
                        defaultId = adConfig.syncedUsers[0]?.samAccountName || 'a.rezaei';
                        defaultName = adConfig.syncedUsers[0]?.displayName || 'Ali Rezaei';
                      } else if (type === 'local_group') {
                        defaultId = localGroups[0]?.id || 'group-helpdesk-ops';
                        defaultName = localGroups[0]?.name || 'Helpdesk Operators';
                      } else {
                        defaultId = localUsers[0]?.id || 'admin';
                        defaultName = localUsers[0]?.fullName || 'Admin';
                      }
                      setEditingPolicy({
                        ...editingPolicy,
                        subjectType: type,
                        subjectId: defaultId,
                        subjectName: defaultName,
                      });
                    }}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                  >
                    <option value="ad_group">{isEn ? 'Active Directory Group (AD)' : 'گروه امنیتی اکتیو دایرکتوری (AD Group)'}</option>
                    <option value="ad_user">{isEn ? 'Active Directory User (AD)' : 'کاربر خاص اکتیو دایرکتوری (AD User)'}</option>
                    <option value="local_group">{isEn ? 'Local User Group' : 'گروه کاربری محلی سیستم (Local Group)'}</option>
                    <option value="local_user">{isEn ? 'Local User Account' : 'کاربر محلی سیستم (Local User)'}</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-400 mb-1">{isEn ? 'Target Identity' : 'انتخاب هویت دقیق'}</label>
                  {editingPolicy.subjectType === 'ad_group' && (
                    <select
                      value={editingPolicy.subjectId}
                      onChange={(e) => {
                        const grp = adConfig.syncedGroups.find((g) => g.dn === e.target.value);
                        setEditingPolicy({
                          ...editingPolicy,
                          subjectId: e.target.value,
                          subjectName: grp ? `${grp.cn} (اکتیو دایرکتوری)` : e.target.value,
                        });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                    >
                      {adConfig.syncedGroups.map((g) => (
                        <option key={g.dn} value={g.dn}>
                          {g.cn} — {g.description} ({g.memberCount} عضو)
                        </option>
                      ))}
                    </select>
                  )}

                  {editingPolicy.subjectType === 'ad_user' && (
                    <select
                      value={editingPolicy.subjectId}
                      onChange={(e) => {
                        const usr = adConfig.syncedUsers.find((u) => u.samAccountName === e.target.value);
                        setEditingPolicy({
                          ...editingPolicy,
                          subjectId: e.target.value,
                          subjectName: usr ? `${usr.displayName}` : e.target.value,
                        });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                    >
                      {adConfig.syncedUsers.map((u) => (
                        <option key={u.samAccountName} value={u.samAccountName}>
                          {u.displayName} ({u.samAccountName}) - {u.department}
                        </option>
                      ))}
                    </select>
                  )}

                  {editingPolicy.subjectType === 'local_group' && (
                    <select
                      value={editingPolicy.subjectId}
                      onChange={(e) => {
                        const grp = localGroups.find((g) => g.id === e.target.value);
                        setEditingPolicy({
                          ...editingPolicy,
                          subjectId: e.target.value,
                          subjectName: grp ? `${grp.name} (گروه محلی)` : e.target.value,
                        });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                    >
                      {localGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} — ({g.memberUserIds?.length || 0} عضو محلی)
                        </option>
                      ))}
                    </select>
                  )}

                  {editingPolicy.subjectType === 'local_user' && (
                    <select
                      value={editingPolicy.subjectId}
                      onChange={(e) => {
                        const loc = localUsers.find((l) => l.id === e.target.value);
                        setEditingPolicy({
                          ...editingPolicy,
                          subjectId: e.target.value,
                          subjectName: loc ? `${loc.fullName} (کاربر محلی)` : e.target.value,
                        });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                    >
                      {localUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} (@{u.username}) - {u.role || 'User'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Target Scope (Which Devices) */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
              <h4 className="font-bold text-xs text-amber-300 flex items-center gap-2">
                <FolderTree className="w-4 h-4" />
                <span>{isEn ? '2. Device Target Scope: Which devices can they manage?' : '۲. محدوده تجهیزات: این کاربر/گروه به چه دیوایس‌هایی دسترسی دارند؟'}</span>
              </h4>

              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="radio"
                    name="scope"
                    checked={editingPolicy.targetScope === 'all'}
                    onChange={() => setEditingPolicy({ ...editingPolicy, targetScope: 'all' })}
                    className="accent-amber-400"
                  />
                  <span>{isEn ? 'All Network Devices' : 'تمام تجهیزات کل شبکه'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="radio"
                    name="scope"
                    checked={editingPolicy.targetScope === 'groups'}
                    onChange={() => setEditingPolicy({ ...editingPolicy, targetScope: 'groups' })}
                    className="accent-amber-400"
                  />
                  <span>{isEn ? 'Specific Device Groups' : 'گروه‌های تجهیزات خاص (مانند گروه هلپ‌دسک)'}</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                  <input
                    type="radio"
                    name="scope"
                    checked={editingPolicy.targetScope === 'specific'}
                    onChange={() => setEditingPolicy({ ...editingPolicy, targetScope: 'specific' })}
                    className="accent-amber-400"
                  />
                  <span>{isEn ? 'Specific Devices' : 'دیوایس‌های تک به تک'}</span>
                </label>
              </div>

              {/* Group Checkboxes */}
              {editingPolicy.targetScope === 'groups' && (
                <div className="pt-2 flex flex-wrap gap-2">
                  {groups.map((grp) => {
                    const checked = editingPolicy.targetGroupIds.includes(grp.id);
                    return (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => {
                          const newIds = checked
                            ? editingPolicy.targetGroupIds.filter((id) => id !== grp.id)
                            : [...editingPolicy.targetGroupIds, grp.id];
                          setEditingPolicy({ ...editingPolicy, targetGroupIds: newIds });
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition ${
                          checked
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        {checked ? <CheckSquare className="w-3.5 h-3.5 text-amber-400" /> : <Square className="w-3.5 h-3.5" />}
                        <span>{grp.name}</span>
                        <span className="text-[10px] font-mono opacity-80">({grp.deviceIds.length} دیوایس)</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Specific Devices Checkboxes */}
              {editingPolicy.targetScope === 'specific' && (
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {devices.map((dev) => {
                    const checked = editingPolicy.targetDeviceIds.includes(dev.id);
                    return (
                      <button
                        key={dev.id}
                        type="button"
                        onClick={() => {
                          const newIds = checked
                            ? editingPolicy.targetDeviceIds.filter((id) => id !== dev.id)
                            : [...editingPolicy.targetDeviceIds, dev.id];
                          setEditingPolicy({ ...editingPolicy, targetDeviceIds: newIds });
                        }}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs font-mono cursor-pointer text-left rtl:text-right ${
                          checked
                            ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {checked ? <CheckSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> : <Square className="w-3.5 h-3.5 shrink-0" />}
                          <span className="truncate">{dev.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{dev.ip}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 3: Allowed Pages / Views */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
              <h4 className="font-bold text-xs text-indigo-300 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>{isEn ? '3. Page Access: Which modules can they view in the sidebar?' : '۳. دسترسی به صفحات: این کاربر چه بخش‌هایی از نرم‌افزار را ببیند؟'}</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { key: 'canViewDashboard', label: isEn ? 'Dashboard' : 'داشبورد شبکه' },
                  { key: 'canViewTopology', label: isEn ? 'Topology Map' : 'نقشه توپولوژی' },
                  { key: 'canViewDevices', label: isEn ? 'Devices Inventory' : 'لیست تجهیزات' },
                  { key: 'canViewPorts', label: isEn ? 'Ports & VLANs' : 'پورت‌ها و ویلن‌ها' },
                  { key: 'canViewScanner', label: isEn ? 'Discovery Scanner' : 'اسکنر همسایگی' },
                  { key: 'canViewTemplates', label: isEn ? 'Templates' : 'الگوهای کانفیگ' },
                  { key: 'canViewSettings', label: isEn ? 'Settings & Security' : 'تنظیمات و دسترسی' },
                ].map(({ key, label }) => {
                  const checked = (editingPolicy as any)[key];
                  return (
                    <label key={key} className="flex items-center gap-2 p-2 rounded-xl bg-slate-800/80 border border-white/10 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => setEditingPolicy({ ...editingPolicy, [key]: e.target.checked })}
                        className="w-4 h-4 accent-indigo-500 rounded"
                      />
                      <span className="text-slate-200 text-[11px] font-semibold">{label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Section 4: Granular Device Operations (Multi-Vendor Aware) */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <h4 className="font-bold text-xs text-emerald-300 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  <span>
                    {isEn
                      ? '4. Granular Device Capabilities (Multi-Vendor Operations)'
                      : '۴. دسترسی‌های ریز عملیاتی: اختیارات تفکیک‌شده بر اساس وندور (سیسکو، میکروتیک، لینوکس)'}
                  </span>
                </h4>

                {/* Vendor Filter Bar */}
                <div className="flex items-center gap-1 p-1 bg-slate-950/80 rounded-xl border border-white/10 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setVendorFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      vendorFilter === 'all'
                        ? 'bg-slate-700 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isEn ? 'All Vendors' : 'تمامی وندورها'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setVendorFilter('cisco')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      vendorFilter === 'cisco'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-blue-400 hover:bg-blue-500/10'
                    }`}
                  >
                    <Server className="w-3 h-3" />
                    <span>{isEn ? 'Cisco IOS' : 'سیسکو (Cisco)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVendorFilter('mikrotik')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      vendorFilter === 'mikrotik'
                        ? 'bg-rose-600 text-white shadow'
                        : 'text-rose-400 hover:bg-rose-500/10'
                    }`}
                  >
                    <RouterIcon className="w-3 h-3" />
                    <span>{isEn ? 'MikroTik RouterOS' : 'میکروتیک (MikroTik)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVendorFilter('generic')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      vendorFilter === 'generic'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-emerald-400 hover:bg-emerald-500/10'
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    <span>{isEn ? 'Linux / Generic' : 'لینوکس و سرور'}</span>
                  </button>
                </div>
              </div>

              {/* VENDOR 1: CISCO IOS / IOS-XE */}
              {(vendorFilter === 'all' || vendorFilter === 'cisco') && (
                <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-300">
                        <Server className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-blue-300">
                        {isEn ? 'Cisco IOS / IOS-XE Operations' : 'عملیات و اختیارات تخصصی سوئیچ و روترهای سیسکو'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                      Catalyst / Nexus
                    </span>
                  </div>

                  {/* Cisco Terminal Selector */}
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      {isEn ? 'Cisco CLI & Terminal Access:' : 'سطح دسترسی به کنسول و ترمینال سیسکو (CLI Terminal):'}
                    </label>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                        <input
                          type="radio"
                          name="term_cisco"
                          checked={editingPolicy.terminalAccess === 'none'}
                          onChange={() => setEditingPolicy({ ...editingPolicy, terminalAccess: 'none' })}
                          className="accent-rose-500"
                        />
                        <span className="text-rose-300 font-semibold">{isEn ? 'No Access (Hidden)' : 'عدم دسترسی (ترمینال کاملاً مخفی)'}</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                        <input
                          type="radio"
                          name="term_cisco"
                          checked={editingPolicy.terminalAccess === 'view_only'}
                          onChange={() => setEditingPolicy({ ...editingPolicy, terminalAccess: 'view_only' })}
                          className="accent-amber-400"
                        />
                        <span className="text-amber-300 font-semibold">{isEn ? 'View-Only (Read Logs)' : 'فقط مشاهده لاگ‌ها (Read-Only)'}</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                        <input
                          type="radio"
                          name="term_cisco"
                          checked={editingPolicy.terminalAccess === 'full'}
                          onChange={() => setEditingPolicy({ ...editingPolicy, terminalAccess: 'full' })}
                          className="accent-emerald-400"
                        />
                        <span className="text-emerald-300 font-semibold">{isEn ? 'Full Interactive CLI' : 'ترمینال تعاملی کامل (Full Interactive)'}</span>
                      </label>
                    </div>
                  </div>

                  {/* Cisco Granular Checkboxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {[
                      { key: 'canChangeVlan', label: isEn ? 'Assign & Change VLAN' : 'تغییر و تخصیص ویلن (Assign VLAN)', desc: isEn ? 'switchport access vlan' : 'جابجایی پورت بین ویلن‌های دسترسی' },
                      { key: 'canEditDescription', label: isEn ? 'Port Description' : 'تنظیم دیسکریپشن پورت (Description)', desc: isEn ? 'description <text>' : 'ثبت برچسب و توضیحات پورت' },
                      { key: 'canTogglePortSecurity', label: isEn ? 'Port Security & MAC' : 'کنترل پورت‌سکیوریتی (Port Security)', desc: isEn ? 'switchport port-security' : 'تنظیم محدودیت مک و رفتارهای Violation' },
                      { key: 'canToggleAdminStatus', label: isEn ? 'Shutdown / No Shutdown' : 'خاموش/روشن کردن پورت فیزیکی', desc: isEn ? 'shutdown / no shutdown' : 'قطع فیزیکی سیگنال پورت سوئیچ' },
                      { key: 'canWriteMemory', label: isEn ? 'Write Memory (NVRAM)' : 'ذخیره پایدار (copy run start)', desc: isEn ? 'write memory / NVRAM' : 'ذخیره کانفیگ در استارتاپ دیوایس' },
                      { key: 'canBatchOperate', label: isEn ? 'Batch Multi-Port Ops' : 'عملیات دسته‌جمعی پورت‌ها (Batch Range)', desc: isEn ? 'interface range ...' : 'اعمال همزمان تغییر روی چندین پورت' },
                    ].map(({ key, label, desc }) => {
                      const checked = (editingPolicy as any)[key];
                      return (
                        <label
                          key={key}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                            checked
                              ? 'bg-blue-500/15 border-blue-500/40 text-blue-200'
                              : 'bg-slate-900/60 border-white/10 text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setEditingPolicy({ ...editingPolicy, [key]: e.target.checked })}
                            className="w-4 h-4 mt-0.5 accent-blue-500 rounded"
                          />
                          <div>
                            <div className="font-bold text-xs text-white">{label}</div>
                            <div className="text-[10px] text-slate-400">{desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VENDOR 2: MIKROTIK ROUTEROS */}
              {(vendorFilter === 'all' || vendorFilter === 'mikrotik') && (
                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300">
                        <RouterIcon className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-rose-300">
                        {isEn ? 'MikroTik RouterOS Operations' : 'عملیات و اختیارات تخصصی روتربورد و سوئیچ‌های میکروتیک'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                      CCR / CRS / RouterBOARD
                    </span>
                  </div>

                  {/* MikroTik Terminal Selector */}
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      {isEn ? 'MikroTik RouterOS Terminal Access:' : 'سطح دسترسی به کنسول و خط فرمان RouterOS:'}
                    </label>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                        <input
                          type="radio"
                          name="term_mikrotik"
                          checked={(editingPolicy.mikrotikTerminalAccess || 'none') === 'none'}
                          onChange={() => setEditingPolicy({ ...editingPolicy, mikrotikTerminalAccess: 'none' })}
                          className="accent-rose-500"
                        />
                        <span className="text-rose-300 font-semibold">{isEn ? 'No Access' : 'عدم دسترسی (مخفی)'}</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                        <input
                          type="radio"
                          name="term_mikrotik"
                          checked={editingPolicy.mikrotikTerminalAccess === 'view_only'}
                          onChange={() => setEditingPolicy({ ...editingPolicy, mikrotikTerminalAccess: 'view_only' })}
                          className="accent-amber-400"
                        />
                        <span className="text-amber-300 font-semibold">{isEn ? 'View-Only (Read Logs)' : 'فقط مشاهده لاگ و وضعیت'}</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                        <input
                          type="radio"
                          name="term_mikrotik"
                          checked={editingPolicy.mikrotikTerminalAccess === 'full'}
                          onChange={() => setEditingPolicy({ ...editingPolicy, mikrotikTerminalAccess: 'full' })}
                          className="accent-rose-400"
                        />
                        <span className="text-rose-300 font-semibold">{isEn ? 'Full Interactive RouterOS' : 'ترمینال کامل RouterOS'}</span>
                      </label>
                    </div>
                  </div>

                  {/* MikroTik Granular Checkboxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {[
                      {
                        key: 'canMikrotikToggleInterface',
                        label: isEn ? 'Enable / Disable Interface' : 'فعال/غیرفعال کردن اینترفیس میکروتیک',
                        desc: isEn ? '/interface/set disabled=yes|no' : 'قطع و وصل پورت‌های ether, sfp, bonding',
                      },
                      {
                        key: 'canMikrotikBridgeVlan',
                        label: isEn ? 'Bridge VLAN & PVID' : 'مدیریت Bridge VLAN Filtering و PVID',
                        desc: isEn ? '/interface/bridge/vlan' : 'تغییر پورت‌های Tagged / Untagged در بریج',
                      },
                      {
                        key: 'canMikrotikComment',
                        label: isEn ? 'Interface Comment' : 'تنظیم کامنت روی پورت‌ها و رول‌ها',
                        desc: isEn ? '/interface/set comment=...' : 'درج توضیحات روی اجزای RouterOS',
                      },
                      {
                        key: 'canMikrotikIpPool',
                        label: isEn ? 'IP Address & Pools' : 'مدیریت آدرس‌های IP و DHCP Pool',
                        desc: isEn ? '/ip/address & /ip/pool' : 'تخصیص IP به پورت‌ها و تنظیم رنج‌های کلاینت',
                      },
                      {
                        key: 'canMikrotikFirewall',
                        label: isEn ? 'Firewall & NAT Rules' : 'بازرسی و تغییر رول‌های Firewall / NAT',
                        desc: isEn ? '/ip/firewall/filter & nat' : 'مشاهده و ویرایش قوانین امنیت و مسکرید',
                      },
                      {
                        key: 'canMikrotikBackup',
                        label: isEn ? 'System Backup & Export' : 'تهیه فایل پشتیبان و اکسپورت کانفیگ',
                        desc: isEn ? '/export & /system/backup' : 'دریافت خروجی اسکریپت .rsc و بکاپ باینری',
                      },
                      {
                        key: 'canMikrotikSafeMode',
                        label: isEn ? 'Safe Mode Protection' : 'پشتیبانی از Safe-Mode در تغییرات',
                        desc: isEn ? 'Auto-rollback on disconnect' : 'بازگشت خودکار تنظیمات در صورت قطعی اتصال',
                      },
                    ].map(({ key, label, desc }) => {
                      const checked = (editingPolicy as any)[key] || false;
                      return (
                        <label
                          key={key}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                            checked
                              ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                              : 'bg-slate-900/60 border-white/10 text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setEditingPolicy({ ...editingPolicy, [key]: e.target.checked })}
                            className="w-4 h-4 mt-0.5 accent-rose-500 rounded"
                          />
                          <div>
                            <div className="font-bold text-xs text-white">{label}</div>
                            <div className="text-[10px] text-slate-400">{desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VENDOR 3: LINUX & GENERIC */}
              {(vendorFilter === 'all' || vendorFilter === 'generic') && (
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
                        <Globe className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-xs text-emerald-300">
                        {isEn ? 'Linux Servers & Generic Appliances' : 'اختیارات سرورهای لینوکسی و تجهیزات جنریک'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      VyOS / Ubuntu / OpenWrt
                    </span>
                  </div>

                  {/* Generic Terminal Selector */}
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      {isEn ? 'SSH & Shell Terminal Access:' : 'سطح دسترسی به شل و ترمینال SSH:'}
                    </label>
                    <div className="flex flex-wrap gap-4 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                        <input
                          type="radio"
                          name="term_generic"
                          checked={(editingPolicy.genericTerminalAccess || 'none') === 'none'}
                          onChange={() => setEditingPolicy({ ...editingPolicy, genericTerminalAccess: 'none' })}
                          className="accent-rose-500"
                        />
                        <span className="text-rose-300 font-semibold">{isEn ? 'No Access' : 'عدم دسترسی'}</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                        <input
                          type="radio"
                          name="term_generic"
                          checked={editingPolicy.genericTerminalAccess === 'view_only'}
                          onChange={() => setEditingPolicy({ ...editingPolicy, genericTerminalAccess: 'view_only' })}
                          className="accent-amber-400"
                        />
                        <span className="text-amber-300 font-semibold">{isEn ? 'View-Only (Logs & Status)' : 'مشاهده لاگ‌ها'}</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                        <input
                          type="radio"
                          name="term_generic"
                          checked={editingPolicy.genericTerminalAccess === 'full'}
                          onChange={() => setEditingPolicy({ ...editingPolicy, genericTerminalAccess: 'full' })}
                          className="accent-emerald-400"
                        />
                        <span className="text-emerald-300 font-semibold">{isEn ? 'Full Interactive Shell' : 'شل کامل تعاملی'}</span>
                      </label>
                    </div>
                  </div>

                  {/* Generic Checkboxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {[
                      {
                        key: 'canGenericToggleLink',
                        label: isEn ? 'Toggle Interface State' : 'تغییر وضعیت اینترفیس (Link Up/Down)',
                        desc: isEn ? 'ip link set dev up/down' : 'فعال یا خاموش کردن کارت‌های شبکه لینوکس',
                      },
                      {
                        key: 'canGenericDiagnostics',
                        label: isEn ? 'Diagnostics & Packet Probe' : 'ابزارهای عیب‌یابی (Ping / Trace / Capture)',
                        desc: isEn ? 'ping, traceroute, mtr' : 'تست ارتباط، مسیر و مانیتور بسته‌ها',
                      },
                      {
                        key: 'canGenericConfigBackup',
                        label: isEn ? 'Config Snapshot & Archive' : 'تهیه اسنپ‌شات و بکاپ از فایل‌های کانفیگ',
                        desc: isEn ? 'Archive system config files' : 'پشتیبان‌گیری از تنظیمات سرور و سرویس‌ها',
                      },
                    ].map(({ key, label, desc }) => {
                      const checked = (editingPolicy as any)[key] || false;
                      return (
                        <label
                          key={key}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                            checked
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                              : 'bg-slate-900/60 border-white/10 text-slate-400'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setEditingPolicy({ ...editingPolicy, [key]: e.target.checked })}
                            className="w-4 h-4 mt-0.5 accent-emerald-500 rounded"
                          />
                          <div>
                            <div className="font-bold text-xs text-white">{label}</div>
                            <div className="text-[10px] text-slate-400">{desc}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* GLOBAL PLATFORM CAPABILITIES */}
              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs text-purple-300">
                      {isEn ? 'Global Platform Management' : 'مدیریت کلان تجهیزات و الگوهای سیستمی'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      key: 'canManageDevices',
                      label: isEn ? 'Add / Edit / Delete Devices' : 'تعریف، ویرایش و حذف فیزیکی تجهیزات (CRUD)',
                      desc: isEn ? 'Manage network inventory topology' : 'امکان افزودن یا حذف سوئیچ و روتر در سامانه',
                    },
                    {
                      key: 'canApplyTemplates',
                      label: isEn ? 'Apply Configuration Templates' : 'اعمال الگوها و اسکریپت‌های کانفیگ (Templates)',
                      desc: isEn ? 'Push templated CLI batches to devices' : 'امکان اعمال اسکریپت‌های گروهی سیسکو و میکروتیک',
                    },
                  ].map(({ key, label, desc }) => {
                    const checked = (editingPolicy as any)[key];
                    return (
                      <label
                        key={key}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                          checked
                            ? 'bg-purple-500/15 border-purple-500/40 text-purple-200'
                            : 'bg-slate-900/60 border-white/10 text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setEditingPolicy({ ...editingPolicy, [key]: e.target.checked })}
                          className="w-4 h-4 mt-0.5 accent-purple-500 rounded"
                        />
                        <div>
                          <div className="font-bold text-xs text-white">{label}</div>
                          <div className="text-[10px] text-slate-400">{desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 5. Backup Portal & Disaster Recovery Governance */}
              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
                      <Archive className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-cyan-300">
                        {isEn ? '5. Backup & Disaster Recovery Portal Operations' : '۵. پشتیبان‌گیری، استخراج و بازیابی کلان شبکه (Backup Portal)'}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {isEn
                          ? 'Control access to generating snapshots, exporting encrypted backups, and overwriting network state.'
                          : 'تعیین سطح دسترسی کاربر یا گروه به دانلود فایل‌های پشتیبان و بازیابی و بازنویسی پایگاه داده'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      key: 'canExportBackup',
                      label: isEn ? 'Export Network Backup Package' : 'تولید و دانلود فایل پشتیبان (Export Backup)',
                      desc: isEn ? 'Generate and export full/partial network state packages' : 'امکان تولید و دانلود پکیج پشتیبان شامل نقشه‌ها، دیوایس‌ها و RBAC',
                      risk: 'normal',
                      icon: DownloadCloud
                    },
                    {
                      key: 'canImportBackup',
                      label: isEn ? 'Import & Restore Network Data' : 'بازیابی و بازنویسی دیتابیس (Restore / Import)',
                      desc: isEn ? 'High Risk: Overwrite or merge devices, topology maps, and policies' : '⚠️ عملیات فوق بحرانی: بازنویسی، ایمپورت و جایگزینی کامل اطلاعات سامانه',
                      risk: 'high',
                      icon: UploadCloud
                    },
                  ].map(({ key, label, desc, risk, icon: Icon }) => {
                    const checked = (editingPolicy as any)[key];
                    return (
                      <label
                        key={key}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                          checked
                            ? risk === 'high'
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                              : 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                            : 'bg-slate-900/60 border-white/10 text-slate-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setEditingPolicy({ ...editingPolicy, [key]: e.target.checked })}
                          className={`w-4 h-4 mt-0.5 rounded ${risk === 'high' ? 'accent-amber-500' : 'accent-cyan-500'}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="font-bold text-xs text-white flex items-center gap-1.5">
                              <Icon className="w-3 h-3 text-slate-400" />
                              <span>{label}</span>
                            </div>
                            {risk === 'high' && (
                              <span className="px-1.5 py-0.5 rounded text-[8px] bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                                {isEn ? 'HIGH RISK' : 'بحرانی'}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{desc}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditingPolicy(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs transition cursor-pointer"
              >
                {isEn ? 'Cancel' : 'انصراف'}
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isEn ? 'Save Access Policy' : 'ذخیره پالیسی سطح دسترسی'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
