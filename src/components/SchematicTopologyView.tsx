import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
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
  Terminal,
  Move,
  RotateCcw,
  Check
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

  // Viewport zoom and pan with LocalStorage persistence
  const [zoom, setZoom] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('net_topology_viewport');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.zoom === 'number') return parsed.zoom;
      }
    } catch (e) {}
    return 1;
  });

  const [pan, setPan] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('net_topology_viewport');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.pan && typeof parsed.pan.x === 'number') return parsed.pan;
      }
    } catch (e) {}
    return { x: 0, y: 0 };
  });

  // Custom node positions with LocalStorage persistence
  const [customPositions, setCustomPositions] = useState<Record<string, { x: number; y: number }>>(() => {
    try {
      const saved = localStorage.getItem('net_topology_node_positions');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {}
    return {};
  });

  const [hasSavedPositions, setHasSavedPositions] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('net_topology_node_positions');
    } catch (e) {
      return false;
    }
  });

  // Dragging states
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const dragNodeOffset = useRef<{ offsetX: number; offsetY: number; startClientX: number; startClientY: number; moved: boolean }>({
    offsetX: 0,
    offsetY: 0,
    startClientX: 0,
    startClientY: 0,
    moved: false,
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterBuilding, setFilterBuilding] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPortLabels, setShowPortLabels] = useState(true);
  const [isFullMode, setIsFullMode] = useState(false);
  const [showToolbarInFullMode, setShowToolbarInFullMode] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Toggle Full Mode (Hides header, sidebar, top menu, and maximizes map to full browser viewport)
  const toggleFullMode = useCallback(() => {
    setIsFullMode((prev) => {
      const next = !prev;
      if (next) {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } else {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
      return next;
    });
  }, []);

  // Listen for Escape key and browser fullscreen change events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullMode) {
        setIsFullMode(false);
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullMode) {
        setIsFullMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullMode]);

  // Save viewport changes to localStorage
  const saveViewport = useCallback((newZoom: number, newPan: { x: number; y: number }) => {
    try {
      localStorage.setItem('net_topology_viewport', JSON.stringify({ zoom: newZoom, pan: newPan }));
    } catch (e) {}
  }, []);

  // Save custom node positions to localStorage
  const saveNodePositions = useCallback((positions: Record<string, { x: number; y: number }>) => {
    try {
      localStorage.setItem('net_topology_node_positions', JSON.stringify(positions));
      setHasSavedPositions(true);
    } catch (e) {}
  }, []);

  // Reset positions back to auto-layout
  const handleResetPositions = () => {
    if (window.confirm('آیا مایلید موقعیت قرارگیری تجهیزات در نقشه به حالت پیش‌فرض و منظم بازگردد؟')) {
      setCustomPositions({});
      setHasSavedPositions(false);
      try {
        localStorage.removeItem('net_topology_node_positions');
      } catch (e) {}
    }
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    saveViewport(1, { x: 0, y: 0 });
    setSelectedNodeId(null);
  };

  // Node position calculations for Schematic View (hierarchical default + custom overrides)
  const nodePositions = useMemo(() => {
    if (!topology || !topology.nodes) return new Map<string, { x: number; y: number }>();
    const pos = new Map<string, { x: number; y: number }>();

    // Hierarchical arrangement defaults:
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

    // Apply custom user drag-and-drop position overrides
    Object.entries(customPositions).forEach(([id, customPos]) => {
      const posObj = customPos as { x: number; y: number } | undefined;
      if (posObj && typeof posObj.x === 'number' && typeof posObj.y === 'number') {
        pos.set(id, posObj);
      }
    });

    return pos;
  }, [topology, customPositions]);

  // Background Pan Handler
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If clicked on an interactive node or button, don't start canvas pan
    if (
      (e.target as HTMLElement).closest('.interactive-node') ||
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('input') ||
      (e.target as HTMLElement).closest('select')
    ) {
      return;
    }
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  // Node Drag Handler (Mouse Down)
  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    // Ignore clicks on internal action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    e.stopPropagation();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Convert client coords to world diagram coords
    const worldMouseX = (e.clientX - rect.left - pan.x) / zoom;
    const worldMouseY = (e.clientY - rect.top - pan.y) / zoom;

    const currentPos = nodePositions.get(nodeId) || { x: 100, y: 100 };

    dragNodeOffset.current = {
      offsetX: worldMouseX - currentPos.x,
      offsetY: worldMouseY - currentPos.y,
      startClientX: e.clientX,
      startClientY: e.clientY,
      moved: false,
    };

    setDraggingNodeId(nodeId);
  };

  // Global mouse move & up
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      // 1. Handling Node Drag
      if (draggingNodeId && containerRef.current) {
        const dist = Math.hypot(
          e.clientX - dragNodeOffset.current.startClientX,
          e.clientY - dragNodeOffset.current.startClientY
        );
        if (dist > 3) {
          dragNodeOffset.current.moved = true;
        }

        const rect = containerRef.current.getBoundingClientRect();
        const worldMouseX = (e.clientX - rect.left - pan.x) / zoom;
        const worldMouseY = (e.clientY - rect.top - pan.y) / zoom;

        const newX = Math.round(worldMouseX - dragNodeOffset.current.offsetX);
        const newY = Math.round(worldMouseY - dragNodeOffset.current.offsetY);

        setCustomPositions((prev) => ({
          ...prev,
          [draggingNodeId]: { x: newX, y: newY },
        }));
        return;
      }

      // 2. Handling Canvas Pan
      if (isPanning) {
        const newPan = {
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        };
        setPan(newPan);
      }
    };

    const handleGlobalMouseUp = () => {
      if (draggingNodeId) {
        if (dragNodeOffset.current.moved) {
          // Persist the updated positions on drop
          setCustomPositions((latest) => {
            saveNodePositions(latest);
            return latest;
          });
        } else {
          // It was a click without significant drag
          setSelectedNodeId(draggingNodeId);
        }
        setDraggingNodeId(null);
      }

      if (isPanning) {
        setIsPanning(false);
        saveViewport(zoom, pan);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingNodeId, isPanning, panStart, pan, zoom, saveNodePositions, saveViewport]);

  // Mouse Wheel Zoom with cursor focal anchoring
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      // Only zoom if hovering schematic canvas
      if (viewMode !== 'schematic') return;
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setZoom((prevZoom) => {
        const factor = e.deltaY < 0 ? 1.12 : 0.89;
        const targetZoom = Math.min(Math.max(prevZoom * factor, 0.2), 3.0);
        const cleanZoom = parseFloat(targetZoom.toFixed(2));

        if (cleanZoom === prevZoom) return prevZoom;

        // Keep world coordinate under mouse cursor stable
        setPan((prevPan) => {
          const worldX = (mouseX - prevPan.x) / prevZoom;
          const worldY = (mouseY - prevPan.y) / prevZoom;

          const newPanX = Math.round(mouseX - worldX * cleanZoom);
          const newPanY = Math.round(mouseY - worldY * cleanZoom);
          const newPan = { x: newPanX, y: newPanY };

          saveViewport(cleanZoom, newPan);
          return newPan;
        });

        return cleanZoom;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [viewMode, saveViewport]);

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
    <div
      className={`text-right overflow-hidden text-slate-100 transition-all duration-300 ${
        isFullMode
          ? 'fixed inset-0 z-[99999] w-screen h-screen bg-slate-950 flex flex-col m-0 p-0 shadow-2xl'
          : 'flex flex-col h-full min-h-[500px] bg-transparent'
      }`}
    >
      {/* Top Toolbar */}
      {(!isFullMode || showToolbarInFullMode) && (
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
            {/* Status Indicator for Custom Positions */}
            {viewMode === 'schematic' && hasSavedPositions && (
              <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20">
                <Check className="w-3 h-3 text-cyan-400" />
                <span>چیدمان سفارشی ذخیره است</span>
              </div>
            )}

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
              {topology?.buildings?.map((b: any, index: number) => {
                const bldgName = typeof b === 'string' ? b : b?.name || `ساختمان ${index + 1}`;
                return (
                  <option key={`bldg-${index}-${bldgName}`} value={bldgName}>
                    {bldgName}
                  </option>
                );
              })}
            </select>

            {/* Run CDP/LLDP Scan */}
            <button
              onClick={onScanCdpLldp}
              disabled={isScanning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-medium shadow-md transition disabled:opacity-50 active:scale-95"
              title="پویش و استخراج همسایگی‌ها با پروتکل‌های CDP و LLDP"
            >
              <Zap className={`w-3.5 h-3.5 text-cyan-300 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'در حال اسکن...' : 'اسکن CDP/LLDP'}</span>
            </button>

            {/* Canvas Controls */}
            {viewMode === 'schematic' && (
              <div className="flex items-center gap-1 bg-slate-900/60 border border-white/10 rounded-xl p-1">
                <button
                  onClick={() => {
                    const newZoom = Math.min(zoom + 0.15, 3.0);
                    setZoom(parseFloat(newZoom.toFixed(2)));
                    saveViewport(newZoom, pan);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                  title="بزرگنمایی (یا با اسکرول ماوس)"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    const newZoom = Math.max(zoom - 0.15, 0.2);
                    setZoom(parseFloat(newZoom.toFixed(2)));
                    saveViewport(newZoom, pan);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                  title="کوچکنمایی (یا با اسکرول ماوس)"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetView}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                  title="بازنشانی زوم و مرکز صفحه"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={toggleFullMode}
                  className={`p-1.5 rounded-lg transition ${
                    isFullMode ? 'text-amber-300 bg-amber-500/20' : 'text-slate-400 hover:text-white'
                  }`}
                  title="حالت فول"
                >
                  {isFullMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                {hasSavedPositions && (
                  <button
                    onClick={handleResetPositions}
                    className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition border-r border-white/10 pr-1.5 mr-0.5"
                    title="بازگردانی چیدمان نودها به حالت خودکار اولیه"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex">
        {/* VIEW 1: Interactive Schematic SVG Canvas */}
        {viewMode === 'schematic' ? (
          <div
            ref={containerRef}
            onMouseDown={handleCanvasMouseDown}
            className={`flex-1 h-full relative overflow-hidden bg-slate-950/80 bg-[radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] select-none ${
              draggingNodeId
                ? 'cursor-grabbing'
                : isPanning
                ? 'cursor-grabbing'
                : 'cursor-grab'
            }`}
            style={{
              backgroundPosition: `${pan.x}px ${pan.y}px`,
              backgroundSize: `${Math.round(24 * Math.max(0.6, Math.min(zoom, 1.4)))}px ${Math.round(24 * Math.max(0.6, Math.min(zoom, 1.4)))}px`,
            }}
          >
            {/* Top-Left Floating Controls: Fullscreen Toggle & Tools */}
            <div className="absolute top-4 left-4 z-40 flex items-center gap-2">
              <button
                type="button"
                onClick={toggleFullMode}
                className={`group relative flex items-center justify-center p-2.5 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-200 active:scale-95 ${
                  isFullMode
                    ? 'bg-gradient-to-r from-amber-500/25 to-rose-500/25 border-amber-500/50 text-amber-300 hover:bg-amber-500/35 shadow-[0_0_25px_rgba(245,158,11,0.4)]'
                    : 'bg-slate-900/85 hover:bg-slate-800 border-white/20 hover:border-cyan-400/50 text-slate-200 hover:text-cyan-300 shadow-[0_0_20px_rgba(0,0,0,0.5)]'
                }`}
                title="حالت فول"
                aria-label="حالت فول"
              >
                {isFullMode ? (
                  <Minimize2 className="w-5 h-5 text-amber-300" />
                ) : (
                  <Maximize2 className="w-5 h-5 text-cyan-300 group-hover:scale-110 transition-transform" />
                )}

                {/* Tooltip on hover: "حالت فول" */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-3 py-1.5 rounded-lg bg-slate-900/95 border border-white/20 text-white text-xs font-medium whitespace-nowrap shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50">
                  {isFullMode ? 'خروج از حالت فول (Esc)' : 'حالت فول'}
                </div>
              </button>

              {isFullMode && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowToolbarInFullMode((prev) => !prev)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-white/20 hover:border-white/30 text-xs text-slate-300 hover:text-white shadow-xl backdrop-blur-xl transition active:scale-95"
                    title={showToolbarInFullMode ? 'مخفی کردن نوار ابزار' : 'نمایش نوار ابزار'}
                  >
                    <span>{showToolbarInFullMode ? 'مخفی‌سازی ابزارها' : 'نمایش ابزارها'}</span>
                  </button>

                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono backdrop-blur-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                    <span>حالت تمام‌صفحه نقشه (کلید Esc برای خروج)</span>
                  </div>
                </>
              )}
            </div>

            {/* SVG Schematic Canvas - Unbounded Infinite Viewport */}
            <svg
              className="w-full h-full absolute inset-0 select-none overflow-visible pointer-events-auto"
              style={{ overflow: 'visible' }}
            >
              <defs>
                {/* Subtle shadow filter for links */}
                <filter id="glow-trunk" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#7c3aed" floodOpacity="0.3" />
                </filter>
                <filter id="glow-access" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#2563eb" floodOpacity="0.25" />
                </filter>
              </defs>

              {/* Infinite World Canvas Group - Pan & Zoom Coordinate Space */}
              <g
                className="canvas-world"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: '0 0',
                  transition: isPanning || draggingNodeId ? 'none' : 'transform 0.12s ease-out',
                }}
              >
              {/* Draw Topology Connection Links */}
              {topology?.links.map((link) => {
                const sourcePos = nodePositions.get(link.source);
                const targetPos = nodePositions.get(link.target);
                if (!sourcePos || !targetPos) return null;

                const isTrunk = link.type === 'trunk';
                const isDown = link.status === 'down';
                const isSelected = selectedNodeId === link.source || selectedNodeId === link.target;

                // Center coordinates of nodes (230x120 dimension)
                const x1 = sourcePos.x + 115;
                const y1 = sourcePos.y + 55;
                const x2 = targetPos.x + 115;
                const y2 = targetPos.y + 55;

                // Midpoint for badges
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;

                return (
                  <g key={link.id} className="transition-all pointer-events-none">
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
                      strokeDasharray={isDown ? '6 4' : 'none'}
                      filter={isTrunk && !isDown ? 'url(#glow-trunk)' : 'url(#glow-access)'}
                      opacity={isSelected ? 1 : 0.85}
                    />

                    {/* Port and Protocol Badges on Links */}
                    {showPortLabels && (
                      <g transform={`translate(${midX}, ${midY})`} className="pointer-events-none">
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
                      <g transform={`translate(${x1 + (x2 - x1) * 0.24}, ${y1 + (y2 - y1) * 0.24})`} className="pointer-events-none">
                        <rect x="-24" y="-8" width="48" height="16" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                        <text textAnchor="middle" dominantBaseline="central" fill="#4f46e5" fontSize="8" fontFamily="monospace" fontWeight="bold">
                          {link.source_port}
                        </text>
                      </g>
                    )}

                    {/* Target Port Tag */}
                    {showPortLabels && (
                      <g transform={`translate(${x1 + (x2 - x1) * 0.76}, ${y1 + (y2 - y1) * 0.76})`} className="pointer-events-none">
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
                const isBeingDragged = draggingNodeId === node.id;
                const isOnline = node.is_online;

                return (
                  <foreignObject
                    key={node.id}
                    x={pos.x}
                    y={pos.y}
                    width="240"
                    height="150"
                    className="overflow-visible interactive-node"
                    style={{ overflow: 'visible' }}
                  >
                    <div
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                      className={`w-[226px] p-3 rounded-xl border transition-shadow select-none text-right backdrop-blur-xl group relative ${
                        isBeingDragged
                          ? 'spatial-glass border-cyan-400 ring-2 ring-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.6)] cursor-grabbing z-40 scale-102'
                          : isSelected
                          ? 'spatial-glass border-cyan-400 ring-2 ring-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.35)] cursor-grab z-30'
                          : isOnline
                          ? 'spatial-glass spatial-glass-hover border-white/10 hover:border-indigo-500/40 cursor-grab hover:shadow-2xl'
                          : 'spatial-glass border-rose-500/40 bg-rose-950/20 cursor-grab'
                      }`}
                    >
                      {/* Drag Handle Indicator */}
                      <div
                        className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-900/90 border border-white/20 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[9px] font-mono pointer-events-none shadow-md"
                        title="جهت تغییر مکان، بکشید و رها کنید (Drag & Drop)"
                      >
                        <Move className="w-2.5 h-2.5 text-cyan-400" />
                        <span>جابجایی</span>
                      </div>

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
                              isOnline
                                ? 'text-emerald-300 bg-emerald-500/15 border border-emerald-500/30'
                                : 'text-rose-300 bg-rose-500/15 border border-rose-500/30'
                            }`}
                          >
                            {isOnline ? `${node.latency_ms || 1.2}ms` : 'OFF'}
                          </span>
                        </div>
                      </div>

                      {/* IP & Role */}
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
              </g>
            </svg>

            {/* Bottom Floating Legend & Interactive Guide */}
            <div className="absolute bottom-3 left-3 z-20 spatial-glass border border-white/10 backdrop-blur-xl rounded-xl p-3 shadow-2xl text-xs space-y-1.5 text-slate-200">
              <div className="text-[11px] font-bold text-white mb-1 flex items-center justify-between gap-3 glow-text-cyan">
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-indigo-400" />
                  <span>راهنمای نقشه توپولوژی</span>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/15 px-1.5 py-0.5 rounded border border-cyan-500/30">
                  اسکرول موس = زوم | کشیدن = جابجایی
                </span>
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
              <button
                type="button"
                onClick={toggleFullMode}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/15 text-xs text-slate-200 transition active:scale-95"
                title={isFullMode ? 'خروج از حالت فول (Esc)' : 'حالت فول'}
              >
                {isFullMode ? <Minimize2 className="w-4 h-4 text-amber-300" /> : <Maximize2 className="w-4 h-4 text-cyan-300" />}
                <span>{isFullMode ? 'خروج از حالت فول' : 'حالت فول'}</span>
              </button>
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
