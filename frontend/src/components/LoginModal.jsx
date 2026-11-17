import React, { useState } from 'react';
import { X, Lock, Mail, User, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { authAPI } from '../api';

export default function LoginModal({ isOpen, onClose, onAuthSuccess, theme }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Please fill in both email and password.');
      setLoading(false);
      return;
    }

    try {
      let res;
      if (isRegister) {
        res = await authAPI.register(cleanEmail, cleanPassword, fullName.trim());
      } else {
        res = await authAPI.login(cleanEmail, cleanPassword);
      }

      const { access_token, user } = res.data;
      localStorage.setItem('medilens_token', access_token);
      localStorage.setItem('medilens_user', JSON.stringify(user));
      onAuthSuccess(user);
      onClose();
    } catch (err) {
      console.error('Auth error:', err);
      const detail = err.response?.data?.detail;
      let errorMsg = 'Authentication failed. Please verify your connection or credentials.';
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        errorMsg = detail[0].msg || 'Invalid format.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 transition-colors duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-800 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3 shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {isRegister ? 'Create MediLens Account' : 'Welcome to MediLens'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isRegister
              ? 'Register to save your consultations and medical bookmarks permanently.'
              : 'Sign in to access your consultations and health insights.'}
          </p>
        </div>

        {/* Mode Selector Tabs (Sign In vs Create Account) */}
        <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 mb-5 border border-slate-200/80 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              !isRegister
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              isRegister
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-sm border border-slate-200/60 dark:border-slate-700'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Dr. John Doe / Jane"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-xs sm:text-sm transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-xs sm:text-sm transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 text-xs sm:text-sm transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs sm:text-sm transition shadow-md shadow-teal-600/20 hover:shadow-teal-600/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>{isRegister ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle between Login and Register (Bottom helper text) */}
        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4">
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(false); setError(''); }}
                className="text-teal-600 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(true); setError(''); }}
                className="text-teal-600 dark:text-teal-400 font-semibold hover:underline cursor-pointer"
              >
                Create Account
              </button>
            </span>
          )}
        </div>

      </div>
    </div>
  );
}
