import crypto from 'node:crypto';
import { Router } from 'express';
import {
  completeSessionSchema,
  startGameSchema,
  submitAnswerSchema,
  XP_CONFIG,
  type GameAnswerReview,
  type GameMode,
  type SessionResult,
} from '../../../packages/shared/src/index.ts';
import { getDb } from '../db/database.ts';
import { optionalAuth, type AuthenticatedRequest } from '../middleware/auth.ts';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';
import {
  applySessionProgressionTx,
  calculateSessionRewards,
  getCalendarDateInTimezone,
} from '../modules/progression/progressionService.ts';
import {
  generateQuestionsForMode,
  stripAnswerSecrets,
  type StoredQuestionWithAnswer,
} from '../modules/questions/questionEngine.ts';

const router = Router();

router.get(
  '/daily/status',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const tz = typeof req.query.timezone === 'string' && req.query.timezone ? req.query.timezone : 'UTC';
    const todayDate = getCalendarDateInTimezone(tz);

    let alreadyCompleted = false;
    let completedSession: {
      id: string;
      correct_count: number;
      total_questions: number;
      xp_earned: number;
    } | null = null;

    if (req.authUser) {
      completedSession = await db.queryOne<{
        id: string;
        correct_count: number;
        total_questions: number;
        xp_earned: number;
      }>(
        `SELECT id, correct_count, total_questions, xp_earned
         FROM game_sessions
         WHERE user_id = $1 AND mode = 'daily_challenge' AND challenge_date = $2 AND status = 'completed'`,
        [req.authUser.userId, todayDate]
      );
      alreadyCompleted = Boolean(completedSession);
    }

    res.json({
      success: true,
      data: {
        challengeDate: todayDate,
        alreadyCompleted,
        completedSession: completedSession
          ? {
              sessionId: completedSession.id,
              correctCount: Number(completedSession.correct_count),
              totalQuestions: Number(completedSession.total_questions),
              xpEarned: Number(completedSession.xp_earned),
            }
          : null,
      },
    });
  })
);

router.post(
  '/sessions',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = startGameSchema.parse(req.body);
    const db = getDb();
    const userId = req.authUser?.userId ?? null;
    const timezone = parsed.timezone || 'UTC';
    const todayDate = getCalendarDateInTimezone(timezone);

    if (parsed.mode === 'daily_challenge' && userId) {
      const completedToday = await db.queryOne<{ id: string }>(
        `SELECT id FROM game_sessions
         WHERE user_id = $1 AND mode = 'daily_challenge' AND challenge_date = $2 AND status = 'completed'`,
        [userId, todayDate]
      );
      if (completedToday) {
        throw new AppError(
          409,
          'DAILY_ALREADY_COMPLETED',
          'لقد أتممت التحدي اليومي لهذا اليوم بالفعل، عد غداً لتحدٍّ جديد.'
        );
      }
    }

    // Avoid repeating recently seen verses for authenticated users
    let excludeVerseIds: number[] = [];
    if (userId && parsed.mode !== 'daily_challenge') {
      const recent = await db.query<{ verse_id: number }>(
        `SELECT ga.verse_id
         FROM game_answers ga
         JOIN game_sessions gs ON ga.session_id = gs.id
         WHERE gs.user_id = $1
         ORDER BY ga.answered_at DESC
         LIMIT 25`,
        [userId]
      );
      excludeVerseIds = recent.map((r) => Number(r.verse_id));
    }

    const questions = await generateQuestionsForMode(db, {
      mode: parsed.mode,
      count: parsed.questionCount ?? 5,
      eraId: parsed.eraId,
      excludeVerseIds,
      seed: parsed.mode === 'daily_challenge' ? `daily_${todayDate}` : undefined,
    });

    if (parsed.mode === 'daily_challenge') {
      await db.execute(
        `INSERT INTO daily_challenges (challenge_date, seed_hash, question_ids_json)
         VALUES ($1, $2, $3)
         ON CONFLICT (challenge_date) DO NOTHING`,
        [
          todayDate,
          crypto.createHash('sha256').update(`daily_${todayDate}`).digest('hex'),
          JSON.stringify(questions.map((q) => q.verseId)),
        ]
      );
    }

    const sessionId = crypto.randomUUID();
    await db.execute(
      `INSERT INTO game_sessions (
         id, user_id, mode, challenge_date, status, total_questions, question_payload_json
       ) VALUES ($1, $2, $3, $4, 'in_progress', $5, $6)`,
      [
        sessionId,
        userId,
        parsed.mode,
        parsed.mode === 'daily_challenge' ? todayDate : null,
        questions.length,
        JSON.stringify(questions),
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        sessionId,
        mode: parsed.mode,
        challengeDate: parsed.mode === 'daily_challenge' ? todayDate : null,
        questions: questions.map(stripAnswerSecrets),
      },
    });
  })
);

