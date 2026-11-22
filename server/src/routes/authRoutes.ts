import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router, type Request, type Response } from 'express';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  calculateLevelFromXp,
} from '../../../packages/shared/src/index.ts';
import { env } from '../config/env.ts';
import { getDb, type DbClient } from '../db/database.ts';
import {
  assertCsrfSafeRequest,
  generateOpaqueToken,
  hashOpaqueToken,
  requireAuth,
  signAccessToken,
  type AuthenticatedRequest,
} from '../middleware/auth.ts';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';
import { authRateLimiter } from '../middleware/rateLimit.ts';
import { sendEmail } from '../services/email.ts';
import { verifyFirebaseIdToken } from '../services/firebaseAdmin.ts';

const router = Router();
const REFRESH_COOKIE_NAME = 'qafiyah_refresh';

function actionEmail(title: string, text: string, url: string, button: string): string {
  return '<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><body style="font-family:Arial;background:#f4f6f8;padding:24px;color:#172033"><main style="max-width:520px;margin:auto;background:#fff;padding:28px;border-radius:16px;text-align:center"><h2>' + title + '</h2><p style="line-height:1.9">' + text + '</p><p><a style="display:inline-block;background:#0d6e52;color:white;padding:14px 22px;border-radius:9px;text-decoration:none" href="' + url + '">' + button + '</a></p><p style="font-size:12px;word-break:break-all">' + url + '</p><p style="font-size:12px;color:#667085">إذا لم تطلب هذا الإجراء فتجاهل الرسالة.</p></main></body></html>';
}

function setRefreshCookie(req: Request, res: Response, rawToken: string): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const maxAgeMs = env.refreshTokenTtlDays * 24 * 60 * 60 * 1000;
  res.cookie(REFRESH_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    ...(isHttps ? { partitioned: true } : {}),
    path: '/api/auth',
    maxAge: maxAgeMs,
  });
}

function clearRefreshCookie(req: Request, res: Response): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    ...(isHttps ? { partitioned: true } : {}),
    path: '/api/auth',
  });
}

async function issueSessionTokens(db: DbClient, userId: string, username: string) {
  const accessToken = signAccessToken(userId, username);
  const rawRefreshToken = generateOpaqueToken();
  const tokenHash = hashOpaqueToken(rawRefreshToken);
  const expiresAt = new Date(
    Date.now() + env.refreshTokenTtlDays * 24 * 60 * 60 * 1000
  ).toISOString();

  await db.execute(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [crypto.randomUUID(), userId, tokenHash, expiresAt]
  );

  return { accessToken, rawRefreshToken };
}

export async function loadAuthUserBundle(db: DbClient, userId: string) {
  const row = await db.queryOne<{
    user_id: string;
    email: string;
    username: string;
    display_name: string;
    avatar_id: string;
    bio: string;
    timezone: string;
    created_at: string;
    total_xp: number;
    level: number;
    current_streak: number;
    longest_streak: number;
    last_played_date: string | null;
    games_played: number;
    total_questions: number;
    correct_answers: number;
    daily_challenges_completed: number;
    theme: 'light' | 'dark';
    sound_enabled: number | boolean;
    vibration_enabled: number | boolean;
    show_on_leaderboard: number | boolean;
    share_activity_publicly: number | boolean;
  }>(
    `SELECT
       u.id AS user_id, u.email, u.created_at,
       up.username, up.display_name, up.avatar_id, up.bio, up.timezone,
       ps.total_xp, ps.level, ps.current_streak, ps.longest_streak, ps.last_played_date,
       ps.games_played, ps.total_questions, ps.correct_answers, ps.daily_challenges_completed,
       pset.theme, pset.sound_enabled, pset.vibration_enabled, pset.show_on_leaderboard, pset.share_activity_publicly
     FROM users u
     JOIN user_profiles up ON u.id = up.user_id
     JOIN player_stats ps ON u.id = ps.user_id
     JOIN player_settings pset ON u.id = pset.user_id
     WHERE u.id = $1 AND u.is_active = $2`,
    [userId, true]
  );

  if (!row) return null;

  return {
    profile: {
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name,
      email: row.email,
      avatarId: row.avatar_id,
      bio: row.bio,
      timezone: row.timezone,
      createdAt: String(row.created_at),
    },
    stats: {
      totalXp: Number(row.total_xp),
      level: Number(row.level),
      currentStreak: Number(row.current_streak),
      longestStreak: Number(row.longest_streak),
      lastPlayedDate: row.last_played_date ? String(row.last_played_date).slice(0, 10) : null,
      gamesPlayed: Number(row.games_played),
      totalQuestions: Number(row.total_questions),
      correctAnswers: Number(row.correct_answers),
      dailyChallengesCompleted: Number(row.daily_challenges_completed),
    },
    settings: {
      theme: row.theme,
      soundEnabled: Boolean(row.sound_enabled),
      vibrationEnabled: Boolean(row.vibration_enabled),
      showOnLeaderboard: Boolean(row.show_on_leaderboard),
      shareActivityPublicly: Boolean(row.share_activity_publicly),
    },
  };
}

