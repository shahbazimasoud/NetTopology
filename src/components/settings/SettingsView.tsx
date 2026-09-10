import React, { useState, useEffect } from 'react';
import {
  Settings,
  FolderTree,
  Server,
  ShieldCheck,
  Users,
  ChevronRight,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Archive
} from 'lucide-react';
import {
  Device,
  DeviceGroup,
  ActiveDirectoryConfig,
  AccessPolicy,
  LocalUser,
  LocalGroup
} from '../../types';
import {
  loadDeviceGroups,
  saveDeviceGroups,
  loadActiveDirectoryConfig,
  saveActiveDirectoryConfig,
  loadAccessPolicies,
  saveAccessPolicies,
  loadSimulatedRoleId,
  saveSimulatedRoleId,
  loadLocalUsers,
  saveLocalUsers,
  loadLocalGroups,
  saveLocalGroups
} from '../../services/settingsStorage';
import { DeviceGroupingTab } from './DeviceGroupingTab';
import { ActiveDirectoryTab } from './ActiveDirectoryTab';
import { AccessControlTab } from './AccessControlTab';
import { LocalUsersTab } from './LocalUsersTab';
import { BackupPortalTab } from './BackupPortalTab';
import { useLanguage } from '../../i18n';

export type SettingsSubTab = 'groups' | 'users' | 'ad' | 'rbac' | 'backup';

