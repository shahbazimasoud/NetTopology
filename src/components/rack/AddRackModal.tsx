import React, { useState, useEffect } from 'react';
import { CustomTopologyRack, RackDepth, RackUnitSize } from '../../types';
import { Box, Check, X, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export interface AddRackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRack: (rack: Omit<CustomTopologyRack, 'id' | 'devices' | 'x' | 'y'>) => void;
  existingRacks?: CustomTopologyRack[];
}

export const RACK_SIZES: RackUnitSize[] = [12, 16, 21, 24, 28, 32, 36, 40, 42, 44, 48];
export const RACK_DEPTHS: RackDepth[] = [60, 80, 100, 120];

export const AddRackModal: React.FC<AddRackModalProps> = ({
  isOpen,
  onClose,
  onAddRack,
  existingRacks = [],
}) => {
  const { isEn, isRtl } = useLanguage();
  const [name, setName] = useState('Rack-01');
  const [units, setUnits] = useState<RackUnitSize>(42);
  const [depth, setDepth] = useState<RackDepth>(100);
  const [color, setColor] = useState('#0f172a');

  // Suggest a unique next rack name when opening modal
  useEffect(() => {
    if (isOpen) {
      const existingNames = new Set(
        existingRacks.map((r) => r.name.trim().toLowerCase())
      );
      let nextNum = 1;
      let candidate = isEn ? `Rack-0${nextNum}` : `رک-0${nextNum}`;
      while (existingNames.has(candidate.toLowerCase())) {
        nextNum++;
        const numStr = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
        candidate = isEn ? `Rack-${numStr}` : `رک-${numStr}`;
      }
      setName(candidate);
      setUnits(42);
      setDepth(100);
      setColor('#0f172a');
    }
  }, [isOpen, existingRacks, isEn]);

  if (!isOpen) return null;

  const trimmedName = name.trim();
  const isDuplicateName = existingRacks.some(
    (r) => r.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedName || isDuplicateName) return;

    onAddRack({
      name: trimmedName,
      units,
      depth,
      viewMode: 'front',
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
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEn ? 'Add New Server Rack (19-inch)' : 'افزودن رک سرور جدید (Server Rack)'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEn
                  ? 'Design and place standard 19-inch data center server cabinets'
                  : 'طراحی و جاگذاری رک‌های استاندارد ۱۹ اینچ دیتا سنتر'}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
              placeholder={isEn ? 'e.g. Rack A-01 or Main Core Cabinet' : 'مثال: Rack A-01 یا Main Server Cabinet'}
              className={`w-full px-4 py-2.5 rounded-xl bg-slate-950 border text-white placeholder-slate-500 text-sm focus:outline-none transition ${
                isDuplicateName
                  ? 'border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                  : 'border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
              }`}
            />
            {isDuplicateName && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium pt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {isEn
                    ? 'A rack with this name already exists. Please choose a unique name.'
                    : 'رکی با این نام از قبل در نقشه وجود دارد. لطفاً یک نام متمایز و یکتا انتخاب کنید.'}
                </span>
              </div>
            )}
          </div>

          {/* Unit Size Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>{isEn ? 'Rack Height (Unit Size):' : 'ارتفاع رک (اندازه به یونیت):'}</span>
              <span className="text-cyan-400 font-mono font-bold text-sm">{units}U</span>
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {RACK_SIZES.map((size) => {
                const isSelected = units === size;
                const sizeLabel =
                  size <= 16
                    ? isEn
                      ? 'Compact'
                      : 'فشرده'
                    : size <= 24
                    ? isEn
                      ? 'Mid-Size'
                      : 'نیمه قد'
                    : size <= 40
                    ? isEn
                      ? 'Standard'
                      : 'استاندارد'
                    : isEn
                    ? 'Full Rack'
                    : 'تمام قد';
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setUnits(size)}
                    className={`py-2.5 px-2 rounded-xl text-center border font-bold text-sm transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-b from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-lg shadow-cyan-500/20 scale-102'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="font-mono text-sm">{size}U</span>
                    <span className="text-[9px] opacity-75 font-normal">{sizeLabel}</span>
                  </button>
                );
              })}
            </div>
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
                const depthLabel =
                  d === 60
                    ? isEn
                      ? 'Shallow / Telco'
                      : 'سوئیچینگ کم‌عمق'
                    : d === 80
                    ? isEn
                      ? 'Network switch'
                      : 'سوئیچ و شبکه'
                    : d === 100
                    ? isEn
                      ? 'Standard server'
                      : 'استاندارد سرور'
                    : isEn
                    ? 'Deep datacenter'
                    : 'دیتاسنتری عمیق';
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDepth(d)}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-b from-cyan-900/60 to-slate-900 border-cyan-500 text-white ring-1 ring-cyan-500/40'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-mono font-bold text-sm">{d} cm</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{depthLabel}</div>
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
                      ? 'border-cyan-400 bg-slate-800 text-white ring-1 ring-cyan-400/30'
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
              disabled={!trimmedName || isDuplicateName}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-cyan-600/30 transition active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isEn ? 'Add Rack to Canvas' : 'ایجاد و افزودن رک به نقشه'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
