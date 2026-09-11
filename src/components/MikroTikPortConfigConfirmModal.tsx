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
  Save,
  Cpu,
  Wifi,
  Sparkles
} from 'lucide-react';
import { Device, SwitchPort } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

export interface MikroTikPortConfigUpdates {
  admin_status?: 'enabled' | 'disabled' | 'no_change';
  status?: 'up' | 'down';
  vlan?: number | string;
  speed?: string;
  auto_negotiation?: boolean;
  comment?: string;
  bridge_membership?: 'add' | 'remove' | 'no_change';
  bridge_name?: string;
  loop_protect?: 'on' | 'off' | 'no_change';
  poe_out?: 'auto-on' | 'forced-on' | 'off' | 'no_change';
}

export interface MikroTikPortConfigConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  device: Device;
  targetPortIds: string[];
  targetPorts?: SwitchPort[];
  updates: MikroTikPortConfigUpdates;
  isLoading?: boolean;
  isLightMode?: boolean;
}

export const generateMikroTikPortConfigCli = (
  device: Device,
  portIds: string[],
  updates: MikroTikPortConfigUpdates
): string => {
  const devIdentity = device.name || 'MikroTik-Router';
  const lines: string[] = [
    `# RouterOS CLI Configuration Dispatch for [${devIdentity}]`,
    `# Target Device IP: ${device.ip || '192.168.88.1'}`,
    `[admin@${devIdentity}] >`
  ];

  portIds.forEach((portId) => {
    lines.push(`\n# --- Configuring Interface: ${portId} ---`);

    // 1. Admin status (Enable / Disable)
    if (updates.admin_status === 'enabled') {
      lines.push(`/interface ethernet set [find name="${portId}"] disabled=no`);
      lines.push(`/interface enable [find name="${portId}"]`);
    } else if (updates.admin_status === 'disabled') {
      lines.push(`/interface ethernet set [find name="${portId}"] disabled=yes`);
      lines.push(`/interface disable [find name="${portId}"]`);
    }

    // 2. Auto-negotiation & Speed
    if (updates.auto_negotiation !== undefined) {
      if (updates.auto_negotiation) {
        lines.push(`/interface ethernet set [find name="${portId}"] auto-negotiation=yes`);
      } else if (updates.speed) {
        lines.push(`/interface ethernet set [find name="${portId}"] auto-negotiation=no speed=${updates.speed}`);
      }
    }

    // 3. Comment / Annotation
    if (updates.comment !== undefined) {
      lines.push(`/interface ethernet set [find name="${portId}"] comment="${updates.comment}"`);
    }

    // 4. Bridge Membership & PVID (VLAN)
    if (updates.bridge_membership === 'add') {
      const bName = updates.bridge_name || 'bridge';
      const pvid = updates.vlan || 1;
      lines.push(`/interface bridge port remove [find interface="${portId}"]`);
      lines.push(`/interface bridge port add bridge=${bName} interface=${portId} pvid=${pvid}`);
    } else if (updates.bridge_membership === 'remove') {
      lines.push(`/interface bridge port remove [find interface="${portId}"]`);
    } else if (updates.vlan !== undefined && updates.vlan !== '') {
      lines.push(`/interface bridge port set [find interface="${portId}"] pvid=${updates.vlan}`);
    }

    // 5. Loop Protect
    if (updates.loop_protect && updates.loop_protect !== 'no_change') {
      lines.push(`/interface ethernet set [find name="${portId}"] loop-protect=${updates.loop_protect}`);
    }

    // 6. PoE Out
    if (updates.poe_out && updates.poe_out !== 'no_change') {
      lines.push(`/interface ethernet poe set [find name="${portId}"] poe-out=${updates.poe_out}`);
    }
  });

  lines.push(`\n# Verify interface running status`);
  lines.push(`/interface print where name="${portIds.join(';')}"`);
  lines.push(`[admin@${devIdentity}] > # Configuration applied successfully!`);

  return lines.join('\n');
};

