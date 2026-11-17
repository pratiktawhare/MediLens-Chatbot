import React from 'react';
import { X, BookOpen, ExternalLink, Bookmark, Check, Globe } from 'lucide-react';
import { dashboardAPI } from '../api';

export default function CitationDrawer({ citation, onClose, onBookmarkSaved, theme }) {
  const [bookmarked, setBookmarked] = React.useState(false);

  if (!citation) return null;

  const isWeb = citation.type === 'web' || !!citation.url;

  const handleSaveBookmark = async () => {
    try {
      await dashboardAPI.addBookmark(
        isWeb ? `Web: ${citation.title}` : `Excerpt from ${citation.file} (p. ${citation.page})`,
        citation.text.slice(0, 300),
        isWeb ? citation.url : citation.file
      );
      setBookmarked(true);
      if (onBookmarkSaved) onBookmarkSaved();
    } catch (err) {
      console.error('Failed to save bookmark:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto transition-colors duration-200">
        
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
                {isWeb ? <Globe className="w-5 h-5 text-cyan-600 dark:text-cyan-400" /> : <BookOpen className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  {isWeb ? 'Live Clinical Web Source' : 'Verified Textbook Reference'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isWeb ? 'Real-time retrieved via Tavily' : 'Indexed in local ChromaDB knowledge base'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Source Metadata Badges */}
          <div className="flex flex-wrap gap-2 my-4">
            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
              isWeb
                ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20'
                : 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/20'
            }`}>
              {isWeb ? 'Tavily Web Guidance' : `Page ${citation.page}`}
            </span>

            <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 max-w-xs truncate">
              {citation.file || citation.title}
            </span>

            {citation.score !== undefined && (
              <span className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-semibold border border-emerald-200 dark:border-emerald-500/20">
                Match: {(citation.score * 100).toFixed(0)}%
              </span>
            )}
          </div>

          {/* Source Excerpt Quote */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 my-4 text-slate-800 dark:text-slate-200 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-mono shadow-xs">
            {citation.text}
          </div>

          {/* Outbound Link for Web Sources */}
          {isWeb && citation.url && (
            <div className="my-3">
              <a
                href={citation.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/30 text-xs font-semibold transition cursor-pointer"
              >
                <span>Read Full Article on Web</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/30 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
            {isWeb
              ? '🌐 Retrieved in real-time to supplement historical references with up-to-date guidelines.'
              : '📖 Extracted from the 637-page medical volume indexed into ChromaDB vector memory.'}
          </div>
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={handleSaveBookmark}
            disabled={bookmarked}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
              bookmarked
                ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 cursor-default'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white border border-slate-200 dark:border-slate-700'
            }`}
          >
            {bookmarked ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved to Bookmarks</span>
              </>
            ) : (
              <>
                <Bookmark className="w-4 h-4" />
                <span>Bookmark Excerpt</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-teal-600/20 transition cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