router.post(
  '/sessions/:id/answer',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = submitAnswerSchema.parse(req.body);
    const sessionId = req.params.id;
    const db = getDb();

    const session = await db.queryOne<{
      id: string;
      user_id: string | null;
      status: string;
      question_payload_json: string | StoredQuestionWithAnswer[];
    }>('SELECT id, user_id, status, question_payload_json FROM game_sessions WHERE id = $1', [
      sessionId,
    ]);

    if (!session) {
      throw new AppError(404, 'SESSION_NOT_FOUND', 'جلسة التحدي غير موجودة');
    }
    if (session.user_id && session.user_id !== req.authUser?.userId) {
      throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية الوصول إلى هذه الجلسة');
    }
    if (session.status !== 'in_progress') {
      throw new AppError(409, 'SESSION_COMPLETED', 'تم إغلاق هذه الجلسة مسبقاً');
    }

    const questions: StoredQuestionWithAnswer[] =
      typeof session.question_payload_json === 'string'
        ? (JSON.parse(session.question_payload_json) as StoredQuestionWithAnswer[])
        : session.question_payload_json;

    const question = questions.find((q) => q.id === parsed.questionId);
    if (!question) {
      throw new AppError(404, 'QUESTION_NOT_FOUND', 'السؤال غير موجود ضمن هذه الجلسة');
    }

    // Prevent answering the same question multiple times
    const existingAnswer = await db.queryOne<{ id: number }>(
      'SELECT id FROM game_answers WHERE session_id = $1 AND question_id = $2',
      [sessionId, parsed.questionId]
    );
    if (existingAnswer) {
      throw new AppError(409, 'ALREADY_ANSWERED', 'تم تسجيل إجابتك على هذا السؤال مسبقاً');
    }

    const isCorrect = parsed.selectedOptionId === question.correctOptionId;
    const fastBonus =
      isCorrect && parsed.responseTimeMs > 0 && parsed.responseTimeMs <= XP_CONFIG.FAST_ANSWER_THRESHOLD_MS
        ? XP_CONFIG.FAST_ANSWER_BONUS_XP
        : 0;
    const pointsAwarded = isCorrect ? XP_CONFIG.BASE_CORRECT_XP + fastBonus : 0;

    await db.execute(
      `INSERT INTO game_answers (
         session_id, question_id, poem_id, verse_id, selected_option_id,
         correct_option_id, is_correct, response_time_ms, points_awarded
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        sessionId,
        question.id,
        question.poemId,
        question.verseId,
        parsed.selectedOptionId,
        question.correctOptionId,
        isCorrect,
        parsed.responseTimeMs,
        pointsAwarded,
      ]
    );

    res.json({
      success: true,
      data: {
        questionId: question.id,
        isCorrect,
        correctOptionId: question.correctOptionId,
        correctOptionLabel: question.correctOptionLabel,
        selectedOptionId: parsed.selectedOptionId,
        poetNameAr: question.poetNameAr,
        poemTitleAr: question.poemTitleAr,
        eraNameAr: question.eraNameAr,
        meterNameAr: question.meterNameAr,
        fullVerseSadr: question.fullVerseSadr,
        fullVerseAjuz: question.fullVerseAjuz,
        pointsAwarded,
      },
    });
  })
);

router.post(
  '/sessions/:id/complete',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = completeSessionSchema.parse(req.body);
    const sessionId = req.params.id;
    const db = getDb();

    const result: SessionResult = await db.transaction(async (tx) => {
      const session = await tx.queryOne<{
        id: string;
        user_id: string | null;
        mode: GameMode;
        challenge_date: string | null;
        status: string;
        total_questions: number;
        correct_count: number;
        xp_earned: number;
        streak_bonus_xp: number;
        speed_bonus_xp: number;
        duration_seconds: number;
        question_payload_json: string | StoredQuestionWithAnswer[];
      }>('SELECT * FROM game_sessions WHERE id = $1', [sessionId]);

      if (!session) {
        throw new AppError(404, 'SESSION_NOT_FOUND', 'جلسة التحدي غير موجودة');
      }
      if (session.user_id && session.user_id !== req.authUser?.userId) {
        throw new AppError(403, 'FORBIDDEN', 'لا تملك صلاحية إنهاء هذه الجلسة');
      }

      const questions: StoredQuestionWithAnswer[] =
        typeof session.question_payload_json === 'string'
          ? (JSON.parse(session.question_payload_json) as StoredQuestionWithAnswer[])
          : session.question_payload_json;

      const answerRows = await tx.query<{
        question_id: string;
        selected_option_id: string;
        correct_option_id: string;
        is_correct: number | boolean;
        response_time_ms: number;
        points_awarded: number;
      }>(
        'SELECT question_id, selected_option_id, correct_option_id, is_correct, response_time_ms, points_awarded FROM game_answers WHERE session_id = $1',
        [sessionId]
      );

      const reviews: GameAnswerReview[] = questions.map((q) => {
        const ans = answerRows.find((a) => a.question_id === q.id);
        return {
          questionId: q.id,
          promptAr: q.promptAr,
          isCorrect: Boolean(ans?.is_correct),
          correctOptionId: q.correctOptionId,
          correctOptionLabel: q.correctOptionLabel,
          selectedOptionId: ans?.selected_option_id ?? '',
          poetNameAr: q.poetNameAr,
          poemTitleAr: q.poemTitleAr,
          eraNameAr: q.eraNameAr,
          meterNameAr: q.meterNameAr,
          fullVerseSadr: q.fullVerseSadr,
          fullVerseAjuz: q.fullVerseAjuz,
          pointsAwarded: Number(ans?.points_awarded ?? 0),
          responseTimeMs: Number(ans?.response_time_ms ?? 0),
        };
      });

      // Idempotency guard if already completed
      if (session.status === 'completed') {
        const stats = session.user_id
          ? await tx.queryOne<{ total_xp: number; level: number; current_streak: number }>(
              'SELECT total_xp, level, current_streak FROM player_stats WHERE user_id = $1',
              [session.user_id]
            )
          : null;

        return {
          sessionId: session.id,
          mode: session.mode,
          correctCount: Number(session.correct_count),
          incorrectCount: Number(session.total_questions) - Number(session.correct_count),
          totalQuestions: Number(session.total_questions),
          accuracy:
            Number(session.total_questions) > 0
              ? Math.round((Number(session.correct_count) / Number(session.total_questions)) * 100)
              : 0,
          durationSeconds: Number(session.duration_seconds),
          xpEarned: Number(session.xp_earned),
          streakBonusXp: Number(session.streak_bonus_xp),
          speedBonusXp: Number(session.speed_bonus_xp),
          newTotalXp: Number(stats?.total_xp ?? session.xp_earned),
          previousLevel: Number(stats?.level ?? 1),
          newLevel: Number(stats?.level ?? 1),
          currentStreak: Number(stats?.current_streak ?? 1),
          newlyUnlockedAchievements: [],
          reviews,
        };
      }

      const timezone = parsed.timezone || 'UTC';
      const normalizedAnswers = answerRows.map((a) => ({
        isCorrect: Boolean(a.is_correct),
        responseTimeMs: Number(a.response_time_ms),
      }));

      if (session.user_id) {
        if (session.mode === 'daily_challenge' && session.challenge_date) {
          const duplicateDaily = await tx.queryOne<{ id: string }>(
            `SELECT id FROM game_sessions
             WHERE user_id = $1 AND mode = 'daily_challenge' AND challenge_date = $2 AND status = 'completed' AND id != $3`,
            [session.user_id, session.challenge_date, session.id]
          );
          if (duplicateDaily) {
            throw new AppError(409, 'DAILY_ALREADY_CLAIMED', 'تم احتساب مكافأة التحدي اليومي مسبقاً');
          }
        }

        const progression = await applySessionProgressionTx(tx, {
          userId: session.user_id,
          mode: session.mode,
          totalQuestions: Number(session.total_questions),
          answers: normalizedAnswers,
          timezone,
          completedAtDate: session.challenge_date ?? undefined,
        });

        await tx.execute(
          `UPDATE game_sessions
           SET status = 'completed',
               correct_count = $1,
               xp_earned = $2,
               streak_bonus_xp = $3,
               speed_bonus_xp = $4,
               duration_seconds = $5,
               completed_at = $6,
               operation_id = COALESCE(operation_id, $8)
           WHERE id = $7`,
          [
            progression.rewards.correctCount,
            progression.rewards.totalXpEarned,
            progression.rewards.streakBonusXp,
            progression.rewards.speedBonusXp,
            parsed.durationSeconds,
            new Date().toISOString(),
            session.id,
            session.id,
          ]
        );

        return {
          sessionId: session.id,
          mode: session.mode,
          correctCount: progression.rewards.correctCount,
          incorrectCount: Number(session.total_questions) - progression.rewards.correctCount,
          totalQuestions: Number(session.total_questions),
          accuracy:
            Number(session.total_questions) > 0
              ? Math.round((progression.rewards.correctCount / Number(session.total_questions)) * 100)
              : 0,
          durationSeconds: parsed.durationSeconds,
          xpEarned: progression.rewards.totalXpEarned,
          streakBonusXp: progression.rewards.streakBonusXp,
          speedBonusXp: progression.rewards.speedBonusXp,
          newTotalXp: progression.newTotalXp,
          previousLevel: progression.previousLevel,
          newLevel: progression.newLevel,
          currentStreak: progression.currentStreak,
          newlyUnlockedAchievements: progression.newlyUnlockedAchievements,
          reviews,
        };
      }

      // Guest session completed via API
      const rewards = calculateSessionRewards({
        mode: session.mode,
        totalQuestions: Number(session.total_questions),
        answers: normalizedAnswers,
        nextStreak: 1,
      });

      await tx.execute(
        `UPDATE game_sessions
         SET status = 'completed',
             correct_count = $1,
             xp_earned = $2,
             streak_bonus_xp = $3,
             speed_bonus_xp = $4,
             duration_seconds = $5,
             completed_at = $6
         WHERE id = $7`,
        [
          rewards.correctCount,
          rewards.totalXpEarned,
          rewards.streakBonusXp,
          rewards.speedBonusXp,
          parsed.durationSeconds,
          new Date().toISOString(),
          session.id,
        ]
      );

      return {
        sessionId: session.id,
        mode: session.mode,
        correctCount: rewards.correctCount,
        incorrectCount: Number(session.total_questions) - rewards.correctCount,
        totalQuestions: Number(session.total_questions),
        accuracy:
          Number(session.total_questions) > 0
            ? Math.round((rewards.correctCount / Number(session.total_questions)) * 100)
            : 0,
        durationSeconds: parsed.durationSeconds,
        xpEarned: rewards.totalXpEarned,
        streakBonusXp: rewards.streakBonusXp,
        speedBonusXp: rewards.speedBonusXp,
        newTotalXp: rewards.totalXpEarned,
        previousLevel: 1,
        newLevel: 1,
        currentStreak: 1,
        newlyUnlockedAchievements: [],
        reviews,
      };
    });

    res.json({ success: true, data: result });
  })
);

export default router;