export const MikroTikPortConfigConfirmModal: React.FC<MikroTikPortConfigConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  device,
  targetPortIds,
  targetPorts = [],
  updates,
  isLoading = false,
  isLightMode = false,
}) => {
  const { t, isEn } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const cliScript = generateMikroTikPortConfigCli(device, targetPortIds, updates);

  const handleCopy = () => {
    navigator.clipboard.writeText(cliScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-200 ${
        isLightMode ? 'bg-slate-900/50' : 'bg-black/80'
      }`}
    >
      <div
        className={`relative w-full max-w-2xl rounded-xl border flex flex-col overflow-hidden max-h-[90vh] ${
          isLightMode
            ? 'bg-white border-cyan-500/40 shadow-2xl shadow-slate-400/40 text-slate-800'
            : 'bg-slate-900 border-cyan-500/40 shadow-2xl shadow-cyan-950/50 text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/80 border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg border ${
                isLightMode
                  ? 'bg-cyan-50 border-cyan-300 text-cyan-700'
                  : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-400'
              }`}
            >
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className={`text-base font-bold flex items-center gap-2 ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                <span>{isEn ? 'Confirm RouterOS Commands' : 'تایید اجرای دستورات RouterOS میکروتیک'}</span>
                <span
                  className={`text-xs font-mono px-2 py-0.5 rounded border font-bold ${
                    isLightMode
                      ? 'bg-cyan-50 border-cyan-300 text-cyan-700'
                      : 'bg-cyan-900/60 border-cyan-700/60 text-cyan-300'
                  }`}
                >
                  MikroTik CLI
                </span>
              </h3>
              <p className={`text-xs ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {isEn
                  ? `Target Router: ${device.name || 'MikroTik'} (${device.ip || '192.168.88.1'}) • ${targetPortIds.length} Port(s)`
                  : `دیوایس مقصد: ${device.name || 'MikroTik'} (${device.ip || '192.168.88.1'}) • تعداد ${targetPortIds.length} پورت`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className={`p-1 rounded-lg transition-colors ${
              isLightMode ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Port Tags & Summary */}
        <div
          className={`px-5 py-3 border-b flex flex-wrap items-center gap-2 ${
            isLightMode ? 'bg-slate-100/70 border-slate-200 text-slate-700' : 'bg-slate-950/40 border-slate-800/80 text-slate-400'
          }`}
        >
          <span className="text-xs font-medium">
            {isEn ? 'Selected Interfaces:' : 'اینترفیس‌های انتخاب‌شده:'}
          </span>
          {targetPortIds.map((p) => (
            <span
              key={p}
              className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
                isLightMode
                  ? 'bg-white text-cyan-800 border-cyan-200'
                  : 'bg-slate-800 text-cyan-300 border-slate-700'
              }`}
            >
              {p}
            </span>
          ))}
        </div>

        {/* CLI Script Preview */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold flex items-center gap-1.5 ${
                isLightMode ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              <Cpu className={`w-4 h-4 ${isLightMode ? 'text-cyan-600' : 'text-cyan-400'}`} />
              {isEn ? 'Live RouterOS Script Preview:' : 'پیش‌نمایش دستورات ارسالی به میکروتیک:'}
            </span>
            <button
              onClick={handleCopy}
              className={`text-xs flex items-center gap-1 px-2 py-1 rounded border transition-colors cursor-pointer ${
                isLightMode
                  ? 'text-slate-700 hover:text-cyan-800 bg-slate-100 border-slate-300 hover:border-cyan-400'
                  : 'text-slate-400 hover:text-cyan-300 bg-slate-800/80 border-slate-700 hover:border-cyan-500/50'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500 font-bold">{isEn ? 'Copied' : 'کپی شد'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Copy Commands' : 'کپی اسکریپت'}</span>
                </>
              )}
            </button>
          </div>

          <div
            className={`relative rounded-lg p-4 font-mono text-xs leading-relaxed overflow-x-auto ${
              isLightMode
                ? 'bg-slate-900 border border-slate-800 text-cyan-300 selection:bg-cyan-500 selection:text-black'
                : 'bg-black/90 border border-slate-800 text-cyan-300 selection:bg-cyan-500 selection:text-black'
            }`}
          >
            <pre className="whitespace-pre-wrap">{cliScript}</pre>
          </div>

          <div
            className={`p-3 rounded-lg border flex items-start gap-2.5 text-xs ${
              isLightMode
                ? 'bg-cyan-50/80 border-cyan-200 text-cyan-800'
                : 'bg-cyan-950/30 border-cyan-800/40 text-cyan-200'
            }`}
          >
            <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${isLightMode ? 'text-cyan-600' : 'text-cyan-400'}`} />
            <div>
              {isEn
                ? 'These commands will be dispatched directly to the MikroTik RouterOS device via active management session / SSH tunnel.'
                : 'این دستورات از طریق نشست امن مدیریتی / تانل SSH مستقیماً به روتر میکروتیک ارسال و در RouterOS اعمال خواهد شد.'}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className={`flex items-center justify-end gap-3 px-5 py-3.5 border-t ${
            isLightMode ? 'border-slate-200 bg-slate-50' : 'border-slate-800 bg-slate-950/80'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              isLightMode ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {isEn ? 'Cancel' : 'انصراف'}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 text-xs font-bold rounded-lg shadow-md flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer ${
              isLightMode
                ? 'text-white bg-cyan-600 hover:bg-cyan-700 shadow-cyan-600/20 active:bg-cyan-800'
                : 'text-black bg-cyan-400 hover:bg-cyan-300 shadow-cyan-500/20 active:bg-cyan-500'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isEn ? 'Sending to MikroTik...' : 'در حال ارسال به میکروتیک...'}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{isEn ? 'Dispatch & Apply' : 'ارسال و اعمال به میکروتیک'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
