import React, { useState, useEffect, useMemo } from 'react';
import {
  CustomTopologyRack,
  HardwareCategory,
  MountedHardwareDevice,
  NetworkCardConfig,
  NetworkPortType,
  Device,
  TopologyNode,
} from '../../types';
import { HARDWARE_CATEGORIES, HARDWARE_CATALOG, HardwareCatalogTemplate } from '../../data/hardwareCatalog';
import { HardwareSvgRenderer } from './HardwareSvgRenderer';
import { convertNodeToHardwareDevice } from './PhysicalNodeOnCanvas';
import {
  X,
  Check,
  Server,
  Plus,
  Trash2,
  Network,
  Layers,
  Eye,
  EyeOff,
  AlertTriangle,
  Sparkles,
  Zap,
  BatteryCharging,
  Boxes,
  Search,
  Router as RouterIcon,
  Wifi,
  Shield,
  Building2,
} from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface AddHardwareModalProps {
  isOpen: boolean;
  onClose: () => void;
  racks: CustomTopologyRack[];
  defaultRackId?: string;
  defaultTargetU?: number;
  editingDevice?: MountedHardwareDevice | null;
  onSaveHardware: (rackId: string, device: MountedHardwareDevice) => void;
  inventoryDevices?: Device[];
}

const PORT_TYPES: NetworkPortType[] = [
  '1GbE RJ45',
  '10GbE RJ45',
  '10G SFP+',
  '25G SFP28',
  '40G QSFP+',
  '100G QSFP28',
  '8G FC',
  '16G FC',
  '32G FC',
];

