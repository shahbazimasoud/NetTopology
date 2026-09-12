import React, { useState } from 'react';
import {
  Columns,
  Maximize2,
  Minimize2,
  X,
  Plus,
  ArrowLeftRight,
  Grid2X2,
  Rows,
  Sparkles,
  Terminal as TerminalIcon,
  RefreshCw,
  GripVertical,
  Lock,
  Unlock,
} from 'lucide-react';
import { Device, isMikroTikDevice } from '../../types';
import { CiscoTerminalModal } from '../CiscoTerminalModal';
import { MikroTikTerminalModal } from '../MikroTikTerminalModal';
import { TerminalDeviceSelector } from './TerminalDeviceSelector';
import { useLanguage } from '../../i18n/LanguageContext';

export interface MultiTerminalWorkspaceProps {
  activeTerminalDevices: (Device | null)[];
  isOpen: boolean;
  onClose: () => void;
  onDevicesChange: (devices: (Device | null)[]) => void;
  allDevices: Device[];
  onDeviceUpdated?: () => void;
  isLightMode?: boolean;
}

export const MultiTerminalWorkspace: React.FC<MultiTerminalWorkspaceProps> = ({
  activeTerminalDevices,
  isOpen,
  onClose,
  onDevicesChange,
  allDevices,
  onDeviceUpdated,
  isLightMode = false,
}) => {
  const { isEn } = useLanguage();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [layoutOrientation, setLayoutOrientation] = useState<'columns' | 'grid'>('columns');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [preventBackdropClose, setPreventBackdropClose] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nettop_terminal_lock_backdrop') === 'true';
    } catch {
      return false;
    }
  });

  const togglePreventBackdropClose = () => {
    setPreventBackdropClose((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('nettop_terminal_lock_backdrop', String(next));
      } catch {}
      return next;
    });
  };

  if (!isOpen || activeTerminalDevices.length === 0) {
    return null;
  }

  // If there's only 1 device and it's not a null placeholder, render as standard modal
  const isMultiPane = activeTerminalDevices.length > 1 || activeTerminalDevices.some((d) => d === null);

  // Handlers for managing panes
  const handleSplitScreen = () => {
    if (activeTerminalDevices.length < 4) {
      onDevicesChange([...activeTerminalDevices, null]);
    }
  };

  const handleSwapPanes = (fromIdx: number, toIdx: number) => {
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= activeTerminalDevices.length || toIdx >= activeTerminalDevices.length) {
      return;
    }
    const next = [...activeTerminalDevices];
    const temp = next[fromIdx];
    next[fromIdx] = next[toIdx];
    next[toIdx] = temp;
    onDevicesChange(next);
  };

  const handleSwapWithNext = (fromIdx: number) => {
    if (activeTerminalDevices.length <= 1) return;
    const toIdx = (fromIdx + 1) % activeTerminalDevices.length;
    handleSwapPanes(fromIdx, toIdx);
  };

  const handleQuickSwapLeftRight = () => {
    if (activeTerminalDevices.length >= 2) {
      handleSwapPanes(0, 1);
    }
  };

  const handleClosePane = (index: number) => {
    const next = activeTerminalDevices.filter((_, idx) => idx !== index);
    if (next.length === 0) {
      onClose();
    } else {
      onDevicesChange(next);
    }
  };

  const handleSelectDeviceForSlot = (index: number, device: Device) => {
    const next = [...activeTerminalDevices];
    next[index] = device;
    onDevicesChange(next);
  };

  const handleChangeDeviceInSlot = (index: number) => {
    const next = [...activeTerminalDevices];
    next[index] = null;
    onDevicesChange(next);
  };

  // Render single terminal modal directly if only 1 terminal and not multi-pane
  if (!isMultiPane && activeTerminalDevices[0]) {
    const singleDevice = activeTerminalDevices[0];
    const isMikroTik = isMikroTikDevice(singleDevice);

    if (isMikroTik) {
      return (
        <MikroTikTerminalModal
          device={singleDevice}
          isOpen={true}
          onClose={onClose}
          onDeviceUpdated={onDeviceUpdated}
          isLightMode={isLightMode}
          onSplitScreen={handleSplitScreen}
          allDevices={allDevices}
        />
      );
    }

    return (
      <CiscoTerminalModal
        device={singleDevice}
        isOpen={true}
        onClose={onClose}
        onDeviceUpdated={onDeviceUpdated}
        onSplitScreen={handleSplitScreen}
        allDevices={allDevices}
      />
    );
  }

  // Grid layout classes based on pane count
  const paneCount = activeTerminalDevices.length;
  let gridLayoutClass = 'grid-cols-1 lg:grid-cols-2';
  if (paneCount === 1) {
    gridLayoutClass = 'grid-cols-1';
  } else if (paneCount === 2) {
    gridLayoutClass = 'grid-cols-1 lg:grid-cols-2';
  } else if (paneCount === 3) {
    gridLayoutClass = layoutOrientation === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-3';
  } else if (paneCount >= 4) {
    gridLayoutClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2';
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col p-1 sm:p-2.5 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden"
      dir={isEn ? 'ltr' : 'rtl'}
      onClick={(e) => {
        if (e.target === e.currentTarget && !preventBackdropClose) {
          onClose();
        }
      }}
    >
      {/* Global Multi-Terminal Top Navigation Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl mb-2 text-xs select-none shrink-0 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Columns className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wide">
              {isEn ? 'Multi-Terminal Workspace' : 'میز کار چند ترمینال همزمان (CLI Split-Screen)'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              {activeTerminalDevices.filter(Boolean).length} / {paneCount} {isEn ? 'Panes' : 'ترمینال'}
            </span>
          </div>

          {/* Drag & Drop Hint */}
          {paneCount > 1 && (
            <div className="hidden xl:flex items-center gap-1 text-[10px] text-slate-400 font-mono px-2 py-1 rounded bg-slate-800/60 border border-slate-700/50">
              <GripVertical className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isEn ? 'Drag & drop panes to reorder/swap' : 'قابلیت کشیدن و رها کردن (Drag & Drop) برای جابجایی پنجره‌ها'}</span>
            </div>
          )}
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Quick Swap Panes Button */}
          {paneCount >= 2 && (
            <button
              type="button"
              onClick={handleQuickSwapLeftRight}
              className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition flex items-center gap-1.5 font-medium cursor-pointer text-xs"
              title={isEn ? 'Swap Panes (Left & Right / Next)' : 'جابجایی موقعیت پنجره‌ها'}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>{isEn ? 'Swap Panes' : 'جابجایی پنجره‌ها'}</span>
            </button>
          )}

          {/* Add Another Terminal Pane (Up to 4) */}
          {paneCount < 4 && (
            <button
              type="button"
              onClick={handleSplitScreen}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition flex items-center gap-1.5 cursor-pointer text-xs shadow-xs"
              title={isEn ? 'Add another terminal pane (Max 4)' : 'افزودن یک ترمینال دیگر (حداکثر ۴)'}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isEn ? 'Add Pane' : 'افزودن ترمینال (+)'}</span>
            </button>
          )}

          {/* Layout Toggle for 3-4 panes */}
          {paneCount >= 3 && (
            <button
              type="button"
              onClick={() => setLayoutOrientation(layoutOrientation === 'columns' ? 'grid' : 'columns')}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title={isEn ? 'Toggle Layout (Grid/Columns)' : 'تغییر چینش (گرید / ستونی)'}
            >
              {layoutOrientation === 'columns' ? <Grid2X2 className="w-3.5 h-3.5" /> : <Rows className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Lock Terminal Backdrop Close Toggle Button */}
          <button
            type="button"
            onClick={togglePreventBackdropClose}
            className={`px-2 py-1 rounded-lg border text-xs flex items-center gap-1.5 transition font-medium cursor-pointer ${
              preventBackdropClose
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border-slate-700'
            }`}
            title={
              preventBackdropClose
                ? (isEn ? 'Terminal Locked: Clicking outside will NOT close it (Click to unlock)' : 'ترمینال قفل است: کلیک بیرون پنجره آن را نمی‌بندد (جهت باز کردن کلیک کنید)')
                : (isEn ? 'Lock Terminal: Prevent closing when clicking outside' : 'قفل ترمینال: جلوگیری از بسته شدن با کلیک بیرون پنجره')
            }
          >
            {preventBackdropClose ? <Lock className="w-3.5 h-3.5 text-amber-400" /> : <Unlock className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">
              {preventBackdropClose ? (isEn ? 'Locked' : 'قفل بسته شدن') : (isEn ? 'Lock' : 'قفل')}
            </span>
          </button>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={() => {
              setIsFullscreen(!isFullscreen);
              if (!isFullscreen && document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else if (isFullscreen && document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
              }
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title={isFullscreen ? (isEn ? 'Exit Fullscreen' : 'خروج از تمام صفحه') : (isEn ? 'Fullscreen' : 'تمام صفحه')}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Close All Terminals */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition cursor-pointer"
            title={isEn ? 'Close All Terminals' : 'بستن همه ترمینال‌ها'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Panes Grid Container */}
      <div className={`flex-1 grid ${gridLayoutClass} gap-2 min-h-0 overflow-y-auto`}>
        {activeTerminalDevices.map((dev, index) => {
          const isMikroTik = dev ? isMikroTikDevice(dev) : false;
          const isBeingDragged = draggedIndex === index;
          const isTargetedByDrag = dragOverIndex === index && draggedIndex !== index;

          return (
            <div
              key={dev ? `${dev.id}-${index}` : `empty-slot-${index}`}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverIndex !== index) {
                  setDragOverIndex(index);
                }
              }}
              onDragLeave={(e) => {
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                if (dragOverIndex === index) {
                  setDragOverIndex(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                const from = draggedIndex !== null ? draggedIndex : parseInt(e.dataTransfer.getData('text/plain'), 10);
                if (!isNaN(from) && from !== index) {
                  handleSwapPanes(from, index);
                }
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              className={`relative flex flex-col h-full min-h-[340px] rounded-xl border transition-all duration-150 overflow-hidden shadow-xl ${
                isBeingDragged
                  ? 'opacity-40 border-dashed border-indigo-500 scale-[0.99]'
                  : isTargetedByDrag
                  ? 'border-2 border-indigo-400 ring-4 ring-indigo-500/40 bg-indigo-950/20'
                  : 'border-slate-800 bg-slate-900/90'
              }`}
            >
              {/* Drag over drop target visual overlay */}
              {isTargetedByDrag && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-indigo-950/80 backdrop-blur-xs border-2 border-dashed border-indigo-400 rounded-xl pointer-events-none animate-in fade-in duration-100">
                  <div className="px-4 py-2.5 rounded-xl bg-slate-900 border border-indigo-400 shadow-2xl flex items-center gap-2.5 text-white font-medium text-xs">
                    <ArrowLeftRight className="w-4 h-4 text-indigo-400 animate-pulse" />
                    <span>
                      {isEn
                        ? `Drop to swap with Pane ${index + 1}`
                        : `رها کنید تا با پنجره شماره ${index + 1} جابجا شود`}
                    </span>
                  </div>
                </div>
              )}

              {/* Top Drag Handle & Info Bar */}
              <div className="flex items-center justify-between px-3 py-1 bg-slate-950/90 border-b border-slate-800 text-[11px] text-slate-300 select-none shrink-0">
                <div
                  draggable={true}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', String(index));
                    e.dataTransfer.effectAllowed = 'move';
                    setDraggedIndex(index);
                  }}
                  onDragEnd={() => {
                    setDraggedIndex(null);
                    setDragOverIndex(null);
                  }}
                  className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing hover:text-white transition px-1.5 py-0.5 rounded hover:bg-slate-800 font-mono font-medium text-[11px]"
                  title={isEn ? "Drag to swap/reorder this pane with another" : "این پنجره را با ماوس بگیرید و روی پنجره دیگر رها کنید تا جابجا شوند (Drag & Drop)"}
                >
                  <GripVertical className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="font-bold text-white">{isEn ? `Pane ${index + 1}` : `پنجره ${index + 1}`}</span>
                  {dev && (
                    <span className="text-slate-400 truncate max-w-[120px] sm:max-w-[200px]">
                      : {dev.name} ({dev.ip || dev.model})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 font-mono text-[10px] text-slate-400">
                  {paneCount > 1 && (
                    <button
                      type="button"
                      onClick={() => handleSwapWithNext(index)}
                      className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 hover:border-amber-500/40 flex items-center gap-1 transition cursor-pointer"
                      title={
                        isEn
                          ? `Swap with Pane ${(index + 1) % paneCount + 1}`
                          : `جابجایی با پنجره شماره ${(index + 1) % paneCount + 1}`
                      }
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                      <span>{isEn ? `Swap ➔ P${(index + 1) % paneCount + 1}` : `جابجایی با ${(index + 1) % paneCount + 1}`}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* If device is selected, render the embedded CLI terminal */}
              {dev ? (
                isMikroTik ? (
                  <MikroTikTerminalModal
                    device={dev}
                    isOpen={true}
                    onClose={() => handleClosePane(index)}
                    onDeviceUpdated={onDeviceUpdated}
                    isLightMode={isLightMode}
                    isEmbedded={true}
                    onSwap={() => handleSwapWithNext(index)}
                    paneIndex={index}
                    totalPanes={paneCount}
                    onClosePane={() => handleClosePane(index)}
                    onChangeDevice={() => handleChangeDeviceInSlot(index)}
                    allDevices={allDevices}
                  />
                ) : (
                  <CiscoTerminalModal
                    device={dev}
                    isOpen={true}
                    onClose={() => handleClosePane(index)}
                    onDeviceUpdated={onDeviceUpdated}
                    isEmbedded={true}
                    onSwap={() => handleSwapWithNext(index)}
                    paneIndex={index}
                    totalPanes={paneCount}
                    onClosePane={() => handleClosePane(index)}
                    onChangeDevice={() => handleChangeDeviceInSlot(index)}
                    allDevices={allDevices}
                  />
                )
              ) : (
                /* If no device selected for this pane, render the Device Selector */
                <TerminalDeviceSelector
                  devices={allDevices}
                  currentDeviceId={activeTerminalDevices[0]?.id}
                  isLightMode={isLightMode}
                  onSelectDevice={(selectedDev) => handleSelectDeviceForSlot(index, selectedDev)}
                  onCancel={() => handleClosePane(index)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
