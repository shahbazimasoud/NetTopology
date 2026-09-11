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
  const isSfp =
    port.port_id.toLowerCase().includes('sfp') ||
    port.name.toLowerCase().includes('sfp') ||
    port.speed === '10G' ||
    port.speed === '10000';
  const isPoeIn = port.port_id.toLowerCase() === 'ether1' || port.name.toLowerCase() === 'ether1';

  // Format port display name (e.g. ether1 -> eth1, ether2 -> eth2)
  const displayName = port.port_id
    .replace('GigabitEthernet', 'eth')
    .replace('TenGigabitEthernet', 'sfp+')
    .replace('ether', 'eth')
    .replace('1/0/', 'e')
    .replace('0/', 'e');

  // Extract short number (e.g. ether1 -> 1, sfp-sfpplus1 -> S1)
  const portNum = displayName.replace(/[^\d]/g, '') || displayName;

  // RouterOS Status Flags: R (Running), X (Disabled)
  const isRunning = isUp && !isDisabled;

  // Authentic MikroTik Dual SMD LEDs
  // Left LED = LINK / CARRIER (Green when link active)
  // Right LED = SPEED / ACTIVITY (Green for 1G/10G, Amber for 100M, blinks on traffic)
  const is1G = port.speed === '1G' || port.speed === '1 Gbps' || port.speed === '1000' || !port.speed || port.speed === 'auto';
  const linkLedColor = isDisabled ? '#475569' : isRunning ? '#10b981' : '#334155';
  const actLedColor = isDisabled ? '#475569' : isRunning ? (is1G ? '#06b6d4' : '#f59e0b') : '#334155';

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
          ? 'bg-cyan-950/90 border-2 border-cyan-400 ring-2 ring-cyan-500/50 shadow-lg scale-105 z-10'
          : isDisabled
          ? isLightMode
            ? 'bg-amber-50/80 border border-amber-300 hover:border-amber-400'
            : 'bg-amber-950/20 border border-amber-700/50 hover:border-amber-500'
          : isRunning
          ? isLightMode
            ? 'bg-slate-100/90 border border-slate-300 shadow-xs hover:border-cyan-500'
            : 'bg-slate-900/90 border border-slate-700/80 hover:border-cyan-400 hover:bg-slate-800/90'
          : isLightMode
          ? 'bg-slate-200/60 border border-slate-300 hover:border-slate-400'
          : 'bg-slate-950/60 border border-slate-800 hover:border-slate-600'
      }`}
      title={`[MikroTik RouterOS] ${port.name} (${port.port_id})\nStatus: ${
        isRunning ? 'R (Running)' : isDisabled ? 'X (Disabled)' : 'Down'
      }\nVLAN/PVID: ${port.vlan || 1}\nSpeed: ${port.speed || 'Auto'}${
        port.description ? `\nComment: ${port.description}` : ''
      }${port.connected_device ? `\nConnected: ${port.connected_device}` : ''}`}
      style={{ width: '64px' }}
    >
      {/* Top Header: MikroTik Dual SMD LEDs & RouterOS Flag */}
      <div className="flex items-center justify-between w-full px-0.5 mb-1 text-[9px] font-mono font-bold">
        {/* Dual SMT Rectangular LEDs matching MikroTik CCR/CRS/RB faceplates */}
        <div className="flex items-center gap-1">
          <span
            className="w-2 h-1 rounded-xs inline-block transition-colors"
            style={{
              backgroundColor: linkLedColor,
              boxShadow: isRunning ? '0 0 5px #10b981' : 'none',
            }}
            title="LINK / CARRIER"
          />
          <span
            className="w-2 h-1 rounded-xs inline-block transition-colors"
            style={{
              backgroundColor: actLedColor,
              boxShadow: isRunning ? `0 0 5px ${actLedColor}` : 'none',
            }}
            title="ACT / SPEED"
          />
        </div>

        {/* RouterOS Flags: R = Running, X = Disabled */}
        <div className="flex items-center gap-0.5">
          {isDisabled ? (
            <span className="text-amber-400 bg-amber-950/80 px-1 rounded text-[8px] font-black border border-amber-600/50">
              X
            </span>
          ) : isRunning ? (
            <span className="text-emerald-400 bg-emerald-950/80 px-1 rounded text-[8px] font-black border border-emerald-600/50">
              R
            </span>
          ) : (
            <span className="text-slate-500 text-[8px] font-medium">-</span>
          )}
        </div>
      </div>

      {/* Photorealistic MikroTik Hardware Port Graphic */}
      {isSfp ? (
        /* SFP+ 10G Optical Cage with EMI Shielding Springs & Perforations */
        <svg
          viewBox="0 0 46 34"
          className="w-11 h-8 shrink-0 drop-shadow-sm"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={`sfp-metal-${port.port_id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isLightMode ? '#e2e8f0' : '#475569'} />
              <stop offset="50%" stopColor={isLightMode ? '#cbd5e1' : '#334155'} />
              <stop offset="100%" stopColor={isLightMode ? '#94a3b8' : '#1e293b'} />
            </linearGradient>
          </defs>

          {/* SFP Outer Stamped Metal Cage */}
          <rect
            x="1.5"
            y="1.5"
            width="43"
            height="31"
            rx="2"
            fill={`url(#sfp-metal-${port.port_id})`}
            stroke={isSelected ? '#22d3ee' : isRunning ? '#0ea5e9' : isLightMode ? '#94a3b8' : '#64748b'}
            strokeWidth="1.5"
          />

          {/* EMI Grounding Spring Fingers around Perimeter */}
          {[6, 12, 18, 24, 30, 36].map((x) => (
            <rect key={x} x={x} y="0.5" width="3" height="2" fill={isLightMode ? '#94a3b8' : '#64748b'} rx="0.5" />
          ))}

          {/* Internal Cavity */}
          <rect
            x="4"
            y="5"
            width="38"
            height="24"
            rx="1.5"
            fill="#090d16"
            stroke="#1e293b"
            strokeWidth="1"
          />

          {/* Dual LC Optical Ferrule Receptacles */}
          <rect x="7" y="8" width="14" height="18" rx="1.5" fill="#0b1329" stroke="#334155" strokeWidth="0.8" />
          <rect x="25" y="8" width="14" height="18" rx="1.5" fill="#0b1329" stroke="#334155" strokeWidth="0.8" />

          {/* LC Optical Ceramic Barrel Ferrules */}
          <circle cx="14" cy="17" r="3.5" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.6" />
          <circle cx="14" cy="17" r="1.2" fill="#ffffff" />

          <circle cx="32" cy="17" r="3.5" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.6" />
          <circle cx="32" cy="17" r="1.2" fill="#ffffff" />

          {/* Release Bail Lever / Latch on top */}
          <path d="M14 2 L32 2 L30 5 L16 5 Z" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.6" />
        </svg>
      ) : (
        /* Shielded Metallic MikroTik RJ45 Jack with Stamped Ground Tabs & Gold Pins */
        <svg
          viewBox="0 0 46 36"
          className="w-11 h-8 shrink-0 drop-shadow-sm"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Brushed Metallic Steel Shielding */}
            <linearGradient id={`rj45-metal-${port.port_id}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={isLightMode ? '#f8fafc' : '#64748b'} />
              <stop offset="40%" stopColor={isLightMode ? '#e2e8f0' : '#475569'} />
              <stop offset="70%" stopColor={isLightMode ? '#cbd5e1' : '#334155'} />
              <stop offset="100%" stopColor={isLightMode ? '#94a3b8' : '#1e293b'} />
            </linearGradient>
            <linearGradient id="gold-pin" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>

          {/* Outer Shielded Metal Bezel */}
          <rect
            x="1.5"
            y="1.5"
            width="43"
            height="33"
            rx="2.5"
            fill={`url(#rj45-metal-${port.port_id})`}
            stroke={
              isSelected
                ? '#06b6d4'
                : isDisabled
                ? '#d97706'
                : isRunning
                ? '#0284c7'
                : isLightMode
                ? '#94a3b8'
                : '#475569'
            }
            strokeWidth="1.5"
          />

          {/* Distinctive MikroTik Stamped Metal Ground Tabs (Top and Sides) */}
          <path d="M18 1.5 L20 4 L26 4 L28 1.5 Z" fill={isLightMode ? '#94a3b8' : '#334155'} />
          <rect x="0.5" y="14" width="2" height="8" rx="0.5" fill={isLightMode ? '#94a3b8' : '#334155'} />
          <rect x="43.5" y="14" width="2" height="8" rx="0.5" fill={isLightMode ? '#94a3b8' : '#334155'} />

          {/* Inner Molded RJ45 Cavity with Clip Notch */}
          <path
            d="M5 6 H41 V22 H35 V30 H11 V22 H5 Z"
            fill="#0b0f19"
            stroke="#1e293b"
            strokeWidth="1"
          />

          {/* 8 Gold-Plated Spring Contact Pins */}
          {[8, 12, 16, 20, 24, 28, 32, 36].map((cx, idx) => (
            <line
              key={idx}
              x1={cx}
              y1="7"
              x2={cx}
              y2="14"
              stroke="url(#gold-pin)"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          ))}

          {/* Molded Locking Tab Ridge */}
          <rect x="15" y="24" width="16" height="4.5" rx="1" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
        </svg>
      )}

      {/* Port Silkscreen Box & PoE Badge matching MikroTik RouterBOARDs */}
      <div className="flex items-center justify-between w-full px-0.5 mt-1">
        <div className="flex items-center gap-1">
          {/* Silkscreen Number Box (e.g. [1]) */}
          <span
            className={`text-[8px] font-mono font-black px-1 rounded-xs leading-tight border ${
              isSelected
                ? 'bg-cyan-900/60 border-cyan-400 text-cyan-300'
                : isLightMode
                ? 'bg-white border-slate-300 text-slate-800 shadow-xs'
                : 'bg-slate-950 border-slate-700 text-slate-200'
            }`}
          >
            {portNum}
          </span>
          <span
            className={`text-[8px] font-mono font-bold truncate max-w-[32px] ${
              isSelected
                ? 'text-cyan-300'
                : isLightMode
                ? 'text-slate-600'
                : 'text-slate-400'
            }`}
          >
            {displayName}
          </span>
        </div>

        {isPoeIn && (
          <span className="text-[6.5px] font-mono font-black bg-blue-600 text-white px-0.5 rounded-xs leading-none shadow-xs">
            PoE
          </span>
        )}
      </div>
    </button>
  );
};