router.post(
  '/firebase/register',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(String(req.body?.idToken || ''));
    } catch {
      throw new AppError(401, 'INVALID_FIREBASE_TOKEN', 'تعذر التحقق من حساب Firebase');
    }

    const email = String(decoded.email || '').trim().toLowerCase();
    if (!email || !decoded.uid) {
      throw new AppError(400, 'INVALID_FIREBASE_ACCOUNT', 'حساب Firebase لا يحتوي على بريد صالح');
    }

    const db = getDb();
    const existing = await db.queryOne<{ id: string; firebase_uid: string | null }>(
      'SELECT id, firebase_uid FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existing) {
      if (existing.firebase_uid && existing.firebase_uid !== decoded.uid) {
        throw new AppError(409, 'FIREBASE_ACCOUNT_MISMATCH', 'هذا البريد مرتبط بحساب آخر');
      }
      await db.execute(
        'UPDATE users SET firebase_uid = $1, updated_at = $2 WHERE id = $3',
        [decoded.uid, new Date().toISOString(), existing.id]
      );
      res.json({
        success: true,
        data: { message: 'تم ربط حسابك السابق. أكّد بريدك الإلكتروني ثم سجّل الدخول.' },
      });
      return;
    }

    const displayName = String(req.body?.displayName || '').trim();
    const username = String(req.body?.username || '').trim();
    if (!displayName || !username) {
      throw new AppError(404, 'LEGACY_ACCOUNT_NOT_FOUND', 'لا يوجد حساب سابق بهذا البريد. أنشئ حساباً جديداً من صفحة التسجيل.');
    }
    if (username.length < 3 || username.length > 40 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new AppError(400, 'INVALID_USERNAME', 'اسم المستخدم يجب أن يتكون من 3 إلى 40 حرفاً أو رقماً أو شرطة سفلية');
    }

    const existingUsername = await db.queryOne<{ user_id: string }>(
      'SELECT user_id FROM user_profiles WHERE LOWER(username) = LOWER($1)',
      [username]
    );
    if (existingUsername) {
      throw new AppError(409, 'USERNAME_EXISTS', 'اسم المستخدم مستخدم بالفعل، اختر اسماً آخر');
    }

    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12);
    const timezone = String(req.body?.timezone || 'UTC');
    const migration = req.body?.guestMigration;
    const stats = migration?.stats;
    const initialXp = stats ? Math.min(50000, Math.max(0, Number(stats.totalXp) || 0)) : 0;

    await db.transaction(async (tx) => {
      await tx.execute(
        'INSERT INTO users (id, email, password_hash, firebase_uid, is_active) VALUES ($1, $2, $3, $4, $5)',
        [userId, email, passwordHash, decoded.uid, Boolean(decoded.email_verified)]
      );
      await tx.execute(
        "INSERT INTO user_profiles (user_id, username, display_name, avatar_id, bio, timezone) VALUES ($1, $2, $3, 'scholar_astrolabe', '', $4)",
        [userId, username, displayName, timezone]
      );
      await tx.execute(
        `INSERT INTO player_stats (
          user_id, total_xp, level, current_streak, longest_streak, last_played_date,
          games_played, total_questions, correct_answers, daily_challenges_completed
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          userId, initialXp, calculateLevelFromXp(initialXp),
          Number(stats?.currentStreak) || 0, Number(stats?.longestStreak) || 0,
          stats?.lastPlayedDate || null, Number(stats?.gamesPlayed) || 0,
          Number(stats?.totalQuestions) || 0, Number(stats?.correctAnswers) || 0,
          Number(stats?.dailyChallengesCompleted) || 0,
        ]
      );
      await tx.execute(
        "INSERT INTO player_settings (user_id, theme, sound_enabled, vibration_enabled, show_on_leaderboard, share_activity_publicly) VALUES ($1, 'light', $2, $3, $4, $5)",
        [userId, true, true, true, true]
      );

      if (Array.isArray(migration?.history)) {
        for (const item of migration.history) {
          if (!item?.sessionId || !item?.completedAt) continue;
          const operationId = `guest_${String(migration.guestId || 'guest')}_${String(item.sessionId)}`;
          await tx.execute(
            `INSERT INTO game_sessions (
              id, user_id, mode, status, total_questions, correct_count,
              xp_earned, duration_seconds, question_payload_json, operation_id, started_at, completed_at
            ) VALUES ($1, $2, $3, 'completed', $4, $5, $6, $7, '[]', $8, $9, $10)
            ON CONFLICT (operation_id) DO NOTHING`,
            [
              crypto.randomUUID(), userId, item.mode || 'classic',
              Number(item.totalQuestions) || 0, Number(item.correctCount) || 0,
              Number(item.xpEarned) || 0, Number(item.durationSeconds) || 0,
              operationId, item.completedAt, item.completedAt,
            ]
          );
        }
      }
    });

    res.status(201).json({
      success: true,
      data: { message: 'تم إنشاء الحساب. أرسلنا رابط تأكيد إلى بريدك الإلكتروني.' },
    });
  })
);

router.post(
  '/firebase/session',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    let decoded;
    try {
      decoded = await verifyFirebaseIdToken(String(req.body?.idToken || ''));
    } catch {
      throw new AppError(401, 'INVALID_FIREBASE_TOKEN', 'تعذر التحقق من حساب Firebase');
    }

    const email = String(decoded.email || '').trim().toLowerCase();
    if (!decoded.email_verified || !email) {
      throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'يجب تأكيد بريدك الإلكتروني أولاً');
    }

    const db = getDb();
    const user = await db.queryOne<{ id: string; firebase_uid: string | null; username: string }>(
      `SELECT u.id, u.firebase_uid, up.username
       FROM users u JOIN user_profiles up ON up.user_id = u.id
       WHERE u.firebase_uid = $1 OR (LOWER(u.email) = LOWER($2) AND u.firebase_uid IS NULL)
       LIMIT 1`,
      [decoded.uid, email]
    );
    if (!user) {
      throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'لم نعثر على حسابك في قاعدة البيانات. تواصل مع الدعم إذا كان لديك حساب سابق.');
    }
    if (user.firebase_uid && user.firebase_uid !== decoded.uid) {
      throw new AppError(409, 'FIREBASE_ACCOUNT_MISMATCH', 'هذا الحساب مرتبط بهوية Firebase مختلفة');
    }

    await db.execute(
      'UPDATE users SET firebase_uid = $1, is_active = $2, updated_at = $3 WHERE id = $4',
      [decoded.uid, true, new Date().toISOString(), user.id]
    );

    const { accessToken, rawRefreshToken } = await issueSessionTokens(db, user.id, user.username);
    setRefreshCookie(req, res, rawRefreshToken);
    const userBundle = await loadAuthUserBundle(db, user.id);
    res.json({ success: true, data: { accessToken, user: userBundle } });
  })
);

router.post(
  '/register',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const parsed = registerSchema.parse(req.body);
    const db = getDb();

    const existingEmail = await db.queryOne<{ id: string }>(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [parsed.email]
    );
    if (existingEmail) {
      throw new AppError(409, 'EMAIL_EXISTS', 'البريد الإلكتروني مسجل مسبقاً');
    }

    const existingUsername = await db.queryOne<{ user_id: string }>(
      'SELECT user_id FROM user_profiles WHERE LOWER(username) = LOWER($1)',
      [parsed.username]
    );
    if (existingUsername) {
      throw new AppError(409, 'USERNAME_EXISTS', 'اسم المستخدم مستخدم بالفعل، اختر اسماً آخر');
    }

    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(parsed.password, 12);
    const timezone = parsed.timezone || 'UTC';

    await db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO users (id, email, password_hash, is_active)
         VALUES ($1, $2, $3, $4)`,
        [userId, parsed.email, passwordHash, false]
      );

      await tx.execute(
        `INSERT INTO user_profiles (user_id, username, display_name, avatar_id, bio, timezone)
         VALUES ($1, $2, $3, $4, '', $5)`,
        [userId, parsed.username, parsed.displayName, 'scholar_astrolabe', timezone]
      );

      const migratedStats = parsed.guestMigration?.stats;
      const initialXp = migratedStats ? Math.min(50000, Math.max(0, migratedStats.totalXp)) : 0;
      const initialLevel = calculateLevelFromXp(initialXp);

      await tx.execute(
        `INSERT INTO player_stats (
           user_id, total_xp, level, current_streak, longest_streak, last_played_date,
           games_played, total_questions, correct_answers, daily_challenges_completed
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          userId,
          initialXp,
          initialLevel,
          migratedStats?.currentStreak ?? 0,
          migratedStats?.longestStreak ?? 0,
          migratedStats?.lastPlayedDate ?? null,
          migratedStats?.gamesPlayed ?? 0,
          migratedStats?.totalQuestions ?? 0,
          migratedStats?.correctAnswers ?? 0,
          migratedStats?.dailyChallengesCompleted ?? 0,
        ]
      );

      await tx.execute(
        `INSERT INTO player_settings (user_id, theme, sound_enabled, vibration_enabled, show_on_leaderboard, share_activity_publicly)
         VALUES ($1, 'light', $2, $3, $4, $5)`,
        [userId, true, true, true, true]
      );

      // Migrate guest challenge history idempotently using operation_id
      if (parsed.guestMigration?.history?.length) {
        for (const item of parsed.guestMigration.history) {
          const opId = `guest_${parsed.guestMigration.guestId}_${item.sessionId}`;
          await tx.execute(
            `INSERT INTO game_sessions (
               id, user_id, mode, status, total_questions, correct_count,
               xp_earned, duration_seconds, question_payload_json, operation_id, started_at, completed_at
             ) VALUES ($1, $2, $3, 'completed', $4, $5, $6, $7, '[]', $8, $9, $10)
             ON CONFLICT (operation_id) DO NOTHING`,
            [
              crypto.randomUUID(),
              userId,
              item.mode,
              item.totalQuestions,
              item.correctCount,
              item.xpEarned,
              item.durationSeconds,
              opId,
              item.completedAt,
              item.completedAt,
            ]
          );
        }
      }
    });

    const rawToken = generateOpaqueToken().slice(0, 32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await db.execute(
      'INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
      [crypto.randomUUID(), userId, hashOpaqueToken(rawToken), expiresAt]
    );
    const verifyUrl = env.appUrl.replace(/\/$/, '') + '/api/auth/verify-email?token=' + encodeURIComponent(rawToken);
    await sendEmail(parsed.email, 'تأكيد بريدك الإلكتروني', actionEmail('تأكيد البريد الإلكتروني', 'اضغط على الرابط أدناه لتفعيل حسابك. الرابط صالح لمدة 24 ساعة ويستخدم مرة واحدة.', verifyUrl, 'تأكيد البريد الإلكتروني'));
    res.status(201).json({ success: true, data: { message: 'تم إنشاء الحساب. أرسلنا رابط التأكيد إلى بريدك الإلكتروني؛ افتحه لتفعيل الحساب ثم سجّل الدخول.' } });
  })
);

router.get('/verify-email', asyncHandler(async (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  if (!token) throw new AppError(400, 'INVALID_VERIFICATION_TOKEN', 'رابط التأكيد غير صالح');
  const db = getDb();
  const row = await db.queryOne<{ id: string; user_id: string; expires_at: string; used_at: string | null }>(
    'SELECT id, user_id, expires_at, used_at FROM email_verification_tokens WHERE token_hash = $1',
    [hashOpaqueToken(token)]
  );
  if (!row || row.used_at || new Date(row.expires_at).getTime() <= Date.now()) {
    throw new AppError(400, 'INVALID_VERIFICATION_TOKEN', 'رابط التأكيد غير صالح أو منتهي الصلاحية');
  }
  await db.transaction(async (tx) => {
    const consumed = await tx.execute(
      'UPDATE email_verification_tokens SET used_at = $1 WHERE id = $2 AND used_at IS NULL AND expires_at > $1',
      [new Date().toISOString(), row.id]
    );
    if (consumed.rowCount !== 1) throw new AppError(400, 'INVALID_VERIFICATION_TOKEN', 'رابط التأكيد غير صالح أو مستخدم مسبقاً');
    await tx.execute('UPDATE users SET is_active = $1, updated_at = $2 WHERE id = $3', [true, new Date().toISOString(), row.user_id]);
  });
  res.redirect(303, env.appUrl.replace(/\/$/, '') + '/?emailVerified=1');
}));

router.post('/resend-verification', authRateLimiter, asyncHandler(async (req, res) => {
  const parsed = forgotPasswordSchema.parse(req.body);
  const db = getDb();
  const user = await db.queryOne<{ id: string }>('SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND is_active = $2', [parsed.email, false]);
  if (user) {
    const raw = generateOpaqueToken().slice(0, 32);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await db.execute('UPDATE email_verification_tokens SET used_at = $1 WHERE user_id = $2 AND used_at IS NULL', [new Date().toISOString(), user.id]);
    await db.execute('INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)', [crypto.randomUUID(), user.id, hashOpaqueToken(raw), expires]);
    const url = env.appUrl.replace(/\/$/, '') + '/api/auth/verify-email?token=' + encodeURIComponent(raw);
    await sendEmail(parsed.email, 'رابط تأكيد البريد الإلكتروني', actionEmail('تأكيد البريد الإلكتروني', 'استخدم الرابط أدناه لتفعيل حسابك. صالح لمدة 24 ساعة.', url, 'تأكيد البريد'));
  }
  res.json({ success: true, data: { message: 'إذا كان الحساب ينتظر التأكيد، فسيصلك رابط جديد إلى بريدك.' } });
}));

router.post(
  '/login',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const parsed = loginSchema.parse(req.body);
    const db = getDb();

    const userRow = await db.queryOne<{
      id: string;
      password_hash: string;
      is_active: number | boolean;
      username: string;
    }>(
      `SELECT u.id, u.password_hash, u.is_active, up.username
       FROM users u
       JOIN user_profiles up ON u.id = up.user_id
       WHERE LOWER(u.email) = LOWER($1)`,
      [parsed.email]
    );

    if (!userRow || !userRow.is_active) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    const isValid = await bcrypt.compare(parsed.password, userRow.password_hash);
    if (!isValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
    }

    const { accessToken, rawRefreshToken } = await issueSessionTokens(db, userRow.id, userRow.username);
    setRefreshCookie(req, res, rawRefreshToken);

    const userBundle = await loadAuthUserBundle(db, userRow.id);
    res.json({
      success: true,
      data: {
        accessToken,
        user: userBundle,
      },
    });
  })
);

router.post(
  '/refresh',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    assertCsrfSafeRequest(req);
    const rawToken =
      (req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined) ||
      (typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined);

    if (!rawToken) {
      throw new AppError(401, 'MISSING_REFRESH_TOKEN', 'لا توجد جلسة نشطة');
    }

    const db = getDb();
    const tokenHash = hashOpaqueToken(rawToken);
    const tokenRow = await db.queryOne<{
      id: string;
      user_id: string;
      expires_at: string;
      revoked_at: string | null;
      username: string;
    }>(
      `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at, up.username
       FROM refresh_tokens rt
       JOIN user_profiles up ON rt.user_id = up.user_id
       WHERE rt.token_hash = $1`,
      [tokenHash]
    );

    if (!tokenRow || tokenRow.revoked_at || new Date(tokenRow.expires_at).getTime() <= Date.now()) {
      clearRefreshCookie(req, res);
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'انتهت صلاحية جلسة الدخول');
    }

    // Rotate refresh token
    await db.execute('UPDATE refresh_tokens SET revoked_at = $1 WHERE id = $2', [
      new Date().toISOString(),
      tokenRow.id,
    ]);

    const { accessToken, rawRefreshToken } = await issueSessionTokens(
      db,
      tokenRow.user_id,
      tokenRow.username
    );
    setRefreshCookie(req, res, rawRefreshToken);

    const userBundle = await loadAuthUserBundle(db, tokenRow.user_id);
    res.json({
      success: true,
      data: {
        accessToken,
        user: userBundle,
      },
    });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
    if (rawToken) {
      const db = getDb();
      const tokenHash = hashOpaqueToken(rawToken);
      await db.execute('UPDATE refresh_tokens SET revoked_at = $1 WHERE token_hash = $2', [
        new Date().toISOString(),
        tokenHash,
      ]);
    }
    clearRefreshCookie(req, res);
    res.json({ success: true, data: { loggedOut: true } });
  })
);

router.get('/reset-password', (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token.replace(/[&<>"]/g, '') : '';
  if (!token) return res.status(400).send('رابط الاستعادة غير صالح.');
  const safeToken = JSON.stringify(token);
  res.type('html').send('<!doctype html><html lang="ar" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>تغيير كلمة المرور</title><body style="font-family:Arial;background:#f4f6f8;padding:24px"><form id="f" style="max-width:420px;margin:10vh auto;background:white;padding:28px;border-radius:16px"><h2>تعيين كلمة مرور جديدة</h2><label>كلمة المرور الجديدة</label><input id="p" type="password" minlength="8" required style="display:block;width:100%;padding:12px;margin:12px 0;box-sizing:border-box"><button style="padding:12px 20px;background:#0d6e52;color:white;border:0;border-radius:8px">حفظ كلمة المرور</button><p id="m"></p></form><script>document.getElementById("f").addEventListener("submit",async e=>{e.preventDefault();const m=document.getElementById("m");try{const r=await fetch("/api/auth/reset-password",{method:"POST",headers:{"Content-Type":"application/json","X-Requested-With":"XMLHttpRequest"},body:JSON.stringify({token:'+safeToken+',newPassword:document.getElementById("p").value})});const j=await r.json();m.textContent=j.data?.message||j.error?.message||"حدث خطأ";if(r.ok)document.getElementById("f").reset()}catch{m.textContent="تعذر الاتصال بالخادم"}})</script></body></html>');
});

router.post(
  '/forgot-password',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const parsed = forgotPasswordSchema.parse(req.body);
    const db = getDb();

    const userRow = await db.queryOne<{ id: string }>(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND is_active = $2',
      [parsed.email, true]
    );

    if (userRow) {
      const rawResetToken = generateOpaqueToken().slice(0, 32);
      const tokenHash = hashOpaqueToken(rawResetToken);
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      await db.execute('UPDATE password_reset_tokens SET used_at = $1 WHERE user_id = $2 AND used_at IS NULL', [new Date().toISOString(), userRow.id]);
      await db.execute(
        `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [crypto.randomUUID(), userRow.id, tokenHash, expiresAt]
      );
      const resetUrl = env.appUrl.replace(/\/$/, '') + '/api/auth/reset-password?token=' + encodeURIComponent(rawResetToken);
      await sendEmail(parsed.email, 'استعادة كلمة المرور', actionEmail('استعادة كلمة المرور', 'الرابط صالح لمدة 30 دقيقة ويستخدم مرة واحدة.', resetUrl, 'تغيير كلمة المرور'));
    }
    res.json({ success: true, data: { message: 'إذا كان البريد مسجلاً لدينا، فستصلك رسالة تحتوي على رابط استعادة كلمة المرور.' } });
  })
);

