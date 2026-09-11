import React from 'react';
import { SwitchPort } from '../types';

export interface MikroTikPortSvgProps {
  port: SwitchPort;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  isLightMode?: boolean;
}

export const MikroTikPortSvg: React.FC<MikroTikPortSvgProps> = ({
  port,
  isSelected = false,
  onClick,
  onContextMenu,
  isLightMode = false,
}) => {
  const isUp = port.status === 'up';
  const isDisabled = port.admin_status === 'disabled';
  const isSfp = port.port_id.toLowerCase().includes('sfp') || port.name.toLowerCase().includes('sfp') || port.speed === '10G' || port.speed === '10000';
  const isPoeIn = port.port_id.toLowerCase() === 'ether1' || port.name.toLowerCase() === 'ether1';
  
  // Format port display name (e.g. ether1 -> eth1 or e1)
  const displayName = port.port_id
    .replace('GigabitEthernet', 'eth')
    .replace('TenGigabitEthernet', 'sfp+')
    .replace('ether', 'eth')
    .replace('1/0/', 'e')
    .replace('0/', 'e');

  // RouterOS Status Flags: R (Running), X (Disabled), S (Slave/Bridge)
  const isRunning = isUp && !isDisabled;

  // LED Colors
  const linkLedColor = isDisabled ? '#64748b' : isRunning ? '#10b981' : '#475569';
  const actLedColor = isRunning ? '#06b6d4' : '#334155';

  return (
    <button
      type="button"
      id={`mikrotik-port-${port.port_id}`}
      onClick={(e) => onClick?.(e)}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e);
        }
      }}
      className={`group relative flex flex-col items-center p-1.5 rounded-lg transition-all select-none cursor-pointer ${
        isSelected
          ? 'bg-cyan-950/80 border-2 border-cyan-400 ring-2 ring-cyan-500/40 shadow-lg scale-105 z-10'
          : isDisabled
          ? isLightMode ? 'bg-amber-50 border border-amber-300 hover:border-amber-400' : 'bg-amber-950/20 border border-amber-700/50 hover:border-amber-500'
          : isRunning
          ? isLightMode ? 'bg-white border border-slate-300 shadow-xs hover:border-cyan-500' : 'bg-slate-900/90 border border-slate-700/80 hover:border-cyan-400 hover:bg-slate-800'
          : isLightMode ? 'bg-slate-100 border border-slate-200 hover:border-slate-400' : 'bg-slate-950/60 border border-slate-800 hover:border-slate-600'
      }`}
      title={`[MikroTik RouterOS] ${port.name} (${port.port_id})\nStatus: ${isRunning ? 'R (Running)' : isDisabled ? 'X (Disabled)' : 'Down'}\nVLAN/PVID: ${port.vlan || 1}\nSpeed: ${port.speed || 'Auto'}${port.description ? `\nComment: ${port.description}` : ''}${port.connected_device ? `\nConnected: ${port.connected_device}` : ''}`}
      style={{ width: '60px' }}
    >
      {/* Top Header: Link Status LED & RouterOS Flag (R / X) */}
      <div className="flex items-center justify-between w-full px-0.5 mb-1 text-[9px] font-mono font-bold">
        {/* Dual MikroTik LEDs (LINK / ACT) */}
        <div className="flex items-center gap-1">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: linkLedColor,
              boxShadow: isRunning ? '0 0 4px #10b981' : 'none',
            }}
            title="LINK"
          />
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: actLedColor,
              boxShadow: isRunning ? '0 0 4px #06b6d4' : 'none',
            }}
            title="ACT"
          />
        </div>

        {/* RouterOS Flags */}
        <div className="flex items-center gap-0.5">
          {isDisabled ? (
            <span className="text-amber-400 bg-amber-950/60 px-0.5 rounded text-[8px] font-black border border-amber-600/40">
              X
            </span>
          ) : isRunning ? (
            <span className="text-emerald-400 bg-emerald-950/60 px-0.5 rounded text-[8px] font-black border border-emerald-600/40">
              R
            </span>
          ) : (
            <span className="text-slate-500 text-[8px] font-medium">-</span>
          )}
        </div>
      </div>

      {/* Realistic MikroTik Hardware Port SVG */}
      {isSfp ? (
        /* SFP+ 10G Cage SVG */
        <svg
          viewBox="0 0 44 32"
          className="w-11 h-8 shrink-0 drop-shadow-xs"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Metal SFP Cage Body */}
          <rect
            x="1"
            y="1"
            width="42"
            height="30"
            rx="2"
            fill={isLightMode ? '#cbd5e1' : '#1e293b'}
            stroke={isSelected ? '#22d3ee' : isRunning ? '#0ea5e9' : '#64748b'}
            strokeWidth="1.5"
          />
          {/* SFP Optical Port Dual Cavity (LC Duplex) */}
          <rect x="7" y="6" width="13" height="20" rx="1.5" fill="#090d16" stroke="#475569" strokeWidth="0.8" />
          <rect x="24" y="6" width="13" height="20" rx="1.5" fill="#090d16" stroke="#475569" strokeWidth="0.8" />
          {/* Optical Ferrules inside */}
          <circle cx="13.5" cy="16" r="2.5" fill="#0284c7" />
          <circle cx="30.5" cy="16" r="2.5" fill="#0284c7" />
          {/* Pull Tab / Release Lever latch */}
          <path d="M16 2 L28 2 L26 5 L18 5 Z" fill="#38bdf8" />
        </svg>
      ) : (
        /* Shielded Metallic RJ45 Jack with Gold Pins & Clip Cavity */
        <svg
          viewBox="0 0 42 36"
          className="w-10 h-8 shrink-0 drop-shadow-xs"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer Metal Shielded Bezel */}
          <rect
            x="1"
            y="1"
            width="40"
            height="34"
            rx="3"
            fill={isLightMode ? '#e2e8f0' : '#1e293b'}
            stroke={isSelected ? '#06b6d4' : isDisabled ? '#d97706' : isRunning ? '#0284c7' : '#475569'}
            strokeWidth="1.5"
          />
          {/* Inner Cavity */}
          <path
            d="M5 6 H37 V22 H32 V30 H10 V22 H5 Z"
            fill="#0b0f19"
            stroke="#334155"
            strokeWidth="1"
          />
          {/* 8 Gold Contact Pins */}
          {[9, 12, 15, 18, 21, 24, 27, 30].map((cx, idx) => (
            <line
              key={idx}
              x1={cx}
              y1="7"
              x2={cx}
              y2="13"
              stroke="#fbbf24"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          ))}
          {/* Bottom Retaining Spring Notch */}
          <rect x="15" y="24" width="12" height="4" rx="1" fill="#1e293b" />
        </svg>
      )}

      {/* Port Name & PoE Indicator */}
      <div className="flex items-center justify-between w-full px-0.5 mt-1">
        <span className={`text-[8px] font-mono font-bold truncate ${
          isSelected
            ? 'text-cyan-300'
            : isLightMode
            ? 'text-slate-700'
            : 'text-slate-300'
        }`}>
          {displayName}
        </span>
        {isPoeIn && (
          <span className="text-[6.5px] font-mono font-bold bg-blue-600 text-white px-0.5 rounded-xs leading-none">
            PoE
          </span>
        )}
      </div>
    </button>
  );
};
