import { Router } from 'express';
import type { LeaderboardEntry, LeaderboardPeriod } from '../../../packages/shared/src/index.ts';
import { getDb } from '../db/database.ts';
import { optionalAuth, type AuthenticatedRequest } from '../middleware/auth.ts';
import { asyncHandler } from '../middleware/errorHandler.ts';

const router = Router();

router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const periodParam = String(req.query.period || 'all_time');
    const period: LeaderboardPeriod =
      periodParam === 'daily' || periodParam === 'weekly' ? periodParam : 'all_time';
    const limit = Math.min(50, Math.max(5, Number(req.query.limit || 25)));
    const db = getDb();

    let entries: LeaderboardEntry[] = [];

    if (period === 'all_time') {
      const rows = await db.query<{
        user_id: string;
        username: string;
        display_name: string;
        avatar_id: string;
        level: number;
        total_xp: number;
        total_questions: number;
        correct_answers: number;
        games_played: number;
        current_streak: number;
      }>(
        `SELECT
           up.user_id, up.username, up.display_name, up.avatar_id,
           ps.level, ps.total_xp, ps.total_questions, ps.correct_answers,
           ps.games_played, ps.current_streak
         FROM player_stats ps
         JOIN user_profiles up ON ps.user_id = up.user_id
         JOIN player_settings pset ON ps.user_id = pset.user_id
         WHERE pset.show_on_leaderboard = $1 AND ps.total_xp > 0
         ORDER BY ps.total_xp DESC, ps.correct_answers DESC
         LIMIT $2`,
        [true, limit]
      );

      entries = rows.map((r, idx) => ({
        rank: idx + 1,
        userId: r.user_id,
        username: r.username,
        displayName: r.display_name,
        avatarId: r.avatar_id,
        level: Number(r.level),
        xp: Number(r.total_xp),
        accuracy:
          Number(r.total_questions) > 0
            ? Math.round((Number(r.correct_answers) / Number(r.total_questions)) * 100)
            : 0,
        gamesPlayed: Number(r.games_played),
        currentStreak: Number(r.current_streak),
      }));
    } else {
      const daysBack = period === 'daily' ? 1 : 7;
      const sinceIso = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

      const rows = await db.query<{
        user_id: string;
        username: string;
        display_name: string;
        avatar_id: string;
        level: number;
        current_streak: number;
        period_xp: number;
        period_questions: number;
        period_correct: number;
        period_games: number;
      }>(
        `SELECT
           up.user_id, up.username, up.display_name, up.avatar_id,
           ps.level, ps.current_streak,
           SUM(gs.xp_earned) AS period_xp,
           SUM(gs.total_questions) AS period_questions,
           SUM(gs.correct_count) AS period_correct,
           COUNT(gs.id) AS period_games
         FROM game_sessions gs
         JOIN user_profiles up ON gs.user_id = up.user_id
         JOIN player_stats ps ON gs.user_id = ps.user_id
         JOIN player_settings pset ON gs.user_id = pset.user_id
         WHERE gs.status = 'completed'
           AND gs.completed_at >= $1
           AND pset.show_on_leaderboard = $2
         GROUP BY up.user_id, up.username, up.display_name, up.avatar_id, ps.level, ps.current_streak
         ORDER BY period_xp DESC, period_correct DESC
         LIMIT $3`,
        [sinceIso, true, limit]
      );

      entries = rows.map((r, idx) => ({
        rank: idx + 1,
        userId: r.user_id,
        username: r.username,
        displayName: r.display_name,
        avatarId: r.avatar_id,
        level: Number(r.level),
        xp: Number(r.period_xp),
        accuracy:
          Number(r.period_questions) > 0
            ? Math.round((Number(r.period_correct) / Number(r.period_questions)) * 100)
            : 0,
        gamesPlayed: Number(r.period_games),
        currentStreak: Number(r.current_streak),
      }));
    }

    const currentUserEntry = req.authUser
      ? entries.find((e) => e.userId === req.authUser?.userId) ?? null
      : null;

    res.json({
      success: true,
      data: {
        period,
        entries,
        currentUserRank: currentUserEntry?.rank ?? null,
      },
    });
  })
);

export default router;
