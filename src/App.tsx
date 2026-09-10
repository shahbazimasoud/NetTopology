import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, ThemeType } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { DeviceListView } from './components/DeviceListView';
import { SchematicTopologyView } from './components/SchematicTopologyView';
import { PortManagementView } from './components/PortManagementView';
import { CdpLldpScannerView } from './components/CdpLldpScannerView';
import { TemplateManagementView } from './components/TemplateManagementView';
import { AddDeviceModal } from './components/AddDeviceModal';
import { EditDeviceModal } from './components/EditDeviceModal';
import { PortInspectorModal } from './components/PortInspectorModal';
import { CiscoTerminalModal } from './components/CiscoTerminalModal';
import { ApplyTemplateModal } from './components/ApplyTemplateModal';
import { ReleaseNotesModal } from './components/ReleaseNotesModal';
import { SettingsView } from './components/settings/SettingsView';
import { AuditLogsView } from './components/logs/AuditLogsView';
import { APP_VERSION } from './version';
import { Device, TopologyData } from './types';
import {
  fetchDevices,
  fetchTopology,
  addDevice,
  updateDevice,
  deleteDevice,
  pingAllDevices,
  pingDevice,
  runCdpLldpScan,
  resetDemoData,
  writeMemory
} from './services/api';
import {
  logDeviceAddition,
  logDeviceDeletion,
  logDeviceUpdate,
  logDeviceCommand
} from './services/auditLogger';
import { useLanguage } from './i18n';

