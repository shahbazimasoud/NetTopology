import React, { useState } from 'react';
import { CustomTopologyRack, MountedHardwareDevice, RackViewMode } from '../../types';
import { RackCabinetSvg } from './RackCabinetSvg';
import { HardwareSvgRenderer } from './HardwareSvgRenderer';
import {
  X,
  Eye,
  EyeOff,
  Plus,
  Network,
  Trash2,
  Edit3,
  Server,
  Box,
  Activity,
  ChevronUp,
  ChevronDown,
  Sliders,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface RackElevationInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  rack: CustomTopologyRack | null;
  onToggleViewMode: (rackId: string, newMode: RackViewMode) => void;
  onOpenAddHardware: (rackId: string, targetU?: number) => void;
  onEditDeviceNic: (device: MountedHardwareDevice, rack: CustomTopologyRack) => void;
  onEditSpecs?: (device: MountedHardwareDevice, rack: CustomTopologyRack) => void;
  onMoveDevice?: (rackId: string, deviceId: string, newStartU: number) => void;
  onRemoveDevice: (rackId: string, deviceId: string) => void;
  onDeleteRack: (rackId: string) => void;
}

export const RackElevationInspectorModal: React.FC<RackElevationInspectorModalProps> = ({
  isOpen,
  onClose,
  rack,
  onToggleViewMode,
  onOpenAddHardware,
  onEditDeviceNic,
  onEditSpecs,
  onMoveDevice,
  onRemoveDevice,
  onDeleteRack,
}) => {
  const { isEn, isRtl } = useLanguage();
  const [selectedDevice, setSelectedDevice] = useState<MountedHardwareDevice | null>(null);

  if (!isOpen || !rack) return null;

  // Keep selected device synced with rack state if changed
  const currentSelectedDevice = selectedDevice
    ? rack.devices.find((d) => d.id === selectedDevice.id) || null
    : null;

  const totalWatts = rack.devices.reduce((acc, d) => acc + (d.powerWatts || 0), 0);
  const usedUnits = rack.devices.reduce((acc, d) => acc + d.heightU, 0);
  const freeUnits = rack.units - usedUnits;
  const totalKva = totalWatts > 0 ? (totalWatts / 850).toFixed(2) : '0.00';
  const totalKw = (totalWatts / 1000).toFixed(2);
  const totalAmps = totalWatts > 0 ? (totalWatts / (230 * 0.85)).toFixed(1) : '0.0';

  // Helper to check if moving device up/down collides
  const canMove = (dev: MountedHardwareDevice, step: number) => {
    const candidateU = dev.startU + step;
    const endU = candidateU + dev.heightU - 1;
    if (candidateU < 1 || endU > rack.units) return false;
    for (const other of rack.devices) {
      if (other.id === dev.id) continue;
      const oStart = other.startU;
      const oEnd = other.startU + other.heightU - 1;
      if (Math.max(candidateU, oStart) <= Math.min(endU, oEnd)) {
        return false;
      }
    }
    return true;
  };

  const handleStepMove = (dev: MountedHardwareDevice, step: number) => {
    if (!onMoveDevice) return;
    if (canMove(dev, step)) {
      onMoveDevice(rack.id, dev.id, dev.startU + step);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-xl animate-fade-in"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        className="w-full max-w-6xl h-[94vh] rounded-3xl bg-slate-950 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-lg">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">{rack.name}</h2>
                <span className="px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold">
                  {rack.units}U • {isEn ? `depth ${rack.depth}cm` : `عمق ${rack.depth}cm`}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isEn
                  ? 'Data Center 19-inch Server Rack Elevation & Physical Asset Studio'
                  : 'استودیو مدیریت و بازرسی فیزیکی رک سرور ۱۹ اینچ دیتاسنتر'}
              </p>
            </div>
          </div>

          {/* Top Controls */}
          <div className="flex items-center gap-3">
            {/* View Mode Toggle Button */}
            <button
              type="button"
              onClick={() => onToggleViewMode(rack.id, rack.viewMode === 'front' ? 'rear' : 'front')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                rack.viewMode === 'front'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 ring-2 ring-cyan-400/40'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 ring-2 ring-purple-400/40'
              }`}
            >
              {rack.viewMode === 'front' ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span>
                {rack.viewMode === 'front'
                  ? isEn
                    ? 'Front View'
                    : 'نمای جلو (Front View)'
                  : isEn
                  ? 'Rear View'
                  : 'نمای پشت (Rear View)'}
              </span>
            </button>

            {/* Add Hardware Button */}
            <button
              type="button"
              onClick={() => onOpenAddHardware(rack.id)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition"
            >
              <Plus className="w-4 h-4" />
              <span>{isEn ? 'Install Hardware' : 'نصب تجهیز جدید'}</span>
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Studio Body: Split View (Left: Rack Elevation SVG, Right: Equipment & NIC Inspector) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
          {/* Main Visual Rack Elevation Column (7 cols) */}
          <div className="lg:col-span-7 h-full overflow-y-auto p-6 flex flex-col items-center bg-slate-900/50 border-b lg:border-b-0 lg:border-l border-slate-800">
            <div className="mb-3 text-xs text-slate-400 flex items-center gap-4">
              <span>
                {isEn
                  ? 'Drag devices inside the rack or click to inspect and configure.'
                  : 'تجهیزات را با درگ جابه‌جا کنید یا برای تنظیم کلیک نمایید.'}
              </span>
              <span className="font-mono text-cyan-400">
                {rack.viewMode === 'front'
                  ? isEn
                    ? 'Current: Front Faceplate'
                    : 'وضعیت فعلی: نمای روبه‌رو (جلو)'
                  : isEn
                  ? 'Current: Rear I/O & PSUs'
                  : 'وضعیت فعلی: نمای پشت (پاور و پورت‌ها)'}
              </span>
            </div>

            <div className="scale-95 sm:scale-100 origin-top">
              <RackCabinetSvg
                rack={rack}
                onToggleViewMode={onToggleViewMode}
                onOpenAddHardware={onOpenAddHardware}
                onInspectRack={() => {}}
                onDeleteRack={onDeleteRack}
                onSelectDevice={(dev) => setSelectedDevice(dev)}
                onEditDeviceNic={(dev) => onEditDeviceNic(dev, rack)}
                onEditSpecs={(dev) => onEditSpecs && onEditSpecs(dev, rack)}
                onMoveDevice={onMoveDevice}
                onRemoveDevice={onRemoveDevice}
                selectedDeviceId={currentSelectedDevice?.id}
              />
            </div>
          </div>

          {/* Right Inspector & Inventory Column (5 cols) */}
          <div className="lg:col-span-5 h-full overflow-y-auto p-6 space-y-6 bg-slate-950">
            {/* Rack Specs Card */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>{isEn ? 'Rack Telemetry & Utilization' : 'خلاصه مشخصات فنی و مصرف رک'}</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">{isEn ? 'Total Capacity' : 'کل ظرفیت'}</div>
                  <div className="text-base font-bold font-mono text-white">{rack.units}U</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">{isEn ? 'Occupied' : 'یونیت اشغال'}</div>
                  <div className="text-base font-bold font-mono text-cyan-400">
                    {usedUnits}U <span className="text-[10px] text-slate-400 font-normal">({Math.round((usedUnits / rack.units) * 100)}%)</span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">{isEn ? 'Active Power' : 'توان مصرفی اکتیو'}</div>
                  <div className="text-base font-bold font-mono text-amber-400">
                    {totalWatts >= 1000 ? `${totalKw} kW` : `${totalWatts}W`}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-[10px] text-slate-400">{isEn ? 'Apparent Power' : 'توان ظاهری (kVA)'}</div>
                  <div className="text-base font-bold font-mono text-amber-300">
                    {totalKva} kVA
                  </div>
                </div>
              </div>

              {/* Electrical Specs Sub-strip */}
              <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEn ? 'Line Load:' : 'جریان برآوردی فاز:'}</span>
                  <strong>~{totalAmps}A @ 230V AC</strong>
                  <span>(PF 0.85)</span>
                </span>
                <span className="text-cyan-400">
                  {isEn
                    ? `Recommended Breaker: ${Number(totalAmps) > 16 ? '32A (C32)' : '16A (C16)'}`
                    : `فیوز پیشنهادی: ${Number(totalAmps) > 16 ? '۳۲ آمپر (C32)' : '۱۶ یا ۲۰ آمپر (C16)'}`}
                </span>
              </div>
            </div>

            {/* Selected Device Detail Card */}
            {currentSelectedDevice ? (
              <div className="p-5 rounded-2xl bg-slate-900 border border-cyan-500/50 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{currentSelectedDevice.name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {currentSelectedDevice.brand} • {currentSelectedDevice.model} ({currentSelectedDevice.generation || 'Gen'})
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Move Up/Down buttons with real-time collision checks */}
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => handleStepMove(currentSelectedDevice, 1)}
                        disabled={!canMove(currentSelectedDevice, 1)}
                        className="p-1 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
                        title={isEn ? 'Move Up 1U' : 'انتقال ۱ یونیت به بالا'}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStepMove(currentSelectedDevice, -1)}
                        disabled={!canMove(currentSelectedDevice, -1)}
                        className="p-1 text-slate-300 hover:text-cyan-400 hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition"
                        title={isEn ? 'Move Down 1U' : 'انتقال ۱ یونیت به پایین'}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Edit Full Specs */}
                    {onEditSpecs && (
                      <button
                        type="button"
                        onClick={() => onEditSpecs(currentSelectedDevice, rack)}
                        className="px-2.5 py-1 rounded-lg bg-cyan-600/80 text-white hover:bg-cyan-500 text-xs font-bold flex items-center gap-1 transition"
                      >
                        <Sliders className="w-3 h-3" />
                        <span>{isEn ? 'Edit Specs' : 'ویرایش مشخصات'}</span>
                      </button>
                    )}

                    {/* Edit NICs & Ports */}
                    <button
                      type="button"
                      onClick={() => onEditDeviceNic(currentSelectedDevice, rack)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/80 text-white hover:bg-emerald-500 text-xs font-bold flex items-center gap-1 transition"
                    >
                      <Network className="w-3 h-3" />
                      <span>{isEn ? 'Ports' : 'پورت‌ها'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onRemoveDevice(rack.id, currentSelectedDevice.id);
                        setSelectedDevice(null);
                      }}
                      className="p-1 rounded-lg bg-red-950/60 text-red-400 hover:bg-red-800 hover:text-white transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Device Placement & Power */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{isEn ? 'Mounted Slot' : 'یونیت‌های نصب'}</span>
                    <span className="text-cyan-300 font-bold">
                      U{currentSelectedDevice.startU} - U{currentSelectedDevice.startU + currentSelectedDevice.heightU - 1}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{isEn ? 'Height' : 'ارتفاع اشغال'}</span>
                    <span className="text-white font-bold">{currentSelectedDevice.heightU}U</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">{isEn ? 'Power Draw' : 'مصرف برق'}</span>
                    <span className="text-amber-400 font-bold">{currentSelectedDevice.powerWatts || 0}W</span>
                  </div>
                </div>

                {/* Network Cards Breakdown */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold text-slate-300 block">
                    {isEn
                      ? `Network Cards & Interfaces (${currentSelectedDevice.networkCards.length} NICs):`
                      : `کارت‌های شبکه و اینترفیس‌ها (${currentSelectedDevice.networkCards.length} کارت):`}
                  </span>
                  <div className="space-y-2">
                    {currentSelectedDevice.networkCards.map((card, idx) => (
                      <div
                        key={card.id || idx}
                        className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Network className="w-4 h-4 text-cyan-400" />
                          <div>
                            <span className="font-bold text-white block">{card.name}</span>
                            <span className="text-[10px] text-slate-400">{card.slot || 'Expansion Slot'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[11px]">
                            {card.portCount} {isEn ? 'Ports' : 'پورت'}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-mono text-[11px]">
                            {card.portType}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Micro SVG Preview of Selected Device */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-center">
                  <HardwareSvgRenderer
                    device={currentSelectedDevice}
                    viewMode={rack.viewMode}
                    width={380}
                    height={currentSelectedDevice.heightU * 32}
                  />
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-slate-900/60 border border-dashed border-slate-800 text-center space-y-2">
                <Server className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  {isEn
                    ? 'Click any device in the rack or select from the list below to inspect and configure NICs and ports.'
                    : 'برای مشاهده و ویرایش جزئیات کارت‌های شبکه و پورت‌ها، یک تجهیز را از لیست زیر یا داخل رک انتخاب کنید.'}
                </p>
              </div>
            )}

            {/* List of All Mounted Hardware in This Rack */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300">
                  {isEn
                    ? `Mounted Hardware Inventory (${rack.devices.length}):`
                    : `لیست تجهیزات نصب‌شده در رک (${rack.devices.length}):`}
                </h3>
                <button
                  type="button"
                  onClick={() => onOpenAddHardware(rack.id)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isEn ? 'Install Hardware' : 'نصب تجهیز جدید'}</span>
                </button>
              </div>

              {rack.devices.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-500">
                  {isEn
                    ? 'This rack is currently empty. Click above to install servers, switches, or storage.'
                    : 'این رک خالی است. با دکمه بالا تجهیزات سرور، سوییچ یا استوریج اضافه کنید.'}
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {rack.devices.map((dev) => {
                    const isSelected = currentSelectedDevice?.id === dev.id;
                    const devPorts = dev.networkCards.reduce((acc, c) => acc + c.portCount, 0);
                    return (
                      <div
                        key={dev.id}
                        onClick={() => setSelectedDevice(dev)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500 shadow-md'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-cyan-300">
                            U{dev.startU}
                          </span>
                          <div>
                            <span className="font-bold text-xs text-white block">{dev.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {dev.brand} {dev.model} • {dev.heightU}U • {devPorts} {isEn ? 'ports' : 'پورت'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {onEditSpecs && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditSpecs(dev, rack);
                              }}
                              className="p-1 rounded hover:bg-slate-800 text-cyan-400 hover:text-cyan-200 transition"
                              title={isEn ? 'Edit Specifications' : 'ویرایش مشخصات'}
                            >
                              <Sliders className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditDeviceNic(dev, rack);
                            }}
                            className="p-1 rounded hover:bg-slate-800 text-emerald-400 hover:text-emerald-200 transition"
                            title={isEn ? 'Configure Network Cards' : 'تنظیم کارت‌های شبکه'}
                          >
                            <Network className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveDevice(rack.id, dev.id);
                              if (selectedDevice?.id === dev.id) setSelectedDevice(null);
                            }}
                            className="p-1 rounded hover:bg-red-900/80 text-red-400 hover:text-red-200 transition"
                            title={isEn ? 'Remove' : 'حذف'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
