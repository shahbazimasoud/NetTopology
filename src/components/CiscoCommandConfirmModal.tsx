import React from 'react';
import {
  AlertTriangle,
  Terminal,
  Server,
  PowerOff,
  Power,
  Layers,
  ShieldAlert,
  X,
  CheckCircle2,
  Loader2,
  Copy,
  Check
} from 'lucide-react';
import { Device, SwitchPort } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

export interface CiscoCommandConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  action: 'shutdown' | 'no_shutdown' | 'mode_trunk' | 'mode_access' | 'port_sec_disable';
  port: SwitchPort | null;
  device: Device;
  isLoading?: boolean;
}

export const CiscoCommandConfirmModal: React.FC<CiscoCommandConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  action,
  port,
  device,
  isLoading = false,
}) => {
  const { t, isEn } = useLanguage();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !port) return null;

  const isRouter = device.type === 'router';
  const isSwitch = device.type === 'switch' || !isRouter;

  // Generate Cisco IOS CLI commands based on device type (Switch vs Router)
  const generateCommand = (): string => {
    const portId = port.port_id;
    const devName = device.name || 'Device';

    switch (action) {
      case 'shutdown':
        return [
          `${devName}# configure terminal`,
          `Enter configuration commands, one per line. End with CNTL/Z.`,
          `${devName}(config)# interface ${portId}`,
          `${devName}(config-if)# shutdown`,
          `${devName}(config-if)# exit`,
          `${devName}(config)# exit`,
          `%SYS-5-CONFIG_I: Configured from console by admin`,
          `%LINK-5-CHANGED: Interface ${portId}, changed state to administratively down`,
          `%LINEPROTO-5-UPDOWN: Line protocol on Interface ${portId}, changed state to down`
        ].join('\n');

      case 'no_shutdown':
        return [
          `${devName}# configure terminal`,
          `Enter configuration commands, one per line. End with CNTL/Z.`,
          `${devName}(config)# interface ${portId}`,
          `${devName}(config-if)# no shutdown`,
          `${devName}(config-if)# exit`,
          `${devName}(config)# exit`,
          `%SYS-5-CONFIG_I: Configured from console by admin`,
          `%LINK-3-UPDOWN: Interface ${portId}, changed state to up`,
          `%LINEPROTO-3-UPDOWN: Line protocol on Interface ${portId}, changed state to up`
        ].join('\n');

      case 'mode_trunk':
        if (isRouter) {
          return [
            `${devName}# configure terminal`,
            `${devName}(config)# interface ${portId}`,
            `${devName}(config-if)# no shutdown`,
            `${devName}(config-if)# exit`,
            `${devName}(config)# interface ${portId}.10`,
            `${devName}(config-subif)# encapsulation dot1Q 10`,
            `${devName}(config-subif)# ip address 192.168.10.1 255.255.255.0`,
            `${devName}(config-subif)# exit`,
            `${devName}(config)# exit`,
            `%SYS-5-CONFIG_I: Configured 802.1Q sub-interface trunking on Router ${devName}`
          ].join('\n');
        }
        return [
          `${devName}# configure terminal`,
          `${devName}(config)# interface ${portId}`,
          `${devName}(config-if)# switchport trunk encapsulation dot1q`,
          `${devName}(config-if)# switchport mode trunk`,
          `${devName}(config-if)# exit`,
          `${devName}(config)# exit`,
          `%SYS-5-CONFIG_I: Configured 802.1Q Trunk port on Switch ${devName}`,
          `%LINEPROTO-5-UPDOWN: Line protocol on Interface ${portId}, changed state to up`
        ].join('\n');

      case 'mode_access':
        if (isRouter) {
          return [
            `${devName}# configure terminal`,
            `${devName}(config)# interface ${portId}`,
            `${devName}(config-if)# no shutdown`,
            `${devName}(config-if)# ip address 192.168.1.1 255.255.255.0`,
            `${devName}(config-if)# exit`,
            `${devName}(config)# exit`,
            `%SYS-5-CONFIG_I: Configured routed L3 interface on Router ${devName}`
          ].join('\n');
        }
        return [
          `${devName}# configure terminal`,
          `${devName}(config)# interface ${portId}`,
          `${devName}(config-if)# switchport mode access`,
          `${devName}(config-if)# switchport access vlan ${port.vlan || 1}`,
          `${devName}(config-if)# exit`,
          `${devName}(config)# exit`,
          `%SYS-5-CONFIG_I: Configured Access port on VLAN ${port.vlan || 1} on Switch ${devName}`
        ].join('\n');

      case 'port_sec_disable':
        if (isRouter) {
          return [
            `${devName}# configure terminal`,
            `${devName}(config)# interface ${portId}`,
            `${devName}(config-if)# no ip verify unicast source reachable-via rx`,
            `${devName}(config-if)# exit`,
            `${devName}(config)# exit`,
            `%SYS-5-CONFIG_I: Disabled L3 uRPF security verification on Router ${devName}`
          ].join('\n');
        }
        return [
          `${devName}# configure terminal`,
          `${devName}(config)# interface ${portId}`,
          `${devName}(config-if)# no switchport port-security`,
          `${devName}(config-if)# exit`,
          `${devName}(config)# exit`,
          `%SYS-5-CONFIG_I: Disabled Port Security on Interface ${portId}`
        ].join('\n');

      default:
        return `${devName}# configure terminal\n${devName}(config)# exit`;
    }
  };

  const getActionMetadata = () => {
    switch (action) {
      case 'shutdown':
        return {
          title: isEn ? 'Shutdown Port Confirmation' : 'تأیید خاموش کردن پورت (Shutdown)',
          badge: isEn ? 'Port Shutdown' : 'خاموشی پورت',
          icon: <PowerOff className="w-5 h-5 text-rose-500" />,
          danger: true,
          desc: isEn
            ? `Are you sure you want to administratively shut down port ${port.port_id} on ${device.name}? Traffic will be completely halted on this interface.`
            : `آیا از خاموش کردن اینترفیس ${port.port_id} بر روی ${device.name} اطمینان دارید؟ تمام ترافیک عبوری از این پورت متوقف خواهد شد.`,
        };
      case 'no_shutdown':
        return {
          title: isEn ? 'Enable Port Confirmation' : 'تأیید روشن کردن پورت (No Shutdown)',
          badge: isEn ? 'Port Enable' : 'فعال‌سازی پورت',
          icon: <Power className="w-5 h-5 text-emerald-500" />,
          danger: false,
          desc: isEn
            ? `Are you sure you want to administratively enable port ${port.port_id} on ${device.name}? Interface status will transition to UP.`
            : `آیا از فعال‌سازی اینترفیس ${port.port_id} بر روی ${device.name} اطمینان دارید؟ وضعیت پورت به حالت فعال (Up) تغییر خواهد کرد.`,
        };
      case 'mode_trunk':
        return {
          title: isEn ? 'Change Port Mode to Trunk' : 'تأیید تغییر مود پورت به Trunk',
          badge: isEn ? 'Switchport Trunk' : 'مود ترانک (Trunk)',
          icon: <Layers className="w-5 h-5 text-purple-500" />,
          danger: false,
          desc: isEn
            ? `Switch interface ${port.port_id} to 802.1Q Trunk mode on ${device.name}. Multiple tagged VLAN frames will be forwarded.`
            : `تغییر حالت اینترفیس ${port.port_id} به مود ترانک 802.1Q روی ${device.name}. این پورت برای انتقال فریم‌های تگ‌دار چندین ویلن تنظیم خواهد شد.`,
        };
      case 'mode_access':
        return {
          title: isEn ? 'Change Port Mode to Access' : 'تأیید تغییر مود پورت به Access',
          badge: isEn ? 'Switchport Access' : 'مود دسترسی (Access)',
          icon: <Layers className="w-5 h-5 text-indigo-500" />,
          danger: false,
          desc: isEn
            ? `Switch interface ${port.port_id} to Access mode on ${device.name}. Traffic will be untagged on VLAN ${port.vlan}.`
            : `تغییر حالت اینترفیس ${port.port_id} به مود دسترسی (Access) روی ${device.name}. اینترفیس برای اتصال مستقیم کلاینت روی ویلن ${port.vlan} پیکربندی می‌شود.`,
        };
      case 'port_sec_disable':
        return {
          title: isEn ? 'Disable Port Security' : 'تأیید غیرفعال‌سازی Port Security',
          badge: isEn ? 'Disable Security' : 'حذف امنیت پورت',
          icon: <ShieldAlert className="w-5 h-5 text-amber-500" />,
          danger: true,
          desc: isEn
            ? `Are you sure you want to disable Cisco Port Security on interface ${port.port_id}? MAC restriction policies will be cleared.`
            : `آیا از غیرفعال‌سازی امنیت پورت (Port Security) روی ${port.port_id} اطمینان دارید؟ محدودیت‌های مک‌آدرس از روی اینترفیس برداشته خواهد شد.`,
        };
      default:
        return {
          title: isEn ? 'Confirm Action' : 'تأیید عملیات',
          badge: isEn ? 'Cisco IOS' : 'سیسکو',
          icon: <Terminal className="w-5 h-5 text-cyan-500" />,
          danger: false,
          desc: isEn ? 'Confirm and apply changes to device.' : 'تأیید و اعمال تنظیمات روی دیوایس.',
        };
    }
  };

  const meta = getActionMetadata();
  const cliText = generateCommand();

  const handleCopyCli = () => {
    navigator.clipboard.writeText(cliText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 modal-backdrop-blur"
      data-modal-backdrop="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        dir={isEn ? 'ltr' : 'rtl'}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              {meta.icon}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {meta.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span>{device.name}</span>
                <span>•</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{port.port_id}</span>
                <span>•</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
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

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Action explanation */}
          <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${
            meta.danger
              ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300'
              : 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-200'
          }`}>
            <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${meta.danger ? 'text-rose-500' : 'text-indigo-500'}`} />
            <div className="text-xs leading-relaxed font-medium">
              {meta.desc}
            </div>
          </div>

          {/* Device and Port Details Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{isEn ? 'Device Name' : 'نام تجهیز'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{device.name}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{isEn ? 'Device Type' : 'نوع دستگاه'}</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400 block">
                {isRouter ? 'Router' : 'Switch'}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{isEn ? 'Port' : 'اینترفیس'}</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block">{port.port_id}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{isEn ? 'Current VLAN' : 'ویلن فعلی'}</span>
              <span className="font-mono font-bold text-purple-600 dark:text-purple-400 block">VLAN {port.vlan}</span>
            </div>
          </div>

          {/* Cisco CLI Command Window */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-500" />
                <span>{isEn ? 'Cisco IOS Command Sequence to Execute:' : 'دستورات اجرایی سیسکو در دستگاه:'}</span>
              </span>
              <button
                type="button"
                onClick={handleCopyCli}
                className="text-[11px] font-mono flex items-center gap-1 px-2 py-0.5 rounded text-slate-500 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
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
              <pre className="p-3 text-emerald-400 text-xs leading-relaxed overflow-x-auto whitespace-pre selection:bg-cyan-500/30">
                {cliText}
              </pre>
            </div>
          </div>
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer border border-slate-300 dark:border-slate-700"
          >
            {isEn ? 'Cancel (No)' : 'انصراف (خیر)'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition cursor-pointer ${
              meta.danger
                ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isEn ? 'Executing...' : 'در حال اجرای دستور...'}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{isEn ? 'Yes, Execute Command' : 'بله، دستور را اجرا کن'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
