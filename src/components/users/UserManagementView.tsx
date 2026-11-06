import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../services/adminApi';
import type { AdminUser, PlanTier, UserStatus } from '../../types/admin';
import { useToast } from '../common/Toast';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface UserManagementViewProps {
  selectedUserFromSearch?: AdminUser | null;
  onClearSelectedUser?: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  selectedUserFromSearch,
  onClearSelectedUser,
}) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<UserStatus>('banned');
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [targetPlan, setTargetPlan] = useState<PlanTier>('pro');
  const [bonusModalOpen, setBonusModalOpen] = useState(false);
  const [bonusAmount, setBonusAmount] = useState('500');
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { success, error: toastError } = useToast();

  // Debounce search input to avoid re-fetching on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch users - note: selectedUserId is NOT in dependencies, eliminating the infinite render loop!
  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await adminApi.getUsers({
        search: debouncedSearch,
        plan: tierFilter,
        status: statusFilter,
        limit: 50,
      });
      setUsers(res.users);
      setSelectedUserId((prev) => {
        if (prev && res.users.some(u => u.id === prev)) {
          return prev;
        }
        return res.users.length > 0 ? res.users[0].id : null;
      });
    } catch (err: any) {
      toastError('Failed to fetch users from database', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, tierFilter, statusFilter, toastError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle external selection (e.g. from CommandPalette)
  useEffect(() => {
    if (selectedUserFromSearch) {
      setSelectedUserId(selectedUserFromSearch.id);
      if (onClearSelectedUser) onClearSelectedUser();
    }
  }, [selectedUserFromSearch, onClearSelectedUser]);

  // Derive activeUser from current users array and selectedUserId
  const activeUser = users.find(u => u.id === selectedUserId) || (users.length > 0 ? users[0] : null);

  const handleStatusSubmit = async () => {
    if (!activeUser) return;
    setActionLoading(true);
    try {
      const res = await adminApi.updateUserStatus(activeUser.id, targetStatus, 'Admin console update');
      success(`User ${targetStatus}`, res.message);
      setUsers(prev => prev.map(u => u.id === activeUser.id ? res.user : u));
      setStatusModalOpen(false);
    } catch (err: any) {
      toastError('Status update failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePlanSubmit = async () => {
    if (!activeUser) return;
    setActionLoading(true);
    try {
      const res = await adminApi.overrideUserPlan(activeUser.id, targetPlan, 'Plan override');
      success(`Plan updated to ${targetPlan.toUpperCase()}`, res.message);
      setUsers(prev => prev.map(u => u.id === activeUser.id ? res.user : u));
      setPlanModalOpen(false);
    } catch (err: any) {
      toastError('Plan override failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBonusSubmit = async () => {
    if (!activeUser) return;
    setActionLoading(true);
    try {
      const res = await adminApi.grantBonusCredits(activeUser.id, parseInt(bonusAmount, 10) || 500, 'Bonus credits grant');
      success('Bonus credits granted', res.message);
      setUsers(prev => prev.map(u => {
        if (u.id === activeUser.id) {
          if (res.user) return res.user;
          return {
            ...u,
            usage: {
              ...u.usage,
              rewarded_bonus: (u.usage?.rewarded_bonus ?? 0) + (parseInt(bonusAmount, 10) || 500),
            },
          };
        }
        return u;
      }));
      setBonusModalOpen(false);
    } catch (err: any) {
      toastError('Bonus grant failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetSubmit = async () => {
    if (!activeUser) return;
    setActionLoading(true);
    try {
      const res = await adminApi.resetUserUsage(activeUser.id, 'all');
      success('Usage reset', res.message);
      setUsers(prev => prev.map(u => {
        if (u.id === activeUser.id) {
          return {
            ...u,
            usage: {
              ...u.usage,
              daily_ai_capacity_used: 0,
              tts_characters_used_monthly: 0,
              chat_today: 0,
              image_generation_today: 0,
              image_edit_today: 0,
            },
          };
        }
        return u;
      }));
      setResetModalOpen(false);
    } catch (err: any) {
      toastError('Reset failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleSubmit = async () => {
    if (!activeUser) return;
    setActionLoading(true);
    try {
      const isAdm = !activeUser.is_admin;
      const res = await adminApi.delegateAdminRole(activeUser.id, isAdm, isAdm ? 'admin' : 'user');
      success('Role updated', res.message);
      setUsers(prev => prev.map(u => u.id === activeUser.id ? res.user : u));
      setRoleModalOpen(false);
    } catch (err: any) {
      toastError('Role change failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const getInitials = (nameOrEmail?: string) => {
    if (!nameOrEmail) return 'U';
    const parts = nameOrEmail.trim().split(/[\s._@]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nameOrEmail.slice(0, 2).toUpperCase();
  };

  const activeDisplayName = activeUser ? (activeUser.display_name || activeUser.email || activeUser.id.slice(0, 8)) : null;
  const activeCode = activeUser?.id ? `USR-${activeUser.id.slice(0, 8).toUpperCase()}` : '';

  const chatUnits = activeUser?.usage?.chat_today ?? 0;
  const imageUnits = activeUser?.usage?.image_generation_today ?? 0;
  const editUnits = activeUser?.usage?.image_edit_today ?? 0;
  const docUnits = activeUser?.usage?.document_analysis_today ?? 0;
  const userMax = Math.max(chatUnits, imageUnits, editUnits, docUnits, 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left/Main Column: User Directory Table */}
      <div className="lg:col-span-8 space-y-4">
        {/* Filter bar on top */}
        <div className="bg-white dark:bg-[#131d1a] border border-slate-200 dark:border-[#1d2c26] rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, user ID or display name"
            className="flex-1 px-3.5 py-1.5 text-xs bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none"
          />

          <div className="flex items-center gap-2">
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
            >
              <option value="all">Tier: All ▾</option>
              <option value="pro">Tier: Pro</option>
              <option value="plus">Tier: Plus</option>
              <option value="free">Tier: Free</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
            >
              <option value="all">Status: All ▾</option>
              <option value="active">Status: Active</option>
              <option value="suspended">Status: Suspended</option>
              <option value="banned">Status: Banned</option>
            </select>
          </div>
        </div>

        {/* Directory Table */}
        <div className="bg-white dark:bg-[#131d1a] border border-slate-200 dark:border-[#1d2c26] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#1d2c26] text-slate-500 dark:text-neutral-400 font-medium">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4">AI today</th>
                  <th className="py-3 px-4">TTS chars / mo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1d2c26]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-neutral-500">
                      Loading users from database...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-neutral-500">
                      No user accounts found in the database.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => {
                    const isSelected = activeUser?.id === u.id;
                    const uDisplayName = u.display_name || u.email || u.id.slice(0, 8);
                    const plan = u.current_plan || 'free';
                    const status = u.status || 'active';
                    const aiToday = u.usage?.daily_ai_capacity_used ?? 0;
                    const ttsChars = u.usage?.tts_characters_used_monthly ?? 0;

                    return (
                      <tr
                        key={u.id}
                        onClick={() => setSelectedUserId(u.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-slate-100/70 dark:bg-[#192621]'
                            : 'hover:bg-slate-50/80 dark:hover:bg-[#16221e]'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#008f5a] dark:bg-[#00a86b] text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {getInitials(uDisplayName)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-neutral-100 truncate">
                                {uDisplayName}
                              </p>
                              <p className="text-[11px] text-slate-400 dark:text-neutral-400 truncate">
                                {u.email || u.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                            plan === 'pro'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
                              : plan === 'plus'
                              ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/60'
                              : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300'
                          }`}>
                            {plan}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium capitalize ${
                            status === 'active'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                              : status === 'suspended'
                              ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                          }`}>
                            {status}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-slate-600 dark:text-neutral-300 whitespace-nowrap">
                          {formatDateDisplay(u.created_at)}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-800 dark:text-neutral-200 tabular-nums">
                          {aiToday}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-800 dark:text-neutral-200 tabular-nums">
                          {ttsChars.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Column: Selected User Profile & Moderation Card */}
      <div className="lg:col-span-4 bg-white dark:bg-[#131d1a] border border-slate-200 dark:border-[#1d2c26] rounded-xl p-6 space-y-6">
        <ErrorBoundary fallbackTitle="User Details Error">
          {activeUser ? (
            <>
              {/* Header with avatar, name, ID and joined date */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#008f5a] dark:bg-[#00a86b] text-white flex items-center justify-center font-bold text-base shrink-0">
                  {getInitials(activeDisplayName || '')}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                    {activeDisplayName}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 mt-0.5">
                    {activeCode} · joined {formatDateDisplay(activeUser.created_at)}
                  </p>
                </div>
              </div>

              {/* Stripe / PayPal Subtitle */}
              <p className="text-xs text-slate-500 dark:text-neutral-400 truncate">
                Stripe {activeUser.stripe_customer_id || 'None'} · PayPal {activeUser.paypal_subscription_id || 'None'}
              </p>

              {/* Feature Capacity Usage Progress Bars */}
              <div className="space-y-4">
                {/* Chat */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-800 dark:text-neutral-200">Chat</span>
                    <span className="text-slate-600 dark:text-neutral-400 font-mono">
                      {chatUnits.toLocaleString()} units
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-[#1d2c26] h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#008f5a] dark:bg-[#00a86b] rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(2, Math.round((chatUnits / userMax) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Image generation */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-800 dark:text-neutral-200">Image generation</span>
                    <span className="text-slate-600 dark:text-neutral-400 font-mono">
                      {imageUnits.toLocaleString()} units
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-[#1d2c26] h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#008f5a] dark:bg-[#00a86b] rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(2, Math.round((imageUnits / userMax) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Edits */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-800 dark:text-neutral-200">Edits</span>
                    <span className="text-slate-600 dark:text-neutral-400 font-mono">
                      {editUnits.toLocaleString()} units
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-[#1d2c26] h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#008f5a] dark:bg-[#00a86b] rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(2, Math.round((editUnits / userMax) * 100))}%` }}
                    />
                  </div>
                </div>

                {/* Document analysis */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-800 dark:text-neutral-200">Document analysis</span>
                    <span className="text-slate-600 dark:text-neutral-400 font-mono">
                      {docUnits.toLocaleString()} units
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-[#1d2c26] h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#008f5a] dark:bg-[#00a86b] rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(2, Math.round((docUnits / userMax) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Bonus credit balance */}
              <div className="flex items-baseline justify-between pt-2 border-t border-slate-100 dark:border-[#1d2c26]">
                <span className="text-xs text-slate-700 dark:text-neutral-300">
                  Bonus credit balance
                </span>
                <span className="text-xl font-bold text-slate-900 dark:text-white font-mono tabular-nums">
                  {(activeUser.usage?.rewarded_bonus ?? 0).toLocaleString()}
                </span>
              </div>

              {/* Plan override dropdown + Add Bonus Credits button */}
              <div className="flex items-center gap-2">
                <select
                  value={targetPlan}
                  onChange={(e) => {
                    setTargetPlan(e.target.value as PlanTier);
                    setPlanModalOpen(true);
                  }}
                  className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-800 dark:text-neutral-200 focus:outline-none cursor-pointer"
                >
                  <option value="pro">Plan override: Pro ▾</option>
                  <option value="plus">Plan override: Plus ▾</option>
                  <option value="free">Plan override: Free ▾</option>
                </select>

                <button
                  onClick={() => setBonusModalOpen(true)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#008f5a] dark:bg-[#00a86b] hover:opacity-90 rounded-lg transition-opacity whitespace-nowrap cursor-pointer"
                >
                  Add Bonus Credits
                </button>
              </div>

              {/* Action buttons: Ban user & Reset Usage */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setTargetStatus(activeUser.status === 'banned' ? 'active' : 'banned');
                    setStatusModalOpen(true);
                  }}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-rose-300 dark:border-rose-800 rounded-lg transition-colors text-center cursor-pointer"
                >
                  {activeUser.status === 'banned' ? 'Unban user' : 'Ban user'}
                </button>

                <button
                  onClick={() => setResetModalOpen(true)}
                  className="flex-1 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-neutral-200 bg-transparent hover:bg-slate-100 dark:hover:bg-[#192621] border border-slate-300 dark:border-[#263a33] rounded-lg transition-colors text-center cursor-pointer"
                >
                  Reset Usage
                </button>
              </div>

              {/* Admin Role delegation button */}
              <div>
                <button
                  onClick={() => setRoleModalOpen(true)}
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-700 dark:text-neutral-200 bg-transparent hover:bg-slate-100 dark:hover:bg-[#192621] border border-slate-300 dark:border-[#263a33] rounded-lg transition-colors text-center cursor-pointer"
                >
                  {activeUser.is_admin ? 'Demote Admin' : 'Promote to Admin'}
                </button>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400 dark:text-neutral-500">
              Select a user from the directory to inspect their live profile and execute moderation actions.
            </div>
          )}
        </ErrorBoundary>
      </div>

      {/* Confirmation Modals for actions */}
      <ConfirmationModal
        isOpen={statusModalOpen}
        title={targetStatus === 'banned' ? 'Confirm Ban User' : 'Confirm Reactivate User'}
        description={`Are you sure you want to change account status for ${activeDisplayName}?`}
        confirmLabel={targetStatus === 'banned' ? 'Ban User' : 'Reactivate User'}
        variant={targetStatus === 'banned' ? 'danger' : 'primary'}
        isLoading={actionLoading}
        onConfirm={handleStatusSubmit}
        onCancel={() => setStatusModalOpen(false)}
      />

      <ConfirmationModal
        isOpen={planModalOpen}
        title="Confirm Plan Override"
        description={`Set plan tier to ${targetPlan.toUpperCase()} for ${activeDisplayName}?`}
        confirmLabel="Apply Override"
        variant="primary"
        isLoading={actionLoading}
        onConfirm={handlePlanSubmit}
        onCancel={() => setPlanModalOpen(false)}
      />

      <ConfirmationModal
        isOpen={bonusModalOpen}
        title="Add Bonus Credits"
        description={`Deposit bonus credits for ${activeDisplayName}:`}
        confirmLabel="Deposit Credits"
        variant="primary"
        isLoading={actionLoading}
        onConfirm={handleBonusSubmit}
        onCancel={() => setBonusModalOpen(false)}
      >
        <div className="mt-3">
          <input
            type="number"
            value={bonusAmount}
            onChange={(e) => setBonusAmount(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg text-slate-900 dark:text-white font-mono"
            placeholder="Amount"
          />
        </div>
      </ConfirmationModal>

      <ConfirmationModal
        isOpen={resetModalOpen}
        title="Reset Usage Counters"
        description={`Reset usage counters for ${activeDisplayName}?`}
        confirmLabel="Execute Reset"
        variant="warning"
        isLoading={actionLoading}
        onConfirm={handleResetSubmit}
        onCancel={() => setResetModalOpen(false)}
      />

      <ConfirmationModal
        isOpen={roleModalOpen}
        title={activeUser?.is_admin ? 'Demote Admin' : 'Promote to Admin'}
        description={`Change admin role for ${activeDisplayName}?`}
        confirmLabel="Confirm"
        variant="warning"
        isLoading={actionLoading}
        onConfirm={handleRoleSubmit}
        onCancel={() => setRoleModalOpen(false)}
      />
    </div>
  );
};
