import React, { useState, useMemo } from 'react';
import {
  Terminal as TerminalIcon,
  Search,
  Router,
  Layers,
  Server,
  Filter,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ExternalLink,
  Cpu
} from 'lucide-react';
import { Device, isMikroTikDevice } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

export interface TerminalDeviceSelectorProps {
  devices: Device[];
  onSelectDevice: (device: Device) => void;
  currentDeviceId?: string;
  isLightMode?: boolean;
  onCancel?: () => void;
}

export const TerminalDeviceSelector: React.FC<TerminalDeviceSelectorProps> = ({
  devices,
  onSelectDevice,
  currentDeviceId,
  isLightMode = false,
  onCancel,
}) => {
  const { isEn } = useLanguage();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'router' | 'switch' | 'mikrotik' | 'cisco'>('all');

  // Filter available CLI devices (routers and switches)
  const cliDevices = useMemo(() => {
    return devices.filter((d) => d.type === 'router' || d.type === 'switch');
  }, [devices]);

  const filteredDevices = useMemo(() => {
    return cliDevices.filter((dev) => {
      // Type filter
      if (filterType === 'router' && dev.type !== 'router') return false;
      if (filterType === 'switch' && dev.type !== 'switch') return false;
      if (filterType === 'mikrotik' && !isMikroTikDevice(dev)) return false;
      if (filterType === 'cisco' && isMikroTikDevice(dev)) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = dev.name.toLowerCase().includes(q);
        const matchIp = (dev.ip || '').toLowerCase().includes(q);
        const matchModel = (dev.model || '').toLowerCase().includes(q);
        const matchRole = (dev.role || '').toLowerCase().includes(q);
        const matchBrand = (dev.platform || '').toLowerCase().includes(q);
        return matchName || matchIp || matchModel || matchRole || matchBrand;
      }
      return true;
    });
  }, [cliDevices, filterType, search]);

  return (
    <div
      className={`w-full h-full flex flex-col p-4 overflow-y-auto select-none ${
        isLightMode ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-100'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
            <TerminalIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">
              {isEn ? 'Select Device for Secondary Terminal' : 'انتخاب دیوایس برای باز کردن CLI (ترمینال همزمان)'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {isEn
                ? 'Choose another device from your network to open side-by-side terminal'
                : 'جهت کار همزمان روی دو یا چند دیوایس، تجهیز مورد نظر خود را انتخاب کنید'}
            </p>
          </div>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
          >
            {isEn ? 'Cancel' : 'انصراف'}
          </button>
        )}
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isEn ? 'Search devices by name, IP, model...' : 'جستجو بر اساس نام دیوایس، IP، مدل یا برند...'}
            className="w-full pr-9 pl-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'all', label: isEn ? 'All' : 'همه' },
              { id: 'router', label: isEn ? 'Routers' : 'روترها' },
              { id: 'switch', label: isEn ? 'Switches' : 'سوییچ‌ها' },
              { id: 'cisco', label: isEn ? 'Cisco' : 'سیسکو' },
              { id: 'mikrotik', label: isEn ? 'MikroTik' : 'میکروتیک' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer whitespace-nowrap ${
                filterType === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Device Cards Grid */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-1 custom-scrollbar">
        {filteredDevices.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <Filter className="w-8 h-8 opacity-40" />
            <span>{isEn ? 'No matching network devices found.' : 'دیوایس منطبقی با فیلتر جستجو یافت نشد.'}</span>
          </div>
        ) : (
          filteredDevices.map((dev) => {
            const isCurrent = dev.id === currentDeviceId;
            const isMikrotik = isMikroTikDevice(dev);

            return (
              <div
                key={dev.id}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'border-indigo-500/50 bg-indigo-950/20 opacity-70'
                    : 'border-slate-800/90 bg-slate-900/70 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          dev.type === 'router'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-indigo-500/20 text-indigo-400'
                        }`}
                      >
                        {dev.type === 'router' ? (
                          <Router className="w-4 h-4" />
                        ) : (
                          <Layers className="w-4 h-4" />
                        )}
                      </div>
                      <div className="truncate">
                        <h4 className="font-bold text-xs text-white truncate">{dev.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400">{dev.ip || '192.168.1.1'}</span>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded shrink-0 border ${
                        isMikrotik
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      }`}
                    >
                      {isMikrotik ? 'MikroTik' : 'Cisco IOS'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-2">
                    <span>{dev.model || (isMikrotik ? 'RouterOS' : 'Switch')}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          dev.is_online ? 'bg-emerald-400' : 'bg-rose-500'
                        }`}
                      />
                      {dev.is_online ? 'Online' : 'Offline'}
                    </span>
                    <span>•</span>
                    <span>{dev.total_ports || 24} Ports</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectDevice(dev)}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    isMikrotik
                      ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-xs'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs'
                  }`}
                >
                  <TerminalIcon className="w-3.5 h-3.5" />
                  <span>{isEn ? 'Open Terminal (CLI)' : 'اتصال و باز کردن CLI'}</span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
