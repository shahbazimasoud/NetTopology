import React, { useState } from 'react';
import {
  TopologyNode,
  MountedHardwareDevice,
  CustomTopologyRack,
  HardwareCategory,
} from '../../types';
import { HardwareSvgRenderer } from './HardwareSvgRenderer';
import {
  Server,
  CreditCard,
  Box,
  CheckCircle2,
  X,
  Move,
  ChevronDown,
  Plus,
  ArrowRightLeft,
  Settings,
} from 'lucide-react';

interface PhysicalNodeOnCanvasProps {
  node: TopologyNode;
  isEn: boolean;
  isRtl: boolean;
  isBeingDragged: boolean;
  isSelected: boolean;
  racks: CustomTopologyRack[];
  onToggleToCardView: (nodeId?: string) => void;
  onMountToRack: (rackId: string, startU: number) => void;
  onUnmountFromRack: (rackId: string, deviceId: string) => void;
  onInspectRack?: (rack: CustomTopologyRack) => void;
  onRemoveFromMap?: (nodeId: string) => void;
  onMouseDown: (e: React.MouseEvent) => void;
}

// Helper to convert a TopologyNode to a MountedHardwareDevice for photorealistic SVG rendering
export function convertNodeToHardwareDevice(
  node: TopologyNode,
  rackId?: string,
  startU: number = 1
): MountedHardwareDevice {
  const anyNode = node as any;
  const nameLower = (node.name || '').toLowerCase();
  const modelLower = (node.model || '').toLowerCase();
  const vendorLower = (anyNode.vendor || '').toLowerCase();
  const platformLower = (node.platform || '').toLowerCase();
  const roleLower = (node.role || '').toLowerCase();
  const nodeTypeStr = ((node.type as string) || '').toLowerCase();

  const isMikrotik =
    vendorLower.includes('mikrotik') ||
    platformLower.includes('mikrotik') ||
    platformLower.includes('routeros') ||
    nameLower.includes('mikrotik') ||
    modelLower.includes('ccr') ||
    modelLower.includes('crs') ||
    modelLower.includes('rb');

  const isFortinet =
    vendorLower.includes('fortinet') ||
    vendorLower.includes('fortigate') ||
    platformLower.includes('fortinet') ||
    nameLower.includes('fortigate') ||
    modelLower.includes('fortigate') ||
    modelLower.includes('fg-');

  const isSophos =
    vendorLower.includes('sophos') ||
    nameLower.includes('sophos') ||
    modelLower.includes('xgs');

  const isHpeServer =
    vendorLower.includes('hpe') ||
    vendorLower.includes('hp') ||
    modelLower.includes('dl380') ||
    modelLower.includes('dl360') ||
    modelLower.includes('proliant');

  const isAsusServer =
    vendorLower.includes('asus') ||
    modelLower.includes('rs720') ||
    nameLower.includes('asus');

  const isCiscoServer =
    vendorLower.includes('cisco') &&
    (roleLower.includes('server') || modelLower.includes('ucs'));

  let category: HardwareCategory = 'cisco_switch';
  let heightU = 1;
  let brand = 'Cisco';
  let model = node.model || 'Catalyst 9300-24P';

  if (isMikrotik) {
    category = 'mikrotik_router';
    brand = 'MikroTik';
    model = node.model || 'CCR2004-16G-2S+';
    heightU = 1;
  } else if (isFortinet) {
    category = 'firewall_fortigate';
    brand = 'Fortinet';
    model = node.model || 'FortiGate 100F';
    heightU = 1;
  } else if (isSophos) {
    category = 'firewall_sophos';
    brand = 'Sophos';
    model = node.model || 'XGS 2100';
    heightU = 1;
  } else if (isHpeServer || roleLower.includes('server') || nodeTypeStr === 'server') {
    category = isAsusServer ? 'asus_server' : isCiscoServer ? 'cisco_server' : 'hpe_server';
    brand = isAsusServer ? 'ASUS' : isCiscoServer ? 'Cisco' : 'HPE';
    model = node.model || (isAsusServer ? 'RS720-E10' : isCiscoServer ? 'UCS C240 M6' : 'DL380 Gen10');
    heightU = 2;
  } else if (nodeTypeStr === 'storage' || roleLower.includes('storage')) {
    category = 'hpe_storage';
    brand = 'HPE';
    model = node.model || 'MSA 2060';
    heightU = 2;
  } else if (nodeTypeStr === 'router' || roleLower.includes('router') || platformLower.includes('cisco_ios_xr') || platformLower.includes('cisco_xe')) {
    category = 'cisco_router';
    brand = 'Cisco';
    model = node.model || 'ISR 4331';
    heightU = 1;
  } else if (nodeTypeStr === 'switch' || roleLower.includes('switch')) {
    category = 'cisco_switch';
    brand = anyNode.vendor || 'Cisco';
    model = node.model || 'Catalyst 9300-24P';
    heightU = 1;
  }

  // Preserve user custom hardware overrides if present
  if (anyNode.category) category = anyNode.category;
  if (anyNode.heightU) heightU = anyNode.heightU;
  if (anyNode.brand) brand = anyNode.brand;

  const portCount = Math.max(4, Math.min(52, node.total_ports || 24));
  const deviceId = node.id.startsWith('hw-') ? node.id : `hw-${node.id}`;

  return {
    id: deviceId,
    name: node.name,
    category,
    brand,
    model,
    heightU,
    startU,
    networkCards: [
      {
        id: 'nic-main',
        name: isMikrotik ? 'Ethernet Ports' : 'Integrated Ports',
        portType: '1GbE RJ45',
        portCount: Math.min(portCount, 48),
        slot: 'onboard',
      },
      {
        id: 'nic-sfp',
        name: isMikrotik ? 'SFP+ 10G Cages' : 'Uplink Transceivers',
        portType: '10G SFP+',
        portCount: Math.max(2, Math.min(8, portCount > 24 ? 4 : 2)),
        slot: 'sfp',
      },
    ],
    ip: node.ip,
    notes: node.role ? `Role: ${node.role}` : undefined,
  };
}

