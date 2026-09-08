import React, { useState, useRef, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Server,
  Router as RouterIcon,
  Wifi,
  MapPin,
  Layers,
  Zap,
  Cable,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Search,
  Filter,
  Eye,
  Info,
  Terminal
} from 'lucide-react';
import { TopologyData, Device, TopologyLink, TopologyNode } from '../types';

interface SchematicTopologyViewProps {
  topology: TopologyData | null;
  loading: boolean;
  onRefresh: () => void;
  onScanCdpLldp: () => void;
  isScanning: boolean;
  onInspectDevice: (device: Device) => void;
  onInspectPorts: (device: Device) => void;
  onConnectTerminal?: (device: Device) => void;
}

export const SchematicTopologyView: React.FC<SchematicTopologyViewProps> = ({
  topology,
  loading,
  onRefresh,
  onScanCdpLldp,
  isScanning,
  onInspectDevice,
  onInspectPorts,
  onConnectTerminal,
}) => {
  const [viewMode, setViewMode] = useState<'schematic' | 'physical'>('schematic');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterBuilding, setFilterBuilding] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPortLabels, setShowPortLabels] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);

  // Pan and drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.interactive-node')) {
      return;
    }
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNodeId(null);
  };

  // Node position calculations for Schematic View
  const nodePositions = useMemo(() => {
    if (!topology || !topology.nodes) return new Map<string, { x: number; y: number }>();
    const pos = new Map<string, { x: number; y: number }>();

    // Hierarchical arrangement:
    // Row 0 (y: 80): Routers / Edge Gateways
    // Row 1 (y: 200): Core Switches
    // Row 2 (y: 350): Distribution Switches
    // Row 3 (y: 500): Access Switches
    // Row 4 (y: 650): Access Points & Endpoints

    const routers = topology.nodes.filter((n) => n.type === 'router');
    const core = topology.nodes.filter((n) => n.type === 'switch' && n.role.includes('Core'));
    const dist = topology.nodes.filter((n) => n.type === 'switch' && n.role.includes('Distribution'));
    const acc = topology.nodes.filter((n) => n.type === 'switch' && !n.role.includes('Core') && !n.role.includes('Distribution'));
    const aps = topology.nodes.filter((n) => n.type === 'access_point');

    const layoutRow = (items: TopologyNode[], y: number, startX = 150, spacing = 280) => {
      const totalWidth = items.length * spacing;
      const initialX = Math.max(100, 500 - totalWidth / 2);
      items.forEach((item, index) => {
        pos.set(item.id, {
          x: initialX + index * spacing,
          y,
        });
      });
    };

    layoutRow(routers, 70, 150, 260);
    layoutRow(core, 190, 150, 300);
    layoutRow(dist, 340, 120, 340);
    layoutRow(acc, 490, 100, 320);
    layoutRow(aps, 640, 80, 270);

    // Fallback for any unpositioned nodes
    let unposIdx = 0;
    topology.nodes.forEach((n) => {
      if (!pos.has(n.id)) {
        pos.set(n.id, { x: 100 + (unposIdx % 4) * 250, y: 780 + Math.floor(unposIdx / 4) * 140 });
        unposIdx++;
      }
    });

    return pos;
  }, [topology]);

  const selectedNode = topology?.nodes.find((n) => n.id === selectedNodeId);

  // Filter nodes for search and building
  const filteredNodes = useMemo(() => {
    if (!topology) return [];
    return topology.nodes.filter((n) => {
      if (filterBuilding !== 'all' && n.building !== filterBuilding) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          n.name.toLowerCase().includes(q) ||
          n.ip.toLowerCase().includes(q) ||
          n.building.toLowerCase().includes(q) ||
          n.floor.toLowerCase().includes(q) ||
          n.unit.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [topology, filterBuilding, searchQuery]);

  // Grouped hierarchy for Physical View
  const physicalHierarchy = useMemo(() => {
    if (!topology) return {};
    const groups: Record<string, Record<string, Device[]>> = {};

    topology.nodes.forEach((d) => {
      const b = d.building || 'سایر ساختمان‌ها';
      const f = d.floor || 'طبقه نامشخص';
      if (!groups[b]) groups[b] = {};
      if (!groups[b][f]) groups[b][f] = [];
      groups[b][f].push(d);
    });

    return groups;
  }, [topology]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
        <p className="text-sm">در حال بارگذاری و ترسیم نقشه شماتیک شبکه از بک‌اند پایتون...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] bg-transparent text-right overflow-hidden text-slate-100">
      {/* Top Toolbar */}
      <div className="p-2 sm:px-4 spatial-glass border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs z-20 shadow-xl backdrop-blur-xl">
        {/* View Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900/60 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setViewMode('schematic')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === 'schematic'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>نقشه شماتیک توپولوژی</span>
            </button>
            <button
              onClick={() => setViewMode('physical')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                viewMode === 'physical'
                  ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>محیط شماتیک ساختمانی (مکان فیزیکی)</span>
            </button>
          </div>

          <label className="hidden md:flex items-center gap-1.5 text-slate-300 text-xs cursor-pointer mr-2">
            <input
              type="checkbox"
              checked={showPortLabels}
              onChange={(e) => setShowPortLabels(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-indigo-500 bg-slate-900 border-white/20 focus:ring-indigo-500"
            />
            <span>نمایش پورت‌های اتصال</span>
          </label>
        </div>

        {/* Filters & Actions */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="جستجوی تجهیز، IP یا واحد..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 pr-8 rounded-xl bg-slate-900/70 border border-white/15 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-400 w-44 sm:w-52"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2" />
          </div>

          {/* Building Filter */}
          <select
            value={filterBuilding}
            onChange={(e) => setFilterBuilding(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-900/70 border border-white/15 text-slate-200 text-xs focus:outline-none focus:border-indigo-400"
          >
            <option value="all">تمام ساختمان‌ها</option>
            {topology?.buildings.map((b) => (
              <option key={b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Run CDP/LLDP Scan */}
          <button
            onClick={onScanCdpLldp}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-medium shadow-md transition disabled:opacity-50 active:scale-95"
            title="پویش و استخراج همسایگی‌ها با پروتکل‌های CDP و LLDP"
          >
            <Zap className={`w-3.5 h-3.5 text-cyan-300 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? 'در حال اسکن همسایگی...' : 'اسکن CDP/LLDP'}</span>
          </button>

          {/* Canvas Controls */}
          {viewMode === 'schematic' && (
            <div className="flex items-center gap-1 bg-slate-900/60 border border-white/10 rounded-xl p-1">
              <button
                onClick={() => setZoom((z) => Math.min(z + 0.15, 2))}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                title="بزرگنمایی"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(z - 0.15, 0.4))}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                title="کوچکنمایی"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetView}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                title="بازنشانی اندازه و موقعیت"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* VIEW 1: Interactive Schematic SVG Canvas */}
        {viewMode === 'schematic' ? (
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="flex-1 h-full cursor-grab active:cursor-grabbing relative overflow-hidden bg-slate-950/80 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:24px_24px]"
          >
            {/* SVG Schematic Canvas */}
            <svg
              className="w-full h-full absolute inset-0 select-none"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              }}
            >
              <defs>
                {/* Subtle shadow filter for links */}
                <filter id="glow-trunk" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#7c3aed" floodOpacity="0.3" />
                </filter>
                <filter id="glow-access" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#2563eb" floodOpacity="0.25" />
                </filter>
              </defs>

              {/* Draw Topology Connection Links */}
              {topology?.links.map((link) => {
                const sourcePos = nodePositions.get(link.source);
                const targetPos = nodePositions.get(link.target);
                if (!sourcePos || !targetPos) return null;

                const isTrunk = link.type === 'trunk';
                const isDown = link.status === 'down';
                const isSelected = selectedNodeId === link.source || selectedNodeId === link.target;

                // Center coordinates of nodes
                const x1 = sourcePos.x + 110;
                const y1 = sourcePos.y + 50;
                const x2 = targetPos.x + 110;
                const y2 = targetPos.y + 50;

                // Midpoint for badges
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;

                return (
                  <g key={link.id} className="transition-all">
                    {/* Link Line */}
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={
                        isDown
                          ? '#ef4444'
                          : isTrunk
                          ? isSelected
                            ? '#6d28d9'
                            : '#7c3aed'
                          : isSelected
                          ? '#1d4ed8'
                          : '#2563eb'
                      }
                      strokeWidth={isTrunk ? 3 : 2}
                      strokeDasharray={isDown ? '6 4' : isTrunk ? 'none' : 'none'}
                      filter={isTrunk && !isDown ? 'url(#glow-trunk)' : 'url(#glow-access)'}
                      opacity={isSelected ? 1 : 0.85}
                    />

                    {/* Port and Protocol Badges on Links */}
                    {showPortLabels && (
                      <g transform={`translate(${midX}, ${midY})`}>
                        <rect
                          x="-45"
                          y="-10"
                          width="90"
                          height="20"
                          rx="4"
                          fill="#ffffff"
                          stroke={isTrunk ? '#c4b5fd' : '#bfdbfe'}
                          strokeWidth="1"
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#334155"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {link.speed || (isTrunk ? '10G' : '1G')} • {link.protocol || (isTrunk ? 'CDP' : 'LLDP')}
                        </text>
                      </g>
                    )}

                    {/* Source Port Tag */}
                    {showPortLabels && (
                      <g transform={`translate(${x1 + (x2 - x1) * 0.22}, ${y1 + (y2 - y1) * 0.22})`}>
                        <rect x="-24" y="-8" width="48" height="16" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                        <text textAnchor="middle" dominantBaseline="central" fill="#4f46e5" fontSize="8" fontFamily="monospace" fontWeight="bold">
                          {link.source_port}
                        </text>
                      </g>
                    )}

                    {/* Target Port Tag */}
                    {showPortLabels && (
                      <g transform={`translate(${x1 + (x2 - x1) * 0.78}, ${y1 + (y2 - y1) * 0.78})`}>
                        <rect x="-24" y="-8" width="48" height="16" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                        <text textAnchor="middle" dominantBaseline="central" fill="#4f46e5" fontSize="8" fontFamily="monospace" fontWeight="bold">
                          {link.target_port}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Draw Nodes on Canvas */}
              {filteredNodes.map((node) => {
                const pos = nodePositions.get(node.id) || { x: 100, y: 100 };
                const isSelected = selectedNodeId === node.id;
                const isOnline = node.is_online;

                return (
                  <foreignObject
                    key={node.id}
                    x={pos.x}
                    y={pos.y}
                    width="230"
                    height="120"
                    className="overflow-visible interactive-node"
                  >
                    <div
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`w-[220px] p-3 rounded-xl border transition-all cursor-pointer shadow-xl select-none text-right backdrop-blur-xl ${
                        isSelected
                          ? 'spatial-glass border-cyan-400 ring-2 ring-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.35)] scale-105 z-30'
                          : isOnline
                          ? 'spatial-glass spatial-glass-hover border-white/10 hover:border-indigo-500/40'
                          : 'spatial-glass border-rose-500/40 bg-rose-950/20'
                      }`}
                    >
                      {/* Node Header */}
                      <div className="flex items-center justify-between gap-1.5 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`p-1.5 rounded-lg ${
                              node.type === 'switch'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : node.type === 'router'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            {node.type === 'switch' ? (
                              <Server className="w-3.5 h-3.5" />
                            ) : node.type === 'router' ? (
                              <RouterIcon className="w-3.5 h-3.5" />
                            ) : (
                              <Wifi className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <span className="font-bold text-xs text-white truncate font-mono">{node.name}</span>
                        </div>

                        {/* Status Pulse */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isOnline
                                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse'
                                : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                            }`}
                          ></span>
                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                              isOnline ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30' : 'text-rose-300 bg-rose-500/15 border border-rose-500/30'
                            }`}
                          >
                            {isOnline ? `${node.latency_ms || 1.2}ms` : 'OFF'}
                          </span>
                        </div>
                      </div>

                      {/* IP & Model */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-indigo-300 bg-slate-900/60 px-2 py-0.5 rounded-lg border border-white/10 mb-1.5">
                        <span className="font-bold">{node.ip}</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[90px]">{node.role}</span>
                      </div>

                      {/* Location Preview (Building, Floor, Unit) */}
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 truncate">
                        <MapPin className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                        <span className="truncate">
                          {node.building.replace('(Central Bldg)', '').replace('(Engineering Bldg)', '')} • {node.floor}
                        </span>
                      </div>

                      {/* Quick Port and CLI preview trigger button */}
                      <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-mono">{node.total_ports || 24}P</span>
                          {node.has_unsaved_changes && (
                            <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-1 rounded border border-amber-500/40" title="دارای تغییرات رایت‌نشده در استارتاپ">
                              wr!
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {onConnectTerminal && (node.type === 'switch' || node.type === 'router') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onConnectTerminal(node);
                              }}
                              className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-0.5 hover:underline"
                              title="کانکت به خط فرمان ترمینال سیسکو"
                            >
                              <Terminal className="w-3 h-3 text-emerald-400" />
                              <span>CLI</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onInspectPorts(node);
                            }}
                            className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-0.5 hover:underline"
                            title="بررسی و پیکربندی پورت‌ها و VLAN"
                          >
                            <Cable className="w-3 h-3" />
                            <span>پورت‌ها</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </foreignObject>
                );
              })}
            </svg>

            {/* Bottom Floating Legend */}
            <div className="absolute bottom-3 left-3 z-20 spatial-glass border border-white/10 backdrop-blur-xl rounded-xl p-3 shadow-2xl text-xs space-y-1.5 text-slate-200">
              <div className="text-[11px] font-bold text-white mb-1 flex items-center gap-1.5 glow-text-cyan">
                <Info className="w-3.5 h-3.5 text-indigo-400" />
                <span>راهنمای نقشه شماتیک توپولوژی</span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-1 bg-purple-500 rounded shadow-[0_0_8px_rgba(168,85,247,0.5)]"></span>
                  <span className="text-purple-300 font-mono font-medium">Trunk (802.1Q)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-1 bg-cyan-500 rounded shadow-[0_0_8px_rgba(6,182,212,0.5)]"></span>
                  <span className="text-cyan-300 font-mono font-medium">Access (VLAN)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"></span>
                  <span>آنلاین</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>آفلاین</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* VIEW 2: Physical Building & Floor Schematic Map */
          <div className="flex-1 h-full overflow-y-auto p-4 space-y-4">
            <div className="spatial-glass p-4 rounded-xl border border-white/10 shadow-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 glow-text-cyan">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span>جانمایی شماتیک فیزیکی در ساختمان‌ها و طبقات</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  نمایش محل استقرار هر سوئیچ، روتر و اکسس‌پوینت بر اساس ساختمان، طبقه، واحد و رک
                </p>
              </div>
            </div>

            {/* Buildings Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {Object.entries(physicalHierarchy).map(([bldgName, floors]) => (
                <div
                  key={bldgName}
                  className="spatial-glass border border-white/10 rounded-xl p-4 shadow-xl space-y-3"
                >
                  {/* Building Title */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{bldgName}</h4>
                        <span className="text-[11px] text-slate-400">
                          {Object.values(floors).reduce((acc, devs) => acc + devs.length, 0)} تجهیز مستقر
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Floors in this building */}
                  <div className="space-y-3">
                    {Object.entries(floors).map(([floorName, devices]) => (
                      <div
                        key={floorName}
                        className="bg-slate-900/50 border border-white/5 rounded-xl p-3 space-y-2.5"
                      >
                        {/* Floor Label */}
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 font-semibold text-cyan-400">
                            <Layers className="w-3.5 h-3.5" />
                            <span>{floorName}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-lg border border-white/10">
                            {devices.length} تجهیز در این طبقه
                          </span>
                        </div>

                        {/* Devices inside Floor */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {devices.map((device) => (
                            <div
                              key={device.id}
                              onClick={() => setSelectedNodeId(device.id)}
                              className={`p-3 rounded-xl border transition cursor-pointer shadow-lg backdrop-blur-xl ${
                                selectedNodeId === device.id
                                  ? 'spatial-glass border-cyan-400 ring-2 ring-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                                  : device.is_online
                                  ? 'spatial-glass spatial-glass-hover border-white/10'
                                  : 'spatial-glass border-rose-500/30 bg-rose-950/20'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <div
                                    className={`p-1.5 rounded-lg ${
                                      device.type === 'switch'
                                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                        : device.type === 'router'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                        : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                    }`}
                                  >
                                    {device.type === 'switch' ? (
                                      <Server className="w-3 h-3" />
                                    ) : device.type === 'router' ? (
                                      <RouterIcon className="w-3 h-3" />
                                    ) : (
                                      <Wifi className="w-3 h-3" />
                                    )}
                                  </div>
                                  <span className="font-bold text-xs text-white truncate font-mono">
                                    {device.name}
                                  </span>
                                </div>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                                    device.is_online
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  }`}
                                >
                                  {device.is_online ? 'ONLINE' : 'OFFLINE'}
                                </span>
                              </div>

                              <div className="text-[11px] font-mono font-bold text-indigo-300 mb-1">
                                {device.ip}
                              </div>

                              <div className="text-[10px] text-slate-400 space-y-0.5">
                                <div>واحد: {device.unit}</div>
                                {device.rack && (
                                  <div className="text-slate-400 font-mono">محل رک: {device.rack}</div>
                                )}
                              </div>

                              <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px]">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onInspectPorts(device);
                                  }}
                                  className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-medium"
                                >
                                  <Cable className="w-3 h-3" />
                                  <span>بررسی وضعیت پورت‌ها</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Node Detail Slide-out Drawer */}
        {selectedNode && (
          <div className="w-80 lg:w-96 spatial-glass border-r border-white/10 p-4 overflow-y-auto flex flex-col z-30 shadow-2xl backdrop-blur-2xl text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {selectedNode.type === 'switch' ? (
                    <Server className="w-4 h-4" />
                  ) : selectedNode.type === 'router' ? (
                    <RouterIcon className="w-4 h-4" />
                  ) : (
                    <Wifi className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-mono">{selectedNode.name}</h4>
                  <span className="text-[11px] text-slate-400">{selectedNode.role}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            {/* Quick Status Bar */}
            <div className="my-3 p-3 rounded-xl bg-slate-900/60 border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">وضعیت لحظه‌ای:</span>
                <span
                  className={`font-semibold flex items-center gap-1 ${
                    selectedNode.is_online ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      selectedNode.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                    }`}
                  ></span>
                  {selectedNode.is_online ? 'آنلاین (Online)' : 'آفلاین (Offline)'}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-400">آدرس آی‌پی:</span>
                <span className="text-indigo-300 font-bold">{selectedNode.ip}</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-400">میزان تأخیر (Latency):</span>
                <span className="text-slate-200">
                  {selectedNode.is_online ? `${selectedNode.latency_ms || 1.1} ms` : 'نامحدود (100% loss)'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">مدل دستگاه:</span>
                <span className="text-slate-200 font-mono text-[11px]">{selectedNode.model}</span>
              </div>
            </div>

            {/* Location Specs */}
            <div className="space-y-1.5 text-xs mb-3">
              <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span>موقعیت مکانی دقیق تجهیز:</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">ساختمان:</span>
                  <span className="font-medium text-white">{selectedNode.building}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">طبقه:</span>
                  <span className="font-medium text-white">{selectedNode.floor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">واحد/اتاق:</span>
                  <span className="font-medium text-white">{selectedNode.unit}</span>
                </div>
                {selectedNode.rack && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">محل رک:</span>
                    <span className="font-mono text-cyan-300 font-bold">{selectedNode.rack}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Protocol Support */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 text-xs mb-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">پروتکل CDP:</span>
                <span
                  className={
                    selectedNode.cdp_enabled ? 'text-emerald-400 font-medium' : 'text-slate-500'
                  }
                >
                  {selectedNode.cdp_enabled ? 'فعال (Cisco CDP v2)' : 'غیرفعال'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">پروتکل LLDP:</span>
                <span
                  className={
                    selectedNode.lldp_enabled ? 'text-emerald-400 font-medium' : 'text-slate-500'
                  }
                >
                  {selectedNode.lldp_enabled ? 'فعال (IEEE 802.1AB)' : 'غیرفعال'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-auto pt-3 space-y-2">
              <button
                onClick={() => onInspectPorts(selectedNode)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-medium text-xs shadow-lg transition active:scale-98"
              >
                <Cable className="w-3.5 h-3.5" />
                <span>مشاهده و پیکربندی پورت‌ها و ویلن</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
