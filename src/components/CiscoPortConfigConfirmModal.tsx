import React, { useState } from 'react';
import {
  Terminal,
  Server,
  X,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  AlertTriangle,
  Layers,
  PowerOff,
  Power,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Save,
  Sliders,
  CheckSquare
} from 'lucide-react';
import { Device, SwitchPort } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

export interface PortConfigUpdates {
  admin_status?: 'enabled' | 'disabled' | 'no_change';
  status?: 'up' | 'down';
  mode?: 'access' | 'trunk' | 'no_change';
  vlan?: number | string;
  allowed_vlans?: string;
  port_security_enabled?: boolean | 'no_change' | 'enabled' | 'disabled';
  port_security_mode?: 'sticky' | 'dynamic' | 'configured';
  port_security_max_mac?: number;
  port_security_configured_mac?: string;
  port_security_violation?: 'shutdown' | 'restrict' | 'protect';
  description?: string;
  connected_device?: string;
}

export interface CiscoPortConfigConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  device: Device;
  targetPortIds: string[];
  targetPorts?: SwitchPort[];
  updates: PortConfigUpdates;
  isLoading?: boolean;
}

export const generateCiscoPortConfigCli = (
  device: Device,
  portIds: string[],
  updates: PortConfigUpdates
): string => {
  const devName = device.name || 'Switch';
  const isRouter = device.type === 'router';
  const lines: string[] = [
    `${devName}# configure terminal`,
    `Enter configuration commands, one per line. End with CNTL/Z.`
  ];

  if (portIds.length === 1) {
    const p = portIds[0];
    lines.push(`${devName}(config)# interface ${p}`);
    const prompt = `${devName}(config-if)#`;

    if (updates.description) {
      lines.push(`${prompt} description ${updates.description}`);
    }

    if (updates.mode === 'trunk') {
      if (!isRouter) {
        lines.push(`${prompt} switchport trunk encapsulation dot1q`);
        lines.push(`${prompt} switchport mode trunk`);
        if (updates.allowed_vlans) {
          lines.push(`${prompt} switchport trunk allowed vlan ${updates.allowed_vlans}`);
        }
      }
    } else if (updates.mode === 'access') {
      if (!isRouter) {
        lines.push(`${prompt} switchport mode access`);
        if (updates.vlan) {
          lines.push(`${prompt} switchport access vlan ${updates.vlan}`);
        }
      }
    }

    if (updates.port_security_enabled === true || updates.port_security_enabled === 'enabled') {
      if (!isRouter) {
        if (updates.mode !== 'access') {
          lines.push(`${prompt} switchport mode access`);
        }
        lines.push(`${prompt} switchport port-security`);
        if (updates.port_security_max_mac) {
          lines.push(`${prompt} switchport port-security maximum ${updates.port_security_max_mac}`);
        }
        if (updates.port_security_mode === 'sticky') {
          lines.push(`${prompt} switchport port-security mac-address sticky`);
        } else if (updates.port_security_mode === 'configured' && updates.port_security_configured_mac) {
          lines.push(`${prompt} switchport port-security mac-address ${updates.port_security_configured_mac}`);
        }
        if (updates.port_security_violation) {
          lines.push(`${prompt} switchport port-security violation ${updates.port_security_violation}`);
        }
      }
    } else if (updates.port_security_enabled === false || updates.port_security_enabled === 'disabled') {
      if (!isRouter) {
        lines.push(`${prompt} no switchport port-security`);
      }
    }

    if (updates.admin_status === 'disabled') {
      lines.push(`${prompt} shutdown`);
    } else if (updates.admin_status === 'enabled') {
      lines.push(`${prompt} no shutdown`);
    }

    lines.push(`${prompt} exit`);
  } else {
    // Multi-port / Batch configuration
    lines.push(`${devName}(config)# interface range ${portIds.join(', ')}`);
    const prompt = `${devName}(config-if-range)#`;

    if (updates.mode === 'trunk') {
      if (!isRouter) {
        lines.push(`${prompt} switchport trunk encapsulation dot1q`);
        lines.push(`${prompt} switchport mode trunk`);
        if (updates.allowed_vlans) {
          lines.push(`${prompt} switchport trunk allowed vlan ${updates.allowed_vlans}`);
        }
      }
    } else if (updates.mode === 'access') {
      if (!isRouter) {
        lines.push(`${prompt} switchport mode access`);
        if (updates.vlan) {
          lines.push(`${prompt} switchport access vlan ${updates.vlan}`);
        }
      }
    }

    if (updates.port_security_enabled === true || updates.port_security_enabled === 'enabled') {
      if (!isRouter) {
        lines.push(`${prompt} switchport mode access`);
        lines.push(`${prompt} switchport port-security`);
        if (updates.port_security_max_mac) {
          lines.push(`${prompt} switchport port-security maximum ${updates.port_security_max_mac}`);
        }
        if (updates.port_security_mode === 'sticky') {
          lines.push(`${prompt} switchport port-security mac-address sticky`);
        }
      }
    } else if (updates.port_security_enabled === false || updates.port_security_enabled === 'disabled') {
      if (!isRouter) {
        lines.push(`${prompt} no switchport port-security`);
      }
    }

    if (updates.admin_status === 'disabled') {
      lines.push(`${prompt} shutdown`);
    } else if (updates.admin_status === 'enabled') {
      lines.push(`${prompt} no shutdown`);
    }

    lines.push(`${prompt} exit`);
  }

  lines.push(`${devName}(config)# exit`);
  lines.push(`%SYS-5-CONFIG_I: Configured from console by admin`);
  if (portIds.length === 1) {
    if (updates.admin_status === 'disabled') {
      lines.push(`%LINK-5-CHANGED: Interface ${portIds[0]}, changed state to administratively down`);
      lines.push(`%LINEPROTO-5-UPDOWN: Line protocol on Interface ${portIds[0]}, changed state to down`);
    } else if (updates.admin_status === 'enabled') {
      lines.push(`%LINK-3-UPDOWN: Interface ${portIds[0]}, changed state to up`);
      lines.push(`%LINEPROTO-3-UPDOWN: Line protocol on Interface ${portIds[0]}, changed state to up`);
    }
  } else {
    lines.push(`%SYS-5-CONFIG_I: Batch port configuration successfully applied to ${portIds.length} interfaces`);
  }

  return lines.join('\n');
};

