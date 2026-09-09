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
  Radio
} from 'lucide-react';
import { Device, SwitchPort } from '../types';
import { fetchDevicePorts } from '../services/api';
import { useLanguage } from '../i18n';

interface CustomMapPortSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: Device | null;
  side: 'source' | 'target';
  partnerDevice?: Device | null;
  partnerPort?: string | null;
  onSelectPort: (portName: string, portData?: SwitchPort) => void;
}

export const CustomMapPortSelectorModal: React.FC<CustomMapPortSelectorModalProps> = ({
  isOpen,
  onClose,
  device,
  side,
  partnerDevice,
  partnerPort,
  onSelectPort,
}) => {
  const { t, isEn, isRtl } = useLanguage();
  const [ports, setPorts] = useState<SwitchPort[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'access' | 'trunk' | 'up'>('all');

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

  const filteredPorts = ports.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.port_id.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      (p.vlan && p.vlan.toString().includes(q)) ||
      (p.connected_device && p.connected_device.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (filterMode === 'up') return p.status === 'up';
    if (filterMode === 'access') return p.mode === 'access';
    if (filterMode === 'trunk') return p.mode === 'trunk';
    return true;
  });

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
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
            title={isEn ? 'Close' : 'بستن'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cable Connection Hint / Context */}
        {partnerDevice && partnerPort && (
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
              className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] ${
                filterMode === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isEn ? 'All' : 'همه'} ({ports.length})
            </button>
            <button
              onClick={() => setFilterMode('up')}
              className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] ${
                filterMode === 'up'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isEn ? 'Up / Active' : 'فعال'}
            </button>
            <button
              onClick={() => setFilterMode('trunk')}
              className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] ${
                filterMode === 'trunk'
                  ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isEn ? 'Trunk' : 'ترانک'}
            </button>
            <button
              onClick={() => setFilterMode('access')}
              className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] ${
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

                return (
                  <button
                    key={port.port_id}
                    onClick={() => onSelectPort(port.port_id, port)}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-indigo-500 dark:hover:border-indigo-500 hover:shadow-md transition text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          isDisabled
                            ? 'bg-amber-500'
                            : isUp
                            ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                            : 'bg-slate-400 dark:bg-slate-600'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate">
                          {port.port_id}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 font-mono mt-0.5">
                          <span>{port.speed || '1Gbps'}</span>
                          {port.connected_device && (
                            <span className="truncate max-w-[110px]" title={port.connected_device}>
                              • {port.connected_device}
                            </span>
                          )}
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
                      <div className="p-1 rounded-lg text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950 transition">
                        {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            {isEn
              ? `Click on any port to attach the cable.`
              : `روی هر پورت کلیک کنید تا کابل به آن متصل شود.`}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition font-medium"
          >
            {isEn ? 'Cancel' : 'انصراف'}
          </button>
        </div>
      </div>
    </div>
  );
};
