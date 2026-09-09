import React, { useState, useEffect } from 'react';
import {
  FileText,
  Tag,
  X,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  Terminal,
  Server,
  Sparkles,
  RotateCcw
} from 'lucide-react';
import { Device, SwitchPort } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

export interface PortDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (description: string) => Promise<void> | void;
  port: SwitchPort | null;
  device: Device;
  isLoading?: boolean;
}

export const PortDescriptionModal: React.FC<PortDescriptionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  port,
  device,
  isLoading = false,
}) => {
  const { t, isEn } = useLanguage();
  const [description, setDescription] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (port) {
      setDescription(port.description || '');
    }
  }, [port, isOpen]);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isLoading]);

  if (!isOpen || !port) return null;

  const portId = port.port_id;
  const devName = device.name || 'Device';
  const isUp = port.status === 'up' && port.admin_status !== 'disabled';

  // Common enterprise port description presets
  const presets = [
    { labelEn: 'Uplink to Core', labelFa: 'آپ‌لینک سوئیچ مرکزی', val: 'Uplink to Core Switch' },
    { labelEn: 'Dist SW Trunk', labelFa: 'ترانک سوئیچ توزیع', val: 'Trunk to Dist Switch' },
    { labelEn: 'Wireless AP', labelFa: 'اکسس‌پوینت وای‌فای', val: 'Aruba/Cisco AP MDF' },
    { labelEn: 'Server Farm', labelFa: 'فارم سرورها / مجازی‌ساز', val: 'Server Farm / ESXi Host' },
    { labelEn: 'Workstation LAN', labelFa: 'کلاینت / ایستگاه کاری', val: 'User Workstation PC' },
    { labelEn: 'VoIP Phone', labelFa: 'تلفن تحت شبکه VoIP', val: 'VoIP Phone / SIP Trunk' },
    { labelEn: 'CCTV Camera', labelFa: 'دوربین مداربسته IP', val: 'Security CCTV Camera' },
    { labelEn: 'WAN Gateway', labelFa: 'مسیریاب اینترنت / WAN', val: 'WAN Gateway Link' },
  ];

  // Generate Cisco CLI syntax for preview
  const generateCommand = () => {
    const cleanDesc = description.trim();
    if (cleanDesc) {
      return [
        `${devName}# configure terminal`,
        `Enter configuration commands, one per line. End with CNTL/Z.`,
        `${devName}(config)# interface ${portId}`,
        `${devName}(config-if)# description ${cleanDesc}`,
        `${devName}(config-if)# exit`,
        `${devName}(config)# exit`,
        `%SYS-5-CONFIG_I: Configured from console by admin`,
        `%PORT-5-DESC: Interface ${portId} description updated to "${cleanDesc}"`
      ].join('\n');
    } else {
      return [
        `${devName}# configure terminal`,
        `Enter configuration commands, one per line. End with CNTL/Z.`,
        `${devName}(config)# interface ${portId}`,
        `${devName}(config-if)# no description`,
        `${devName}(config-if)# exit`,
        `${devName}(config)# exit`,
        `%SYS-5-CONFIG_I: Configured from console by admin`,
        `%PORT-5-DESC: Interface ${portId} description removed`
      ].join('\n');
    }
  };

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(generateCommand());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(description.trim());
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 modal-backdrop-blur overflow-y-auto"
      data-modal-backdrop="true"
      onClick={() => {
        if (!isLoading) onClose();
      }}
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto animate-in fade-in zoom-in-95 duration-200 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm sm:text-base">
                  {isEn ? 'Set Port Description' : 'تنظیم توضیحات پورت (Port Description)'}
                </h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                  {portId}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                <Server className="w-3 h-3 text-slate-500" />
                <span>{device.name}</span>
                <span>•</span>
                <span>VLAN {port.vlan}</span>
                <span>•</span>
                <span className={isUp ? 'text-emerald-400' : 'text-slate-400'}>
                  {isUp ? (isEn ? 'Active' : 'فعال') : (isEn ? 'Down' : 'قطع')}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Current Description Status */}
          {port.description ? (
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 text-[11px]">{isEn ? 'Current Description:' : 'توضیحات فعلی پورت:'}</span>
                <div className="font-mono text-amber-300 font-semibold mt-0.5">
                  "{port.description}"
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDescription('')}
                className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition"
                title={isEn ? 'Clear description' : 'پاک کردن توضیحات'}
              >
                <RotateCcw className="w-3 h-3" />
                <span>{isEn ? 'Clear' : 'پاک کردن'}</span>
              </button>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 text-[11px] text-slate-400 font-mono">
              {isEn ? 'No description currently assigned to this interface.' : 'در حال حاضر هیچ توضیحی برای این پورت ثبت نشده است.'}
            </div>
          )}

          {/* Description Input Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                {isEn ? 'Port Description Text:' : 'متن توضیحات پورت (Cisco Description):'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono font-normal">
                {description.length} / 80 chars
              </span>
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                maxLength={80}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={isEn ? 'e.g. Uplink to Core SW / Server Farm / AP MDF' : 'مثال: Uplink to Core SW / AP MDF / Server Farm'}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition placeholder:text-slate-500 text-left"
                dir="ltr"
              />
              {description && (
                <button
                  type="button"
                  onClick={() => setDescription('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded transition"
                  title="Clear"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isEn
                ? 'Adds an identification string to interface running-config for documentation and monitoring.'
                : 'این متن در پیکربندی تجهیز ذخیره شده و نقش یا مقصد اتصال پورت را مشخص می‌کند.'}
            </p>
          </div>

          {/* Quick Preset Chips */}
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 mb-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{isEn ? 'Quick Role Presets:' : 'الگوهای سریع آماده:'}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setDescription(p.val)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition cursor-pointer ${
                    description === p.val
                      ? 'bg-amber-500/25 border-amber-500 text-amber-300 font-bold'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-600'
                  }`}
                >
                  {isEn ? p.labelEn : p.labelFa}
                </button>
              ))}
            </div>
          </div>

          {/* Cisco CLI Command Syntax Preview Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                {isEn ? 'Cisco IOS Command Preview:' : 'پیش‌نمایش دستورات سیسکو (Cisco IOS CLI):'}
              </span>
              <button
                type="button"
                onClick={handleCopyCommand}
                className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">{isEn ? 'Copied' : 'کپی شد'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>{isEn ? 'Copy CLI' : 'کپی دستورات'}</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3 bg-black/70 border border-slate-800 rounded-xl font-mono text-[11px] text-emerald-400/90 whitespace-pre-wrap leading-relaxed select-all text-left shadow-inner max-h-36 overflow-y-auto" dir="ltr">
              {generateCommand()}
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition cursor-pointer disabled:opacity-50"
            >
              {isEn ? 'Cancel' : 'انصراف'}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer border border-amber-400/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isEn ? 'Applying...' : 'در حال اعمال روی پورت...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Apply Description' : 'تایید و اعمال دیسکریپشن'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
