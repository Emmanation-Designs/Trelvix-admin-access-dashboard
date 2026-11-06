import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../services/adminApi';
import type { AdminAuditLog } from '../../types/admin';

export const AuditLogsAndAnomaliesView: React.FC = () => {
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [adminFilter, setAdminFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const logs = await adminApi.getAuditLogs();
      setAuditLogs(logs);
    } catch (err: any) {
      console.warn('Could not load audit logs from database:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatRelativeTimestamp = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = d.getHours().toString().padStart(2, '0');
      const mins = d.getMinutes().toString().padStart(2, '0');

      if (diffDays === 0) return `Today ${hours}:${mins}`;
      if (diffDays === 1) return `Yesterday ${hours}:${mins}`;
      return `${diffDays} days ago`;
    } catch {
      return 'N/A';
    }
  };

  const displayItems = auditLogs.map(l => ({
    id: l.id,
    admin_email: l.admin_email,
    action: l.action,
    target_user: l.target_user_id || 'Global',
    timestamp: formatRelativeTimestamp(l.created_at),
  }));

  const uniqueAdmins = Array.from(new Set(auditLogs.map(l => l.admin_email))).filter(Boolean);

  const filteredLogs = displayItems.filter(item => {
    const matchesAdmin = adminFilter === 'all' || item.admin_email.toLowerCase() === adminFilter.toLowerCase();
    const matchesSearch = !search || 
      item.action.toLowerCase().includes(search.toLowerCase()) || 
      item.target_user.toLowerCase().includes(search.toLowerCase()) ||
      item.admin_email.toLowerCase().includes(search.toLowerCase());
    return matchesAdmin && matchesSearch;
  });

  return (
    <div className="bg-white dark:bg-[#131d1a] border border-slate-200 dark:border-[#1d2c26] rounded-xl p-6">
      {/* Header and Top-Right Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Admin activity stream
        </h2>

        <div className="flex items-center gap-2.5">
          <select
            value={adminFilter}
            onChange={(e) => setAdminFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
          >
            <option value="all">Admin: All ▾</option>
            {uniqueAdmins.map(admin => (
              <option key={admin} value={admin}>{admin}</option>
            ))}
          </select>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action or user"
            className="px-3.5 py-1.5 text-xs bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none w-44 sm:w-48"
          />
        </div>
      </div>

      {/* Activity Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[#1d2c26] text-slate-500 dark:text-neutral-400 font-medium">
              <th className="py-3 px-4">Admin email</th>
              <th className="py-3 px-4">Action taken</th>
              <th className="py-3 px-4">Target user</th>
              <th className="py-3 px-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#1d2c26]">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400 dark:text-neutral-500">
                  Loading activity logs from database...
                </td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-slate-400 dark:text-neutral-500">
                  {search || adminFilter !== 'all' 
                    ? 'No audit events matching current filter.'
                    : 'No administrative audit logs recorded in public.admin_audit_logs yet.'}
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-[#16221e] transition-colors">
                  <td className="py-3.5 px-4 text-slate-800 dark:text-neutral-200 font-normal">
                    {log.admin_email}
                  </td>
                  <td className="py-3.5 px-4 text-slate-900 dark:text-neutral-100 font-medium">
                    {log.action}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-neutral-400">
                    {log.target_user}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-neutral-400">
                    {log.timestamp}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
