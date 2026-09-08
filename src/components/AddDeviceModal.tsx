import React, { useState } from 'react';
import { X, Network, Server, Wifi, Router as RouterIcon, ShieldCheck, MapPin } from 'lucide-react';
import { Device, DeviceType } from '../types';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (device: Partial<Device>) => Promise<void>;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({
  isOpen,
  onClose,
  onAdd,
}) => {
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [type, setType] = useState<DeviceType>('switch');
  const [role, setRole] = useState('Access Switch');
  const [model, setModel] = useState('Cisco Catalyst 2960X-48FPS-L');
  const [building, setBuilding] = useState('ساختمان مرکزی (Central Bldg)');
  const [floor, setFloor] = useState('طبقه ۲ (Floor 2)');
  const [unit, setUnit] = useState('اتاق رک اداری (Network Closet A2)');
  const [rack, setRack] = useState('Rack-B02');
  const [totalPorts, setTotalPorts] = useState(24);
  const [cdpEnabled, setCdpEnabled] = useState(true);
  const [lldpEnabled, setLldpEnabled] = useState(true);
  const [snmpCommunity, setSnmpCommunity] = useState('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('لطفاً نام تجهیز را وارد کنید');
      return;
    }
    if (!ip.trim() || !/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(ip.trim())) {
      setError('لطفاً آدرس IP معتبر وارد کنید (مثال: 192.168.1.50)');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onAdd({
        name: name.trim(),
        ip: ip.trim(),
        type,
        role,
        model: model.trim(),
        building: building.trim(),
        floor: floor.trim(),
        unit: unit.trim(),
        rack: rack.trim(),
        total_ports: Number(totalPorts),
        cdp_enabled: cdpEnabled,
        lldp_enabled: lldpEnabled,
        snmp_community: snmpCommunity.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'خطا در ثبت تجهیز');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-2xl shadow-xl overflow-hidden my-6 text-right text-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">معرفی و ثبت تجهیز جدید در شبکه</h3>
              <p className="text-[11px] text-slate-500">افزودن سوئیچ، روتر یا اکسس‌پوینت به پنل با موقعیت مکانی دقیق</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          {/* Device Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">نوع تجهیز (Device Type):</label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setType('switch');
                  setRole('Access Switch');
                  setModel('Cisco Catalyst 2960X-48FPS-L');
                  setTotalPorts(24);
                }}
                className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition ${
                  type === 'switch'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Server className="w-4 h-4" />
                <span className="text-xs font-bold">سوییچ شبکه (Switch)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('router');
                  setRole('Edge Gateway');
                  setModel('Cisco ISR 4451-X');
                  setTotalPorts(8);
                }}
                className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition ${
                  type === 'router'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <RouterIcon className="w-4 h-4" />
                <span className="text-xs font-bold">روتر شبکه (Router)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('access_point');
                  setRole('Wireless AP');
                  setModel('Cisco Catalyst 9120AXI');
                  setTotalPorts(2);
                }}
                className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition ${
                  type === 'access_point'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Wifi className="w-4 h-4" />
                <span className="text-xs font-bold">اکسس پوینت (AP)</span>
              </button>
            </div>
          </div>

          {/* Identity & IP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                نام یا شناسه تجهیز (Hostname):
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً: SW-ACC-BLDG-A-F2"
                className="w-full px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                آدرس آی‌پی مدیریتی (IP Address):
              </label>
              <input
                type="text"
                required
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="مثلاً: 192.168.1.25"
                className="w-full px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                dir="ltr"
              />
            </div>
          </div>

          {/* Model & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">نقش تجهیز (Role):</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-indigo-500"
              >
                <option value="Core Switch">Core Switch (سوئیچ اصلی)</option>
                <option value="Distribution Switch">Distribution Switch (سوئیچ توزیع)</option>
                <option value="Access Switch">Access Switch (سوئیچ دسترسی)</option>
                <option value="Edge Gateway">Edge Gateway / Router (مسیریاب مرزی)</option>
                <option value="Wireless AP">Wireless Access Point (اکسس‌پوینت وای‌فای)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">مدل سخت‌افزاری (Hardware Model):</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Cisco Catalyst / MikroTik / Aruba"
                className="w-full px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">تعداد پورت‌ها (Total Ports):</label>
              <select
                value={totalPorts}
                onChange={(e) => setTotalPorts(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 font-mono text-left"
                dir="ltr"
              >
                <option value={2}>2 Ports (برای AP)</option>
                <option value={8}>8 Ports (برای روتر/سوئیچ کوچک)</option>
                <option value={16}>16 Ports</option>
                <option value={24}>24 Ports</option>
                <option value={48}>48 Ports</option>
              </select>
            </div>
          </div>

          {/* Location Fields (Building, Floor, Unit, Rack) */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-1.5 text-indigo-700 text-xs font-bold">
              <MapPin className="w-3.5 h-3.5" />
              <span>موقعیت استقرار فیزیکی تجهیز (Physical Location):</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">کدام ساختمان؟ (Building):</label>
                <input
                  type="text"
                  required
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  placeholder="مثلاً: ساختمان مرکزی یا ساختمان مهندسی"
                  className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">کدام طبقه؟ (Floor):</label>
                <input
                  type="text"
                  required
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  placeholder="مثلاً: طبقه همکف، طبقه ۱، طبقه ۳"
                  className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">کدام واحد یا اتاق؟ (Unit / Room):</label>
                <input
                  type="text"
                  required
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="مثلاً: اتاق سرور، واحد مالی، اتاق رک ۳۰۲"
                  className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">شماره رک یا موقعیت (Rack / Cabinet):</label>
                <input
                  type="text"
                  value={rack}
                  onChange={(e) => setRack(e.target.value)}
                  placeholder="مثلاً: Rack-A01 یا رک دیواری"
                  className="w-full px-2.5 py-1.5 rounded bg-white border border-slate-300 text-slate-800 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Discovery Protocols CDP & LLDP */}
          <div className="flex flex-wrap items-center gap-4 p-2.5 rounded bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-600 font-medium text-[11px]">پروتکل‌های اسکن همسایگی:</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={cdpEnabled}
                onChange={(e) => setCdpEnabled(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 bg-white border-slate-300"
              />
              <span>پروتکل CDP (Cisco Discovery Protocol)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={lldpEnabled}
                onChange={(e) => setLldpEnabled(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 bg-white border-slate-300"
              />
              <span>پروتکل LLDP (IEEE 802.1AB)</span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium transition"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition disabled:opacity-50"
            >
              {isSubmitting ? 'در حال ثبت...' : 'معرفی و افزودن به شبکه'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
