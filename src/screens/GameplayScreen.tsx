import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock, X, XCircle } from 'lucide-react';
import { GAME_MODES_META } from '../../packages/shared/src/index.ts';
import { useApp } from '../context/AppContext.tsx';

export const GameplayScreen: React.FC = () => {
  const {
    activeGame,
    submitCurrentAnswer,
    advanceNextQuestion,
    abandonChallenge,
    showNotice,
  } = useApp();

  const [secondsLeft, setSecondsLeft] = useState(25);
  const [submitting, setSubmitting] = useState(false);

  const currentQ = activeGame?.questions[activeGame.currentIndex] ?? null;
  const feedback = activeGame?.currentFeedback ?? null;

  useEffect(() => {
    if (!currentQ) return;
    setSecondsLeft(currentQ.timeLimitSeconds);
  }, [currentQ]);

  useEffect(() => {
    if (!currentQ || feedback) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [currentQ, feedback]);

  if (!activeGame || !currentQ) {
    return null;
  }

  const total = activeGame.questions.length;
  const progressPercent = Math.round(((activeGame.currentIndex + (feedback ? 1 : 0)) / total) * 100);
  const isLast = activeGame.currentIndex >= total - 1;

  async function handleSelectOption(optionId: string) {
    if (submitting || feedback || activeGame?.selectedOptionId !== null) return;
    setSubmitting(true);
    try {
      await submitCurrentAnswer(optionId);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNext() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await advanceNextQuestion();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر إنهاء التحدي. حاول مرة أخرى.';
      showNotice('error', message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex flex-col max-w-3xl mx-auto px-3 sm:px-6 py-3 sm:py-5">
      {/* Top Arena HUD */}
      <div className="flex items-center justify-between gap-4 pb-4">
        <button
          type="button"
          onClick={abandonChallenge}
          aria-label="إنهاء الجولة"
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] hover:border-red-400"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#697586] dark:text-[#C0CAD6]">
            <span>{GAME_MODES_META[activeGame.mode].titleAr}</span>
            <span className="font-mono-tabular font-semibold">
              السؤال {activeGame.currentIndex + 1} / {total}
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#EAE2D2] dark:bg-[#1B2D47] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#14243B] dark:bg-[#C6A15B] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div
          className={`min-h-[44px] px-3 rounded-xl border flex items-center gap-1.5 font-mono-tabular text-sm font-semibold ${
            secondsLeft <= 5 && !feedback
              ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-700 dark:text-red-300'
              : 'bg-white dark:bg-[#1B2D47] border-[#E2D8C5] dark:border-[#35465E]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{secondsLeft}s</span>
        </div>
      </div>

      {/* Question Card */}
      <div className="flex-1 flex flex-col justify-start space-y-3 py-2">
        <div className="rounded-2xl bg-white dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] p-4 sm:p-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#697586] dark:text-[#C0CAD6]">
            <span>{currentQ.promptAr}</span>
            {currentQ.meterNameAr && <span>{currentQ.meterNameAr}</span>}
          </div>

          <div className="py-1 px-1 text-center space-y-1">
            <p className="font-poetry text-xl sm:text-2xl leading-relaxed font-bold text-[#17233A] dark:text-[#F5F1E8]">
              {currentQ.verseSadr}
            </p>
            {currentQ.verseAjuz ? (
              <p className="font-poetry text-2xl sm:text-3xl leading-loose font-bold text-[#17233A] dark:text-[#F5F1E8]">
                {currentQ.verseAjuz}
              </p>
            ) : (
              <p className="font-poetry text-xl text-[#697586] dark:text-[#C0CAD6]">
                · · · · · · · · ·
              </p>
            )}
          </div>
        </div>

        {/* Multiple-Choice Options */}
        <div className="grid grid-cols-1 gap-2">
          {currentQ.options.map((opt, idx) => {
            const isSelected = activeGame.selectedOptionId === opt.id;
            const isCorrectOption = feedback?.correctOptionId === opt.id;

            let styleClass =
              'bg-white dark:bg-[#1B2D47] border-[#E2D8C5] dark:border-[#35465E] hover:border-[#14243B] dark:hover:border-[#C6A15B]';

            if (feedback) {
              if (isCorrectOption) {
                styleClass =
                  'bg-emerald-50 dark:bg-emerald-950/50 border-[#14243B] dark:border-[#C6A15B] text-emerald-950 dark:text-emerald-100';
              } else if (isSelected && !feedback.isCorrect) {
                styleClass =
                  'bg-red-50 dark:bg-red-950/50 border-red-500 text-red-950 dark:text-red-100';
              } else {
                styleClass =
                  'bg-white/60 dark:bg-[#1B2D47]/60 border-[#E2D8C5] dark:border-[#35465E] opacity-65';
              }
            }

            return (
              <button
                key={opt.id}
                type="button"
                disabled={Boolean(feedback) || submitting}
                onClick={() => handleSelectOption(opt.id)}
                className={`w-full text-right px-4 py-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 min-h-[48px] ${styleClass}`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="w-7 h-7 rounded-lg bg-[#EAE2D2] dark:bg-[#14243B] flex items-center justify-center text-xs font-mono-tabular font-semibold shrink-0">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div
                      className={`font-semibold ${
                        activeGame.mode === 'complete_verse' ? 'font-poetry text-lg' : 'text-sm sm:text-base'
                      }`}
                    >
                      {opt.label}
                    </div>
                    {opt.secondaryLabel && (
                      <div className="text-xs text-[#697586] dark:text-[#C0CAD6] mt-0.5">
                        {opt.secondaryLabel}
                      </div>
                    )}
                  </div>
                </div>

                {feedback && isCorrectOption && (
                  <CheckCircle2 className="w-5 h-5 text-[#14243B] dark:text-[#C6A15B] shrink-0" />
                )}
                {feedback && isSelected && !feedback.isCorrect && (
                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Immediate Feedback & Next Button */}
        {feedback && (
          <div className="rounded-2xl bg-[#EAE2D2] dark:bg-[#1B2D47] border border-[#E2D8C5] dark:border-[#35465E] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-semibold text-sm">
                {feedback.isCorrect ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-[#14243B] dark:text-[#C6A15B]" />
                    <span>إجابة صحيحة!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <span>إجابة غير صحيحة — الصواب: {feedback.correctOptionLabel}</span>
                  </>
                )}
              </div>
              {feedback.pointsAwarded > 0 && (
                <span className="font-mono-tabular text-sm font-bold text-[#14243B] dark:text-[#C6A15B]">
                  +{feedback.pointsAwarded} XP
                </span>
              )}
            </div>

            <div className="text-xs text-[#697586] dark:text-[#C0CAD6] space-y-1">
              <div>
                القائل: <strong className="text-[#17233A] dark:text-[#F5F1E8]">{feedback.poetNameAr}</strong> ·{' '}
                {feedback.eraNameAr}
                {feedback.meterNameAr ? ` · ${feedback.meterNameAr}` : ''}
              </div>
              <div>من قصيدة: {feedback.poemTitleAr}</div>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleNext}
              className="w-full py-3.5 px-5 rounded-xl bg-[#14243B] hover:bg-[#0C192B] dark:bg-[#C6A15B] dark:hover:bg-[#A98543] text-white dark:text-[#14243B] font-semibold text-sm transition-colors flex items-center justify-center gap-2 min-h-[48px]"
            >
              <span>{isLast ? 'عرض النتيجة النهائية' : 'السؤال التالي'}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
