import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Layers, CheckCircle2, AlertCircle, Shield, Cable } from 'lucide-react';
import { Device, SwitchPort } from '../../types';
import { NetworkPortSvg } from '../NetworkPortSvg';
import { MikroTikPortSvg } from '../MikroTikPortSvg';
import { useLanguage } from '../../i18n/LanguageContext';

export interface CompactTerminalFaceplateProps {
  device: Device;
  ports: SwitchPort[];
  isMikroTik?: boolean;
  isLightMode?: boolean;
  onPortClick?: (port: SwitchPort, e: React.MouseEvent) => void;
  selectedPortId?: string | null;
  selectedPortIds?: string[];
  defaultExpanded?: boolean;
}

export const CompactTerminalFaceplate: React.FC<CompactTerminalFaceplateProps> = ({
  device,
  ports,
  isMikroTik = false,
  isLightMode = false,
  onPortClick,
  selectedPortId,
  selectedPortIds,
  defaultExpanded = true,
}) => {
  const { isEn } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeHoverPort, setActiveHoverPort] = useState<SwitchPort | null>(null);

  if (!ports || ports.length === 0) {
    return null;
  }

  const upCount = ports.filter((p) => p.status === 'up').length;
  const downCount = ports.filter((p) => p.status !== 'up' && p.admin_status !== 'disabled').length;
  const disabledCount = ports.filter((p) => p.admin_status === 'disabled').length;
  const trunkCount = ports.filter((p) => p.mode === 'trunk').length;

  const currentSelectedPort = ports.find((p) => p.port_id === selectedPortId);
  const displayPort = activeHoverPort || currentSelectedPort;
  const multiSelectedCount = selectedPortIds ? selectedPortIds.length : 0;

  return (
    <div
      className={`border-b shrink-0 transition-colors select-none ${
        isLightMode
          ? 'bg-slate-100 border-slate-300 text-slate-800'
          : 'bg-slate-950/90 border-slate-800 text-slate-200'
      }`}
    >
      {/* Faceplate Header Strip - Strict fixed height to eliminate jitter / layout shift */}
      <div className="flex items-center justify-between px-3 h-9 text-xs flex-nowrap gap-2 overflow-hidden">
        <div className="flex items-center gap-2 shrink-0 min-w-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 font-bold hover:text-indigo-400 transition cursor-pointer shrink-0"
            title={isExpanded ? (isEn ? 'Collapse Faceplate' : 'بستن نمای پورت‌ها') : (isEn ? 'Expand Faceplate' : 'باز کردن نمای پورت‌ها')}
          >
            <Layers className={`w-3.5 h-3.5 ${isMikroTik ? 'text-cyan-400' : 'text-indigo-400'}`} />
            <span className="font-mono text-[11px] whitespace-nowrap">
              {isEn ? 'Hardware Port Faceplate' : 'پورت‌های گرافیکی دیوایس'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 opacity-60" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            )}
          </button>

          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60 shrink-0">
            {ports.length} {isEn ? 'Ports' : 'پورت'}
          </span>

          {/* Status Counts */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono shrink-0">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400"></span>
              {upCount} UP
            </span>
            <span className="text-slate-500">•</span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              {downCount} DOWN
            </span>
            {trunkCount > 0 && (
              <>
                <span className="text-slate-500">•</span>
                <span className="text-purple-400 font-bold">{trunkCount} TRUNK</span>
              </>
            )}
          </div>
        </div>

        {/* Center: Active / Hovered / Selected Port Detail Pill - Reserved slot, pointer-events-none */}
        <div className="flex-1 min-w-0 flex items-center justify-center px-1 overflow-hidden pointer-events-none">
          {multiSelectedCount > 1 && !activeHoverPort ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-950/90 border border-indigo-500/50 text-[10px] font-mono text-indigo-200 shrink-0 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
              <span className="font-bold text-white">
                {isEn ? `${multiSelectedCount} Ports Selected (Range)` : `${multiSelectedCount} پورت در رنج انتخابی`}
              </span>
            </div>
          ) : displayPort ? (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-950/90 border border-indigo-500/50 text-[10px] font-mono text-indigo-200 shrink-0 shadow-xs">
              <span className={`w-1.5 h-1.5 rounded-full ${displayPort.status === 'up' ? 'bg-emerald-400 shadow-xs shadow-emerald-400' : 'bg-rose-400'}`}></span>
              <span className="font-bold text-white">{displayPort.port_id}</span>
              <span className="opacity-40">•</span>
              <span className={displayPort.status === 'up' ? 'text-emerald-300 font-bold' : 'text-rose-300'}>
                {displayPort.status.toUpperCase()}
              </span>
              <span className="opacity-40">•</span>
              <span>VLAN {displayPort.vlan} ({displayPort.mode.toUpperCase()})</span>
              {displayPort.connected_device && displayPort.connected_device !== 'Disconnected' && (
                <>
                  <span className="opacity-40">•</span>
                  <span className="text-cyan-300 truncate max-w-[120px]" title={displayPort.connected_device}>
                    {displayPort.connected_device}
                  </span>
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-slate-400 hidden lg:inline">
            {isEn ? 'Click port to insert • Ctrl+Click for range' : 'کلیک جهت درج • Ctrl+کلیک برای رنج'}
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            title={isExpanded ? (isEn ? 'Collapse' : 'بستن') : (isEn ? 'Expand' : 'باز کردن')}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Faceplate Chassis Container with 50% scale ports */}
      {isExpanded && (
        <div className="px-3 pb-2 pt-0.5">
          <div
            className={`rounded-lg p-2 border shadow-inner overflow-x-auto custom-scrollbar ${
              isLightMode
                ? 'bg-slate-200/90 border-slate-300'
                : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-1.5 min-w-max py-0.5">
              {ports.map((port) => {
                const isSelected =
                  selectedPortId === port.port_id ||
                  (selectedPortIds && selectedPortIds.includes(port.port_id));
                const isHovered = activeHoverPort?.port_id === port.port_id;

                return (
                  <div
                    key={port.port_id}
                    onClick={(e) => onPortClick?.(port, e)}
                    onMouseEnter={() => setActiveHoverPort(port)}
                    onMouseLeave={() => setActiveHoverPort((cur) => (cur?.port_id === port.port_id ? null : cur))}
                    className={`cursor-pointer shrink-0 rounded transition-shadow ${
                      isSelected
                        ? isMikroTik
                          ? 'ring-2 ring-cyan-400 z-20 shadow-[0_0_8px_rgba(6,182,212,0.6)]'
                          : 'ring-2 ring-indigo-400 z-20 shadow-[0_0_8px_rgba(129,140,248,0.6)]'
                        : isHovered
                        ? 'ring-2 ring-slate-400/80 z-10'
                        : 'hover:ring-1 hover:ring-slate-500/60'
                    }`}
                    style={{
                      width: '28px',
                      height: isMikroTik ? '42px' : '40px',
                      position: 'relative',
                    }}
                    title={`${port.port_id} (${port.name}) - ${port.status.toUpperCase()} - Mode: ${port.mode.toUpperCase()} - VLAN ${port.vlan}${port.connected_device ? ` - ${port.connected_device}` : ''}`}
                  >
                    {/* Non-blocking floating tooltip with pointer-events-none directly above hovered port */}
                    {isHovered && (
                      <div
                        className="pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-50 px-2 py-1 rounded-md bg-slate-900/95 border border-indigo-500/60 shadow-xl text-[10px] font-mono text-white whitespace-nowrap"
                        style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className={port.status === 'up' ? 'text-emerald-400' : 'text-rose-400'}>●</span>
                          <span className="text-cyan-300">{port.port_id}</span>
                          <span className="text-slate-400 text-[9px]">({port.name})</span>
                        </div>
                        <div className="text-[9px] text-slate-300 flex items-center gap-1 mt-0.5">
                          <span className={port.status === 'up' ? 'text-emerald-300 font-semibold' : 'text-rose-300'}>
                            {port.status.toUpperCase()}
                          </span>
                          <span>•</span>
                          <span>VLAN {port.vlan}</span>
                          <span>•</span>
                          <span>{port.mode.toUpperCase()}</span>
                          {port.connected_device && port.connected_device !== 'Disconnected' && (
                            <>
                              <span>•</span>
                              <span className="text-cyan-300 truncate max-w-[100px]">{port.connected_device}</span>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    <div
                      style={{
                        transform: 'scale(0.5)',
                        transformOrigin: 'top left',
                        width: '56px',
                        pointerEvents: 'none',
                      }}
                    >
                      {isMikroTik ? (
                        <MikroTikPortSvg
                          port={port}
                          isSelected={isSelected}
                          isLightMode={isLightMode}
                        />
                      ) : (
                        <NetworkPortSvg
                          port={port}
                          isSelected={isSelected}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
