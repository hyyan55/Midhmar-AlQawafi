import { Router } from 'express';
import {
  updateProfileSchema,
  updateSettingsSchema,
} from '../../../packages/shared/src/index.ts';
import { getDb } from '../db/database.ts';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.ts';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';
import { loadAuthUserBundle } from './authRoutes.ts';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const bundle = await loadAuthUserBundle(db, req.authUser!.userId);
    if (!bundle) {
      throw new AppError(404, 'USER_NOT_FOUND', 'الحساب غير موجود');
    }
    res.json({ success: true, data: bundle });
  })
);

router.patch(
  '/',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = updateProfileSchema.parse(req.body);
    const db = getDb();
    const userId = req.authUser!.userId;

    if (parsed.username) {
      const existing = await db.queryOne<{ user_id: string }>(
        'SELECT user_id FROM user_profiles WHERE LOWER(username) = LOWER($1) AND user_id != $2',
        [parsed.username, userId]
      );
      if (existing) {
        throw new AppError(409, 'USERNAME_EXISTS', 'اسم المستخدم مستخدم بالفعل');
      }
    }

    const current = await db.queryOne<{
      display_name: string;
      username: string;
      avatar_id: string;
      avatar_url: string | null;
      bio: string;
      timezone: string;
    }>('SELECT display_name, username, avatar_id, avatar_url, bio, timezone FROM user_profiles WHERE user_id = $1', [
      userId,
    ]);
    if (!current) {
      throw new AppError(404, 'USER_NOT_FOUND', 'الحساب غير موجود');
    }

    await db.execute(
      `UPDATE user_profiles
       SET display_name = $1, username = $2, avatar_id = $3, avatar_url = $4, bio = $5, timezone = $6, updated_at = $7
       WHERE user_id = $8`,
      [
        parsed.displayName ?? current.display_name,
        parsed.username ?? current.username,
        parsed.avatarId ?? current.avatar_id,
        parsed.avatarUrl === undefined ? current.avatar_url : parsed.avatarUrl,
        parsed.bio ?? current.bio,
        parsed.timezone ?? current.timezone,
        new Date().toISOString(),
        userId,
      ]
    );

    const updated = await loadAuthUserBundle(db, userId);
    res.json({ success: true, data: updated });
  })
);

router.patch(
  '/settings',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = updateSettingsSchema.parse(req.body);
    const db = getDb();
    const userId = req.authUser!.userId;

    const current = await db.queryOne<{
      theme: 'light' | 'dark';
      sound_enabled: number | boolean;
      vibration_enabled: number | boolean;
      show_on_leaderboard: number | boolean;
      share_activity_publicly: number | boolean;
    }>('SELECT * FROM player_settings WHERE user_id = $1', [userId]);

    if (!current) {
      throw new AppError(404, 'SETTINGS_NOT_FOUND', 'تعذر العثور على الإعدادات');
    }

    await db.execute(
      `UPDATE player_settings
       SET theme = $1,
           sound_enabled = $2,
           vibration_enabled = $3,
           show_on_leaderboard = $4,
           share_activity_publicly = $5,
           updated_at = $6
       WHERE user_id = $7`,
      [
        parsed.theme ?? current.theme,
        parsed.soundEnabled ?? Boolean(current.sound_enabled),
        parsed.vibrationEnabled ?? Boolean(current.vibration_enabled),
        parsed.showOnLeaderboard ?? Boolean(current.show_on_leaderboard),
        parsed.shareActivityPublicly ?? Boolean(current.share_activity_publicly),
        new Date().toISOString(),
        userId,
      ]
    );

    const updated = await loadAuthUserBundle(db, userId);
    res.json({ success: true, data: updated?.settings });
  })
);

router.get(
  '/achievements',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const userId = req.authUser!.userId;

    const rows = await db.query<{
      id: number;
      code: string;
      title_ar: string;
      description_ar: string;
      category: string;
      xp_bonus: number;
      unlocked_at: string | null;
    }>(
      `SELECT a.id, a.code, a.title_ar, a.description_ar, a.category, a.xp_bonus, ua.unlocked_at
       FROM achievements a
       LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1
       ORDER BY a.id ASC`,
      [userId]
    );

    res.json({
      success: true,
      data: rows.map((r) => ({
        id: Number(r.id),
        code: r.code,
        titleAr: r.title_ar,
        descriptionAr: r.description_ar,
        category: r.category,
        xpBonus: Number(r.xp_bonus),
        unlocked: Boolean(r.unlocked_at),
        unlockedAt: r.unlocked_at ? String(r.unlocked_at) : null,
      })),
    });
  })
);

router.get(
  '/history',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const userId = req.authUser!.userId;
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));

    const rows = await db.query<{
      id: string;
      mode: string;
      total_questions: number;
      correct_count: number;
      xp_earned: number;
      duration_seconds: number;
      completed_at: string;
      operation_id: string | null;
    }>(
      `SELECT id, mode, total_questions, correct_count, xp_earned, duration_seconds, completed_at, operation_id
       FROM game_sessions
       WHERE user_id = $1 AND status = 'completed'
       ORDER BY completed_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json({
      success: true,
      data: rows.map((r) => ({
        sessionId: r.id,
        mode: r.mode,
        totalQuestions: Number(r.total_questions),
        correctCount: Number(r.correct_count),
        accuracy:
          Number(r.total_questions) > 0
            ? Math.round((Number(r.correct_count) / Number(r.total_questions)) * 100)
            : 0,
        xpEarned: Number(r.xp_earned),
        durationSeconds: Number(r.duration_seconds),
        completedAt: String(r.completed_at),
        isOfflineSynced: Boolean(r.operation_id && !r.operation_id.startsWith('guest_')),
      })),
    });
  })
);

export default router;
