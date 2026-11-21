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
        <p className="text-sm text-[#5E615E] dark:text-[#A0A8B0]">
          اختر نوع التحدي المناسب، أو خصّص جولتك بعصر أدبي محدد من عصور الشعر العربي.
        </p>
      </div>

      {/* Interactive Era Filter Bar */}
      {eras.length > 0 && (
        <div className="space-y-2.5">
          <div className="text-xs font-medium text-[#5E615E] dark:text-[#A0A8B0]">
            تخصيص العصر (اختياري لأوضاع القائل والعصور):
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedEraId(undefined)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-colors min-h-[40px] ${
                selectedEraId === undefined
                  ? 'bg-[#0D6E52] dark:bg-[#18A87E] text-white dark:text-[#0F1419]'
                  : 'bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] text-[#5E615E] dark:text-[#A0A8B0]'
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
                    ? 'bg-[#0D6E52] dark:bg-[#18A87E] text-white dark:text-[#0F1419]'
                    : 'bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] text-[#5E615E] dark:text-[#A0A8B0]'
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
              className="rounded-2xl bg-white dark:bg-[#171E26] border border-[#DFD9CE] dark:border-[#2A3542] p-6 flex flex-col justify-between gap-6"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-[#5E615E] dark:text-[#A0A8B0]">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-[#0D6E52] dark:text-[#18A87E]" />
                    <span>{meta.subtitleAr}</span>
                  </div>
                  <span>
                    {meta.questionCount} أسئلة · {meta.timeLimitSeconds} ث للسؤال
                  </span>
                </div>

                <h2 className="text-2xl font-bold font-poetry">{meta.titleAr}</h2>
                <p className="text-sm text-[#5E615E] dark:text-[#A0A8B0] leading-relaxed">
                  {meta.descriptionAr}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#DFD9CE] dark:border-[#2A3542]">
                <span className="text-xs font-semibold text-[#B47B1B] dark:text-[#E5A93C]">
                  {meta.xpMultiplierLabel}
                </span>
                <button
                  type="button"
                  disabled={startingMode !== null || isDailyDone}
                  onClick={() => handleStart(mode)}
                  className="px-5 py-2.5 rounded-xl bg-[#0D6E52] hover:bg-[#0A5740] dark:bg-[#18A87E] dark:hover:bg-[#14906B] text-white dark:text-[#0F1419] text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
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
