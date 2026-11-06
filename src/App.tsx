import React, { useState } from 'react';
import { ToastProvider } from './components/common/Toast';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { LoginView } from './components/auth/LoginView';
import { AccessDeniedSplash } from './components/auth/AccessDeniedSplash';
import { AdminLayout } from './components/layout/AdminLayout';
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard';
import { UserManagementView } from './components/users/UserManagementView';
import { ReservationAuditView } from './components/reservations/ReservationAuditView';
import { VideoQueueAndVoiceView } from './components/studio/VideoQueueAndVoiceView';
import { PlanLimitsAndBroadcastView } from './components/config/PlanLimitsAndBroadcastView';
import { AuditLogsAndAnomaliesView } from './components/security/AuditLogsAndAnomaliesView';
import { CommandPalette } from './components/common/CommandPalette';
import type { AdminUser } from './types/admin';
import { RefreshCw } from 'lucide-react';

function AdminPortalContent() {
  const { adminUser, isLoading, isAccessDenied, logout } = useAdminAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);
  const [selectedUserForDrawer, setSelectedUserForDrawer] = useState<AdminUser | null>(null);

  // 1. Loading state during auth verification
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0c1311] text-slate-900 dark:text-neutral-100 flex flex-col items-center justify-center p-6">
        <RefreshCw className="w-8 h-8 text-[#008f5a] dark:text-[#00a86b] animate-spin mb-4" />
        <h2 className="text-sm font-semibold text-slate-800 dark:text-neutral-200">Verifying Authoritative Admin Privileges</h2>
        <p className="text-xs text-slate-400 dark:text-neutral-500 font-mono mt-1">Connecting to adminaccess.trelvixai.com...</p>
      </div>
    );
  }

  // 2. Strict Access Denied splash screen
  if (isAccessDenied) {
    return <AccessDeniedSplash />;
  }

  // 3. Login screen if unauthenticated
  if (!adminUser) {
    return <LoginView />;
  }

  // 4. Authenticated Admin Portal with active modules
  return (
    <>
      <AdminLayout
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      >
        {activeTab === 'dashboard' && (
          <ExecutiveDashboard onNavigateToUsers={() => setActiveTab('users')} />
        )}

        {activeTab === 'users' && (
          <UserManagementView
            selectedUserFromSearch={selectedUserForDrawer}
            onClearSelectedUser={() => setSelectedUserForDrawer(null)}
          />
        )}

        {activeTab === 'reservations' && (
          <ReservationAuditView />
        )}

        {activeTab === 'studio' && (
          <VideoQueueAndVoiceView />
        )}

        {activeTab === 'config' && (
          <PlanLimitsAndBroadcastView />
        )}

        {activeTab === 'security' && (
          <AuditLogsAndAnomaliesView />
        )}
      </AdminLayout>

      {/* Global Command Palette (Ctrl + K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectUser={(user) => {
          setSelectedUserForDrawer(user);
          setActiveTab('users');
        }}
        onNavigateTab={(tabId) => setActiveTab(tabId)}
        onLogout={logout}
      />
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AdminAuthProvider>
        <AdminPortalContent />
      </AdminAuthProvider>
    </ToastProvider>
  );
}
