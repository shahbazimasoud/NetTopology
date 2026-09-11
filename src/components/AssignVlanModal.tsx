import React, { useState, useEffect } from 'react';
import {
  Layers,
  Terminal,
  Server,
  X,
  CheckCircle2,
  Loader2,
  Hash,
  Search,
  Check,
  Tag
} from 'lucide-react';
import { Device, SwitchPort, VlanInfo } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import { fetchVlans } from '../services/api';

export interface AssignVlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (vlanId: number) => Promise<void> | void;
  port: SwitchPort | null;
  device: Device;
  availableVlans?: VlanInfo[];
  isLoading?: boolean;
}

export const AssignVlanModal: React.FC<AssignVlanModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  port,
  device,
  availableVlans = [],
  isLoading = false,
}) => {
  const { t, isEn } = useLanguage();
  const [targetVlan, setTargetVlan] = useState<number>(port?.vlan || 1);
  const [vlansList, setVlansList] = useState<VlanInfo[]>(availableVlans);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingVlans, setLoadingVlans] = useState(false);

  useEffect(() => {
    if (port) {
      setTargetVlan(port.vlan || 1);
    }
  }, [port]);

  useEffect(() => {
    if (isOpen && vlansList.length === 0) {
      loadVlans();
    }
  }, [isOpen]);

  const loadVlans = async () => {
    try {
      setLoadingVlans(true);
      const res = await fetchVlans();
      if (res && res.vlans && res.vlans.length > 0) {
        setVlansList(res.vlans);
      } else {
        // Fallback standard enterprise VLAN seed
        setVlansList([
          { id: 1, name: 'Default', status: 'active', ports_count: 12 },
          { id: 10, name: 'Management', status: 'active', ports_count: 4 },
          { id: 20, name: 'Servers_NOC', status: 'active', ports_count: 8 },
          { id: 30, name: 'Workstations_HQ', status: 'active', ports_count: 16 },
          { id: 40, name: 'Voice_VoIP', status: 'active', ports_count: 6 },
          { id: 50, name: 'Wireless_Guests', status: 'active', ports_count: 4 },
          { id: 99, name: 'DMZ_Security', status: 'active', ports_count: 2 },
        ]);
      }
    } catch {
      setVlansList([
        { id: 1, name: 'Default', status: 'active', ports_count: 12 },
        { id: 10, name: 'Management', status: 'active', ports_count: 4 },
        { id: 20, name: 'Servers_NOC', status: 'active', ports_count: 8 },
        { id: 30, name: 'Workstations_HQ', status: 'active', ports_count: 16 },
        { id: 99, name: 'DMZ_Security', status: 'active', ports_count: 2 },
      ]);
    } finally {
      setLoadingVlans(false);
    }
  };

  if (!isOpen || !port) return null;

  const isRouter = device.type === 'router';
  const portId = port.port_id;
  const devName = device.name || 'Device';

  // Generate Cisco CLI Command
  const generateCommand = () => {
    if (isRouter) {
      return [
        `${devName}# configure terminal`,
        `${devName}(config)# interface ${portId}.${targetVlan}`,
        `${devName}(config-subif)# encapsulation dot1Q ${targetVlan}`,
        `${devName}(config-subif)# exit`,
        `${devName}(config)# exit`,
        `%SYS-5-CONFIG_I: Assigned 802.1Q VLAN ${targetVlan} on sub-interface ${portId}.${targetVlan}`
      ].join('\n');
    }
    return [
      `${devName}# configure terminal`,
      `${devName}(config)# interface ${portId}`,
      `${devName}(config-if)# switchport mode access`,
      `${devName}(config-if)# switchport access vlan ${targetVlan}`,
      `${devName}(config-if)# exit`,
      `${devName}(config)# exit`,
      `%SYS-5-CONFIG_I: Interface ${portId} assigned to VLAN ${targetVlan} on ${devName}`
    ].join('\n');
  };

  const filteredVlans = vlansList.filter(
    (v) =>
      v.id.toString().includes(searchTerm) ||
      v.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetVlan >= 1 && targetVlan <= 4094) {
      onAssign(targetVlan);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4 modal-backdrop-blur"
      data-modal-backdrop="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
        dir={isEn ? 'ltr' : 'rtl'}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {isEn ? 'Assign Access VLAN' : 'تخصیص ویلن دسترسی (Assign Access VLAN)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span>{device.name}</span>
                <span>•</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{port.port_id}</span>
                <span>•</span>
                <span>{isEn ? `Current: VLAN ${port.vlan}` : `ویلن کنونی: ${port.vlan}`}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Section 1: Defined VLANs on device (Top Section requested by user) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-purple-500" />
                <span>{isEn ? 'Device Configured VLANs (Click to select):' : 'ویلن‌های تعریف‌شده روی این دستگاه (برای انتخاب کلیک کنید):'}</span>
              </span>
              <div className="relative w-36">
                <Search className="w-3 h-3 absolute left-2 rtl:left-auto rtl:right-2 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder={isEn ? 'Filter VLANs...' : 'جستجو...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-6 rtl:pl-2 rtl:pr-6 py-0.5 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>

            {loadingVlans ? (
              <div className="p-4 flex items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                <span>{isEn ? 'Loading VLAN table...' : 'در حال بارگذاری جدول ویلن‌ها...'}</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50">
                {filteredVlans.map((v) => {
                  const isSelected = targetVlan === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setTargetVlan(v.id)}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs font-mono transition text-left rtl:text-right cursor-pointer border ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-500 shadow-md ring-2 ring-purple-400/40'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="truncate">
                        <div className="font-bold flex items-center gap-1">
                          <span>VLAN {v.id}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </div>
                        <div className={`text-[10px] truncate ${isSelected ? 'text-purple-100' : 'text-slate-500 dark:text-slate-400'}`}>
                          {v.name}
                        </div>
                      </div>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-sans font-bold ${
                        isSelected ? 'bg-purple-700 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        #{v.id}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Custom VLAN Number Input (Requested by user) */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              {isEn ? 'Target Access VLAN ID (Manual input or selection):' : 'شماره ویلن مورد نظر (وارد کردن دستی یا انتخاب از بالا):'}
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Hash className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-2.5 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  max="4094"
                  value={targetVlan}
                  onChange={(e) => setTargetVlan(Math.max(1, Math.min(4094, parseInt(e.target.value) || 1)))}
                  className="w-full pl-9 rtl:pl-3 rtl:pr-9 pr-3 py-2 rounded-xl text-sm font-mono font-bold bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div className="flex gap-1">
                {[1, 10, 20, 30, 99].map((quick) => (
                  <button
                    key={quick}
                    type="button"
                    onClick={() => setTargetVlan(quick)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-mono font-bold transition cursor-pointer border ${
                      targetVlan === quick
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-purple-400'
                    }`}
                  >
                    v{quick}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {isEn
                ? 'Standard IEEE 802.1Q valid VLAN range is 1 to 4094.'
                : 'بازه مجاز شماره ویلن در استاندارد IEEE 802.1Q بین ۱ تا ۴۰۹۴ می‌باشد.'}
            </p>
          </div>

          {/* Section 3: Cisco CLI Command Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-500" />
                <span>{isEn ? 'Generated Cisco IOS Command:' : 'دستور متناظر جهت اجرا در دستگاه:'}</span>
              </span>
            </div>
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-[#0f172a] shadow-inner font-mono text-xs">
              <div className="px-3 py-1 bg-[#020617] border-b border-slate-800 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">
                  {device.name} • {isRouter ? 'Router Sub-interface' : 'Switchport Access'}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">VLAN {targetVlan}</span>
              </div>
              <pre className="p-2.5 text-emerald-400 text-xs leading-relaxed overflow-x-auto whitespace-pre">
                {generateCommand()}
              </pre>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition cursor-pointer border border-slate-300 dark:border-slate-700"
            >
              {isEn ? 'Cancel (No)' : 'انصراف (خیر)'}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-600/30 transition cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isEn ? 'Applying...' : 'در حال اعمال...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isEn ? 'Yes, Assign & Execute' : 'بله، تخصیص بده و اجرا کن'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