export default function App() {
  const { t, isRtl, isEn } = useLanguage();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [devices, setDevices] = useState<Device[]>([]);
  const [topology, setTopology] = useState<TopologyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Theme State (Default to obsidian cyber spatial glass)
  const [panelTheme, setPanelTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('panel_theme') as ThemeType) || 'obsidian';
  });

  const changeTheme = (newTheme: ThemeType) => {
    setPanelTheme(newTheme);
    localStorage.setItem('panel_theme', newTheme);
    localStorage.setItem('theme_mode', newTheme === 'light' ? 'light' : 'dark');
  };

  // Collapsible sidebar state with local storage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebar_collapsed') === 'true';
    } catch (e) {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [portInspectorDevice, setPortInspectorDevice] = useState<Device | null>(null);
  const [terminalDevice, setTerminalDevice] = useState<Device | null>(null);
  const [applyTemplateDevice, setApplyTemplateDevice] = useState<Device | null>(null);
  const [applyPreselectedTemplateId, setApplyPreselectedTemplateId] = useState<string | undefined>(undefined);
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);

  // Fullscreen Topology Mode (Hides Navbar header, sidebar, and footer for 100% canvas view)
  const [isTopologyFullscreen, setIsTopologyFullscreen] = useState(false);

  const toggleTopologyFullscreen = useCallback(() => {
    setIsTopologyFullscreen((prev) => {
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
  }, []);

  // Listen for Escape key and browser fullscreen changes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isTopologyFullscreen) {
        setIsTopologyFullscreen(false);
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isTopologyFullscreen) {
        setIsTopologyFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isTopologyFullscreen]);

  // Initial load
  const loadData = useCallback(async () => {
    try {
      const [devRes, topoRes] = await Promise.all([
        fetchDevices(),
        fetchTopology(),
      ]);
      setDevices(devRes.devices);
      setTopology(topoRes);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Periodic reachability polling every 30s
  useEffect(() => {
    const timer = setInterval(() => {
      refreshStatusesQuietly();
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const refreshStatusesQuietly = async () => {
    try {
      const devRes = await fetchDevices();
      setDevices(devRes.devices);
    } catch (e) {
      // Quiet fail on periodic ping
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Full manual refresh
  const handleRefreshAll = async () => {
    try {
      setIsRefreshing(true);
      await pingAllDevices();
      await loadData();
      showToast(t('toast_refresh_success'));
    } catch (err: any) {
      showToast(t('toast_refresh_error', { error: err.message }));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Ping single device
  const handlePingDevice = async (id: string) => {
    try {
      const res = await pingDevice(id);
      setDevices((prev) => prev.map((d) => (d.id === id ? res.device : d)));
      const statusLabel = res.device.is_online ? (isEn ? 'Online' : 'آنلاین') : (isEn ? 'Offline' : 'آفلاین');
      showToast(
        t('toast_ping_result', {
          name: res.device.name,
          status: statusLabel,
          latency: res.device.latency_ms ?? 0,
        })
      );
    } catch (err: any) {
      showToast(t('toast_ping_error', { error: err.message }));
    }
  };

  // Run CDP/LLDP scan
  const handleRunScan = async () => {
    try {
      setIsScanning(true);
      const res = await runCdpLldpScan();
      await loadData();
      showToast(isEn ? ((res as any).message_en || t('toast_scan_done')) : (res.message || t('toast_scan_done')));
    } catch (err: any) {
      showToast(t('toast_scan_error', { error: err.message }));
    } finally {
      setIsScanning(false);
    }
  };

  // Add new device
  const handleAddDevice = async (newDev: Partial<Device>) => {
    const res = await addDevice(newDev);
    await loadData();
    if (res.device) {
      logDeviceAddition(res.device);
    }
    showToast(t('toast_device_added', { name: newDev.name || '' }));
    return res.device;
  };

  // Update existing device
  const handleUpdateDevice = async (id: string, updates: Partial<Device>) => {
    try {
      const oldDev = devices.find((d) => d.id === id);
      const res = await updateDevice(id, updates);
      await loadData();
      if (res.device) {
        logDeviceUpdate(id, oldDev, res.device);
      }
      showToast(isEn ? `Device "${res.device.name}" updated successfully.` : `مشخصات تجهیز «${res.device.name}» با موفقیت ویرایش و ذخیره شد.`);
      return res.device;
    } catch (err: any) {
      showToast(isEn ? `Error updating device: ${err.message}` : `خطا در به‌روزرسانی مشخصات تجهیز: ${err.message}`);
      throw err;
    }
  };

  // Delete device
  const handleDeleteDevice = async (id: string) => {
    try {
      const targetDev = devices.find((d) => d.id === id);
      if (targetDev) {
        logDeviceDeletion(targetDev);
      }
      await deleteDevice(id);
      await loadData();
      showToast(t('toast_device_deleted'));
    } catch (err: any) {
      showToast(t('toast_device_delete_error', { error: err.message }));
    }
  };

  // Reset to corporate seed
  const handleResetDemo = async () => {
    if (window.confirm(t('toast_reset_confirm'))) {
      try {
        await resetDemoData();
        await loadData();
        showToast(t('toast_reset_done'));
      } catch (err: any) {
        showToast(t('toast_reset_error', { error: err.message }));
      }
    }
  };

  // Write running-config to startup-config (NVRAM)
  const handleWriteMemory = async (deviceId: string) => {
    try {
      const dev = devices.find((d) => d.id === deviceId);
      const res = await writeMemory(deviceId);
      await loadData();
      if (dev) {
        logDeviceCommand({
          deviceId: dev.id,
          deviceName: dev.name,
          deviceIp: dev.ip,
          deviceVendor: dev.model.toLowerCase().includes('mikrotik') ? 'mikrotik' : 'cisco',
          deviceModel: dev.model,
          deviceLocation: [dev.building, dev.floor, dev.unit, dev.rack ? `رک ${dev.rack}` : ''].filter(Boolean).join(' > '),
          channel: 'port_context_menu',
          command: 'write memory',
          riskLevel: 'medium',
          status: 'success',
          outputSummary: 'Building configuration...\n[OK]',
          notes: 'ذخیره Running-Config در Startup-Config از طریق کنترل پنل پورتال',
        });
      }
      showToast(isEn ? ((res as any).message_en || t('toast_write_mem_success')) : (res.message || t('toast_write_mem_success')));
    } catch (err: any) {
      showToast(t('toast_write_mem_error', { error: err.message }));
    }
  };

  const onlineCount = devices.filter((d) => d.is_online).length;
  const offlineCount = devices.filter((d) => !d.is_online).length;

  return (
    <div
      className={`h-screen min-h-screen max-h-screen relative flex flex-col justify-between theme-${panelTheme} ${
        isRtl ? 'dir-rtl text-right' : 'dir-ltr text-left'
      } font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-300 overflow-hidden`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Dynamic Ambient Glow Background */}
      <div className="ambient-glow-background" />

      {/* Navbar Header (Hidden in Full Mode) */}
      {!isTopologyFullscreen && (
        <Navbar
          onRefreshAll={handleRefreshAll}
          isRefreshing={isRefreshing}
          onQuickScan={handleRunScan}
          isScanning={isScanning}
          onResetDemo={handleResetDemo}
          onlineCount={onlineCount}
          totalDevices={devices.length}
          panelTheme={panelTheme}
          onChangeTheme={changeTheme}
          onOpenReleaseNotes={() => setIsReleaseNotesOpen(true)}
          onOpenSettings={() => setActiveTab('settings')}
        />
      )}

      {/* Main Layout (Sidebar + Content View) */}
      <div className={`flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-0 ${isTopologyFullscreen ? 'z-50 h-full w-full p-0 m-0' : 'z-10'}`}>
        {/* Sidebar (Hidden in Full Mode) */}
        {!isTopologyFullscreen && (
          <Sidebar
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setIsTopologyFullscreen(false);
              setActiveTab(tab);
            }}
            devicesCount={devices.length}
            offlineCount={offlineCount}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            onOpenReleaseNotes={() => setIsReleaseNotesOpen(true)}
          />
        )}

        {/* View Port */}
        <main className={`flex-1 min-h-0 min-w-0 ${isTopologyFullscreen ? 'overflow-hidden h-full w-full p-0 m-0' : 'overflow-y-auto'}`}>
          {activeTab === 'dashboard' && (
            <DashboardView
              devices={devices}
              topology={topology}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onScanCdpLldp={handleRunScan}
              isScanning={isScanning}
              onInspectPorts={(dev) => setPortInspectorDevice(dev)}
              onRefreshAll={handleRefreshAll}
              isRefreshing={isRefreshing}
            />
          )}

          {activeTab === 'devices' && (
            <DeviceListView
              devices={devices}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onPingDevice={handlePingDevice}
              onDeleteDevice={handleDeleteDevice}
              onEditDevice={(dev) => setEditingDevice(dev)}
              onInspectPorts={(dev) => setPortInspectorDevice(dev)}
              onConnectTerminal={(dev) => setTerminalDevice(dev)}
              onApplyTemplate={(dev) => {
                setApplyTemplateDevice(dev);
                setApplyPreselectedTemplateId(undefined);
              }}
              onWriteMemory={handleWriteMemory}
              onRefreshAll={handleRefreshAll}
              isRefreshing={isRefreshing}
            />
          )}

          {activeTab === 'templates' && (
            <TemplateManagementView
              devices={devices}
              onDeviceUpdated={loadData}
              onOpenTerminal={(dev) => setTerminalDevice(dev)}
            />
          )}

          {activeTab === 'schematic' && (
            <SchematicTopologyView
              topology={topology}
              loading={loading}
              onRefresh={loadData}
              onScanCdpLldp={handleRunScan}
              isScanning={isScanning}
              onInspectDevice={(dev) => setPortInspectorDevice(dev)}
              onInspectPorts={(dev) => setPortInspectorDevice(dev)}
              onConnectTerminal={(dev) => setTerminalDevice(dev)}
              isFullMode={isTopologyFullscreen}
              onToggleFullMode={toggleTopologyFullscreen}
            />
          )}

          {activeTab === 'ports' && <PortManagementView devices={devices} />}

          {activeTab === 'scanner' && (
            <CdpLldpScannerView onNavigateToTopology={() => setActiveTab('schematic')} />
          )}

          {activeTab === 'logs' && <AuditLogsView />}

          {(activeTab === 'settings' ||
            activeTab === 'settings-groups' ||
            activeTab === 'settings-users' ||
            activeTab === 'settings-ad' ||
            activeTab === 'settings-rbac' ||
            activeTab === 'settings-backup') && (
            <SettingsView
              devices={devices}
              activeSubTab={
                activeTab === 'settings-users'
                  ? 'users'
                  : activeTab === 'settings-ad'
                  ? 'ad'
                  : activeTab === 'settings-rbac'
                  ? 'rbac'
                  : activeTab === 'settings-backup'
                  ? 'backup'
                  : 'groups'
              }
              onSelectSubTab={(sub) => {
                setActiveTab(
                  sub === 'users'
                    ? 'settings-users'
                    : sub === 'ad'
                    ? 'settings-ad'
                    : sub === 'rbac'
                    ? 'settings-rbac'
                    : sub === 'backup'
                    ? 'settings-backup'
                    : 'settings-groups'
                );
              }}
              onRefreshAllData={loadData}
            />
          )}
        </main>
      </div>

      {/* High Density Cyber Spatial Footer Status Bar (Hidden in Full Mode) */}
      {!isTopologyFullscreen && (
        <footer className="h-8 spatial-glass text-slate-300 flex items-center px-4 lg:px-6 shrink-0 justify-between text-[11px] border-t border-white/10 select-none z-20 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse"></span>
              {t('footer_network_status')} <b className="text-emerald-400 font-mono font-bold">{t('footer_status_nominal')}</b>
            </span>
            <span className="hidden sm:inline text-slate-400">
              {t('footer_core_latency')} <b className="text-cyan-400 font-mono">1.2ms</b>
            </span>
            <span>
              {t('footer_connected_devices')} <b className="text-indigo-400 font-mono font-bold">{onlineCount}</b>/{devices.length}
            </span>
            <span className="hidden md:inline text-slate-400">
              {t('footer_neighbor_engine')} <b className="text-purple-400 font-mono">CDP v2 / LLDP Matrix</b>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsReleaseNotesOpen(true)}
              className="font-mono text-slate-400 hover:text-cyan-300 text-[10px] hidden sm:flex items-center gap-1.5 transition cursor-pointer"
              title={t('footer_view_release')}
            >
              <span>NetTopology OS</span>
              <span className="text-cyan-400 font-bold bg-white/5 hover:bg-white/10 px-1.5 py-0.2 rounded border border-white/10">
                v{APP_VERSION}
              </span>
            </button>
          </div>
        </footer>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-10 ${isRtl ? 'left-6' : 'right-6'} z-50 spatial-glass border border-indigo-500/50 text-indigo-100 px-4 py-2.5 rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.4)] text-xs flex items-center gap-3 backdrop-blur-2xl animate-fadeIn`}>
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white mr-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Add Device Modal */}
      <AddDeviceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddDevice}
        onDeviceCreatedWithTemplate={(createdDevice, templateId) => {
          setApplyTemplateDevice(createdDevice);
          setApplyPreselectedTemplateId(templateId);
        }}
      />

      {/* Edit Device Modal */}
      {editingDevice && (
        <EditDeviceModal
          isOpen={!!editingDevice}
          device={editingDevice}
          onClose={() => setEditingDevice(null)}
          onSave={async (deviceId, updates) => {
            await handleUpdateDevice(deviceId, updates);
            setEditingDevice(null);
          }}
        />
      )}

      {/* Apply Template Interactive Modal */}
      <ApplyTemplateModal
        isOpen={!!applyTemplateDevice}
        onClose={() => {
          setApplyTemplateDevice(null);
          setApplyPreselectedTemplateId(undefined);
        }}
        targetDevice={applyTemplateDevice}
        allDevices={devices}
        preselectedTemplateId={applyPreselectedTemplateId}
        onApplied={(updatedDevice) => {
          loadData();
          showToast(t('toast_template_applied', { name: updatedDevice.name }));
        }}
      />

      {/* Port Inspector Modal */}
      <PortInspectorModal
        device={portInspectorDevice}
        isOpen={!!portInspectorDevice}
        onClose={() => setPortInspectorDevice(null)}
        onPortUpdated={loadData}
        onConnectTerminal={(dev) => setTerminalDevice(dev)}
        onWriteMemory={handleWriteMemory}
      />

      {/* Cisco Terminal Modal */}
      <CiscoTerminalModal
        device={terminalDevice}
        isOpen={!!terminalDevice}
        onClose={() => setTerminalDevice(null)}
        onDeviceUpdated={loadData}
      />

      {/* Release Notes & Version History Modal */}
      <ReleaseNotesModal
        isOpen={isReleaseNotesOpen}
        onClose={() => setIsReleaseNotesOpen(false)}
      />
    </div>
  );
}
