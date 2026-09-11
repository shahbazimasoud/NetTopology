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
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Edit2,
  Trash2,
  Box,
  Boxes,
  Map as MapIcon,
  MousePointer,
  CreditCard,
  StickyNote,
  EyeOff
} from 'lucide-react';
import {
  TopologyData,
  Device,
  DeviceType,
  DevicePlatform,
  TopologyLink,
  TopologyNode,
  CustomTopologyMap,
  CustomTopologyLink,
  SwitchPort,
  isMikroTikDevice,
  CustomTopologyRack,
  MountedHardwareDevice,
  RackViewMode,
  CustomTopologyStickyNote,
  DeviceCanvasDisplayMode
} from '../types';
import { useLanguage } from '../i18n';
import { updateDevice } from '../services/api';
import { CustomMapPortSelectorModal } from './CustomMapPortSelectorModal';
import { CustomMapLinkConfigModal } from './CustomMapLinkConfigModal';
import { CustomMapAddDeviceModal } from './CustomMapAddDeviceModal';
import { CustomMapManageModal } from './CustomMapManageModal';
import { AddRackModal } from './rack/AddRackModal';
import { AddHardwareModal } from './rack/AddHardwareModal';
import { RackElevationInspectorModal } from './rack/RackElevationInspectorModal';
import { RackCabinetSvg } from './rack/RackCabinetSvg';
import { TopologyStickyNote } from './rack/TopologyStickyNote';
import { PhysicalNodeOnCanvas, convertNodeToHardwareDevice } from './rack/PhysicalNodeOnCanvas';
import { DeleteConfirmModal, DeleteTarget } from './DeleteConfirmModal';
import { EditDeviceModal } from './EditDeviceModal';

interface SchematicTopologyViewProps {
  topology: TopologyData | null;
  inventoryDevices?: Device[];
  loading: boolean;
  onRefresh: () => void;
  onScanCdpLldp: () => void;
  isScanning: boolean;
  onInspectDevice: (device: Device) => void;
  onInspectPorts: (device: Device) => void;
  onConnectTerminal?: (device: Device) => void;
  isFullMode?: boolean;
  onToggleFullMode?: () => void;
}

// Helper to separate and curve overlapping parallel cables between devices
function getLinkCurve(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  indexInGroup: number,
  totalInGroup: number,
  isReversedDirection: boolean = false
) {
  // If direction is reversed (target -> source), invert index so it matches the spatial slot
  const actualIndex = isReversedDirection ? totalInGroup - 1 - indexInGroup : indexInGroup;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  if (totalInGroup <= 1) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    return {
      pathD: `M ${x1} ${y1} L ${x2} ${y2}`,
      midX: mx,
      midY: my,
      srcTagX: x1 + (x2 - x1) * 0.22,
      srcTagY: y1 + (y2 - y1) * 0.22,
      tgtTagX: x1 + (x2 - x1) * 0.78,
      tgtTagY: y1 + (y2 - y1) * 0.78,
    };
  }

  // Spacing at device endpoints so cables connect to separate physical pins along device edge
  const endpointSpacing = Math.min(22, 120 / Math.max(2, totalInGroup));
  const endpointOffset = (actualIndex - (totalInGroup - 1) / 2) * endpointSpacing;

  const sx = x1 + nx * endpointOffset;
  const sy = y1 + ny * endpointOffset;
  const ex = x2 + nx * endpointOffset;
  const ey = y2 + ny * endpointOffset;

  // Arc spacing along the bezier curve
  const curveSpacing = Math.max(38, 26 + totalInGroup * 10);
  const curveOffset = (actualIndex - (totalInGroup - 1) / 2) * curveSpacing;
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  const cx = mx + nx * curveOffset * 1.6;
  const cy = my + ny * curveOffset * 1.6;

  // Quadratic Bezier evaluation: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
  const evalBezier = (t: number) => {
    const inv = 1 - t;
    const px = inv * inv * sx + 2 * inv * t * cx + t * t * ex;
    const py = inv * inv * sy + 2 * inv * t * cy + t * t * ey;
    return { x: px, y: py };
  };

  const mid = evalBezier(0.5);
  const srcTag = evalBezier(0.24);
  const tgtTag = evalBezier(0.76);

  return {
    pathD: `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`,
    midX: mid.x,
    midY: mid.y,
    srcTagX: srcTag.x,
    srcTagY: srcTag.y,
    tgtTagX: tgtTag.x,
    tgtTagY: tgtTag.y,
  };
}

