import { createHash } from 'node:crypto';
import { Router } from 'express';
import { updateProfileSchema, updateSettingsSchema } from '../../../packages/shared/src/index.ts';
import { env } from '../config/env.ts';
import { getDb } from '../db/database.ts';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.ts';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';
import { loadAuthUserBundle } from './authRoutes.ts';

const router = Router();

router.post('/avatar', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret } = env;
  if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
    throw new AppError(503, 'AVATAR_STORAGE_NOT_CONFIGURED', 'رفع الصور غير مفعّل بعد على الخادم.');
  }
  const image = typeof req.body?.image === 'string' ? req.body.image : '';
  const match = image.startsWith('data:image/jpeg;base64,') && /^[A-Za-z0-9+/=]+$/.test(image.slice('data:image/jpeg;base64,'.length));
  if (!match || image.length > 900_000) throw new AppError(400, 'INVALID_AVATAR', 'الصورة غير صالحة أو حجمها أكبر من المسموح.');

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = 'midhmar/avatars';
  const publicId = req.authUser!.userId;
  const signedParams = `folder=${folder}&overwrite=true&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = createHash('sha1').update(signedParams + cloudinaryApiSecret).digest('hex');
  const form = new FormData();
  form.set('file', image);
  form.set('api_key', cloudinaryApiKey);
  form.set('timestamp', timestamp);
  form.set('folder', folder);
  form.set('public_id', publicId);
  form.set('overwrite', 'true');
  form.set('signature', signature);

  const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
    method: 'POST', body: form, signal: AbortSignal.timeout(20_000),
  });
  const result = await cloudinaryResponse.json() as { secure_url?: string };
  if (!cloudinaryResponse.ok || !result.secure_url) throw new AppError(502, 'AVATAR_UPLOAD_FAILED', 'فشل تخزين الصورة. حاول مرة أخرى.');
  res.json({ success: true, data: { secureUrl: result.secure_url } });
}));

router.get('/', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const bundle = await loadAuthUserBundle(getDb(), req.authUser!.userId);
  if (!bundle) throw new AppError(404, 'USER_NOT_FOUND', 'الحساب غير موجود');
  res.json({ success: true, data: bundle });
}));

router.patch('/', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = updateProfileSchema.parse(req.body);
  const db = getDb();
  const userId = req.authUser!.userId;
  if (parsed.username) {
    const existing = await db.queryOne<{ user_id: string }>(
      'SELECT user_id FROM user_profiles WHERE LOWER(username) = LOWER($1) AND user_id != $2',
      [parsed.username, userId]
    );
    if (existing) throw new AppError(409, 'USERNAME_EXISTS', 'اسم المستخدم مستخدم بالفعل');
  }
  const current = await db.queryOne<{
    display_name: string; username: string; avatar_id: string; avatar_url: string | null; bio: string; timezone: string;
  }>('SELECT display_name, username, avatar_id, avatar_url, bio, timezone FROM user_profiles WHERE user_id = $1', [userId]);
  if (!current) throw new AppError(404, 'USER_NOT_FOUND', 'الحساب غير موجود');
  await db.execute(
    `UPDATE user_profiles SET display_name = $1, username = $2, avatar_id = $3, avatar_url = $4, bio = $5, timezone = $6, updated_at = $7 WHERE user_id = $8`,
    [
      parsed.displayName ?? current.display_name, parsed.username ?? current.username,
      parsed.avatarId ?? current.avatar_id,
      parsed.avatarUrl === undefined ? current.avatar_url : parsed.avatarUrl,
      parsed.bio ?? current.bio, parsed.timezone ?? current.timezone, new Date().toISOString(), userId,
    ]
  );
  res.json({ success: true, data: await loadAuthUserBundle(db, userId) });
}));

router.patch('/settings', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const parsed = updateSettingsSchema.parse(req.body);
  const db = getDb();
  const userId = req.authUser!.userId;
  const current = await db.queryOne<{
    theme: 'light' | 'dark'; sound_enabled: number | boolean; vibration_enabled: number | boolean;
    show_on_leaderboard: number | boolean; share_activity_publicly: number | boolean;
  }>('SELECT * FROM player_settings WHERE user_id = $1', [userId]);
  if (!current) throw new AppError(404, 'SETTINGS_NOT_FOUND', 'تعذر العثور على الإعدادات');
  await db.execute(
    `UPDATE player_settings SET theme = $1, sound_enabled = $2, vibration_enabled = $3, show_on_leaderboard = $4, share_activity_publicly = $5, updated_at = $6 WHERE user_id = $7`,
    [
      parsed.theme ?? current.theme, parsed.soundEnabled ?? Boolean(current.sound_enabled),
      parsed.vibrationEnabled ?? Boolean(current.vibration_enabled),
      parsed.showOnLeaderboard ?? Boolean(current.show_on_leaderboard),
      parsed.shareActivityPublicly ?? Boolean(current.share_activity_publicly), new Date().toISOString(), userId,
    ]
  );
  const updated = await loadAuthUserBundle(db, userId);
  res.json({ success: true, data: updated?.settings });
}));

router.get('/achievements', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.authUser!.userId;
  const rows = await getDb().query<{
    id: number; code: string; title_ar: string; description_ar: string; category: string; xp_bonus: number; unlocked_at: string | null;
  }>(
    `SELECT a.id, a.code, a.title_ar, a.description_ar, a.category, a.xp_bonus, ua.unlocked_at
     FROM achievements a LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = $1 ORDER BY a.id ASC`,
    [userId]
  );
  res.json({ success: true, data: rows.map((r) => ({
    id: Number(r.id), code: r.code, titleAr: r.title_ar, descriptionAr: r.description_ar,
    category: r.category, xpBonus: Number(r.xp_bonus), unlocked: Boolean(r.unlocked_at),
    unlockedAt: r.unlocked_at ? String(r.unlocked_at) : null,
  })) });
}));

router.get('/history', requireAuth, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.authUser!.userId;
  const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
  const rows = await getDb().query<{
    id: string; mode: string; total_questions: number; correct_count: number; xp_earned: number;
    duration_seconds: number; completed_at: string; operation_id: string | null;
  }>(
    `SELECT id, mode, total_questions, correct_count, xp_earned, duration_seconds, completed_at, operation_id
     FROM game_sessions WHERE user_id = $1 AND status = 'completed' ORDER BY completed_at DESC LIMIT $2`,
    [userId, limit]
  );
  res.json({ success: true, data: rows.map((r) => ({
    sessionId: r.id, mode: r.mode, totalQuestions: Number(r.total_questions),
    correctCount: Number(r.correct_count),
    accuracy: Number(r.total_questions) > 0 ? Math.round((Number(r.correct_count) / Number(r.total_questions)) * 100) : 0,
    xpEarned: Number(r.xp_earned), durationSeconds: Number(r.duration_seconds),
    completedAt: String(r.completed_at), isOfflineSynced: Boolean(r.operation_id && !r.operation_id.startsWith('guest_')),
  })) });
}));

export default router;
