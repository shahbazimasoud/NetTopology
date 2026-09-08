import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, ThemeType } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { DeviceListView } from './components/DeviceListView';
import { SchematicTopologyView } from './components/SchematicTopologyView';
import { PortManagementView } from './components/PortManagementView';
import { CdpLldpScannerView } from './components/CdpLldpScannerView';
import { AddDeviceModal } from './components/AddDeviceModal';
import { PortInspectorModal } from './components/PortInspectorModal';
import { CiscoTerminalModal } from './components/CiscoTerminalModal';
import { Device, TopologyData } from './types';
import {
  fetchDevices,
  fetchTopology,
  addDevice,
  deleteDevice,
  pingAllDevices,
  pingDevice,
  runCdpLldpScan,
  resetDemoData,
  writeMemory
} from './services/api';

export default function App() {
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

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [portInspectorDevice, setPortInspectorDevice] = useState<Device | null>(null);
  const [terminalDevice, setTerminalDevice] = useState<Device | null>(null);

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
      showToast('پایش لحظه‌ای تمامی تجهیزات شبکه با موفقیت انجام شد.');
    } catch (err: any) {
      showToast('خطا در پایش تجهیزات: ' + err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Ping single device
  const handlePingDevice = async (id: string) => {
    try {
      const res = await pingDevice(id);
      setDevices((prev) => prev.map((d) => (d.id === id ? res.device : d)));
      showToast(
        `تجهیز ${res.device.name} پایش شد: ${
          res.device.is_online ? `آنلاین (${res.device.latency_ms}ms)` : 'آفلاین'
        }`
      );
    } catch (err: any) {
      showToast('خطا در پینگ تجهیز: ' + err.message);
    }
  };

  // Run CDP/LLDP scan
  const handleRunScan = async () => {
    try {
      setIsScanning(true);
      const res = await runCdpLldpScan();
      await loadData();
      showToast(res.message || 'اسکن همسایگی CDP/LLDP انجام شد.');
    } catch (err: any) {
      showToast('خطا در اسکن همسایگی: ' + err.message);
    } finally {
      setIsScanning(false);
    }
  };

  // Add new device
  const handleAddDevice = async (newDev: Partial<Device>) => {
    await addDevice(newDev);
    await loadData();
    showToast(`تجهیز جدید ${newDev.name} با موفقیت به شبکه افزوده شد.`);
  };

  // Delete device
  const handleDeleteDevice = async (id: string) => {
    try {
      await deleteDevice(id);
      await loadData();
      showToast('تجهیز با موفقیت حذف گردید.');
    } catch (err: any) {
      showToast('خطا در حذف تجهیز: ' + err.message);
    }
  };

  // Reset to corporate seed
  const handleResetDemo = async () => {
    if (window.confirm('آیا مایلید اطلاعات شبکه به داده‌های نمونه پیش‌فرض سازمانی بازنشانی شوند؟')) {
      try {
        await resetDemoData();
        await loadData();
        showToast('داده‌های شبکه سازمانی بازنشانی گردید.');
      } catch (err: any) {
        showToast('خطا در بازنشانی: ' + err.message);
      }
    }
  };

  // Write running-config to startup-config (NVRAM)
  const handleWriteMemory = async (deviceId: string) => {
    try {
      const res = await writeMemory(deviceId);
      await loadData();
      showToast(res.message || 'پیکربندی با موفقیت در NVRAM (Startup-Config) ذخیره شد [OK].');
    } catch (err: any) {
      showToast('خطا در اجرای write memory: ' + err.message);
    }
  };

  const onlineCount = devices.filter((d) => d.is_online).length;
  const offlineCount = devices.filter((d) => !d.is_online).length;

  return (
    <div
      className={`min-h-screen relative flex flex-col justify-between theme-${panelTheme} dir-rtl font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-300`}
      dir="rtl"
    >
      {/* Dynamic Ambient Glow Background */}
      <div className="ambient-glow-background" />

      {/* Navbar Header */}
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
      />

      {/* Main Layout (Sidebar + Content View) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative z-10">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          devicesCount={devices.length}
          offlineCount={offlineCount}
        />

        {/* View Port */}
        <main className="flex-1 overflow-y-auto">
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
              onInspectPorts={(dev) => setPortInspectorDevice(dev)}
              onConnectTerminal={(dev) => setTerminalDevice(dev)}
              onWriteMemory={handleWriteMemory}
              onRefreshAll={handleRefreshAll}
              isRefreshing={isRefreshing}
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
            />
          )}

          {activeTab === 'ports' && <PortManagementView devices={devices} />}

          {activeTab === 'scanner' && (
            <CdpLldpScannerView onNavigateToTopology={() => setActiveTab('schematic')} />
          )}
        </main>
      </div>

      {/* High Density Cyber Spatial Footer Status Bar */}
      <footer className="h-8 spatial-glass text-slate-300 flex items-center px-4 lg:px-6 shrink-0 justify-between text-[11px] border-t border-white/10 select-none z-20 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse"></span>
            وضعیت شبکه: <b className="text-emerald-400 font-mono font-bold">Nominal Pro</b>
          </span>
          <span className="hidden sm:inline text-slate-400">
            تاخیر هسته: <b className="text-cyan-400 font-mono">1.2ms</b>
          </span>
          <span>
            تجهیزات متصل: <b className="text-indigo-400 font-mono font-bold">{onlineCount}</b>/{devices.length}
          </span>
          <span className="hidden md:inline text-slate-400">
            موتور همسایگی: <b className="text-purple-400 font-mono">CDP v2 / LLDP Matrix</b>
          </span>
        </div>
        <div className="font-mono text-slate-400 text-[10px] hidden sm:block">
          NetVision Cyber Matrix • High Density Infrastructure OS
        </div>
      </footer>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-10 left-6 z-50 spatial-glass border border-indigo-500/50 text-indigo-100 px-4 py-2.5 rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.4)] text-xs flex items-center gap-3 backdrop-blur-2xl">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white mr-2"
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
    </div>
  );
}
