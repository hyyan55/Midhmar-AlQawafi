import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import type { LeaderboardEntry, LeaderboardPeriod } from '../../packages/shared/src/index.ts';
import { useApp } from '../context/AppContext.tsx';
import { apiClient } from '../services/apiClient.ts';
import { getAvatarImageUrl } from '../utils/feedback.ts';

export const LeaderboardsScreen: React.FC = () => {
  const { user, isOnline, backendAvailable, recheckBackend, navigate } = useApp();
  const [period, setPeriod] = useState<LeaderboardPeriod>('all_time');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!isOnline) {
      setLoading(false);
      setError('لوحة المتصدرين تتطلب اتصالاً بالإنترنت.');
      return;
    }
    if (!backendAvailable) {
      setLoading(false);
      setError(
        'لوحة المتصدرين تتطلب تشغيل الخادم الخلفي وقاعدة البيانات. يعمل التطبيق الآن في وضع معاينة الواجهة.'
      );
      return;
    }

    setLoading(true);
    setError(null);
    apiClient
      .getLeaderboards(period)
      .then((res) => {
        if (!active) return;
        setEntries(res.entries);
        setCurrentUserRank(res.currentUserRank);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'تعذر تحميل الترتيب');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [backendAvailable, isOnline, period]);

  const periods: Array<{ id: LeaderboardPeriod; label: string }> = [
    { id: 'daily', label: 'اليومي' },
    { id: 'weekly', label: 'الأسبوعي' },
    { id: 'all_time', label: 'كل الأوقات' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold font-poetry">لوحة المتصدرين</h1>
          <p className="text-sm text-[#5E615E] dark:text-[#A0A8B0]">
            ترتيب القرّاء والشعراء حسب نقاط الخبرة المكتسبة ودقة الإجابات.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#EFECE4] dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542]">
          {periods.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap min-h-[40px] ${
                period === p.id
                  ? 'bg-white dark:bg-[#0F1419] text-[#181A1B] dark:text-[#F3EFE6] shadow-sm'
                  : 'text-[#5E615E] dark:text-[#A0A8B0]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {currentUserRank && (
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-[#0D6E52]/30 dark:border-[#18A87E]/30 px-4 py-3 text-sm flex items-center justify-between">
          <span>ترتيبك الحالي في هذه الفترة:</span>
          <strong className="font-mono-tabular text-[#0D6E52] dark:text-[#18A87E]">
            المركز #{currentUserRank}
          </strong>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] p-10 text-center text-sm text-[#5E615E] dark:text-[#A0A8B0]">
          جارٍ تحميل قائمة المتصدرين...
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] p-10 text-center space-y-3">
          <p className="text-sm text-[#5E615E] dark:text-[#A0A8B0]">{error}</p>
          {isOnline && !backendAvailable && (
            <button
              type="button"
              onClick={() => void recheckBackend()}
              className="px-4 py-2.5 rounded-xl bg-[#0D6E52] dark:bg-[#18A87E] text-white dark:text-[#0F1419] text-sm font-semibold min-h-[44px]"
            >
              إعادة فحص الاتصال بالخادم
            </button>
          )}
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-2xl bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] p-10 text-center space-y-4">
          <Trophy className="w-8 h-8 mx-auto text-[#B47B1B] dark:text-[#E5A93C]" />
          <div className="space-y-1">
            <h2 className="font-bold font-poetry text-xl">لا توجد نقاط مسجلة في هذه الفترة بعد</h2>
            <p className="text-sm text-[#5E615E] dark:text-[#A0A8B0]">
              سجّل حساباً وأكمل أول جولة تحدٍّ ليظهر اسمك في صدارة القائمة.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('modes')}
            className="px-5 py-2.5 rounded-xl bg-[#0D6E52] dark:bg-[#18A87E] text-white dark:text-[#0F1419] text-sm font-semibold min-h-[44px]"
          >
            ابدأ التحدي الآن
          </button>
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] divide-y divide-[#DFD9CE] dark:divide-[#2A3542]">
          {entries.map((entry) => {
            const isSelf = user?.profile.userId === entry.userId;
            return (
              <div
                key={entry.userId}
                className={`px-5 py-4 flex items-center justify-between gap-4 ${
                  isSelf ? 'bg-emerald-50/60 dark:bg-emerald-950/20' : ''
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-8 text-center font-mono-tabular font-bold text-base shrink-0">
                    #{entry.rank}
                  </div>
                  <img
                    src={getAvatarImageUrl(entry.avatarId)}
                    alt={entry.displayName}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-xl object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">
                      {entry.displayName} {isSelf ? '(أنت)' : ''}
                    </div>
                    <div className="text-xs text-[#5E615E] dark:text-[#A0A8B0]">
                      المستوى <span className="font-mono-tabular">{entry.level}</span> · دقة{' '}
                      <span className="font-mono-tabular">{entry.accuracy}%</span> · سلسلة{' '}
                      <span className="font-mono-tabular">{entry.currentStreak}</span>
                    </div>
                  </div>
                </div>

                <div className="text-left shrink-0">
                  <div className="font-mono-tabular font-bold text-base text-[#0D6E52] dark:text-[#18A87E]">
                    {entry.xp} XP
                  </div>
                  <div className="text-xs text-[#5E615E] dark:text-[#A0A8B0] font-mono-tabular">
                    {entry.gamesPlayed} جولات
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
