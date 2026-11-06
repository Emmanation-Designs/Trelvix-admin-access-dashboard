import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../services/adminApi';
import type { CapacityReservation } from '../../types/admin';
import { useToast } from '../common/Toast';
import { ConfirmationModal } from '../common/ConfirmationModal';

export const ReservationAuditView: React.FC = () => {
  const [reservations, setReservations] = useState<CapacityReservation[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Refund state
  const [refundTarget, setRefundTarget] = useState<CapacityReservation | null>(null);
  const [isRefunding, setIsRefunding] = useState(false);

  const { success, error: toastError } = useToast();

  const fetchReservations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getReservations({
        status: statusFilter,
        search,
      });
      setReservations(data);
    } catch (err: any) {
      toastError('Failed to fetch reservations', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, search, toastError]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const handleConfirmRefund = async () => {
    if (!refundTarget) return;
    setIsRefunding(true);
    try {
      const res = await adminApi.refundReservation(refundTarget.reservation_id);
      success('Refund executed', res.message);
      setRefundTarget(null);
      fetchReservations();
    } catch (err: any) {
      toastError('Refund failed', err.message);
    } finally {
      setIsRefunding(false);
    }
  };

  const formatFeatureName = (feat: string) => {
    if (feat === 'video_render') return 'Video – Creative';
    if (feat === 'gemini_chat') return 'Chat';
    if (feat === 'image_gen') return 'Image generation';
    if (feat === 'image_edit') return 'Edit';
    if (feat === 'tts_speech') return 'Doc analysis';
    if (feat === 'live_audio') return 'Live audio';
    return feat.replace(/_/g, ' ');
  };

  const formatTimeOnly = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch {
      return 'N/A';
    }
  };

  const getCleanUsername = (emailOrId?: string) => {
    if (!emailOrId) return 'user';
    const beforeAt = emailOrId.split('@')[0];
    return beforeAt || emailOrId.slice(0, 8);
  };

  // Compute stats directly from real database reservations
  const reservedCount = reservations.filter(r => r.status === 'reserved').length;
  const completedCount = reservations.filter(r => r.status === 'completed').length;
  const refundedCount = reservations.filter(r => r.status === 'refunded').length;
  const unitsReserved = reservations
    .filter(r => r.status === 'reserved')
    .reduce((sum, r) => sum + (r.cost || 0), 0);

  return (
    <div className="space-y-6">
      {/* 4 Stat Cards in a Row - Real database calculated */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Reserved */}
        <div className="bg-white dark:bg-[#131d1a] border border-slate-200 dark:border-[#1d2c26] rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-neutral-400 font-normal">
            Reserved
          </div>
          <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2 font-sans tabular-nums">
            {isLoading ? '...' : reservedCount.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 dark:text-neutral-500 mt-2">
            units held now
          </div>
        </div>

        {/* Card 2: Completed today */}
        <div className="bg-white dark:bg-[#131d1a] border border-slate-200 dark:border-[#1d2c26] rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-neutral-400 font-normal">
            Completed today
          </div>
          <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2 font-sans tabular-nums">
            {isLoading ? '...' : completedCount.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 dark:text-neutral-500 mt-2">
            reservations
          </div>
        </div>

        {/* Card 3: Refunded today */}
        <div className="bg-white dark:bg-[#131d1a] border border-slate-200 dark:border-[#1d2c26] rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-neutral-400 font-normal">
            Refunded today
          </div>
          <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2 font-sans tabular-nums">
            {isLoading ? '...' : refundedCount.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 dark:text-neutral-500 mt-2">
            reservations
          </div>
        </div>

        {/* Card 4: Units reserved */}
        <div className="bg-white dark:bg-[#131d1a] border border-slate-200 dark:border-[#1d2c26] rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-neutral-400 font-normal">
            Units reserved
          </div>
          <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2 font-sans tabular-nums">
            {isLoading ? '...' : unitsReserved.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 dark:text-neutral-500 mt-2">
            across open holds
          </div>
        </div>
      </div>

      {/* Main Panel: Capacity reservations log */}
      <div className="bg-white dark:bg-[#131d1a] border border-slate-200 dark:border-[#1d2c26] rounded-xl p-6">
        {/* Header and Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Capacity reservations log
          </h2>

          <div className="flex items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-700 dark:text-neutral-300 focus:outline-none cursor-pointer"
            >
              <option value="all">Status: All ▾</option>
              <option value="reserved">Status: Reserved</option>
              <option value="completed">Status: Completed</option>
              <option value="refunded">Status: Refunded</option>
            </select>

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user or ID"
              className="px-3.5 py-1.5 text-xs bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none w-44 sm:w-48"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#1d2c26] text-slate-500 dark:text-neutral-400 font-medium">
                <th className="py-3 px-4">Reservation ID</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Feature</th>
                <th className="py-3 px-4">Cost</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1d2c26]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-neutral-500">
                    Querying public.capacity_reservations...
                  </td>
                </tr>
              ) : reservations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-neutral-500">
                    No reservations found in database.
                  </td>
                </tr>
              ) : (
                reservations.map((r) => {
                  const isReserved = r.status === 'reserved';
                  const isCompleted = r.status === 'completed';

                  return (
                    <tr key={r.reservation_id} className="hover:bg-slate-50/60 dark:hover:bg-[#16221e] transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-800 dark:text-neutral-200">
                        {r.reservation_id}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-neutral-300">
                        {getCleanUsername(r.user_email)}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-neutral-300">
                        {formatFeatureName(r.feature)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800 dark:text-neutral-200 tabular-nums">
                        {r.cost}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-medium capitalize ${
                          isReserved
                            ? 'bg-amber-50 dark:bg-[#261f0d] text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-[#3d3215]'
                            : isCompleted
                            ? 'bg-emerald-50 dark:bg-[#0c241b] text-emerald-700 dark:text-[#00a86b] border border-emerald-200 dark:border-[#153e2e]'
                            : 'bg-rose-50 dark:bg-[#281313] text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-[#401e1e]'
                        }`}>
                          {r.status === 'reserved' ? 'Reserved' : r.status === 'completed' ? 'Completed' : 'Refunded'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 dark:text-neutral-400">
                        {formatTimeOnly(r.created_at)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isReserved && (
                          <button
                            onClick={() => setRefundTarget(r)}
                            className="px-3 py-1 text-xs font-medium text-slate-700 dark:text-neutral-200 hover:text-slate-900 dark:hover:text-white bg-transparent hover:bg-slate-100 dark:hover:bg-[#1c2a25] border border-slate-300 dark:border-[#2b3e36] rounded-md transition-colors cursor-pointer"
                          >
                            Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Safe Refund Modal */}
      {refundTarget && (
        <ConfirmationModal
          isOpen={Boolean(refundTarget)}
          title="Confirm Capacity Refund"
          description={`Release ${refundTarget.cost} capacity units held by ${refundTarget.reservation_id} for ${refundTarget.user_email}?`}
          confirmLabel="Execute Refund"
          variant="danger"
          isLoading={isRefunding}
          onConfirm={handleConfirmRefund}
          onCancel={() => setRefundTarget(null)}
        />
      )}
    </div>
  );
};