interface SettingsViewProps {
  devices: Device[];
  onUpdateDeviceGroups?: (groups: DeviceGroup[]) => void;
  activeSubTab?: SettingsSubTab;
  onSelectSubTab?: (subTab: SettingsSubTab) => void;
  onRefreshAllData?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  devices,
  onUpdateDeviceGroups,
  activeSubTab: externalSubTab,
  onSelectSubTab,
  onRefreshAllData
}) => {
  const { isRtl, isEn } = useLanguage();
  const [internalTab, setInternalTab] = useState<SettingsSubTab>(externalSubTab || 'groups');

  useEffect(() => {
    if (externalSubTab && externalSubTab !== internalTab) {
      setInternalTab(externalSubTab);
    }
  }, [externalSubTab]);

  const activeTab = externalSubTab || internalTab;

  const handleSwitchTab = (tab: SettingsSubTab) => {
    setInternalTab(tab);
    if (onSelectSubTab) {
      onSelectSubTab(tab);
    }
  };

  // Master State loaded from storage service
  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>(() => loadDeviceGroups());
  const [adConfig, setAdConfig] = useState<ActiveDirectoryConfig>(() => loadActiveDirectoryConfig());
  const [policies, setPolicies] = useState<AccessPolicy[]>(() => loadAccessPolicies());
  const [simulatedRoleId, setSimulatedRoleId] = useState<string>(() => loadSimulatedRoleId());
  const [localUsers, setLocalUsers] = useState<LocalUser[]>(() => loadLocalUsers());
  const [localGroups, setLocalGroups] = useState<LocalGroup[]>(() => loadLocalGroups());

  const handleSaveDeviceGroups = (newGroups: DeviceGroup[]) => {
    setDeviceGroups(newGroups);
    saveDeviceGroups(newGroups);
    if (onUpdateDeviceGroups) {
      onUpdateDeviceGroups(newGroups);
    }
  };

  const handleSaveAdConfig = (newConfig: ActiveDirectoryConfig) => {
    setAdConfig(newConfig);
    saveActiveDirectoryConfig(newConfig);
  };

  const handleSavePolicies = (newPolicies: AccessPolicy[]) => {
    setPolicies(newPolicies);
    saveAccessPolicies(newPolicies);
  };

  const handleSelectSimulatedPolicy = (id: string) => {
    setSimulatedRoleId(id);
    saveSimulatedRoleId(id);
  };

  const handleSaveLocalUsers = (newUsers: LocalUser[]) => {
    setLocalUsers(newUsers);
    saveLocalUsers(newUsers);
  };

  const handleSaveLocalGroups = (newGroups: LocalGroup[]) => {
    setLocalGroups(newGroups);
    saveLocalGroups(newGroups);
  };

  const activePolicy = policies.find((p) => p.id === simulatedRoleId) || policies[0];

  // Dynamic header meta per sub-section
  const subMenuMeta = {
    groups: {
      title: isEn ? 'Device Grouping & Network Zones' : 'گروه‌بندی تجهیزات شبکه (Device Groups)',
      desc: isEn
        ? 'Organize switches and routers into operational groups and zones for scoped RBAC policies.'
        : 'دسته‌بندی منطقی سوئیچ‌ها و روترها به گروه‌های کاری (نظیر Access, Core, Helpdesk) جهت اعمال پالیسی‌های تفکیک‌شده.',
      icon: FolderTree,
      badge: `${deviceGroups.length} ${isEn ? 'Groups' : 'گروه'}`,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    users: {
      title: isEn ? 'Local Identity: Users & Groups' : 'کاربران و گروه‌های محلی سامانه (Local Users & Groups)',
      desc: isEn
        ? 'Create and manage local accounts, password credentials, and security groups without Active Directory.'
        : 'ساخت و مدیریت کاربران محلی، اعتبارنامه‌های عبور و گروه‌های امنیتی داخلی سیستم به صورت مستقل از اکتیو دایرکتوری.',
      icon: Users,
      badge: `${localUsers.length} ${isEn ? 'Users' : 'کاربر'} • ${localGroups.length} ${isEn ? 'Groups' : 'گروه'}`,
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
    },
    ad: {
      title: isEn ? 'Active Directory & LDAP Integration' : 'یکپارچه‌سازی با اکتیو دایرکتوری (Active Directory & LDAP)',
      desc: isEn
        ? 'Connect to Windows Server Domain Controllers to synchronize OUs, security groups, and enterprise users.'
        : 'اتصال امن به سرور دامین کنترلر جهت همگام‌سازی OUها، گروه‌های امنیتی AD و کاربران سازمانی برای ورود متمرکز.',
      icon: Server,
      badge: adConfig.domain || 'corp.local',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    },
    rbac: {
      title: isEn ? 'Granular Multi-Vendor Access Control (RBAC)' : 'کنترل دسترسی و اختیارات چند وندوری (RBAC)',
      desc: isEn
        ? 'Fine-grained policy matrix for Cisco IOS/XE, MikroTik RouterOS, and Linux appliances.'
        : 'پالیسی‌های دقیق سطح دسترسی برای پورت‌ها، ترمینال CLI، ویلن‌ها و کانفیگ تجهیزات سیسکو، میکروتیک و لینوکس.',
      icon: ShieldCheck,
      badge: `${policies.length} ${isEn ? 'Policies' : 'پالیسی'}`,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
    },
    backup: {
      title: isEn ? 'Enterprise Backup & Disaster Recovery Portal' : 'پورتال پشتیبان‌گیری و بازیابی کلان شبکه (Disaster Recovery)',
      desc: isEn
        ? 'Export signed & encrypted state packages and execute pre-flight validated restores with instant rollback protection.'
        : 'استخراج پکیج‌های رمزنگاری‌شده از کل اطلاعات شبکه، ممیزی امنیتی SHA-256 و بازیابی مطمئن با نقطه بازگشت خودکار.',
      icon: Archive,
      badge: isEn ? 'DR Portal' : 'پورتال DR',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    }
  };

  const currentMeta = subMenuMeta[activeTab];
  const CurrentIcon = currentMeta.icon;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-3 animate-fadeIn">
      {/* Dynamic Sub-Menu Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-white/10 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/20">
            <CurrentIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                <Settings className="w-3 h-3" />
                <span>{isEn ? 'Settings' : 'تنظیمات'}</span>
                <ChevronRight className="w-3 h-3 rtl:rotate-180 text-slate-500" />
              </span>
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight font-mono">
                {currentMeta.title}
              </h1>
              <span className={`text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full border ${currentMeta.badgeColor}`}>
                {currentMeta.badge}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              {currentMeta.desc}
            </p>
          </div>
        </div>

        {/* Current Role Simulation Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs shrink-0 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <div className="text-left rtl:text-right">
            <span className="text-[10px] text-slate-400 block">{isEn ? 'Active Simulated Role:' : 'نقش شبیه‌سازی‌شده فعال:'}</span>
            <span className="font-bold text-white text-xs">{activePolicy?.name}</span>
          </div>
        </div>
      </div>

      {/* Sub-Menu Bar: Synchronized with Sidebar */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md overflow-x-auto custom-scrollbar">
        {/* Sub-menu 1: Device Groups */}
        <button
          type="button"
          onClick={() => handleSwitchTab('groups')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 cursor-pointer ${
            activeTab === 'groups'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg ring-1 ring-amber-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5 text-amber-400" />
          <span>{isEn ? 'Device Grouping' : 'گروه‌بندی دیوایس‌ها'}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {deviceGroups.length}
          </span>
        </button>

        {/* Sub-menu 2: Local Users & Groups */}
        <button
          type="button"
          onClick={() => handleSwitchTab('users')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 cursor-pointer ${
            activeTab === 'users'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg ring-1 ring-purple-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-purple-400" />
          <span>{isEn ? 'Local Users & Groups' : 'کاربران و گروه‌های محلی'}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
            {localUsers.length}
          </span>
        </button>

        {/* Sub-menu 3: Active Directory */}
        <button
          type="button"
          onClick={() => handleSwitchTab('ad')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 cursor-pointer ${
            activeTab === 'ad'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg ring-1 ring-cyan-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Server className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isEn ? 'Active Directory & LDAP' : 'اکتیو دایرکتوری (AD)'}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            {adConfig.domain}
          </span>
        </button>

        {/* Sub-menu 4: Access Control (RBAC) */}
        <button
          type="button"
          onClick={() => handleSwitchTab('rbac')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 cursor-pointer ${
            activeTab === 'rbac'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-lg ring-1 ring-indigo-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>{isEn ? 'Access Control (RBAC)' : 'سطوح دسترسی (RBAC)'}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {policies.length}
          </span>
        </button>

        {/* Sub-menu 5: Backup & Disaster Recovery Portal */}
        <button
          type="button"
          onClick={() => handleSwitchTab('backup')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 cursor-pointer ${
            activeTab === 'backup'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg ring-1 ring-cyan-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Archive className="w-3.5 h-3.5 text-cyan-400" />
          <span>{isEn ? 'Backup Portal' : 'پورتال بکاپ و بازیابی'}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            DR
          </span>
        </button>
      </div>

      {/* Sub-Menu Views */}
      <div className="transition-all duration-300">
        {activeTab === 'groups' && (
          <DeviceGroupingTab
            groups={deviceGroups}
            devices={devices}
            onSaveGroups={handleSaveDeviceGroups}
          />
        )}

        {activeTab === 'users' && (
          <LocalUsersTab
            users={localUsers}
            onSaveUsers={handleSaveLocalUsers}
            groups={localGroups}
            onSaveGroups={handleSaveLocalGroups}
            isEn={isEn}
          />
        )}

        {activeTab === 'ad' && (
          <ActiveDirectoryTab
            config={adConfig}
            onSaveConfig={handleSaveAdConfig}
          />
        )}

        {activeTab === 'rbac' && (
          <AccessControlTab
            policies={policies}
            groups={deviceGroups}
            devices={devices}
            adConfig={adConfig}
            onSavePolicies={handleSavePolicies}
            activeSimulatedPolicyId={simulatedRoleId}
            onSelectSimulatedPolicy={handleSelectSimulatedPolicy}
            localUsers={localUsers}
            localGroups={localGroups}
          />
        )}

        {activeTab === 'backup' && (
          <BackupPortalTab
            isEn={isEn}
            activePolicy={activePolicy}
            allPolicies={policies}
            onSelectSimulatedPolicy={handleSelectSimulatedPolicy}
            devices={devices}
            onRefreshData={onRefreshAllData}
          />
        )}
      </div>
    </div>
  );
};
