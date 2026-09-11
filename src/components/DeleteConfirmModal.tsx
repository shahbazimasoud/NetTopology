import React from 'react';
import { AlertTriangle, Trash2, Box, Server, ShieldCheck, X, AlertCircle } from 'lucide-react';
import { MountedHardwareDevice } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

export interface DeleteDeviceTarget {
  type: 'device';
  id: string;
  name: string;
  ip?: string;
  role?: string;
  model?: string;
}

export interface DeleteRackTarget {
  type: 'rack';
  id: string;
  name: string;
  units: number;
  devices: MountedHardwareDevice[];
}

export interface DeleteRackDeviceTarget {
  type: 'rack_device';
  id: string;
  name: string;
  rackId: string;
  rackName?: string;
  startU: number;
  heightU: number;
  model?: string;
  brand?: string;
}

export type DeleteTarget = DeleteDeviceTarget | DeleteRackTarget | DeleteRackDeviceTarget;

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: DeleteTarget | null;
  onConfirmDeleteDevice?: (deviceId: string) => void;
  onConfirmDeleteRack?: (rackId: string, deleteMountedDevices: boolean) => void;
  onConfirmRemoveFromRack?: (rackId: string, deviceId: string) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  target,
  onConfirmDeleteDevice,
  onConfirmDeleteRack,
  onConfirmRemoveFromRack,
}) => {
  const { isEn } = useLanguage();

  if (!isOpen || !target) return null;

  const isRack = target.type === 'rack';
  const isRackDevice = target.type === 'rack_device';
  const rackTarget = isRack ? (target as DeleteRackTarget) : null;
  const rackDeviceTarget = isRackDevice ? (target as DeleteRackDeviceTarget) : null;
  const deviceTarget = target.type === 'device' ? (target as DeleteDeviceTarget) : null;
  const hasMountedDevices = (rackTarget?.devices?.length || 0) > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              isRack && hasMountedDevices
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                : isRackDevice
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
            }`}>
              {isRack ? <Box className="w-5 h-5" /> : isRackDevice ? <Server className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isRack
                  ? isEn
                    ? `Delete Server Rack (${target.name})`
                    : `حذف رک سرور («${target.name}»)`
                  : isRackDevice
                  ? isEn
                    ? `Remove Device from Rack (${target.name})`
                    : `حذف تجهیز از داخل رک («${target.name}»)`
                  : isEn
                  ? `Delete Device (${target.name})`
                  : `حذف تجهیز («${target.name}»)`}
              </h3>
              <p className="text-xs text-slate-400">
                {isRack
                  ? isEn
                    ? `${rackTarget?.units}U Datacenter Cabinet`
                    : `رک استاندارد دیتاسنتر ${rackTarget?.units} یونیت`
                  : isRackDevice
                  ? isEn
                    ? `Rack: ${rackDeviceTarget?.rackName || 'Rack'} • Units U${rackDeviceTarget?.startU}-U${(rackDeviceTarget?.startU || 1) + (rackDeviceTarget?.heightU || 1) - 1}`
                    : `رک: ${rackDeviceTarget?.rackName || 'رک'} • یونیت‌های U${rackDeviceTarget?.startU} الی U${(rackDeviceTarget?.startU || 1) + (rackDeviceTarget?.heightU || 1) - 1}`
                  : deviceTarget?.model || deviceTarget?.ip || (isEn ? 'Network Hardware' : 'تجهیز شبکه')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          {isRack ? (
            /* Rack Deletion Content */
            hasMountedDevices ? (
              <div className="space-y-3.5">
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      {isEn
                        ? `Warning: This rack contains ${rackTarget?.devices.length} installed hardware devices!`
                        : `هشدار مهم: این رک شامل ${rackTarget?.devices.length} تجهیز سخت‌افزاری نصب‌شده است!`}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    {isEn
                      ? 'Please specify what should happen to the devices installed inside this rack:'
                      : 'لطفاً مشخص فرمایید مایلید با تجهیزات داخل این رک چه رفتاری صورت گیرد:'}
                  </p>
                </div>

                {/* List of mounted devices in the rack */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 max-h-40 overflow-y-auto space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                    <span>{isEn ? 'Installed Devices' : 'لیست تجهیزات داخل رک:'}</span>
                    <span className="font-mono text-cyan-400">{rackTarget?.devices.length} {isEn ? 'units' : 'تجهیز'}</span>
                  </div>
                  {rackTarget?.devices.map((dev) => (
                    <div
                      key={dev.id}
                      className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/5 font-mono text-slate-200"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Server className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="font-bold truncate">{dev.name}</span>
                        <span className="text-[10px] text-slate-400">({dev.model})</span>
                      </div>
                      <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded shrink-0">
                        U{dev.startU}-U{dev.startU + dev.heightU - 1}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-slate-300 leading-relaxed font-medium">
                  {isEn
                    ? 'Do you want to keep these devices on the map as unmounted hardware, or delete them along with the rack?'
                    : 'آیا می‌خواهید تجهیزات به عنوان سخت‌افزار مستقل در نقشه نگهداری شوند، یا همه آنها همراه با رک حذف شوند؟'}
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-slate-200 text-xs space-y-2">
                <p className="leading-relaxed">
                  {isEn
                    ? `This rack is currently empty. Are you sure you want to delete rack "${rackTarget?.name}"?`
                    : `این رک در حال حاضر خالی از تجهیزات است. آیا از حذف رک سرور «${rackTarget?.name}» اطمینان دارید؟`}
                </p>
              </div>
            )
          ) : isRackDevice ? (
            /* Rack Device Removal Content */
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-rose-950/25 border border-rose-500/40 text-rose-200 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    {isEn
                      ? `Confirm Device Removal from Rack`
                      : `تایید حذف و خروج تجهیز از رک`}
                  </span>
                  </div>
                <p className="leading-relaxed text-slate-200">
                  {isEn
                    ? `Are you sure you want to remove "${rackDeviceTarget?.name}" (${rackDeviceTarget?.brand || ''} ${rackDeviceTarget?.model || ''}) from rack "${rackDeviceTarget?.rackName || 'Rack'}"?`
                    : `آیا از حذف تجهیز «${rackDeviceTarget?.name}» (${rackDeviceTarget?.brand || ''} ${rackDeviceTarget?.model || ''}) از داخل رک «${rackDeviceTarget?.rackName || 'رک'}» اطمینان دارید؟`}
                </p>
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300 pt-1">
                  <span>{isEn ? 'Position' : 'موقعیت'}: <strong className="text-amber-400">U{rackDeviceTarget?.startU}-U{(rackDeviceTarget?.startU || 1) + (rackDeviceTarget?.heightU || 1) - 1}</strong> ({rackDeviceTarget?.heightU}U)</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {isEn
                  ? 'This device will be unmounted from the rack. Its configuration and ports will remain safely preserved in the equipment inventory.'
                  : 'توجه: این تجهیز از رک پیاده‌سازی خواهد شد؛ اما مشخصات و پورت‌های آن جهت استفاده مجدد در لیست تجهیزات باقی می‌ماند.'}
              </p>
            </div>
          ) : (
            /* Device Deletion Content */
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-200 text-xs space-y-2">
                <p className="leading-relaxed">
                  {isEn
                    ? `Are you sure you want to remove device "${deviceTarget?.name}"?`
                    : `آیا از حذف تجهیز «${deviceTarget?.name}» از نقشه اطمینان دارید؟`}
                </p>
                <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300 pt-1">
                  {deviceTarget?.ip && <span>IP: <strong className="text-white">{deviceTarget.ip}</strong></span>}
                  {deviceTarget?.role && <span>Role: <strong className="text-white">{deviceTarget.role}</strong></span>}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {isEn
                  ? 'All network links and cable connections connected to this device will also be removed.'
                  : 'توجه: کلیه کابل‌ها، خطوط اتصال و لینک‌های متصل به این تجهیز نیز به همراه آن حذف خواهند شد.'}
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 px-5 py-4 border-t border-slate-800 bg-slate-950/70">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-white/10 transition active:scale-95 cursor-pointer"
          >
            {isEn ? 'Cancel' : 'انصراف'}
          </button>

          {isRack ? (
            hasMountedDevices ? (
              <>
                {/* Option 1: Keep devices, delete rack only */}
                <button
                  type="button"
                  onClick={() => {
                    if (rackTarget && onConfirmDeleteRack) {
                      onConfirmDeleteRack(rackTarget.id, false);
                    }
                    onClose();
                  }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold border border-cyan-400/30 shadow-lg transition active:scale-95 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isEn ? 'Keep Devices & Delete Rack' : 'حفظ تجهیزات در نقشه و حذف فقط رک'}</span>
                </button>

                {/* Option 2: Delete rack and all its devices */}
                <button
                  type="button"
                  onClick={() => {
                    if (rackTarget && onConfirmDeleteRack) {
                      onConfirmDeleteRack(rackTarget.id, true);
                    }
                    onClose();
                  }}
                  className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold border border-rose-500/50 shadow-lg transition active:scale-95 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isEn ? 'Delete Rack & All Devices' : 'حذف کامل رک به همراه تمام دیوایس‌ها'}</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (rackTarget && onConfirmDeleteRack) {
                    onConfirmDeleteRack(rackTarget.id, false);
                  }
                  onClose();
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold border border-rose-500/50 shadow-lg transition active:scale-95 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isEn ? 'Delete Rack' : 'حذف رک'}</span>
              </button>
            )
          ) : isRackDevice ? (
            <button
              type="button"
              onClick={() => {
                if (rackDeviceTarget && onConfirmRemoveFromRack) {
                  onConfirmRemoveFromRack(rackDeviceTarget.rackId, rackDeviceTarget.id);
                } else if (rackDeviceTarget && onConfirmDeleteDevice) {
                  onConfirmDeleteDevice(rackDeviceTarget.id);
                }
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold border border-rose-500/50 shadow-lg transition active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isEn ? 'Confirm & Remove from Rack' : 'تایید و حذف از رک'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (deviceTarget && onConfirmDeleteDevice) {
                  onConfirmDeleteDevice(deviceTarget.id);
                }
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold border border-rose-500/50 shadow-lg transition active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isEn ? 'Delete Device' : 'حذف تجهیز'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
