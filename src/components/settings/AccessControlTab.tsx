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
  Radio
} from 'lucide-react';
import {
  AccessPolicy,
  DeviceGroup,
  Device,
  ActiveDirectoryConfig,
  LocalUser
} from '../../types';
import { LOCAL_USERS, loadSimulatedRoleId, saveSimulatedRoleId } from '../../services/settingsStorage';
import { useLanguage } from '../../i18n';

interface AccessControlTabProps {
  policies: AccessPolicy[];
  groups: DeviceGroup[];
  devices: Device[];
  adConfig: ActiveDirectoryConfig;
  onSavePolicies: (policies: AccessPolicy[]) => void;
  activeSimulatedPolicyId: string;
  onSelectSimulatedPolicy: (id: string) => void;
}

export const AccessControlTab: React.FC<AccessControlTabProps> = ({
  policies,
  groups,
  devices,
  adConfig,
  onSavePolicies,
  activeSimulatedPolicyId,
  onSelectSimulatedPolicy,
}) => {
  const { isRtl, isEn } = useLanguage();
  const [editingPolicy, setEditingPolicy] = useState<AccessPolicy | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Initial template for new policy
  const getBlankPolicy = (): AccessPolicy => ({
    id: `policy-${Date.now().toString(36)}`,
    name: isEn ? 'New Custom Access Policy' : 'پالیسی جدید سطح دسترسی',
    description: isEn ? 'Custom access control rule' : 'قانون دسترسی سفارشی سازمانی',
    priority: 50,
    subjectType: 'ad_group',
    subjectId: adConfig.syncedGroups[0]?.dn || 'Helpdesk-Admins',
    subjectName: adConfig.syncedGroups[0]?.cn || 'Helpdesk-Admins',
    targetScope: 'groups',
    targetGroupIds: [groups[0]?.id || 'group-helpdesk'],
    targetDeviceIds: [],
    canViewDashboard: true,
    canViewTopology: true,
    canViewDevices: true,
    canViewPorts: true,
    canViewScanner: false,
    canViewTemplates: false,
    canViewSettings: false,
    terminalAccess: 'none',
    canToggleAdminStatus: false,
    canChangeVlan: true,
    canEditDescription: true,
    canTogglePortSecurity: true,
    canWriteMemory: false,
    canManageDevices: false,
    canApplyTemplates: false,
    canBatchOperate: false,
  });

  const handleStartCreate = () => {
    setEditingPolicy(getBlankPolicy());
    setIsCreating(true);
  };

  const handleStartEdit = (policy: AccessPolicy) => {
    setEditingPolicy({ ...policy });
    setIsCreating(false);
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
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900/80 to-purple-950/70 border border-indigo-500/30 backdrop-blur-md shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300">
              <ShieldCheck className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs sm:text-sm text-white">
                  {isEn ? 'Live RBAC Simulator / Active Role Testing:' : 'شبیه‌ساز و تست زنده سطوح دسترسی (RBAC Simulator):'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-500/40">
                  {activePolicyObj?.name}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {isEn
                  ? 'Switch simulated role to verify how navigation pages, terminal consoles, and port controls adapt.'
                  : 'با تغییر نقش جاری، بررسی کنید که صفحات و منوهای پورت سکیوریتی، ترمینال و تغییر ویلن چگونه محدود یا مجاز می‌شوند.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-300 font-semibold">{isEn ? 'Active Test Profile:' : 'نقش فعال:'}</span>
            <select
              value={activeSimulatedPolicyId}
              onChange={(e) => onSelectSimulatedPolicy(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-indigo-500/40 text-cyan-300 font-bold text-xs focus:outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
            >
              {policies.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Capabilities Summary for Active Simulated Profile */}
        <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-[10px] font-mono">
          <div className={`p-2 rounded-lg border ${activePolicyObj?.canChangeVlan ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
            <span>{isEn ? 'Change VLAN' : 'تغییر ویلن'}</span>: {activePolicyObj?.canChangeVlan ? '✓' : '✗'}
          </div>
          <div className={`p-2 rounded-lg border ${activePolicyObj?.canEditDescription ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
            <span>{isEn ? 'Port Desc' : 'توضیحات پورت'}</span>: {activePolicyObj?.canEditDescription ? '✓' : '✗'}
          </div>
          <div className={`p-2 rounded-lg border ${activePolicyObj?.canTogglePortSecurity ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
            <span>{isEn ? 'Port Security' : 'پورت سکیوریتی'}</span>: {activePolicyObj?.canTogglePortSecurity ? '✓' : '✗'}
          </div>
          <div className={`p-2 rounded-lg border ${activePolicyObj?.terminalAccess !== 'none' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
            <span>{isEn ? 'CLI Terminal' : 'کنسول CLI'}</span>: {activePolicyObj?.terminalAccess}
          </div>
          <div className={`p-2 rounded-lg border ${activePolicyObj?.canToggleAdminStatus ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
            <span>{isEn ? 'Port Shutdown' : 'خاموشی پورت'}</span>: {activePolicyObj?.canToggleAdminStatus ? '✓' : '✗'}
          </div>
          <div className={`p-2 rounded-lg border ${activePolicyObj?.canWriteMemory ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
            <span>{isEn ? 'Write Memory' : 'ذخیره کانفیگ'}</span>: {activePolicyObj?.canWriteMemory ? '✓' : '✗'}
          </div>
          <div className={`p-2 rounded-lg border ${activePolicyObj?.canManageDevices ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
            <span>{isEn ? 'Manage Devs' : 'مدیریت تجهیز'}</span>: {activePolicyObj?.canManageDevices ? '✓' : '✗'}
          </div>
          <div className={`p-2 rounded-lg border ${activePolicyObj?.canApplyTemplates ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
            <span>{isEn ? 'Templates' : 'اعمال الگو'}</span>: {activePolicyObj?.canApplyTemplates ? '✓' : '✗'}
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span>{isEn ? 'Configured Access Policies' : 'پالیسی‌های تعریف‌شده سطح دسترسی (RBAC Policies)'}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
            {policies.length}
          </span>
        </h3>

        <button
          onClick={handleStartCreate}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{isEn ? 'Add Access Policy' : 'تعریف پالیسی جدید'}</span>
        </button>
      </div>

      {/* Policy List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {policies.map((policy) => {
          const isCurrent = policy.id === activeSimulatedPolicyId;
          return (
            <div
              key={policy.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                isCurrent
                  ? 'bg-indigo-950/40 border-indigo-400 ring-2 ring-indigo-500/30 shadow-lg'
                  : 'bg-white/[0.02] border-white/10 hover:border-white/20'
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
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-500/40">
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
                    <span className="text-amber-300 font-semibold">
                      {policy.targetGroupIds.map((gid) => groups.find((g) => g.id === gid)?.name || gid).join(', ')}
                    </span>
                  )}
                  {policy.targetScope === 'specific' && (
                    <span className="text-cyan-300 font-semibold">
                      {policy.targetDeviceIds.length} {isEn ? 'Devices' : 'دستگاه مشخص'}
                    </span>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
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
                    onClick={() => handleStartEdit(policy)}
                    className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition cursor-pointer"
                    title={isEn ? 'Edit Policy' : 'ویرایش پالیسی'}
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  {policies.length > 1 && (
                    <button
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
              <h3 className="font-bold text-sm text-white">
                {isCreating ? (isEn ? 'Create Access Policy' : 'تعریف پالیسی سطح دسترسی جدید') : (isEn ? 'Edit Access Policy' : 'ویرایش پالیسی سطح دسترسی')}
              </h3>
            </div>
            <button
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
                      } else {
                        defaultId = LOCAL_USERS[0]?.id || 'admin';
                        defaultName = LOCAL_USERS[0]?.fullName || 'Admin';
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
                    <option value="ad_group">{isEn ? 'Active Directory Group' : 'گروه امنیتی اکتیو دایرکتوری (AD Group)'}</option>
                    <option value="ad_user">{isEn ? 'Active Directory User' : 'کاربر خاص اکتیو دایرکتوری (AD User)'}</option>
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

                  {editingPolicy.subjectType === 'local_user' && (
                    <select
                      value={editingPolicy.subjectId}
                      onChange={(e) => {
                        const loc = LOCAL_USERS.find((l) => l.id === e.target.value);
                        setEditingPolicy({
                          ...editingPolicy,
                          subjectId: e.target.value,
                          subjectName: loc ? loc.fullName : e.target.value,
                        });
                      }}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-800 border border-white/15 text-white text-xs focus:outline-none focus:border-cyan-400"
                    >
                      {LOCAL_USERS.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.username})
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
                  <span>{isEn ? 'Specific Device Groups (e.g. Helpdesk)' : 'گروه‌های تجهیزات خاص (مانند گروه هلپ‌دسک)'}</span>
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

            {/* Section 4: Granular Device Operations */}
            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-3">
              <h4 className="font-bold text-xs text-emerald-300 flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                <span>{isEn ? '4. Granular Device Capabilities: What operations can they perform?' : '۴. دسترسی‌های ریز عملیاتی: کاربر چه کارهایی روی مودال‌ها و پورت‌های دیوایس بتواند بکند؟'}</span>
              </h4>

              {/* Terminal Mode Selector */}
              <div className="p-2.5 rounded-xl bg-slate-800 border border-white/10 space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  {isEn ? 'Cisco Console & Terminal Access:' : 'سطح دسترسی به ترمینال و خط فرمان سیسکو (CLI Terminal):'}
                </label>
                <div className="flex flex-wrap gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="radio"
                      name="term"
                      checked={editingPolicy.terminalAccess === 'none'}
                      onChange={() => setEditingPolicy({ ...editingPolicy, terminalAccess: 'none' })}
                      className="accent-rose-500"
                    />
                    <span className="text-rose-300 font-semibold">{isEn ? 'No Access (Hidden)' : 'عدم دسترسی (ترمینال کاملاً مخفی)'}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="radio"
                      name="term"
                      checked={editingPolicy.terminalAccess === 'view_only'}
                      onChange={() => setEditingPolicy({ ...editingPolicy, terminalAccess: 'view_only' })}
                      className="accent-amber-400"
                    />
                    <span className="text-amber-300 font-semibold">{isEn ? 'View-Only (Read Logs)' : 'فقط مشاهده خروجی‌ها و لاگ‌ها (Read-Only)'}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="radio"
                      name="term"
                      checked={editingPolicy.terminalAccess === 'full'}
                      onChange={() => setEditingPolicy({ ...editingPolicy, terminalAccess: 'full' })}
                      className="accent-emerald-400"
                    />
                    <span className="text-emerald-300 font-semibold">{isEn ? 'Full Interactive CLI' : 'ترمینال تعاملی کامل (Full Interactive)'}</span>
                  </label>
                </div>
              </div>

              {/* Operation Switches */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[
                  { key: 'canChangeVlan', label: isEn ? 'Assign & Change VLAN' : 'تغییر و تخصیص ویلن پورت (Assign VLAN)', desc: isEn ? 'Allow moving port between access VLANs' : 'امکان جابجایی پورت بین ویلن‌های مختلف' },
                  { key: 'canEditDescription', label: isEn ? 'Set Port Description' : 'تنظیم توضیحات پورت (Port Description)', desc: isEn ? 'Allow updating Cisco interface description' : 'امکان ثبت یا تغییر دیسکریپشن پورت' },
                  { key: 'canTogglePortSecurity', label: isEn ? 'Port Security Control' : 'کنترل پورت سکیوریتی (Port Security)', desc: isEn ? 'Allow configuring MAC security & sticky violations' : 'امکان فعال/غیرفعال‌سازی پورت‌سکیوریتی و مک' },
                  { key: 'canToggleAdminStatus', label: isEn ? 'Port Shutdown / No Shutdown' : 'خاموش/روشن کردن پورت (Shutdown)', desc: isEn ? 'Allow disabling physical interface' : 'امکان قطع کامل پورت (برای ادمین‌های ارشد)' },
                  { key: 'canWriteMemory', label: isEn ? 'Save Configuration (Write Mem)' : 'ذخیره در NVRAM (Write Memory)', desc: isEn ? 'Allow executing copy run start' : 'امکان ذخیره پایدار کانفیگ در حافظه' },
                  { key: 'canBatchOperate', label: isEn ? 'Batch Multi-Port Operations' : 'عملیات گروهی روی پورت‌ها (Batch Ops)', desc: isEn ? 'Allow mass VLAN and shutdown across multiple ports' : 'امکان اعمال تغییر همزمان روی چندین پورت' },
                  { key: 'canManageDevices', label: isEn ? 'Add / Edit / Delete Device' : 'مدیریت فیزیکی تجهیزات (CRUD)', desc: isEn ? 'Allow creating, modifying, and deleting switches' : 'امکان تعریف یا حذف فیزیکی دیوایس در سامانه' },
                  { key: 'canApplyTemplates', label: isEn ? 'Apply CLI Templates' : 'اعمال الگوهای کانفیگ (Templates)', desc: isEn ? 'Allow pushing scripted configurations' : 'امکان اعمال اسکریپت و الگوهای آماده سیسکو' },
                ].map(({ key, label, desc }) => {
                  const checked = (editingPolicy as any)[key];
                  return (
                    <label
                      key={key}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                        checked ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200' : 'bg-slate-800/60 border-white/10 text-slate-400'
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