export const SchematicTopologyView: React.FC<SchematicTopologyViewProps> = ({
  topology,
  inventoryDevices = [],
  loading,
  onRefresh,
  onScanCdpLldp,
  isScanning,
  onInspectDevice,
  onInspectPorts,
  onConnectTerminal,
  isFullMode: propIsFullMode,
  onToggleFullMode,
}) => {
  const { t, isEn, isRtl } = useLanguage();
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
  const [internalFullMode, setInternalFullMode] = useState(false);
  const isFullMode = propIsFullMode !== undefined ? propIsFullMode : internalFullMode;
  const [showToolbarInFullMode, setShowToolbarInFullMode] = useState(false);
  const [isLegendOpen, setIsLegendOpen] = useState(false);

  // Storage keys for custom topology maps persistence
  const CUSTOM_MAPS_STORAGE_KEY = 'nettopology_custom_maps_v2';
  const ACTIVE_MAP_STORAGE_KEY = 'nettopology_active_map_id_v2';

  const [customMaps, setCustomMaps] = useState<CustomTopologyMap[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_MAPS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [activeMapId, setActiveMapId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_MAP_STORAGE_KEY);
      if (saved) return saved;
    } catch (e) {}
    return 'default';
  });

  const currentCustomMap = useMemo(() => {
    if (activeMapId === 'default') return null;
    return customMaps.find((m) => m.id === activeMapId) || null;
  }, [customMaps, activeMapId]);

  const [activeTool, setActiveTool] = useState<'select' | 'cable'>('select');

  // Interactive Cabling Workflow State
  interface CableWorkflowState {
    step: 'idle' | 'select_source_port' | 'select_target_device' | 'select_target_port' | 'configure_link';
    sourceDevice: Device | null;
    sourcePort: string | null;
    sourceInitialPortData?: SwitchPort;
    targetDevice: Device | null;
    targetPort: string | null;
    targetInitialPortData?: SwitchPort;
    editingLink?: CustomTopologyLink | null;
  }

  const [cableWorkflow, setCableWorkflow] = useState<CableWorkflowState>({
    step: 'idle',
    sourceDevice: null,
    sourcePort: null,
    targetDevice: null,
    targetPort: null,
  });

  // Modal Dialog Open States
  const [isPortSelectorOpen, setIsPortSelectorOpen] = useState(false);
  const [isLinkConfigOpen, setIsLinkConfigOpen] = useState(false);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [isManageMapOpen, setIsManageMapOpen] = useState(false);
  const [manageMapMode, setManageMapMode] = useState<'create' | 'edit' | 'delete'>('create');
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [linkToDelete, setLinkToDelete] = useState<CustomTopologyLink | null>(null);

  // Rack & Hardware Studio States
  const [isAddRackOpen, setIsAddRackOpen] = useState(false);
  const [isAddHardwareOpen, setIsAddHardwareOpen] = useState(false);
  const [selectedRackForHardware, setSelectedRackForHardware] = useState<string | undefined>(undefined);
  const [targetUForHardware, setTargetUForHardware] = useState<number | undefined>(undefined);
  const [editingHardwareDevice, setEditingHardwareDevice] = useState<MountedHardwareDevice | null>(null);
  const [editingInventoryDevice, setEditingInventoryDevice] = useState<Device | null>(null);
  const [inspectingRack, setInspectingRack] = useState<CustomTopologyRack | null>(null);
  const [draggingRackId, setDraggingRackId] = useState<string | null>(null);
  const dragRackOffset = useRef({ offsetX: 0, offsetY: 0, startClientX: 0, startClientY: 0, moved: false });

  // Deletion Confirmation Modal State
  const [deleteModalTarget, setDeleteModalTarget] = useState<DeleteTarget | null>(null);

  // Active hover tracking for topmost z-index layering on canvas
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Global & Per-Device display modes ('card' | 'physical')
  const [globalDeviceViewMode, setGlobalDeviceViewMode] = useState<DeviceCanvasDisplayMode>('card');

  // Sticky Notes States
  const [showStickyNotes, setShowStickyNotes] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('nettopology_show_sticky_notes');
      return saved !== null ? JSON.parse(saved) : true;
    } catch (e) {
      return true;
    }
  });

  const toggleShowStickyNotes = useCallback(() => {
    setShowStickyNotes((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nettopology_show_sticky_notes', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  }, []);

  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const dragNoteOffset = useRef({ offsetX: 0, offsetY: 0, startClientX: 0, startClientY: 0, moved: false });

  const saveCustomMaps = useCallback((maps: CustomTopologyMap[]) => {
    setCustomMaps(maps);
    try {
      localStorage.setItem(CUSTOM_MAPS_STORAGE_KEY, JSON.stringify(maps));
    } catch (e) {}
  }, []);

  const getDeviceDisplayMode = useCallback((deviceId: string): DeviceCanvasDisplayMode => {
    if (currentCustomMap?.deviceDisplayModes?.[deviceId]) {
      return currentCustomMap.deviceDisplayModes[deviceId];
    }
    return globalDeviceViewMode;
  }, [currentCustomMap, globalDeviceViewMode]);

  const handleToggleDeviceDisplayMode = useCallback((deviceId: string) => {
    if (!currentCustomMap) return;
    const current = getDeviceDisplayMode(deviceId);
    const next: DeviceCanvasDisplayMode = current === 'card' ? 'physical' : 'card';
    const updatedMap: CustomTopologyMap = {
      ...currentCustomMap,
      deviceDisplayModes: {
        ...(currentCustomMap.deviceDisplayModes || {}),
        [deviceId]: next,
      },
      updatedAt: new Date().toISOString(),
    };
    saveCustomMaps(customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m)));
  }, [currentCustomMap, customMaps, getDeviceDisplayMode, saveCustomMaps]);

  // Mount an existing canvas node into a rack
  const handleMountCanvasNodeToRack = useCallback((node: TopologyNode, rackId: string, startU: number) => {
    if (!currentCustomMap) return;
    const targetRack = (currentCustomMap.racks || []).find((r) => r.id === rackId);
    if (!targetRack) return;

    const hwDevice = convertNodeToHardwareDevice(node, rackId, startU);

    const endU = startU + hwDevice.heightU - 1;
    const hasCollision = targetRack.devices.some((other) => {
      const oEnd = other.startU + other.heightU - 1;
      return Math.max(startU, other.startU) <= Math.min(endU, oEnd);
    });
    if (hasCollision) return;

    const newDevices = [
      ...targetRack.devices.filter((d) => d.label !== node.name && d.id !== `hw-${node.id}`),
      hwDevice,
    ];

    const updatedRacks = (currentCustomMap.racks || []).map((r) =>
      r.id === rackId ? { ...r, devices: newDevices } : r
    );

    const updatedMap: CustomTopologyMap = {
      ...currentCustomMap,
      racks: updatedRacks,
      updatedAt: new Date().toISOString(),
    };
    saveCustomMaps(customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m)));
  }, [currentCustomMap, customMaps, saveCustomMaps]);

  // Sticky Notes Handlers
  const handleAddStickyNote = useCallback(() => {
    if (!currentCustomMap) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const centerX = rect ? Math.round((-pan.x + rect.width / 2 - 115) / zoom) : 250;
    const centerY = rect ? Math.round((-pan.y + rect.height / 2 - 80) / zoom) : 200;

    const newNote: CustomTopologyStickyNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      x: centerX,
      y: centerY,
      width: 230,
      title: '',
      content: '',
      color: 'yellow',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      viewMode: globalDeviceViewMode,
    };

    const updatedMap: CustomTopologyMap = {
      ...currentCustomMap,
      stickyNotes: [...(currentCustomMap.stickyNotes || []), newNote],
      updatedAt: new Date().toISOString(),
    };
    saveCustomMaps(customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m)));
  }, [currentCustomMap, customMaps, pan.x, pan.y, zoom, saveCustomMaps, globalDeviceViewMode]);

  const handleUpdateStickyNote = useCallback((updatedNote: CustomTopologyStickyNote) => {
    if (!currentCustomMap) return;
    const updatedNotes = (currentCustomMap.stickyNotes || []).map((n) =>
      n.id === updatedNote.id ? updatedNote : n
    );
    const updatedMap: CustomTopologyMap = {
      ...currentCustomMap,
      stickyNotes: updatedNotes,
      updatedAt: new Date().toISOString(),
    };
    saveCustomMaps(customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m)));
  }, [currentCustomMap, customMaps, saveCustomMaps]);

  const handleDeleteStickyNote = useCallback((noteId: string) => {
    if (!currentCustomMap) return;
    const updatedNotes = (currentCustomMap.stickyNotes || []).filter((n) => n.id !== noteId);
    const updatedMap: CustomTopologyMap = {
      ...currentCustomMap,
      stickyNotes: updatedNotes,
      updatedAt: new Date().toISOString(),
    };
    saveCustomMaps(customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m)));
  }, [currentCustomMap, customMaps, saveCustomMaps]);

  const handleStickyNoteStartDrag = useCallback((e: React.MouseEvent, noteId: string) => {
    e.stopPropagation();
    if (!containerRef.current || !currentCustomMap) return;
    const rect = containerRef.current.getBoundingClientRect();
    const worldMouseX = (e.clientX - rect.left - pan.x) / zoom;
    const worldMouseY = (e.clientY - rect.top - pan.y) / zoom;

    const note = (currentCustomMap.stickyNotes || []).find((n) => n.id === noteId);
    if (!note) return;

    dragNoteOffset.current = {
      offsetX: worldMouseX - note.x,
      offsetY: worldMouseY - note.y,
      startClientX: e.clientX,
      startClientY: e.clientY,
      moved: false,
    };
    setDraggingNoteId(noteId);
  }, [currentCustomMap, pan.x, pan.y, zoom]);

  // Rack Handlers
  const handleCreateCustomMapRack = useCallback((rackData: Omit<CustomTopologyRack, 'id' | 'devices' | 'x' | 'y'>) => {
    if (!currentCustomMap) return;
    const existingRacks = currentCustomMap.racks || [];
    const startX = Math.round((-pan.x + 350 + existingRacks.length * 420) / zoom);
    const startY = Math.round((-pan.y + 150) / zoom);

    const newRack: CustomTopologyRack = {
      ...rackData,
      id: `rack-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      x: Math.max(50, startX),
      y: Math.max(50, startY),
      devices: [],
    };

    const updatedMap: CustomTopologyMap = {
      ...currentCustomMap,
      racks: [...existingRacks, newRack],
      updatedAt: new Date().toISOString(),
    };
    saveCustomMaps(customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m)));
  }, [currentCustomMap, customMaps, pan.x, pan.y, zoom, saveCustomMaps]);

  const handleToggleRackViewMode = useCallback((rackId: string, newMode: RackViewMode) => {
    if (!currentCustomMap) return;
    const updatedRacks = (currentCustomMap.racks || []).map((r) =>
      r.id === rackId ? { ...r, viewMode: newMode } : r
    );
    const updatedMap: CustomTopologyMap = {
      ...currentCustomMap,
      racks: updatedRacks,
      updatedAt: new Date().toISOString(),
    };
    saveCustomMaps(customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m)));
    if (inspectingRack && inspectingRack.id === rackId) {
      setInspectingRack({ ...inspectingRack, viewMode: newMode });
    }
  }, [currentCustomMap, customMaps, inspectingRack, saveCustomMaps]);

  const handleDeleteRack = useCallback((rackId: string) => {
    if (!currentCustomMap) return;
    const targetRack = currentCustomMap.racks?.find((r) => r.id === rackId);
    if (!targetRack) return;

    // Open safe delete confirmation modal
    setDeleteModalTarget({
      type: 'rack',
      id: targetRack.id,
      name: targetRack.name,
      units: targetRack.units,
      devices: targetRack.devices || [],
    });
  }, [currentCustomMap]);

  const handlePromptDeleteRack = useCallback((rackId: string) => {
    handleDeleteRack(rackId);
  }, [handleDeleteRack]);

  const handlePromptDeleteDevice = useCallback((node: TopologyNode) => {
    setDeleteModalTarget({
      type: 'device',
      id: node.id,
      name: node.name,
      ip: node.ip,
      role: node.role,
      model: node.model,
    });
  }, []);

  const handleConfirmDeleteRack = useCallback((rackId: string, deleteMountedDevices: boolean) => {
    if (!currentCustomMap) return;
    const targetRack = currentCustomMap.racks?.find((r) => r.id === rackId);
    if (!targetRack) return;

    let updatedDeviceIds = [...(currentCustomMap.deviceIds || [])];
    let updatedPositions = { ...(currentCustomMap.devicePositions || {}) };
    let updatedLinks = [...(currentCustomMap.links || [])];

    if (deleteMountedDevices) {
      const rackDeviceIds = new Set<string>();
      (targetRack.devices || []).forEach((d) => {
        rackDeviceIds.add(d.id);
        rackDeviceIds.add(d.id.replace(/^hw-/, ''));
      });

      updatedDeviceIds = updatedDeviceIds.filter((id) => !rackDeviceIds.has(id));
      updatedLinks = updatedLinks.filter(
        (l) => !rackDeviceIds.has(l.sourceDeviceId) && !rackDeviceIds.has(l.targetDeviceId)
      );
      rackDeviceIds.forEach((id) => {
        delete updatedPositions[id];
      });
    } else {
      // Keep devices in map as canvas devices
      (targetRack.devices || []).forEach((dev, idx) => {
        const origId = dev.id.replace(/^hw-/, '');
        if (!updatedDeviceIds.includes(origId)) {
          updatedDeviceIds.push(origId);
        }
        if (!updatedPositions[origId]) {
          updatedPositions[origId] = {
            x: targetRack.x + 460 + (idx % 2) * 260,
            y: targetRack.y + Math.floor(idx / 2) * 160,
          };
        }
      });
    }

    const updatedRacks = (currentCustomMap.racks || []).filter((r) => r.id !== rackId);
    const updatedMap: CustomTopologyMap = {
      ...currentCustomMap,
      racks: updatedRacks,
      deviceIds: updatedDeviceIds,
      devicePositions: updatedPositions,
      links: updatedLinks,
      updatedAt: new Date().toISOString(),
    };
    saveCustomMaps(customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m)));
    if (inspectingRack && inspectingRack.id === rackId) {
      setInspectingRack(null);
    }
    setDeleteModalTarget(null);
  }, [currentCustomMap, customMaps, inspectingRack, saveCustomMaps]);

  const handleRemoveDeviceFromCustomMap = useCallback((deviceId: string) => {
    if (!currentCustomMap) return;
    const updatedDeviceIds = currentCustomMap.deviceIds.filter((id) => id !== deviceId);
    const updatedLinks = (currentCustomMap.links || []).filter(
      (l) => l.sourceDeviceId !== deviceId && l.targetDeviceId !== deviceId
    );
    const updatedPositions = { ...currentCustomMap.devicePositions };
    delete updatedPositions[deviceId];

    const updatedMap: CustomTopologyMap = {
      ...currentCustomMap,
      deviceIds: updatedDeviceIds,
      links: updatedLinks,
      devicePositions: updatedPositions,
      updatedAt: new Date().toISOString(),
    };

    const newMaps = customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m));
    saveCustomMaps(newMaps);
  }, [currentCustomMap, customMaps, saveCustomMaps]);

  const handleSaveHardware = useCallback((rackId: string, device: MountedHardwareDevice) => {
    if (!currentCustomMap) return;
    const updatedRacks = (currentCustomMap.racks || []).map((r) => {
      if (r.id !== rackId) return r;
      const existingIdx = r.devices.findIndex((d) => d.id === device.id);
      let newDevices = [...r.devices];
      if (existingIdx >= 0) {
        newDevices[existingIdx] = device;
      } else {
        newDevices.push(device);
      }
      return { ...r, devices: newDevices };
    });

    const updatedMap: CustomTopologyMap = {
      ...currentCustomMap,
      racks: updatedRacks,
      updatedAt: new Date().toISOString(),
    };
    saveCustomMaps(customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m)));
    if (inspectingRack && inspectingRack.id === rackId) {
      const found = updatedRacks.find((r) => r.id === rackId);
      if (found) setInspectingRack(found);
    }
  }, [currentCustomMap, customMaps, inspectingRack, saveCustomMaps]);

  const handleRemoveDeviceFromRack = useCallback((rackId: string, deviceId: string) => {
    if (!currentCustomMap) return;
    const updatedRacks = (currentCustomMap.racks || []).map((r) => {
      if (r.id !== rackId) return r;
      return { ...r, devices: r.devices.filter((d) => d.id !== deviceId) };
    });

    const updatedMap: CustomTopologyMap = {
      ...currentCustomMap,
      racks: updatedRacks,
      updatedAt: new Date().toISOString(),
    };
    saveCustomMaps(customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m)));
    if (inspectingRack && inspectingRack.id === rackId) {
      const found = updatedRacks.find((r) => r.id === rackId);
      if (found) setInspectingRack(found);
    }
  }, [currentCustomMap, customMaps, inspectingRack, saveCustomMaps]);

  const handleOpenAddHardware = useCallback((rackId?: string, targetU?: number) => {
    setSelectedRackForHardware(rackId);
    setTargetUForHardware(targetU);
    setEditingHardwareDevice(null);
    setIsAddHardwareOpen(true);
  }, []);

  const handleEditDeviceNic = useCallback((device: MountedHardwareDevice, rack: CustomTopologyRack) => {
    setEditingHardwareDevice(device);
    setSelectedRackForHardware(rack.id);
    setTargetUForHardware(device.startU);
    setIsAddHardwareOpen(true);
  }, []);

  const handleEditDeviceSpecs = useCallback((device: MountedHardwareDevice, rack: CustomTopologyRack) => {
    setEditingHardwareDevice(device);
    setSelectedRackForHardware(rack.id);
    setTargetUForHardware(device.startU);
    setIsAddHardwareOpen(true);
  }, []);

  const handleMoveDeviceInRack = useCallback((rackId: string, deviceId: string, newStartU: number) => {
    if (!currentCustomMap) return;
    const updatedRacks = (currentCustomMap.racks || []).map((r) => {
      if (r.id !== rackId) return r;
      const devToMove = r.devices.find((d) => d.id === deviceId);
      if (!devToMove) return r;
      const endU = newStartU + devToMove.heightU - 1;
      if (newStartU < 1 || endU > r.units) return r;
      const hasCollision = r.devices.some((other) => {
        if (other.id === deviceId) return false;
        const oStart = other.startU;
        const oEnd = other.startU + other.heightU - 1;
        return Math.max(newStartU, oStart) <= Math.min(endU, oEnd);
      });
      if (hasCollision) return r;

      const newDevices = r.devices.map((d) => (d.id === deviceId ? { ...d, startU: newStartU } : d));
      return { ...r, devices: newDevices };
    });

    const updatedMap: CustomTopologyMap = {
      ...currentCustomMap,
      racks: updatedRacks,
      updatedAt: new Date().toISOString(),
    };
    saveCustomMaps(customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m)));
    if (inspectingRack && inspectingRack.id === rackId) {
      const found = updatedRacks.find((r) => r.id === rackId);
      if (found) setInspectingRack(found);
    }
  }, [currentCustomMap, customMaps, inspectingRack, saveCustomMaps]);

  const handleRackMouseDown = useCallback((e: React.MouseEvent, rackId: string) => {
    if (
      (e.target as HTMLElement).closest('button') ||
      (e.target as HTMLElement).closest('input') ||
      (e.target as HTMLElement).closest('select')
    ) {
      return;
    }
    e.stopPropagation();

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const worldMouseX = (e.clientX - rect.left - pan.x) / zoom;
    const worldMouseY = (e.clientY - rect.top - pan.y) / zoom;

    const currentRack = currentCustomMap?.racks?.find((r) => r.id === rackId);
    const currentPos = currentRack ? { x: currentRack.x, y: currentRack.y } : { x: 100, y: 100 };

    dragRackOffset.current = {
      offsetX: worldMouseX - currentPos.x,
      offsetY: worldMouseY - currentPos.y,
      startClientX: e.clientX,
      startClientY: e.clientY,
      moved: false,
    };

    setDraggingRackId(rackId);
  }, [pan.x, pan.y, zoom, currentCustomMap]);

  const handleSelectMap = (mapId: string) => {
    setActiveMapId(mapId);
    try {
      localStorage.setItem(ACTIVE_MAP_STORAGE_KEY, mapId);
    } catch (e) {}
    setActiveTool('select');
    setCableWorkflow({ step: 'idle', sourceDevice: null, sourcePort: null, targetDevice: null, targetPort: null });
  };

  // Local nodes state for instant optimistic updates and drag & drop in Physical view
  const [localNodes, setLocalNodes] = useState<TopologyNode[]>([]);

  useEffect(() => {
    if (topology?.nodes) {
      setLocalNodes(topology.nodes);
    }
  }, [topology?.nodes]);

  const allAvailableDevices: Device[] = useMemo(() => {
    const list: Device[] = [];
    const seen = new Set<string>();

    const add = (d: Device) => {
      if (d && !seen.has(d.id)) {
        seen.add(d.id);
        list.push(d);
      }
    };

    (topology?.nodes || []).forEach(add);
    (localNodes || []).forEach(add);
    (inventoryDevices || []).forEach(add);

    return list;
  }, [topology?.nodes, localNodes, inventoryDevices]);

  const getDeviceNameById = useCallback((id: string) => {
    const found = allAvailableDevices.find((d) => d.id === id);
    return found ? found.name : id;
  }, [allAvailableDevices]);

  const handleConfirmDeleteDevice = useCallback(
    (deviceId: string) => {
      handleRemoveDeviceFromCustomMap(deviceId);
      if (currentCustomMap && currentCustomMap.racks) {
        currentCustomMap.racks.forEach((r) => {
          if (r.devices?.some((d) => d.id === deviceId)) {
            handleRemoveDeviceFromRack(r.id, deviceId);
          }
        });
      }
      setDeleteModalTarget(null);
    },
    [currentCustomMap, handleRemoveDeviceFromCustomMap, handleRemoveDeviceFromRack]
  );

  // Helper to find or synthesize a Device instance from a MountedHardwareDevice for inventory modal & operations
  const resolveDeviceFromMounted = useCallback(
    (mountedDev: MountedHardwareDevice, rack?: CustomTopologyRack): Device => {
      const cleanId = mountedDev.id.replace(/^hw-/, '');
      const found = allAvailableDevices.find(
        (d) =>
          d.id === mountedDev.id ||
          d.id === cleanId ||
          d.name.toLowerCase() === mountedDev.name.toLowerCase() ||
          (mountedDev.ip && d.ip === mountedDev.ip)
      );
      if (found) return found;

      // Synthesize fallback Device object matching Network Equipment Inventory format
      const catStr = (mountedDev.category || '').toLowerCase();
      const devType: DeviceType = catStr.includes('router')
        ? 'router'
        : catStr.includes('ap') || catStr.includes('access_point') || catStr.includes('wireless')
        ? 'access_point'
        : 'switch';

      const brandLower = (mountedDev.brand || '').toLowerCase();
      const devPlatform: DevicePlatform = brandLower.includes('cisco')
        ? 'cisco_ios'
        : brandLower.includes('mikrotik')
        ? 'mikrotik_routeros'
        : 'generic_linux';

      const totalPorts = (mountedDev.networkCards || []).reduce((acc, card) => acc + (card.portCount || 0), 0) || 24;

      return {
        id: cleanId,
        name: mountedDev.name,
        ip: mountedDev.ip || '192.168.1.1',
        platform: devPlatform,
        connection_mode: 'ssh',
        type: devType,
        role: `${mountedDev.brand || ''} ${mountedDev.model || ''}`.trim() || 'Network Device',
        model: mountedDev.model || '',
        mac: '00:00:00:00:00:00',
        building: '',
        floor: '',
        unit: '',
        rack: rack?.name || '',
        total_ports: totalPorts,
        is_online: true,
        cdp_enabled: true,
        lldp_enabled: true,
        snmp_community: 'public',
      };
    },
    [allAvailableDevices]
  );

  const handleEditDeviceProperties = useCallback(
    (device: MountedHardwareDevice, rack: CustomTopologyRack) => {
      const resolved = resolveDeviceFromMounted(device, rack);
      setEditingInventoryDevice(resolved);
    },
    [resolveDeviceFromMounted]
  );

  const handleSaveInventoryDevice = useCallback(
    async (deviceId: string, updates: Partial<Device>) => {
      try {
        await updateDevice(deviceId, updates);
      } catch (err) {
        console.warn('Backend update failed, applying local state update', err);
      }

      // 1. Update in localNodes
      setLocalNodes((prev) =>
        prev.map((n) => (n.id === deviceId || n.id === `hw-${deviceId}` ? { ...n, ...updates } : n))
      );

      // 2. Update within any rack in currentCustomMap
      if (currentCustomMap && currentCustomMap.racks) {
        const updatedRacks = currentCustomMap.racks.map((r) => {
          const updatedDevices = (r.devices || []).map((d) => {
            if (d.id === deviceId || d.id === `hw-${deviceId}` || d.name === editingInventoryDevice?.name) {
              return {
                ...d,
                name: updates.name || d.name,
                model: updates.model || d.model,
                ip: updates.ip || d.ip,
              };
            }
            return d;
          });
          return { ...r, devices: updatedDevices };
        });

        const updatedMap: CustomTopologyMap = {
          ...currentCustomMap,
          racks: updatedRacks,
          updatedAt: new Date().toISOString(),
        };
        saveCustomMaps(customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m)));
      }

      setEditingInventoryDevice(null);
      if (onRefresh) onRefresh();
    },
    [currentCustomMap, customMaps, editingInventoryDevice, onRefresh, saveCustomMaps]
  );

  const handleConnectTerminalFromRack = useCallback(
    (dev: MountedHardwareDevice, rack: CustomTopologyRack) => {
      if (onConnectTerminal) {
        const resolved = resolveDeviceFromMounted(dev, rack);
        onConnectTerminal(resolved);
      }
    },
    [onConnectTerminal, resolveDeviceFromMounted]
  );

  const handleInspectPortsFromRack = useCallback(
    (dev: MountedHardwareDevice, rack: CustomTopologyRack) => {
      if (onInspectPorts) {
        const resolved = resolveDeviceFromMounted(dev, rack);
        onInspectPorts(resolved);
      }
    },
    [onInspectPorts, resolveDeviceFromMounted]
  );

  const handlePromptRemoveHardwareDevice = useCallback((device: MountedHardwareDevice) => {
    setDeleteModalTarget({
      type: 'device',
      id: device.id,
      name: device.name,
      ip: device.ip,
      model: device.model,
    });
  }, []);

  // Group links by pair of connected devices to separate overlapping cables
  const defaultLinkGroups = useMemo(() => {
    const map = new Map<string, typeof topology.links>();
    if (!topology?.links) return map;
    for (const link of topology.links) {
      const pairKey = [link.source, link.target].sort().join('___');
      if (!map.has(pairKey)) {
        map.set(pairKey, []);
      }
      map.get(pairKey)!.push(link);
    }
    return map;
  }, [topology?.links]);

  const customLinkGroups = useMemo(() => {
    const map = new Map<string, CustomTopologyLink[]>();
    if (!currentCustomMap?.links) return map;
    for (const link of currentCustomMap.links) {
      const pairKey = [link.sourceDeviceId, link.targetDeviceId].sort().join('___');
      if (!map.has(pairKey)) {
        map.set(pairKey, []);
      }
      map.get(pairKey)!.push(link);
    }
    return map;
  }, [currentCustomMap?.links]);

  const handleCreateCustomMap = (name: string, description?: string) => {
    const newMap: CustomTopologyMap = {
      id: `custom-map-${Date.now()}`,
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deviceIds: [],
      devicePositions: {},
      links: [],
    };
    const newMaps = [...customMaps, newMap];
    saveCustomMaps(newMaps);
    setActiveMapId(newMap.id);
    setActiveTool('select');
  };

  const handleUpdateCustomMap = (id: string, name: string, description?: string) => {
    const updatedMaps = customMaps.map((m) =>
      m.id === id ? { ...m, name, description, updatedAt: new Date().toISOString() } : m
    );
    saveCustomMaps(updatedMaps);
  };

  const handleDeleteCustomMap = (id: string) => {
    const updatedMaps = customMaps.filter((m) => m.id !== id);
    saveCustomMaps(updatedMaps);
    setActiveMapId('default');
  };

  const handleAddDeviceToCustomMap = (
    device: Device,
    mode: DeviceCanvasDisplayMode = 'card',
    targetRackId?: string
  ) => {
    if (!currentCustomMap) return;
    if (currentCustomMap.deviceIds.includes(device.id)) return;

    const existingCount = currentCustomMap.deviceIds.length;
    const col = existingCount % 3;
    const row = Math.floor(existingCount / 3);
    const newPos = {
      x: 180 + col * 300,
      y: 160 + row * 220,
    };

    let updatedRacks = currentCustomMap.racks || [];
    if (targetRackId && mode === 'physical') {
      const targetRack = updatedRacks.find((r) => r.id === targetRackId);
      if (targetRack) {
        const hwDevice = convertNodeToHardwareDevice(device);
        let freeU = 1;
        for (let u = 1; u <= targetRack.units - hwDevice.heightU + 1; u++) {
          const endU = u + hwDevice.heightU - 1;
          const occupied = targetRack.devices.some((d) => {
            const dEnd = d.startU + d.heightU - 1;
            return Math.max(u, d.startU) <= Math.min(endU, dEnd);
          });
          if (!occupied) {
            freeU = u;
            break;
          }
        }
        hwDevice.startU = freeU;
        updatedRacks = updatedRacks.map((r) =>
          r.id === targetRackId ? { ...r, devices: [...r.devices, hwDevice] } : r
        );
      }
    }

    const updatedMap: CustomTopologyMap = {
      ...currentCustomMap,
      deviceIds: [...currentCustomMap.deviceIds, device.id],
      devicePositions: {
        ...currentCustomMap.devicePositions,
        [device.id]: newPos,
      },
      deviceDisplayModes: {
        ...(currentCustomMap.deviceDisplayModes || {}),
        [device.id]: mode,
      },
      racks: updatedRacks,
      updatedAt: new Date().toISOString(),
    };

    const newMaps = customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m));
    saveCustomMaps(newMaps);
  };

  const handleNodeClick = (nodeId: string) => {
    const node = allAvailableDevices.find((d) => d.id === nodeId);
    if (!node) return;

    if (activeMapId !== 'default' && activeTool === 'cable') {
      if (!cableWorkflow.sourceDevice) {
        // Step 1: select source device
        setCableWorkflow((prev) => ({
          ...prev,
          sourceDevice: node,
          step: 'select_source_port',
        }));
        setIsPortSelectorOpen(true);
      } else if (cableWorkflow.sourceDevice && cableWorkflow.sourcePort) {
        // Step 2: select destination device
        setCableWorkflow((prev) => ({
          ...prev,
          targetDevice: node,
          step: 'select_target_port',
        }));
        setIsPortSelectorOpen(true);
      }
    } else {
      setSelectedNodeId(nodeId);
    }
  };

  const handleStartCableFromDevice = (e: React.MouseEvent, node: Device) => {
    e.stopPropagation();
    setActiveTool('cable');
    setCableWorkflow({
      step: 'select_source_port',
      sourceDevice: node,
      sourcePort: null,
      targetDevice: null,
      targetPort: null,
    });
    setIsPortSelectorOpen(true);
  };

  const handleSelectPort = (portName: string, portData?: SwitchPort) => {
    if (cableWorkflow.step === 'select_source_port' && cableWorkflow.sourceDevice) {
      setCableWorkflow((prev) => ({
        ...prev,
        sourcePort: portName,
        sourceInitialPortData: portData,
        step: 'select_target_device',
      }));
      setIsPortSelectorOpen(false);
    } else if (cableWorkflow.step === 'select_target_port' && cableWorkflow.targetDevice) {
      setCableWorkflow((prev) => ({
        ...prev,
        targetPort: portName,
        targetInitialPortData: portData,
        step: 'configure_link',
      }));
      setIsPortSelectorOpen(false);
      setIsLinkConfigOpen(true);
    }
  };

  const handleSaveCustomLink = (linkData: Omit<CustomTopologyLink, 'id'>) => {
    if (!currentCustomMap) return;

    if (cableWorkflow.editingLink) {
      const updatedLinks = currentCustomMap.links.map((l) =>
        l.id === cableWorkflow.editingLink!.id ? { ...linkData, id: l.id } : l
      );
      const updatedMap: CustomTopologyMap = {
        ...currentCustomMap,
        links: updatedLinks,
        updatedAt: new Date().toISOString(),
      };
      const newMaps = customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m));
      saveCustomMaps(newMaps);
    } else {
      const newLink: CustomTopologyLink = {
        ...linkData,
        id: `custom-link-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      };
      const updatedMap: CustomTopologyMap = {
        ...currentCustomMap,
        links: [...(currentCustomMap.links || []), newLink],
        updatedAt: new Date().toISOString(),
      };
      const newMaps = customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m));
      saveCustomMaps(newMaps);
    }

    setIsLinkConfigOpen(false);
    setCableWorkflow({
      step: 'idle',
      sourceDevice: null,
      sourcePort: null,
      targetDevice: null,
      targetPort: null,
      editingLink: null,
    });
  };

  const handleDeleteCustomLink = () => {
    if (!currentCustomMap || !cableWorkflow.editingLink) return;
    const updatedLinks = currentCustomMap.links.filter((l) => l.id !== cableWorkflow.editingLink!.id);
    const updatedMap: CustomTopologyMap = {
      ...currentCustomMap,
      links: updatedLinks,
      updatedAt: new Date().toISOString(),
    };
    const newMaps = customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m));
    saveCustomMaps(newMaps);
    setIsLinkConfigOpen(false);
    setCableWorkflow({
      step: 'idle',
      sourceDevice: null,
      sourcePort: null,
      targetDevice: null,
      targetPort: null,
      editingLink: null,
    });
  };

  const handleDeleteLinkDirectly = (linkId: string) => {
    if (!currentCustomMap) return;
    const updatedLinks = currentCustomMap.links.filter((l) => l.id !== linkId);
    const updatedMap: CustomTopologyMap = {
      ...currentCustomMap,
      links: updatedLinks,
      updatedAt: new Date().toISOString(),
    };
    const newMaps = customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m));
    saveCustomMaps(newMaps);
  };

  const handleEditExistingLink = (link: CustomTopologyLink) => {
    const src = allAvailableDevices.find((d) => d.id === link.sourceDeviceId);
    const tgt = allAvailableDevices.find((d) => d.id === link.targetDeviceId);
    if (!src || !tgt) return;

    setCableWorkflow({
      step: 'configure_link',
      sourceDevice: src,
      sourcePort: link.sourcePort,
      targetDevice: tgt,
      targetPort: link.targetPort,
      editingLink: link,
    });
    setIsLinkConfigOpen(true);
  };

  const handleClearAllCustomLinks = () => {
    if (!currentCustomMap) return;
    const isConfirmed = window.confirm(
      isEn
        ? `Clear all cable links in map "${currentCustomMap.name}"?`
        : `آیا مایلید تمام کابل‌های نقشه «${currentCustomMap.name}» پاک شوند؟`
    );
    if (!isConfirmed) return;

    const updatedMap: CustomTopologyMap = {
      ...currentCustomMap,
      links: [],
      updatedAt: new Date().toISOString(),
    };
    const newMaps = customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m));
    saveCustomMaps(newMaps);
  };

  // Storage key for custom physical hierarchy persistence
  const HIERARCHY_STORAGE_KEY = 'nettopology_physical_hierarchy_v2';

  // Custom added buildings, floors, units, and racks with localStorage initialization
  const [customBuildings, setCustomBuildings] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(HIERARCHY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.buildings)) return parsed.buildings;
      }
    } catch (e) {}
    return [];
  });

  const [customFloors, setCustomFloors] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(HIERARCHY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.floors && typeof parsed.floors === 'object') return parsed.floors;
      }
    } catch (e) {}
    return {};
  });

  const [customUnits, setCustomUnits] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(HIERARCHY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.units && typeof parsed.units === 'object') return parsed.units;
      }
    } catch (e) {}
    return {};
  });

  const [customRacks, setCustomRacks] = useState<Record<string, string[]>>(() => {
    try {
      const saved = localStorage.getItem(HIERARCHY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.racks && typeof parsed.racks === 'object') return parsed.racks;
      }
    } catch (e) {}
    return {};
  });

  // Helper to persist hierarchy state in localStorage
  const saveHierarchyState = (
    buildings: string[],
    floors: Record<string, string[]>,
    units: Record<string, string[]>,
    racks: Record<string, string[]>
  ) => {
    try {
      localStorage.setItem(
        HIERARCHY_STORAGE_KEY,
        JSON.stringify({
          buildings,
          floors,
          units,
          racks,
        })
      );
      window.dispatchEvent(new CustomEvent('nettopology_hierarchy_updated'));
    } catch (e) {}
  };

  // Keep hierarchy in sync if modified from AddDeviceModal or other views
  useEffect(() => {
    const handleHierarchyUpdate = () => {
      try {
        const saved = localStorage.getItem(HIERARCHY_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.buildings)) setCustomBuildings(parsed.buildings);
          if (parsed.floors && typeof parsed.floors === 'object') setCustomFloors(parsed.floors);
          if (parsed.units && typeof parsed.units === 'object') setCustomUnits(parsed.units);
          if (parsed.racks && typeof parsed.racks === 'object') setCustomRacks(parsed.racks);
        }
      } catch (e) {}
    };

    window.addEventListener('nettopology_hierarchy_updated', handleHierarchyUpdate);
    window.addEventListener('storage', handleHierarchyUpdate);
    return () => {
      window.removeEventListener('nettopology_hierarchy_updated', handleHierarchyUpdate);
      window.removeEventListener('storage', handleHierarchyUpdate);
    };
  }, []);

  // Drag and drop states for Physical view
  const [draggedDevice, setDraggedDevice] = useState<{
    id: string;
    name: string;
    type: string;
    fromBuilding: string;
    fromFloor: string;
    fromUnit?: string;
    fromRack?: string;
  } | null>(null);

  const [dragOverTarget, setDragOverTarget] = useState<{
    building: string;
    floor: string;
    unit?: string;
    rack?: string;
  } | null>(null);

  const [movingDeviceId, setMovingDeviceId] = useState<string | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Modals for adding floor/building, unit/rack, rename, delete, and manual relocation
  const [addFloorBuilding, setAddFloorBuilding] = useState<string | null>(null);
  const [newFloorInput, setNewFloorInput] = useState('');
  const [showAddBuildingModal, setShowAddBuildingModal] = useState(false);
  const [newBuildingInput, setNewBuildingInput] = useState('');

  const [addUnitModal, setAddUnitModal] = useState<{ building: string; floor: string } | null>(null);
  const [newUnitInput, setNewUnitInput] = useState('');

  const [addRackModal, setAddRackModal] = useState<{ building: string; floor: string } | null>(null);
  const [newRackInput, setNewRackInput] = useState('');

  const [renameModal, setRenameModal] = useState<{
    type: 'building' | 'floor' | 'unit' | 'rack';
    building: string;
    floor?: string;
    item?: string;
    currentName: string;
    newName: string;
  } | null>(null);

  const [deleteModal, setDeleteModal] = useState<{
    type: 'building' | 'floor' | 'unit' | 'rack';
    building: string;
    floor?: string;
    item?: string;
    deviceCount: number;
  } | null>(null);

  const [relocateDevice, setRelocateDevice] = useState<TopologyNode | null>(null);
  const [relocateTargetBuilding, setRelocateTargetBuilding] = useState('');
  const [relocateTargetFloor, setRelocateTargetFloor] = useState('');
  const [relocateTargetUnit, setRelocateTargetUnit] = useState('');
  const [relocateTargetRack, setRelocateTargetRack] = useState('');
  const [customRelocateBuilding, setCustomRelocateBuilding] = useState('');
  const [customRelocateFloor, setCustomRelocateFloor] = useState('');
  const [customRelocateUnit, setCustomRelocateUnit] = useState('');
  const [customRelocateRack, setCustomRelocateRack] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  const handleMoveDevice = async (
    deviceId: string,
    targetBuilding: string,
    targetFloor: string,
    targetUnit?: string,
    targetRack?: string
  ) => {
    const dev = localNodes.find((n) => n.id === deviceId);
    if (!dev) return;

    const trimmedBuilding = targetBuilding.trim();
    const trimmedFloor = targetFloor.trim();
    const trimmedUnit = targetUnit !== undefined ? targetUnit.trim() : (dev.unit || '');
    const trimmedRack = targetRack !== undefined ? targetRack.trim() : (dev.rack || '');

    if (!trimmedBuilding || !trimmedFloor) return;

    const currentBuilding = dev.building || (isEn ? 'Other Buildings' : 'سایر ساختمان‌ها');
    const currentFloor = dev.floor || (isEn ? 'Unassigned Floor' : 'طبقه نامشخص');
    const currentUnit = dev.unit || '';
    const currentRack = dev.rack || '';

    if (
      currentBuilding === trimmedBuilding &&
      currentFloor === trimmedFloor &&
      currentUnit === trimmedUnit &&
      currentRack === trimmedRack
    ) {
      setFeedbackToast({
        type: 'info',
        message: isEn
          ? `Device "${dev.name}" is already situated here.`
          : `تجهیز «${dev.name}» هم‌اکنون در همین موقعیت مستقر است.`,
      });
      setTimeout(() => setFeedbackToast(null), 3500);
      return;
    }

    // Optimistic UI update
    const previousNodes = [...localNodes];
    setLocalNodes((prev) =>
      prev.map((n) =>
        n.id === deviceId
          ? {
              ...n,
              building: trimmedBuilding,
              floor: trimmedFloor,
              unit: trimmedUnit,
              rack: trimmedRack,
            }
          : n
      )
    );
    setMovingDeviceId(deviceId);

    try {
      await updateDevice(deviceId, {
        building: trimmedBuilding,
        floor: trimmedFloor,
        unit: trimmedUnit,
        rack: trimmedRack,
      });

      setFeedbackToast({
        type: 'success',
        message: t('topology_physical_move_success', {
          name: dev.name,
          building: trimmedBuilding,
          floor: trimmedFloor,
        }),
      });
      setTimeout(() => setFeedbackToast(null), 4500);

      // Trigger global refresh to sync all views across the application
      onRefresh();
    } catch (err: any) {
      // Rollback optimistic update on failure
      setLocalNodes(previousNodes);
      setFeedbackToast({
        type: 'error',
        message: t('topology_physical_move_error', {
          error: err?.message || 'Failed to update device placement',
        }),
      });
      setTimeout(() => setFeedbackToast(null), 5000);
    } finally {
      setMovingDeviceId(null);
      setDraggedDevice(null);
      setDragOverTarget(null);
    }
  };

  const handleAddFloor = (building: string) => {
    const floorName = newFloorInput.trim();
    if (!floorName) return;
    const updatedFloors = {
      ...customFloors,
      [building]: Array.from(new Set([...(customFloors[building] || []), floorName])),
    };
    setCustomFloors(updatedFloors);
    saveHierarchyState(customBuildings, updatedFloors, customUnits, customRacks);
    setAddFloorBuilding(null);
    setNewFloorInput('');
    setFeedbackToast({
      type: 'success',
      message: isEn ? `Floor "${floorName}" added` : `طبقه «${floorName}» اضافه شد`,
    });
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleAddBuilding = () => {
    const bldgName = newBuildingInput.trim();
    if (!bldgName) return;
    const updatedBuildings = Array.from(new Set([...customBuildings, bldgName]));
    const defaultFloor = isEn ? 'Floor 1' : 'طبقه ۱';
    const updatedFloors = {
      ...customFloors,
      [bldgName]: Array.from(new Set([...(customFloors[bldgName] || []), defaultFloor])),
    };
    setCustomBuildings(updatedBuildings);
    setCustomFloors(updatedFloors);
    saveHierarchyState(updatedBuildings, updatedFloors, customUnits, customRacks);
    setShowAddBuildingModal(false);
    setNewBuildingInput('');
    setFeedbackToast({
      type: 'success',
      message: isEn ? `Building "${bldgName}" created` : `ساختمان «${bldgName}» ایجاد شد`,
    });
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleAddUnit = (building: string, floor: string, customInput?: string) => {
    const unitName = (customInput !== undefined ? customInput : newUnitInput).trim();
    if (!unitName) return;
    const key = `${building}:::${floor}`;
    const updatedUnits = {
      ...customUnits,
      [key]: Array.from(new Set([...(customUnits[key] || []), unitName])),
    };
    setCustomUnits(updatedUnits);
    saveHierarchyState(customBuildings, customFloors, updatedUnits, customRacks);
    setAddUnitModal(null);
    setNewUnitInput('');
    setFeedbackToast({
      type: 'success',
      message: isEn ? `Unit "${unitName}" created` : `واحد «${unitName}» ایجاد شد`,
    });
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleAddRack = (building: string, floor: string, customInput?: string) => {
    const rackName = (customInput !== undefined ? customInput : newRackInput).trim();
    if (!rackName) return;
    const key = `${building}:::${floor}`;
    const updatedRacks = {
      ...customRacks,
      [key]: Array.from(new Set([...(customRacks[key] || []), rackName])),
    };
    setCustomRacks(updatedRacks);
    saveHierarchyState(customBuildings, customFloors, customUnits, updatedRacks);
    setAddRackModal(null);
    setNewRackInput('');
    setFeedbackToast({
      type: 'success',
      message: isEn ? `Rack "${rackName}" created` : `رک «${rackName}» ایجاد شد`,
    });
    setTimeout(() => setFeedbackToast(null), 3000);
  };

  const handleRenameSubmit = async () => {
    if (!renameModal) return;
    const { type, building, floor, currentName, newName } = renameModal;
    const trimmed = newName.trim();
    if (!trimmed || trimmed === currentName) {
      setRenameModal(null);
      return;
    }

    let updatedBuildings = [...customBuildings];
    let updatedFloors = { ...customFloors };
    let updatedUnits = { ...customUnits };
    let updatedRacks = { ...customRacks };

    if (type === 'building') {
      const affectedDevices = localNodes.filter((n) => n.building === currentName);
      setLocalNodes((prev) =>
        prev.map((n) => (n.building === currentName ? { ...n, building: trimmed } : n))
      );
      for (const dev of affectedDevices) {
        try {
          await updateDevice(dev.id, { building: trimmed });
        } catch (err) {}
      }

      updatedBuildings = updatedBuildings.map((b) => (b === currentName ? trimmed : b));
      if (updatedFloors[currentName]) {
        updatedFloors[trimmed] = updatedFloors[currentName];
        delete updatedFloors[currentName];
      }

      const newUnitsObj: Record<string, string[]> = {};
      Object.entries(updatedUnits).forEach(([k, v]) => {
        if (k.startsWith(`${currentName}:::`)) {
          const rest = k.slice(`${currentName}:::`.length);
          newUnitsObj[`${trimmed}:::${rest}`] = v as string[];
        } else {
          newUnitsObj[k] = v as string[];
        }
      });
      updatedUnits = newUnitsObj;

      const newRacksObj: Record<string, string[]> = {};
      Object.entries(updatedRacks).forEach(([k, v]) => {
        if (k.startsWith(`${currentName}:::`)) {
          const rest = k.slice(`${currentName}:::`.length);
          newRacksObj[`${trimmed}:::${rest}`] = v as string[];
        } else {
          newRacksObj[k] = v as string[];
        }
      });
      updatedRacks = newRacksObj;
    } else if (type === 'floor') {
      const affectedDevices = localNodes.filter(
        (n) => n.building === building && n.floor === currentName
      );
      setLocalNodes((prev) =>
        prev.map((n) =>
          n.building === building && n.floor === currentName ? { ...n, floor: trimmed } : n
        )
      );
      for (const dev of affectedDevices) {
        try {
          await updateDevice(dev.id, { floor: trimmed });
        } catch (err) {}
      }

      if (updatedFloors[building]) {
        updatedFloors[building] = updatedFloors[building].map((f) =>
          f === currentName ? trimmed : f
        );
      }
      const oldKey = `${building}:::${currentName}`;
      const newKey = `${building}:::${trimmed}`;
      if (updatedUnits[oldKey]) {
        updatedUnits[newKey] = updatedUnits[oldKey];
        delete updatedUnits[oldKey];
      }
      if (updatedRacks[oldKey]) {
        updatedRacks[newKey] = updatedRacks[oldKey];
        delete updatedRacks[oldKey];
      }
    } else if (type === 'unit' && floor) {
      const affectedDevices = localNodes.filter(
        (n) => n.building === building && n.floor === floor && n.unit === currentName
      );
      setLocalNodes((prev) =>
        prev.map((n) =>
          n.building === building && n.floor === floor && n.unit === currentName
            ? { ...n, unit: trimmed }
            : n
        )
      );
      for (const dev of affectedDevices) {
        try {
          await updateDevice(dev.id, { unit: trimmed });
        } catch (err) {}
      }

      const key = `${building}:::${floor}`;
      if (updatedUnits[key]) {
        updatedUnits[key] = updatedUnits[key].map((u) => (u === currentName ? trimmed : u));
      }
    } else if (type === 'rack' && floor) {
      const affectedDevices = localNodes.filter(
        (n) => n.building === building && n.floor === floor && n.rack === currentName
      );
      setLocalNodes((prev) =>
        prev.map((n) =>
          n.building === building && n.floor === floor && n.rack === currentName
            ? { ...n, rack: trimmed }
            : n
        )
      );
      for (const dev of affectedDevices) {
        try {
          await updateDevice(dev.id, { rack: trimmed });
        } catch (err) {}
      }

      const key = `${building}:::${floor}`;
      if (updatedRacks[key]) {
        updatedRacks[key] = updatedRacks[key].map((r) => (r === currentName ? trimmed : r));
      }
    }

    setCustomBuildings(updatedBuildings);
    setCustomFloors(updatedFloors);
    setCustomUnits(updatedUnits);
    setCustomRacks(updatedRacks);
    saveHierarchyState(updatedBuildings, updatedFloors, updatedUnits, updatedRacks);
    setRenameModal(null);
    setFeedbackToast({
      type: 'success',
      message: isEn ? `Renamed to "${trimmed}"` : `نام به «${trimmed}» تغییر یافت`,
    });
    setTimeout(() => setFeedbackToast(null), 3000);
    onRefresh();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal) return;
    const { type, building, floor, item } = deleteModal;

    let updatedBuildings = [...customBuildings];
    let updatedFloors = { ...customFloors };
    let updatedUnits = { ...customUnits };
    let updatedRacks = { ...customRacks };

    if (type === 'building') {
      const affectedDevices = localNodes.filter((n) => n.building === building);
      setLocalNodes((prev) =>
        prev.map((n) => (n.building === building ? { ...n, building: '' } : n))
      );
      for (const dev of affectedDevices) {
        try {
          await updateDevice(dev.id, { building: '' });
        } catch (err) {}
      }
      updatedBuildings = updatedBuildings.filter((b) => b !== building);
      delete updatedFloors[building];
      const newUnits: Record<string, string[]> = {};
      Object.entries(updatedUnits).forEach(([k, v]) => {
        if (!k.startsWith(`${building}:::`)) newUnits[k] = v as string[];
      });
      updatedUnits = newUnits;
      const newRacks: Record<string, string[]> = {};
      Object.entries(updatedRacks).forEach(([k, v]) => {
        if (!k.startsWith(`${building}:::`)) newRacks[k] = v as string[];
      });
      updatedRacks = newRacks;
    } else if (type === 'floor' && item) {
      const affectedDevices = localNodes.filter(
        (n) => n.building === building && n.floor === item
      );
      setLocalNodes((prev) =>
        prev.map((n) =>
          n.building === building && n.floor === item ? { ...n, floor: '' } : n
        )
      );
      for (const dev of affectedDevices) {
        try {
          await updateDevice(dev.id, { floor: '' });
        } catch (err) {}
      }
      if (updatedFloors[building]) {
        updatedFloors[building] = updatedFloors[building].filter((f) => f !== item);
      }
      delete updatedUnits[`${building}:::${item}`];
      delete updatedRacks[`${building}:::${item}`];
    } else if (type === 'unit' && floor && item) {
      const affectedDevices = localNodes.filter(
        (n) => n.building === building && n.floor === floor && n.unit === item
      );
      setLocalNodes((prev) =>
        prev.map((n) =>
          n.building === building && n.floor === floor && n.unit === item
            ? { ...n, unit: '' }
            : n
        )
      );
      for (const dev of affectedDevices) {
        try {
          await updateDevice(dev.id, { unit: '' });
        } catch (err) {}
      }
      const key = `${building}:::${floor}`;
      if (updatedUnits[key]) {
        updatedUnits[key] = updatedUnits[key].filter((u) => u !== item);
      }
    } else if (type === 'rack' && floor && item) {
      const affectedDevices = localNodes.filter(
        (n) => n.building === building && n.floor === floor && n.rack === item
      );
      setLocalNodes((prev) =>
        prev.map((n) =>
          n.building === building && n.floor === floor && n.rack === item
            ? { ...n, rack: '' }
            : n
        )
      );
      for (const dev of affectedDevices) {
        try {
          await updateDevice(dev.id, { rack: '' });
        } catch (err) {}
      }
      const key = `${building}:::${floor}`;
      if (updatedRacks[key]) {
        updatedRacks[key] = updatedRacks[key].filter((r) => r !== item);
      }
    }

    setCustomBuildings(updatedBuildings);
    setCustomFloors(updatedFloors);
    setCustomUnits(updatedUnits);
    setCustomRacks(updatedRacks);
    saveHierarchyState(updatedBuildings, updatedFloors, updatedUnits, updatedRacks);
    setDeleteModal(null);
    setFeedbackToast({
      type: 'success',
      message: isEn ? 'Item deleted successfully' : 'مکان فیزیکی با موفقیت حذف شد',
    });
    setTimeout(() => setFeedbackToast(null), 3000);
    onRefresh();
  };

  // Toggle Full Mode (Hides header, sidebar, top menu, and maximizes map to full browser viewport)
  const toggleFullMode = useCallback(() => {
    if (onToggleFullMode) {
      onToggleFullMode();
    } else {
      setInternalFullMode((prev) => {
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
    }
  }, [onToggleFullMode]);

  // Listen for Escape key and browser fullscreen change events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullMode) {
        if (onToggleFullMode) {
          onToggleFullMode();
        } else {
          setInternalFullMode(false);
        }
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullMode) {
        if (onToggleFullMode) {
          onToggleFullMode();
        } else {
          setInternalFullMode(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullMode, onToggleFullMode]);

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
    if (window.confirm(t('topology_reset_layout_confirm'))) {
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
    const pos = new Map<string, { x: number; y: number }>();

    if (activeMapId !== 'default' && currentCustomMap) {
      // In Custom Map mode
      const mapDeviceIds = currentCustomMap.deviceIds || [];

      mapDeviceIds.forEach((id, index) => {
        if (currentCustomMap.devicePositions && currentCustomMap.devicePositions[id]) {
          pos.set(id, currentCustomMap.devicePositions[id]);
        } else {
          pos.set(id, {
            x: 180 + (index % 4) * 280,
            y: 180 + Math.floor(index / 4) * 220,
          });
        }
      });

      // Apply any temporary customPositions while dragging
      Object.entries(customPositions).forEach(([id, customPos]) => {
        const posObj = customPos as { x: number; y: number } | undefined;
        if (posObj && typeof posObj.x === 'number' && typeof posObj.y === 'number') {
          pos.set(id, posObj);
        }
      });

      return pos;
    }

    if (!topology || !topology.nodes) return pos;

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
  }, [topology, customPositions, activeMapId, currentCustomMap]);

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

      // 1.5 Handling Rack Drag
      if (draggingRackId && containerRef.current && currentCustomMap) {
        const dist = Math.hypot(
          e.clientX - dragRackOffset.current.startClientX,
          e.clientY - dragRackOffset.current.startClientY
        );
        if (dist > 3) {
          dragRackOffset.current.moved = true;
        }

        const rect = containerRef.current.getBoundingClientRect();
        const worldMouseX = (e.clientX - rect.left - pan.x) / zoom;
        const worldMouseY = (e.clientY - rect.top - pan.y) / zoom;

        const newX = Math.round(worldMouseX - dragRackOffset.current.offsetX);
        const newY = Math.round(worldMouseY - dragRackOffset.current.offsetY);

        const updatedRacks = (currentCustomMap.racks || []).map((r) =>
          r.id === draggingRackId ? { ...r, x: newX, y: newY } : r
        );
        const updatedMap: CustomTopologyMap = {
          ...currentCustomMap,
          racks: updatedRacks,
          updatedAt: new Date().toISOString(),
        };
        setCustomMaps((prev) => prev.map((m) => (m.id === updatedMap.id ? updatedMap : m)));
        return;
      }

      // 1.8 Handling Sticky Note Drag
      if (draggingNoteId && containerRef.current && currentCustomMap) {
        const dist = Math.hypot(
          e.clientX - dragNoteOffset.current.startClientX,
          e.clientY - dragNoteOffset.current.startClientY
        );
        if (dist > 3) {
          dragNoteOffset.current.moved = true;
        }

        const rect = containerRef.current.getBoundingClientRect();
        const worldMouseX = (e.clientX - rect.left - pan.x) / zoom;
        const worldMouseY = (e.clientY - rect.top - pan.y) / zoom;

        const newX = Math.round(worldMouseX - dragNoteOffset.current.offsetX);
        const newY = Math.round(worldMouseY - dragNoteOffset.current.offsetY);

        const updatedNotes = (currentCustomMap.stickyNotes || []).map((n) =>
          n.id === draggingNoteId ? { ...n, x: newX, y: newY } : n
        );
        const updatedMap: CustomTopologyMap = {
          ...currentCustomMap,
          stickyNotes: updatedNotes,
          updatedAt: new Date().toISOString(),
        };
        setCustomMaps((prev) => prev.map((m) => (m.id === updatedMap.id ? updatedMap : m)));
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
          if (activeMapId !== 'default' && currentCustomMap) {
            const latestPos = customPositions[draggingNodeId] || nodePositions.get(draggingNodeId) || { x: 100, y: 100 };
            const updatedMap: CustomTopologyMap = {
              ...currentCustomMap,
              devicePositions: {
                ...currentCustomMap.devicePositions,
                [draggingNodeId]: latestPos,
              },
              updatedAt: new Date().toISOString(),
            };
            const newMaps = customMaps.map((m) => (m.id === updatedMap.id ? updatedMap : m));
            saveCustomMaps(newMaps);
          } else {
            // Persist the updated positions on drop
            setCustomPositions((latest) => {
              saveNodePositions(latest);
              return latest;
            });
          }
        } else {
          // It was a click without significant drag
          handleNodeClick(draggingNodeId);
        }
        setDraggingNodeId(null);
      }

      if (draggingRackId) {
        if (dragRackOffset.current.moved && currentCustomMap) {
          saveCustomMaps(customMaps);
        }
        setDraggingRackId(null);
      }

      if (draggingNoteId) {
        if (dragNoteOffset.current.moved && currentCustomMap) {
          saveCustomMaps(customMaps);
        }
        setDraggingNoteId(null);
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
  }, [draggingNodeId, draggingRackId, draggingNoteId, isPanning, panStart, pan, zoom, currentCustomMap, customMaps, saveCustomMaps, saveNodePositions, saveViewport]);

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
    const allAvailable = topology?.nodes || localNodes || [];
    const baseList =
      activeMapId !== 'default' && currentCustomMap
        ? allAvailable.filter((n) => currentCustomMap.deviceIds.includes(n.id))
        : allAvailable;

    return baseList.filter((n) => {
      if (filterBuilding !== 'all' && n.building !== filterBuilding) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          n.name.toLowerCase().includes(q) ||
          n.ip.toLowerCase().includes(q) ||
          (n.building && n.building.toLowerCase().includes(q)) ||
          (n.floor && n.floor.toLowerCase().includes(q)) ||
          (n.unit && n.unit.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [topology, localNodes, activeMapId, currentCustomMap, filterBuilding, searchQuery]);

  // Grouped hierarchy for Physical View
  const physicalHierarchy = useMemo(() => {
    interface FloorHierarchyData {
      allDevices: TopologyNode[];
      units: Record<string, TopologyNode[]>;
      racks: Record<string, TopologyNode[]>;
      general: TopologyNode[];
    }

    const groups: Record<string, Record<string, FloorHierarchyData>> = {};

    const ensureFloor = (b: string, f: string): FloorHierarchyData => {
      if (!groups[b]) groups[b] = {};
      if (!groups[b][f]) {
        groups[b][f] = {
          allDevices: [],
          units: {},
          racks: {},
          general: [],
        };
      }
      return groups[b][f];
    };

    // 1. Prepopulate custom added buildings
    customBuildings.forEach((b) => {
      if (!groups[b]) groups[b] = {};
    });

    // 2. Prepopulate custom added floors
    Object.entries(customFloors).forEach(([b, floors]) => {
      (floors as string[]).forEach((f) => {
        ensureFloor(b, f);
      });
    });

    // 3. Prepopulate custom added units
    Object.entries(customUnits).forEach(([key, unitList]) => {
      const [b, f] = key.split(':::');
      if (b && f) {
        const floorData = ensureFloor(b, f);
        (unitList as string[]).forEach((u) => {
          if (!floorData.units[u]) floorData.units[u] = [];
        });
      }
    });

    // 4. Prepopulate custom added racks
    Object.entries(customRacks).forEach(([key, rackList]) => {
      const [b, f] = key.split(':::');
      if (b && f) {
        const floorData = ensureFloor(b, f);
        (rackList as string[]).forEach((r) => {
          if (!floorData.racks[r]) floorData.racks[r] = [];
        });
      }
    });

    // 5. Populate from localNodes
    localNodes.forEach((d) => {
      const b = d.building || (isEn ? 'Other Buildings' : 'سایر ساختمان‌ها');
      const f = d.floor || (isEn ? 'Unassigned Floor' : 'طبقه نامشخص');
      const floorData = ensureFloor(b, f);
      floorData.allDevices.push(d);

      if (d.unit) {
        if (!floorData.units[d.unit]) floorData.units[d.unit] = [];
        floorData.units[d.unit].push(d);
      } else if (d.rack) {
        if (!floorData.racks[d.rack]) floorData.racks[d.rack] = [];
        floorData.racks[d.rack].push(d);
      } else {
        floorData.general.push(d);
      }
    });

    return groups;
  }, [localNodes, customBuildings, customFloors, customUnits, customRacks, isEn]);

  // Helper list of all buildings for manual relocation
  const allBuildingOptions = useMemo(() => {
    const set = new Set<string>();
    localNodes.forEach((n) => {
      if (n.building) set.add(n.building);
    });
    customBuildings.forEach((b) => set.add(b));
    if (set.size === 0) {
      set.add(isEn ? 'Central HQ Building' : 'ساختمان مرکزی');
    }
    return Array.from(set);
  }, [localNodes, customBuildings, isEn]);

  // Helper list of floors for the selected building in relocation modal
  const allFloorOptionsForSelectedBuilding = useMemo(() => {
    const targetBldg = relocateTargetBuilding || allBuildingOptions[0] || '';
    const set = new Set<string>();
    localNodes
      .filter((n) => n.building === targetBldg)
      .forEach((n) => {
        if (n.floor) set.add(n.floor);
      });
    if (customFloors[targetBldg]) {
      customFloors[targetBldg].forEach((f) => set.add(f));
    }
    if (set.size === 0) {
      set.add(isEn ? 'Floor 1' : 'طبقه ۱');
      set.add(isEn ? 'Floor 2' : 'طبقه ۲');
    }
    return Array.from(set);
  }, [relocateTargetBuilding, allBuildingOptions, localNodes, customFloors, isEn]);

  // Helper list of units for selected building + floor in relocation modal
  const allUnitOptionsForSelectedFloor = useMemo(() => {
    const targetBldg =
      relocateTargetBuilding === '__CUSTOM__'
        ? customRelocateBuilding
        : relocateTargetBuilding || allBuildingOptions[0] || '';
    const targetFl =
      relocateTargetFloor === '__CUSTOM__'
        ? customRelocateFloor
        : relocateTargetFloor || allFloorOptionsForSelectedBuilding[0] || '';
    const set = new Set<string>();
    localNodes
      .filter((n) => n.building === targetBldg && n.floor === targetFl)
      .forEach((n) => {
        if (n.unit) set.add(n.unit);
      });
    const key = `${targetBldg}:::${targetFl}`;
    if (customUnits[key]) {
      customUnits[key].forEach((u) => set.add(u));
    }
    return Array.from(set);
  }, [
    relocateTargetBuilding,
    customRelocateBuilding,
    relocateTargetFloor,
    customRelocateFloor,
    allBuildingOptions,
    allFloorOptionsForSelectedBuilding,
    localNodes,
    customUnits,
  ]);

  // Helper list of racks for selected building + floor in relocation modal
  const allRackOptionsForSelectedFloor = useMemo(() => {
    const targetBldg =
      relocateTargetBuilding === '__CUSTOM__'
        ? customRelocateBuilding
        : relocateTargetBuilding || allBuildingOptions[0] || '';
    const targetFl =
      relocateTargetFloor === '__CUSTOM__'
        ? customRelocateFloor
        : relocateTargetFloor || allFloorOptionsForSelectedBuilding[0] || '';
    const set = new Set<string>();
    localNodes
      .filter((n) => n.building === targetBldg && n.floor === targetFl)
      .forEach((n) => {
        if (n.rack) set.add(n.rack);
      });
    const key = `${targetBldg}:::${targetFl}`;
    if (customRacks[key]) {
      customRacks[key].forEach((r) => set.add(r));
    }
    return Array.from(set);
  }, [
    relocateTargetBuilding,
    customRelocateBuilding,
    relocateTargetFloor,
    customRelocateFloor,
    allBuildingOptions,
    allFloorOptionsForSelectedBuilding,
    localNodes,
    customRacks,
  ]);

  // Render a device card inside physical view (used in units, racks, and general floor)
  const renderDeviceCard = (
    device: TopologyNode,
    bldgName: string,
    floorName: string,
    unitName?: string,
    rackName?: string
  ) => {
    const isBeingDragged = draggedDevice?.id === device.id;
    const isCurrentlyMoving = movingDeviceId === device.id;

    return (
      <div
        key={device.id}
        draggable={!movingDeviceId}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData('text/plain', device.id);
          e.dataTransfer.setData(
            'application/json',
            JSON.stringify({
              deviceId: device.id,
              fromBuilding: bldgName,
              fromFloor: floorName,
              fromUnit: unitName || '',
              fromRack: rackName || '',
            })
          );
          e.dataTransfer.effectAllowed = 'move';
          setDraggedDevice({
            id: device.id,
            name: device.name,
            type: device.type,
            fromBuilding: bldgName,
            fromFloor: floorName,
            fromUnit: unitName,
            fromRack: rackName,
          });
        }}
        onDragEnd={(e) => {
          e.stopPropagation();
          setDraggedDevice(null);
          setDragOverTarget(null);
        }}
        onClick={() => setSelectedNodeId(device.id)}
        className={`p-3 rounded-xl border transition shadow-lg backdrop-blur-xl select-none ${
          isBeingDragged
            ? 'opacity-30 border-dashed border-cyan-400 ring-2 ring-cyan-400/40 scale-95 cursor-grabbing'
            : selectedNodeId === device.id
            ? 'spatial-glass border-cyan-400 ring-2 ring-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-grab hover:shadow-2xl'
            : device.is_online
            ? 'spatial-glass spatial-glass-hover border-white/10 cursor-grab hover:shadow-2xl'
            : 'spatial-glass border-rose-500/30 bg-rose-950/20 cursor-grab'
        }`}
      >
        {/* Card Header with Grip Handle */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className="text-slate-400 hover:text-cyan-300 p-0.5 cursor-grab active:cursor-grabbing"
              title={t('topology_physical_drag_hint')}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
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

          <div className="flex items-center gap-1">
            {isCurrentlyMoving ? (
              <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                <span>Moving...</span>
              </span>
            ) : (
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                  device.is_online
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {device.is_online ? 'ONLINE' : 'OFFLINE'}
              </span>
            )}
          </div>
        </div>

        <div className="text-[11px] font-mono font-bold text-indigo-300 mb-1">
          {device.ip}
        </div>

        <div className="text-[10px] text-slate-400 space-y-0.5">
          {device.unit && (
            <div className="flex items-center gap-1">
              <Box className="w-2.5 h-2.5 text-indigo-400" />
              <span>{t('topology_unit_label')} {device.unit}</span>
            </div>
          )}
          {device.rack && (
            <div className="flex items-center gap-1 text-slate-300 font-mono">
              <Server className="w-2.5 h-2.5 text-cyan-400" />
              <span>{t('topology_rack_label')} {device.rack}</span>
            </div>
          )}
        </div>

        {/* Action Buttons: Inspect Ports & Manual Relocate */}
        <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInspectPorts(device as unknown as Device);
            }}
            className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-medium cursor-pointer"
          >
            <Cable className="w-3 h-3" />
            <span>{t('topology_inspect_ports_btn')}</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setRelocateDevice(device);
              setRelocateTargetBuilding(bldgName);
              setRelocateTargetFloor(floorName);
              setRelocateTargetUnit(device.unit || '__NONE__');
              setRelocateTargetRack(device.rack || '__NONE__');
              setCustomRelocateBuilding('');
              setCustomRelocateFloor('');
              setCustomRelocateUnit('');
              setCustomRelocateRack('');
            }}
            className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-medium cursor-pointer"
            title={t('topology_physical_relocate_btn')}
          >
            <Move className="w-3 h-3" />
            <span>{t('topology_physical_relocate_btn')}</span>
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 space-y-3">
        <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin" />
        <p className="text-sm">{t('topology_loading_map')}</p>
      </div>
    );
  }

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`${isRtl ? 'text-right' : 'text-left'} overflow-hidden text-slate-100 transition-all duration-300 ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  viewMode === 'schematic'
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md font-semibold'
                    : 'text-white hover:text-white hover:bg-white/10'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-white" />
                <span className="text-white">{t('topology_tab_schematic')}</span>
              </button>
              <button
                onClick={() => setViewMode('physical')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  viewMode === 'physical'
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md font-semibold'
                    : 'text-white hover:text-white hover:bg-white/10'
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-white" />
                <span className="text-white">{t('topology_tab_physical')}</span>
              </button>
            </div>

            <label className="hidden md:flex items-center gap-1.5 text-slate-300 text-xs cursor-pointer mx-2">
              <input
                type="checkbox"
                checked={showPortLabels}
                onChange={(e) => setShowPortLabels(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-indigo-500 bg-slate-900 border-white/20 focus:ring-indigo-500"
              />
              <span>{t('topology_show_ports')}</span>
            </label>
          </div>

          {/* Filters & Actions */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Status Indicator for Custom Positions */}
            {viewMode === 'schematic' && hasSavedPositions && (
              <div className="hidden lg:flex items-center gap-1 text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20">
                <Check className="w-3 h-3 text-cyan-400" />
                <span>{t('topology_custom_layout_saved')}</span>
              </div>
            )}

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder={t('topology_search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`px-3 py-1.5 ${isRtl ? 'pr-8' : 'pl-8'} rounded-xl bg-slate-900/70 border border-white/15 text-slate-100 text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-400 w-44 sm:w-52`}
              />
              <Search className={`w-3.5 h-3.5 text-slate-400 absolute ${isRtl ? 'right-2.5' : 'left-2.5'} top-2`} />
            </div>

            {/* Building Filter */}
            <select
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900/70 border border-white/15 text-slate-200 text-xs focus:outline-none focus:border-indigo-400"
            >
              <option value="all">{t('topology_all_buildings')}</option>
              {topology?.buildings?.map((b: any, index: number) => {
                const bldgName = typeof b === 'string' ? b : b?.name || t('topology_building_num', { num: index + 1 });
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
              title={t('topology_scan_title')}
            >
              <Zap className={`w-3.5 h-3.5 text-cyan-300 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? t('topology_scanning') : t('topology_scan_cdp_lldp')}</span>
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
                  title={t('topology_zoom_in_title')}
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
                  title={t('topology_zoom_out_title')}
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleResetView}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
                  title={t('topology_zoom_reset_title')}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={toggleFullMode}
                  className={`p-1.5 rounded-lg transition ${
                    isFullMode ? 'text-amber-300 bg-amber-500/20' : 'text-slate-400 hover:text-white'
                  }`}
                  title={isFullMode ? t('topology_exit_full_mode') : t('topology_fullscreen_title')}
                >
                  {isFullMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                {hasSavedPositions && (
                  <button
                    onClick={handleResetPositions}
                    className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition border-r border-white/10 pr-1.5 mr-0.5"
                    title={t('topology_reset_layout_title')}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Map Secondary Toolbar & Cabling Step Banner */}
      {viewMode === 'schematic' && (!isFullMode || showToolbarInFullMode) && (
        <div className="border-b border-white/10 bg-slate-900/90 backdrop-blur-xl z-20">
          {/* Map Selector & Tool Bar */}
          <div className="p-2 sm:px-4 flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Map Selector & Management */}
            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                <MapIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>{t('topology_map_selector_label')}</span>
              </div>
              <select
                value={activeMapId}
                onChange={(e) => handleSelectMap(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-white/15 text-slate-100 text-xs font-medium focus:outline-none focus:border-indigo-400"
              >
                <option value="default">{t('topology_map_auto_discovered')}</option>
                {customMaps.map((map) => (
                  <option key={map.id} value={map.id}>
                    {map.name} ({map.deviceIds?.length || 0} dev, {map.links?.length || 0} links)
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setManageMapMode('create');
                  setIsManageMapOpen(true);
                }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-xs transition active:scale-95"
                title={t('topology_map_new_btn')}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('topology_map_new_btn')}</span>
              </button>

              {/* If custom map selected: Rename & Delete buttons */}
              {activeMapId !== 'default' && currentCustomMap && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setManageMapMode('edit');
                      setIsManageMapOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition"
                    title={t('topology_map_rename_btn')}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManageMapMode('delete');
                      setIsManageMapOpen(true);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 border border-white/10 transition"
                    title={t('topology_map_delete_btn')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Custom Map Tools: Select Tool, Cable Tool, Add Device, Clear Links */}
            {activeMapId !== 'default' && currentCustomMap && (
              <div className="flex items-center flex-wrap gap-2">
                <div className="flex items-center bg-slate-800/90 rounded-xl p-1 border border-white/15 shadow-inner toolbar-dark-pill force-white-text">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTool('select');
                      setCableWorkflow({ step: 'idle', sourceDevice: null, sourcePort: null, targetDevice: null, targetPort: null });
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      activeTool === 'select'
                        ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-xs font-semibold'
                        : 'text-white hover:text-white hover:bg-white/15'
                    }`}
                  >
                    <MousePointer className="w-3.5 h-3.5 text-white" />
                    <span className="text-white font-medium" style={{ color: '#ffffff' }}>{t('topology_tool_select')}</span>
                  </button>
                  {globalDeviceViewMode === 'card' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTool('cable');
                        setCableWorkflow({ step: 'idle', sourceDevice: null, sourcePort: null, targetDevice: null, targetPort: null });
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                        activeTool === 'cable'
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs font-bold animate-pulse'
                          : 'text-white hover:text-white hover:bg-white/15'
                      }`}
                    >
                      <Cable className="w-3.5 h-3.5 text-white" />
                      <span className="text-white font-medium" style={{ color: '#ffffff' }}>{t('topology_tool_cable')}</span>
                    </button>
                  )}
                </div>

                {/* Add Device Button - shown in Card view mode */}
                {globalDeviceViewMode === 'card' && (
                  <button
                    type="button"
                    onClick={() => setIsAddDeviceOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-xs transition active:scale-95 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('topology_tool_add_device')}</span>
                  </button>
                )}

                {/* Add Rack & Install Hardware - shown strictly in Physical view mode */}
                {globalDeviceViewMode === 'physical' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsAddRackOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-xs transition active:scale-95 text-xs"
                      title={isEn ? "Add standard datacenter rack (16U to 44U)" : "افزودن رک استاندارد دیتا سنتر (16U تا 44U)"}
                    >
                      <Box className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Add Rack' : 'افزودن رک (Rack)'}</span>
                    </button>

                    {(currentCustomMap.racks?.length || 0) > 0 && (
                      <button
                        type="button"
                        onClick={() => handleOpenAddHardware()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium shadow-xs transition active:scale-95 text-xs"
                        title={isEn ? "Install HPE/Asus/Cisco server, switch, router, storage, patch panel in rack" : "نصب سرور HPE/Asus/Cisco، سوییچ، روتر، استوریج، پچ پنل و کیبل منیجمنت در رک"}
                      >
                        <Server className="w-3.5 h-3.5" />
                        <span>{isEn ? 'Install Hardware' : 'نصب سخت‌افزار'}</span>
                      </button>
                    )}
                  </>
                )}

                {/* Global Device Display Mode: Card (Cabling) vs Physical (Chassis/Rackmount) */}
                <div className="flex items-center bg-slate-800/90 rounded-xl p-1 border border-white/15 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setGlobalDeviceViewMode('card')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      globalDeviceViewMode === 'card'
                        ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-xs font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                    title={isEn ? 'Card Mode (For port cabling & connections)' : 'نمای کارتی (برای کابل‌کشی و اتصالات پورت‌ها)'}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Card' : 'کارت'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGlobalDeviceViewMode('physical');
                      if (activeTool === 'cable') {
                        setActiveTool('select');
                      }
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      globalDeviceViewMode === 'physical'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                    title={isEn ? 'Physical Mode (Photorealistic chassis for rack mounting)' : 'نمای سخت‌افزار (شاسی واقعی جهت نصب در رک)'}
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>{isEn ? 'Physical' : 'فیزیکی'}</span>
                  </button>
                </div>

                {/* Sticky Notes Toggle & Add Note */}
                <div className="flex items-center gap-1.5 bg-slate-800/90 rounded-xl px-2.5 py-1 border border-white/15">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-amber-200 hover:text-amber-100 select-none">
                    <input
                      type="checkbox"
                      checked={showStickyNotes}
                      onChange={toggleShowStickyNotes}
                      className="w-3.5 h-3.5 rounded text-amber-500 bg-slate-900 border-white/20 focus:ring-amber-500"
                    />
                    <StickyNote className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isEn ? 'Notes' : 'یادداشت‌ها'}</span>
                  </label>
                  {showStickyNotes && (
                    <button
                      type="button"
                      onClick={handleAddStickyNote}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 hover:text-amber-100 border border-amber-500/30 transition text-[11px] active:scale-95 font-medium ml-1"
                      title={isEn ? 'Add new sticky note on canvas' : 'افزودن یادداشت استیکی جدید روی نقشه'}
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isEn ? 'Add' : 'افزودن'}</span>
                    </button>
                  )}
                </div>

                {(currentCustomMap.links?.length || 0) > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllCustomLinks}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-white/10 text-slate-300 hover:text-rose-300 transition text-[11px]"
                    title={t('topology_tool_clear_links')}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{t('topology_tool_clear_links')}</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Persistent Guided Cabling Banner */}
          {activeTool === 'cable' && activeMapId !== 'default' && (
            <div className="px-4 py-2 bg-gradient-to-r from-purple-900/90 to-indigo-900/90 border-t border-purple-500/30 flex items-center justify-between text-xs text-white shadow-inner">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-purple-500/30 animate-pulse">
                  <Cable className="w-4 h-4 text-purple-300" />
                </div>
                <div className="flex items-center flex-wrap gap-1.5">
                  <span className="font-bold">
                    {cableWorkflow.step === 'select_target_device'
                      ? t('topology_cable_step_target')
                      : t('topology_cable_step_source')}
                  </span>
                  {cableWorkflow.sourceDevice && cableWorkflow.sourcePort && (
                    <span className="font-mono text-[11px] bg-purple-950/90 px-2 py-0.5 rounded-md border border-purple-400/40 text-purple-200">
                      {cableWorkflow.sourceDevice.name} : {cableWorkflow.sourcePort}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTool('select');
                  setCableWorkflow({ step: 'idle', sourceDevice: null, sourcePort: null, targetDevice: null, targetPort: null });
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white text-[11px] transition"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t('topology_cable_cancel')}</span>
              </button>
            </div>
          )}
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
                title={isFullMode ? t('topology_exit_full_mode') : t('topology_fullscreen_title')}
                aria-label={isFullMode ? t('topology_exit_full_mode') : t('topology_fullscreen_title')}
              >
                {isFullMode ? (
                  <Minimize2 className="w-5 h-5 text-amber-300" />
                ) : (
                  <Maximize2 className="w-5 h-5 text-cyan-300 group-hover:scale-110 transition-transform" />
                )}

                {/* Tooltip on hover */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2.5 px-3 py-1.5 rounded-lg bg-slate-900/95 border border-white/20 text-white text-xs font-medium whitespace-nowrap shadow-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50">
                  {isFullMode ? t('topology_exit_full_mode') : t('topology_fullscreen_title')}
                </div>
              </button>

              {isFullMode && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowToolbarInFullMode((prev) => !prev)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/25 hover:border-white/40 text-xs text-white font-medium shadow-xl backdrop-blur-xl transition active:scale-95 cursor-pointer toolbar-dark-btn force-white-text"
                    title={showToolbarInFullMode ? t('topology_hide_toolbar') : t('topology_show_toolbar')}
                  >
                    <span className="text-white font-medium" style={{ color: '#ffffff' }}>{showToolbarInFullMode ? t('topology_hide_toolbar') : t('topology_show_toolbar')}</span>
                  </button>

                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono backdrop-blur-md">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                    <span>{t('topology_fullscreen_hint')}</span>
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
              {/* Draw Topology Connection Links - only visible in Card view mode */}
              {globalDeviceViewMode === 'card' && (
                activeMapId === 'default' ? (
                  topology?.links.map((link) => {
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

                  const pairKey = [link.source, link.target].sort().join('___');
                  const group = defaultLinkGroups.get(pairKey) || [link];
                  const indexInGroup = group.findIndex((l: any) => l.id === link.id);
                  const totalInGroup = group.length;

                  const isReversed = link.source > link.target;
                  const curve = getLinkCurve(x1, y1, x2, y2, indexInGroup >= 0 ? indexInGroup : 0, totalInGroup, isReversed);

                  return (
                    <g key={link.id} className="transition-all pointer-events-none">
                      {/* Link Line */}
                      <path
                        d={curve.pathD}
                        fill="none"
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
                        <g transform={`translate(${curve.midX}, ${curve.midY})`} className="pointer-events-none">
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
                        <g transform={`translate(${curve.srcTagX}, ${curve.srcTagY})`} className="pointer-events-none">
                          <rect x="-24" y="-8" width="48" height="16" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                          <text textAnchor="middle" dominantBaseline="central" fill="#4f46e5" fontSize="8" fontFamily="monospace" fontWeight="bold">
                            {link.source_port}
                          </text>
                        </g>
                      )}

                      {/* Target Port Tag */}
                      {showPortLabels && (
                        <g transform={`translate(${curve.tgtTagX}, ${curve.tgtTagY})`} className="pointer-events-none">
                          <rect x="-24" y="-8" width="48" height="16" rx="3" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1" />
                          <text textAnchor="middle" dominantBaseline="central" fill="#4f46e5" fontSize="8" fontFamily="monospace" fontWeight="bold">
                            {link.target_port}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })
              ) : (
                /* Custom Map Links Rendering */
                currentCustomMap?.links?.map((link) => {
                  const sourcePos = nodePositions.get(link.sourceDeviceId);
                  const targetPos = nodePositions.get(link.targetDeviceId);
                  if (!sourcePos || !targetPos) return null;

                  const isTrunk = link.sourceMode === 'trunk' || link.targetMode === 'trunk';
                  const isDown = link.status === 'down';
                  const isFiber = link.cableType === 'fiber';
                  const isSerial = link.cableType === 'serial';

                  const x1 = sourcePos.x + 115;
                  const y1 = sourcePos.y + 55;
                  const x2 = targetPos.x + 115;
                  const y2 = targetPos.y + 55;

                  const pairKey = [link.sourceDeviceId, link.targetDeviceId].sort().join('___');
                  const group = customLinkGroups.get(pairKey) || [link];
                  const indexInGroup = group.findIndex((l) => l.id === link.id);
                  const totalInGroup = group.length;

                  const isReversed = link.sourceDeviceId > link.targetDeviceId;
                  const curve = getLinkCurve(x1, y1, x2, y2, indexInGroup >= 0 ? indexInGroup : 0, totalInGroup, isReversed);

                  const strokeColor = isDown
                    ? '#ef4444'
                    : isFiber
                    ? '#f59e0b'
                    : isSerial
                    ? '#06b6d4'
                    : isTrunk
                    ? '#9333ea'
                    : '#2563eb';

                  return (
                    <g
                      key={link.id}
                      className="transition-all cursor-pointer group"
                      onMouseEnter={() => setHoveredLinkId(link.id)}
                      onMouseLeave={() => setHoveredLinkId(null)}
                    >
                      {/* Invisible wider hit area for easy clicking */}
                      <path
                        d={curve.pathD}
                        fill="none"
                        stroke="transparent"
                        strokeWidth={22}
                        className="cursor-pointer"
                        onClick={() => handleEditExistingLink(link)}
                      />

                      {/* Main Cable Line */}
                      <path
                        d={curve.pathD}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={isTrunk || isFiber ? 3.5 : 2.5}
                        strokeDasharray={isDown ? '6 4' : 'none'}
                        opacity={0.9}
                        className="hover:stroke-cyan-300 transition-colors"
                        onClick={() => handleEditExistingLink(link)}
                      />

                      {/* Midpoint Speed & Type Badge */}
                      <g
                        transform={`translate(${curve.midX}, ${curve.midY})`}
                        onClick={() => handleEditExistingLink(link)}
                        className="cursor-pointer select-none"
                      >
                        <rect
                          x="-52"
                          y="-11"
                          width="104"
                          height="22"
                          rx="5"
                          fill="#ffffff"
                          stroke={strokeColor}
                          strokeWidth="1.5"
                          className="shadow-md hover:fill-slate-100 transition"
                        />
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#0f172a"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {link.speed || '1G'} • {link.cableType?.toUpperCase() || 'COPPER'}
                        </text>
                      </g>

                      {/* Hover Delete Button */}
                      {hoveredLinkId === link.id && (
                        <g
                          transform={`translate(${curve.midX + 66}, ${curve.midY})`}
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLinkToDelete(link);
                          }}
                        >
                          <circle
                            r="11"
                            fill="#ef4444"
                            stroke="#ffffff"
                            strokeWidth="2"
                            className="hover:scale-110 transition-transform"
                          />
                          <path
                            d="M -3.5 -3.5 L 3.5 3.5 M 3.5 -3.5 L -3.5 3.5"
                            stroke="#ffffff"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          <title>{isEn ? 'Disconnect Cable Connection' : 'قطع ارتباط و حذف کابل'}</title>
                        </g>
                      )}

                      {/* Source Endpoint Badges (Port, Mode, VLAN, IP) */}
                      {showPortLabels && (
                        <g transform={`translate(${curve.srcTagX}, ${curve.srcTagY})`} className="select-none pointer-events-none">
                          <rect
                            x="-44"
                            y={link.sourceIp ? "-24" : "-18"}
                            width="88"
                            height={link.sourceIp ? "48" : "36"}
                            rx="6"
                            fill="#ffffff"
                            stroke="#94a3b8"
                            strokeWidth="1.2"
                          />
                          <text
                            textAnchor="middle"
                            y={link.sourceIp ? "-13" : "-7"}
                            dominantBaseline="central"
                            fill="#312e81"
                            fontSize="9.5"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {link.sourcePort}
                          </text>
                          <text
                            textAnchor="middle"
                            y={link.sourceIp ? "-1" : "+8"}
                            dominantBaseline="central"
                            fill={link.sourceMode === 'trunk' ? '#7e22ce' : '#2563eb'}
                            fontSize="8"
                            fontFamily="monospace"
                            fontWeight="600"
                          >
                            {link.sourceMode === 'trunk' ? `TRUNK (V${link.sourceVlan || 1})` : `VLAN ${link.sourceVlan || 1}`}
                          </text>
                          {link.sourceIp && (
                            <text
                              textAnchor="middle"
                              y="12"
                              dominantBaseline="central"
                              fill="#047857"
                              fontSize="8"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              {link.sourceIp}
                            </text>
                          )}
                        </g>
                      )}

                      {/* Target Endpoint Badges (Port, Mode, VLAN, IP) */}
                      {showPortLabels && (
                        <g transform={`translate(${curve.tgtTagX}, ${curve.tgtTagY})`} className="select-none pointer-events-none">
                          <rect
                            x="-44"
                            y={link.targetIp ? "-24" : "-18"}
                            width="88"
                            height={link.targetIp ? "48" : "36"}
                            rx="6"
                            fill="#ffffff"
                            stroke="#94a3b8"
                            strokeWidth="1.2"
                          />
                          <text
                            textAnchor="middle"
                            y={link.targetIp ? "-13" : "-7"}
                            dominantBaseline="central"
                            fill="#0369a1"
                            fontSize="9.5"
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {link.targetPort}
                          </text>
                          <text
                            textAnchor="middle"
                            y={link.targetIp ? "-1" : "+8"}
                            dominantBaseline="central"
                            fill={link.targetMode === 'trunk' ? '#7e22ce' : '#2563eb'}
                            fontSize="8"
                            fontFamily="monospace"
                            fontWeight="600"
                          >
                            {link.targetMode === 'trunk' ? `TRUNK (V${link.targetVlan || 1})` : `VLAN ${link.targetVlan || 1}`}
                          </text>
                          {link.targetIp && (
                            <text
                              textAnchor="middle"
                              y="12"
                              dominantBaseline="central"
                              fill="#047857"
                              fontSize="8"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              {link.targetIp}
                            </text>
                          )}
                        </g>
                      )}
                    </g>
                  );
                })
              ))}

              {/* Custom Map Empty State within Canvas */}
              {activeMapId !== 'default' && filteredNodes.length === 0 && (currentCustomMap?.racks?.length || 0) === 0 && (
                <foreignObject x={150} y={150} width={580} height={300}>
                  <div className="p-8 rounded-2xl bg-slate-900/90 border border-white/10 shadow-2xl backdrop-blur-xl text-center space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center mx-auto">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white mb-1">
                        {t('topology_custom_empty_title')}
                      </h4>
                      <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                        {t('topology_custom_empty_desc')}
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsAddDeviceOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg transition active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{t('topology_tool_add_device')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddRackOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition active:scale-95"
                      >
                        <Box className="w-4 h-4" />
                        <span>{isEn ? 'Add Server Rack' : 'افزودن رک سرور (Rack)'}</span>
                      </button>
                    </div>
                  </div>
                </foreignObject>
              )}

              {/* Draw Custom Map Racks on Canvas - strictly visible in Physical view mode */}
              {activeMapId !== 'default' && globalDeviceViewMode === 'physical' && currentCustomMap?.racks && currentCustomMap.racks.map((rack) => {
                const isBeingDragged = draggingRackId === rack.id;
                const rackHeight = 52 + rack.units * 28 + 40;
                return (
                  <foreignObject
                    key={rack.id}
                    x={rack.x}
                    y={rack.y}
                    width={430}
                    height={rackHeight}
                    className="overflow-visible"
                    style={{ overflow: 'visible' }}
                  >
                    <div
                      onMouseDown={(e) => handleRackMouseDown(e, rack.id)}
                      className={`select-none cursor-grab active:cursor-grabbing transition-all ${
                        isBeingDragged ? 'z-40 scale-[1.01] shadow-2xl' : 'z-20'
                      }`}
                    >
                      <RackCabinetSvg
                        rack={rack}
                        onToggleViewMode={handleToggleRackViewMode}
                        onOpenAddHardware={handleOpenAddHardware}
                        onInspectRack={(r) => setInspectingRack(r)}
                        onDeleteRack={handlePromptDeleteRack}
                        onEditDeviceNic={handleEditDeviceNic}
                        onEditSpecs={handleEditDeviceSpecs}
                        onEditDeviceProperties={handleEditDeviceProperties}
                        onConnectTerminal={handleConnectTerminalFromRack}
                        onInspectPorts={handleInspectPortsFromRack}
                        onPromptRemoveDevice={handlePromptRemoveHardwareDevice}
                        onMoveDevice={handleMoveDeviceInRack}
                        onRemoveDevice={handleRemoveDeviceFromRack}
                      />
                    </div>
                  </foreignObject>
                );
              })}

              {/* Draw Nodes on Canvas */}
              {(() => {
                const racks = currentCustomMap?.racks || [];
                const nodesToRender = globalDeviceViewMode === 'physical'
                  ? filteredNodes.filter((node) => {
                      // In physical mode, devices mounted inside any rack are displayed inside that rack cabinet!
                      const isMounted = racks.some((r) =>
                        (r.devices || []).some(
                          (d) => d.id === node.id || d.id === `hw-${node.id}` || d.name === node.name
                        )
                      );
                      return !isMounted;
                    })
                  : filteredNodes;

                // Sort nodes so hovered, dragged, or selected nodes are rendered LAST (top of SVG stack)
                const sortedNodes = [...nodesToRender].sort((a, b) => {
                  if (a.id === hoveredNodeId || a.id === draggingNodeId) return 1;
                  if (b.id === hoveredNodeId || b.id === draggingNodeId) return -1;
                  if (a.id === selectedNodeId) return 1;
                  if (b.id === selectedNodeId) return -1;
                  return 0;
                });

                return sortedNodes.map((node) => {
                  const pos = nodePositions.get(node.id) || { x: 100, y: 100 };
                  const isSelected = selectedNodeId === node.id;
                  const isBeingDragged = draggingNodeId === node.id;
                  const isHovered = hoveredNodeId === node.id;
                  const isOnline = node.is_online;
                  const isCablingSource = activeTool === 'cable' && cableWorkflow.sourceDevice?.id === node.id;
                  const isNodeMikroTik = isMikroTikDevice(node);
                  const displayMode = globalDeviceViewMode;

                  if (displayMode === 'physical') {
                    return (
                      <foreignObject
                        key={node.id}
                        x={pos.x}
                        y={pos.y}
                        width="380"
                        height="240"
                        className={`overflow-visible interactive-node ${isHovered || isBeingDragged ? 'z-50' : 'z-20'}`}
                        style={{
                          overflow: 'visible',
                          zIndex: isHovered || isBeingDragged ? 9999 : isSelected ? 80 : 20,
                        }}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId((curr) => (curr === node.id ? null : curr))}
                      >
                        <PhysicalNodeOnCanvas
                          node={node}
                          isEn={isEn}
                          isRtl={isRtl}
                          isBeingDragged={isBeingDragged}
                          isSelected={isSelected}
                          racks={currentCustomMap?.racks || []}
                          onToggleToCardView={() => setGlobalDeviceViewMode('card')}
                          onMountToRack={(rackId, startU) => handleMountCanvasNodeToRack(node, rackId, startU)}
                          onUnmountFromRack={handleRemoveDeviceFromRack}
                          onInspectRack={(rack) => setInspectingRack(rack)}
                          onRemoveFromMap={activeMapId !== 'default' ? () => handlePromptDeleteDevice(node) : undefined}
                          onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                        />
                      </foreignObject>
                    );
                  }

                  return (
                    <foreignObject
                      key={node.id}
                      x={pos.x}
                      y={pos.y}
                      width="240"
                      height="150"
                      className={`overflow-visible interactive-node ${isHovered || isBeingDragged ? 'z-50' : 'z-20'}`}
                      style={{
                        overflow: 'visible',
                        zIndex: isHovered || isBeingDragged ? 9999 : isSelected ? 80 : 20,
                      }}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId((curr) => (curr === node.id ? null : curr))}
                    >
                    <div
                      onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                      className={`w-[226px] p-3 rounded-xl border transition-shadow select-none text-right backdrop-blur-xl group relative ${
                        isBeingDragged
                          ? 'spatial-glass border-cyan-400 ring-2 ring-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.6)] cursor-grabbing z-40 scale-102'
                          : isCablingSource
                          ? 'spatial-glass border-purple-400 ring-2 ring-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.6)] animate-pulse z-40'
                          : activeTool === 'cable'
                          ? 'spatial-glass border-purple-500/40 hover:border-purple-400 hover:ring-2 hover:ring-purple-500/50 cursor-pointer shadow-lg'
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
                        title={t('topology_drag_tooltip')}
                      >
                        <Move className="w-2.5 h-2.5 text-cyan-400" />
                        <span>{t('topology_drag_reposition')}</span>
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
                          {isNodeMikroTik && (
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                              MikroTik
                            </span>
                          )}
                        </div>

                        {/* Status Pulse & Remove Button */}
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

                          {activeMapId !== 'default' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePromptDeleteDevice(node);
                              }}
                              className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition ml-1 cursor-pointer"
                              title={t('topology_device_remove_from_map')}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
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
                          {node.building ? node.building.replace('(Central Bldg)', '').replace('(Engineering Bldg)', '') : ''} • {node.floor || ''}
                        </span>
                      </div>

                      {/* Quick Port and CLI preview trigger button */}
                      <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-mono">{node.total_ports || 24}P</span>
                          {node.has_unsaved_changes && (
                            <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-1 rounded border border-amber-500/40" title={t('topology_unsaved_changes_tooltip')}>
                              wr!
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {activeMapId !== 'default' && (
                            <button
                              type="button"
                              onClick={(e) => handleStartCableFromDevice(e, node)}
                              className="text-purple-400 hover:text-purple-300 font-medium flex items-center gap-0.5 hover:underline"
                              title={t('topology_tool_cable')}
                            >
                              <Cable className="w-3 h-3 text-purple-400" />
                              <span>{isEn ? 'Cable' : 'کابل'}</span>
                            </button>
                          )}
                          {onConnectTerminal && (node.type === 'switch' || node.type === 'router') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onConnectTerminal(node);
                              }}
                              className={isNodeMikroTik ? "text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-0.5 hover:underline" : "text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-0.5 hover:underline"}
                              title={isNodeMikroTik ? (isEn ? "MikroTik RouterOS CLI" : "ترمینال و کنسول RouterOS میکروتیک") : t('topology_terminal_tooltip')}
                            >
                              <Terminal className={isNodeMikroTik ? "w-3 h-3 text-cyan-400" : "w-3 h-3 text-emerald-400"} />
                              <span>{isNodeMikroTik ? 'CLI' : 'CLI'}</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onInspectPorts(node);
                            }}
                            className={isNodeMikroTik ? "text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-0.5 hover:underline" : "text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-0.5 hover:underline"}
                            title={isNodeMikroTik ? (isEn ? "Manage MikroTik Device & Ports" : "مدیریت دیوایس و پورت‌های میکروتیک") : t('topology_ports_tooltip')}
                          >
                            <Cable className="w-3 h-3" />
                            <span>{isNodeMikroTik ? (isEn ? 'Ports' : 'پورت‌ها') : t('topology_card_ports')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </foreignObject>
                );
              });
            })()}

              {/* Sticky Notes Connector Lines to Linked Devices (rendered only if showStickyNotes and matching current viewMode) */}
              {showStickyNotes && currentCustomMap?.stickyNotes && currentCustomMap.stickyNotes
                .filter((note) => (note.viewMode || 'card') === globalDeviceViewMode)
                .map((note) => {
                if (!note.linkedDeviceId) return null;
                const devPos = nodePositions.get(note.linkedDeviceId) || customPositions[note.linkedDeviceId];
                if (!devPos) return null;
                const noteCenterX = note.x + 115;
                const noteCenterY = note.y + 60;
                const devCenterX = devPos.x + 113;
                const devCenterY = devPos.y + 50;

                return (
                  <g key={`note-line-${note.id}`} className="pointer-events-none">
                    <line
                      x1={noteCenterX}
                      y1={noteCenterY}
                      x2={devCenterX}
                      y2={devCenterY}
                      stroke="#f59e0b"
                      strokeWidth="1.8"
                      strokeDasharray="4,4"
                      strokeOpacity="0.85"
                    />
                    <circle cx={noteCenterX} cy={noteCenterY} r="3.5" fill="#f59e0b" />
                    <circle cx={devCenterX} cy={devCenterY} r="4" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.2" />
                  </g>
                );
              })}

              {/* Sticky Notes on Canvas (rendered only if showStickyNotes and matching current viewMode) */}
              {showStickyNotes && currentCustomMap?.stickyNotes && currentCustomMap.stickyNotes
                .filter((note) => (note.viewMode || 'card') === globalDeviceViewMode)
                .map((note) => (
                <foreignObject
                  key={note.id}
                  x={note.x}
                  y={note.y}
                  width="260"
                  height="300"
                  className="overflow-visible interactive-node"
                  style={{ overflow: 'visible' }}
                >
                  <TopologyStickyNote
                    note={note}
                    isEn={isEn}
                    availableDevices={allAvailableDevices}
                    onUpdate={handleUpdateStickyNote}
                    onDelete={handleDeleteStickyNote}
                    onStartDrag={handleStickyNoteStartDrag}
                    onFocusDevice={(devId) => {
                      const p = nodePositions.get(devId) || customPositions[devId];
                      if (p) {
                        setPan({
                          x: -p.x * zoom + 300,
                          y: -p.y * zoom + 200,
                        });
                      }
                    }}
                  />
                </foreignObject>
              ))}
              </g>
            </svg>

            {/* Bottom Floating Legend & Interactive Guide */}
            <div className={`absolute bottom-5 ${isRtl ? 'left-5' : 'right-5'} z-30 select-none`}>
              {!isLegendOpen ? (
                <button
                  type="button"
                  onClick={() => setIsLegendOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/20 hover:border-cyan-400/50 text-slate-200 hover:text-white shadow-2xl backdrop-blur-2xl text-xs font-medium transition active:scale-95 group"
                  title={t('topology_legend_expand')}
                >
                  <Info className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
                  <span>{t('topology_legend_title')}</span>
                  <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                </button>
              ) : (
                <div className="spatial-glass border border-white/15 backdrop-blur-2xl rounded-2xl p-3 sm:p-3.5 shadow-[0_10px_35px_rgba(0,0,0,0.6)] text-xs text-slate-200 min-w-[280px] sm:min-w-[340px] max-w-sm transition-all duration-200">
                  <div className="flex items-center justify-between gap-3 pb-2 mb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-white text-xs font-mono glow-text-cyan">
                        {t('topology_legend_title')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-md border border-cyan-500/30 hidden sm:inline">
                        {t('topology_legend_scroll_hint')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsLegendOpen(false)}
                        className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                        title={t('topology_legend_collapse')}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Connection Types & Node States */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-1 bg-purple-500 rounded shadow-[0_0_8px_rgba(168,85,247,0.7)]"></span>
                      <span className="text-purple-300 font-mono font-semibold">Trunk (802.1Q)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-1 bg-cyan-500 rounded shadow-[0_0_8px_rgba(6,182,212,0.7)]"></span>
                      <span className="text-cyan-300 font-mono font-semibold">Access (VLAN)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse"></span>
                      <span className="text-emerald-300">{t('topology_legend_online')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.7)]"></span>
                      <span className="text-rose-300">{t('topology_legend_offline')}</span>
                    </div>
                  </div>

                  {/* Quick Gesture Guide */}
                  <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{t('topology_legend_drag_hint')}</span>
                    <span className="text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">Auto-Save</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* VIEW 2: Physical Building & Floor Schematic Map with Drag & Drop */
          <div className="flex-1 h-full overflow-y-auto p-4 space-y-4">
            {/* Header / Guide Bar */}
            <div className="spatial-glass p-4 rounded-xl border border-white/10 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 glow-text-cyan">
                  <Building2 className="w-4 h-4 text-cyan-400" />
                  <span>{t('topology_physical_title')}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t('topology_physical_desc')}
                </p>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-cyan-300/90 font-medium">
                  <Move className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <span>{t('topology_physical_drag_hint')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddBuildingModal(true);
                    setNewBuildingInput('');
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-medium border border-white/15 shadow-lg transition active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('topology_physical_add_bldg_btn')}</span>
                </button>

                <button
                  type="button"
                  onClick={toggleFullMode}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/15 text-xs text-slate-200 transition active:scale-95 cursor-pointer"
                  title={isFullMode ? t('topology_exit_full_mode') : t('topology_fullscreen_title')}
                >
                  {isFullMode ? <Minimize2 className="w-4 h-4 text-amber-300" /> : <Maximize2 className="w-4 h-4 text-cyan-300" />}
                  <span>{isFullMode ? t('topology_exit_full_mode') : t('topology_fullscreen_title')}</span>
                </button>
              </div>
            </div>

            {/* Notification / Feedback Toast */}
            {feedbackToast && (
              <div
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs shadow-xl backdrop-blur-xl transition-all duration-300 ${
                  feedbackToast.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                    : feedbackToast.type === 'error'
                    ? 'bg-rose-950/80 border-rose-500/50 text-rose-200'
                    : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  {feedbackToast.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : feedbackToast.type === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                  )}
                  <span>{feedbackToast.message}</span>
                </div>
                <button
                  onClick={() => setFeedbackToast(null)}
                  className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Active Drag Hint Pill when dragging across the screen */}
            {draggedDevice && (
              <div className="p-2.5 rounded-xl bg-cyan-950/90 border border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-between gap-3 text-xs text-cyan-200">
                <div className="flex items-center gap-2">
                  <Move className="w-4 h-4 text-cyan-400 animate-bounce" />
                  <span>
                    {isEn
                      ? `Moving "${draggedDevice.name}" — Release over any floor to relocate.`
                      : `در حال کشیدن «${draggedDevice.name}» — روی هر طبقه‌ای رها کنید تا مستقر شود.`}
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-400/30">
                  {draggedDevice.fromBuilding} &gt; {draggedDevice.fromFloor}
                </span>
              </div>
            )}

            {/* Buildings Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {Object.entries(physicalHierarchy).map(([bldgName, floors]) => {
                const totalDevicesInBldg = Object.values(floors).reduce(
                  (acc, floorData) => acc + floorData.allDevices.length,
                  0
                );

                return (
                  <div
                    key={bldgName}
                    className="spatial-glass border border-white/10 rounded-xl p-4 shadow-xl space-y-3"
                  >
                    {/* Building Title & Management Actions */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-white/10 flex-wrap gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{bldgName}</h4>
                            <div className="flex items-center gap-1 opacity-80 hover:opacity-100">
                              <button
                                type="button"
                                onClick={() =>
                                  setRenameModal({
                                    type: 'building',
                                    building: bldgName,
                                    currentName: bldgName,
                                    newName: bldgName,
                                  })
                                }
                                className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-white/5 transition"
                                title={t('topology_physical_edit')}
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteModal({
                                    type: 'building',
                                    building: bldgName,
                                    deviceCount: totalDevicesInBldg,
                                  })
                                }
                                className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-white/5 transition"
                                title={t('topology_physical_delete')}
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {t('topology_devices_in_building', { count: totalDevicesInBldg })}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setAddFloorBuilding(bldgName);
                          setNewFloorInput('');
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs transition cursor-pointer"
                        title={t('topology_physical_add_floor_btn')}
                      >
                        <Plus className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-[11px] font-medium">{t('topology_physical_add_floor_btn')}</span>
                      </button>
                    </div>

                    {/* Floors in this building */}
                    <div className="space-y-3">
                      {Object.entries(floors).map(([floorName, floorData]) => {
                        const isFloorDropHovered =
                          dragOverTarget?.building === bldgName &&
                          dragOverTarget?.floor === floorName &&
                          !dragOverTarget?.unit &&
                          !dragOverTarget?.rack;
                        const isAnyDragging = draggedDevice !== null;

                        const unitEntries = Object.entries(floorData.units) as [string, TopologyNode[]][];
                        const rackEntries = Object.entries(floorData.racks) as [string, TopologyNode[]][];
                        const hasNestedStructures = unitEntries.length > 0 || rackEntries.length > 0;

                        return (
                          <div
                            key={floorName}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                            }}
                            onDragEnter={(e) => {
                              e.preventDefault();
                              setDragOverTarget({ building: bldgName, floor: floorName });
                            }}
                            onDragLeave={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              if (
                                e.clientX <= rect.left ||
                                e.clientX >= rect.right ||
                                e.clientY <= rect.top ||
                                e.clientY >= rect.bottom
                              ) {
                                setDragOverTarget((prev) =>
                                  prev?.building === bldgName && prev?.floor === floorName && !prev?.unit && !prev?.rack
                                    ? null
                                    : prev
                                );
                              }
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              let deviceId = '';
                              try {
                                const raw = e.dataTransfer.getData('application/json');
                                if (raw) {
                                  const parsed = JSON.parse(raw);
                                  deviceId = parsed.deviceId;
                                }
                              } catch (err) {}
                              if (!deviceId) {
                                deviceId =
                                  e.dataTransfer.getData('text/plain') ||
                                  (draggedDevice ? draggedDevice.id : '');
                              }

                              if (deviceId) {
                                handleMoveDevice(deviceId, bldgName, floorName, '', '');
                              }
                              setDragOverTarget(null);
                            }}
                            className={`rounded-xl p-3.5 space-y-3 transition-all duration-200 border ${
                              isFloorDropHovered
                                ? 'bg-cyan-950/50 border-cyan-400 ring-2 ring-cyan-400/50 shadow-[0_0_25px_rgba(6,182,212,0.35)] scale-[1.01]'
                                : isAnyDragging
                                ? 'bg-slate-900/60 border-dashed border-cyan-500/40 hover:border-cyan-400 hover:bg-cyan-950/20'
                                : 'bg-slate-900/50 border-white/5'
                            }`}
                          >
                            {/* Floor Header & Control Actions */}
                            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1.5 font-bold text-cyan-400">
                                  <Layers className="w-3.5 h-3.5" />
                                  <span>{floorName}</span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setRenameModal({
                                        type: 'floor',
                                        building: bldgName,
                                        item: floorName,
                                        currentName: floorName,
                                        newName: floorName,
                                      })
                                    }
                                    className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-white/5 transition"
                                    title={t('topology_physical_edit')}
                                  >
                                    <Edit2 className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setDeleteModal({
                                        type: 'floor',
                                        building: bldgName,
                                        item: floorName,
                                        deviceCount: floorData.allDevices.length,
                                      })
                                    }
                                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-white/5 transition"
                                    title={t('topology_physical_delete')}
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddUnitModal({ building: bldgName, floor: floorName });
                                    setNewUnitInput('');
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 text-[11px] transition cursor-pointer"
                                  title={t('topology_physical_add_unit_btn')}
                                >
                                  <Boxes className="w-3 h-3 text-indigo-400" />
                                  <span>{t('topology_physical_add_unit_btn')}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddRackModal({ building: bldgName, floor: floorName });
                                    setNewRackInput('');
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 text-[11px] transition cursor-pointer"
                                  title={t('topology_physical_add_rack_btn')}
                                >
                                  <Server className="w-3 h-3 text-cyan-400" />
                                  <span>{t('topology_physical_add_rack_btn')}</span>
                                </button>

                                <span className="text-[10px] text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-lg border border-white/10 font-mono">
                                  {t('topology_devices_on_floor', { count: floorData.allDevices.length })}
                                </span>
                              </div>
                            </div>

                            {/* Drop Zone Active Banner for Floor */}
                            {isFloorDropHovered && draggedDevice && (
                              <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-cyan-500/20 border border-cyan-400 text-cyan-200 text-xs font-medium animate-pulse">
                                <CheckCircle className="w-4 h-4 text-cyan-300" />
                                <span>
                                  {t('topology_physical_drop_here', { floor: floorName })}
                                </span>
                              </div>
                            )}

                            {/* Nested Units Section */}
                            {unitEntries.length > 0 && (
                              <div className="space-y-2 pt-1">
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
                                  <Boxes className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>{t('topology_physical_units_title')}</span>
                                </div>
                                <div className="grid grid-cols-1 gap-2.5">
                                  {unitEntries.map(([unitName, unitDevices]) => {
                                    const isUnitDropHovered =
                                      dragOverTarget?.building === bldgName &&
                                      dragOverTarget?.floor === floorName &&
                                      dragOverTarget?.unit === unitName;

                                    return (
                                      <div
                                        key={unitName}
                                        onDragOver={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          e.dataTransfer.dropEffect = 'move';
                                        }}
                                        onDragEnter={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setDragOverTarget({
                                            building: bldgName,
                                            floor: floorName,
                                            unit: unitName,
                                          });
                                        }}
                                        onDragLeave={(e) => {
                                          e.stopPropagation();
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          if (
                                            e.clientX <= rect.left ||
                                            e.clientX >= rect.right ||
                                            e.clientY <= rect.top ||
                                            e.clientY >= rect.bottom
                                          ) {
                                            setDragOverTarget((prev) =>
                                              prev?.unit === unitName ? null : prev
                                            );
                                          }
                                        }}
                                        onDrop={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          let deviceId = '';
                                          try {
                                            const raw = e.dataTransfer.getData('application/json');
                                            if (raw) {
                                              const parsed = JSON.parse(raw);
                                              deviceId = parsed.deviceId;
                                            }
                                          } catch (err) {}
                                          if (!deviceId) {
                                            deviceId =
                                              e.dataTransfer.getData('text/plain') ||
                                              (draggedDevice ? draggedDevice.id : '');
                                          }

                                          if (deviceId) {
                                            handleMoveDevice(deviceId, bldgName, floorName, unitName, '');
                                          }
                                          setDragOverTarget(null);
                                        }}
                                        className={`p-3 rounded-xl border transition-all duration-200 ${
                                          isUnitDropHovered
                                            ? 'bg-indigo-950/60 border-indigo-400 ring-2 ring-indigo-400/60 shadow-[0_0_20px_rgba(99,102,241,0.35)]'
                                            : 'bg-indigo-950/20 border-indigo-500/20 hover:border-indigo-500/30'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-indigo-500/20">
                                          <div className="flex items-center gap-2">
                                            <Box className="w-3.5 h-3.5 text-indigo-400" />
                                            <span className="font-bold text-xs text-indigo-200">
                                              {unitName}
                                            </span>
                                            <div className="flex items-center gap-0.5">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setRenameModal({
                                                    type: 'unit',
                                                    building: bldgName,
                                                    floor: floorName,
                                                    item: unitName,
                                                    currentName: unitName,
                                                    newName: unitName,
                                                  })
                                                }
                                                className="p-1 rounded text-slate-400 hover:text-indigo-300 transition"
                                                title={t('topology_physical_edit')}
                                              >
                                                <Edit2 className="w-2.5 h-2.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setDeleteModal({
                                                    type: 'unit',
                                                    building: bldgName,
                                                    floor: floorName,
                                                    item: unitName,
                                                    deviceCount: unitDevices.length,
                                                  })
                                                }
                                                className="p-1 rounded text-slate-400 hover:text-rose-400 transition"
                                                title={t('topology_physical_delete')}
                                              >
                                                <Trash2 className="w-2.5 h-2.5" />
                                              </button>
                                            </div>
                                          </div>
                                          <span className="text-[10px] text-indigo-300/80 font-mono bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                            {t('topology_devices_in_building', { count: unitDevices.length })}
                                          </span>
                                        </div>

                                        {unitDevices.length === 0 ? (
                                          <div className="p-3 rounded-lg border border-dashed border-indigo-500/30 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                                            <Move className="w-3 h-3 text-indigo-400 opacity-70" />
                                            <span>
                                              {isEn
                                                ? 'Drop devices here to assign to this unit'
                                                : 'برای انتساب به این واحد تجهیزات را اینجا رها کنید'}
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {unitDevices.map((dev) =>
                                              renderDeviceCard(dev, bldgName, floorName, unitName, '')
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Nested Racks Section */}
                            {rackEntries.length > 0 && (
                              <div className="space-y-2 pt-1">
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-300 uppercase tracking-wider">
                                  <Server className="w-3.5 h-3.5 text-cyan-400" />
                                  <span>{t('topology_physical_racks_title')}</span>
                                </div>
                                <div className="grid grid-cols-1 gap-2.5">
                                  {rackEntries.map(([rackName, rackDevices]) => {
                                    const isRackDropHovered =
                                      dragOverTarget?.building === bldgName &&
                                      dragOverTarget?.floor === floorName &&
                                      dragOverTarget?.rack === rackName;

                                    return (
                                      <div
                                        key={rackName}
                                        onDragOver={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          e.dataTransfer.dropEffect = 'move';
                                        }}
                                        onDragEnter={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setDragOverTarget({
                                            building: bldgName,
                                            floor: floorName,
                                            rack: rackName,
                                          });
                                        }}
                                        onDragLeave={(e) => {
                                          e.stopPropagation();
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          if (
                                            e.clientX <= rect.left ||
                                            e.clientX >= rect.right ||
                                            e.clientY <= rect.top ||
                                            e.clientY >= rect.bottom
                                          ) {
                                            setDragOverTarget((prev) =>
                                              prev?.rack === rackName ? null : prev
                                            );
                                          }
                                        }}
                                        onDrop={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          let deviceId = '';
                                          try {
                                            const raw = e.dataTransfer.getData('application/json');
                                            if (raw) {
                                              const parsed = JSON.parse(raw);
                                              deviceId = parsed.deviceId;
                                            }
                                          } catch (err) {}
                                          if (!deviceId) {
                                            deviceId =
                                              e.dataTransfer.getData('text/plain') ||
                                              (draggedDevice ? draggedDevice.id : '');
                                          }

                                          if (deviceId) {
                                            handleMoveDevice(deviceId, bldgName, floorName, '', rackName);
                                          }
                                          setDragOverTarget(null);
                                        }}
                                        className={`p-3 rounded-xl border transition-all duration-200 ${
                                          isRackDropHovered
                                            ? 'bg-slate-950 border-cyan-400 ring-2 ring-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.35)]'
                                            : 'bg-slate-950/60 border-cyan-500/20 hover:border-cyan-500/30'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/20">
                                          <div className="flex items-center gap-2">
                                            <Server className="w-3.5 h-3.5 text-cyan-400" />
                                            <span className="font-bold text-xs text-cyan-200 font-mono">
                                              {rackName}
                                            </span>
                                            <div className="flex items-center gap-0.5">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setRenameModal({
                                                    type: 'rack',
                                                    building: bldgName,
                                                    floor: floorName,
                                                    item: rackName,
                                                    currentName: rackName,
                                                    newName: rackName,
                                                  })
                                                }
                                                className="p-1 rounded text-slate-400 hover:text-cyan-300 transition"
                                                title={t('topology_physical_edit')}
                                              >
                                                <Edit2 className="w-2.5 h-2.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setDeleteModal({
                                                    type: 'rack',
                                                    building: bldgName,
                                                    floor: floorName,
                                                    item: rackName,
                                                    deviceCount: rackDevices.length,
                                                  })
                                                }
                                                className="p-1 rounded text-slate-400 hover:text-rose-400 transition"
                                                title={t('topology_physical_delete')}
                                              >
                                                <Trash2 className="w-2.5 h-2.5" />
                                              </button>
                                            </div>
                                          </div>
                                          <span className="text-[10px] text-cyan-300/80 font-mono bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                                            {t('topology_devices_in_building', { count: rackDevices.length })}
                                          </span>
                                        </div>

                                        {rackDevices.length === 0 ? (
                                          <div className="p-3 rounded-lg border border-dashed border-cyan-500/30 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
                                            <Move className="w-3 h-3 text-cyan-400 opacity-70" />
                                            <span>
                                              {isEn
                                                ? 'Rack empty. Drop devices here to mount in rack.'
                                                : 'رک خالی است. تجهیزات را جهت نصب درون رک اینجا رها کنید.'}
                                            </span>
                                          </div>
                                        ) : (
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {rackDevices.map((dev) =>
                                              renderDeviceCard(dev, bldgName, floorName, '', rackName)
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* General / Standalone Equipment Section */}
                            {(floorData.general.length > 0 || !hasNestedStructures) && (
                              <div className="space-y-2 pt-1">
                                {hasNestedStructures && (
                                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{t('topology_physical_general_title')}</span>
                                  </div>
                                )}

                                {floorData.allDevices.length === 0 ? (
                                  <div
                                    className={`p-4 rounded-xl border border-dashed text-center flex flex-col items-center justify-center gap-1.5 transition-all ${
                                      isFloorDropHovered
                                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                                        : 'border-white/10 text-slate-400 bg-black/10'
                                    }`}
                                  >
                                    <Move className="w-4 h-4 text-cyan-400 opacity-60" />
                                    <span className="text-xs">
                                      {t('topology_physical_dropzone_empty')}
                                    </span>
                                  </div>
                                ) : floorData.general.length > 0 ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {floorData.general.map((device) =>
                                      renderDeviceCard(device, bldgName, floorName)
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Node Detail Slide-out Drawer */}
        {selectedNode && (
          <div className={`w-80 lg:w-96 spatial-glass ${isRtl ? 'border-r' : 'border-l'} border-white/10 p-4 overflow-y-auto flex flex-col z-30 shadow-2xl backdrop-blur-2xl text-slate-100`}>
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
                <span className="text-slate-400">{t('topology_details_realtime_status')}</span>
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
                  {selectedNode.is_online ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-400">{t('topology_details_ip')}</span>
                <span className="text-indigo-300 font-bold">{selectedNode.ip}</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-400">{t('topology_details_latency')}</span>
                <span className="text-slate-200">
                  {selectedNode.is_online ? `${selectedNode.latency_ms || 1.1} ms` : (isEn ? 'Timeout (100% loss)' : 'نامحدود (100% loss)')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t('topology_details_model')}</span>
                <span className="text-slate-200 font-mono text-[11px]">{selectedNode.model}</span>
              </div>
            </div>

            {/* Location Specs */}
            <div className="space-y-1.5 text-xs mb-3">
              <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t('topology_details_location_title')}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 space-y-1.5 text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('topology_details_building')}</span>
                  <span className="font-medium text-white">{selectedNode.building}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('topology_details_floor')}</span>
                  <span className="font-medium text-white">{selectedNode.floor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t('topology_details_unit')}</span>
                  <span className="font-medium text-white">{selectedNode.unit}</span>
                </div>
                {selectedNode.rack && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">{t('topology_details_rack')}</span>
                    <span className="font-mono text-cyan-300 font-bold">{selectedNode.rack}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Protocol Support */}
            <div className="p-3 rounded-xl bg-slate-900/60 border border-white/10 text-xs mb-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t('topology_details_cdp')}</span>
                <span
                  className={
                    selectedNode.cdp_enabled ? 'text-emerald-400 font-medium' : 'text-slate-500'
                  }
                >
                  {selectedNode.cdp_enabled ? (isEn ? 'Active (Cisco CDP v2)' : 'فعال (Cisco CDP v2)') : (isEn ? 'Disabled' : 'غیرفعال')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">{t('topology_details_lldp')}</span>
                <span
                  className={
                    selectedNode.lldp_enabled ? 'text-emerald-400 font-medium' : 'text-slate-500'
                  }
                >
                  {selectedNode.lldp_enabled ? (isEn ? 'Active (IEEE 802.1AB)' : 'فعال (IEEE 802.1AB)') : (isEn ? 'Disabled' : 'غیرفعال')}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-auto pt-3 space-y-2">
              {onConnectTerminal && (selectedNode.type === 'switch' || selectedNode.type === 'router') && (
                <button
                  onClick={() => onConnectTerminal(selectedNode as unknown as Device)}
                  className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-medium text-xs border transition active:scale-98 ${
                    isMikroTikDevice(selectedNode)
                      ? 'bg-cyan-950/70 hover:bg-cyan-900/80 text-cyan-300 border-cyan-500/40 shadow'
                      : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
                  }`}
                >
                  <Terminal className={`w-3.5 h-3.5 ${isMikroTikDevice(selectedNode) ? 'text-cyan-400' : 'text-emerald-400'}`} />
                  <span>
                    {isMikroTikDevice(selectedNode)
                      ? (isEn ? 'Open RouterOS CLI' : 'ترمینال RouterOS')
                      : t('topology_terminal_tooltip')}
                  </span>
                </button>
              )}
              <button
                onClick={() => onInspectPorts(selectedNode as unknown as Device)}
                className={`w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-medium text-xs shadow-lg transition active:scale-98 ${
                  isMikroTikDevice(selectedNode)
                    ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white'
                    : 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white'
                }`}
              >
                <Cable className="w-3.5 h-3.5" />
                <span>
                  {isMikroTikDevice(selectedNode)
                    ? (isEn ? 'Manage MikroTik Device & Ports' : 'مدیریت دیوایس و پورت‌های میکروتیک')
                    : t('topology_view_ports_vlan_btn')}
                </span>
              </button>
            </div>
          </div>
        )}

      {/* Modal 1: Add Floor Modal */}
      {addFloorBuilding && (
        <div
          data-modal-backdrop="true"
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 modal-backdrop-blur"
          onClick={() => setAddFloorBuilding(null)}
        >
          <div
            className="relative w-full max-w-md flex flex-col rounded-2xl bg-slate-900 border border-white/20 text-slate-100 shadow-2xl overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {t('topology_physical_add_floor_btn')}
                  </h3>
                  <p className="text-[11px] text-slate-400">{addFloorBuilding}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddFloorBuilding(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t('topology_physical_new_floor_name')}
                </label>
                <input
                  type="text"
                  value={newFloorInput}
                  onChange={(e) => setNewFloorInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddFloor(addFloorBuilding);
                    }
                  }}
                  placeholder={isEn ? 'e.g. Floor 3, NOC Room, Server Room B' : 'مانند طبقه ۳، اتاق سرور ب، مرکز داده'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  autoFocus
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-950/40 border-t border-white/10">
              <button
                type="button"
                onClick={() => setAddFloorBuilding(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition cursor-pointer"
              >
                {t('topology_physical_cancel_btn')}
              </button>
              <button
                type="button"
                onClick={() => handleAddFloor(addFloorBuilding)}
                disabled={!newFloorInput.trim()}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 transition shadow-lg cursor-pointer"
              >
                {t('topology_physical_create_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Add Building Modal */}
      {showAddBuildingModal && (
        <div
          data-modal-backdrop="true"
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 modal-backdrop-blur"
          onClick={() => setShowAddBuildingModal(false)}
        >
          <div
            className="relative w-full max-w-md flex flex-col rounded-2xl bg-slate-900 border border-white/20 text-slate-100 shadow-2xl overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {t('topology_physical_add_bldg_btn')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isEn ? 'Create a new structural building in network topology' : 'تعریف ساختمان جدید در توپولوژی فیزیکی شبکه'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBuildingModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t('topology_physical_new_bldg_name')}
                </label>
                <input
                  type="text"
                  value={newBuildingInput}
                  onChange={(e) => setNewBuildingInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddBuilding();
                    }
                  }}
                  placeholder={isEn ? 'e.g. Engineering Building, Data Center 2' : 'مانند ساختمان مهندسی، دیتاسنتر ۲، شعبه شرق'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  autoFocus
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-950/40 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowAddBuildingModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition cursor-pointer"
              >
                {t('topology_physical_cancel_btn')}
              </button>
              <button
                type="button"
                onClick={handleAddBuilding}
                disabled={!newBuildingInput.trim()}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 transition shadow-lg cursor-pointer"
              >
                {t('topology_physical_create_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Manual Relocate Modal */}
      {relocateDevice && (
        <div
          data-modal-backdrop="true"
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 modal-backdrop-blur"
          onClick={() => setRelocateDevice(null)}
        >
          <div
            className="relative w-full max-w-lg flex flex-col rounded-2xl bg-slate-900 border border-white/20 text-slate-100 shadow-2xl overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Move className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {t('topology_physical_relocate_modal_title')}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {relocateDevice.name} ({relocateDevice.ip})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRelocateDevice(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Current Placement Banner */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 flex items-center justify-between">
                <span className="text-slate-400">
                  {isEn ? 'Current Location:' : 'موقعیت فعلی:'}
                </span>
                <span className="font-semibold text-indigo-300">
                  {relocateDevice.building || (isEn ? 'Other Buildings' : 'سایر ساختمان‌ها')} &gt; {relocateDevice.floor || (isEn ? 'Unassigned Floor' : 'طبقه نامشخص')}
                </span>
              </div>

              {/* Target Building Selector */}
              <div>
                <label className="block font-medium text-slate-300 mb-1.5">
                  {t('topology_physical_select_target_building')}
                </label>
                <select
                  value={relocateTargetBuilding}
                  onChange={(e) => {
                    setRelocateTargetBuilding(e.target.value);
                    setCustomRelocateBuilding('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                >
                  {allBuildingOptions.map((b) => (
                    <option key={b} value={b} className="bg-slate-900 text-white">
                      {b}
                    </option>
                  ))}
                  <option value="__CUSTOM__" className="bg-slate-900 text-cyan-400">
                    {isEn ? '+ Custom Building...' : '+ ساختمان سفارشی...'}
                  </option>
                </select>

                {relocateTargetBuilding === '__CUSTOM__' && (
                  <input
                    type="text"
                    value={customRelocateBuilding}
                    onChange={(e) => setCustomRelocateBuilding(e.target.value)}
                    placeholder={isEn ? 'Enter custom building name' : 'نام ساختمان سفارشی را وارد کنید'}
                    className="w-full mt-2 px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                )}
              </div>

              {/* Target Floor Selector */}
              <div>
                <label className="block font-medium text-slate-300 mb-1.5">
                  {t('topology_physical_select_target_floor')}
                </label>
                <select
                  value={relocateTargetFloor}
                  onChange={(e) => {
                    setRelocateTargetFloor(e.target.value);
                    setCustomRelocateFloor('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                >
                  {allFloorOptionsForSelectedBuilding.map((f) => (
                    <option key={f} value={f} className="bg-slate-900 text-white">
                      {f}
                    </option>
                  ))}
                  <option value="__CUSTOM__" className="bg-slate-900 text-cyan-400">
                    {isEn ? '+ Custom Floor...' : '+ طبقه سفارشی...'}
                  </option>
                </select>

                {relocateTargetFloor === '__CUSTOM__' && (
                  <input
                    type="text"
                    value={customRelocateFloor}
                    onChange={(e) => setCustomRelocateFloor(e.target.value)}
                    placeholder={isEn ? 'Enter custom floor name' : 'نام طبقه سفارشی را وارد کنید'}
                    className="w-full mt-2 px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                )}
              </div>

              {/* Target Unit / Room Selector */}
              <div>
                <label className="block font-medium text-slate-300 mb-1.5">
                  {t('topology_physical_select_target_unit')}
                </label>
                <select
                  value={relocateTargetUnit}
                  onChange={(e) => {
                    setRelocateTargetUnit(e.target.value);
                    setCustomRelocateUnit('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="__NONE__" className="bg-slate-900 text-slate-400">
                    {isEn ? '-- None / General Floor --' : '-- بدون واحد / فضای عمومی طبقه --'}
                  </option>
                  {allUnitOptionsForSelectedFloor.map((u) => (
                    <option key={u} value={u} className="bg-slate-900 text-white">
                      {u}
                    </option>
                  ))}
                  <option value="__CUSTOM__" className="bg-slate-900 text-indigo-400">
                    {isEn ? '+ Custom Unit / Section...' : '+ بخش یا واحد سفارشی...'}
                  </option>
                </select>

                {relocateTargetUnit === '__CUSTOM__' && (
                  <input
                    type="text"
                    value={customRelocateUnit}
                    onChange={(e) => setCustomRelocateUnit(e.target.value)}
                    placeholder={isEn ? 'Enter unit or room name' : 'نام واحد یا اتاق را وارد کنید'}
                    className="w-full mt-2 px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
                  />
                )}
              </div>

              {/* Target Rack Selector */}
              <div>
                <label className="block font-medium text-slate-300 mb-1.5">
                  {t('topology_physical_select_target_rack')}
                </label>
                <select
                  value={relocateTargetRack}
                  onChange={(e) => {
                    setRelocateTargetRack(e.target.value);
                    setCustomRelocateRack('');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="__NONE__" className="bg-slate-900 text-slate-400">
                    {isEn ? '-- None / Standalone Equipment --' : '-- بدون رک / تجهیزات آزاد --'}
                  </option>
                  {allRackOptionsForSelectedFloor.map((r) => (
                    <option key={r} value={r} className="bg-slate-900 text-white">
                      {r}
                    </option>
                  ))}
                  <option value="__CUSTOM__" className="bg-slate-900 text-cyan-400">
                    {isEn ? '+ Custom Rack...' : '+ رک سفارشی...'}
                  </option>
                </select>

                {relocateTargetRack === '__CUSTOM__' && (
                  <input
                    type="text"
                    value={customRelocateRack}
                    onChange={(e) => setCustomRelocateRack(e.target.value)}
                    placeholder={isEn ? 'e.g. Rack-A1, Server Cabinet' : 'مانند رک اصلی، کابینت سرور ۱'}
                    className="w-full mt-2 px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-950/40 border-t border-white/10">
              <button
                type="button"
                onClick={() => setRelocateDevice(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition cursor-pointer"
              >
                {t('topology_physical_cancel_btn')}
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalBldg =
                    relocateTargetBuilding === '__CUSTOM__'
                      ? customRelocateBuilding.trim()
                      : relocateTargetBuilding;
                  const finalFloor =
                    relocateTargetFloor === '__CUSTOM__'
                      ? customRelocateFloor.trim()
                      : relocateTargetFloor;
                  const finalUnit =
                    relocateTargetUnit === '__CUSTOM__'
                      ? customRelocateUnit.trim()
                      : relocateTargetUnit === '__NONE__'
                      ? ''
                      : relocateTargetUnit;
                  const finalRack =
                    relocateTargetRack === '__CUSTOM__'
                      ? customRelocateRack.trim()
                      : relocateTargetRack === '__NONE__'
                      ? ''
                      : relocateTargetRack;

                  if (finalBldg && finalFloor && relocateDevice) {
                    handleMoveDevice(relocateDevice.id, finalBldg, finalFloor, finalUnit, finalRack);
                    setRelocateDevice(null);
                  }
                }}
                disabled={
                  (relocateTargetBuilding === '__CUSTOM__' && !customRelocateBuilding.trim()) ||
                  (relocateTargetFloor === '__CUSTOM__' && !customRelocateFloor.trim()) ||
                  (relocateTargetUnit === '__CUSTOM__' && !customRelocateUnit.trim()) ||
                  (relocateTargetRack === '__CUSTOM__' && !customRelocateRack.trim()) ||
                  !relocateTargetBuilding ||
                  !relocateTargetFloor
                }
                className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 transition shadow-lg cursor-pointer"
              >
                {t('topology_physical_confirm_relocate')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Add Unit Modal */}
      {addUnitModal && (
        <div
          data-modal-backdrop="true"
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 modal-backdrop-blur"
          onClick={() => setAddUnitModal(null)}
        >
          <div
            className="relative w-full max-w-md flex flex-col rounded-2xl bg-slate-900 border border-white/20 text-slate-100 shadow-2xl overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {t('topology_physical_add_unit_btn')}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {addUnitModal.building} &gt; {addUnitModal.floor}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddUnitModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t('topology_physical_new_unit_name')}
                </label>
                <input
                  type="text"
                  value={newUnitInput}
                  onChange={(e) => setNewUnitInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newUnitInput.trim()) {
                      handleAddUnit(addUnitModal.building, addUnitModal.floor, newUnitInput);
                    }
                  }}
                  placeholder={isEn ? 'e.g. IT Department, Server Room 102, Finance' : 'مانند واحد فناوری اطلاعات، اتاق سرور ۱۰۲، مالی'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-950/40 border-t border-white/10">
              <button
                type="button"
                onClick={() => setAddUnitModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition cursor-pointer"
              >
                {t('topology_physical_cancel_btn')}
              </button>
              <button
                type="button"
                onClick={() => handleAddUnit(addUnitModal.building, addUnitModal.floor, newUnitInput)}
                disabled={!newUnitInput.trim()}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 disabled:opacity-40 transition shadow-lg cursor-pointer"
              >
                {t('topology_physical_create_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Add Rack Modal */}
      {addRackModal && (
        <div
          data-modal-backdrop="true"
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 modal-backdrop-blur"
          onClick={() => setAddRackModal(null)}
        >
          <div
            className="relative w-full max-w-md flex flex-col rounded-2xl bg-slate-900 border border-white/20 text-slate-100 shadow-2xl overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {t('topology_physical_add_rack_btn')}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {addRackModal.building} &gt; {addRackModal.floor}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddRackModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t('topology_physical_new_rack_name')}
                </label>
                <input
                  type="text"
                  value={newRackInput}
                  onChange={(e) => setNewRackInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newRackInput.trim()) {
                      handleAddRack(addRackModal.building, addRackModal.floor, newRackInput);
                    }
                  }}
                  placeholder={isEn ? 'e.g. Rack-A1, 42U-Core-Rack, Distribution-B' : 'مانند رک اصلی سرور، Rack-A1، رک توزیع طبقه'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-950/40 border-t border-white/10">
              <button
                type="button"
                onClick={() => setAddRackModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition cursor-pointer"
              >
                {t('topology_physical_cancel_btn')}
              </button>
              <button
                type="button"
                onClick={() => handleAddRack(addRackModal.building, addRackModal.floor, newRackInput)}
                disabled={!newRackInput.trim()}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 transition shadow-lg cursor-pointer"
              >
                {t('topology_physical_create_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Rename Entity Modal (Building, Floor, Unit, Rack) */}
      {renameModal && (
        <div
          data-modal-backdrop="true"
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 modal-backdrop-blur"
          onClick={() => setRenameModal(null)}
        >
          <div
            className="relative w-full max-w-md flex flex-col rounded-2xl bg-slate-900 border border-white/20 text-slate-100 shadow-2xl overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-800/60">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {t('topology_physical_rename_modal_title')}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {renameModal.type.toUpperCase()}: {renameModal.currentName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRenameModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {t('topology_physical_new_name_label')}
                </label>
                <input
                  type="text"
                  value={renameModal.newName}
                  onChange={(e) =>
                    setRenameModal({ ...renameModal, newName: e.target.value })
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && renameModal.newName.trim()) {
                      handleRenameSubmit();
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-white/15 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-950/40 border-t border-white/10">
              <button
                type="button"
                onClick={() => setRenameModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition cursor-pointer"
              >
                {t('topology_physical_cancel_btn')}
              </button>
              <button
                type="button"
                onClick={handleRenameSubmit}
                disabled={!renameModal.newName.trim()}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 transition shadow-lg cursor-pointer"
              >
                {t('topology_physical_save_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 7: Delete Entity Confirmation Modal */}
      {deleteModal && (
        <div
          data-modal-backdrop="true"
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 modal-backdrop-blur"
          onClick={() => setDeleteModal(null)}
        >
          <div
            className="relative w-full max-w-md flex flex-col rounded-2xl bg-slate-900 border border-rose-500/30 text-slate-100 shadow-2xl overflow-hidden my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-rose-500/20 bg-rose-950/40">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {t('topology_physical_delete_modal_title')}
                  </h3>
                  <p className="text-[11px] text-rose-300/80 font-mono">
                    {deleteModal.type.toUpperCase()}: {deleteModal.item || deleteModal.building}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-slate-200">
                {t('topology_physical_delete_confirm', {
                  name: deleteModal.item || deleteModal.building,
                })}
              </p>
              {deleteModal.deviceCount > 0 && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    {t('topology_physical_delete_warning', { count: deleteModal.deviceCount })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-slate-950/40 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition cursor-pointer"
              >
                {t('topology_physical_cancel_btn')}
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 transition shadow-lg cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t('topology_physical_delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals for Custom Topology Maps */}
      {isPortSelectorOpen && (
        <CustomMapPortSelectorModal
          isOpen={isPortSelectorOpen}
          onClose={() => {
            setIsPortSelectorOpen(false);
            if (cableWorkflow.step === 'select_source_port') {
              setCableWorkflow({ step: 'idle', sourceDevice: null, sourcePort: null, targetDevice: null, targetPort: null });
            }
          }}
          device={
            cableWorkflow.step === 'select_target_port'
              ? cableWorkflow.targetDevice
              : cableWorkflow.sourceDevice
          }
          side={cableWorkflow.step === 'select_target_port' ? 'target' : 'source'}
          partnerDevice={cableWorkflow.step === 'select_target_port' ? cableWorkflow.sourceDevice : null}
          partnerPort={cableWorkflow.step === 'select_target_port' ? cableWorkflow.sourcePort : null}
          customMapLinks={currentCustomMap?.links || []}
          allDevices={allAvailableDevices}
          onDisconnectLink={handleDeleteLinkDirectly}
          onSelectPort={handleSelectPort}
        />
      )}

      {/* Confirmation Modal for Disconnecting Cable Link */}
      {linkToDelete && (
        <div
          className="fixed inset-0 z-[100005] flex items-center justify-center p-4 modal-backdrop-blur"
          data-modal-backdrop="true"
          dir={isRtl ? 'rtl' : 'ltr'}
          onClick={() => setLinkToDelete(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-slate-800 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isEn ? 'Disconnect Cable Connection' : 'قطع ارتباط و حذف کابل شبکه'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isEn ? 'Confirm link removal from network topology' : 'تایید قطع اتصال و حذف کابل از توپولوژی شبکه'}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs font-mono space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isEn ? 'Source Device:' : 'دستگاه مبدا:'}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {getDeviceNameById(linkToDelete.sourceDeviceId)} ({linkToDelete.sourcePort})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">{isEn ? 'Destination Device:' : 'دستگاه مقصد:'}</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">
                  {getDeviceNameById(linkToDelete.targetDeviceId)} ({linkToDelete.targetPort})
                </span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 dark:border-slate-750">
                <span className="text-slate-500 dark:text-slate-400">{isEn ? 'Cable Specs:' : 'مشخصات کابل:'}</span>
                <span className="text-slate-700 dark:text-slate-300">
                  {linkToDelete.speed || '1G'} • {linkToDelete.cableType?.toUpperCase() || 'COPPER'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              {isEn
                ? 'Are you sure you want to disconnect this cable? The connection will be removed from this topology map.'
                : 'آیا از قطع ارتباط این کابل اطمینان دارید؟ این ارتباط از نقشه توپولوژی حذف خواهد شد.'}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setLinkToDelete(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium text-xs cursor-pointer"
              >
                {isEn ? 'Cancel' : 'انصراف'}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteLinkDirectly(linkToDelete.id);
                  setLinkToDelete(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isEn ? 'Yes, Disconnect Link' : 'بله، قطع ارتباط و حذف'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isLinkConfigOpen && cableWorkflow.sourceDevice && cableWorkflow.targetDevice && (
        <CustomMapLinkConfigModal
          isOpen={isLinkConfigOpen}
          onClose={() => {
            setIsLinkConfigOpen(false);
            setCableWorkflow({
              step: 'idle',
              sourceDevice: null,
              sourcePort: null,
              targetDevice: null,
              targetPort: null,
              editingLink: null,
            });
          }}
          sourceDevice={cableWorkflow.sourceDevice}
          targetDevice={cableWorkflow.targetDevice}
          sourcePort={cableWorkflow.sourcePort || 'GigabitEthernet0/1'}
          targetPort={cableWorkflow.targetPort || 'GigabitEthernet0/1'}
          sourceInitialData={cableWorkflow.sourceInitialPortData}
          sourceInitialPortData={cableWorkflow.sourceInitialPortData}
          targetInitialData={cableWorkflow.targetInitialPortData}
          targetInitialPortData={cableWorkflow.targetInitialPortData}
          existingLink={cableWorkflow.editingLink || undefined}
          onSave={handleSaveCustomLink}
          onSaveLink={handleSaveCustomLink}
          onDelete={cableWorkflow.editingLink ? handleDeleteCustomLink : undefined}
          onDeleteLink={cableWorkflow.editingLink ? handleDeleteCustomLink : undefined}
        />
      )}

      {isAddDeviceOpen && currentCustomMap && (
        <CustomMapAddDeviceModal
          isOpen={isAddDeviceOpen}
          onClose={() => setIsAddDeviceOpen(false)}
          availableDevices={allAvailableDevices}
          existingDeviceIds={currentCustomMap.deviceIds || []}
          racks={currentCustomMap.racks || []}
          onAddDevice={handleAddDeviceToCustomMap}
        />
      )}

      {isManageMapOpen && (
        <CustomMapManageModal
          isOpen={isManageMapOpen}
          onClose={() => setIsManageMapOpen(false)}
          mode={manageMapMode}
          currentMap={manageMapMode !== 'create' ? currentCustomMap || undefined : undefined}
          onCreateMap={handleCreateCustomMap}
          onUpdateMap={handleUpdateCustomMap}
          onDeleteMap={handleDeleteCustomMap}
        />
      )}

      {/* Rack & Hardware Studio Modals */}
      {isAddRackOpen && currentCustomMap && (
        <AddRackModal
          isOpen={isAddRackOpen}
          onClose={() => setIsAddRackOpen(false)}
          onAddRack={handleCreateCustomMapRack}
        />
      )}

      {isAddHardwareOpen && currentCustomMap && (
        <AddHardwareModal
          isOpen={isAddHardwareOpen}
          onClose={() => {
            setIsAddHardwareOpen(false);
            setEditingHardwareDevice(null);
          }}
          racks={currentCustomMap.racks || []}
          defaultRackId={selectedRackForHardware}
          defaultTargetU={targetUForHardware}
          editingDevice={editingHardwareDevice}
          onSaveHardware={handleSaveHardware}
          inventoryDevices={allAvailableDevices}
        />
      )}

      {inspectingRack && (
        <RackElevationInspectorModal
          isOpen={!!inspectingRack}
          onClose={() => setInspectingRack(null)}
          rack={inspectingRack}
          onToggleViewMode={handleToggleRackViewMode}
          onOpenAddHardware={handleOpenAddHardware}
          onEditDeviceNic={handleEditDeviceNic}
          onEditSpecs={handleEditDeviceSpecs}
          onEditDeviceProperties={handleEditDeviceProperties}
          onConnectTerminal={handleConnectTerminalFromRack}
          onInspectPorts={handleInspectPortsFromRack}
          onPromptRemoveDevice={handlePromptRemoveHardwareDevice}
          onMoveDevice={handleMoveDeviceInRack}
          onRemoveDevice={handleRemoveDeviceFromRack}
          onDeleteRack={handleDeleteRack}
        />
      )}

      {/* Network Equipment Inventory - Edit Device Properties Modal */}
      {editingInventoryDevice && (
        <EditDeviceModal
          isOpen={!!editingInventoryDevice}
          device={editingInventoryDevice}
          onClose={() => setEditingInventoryDevice(null)}
          onSave={handleSaveInventoryDevice}
        />
      )}

      {/* Safe Deletion Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteModalTarget}
        onClose={() => setDeleteModalTarget(null)}
        target={deleteModalTarget}
        onConfirmDeleteDevice={handleConfirmDeleteDevice}
        onConfirmDeleteRack={handleConfirmDeleteRack}
      />
      </div>
    </div>
  );
};
