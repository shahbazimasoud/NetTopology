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
  onPortClick?: (port: SwitchPort) => void;
  selectedPortId?: string | null;
  defaultExpanded?: boolean;
}

export const CompactTerminalFaceplate: React.FC<CompactTerminalFaceplateProps> = ({
  device,
  ports,
  isMikroTik = false,
  isLightMode = false,
  onPortClick,
  selectedPortId,
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

  return (
    <div
      className={`border-b shrink-0 transition-colors select-none ${
        isLightMode
          ? 'bg-slate-100 border-slate-300 text-slate-800'
          : 'bg-slate-950/90 border-slate-800 text-slate-200'
      }`}
    >
      {/* Faceplate Header Strip */}
      <div className="flex items-center justify-between px-3 py-1.5 text-xs">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 font-bold hover:text-indigo-400 transition cursor-pointer"
            title={isExpanded ? (isEn ? 'Collapse Faceplate' : 'بستن نمای پورت‌ها') : (isEn ? 'Expand Faceplate' : 'باز کردن نمای پورت‌ها')}
          >
            <Layers className={`w-3.5 h-3.5 ${isMikroTik ? 'text-cyan-400' : 'text-indigo-400'}`} />
            <span className="font-mono text-[11px]">
              {isEn ? 'Hardware Port Faceplate' : 'پورت‌های گرافیکی دیوایس (نصف سایز)'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 opacity-60" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            )}
          </button>

          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-300 border border-slate-700/60">
            {ports.length} {isEn ? 'Ports' : 'پورت'}
          </span>

          {/* Status Counts */}
          <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-mono">
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

          {/* Active / Hovered / Selected Port Detail Pill */}
          {displayPort && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/40 text-[10px] font-mono text-indigo-300 animate-in fade-in">
              <span className="font-bold text-white">{displayPort.port_id}</span>
              <span>•</span>
              <span className={displayPort.status === 'up' ? 'text-emerald-300 font-bold' : 'text-rose-300'}>
                {displayPort.status.toUpperCase()}
              </span>
              <span>•</span>
              <span>VLAN {displayPort.vlan} ({displayPort.mode.toUpperCase()})</span>
              {displayPort.connected_device && displayPort.connected_device !== 'Disconnected' && (
                <>
                  <span>•</span>
                  <span className="text-cyan-300 truncate max-w-[140px]" title={displayPort.connected_device}>
                    {displayPort.connected_device}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] opacity-70 hidden md:inline">
            {isEn ? 'Click port to insert command' : 'کلیک روی پورت جهت درج در کامند'}
          </span>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
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
            <div className="flex items-center gap-1.5 min-w-max">
              {ports.map((port) => {
                const isSelected = selectedPortId === port.port_id;
                return (
                  <div
                    key={port.port_id}
                    onClick={() => onPortClick?.(port)}
                    onMouseEnter={() => setActiveHoverPort(port)}
                    onMouseLeave={() => setActiveHoverPort(null)}
                    className={`cursor-pointer shrink-0 transition-all rounded hover:ring-2 ${
                      isSelected
                        ? 'ring-2 ring-indigo-400 scale-105 z-10'
                        : 'hover:ring-indigo-500/60 hover:scale-105'
                    }`}
                    style={{
                      width: '28px',
                      height: isMikroTik ? '42px' : '40px',
                      overflow: 'visible',
                      position: 'relative',
                    }}
                    title={`${port.port_id} (${port.name}) - ${port.status.toUpperCase()} - Mode: ${port.mode.toUpperCase()} - VLAN ${port.vlan}${port.connected_device ? ` - ${port.connected_device}` : ''}`}
                  >
                    <div
                      style={{
                        transform: 'scale(0.5)',
                        transformOrigin: 'top left',
                        width: '56px',
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
