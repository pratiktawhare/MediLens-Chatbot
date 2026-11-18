import React from 'react';
import { 
  LayoutDashboard, 
  MessageSquarePlus, 
  LogIn, 
  LogOut, 
  HeartPulse, 
  Sun, 
  Moon, 
  User as UserIcon,
  Sparkles
} from 'lucide-react';

export default function Navbar({ 
  currentView, 
  setCurrentView, 
  user, 
  theme, 
  onToggleTheme, 
  onOpenLogin, 
  onLogout, 
  onNewChat 
}) {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-200">
      <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-1.5 sm:gap-4">
        
        {/* Brand */}
        <div 
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0" 
          onClick={() => setCurrentView('dashboard')}
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-teal-500 via-teal-600 to-emerald-500 flex items-center justify-center shadow-md shadow-teal-500/20 group-hover:scale-105 transition-transform duration-200 shrink-0">
            <HeartPulse className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                MediLens
              </span>
              <span className="hidden sm:inline-flex text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                Clinical AI
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden md:block">
              Evidence-Informed Healthcare Assistant
            </p>
          </div>
        </div>

        {/* Navigation Tabs (Icons on mobile, Icon+Text on tablet/desktop) */}
        <nav className="flex items-center gap-0.5 sm:gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800 shrink-0">
          <button
            onClick={() => setCurrentView('dashboard')}
            title="Dashboard"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
              currentView === 'dashboard'
                ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('chat');
              if (onNewChat) onNewChat();
            }}
            title="Consultation"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
              currentView === 'chat'
                ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <MessageSquarePlus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Consultation</span>
          </button>
        </nav>

        {/* Right Actions: Theme Toggle + Auth */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 transition cursor-pointer shrink-0"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* User Account / Login */}
          {user ? (
            <div className="flex items-center gap-1.5 pl-0.5 sm:gap-2 sm:pl-1 shrink-0">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-200">
                  {user.full_name || user.email.split('@')[0]}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                  {user.email}
                </span>
              </div>
              <button
                onClick={onLogout}
                title="Log Out"
                className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-slate-200 dark:border-slate-800 transition cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-teal-600/20 hover:shadow-teal-600/30 transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span>Sign In</span>
            </button>
          )}

        </div>

      </div>
    </header>
  );
}
