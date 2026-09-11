import React, { useState } from 'react';
import {
  Server,
  ShieldCheck,
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Users,
  UserCheck,
  Eye,
  EyeOff,
  Terminal,
  Lock,
  Search,
  KeyRound,
  Network,
  Radio,
  FileText
} from 'lucide-react';
import { ActiveDirectoryConfig, ADTestResult, ADSecurityGroup, ADUser } from '../../types';
import { simulateTestADConnection } from '../../services/settingsStorage';
import { useLanguage } from '../../i18n';

interface ActiveDirectoryTabProps {
  config: ActiveDirectoryConfig;
  onSaveConfig: (cfg: ActiveDirectoryConfig) => void;
}

export const ActiveDirectoryTab: React.FC<ActiveDirectoryTabProps> = ({
  config,
  onSaveConfig,
}) => {
  const { isRtl, isEn } = useLanguage();
  const [formData, setFormData] = useState<ActiveDirectoryConfig>({ ...config });
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ADTestResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'groups' | 'users'>('groups');
  const [searchQuery, setSearchQuery] = useState('');
  const [saveToast, setSaveToast] = useState(false);

  const handleInputChange = (field: keyof ActiveDirectoryConfig, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig(formData);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await simulateTestADConnection(formData);
      setTestResult(result);
      if (result.success) {
        const updated = {
          ...formData,
          lastSyncStatus: 'success' as const,
          lastSyncMessage: result.message,
          lastSyncTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
        };
        setFormData(updated);
        onSaveConfig(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    await new Promise((res) => setTimeout(res, 800));

    // Simulated freshly synced objects from AD DC
    const updatedGroups: ADSecurityGroup[] = [
      {
        dn: `CN=Helpdesk-Admins,${formData.groupSearchBase || formData.baseDn}`,
        cn: 'Helpdesk-Admins',
        description: 'کارشناسان پشتیبانی و تیم هلپ‌دسک سازمان (دسترسی تغییر ویلن و دیسکریپشن)',
        memberCount: 8,
      },
      {
        dn: `CN=NetOps-Engineers,${formData.groupSearchBase || formData.baseDn}`,
        cn: 'NetOps-Engineers',
        description: 'مهندسان ارشد شبکه و زیرساخت ارتباطی (دسترسی کامل CLI و کانفیگ)',
        memberCount: 4,
      },
      {
        dn: `CN=NOC-Monitoring,${formData.groupSearchBase || formData.baseDn}`,
        cn: 'NOC-Monitoring',
        description: 'تیم پایش و مانیتورینگ مرکز عملیات شبکه (فقط مشاهده)',
        memberCount: 6,
      },
      {
        dn: `CN=Security-Auditors,${formData.groupSearchBase || formData.baseDn}`,
        cn: 'Security-Auditors',
        description: 'حسابرسان امنیتی و ممیزی پورت سکیوریتی و مک آدرس‌ها',
        memberCount: 3,
      },
    ];

    const updatedUsers: ADUser[] = [
      {
        dn: `CN=Masoud Shahbazi,${formData.userSearchBase || formData.baseDn}`,
        samAccountName: 'm.shahbazi',
        displayName: 'مسعود شهبازی (Network Lead)',
        email: 'm.shahbazi@corp.internal',
        department: 'زیرساخت و شبکه',
        title: 'Senior Network Architect',
        groups: ['NetOps-Engineers'],
        enabled: true,
      },
      {
        dn: `CN=Ali Rezaei,${formData.userSearchBase || formData.baseDn}`,
        samAccountName: 'a.rezaei',
        displayName: 'علی رضایی (Helpdesk L1)',
        email: 'a.rezaei@corp.internal',
        department: 'پشتیبانی فنی (Helpdesk)',
        title: 'Helpdesk Specialist',
        groups: ['Helpdesk-Admins'],
        enabled: true,
      },
      {
        dn: `CN=Sara Karimi,${formData.userSearchBase || formData.baseDn}`,
        samAccountName: 's.karimi',
        displayName: 'سارا کریمی (NOC Operator)',
        email: 's.karimi@corp.internal',
        department: 'مرکز عملیات شبکه',
        title: 'NOC Tier-1 Analyst',
        groups: ['NOC-Monitoring'],
        enabled: true,
      },
      {
        dn: `CN=Reza Mohammadi,${formData.userSearchBase || formData.baseDn}`,
        samAccountName: 'r.mohammadi',
        displayName: 'رضا محمدی (Security Auditor)',
        email: 'r.mohammadi@corp.internal',
        department: 'امنیت اطلاعات',
        title: 'Infosec Compliance Officer',
        groups: ['Security-Auditors'],
        enabled: true,
      },
    ];

    const updated = {
      ...formData,
      syncedGroups: updatedGroups,
      syncedUsers: updatedUsers,
      lastSyncStatus: 'success' as const,
      lastSyncMessage: `همگام‌سازی با موفقیت تکمیل شد (${updatedGroups.length} گروه و ${updatedUsers.length} کاربر دریافت گردید)`,
      lastSyncTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    setFormData(updated);
    onSaveConfig(updated);
    setIsSyncing(false);
  };

  // Filtering synced items
  const filteredGroups = (formData.syncedGroups || []).filter(
    (g) =>
      g.cn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = (formData.syncedUsers || []).filter(
    (u) =>
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.samAccountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header Overview Card */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>{isEn ? 'Active Directory & LDAP Domain Controller' : 'اتصال به اکتیو دایرکتوری (Active Directory / LDAP)'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isEn ? 'LDAP Active' : 'ارتباط برقرار'}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isEn
                ? 'Integrate with Microsoft Active Directory or FreeIPA to authenticate operators and query corporate security groups (e.g. Helpdesk-Admins, NetOps).'
                : 'احراز هویت و هماهنگی گروه‌های امنیتی اکتیو دایرکتوری مایکروسافت جهت تخصیص سطوح دسترسی روی تجهیزات و پورت‌های شبکه.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncNow}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/15 text-xs font-semibold transition active:scale-95 cursor-pointer disabled:opacity-50"
            title={isEn ? 'Sync users and security groups from AD' : 'همگام‌سازی گروه‌ها و کاربران از دامین کنترلر'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? (isEn ? 'Syncing...' : 'درحال همگام‌سازی...') : (isEn ? 'Sync Objects' : 'همگام‌سازی آبجکت‌ها')}</span>
          </button>

          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
            <span>{isTesting ? (isEn ? 'Testing...' : 'درحال تست...') : (isEn ? 'Test Connection' : 'تست اتصال زنده')}</span>
          </button>
        </div>
      </div>

      {saveToast && (
        <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{isEn ? 'Active Directory parameters saved successfully.' : 'تنظیمات اتصال به اکتیو دایرکتوری با موفقیت ذخیره شد.'}</span>
        </div>
      )}

      {/* Connection Form & Live Test Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Configuration Form */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-4 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
          <div className="border-b border-white/10 pb-2 flex items-center justify-between">
            <h3 className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-cyan-400" />
              <span>{isEn ? 'Domain Controller Connection Parameters' : 'پارامترهای اتصال به دامین کنترلر (LDAP / LDAPS)'}</span>
            </h3>
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => handleInputChange('enabled', e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
              <span>{isEn ? 'Enable AD Integration' : 'فعال‌سازی سرویس AD'}</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isEn ? 'Server Host / IP' : 'آدرس سرور یا IP دامین کنترلر'}
              </label>
              <input
                type="text"
                required
                value={formData.server}
                onChange={(e) => handleInputChange('server', e.target.value)}
                placeholder="192.168.1.10 or dc01.corp.internal"
                className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isEn ? 'Port' : 'پورت'}
              </label>
              <input
                type="number"
                required
                value={formData.port}
                onChange={(e) => handleInputChange('port', parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isEn ? 'Active Directory Domain' : 'نام دامین (Domain)'}
              </label>
              <input
                type="text"
                required
                value={formData.domain}
                onChange={(e) => handleInputChange('domain', e.target.value)}
                placeholder="corp.internal"
                className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isEn ? 'Base DN' : 'پایه دایرکتوری (Base DN)'}
              </label>
              <input
                type="text"
                required
                value={formData.baseDn}
                onChange={(e) => handleInputChange('baseDn', e.target.value)}
                placeholder="DC=corp,DC=internal"
                className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isEn ? 'Service Account / Bind User' : 'کاربر اتصال (Bind User / Service Account)'}
              </label>
              <input
                type="text"
                required
                value={formData.bindUser}
                onChange={(e) => handleInputChange('bindUser', e.target.value)}
                placeholder="svc-netops@corp.internal"
                className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isEn ? 'Bind Password' : 'رمز عبور اکانت سرویس'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.bindPassword || ''}
                  onChange={(e) => handleInputChange('bindPassword', e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-3 pr-10 rtl:pl-10 rtl:pr-3 py-2 rounded-xl bg-slate-900/80 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 rtl:right-auto rtl:left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isEn ? 'Security Groups Search OU' : 'واحد سازمانی گروه‌ها (Groups OU)'}
              </label>
              <input
                type="text"
                value={formData.groupSearchBase}
                onChange={(e) => handleInputChange('groupSearchBase', e.target.value)}
                placeholder="OU=SecurityGroups,DC=corp,DC=internal"
                className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isEn ? 'Users Search OU' : 'واحد سازمانی کاربران (Users OU)'}
              </label>
              <input
                type="text"
                value={formData.userSearchBase}
                onChange={(e) => handleInputChange('userSearchBase', e.target.value)}
                placeholder="OU=Staff,DC=corp,DC=internal"
                className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/15 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.useSsl}
                onChange={(e) => handleInputChange('useSsl', e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
              <span>{isEn ? 'Use SSL / TLS (LDAPS Port 636)' : 'استفاده از پروتکل امن SSL/TLS (LDAPS)'}</span>
            </label>

            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition shadow-md cursor-pointer"
            >
              {isEn ? 'Save AD Configuration' : 'ذخیره تنظیمات دایرکتوری'}
            </button>
          </div>
        </form>

        {/* Right: Diagnostics & Live Test Console Output */}
        <div className="lg:col-span-5 flex flex-col p-4 rounded-2xl bg-slate-950/80 border border-white/10">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
            <h3 className="font-bold text-xs text-cyan-300 font-mono flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>{isEn ? 'LDAP Diagnostic & Health Console' : 'کنسول مانیتورینگ اتصال و عیب‌یابی دایرکتوری'}</span>
            </h3>
            {formData.lastSyncTime && (
              <span className="text-[10px] text-slate-400 font-mono">
                {isEn ? 'Last Sync: ' : 'آخرین بروزرسانی: '} {formData.lastSyncTime.slice(11)}
              </span>
            )}
          </div>

          {/* Test Status Box */}
          <div className="space-y-2 flex-1 flex flex-col justify-between">
            <div className="space-y-1.5 font-mono text-[11px] text-slate-300 p-3 rounded-xl bg-slate-900 border border-white/10 max-h-[220px] overflow-y-auto custom-scrollbar">
              {testResult ? (
                testResult.logs.map((line, idx) => (
                  <div
                    key={idx}
                    className={`${
                      line.includes('SUCCESS') || line.includes('OK') || line.includes('HEALTHY')
                        ? 'text-emerald-400'
                        : line.includes('Probe') || line.includes('Querying')
                        ? 'text-cyan-300'
                        : 'text-slate-300'
                    }`}
                  >
                    {line}
                  </div>
                ))
              ) : (
                <div className="text-slate-500 italic py-4 text-center">
                  {isEn
                    ? 'Click "Test Connection" to execute live LDAP handshake, verify bind credentials, and query directory BaseDN.'
                    : 'برای بررسی اتصال زنده سوکت LDAP، اعتبارسنجی بایند و بررسی ساختار BaseDN دکمه «تست اتصال زنده» را فشار دهید.'}
                </div>
              )}
            </div>

            {testResult && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">{testResult.message}</span>
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 shrink-0">
                  {testResult.latency_ms} ms
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Synced AD Objects Explorer (Groups & Users) */}
      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveSubTab('groups')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'groups'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{isEn ? 'Active Directory Security Groups' : 'گروه‌های امنیتی اکتیو دایرکتوری (AD Groups)'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-200">
                {formData.syncedGroups?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab('users')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeSubTab === 'users'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{isEn ? 'Domain Users' : 'کاربران دامین (Domain Users)'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-200">
                {formData.syncedUsers?.length || 0}
              </span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 rtl:left-auto rtl:right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? 'Search synced objects...' : 'جستجو در آبجکت‌های همگام‌شده...'}
              className="w-full pl-8 pr-3 rtl:pl-3 rtl:pr-8 py-1 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* Groups View */}
        {activeSubTab === 'groups' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredGroups.map((grp) => (
              <div
                key={grp.cn}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10 hover:border-cyan-500/40 transition space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                      <Users className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white flex items-center gap-2">
                        <span>{grp.cn}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {grp.memberCount} {isEn ? 'Members' : 'عضو'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[280px]" title={grp.dn}>
                        {grp.dn}
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300">{grp.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* Users View */}
        {activeSubTab === 'users' && (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.samAccountName}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-white/10 hover:border-cyan-500/40 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300 text-xs">
                    {user.samAccountName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">{user.displayName}</span>
                      <span className="text-[10px] font-mono text-cyan-300">
                        ({user.samAccountName})
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {user.department} • {user.email}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {user.groups.map((g) => (
                    <span
                      key={g}
                      className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800/50 text-cyan-300"
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
