import React, { useState, useEffect, useCallback } from 'react';
import { adminApi } from '../../services/adminApi';
import type { PlanLimitConfig, PlanTier, DashboardMetrics } from '../../types/admin';
import { useToast } from '../common/Toast';

interface PlanMatrixState {
  dailyChat: { free: string; plus: string; pro: string };
  dailyImage: { free: string; plus: string; pro: string };
  dailyDoc: { free: string; plus: string; pro: string };
  monthlyTts: { free: string; plus: string; pro: string };
  singleCharLimit: { free: string; plus: string; pro: string };
  monthlyVideo: { free: string; plus: string; pro: string };
}

export const PlanLimitsAndBroadcastView: React.FC = () => {
  const [matrix, setMatrix] = useState<PlanMatrixState>({
    dailyChat: { free: '20', plus: '100', pro: '500' },
    dailyImage: { free: '5', plus: '40', pro: '150' },
    dailyDoc: { free: '5', plus: '50', pro: '200' },
    monthlyTts: { free: '10,000', plus: '500,000', pro: '2,000,000' },
    singleCharLimit: { free: '1,000', plus: '10,000', pro: '50,000' },
    monthlyVideo: { free: '0', plus: '2', pro: '5' },
  });

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { success, error: toastError } = useToast();

  const loadLimits = useCallback(async () => {
    setIsLoading(true);
    try {
      const [limitsData, metricsData] = await Promise.all([
        adminApi.getPlanLimits(),
        adminApi.getMetrics(),
      ]);

      setMetrics(metricsData);

      if (limitsData && (limitsData.free || limitsData.plus || limitsData.pro)) {
        setMatrix({
          dailyChat: {
            free: (limitsData.free?.daily_chat_limit ?? 20).toLocaleString(),
            plus: (limitsData.plus?.daily_chat_limit ?? 100).toLocaleString(),
            pro: (limitsData.pro?.daily_chat_limit ?? 500).toLocaleString(),
          },
          dailyImage: {
            free: (limitsData.free?.image_generation_limit ?? 5).toLocaleString(),
            plus: (limitsData.plus?.image_generation_limit ?? 40).toLocaleString(),
            pro: (limitsData.pro?.image_generation_limit ?? 150).toLocaleString(),
          },
          dailyDoc: {
            free: (limitsData.free?.document_ai_ocr_limit ?? 5).toLocaleString(),
            plus: (limitsData.plus?.document_ai_ocr_limit ?? 50).toLocaleString(),
            pro: (limitsData.pro?.document_ai_ocr_limit ?? 200).toLocaleString(),
          },
          monthlyTts: {
            free: (limitsData.free?.monthly_tts_character_allowance ?? 10000).toLocaleString(),
            plus: (limitsData.plus?.monthly_tts_character_allowance ?? 500000).toLocaleString(),
            pro: (limitsData.pro?.monthly_tts_character_allowance ?? 2000000).toLocaleString(),
          },
          singleCharLimit: {
            free: (limitsData.free?.max_single_tts_generation_caps ?? 1000).toLocaleString(),
            plus: (limitsData.plus?.max_single_tts_generation_caps ?? 10000).toLocaleString(),
            pro: (limitsData.pro?.max_single_tts_generation_caps ?? 50000).toLocaleString(),
          },
          monthlyVideo: {
            free: (limitsData.free?.parallel_video_slots ?? 0).toLocaleString(),
            plus: (limitsData.plus?.parallel_video_slots ?? 2).toLocaleString(),
            pro: (limitsData.pro?.parallel_video_slots ?? 5).toLocaleString(),
          },
        });
      }
    } catch (err: any) {
      console.warn('Could not load plan limits from database:', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLimits();
  }, [loadLimits]);

  const cleanNum = (val: string): number => {
    const parsed = parseInt(val.replace(/,/g, ''), 10);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      const tiers: PlanTier[] = ['free', 'plus', 'pro'];
      await Promise.all(
        tiers.map((t) =>
          adminApi.updatePlanLimits(t, {
            daily_chat_limit: cleanNum(matrix.dailyChat[t]),
            image_generation_limit: cleanNum(matrix.dailyImage[t]),
            document_ai_ocr_limit: cleanNum(matrix.dailyDoc[t]),
            monthly_tts_character_allowance: cleanNum(matrix.monthlyTts[t]),
            max_single_tts_generation_caps: cleanNum(matrix.singleCharLimit[t]),
            parallel_video_slots: cleanNum(matrix.monthlyVideo[t]),
          })
        )
      );
      success('Changes Saved', 'Plan limits persisted to database public.plan_limits.');
    } catch (err: any) {
      toastError('Save Failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const updateCell = (rowKey: keyof PlanMatrixState, tier: 'free' | 'plus' | 'pro', value: string) => {
    setMatrix((prev) => ({
      ...prev,
      [rowKey]: {
        ...prev[rowKey],
        [tier]: value,
      },
    }));
  };

  const totalUsers = metrics?.total_users ?? 0;
  const plusUsers = metrics?.active_plus_users ?? 0;
  const proUsers = metrics?.active_pro_users ?? 0;
  const freeUsers = Math.max(0, totalUsers - plusUsers - proUsers);

  return (
    <div className="space-y-6">
      {/* Main Card: System plan limits */}
      <div className="bg-white dark:bg-[#131d1a] border border-slate-200 dark:border-[#1d2c26] rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            System plan limits
          </h2>
          <button
            onClick={handleSaveChanges}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#008f5a] dark:bg-[#00a86b] hover:opacity-90 rounded-lg transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-[#1d2c26] text-slate-500 dark:text-neutral-400 font-medium">
                <th className="py-3 px-4 w-1/3">Limit</th>
                <th className="py-3 px-4 text-center w-1/5">Free</th>
                <th className="py-3 px-4 text-center w-1/5">Plus</th>
                <th className="py-3 px-4 text-center w-1/5">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1d2c26]">
              {/* Row 1: Daily chat cap */}
              <tr>
                <td className="py-3.5 px-4 text-slate-800 dark:text-neutral-200 font-medium">
                  Daily chat cap
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    value={matrix.dailyChat.free}
                    onChange={(e) => updateCell('dailyChat', 'free', e.target.value)}
                    className="w-full py-2 px-3 text-center text-xs font-mono bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    value={matrix.dailyChat.plus}
                    onChange={(e) => updateCell('dailyChat', 'plus', e.target.value)}
                    className="w-full py-2 px-3 text-center text-xs font-mono bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    value={matrix.dailyChat.pro}
                    onChange={(e) => updateCell('dailyChat', 'pro', e.target.value)}
                    className="w-full py-2 px-3 text-center text-xs font-mono bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </td>
              </tr>

              {/* Row 2: Daily image cap */}
              <tr>
                <td className="py-3.5 px-4 text-slate-800 dark:text-neutral-200 font-medium">
                  Daily image cap
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    value={matrix.dailyImage.free}
                    onChange={(e) => updateCell('dailyImage', 'free', e.target.value)}
                    className="w-full py-2 px-3 text-center text-xs font-mono bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    value={matrix.dailyImage.plus}
                    onChange={(e) => updateCell('dailyImage', 'plus', e.target.value)}
                    className="w-full py-2 px-3 text-center text-xs font-mono bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    value={matrix.dailyImage.pro}
                    onChange={(e) => updateCell('dailyImage', 'pro', e.target.value)}
                    className="w-full py-2 px-3 text-center text-xs font-mono bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </td>
              </tr>

              {/* Row 3: Daily document analysis cap */}
              <tr>
                <td className="py-3.5 px-4 text-slate-800 dark:text-neutral-200 font-medium">
                  Daily document analysis cap
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    value={matrix.dailyDoc.free}
                    onChange={(e) => updateCell('dailyDoc', 'free', e.target.value)}
                    className="w-full py-2 px-3 text-center text-xs font-mono bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    value={matrix.dailyDoc.plus}
                    onChange={(e) => updateCell('dailyDoc', 'plus', e.target.value)}
                    className="w-full py-2 px-3 text-center text-xs font-mono bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    value={matrix.dailyDoc.pro}
                    onChange={(e) => updateCell('dailyDoc', 'pro', e.target.value)}
                    className="w-full py-2 px-3 text-center text-xs font-mono bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </td>
              </tr>

              {/* Row 4: Monthly TTS allowance (chars) */}
              <tr>
                <td className="py-3.5 px-4 text-slate-800 dark:text-neutral-200 font-medium">
                  Monthly TTS allowance (chars)
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    value={matrix.monthlyTts.free}
                    onChange={(e) => updateCell('monthlyTts', 'free', e.target.value)}
                    className="w-full py-2 px-3 text-center text-xs font-mono bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    value={matrix.monthlyTts.plus}
                    onChange={(e) => updateCell('monthlyTts', 'plus', e.target.value)}
                    className="w-full py-2 px-3 text-center text-xs font-mono bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    value={matrix.monthlyTts.pro}
                    onChange={(e) => updateCell('monthlyTts', 'pro', e.target.value)}
                    className="w-full py-2 px-3 text-center text-xs font-mono bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </td>
              </tr>

              {/* Row 5: Single-generation character limit */}
              <tr>
                <td className="py-3.5 px-4 text-slate-800 dark:text-neutral-200 font-medium">
                  Single-generation character limit
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    value={matrix.singleCharLimit.free}
                    onChange={(e) => updateCell('singleCharLimit', 'free', e.target.value)}
                    className="w-full py-2 px-3 text-center text-xs font-mono bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    value={matrix.singleCharLimit.plus}
                    onChange={(e) => updateCell('singleCharLimit', 'plus', e.target.value)}
                    className="w-full py-2 px-3 text-center text-xs font-mono bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    value={matrix.singleCharLimit.pro}
                    onChange={(e) => updateCell('singleCharLimit', 'pro', e.target.value)}
                    className="w-full py-2 px-3 text-center text-xs font-mono bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </td>
              </tr>

              {/* Row 6: Monthly video generations */}
              <tr>
                <td className="py-3.5 px-4 text-slate-800 dark:text-neutral-200 font-medium">
                  Monthly video generations
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    value={matrix.monthlyVideo.free}
                    onChange={(e) => updateCell('monthlyVideo', 'free', e.target.value)}
                    className="w-full py-2 px-3 text-center text-xs font-mono bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    value={matrix.monthlyVideo.plus}
                    onChange={(e) => updateCell('monthlyVideo', 'plus', e.target.value)}
                    className="w-full py-2 px-3 text-center text-xs font-mono bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </td>
                <td className="py-3.5 px-4">
                  <input
                    type="text"
                    value={matrix.monthlyVideo.pro}
                    onChange={(e) => updateCell('monthlyVideo', 'pro', e.target.value)}
                    className="w-full py-2 px-3 text-center text-xs font-mono bg-slate-50 dark:bg-[#0c1311] border border-slate-200 dark:border-[#22332c] rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom 3 Cards: Real database counts for Free / Plus / Pro tier users */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Free tier users */}
        <div className="bg-white dark:bg-[#131d1a] border border-slate-200 dark:border-[#1d2c26] rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-neutral-400 font-normal">
            Free tier users
          </div>
          <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2 font-sans tabular-nums">
            {isLoading ? '...' : freeUsers.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 dark:text-neutral-500 mt-2">
            default limits
          </div>
        </div>

        {/* Plus tier users */}
        <div className="bg-white dark:bg-[#131d1a] border border-slate-200 dark:border-[#1d2c26] rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-neutral-400 font-normal">
            Plus tier users
          </div>
          <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2 font-sans tabular-nums">
            {isLoading ? '...' : plusUsers.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 dark:text-neutral-500 mt-2">
            default limits
          </div>
        </div>

        {/* Pro tier users */}
        <div className="bg-white dark:bg-[#131d1a] border border-slate-200 dark:border-[#1d2c26] rounded-xl p-5">
          <div className="text-xs text-slate-500 dark:text-neutral-400 font-normal">
            Pro tier users
          </div>
          <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-2 font-sans tabular-nums">
            {isLoading ? '...' : proUsers.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 dark:text-neutral-500 mt-2">
            default limits
          </div>
        </div>
      </div>
    </div>
  );
};
