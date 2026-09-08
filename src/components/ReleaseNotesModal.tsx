import React from 'react';
import { Tag, Sparkles, X, Calendar, CheckCircle2, History } from 'lucide-react';
import { APP_VERSION, RELEASE_HISTORY } from '../version';
import { useLanguage } from '../i18n/LanguageContext';

interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReleaseNotesModal: React.FC<ReleaseNotesModalProps> = ({ isOpen, onClose }) => {
  const { t, isEn } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 modal-backdrop-blur animate-fade-in"
      data-modal-backdrop="true"
      dir={isEn ? 'ltr' : 'rtl'}
    >
      <div className="relative w-full max-w-2xl max-h-[88vh] sm:max-h-[85vh] flex flex-col rounded-2xl spatial-glass border border-white/20 text-slate-100 shadow-[0_0_50px_rgba(99,102,241,0.3)] overflow-hidden my-auto">
        {/* Header (Pinned) */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/10 bg-slate-900/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white">
                  {t('release_notes_title')}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  v{APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{t('release_notes_subtitle')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            aria-label={t('action_close')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content List (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {RELEASE_HISTORY.map((rel, index) => {
            const isLatest = index === 0;
            const title = isEn && rel.title_en ? rel.title_en : rel.title;
            const changes = isEn && rel.changes_en ? rel.changes_en : rel.changes;

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
                      {rel.type === 'major'
                        ? t('release_notes_tag_major')
                        : rel.type === 'minor'
                        ? t('release_notes_tag_minor')
                        : t('release_notes_tag_patch')}
                    </span>
                    <span className="text-sm font-semibold text-slate-200">{title}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{rel.releaseDate}</span>
                  </div>
                </div>

                <ul className="space-y-2 text-xs text-slate-300">
                  {changes.map((change, cIdx) => (
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

        {/* Footer (Pinned) */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-slate-900/80 text-xs text-slate-400 shrink-0">
          <span>{isEn ? 'Semantic Versioning (Major.Minor.Patch)' : 'کنترل نگارش سمانتیک (Semantic Versioning: Major.Minor.Patch)'}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
          >
            {t('release_notes_btn_close')}
          </button>
        </div>
      </div>
    </div>
  );
};

