import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Flame,
  History,
  Layers,
  Sparkles,
  Trophy,
} from 'lucide-react';
import {
  GAME_MODES_META,
  getLevelBounds,
  getLevelProgressPercent,
  getRankTitleAr,
  type ChallengeHistoryItem,
  type GameMode,
} from '../../packages/shared/src/index.ts';
import { useApp } from '../context/AppContext.tsx';
import { apiClient } from '../services/apiClient.ts';
import { formatDurationAr } from '../utils/feedback.ts';
import heroManuscriptImage from '../assets/images/hero_manuscript_desk_1795291813917.jpg';

interface HomeScreenProps {
  onOpenAuthModal: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenAuthModal }) => {
  const {
    user,
    guest,
    activeStats,
    activeDisplayName,
    dailyCompleted,
    navigate,
    startChallenge,
    isOnline,
    backendAvailable,
  } = useApp();

  const [recentHistory, setRecentHistory] = useState<ChallengeHistoryItem[]>([]);
  const [startingMode, setStartingMode] = useState<GameMode | null>(null);

  useEffect(() => {
    let active = true;
    if (user && isOnline && backendAvailable) {
      apiClient
        .getHistory()
        .then((items) => {
          if (active) setRecentHistory(items.slice(0, 4));
        })
        .catch(() => {
          if (active) setRecentHistory([]);
        });
    } else {
      setRecentHistory(guest.history.slice(0, 4));
    }
    return () => {
      active = false;
    };
  }, [backendAvailable, guest.history, isOnline, user]);

  const levelProgress = getLevelProgressPercent(activeStats.totalXp);
  const { nextLevelXp } = getLevelBounds(activeStats.level);
  const rankTitle = getRankTitleAr(activeStats.level);
  const accuracy =
    activeStats.totalQuestions > 0
      ? Math.round((activeStats.correctAnswers / activeStats.totalQuestions) * 100)
      : 0;

  async function handleQuickStart(mode: GameMode) {
    setStartingMode(mode);
    try {
      await startChallenge(mode);
    } finally {
      setStartingMode(null);
    }
  }

  const quickModes: Array<{
    mode: GameMode;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { mode: 'who_said', icon: Sparkles },
    { mode: 'complete_verse', icon: BookOpen },
    { mode: 'era_challenge', icon: Layers },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-10">
      {/* Hero Split Banner */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between rounded-2xl bg-white dark:bg-[#172D50] border border-[#E8DEC8] dark:border-[#2B4164] p-6 sm:p-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#626777] dark:text-[#C5CDDB]">
              <span>أهلاً بك، {activeDisplayName}</span>
              <span aria-hidden="true">·</span>
              <span>{rankTitle}</span>
              {!user && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>وضع الزائر (محفوظ محلياً)</span>
                </>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold font-poetry leading-tight text-balance">
              ميدان الأصالة والشعر العربي الموثّق
            </h1>

            <p className="text-sm sm:text-base text-[#626777] dark:text-[#C5CDDB] leading-relaxed max-w-2xl">
              اختبر ذاكرتك الشعرية مع روائع القصائد من العصر الجاهلي إلى الحديث، وأتمّ القوافي، وتعرّف إلى أعلام الشعراء وبحور الخليل.
            </p>
          </div>

          <div className="mt-8 space-y-5">
            {/* Level & XP Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-semibold">
                  المستوى <span className="font-mono-tabular">{activeStats.level}</span>
                </span>
                <span className="font-mono-tabular text-[#626777] dark:text-[#C5CDDB]">
                  {activeStats.totalXp} / {nextLevelXp} نقطة خبرة
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#EEE6D4] dark:bg-[#102448] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#14284B] dark:bg-[#E0B84F] transition-all duration-300"
                  style={{ width: `${levelProgress}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={startingMode !== null}
                onClick={() => handleQuickStart(dailyCompleted ? 'who_said' : 'daily_challenge')}
                className="px-5 py-3 rounded-xl bg-[#14284B] hover:bg-[#0D1D39] dark:bg-[#E0B84F] dark:hover:bg-[#C69B2F] text-white dark:text-[#102448] font-semibold text-sm transition-colors flex items-center gap-2 min-h-[46px]"
              >
                <span>{dailyCompleted ? 'ابدأ تحدياً سريعاً' : 'خض التحدي اليومي'}</span>
                <ArrowLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => navigate('library')}
                className="px-5 py-3 rounded-xl bg-[#EEE6D4] hover:bg-[#E5E0D5] dark:bg-[#1E2732] dark:hover:bg-[#273240] text-[#17233A] dark:text-[#F7F3E8] font-medium text-sm transition-colors min-h-[46px]"
              >
                تصفح مكتبة الشعر
              </button>

              {!user && (
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="px-4 py-3 text-sm font-medium text-[#14284B] dark:text-[#E0B84F] hover:underline min-h-[46px]"
                >
                  حفظ التقدم بحساب
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-2xl overflow-hidden border border-[#E8DEC8] dark:border-[#2B4164] bg-[#EEE6D4] dark:bg-[#172D50] relative min-h-[240px]">
          <img
            src={heroManuscriptImage}
            alt="مخطوطة شعرية عربية وقلم قصب"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover" loading="eager" fetchPriority="high" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-6 text-white">
            <p className="font-poetry text-xl sm:text-2xl leading-relaxed">
              «أَنا الَّذي نَظَرَ الأَعمى إِلى أَدَبي · وَأَسمَعَت كَلِماتي مَن بِهِ صَمَمُ»
            </p>
            <p className="text-xs text-white/80 mt-2">أبو الطيب المتنبي · العصر العباسي</p>
          </div>
        </div>
      </section>

      {/* 4-Column Stat Strip below Hero */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white dark:bg-[#172D50] border border-[#E8DEC8] dark:border-[#2B4164] p-5">
          <div className="flex items-center justify-between text-xs text-[#626777] dark:text-[#C5CDDB] mb-2">
            <span>السلسلة اليومية</span>
            <Flame className="w-4 h-4 text-[#B47B1B] dark:text-[#E5A93C]" />
          </div>
          <div className="text-2xl font-bold font-mono-tabular">{activeStats.currentStreak} أيام</div>
          <p className="text-xs text-[#626777] dark:text-[#C5CDDB] mt-1">
            أطول سلسلة: <span className="font-mono-tabular">{activeStats.longestStreak}</span>
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#172D50] border border-[#E8DEC8] dark:border-[#2B4164] p-5">
          <div className="flex items-center justify-between text-xs text-[#626777] dark:text-[#C5CDDB] mb-2">
            <span>التحدي اليومي</span>
            <Calendar className="w-4 h-4 text-[#14284B] dark:text-[#E0B84F]" />
          </div>
          <div className="text-xl font-bold">{dailyCompleted ? 'مكتمل اليوم' : 'متاح الآن'}</div>
          <p className="text-xs text-[#626777] dark:text-[#C5CDDB] mt-1">مكافأة مضاعفة ١.٥×</p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#172D50] border border-[#E8DEC8] dark:border-[#2B4164] p-5">
          <div className="flex items-center justify-between text-xs text-[#626777] dark:text-[#C5CDDB] mb-2">
            <span>نسبة الدقة</span>
            <Trophy className="w-4 h-4 text-[#B47B1B] dark:text-[#E5A93C]" />
          </div>
          <div className="text-2xl font-bold font-mono-tabular">{accuracy}%</div>
          <p className="text-xs text-[#626777] dark:text-[#C5CDDB] mt-1">
            <span className="font-mono-tabular">{activeStats.correctAnswers}</span> إجابة صحيحة
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#172D50] border border-[#E8DEC8] dark:border-[#2B4164] p-5">
          <div className="flex items-center justify-between text-xs text-[#626777] dark:text-[#C5CDDB] mb-2">
            <span>الجولات المكتملة</span>
            <History className="w-4 h-4 text-[#14284B] dark:text-[#E0B84F]" />
          </div>
          <div className="text-2xl font-bold font-mono-tabular">{activeStats.gamesPlayed}</div>
          <p className="text-xs text-[#626777] dark:text-[#C5CDDB] mt-1">
            نقاط الخبرة: <span className="font-mono-tabular">{activeStats.totalXp}</span>
          </p>
        </div>
      </section>

      {/* Quick Game Modes + Daily Challenge */}
      <section className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl sm:text-2xl font-bold font-poetry">أوضاع التحدي السريعة</h2>
          <button
            type="button"
            onClick={() => navigate('modes')}
            className="text-sm font-medium text-[#14284B] dark:text-[#E0B84F] hover:underline whitespace-nowrap"
          >
            جميع الأوضاع
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickModes.map(({ mode, icon: Icon }) => {
            const meta = GAME_MODES_META[mode];
            return (
              <button
                key={mode}
                type="button"
                disabled={startingMode !== null}
                onClick={() => handleQuickStart(mode)}
                className="text-right rounded-2xl bg-white dark:bg-[#172D50] border border-[#E8DEC8] dark:border-[#2B4164] hover:border-[#14284B] dark:hover:border-[#E0B84F] p-6 transition-colors flex flex-col justify-between gap-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <Icon className="w-5 h-5 text-[#14284B] dark:text-[#E0B84F]" />
                    <span className="text-xs text-[#626777] dark:text-[#C5CDDB]">
                      {meta.questionCount} أسئلة · {meta.xpMultiplierLabel}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold font-poetry">{meta.titleAr}</h3>
                  <p className="text-sm text-[#626777] dark:text-[#C5CDDB] leading-relaxed">
                    {meta.descriptionAr}
                  </p>
                </div>
                <div className="text-sm font-semibold text-[#14284B] dark:text-[#E0B84F] flex items-center gap-1.5">
                  <span>{startingMode === mode ? 'جارٍ التحضير...' : 'ابدأ الجولة'}</span>
                  <ArrowLeft className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-bold font-poetry">النشاط الأخير</h2>
          <button
            type="button"
            onClick={() => navigate('profile')}
            className="text-sm font-medium text-[#14284B] dark:text-[#E0B84F] hover:underline"
          >
            السجل الكامل
          </button>
        </div>

        {recentHistory.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-[#172D50] border border-[#E8DEC8] dark:border-[#2B4164] p-8 text-center space-y-3">
            <p className="text-sm text-[#626777] dark:text-[#C5CDDB]">
              لم تخض أي جولة تحدٍّ بعد. ابدأ أول جولة الآن لتوثيق تقدمك الشعري!
            </p>
            <button
              type="button"
              onClick={() => handleQuickStart('who_said')}
              className="px-4 py-2.5 rounded-xl bg-[#14284B] dark:bg-[#E0B84F] text-white dark:text-[#102448] text-sm font-semibold min-h-[44px]"
            >
              ابدأ تحدي من قائل البيت؟
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-[#172D50] border border-[#E8DEC8] dark:border-[#2B4164] divide-y divide-[#E8DEC8] dark:divide-[#2B4164]">
            {recentHistory.map((item) => (
              <div
                key={item.sessionId}
                className="px-5 py-4 flex flex-wrap items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-sm">{GAME_MODES_META[item.mode].titleAr}</div>
                  <div className="text-xs text-[#626777] dark:text-[#C5CDDB]">
                    <span className="font-mono-tabular">
                      {item.correctCount}/{item.totalQuestions}
                    </span>{' '}
                    صحيحة · دقة <span className="font-mono-tabular">{item.accuracy}%</span> · المدة{' '}
                    <span className="font-mono-tabular">{formatDurationAr(item.durationSeconds)}</span>
                  </div>
                </div>
                <div className="text-sm font-bold font-mono-tabular text-[#14284B] dark:text-[#E0B84F]">
                  +{item.xpEarned} XP
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
