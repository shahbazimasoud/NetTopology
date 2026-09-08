import React from 'react';
import { Tag, Sparkles, X, Calendar, CheckCircle2, History } from 'lucide-react';
import { APP_VERSION, RELEASE_HISTORY } from '../version';

interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReleaseNotesModal: React.FC<ReleaseNotesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl spatial-glass border border-white/20 text-slate-100 shadow-[0_0_50px_rgba(99,102,241,0.3)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white font-mono">تاریخچه تغییرات و نسخه‌ها (Release Notes)</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">ثبت منظم تغییرات ماژور، مینور و پچ‌های پنل NetTopology</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="بستن"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {RELEASE_HISTORY.map((rel, index) => {
            const isLatest = index === 0;
            return (
              <div
                key={rel.version}
                className={`p-4 rounded-xl border transition-all ${
                  isLatest
                    ? 'bg-indigo-950/30 border-indigo-500/40 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-sm font-bold text-white px-2 py-0.5 rounded-lg bg-white/10 border border-white/15">
                      v{rel.version}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full uppercase ${
                        rel.type === 'major'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : rel.type === 'minor'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {rel.type} release
                    </span>
                    <span className="text-sm font-semibold text-slate-200">{rel.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{rel.releaseDate}</span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-300">
                  {rel.changes.map((change, cIdx) => (
                    <li key={cIdx} className="flex items-start gap-2 leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-white/5 text-xs text-slate-400">
          <span>کنترل نگارش سمانتیک (Semantic Versioning: Major.Minor.Patch)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
          >
            متوجه شدم
          </button>
        </div>
      </div>
    </div>
  );
};
