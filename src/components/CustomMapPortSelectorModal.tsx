import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Server,
  Router as RouterIcon,
  Cable,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Tag,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Radio,
  Lock,
  Trash2,
  ExternalLink,
  Layers
} from 'lucide-react';
import { Device, SwitchPort, CustomTopologyLink } from '../types';
import { fetchDevicePorts } from '../services/api';
import { useLanguage } from '../i18n';

interface CustomMapPortSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: Device | null;
  side: 'source' | 'target';
  partnerDevice?: Device | null;
  partnerPort?: string | null;
  customMapLinks?: CustomTopologyLink[];
  allDevices?: Device[];
  onDisconnectLink?: (linkId: string) => void;
  onSelectPort: (portName: string, portData?: SwitchPort) => void;
}

export const CustomMapPortSelectorModal: React.FC<CustomMapPortSelectorModalProps> = ({
  isOpen,
  onClose,
  device,
  side,
  partnerDevice,
  partnerPort,
  customMapLinks = [],
  allDevices = [],
  onDisconnectLink,
  onSelectPort,
}) => {
  const { t, isEn, isRtl } = useLanguage();
  const [ports, setPorts] = useState<SwitchPort[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'available' | 'in_use' | 'trunk' | 'access'>('all');
  const [activeTab, setActiveTab] = useState<'select' | 'connections'>('select');
  const [confirmDisconnectLinkId, setConfirmDisconnectLinkId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !device) return;

    let isMounted = true;
    setLoading(true);

    fetchDevicePorts(device.id)
      .then((res) => {
        if (isMounted) {
          if (res?.ports && res.ports.length > 0) {
            setPorts(res.ports);
          } else {
            // Generate fallback ports based on device port count
            const count = device.total_ports || (device.type === 'router' ? 4 : 24);
            const fallback: SwitchPort[] = [];
            const prefix = device.type === 'router' ? 'GigabitEthernet0/' : 'GigabitEthernet1/0/';
            for (let i = 1; i <= count; i++) {
              fallback.push({
                port_id: `${prefix}${i}`,
                name: `${prefix}${i}`,
                status: i % 3 === 0 ? 'down' : 'up',
                admin_status: 'enabled',
                mode: i <= 4 ? 'trunk' : 'access',
                vlan: i <= 4 ? 1 : 10,
                allowed_vlans: i <= 4 ? '1,10,20,30' : '10',
                speed: '1Gbps',
                duplex: 'Full',
                connected_device: '',
              });
            }
            setPorts(fallback);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          const count = device.total_ports || (device.type === 'router' ? 4 : 24);
          const fallback: SwitchPort[] = [];
          const prefix = device.type === 'router' ? 'GigabitEthernet0/' : 'GigabitEthernet1/0/';
          for (let i = 1; i <= count; i++) {
            fallback.push({
              port_id: `${prefix}${i}`,
              name: `${prefix}${i}`,
              status: 'up',
              admin_status: 'enabled',
              mode: i <= 2 ? 'trunk' : 'access',
              vlan: 1,
              allowed_vlans: '1',
              speed: '1Gbps',
              duplex: 'Full',
              connected_device: '',
            });
          }
          setPorts(fallback);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, device]);

  if (!isOpen || !device) return null;

  // Helper to find connection details for a specific port on this device
  const getPortConnection = (portName: string) => {
    if (!customMapLinks || !device) return null;
    const pLower = portName.toLowerCase().trim();
    for (const l of customMapLinks) {
      if (l.sourceDeviceId === device.id && l.sourcePort.toLowerCase().trim() === pLower) {
        const peerDev = allDevices?.find((d) => d.id === l.targetDeviceId);
        return {
          link: l,
          peerDevice: peerDev,
          peerDeviceId: l.targetDeviceId,
          peerDeviceName: peerDev?.name || l.targetDeviceId,
          peerPort: l.targetPort,
          peerMode: l.targetMode,
          peerVlan: l.targetVlan,
          localPort: l.sourcePort,
          localMode: l.sourceMode,
          localVlan: l.sourceVlan,
          speed: l.speed,
          cableType: l.cableType,
        };
      }
      if (l.targetDeviceId === device.id && l.targetPort.toLowerCase().trim() === pLower) {
        const peerDev = allDevices?.find((d) => d.id === l.sourceDeviceId);
        return {
          link: l,
          peerDevice: peerDev,
          peerDeviceId: l.sourceDeviceId,
          peerDeviceName: peerDev?.name || l.sourceDeviceId,
          peerPort: l.sourcePort,
          peerMode: l.sourceMode,
          peerVlan: l.sourceVlan,
          localPort: l.targetPort,
          localMode: l.targetMode,
          localVlan: l.targetVlan,
          speed: l.speed,
          cableType: l.cableType,
        };
      }
    }
    return null;
  };

  // All active connections involving this device
  const deviceConnections = (customMapLinks || [])
    .filter((l) => l.sourceDeviceId === device.id || l.targetDeviceId === device.id)
    .map((l) => {
      const isSrc = l.sourceDeviceId === device.id;
      const peerId = isSrc ? l.targetDeviceId : l.sourceDeviceId;
      const peerDev = allDevices?.find((d) => d.id === peerId);
      return {
        link: l,
        localPort: isSrc ? l.sourcePort : l.targetPort,
        localMode: isSrc ? l.sourceMode : l.targetMode,
        localVlan: isSrc ? l.sourceVlan : l.targetVlan,
        peerId,
        peerDev,
        peerName: peerDev?.name || peerId,
        peerIp: peerDev?.ip || '',
        peerPort: isSrc ? l.targetPort : l.sourcePort,
        peerMode: isSrc ? l.targetMode : l.sourceMode,
        peerVlan: isSrc ? l.targetVlan : l.sourceVlan,
        speed: l.speed || '1G',
        cableType: l.cableType || 'Copper',
      };
    });

  const filteredPorts = ports.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const conn = getPortConnection(p.port_id);
    const isInUse = !!conn;

    const matchesSearch =
      !q ||
      p.port_id.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.vlan && p.vlan.toString().includes(q)) ||
      (conn && conn.peerDeviceName.toLowerCase().includes(q)) ||
      (p.connected_device && p.connected_device.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (filterMode === 'available') return !isInUse;
    if (filterMode === 'in_use') return isInUse;
    if (filterMode === 'access') return p.mode === 'access';
    if (filterMode === 'trunk') return p.mode === 'trunk';
    return true;
  });

  const inUseCount = ports.filter((p) => !!getPortConnection(p.port_id)).length;
  const availableCount = Math.max(0, ports.length - inUseCount);

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 modal-backdrop-blur"
      data-modal-backdrop="true"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 flex-shrink-0">
              <Cable className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                  {side === 'source' ? (isEn ? 'Step 1: Source Port' : 'مرحله ۱: پورت مبدا') : (isEn ? 'Step 2: Destination Port' : 'مرحله ۲: پورت مقصد')}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  {device.ip}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                {isEn ? `Select Port on ${device.name}` : `انتخاب پورت روی ${device.name}`}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition cursor-pointer"
            title={isEn ? 'Close' : 'بستن'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation: Select Port vs Connected Ports Overview */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/70 px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('select')}
            className={`pb-2 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'select'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Cable className="w-3.5 h-3.5" />
            <span>{isEn ? 'Select Port for Cable' : 'انتخاب پورت جهت اتصال کابل'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
              {availableCount} {isEn ? 'free' : 'آزاد'}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`pb-2 px-3 font-semibold transition border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'connections'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isEn ? 'Port Connections' : 'اتصالات پورت‌های این دیوایس'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-mono font-bold">
              {deviceConnections.length}
            </span>
          </button>
        </div>

        {/* Cable Connection Hint / Context */}
        {partnerDevice && partnerPort && activeTab === 'select' && (
          <div className="px-4 py-2.5 bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
              <span className="font-semibold">{isEn ? 'Connecting from:' : 'در حال اتصال کابل از:'}</span>
              <span className="font-mono font-bold bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                {partnerDevice.name} ({partnerPort})
              </span>
            </div>
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
              {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
              <span>{device.name}</span>
            </div>
          </div>
        )}

        {/* TAB 1: Select Port */}
        {activeTab === 'select' && (
          <>
            {/* Search & Filter Bar */}
            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder={isEn ? 'Search port (e.g. Gi1/0/1, Trunk, VLAN 10)...' : 'جستجوی پورت (مثلا Gi1/0/1، ترانک، ویلن ۱۰)...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full px-3 py-1.5 ${isRtl ? 'pr-8' : 'pl-8'} rounded-xl bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
                <Search className={`w-3.5 h-3.5 text-slate-400 absolute ${isRtl ? 'right-2.5' : 'left-2.5'} top-2.5`} />
              </div>

              <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl p-1 text-xs">
                <button
                  onClick={() => setFilterMode('all')}
                  className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isEn ? 'All' : 'همه'} ({ports.length})
                </button>
                <button
                  onClick={() => setFilterMode('available')}
                  className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] cursor-pointer ${
                    filterMode === 'available'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isEn ? 'Available' : 'پورت‌های آزاد'} ({availableCount})
                </button>
                <button
                  onClick={() => setFilterMode('in_use')}
                  className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] cursor-pointer ${
                    filterMode === 'in_use'
                      ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isEn ? 'In Use' : 'متصل شده'} ({inUseCount})
                </button>
                <button
                  onClick={() => setFilterMode('trunk')}
                  className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] cursor-pointer ${
                    filterMode === 'trunk'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isEn ? 'Trunk' : 'ترانک'}
                </button>
                <button
                  onClick={() => setFilterMode('access')}
                  className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] cursor-pointer ${
                    filterMode === 'access'
                      ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {isEn ? 'Access' : 'اکسس'}
                </button>
              </div>
            </div>

            {/* Ports Grid / List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loading ? (
                <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                  <span>{isEn ? 'Loading device physical interfaces...' : 'در حال بارگذاری اینترفیس‌های فیزیکی تجهیز...'}</span>
                </div>
              ) : filteredPorts.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  {isEn ? 'No ports matched your filter criteria.' : 'هیچ پورتی مطابق با فیلتر یافت نشد.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredPorts.map((port) => {
                    const isUp = port.status === 'up';
                    const isTrunk = port.mode === 'trunk';
                    const isDisabled = port.admin_status === 'disabled';
                    const conn = getPortConnection(port.port_id);
                    const isInUse = !!conn;

                    return (
                      <button
                        key={port.port_id}
                        onClick={() => onSelectPort(port.port_id, port)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition text-left group cursor-pointer ${
                          isInUse
                            ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700/60 hover:border-amber-500 shadow-xs'
                            : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                              isInUse
                                ? 'bg-amber-500 ring-2 ring-amber-300 dark:ring-amber-700'
                                : isDisabled
                                ? 'bg-amber-500'
                                : isUp
                                ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                                : 'bg-slate-400 dark:bg-slate-600'
                            }`}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs font-bold font-mono transition truncate ${
                                isInUse
                                  ? 'text-amber-900 dark:text-amber-200'
                                  : 'text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                              }`}>
                                {port.port_id}
                              </span>
                              {isInUse && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-200/70 dark:bg-amber-900/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 flex items-center gap-0.5">
                                  <Lock className="w-2.5 h-2.5" />
                                  {isEn ? 'In Use' : 'متصل'}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-mono mt-0.5">
                              <span>{port.speed || '1Gbps'}</span>
                              {isInUse && conn ? (
                                <span className="text-amber-700 dark:text-amber-400 font-bold truncate max-w-[130px]" title={`Connected to ${conn.peerDeviceName} (${conn.peerPort})`}>
                                  → {conn.peerDeviceName} ({conn.peerPort})
                                </span>
                              ) : port.connected_device ? (
                                <span className="truncate max-w-[110px]" title={port.connected_device}>
                                  • {port.connected_device}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              isTrunk
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                            }`}
                          >
                            {isTrunk ? 'Trunk' : `VLAN ${port.vlan || 1}`}
                          </span>
                          <div className={`p-1 rounded-lg transition ${
                            isInUse
                              ? 'text-amber-600 dark:text-amber-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40'
                              : 'text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950'
                          }`}>
                            {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* TAB 2: Connected Ports Detailed Overview */}
        {activeTab === 'connections' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {isEn
                  ? `Active Cable Links on ${device.name} (${deviceConnections.length})`
                  : `کابل‌های متصل به ${device.name} (${deviceConnections.length} ارتباط)`}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                {device.ip}
              </span>
            </div>

            {deviceConnections.length === 0 ? (
              <div className="py-14 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <Cable className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                <span className="font-medium">
                  {isEn
                    ? 'No cable links currently connected to this device.'
                    : 'در حال حاضر هیچ کابل یا اتصالی برای این دیوایس ثبت نشده است.'}
                </span>
                <button
                  onClick={() => setActiveTab('select')}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition cursor-pointer"
                >
                  {isEn ? 'Attach First Cable' : 'اتصال اولین کابل'}
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {deviceConnections.map((conn) => (
                  <div
                    key={conn.link.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 shrink-0">
                        <Cable className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-bold font-mono">
                          <span className="text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                            {conn.localPort}
                          </span>
                          <span className="text-slate-400">
                            {isRtl ? '← متصل به →' : '↔ connected to ↔'}
                          </span>
                          <span className="text-slate-900 dark:text-white">
                            {conn.peerName}
                          </span>
                          <span className="text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                            {conn.peerPort}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1">
                          <span>{conn.speed}</span>
                          <span>•</span>
                          <span>{conn.cableType}</span>
                          {conn.peerIp && (
                            <>
                              <span>•</span>
                              <span>{conn.peerIp}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>
                            {conn.localMode === 'trunk' ? 'Trunk' : `VLAN ${conn.localVlan || 1}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {confirmDisconnectLinkId === conn.link.id ? (
                        <div className="flex items-center gap-1.5 p-1 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-300 dark:border-rose-800 animate-in fade-in">
                          <span className="text-[10px] text-rose-700 dark:text-rose-300 font-medium px-1">
                            {isEn ? 'Confirm remove?' : 'حذف شود؟'}
                          </span>
                          <button
                            onClick={() => {
                              if (onDisconnectLink) onDisconnectLink(conn.link.id);
                              setConfirmDisconnectLinkId(null);
                            }}
                            className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] cursor-pointer"
                          >
                            {isEn ? 'Yes' : 'بله'}
                          </button>
                          <button
                            onClick={() => setConfirmDisconnectLinkId(null)}
                            className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] cursor-pointer"
                          >
                            {isEn ? 'No' : 'خیر'}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDisconnectLinkId(conn.link.id)}
                          className="px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition text-xs font-medium flex items-center gap-1 cursor-pointer"
                          title={isEn ? 'Disconnect and remove this cable' : 'قطع و حذف این کابل'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Disconnect' : 'قطع اتصال کابل'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            {activeTab === 'select'
              ? (isEn
                  ? `Ports marked with "In Use" are already wired to other devices.`
                  : `پورت‌های با برچسب «متصل» قبلاً به دستگاه‌های دیگر کابل‌کشی شده‌اند.`)
              : (isEn
                  ? `Total active cable connections: ${deviceConnections.length}`
                  : `مجموع ارتباطات فعال کابل این دستگاه: ${deviceConnections.length}`)}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium cursor-pointer"
          >
            {isEn ? 'Cancel' : 'انصراف'}
          </button>
        </div>
      </div>
    </div>
  );
};

