import React, { useState, useEffect, useMemo } from 'react';
import { CustomTopologyRack, MountedHardwareDevice } from '../../types';
import { ArrowRightLeft, Check, X, AlertTriangle, Server, Box, Layers, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export interface TransferDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: MountedHardwareDevice | null;
  sourceRack: CustomTopologyRack | null;
  allRacks: CustomTopologyRack[];
  onTransferDevice: (
    sourceRackId: string,
    targetRackId: string,
    deviceId: string,
    targetStartU: number
  ) => void;
}

export const TransferDeviceModal: React.FC<TransferDeviceModalProps> = ({
  isOpen,
  onClose,
  device,
  sourceRack,
  allRacks = [],
  onTransferDevice,
}) => {
  const { isEn, isRtl } = useLanguage();

  const otherRacks = useMemo(() => {
    if (!sourceRack) return [];
    return allRacks.filter((r) => r.id !== sourceRack.id);
  }, [allRacks, sourceRack]);

  const [targetRackId, setTargetRackId] = useState<string>('');
  const [targetStartU, setTargetStartU] = useState<number>(1);

  const selectedTargetRack = useMemo(() => {
    return otherRacks.find((r) => r.id === targetRackId) || otherRacks[0] || null;
  }, [otherRacks, targetRackId]);

  // Helper to find first free contiguous slot in target rack
  const findFirstFreeSlot = (rack: CustomTopologyRack, heightU: number): number | null => {
    const occupiedUnits = new Set<number>();
    for (const d of rack.devices) {
      for (let u = d.startU; u < d.startU + d.heightU; u++) {
        occupiedUnits.add(u);
      }
    }
    for (let u = 1; u <= rack.units - heightU + 1; u++) {
      let isFree = true;
      for (let offset = 0; offset < heightU; offset++) {
        if (occupiedUnits.has(u + offset)) {
          isFree = false;
          break;
        }
      }
      if (isFree) return u;
    }
    return null;
  };

  // Helper to check collision
  const checkCollision = (rack: CustomTopologyRack, candidateU: number, heightU: number) => {
    const endU = candidateU + heightU - 1;
    if (candidateU < 1 || endU > rack.units) {
      return {
        isBlocked: true,
        reason: isEn ? `Out of rack boundary (1-${rack.units}U)` : `خارج از محدوده یونیت‌های رک (۱ تا ${rack.units})`,
      };
    }
    for (const d of rack.devices) {
      const dStart = d.startU;
      const dEnd = d.startU + d.heightU - 1;
      if (Math.max(candidateU, dStart) <= Math.min(endU, dEnd)) {
        return {
          isBlocked: true,
          reason: isEn
            ? `Collides with "${d.brand} ${d.model}" occupying U${dStart}-U${dEnd}`
            : `تداخل با «${d.brand} ${d.model}» در یونیت‌های U${dStart} تا U${dEnd}`,
        };
      }
    }
    return { isBlocked: false, reason: '' };
  };

  // When opening or changing otherRacks, initialize target rack & slot
  useEffect(() => {
    if (isOpen && otherRacks.length > 0 && device) {
      const defaultTarget = otherRacks[0];
      setTargetRackId(defaultTarget.id);
      const freeU = findFirstFreeSlot(defaultTarget, device.heightU);
      setTargetStartU(freeU !== null ? freeU : 1);
    }
  }, [isOpen, otherRacks, device]);

  // When target rack changes, update candidate U
  const handleTargetRackChange = (newRackId: string) => {
    setTargetRackId(newRackId);
    const r = otherRacks.find((rack) => rack.id === newRackId);
    if (r && device) {
      const freeU = findFirstFreeSlot(r, device.heightU);
      setTargetStartU(freeU !== null ? freeU : 1);
    }
  };

  if (!isOpen || !device || !sourceRack) return null;

  const collision = selectedTargetRack
    ? checkCollision(selectedTargetRack, targetStartU, device.heightU)
    : { isBlocked: true, reason: 'No target rack available' };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTargetRack || collision.isBlocked) return;

    onTransferDevice(sourceRack.id, selectedTargetRack.id, device.id, targetStartU);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEn ? 'Transfer Device to Another Rack' : 'انتقال دیوایس به رک دیگر'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEn
                  ? 'Relocate mounted equipment between server cabinets'
                  : 'جابه‌جایی فیزیکی تجهیز نصب‌شده بین رک‌های سرور'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        {otherRacks.length === 0 ? (
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-amber-300 mb-1">
                  {isEn ? 'No Other Racks Available' : 'رک مقصد دیگری در نقشه یافت نشد'}
                </p>
                <p className="leading-relaxed">
                  {isEn
                    ? 'There is only one rack on this canvas. To transfer equipment, please first create another server rack using the "+ Add Rack" button in the canvas toolbar.'
                    : 'در حال حاضر تنها یک رک در این نقشه وجود دارد. برای انتقال تجهیزات به رک دیگر، ابتدا با دکمه «+ افزودن رک» در نوار ابزار بالا، رک جدیدی به نقشه اضافه کنید.'}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
              >
                {isEn ? 'Close' : 'بستن'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Device Info Badge */}
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold text-xs">
                  {device.heightU}U
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{device.brand} {device.model}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                      {device.category}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {isEn ? 'Current Location:' : 'موقعیت فعلی:'}{' '}
                    <span className="text-cyan-300 font-semibold">{sourceRack.name}</span>{' '}
                    <span className="text-slate-500 font-mono">
                      (U{device.startU} - U{device.startU + device.heightU - 1})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Destination Rack Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                {isEn ? 'Select Destination Rack Cabinet:' : 'انتخاب رک سرور مقصد:'}
              </label>
              <select
                value={targetRackId}
                onChange={(e) => handleTargetRackChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition cursor-pointer"
              >
                {otherRacks.map((r) => {
                  const used = r.devices.reduce((acc, d) => acc + d.heightU, 0);
                  const free = r.units - used;
                  return (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.units}U • {free}U {isEn ? 'free' : 'آزاد'} • {r.devices.length} {isEn ? 'devices' : 'تجهیز'})
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Target Starting U Selection */}
            {selectedTargetRack && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    {isEn ? 'Starting Unit in Target Rack:' : 'یونیت شروع در رک مقصد:'}
                  </label>
                  <span className="text-xs font-mono font-bold text-sky-400">
                    U{targetStartU} - U{targetStartU + device.heightU - 1}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={Math.max(1, selectedTargetRack.units - device.heightU + 1)}
                    value={targetStartU}
                    onChange={(e) => setTargetStartU(parseInt(e.target.value) || 1)}
                    className="flex-1 accent-sky-500 cursor-pointer"
                  />
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={1}
                      max={selectedTargetRack.units - device.heightU + 1}
                      value={targetStartU}
                      onChange={(e) => setTargetStartU(parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-sky-400 font-mono font-bold text-xs text-center focus:border-sky-500 focus:outline-none"
                    />
                    <span className="text-slate-400 font-mono text-xs">U</span>
                  </div>
                </div>

                {/* Collision Check Feedback */}
                {collision.isBlocked ? (
                  <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{collision.reason}</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {isEn
                        ? `Slot is available: Device will occupy U${targetStartU} to U${targetStartU + device.heightU - 1} in ${selectedTargetRack.name}`
                        : `یونیت‌های U${targetStartU} تا U${targetStartU + device.heightU - 1} در رک «${selectedTargetRack.name}» آزاد هستند.`}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold transition cursor-pointer"
              >
                {isEn ? 'Cancel' : 'انصراف'}
              </button>
              <button
                type="submit"
                disabled={collision.isBlocked || !selectedTargetRack}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-sky-600/30 transition active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <ArrowRightLeft className="w-4 h-4" />
                <span>
                  {isEn
                    ? `Transfer to ${selectedTargetRack?.name || 'Rack'}`
                    : `انتقال به رک «${selectedTargetRack?.name || 'مقصد'}»`}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
