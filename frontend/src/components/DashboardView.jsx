import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Database, 
  Zap, 
  Bookmark, 
  MessageSquare, 
  ArrowRight, 
  ShieldAlert, 
  Brain, 
  Thermometer, 
  Stethoscope, 
  Trash2,
  Clock,
  Sparkles,
  CheckCircle2,
  Lock,
  ChevronRight
} from 'lucide-react';
import { dashboardAPI, chatAPI } from '../api';

const ICONS = {
  Activity: Activity,
  Brain: Brain,
  ShieldAlert: ShieldAlert,
  Thermometer: Thermometer
};

export default function DashboardView({ user, onSelectPreset, onResumeSession, onOpenLogin }) {
  const [stats, setStats] = useState(null);
  const [presets, setPresets] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const presetsRes = await dashboardAPI.getPresets();
      setPresets(presetsRes.data);

      if (user) {
        const [statsRes, sessionsRes, bookmarksRes] = await Promise.all([
          dashboardAPI.getStats(),
          chatAPI.listSessions(),
          dashboardAPI.getBookmarks()
        ]);
        setStats(statsRes.data);
        setRecentSessions(sessionsRes.data);
        setBookmarks(bookmarksRes.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (e, id) => {
    e.stopPropagation();
    try {
      await chatAPI.deleteSession(id);
      setRecentSessions(recentSessions.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const handleDeleteBookmark = async (id) => {
    try {
      await dashboardAPI.deleteBookmark(id);
      setBookmarks(bookmarks.filter(b => b.id !== id));
    } catch (err) {
      console.error('Failed to delete bookmark:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-slate-50 to-teal-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 border border-slate-200/80 dark:border-slate-800 p-6 sm:p-10 shadow-sm dark:shadow-2xl transition-colors duration-200">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-400 text-xs font-semibold">
              <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Evidence-Informed Clinical AI</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Good day, {user?.full_name || user?.email?.split('@')[0] || 'Guest'} 👋
            </h1>
            
            <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
              Explore trusted medical literature, check acute symptoms, attach clinical photos, or consult with our LangGraph triage intelligence.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onSelectPreset("I have a health question I would like to consult about.")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-teal-600/20 transition cursor-pointer"
              >
                <span>New Consultation</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {!user && (
                <button
                  onClick={onOpenLogin}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>Sign In to Save History</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick System Status Card */}
          <div className="shrink-0 p-4 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 backdrop-blur-md shadow-sm space-y-2 text-xs min-w-[220px]">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 pb-2 border-b border-slate-100 dark:border-slate-700/60 font-semibold">
              <span>System Health</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Online
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Primary AI:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">Groq (qwen3.8-27b)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Vision Engine:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">Groq Vision</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Database:</span>
              <span className="font-medium text-teal-600 dark:text-teal-400">Neon Lakebase Postgres</span>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Row (for logged-in users) */}
      {user && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Consultations</span>
              <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.stats.total_consultations}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Saved in cloud Postgres</div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Saved Bookmarks</span>
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Bookmark className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.stats.saved_bookmarks}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Clinical citations</div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Medical Knowledge</span>
              <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                <Database className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.stats.vector_documents}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Indexed encyclopedia chunks</div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Inference Health</span>
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Groq Fast Engine</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Gemini Backup Active</span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Triage Presets */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Clinical Triage & Symptom Evaluation
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Select a common clinical concern to start an interactive assessment with our physician AI
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {presets.map((preset) => {
            const IconComponent = ICONS[preset.icon] || Activity;
            return (
              <div
                key={preset.id}
                onClick={() => onSelectPreset(preset.prompt)}
                className="group relative p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-teal-500/60 dark:hover:border-teal-500/50 hover:shadow-md dark:hover:bg-slate-800/60 cursor-pointer transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3 group-hover:scale-105 transition">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
                    {preset.category}
                  </span>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1 group-hover:text-teal-600 dark:group-hover:text-teal-300 transition">
                    {preset.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {preset.prompt}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition font-semibold">
                  <span>Start Evaluation</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Grid: Recent Consultations & Saved Bookmarks */}
      {user ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Recent Consultations */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Recent Consultations</h3>
              </div>
            </div>

            {recentSessions.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
                No past consultations yet. Start a consultation to preserve your conversation history.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {recentSessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => onResumeSession(s.id)}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between cursor-pointer transition group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-teal-600 dark:group-hover:text-teal-300 truncate">
                          {s.title}
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          {new Date(s.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => handleDeleteSession(e, s.id)}
                        title="Delete Session"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Saved Medical Citations */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Saved Reference Excerpts</h3>
              </div>
            </div>

            {bookmarks.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs sm:text-sm">
                No bookmarks saved. Click the bookmark icon next to any citation in chat to pin it here.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {bookmarks.map((b) => (
                  <div
                    key={b.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800/80 flex items-start justify-between gap-3 group"
                  >
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                          {b.category || 'Reference'}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-200 truncate">
                          {b.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {b.content}
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteBookmark(b.id)}
                      title="Remove Bookmark"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition shrink-0 opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      ) : null}

    </div>
  );
}