export const AddHardwareModal: React.FC<AddHardwareModalProps> = ({
  isOpen,
  onClose,
  racks,
  defaultRackId,
  defaultTargetU,
  editingDevice,
  onSaveHardware,
  inventoryDevices = [],
}) => {
  const { t, isEn, isRtl } = useLanguage();

  const [sourceMode, setSourceMode] = useState<'inventory' | 'catalog'>(() => {
    return inventoryDevices.length > 0 && !editingDevice ? 'inventory' : 'catalog';
  });
  const [selectedInventoryDeviceId, setSelectedInventoryDeviceId] = useState<string | null>(null);
  const [inventorySearch, setInventorySearch] = useState('');
  const [catalogSearch, setCatalogSearch] = useState('');

  const [activeCategory, setActiveCategory] = useState<HardwareCategory>('hpe_server');
  const [selectedTemplate, setSelectedTemplate] = useState<HardwareCatalogTemplate>(HARDWARE_CATALOG[0]);
  const [selectedGeneration, setSelectedGeneration] = useState<string>('Gen10');
  const [targetRackId, setTargetRackId] = useState<string>(defaultRackId || (racks[0]?.id ?? ''));
  const [targetU, setTargetU] = useState<number>(defaultTargetU || 1);
  const [customName, setCustomName] = useState<string>('');
  const [previewViewMode, setPreviewViewMode] = useState<'front' | 'rear'>('front');

  // Power and PDU state
  const [powerSupplyCount, setPowerSupplyCount] = useState<number>(2);
  const [powerWatts, setPowerWatts] = useState<number>(500);
  const [pduOutletsCount, setPduOutletsCount] = useState<number>(8);
  const [pduOutletType, setPduOutletType] = useState<string>('IEC C13');
  const [pduAmperage, setPduAmperage] = useState<number>(16);

  // Network cards state
  const [networkCards, setNetworkCards] = useState<NetworkCardConfig[]>([]);

  // Selected Rack Info
  const currentRack = useMemo(() => {
    return racks.find((r) => r.id === targetRackId) || racks[0];
  }, [racks, targetRackId]);

  // Helper function: check slot collision in target rack
  const getCollision = (rack: CustomTopologyRack | undefined, uStart: number, heightU: number, excludeDevId?: string) => {
    if (!rack) return null;
    const uEnd = uStart + heightU - 1;
    if (uStart < 1 || uEnd > rack.units) {
      return {
        hasCollision: true,
        outOfBounds: true,
        message: isEn
          ? `Slot U${uStart}-U${uEnd} exceeds rack capacity (${rack.units}U)!`
          : `موقعیت U${uStart} تا U${uEnd} خارج از ظرفیت رک (${rack.units}U) است!`,
      };
    }
    for (const dev of rack.devices) {
      if (excludeDevId && dev.id === excludeDevId) continue;
      const devStart = dev.startU;
      const devEnd = dev.startU + dev.heightU - 1;
      if (Math.max(uStart, devStart) <= Math.min(uEnd, devEnd)) {
        return {
          hasCollision: true,
          outOfBounds: false,
          collidingDevice: dev,
          message: isEn
            ? `Slot U${uStart}-U${uEnd} is occupied by "${dev.name}" (U${devStart}-U${devEnd})!`
            : `فضای انتخابی U${uStart} تا U${uEnd} توسط تجهیز «${dev.name}» (U${devStart} تا U${devEnd}) اشغال شده است!`,
        };
      }
    }
    return null;
  };

  // Helper function: find lowest free contiguous slot of heightU
  const findFirstFreeSlot = (rack: CustomTopologyRack | undefined, heightU: number, excludeDevId?: string): number | null => {
    if (!rack) return null;
    for (let u = 1; u <= rack.units - heightU + 1; u++) {
      const col = getCollision(rack, u, heightU, excludeDevId);
      if (!col) return u;
    }
    return null;
  };

  // Active collision status
  const currentCollision = useMemo(() => {
    return getCollision(currentRack, targetU, selectedTemplate.heightU, editingDevice?.id);
  }, [currentRack, targetU, selectedTemplate.heightU, editingDevice]);

  // Filtered inventory devices
  const filteredInventoryDevices = useMemo(() => {
    const q = inventorySearch.toLowerCase().trim();
    if (!q) return inventoryDevices;
    return inventoryDevices.filter((d) => {
      return (
        d.name.toLowerCase().includes(q) ||
        d.ip.toLowerCase().includes(q) ||
        (d.model && d.model.toLowerCase().includes(q)) ||
        (d.vendor && d.vendor.toLowerCase().includes(q)) ||
        (d.building && d.building.toLowerCase().includes(q)) ||
        (d.type && d.type.toLowerCase().includes(q))
      );
    });
  }, [inventoryDevices, inventorySearch]);

  const selectedInventoryDevice = useMemo(() => {
    if (!selectedInventoryDeviceId) return null;
    return inventoryDevices.find((d) => d.id === selectedInventoryDeviceId) || null;
  }, [inventoryDevices, selectedInventoryDeviceId]);

  // Filtered hardware catalog templates based on search query or active category
  const filteredCatalogTemplates = useMemo(() => {
    const q = catalogSearch.toLowerCase().trim();
    if (!q) {
      return HARDWARE_CATALOG.filter((t) => t.category === activeCategory);
    }
    return HARDWARE_CATALOG.filter((t) => {
      const modelMatch = (t.model || '').toLowerCase().includes(q);
      const brandMatch = (t.brand || '').toLowerCase().includes(q);
      const descFaMatch = (t.description_fa || '').toLowerCase().includes(q);
      const descEnMatch = (t.description_en || '').toLowerCase().includes(q);
      const catMatch = (t.category || '').toLowerCase().includes(q);
      return modelMatch || brandMatch || descFaMatch || descEnMatch || catMatch;
    });
  }, [catalogSearch, activeCategory]);

  // Select an inventory device and automatically configure its physical profile
  const handleSelectInventoryDevice = (dev: Device) => {
    setSelectedInventoryDeviceId(dev.id);
    const hw = convertNodeToHardwareDevice(dev as unknown as TopologyNode);
    setActiveCategory(hw.category);

    const matchingTemplate: HardwareCatalogTemplate = {
      id: `inv-tpl-${dev.id}`,
      brand: hw.brand,
      model: hw.model,
      category: hw.category,
      heightU: hw.heightU,
      defaultGeneration: 'Standard',
      generations: ['Standard'],
      description_fa: `${dev.name} (${dev.ip}) - تجهیز انبار شبکه`,
      description_en: `${dev.name} (${dev.ip}) - Network Equipment Inventory`,
      defaultPowerWatts: hw.category.includes('server') ? 550 : hw.category.includes('router') ? 120 : 220,
      defaultPowerSupplyCount: hw.category.includes('server') ? 2 : 1,
      defaultNetworkCards: hw.networkCards.map((c) => ({
        name: c.name,
        portCount: c.portCount,
        portType: c.portType,
        slot: c.slot,
      })),
    };

    setSelectedTemplate(matchingTemplate);
    setSelectedGeneration('Standard');
    setCustomName(dev.name);
    setNetworkCards(hw.networkCards);
    setPowerSupplyCount(matchingTemplate.defaultPowerSupplyCount || 1);
    setPowerWatts(matchingTemplate.defaultPowerWatts);

    // Pick first free slot in target rack for this device height
    const chosenRack = racks.find((r) => r.id === targetRackId) || racks[0];
    const freeSlot = findFirstFreeSlot(chosenRack, hw.heightU);
    if (freeSlot !== null) {
      setTargetU(freeSlot);
    }
  };

  // Initialize form state
  useEffect(() => {
    if (editingDevice) {
      setActiveCategory(editingDevice.category);
      const tpl =
        HARDWARE_CATALOG.find((t) => t.category === editingDevice.category && t.model === editingDevice.model) ||
        HARDWARE_CATALOG[0];
      setSelectedTemplate(tpl);
      setSelectedGeneration(editingDevice.generation || tpl.defaultGeneration || '');
      setCustomName(editingDevice.name);
      setTargetU(editingDevice.startU);
      setNetworkCards(editingDevice.networkCards || []);
      setPowerSupplyCount(editingDevice.powerSupplyCount ?? (tpl.defaultPowerSupplyCount ?? 2));
      setPowerWatts(editingDevice.powerWatts ?? tpl.defaultPowerWatts);
      setPduOutletsCount(editingDevice.pduOutletsCount ?? (tpl.defaultPduOutlets ?? 8));
      setPduOutletType(editingDevice.pduOutletType ?? (tpl.defaultPduOutletType ?? 'IEC C13'));
      setPduAmperage(editingDevice.pduAmperage ?? (tpl.defaultPduAmperage ?? 16));
      if (defaultRackId) setTargetRackId(defaultRackId);
    } else {
      if (inventoryDevices.length > 0 && !selectedInventoryDeviceId) {
        handleSelectInventoryDevice(inventoryDevices[0]);
      } else {
        const tpl = HARDWARE_CATALOG.find((t) => t.category === activeCategory) || HARDWARE_CATALOG[0];
        setSelectedTemplate(tpl);
        setSelectedGeneration(tpl.defaultGeneration || tpl.generations?.[0] || '');
        setCustomName(`${tpl.brand} ${tpl.model}`);
        setPowerWatts(tpl.defaultPowerWatts);
        setPowerSupplyCount(tpl.defaultPowerSupplyCount ?? (tpl.category.includes('server') || tpl.category.includes('storage') ? 2 : tpl.category.includes('panel') || tpl.category.includes('cable') || tpl.category === 'blank_panel' ? 0 : 1));
        setPduOutletsCount(tpl.defaultPduOutlets ?? 8);
        setPduOutletType(tpl.defaultPduOutletType ?? 'IEC C13');
        setPduAmperage(tpl.defaultPduAmperage ?? 16);

        const chosenRack = racks.find((r) => r.id === (defaultRackId || racks[0]?.id)) || racks[0];
        if (defaultRackId) setTargetRackId(defaultRackId);

        let initialU = defaultTargetU || 1;
        const collisionCheck = getCollision(chosenRack, initialU, tpl.heightU);
        if (collisionCheck) {
          const freeSlot = findFirstFreeSlot(chosenRack, tpl.heightU);
          if (freeSlot !== null) initialU = freeSlot;
        }
        setTargetU(initialU);

        setNetworkCards(
          tpl.defaultNetworkCards.map((c, i) => ({
            id: `nic-${Date.now()}-${i}`,
            name: c.name,
            portCount: c.portCount,
            portType: c.portType,
            slot: c.slot,
          }))
        );
      }
    }
  }, [editingDevice, defaultRackId, defaultTargetU, isOpen]);

  // When changing category in add mode
  const handleCategoryChange = (cat: HardwareCategory) => {
    setActiveCategory(cat);
    const tpls = HARDWARE_CATALOG.filter((t) => t.category === cat);
    if (tpls.length > 0) {
      const tpl = tpls[0];
      setSelectedTemplate(tpl);
      setSelectedGeneration(tpl.defaultGeneration || tpl.generations?.[0] || '');
      setCustomName(`${tpl.brand} ${tpl.model}`);
      setPowerWatts(tpl.defaultPowerWatts);
      setPowerSupplyCount(tpl.defaultPowerSupplyCount ?? (tpl.category.includes('server') || tpl.category.includes('storage') ? 2 : tpl.category.includes('panel') || tpl.category.includes('cable') || tpl.category === 'blank_panel' ? 0 : 1));
      setPduOutletsCount(tpl.defaultPduOutlets ?? 8);
      setPduOutletType(tpl.defaultPduOutletType ?? 'IEC C13');
      setPduAmperage(tpl.defaultPduAmperage ?? 16);
      setNetworkCards(
        tpl.defaultNetworkCards.map((c, i) => ({
          id: `nic-${Date.now()}-${i}`,
          name: c.name,
          portCount: c.portCount,
          portType: c.portType,
          slot: c.slot,
        }))
      );

      // Check collision with current targetU
      const col = getCollision(currentRack, targetU, tpl.heightU, editingDevice?.id);
      if (col) {
        const freeU = findFirstFreeSlot(currentRack, tpl.heightU, editingDevice?.id);
        if (freeU !== null) setTargetU(freeU);
      }
    }
  };

  // When changing template
  const handleTemplateChange = (tpl: HardwareCatalogTemplate) => {
    setSelectedTemplate(tpl);
    setSelectedGeneration(tpl.defaultGeneration || tpl.generations?.[0] || '');
    setCustomName(`${tpl.brand} ${tpl.model}`);
    setPowerWatts(tpl.defaultPowerWatts);
    setPowerSupplyCount(tpl.defaultPowerSupplyCount ?? (tpl.category.includes('server') || tpl.category.includes('storage') ? 2 : tpl.category.includes('panel') || tpl.category.includes('cable') || tpl.category === 'blank_panel' ? 0 : 1));
    setPduOutletsCount(tpl.defaultPduOutlets ?? 8);
    setPduOutletType(tpl.defaultPduOutletType ?? 'IEC C13');
    setPduAmperage(tpl.defaultPduAmperage ?? 16);
    setNetworkCards(
      tpl.defaultNetworkCards.map((c, i) => ({
        id: `nic-${Date.now()}-${i}`,
        name: c.name,
        portCount: c.portCount,
        portType: c.portType,
        slot: c.slot,
      }))
    );

    const col = getCollision(currentRack, targetU, tpl.heightU, editingDevice?.id);
    if (col) {
      const freeU = findFirstFreeSlot(currentRack, tpl.heightU, editingDevice?.id);
      if (freeU !== null) setTargetU(freeU);
    }
  };

  // Add a new network card
  const handleAddNic = () => {
    const newIdx = networkCards.length + 1;
    const newCard: NetworkCardConfig = {
      id: `nic-${Date.now()}-${Math.random()}`,
      name: `PCIe NIC ${newIdx}`,
      portCount: 2,
      portType: '10G SFP+',
      slot: `Slot ${newIdx}`,
    };
    setNetworkCards([...networkCards, newCard]);
  };

  // Remove a network card
  const handleRemoveNic = (nicId: string) => {
    setNetworkCards(networkCards.filter((c) => c.id !== nicId));
  };

  // Update a network card field
  const handleUpdateNic = (nicId: string, field: keyof NetworkCardConfig, value: any) => {
    setNetworkCards(
      networkCards.map((c) => (c.id === nicId ? { ...c, [field]: value } : c))
    );
  };

  if (!isOpen) return null;

  // Auto-find slot action
  const handleAutoFindSlot = () => {
    const freeU = findFirstFreeSlot(currentRack, selectedTemplate.heightU, editingDevice?.id);
    if (freeU !== null) {
      setTargetU(freeU);
    }
  };

  // Temporary device object for live preview
  const previewDevice: MountedHardwareDevice = {
    id: editingDevice ? editingDevice.id : 'preview-dev',
    name: customName || selectedTemplate.model,
    category: selectedTemplate.category,
    brand: selectedTemplate.brand,
    model: selectedTemplate.model,
    generation: selectedGeneration,
    heightU: selectedTemplate.heightU,
    startU: targetU,
    networkCards,
    powerWatts,
    powerSupplyCount,
    pduOutletsCount: selectedTemplate.category === 'pdu' ? pduOutletsCount : undefined,
    pduOutletType: selectedTemplate.category === 'pdu' ? pduOutletType : undefined,
    pduAmperage: selectedTemplate.category === 'pdu' ? pduAmperage : undefined,
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRackId || currentCollision) return;

    let chosenDevId: string;
    if (editingDevice) {
      chosenDevId = editingDevice.id;
    } else if (sourceMode === 'inventory' && selectedInventoryDevice) {
      const baseId = selectedInventoryDevice.id.startsWith('hw-')
        ? selectedInventoryDevice.id
        : `hw-${selectedInventoryDevice.id}`;
      const targetRack = racks.find((r) => r.id === targetRackId);
      const alreadyHas = targetRack?.devices.some((d) => d.id === baseId);
      chosenDevId = alreadyHas ? `${baseId}-${Date.now()}` : baseId;
    } else {
      // Catalog device: ALWAYS unique ID!
      chosenDevId = `hw-cat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }

    const deviceToSave: MountedHardwareDevice = {
      id: chosenDevId,
      name: customName.trim() || `${selectedTemplate.brand} ${selectedTemplate.model}`,
      category: selectedTemplate.category,
      brand: selectedTemplate.brand,
      model: selectedTemplate.model,
      generation: selectedGeneration,
      heightU: selectedTemplate.heightU,
      startU: Math.max(1, Math.min(targetU, (currentRack?.units || 44) - selectedTemplate.heightU + 1)),
      networkCards,
      powerWatts,
      powerSupplyCount,
      ip: sourceMode === 'inventory' ? selectedInventoryDevice?.ip : editingDevice?.ip,
      pduOutletsCount: selectedTemplate.category === 'pdu' ? pduOutletsCount : undefined,
      pduOutletType: selectedTemplate.category === 'pdu' ? pduOutletType : undefined,
      pduAmperage: selectedTemplate.category === 'pdu' ? pduAmperage : undefined,
    };

    onSaveHardware(targetRackId, deviceToSave);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:py-8 bg-black/85 backdrop-blur-md animate-fade-in"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        className="w-full max-w-4xl max-h-[82vh] rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col text-slate-100 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {editingDevice
                  ? isEn
                    ? 'Edit Hardware Specifications & Network Cards'
                    : 'ویرایش و تنظیم کارت‌های شبکه تجهیز'
                  : isEn
                  ? 'Add Hardware Device to Rack'
                  : 'افزودن تجهیز سخت‌افزاری به رک'}
              </h3>
              <p className="text-xs text-slate-400">
                {isEn
                  ? 'Select from inventory equipment or catalog templates to mount into rack'
                  : 'انتخاب از تجهیزات انبار شبکه یا کاتالوگ استاندارد جهت جانمایی و نصب در رک'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Hardware Source Toggle (Inventory vs Catalog) */}
          {!editingDevice && (
            <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-200">
                  {isEn ? 'Hardware Source Selection:' : 'منبع انتخاب تجهیز سخت‌افزاری:'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSourceMode('inventory');
                    if (!selectedInventoryDeviceId && inventoryDevices.length > 0) {
                      handleSelectInventoryDevice(inventoryDevices[0]);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    sourceMode === 'inventory'
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>
                    {isEn
                      ? `Inventory Equipment (${inventoryDevices.length})`
                      : `تجهیزات انبار شبکه (${inventoryDevices.length})`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSourceMode('catalog');
                    setSelectedInventoryDeviceId(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    sourceMode === 'catalog'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Hardware Catalog' : 'کاتالوگ مدل‌های استاندارد'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Source Mode 1: Network Equipment Inventory Selection */}
          {!editingDevice && sourceMode === 'inventory' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    {isEn
                      ? 'Select Equipment from Inventory to Mount in Rack:'
                      : 'انتخاب تجهیز از انبار جهت جانمایی و نصب در رک:'}
                  </span>
                </label>
                <div className="relative min-w-[200px]">
                  <input
                    type="text"
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    placeholder={isEn ? 'Filter by name, IP, model...' : 'فیلتر نام، آی‌پی، مدل...'}
                    className="w-full px-3 py-1.5 pl-8 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-cyan-500"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {filteredInventoryDevices.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-950/40 rounded-2xl border border-slate-800">
                  {isEn
                    ? 'No inventory equipment found matching filter.'
                    : 'هیچ تجهیزی مطابق با جستجو در انبار یافت نشد.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1 scrollbar-thin">
                  {filteredInventoryDevices.map((dev) => {
                    const isSelected = selectedInventoryDeviceId === dev.id;
                    const hw = convertNodeToHardwareDevice(dev as unknown as TopologyNode);

                    return (
                      <div
                        key={dev.id}
                        onClick={() => handleSelectInventoryDevice(dev)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between gap-2.5 ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-400 ring-2 ring-cyan-500/40 shadow-lg shadow-cyan-950/50'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-mono font-bold text-xs text-white truncate max-w-[150px]">
                              {dev.name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                              {hw.heightU}U
                            </span>
                          </div>

                          <div className="text-[11px] font-mono text-indigo-300 font-semibold">
                            {dev.ip}
                          </div>

                          <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                            {hw.brand} • {hw.model}
                          </div>

                          {dev.building && (
                            <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-1">
                              <Building2 className="w-2.5 h-2.5 text-slate-400" />
                              <span>{dev.building} {dev.floor ? `(${dev.floor})` : ''}</span>
                            </div>
                          )}
                        </div>

                        {/* Mini preview */}
                        <div className="p-1 rounded-lg bg-slate-900 border border-slate-800 overflow-hidden">
                          <HardwareSvgRenderer
                            device={hw}
                            viewMode="front"
                            width={220}
                            height={hw.heightU * 18}
                          />
                        </div>

                        {isSelected && (
                          <div className="flex items-center gap-1 text-[10px] text-cyan-300 font-bold justify-end">
                            <Check className="w-3.5 h-3.5" />
                            <span>{isEn ? 'Selected for Rack' : 'انتخاب شده جهت نصب'}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Source Mode 2: Catalog Categories & Templates */}
          {!editingDevice && sourceMode === 'catalog' && (
            <>
              {/* Hardware Catalog Search Box & Category Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isEn ? 'Hardware Catalog Selection:' : 'انتخاب از کاتالوگ سخت‌افزاری:'}</span>
                  </label>

                  {/* Search Box */}
                  <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      placeholder={
                        isEn
                          ? 'Search model, brand (e.g. Patch Panel, FortiGate, DL380, Cisco)...'
                          : 'جستجو در کاتالوگ (پچ پنل، فورتی‌گیت، سیسکو، سرور HP)...'
                      }
                      className="w-full px-3 py-1.5 pl-8 pr-8 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    {catalogSearch && (
                      <button
                        type="button"
                        onClick={() => setCatalogSearch('')}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-white p-0.5 rounded"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Category Selector Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                  {catalogSearch && (
                    <button
                      type="button"
                      onClick={() => setCatalogSearch('')}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 shrink-0 border bg-cyan-950/60 border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/60 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      <span>{isEn ? 'Clear Search' : 'پاک کردن فیلتر'}</span>
                    </button>
                  )}
                  {HARDWARE_CATEGORIES.map((cat) => {
                    const isSelected = !catalogSearch && activeCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCatalogSearch('');
                          handleCategoryChange(cat.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 border cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-md shadow-cyan-600/20'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <span>{isEn ? cat.label_en : cat.label_fa}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Model & Generation Grid */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 block">
                    {catalogSearch
                      ? isEn
                        ? `Search Results (${filteredCatalogTemplates.length} models found):`
                        : `نتایج جستجو (${filteredCatalogTemplates.length} مدل پیدا شد):`
                      : isEn
                      ? 'Select Hardware Model:'
                      : 'انتخاب مدل تجهیز:'}
                  </label>
                  {filteredCatalogTemplates.length === 0 && (
                    <span className="text-xs text-amber-400">
                      {isEn ? 'No models match your search.' : 'موردی با این مشخصات یافت نشد.'}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto p-1 scrollbar-thin">
                  {filteredCatalogTemplates.map((tpl) => {
                    const isSelected = selectedTemplate.id === tpl.id;
                    const catInfo = HARDWARE_CATEGORIES.find((c) => c.id === tpl.category);
                    return (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          setActiveCategory(tpl.category);
                          handleTemplateChange(tpl);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-500/40 shadow-md'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-white truncate" title={tpl.model}>{tpl.model}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 shrink-0">
                            {tpl.heightU}U
                          </span>
                        </div>
                        {catalogSearch && catInfo && (
                          <div className="text-[9.5px] text-cyan-400/80 font-medium mt-0.5 truncate">
                            {isEn ? catInfo.label_en : catInfo.label_fa}
                          </div>
                        )}
                        <p className="text-[10.5px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {isEn ? tpl.description_en : tpl.description_fa}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Model Generations Dropdown (if available) & Custom Device Label */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block">
                {isEn ? 'Device Name / Custom Label:' : 'برچسب / نام دلخواه تجهیز:'}
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={isEn ? 'e.g. HPE DL380 Core Virtualization Node' : 'مثال: HPE DL380 Core Virtualization Node'}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            {selectedTemplate.generations && selectedTemplate.generations.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">
                  {isEn ? 'Hardware Generation:' : 'نسل سخت‌افزار (Generation):'}
                </label>
                <select
                  value={selectedGeneration}
                  onChange={(e) => setSelectedGeneration(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                >
                  {selectedTemplate.generations.map((gen) => (
                    <option key={gen} value={gen}>
                      {gen}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Step 3: Rack Placement & Unit Selection with COLLISION DETECTION */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>{isEn ? 'Rack Slot Placement & Position' : 'موقعیت و جاگذاری در رک سرور'}</span>
              </h4>
              <span className="text-xs font-mono text-slate-400">
                {isEn ? `Height: ${selectedTemplate.heightU}U` : `ارتفاع: ${selectedTemplate.heightU}U`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-300 block">
                  {isEn ? 'Target Rack Cabinet:' : 'انتخاب رک مقصد:'}
                </label>
                <select
                  value={targetRackId}
                  onChange={(e) => setTargetRackId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-cyan-500"
                >
                  {racks.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.units}U • {isEn ? `depth ${r.depth}cm` : `عمق ${r.depth}cm`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] text-slate-300 block">
                    {isEn ? 'Starting Unit (Start U):' : 'یونیت شروع در رک (Starting Unit):'}
                  </label>
                  {currentCollision && (
                    <button
                      type="button"
                      onClick={handleAutoFindSlot}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold underline"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isEn ? 'Find Free Slot' : 'یافتن یونیت آزاد'}</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={(currentRack?.units || 44) - selectedTemplate.heightU + 1}
                    value={targetU}
                    onChange={(e) => setTargetU(parseInt(e.target.value) || 1)}
                    className={`w-24 px-3 py-2 rounded-xl bg-slate-900 border text-white font-mono text-xs text-center focus:outline-none ${
                      currentCollision ? 'border-rose-500 ring-1 ring-rose-500 text-rose-300' : 'border-slate-700 focus:border-cyan-500'
                    }`}
                  />
                  <span className="text-xs text-slate-400">
                    {isEn
                      ? `Occupies U${targetU} to U${targetU + selectedTemplate.heightU - 1}`
                      : `اشغال از U${targetU} تا U${targetU + selectedTemplate.heightU - 1}`}
                  </span>
                </div>
              </div>
            </div>

            {/* COLLISION WARNING BANNER */}
            {currentCollision && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/80 flex items-start gap-3 text-rose-200 animate-pulse">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1 text-xs space-y-1">
                  <div className="font-bold text-rose-300">{currentCollision.message}</div>
                  <p className="text-[11px] text-rose-400">
                    {isEn
                      ? 'Two devices cannot occupy the same rack slot. Please select a different starting U or click "Find Free Slot".'
                      : 'دو تجهیز نمی‌توانند هم‌زمان روی یک یونیت رک قرار گیرند. لطفاً یونیت شروع را تغییر دهید یا روی «یافتن یونیت آزاد» کلیک کنید.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAutoFindSlot}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shrink-0 transition"
                >
                  {isEn ? 'Find Free' : 'یافتن خودکار'}
                </button>
              </div>
            )}
          </div>

          {/* Step 4: Power Supplies & Electrical Consumption (Watts / kVA) */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-amber-500/30 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>{isEn ? 'Power Supplies & Electrical Consumption' : 'منبع تغذیه (PSU) و توان مصرفی برق'}</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isEn
                    ? 'Configure number of power supplies (redundancy) and active power load (Watts) for rack capacity calculation'
                    : 'تنظیم تعداد پاورهای دستگاه (ریداندنت) و توان مصرفی اکتیو (وات) جهت محاسبه اتوماتیک بار الکتریکی کل رک'}
                </p>
              </div>
              <div className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold">
                ⚡ {powerWatts}W • {(powerWatts / 850).toFixed(2)} kVA
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Number of Power Supplies */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 block">
                  {isEn ? 'Number of Power Supplies (PSU):' : 'تعداد پاورهای دستگاه (PSU):'}
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { count: 0, label: isEn ? '0 (Passive)' : '۰ (پسیو)' },
                    { count: 1, label: isEn ? '1 (Single)' : '۱ (تک پاور)' },
                    { count: 2, label: isEn ? '2 (1+1 Redundant)' : '۲ (ریداندنت)' },
                    { count: 4, label: isEn ? '4 (2+2 N+N)' : '۴ (چهار پاور)' },
                  ].map((p) => (
                    <button
                      key={p.count}
                      type="button"
                      onClick={() => setPowerSupplyCount(p.count)}
                      className={`px-2 py-1.5 rounded-xl text-[11px] font-medium transition border text-center ${
                        powerSupplyCount === p.count
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Power Watts Consumption */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    {isEn ? 'Rated Power Consumption (Watts):' : 'توان مصرفی برآوردشده (بر حسب وات):'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setPowerWatts(selectedTemplate.defaultPowerWatts)}
                    className="text-[10px] text-amber-400 hover:underline font-mono"
                  >
                    {isEn ? `Default: ${selectedTemplate.defaultPowerWatts}W` : `پیش‌فرض: ${selectedTemplate.defaultPowerWatts} وات`}
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPowerWatts((w) => Math.max(0, w - 50))}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs hover:bg-slate-800 font-mono"
                  >
                    -50W
                  </button>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={0}
                      max={10000}
                      step={10}
                      value={powerWatts}
                      onChange={(e) => setPowerWatts(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs font-bold text-center focus:outline-none focus:border-amber-500"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-amber-400/80 font-mono pointer-events-none">
                      W
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPowerWatts((w) => w + 50)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs hover:bg-slate-800 font-mono"
                  >
                    +50W
                  </button>
                  <button
                    type="button"
                    onClick={() => setPowerWatts((w) => w + 100)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 text-xs hover:bg-slate-800 font-mono"
                  >
                    +100W
                  </button>
                </div>
              </div>
            </div>

            {/* Electrical load conversion info */}
            <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>{isEn ? 'Load Conversion:' : 'معادل توان الکتریکی:'}</span>
                <strong className="text-white font-mono">{(powerWatts / 1000).toFixed(2)} kW</strong>
                <span>•</span>
                <strong className="text-amber-300 font-mono">{(powerWatts / 850).toFixed(2)} kVA</strong>
                <span>(PF 0.85)</span>
              </span>
              <span className="font-mono text-cyan-400">
                ~{(powerWatts / (230 * 0.85)).toFixed(1)}A @ 230V AC
              </span>
            </div>

            {/* If Category is PDU: Show PDU Outlets Configuration */}
            {selectedTemplate.category === 'pdu' && (
              <div className="mt-3 p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                    <BatteryCharging className="w-3.5 h-3.5" />
                    <span>{isEn ? 'PDU Sockets & Outlet Configuration' : 'پیکربندی پریزها و خروجی‌های پاور ماژول (PDU Outlets)'}</span>
                  </h5>
                  <span className="text-[11px] text-cyan-400 font-mono">
                    {pduOutletsCount} {isEn ? 'Outlets' : 'پریز خروجی'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Outlet Count */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300 block">
                      {isEn ? 'Total Outlets Count:' : 'تعداد پریزهای برق:'}
                    </label>
                    <select
                      value={pduOutletsCount}
                      onChange={(e) => setPduOutletsCount(parseInt(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    >
                      {[6, 8, 10, 12, 16, 20, 24].map((cnt) => (
                        <option key={cnt} value={cnt}>
                          {cnt} {isEn ? 'Outlets' : 'پریز'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Socket Type */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300 block">
                      {isEn ? 'Socket Standard:' : 'استاندارد سوکت خروجی:'}
                    </label>
                    <select
                      value={pduOutletType}
                      onChange={(e) => setPduOutletType(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="IEC C13">IEC C13 (10A Server Standard)</option>
                      <option value="IEC C19">IEC C19 (16A High-Power Blade)</option>
                      <option value="Schuko / Standard">Schuko (استاندارد دوشاخه ارت‌دار)</option>
                      <option value="Mixed C13/C19">Mixed (ترکیبی C13 + C19)</option>
                    </select>
                  </div>

                  {/* Rated Current */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-300 block">
                      {isEn ? 'Max Amperage (Current):' : 'حداکثر جریان نامی:'}
                    </label>
                    <select
                      value={pduAmperage}
                      onChange={(e) => setPduAmperage(parseInt(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value={16}>16A (3680 Watts Single Phase)</option>
                      <option value={32}>32A (7360 Watts High Load)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 5: Network Interface Cards (NICs) & Ports Configuration */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                  <Network className="w-4 h-4" />
                  <span>{isEn ? 'Network Cards & Ports Configuration' : 'پیکربندی کارت‌های شبکه و پورت‌ها (Network Cards & Ports)'}</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isEn
                    ? 'Define number of NICs, port counts per card, and port medium (RJ45, SFP+, QSFP, and FC)'
                    : 'تعریف تعداد کارت‌های شبکه، تعداد پورت در هر کارت و نوع پورت‌ها (RJ45، SFP+، QSFP و FC)'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddNic}
                className="px-3 py-1.5 rounded-xl bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isEn ? 'Add Network Card' : 'افزودن کارت شبکه'}</span>
              </button>
            </div>

            {/* List of Network Cards */}
            {networkCards.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                {isEn
                  ? 'No network cards configured for this device yet. Click above to add a NIC.'
                  : 'هیچ کارت شبکه‌ای برای این ماژول تنظیم نشده است. با دکمه بالا کارت جدید اضافه کنید.'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {networkCards.map((card, idx) => (
                  <div
                    key={card.id || idx}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-700/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono text-xs flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={card.name}
                        onChange={(e) => handleUpdateNic(card.id, 'name', e.target.value)}
                        placeholder={isEn ? 'NIC Name (e.g. Onboard LOM)' : 'نام کارت (مثال: Onboard LOM)'}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 w-36"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400">{isEn ? 'Ports:' : 'تعداد پورت:'}</span>
                        <select
                          value={card.portCount}
                          onChange={(e) => handleUpdateNic(card.id, 'portCount', parseInt(e.target.value))}
                          className="px-2 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-cyan-300 focus:outline-none"
                        >
                          {[1, 2, 4, 8, 16, 24, 48].map((num) => (
                            <option key={num} value={num}>
                              {num} {isEn ? 'Ports' : 'پورت'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-400">{isEn ? 'Port Type:' : 'نوع پورت:'}</span>
                        <select
                          value={card.portType}
                          onChange={(e) => handleUpdateNic(card.id, 'portType', e.target.value as NetworkPortType)}
                          className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-emerald-300 focus:outline-none"
                        >
                          {PORT_TYPES.map((pt) => (
                            <option key={pt} value={pt}>
                              {pt}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveNic(card.id)}
                        className="p-1.5 rounded-lg bg-red-950/60 text-red-400 hover:bg-red-800 hover:text-white transition"
                        title={isEn ? 'Remove NIC' : 'حذف کارت'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 5: Live Vector SVG Preview */}
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">
                {isEn ? 'Live Photorealistic Vector Preview:' : 'پیش‌نمایش زنده SVG تجهیز (طراحی واقعی):'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPreviewViewMode(previewViewMode === 'front' ? 'rear' : 'front')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-cyan-300 hover:bg-slate-700 text-[11px] font-bold flex items-center gap-1 transition"
                >
                  {previewViewMode === 'front' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span>{previewViewMode === 'front' ? (isEn ? 'Front View' : 'مشاهده نمای جلو (Front)') : (isEn ? 'Rear View' : 'مشاهده نمای پشت (Rear)')}</span>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 flex items-center justify-center overflow-x-auto border border-slate-800/80">
              <HardwareSvgRenderer
                device={previewDevice}
                viewMode={previewViewMode}
                width={520}
                height={previewDevice.heightU * 36}
              />
            </div>
          </div>

          {/* Submit / Cancel Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold transition"
            >
              {isEn ? 'Cancel' : 'انصراف'}
            </button>
            <button
              type="submit"
              disabled={!!currentCollision}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg transition active:scale-95 flex items-center gap-2 ${
                currentCollision
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/30'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>
                {editingDevice
                  ? isEn
                    ? 'Save Device Changes'
                    : 'ذخیره تغییرات تجهیز'
                  : isEn
                  ? 'Install Hardware in Rack'
                  : 'نصب تجهیز در رک'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
