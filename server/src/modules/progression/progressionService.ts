import type { Achievement, GameMode } from '../../../../packages/shared/src/types.ts';
import {
  XP_CONFIG,
  calculateLevelFromXp,
} from '../../../../packages/shared/src/constants.ts';
import type { DbClient } from '../../db/database.ts';

export function getCalendarDateInTimezone(timezone = 'UTC', referenceDate = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const formatted = formatter.format(referenceDate);
    if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
      return formatted;
    }
  } catch {
    // Fallback to UTC
  }
  return referenceDate.toISOString().slice(0, 10);
}

export function getPreviousCalendarDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

/**
 * PostgreSQL DATE columns are returned as JavaScript Date objects by the
 * default node-postgres parser. SQLite returns strings, so normalize both
 * representations before doing calendar-day comparisons.
 */
export function normalizeLastPlayedDate(value: string | Date | null): string | null {
  if (value === null) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const normalized = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

export function computeNextStreak(
  lastPlayedDate: string | Date | null,
  currentStreak: number,
  longestStreak: number,
  todayDate: string
): { currentStreak: number; longestStreak: number } {
  const normalizedLast = normalizeLastPlayedDate(lastPlayedDate);
  if (!normalizedLast) {
    return {
      currentStreak: 1,
      longestStreak: Math.max(1, longestStreak),
    };
  }

  if (normalizedLast === todayDate) {
    const kept = Math.max(1, currentStreak);
    return {
      currentStreak: kept,
      longestStreak: Math.max(kept, longestStreak),
    };
  }

  const yesterdayDate = getPreviousCalendarDate(todayDate);
  if (normalizedLast === yesterdayDate) {
    const next = currentStreak + 1;
    return {
      currentStreak: next,
      longestStreak: Math.max(next, longestStreak),
    };
  }

  return {
    currentStreak: 1,
    longestStreak: Math.max(1, longestStreak),
  };
}

export function calculateSessionRewards(params: {
  mode: GameMode;
  totalQuestions: number;
  answers: Array<{ isCorrect: boolean; responseTimeMs: number }>;
  nextStreak: number;
}): {
  correctCount: number;
  baseXp: number;
  speedBonusXp: number;
  streakBonusXp: number;
  perfectRoundBonusXp: number;
  totalXpEarned: number;
} {
  const correctCount = params.answers.filter((a) => a.isCorrect).length;
  const baseXp = correctCount * XP_CONFIG.BASE_CORRECT_XP;

  const fastAnswers = params.answers.filter(
    (a) => a.isCorrect && a.responseTimeMs > 0 && a.responseTimeMs <= XP_CONFIG.FAST_ANSWER_THRESHOLD_MS
  ).length;
  const speedBonusXp = fastAnswers * XP_CONFIG.FAST_ANSWER_BONUS_XP;

  const perfectRoundBonusXp =
    correctCount === params.totalQuestions && params.totalQuestions > 0
      ? XP_CONFIG.PERFECT_ROUND_BONUS_XP
      : 0;

  const streakBonusXp =
    correctCount > 0
      ? Math.min(XP_CONFIG.MAX_STREAK_BONUS_XP, params.nextStreak * XP_CONFIG.STREAK_DAILY_BONUS_XP)
      : 0;

  const subtotal = baseXp + speedBonusXp + perfectRoundBonusXp;
  const modeWeighted =
    params.mode === 'daily_challenge'
      ? Math.round(subtotal * XP_CONFIG.DAILY_CHALLENGE_MULTIPLIER)
      : subtotal;

  return {
    correctCount,
    baseXp,
    speedBonusXp,
    streakBonusXp,
    perfectRoundBonusXp,
    totalXpEarned: modeWeighted + streakBonusXp,
  };
}

export async function applySessionProgressionTx(
  tx: DbClient,
  params: {
    userId: string;
    mode: GameMode;
    totalQuestions: number;
    answers: Array<{ isCorrect: boolean; responseTimeMs: number }>;
    timezone: string;
    completedAtDate?: string;
  }
): Promise<{
  rewards: ReturnType<typeof calculateSessionRewards>;
  previousLevel: number;
  newLevel: number;
  newTotalXp: number;
  currentStreak: number;
  newlyUnlockedAchievements: Achievement[];
}> {
  const statsRow = await tx.queryOne<{
    total_xp: number;
    level: number;
    current_streak: number;
    longest_streak: number;
    last_played_date: string | null;
    games_played: number;
    total_questions: number;
    correct_answers: number;
    daily_challenges_completed: number;
  }>('SELECT * FROM player_stats WHERE user_id = $1', [params.userId]);

  const currentStats = statsRow || {
    total_xp: 0,
    level: 1,
    current_streak: 0,
    longest_streak: 0,
    last_played_date: null,
    games_played: 0,
    total_questions: 0,
    correct_answers: 0,
    daily_challenges_completed: 0,
  };

  const todayDate = params.completedAtDate || getCalendarDateInTimezone(params.timezone);
  const { currentStreak, longestStreak } = computeNextStreak(
    currentStats.last_played_date,
    Number(currentStats.current_streak),
    Number(currentStats.longest_streak),
    todayDate
  );

  const rewards = calculateSessionRewards({
    mode: params.mode,
    totalQuestions: params.totalQuestions,
    answers: params.answers,
    nextStreak: currentStreak,
  });

  const previousLevel = Number(currentStats.level);
  const nextGamesPlayed = Number(currentStats.games_played) + 1;
  const nextTotalQuestions = Number(currentStats.total_questions) + params.totalQuestions;
  const nextCorrectAnswers = Number(currentStats.correct_answers) + rewards.correctCount;
  const nextDailyCount =
    Number(currentStats.daily_challenges_completed) + (params.mode === 'daily_challenge' ? 1 : 0);

  let runningXp = Number(currentStats.total_xp) + rewards.totalXpEarned;

  // Evaluate achievements
  const allAchievements = await tx.query<{
    id: number;
    code: string;
    title_ar: string;
    description_ar: string;
    category: string;
    xp_bonus: number;
  }>('SELECT id, code, title_ar, description_ar, category, xp_bonus FROM achievements');

  const ownedRows = await tx.query<{ achievement_id: number }>(
    'SELECT achievement_id FROM user_achievements WHERE user_id = $1',
    [params.userId]
  );
  const ownedSet = new Set(ownedRows.map((r) => Number(r.achievement_id)));

  const candidateCodes = new Set<string>();
  if (nextGamesPlayed >= 1) candidateCodes.add('first_round');
  if (rewards.correctCount === params.totalQuestions && params.totalQuestions > 0) {
    candidateCodes.add('perfect_round');
  }
  if (currentStreak >= 3) candidateCodes.add('streak_3');
  if (currentStreak >= 7) candidateCodes.add('streak_7');
  if (nextDailyCount >= 1) candidateCodes.add('daily_champion');
  if (nextCorrectAnswers >= 25) candidateCodes.add('verses_25');
  if (nextCorrectAnswers >= 100) candidateCodes.add('verses_100');
  if (calculateLevelFromXp(runningXp) >= 5) candidateCodes.add('level_5');

  const newlyUnlockedAchievements: Achievement[] = [];
  const nowIso = new Date().toISOString();

  for (const ach of allAchievements) {
    if (candidateCodes.has(ach.code) && !ownedSet.has(Number(ach.id))) {
      await tx.execute(
        `INSERT INTO user_achievements (user_id, achievement_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, achievement_id) DO NOTHING`,
        [params.userId, ach.id]
      );
      runningXp += Number(ach.xp_bonus);
      newlyUnlockedAchievements.push({
        id: Number(ach.id),
        code: ach.code,
        titleAr: ach.title_ar,
        descriptionAr: ach.description_ar,
        category: ach.category,
        xpBonus: Number(ach.xp_bonus),
        unlocked: true,
        unlockedAt: nowIso,
      });
    }
  }

  const newLevel = calculateLevelFromXp(runningXp);

  await tx.execute(
    `UPDATE player_stats
     SET total_xp = $1,
         level = $2,
         current_streak = $3,
         longest_streak = $4,
         last_played_date = $5,
         games_played = $6,
         total_questions = $7,
         correct_answers = $8,
         daily_challenges_completed = $9,
         updated_at = $10
     WHERE user_id = $11`,
    [
      runningXp,
      newLevel,
      currentStreak,
      longestStreak,
      todayDate,
      nextGamesPlayed,
      nextTotalQuestions,
      nextCorrectAnswers,
      nextDailyCount,
      nowIso,
      params.userId,
    ]
  );

  return {
    rewards,
    previousLevel,
    newLevel,
    newTotalXp: runningXp,
    currentStreak,
    newlyUnlockedAchievements,
  };
}
