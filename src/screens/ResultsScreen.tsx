import React from 'react';
import { Award, CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import {
  GAME_MODES_META,
  getLevelBounds,
  getLevelProgressPercent,
} from '../../packages/shared/src/index.ts';
import { useApp } from '../context/AppContext.tsx';
import { formatDurationAr } from '../utils/feedback.ts';

export const ResultsScreen: React.FC = () => {
  const { lastResult, navigate, startChallenge } = useApp();

  if (!lastResult) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-sm text-[#697586] dark:text-[#C0CAD6]">لا توجد نتيجة جولة حالية.</p>
        <button
          type="button"
          onClick={() => navigate('modes')}
          className="px-5 py-2.5 rounded-xl bg-[#14243B] dark:bg-[#C6A15B] text-white dark:text-[#14243B] text-sm font-semibold min-h-[44px]"
        >
          اختر تحدياً
        </button>
      </div>
    );
  }

  const levelProgress = getLevelProgressPercent(lastResult.newTotalXp);
  const { nextLevelXp } = getLevelBounds(lastResult.newLevel);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8">
      {/* Summary Header Card */}
      <section className="rounded-2xl bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-[#697586] dark:text-[#C0CAD6]">
              نتيجة الجولة · {GAME_MODES_META[lastResult.mode].titleAr}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-poetry">
              {lastResult.accuracy >= 80
                ? 'أداء أدبي رفيع!'
                : lastResult.accuracy >= 50
                  ? 'جولة موفقة، واصل القراءة'
                  : 'فرصة لاكتشاف أبيات جديدة'}
            </h1>
          </div>

          <div className="text-left">
            <div className="text-3xl font-bold font-mono-tabular text-[#14243B] dark:text-[#C6A15B]">
              +{lastResult.xpEarned} XP
            </div>
            <div className="text-xs text-[#697586] dark:text-[#C0CAD6]">
              المستوى <span className="font-mono-tabular">{lastResult.newLevel}</span>
              {lastResult.newLevel > lastResult.previousLevel && ' · ترقية جديدة!'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-[#F5F1E8] dark:bg-[#14243B]">
            <div className="text-xs text-[#697586] dark:text-[#C0CAD6]">الإجابات الصحيحة</div>
            <div className="text-xl font-bold font-mono-tabular mt-1 text-[#14243B] dark:text-[#C6A15B]">
              {lastResult.correctCount}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#F5F1E8] dark:bg-[#14243B]">
            <div className="text-xs text-[#697586] dark:text-[#C0CAD6]">الإجابات الخاطئة</div>
            <div className="text-xl font-bold font-mono-tabular mt-1 text-red-600 dark:text-red-400">
              {lastResult.incorrectCount}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[#F5F1E8] dark:bg-[#14243B]">
            <div className="text-xs text-[#697586] dark:text-[#C0CAD6]">نسبة الدقة</div>
            <div className="text-xl font-bold font-mono-tabular mt-1">{lastResult.accuracy}%</div>
          </div>
          <div className="p-4 rounded-xl bg-[#F5F1E8] dark:bg-[#14243B]">
            <div className="text-xs text-[#697586] dark:text-[#C0CAD6]">الزمن المستغرق</div>
            <div className="text-xl font-bold font-mono-tabular mt-1">
              {formatDurationAr(lastResult.durationSeconds)}
            </div>
          </div>
        </div>

        {/* Level Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-[#697586] dark:text-[#C0CAD6]">
            <span>تقدم المستوى {lastResult.newLevel}</span>
            <span className="font-mono-tabular">
              {lastResult.newTotalXp} / {nextLevelXp} XP
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-[#EAE2D2] dark:bg-[#14243B] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#14243B] dark:bg-[#C6A15B] transition-all duration-300"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
        </div>

        {lastResult.newlyUnlockedAchievements.length > 0 && (
          <div className="p-4 rounded-xl bg-[#EAE2D2] dark:bg-[#14243B] space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#9C7940] dark:text-[#C6A15B]">
              <Award className="w-4 h-4" />
              <span>أوسمة مفتوحة حديثاً</span>
            </div>
            <div className="space-y-1 text-xs">
              {lastResult.newlyUnlockedAchievements.map((ach) => (
                <div key={ach.code}>
                  <strong>{ach.titleAr}</strong> — {ach.descriptionAr} (+{ach.xpBonus} XP)
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => void startChallenge(lastResult.mode === 'daily_challenge' ? 'who_said' : lastResult.mode)}
            className="px-5 py-3 rounded-xl bg-[#14243B] hover:bg-[#0C192B] dark:bg-[#C6A15B] dark:hover:bg-[#A98543] text-white dark:text-[#14243B] font-semibold text-sm flex items-center gap-2 min-h-[46px]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>جولة جديدة</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('home')}
            className="px-5 py-3 rounded-xl bg-[#EAE2D2] hover:bg-[#E5E0D5] dark:bg-[#1E2732] dark:hover:bg-[#273240] text-sm font-medium min-h-[46px]"
          >
            العودة للرئيسية
          </button>
        </div>
      </section>

      {/* Answer Review */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold font-poetry">مراجعة الأبيات والإجابات</h2>
        <div className="space-y-3">
          {lastResult.reviews.map((rev, idx) => (
            <div
              key={`${rev.questionId}_${idx}`}
              className="rounded-2xl bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-4 text-xs text-[#697586] dark:text-[#C0CAD6]">
                <span>
                  سؤال {idx + 1} · {rev.poetNameAr} · {rev.eraNameAr}
                </span>
                <span
                  className={`flex items-center gap-1 font-semibold ${
                    rev.isCorrect ? 'text-[#14243B] dark:text-[#C6A15B]' : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {rev.isCorrect ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>صحيحة</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>خاطئة</span>
                    </>
                  )}
                </span>
              </div>

              <div className="font-poetry text-lg sm:text-xl leading-relaxed">
                {rev.fullVerseSadr} — {rev.fullVerseAjuz}
              </div>

              <div className="text-xs text-[#697586] dark:text-[#C0CAD6]">
                الإجابة الصحيحة: <strong className="text-[#17233A] dark:text-[#F5F1E8]">{rev.correctOptionLabel}</strong> · قصيدة: {rev.poemTitleAr}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