router.post(
  '/reset-password',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const parsed = resetPasswordSchema.parse(req.body);
    const db = getDb();
    const tokenHash = hashOpaqueToken(parsed.token);

    const resetRow = await db.queryOne<{
      id: string;
      user_id: string;
      expires_at: string;
      used_at: string | null;
    }>('SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1', [
      tokenHash,
    ]);

    if (!resetRow || resetRow.used_at || new Date(resetRow.expires_at).getTime() <= Date.now()) {
      throw new AppError(400, 'INVALID_RESET_TOKEN', 'رمز استعادة كلمة المرور غير صالح أو منتهي الصلاحية');
    }

    const newHash = await bcrypt.hash(parsed.newPassword, 12);
    const nowIso = new Date().toISOString();

    await db.transaction(async (tx) => {
      await tx.execute('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3', [
        newHash,
        nowIso,
        resetRow.user_id,
      ]);
      const consumed = await tx.execute(
        'UPDATE password_reset_tokens SET used_at = $1 WHERE id = $2 AND used_at IS NULL AND expires_at > $1',
        [nowIso, resetRow.id]
      );
      if (consumed.rowCount !== 1) {
        throw new AppError(400, 'INVALID_RESET_TOKEN', 'رابط الاستعادة غير صالح أو مستخدم مسبقاً');
      }
      await tx.execute('UPDATE refresh_tokens SET revoked_at = $1 WHERE user_id = $2', [
        nowIso,
        resetRow.user_id,
      ]);
    });

    res.json({
      success: true,
      data: { message: 'تم تحديث كلمة المرور بنجاح، يمكنك تسجيل الدخول الآن.' },
    });
  })
);

router.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = changePasswordSchema.parse(req.body);
    const db = getDb();
    const userId = req.authUser!.userId;

    const userRow = await db.queryOne<{ password_hash: string }>(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    if (!userRow) {
      throw new AppError(404, 'USER_NOT_FOUND', 'الحساب غير موجود');
    }

    const matches = await bcrypt.compare(parsed.currentPassword, userRow.password_hash);
    if (!matches) {
      throw new AppError(400, 'WRONG_PASSWORD', 'كلمة المرور الحالية غير صحيحة');
    }

    const newHash = await bcrypt.hash(parsed.newPassword, 12);
    await db.execute('UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3', [
      newHash,
      new Date().toISOString(),
      userId,
    ]);

    res.json({
      success: true,
      data: { message: 'تم تغيير كلمة المرور بنجاح' },
    });
  })
);

router.delete(
  '/account',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const userId = req.authUser!.userId;
    await db.execute('DELETE FROM users WHERE id = $1', [userId]);
    clearRefreshCookie(req, res);
    res.json({
      success: true,
      data: { deleted: true },
    });
  })
);

router.get(
  '/me',
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

export default router;
