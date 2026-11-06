import React, { useEffect, useState } from 'react';
import { ShieldX, AlertOctagon, ArrowLeft, LogOut } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

export const AccessDeniedSplash: React.FC = () => {
  const { clearAccessDenied } = useAdminAuth();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown <= 0) {
      clearAccessDenied();
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, clearAccessDenied]);

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background warning ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[400px] bg-rose-600/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 text-center">
        {/* Shield icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-rose-950/40 border border-rose-500/30 shadow-2xl mb-6 relative">
          <ShieldX className="w-10 h-10 text-rose-500" />
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Access Denied</h1>
        <p className="text-base text-rose-400 font-medium mb-4">
          Administrative privileges required.
        </p>

        <div className="bg-zinc-900/90 border border-rose-900/40 rounded-2xl p-6 text-left shadow-2xl backdrop-blur-xl mb-6">
          <div className="flex items-start gap-3.5 mb-4">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-zinc-300 leading-relaxed">
              <p className="font-semibold text-zinc-200 mb-1">Authoritative RBAC Policy Enforced</p>
              Your authenticated identity was checked against <code className="text-indigo-300 font-mono">public.profiles</code> using the Supabase Service Role:
              <div className="bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800/80 font-mono text-[11px] text-zinc-400 mt-2">
                SELECT is_admin, role FROM public.profiles WHERE id = auth.uid()
                <br />
                <span className="text-rose-400">Result: is_admin = false OR role != &apos;admin&apos;</span>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800/80 pt-3 text-xs text-zinc-400 flex items-center justify-between">
            <span>Session token destroyed immediately</span>
            <span className="text-rose-400 font-mono">HTTP 403 Forbidden</span>
          </div>
        </div>

        {/* Action button */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={clearAccessDenied}
            className="w-full sm:w-auto px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-xs font-semibold rounded-xl border border-zinc-700/70 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Admin Login ({countdown}s)</span>
          </button>
          <button
            onClick={clearAccessDenied}
            className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-rose-600/20 transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Force Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