export const CiscoPortConfigConfirmModal: React.FC<CiscoPortConfigConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  device,
  targetPortIds,
  targetPorts = [],
  updates,
  isLoading = false,
}) => {
  const { isEn } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [showAllPorts, setShowAllPorts] = useState(false);

  if (!isOpen || targetPortIds.length === 0) return null;

  const isBatch = targetPortIds.length > 1;
  const isRouter = device.type === 'router';
  const cliText = generateCiscoPortConfigCli(device, targetPortIds, updates);

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cliText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Summarize changes list
  const changesSummary: { label: string; value: string; icon: React.ReactNode; isDanger?: boolean; isHighlight?: boolean }[] = [];

  if (updates.admin_status && updates.admin_status !== 'no_change') {
    const isDown = updates.admin_status === 'disabled';
    changesSummary.push({
      label: isEn ? 'Port Administrative Status' : 'وضعیت ارتباطی پورت (Admin Status)',
      value: isDown
        ? (isEn ? 'Shutdown (Administratively DOWN)' : 'خاموش کردن پورت (Shutdown - Down)')
        : (isEn ? 'No Shutdown (Administratively UP)' : 'روشن کردن پورت (No Shutdown - Up)'),
      icon: isDown ? <PowerOff className="w-4 h-4 text-rose-500" /> : <Power className="w-4 h-4 text-emerald-500" />,
      isDanger: isDown,
      isHighlight: !isDown
    });
  }

  if (updates.mode && updates.mode !== 'no_change') {
    changesSummary.push({
      label: isEn ? 'Switchport Mode' : 'حالت کاری پورت (Switchport Mode)',
      value: updates.mode === 'trunk' ? (isEn ? '802.1Q Trunk Mode' : 'مود ترانک (802.1Q Trunk)') : (isEn ? 'Access Mode' : 'مود دسترسی (Access)'),
      icon: <Layers className="w-4 h-4 text-indigo-500" />,
      isHighlight: true
    });
  }

  if (updates.vlan !== undefined && updates.vlan !== '') {
    changesSummary.push({
      label: isEn ? 'VLAN Assignment' : 'تخصیص شماره ویلن (VLAN)',
      value: `VLAN ${updates.vlan}`,
      icon: <Layers className="w-4 h-4 text-purple-500" />,
      isHighlight: true
    });
  }

  if (updates.allowed_vlans) {
    changesSummary.push({
      label: isEn ? 'Trunk Allowed VLANs' : 'ویلن‌های مجاز ترانک (Allowed VLANs)',
      value: updates.allowed_vlans,
      icon: <Layers className="w-4 h-4 text-cyan-500" />
    });
  }

  if (updates.port_security_enabled !== undefined && updates.port_security_enabled !== 'no_change') {
    const isSecEnabled = updates.port_security_enabled === true || updates.port_security_enabled === 'enabled';
    changesSummary.push({
      label: isEn ? 'Port Security (Layer 2)' : 'امنیت پورت (Port Security L2)',
      value: isSecEnabled
        ? (isEn ? `Enabled (Mode: ${updates.port_security_mode || 'sticky'}, Max MAC: ${updates.port_security_max_mac || 1})` : `فعال (حالت: ${updates.port_security_mode || 'sticky'}، سقف مک: ${updates.port_security_max_mac || 1})`)
        : (isEn ? 'Disabled' : 'غیرفعال (حذف امنیت پورت)'),
      icon: isSecEnabled ? <ShieldCheck className="w-4 h-4 text-emerald-500" /> : <ShieldAlert className="w-4 h-4 text-amber-500" />,
      isHighlight: isSecEnabled
    });
  }

  if (updates.description) {
    changesSummary.push({
      label: isEn ? 'Port Description' : 'توضیحات اینترفیس (Description)',
      value: updates.description,
      icon: <Sliders className="w-4 h-4 text-slate-500" />
    });
  }

  const displayedPortIds = showAllPorts ? targetPortIds : targetPortIds.slice(0, 16);
  const remainingCount = targetPortIds.length - displayedPortIds.length;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 modal-backdrop-blur"
      data-modal-backdrop="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
        dir={isEn ? 'ltr' : 'rtl'}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                <span>
                  {isBatch
                    ? (isEn ? 'Confirm & Execute Batch Port Configuration' : 'تأیید و اجرای تنظیمات گروهی پورت‌ها')
                    : (isEn ? `Confirm & Execute Port Configuration (${targetPortIds[0]})` : `تأیید و اجرای تنظیمات پورت ${targetPortIds[0]}`)}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-500/20">
                  {isBatch
                    ? (isEn ? `${targetPortIds.length} Ports Selected` : `${targetPortIds.length} پورت انتخاب‌شده`)
                    : (isEn ? 'Single Port' : 'تک پورت')}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{device.name}</span>
                <span>•</span>
                <span className="font-mono">{device.ip}</span>
                <span>•</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {isRouter ? (isEn ? 'Cisco Router' : 'روتر سیسکو') : (isEn ? 'Cisco Switch' : 'سوییچ سیسکو')}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800 dark:text-slate-200 text-xs">
          {/* Action explanation */}
          <div className="p-3.5 rounded-xl border bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/40 text-indigo-950 dark:text-indigo-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed font-medium">
              {isBatch ? (
                isEn ? (
                  <>
                    The following configuration changes will be sent and executed across{' '}
                    <b className="font-bold text-indigo-600 dark:text-indigo-300">{targetPortIds.length} selected ports</b> on{' '}
                    <b className="font-mono">{device.name}</b>. Please review the ports and the Cisco CLI commands below before confirming.
                  </>
                ) : (
                  <>
                    دستورات پیکربندی زیر روی{' '}
                    <b className="font-bold text-indigo-600 dark:text-indigo-300">{targetPortIds.length} پورت انتخابی</b> در دستگاه{' '}
                    <b className="font-mono">{device.name}</b> ارسال و اجرا خواهند شد. لطفاً لیست پورت‌ها و توالی دستورات Cisco CLI را پیش از تأیید نهایی بررسی نمایید:
                  </>
                )
              ) : (
                isEn ? (
                  <>
                    The following configuration will be executed on interface{' '}
                    <b className="font-mono text-indigo-600 dark:text-indigo-300">{targetPortIds[0]}</b> of{' '}
                    <b className="font-mono">{device.name}</b>. Please confirm execution.
                  </>
                ) : (
                  <>
                    تغییرات پیکربندی زیر بر روی اینترفیس{' '}
                    <b className="font-mono text-indigo-600 dark:text-indigo-300">{targetPortIds[0]}</b> در سوئیچ{' '}
                    <b className="font-mono">{device.name}</b> اجرا خواهد شد. لطفاً صحت دستورات را تأیید فرمایید:
                  </>
                )
              )}
            </div>
          </div>

          {/* Target Ports Chips Container */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                <span>{isEn ? 'Target Interfaces:' : 'اینترفیس‌های هدف عملیات:'}</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">({targetPortIds.length})</span>
              </span>
              {targetPortIds.length > 16 && (
                <button
                  type="button"
                  onClick={() => setShowAllPorts(!showAllPorts)}
                  className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer font-medium"
                >
                  {showAllPorts ? (isEn ? 'Show Less' : 'نمایش کمتر') : (isEn ? `Show All (${targetPortIds.length})` : `نمایش همه (${targetPortIds.length})`)}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {displayedPortIds.map((pid) => (
                <span
                  key={pid}
                  className="px-2 py-0.5 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-mono text-[11px] font-bold"
                >
                  {pid}
                </span>
              ))}
              {!showAllPorts && remainingCount > 0 && (
                <span className="px-2 py-0.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono text-[11px] font-medium">
                  +{remainingCount} {isEn ? 'more' : 'دیگر'}
                </span>
              )}
            </div>
          </div>

          {/* Changes Applied Summary Cards */}
          {changesSummary.length > 0 && (
            <div>
              <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px] block mb-1.5">
                {isEn ? 'Configuration Parameters to Apply:' : 'پارامترهای تنظیمی جهت اعمال:'}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {changesSummary.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${
                      item.isDanger
                        ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300'
                        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                        {item.label}
                      </span>
                      <span className="font-bold text-xs block truncate font-mono">
                        {item.value}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cisco CLI Command Window */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-500" />
                <span>{isEn ? 'Cisco IOS Commands (Running-Config):' : 'دستورات اجرایی سیسکو IOS در دستگاه:'}</span>
              </span>
              <button
                type="button"
                onClick={handleCopyCli}
                className="text-[11px] font-mono flex items-center gap-1 px-2.5 py-1 rounded text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (isEn ? 'Copied' : 'کپی شد') : (isEn ? 'Copy CLI' : 'کپی دستورات')}</span>
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#0f172a] shadow-inner font-mono text-xs">
              <div className="px-3 py-1.5 bg-[#020617] border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {device.name} • {isRouter ? 'Cisco IOS Router' : 'Cisco IOS-XE Switch'}
                </span>
              </div>
              <pre className="p-3 text-emerald-400 text-xs leading-relaxed overflow-x-auto whitespace-pre selection:bg-cyan-500/30 max-h-52">
                {cliText}
              </pre>
            </div>
          </div>

          {/* Running vs Startup Notice */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <b>{isEn ? 'Notice:' : 'توجه:'}</b>{' '}
              {isEn ? (
                <>
                  These commands will immediately apply to active Running-Config on{' '}
                  <b className="font-mono">{device.name}</b>. Remember to run{' '}
                  <code className="bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded font-mono font-bold">write memory</code>{' '}
                  to persist changes into NVRAM startup-config.
                </>
              ) : (
                <>
                  این تغییرات بلافاصله بر روی Running-Config دستگاه <b className="font-mono">{device.name}</b> اعمال می‌شوند. جهت ذخیره دائمی در حافظه NVRAM، دستور <code className="bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded font-mono font-bold">write memory</code> را اجرا نمایید.
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer border border-slate-300 dark:border-slate-700"
          >
            {isEn ? 'Cancel & Return' : 'انصراف و ویرایش'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isEn ? 'Executing Commands...' : 'در حال اجرای دستورات...'}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isBatch
                    ? (isEn ? `Yes, Execute on ${targetPortIds.length} Ports` : `بله، دستورات را روی ${targetPortIds.length} پورت اجرا کن`)
                    : (isEn ? 'Yes, Execute Commands' : 'بله، دستورات را اجرا کن')}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
