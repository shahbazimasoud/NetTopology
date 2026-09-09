import React from 'react';
import { SwitchPort } from '../types';

interface NetworkPortSvgProps {
  port: SwitchPort;
  isSelected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const NetworkPortSvg: React.FC<NetworkPortSvgProps> = ({
  port,
  isSelected = false,
  onClick,
  onContextMenu,
}) => {
  const isUp = port.status === 'up';
  const isDisabled = port.admin_status === 'disabled';
  const isTrunk = port.mode === 'trunk';
  const shortName = port.port_id
    .replace('GigabitEthernet', 'Gi')
    .replace('TenGigabitEthernet', 'Te')
    .replace('FastEthernet', 'Fa')
    .replace('Ethernet', 'Eth')
    .replace('1/0/', '')
    .replace('0/', '');

  // LED color and glow
  const ledColor = isDisabled ? '#f59e0b' : isUp ? '#10b981' : '#475569';
  const ledGlow = isUp ? 'drop-shadow(0 0 3px #34d399)' : isDisabled ? 'drop-shadow(0 0 2px #f59e0b)' : 'none';

  return (
    <button
      type="button"
      onClick={(e) => onClick?.(e)}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          onContextMenu(e);
        }
      }}
      className={`group relative flex flex-col items-center p-1 rounded-lg transition-all select-none ${
        isSelected
          ? 'bg-indigo-950/90 border-2 border-indigo-400 ring-2 ring-indigo-500/40 shadow-lg scale-105 z-10'
          : isDisabled
          ? 'bg-amber-500/20 border border-amber-500/60 hover:border-amber-400 hover:bg-amber-500/30'
          : isUp
          ? 'bg-slate-900/90 border border-slate-700/80 hover:border-indigo-400 hover:bg-slate-800/90'
          : 'bg-rose-500/20 border border-rose-500/50 hover:border-rose-400 hover:bg-rose-500/30'
      }`}
      title={`${port.name} (${port.port_id}) - ${port.status.toUpperCase()} - Mode: ${port.mode.toUpperCase()} - VLAN ${port.vlan}${port.connected_device ? ` - ${port.connected_device}` : ''}`}
      style={{ width: '56px' }}
    >
      {/* Top Header: Link Status LED & Mode Indicator */}
      <div className="flex items-center justify-between w-full px-1 mb-0.5">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            backgroundColor: ledColor,
            filter: ledGlow,
          }}
        />
        {isTrunk ? (
          <span
            className="text-[7px] font-mono font-bold bg-purple-600 text-white px-1 rounded-xs leading-tight"
            style={{ color: '#ffffff', fontWeight: 700 }}
          >
            TRK
          </span>
        ) : (
          <span className="text-[7px] font-mono text-slate-400 leading-tight">
            {shortName}
          </span>
        )}
      </div>

      {/* Realistic Network RJ45 Port Socket SVG */}
      <svg
        viewBox="0 0 42 36"
        className="w-10 h-8 shrink-0 drop-shadow-xs"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Metal Shield / Bezel with Screws */}
        <rect
          x="1"
          y="1"
          width="40"
          height="34"
          rx="3"
          fill="#1e293b"
          stroke={isSelected ? '#818cf8' : isDisabled ? '#f59e0b' : isUp ? '#475569' : '#f43f5e'}
          strokeWidth="1.5"
        />
        
        {/* Metal casing chamfer line */}
        <rect
          x="3"
          y="3"
          width="36"
          height="30"
          rx="2"
          fill="#0f172a"
          stroke="#334155"
          strokeWidth="0.75"
        />

        {/* Dual LED Indicators embedded into top corners of RJ45 bezel */}
        <circle cx="5.5" cy="5.5" r="1.2" fill={ledColor} style={{ filter: ledGlow }} />
        <circle cx="36.5" cy="5.5" r="1.2" fill={isUp ? '#38bdf8' : '#334155'} />

        {/* RJ45 Receptacle Cavity Profile (Classic stepped Ethernet jack) */}
        {/* Top wide portion, stepped in at bottom for latch clip */}
        <path
          d="M 8 9 
             L 34 9 
             L 34 22 
             L 28 22 
             L 28 29 
             L 14 29 
             L 14 22 
             L 8 22 
             Z"
          fill="#020617"
          stroke="#475569"
          strokeWidth="1"
        />

        {/* 8 Golden Metallic Contact Pins */}
        <line x1="11" y1="10" x2="11" y2="15" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
        <line x1="13.5" y1="10" x2="13.5" y2="15" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
        <line x1="16" y1="10" x2="16" y2="15" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
        <line x1="18.5" y1="10" x2="18.5" y2="15" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
        <line x1="21" y1="10" x2="21" y2="15" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
        <line x1="23.5" y1="10" x2="23.5" y2="15" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
        <line x1="26" y1="10" x2="26" y2="15" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />
        <line x1="28.5" y1="10" x2="28.5" y2="15" stroke="#f59e0b" strokeWidth="1" strokeLinecap="round" />

        {/* Bottom Latch Retainer Tab Guide */}
        <path
          d="M 16 26 L 26 26 L 24 28 L 18 28 Z"
          fill="#334155"
        />
      </svg>

      {/* VLAN ID Badge - High Contrast (Always clear bold white text on purple) */}
      <div className="mt-1 flex items-center justify-center w-full">
        <span
          data-badge="vlan-tag"
          className={`font-mono text-[9px] font-bold px-1.5 py-0.2 rounded tracking-tight shadow-xs ${
            isTrunk
              ? 'bg-purple-600 text-white font-bold border border-purple-400'
              : port.vlan === 1
              ? 'bg-slate-800 text-cyan-300 border border-cyan-500/40'
              : 'bg-indigo-900/90 text-amber-300 border border-amber-500/40'
          }`}
          style={isTrunk ? { color: '#ffffff', fontWeight: 700 } : undefined}
          title={`VLAN ${port.vlan}`}
        >
          v{port.vlan}
        </span>
      </div>
    </button>
  );
};
