import React, { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, Calendar, Layers, Sparkles } from 'lucide-react';
import {
  GAME_MODES_META,
  type Era,
  type GameMode,
} from '../../packages/shared/src/index.ts';
import { useApp } from '../context/AppContext.tsx';
import { apiClient } from '../services/apiClient.ts';

export const ModesScreen: React.FC = () => {
  const { startChallenge, dailyCompleted, offlinePack, isOnline, backendAvailable } = useApp();
  const [eras, setEras] = useState<Era[]>([]);
  const [selectedEraId, setSelectedEraId] = useState<number | undefined>(undefined);
  const [startingMode, setStartingMode] = useState<GameMode | null>(null);

  useEffect(() => {
    if (isOnline && backendAvailable) {
      apiClient
        .getTaxonomy()
        .then((tax) => setEras(tax.eras))
        .catch(() => {
          if (offlinePack) setEras(offlinePack.eras);
        });
    } else if (offlinePack) {
      setEras(offlinePack.eras);
    }
  }, [backendAvailable, isOnline, offlinePack]);

  async function handleStart(mode: GameMode) {
    setStartingMode(mode);
    try {
      await startChallenge(mode, mode === 'era_challenge' || mode === 'who_said' ? selectedEraId : undefined);
    } finally {
      setStartingMode(null);
    }
  }

  const cards: Array<{
    mode: GameMode;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { mode: 'who_said', icon: Sparkles },
    { mode: 'complete_verse', icon: BookOpen },
    { mode: 'era_challenge', icon: Layers },
    { mode: 'daily_challenge', icon: Calendar },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold font-poetry">أوضاع اللعب والتحديات</h1>
        <p className="text-sm text-[#697586] dark:text-[#C0CAD6]">
          اختر نوع التحدي المناسب، أو خصّص جولتك بعصر أدبي محدد من عصور الشعر العربي.
        </p>
      </div>

      {/* Interactive Era Filter Bar */}
      {eras.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-xs font-medium text-[#697586] dark:text-[#C0CAD6]">
            تخصيص العصر (اختياري لأوضاع القائل والعصور):
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedEraId(undefined)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors min-h-[40px] ${
                selectedEraId === undefined
                  ? 'bg-[#14243B] dark:bg-[#C6A15B] text-white dark:text-[#14243B]'
                  : 'bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] text-[#697586] dark:text-[#C0CAD6]'
              }`}
            >
              جميع العصور
            </button>
            {eras.map((era) => (
              <button
                key={era.id}
                type="button"
                onClick={() => setSelectedEraId(era.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors min-h-[40px] ${
                  selectedEraId === era.id
                    ? 'bg-[#14243B] dark:bg-[#C6A15B] text-white dark:text-[#14243B]'
                    : 'bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] text-[#697586] dark:text-[#C0CAD6]'
                }`}
              >
                {era.nameAr}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {cards.map(({ mode, icon: Icon }) => {
          const meta = GAME_MODES_META[mode];
          const isDailyDone = mode === 'daily_challenge' && dailyCompleted;

          return (
            <div
              key={mode}
              className="rounded-2xl bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] p-6 flex flex-col justify-between gap-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#697586] dark:text-[#C0CAD6]">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-[#14243B] dark:text-[#C6A15B]" />
                    <span>{meta.subtitleAr}</span>
                  </div>
                  <span>
                    {meta.questionCount} أسئلة · {meta.timeLimitSeconds} ث للسؤال
                  </span>
                </div>

                <h2 className="text-2xl font-bold font-poetry">{meta.titleAr}</h2>
                <p className="text-sm text-[#697586] dark:text-[#C0CAD6] leading-relaxed">
                  {meta.descriptionAr}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#E2D8C5] dark:border-[#35465E]">
                <span className="text-xs font-semibold text-[#9C7940] dark:text-[#C6A15B]">
                  {meta.xpMultiplierLabel}
                </span>
                <button
                  type="button"
                  disabled={startingMode !== null || isDailyDone}
                  onClick={() => handleStart(mode)}
                  className="px-5 py-2.5 rounded-xl bg-[#14243B] hover:bg-[#0C192B] dark:bg-[#C6A15B] dark:hover:bg-[#A98543] text-white dark:text-[#14243B] text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
                >
                  <span>
                    {isDailyDone
                      ? 'أُنجز اليوم'
                      : startingMode === mode
                        ? 'جارٍ البدء...'
                        : 'ابدأ التحدي'}
                  </span>
                  {!isDailyDone && <ArrowLeft className="w-4 h-4" />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
