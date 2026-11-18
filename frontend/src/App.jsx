import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DashboardView from './components/DashboardView';
import ChatView from './components/ChatView';
import LoginModal from './components/LoginModal';
import CitationDrawer from './components/CitationDrawer';
import { authAPI } from './api';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [user, setUser] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [initialPrompt, setInitialPrompt] = useState('');
  const [activeCitation, setActiveCitation] = useState(null);

  // Theme Management (Light / Dark)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('medilens_theme') || 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('medilens_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    // Check local storage for user token
    const token = localStorage.getItem('medilens_token');
    const storedUser = localStorage.getItem('medilens_user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('medilens_user');
      }
    }

    // Verify token validity with backend
    if (token) {
      authAPI.me()
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('medilens_user', JSON.stringify(res.data));
        })
        .catch(() => {
          setUser(null);
          localStorage.removeItem('medilens_token');
          localStorage.removeItem('medilens_user');
        });
    }

    const handleAuthChange = () => {
      setUser(null);
    };
    window.addEventListener('auth_change', handleAuthChange);
    return () => window.removeEventListener('auth_change', handleAuthChange);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('medilens_token');
    localStorage.removeItem('medilens_user');
    setUser(null);
    setCurrentView('dashboard');
  };

  const handleSelectPreset = (prompt) => {
    setInitialPrompt(prompt);
    setActiveSessionId(null);
    setCurrentView('chat');
  };

  const handleResumeSession = (sessionId) => {
    setActiveSessionId(sessionId);
    setInitialPrompt('');
    setCurrentView('chat');
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setInitialPrompt('');
    setCurrentView('chat');
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        user={user}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        onNewChat={handleNewChat}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 w-full overflow-x-hidden">
        {currentView === 'dashboard' ? (
          <DashboardView
            user={user}
            theme={theme}
            onSelectPreset={handleSelectPreset}
            onResumeSession={handleResumeSession}
            onOpenLogin={() => setIsLoginOpen(true)}
          />
        ) : (
          <ChatView
            user={user}
            theme={theme}
            activeSessionId={activeSessionId}
            initialPrompt={initialPrompt}
            onSelectCitation={(citation) => setActiveCitation(citation)}
            onOpenLogin={() => setIsLoginOpen(true)}
          />
        )}
      </main>

      {/* Login & Registration Modal */}
      <LoginModal
        isOpen={isLoginOpen}
        theme={theme}
        onClose={() => setIsLoginOpen(false)}
        onAuthSuccess={(userData) => setUser(userData)}
      />

      {/* Citation Drawer / Modal */}
      <CitationDrawer
        citation={activeCitation}
        theme={theme}
        onClose={() => setActiveCitation(null)}
      />

    </div>
  );
}
