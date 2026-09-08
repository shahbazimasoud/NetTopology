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
import { useLanguage } from '../i18n/LanguageContext';

interface CdpLldpScannerViewProps {
  onNavigateToTopology: () => void;
}

export const CdpLldpScannerView: React.FC<CdpLldpScannerViewProps> = ({
  onNavigateToTopology,
}) => {
  const { t, isRtl, isEn } = useLanguage();
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
      setScanMessage(t('scanner_msg_scanning'));
      const res = await runCdpLldpScan();
      setNeighbors(res.neighbors);
      setScanMessage(res.message);
    } catch (err: any) {
      setScanMessage(t('scanner_msg_error', { error: err.message }));
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
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`p-4 space-y-4 max-w-7xl mx-auto ${isRtl ? 'text-right' : 'text-left'}`}
    >
      {/* Header */}
      <div className="spatial-glass p-3.5 rounded-xl border border-white/10 shadow-lg backdrop-blur-xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Radar className="w-5 h-5 text-indigo-400" />
              <span>{t('scanner_title')}</span>
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold">
              {t('scanner_tag')}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('scanner_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunScan}
            disabled={scanning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-medium shadow-[0_0_15px_rgba(99,102,241,0.35)] transition disabled:opacity-50 border border-white/10 active:scale-95 cursor-pointer"
          >
            <Zap className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? t('scanner_btn_scanning') : t('scanner_btn_run_scan')}</span>
          </button>

          <button
            onClick={onNavigateToTopology}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-medium shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Map className="w-3.5 h-3.5 text-cyan-400" />
            <span>{t('scanner_btn_sync_topology')}</span>
          </button>
        </div>
      </div>

      {/* Live Scan Notification */}
      {scanMessage && (
        <div className="p-3 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-xs flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span className="font-mono">{scanMessage}</span>
          </div>
          <button
            onClick={() => setScanMessage(null)}
            className="text-slate-400 hover:text-white text-[11px] underline cursor-pointer"
          >
            {t('scanner_msg_close')}
          </button>
        </div>
      )}

      {/* Protocol Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{t('scanner_metric_total')}</div>
            <div className="text-2xl font-bold text-white font-mono mt-0.5 glow-text-cyan">{neighbors.length}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{t('scanner_metric_total_desc')}</div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/5 text-slate-300 border border-white/10">
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{t('scanner_metric_cdp')}</div>
            <div className="text-2xl font-bold text-indigo-300 font-mono mt-0.5">{cdpCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{t('scanner_metric_cdp_desc')}</div>
          </div>
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <span className="font-bold font-mono text-xs">CDP</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl spatial-glass spatial-glass-hover spatial-depth-card border border-white/10 shadow-lg flex items-center justify-between">
          <div>
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{t('scanner_metric_lldp')}</div>
            <div className="text-2xl font-bold text-purple-300 font-mono mt-0.5">{lldpCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{t('scanner_metric_lldp_desc')}</div>
          </div>
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <span className="font-bold font-mono text-xs">LLDP</span>
          </div>
        </div>
      </div>

      {/* Protocol Concept Explained */}
      <div className="p-3.5 rounded-xl spatial-glass border border-white/10 shadow-lg text-xs grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="font-bold text-indigo-300 mb-1 font-mono text-xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
            <span>{t('scanner_explain_cdp_title')}</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
            {t('scanner_explain_cdp_desc')}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="font-bold text-purple-300 mb-1 font-mono text-xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
            <span>{t('scanner_explain_lldp_title')}</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
            {t('scanner_explain_lldp_desc')}
          </p>
        </div>
      </div>

      {/* Neighbors Table */}
      <div className="spatial-glass border border-white/10 rounded-xl overflow-hidden shadow-lg">
        <div className="p-3.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white font-mono">{t('scanner_table_title')}</h3>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px] font-mono">
              {t('scanner_records_count', { count: filteredNeighbors.length })}
            </span>
          </div>

          {/* Filter by Protocol */}
          <div className="flex items-center bg-black/20 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => setProtocolFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer ${
                protocolFilter === 'all'
                  ? 'bg-indigo-600/40 text-white font-bold border border-indigo-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('scanner_filter_all')}
            </button>
            <button
              onClick={() => setProtocolFilter('CDP')}
              className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer ${
                protocolFilter === 'CDP'
                  ? 'bg-indigo-600/40 text-white font-bold border border-indigo-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('scanner_filter_cdp')}
            </button>
            <button
              onClick={() => setProtocolFilter('LLDP')}
              className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer ${
                protocolFilter === 'LLDP'
                  ? 'bg-purple-600/40 text-white font-bold border border-purple-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('scanner_filter_lldp')}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs`}>
            <thead>
              <tr className="bg-white/5 text-slate-300 border-b border-white/10 font-medium text-[11px] uppercase tracking-wider">
                <th className="p-3.5">{t('scanner_col_local_device')}</th>
                <th className="p-3.5">{t('scanner_col_local_port')}</th>
                <th className="p-3.5">{t('scanner_col_remote_device')}</th>
                <th className="p-3.5">{t('scanner_col_neighbor_ip')}</th>
                <th className="p-3.5">{t('scanner_col_remote_port')}</th>
                <th className="p-3.5">{t('scanner_col_model')}</th>
                <th className="p-3.5">{t('scanner_col_protocol')}</th>
                <th className="p-3.5">{t('scanner_col_capabilities')}</th>
                <th className="p-3.5">{t('scanner_col_vlan')}</th>
                <th className="p-3.5">{t('scanner_col_holdtime')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 font-mono">
              {filteredNeighbors.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 font-sans">
                    {t('scanner_empty_table')}
                  </td>
                </tr>
              ) : (
                filteredNeighbors.map((n, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition group">
                    <td className="p-3.5 font-bold text-white">{n.local_device_id}</td>
                    <td className="p-3.5 text-cyan-300 font-semibold">{n.local_port}</td>
                    <td className="p-3.5 font-bold text-white flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{n.neighbor_name}</span>
                    </td>
                    <td className="p-3.5 text-indigo-300 font-bold">{n.neighbor_ip}</td>
                    <td className="p-3.5 text-purple-300 font-semibold">{n.neighbor_port}</td>
                    <td className="p-3.5 text-slate-300 text-[11px]">{n.neighbor_model}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          n.protocol === 'CDP'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}
                      >
                        {n.protocol}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-400 font-sans text-[11px]">{n.capabilities}</td>
                    <td className="p-3.5 text-indigo-300">VLAN {n.vlan}</td>
                    <td className="p-3.5 text-slate-400">{n.holdtime}s</td>
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
