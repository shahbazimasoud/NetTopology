import React, { useState, useEffect } from 'react';
import { CustomTopologyRack, RackDepth, RackUnitSize } from '../../types';
import { Sliders, Check, X, AlertTriangle, Info, Server } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { RACK_SIZES, RACK_DEPTHS } from './AddRackModal';

export interface EditRackModalProps {
  isOpen: boolean;
  onClose: () => void;
  rack: CustomTopologyRack | null;
  existingRacks?: CustomTopologyRack[];
  onSaveRack: (updatedRack: CustomTopologyRack) => void;
}

export const EditRackModal: React.FC<EditRackModalProps> = ({
  isOpen,
  onClose,
  rack,
  existingRacks = [],
  onSaveRack,
}) => {
  const { isEn, isRtl } = useLanguage();
  const [name, setName] = useState('');
  const [units, setUnits] = useState<number>(42);
  const [depth, setDepth] = useState<RackDepth>(100);
  const [color, setColor] = useState('#0f172a');

  useEffect(() => {
    if (rack && isOpen) {
      setName(rack.name);
      setUnits(rack.units);
      setDepth(rack.depth);
      setColor(rack.color || '#0f172a');
    }
  }, [rack, isOpen]);

  if (!isOpen || !rack) return null;

  const trimmedName = name.trim();
  // Check duplicate against OTHER racks (exclude self)
  const isDuplicateName = existingRacks.some(
    (r) => r.id !== rack.id && r.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );

  // Calculate highest occupied unit in this rack
  const highestOccupiedU = (rack.devices || []).reduce(
    (max, d) => Math.max(max, d.startU + d.heightU - 1),
    0
  );
  const usedUnits = (rack.devices || []).reduce((acc, d) => acc + d.heightU, 0);

  const isUnitsTooLow = units < highestOccupiedU;
  const isInvalid = !trimmedName || isDuplicateName || isUnitsTooLow || units < 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isInvalid) return;

    onSaveRack({
      ...rack,
      name: trimmedName,
      units: units as RackUnitSize,
      depth,
      color,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{isEn ? 'Edit Rack Properties' : 'ویرایش مشخصات و ابعاد رک'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono border border-slate-700">
                  {rack.name}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {isEn
                  ? 'Update rack name, height (units), depth, and frame aesthetics'
                  : 'تغییر نام رک، تعداد یونیت‌ها، عمق شاسی و رنگ ظاهری رک'}
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

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Current Status Overview Banner */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2.5">
              <Server className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-slate-300 font-medium">
                  {isEn ? 'Installed Devices:' : 'تجهیزات نصب‌شده:'}
                </span>{' '}
                <span className="text-white font-bold">{rack.devices.length} {isEn ? 'devices' : 'تجهیز'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono">
              <span className="text-slate-400">{isEn ? 'Occupied:' : 'اشغال‌شده:'}</span>
              <span className="px-2 py-0.5 rounded-lg bg-cyan-950/70 text-cyan-300 font-bold border border-cyan-800/50">
                {usedUnits}/{rack.units}U
              </span>
              {highestOccupiedU > 0 && (
                <span className="text-[11px] text-amber-400">
                  ({isEn ? `Max U: ${highestOccupiedU}` : `تا یونیت U${highestOccupiedU}`})
                </span>
              )}
            </div>
          </div>

          {/* Rack Name */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              {isEn ? 'Rack Name or Identifier:' : 'نام یا برچسب رک:'}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isEn ? 'e.g. Rack A-01, Core-Cabinet' : 'مثال: Rack A-01 یا Core-Cabinet'}
              className={`w-full px-4 py-2.5 rounded-xl bg-slate-950 border text-white placeholder-slate-500 text-sm focus:outline-none transition ${
                isDuplicateName
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                  : 'border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
              }`}
            />
            {isDuplicateName && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium pt-0.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isEn
                    ? 'Another rack with this name already exists. Please choose a unique name.'
                    : 'رک دیگری با این نام از قبل وجود دارد. لطفاً یک نام یکتا انتخاب کنید.'}
                </span>
              </div>
            )}
          </div>

          {/* Unit Size Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">
                {isEn ? 'Rack Height (Total Units):' : 'ارتفاع رک (تعداد یونیت):'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={Math.max(1, highestOccupiedU)}
                  max={60}
                  value={units}
                  onChange={(e) => setUnits(parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-cyan-400 font-mono font-bold text-sm text-center focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-cyan-400 font-mono font-bold text-sm">U</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {RACK_SIZES.map((size) => {
                const isSelected = units === size;
                const isTooSmallForDevices = size < highestOccupiedU;
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setUnits(size)}
                    disabled={isTooSmallForDevices}
                    title={
                      isTooSmallForDevices
                        ? isEn
                          ? `Cannot select ${size}U (devices installed up to U${highestOccupiedU})`
                          : `نمی‌توانید ${size}U انتخاب کنید (تجهیزات تا یونیت U${highestOccupiedU} نصب هستند)`
                        : undefined
                    }
                    className={`py-2 px-1.5 rounded-xl text-center border font-bold text-xs transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                      isTooSmallForDevices
                        ? 'opacity-30 border-slate-800 bg-slate-950/40 text-slate-600 cursor-not-allowed'
                        : isSelected
                        ? 'bg-gradient-to-b from-amber-600 to-amber-700 text-white border-amber-400 shadow-lg shadow-amber-500/20 scale-102'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="font-mono text-sm">{size}U</span>
                  </button>
                );
              })}
            </div>

            {/* Units Validation Warning */}
            {isUnitsTooLow && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>
                  {isEn
                    ? `Cannot decrease rack height below ${highestOccupiedU}U because currently installed devices extend up to unit ${highestOccupiedU}. Please relocate or delete higher-unit devices first.`
                    : `امکان کاهش ارتفاع رک به کمتر از ${highestOccupiedU}U وجود ندارد چون تجهیزات نصب‌شده فعلی تا یونیت U${highestOccupiedU} قرار دارند. لطفاً ابتدا تجهیزات یونیت‌های بالا را جابه‌جا کنید یا ارتفاع را حداقل ${highestOccupiedU}U قرار دهید.`}
                </span>
              </div>
            )}
            {!isUnitsTooLow && highestOccupiedU > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-0.5">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>
                  {isEn
                    ? `Minimum allowed height for current equipment is ${highestOccupiedU}U.`
                    : `حداقل ارتفاع مجاز برای تجهیزات فعلی نصب‌شده ${highestOccupiedU}U می‌باشد.`}
                </span>
              </div>
            )}
          </div>

          {/* Depth Selection: 60, 80, 100, 120 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>{isEn ? 'Rack Depth (cm):' : 'عمق رک (سانتی‌متر):'}</span>
              <span className="text-cyan-400 font-mono font-bold text-sm">{depth} cm</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {RACK_DEPTHS.map((d) => {
                const isSelected = depth === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDepth(d)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-b from-amber-900/60 to-slate-900 border-amber-500 text-white ring-1 ring-amber-500/40'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-mono font-bold text-sm">{d} cm</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frame Theme Palette */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">
              {isEn ? 'Rack Frame Color & Finish:' : 'رنگ و روکش شاسی رک:'}
            </label>
            <div className="flex items-center gap-3">
              {[
                { id: '#090d16', label: isEn ? 'Matte Black' : 'مشکی مات دیتاسنتر' },
                { id: '#1e293b', label: isEn ? 'Titanium Gray' : 'طوسی تیتانیومی' },
                { id: '#0f172a', label: isEn ? 'Deep Cobalt' : 'آبی متالیک تیره' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  className={`flex-1 py-2 px-3 rounded-xl border text-xs flex items-center justify-center gap-2 transition cursor-pointer ${
                    color === c.id
                      ? 'border-amber-400 bg-slate-800 text-white ring-1 ring-amber-400/30'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-600" style={{ backgroundColor: c.id }} />
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

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
              disabled={isInvalid}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isEn ? 'Save Changes' : 'ذخیره تغییرات رک'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
