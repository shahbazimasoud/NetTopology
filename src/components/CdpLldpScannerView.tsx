import React, { useState, useEffect } from 'react';
import {
  Radar,
  Zap,
  RefreshCw,
  Server,
  Layers,
  CheckCircle2,
  AlertCircle,
  Network,
  Radio,
  Map,
  Cable,
  ArrowRightLeft
} from 'lucide-react';
import { CdpLldpNeighbor } from '../types';
import { fetchCdpLldpNeighbors, runCdpLldpScan } from '../services/api';

interface CdpLldpScannerViewProps {
  onNavigateToTopology: () => void;
}

export const CdpLldpScannerView: React.FC<CdpLldpScannerViewProps> = ({
  onNavigateToTopology,
}) => {
  const [neighbors, setNeighbors] = useState<CdpLldpNeighbor[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [protocolFilter, setProtocolFilter] = useState<'all' | 'CDP' | 'LLDP'>('all');

  useEffect(() => {
    loadNeighbors();
  }, []);

  const loadNeighbors = async () => {
    try {
      setLoading(true);
      const res = await fetchCdpLldpNeighbors();
      setNeighbors(res.neighbors);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunScan = async () => {
    try {
      setScanning(true);
      setScanMessage('در حال ارسال بسته‌های CDP/LLDP و استخراج جدول همسایگی در پایتون...');
      const res = await runCdpLldpScan();
      setNeighbors(res.neighbors);
      setScanMessage(res.message);
    } catch (err: any) {
      setScanMessage('خطا در اجرای اسکن: ' + err.message);
    } finally {
      setScanning(false);
    }
  };

  const filteredNeighbors = neighbors.filter((n) => {
    if (protocolFilter !== 'all' && n.protocol !== protocolFilter) return false;
    return true;
  });

  const cdpCount = neighbors.filter((n) => n.protocol === 'CDP').length;
  const lldpCount = neighbors.filter((n) => n.protocol === 'LLDP').length;

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto text-right text-slate-800">
      {/* Header */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">موتور اسکن همسایگی با پروتکل‌های CDP و LLDP</h2>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono font-bold">
              Layer 2 Discovery
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            شناسایی خودکار همسایه‌ها، پورت‌های متصل به هم، نوع تجهیز و ترسیم توپولوژی با پردازش فریم‌های CDP و LLDP
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-sm transition disabled:opacity-50"
          >
            <Zap className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'در حال اسکن شبکه...' : 'شروع اسکن سراسری CDP / LLDP'}</span>
          </button>

          <button
            onClick={onNavigateToTopology}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium shadow-sm transition"
          >
            <Map className="w-3.5 h-3.5 text-indigo-600" />
            <span>مشاهده نقشه شماتیک حاصل از اسکن</span>
          </button>
        </div>
      </div>

      {/* Live Scan Notification */}
      {scanMessage && (
        <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>{scanMessage}</span>
          </div>
          <button
            onClick={() => setScanMessage(null)}
            className="text-slate-500 hover:text-slate-800 text-[11px]"
          >
            بستن
          </button>
        </div>
      )}

      {/* Protocol Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-500 text-[11px]">مجموع پیوندهای همسایگی کشف‌شده</div>
            <div className="text-xl font-bold text-slate-900 font-mono mt-0.5">{neighbors.length}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">بر اساس جداول همسایگی لایه ۲</div>
          </div>
          <div className="p-2 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">
            <ArrowRightLeft className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-500 text-[11px]">پیوندهای پروتکل Cisco CDP</div>
            <div className="text-xl font-bold text-indigo-700 font-mono mt-0.5">{cdpCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">پروتکل اختصاصی سیسکو (CDP v2)</div>
          </div>
          <div className="p-1.5 px-2.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="font-bold font-mono text-xs">CDP</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-slate-500 text-[11px]">پیوندهای استاندارد IEEE LLDP</div>
            <div className="text-xl font-bold text-purple-700 font-mono mt-0.5">{lldpCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">استاندارد باز 802.1AB (میکروتیک، آروبا)</div>
          </div>
          <div className="p-1.5 px-2.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
            <span className="font-bold font-mono text-xs">LLDP</span>
          </div>
        </div>
      </div>

      {/* Protocol Concept Explained */}
      <div className="p-3 rounded-lg bg-white border border-slate-200 shadow-sm text-xs text-slate-600 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
          <div className="font-bold text-indigo-700 mb-0.5 font-mono text-xs">Cisco Discovery Protocol (CDP v2):</div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            پروتکل لایه ۲ جهت شناسایی تجهیزات سیسکو (کاتالیست، نکسوس، روترهای ISR و اکسس‌پوینت‌ها). این پروتکل نام هاست، مدل سخت‌افزار، پورت محلی و راه دور، آی‌پی مدیریتی و شماره ویلن نیتیو را تبادل می‌کند.
          </p>
        </div>
        <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
          <div className="font-bold text-purple-700 mb-0.5 font-mono text-xs">Link Layer Discovery Protocol (LLDP 802.1AB):</div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            استاندارد صنعتی بین‌المللی مستقل از برند. مناسب برای شناسایی همسایگی میان سوئیچ‌های میکروتیک، اکسس‌پوینت‌های Ubiquiti UniFi، تجهیزات Aruba/HP و سرورها با قابلیت ترسیم خودکار نقشه توپولوژی.
          </p>
        </div>
      </div>

      {/* Neighbors Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900">جدول همسایگی‌های استخراج شده (Neighbor Discovery Table)</h3>
            <span className="text-slate-500 text-[11px]">({filteredNeighbors.length} رکورد)</span>
          </div>

          {/* Filter by Protocol */}
          <div className="flex items-center bg-slate-100 rounded p-0.5 border border-slate-200">
            <button
              onClick={() => setProtocolFilter('all')}
              className={`px-2.5 py-0.5 rounded text-[11px] transition ${
                protocolFilter === 'all' ? 'bg-white text-indigo-700 font-semibold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              همه پروتکل‌ها
            </button>
            <button
              onClick={() => setProtocolFilter('CDP')}
              className={`px-2.5 py-0.5 rounded text-[11px] transition ${
                protocolFilter === 'CDP' ? 'bg-white text-indigo-700 font-semibold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              فقط CDP
            </button>
            <button
              onClick={() => setProtocolFilter('LLDP')}
              className={`px-2.5 py-0.5 rounded text-[11px] transition ${
                protocolFilter === 'LLDP' ? 'bg-white text-purple-700 font-semibold shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              فقط LLDP
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-medium text-[11px] uppercase tracking-wider">
                <th className="p-3">تجهیز محلی (Local Device)</th>
                <th className="p-3">پورت محلی</th>
                <th className="p-3">نام همسایه (Neighbor Device)</th>
                <th className="p-3">آدرس IP همسایه</th>
                <th className="p-3">پورت متصل در همسایه</th>
                <th className="p-3">مدل سخت‌افزار</th>
                <th className="p-3">پروتکل</th>
                <th className="p-3">قابلیت‌ها (Capabilities)</th>
                <th className="p-3">VLAN</th>
                <th className="p-3">Holdtime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredNeighbors.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-6 text-center text-slate-500 font-sans">
                    هنوز اسکن همسایگی انجام نشده یا رکوردی با این فیلتر ثبت نگردیده است.
                  </td>
                </tr>
              ) : (
                filteredNeighbors.map((n, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-bold text-slate-900">{n.local_device_id}</td>
                    <td className="p-3 text-indigo-700 font-semibold">{n.local_port}</td>
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-slate-400" />
                      <span>{n.neighbor_name}</span>
                    </td>
                    <td className="p-3 text-indigo-700 font-bold">{n.neighbor_ip}</td>
                    <td className="p-3 text-purple-700 font-semibold">{n.neighbor_port}</td>
                    <td className="p-3 text-slate-600 text-[11px]">{n.neighbor_model}</td>
                    <td className="p-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          n.protocol === 'CDP'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {n.protocol}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 font-sans text-[11px]">{n.capabilities}</td>
                    <td className="p-3 text-indigo-700">VLAN {n.vlan}</td>
                    <td className="p-3 text-slate-500">{n.holdtime}s</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
