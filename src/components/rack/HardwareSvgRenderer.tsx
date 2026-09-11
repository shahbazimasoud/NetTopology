import React from 'react';
import { MountedHardwareDevice, NetworkCardConfig, RackViewMode } from '../../types';

interface HardwareSvgRendererProps {
  device: MountedHardwareDevice;
  viewMode: RackViewMode;
  width?: number;
  height?: number;
  isHighlighted?: boolean;
  onSelect?: () => void;
}

export const HardwareSvgRenderer: React.FC<HardwareSvgRendererProps> = ({
  device,
  viewMode,
  width = 380,
  height,
  isHighlighted = false,
  onSelect,
}) => {
  const U_PX = 28;
  const h = height || device.heightU * U_PX;
  const w = width;

  const totalPorts = device.networkCards.reduce((acc, c) => acc + c.portCount, 0);

  // Unique ID prefix for gradients and patterns
  const devUid = `dev-${device.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const truncate = (str?: string, max: number = 16) => {
    if (!str) return '';
    return str.length > max ? `${str.slice(0, max - 1)}…` : str;
  };

  // ===================== VECTOR HELPERS =====================

  // Realistic RJ45 Jack with metallic shielding, 8 gold pins, and upper/lower dual status LEDs
  const renderRealisticRj45Port = (x: number, y: number, label?: string, isUp: boolean = true) => (
    <g key={`rj45-${x}-${y}`} transform={`translate(${x}, ${y})`}>
      {/* Shielded Metal Outer Frame */}
      <rect x="0" y="0" width="11" height="9.5" rx="1.2" fill="#1e293b" stroke="#64748b" strokeWidth="0.7" />
      {/* Internal Jack Cavity */}
      <path d="M 2 3.5 L 9 3.5 L 9 8.5 L 7 8.5 L 7 7.5 L 4 7.5 L 4 8.5 L 2 8.5 Z" fill="#090d16" />
      {/* Gold Contact Pins */}
      <line x1="3.2" y1="4" x2="3.2" y2="6.5" stroke="#f59e0b" strokeWidth="0.6" strokeLinecap="round" />
      <line x1="4.5" y1="4" x2="4.5" y2="6.5" stroke="#f59e0b" strokeWidth="0.6" strokeLinecap="round" />
      <line x1="5.8" y1="4" x2="5.8" y2="6.5" stroke="#f59e0b" strokeWidth="0.6" strokeLinecap="round" />
      <line x1="7.1" y1="4" x2="7.1" y2="6.5" stroke="#f59e0b" strokeWidth="0.6" strokeLinecap="round" />
      {/* Activity & Link LEDs */}
      <circle cx="2.2" cy="1.6" r="0.75" fill={isUp ? '#22c55e' : '#475569'} />
      <circle cx="8.8" cy="1.6" r="0.75" fill={isUp ? '#f59e0b' : '#334155'} />
      {label && (
        <text x="5.5" y="14" fill="#94a3b8" fontSize="4.5" textAnchor="middle" fontFamily="monospace">
          {label}
        </text>
      )}
    </g>
  );

  // Realistic SFP+ 10G / SFP28 25G Cage with metal EMI spring fingers and dust plug
  const renderRealisticSfpCage = (x: number, y: number, label?: string, isUp: boolean = true) => (
    <g key={`sfp-${x}-${y}`} transform={`translate(${x}, ${y})`}>
      {/* Outer Metal Cage */}
      <rect x="0" y="0" width="13" height="10.5" rx="1" fill="#0f172a" stroke="#94a3b8" strokeWidth="0.8" />
      {/* Optical Transceiver Bezel with latch */}
      <rect x="2" y="2" width="9" height="6.5" fill="#1e293b" stroke="#06b6d4" strokeWidth="0.5" />
      <rect x="4" y="3.5" width="5" height="3.5" rx="0.5" fill="#020617" />
      {/* Metallic EMI Spring Fingers on top and sides */}
      <line x1="3" y1="0.5" x2="5" y2="0.5" stroke="#cbd5e1" strokeWidth="0.8" />
      <line x1="8" y1="0.5" x2="10" y2="0.5" stroke="#cbd5e1" strokeWidth="0.8" />
      {/* Optical Link LED */}
      <circle cx="2" cy="-2" r="0.9" fill={isUp ? '#06b6d4' : '#475569'} />
      {label && (
        <text x="6.5" y="16" fill="#38bdf8" fontSize="4.5" textAnchor="middle" fontFamily="monospace">
          {label}
        </text>
      )}
    </g>
  );

  // Realistic QSFP+ 40G / QSFP28 100G Cage with wider housing
  const renderRealisticQsfpCage = (x: number, y: number, label?: string) => (
    <g key={`qsfp-${x}-${y}`} transform={`translate(${x}, ${y})`}>
      <rect x="0" y="0" width="18" height="11.5" rx="1.2" fill="#020617" stroke="#cbd5e1" strokeWidth="0.9" />
      <rect x="2.5" y="2.5" width="13" height="6.5" fill="#1e1b4b" stroke="#a855f7" strokeWidth="0.6" />
      <circle cx="3" cy="-2.5" r="1.1" fill="#c084fc" />
      {label && (
        <text x="9" y="17" fill="#d8b4fe" fontSize="4.5" textAnchor="middle" fontFamily="monospace">
          {label}
        </text>
      )}
    </g>
  );

  // Photorealistic HPE SmartDrive 2.5" SFF Caddy with blue/black latch and rotating activity light ring
  const renderHpeDriveCaddy = (x: number, y: number, w: number, caddyH: number, index: number) => (
    <g key={`hpe-caddy-${x}-${y}`} transform={`translate(${x}, ${y})`}>
      {/* Caddy Bezel with dark brushed metal */}
      <rect x="0" y="0" width={w} height={caddyH} rx="1" fill="#18202f" stroke="#334155" strokeWidth="0.7" />
      {/* Caddy Release Lever with HPE Blue accent */}
      <rect x="2" y={caddyH / 2 - 3.5} width={w - 4} height="7" rx="1" fill="#090d16" stroke="#475569" strokeWidth="0.5" />
      {/* Ejection Push Button */}
      <rect x={w - 7} y={caddyH / 2 - 2.5} width="5" height="5" rx="0.8" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.4" />
      {/* Drive Status LED Ring (Green Spinning Activity & Amber Fault) */}
      <circle cx="5" cy="3.5" r="1.2" fill="#22c55e" />
      <circle cx="8" cy="3.5" r="1" fill="#eab308" opacity="0.85" />
      {/* Drive Number or Type */}
      <text x="4" y={caddyH - 2} fill="#64748b" fontSize="3.5" fontFamily="monospace">
        D{index + 1}
      </text>
      {/* Ventilation micro-holes */}
      <line x1="12" y1={caddyH - 2.5} x2={w - 4} y2={caddyH - 2.5} stroke="#0f172a" strokeWidth="1" strokeDasharray="1 1" />
    </g>
  );

  // Heavy-duty Mounting Ears for Left and Right Rack Rails
  const renderRackEars = (brandColor: string = '#334155', accentBrandText?: string) => (
    <>
      {/* Left Ear */}
      <g>
        <rect x="0" y="0" width="12" height={h} fill="#1e293b" stroke="#0f172a" strokeWidth="0.8" />
        <line x1="12" y1="0" x2="12" y2={h} stroke="#475569" strokeWidth="0.5" />
        {/* Top & Bottom Mounting Screw Holes with Washers */}
        <circle cx="6" cy="6" r="2.2" fill="#020617" stroke="#94a3b8" strokeWidth="0.8" />
        <circle cx="6" cy="6" r="1.2" fill="#64748b" />
        {h > 36 && (
          <>
            <circle cx="6" cy={h - 6} r="2.2" fill="#020617" stroke="#94a3b8" strokeWidth="0.8" />
            <circle cx="6" cy={h - 6} r="1.2" fill="#64748b" />
          </>
        )}
        {/* Brand Accent Bar on Left Ear */}
        <rect x="0" y="0" width="3" height={h} fill={brandColor} />
      </g>

      {/* Right Ear */}
      <g transform={`translate(${w - 12}, 0)`}>
        <rect x="0" y="0" width="12" height={h} fill="#1e293b" stroke="#0f172a" strokeWidth="0.8" />
        <line x1="0" y1="0" x2="0" y2={h} stroke="#475569" strokeWidth="0.5" />
        <circle cx="6" cy="6" r="2.2" fill="#020617" stroke="#94a3b8" strokeWidth="0.8" />
        <circle cx="6" cy="6" r="1.2" fill="#64748b" />
        {h > 36 && (
          <>
            <circle cx="6" cy={h - 6} r="2.2" fill="#020617" stroke="#94a3b8" strokeWidth="0.8" />
            <circle cx="6" cy={h - 6} r="1.2" fill="#64748b" />
          </>
        )}
      </g>
    </>
  );

  // ===================== REAR VIEW RENDERER =====================
  const renderRearPanel = () => {
    const mainW = w - 24;
    return (
      <g transform="translate(12, 0)">
        <defs>
          <linearGradient id={`${devUid}-rear-metal`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a3547" />
            <stop offset="50%" stopColor="#1e2736" />
            <stop offset="100%" stopColor="#141c28" />
          </linearGradient>
          <pattern id={`${devUid}-fan-mesh`} width="3" height="3" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="0.8" fill="#0f172a" />
          </pattern>
        </defs>

        {/* Chassis Metal Rear Casing */}
        <rect x="0" y="0" width={mainW} height={h} fill={`url(#${devUid}-rear-metal)`} stroke="#475569" strokeWidth="1" />

        {/* DUAL HOT-PLUG REDUNDANT POWER SUPPLIES (PSU 1 & PSU 2) */}
        <g transform="translate(4, 3)">
          {/* PSU 1 */}
          <rect x="0" y="0" width="46" height={h - 6} rx="2" fill="#0f172a" stroke="#64748b" strokeWidth="0.8" />
          {/* Circular Cooling Fan Mesh */}
          <circle cx="12" cy={(h - 6) / 2} r={Math.min(9, (h - 10) / 2)} fill={`url(#${devUid}-fan-mesh)`} stroke="#475569" strokeWidth="0.5" />
          {/* Fan blades silhouette */}
          <circle cx="12" cy={(h - 6) / 2} r="2.5" fill="#334155" />
          {/* Standard 3-Pin IEC C14 AC Power Inlet */}
          <g transform={`translate(26, ${(h - 6) / 2 - 7})`}>
            <path d="M 2 2 L 10 2 L 12 5 L 12 11 L 0 11 L 0 5 Z" fill="#020617" stroke="#475569" strokeWidth="0.6" />
            <circle cx="3.5" cy="7.5" r="0.9" fill="#e2e8f0" />
            <circle cx="8.5" cy="7.5" r="0.9" fill="#e2e8f0" />
            <circle cx="6" cy="4.5" r="0.9" fill="#e2e8f0" />
          </g>
          {/* Ergonomic Extraction Handle with Red/Green release clip */}
          <rect x="42" y="3" width="3" height={h - 12} rx="1" fill="#dc2626" />
          {/* PSU Status LED */}
          <circle cx="28" cy={(h - 6) / 2 + 7} r="1" fill="#22c55e" />
          <text x="35" y={(h - 6) / 2 + 8.5} fill="#94a3b8" fontSize="3.8" fontFamily="monospace">
            PSU1
          </text>
        </g>

        <g transform="translate(54, 3)">
          {/* PSU 2 */}
          <rect x="0" y="0" width="46" height={h - 6} rx="2" fill="#0f172a" stroke="#64748b" strokeWidth="0.8" />
          <circle cx="12" cy={(h - 6) / 2} r={Math.min(9, (h - 10) / 2)} fill={`url(#${devUid}-fan-mesh)`} stroke="#475569" strokeWidth="0.5" />
          <circle cx="12" cy={(h - 6) / 2} r="2.5" fill="#334155" />
          <g transform={`translate(26, ${(h - 6) / 2 - 7})`}>
            <path d="M 2 2 L 10 2 L 12 5 L 12 11 L 0 11 L 0 5 Z" fill="#020617" stroke="#475569" strokeWidth="0.6" />
            <circle cx="3.5" cy="7.5" r="0.9" fill="#e2e8f0" />
            <circle cx="8.5" cy="7.5" r="0.9" fill="#e2e8f0" />
            <circle cx="6" cy="4.5" r="0.9" fill="#e2e8f0" />
          </g>
          <rect x="42" y="3" width="3" height={h - 12} rx="1" fill="#dc2626" />
          <circle cx="28" cy={(h - 6) / 2 + 7} r="1" fill="#22c55e" />
          <text x="35" y={(h - 6) / 2 + 8.5} fill="#94a3b8" fontSize="3.8" fontFamily="monospace">
            PSU2
          </text>
        </g>

        {/* SYSTEM EXHAUST FANS */}
        <g transform="translate(105, 3)">
          <rect x="0" y="0" width="50" height={h - 6} rx="1" fill="#0b1120" stroke="#334155" strokeWidth="0.6" />
          <circle cx="14" cy={(h - 6) / 2} r={Math.min(9, (h - 10) / 2)} fill={`url(#${devUid}-fan-mesh)`} stroke="#475569" strokeWidth="0.6" />
          <circle cx="36" cy={(h - 6) / 2} r={Math.min(9, (h - 10) / 2)} fill={`url(#${devUid}-fan-mesh)`} stroke="#475569" strokeWidth="0.6" />
          <text x="25" y={h - 8} fill="#64748b" fontSize="3.5" textAnchor="middle" fontFamily="monospace">
            EXHAUST
          </text>
        </g>

        {/* MOTHERBOARD I/O PANEL */}
        <g transform="translate(160, 3)">
          <rect x="0" y="0" width="55" height={h - 6} rx="1" fill="#0f172a" stroke="#475569" strokeWidth="0.6" />
          {/* Dedicated Out-Of-Band Management Port (iLO / iDRAC / CIMC) with Amber/Green LEDs */}
          <rect x="4" y="3" width="11" height="9" rx="1" fill="#020617" stroke="#f59e0b" strokeWidth="0.8" />
          <circle cx="7" cy="5" r="0.8" fill="#f59e0b" />
          <text x="9.5" y="16.5" fill="#f59e0b" fontSize="3.5" textAnchor="middle" fontFamily="monospace">
            iLO
          </text>
          {/* Dual USB 3.0 Ports (Blue Tongues) */}
          <rect x="18" y="3" width="8" height="5" fill="#020617" stroke="#64748b" strokeWidth="0.5" />
          <rect x="19" y="4" width="6" height="2" fill="#0284c7" />
          <rect x="18" y="9" width="8" height="5" fill="#020617" stroke="#64748b" strokeWidth="0.5" />
          <rect x="19" y="10" width="6" height="2" fill="#0284c7" />
          {/* Classic VGA D-Sub 15 Connector in Royal Blue */}
          <path d="M 30 4 L 46 4 L 44 11 L 32 11 Z" fill="#1d4ed8" stroke="#3b82f6" strokeWidth="0.7" />
          <circle cx="31.5" cy="7.5" r="0.8" fill="#cbd5e1" />
          <circle cx="44.5" cy="7.5" r="0.8" fill="#cbd5e1" />
          <text x="38" y="16.5" fill="#93c5fd" fontSize="3.5" textAnchor="middle" fontFamily="monospace">
            VGA
          </text>
          {/* Serial Console Port */}
          <rect x="48" y="3" width="6" height="9" fill="#020617" stroke="#0ea5e9" strokeWidth="0.6" />
        </g>

        {/* CONFIGURABLE PCIE NIC EXPANSION SLOTS */}
        <g transform="translate(220, 3)">
          <rect
            x="0"
            y="0"
            width={mainW - 224}
            height={h - 6}
            rx="1"
            fill="#090d16"
            stroke="#38bdf8"
            strokeWidth="0.8"
            strokeDasharray="2 1"
          />
          <text x="4" y="7.5" fill="#38bdf8" fontSize="4.5" fontWeight="bold" fontFamily="monospace">
            PCIe NICs ({totalPorts} Ports Configured)
          </text>

          {/* Render each configured network card */}
          <g transform="translate(4, 9)">
            {device.networkCards.map((card, cIdx) => {
              const cardWidth = Math.max(48, Math.floor((mainW - 232) / Math.max(1, device.networkCards.length)));
              const startX = cIdx * (cardWidth + 3);
              return (
                <g key={card.id || cIdx} transform={`translate(${startX}, 0)`}>
                  <rect x="0" y="0" width={cardWidth} height={h - 18} rx="1" fill="#1e293b" stroke="#475569" strokeWidth="0.6" />
                  <text x="2" y="5.5" fill="#94a3b8" fontSize="3.5" fontFamily="monospace">
                    {card.name.slice(0, 8)}
                  </text>
                  {/* Ports layout */}
                  <g transform="translate(2, 7)">
                    {Array.from({ length: Math.min(card.portCount, 8) }).map((_, pIdx) => {
                      const px = (pIdx % 4) * 11.5;
                      const py = Math.floor(pIdx / 4) * 11;
                      if (card.portType.includes('RJ45')) {
                        return renderRealisticRj45Port(px, py, `${pIdx + 1}`);
                      } else if (card.portType.includes('QSFP')) {
                        return renderRealisticQsfpCage(px, py, `${pIdx + 1}`);
                      } else {
                        return renderRealisticSfpCage(px, py, `${pIdx + 1}`);
                      }
                    })}
                  </g>
                </g>
              );
            })}
          </g>
        </g>
      </g>
    );
  };

  // ===================== FRONT VIEW RENDERER =====================
  const renderFrontPanel = () => {
    const mainW = w - 24;

    switch (device.category) {
      // 1. HPE ProLiant Enterprise Servers (DL360, DL380, DL560)
      case 'hpe_server': {
        const is2UorMore = device.heightU >= 2;
        return (
          <g transform="translate(12, 0)">
            <defs>
              <linearGradient id={`${devUid}-hpe-bezel`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#252f3f" />
                <stop offset="40%" stopColor="#1e2634" />
                <stop offset="100%" stopColor="#111827" />
              </linearGradient>
              <pattern id={`${devUid}-hpe-mesh`} width="4" height="4" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="0.9" fill="#0f172a" />
              </pattern>
            </defs>

            {/* Chassis Faceplate */}
            <rect x="0" y="0" width={mainW} height={h} fill={`url(#${devUid}-hpe-bezel)`} stroke="#475569" strokeWidth="1" />

            {/* Left Diagnostic & Control Panel */}
            <g transform="translate(4, 3)">
              <rect x="0" y="0" width="28" height={h - 6} rx="1" fill="#0b0f17" stroke="#334155" strokeWidth="0.6" />
              {/* Power Switch with Illuminated Ring */}
              <circle cx="6" cy="6" r="2.5" fill="#020617" stroke="#22c55e" strokeWidth="0.8" />
              <path d="M 6 4.5 L 6 6" stroke="#22c55e" strokeWidth="0.6" strokeLinecap="round" />
              {/* System Health Heartbeat LED */}
              <circle cx="14" cy="6" r="1.5" fill="#22c55e" />
              {/* Unit ID (UID) Glowing Blue LED Button */}
              <circle cx="22" cy="6" r="1.5" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.5" />
              {/* Front iLO Service Micro-USB Port */}
              <rect x="3" y="11" width="10" height="5" rx="0.5" fill="#020617" stroke="#475569" strokeWidth="0.4" />
              <text x="8" y="15" fill="#64748b" fontSize="3" textAnchor="middle" fontFamily="monospace">
                iLO
              </text>
              {/* Front USB 3.0 Port */}
              <rect x="15" y="11" width="10" height="5" rx="0.5" fill="#020617" stroke="#475569" strokeWidth="0.4" />
              <rect x="16" y="12" width="8" height="2" fill="#0284c7" />
              {/* Pull-out Serial Number / Asset Tag Tab */}
              {h > 36 && (
                <g transform="translate(3, 19)">
                  <rect x="0" y="0" width="22" height="5" rx="0.5" fill="#1e293b" stroke="#475569" strokeWidth="0.4" />
                  <text x="11" y="4" fill="#94a3b8" fontSize="3" textAnchor="middle" fontFamily="monospace">
                    TAG
                  </text>
                </g>
              )}
            </g>

            {/* SmartDrive Hot-Swap Caddies Grid */}
            <g transform="translate(36, 3)">
              {is2UorMore ? (
                // 2U / 4U: Dual-Row SFF Drive Trays
                <g>
                  {Array.from({ length: 8 }).map((_, idx) => (
                    <React.Fragment key={idx}>
                      {renderHpeDriveCaddy(idx * 27, 0, 25, (h - 8) / 2, idx)}
                      {renderHpeDriveCaddy(idx * 27, (h - 8) / 2 + 2, 25, (h - 8) / 2, idx + 8)}
                    </React.Fragment>
                  ))}
                </g>
              ) : (
                // 1U: 8x 2.5" SFF Drive Trays
                <g>
                  {Array.from({ length: 8 }).map((_, idx) => (
                    renderHpeDriveCaddy(idx * 27, 0, 25, h - 6, idx)
                  ))}
                </g>
              )}
            </g>

            {/* Right Bezel with Signature HPE Phosphor-Green Branding & Model Badge */}
            <g transform={`translate(${mainW - 90}, 3)`}>
              <rect x="0" y="0" width="86" height={h - 6} rx="1.5" fill="#090d16" stroke="#334155" strokeWidth="0.8" />
              {/* Authentic HPE Green Rectangle Logo */}
              <rect x="5" y="4" width="14" height="8" rx="1" fill="#01a982" />
              <text x="12" y="10" fill="#ffffff" fontSize="5.5" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
                HPE
              </text>
              {/* Model & Generation Typography */}
              <text x="24" y="9.5" fill="#f8fafc" fontSize="5.8" fontWeight="bold" fontFamily="sans-serif">
                {truncate(device.model, 16)}
              </text>
              <text x="24" y="16.5" fill="#01a982" fontSize="5" fontWeight="bold" fontFamily="monospace">
                {truncate(device.generation || 'Gen10 Plus', 14)}
              </text>
            </g>
          </g>
        );
      }

      // 2. ASUS Enterprise Servers (ESC4000, ESC8000, RS720, RS500)
      case 'asus_server': {
        return (
          <g transform="translate(12, 0)">
            <rect x="0" y="0" width={mainW} height={h} fill="#131722" stroke="#374151" strokeWidth="1" />
            {/* ASUS Signature Crimson Red Racing Accent Stripe */}
            <rect x="0" y="0" width="4" height={h} fill="#dc2626" />
            {/* Control Panel */}
            <g transform="translate(7, 3)">
              <rect x="0" y="0" width="24" height={h - 6} rx="1" fill="#0b0f19" stroke="#374151" strokeWidth="0.5" />
              <circle cx="6" cy="5" r="2.2" fill="#020617" stroke="#3b82f6" strokeWidth="0.7" />
              <circle cx="13" cy="5" r="1.3" fill="#22c55e" />
              <circle cx="19" cy="5" r="1.3" fill="#ef4444" />
            </g>
            {/* Hot-swap drive bays */}
            <g transform="translate(34, 3)">
              {Array.from({ length: 8 }).map((_, idx) => (
                renderHpeDriveCaddy(idx * 27, 0, 25, h - 6, idx)
              ))}
            </g>
            {/* ASUS Brand Badge */}
            <g transform={`translate(${mainW - 90}, 3)`}>
              <rect x="0" y="0" width="86" height={h - 6} rx="1" fill="#090d16" stroke="#475569" strokeWidth="0.8" />
              <text x="8" y="10" fill="#dc2626" fontSize="6.5" fontWeight="900" fontFamily="sans-serif">
                ASUS
              </text>
              <text x="36" y="10" fill="#f8fafc" fontSize="5.5" fontWeight="bold" fontFamily="sans-serif">
                {truncate(device.model, 14)}
              </text>
              <text x="8" y="17" fill="#94a3b8" fontSize="4.5" fontFamily="monospace">
                {truncate(device.generation || 'Rack Server', 14)}
              </text>
            </g>
          </g>
        );
      }

      // 3. Cisco UCS Servers (C220 M5/M6, C240 M5/M6)
      case 'cisco_server': {
        return (
          <g transform="translate(12, 0)">
            <rect x="0" y="0" width={mainW} height={h} fill="#1a2232" stroke="#334155" strokeWidth="1" />
            {/* Cisco Diamond Ventilation Pattern on Left */}
            <g transform="translate(4, 3)">
              <rect x="0" y="0" width="28" height={h - 6} rx="1" fill="#0a0e17" stroke="#0284c7" strokeWidth="0.6" />
              <circle cx="6" cy="5" r="2" fill="#0284c7" />
              <circle cx="13" cy="5" r="1.3" fill="#22c55e" />
              {/* Front KVM Console Port */}
              <rect x="4" y="10" width="14" height="6" rx="0.5" fill="#020617" stroke="#38bdf8" strokeWidth="0.5" />
              <text x="11" y="14.5" fill="#38bdf8" fontSize="3.5" textAnchor="middle" fontFamily="monospace">
                KVM
              </text>
            </g>
            {/* Drive Caddies */}
            <g transform="translate(35, 3)">
              {Array.from({ length: 7 }).map((_, idx) => (
                renderHpeDriveCaddy(idx * 29, 0, 27, h - 6, idx)
              ))}
            </g>
            {/* Cisco UCS Emblem */}
            <g transform={`translate(${mainW - 95}, 3)`}>
              <rect x="0" y="0" width="91" height={h - 6} rx="1" fill="#0a0f1d" stroke="#0284c7" strokeWidth="0.8" />
              <text x="6" y="9.5" fill="#0284c7" fontSize="5.8" fontWeight="bold" fontFamily="sans-serif">
                CISCO
              </text>
              <text x="32" y="9.5" fill="#ffffff" fontSize="5.5" fontWeight="bold" fontFamily="sans-serif">
                UCS {truncate(device.model, 11)}
              </text>
              <text x="6" y="16.5" fill="#38bdf8" fontSize="4.5" fontFamily="monospace">
                {truncate(device.generation || 'M5 SmartFabric', 14)}
              </text>
            </g>
          </g>
        );
      }

      // 4. Cisco Catalyst Switches (2960-X, 3850, 9200, 9300, Nexus)
      case 'cisco_switch': {
        return (
          <g transform="translate(12, 0)">
            <rect x="0" y="0" width={mainW} height={h} fill="#1e293b" stroke="#475569" strokeWidth="1" />
            {/* Left Control Panel: Cisco Bridge Logo + Status LEDs & Mode Button */}
            <g transform="translate(4, 3)">
              <rect x="0" y="0" width="46" height={h - 6} rx="1" fill="#0f172a" stroke="#334155" strokeWidth="0.6" />
              {/* Cisco Bridge Logo */}
              <g transform="translate(3, 2)">
                <line x1="2" y1="5" x2="2" y2="1" stroke="#38bdf8" strokeWidth="1.2" />
                <line x1="4" y1="5" x2="4" y2="2.5" stroke="#38bdf8" strokeWidth="1.2" />
                <line x1="6" y1="5" x2="6" y2="0" stroke="#38bdf8" strokeWidth="1.2" />
                <line x1="8" y1="5" x2="8" y2="2.5" stroke="#38bdf8" strokeWidth="1.2" />
                <line x1="10" y1="5" x2="10" y2="1" stroke="#38bdf8" strokeWidth="1.2" />
                <text x="14" y="5" fill="#38bdf8" fontSize="5" fontWeight="bold" fontFamily="sans-serif">
                  CISCO
                </text>
              </g>
              {/* Status LEDs Cluster: SYST, RPS, STAT, SPEED, DPLX */}
              <g transform="translate(3, 8)">
                <circle cx="3" cy="2" r="0.9" fill="#22c55e" />
                <text x="6" y="3" fill="#64748b" fontSize="3" fontFamily="monospace">
                  SYST
                </text>
                <circle cx="16" cy="2" r="0.9" fill="#22c55e" />
                <text x="19" y="3" fill="#64748b" fontSize="3" fontFamily="monospace">
                  RPS
                </text>
                <circle cx="28" cy="2" r="0.9" fill="#22c55e" />
                <text x="31" y="3" fill="#64748b" fontSize="3" fontFamily="monospace">
                  STAT
                </text>
              </g>
              {/* Mode Button & Light-Blue Console RJ45 */}
              <g transform="translate(3, 13)">
                <circle cx="4" cy="4" r="2.5" fill="#1e293b" stroke="#38bdf8" strokeWidth="0.6" />
                <text x="9" y="5.5" fill="#94a3b8" fontSize="3.2" fontFamily="monospace">
                  MODE
                </text>
                {/* Console Port (Cyan Border) */}
                <rect x="26" y="1" width="10" height="7" rx="1" fill="#020617" stroke="#38bdf8" strokeWidth="0.6" />
                <text x="37.5" y="6" fill="#38bdf8" fontSize="3" fontFamily="monospace">
                  CON
                </text>
              </g>
            </g>

            {/* Front Field of 24 or 48 Shielded Ports */}
            <g transform="translate(54, 2)">
              {Array.from({ length: 14 }).map((_, idx) => (
                <React.Fragment key={idx}>
                  {renderRealisticRj45Port(idx * 11.5, 1, `${idx * 2 + 1}`)}
                  {renderRealisticRj45Port(idx * 11.5, 12, `${idx * 2 + 2}`)}
                </React.Fragment>
              ))}
            </g>

            {/* Modular SFP+ Uplink Module on Right */}
            <g transform={`translate(${mainW - 135}, 3)`}>
              <rect x="0" y="0" width="60" height={h - 6} rx="1" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.8" />
              {renderRealisticSfpCage(4, 4, '1G/10G')}
              {renderRealisticSfpCage(18, 4, '10G')}
              {renderRealisticSfpCage(32, 4, '10G')}
              {renderRealisticSfpCage(46, 4, '10G')}
            </g>

            {/* Model & Catalyst Badge */}
            <g transform={`translate(${mainW - 70}, 3)`}>
              <rect x="0" y="0" width="66" height={h - 6} rx="1" fill="#090d16" stroke="#475569" strokeWidth="0.6" />
              <text x="5" y="8" fill="#f8fafc" fontSize="5.5" fontWeight="bold" fontFamily="sans-serif">
                {truncate(device.model, 14)}
              </text>
              <text x="5" y="16" fill="#38bdf8" fontSize="4.5" fontFamily="monospace">
                Gigabit PoE+
              </text>
            </g>
          </g>
        );
      }

      // 5. Cisco Routers (ISR 4331, ISR 4451, ASR 1001-X)
      case 'cisco_router': {
        return (
          <g transform="translate(12, 0)">
            <rect x="0" y="0" width={mainW} height={h} fill="#182234" stroke="#334155" strokeWidth="1" />
            <g transform="translate(6, 4)">
              <text x="0" y="7" fill="#38bdf8" fontSize="6" fontWeight="bold" fontFamily="sans-serif">
                CISCO
              </text>
              <circle cx="3" cy="13" r="1.5" fill="#22c55e" />
              <text x="8" y="14" fill="#94a3b8" fontSize="4" fontFamily="monospace">
                PWR
              </text>
            </g>
            {/* Routed GE and SFP combo ports */}
            <g transform="translate(46, 4)">
              {renderRealisticRj45Port(0, 0, 'GE0')}
              {renderRealisticRj45Port(13, 0, 'GE1')}
              {renderRealisticRj45Port(26, 0, 'GE2')}
              {renderRealisticSfpCage(46, 0, 'SFP1')}
              {renderRealisticSfpCage(62, 0, 'SFP2')}
            </g>
            {/* Modular NIM Blank Plate with Knurled Thumb Screws */}
            <g transform="translate(140, 3)">
              <rect x="0" y="0" width="75" height={h - 6} rx="1" fill="#0a0f1d" stroke="#475569" strokeWidth="0.8" />
              <circle cx="4" cy={(h - 6) / 2} r="2" fill="#64748b" stroke="#cbd5e1" strokeWidth="0.5" />
              <circle cx="71" cy={(h - 6) / 2} r="2" fill="#64748b" stroke="#cbd5e1" strokeWidth="0.5" />
              <text x="37" y={(h - 6) / 2 + 2} fill="#64748b" fontSize="4.5" textAnchor="middle" fontFamily="monospace">
                NIM EXPANSION
              </text>
            </g>
            <g transform={`translate(${mainW - 80}, 4)`}>
              <text x="0" y="8" fill="#ffffff" fontSize="6" fontWeight="bold" fontFamily="sans-serif">
                {truncate(device.model, 14)}
              </text>
              <text x="0" y="16" fill="#38bdf8" fontSize="4.5" fontFamily="monospace">
                Integrated Services
              </text>
            </g>
          </g>
        );
      }

      // 6. MikroTik Routers & Switches (CCR2004, CCR2116, CRS326, CRS354)
      case 'mikrotik_router': {
        return (
          <g transform="translate(12, 0)">
            {/* Iconic Industrial Clean White Chassis */}
            <rect x="0" y="0" width={mainW} height={h} fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
            {/* Left MikroTik Blue Logo Box */}
            <g transform="translate(5, 3)">
              <rect x="0" y="0" width="16" height="12" rx="1.5" fill="#0284c7" />
              <text x="8" y="8.5" fill="#ffffff" fontSize="5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                MT
              </text>
              <text x="8" y="17" fill="#0284c7" fontSize="3.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                MikroTik
              </text>
            </g>
            {/* Front Real Color Touchscreen LCD Display showing Network Traffic Graph */}
            <g transform="translate(26, 3)">
              <rect x="0" y="0" width="46" height={h - 6} rx="1" fill="#020617" stroke="#0284c7" strokeWidth="0.8" />
              {/* Traffic Waveform Graph */}
              <path d="M 4 14 Q 10 6, 16 11 T 26 8 T 36 12 L 42 14" fill="none" stroke="#22c55e" strokeWidth="1" />
              <path d="M 4 15 Q 12 12, 20 14 T 32 10 T 42 15" fill="none" stroke="#38bdf8" strokeWidth="0.8" />
              <text x="4" y="6" fill="#22c55e" fontSize="3.2" fontFamily="monospace">
                CPU: 18%
              </text>
              <text x="24" y="6" fill="#38bdf8" fontSize="3.2" fontFamily="monospace">
                10.2 Gbps
              </text>
            </g>
            {/* RJ45 Ports & SFP+ Ports */}
            <g transform="translate(78, 3)">
              {Array.from({ length: 10 }).map((_, idx) => (
                <React.Fragment key={idx}>
                  {renderRealisticRj45Port(idx * 11.5, 1, `e${idx + 1}`)}
                </React.Fragment>
              ))}
            </g>
            {/* SFP+ 10G and 100G cages */}
            <g transform={`translate(${mainW - 130}, 3)`}>
              {renderRealisticSfpCage(0, 2, 'sfpp1')}
              {renderRealisticSfpCage(15, 2, 'sfpp2')}
              {renderRealisticQsfpCage(32, 1, 'qsfp28')}
            </g>
            {/* Model Badge */}
            <g transform={`translate(${mainW - 70}, 4)`}>
              <text x="0" y="8" fill="#0f172a" fontSize="6" fontWeight="bold" fontFamily="sans-serif">
                {truncate(device.model, 14)}
              </text>
              <text x="0" y="16" fill="#0284c7" fontSize="4.5" fontFamily="monospace">
                Cloud Core Router
              </text>
            </g>
          </g>
        );
      }

      // 7. FortiGate Firewalls (FortiGate 100F, 200F, 600E)
      case 'firewall_fortigate': {
        return (
          <g transform="translate(12, 0)">
            {/* Iconic Fortinet Light Off-White Casing */}
            <rect x="0" y="0" width={mainW} height={h} fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1" />
            {/* Fortinet Signature Bold Red Horizontal Branding Stripe */}
            <rect x="0" y="0" width={mainW} height="3" fill="#e11d48" />
            {/* Left Fortinet Logo & Status LEDs */}
            <g transform="translate(6, 4)">
              <text x="0" y="8" fill="#e11d48" fontSize="6.5" fontWeight="900" fontFamily="sans-serif">
                FORTINET
              </text>
              <g transform="translate(0, 10)">
                <circle cx="2" cy="2" r="1" fill="#22c55e" />
                <text x="5" y="3.5" fill="#64748b" fontSize="3.5" fontFamily="monospace">
                  PWR
                </text>
                <circle cx="16" cy="2" r="1" fill="#22c55e" />
                <text x="19" y="3.5" fill="#64748b" fontSize="3.5" fontFamily="monospace">
                  HA
                </text>
              </g>
            </g>
            {/* Demarcated Port Clusters: MGMT, WAN, HA, Shared Switch */}
            <g transform="translate(65, 3)">
              {/* WAN Ports */}
              <rect x="0" y="0" width="30" height={h - 6} rx="1" fill="#f1f5f9" stroke="#e11d48" strokeWidth="0.6" />
              {renderRealisticRj45Port(3, 4, 'WAN1')}
              {renderRealisticRj45Port(16, 4, 'WAN2')}
              {/* Internal / Switch Ports */}
              <g transform="translate(36, 0)">
                <rect x="0" y="0" width="130" height={h - 6} rx="1" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.6" />
                {Array.from({ length: 8 }).map((_, idx) => (
                  <React.Fragment key={idx}>
                    {renderRealisticRj45Port(idx * 11.5 + 4, 1, `${idx + 1}`)}
                    {renderRealisticRj45Port(idx * 11.5 + 4, 12, `${idx + 9}`)}
                  </React.Fragment>
                ))}
              </g>
            </g>
            {/* FortiGate Model Badge */}
            <g transform={`translate(${mainW - 80}, 4)`}>
              <text x="0" y="9" fill="#0f172a" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif">
                {truncate(device.model, 14)}
              </text>
              <text x="0" y="17" fill="#e11d48" fontSize="4.5" fontWeight="bold" fontFamily="monospace">
                Security Fabric
              </text>
            </g>
          </g>
        );
      }

      // 8. Sophos XGS Firewalls
      case 'firewall_sophos': {
        return (
          <g transform="translate(12, 0)">
            <rect x="0" y="0" width={mainW} height={h} fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
            <g transform="translate(8, 4)">
              <text x="0" y="8" fill="#ffffff" fontSize="6.5" fontWeight="900" fontFamily="sans-serif">
                SOPHOS
              </text>
              <circle cx="4" cy="14" r="1.3" fill="#22c55e" />
              <text x="8" y="15" fill="#bae6fd" fontSize="4" fontFamily="monospace">
                XGS
              </text>
            </g>
            <g transform="translate(68, 3)">
              <rect x="0" y="0" width="140" height={h - 6} rx="1" fill="#0c4a6e" stroke="#38bdf8" strokeWidth="0.6" />
              {Array.from({ length: 8 }).map((_, idx) => (
                <React.Fragment key={idx}>
                  {renderRealisticRj45Port(idx * 11.5 + 4, 2, `${idx + 1}`)}
                </React.Fragment>
              ))}
              {renderRealisticSfpCage(105, 3, 'F1')}
              {renderRealisticSfpCage(120, 3, 'F2')}
            </g>
            <g transform={`translate(${mainW - 80}, 5)`}>
              <text x="0" y="8" fill="#ffffff" fontSize="6" fontWeight="bold" fontFamily="sans-serif">
                {truncate(device.model, 14)}
              </text>
            </g>
          </g>
        );
      }

      // 9. Storage Systems (HPE MSA, Alletra, Dell EMC Unity / PowerStore)
      case 'hpe_storage':
      case 'emc_storage': {
        const isEmc = device.category === 'emc_storage';
        return (
          <g transform="translate(12, 0)">
            {/* Dark 3D Curved Storage Bezel */}
            <rect x="0" y="0" width={mainW} height={h} fill="#090d16" stroke="#334155" strokeWidth="1" />
            {/* Storage Drive Enclosure: 24 SFF Drives with Latches */}
            <g transform="translate(8, 3)">
              {Array.from({ length: 10 }).map((_, idx) => (
                <React.Fragment key={idx}>
                  {renderHpeDriveCaddy(idx * 23, 0, 21, (h - 8) / 2, idx)}
                  {renderHpeDriveCaddy(idx * 23, (h - 8) / 2 + 2, 21, (h - 8) / 2, idx + 10)}
                </React.Fragment>
              ))}
            </g>
            {/* Central Storage Emblem (Dell EMC blue circle or HPE Green Badge) */}
            <g transform={`translate(${mainW - 95}, 4)`}>
              <rect x="0" y="0" width="90" height={h - 8} rx="1.5" fill="#0f172a" stroke="#475569" strokeWidth="0.8" />
              {isEmc ? (
                <>
                  <circle cx="12" cy={(h - 8) / 2} r="6" fill="#0284c7" />
                  <text x="12" y={(h - 8) / 2 + 2.5} fill="#ffffff" fontSize="4.5" fontWeight="bold" textAnchor="middle">
                    EMC
                  </text>
                  <text x="24" y={(h - 8) / 2 - 1} fill="#ffffff" fontSize="5.5" fontWeight="bold" fontFamily="sans-serif">
                    {truncate(device.model, 14)}
                  </text>
                  <text x="24" y={(h - 8) / 2 + 6} fill="#38bdf8" fontSize="4" fontFamily="monospace">
                    All-Flash SAN
                  </text>
                </>
              ) : (
                <>
                  <rect x="5" y="4" width="12" height="7" rx="1" fill="#01a982" />
                  <text x="11" y="9" fill="#ffffff" fontSize="5" fontWeight="bold" textAnchor="middle">
                    HPE
                  </text>
                  <text x="22" y="9" fill="#ffffff" fontSize="5.5" fontWeight="bold" fontFamily="sans-serif">
                    {truncate(device.model, 14)}
                  </text>
                  <text x="22" y="16" fill="#01a982" fontSize="4.5" fontFamily="monospace">
                    MSA Storage
                  </text>
                </>
              )}
            </g>
          </g>
        );
      }

      // 10. QNAP Rackmount NAS
      case 'qnap_storage': {
        return (
          <g transform="translate(12, 0)">
            <rect x="0" y="0" width={mainW} height={h} fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <g transform="translate(6, 4)">
              <text x="0" y="8" fill="#38bdf8" fontSize="6.5" fontWeight="bold" fontFamily="sans-serif">
                QNAP
              </text>
              {/* Backlit Alphanumeric LCD with Enter/Select buttons */}
              <g transform="translate(0, 11)">
                <rect x="0" y="0" width="34" height="12" rx="1" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.5" />
                <text x="3" y="6" fill="#ffffff" fontSize="3" fontFamily="monospace">
                  SYSTEM READY
                </text>
                <text x="3" y="10" fill="#bae6fd" fontSize="3" fontFamily="monospace">
                  192.168.1.50
                </text>
              </g>
            </g>
            {/* Drive Trays with Key Lock Cylinders */}
            <g transform="translate(48, 3)">
              {Array.from({ length: 8 }).map((_, idx) => (
                <g key={idx} transform={`translate(${idx * 27}, 0)`}>
                  {renderHpeDriveCaddy(0, 0, 25, h - 6, idx)}
                  {/* Physical Key Lock Cylinder */}
                  <circle cx="12" cy={h - 9} r="1.5" fill="#020617" stroke="#cbd5e1" strokeWidth="0.5" />
                  <line x1="12" y1={h - 10} x2="12" y2={h - 8} stroke="#cbd5e1" strokeWidth="0.4" />
                </g>
              ))}
            </g>
            <g transform={`translate(${mainW - 65}, 4)`}>
              <text x="0" y="8" fill="#f8fafc" fontSize="5.5" fontWeight="bold" fontFamily="sans-serif">
                {truncate(device.model, 14)}
              </text>
              <text x="0" y="16" fill="#38bdf8" fontSize="4.5" fontFamily="monospace">
                QuTS Enterprise
              </text>
            </g>
          </g>
        );
      }

      // 11. Copper Patch Panel (24 / 48 Ports)
      case 'patch_panel': {
        return (
          <g transform="translate(12, 0)">
            <rect x="0" y="0" width={mainW} height={h} fill="#090d16" stroke="#334155" strokeWidth="1" />
            <text x="6" y={h / 2 + 2} fill="#94a3b8" fontSize="5" fontWeight="bold" fontFamily="monospace">
              Cat6A STP
            </text>
            {/* Keystone RJ45 Jacks grouped in 6s with white labeling strip */}
            <g transform="translate(40, 2)">
              {Array.from({ length: 24 }).map((_, idx) => {
                const groupOffset = Math.floor(idx / 6) * 6;
                const px = idx * 11 + groupOffset;
                return (
                  <React.Fragment key={idx}>
                    {/* White label card strip above port */}
                    <rect x={px} y="1" width="9.5" height="3" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.3" />
                    <text x={px + 4.75} y="3.2" fill="#0f172a" fontSize="2.8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                      {idx + 1}
                    </text>
                    {renderRealisticRj45Port(px, 5, undefined, false)}
                  </React.Fragment>
                );
              })}
            </g>
          </g>
        );
      }

      // 12. Cable Management Horizontal Organizer (Finger Duct / Comb)
      case 'cable_management': {
        return (
          <g transform="translate(12, 0)">
            {/* Matte Dark Casing */}
            <rect x="0" y="0" width={mainW} height={h} fill="#111827" stroke="#374151" strokeWidth="1" />
            {/* Front Snap-On Removable Brushed Cover with Finger Grips */}
            <rect x="10" y="4" width={mainW - 20} height={h - 8} rx="2" fill="#1f2937" stroke="#4b5563" strokeWidth="0.8" />
            {/* Slotted Cable Routing Finger Channels (Comb slots) */}
            {Array.from({ length: 18 }).map((_, idx) => (
              <rect key={idx} x={16 + idx * 17} y={7} width="9" height={h - 14} rx="1" fill="#0b0f19" stroke="#374151" strokeWidth="0.5" />
            ))}
            <text x={mainW / 2} y={h / 2 + 2} fill="#9ca3af" fontSize="4.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              CABLE MANAGEMENT DUCT 19"
            </text>
          </g>
        );
      }

      // 13. Power Distribution Unit (PDU / پاور ماژول رکمونت)
      case 'pdu': {
        const outletCount = device.pduOutletsCount || 8;
        const outletType = device.pduOutletType || 'IEC C13';
        return (
          <g transform="translate(12, 0)">
            <rect x="0" y="0" width={mainW} height={h} fill="#0b0f19" stroke="#334155" strokeWidth="1" />
            {/* Illuminated Master Switch / MCB */}
            <g transform="translate(6, 4)">
              <rect x="0" y="0" width="16" height={h - 8} rx="2" fill="#7f1d1d" stroke="#ef4444" strokeWidth="0.8" />
              <rect x="3" y={2} width="10" height={(h - 12) / 2} rx="1" fill="#ef4444" />
              <text x="8" y={h - 6} fill="#fca5a5" fontSize="3" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                ON
              </text>
            </g>

            {/* Digital Meter / Indicator (Volts/Amps) */}
            <g transform="translate(26, 4)">
              <rect x="0" y="0" width="34" height={h - 8} rx="1.5" fill="#020617" stroke="#0ea5e9" strokeWidth="0.7" />
              <text x="17" y={10} fill="#38bdf8" fontSize="4.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                230V
              </text>
              <text x="17" y={h - 7} fill="#22c55e" fontSize="3.8" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                {device.pduAmperage || 16}A MAX
              </text>
            </g>

            {/* PDU Power Outlets (C13, C19 or Schuko) */}
            <g transform="translate(65, 3)">
              {Array.from({ length: Math.min(outletCount, 16) }).map((_, idx) => {
                const spacing = (mainW - 130) / Math.min(outletCount, 16);
                const ox = idx * spacing;
                return (
                  <g key={idx} transform={`translate(${ox}, 0)`}>
                    {/* Socket Bezel */}
                    <rect x="0" y="0" width="13" height={h - 6} rx="1.5" fill="#1e293b" stroke="#475569" strokeWidth="0.6" />
                    {/* Socket Holes */}
                    {outletType.includes('Schuko') ? (
                      <>
                        <circle cx="6.5" cy={(h - 6) / 2 - 3.5} r="1.3" fill="#020617" />
                        <circle cx="6.5" cy={(h - 6) / 2 + 3.5} r="1.3" fill="#020617" />
                        <line x1="3" y1={(h - 6) / 2} x2="10" y2={(h - 6) / 2} stroke="#eab308" strokeWidth="0.6" />
                      </>
                    ) : (
                      <>
                        <path d={`M 2.5 3 L 10.5 3 L 11.5 6 L 11.5 ${h - 9} L 1.5 ${h - 9} L 1.5 6 Z`} fill="#090d16" stroke="#334155" strokeWidth="0.4" />
                        <rect x="3.5" y={6} width="1.5" height="4" fill="#64748b" />
                        <rect x="8" y={6} width="1.5" height="4" fill="#64748b" />
                        <rect x="5.7" y={2} width="1.6" height="3" fill="#64748b" />
                      </>
                    )}
                    {/* Number label */}
                    <text x="6.5" y={h - 1} fill="#94a3b8" fontSize="2.8" textAnchor="middle" fontFamily="monospace">
                      {idx + 1}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* Brand Label */}
            <g transform={`translate(${mainW - 60}, 5)`}>
              <text x="0" y="8" fill="#f8fafc" fontSize="4.8" fontWeight="bold" fontFamily="sans-serif">
                {device.brand}
              </text>
              <text x="0" y={h - 8} fill="#f59e0b" fontSize="3.5" fontFamily="monospace">
                PDU {outletCount}x {outletType.split(' ')[0]}
              </text>
            </g>
          </g>
        );
      }

      // 14. Rackmount Online UPS
      case 'ups_rackmount': {
        return (
          <g transform="translate(12, 0)">
            <rect x="0" y="0" width={mainW} height={h} fill="#090d16" stroke="#475569" strokeWidth="1" />
            {/* Battery pack front grill / door */}
            <rect x="6" y="4" width={mainW * 0.52} height={h - 8} rx="2" fill="#111827" stroke="#1f2937" strokeWidth="0.8" />
            {Array.from({ length: 8 }).map((_, idx) => (
              <line key={idx} x1="12" y1={7 + idx * 5} x2={mainW * 0.52} y2={7 + idx * 5} stroke="#1f2937" strokeWidth="1.2" />
            ))}
            <text x="14" y={h - 8} fill="#64748b" fontSize="4.5" fontFamily="monospace">
              HOT-SWAP BATTERY CARTRIDGE
            </text>

            {/* LCD Control Panel */}
            <g transform={`translate(${mainW * 0.56}, 4)`}>
              <rect x="0" y="0" width="70" height={h - 8} rx="2" fill="#020617" stroke="#0284c7" strokeWidth="0.9" />
              {/* Backlit blue display */}
              <rect x="4" y="3" width="62" height={Math.min(22, h - 14)} rx="1" fill="#0369a1" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="0.5" />
              <text x="8" y="11" fill="#38bdf8" fontSize="4.5" fontWeight="bold" fontFamily="monospace">
                ONLINE • 100% BAT
              </text>
              <text x="8" y="18" fill="#4ade80" fontSize="4.2" fontFamily="monospace">
                OUTPUT: 230V 50Hz
              </text>
              {/* Control Buttons */}
              <circle cx="12" cy={h - 10} r="2" fill="#0ea5e9" />
              <circle cx="20" cy={h - 10} r="2" fill="#0ea5e9" />
              <circle cx="28" cy={h - 10} r="2" fill="#ef4444" />
            </g>

            {/* UPS Model / Capacity */}
            <g transform={`translate(${mainW - 65}, 6)`}>
              <text x="0" y="8" fill="#f8fafc" fontSize="5.5" fontWeight="bold" fontFamily="sans-serif">
                {device.brand}
              </text>
              <text x="0" y="16" fill="#38bdf8" fontSize="4.5" fontWeight="bold" fontFamily="monospace">
                {device.model}
              </text>
              <text x="0" y="24" fill="#22c55e" fontSize="4" fontFamily="monospace">
                {device.powerWatts ? `${device.powerWatts}W` : '3000VA'}
              </text>
            </g>
          </g>
        );
      }

      // 15. LCD KVM Console Drawer (کنسول رکمونت KVM)
      case 'kvm_console': {
        return (
          <g transform="translate(12, 0)">
            <rect x="0" y="0" width={mainW} height={h} fill="#0f172a" stroke="#334155" strokeWidth="1" />
            {/* Brushed Aluminum Pull Handle Tray */}
            <rect x="8" y="3" width={mainW - 16} height={h - 6} rx="2" fill="#1e293b" stroke="#64748b" strokeWidth="0.8" />
            {/* Left and Right Quick-Release Latch Levers */}
            <rect x="12" y="5" width="8" height={h - 10} rx="1" fill="#38bdf8" />
            <rect x={mainW - 20} y="5" width="8" height={h - 10} rx="1" fill="#38bdf8" />
            <text x={mainW / 2} y={h / 2 + 2} fill="#e2e8f0" fontSize="5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
              ATEN 17" LCD KVM DRAWER & TOUCHPAD CONSOLE
            </text>
          </g>
        );
      }

      // 16. Rack Cooling Fan Unit (یونیت فن رکمونت)
      case 'fan_unit': {
        return (
          <g transform="translate(12, 0)">
            <rect x="0" y="0" width={mainW} height={h} fill="#0b1120" stroke="#334155" strokeWidth="1" />
            {/* 4 Circular Wire Mesh Exhaust Fan Grills */}
            {Array.from({ length: 4 }).map((_, idx) => {
              const fx = 40 + idx * 55;
              return (
                <g key={idx} transform={`translate(${fx}, ${h / 2})`}>
                  <circle cx="0" cy="0" r="11" fill="#020617" stroke="#475569" strokeWidth="0.8" />
                  <circle cx="0" cy="0" r="10" fill={`url(#${devUid}-fan-mesh)`} />
                  <circle cx="0" cy="0" r="3.5" fill="#334155" />
                  <circle cx="0" cy="0" r="1" fill="#06b6d4" />
                </g>
              );
            })}
            {/* Digital Thermostat Display */}
            <g transform={`translate(${mainW - 85}, 3)`}>
              <rect x="0" y="0" width="45" height={h - 6} rx="1.5" fill="#020617" stroke="#0ea5e9" strokeWidth="0.7" />
              <text x="22.5" y={11} fill="#22c55e" fontSize="5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                24.5°C
              </text>
              <text x="22.5" y={h - 6} fill="#38bdf8" fontSize="3.5" textAnchor="middle" fontFamily="monospace">
                AUTO SPEED
              </text>
            </g>
            {/* Rocker Power Switch */}
            <g transform={`translate(${mainW - 32}, 4)`}>
              <rect x="0" y="0" width="14" height={h - 8} rx="1.5" fill="#1e293b" stroke="#64748b" strokeWidth="0.6" />
              <circle cx="7" cy={(h - 8) / 2} r="2.5" fill="#22c55e" />
            </g>
          </g>
        );
      }

      // 17. Blanking Panel (بلنک پنل پرکننده یونیت)
      case 'blank_panel': {
        return (
          <g transform="translate(12, 0)">
            <rect x="0" y="0" width={mainW} height={h} fill="#090d16" stroke="#1e293b" strokeWidth="1" />
            {/* Matte textured horizontal channel */}
            <rect x="8" y="3" width={mainW - 16} height={h - 6} rx="1" fill="#111827" stroke="#1f2937" strokeWidth="0.6" />
            <text x={mainW / 2} y={h / 2 + 2} fill="#475569" fontSize="4.2" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
              19" BLANKING FILLER PANEL ({device.heightU}U)
            </text>
          </g>
        );
      }

      // 18. Fiber Optic ODF Patch Panel (پچ پنل فیبر نوری)
      case 'fiber_odf': {
        return (
          <g transform="translate(12, 0)">
            <rect x="0" y="0" width={mainW} height={h} fill="#0d1520" stroke="#334155" strokeWidth="1" />
            {/* Cable Tray & Splice cassette area */}
            <rect x="6" y="3" width={mainW * 0.28} height={h - 6} rx="2" fill="#090d16" stroke="#1e293b" strokeWidth="0.8" />
            <text x={12} y={11} fill="#38bdf8" fontSize="4.5" fontWeight="bold" fontFamily="monospace">
              OPTICAL FIBER ODF
            </text>
            <text x={12} y={h - 6} fill="#64748b" fontSize="3.5" fontFamily="monospace">
              {device.generation || 'LC / SC DUPLEX'}
            </text>

            {/* Fiber Optic Adapters Grid */}
            <g transform={`translate(${mainW * 0.32}, 3)`}>
              {Array.from({ length: 12 }).map((_, idx) => (
                <g key={idx} transform={`translate(${idx * 16}, 0)`}>
                  <rect x="0" y="1" width="13" height={h - 8} rx="1" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.6" />
                  <rect x="2.5" y="4" width="3.5" height={h - 14} rx="0.5" fill="#020617" />
                  <rect x="7" y="4" width="3.5" height={h - 14} rx="0.5" fill="#020617" />
                  <text x="6.5" y={h - 3} fill="#94a3b8" fontSize="2.8" textAnchor="middle" fontFamily="monospace">
                    {idx * 2 + 1}-{idx * 2 + 2}
                  </text>
                </g>
              ))}
            </g>

            {/* Brand & Danger Laser Warning */}
            <g transform={`translate(${mainW - 55}, 4)`}>
              <rect x="0" y="0" width="48" height={h - 8} rx="1.5" fill="#451a03" stroke="#f59e0b" strokeWidth="0.7" />
              <text x="24" y={8} fill="#fbbf24" fontSize="3.8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                CLASS 1 LASER
              </text>
              <text x="24" y={h - 6} fill="#fef3c7" fontSize="3.2" textAnchor="middle" fontFamily="monospace">
                {device.brand}
              </text>
            </g>
          </g>
        );
      }

      // 19. Rack Shelf (سینی ثابت و متحرک رک)
      case 'rack_shelf': {
        const isSliding = device.model.toLowerCase().includes('sliding');
        return (
          <g transform="translate(12, 0)">
            <rect x="0" y="0" width={mainW} height={h} fill="#111827" stroke="#475569" strokeWidth="1" />
            {/* Perforated Ventilation Holes Pattern */}
            <g transform="translate(10, 4)">
              {Array.from({ length: 18 }).map((_, col) => (
                <g key={col} transform={`translate(${col * 15}, 0)`}>
                  <rect x="0" y="2" width="10" height={h - 12} rx="1" fill="#030712" stroke="#1f2937" strokeWidth="0.5" />
                  <circle cx="5" cy={h / 2 - 2} r="1.5" fill="#374151" />
                </g>
              ))}
            </g>

            {/* Handle if Sliding Shelf */}
            {isSliding && (
              <g transform={`translate(${mainW / 2 - 25}, ${h - 7})`}>
                <rect x="0" y="0" width="50" height="4" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.8" />
              </g>
            )}

            {/* Shelf Badge */}
            <g transform={`translate(${mainW - 75}, 3)`}>
              <text x="0" y={h / 2 + 1} fill="#94a3b8" fontSize="4.2" fontWeight="bold" fontFamily="monospace">
                {truncate(device.name, 16)}
              </text>
            </g>
          </g>
        );
      }

      // 18. Default / Industrial IPC Rackmount Chassis
      default: {
        return (
          <g transform="translate(12, 0)">
            <rect x="0" y="0" width={mainW} height={h} fill="#1e293b" stroke="#475569" strokeWidth="1" />
            <g transform="translate(10, 4)">
              <circle cx="5" cy="5" r="2.5" fill="#22c55e" />
              <text x="12" y="7" fill="#ffffff" fontSize="5.5" fontWeight="bold" fontFamily="sans-serif">
                {truncate(`${device.brand} ${device.model}`, 24)}
              </text>
            </g>
          </g>
        );
      }
    }
  };

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={`select-none overflow-hidden transition-all ${
        isHighlighted ? 'ring-2 ring-cyan-400 filter drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]' : ''
      }`}
      onClick={onSelect}
    >
      {/* Heavy-duty 19" Rack Mounting Ears */}
      {renderRackEars(
        device.category === 'hpe_server' || device.category === 'hpe_storage'
          ? '#01a982'
          : device.category === 'asus_server'
          ? '#dc2626'
          : device.category === 'cisco_switch' || device.category === 'cisco_router' || device.category === 'cisco_server'
          ? '#0284c7'
          : device.category === 'firewall_fortigate'
          ? '#e11d48'
          : '#475569'
      )}

      {/* Main Faceplate: Front or Rear */}
      {viewMode === 'front' ? renderFrontPanel() : renderRearPanel()}
    </svg>
  );
};
