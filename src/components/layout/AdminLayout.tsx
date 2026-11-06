import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { 
  Search, 
  Sun, 
  Moon, 
  Menu, 
  X
} from 'lucide-react';

interface AdminLayoutProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onOpenCommandPalette: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeTab,
  onTabChange,
  onOpenCommandPalette,
  children,
}) => {
  const { adminUser, logout } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('trelvix_theme');
      if (stored) return stored === 'dark';
      return document.documentElement.classList.contains('dark') || true;
    }
    return true;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('trelvix_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('trelvix_theme', 'light');
    }
  }, [isDarkMode]);

  // Exact 6 navigation items from the uploaded screenshots
  const navItems = [
    { id: 'dashboard', label: 'Overview', pageTitle: 'Overview' },
    { id: 'users', label: 'Users', pageTitle: 'User Directory' },
    { id: 'reservations', label: 'Capacity Audit', pageTitle: 'Capacity Audit' },
    { id: 'studio', label: 'Video & Live', pageTitle: 'Video & Live Queues' },
    { id: 'config', label: 'Plan Limits', pageTitle: 'Plan Limits' },
    { id: 'security', label: 'Audit Logs', pageTitle: 'Audit Logs' },
  ];

  const currentTabItem = navItems.find(item => item.id === activeTab) || navItems[0];

  const adminEmail = adminUser?.email || 'ada.okafor@trelvix.ai';

  const handleSelectTab = (tabId: string) => {
    onTabChange(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0c1311] text-slate-900 dark:text-neutral-100 flex flex-col font-sans transition-colors duration-150 antialiased selection:bg-emerald-500/20">
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR (Desktop) */}
        <aside className="hidden md:flex w-60 lg:w-64 bg-white dark:bg-[#0c1311] border-r border-slate-200 dark:border-[#192622] flex-col justify-between shrink-0 p-5 z-20">
          <div>
            {/* Logo / Brand Header */}
            <div className="flex items-center gap-3 px-2 py-1 mb-8">
              <div className="w-8 h-8 rounded-lg bg-[#008f5a]/10 dark:bg-[#00a86b]/15 flex items-center justify-center p-1 shrink-0">
                <img 
                  src="/assets/aistudio/logo-icon-transparent_d4790f88.svg" 
                  alt="Trelvix AI" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                Trelvix AI
              </span>
            </div>

            {/* Navigation items - Exactly matching screenshot style */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all duration-150 font-medium ${
                      isActive
                        ? 'bg-[#008f5a] dark:bg-[#00a86b] text-white font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#14201c]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* MOBILE SLIDE-OUT MENU */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="relative z-50 w-72 max-w-[80vw] bg-white dark:bg-[#0c1311] border-r border-slate-200 dark:border-[#192622] p-5 flex flex-col justify-between h-full shadow-2xl">
              <div>
                <div className="flex items-center justify-between mb-8 pb-3 border-b border-slate-100 dark:border-[#192622]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#008f5a]/10 dark:bg-[#00a86b]/15 flex items-center justify-center p-1 shrink-0">
                      <img 
                        src="/assets/aistudio/logo-icon-transparent_d4790f88.svg" 
                        alt="Trelvix AI" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="font-bold text-base text-slate-900 dark:text-white">Trelvix AI</span>
                  </div>
                  <button 
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectTab(item.id)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all font-medium ${
                          isActive
                            ? 'bg-[#008f5a] dark:bg-[#00a86b] text-white font-semibold'
                            : 'text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#14201c]'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-[#192622]">
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-medium"
                >
                  Logout
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* RIGHT MAIN CONTAINER */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* TOP BAR / HEADER */}
          <header className="h-16 border-b border-slate-200/80 dark:border-[#192622] bg-white/80 dark:bg-[#0c1311]/90 backdrop-blur px-4 sm:px-8 flex items-center justify-between gap-4 sticky top-0 z-10 shrink-0">
            {/* Left: Hamburger (mobile) + Page Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-1.5 rounded-lg text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#14201c]"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {currentTabItem.pageTitle}
              </h1>
            </div>

            {/* Right: Search + Admin Email + Role Badge + Theme + Logout */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
              {/* Search admin... Input */}
              <div className="relative hidden sm:block">
                <input
                  type="text"
                  placeholder="Search admin..."
                  onClick={onOpenCommandPalette}
                  readOnly
                  className="w-44 sm:w-56 lg:w-64 px-3.5 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-[#14201c] border border-slate-200 dark:border-[#22332c] text-slate-800 dark:text-neutral-200 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none cursor-pointer hover:border-slate-300 dark:hover:border-neutral-600 transition-colors"
                />
              </div>

              {/* Admin Email */}
              <span className="hidden md:inline-block text-xs text-slate-600 dark:text-neutral-300 font-normal">
                {adminEmail}
              </span>

              {/* Super Admin Pill Badge */}
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-[#112920] text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-[#1e4635] whitespace-nowrap">
                Super Admin
              </span>

              {/* Theme Toggle (Light / Dark) */}
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="p-1.5 rounded-lg text-slate-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-[#14201c] transition-colors"
                title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle color theme"
              >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              </button>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-neutral-200 hover:text-slate-900 dark:hover:text-white bg-transparent hover:bg-slate-100 dark:hover:bg-[#14201c] border border-slate-300 dark:border-[#263a33] rounded-lg transition-colors whitespace-nowrap"
              >
                Logout
              </button>
            </div>
          </header>

          {/* PAGE BODY VIEWPORT */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-[1400px] mx-auto w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