export const PhysicalNodeOnCanvas: React.FC<PhysicalNodeOnCanvasProps> = ({
  node,
  isEn,
  isRtl,
  isBeingDragged,
  isSelected,
  racks,
  onToggleToCardView,
  onMountToRack,
  onUnmountFromRack,
  onInspectRack,
  onRemoveFromMap,
  onMouseDown,
}) => {
  const [isMountMenuOpen, setIsMountMenuOpen] = useState(false);

  // Check if this device is already mounted in any rack
  let mountedRack: CustomTopologyRack | null = null;
  let mountedDevice: MountedHardwareDevice | null = null;

  for (const r of racks) {
    const found = r.devices.find(
      (d) => d.id === node.id || d.id === `hw-${node.id}` || d.label === node.name
    );
    if (found) {
      mountedRack = r;
      mountedDevice = found;
      break;
    }
  }

  const hwDevice = mountedDevice || convertNodeToHardwareDevice(node);
  const CHASSIS_WIDTH = 340;

  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onToggleToCardView(node.id);
      }}
      title={isEn ? 'Double-click to switch to Card View' : 'برای انتقال به نمای کارت دوبار کلیک کنید'}
      className={`w-[340px] rounded-xl border transition-shadow select-none text-right backdrop-blur-xl group relative ${
        isBeingDragged
          ? 'spatial-glass border-cyan-400 ring-2 ring-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.6)] cursor-grabbing z-40 scale-102'
          : isSelected
          ? 'spatial-glass border-cyan-400 ring-2 ring-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.35)] cursor-grab z-30'
          : 'spatial-glass border-white/15 bg-slate-950/85 hover:border-indigo-500/40 cursor-grab hover:shadow-2xl'
      }`}
    >
      {/* Drag Handle Tooltip Badge */}
      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-900/95 border border-white/20 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[9px] font-mono pointer-events-none shadow-md z-30">
        <Move className="w-2.5 h-2.5 text-cyan-400" />
        <span>{isEn ? 'Drag Physical Chassis' : 'جابه‌جایی شاسی فیزیکی'}</span>
      </div>

      {/* Top Header Bar */}
      <div className="px-3 pt-2.5 pb-2 border-b border-white/10 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 flex-shrink-0">
            <Server className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-white truncate font-mono">{node.name}</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {hwDevice.heightU}U
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 truncate">{node.ip}</div>
          </div>
        </div>

        {/* View Switcher & Actions */}
        <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
          {/* Toggle to Card / Cabling View with 3-second Neon Highlight */}
          <button
            type="button"
            onClick={() => onToggleToCardView(node.id)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-600/40 hover:bg-purple-600/70 text-purple-200 hover:text-white border border-purple-500/40 text-[10px] font-semibold transition cursor-pointer shadow-sm active:scale-95 group/btn"
            title={
              isEn
                ? 'Switch to Card View & Highlight Device (Neon)'
                : 'تغییر به نمای کارت و هایلایت نئونی دیوایس'
            }
          >
            <CreditCard className="w-3.5 h-3.5 text-purple-300 group-hover/btn:text-white transition" />
            <span>{isEn ? 'Card' : 'کارت'}</span>
          </button>

          {/* Remove from Map */}
          {onRemoveFromMap && (
            <button
              type="button"
              onClick={() => onRemoveFromMap(node.id)}
              className="text-slate-400 hover:text-rose-400 p-1 rounded transition"
              title={isEn ? 'Remove from Map' : 'حذف از نقشه'}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Photorealistic Vector Hardware Faceplate */}
      <div className="p-2 flex items-center justify-center bg-slate-900/60 overflow-hidden border-b border-white/10">
        <div className="w-full flex justify-center">
          <HardwareSvgRenderer
            device={hwDevice}
            viewMode="front"
            width={320}
            height={hwDevice.heightU * 26 + 6}
          />
        </div>
      </div>

      {/* Rack Mount Status & Actions Bar */}
      <div
        className="p-2.5 bg-slate-900/80 rounded-b-xl flex items-center justify-between gap-2 text-[11px]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {mountedRack && mountedDevice ? (
          /* Already mounted */
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-medium truncate">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">
                {isEn ? 'In' : 'در رک'}: <strong>{mountedRack.name}</strong> (U{mountedDevice.startU}
                -{mountedDevice.startU + mountedDevice.heightU - 1})
              </span>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {onInspectRack && (
                <button
                  type="button"
                  onClick={() => onInspectRack(mountedRack!)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] border border-white/10 transition"
                >
                  {isEn ? 'Rack' : 'نمای رک'}
                </button>
              )}
              <button
                type="button"
                onClick={() => onUnmountFromRack(mountedRack!.id, mountedDevice!.id)}
                className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] border border-rose-500/30 transition"
                title={isEn ? 'Unmount from Rack' : 'خروج از رک'}
              >
                {isEn ? 'Unmount' : 'خروج'}
              </button>
            </div>
          </div>
        ) : (
          /* Not mounted yet */
          <div className="relative w-full flex items-center justify-between">
            <div className="flex items-center gap-1 text-slate-400 text-[10px]">
              <Box className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
              <span>{isEn ? 'Rackmount Hardware' : 'تجهیز رکمونت فیزیکی'}</span>
            </div>

            {/* Mount to Rack button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMountMenuOpen(!isMountMenuOpen)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-[10px] shadow-sm transition active:scale-95"
              >
                <Plus className="w-3 h-3" />
                <span>{isEn ? 'Mount into Rack' : 'نصب در رک'}</span>
                <ChevronDown className="w-2.5 h-2.5 opacity-70" />
              </button>

              {/* Quick Rack Selection Dropdown */}
              {isMountMenuOpen && (
                <div
                  className={`absolute bottom-full mb-1 ${
                    isRtl ? 'left-0' : 'right-0'
                  } w-52 bg-slate-900 border border-white/20 rounded-xl shadow-2xl p-2 z-50 space-y-1`}
                >
                  <div className="text-[10px] font-bold text-slate-300 pb-1 border-b border-white/10 flex items-center justify-between">
                    <span>{isEn ? 'Select Target Rack:' : 'انتخاب رک مقصد:'}</span>
                    <button
                      onClick={() => setIsMountMenuOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {racks.length === 0 ? (
                    <div className="p-2 text-center text-[10px] text-amber-300">
                      {isEn
                        ? 'No racks on map. Please add a rack first.'
                        : 'هیچ رکی در نقشه وجود ندارد. ابتدا یک رک اضافه کنید.'}
                    </div>
                  ) : (
                    racks.map((rack) => {
                      // Find first free slot of height hwDevice.heightU
                      let freeU: number | null = null;
                      for (let u = 1; u <= rack.units - hwDevice.heightU + 1; u++) {
                        const endU = u + hwDevice.heightU - 1;
                        const occupied = rack.devices.some((d) => {
                          const dEnd = d.startU + d.heightU - 1;
                          return Math.max(u, d.startU) <= Math.min(endU, dEnd);
                        });
                        if (!occupied) {
                          freeU = u;
                          break;
                        }
                      }

                      return (
                        <button
                          key={rack.id}
                          type="button"
                          disabled={freeU === null}
                          onClick={() => {
                            if (freeU !== null) {
                              onMountToRack(rack.id, freeU);
                              setIsMountMenuOpen(false);
                            }
                          }}
                          className={`w-full text-left px-2 py-1.5 rounded-lg text-[10px] flex items-center justify-between transition ${
                            freeU !== null
                              ? 'hover:bg-indigo-600/30 text-white font-medium border border-transparent hover:border-indigo-500/40'
                              : 'opacity-40 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <div className="truncate">
                            <span className="font-bold">{rack.name}</span>
                            <span className="text-[9px] text-slate-400 block font-mono">
                              {rack.units}U • {rack.devices.length} installed
                            </span>
                          </div>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                            {freeU !== null ? `Slot U${freeU}` : 'Full'}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
