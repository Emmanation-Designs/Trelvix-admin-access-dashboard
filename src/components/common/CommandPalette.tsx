import React, { useState, useEffect } from 'react';
import { Search, ArrowRight, X, LogOut } from 'lucide-react';
import { adminApi } from '../../services/adminApi';
import type { AdminUser } from '../../types/admin';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (user: AdminUser) => void;
  onNavigateTab: (tabId: string) => void;
  onLogout?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onSelectUser,
  onNavigateTab,
  onLogout,
}) => {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setUsers([]);
      return;
    }

    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        setIsLoading(true);
        try {
          const res = await adminApi.getUsers({ search: query, limit: 5 });
          setUsers(res.users);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoading(false);
        }
      } else {
        setUsers([]);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickNav = [
    { id: 'dashboard', label: 'Overview' },
    { id: 'users', label: 'Users (User Directory)' },
    { id: 'reservations', label: 'Capacity Audit' },
    { id: 'studio', label: 'Video & Live' },
    { id: 'config', label: 'Plan Limits' },
    { id: 'security', label: 'Audit Logs' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-100">
      <div 
        className="w-full max-w-xl bg-white dark:bg-[#131d1a] border border-slate-200 dark:border-[#1d2c26] rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100 text-slate-900 dark:text-neutral-100"
        role="dialog"
      >
        {/* Search header */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-[#1d2c26]">
          <Search className="w-4 h-4 text-slate-400 dark:text-neutral-400 shrink-0 mr-3" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users or jump to module..."
            className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-500 dark:text-neutral-400 bg-slate-100 dark:bg-[#0c1311] rounded border border-slate-200 dark:border-[#22332c]">
            ESC
          </kbd>
        </div>

        {/* Content list */}
        <div className="max-h-[380px] overflow-y-auto p-2">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-slate-400 dark:text-neutral-500 flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-slate-300 dark:border-neutral-700 border-t-[#008f5a] rounded-full animate-spin" />
              Searching database...
            </div>
          ) : users.length > 0 ? (
            <div className="mb-3">
              <p className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
                Matching Users
              </p>
              {users.map((u) => {
                const displayName = u.display_name || u.email || (u.id ? u.id.slice(0, 8) : 'User');
                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      onSelectUser(u);
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1a2923] transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#008f5a] dark:bg-[#00a86b] text-white flex items-center justify-center shrink-0 text-xs font-bold">
                        {(displayName.charAt(0) || 'U').toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                            {displayName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-emerald-50 dark:bg-[#0c241b] text-emerald-700 dark:text-emerald-400">
                            {(u.current_plan || 'free').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-neutral-400 truncate font-mono">{u.email || u.id}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white shrink-0 ml-2" />
                  </button>
                );
              })}
            </div>
          ) : query.trim().length > 1 ? (
            <div className="p-4 text-center text-xs text-slate-500 dark:text-neutral-400">
              No matching user accounts found for &ldquo;{query}&rdquo;
            </div>
          ) : null}

          {/* Quick Navigation Sections */}
          <div>
            <p className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 dark:text-neutral-400 uppercase tracking-wider">
              Navigation
            </p>
            {quickNav.map((nav) => (
              <button
                key={nav.id}
                onClick={() => {
                  onNavigateTab(nav.id);
                  onClose();
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#1a2923] transition-colors flex items-center justify-between text-xs text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white"
              >
                <span>{nav.label}</span>
              </button>
            ))}

            {onLogout && (
              <button
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="w-full text-left px-3 py-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 transition-colors flex items-center justify-between text-xs mt-1"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span className="font-semibold">Sign Out</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
