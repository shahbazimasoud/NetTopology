import React, { useState, useEffect } from 'react';
import {
  Activity,
  X,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Terminal,
  Cable,
  Server,
  ShieldCheck,
  Zap,
  Globe,
  Radio,
  ArrowRight
} from 'lucide-react';
import { Device, DeviceConnectionTestResult } from '../types';
import { testDeviceConnection, testRawIpConnection } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

interface TestConnectionModalProps {
  device: Device | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenTerminal?: (dev: Device) => void;
  onInspectPorts?: (dev: Device) => void;
  onDeviceUpdated?: () => void;
}

export const TestConnectionModal: React.FC<TestConnectionModalProps> = ({
  device,
  isOpen,
  onClose,
  onOpenTerminal,
  onInspectPorts,
  onDeviceUpdated,
}) => {
  const { isRtl, isEn } = useLanguage();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<DeviceConnectionTestResult | null>(null);
  const [customIp, setCustomIp] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && device) {
      setCustomIp(device.ip);
      handleRunTest(device.ip, device.id);
    } else {
      setTestResult(null);
      setErrorMsg(null);
    }
  }, [isOpen, device]);

  if (!isOpen || !device) return null;

  const handleRunTest = async (ipToTest: string, deviceId?: string) => {
    setTesting(true);
    setErrorMsg(null);
    try {
      let res: DeviceConnectionTestResult;
      if (deviceId) {
        res = await testDeviceConnection(deviceId);
      } else {
        res = await testRawIpConnection(ipToTest);
      }
      setTestResult(res);
      if (onDeviceUpdated) {
        onDeviceUpdated();
      }
    } catch (err: any) {
      setErrorMsg(err.message || (isEn ? 'Failed to test connectivity' : 'خطا در برقراری ارتباط با تجهیز'));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md modal-backdrop-blur"
      data-modal-backdrop="true"
      onClick={onClose}
    >
      <div
        id="test-connection-modal-container"
        className={`w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all duration-200 ${
          isRtl ? 'text-right' : 'text-left'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEn ? 'Device Connectivity & Port Diagnostics' : 'تست ارتباط، پینگ و پورت‌های سوئیچ'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                {device.name} • {device.ip} • {device.model}
              </p>
            </div>
          </div>
          <button
            id="close-test-connection-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {/* IP Input & Retest bar */}
          <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                {isEn ? 'Target IP:' : 'آدرس IP هدف:'}
              </label>
              <input
                type="text"
                value={customIp}
                onChange={(e) => setCustomIp(e.target.value)}
                placeholder="192.168.1.1"
                className="w-full max-w-xs px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/20 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
            <button
              id="btn-retest-connection"
              onClick={() => handleRunTest(customIp, customIp === device.ip ? device.id : undefined)}
              disabled={testing}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? (isEn ? 'Probing Network...' : 'در حال سنجش شبکه...') : (isEn ? 'Test Connection' : 'تست مجدد اتصال')}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-400 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Test Status Cards */}
          {testResult && (
            <div className="space-y-4">
              {/* Overall Reachability Banner */}
              <div
                className={`p-4 rounded-xl border flex items-center justify-between ${
                  testResult.is_online
                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-500/30 text-rose-900 dark:text-rose-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {testResult.is_online ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                  <div>
                    <h3 className="font-bold text-sm">
                      {testResult.is_online
                        ? (isEn ? 'Device is Online & Reachable' : 'تجهیز آنلاین و در دسترس است')
                        : (isEn ? 'Device Unreachable / Offline' : 'تجهیز در دسترس نیست (آفلاین)')}
                    </h3>
                    <p className="text-xs opacity-90 mt-0.5">
                      {testResult.is_online
                        ? (isEn ? `Round-trip response time: ${testResult.latency_ms} ms` : `زمان رفت و برگشت پاکت: ${testResult.latency_ms} میلی‌ثانیه`)
                        : (isEn ? 'No response to ICMP ping or standard management ports' : 'هیچ پاسخی از پینگ ICMP یا پورت‌های مدیریتی دریافت نشد')}
                    </p>
                  </div>
                </div>
                {testResult.latency_ms !== null && (
                  <div className="text-right">
                    <span className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {testResult.latency_ms}
                    </span>
                    <span className="text-xs font-mono ml-1 text-slate-500 dark:text-slate-400">ms</span>
                  </div>
                )}
              </div>

              {/* Protocol Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* ICMP Ping */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">ICMP Echo</span>
                    <Radio className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {testResult.icmp_ping ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isEn ? 'Passed' : 'پاسخ داد'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                        <XCircle className="w-3.5 h-3.5" />
                        {isEn ? 'Timeout' : 'بی‌پاسخ'}
                      </span>
                    )}
                  </div>
                </div>

                {/* SSH Port 22 */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">SSH (Port 22)</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {testResult.ports.ssh_22 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isEn ? 'Open' : 'باز'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 dark:text-slate-500">
                        <XCircle className="w-3.5 h-3.5" />
                        {isEn ? 'Closed' : 'بسته'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Telnet Port 23 */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Telnet (Port 23)</span>
                    <Terminal className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {testResult.ports.telnet_23 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isEn ? 'Open' : 'باز'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 dark:text-slate-500">
                        <XCircle className="w-3.5 h-3.5" />
                        {isEn ? 'Closed' : 'بسته'}
                      </span>
                    )}
                  </div>
                </div>

                {/* HTTP / HTTPS */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Web (80/443)</span>
                    <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {testResult.ports.https_443 || testResult.ports.http_80 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isEn ? 'Available' : 'در دسترس'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 dark:text-slate-500">
                        <XCircle className="w-3.5 h-3.5" />
                        {isEn ? 'Closed' : 'بسته'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Banner (if any) */}
              {testResult.banner && (
                <div className="p-3 rounded-xl bg-slate-900 text-slate-200 border border-slate-700 font-mono text-[11px]">
                  <span className="text-indigo-400 font-bold block mb-1">
                    {isEn ? 'Device Service Banner:' : 'بنر دریافتی از سرویس تجهیز:'}
                  </span>
                  <div className="text-emerald-400 select-all">{testResult.banner}</div>
                </div>
              )}

              {/* Diagnostics List */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-white/10">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                  {isEn ? 'Network Diagnostic Log:' : 'گزارش جزئیات بررسی شبکه:'}
                </span>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400 font-mono">
                  {testResult.diagnostics.map((d, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Quick instructions for Linux local testing */}
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-300 text-xs space-y-1">
            <span className="font-bold block">
              {isEn ? 'Testing Real Local Switches on Linux:' : 'نحوه تست سوئیچ‌های محلی در لینوکس:'}
            </span>
            <p className="text-[11px] leading-relaxed opacity-90">
              {isEn
                ? 'When installed on a Linux host on the same LAN or VLAN, NetTopology uses native ICMP ping and socket checks against physical switches. You can open the Cisco CLI Terminal to run real-time configuration commands.'
                : 'هنگام اجرای سامانه روی سرور لینوکس متصل به شبکه لوکال، سیستم با دستورات محلی لینوکس (ping و socket) سوئیچ‌ها را ارزیابی کرده و با کنسول ترمینال سیسکو فرامین پیکربندی را تست می‌کند.'}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2">
            {onOpenTerminal && (
              <button
                id="btn-open-terminal-from-test"
                onClick={() => {
                  onClose();
                  onOpenTerminal(device);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>{isEn ? 'Open Cisco CLI Terminal' : 'کنسول ترمینال سیسکو'}</span>
              </button>
            )}

            {onInspectPorts && (
              <button
                id="btn-inspect-ports-from-test"
                onClick={() => {
                  onClose();
                  onInspectPorts(device);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/20 text-slate-800 dark:text-white text-xs font-semibold transition active:scale-95 cursor-pointer"
              >
                <Cable className="w-3.5 h-3.5 text-indigo-500" />
                <span>{isEn ? 'Inspect Ports' : 'پایش پورت‌ها'}</span>
              </button>
            )}
          </div>

          <button
            id="btn-close-test-modal"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 text-xs font-medium transition cursor-pointer"
          >
            {isEn ? 'Close' : 'بستن'}
          </button>
        </div>
      </div>
    </div>
  );
};
