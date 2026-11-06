import React, { useState } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { ShieldAlert, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { isSupabaseConfigured } from '../../lib/supabase';

export const LoginView: React.FC = () => {
  const { loginWithPassword, loginWithMagicLink, isLoading, errorMessage } = useAdminAuth();
  const [authMode, setAuthMode] = useState<'password' | 'magic_link'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicLinkFeedback, setMagicLinkFeedback] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    if (authMode === 'password') {
      await loginWithPassword(email, password);
    } else {
      const res = await loginWithMagicLink(email);
      setMagicLinkFeedback(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0c1311] text-slate-900 dark:text-neutral-100 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden transition-colors">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md relative z-10">
        {/* Brand identity header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#008f5a]/10 dark:bg-[#00a86b]/15 p-2 shadow-xl mb-4 relative">
            <img 
              src="/assets/aistudio/logo-icon-transparent_d4790f88.svg" 
              alt="Trelvix AI" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Trelvix AI Enterprise Admin</h1>
          <p className="text-sm text-slate-500 dark:text-neutral-400 mt-1.5 flex items-center justify-center gap-2">
            <span>adminaccess.trelvixai.com</span>
            <span className="text-slate-300 dark:text-neutral-600">·</span>
            <span className="text-xs text-[#008f5a] dark:text-[#00a86b] font-mono">Isolated Production Host</span>
          </p>
        </div>

        {/* Login Container */}
        <div className="bg-white dark:bg-[#131d1a] border border-slate-200 dark:border-[#1d2c26] rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Auth mode switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0c1311] rounded-xl mb-6 border border-slate-200 dark:border-[#22332c]">
            <button
              type="button"
              onClick={() => { setAuthMode('password'); setMagicLinkFeedback(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                authMode === 'password'
                  ? 'bg-white dark:bg-[#1a2923] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('magic_link'); setMagicLinkFeedback(null); }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                authMode === 'magic_link'
                  ? 'bg-white dark:bg-[#1a2923] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Magic Link
            </button>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs">
              <p className="font-semibold mb-0.5">Authentication Failed</p>
              <p className="opacity-90">{errorMessage}</p>
            </div>
          )}

          {magicLinkFeedback && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">Secure Link Dispatched</p>
                <p className="opacity-90">{magicLinkFeedback}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300 mb-1.5">
                Authorized Admin Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@trelvixai.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-[#008f5a] dark:focus:border-[#00a86b] transition-colors"
                />
              </div>
            </div>

            {authMode === 'password' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-neutral-300">
                    Master Password
                  </label>
                  <span className="text-[11px] text-slate-400 dark:text-neutral-500">Authoritative Supabase Auth</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-neutral-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-[#008f5a] dark:focus:border-[#00a86b] transition-colors"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-[#008f5a] hover:bg-[#007a4d] dark:bg-[#00a86b] dark:hover:bg-[#00925c] disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Verifying RBAC Privileges...</span>
                </>
              ) : (
                <>
                  <span>{authMode === 'password' ? 'Authenticate & Enter' : 'Send Secure Magic Link'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Verification info banner */}
          <div className="mt-6 pt-5 border-t border-zinc-800/80 text-xs text-zinc-400 space-y-2">
            <p className="font-semibold text-zinc-300">Strict Database-Level RBAC</p>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Upon login, the server queries <code className="text-indigo-400 font-mono">public.profiles</code> using the Supabase Service Role:
            </p>
            <div className="p-2 bg-zinc-950 border border-zinc-800/70 rounded-lg font-mono text-[10px] text-zinc-400">
              SELECT is_admin, role FROM public.profiles WHERE id = auth.uid()
            </div>
          </div>
        </div>

        {/* Database connectivity badge */}
        <div className="text-center mt-6 text-xs text-zinc-500">
          <span>Target Database: </span>
          <span className="font-mono text-zinc-400">
            {isSupabaseConfigured ? 'Connected to Production Supabase' : 'Awaiting Environment Keys'}
          </span>
        </div>
      </div>
    </div>
  );
};
