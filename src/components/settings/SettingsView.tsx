import React, { useState, useEffect } from 'react';
import {
  Settings,
  FolderTree,
  Server,
  ShieldCheck,
  Sliders,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import {
  Device,
  DeviceGroup,
  ActiveDirectoryConfig,
  AccessPolicy
} from '../../types';
import {
  loadDeviceGroups,
  saveDeviceGroups,
  loadActiveDirectoryConfig,
  saveActiveDirectoryConfig,
  loadAccessPolicies,
  saveAccessPolicies,
  loadSimulatedRoleId,
  saveSimulatedRoleId
} from '../../services/settingsStorage';
import { DeviceGroupingTab } from './DeviceGroupingTab';
import { ActiveDirectoryTab } from './ActiveDirectoryTab';
import { AccessControlTab } from './AccessControlTab';
import { useLanguage } from '../../i18n';

interface SettingsViewProps {
  devices: Device[];
  onUpdateDeviceGroups?: (groups: DeviceGroup[]) => void;
}

export type SettingsSubTab = 'groups' | 'ad' | 'rbac';

export const SettingsView: React.FC<SettingsViewProps> = ({
  devices,
  onUpdateDeviceGroups,
}) => {
  const { isRtl, isEn } = useLanguage();
  const [activeTab, setActiveTab] = useState<SettingsSubTab>('groups');

  // Master State loaded from storage service
  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>(() => loadDeviceGroups());
  const [adConfig, setAdConfig] = useState<ActiveDirectoryConfig>(() => loadActiveDirectoryConfig());
  const [policies, setPolicies] = useState<AccessPolicy[]>(() => loadAccessPolicies());
  const [simulatedRoleId, setSimulatedRoleId] = useState<string>(() => loadSimulatedRoleId());

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

  const activePolicy = policies.find((p) => p.id === simulatedRoleId) || policies[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 py-3">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-white/10 shadow-xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.5)] border border-white/20">
            <Settings className="w-6 h-6 animate-[spin_12s_linear_infinite]" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 font-mono">
              <span>{isEn ? 'System Configuration & Access Control' : 'تنظیمات، گروه‌بندی و سطوح دسترسی (RBAC)'}</span>
              <span className="text-[11px] font-sans font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Enterprise
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEn
                ? 'Device Grouping, Active Directory / LDAP synchronization, and Granular Role-Based Access Control.'
                : 'دسته‌بندی تجهیزات (مانند هلپ‌دسک)، اتصال به اکتیو دایرکتوری و تعریف دقیق سطوح دسترسی کاربران به پورت‌ها و صفحات.'}
            </p>
          </div>
        </div>

        {/* Current Role Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <div className="text-left rtl:text-right">
            <span className="text-[10px] text-slate-400 block">{isEn ? 'Current RBAC Simulation:' : 'نقش شبیه‌سازی‌شده:'}</span>
            <span className="font-bold text-white text-xs">{activePolicy?.name}</span>
          </div>
        </div>
      </div>

      {/* Main Tab Switcher Buttons */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md overflow-x-auto custom-scrollbar">
        {/* Tab 1: Device Groups */}
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 cursor-pointer ${
            activeTab === 'groups'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg ring-1 ring-amber-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <FolderTree className="w-4 h-4 text-amber-400" />
          <span>{isEn ? 'Device Grouping' : 'گروه‌بندی دیوایس‌ها (Device Groups)'}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {deviceGroups.length}
          </span>
        </button>

        {/* Tab 2: Active Directory */}
        <button
          onClick={() => setActiveTab('ad')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 cursor-pointer ${
            activeTab === 'ad'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-lg ring-1 ring-cyan-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <Server className="w-4 h-4 text-cyan-400" />
          <span>{isEn ? 'Active Directory & LDAP' : 'اتصال به اکتیو دایرکتوری (Active Directory)'}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            {adConfig.domain}
          </span>
        </button>

        {/* Tab 3: Access Control (RBAC) */}
        <button
          onClick={() => setActiveTab('rbac')}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 shrink-0 cursor-pointer ${
            activeTab === 'rbac'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-lg ring-1 ring-indigo-400/30'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>{isEn ? 'Access Control & Permissions' : 'سطوح دسترسی و اختیارات (RBAC)'}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {policies.length}
          </span>
        </button>
      </div>

      {/* Tab Content Display */}
      {activeTab === 'groups' && (
        <DeviceGroupingTab
          groups={deviceGroups}
          devices={devices}
          onSaveGroups={handleSaveDeviceGroups}
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
        />
      )}
    </div>
  );
};
