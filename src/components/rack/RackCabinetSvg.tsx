import React, { useState, useRef, useEffect } from 'react';
import { CustomTopologyRack, MountedHardwareDevice, RackViewMode } from '../../types';
import { HardwareSvgRenderer } from './HardwareSvgRenderer';
import {
  Eye,
  EyeOff,
  Plus,
  Maximize2,
  Trash2,
  Edit3,
  Network,
  Zap,
  GripVertical,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Sliders,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface RackCabinetSvgProps {
  rack: CustomTopologyRack;
  onToggleViewMode: (rackId: string, newMode: RackViewMode) => void;
  onOpenAddHardware: (rackId: string, targetU?: number) => void;
  onInspectRack: (rack: CustomTopologyRack) => void;
  onDeleteRack: (rackId: string) => void;
  onSelectDevice?: (device: MountedHardwareDevice, rack: CustomTopologyRack) => void;
  onEditDeviceNic?: (device: MountedHardwareDevice, rack: CustomTopologyRack) => void;
  onEditSpecs?: (device: MountedHardwareDevice, rack: CustomTopologyRack) => void;
  onMoveDevice?: (rackId: string, deviceId: string, newStartU: number) => void;
  onRemoveDevice?: (rackId: string, deviceId: string) => void;
  selectedDeviceId?: string | null;
  interactive?: boolean;
}

export const RackCabinetSvg: React.FC<RackCabinetSvgProps> = ({
  rack,
  onToggleViewMode,
  onOpenAddHardware,
  onInspectRack,
  onDeleteRack,
  onSelectDevice,
  onEditDeviceNic,
  onEditSpecs,
  onMoveDevice,
  onRemoveDevice,
  selectedDeviceId,
  interactive = true,
}) => {
  const { isEn, isRtl } = useLanguage();
  const [hoveredU, setHoveredU] = useState<number | null>(null);

  // Drag-and-drop state for devices within the rack
  const [draggingDevice, setDraggingDevice] = useState<MountedHardwareDevice | null>(null);
  const [dragStartY, setDragStartY] = useState<number>(0);
  const [dragTargetU, setDragTargetU] = useState<number | null>(null);
  const [dragCollision, setDragCollision] = useState<{ isBlocked: boolean; reason?: string } | null>(null);

  const U_HEIGHT = 28; // pixels per rack unit
  const RACK_WIDTH = 380;
  const RAIL_WIDTH = 26;

  // Occupancy map
  const uOccupancyMap = new Map<number, MountedHardwareDevice>();
  const topDeviceForU = new Map<number, MountedHardwareDevice>();

  rack.devices.forEach((dev) => {
    for (let u = dev.startU; u < dev.startU + dev.heightU; u++) {
      uOccupancyMap.set(u, dev);
    }
    topDeviceForU.set(dev.startU + dev.heightU - 1, dev);
  });

  const totalWatts = rack.devices.reduce((acc, d) => acc + (d.powerWatts || 0), 0);
  const usedUnits = rack.devices.reduce((acc, d) => acc + d.heightU, 0);
  const totalKva = totalWatts > 0 ? (totalWatts / 850).toFixed(2) : '0.00';
  const totalKw = (totalWatts / 1000).toFixed(2);
  const totalAmps = totalWatts > 0 ? (totalWatts / (230 * 0.85)).toFixed(1) : '0.0';

  // Helper to check collision for target U
  const checkCollision = (dev: MountedHardwareDevice, candidateU: number) => {
    const endU = candidateU + dev.heightU - 1;
    if (candidateU < 1 || endU > rack.units) {
      return {
        isBlocked: true,
        reason: isEn ? `Out of bounds (1-${rack.units}U)` : `خارج از محدوده ۱ تا ${rack.units}`,
      };
    }
    for (const other of rack.devices) {
      if (other.id === dev.id) continue;
      const oStart = other.startU;
      const oEnd = other.startU + other.heightU - 1;
      if (Math.max(candidateU, oStart) <= Math.min(endU, oEnd)) {
        return {
          isBlocked: true,
          reason: isEn ? `Collides with ${other.name}` : `تداخل با «${other.name}»`,
        };
      }
    }
    return { isBlocked: false };
  };

  // Start dragging a device
  const handleStartDrag = (e: React.MouseEvent, dev: MountedHardwareDevice) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggingDevice(dev);
    setDragStartY(e.clientY);
    setDragTargetU(dev.startU);
    setDragCollision(null);
  };

  // Drag mouse listeners
  useEffect(() => {
    if (!draggingDevice) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - dragStartY;
      const deltaUnits = -Math.round(deltaY / U_HEIGHT); // Moving mouse down reduces U, up increases U
      const candidateU = Math.max(
        1,
        Math.min(draggingDevice.startU + deltaUnits, rack.units - draggingDevice.heightU + 1)
      );

      setDragTargetU(candidateU);
      const col = checkCollision(draggingDevice, candidateU);
      setDragCollision(col);
    };

    const handleMouseUp = () => {
      if (draggingDevice && dragTargetU !== null) {
        const col = checkCollision(draggingDevice, dragTargetU);
        if (!col.isBlocked && dragTargetU !== draggingDevice.startU && onMoveDevice) {
          onMoveDevice(rack.id, draggingDevice.id, dragTargetU);
        }
      }
      setDraggingDevice(null);
      setDragTargetU(null);
      setDragCollision(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingDevice, dragStartY, dragTargetU, rack]);

  // Quick move Up/Down actions
  const handleQuickMove = (e: React.MouseEvent, dev: MountedHardwareDevice, direction: 'up' | 'down') => {
    e.stopPropagation();
    if (!onMoveDevice) return;
    const step = direction === 'up' ? 1 : -1;
    const newU = dev.startU + step;
    const col = checkCollision(dev, newU);
    if (!col.isBlocked) {
      onMoveDevice(rack.id, dev.id, newU);
    }
  };

  return (
    <div
      className="flex flex-col rounded-2xl bg-slate-950/90 border border-slate-700/80 shadow-2xl backdrop-blur-xl overflow-hidden select-none transition-all hover:border-cyan-500/50"
      style={{ width: RACK_WIDTH + 24 }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Top Control Bar with Front/Rear Toggle and Quick Actions */}
      <div className="px-3 py-2 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-700/60 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0 shadow-[0_0_8px_#22d3ee]" />
          <div className="truncate">
            <span className="text-xs font-bold text-white tracking-wide truncate block">{rack.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              {rack.units}U • {isEn ? `depth ${rack.depth}cm` : `عمق ${rack.depth}cm`}
            </span>
          </div>
        </div>

        {/* View Toggle Button: FRONT / REAR */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            title={
              rack.viewMode === 'front'
                ? isEn
                  ? 'Switch to Rear View'
                  : 'مشاهده نمای پشت (Rear)'
                : isEn
                ? 'Switch to Front View'
                : 'مشاهده نمای جلو (Front)'
            }
            onClick={(e) => {
              e.stopPropagation();
              onToggleViewMode(rack.id, rack.viewMode === 'front' ? 'rear' : 'front');
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shadow-sm ${
              rack.viewMode === 'front'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500 ring-1 ring-cyan-400/40'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 ring-1 ring-purple-400/40'
            }`}
          >
            {rack.viewMode === 'front' ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>
              {rack.viewMode === 'front'
                ? isEn
                  ? 'Front View'
                  : 'نمای جلو'
                : isEn
                ? 'Rear View'
                : 'نمای پشت'}
            </span>
          </button>

          {/* Inspect / Fullscreen Elevation Studio */}
          <button
            type="button"
            title={isEn ? 'Inspect Rack Elevation Studio' : 'بزرگ‌نمایی و بازرسی کامل رک'}
            onClick={(e) => {
              e.stopPropagation();
              onInspectRack(rack);
            }}
            className="p-1 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-700 transition"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {/* Add Hardware Button */}
          <button
            type="button"
            title={isEn ? 'Install Hardware Device' : 'افزودن تجهیز سخت‌افزاری به رک'}
            onClick={(e) => {
              e.stopPropagation();
              onOpenAddHardware(rack.id);
            }}
            className="p-1 rounded-lg bg-emerald-600/80 text-white hover:bg-emerald-500 transition"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Delete Rack Button */}
          <button
            type="button"
            title={isEn ? 'Delete Rack' : 'حذف رک'}
            onClick={(e) => {
              e.stopPropagation();
              onDeleteRack(rack.id);
            }}
            className="p-1 rounded-lg bg-red-950/60 text-red-400 hover:bg-red-800 hover:text-white transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Rack Power & Capacity Header Banner */}
      <div
        className="px-3 py-2 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-b border-slate-800/90 text-xs flex flex-col gap-1 select-none"
        title={
          isEn
            ? `Total Active Load: ${totalWatts}W (${totalKw} kW)\nApparent Power: ${totalKva} kVA (Power Factor: 0.85)\nEstimated Current: ~${totalAmps}A @ 230V AC\nRecommended Circuit Breaker: ${
                Number(totalAmps) > 16 ? '32A (C32)' : '16A/20A (C16/C20)'
              }\nInstalled Hardware: ${rack.devices.length} devices occupying ${usedUnits} of ${rack.units}U`
            : `مجموع توان مصرفی اکتیو: ${totalWatts} وات (${totalKw} کیلووات)\nتوان ظاهری کل رک: ${totalKva} کیلوولت‌آمپر (کاوا - ضریب توان ۰.۸۵)\nجریان مصرفی تقریبی: ~${totalAmps} آمپر در ولتاژ ۲۳۰ ولت\nفیوز و کلید مینیاتوری پیشنهادی: ${
                Number(totalAmps) > 16 ? 'فیوز ۳۲ آمپر (C32)' : 'فیوز ۱۶ یا ۲۰ آمپر (C16/C20)'
              }\nتجهیزات نصب‌شده: ${rack.devices.length} تجهیز با اشغال ${usedUnits} از ${rack.units} یونیت`
        }
      >
        {/* Main Power Metric Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div className={`p-1 rounded-md flex items-center justify-center ${
              totalWatts > 3000
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                : totalWatts > 1500
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
            }`}>
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-baseline gap-1.5 font-mono">
              <span className="text-white font-bold text-xs tracking-wide">
                {totalWatts >= 1000 ? `${totalKw} kW` : `${totalWatts} W`}
              </span>
              <span className="text-amber-400 font-semibold text-[11px]">
                ({totalKva} kVA)
              </span>
              <span className="text-slate-400 text-[10px] font-normal">
                ~{totalAmps}A
              </span>
            </div>
          </div>

          {/* Occupancy & Dev Count Badge */}
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="text-slate-300 bg-slate-800/90 px-1.5 py-0.5 rounded border border-white/10">
              {usedUnits}/{rack.units}U ({Math.round((usedUnits / rack.units) * 100)}%)
            </span>
            <span className="text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/30 font-bold">
              {rack.devices.length} {isEn ? 'Dev' : 'دستگاه'}
            </span>
          </div>
        </div>

        {/* Informative Label */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-sans">
          <span>{isEn ? 'Total Rack Power Load' : 'توان مصرفی کل تجهیزات رک'}</span>
          <span className="text-[9px] text-slate-500 font-mono">230V AC • PF 0.85</span>
        </div>
      </div>

      {/* Dragging Active Overlay Feedback */}
      {draggingDevice && dragTargetU !== null && (
        <div
          className={`px-3 py-1 text-xs font-bold flex items-center justify-between transition-all ${
            dragCollision?.isBlocked
              ? 'bg-rose-950/90 text-rose-300 border-b border-rose-500/80 animate-pulse'
              : 'bg-emerald-950/90 text-emerald-300 border-b border-emerald-500/80'
          }`}
        >
          <div className="flex items-center gap-1.5 truncate">
            {dragCollision?.isBlocked ? (
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            ) : (
              <GripVertical className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            )}
            <span className="truncate">
              {draggingDevice.name}: U{dragTargetU}-U{dragTargetU + draggingDevice.heightU - 1}
            </span>
          </div>
          <span className="text-[10px] shrink-0 font-mono">
            {dragCollision?.isBlocked
              ? dragCollision.reason
              : isEn
              ? 'Release to drop'
              : 'رها کنید تا قرار گیرد'}
          </span>
        </div>
      )}

      {/* Main 19-Inch SVG Rack Cabinet */}
      <div className="relative p-2 bg-slate-950/60 flex justify-center">
        <svg
          width={RACK_WIDTH}
          height={rack.units * U_HEIGHT + 16}
          viewBox={`0 0 ${RACK_WIDTH} ${rack.units * U_HEIGHT + 16}`}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={`rail-grad-${rack.id}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#334155" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <pattern id={`vent-pattern-${rack.id}`} width="4" height="4" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.8" fill="#1e293b" />
            </pattern>
          </defs>

          {/* Outer Steel Cabinet Enclosure */}
          <rect
            x="0"
            y="0"
            width={RACK_WIDTH}
            height={rack.units * U_HEIGHT + 16}
            rx="4"
            fill="#090d16"
            stroke="#334155"
            strokeWidth="1.5"
          />

          {/* Left Vertical Mounting Rail (with U numbers) */}
          <rect
            x="4"
            y="8"
            width={RAIL_WIDTH}
            height={rack.units * U_HEIGHT}
            fill={`url(#rail-grad-${rack.id})`}
            stroke="#475569"
            strokeWidth="0.8"
          />
          {/* Right Vertical Mounting Rail */}
          <rect
            x={RACK_WIDTH - 4 - RAIL_WIDTH}
            y="8"
            width={RAIL_WIDTH}
            height={rack.units * U_HEIGHT}
            fill={`url(#rail-grad-${rack.id})`}
            stroke="#475569"
            strokeWidth="0.8"
          />

          {/* Loop from top unit (units) down to bottom unit (1) */}
          {Array.from({ length: rack.units }).map((_, idx) => {
            const uNumber = rack.units - idx; // U1 is bottom, U44 is top
            const yPos = 8 + idx * U_HEIGHT;
            const occupiedDevice = uOccupancyMap.get(uNumber);
            const isTopOccupied = topDeviceForU.get(uNumber);
            const isHovered = hoveredU === uNumber;

            return (
              <g key={`unit-slot-${uNumber}`} transform={`translate(0, ${yPos})`}>
                {/* Left Rail Mounting Holes & U Label */}
                <circle cx="10" cy={U_HEIGHT / 2 - 6} r="1.4" fill="#020617" stroke="#64748b" strokeWidth="0.5" />
                <circle cx="10" cy={U_HEIGHT / 2} r="1.4" fill="#020617" stroke="#64748b" strokeWidth="0.5" />
                <circle cx="10" cy={U_HEIGHT / 2 + 6} r="1.4" fill="#020617" stroke="#64748b" strokeWidth="0.5" />
                <text
                  x="20"
                  y={U_HEIGHT / 2 + 3}
                  fill={isHovered ? '#38bdf8' : '#94a3b8'}
                  fontSize="7"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {uNumber}
                </text>

                {/* Right Rail Mounting Holes & U Label */}
                <circle
                  cx={RACK_WIDTH - 10}
                  cy={U_HEIGHT / 2 - 6}
                  r="1.4"
                  fill="#020617"
                  stroke="#64748b"
                  strokeWidth="0.5"
                />
                <circle
                  cx={RACK_WIDTH - 10}
                  cy={U_HEIGHT / 2}
                  r="1.4"
                  fill="#020617"
                  stroke="#64748b"
                  strokeWidth="0.5"
                />
                <circle
                  cx={RACK_WIDTH - 10}
                  cy={U_HEIGHT / 2 + 6}
                  r="1.4"
                  fill="#020617"
                  stroke="#64748b"
                  strokeWidth="0.5"
                />
                <text
                  x={RACK_WIDTH - 20}
                  y={U_HEIGHT / 2 + 3}
                  fill={isHovered ? '#38bdf8' : '#94a3b8'}
                  fontSize="7"
                  fontWeight="bold"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  {uNumber}
                </text>

                {/* Empty Slot Area: dashed boundary and hover action */}
                {!occupiedDevice && (
                  <g
                    className="cursor-pointer group"
                    onMouseEnter={() => setHoveredU(uNumber)}
                    onMouseLeave={() => setHoveredU(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAddHardware(rack.id, uNumber);
                    }}
                  >
                    <rect
                      x={4 + RAIL_WIDTH}
                      y="1"
                      width={RACK_WIDTH - 8 - RAIL_WIDTH * 2}
                      height={U_HEIGHT - 2}
                      fill={isHovered ? '#082f49' : '#040711'}
                      stroke={isHovered ? '#0ea5e9' : '#1e293b'}
                      strokeWidth={isHovered ? '1' : '0.5'}
                      strokeDasharray={isHovered ? undefined : '2 2'}
                    />
                    {isHovered && (
                      <g transform={`translate(${RACK_WIDTH / 2}, ${U_HEIGHT / 2 + 3})`}>
                        <text
                          fill="#38bdf8"
                          fontSize="8.5"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="sans-serif"
                        >
                          {isEn ? `+ Add Device to U${uNumber}` : `+ افزودن تجهیز به یونیت U${uNumber}`}
                        </text>
                      </g>
                    )}
                  </g>
                )}

                {/* If this U is the TOP of a mounted device, render the device covering heightU * U_HEIGHT */}
                {isTopOccupied && (
                  <g
                    transform={`translate(${4 + RAIL_WIDTH - 12}, 0)`}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectDevice) onSelectDevice(isTopOccupied, rack);
                    }}
                  >
                    <foreignObject
                      x="0"
                      y="0"
                      width={RACK_WIDTH - 8 - RAIL_WIDTH * 2 + 24}
                      height={isTopOccupied.heightU * U_HEIGHT}
                    >
                      <div
                        className={`relative group ${
                          draggingDevice?.id === isTopOccupied.id ? 'opacity-40 filter grayscale' : ''
                        }`}
                      >
                        <HardwareSvgRenderer
                          device={isTopOccupied}
                          viewMode={rack.viewMode}
                          width={RACK_WIDTH - 8 - RAIL_WIDTH * 2 + 24}
                          height={isTopOccupied.heightU * U_HEIGHT}
                          isHighlighted={selectedDeviceId === isTopOccupied.id}
                        />

                        {/* Drag Handle & Quick Actions Overlay */}
                        <div className="absolute top-1 left-3 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/95 border border-cyan-500/50 rounded-lg px-2 py-1 flex items-center gap-1.5 shadow-xl backdrop-blur-md z-30">
                          {/* In-Rack Drag Handle */}
                          <div
                            onMouseDown={(e) => handleStartDrag(e, isTopOccupied)}
                            className="p-1 rounded cursor-grab active:cursor-grabbing hover:bg-slate-800 text-cyan-400 hover:text-cyan-200 transition"
                            title={isEn ? 'Drag to move up/down in rack' : 'درگ کنید تا در رک جابه‌جا شود'}
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>

                          {/* Move Up 1U button */}
                          <button
                            type="button"
                            onClick={(e) => handleQuickMove(e, isTopOccupied, 'up')}
                            disabled={!checkCollision(isTopOccupied, isTopOccupied.startU + 1) || checkCollision(isTopOccupied, isTopOccupied.startU + 1).isBlocked}
                            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                            title={isEn ? 'Move Up 1U' : 'انتقال ۱ یونیت به بالا'}
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>

                          {/* Move Down 1U button */}
                          <button
                            type="button"
                            onClick={(e) => handleQuickMove(e, isTopOccupied, 'down')}
                            disabled={!checkCollision(isTopOccupied, isTopOccupied.startU - 1) || checkCollision(isTopOccupied, isTopOccupied.startU - 1).isBlocked}
                            className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-cyan-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                            title={isEn ? 'Move Down 1U' : 'انتقال ۱ یونیت به پایین'}
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>

                          <span className="text-[10px] font-bold text-cyan-300 px-1 border-r border-slate-700">
                            {isTopOccupied.brand} {isTopOccupied.model}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            (U{isTopOccupied.startU}-U{isTopOccupied.startU + isTopOccupied.heightU - 1})
                          </span>

                          {/* Edit Full Device Specs */}
                          {onEditSpecs && (
                            <button
                              type="button"
                              title={isEn ? 'Edit Hardware Specs' : 'ویرایش مشخصات سخت‌افزار'}
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditSpecs(isTopOccupied, rack);
                              }}
                              className="p-1 rounded hover:bg-slate-800 text-cyan-400 hover:text-cyan-200 transition"
                            >
                              <Sliders className="w-3 h-3" />
                            </button>
                          )}

                          {/* Edit Ports / NICs */}
                          {onEditDeviceNic && (
                            <button
                              type="button"
                              title={isEn ? 'Configure Network Cards & Ports' : 'تنظیم پورت‌ها و کارت‌های شبکه'}
                              onClick={(e) => {
                                e.stopPropagation();
                                onEditDeviceNic(isTopOccupied, rack);
                              }}
                              className="p-1 rounded hover:bg-slate-800 text-emerald-400 hover:text-emerald-200 transition"
                            >
                              <Network className="w-3 h-3" />
                            </button>
                          )}

                          {/* Remove from Rack */}
                          {onRemoveDevice && (
                            <button
                              type="button"
                              title={isEn ? 'Remove from Rack' : 'حذف از رک'}
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveDevice(rack.id, isTopOccupied.id);
                              }}
                              className="p-1 rounded hover:bg-red-900/80 text-red-400 hover:text-red-200 transition"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </foreignObject>
                  </g>
                )}
              </g>
            );
          })}

          {/* Render Drag Ghost Preview when actively dragging */}
          {draggingDevice && dragTargetU !== null && (
            <g
              transform={`translate(${4 + RAIL_WIDTH - 12}, ${
                8 + (rack.units - (dragTargetU + draggingDevice.heightU - 1)) * U_HEIGHT
              })`}
              className="pointer-events-none"
            >
              <rect
                x="0"
                y="0"
                width={RACK_WIDTH - 8 - RAIL_WIDTH * 2 + 24}
                height={draggingDevice.heightU * U_HEIGHT}
                rx="2"
                fill={dragCollision?.isBlocked ? 'rgba(244, 63, 94, 0.35)' : 'rgba(34, 211, 238, 0.35)'}
                stroke={dragCollision?.isBlocked ? '#f43f5e' : '#22d3ee'}
                strokeWidth="2"
                strokeDasharray="4 2"
              />
              <text
                x={(RACK_WIDTH - 8 - RAIL_WIDTH * 2 + 24) / 2}
                y={(draggingDevice.heightU * U_HEIGHT) / 2 + 4}
                fill="#ffffff"
                fontSize="10"
                fontWeight="bold"
                textAnchor="middle"
                fontFamily="sans-serif"
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' }}
              >
                {dragCollision?.isBlocked
                  ? `🚫 ${dragCollision.reason}`
                  : `✓ U${dragTargetU} - U${dragTargetU + draggingDevice.heightU - 1}`}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Bottom Rack Plinth / Floor Stand */}
      <div className="px-4 py-2 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{isEn ? 'Standard Anti-Vibration Base & Earth Grounding' : 'پایه ضدلرزش و ارتینگ استاندارد'}</span>
        </div>
        <span className="font-mono text-slate-500">19" EIA-310-D</span>
      </div>
    </div>
  );
};
