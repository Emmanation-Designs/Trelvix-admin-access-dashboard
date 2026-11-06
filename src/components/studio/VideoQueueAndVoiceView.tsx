import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../services/adminApi';
import type { VideoQueueItem, VoiceSessionItem } from '../../types/admin';
import { useToast } from '../common/Toast';
import { ConfirmationModal } from '../common/ConfirmationModal';

export const VideoQueueAndVoiceView: React.FC = () => {
  const [videoQueue, setVideoQueue] = useState<VideoQueueItem[]>([]);
  const [voiceSessions, setVoiceSessions] = useState<VoiceSessionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Video Action
  const [targetVideoJob, setTargetVideoJob] = useState<{ job: VideoQueueItem; action: 'retry' | 'refund_and_fail' } | null>(null);
  const [videoActionLoading, setVideoActionLoading] = useState(false);

  // Terminate voice session
  const [targetVoiceSession, setTargetVoiceSession] = useState<VoiceSessionItem | null>(null);
  const [killLoading, setKillLoading] = useState(false);

  const { success, error: toastError } = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [videos, voices] = await Promise.all([
        adminApi.getVideoQueue(),
        adminApi.getLiveVoiceSessions(),
      ]);
      setVideoQueue(videos);
      setVoiceSessions(voices);
    } catch (err: any) {
      toastError('Failed to load video & voice queues', err.message);
    } finally {
      setIsLoading(false);
    }
  }, [toastError]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleConfirmVideoAction = async () => {
    if (!targetVideoJob) return;
    setVideoActionLoading(true);
    try {
      const res = await adminApi.handleVideoAction(targetVideoJob.job.id, targetVideoJob.action);
      success('Video action completed', res.message);
      setTargetVideoJob(null);
      loadData();
    } catch (err: any) {
      toastError('Action failed', err.message);
    } finally {
      setVideoActionLoading(false);
    }
  };

  const handleConfirmKillSession = async () => {
    if (!targetVoiceSession) return;
    setKillLoading(true);
    try {
      const res = await adminApi.terminateVoiceSession(targetVoiceSession.session_id);
      success('Session disconnected', res.message);
      setTargetVoiceSession(null);
      loadData();
    } catch (err: any) {
      toastError('Disconnect failed', err.message);
    } finally {
      setKillLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Card: Video generation monitor */}
      <div className="bg-white dark:bg-[#131d1a] border border-slate-200 dark:border-[#1d2c26] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Video generation monitor
          </h2>
          <span className="text-xs text-slate-400 dark:text-neutral-500 font-mono">
            {videoQueue.length} jobs in queue
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#1d2c26] text-slate-500 dark:text-neutral-400 font-medium">
                <th className="py-3 px-4 w-1/3">Active prompt</th>
                <th className="py-3 px-4">Quality tier</th>
                <th className="py-3 px-4 w-1/4">Progress</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1d2c26]">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-neutral-500">
                    Loading video queue from database...
                  </td>
                </tr>
              ) : videoQueue.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-neutral-500">
                    No video generation renders currently in the database queue.
                  </td>
                </tr>
              ) : (
                videoQueue.map((item) => {
                  const prompt = item.prompt || 'Untitled Prompt';
                  const quality = item.tier === 'pro' || item.tier === 'super_creative' ? 'Super-Creative' : 'Creative';
                  const progress = item.progress ?? (item.status === 'completed' ? 100 : item.status === 'rendering' ? 50 : 0);
                  const isFailed = item.status === 'failed';
                  const statusText = isFailed ? 'Failed' : item.status === 'completed' ? 'Completed' : `Rendering ${progress}%`;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-[#16221e] transition-colors">
                      <td className="py-3.5 px-4 text-slate-800 dark:text-neutral-200 truncate max-w-xs font-normal">
                        &ldquo;{prompt}&rdquo;
                      </td>
                      <td className="py-3.5 px-4 text-[#00a86b] dark:text-[#00c980] font-medium">
                        {quality}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="w-full bg-slate-100 dark:bg-[#192622] h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${isFailed ? 'bg-rose-500 w-full' : 'bg-[#008f5a] dark:bg-[#00a86b]'}`}
                            style={{ width: `${Math.max(4, Math.min(100, progress))}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium">
                        <span className={isFailed ? 'text-rose-600 dark:text-rose-400' : 'text-[#00a86b] dark:text-[#00c980]'}>
                          {statusText}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-3 text-xs">
                          <button
                            onClick={() => setTargetVideoJob({ job: item, action: 'retry' })}
                            className="text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer"
                          >
                            Retry
                          </button>
                          <button
                            onClick={() => setTargetVideoJob({ job: item, action: 'refund_and_fail' })}
                            className="text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer"
                          >
                            Refund
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Section: Live real-time audio sessions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Live real-time audio sessions
          </h2>
          <span className="text-xs text-slate-400 dark:text-neutral-500 font-mono">
            {voiceSessions.length} active sessions
          </span>
        </div>

        {voiceSessions.length === 0 ? (
          <div className="bg-white dark:bg-[#131d1a] border border-slate-200 dark:border-[#1d2c26] rounded-xl p-8 text-center text-xs text-slate-400 dark:text-neutral-500">
            No live WebRTC / WebSocket voice sessions currently active in the database.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {voiceSessions.map((s) => {
              const email = s.user_email || 'user@trelvixai.com';
              const initials = email.slice(0, 2).toUpperCase();
              const mins = Math.floor(s.duration_seconds / 60).toString().padStart(2, '0');
              const secs = (s.duration_seconds % 60).toString().padStart(2, '0');
              const timer = `00:${mins}:${secs}`;
              const unitsText = `Connected duration · ${s.credits_consumed || 0} units used`;

              return (
                <div
                  key={s.session_id}
                  className="bg-white dark:bg-[#131d1a] border border-slate-200 dark:border-[#1d2c26] rounded-xl p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#008f5a] dark:bg-[#00a86b] text-white flex items-center justify-center font-bold text-xs shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-neutral-100 truncate">
                          {email}
                        </p>
                        <p className="text-[11px] text-[#00a86b] dark:text-[#00c980] flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00a86b] dark:bg-[#00c980]" />
                          <span>Connected</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900 dark:text-white mt-5">
                      {timer}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
                      {unitsText}
                    </p>
                  </div>

                  <div className="mt-6">
                    <button
                      onClick={() => setTargetVoiceSession(s)}
                      className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-rose-300 dark:border-rose-900/60 rounded-lg transition-colors text-center cursor-pointer"
                    >
                      Force disconnect
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {targetVideoJob && (
        <ConfirmationModal
          isOpen={Boolean(targetVideoJob)}
          title={targetVideoJob.action === 'retry' ? 'Retry Video Job' : 'Refund and Cancel Job'}
          description={`Execute action on video render for ${targetVideoJob.job.user_email}?`}
          confirmLabel={targetVideoJob.action === 'retry' ? 'Re-enqueue' : 'Refund'}
          variant={targetVideoJob.action === 'retry' ? 'primary' : 'danger'}
          isLoading={videoActionLoading}
          onConfirm={handleConfirmVideoAction}
          onCancel={() => setTargetVideoJob(null)}
        />
      )}

      {targetVoiceSession && (
        <ConfirmationModal
          isOpen={Boolean(targetVoiceSession)}
          title="Force Disconnect Session"
          description={`Terminate WebRTC connection for ${targetVoiceSession.user_email}?`}
          confirmLabel="Force Disconnect"
          variant="danger"
          isLoading={killLoading}
          onConfirm={handleConfirmKillSession}
          onCancel={() => setTargetVoiceSession(null)}
        />
      )}
    </div>
  );
};
