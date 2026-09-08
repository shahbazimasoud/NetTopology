import React, { useState, useEffect } from 'react';
import { Server, Cable, Zap, Shield, Search, Filter, Edit3, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { Device, SwitchPort } from '../types';
import { fetchDevicePorts, updateSwitchPort } from '../services/api';

interface PortManagementViewProps {
  devices: Device[];
}

export const PortManagementView: React.FC<PortManagementViewProps> = ({ devices }) => {
  const switchesAndRouters = devices.filter((d) => d.type === 'switch' || d.type === 'router');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
    switchesAndRouters[0]?.id || devices[0]?.id || ''
  );
  const [ports, setPorts] = useState<SwitchPort[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPort, setSelectedPort] = useState<SwitchPort | null>(null);

  // Edit port state
  const [isEditing, setIsEditing] = useState(false);
  const [editAdminStatus, setEditAdminStatus] = useState<'enabled' | 'disabled'>('enabled');
  const [editMode, setEditMode] = useState<'trunk' | 'access'>('access');
  const [editVlan, setEditVlan] = useState(1);
  const [editAllowedVlans, setEditAllowedVlans] = useState('');
  const [editConnected, setEditConnected] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'up' | 'down' | 'trunk' | 'access'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const currentDevice = devices.find((d) => d.id === selectedDeviceId);

  useEffect(() => {
    if (selectedDeviceId) {
      loadPorts(selectedDeviceId);
    }
  }, [selectedDeviceId]);

  const loadPorts = async (devId: string) => {
    try {
      setLoading(true);
      const res = await fetchDevicePorts(devId);
      setPorts(res.ports);
      if (res.ports.length > 0) {
        setSelectedPort(res.ports[0]);
      }
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (port: SwitchPort) => {
    setSelectedPort(port);
    setEditAdminStatus(port.admin_status);
    setEditMode(port.mode);
    setEditVlan(port.vlan);
    setEditAllowedVlans(port.allowed_vlans);
    setEditConnected(port.connected_device);
    setEditDesc(port.description || '');
    setIsEditing(true);
  };

  const handleSavePort = async () => {
    if (!currentDevice || !selectedPort) return;
    try {
      setIsSaving(true);
      const res = await updateSwitchPort(currentDevice.id, selectedPort.port_id, {
        admin_status: editAdminStatus,
        status: editAdminStatus === 'disabled' ? 'down' : 'up',
        mode: editMode,
        vlan: editVlan,
        allowed_vlans: editAllowedVlans,
        connected_device: editConnected,
        description: editDesc,
      });

      setPorts((prev) =>
        prev.map((p) => (p.port_id === selectedPort.port_id ? res.port : p))
      );
      setSelectedPort(res.port);
      setIsEditing(false);
    } catch (err: any) {
      alert('خطا در ذخیره پورت: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredPorts = ports.filter((p) => {
    if (filterMode === 'up' && p.status !== 'up') return false;
    if (filterMode === 'down' && p.status !== 'down') return false;
    if (filterMode === 'trunk' && p.mode !== 'trunk') return false;
    if (filterMode === 'access' && p.mode !== 'access') return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.port_id.toLowerCase().includes(q) ||
        p.connected_device.toLowerCase().includes(q) ||
        String(p.vlan).includes(q) ||
        p.mode.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCount = ports.filter((p) => p.status === 'up').length;
  const inactiveCount = ports.filter((p) => p.status === 'down').length;
  const trunkCount = ports.filter((p) => p.mode === 'trunk').length;

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto text-right text-slate-800">
      {/* Header & Switch Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">پایش وضعیت پورت‌ها، ترانک یا اکسس و ویلن (VLAN)</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono font-bold">
              Port Manager
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            مشاهده وضعیت فعال/غیرفعال بودن پورت‌ها، شناسایی تجهیز متصل، حالت ترانک یا اکسس و شماره ویلن اختصاص‌یافته
          </p>
        </div>

        {/* Switch Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">انتخاب سوئیچ یا روتر:</span>
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-indigo-700 font-mono text-xs focus:bg-white focus:outline-none focus:border-indigo-500 font-semibold"
          >
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.ip}) - {d.role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Device Banner */}
      {currentDevice && (
        <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 font-mono text-xs">{currentDevice.name}</span>
                <span className="text-indigo-700 font-mono font-bold">({currentDevice.ip})</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                    currentDevice.is_online
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {currentDevice.is_online ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">
                مدل: {currentDevice.model} • استقرار: {currentDevice.building} • {currentDevice.floor} •{' '}
                {currentDevice.unit} {currentDevice.rack ? `• رک: ${currentDevice.rack}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-center">
              <div className="text-slate-500 text-[10px]">پورت‌های فعال</div>
              <div className="text-emerald-700 font-bold font-mono text-sm">{activeCount}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-500 text-[10px]">پورت‌های خاموش</div>
              <div className="text-slate-500 font-bold font-mono text-sm">{inactiveCount}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-500 text-[10px]">پورت‌های ترانک</div>
              <div className="text-purple-700 font-bold font-mono text-sm">{trunkCount}</div>
            </div>
          </div>
        </div>
      )}

      {/* Switch Faceplate Visual */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm">
        <div className="flex items-center justify-between mb-2 text-xs">
          <div className="font-bold text-slate-900 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>طرح فیزیکی پورت‌های روی بدنه سوئیچ (Physical Faceplate)</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-600">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>روشن (Up)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              <span>خاموش (Down)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2 rounded bg-purple-600"></span>
              <span>ترانک (Trunk)</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500 text-xs animate-pulse">
            در حال دریافت اطلاعات پورت‌ها از سرور...
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 overflow-x-auto">
            <div className="flex flex-wrap gap-1.5 justify-start min-w-[500px]">
              {ports.map((port) => {
                const isSelected = selectedPort?.port_id === port.port_id;
                const isUp = port.status === 'up';
                const isDisabled = port.admin_status === 'disabled';
                const isTrunk = port.mode === 'trunk';

                return (
                  <button
                    key={port.port_id}
                    onClick={() => {
                      setSelectedPort(port);
                      setIsEditing(false);
                    }}
                    className={`relative group p-1.5 rounded border transition-all flex flex-col items-center w-12 ${
                      isSelected
                        ? 'bg-indigo-950/90 border-indigo-400 ring-2 ring-indigo-500/40 text-white'
                        : isDisabled
                        ? 'bg-slate-900 border-amber-800/60 hover:border-amber-600 text-slate-300'
                        : isUp
                        ? 'bg-slate-800/90 border-slate-700 hover:border-indigo-400 text-slate-200'
                        : 'bg-slate-950/90 border-slate-800 hover:border-slate-700 opacity-60 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-0.5 mb-0.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isDisabled
                            ? 'bg-amber-400'
                            : isUp
                            ? 'bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]'
                            : 'bg-slate-600'
                        }`}
                      ></span>
                      {isTrunk && (
                        <span className="text-[7px] font-bold text-purple-300 bg-purple-900/80 px-0.5 rounded">
                          T
                        </span>
                      )}
                    </div>

                    <div className="w-6 h-5 rounded bg-slate-950 border border-slate-700 flex items-center justify-center text-[8px] font-mono text-slate-300">
                      {port.port_id.replace('GigabitEthernet', 'Gi').replace('TenGigabitEthernet', 'Te').replace('1/0/', '').replace('0/', '')}
                    </div>

                    <div className="mt-0.5 text-[8px] font-mono text-indigo-300">
                      V{port.vlan}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Port Detailed Card */}
      {selectedPort && (
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Cable className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 font-mono">{selectedPort.name}</h4>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold font-mono ${
                      selectedPort.mode === 'trunk'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    }`}
                  >
                    {selectedPort.mode === 'trunk' ? 'TRUNK (ترانک)' : 'ACCESS (اکسس)'}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                      selectedPort.status === 'up'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {selectedPort.status === 'up' ? 'فعال (Connected)' : 'غیرفعال (Disconnected)'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                  سرعت: {selectedPort.speed} • داپلکس: {selectedPort.duplex}
                </p>
              </div>
            </div>

            {!isEditing ? (
              <button
                onClick={() => startEdit(selectedPort)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium shadow-sm transition"
              >
                <Edit3 className="w-3 h-3 text-indigo-600" />
                <span>ویرایش تنظیمات پورت</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs transition"
                >
                  انصراف
                </button>
                <button
                  onClick={handleSavePort}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition disabled:opacity-50"
                >
                  <Save className="w-3 h-3" />
                  <span>{isSaving ? 'در حال ذخیره...' : 'اعمال تغییرات در سوئیچ'}</span>
                </button>
              </div>
            )}
          </div>

          {/* View Mode */}
          {!isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-500 text-[10px] mb-0.5">تجهیز یا هاست متصل:</div>
                <div className="text-slate-900 font-semibold font-mono text-xs">
                  {selectedPort.connected_device || 'تجهیزی متصل نیست'}
                </div>
                <div className="text-slate-400 text-[10px] mt-0.5 font-mono">
                  نوع: {selectedPort.connected_type || 'Host'}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-500 text-[10px] mb-0.5">ویلن (VLAN) تخصیص یافته:</div>
                <div className="text-indigo-700 font-bold font-mono text-xs">
                  VLAN {selectedPort.vlan}
                </div>
                <div className="text-slate-400 text-[10px] mt-0.5 font-mono">
                  ویلن‌های مجاز ترانک: {selectedPort.allowed_vlans || 'همه (1-4094)'}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-500 text-[10px] mb-0.5">وضعیت مدیریتی پورت:</div>
                <div className="text-emerald-700 font-semibold text-xs">
                  {selectedPort.admin_status === 'enabled' ? 'فعال (No Shutdown)' : 'غیرفعال (Shutdown)'}
                </div>
                <div className="text-slate-400 text-[10px] mt-0.5 font-mono">
                  پروتکل: {selectedPort.mode === 'trunk' ? '802.1Q Encapsulation' : 'Access Native'}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-slate-500 text-[10px] mb-0.5">توان برق (PoE Status):</div>
                <div className="flex items-center gap-1 text-slate-900 font-semibold font-mono text-xs">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>{selectedPort.poe_power ? `${selectedPort.poe_power} W` : 'غیرفعال'}</span>
                </div>
                <div className="text-slate-400 text-[10px] mt-0.5 font-mono">
                  وضعیت: {selectedPort.poe_status || 'off'}
                </div>
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-700 mb-1 text-[11px] font-medium">حالت پورت (Port Mode):</label>
                <select
                  value={editMode}
                  onChange={(e) => setEditMode(e.target.value as 'trunk' | 'access')}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-slate-800 text-xs font-mono"
                >
                  <option value="access">Access (اکسس - کلاینت / هاست / پی‌سی)</option>
                  <option value="trunk">Trunk (ترانک - ارتباط سوئیچ به سوئیچ / روتر)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 text-[11px] font-medium">شماره ویلن (VLAN ID):</label>
                <input
                  type="number"
                  value={editVlan}
                  onChange={(e) => setEditVlan(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-slate-800 text-xs font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 text-[11px] font-medium">ویلن‌های مجاز (Allowed VLANs):</label>
                <input
                  type="text"
                  value={editAllowedVlans}
                  onChange={(e) => setEditAllowedVlans(e.target.value)}
                  placeholder="مثال: 1,10,20,30,50"
                  className="w-full px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-slate-800 text-xs font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 text-[11px] font-medium">تجهیز یا هاست متصل:</label>
                <input
                  type="text"
                  value={editConnected}
                  onChange={(e) => setEditConnected(e.target.value)}
                  placeholder="مثال: AP-WIFI-02 یا Core Uplink"
                  className="w-full px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 text-[11px] font-medium">وضعیت مدیریتی پورت:</label>
                <select
                  value={editAdminStatus}
                  onChange={(e) => setEditAdminStatus(e.target.value as 'enabled' | 'disabled')}
                  className="w-full px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-slate-800 text-xs font-mono"
                >
                  <option value="enabled">فعال (No Shutdown)</option>
                  <option value="disabled">غیرفعال (Shutdown)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 text-[11px] font-medium">توضیحات (Description):</label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="توضیح مربوط به این پورت"
                  className="w-full px-2.5 py-1.5 rounded bg-slate-50 border border-slate-300 text-slate-800 text-xs"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ports Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-900">جدول تفکیکی تمام پورت‌ها ({filteredPorts.length})</h4>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <input
              type="text"
              placeholder="جستجوی پورت، ویلن یا هاست..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-2.5 py-1 rounded bg-slate-50 border border-slate-300 text-slate-800 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 w-40"
            />

            <div className="flex items-center bg-slate-100 rounded p-0.5 border border-slate-200">
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2 py-0.5 rounded text-[11px] transition ${
                  filterMode === 'all' ? 'bg-white text-indigo-700 font-semibold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                همه
              </button>
              <button
                onClick={() => setFilterMode('up')}
                className={`px-2 py-0.5 rounded text-[11px] transition ${
                  filterMode === 'up' ? 'bg-white text-indigo-700 font-semibold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                فعال
              </button>
              <button
                onClick={() => setFilterMode('down')}
                className={`px-2 py-0.5 rounded text-[11px] transition ${
                  filterMode === 'down' ? 'bg-white text-indigo-700 font-semibold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                خاموش
              </button>
              <button
                onClick={() => setFilterMode('trunk')}
                className={`px-2 py-0.5 rounded text-[11px] transition ${
                  filterMode === 'trunk' ? 'bg-white text-indigo-700 font-semibold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ترانک
              </button>
              <button
                onClick={() => setFilterMode('access')}
                className={`px-2 py-0.5 rounded text-[11px] transition ${
                  filterMode === 'access' ? 'bg-white text-indigo-700 font-semibold shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                اکسس
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider">
                <th className="p-3">نام پورت</th>
                <th className="p-3">وضعیت پورت</th>
                <th className="p-3">نوع پورت (Mode)</th>
                <th className="p-3">ویلن (VLAN)</th>
                <th className="p-3">تجهیز متصل (Connected Device)</th>
                <th className="p-3">سرعت اتصال</th>
                <th className="p-3">PoE</th>
                <th className="p-3 text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredPorts.map((port) => (
                <tr
                  key={port.port_id}
                  onClick={() => {
                    setSelectedPort(port);
                    setIsEditing(false);
                  }}
                  className={`cursor-pointer transition ${
                    selectedPort?.port_id === port.port_id
                      ? 'bg-indigo-50/60 text-slate-900'
                      : 'hover:bg-slate-50/80 text-slate-800'
                  }`}
                >
                  <td className="p-3 font-bold text-slate-900">{port.port_id}</td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-sans ${
                        port.admin_status === 'disabled'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : port.status === 'up'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          port.admin_status === 'disabled'
                            ? 'bg-amber-500'
                            : port.status === 'up'
                            ? 'bg-emerald-500'
                            : 'bg-slate-400'
                        }`}
                      ></span>
                      {port.admin_status === 'disabled' ? 'Admin Down' : port.status === 'up' ? 'Up' : 'Down'}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        port.mode === 'trunk'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {port.mode.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-indigo-700">VLAN {port.vlan}</td>
                  <td className="p-3 text-slate-800 font-sans text-xs">
                    {port.connected_device || '-'}
                  </td>
                  <td className="p-3 text-slate-600">{port.speed}</td>
                  <td className="p-3 text-slate-600">{port.poe_power ? `${port.poe_power}W` : 'Off'}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(port);
                      }}
                      className="px-2 py-1 rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-sans transition border border-slate-200"
                    >
                      ویرایش
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
