import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Search,
  Plus,
  Server,
  Router as RouterIcon,
  Wifi,
  MapPin,
  Check,
  CreditCard,
  Box,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { Device, CustomTopologyRack, DeviceCanvasDisplayMode } from '../types';
import { useLanguage } from '../i18n';
import { convertNodeToHardwareDevice } from './rack/PhysicalNodeOnCanvas';
import { HardwareSvgRenderer } from './rack/HardwareSvgRenderer';

interface CustomMapAddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableDevices: Device[];
  existingDeviceIds: string[];
  racks?: CustomTopologyRack[];
  initialDisplayMode?: DeviceCanvasDisplayMode;
  onAddDevice: (device: Device, mode: DeviceCanvasDisplayMode, targetRackId?: string) => void;
}

export const CustomMapAddDeviceModal: React.FC<CustomMapAddDeviceModalProps> = ({
  isOpen,
  onClose,
  availableDevices,
  existingDeviceIds,
  racks = [],
  initialDisplayMode,
  onAddDevice,
}) => {
  const { isEn, isRtl } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'switch' | 'router' | 'access_point'>('all');
  const [selectedDisplayMode, setSelectedDisplayMode] = useState<DeviceCanvasDisplayMode>(
    initialDisplayMode || 'card'
  );
  const [perDeviceTargetRack, setPerDeviceTargetRack] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const filteredDevices = availableDevices.filter((dev) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      dev.name.toLowerCase().includes(q) ||
      dev.ip.toLowerCase().includes(q) ||
      (dev.model && dev.model.toLowerCase().includes(q)) ||
      (dev.building && dev.building.toLowerCase().includes(q));

    if (!matchesSearch) return false;
    if (typeFilter !== 'all' && dev.type !== typeFilter) return false;
    return true;
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center p-4 modal-backdrop-blur"
      data-modal-backdrop="true"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEn ? 'Add Device to Custom Topology Map' : 'افزودن تجهیز به نقشه سفارشی توپولوژی'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isEn
                  ? 'Choose how you want to place the device: as an interactive card for cabling, or physical rackmount hardware.'
                  : 'نحوه قرارگیری تجهیز را مشخص کنید: به شکل کارت جهت کابل‌کشی بین پورت‌ها، یا شاسی فیزیکی جهت جانمایی در رک.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Representation Mode Switcher Banner */}
        <div className="px-4 py-2.5 bg-indigo-50/70 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {isEn ? 'Default Representation:' : 'حالت نمایش پیش‌فرض تجهیز:'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded-xl border border-indigo-200 dark:border-indigo-800/80 shadow-xs">
            <button
              type="button"
              onClick={() => setSelectedDisplayMode('card')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedDisplayMode === 'card'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{isEn ? 'Card View (Cabling & Ports)' : 'نمای کارت (کابل‌کشی و ارتباط پورت‌ها)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDisplayMode('physical')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                selectedDisplayMode === 'physical'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>{isEn ? 'Physical Chassis (Rackmount)' : 'نمای فیزیکی شاسی (رکمونت و جانمایی در رک)'}</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder={isEn ? 'Search devices by name, IP, model...' : 'جستجوی نام، آی‌پی یا مدل تجهیز...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full px-3 py-1.5 ${isRtl ? 'pr-8' : 'pl-8'} rounded-xl bg-white dark:bg-slate-850 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none`}
            />
            <Search className={`w-3.5 h-3.5 text-slate-400 absolute ${isRtl ? 'right-2.5' : 'left-2.5'} top-2.5`} />
          </div>

          <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] ${
                typeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isEn ? 'All Devices' : 'همه تجهیزات'}
            </button>
            <button
              onClick={() => setTypeFilter('switch')}
              className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] ${
                typeFilter === 'switch'
                  ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isEn ? 'Switches' : 'سوئیچ‌ها'}
            </button>
            <button
              onClick={() => setTypeFilter('router')}
              className={`px-2.5 py-1 rounded-lg transition font-medium text-[11px] ${
                typeFilter === 'router'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {isEn ? 'Routers' : 'روترها'}
            </button>
          </div>
        </div>

        {/* Device List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredDevices.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              {isEn ? 'No devices found matching your criteria.' : 'تجهیزی مطابق با فیلتر یافت نشد.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredDevices.map((device) => {
                const isAlreadyOnMap = existingDeviceIds.includes(device.id);
                const hwPreview = convertNodeToHardwareDevice(device);
                const mountedRack = racks.find((r) => r.devices?.some((d) => d.id === device.id));
                const mountedDev = mountedRack?.devices?.find((d) => d.id === device.id);
                const targetRackId = perDeviceTargetRack[device.id] || racks[0]?.id;

                return (
                  <div
                    key={device.id}
                    className={`p-3 rounded-2xl border transition flex flex-col justify-between gap-3 ${
                      mountedRack
                        ? 'bg-slate-900/90 border-cyan-500/40 shadow-sm'
                        : isAlreadyOnMap
                        ? 'bg-slate-50 dark:bg-slate-850/60 border-slate-200 dark:border-slate-800'
                        : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`p-2 rounded-xl flex-shrink-0 ${
                            device.type === 'switch'
                              ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400'
                              : device.type === 'router'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400'
                          }`}
                        >
                          {device.type === 'switch' ? (
                            <Server className="w-4 h-4" />
                          ) : device.type === 'router' ? (
                            <RouterIcon className="w-4 h-4" />
                          ) : (
                            <Wifi className="w-4 h-4" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate font-mono flex items-center gap-1.5">
                            <span>{device.name}</span>
                            {mountedRack && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-[9px] font-mono">
                                {mountedRack.name} U{mountedDev?.startU}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1.5">
                            <span>{device.ip}</span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              ({hwPreview.brand} {hwPreview.model})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            <span>
                              {device.building || 'Main'} • {device.floor || 'Floor 1'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex-shrink-0">
                        {hwPreview.heightU}U
                      </span>
                    </div>

                    {/* Mini SVG Faceplate Preview in Physical Mode */}
                    {selectedDisplayMode === 'physical' && (
                      <div className="p-1.5 rounded-xl bg-slate-950/90 border border-slate-700/60 flex items-center justify-center overflow-hidden shadow-inner">
                        <HardwareSvgRenderer
                          device={hwPreview}
                          viewMode="front"
                          width={260}
                          height={hwPreview.heightU * 22}
                        />
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-400 font-mono">
                        {device.total_ports || 24} {isEn ? 'Ports' : 'پورت'}
                      </span>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Rack selector if physical mode and racks exist and not already in this rack */}
                        {selectedDisplayMode === 'physical' && racks.length > 1 && !mountedRack && (
                          <select
                            value={targetRackId}
                            onChange={(e) =>
                              setPerDeviceTargetRack((prev) => ({
                                ...prev,
                                [device.id]: e.target.value,
                              }))
                            }
                            className="text-[10px] py-1 px-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-200"
                          >
                            {racks.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        )}

                        {/* Mount into rack button */}
                        {selectedDisplayMode === 'physical' && racks.length > 0 && !mountedRack && (
                          <button
                            type="button"
                            onClick={() => {
                              onAddDevice(device, 'physical', targetRackId);
                              onClose();
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-medium shadow-sm transition active:scale-95 cursor-pointer"
                            title={
                              isEn
                                ? `Mount into ${racks.find((r) => r.id === targetRackId)?.name || 'Rack'}`
                                : `نصب فیزیکی در ${racks.find((r) => r.id === targetRackId)?.name || 'رک'}`
                            }
                          >
                            <Box className="w-3.5 h-3.5" />
                            <span>{isEn ? 'Mount in Rack' : 'نصب در رک'}</span>
                          </button>
                        )}

                        {/* Already mounted badge */}
                        {mountedRack && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-cyan-400 bg-cyan-950/60 px-2 py-1 rounded-xl border border-cyan-700/50">
                            <Check className="w-3 h-3" />
                            <span>
                              {isEn
                                ? `Mounted in ${mountedRack.name}`
                                : `نصب‌شده در ${mountedRack.name}`}
                            </span>
                          </span>
                        )}

                        {/* Already on map badge */}
                        {isAlreadyOnMap && !mountedRack && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                            <Check className="w-3 h-3" />
                            <span>{isEn ? 'On Canvas' : 'روی بوم'}</span>
                          </span>
                        )}

                        {/* Add to Canvas as standalone node */}
                        {!isAlreadyOnMap && (
                          <button
                            type="button"
                            onClick={() => {
                              onAddDevice(device, selectedDisplayMode);
                              onClose();
                            }}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-white text-xs font-medium shadow-xs transition active:scale-95 cursor-pointer ${
                              selectedDisplayMode === 'card'
                                ? 'bg-purple-600 hover:bg-purple-500'
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>
                              {selectedDisplayMode === 'card'
                                ? isEn
                                  ? 'Add as Card'
                                  : 'افزودن کارت'
                                : isEn
                                ? 'Add to Canvas'
                                : 'افزودن به بوم'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {isEn
              ? 'Tip: You can install devices directly into racks or drop them onto the canvas.'
              : 'نکته: تجهیزات را می‌توانید مستقیماً درون رک‌های فعال نصب کرده یا روی بوم قرار دهید.'}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-medium cursor-pointer"
          >
            {isEn ? 'Close' : 'بستن'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
