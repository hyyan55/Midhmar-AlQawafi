import { z } from 'zod';

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل')
  .max(30, 'اسم المستخدم طويل جداً')
  .regex(
    /^[a-zA-Z0-9_]+$/,
    'اسم المستخدم يقبل الأحرف الإنجليزية والأرقام والشرطة السفلية فقط'
  );

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, 'الاسم الظاهر يجب أن يكون حرفين على الأقل')
  .max(50, 'الاسم الظاهر يجب ألا يتجاوز 50 حرفاً');

export const passwordSchema = z
  .string()
  .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
  .max(128, 'كلمة المرور طويلة جداً');

export const gameModeSchema = z.enum([
  'who_said',
  'complete_verse',
  'era_challenge',
  'daily_challenge',
]);

export const registerSchema = z.object({
  displayName: displayNameSchema,
  username: usernameSchema,
  email: z.string().trim().email('البريد الإلكتروني غير صالح').toLowerCase(),
  password: passwordSchema,
  timezone: z.string().trim().max(64).optional(),
  guestMigration: z
    .object({
      guestId: z.string().min(1),
      stats: z.object({
        totalXp: z.number().int().min(0).max(500000),
        gamesPlayed: z.number().int().min(0).max(10000),
        totalQuestions: z.number().int().min(0).max(100000),
        correctAnswers: z.number().int().min(0).max(100000),
        currentStreak: z.number().int().min(0).max(3650),
        longestStreak: z.number().int().min(0).max(3650),
        lastPlayedDate: z.string().nullable(),
        dailyChallengesCompleted: z.number().int().min(0).max(3650),
      }),
      history: z
        .array(
          z.object({
            sessionId: z.string().min(1),
            mode: gameModeSchema,
            totalQuestions: z.number().int().min(1).max(20),
            correctCount: z.number().int().min(0).max(20),
            accuracy: z.number().min(0).max(100),
            xpEarned: z.number().int().min(0).max(1000),
            durationSeconds: z.number().int().min(0).max(3600),
            completedAt: z.string(),
          })
        )
        .max(100),
    })
    .optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().email('البريد الإلكتروني غير صالح').toLowerCase(),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('البريد الإلكتروني غير صالح').toLowerCase(),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(16, 'رمز الاستعادة غير صالح'),
  newPassword: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z.object({
  displayName: displayNameSchema.optional(),
  username: usernameSchema.optional(),
  avatarId: z.string().trim().min(1).max(40).optional(),
  avatarUrl: z.string().url().max(2048).nullable().optional(),
  bio: z.string().trim().max(240).optional(),
  timezone: z.string().trim().min(1).max(64).optional(),
});

export const updateSettingsSchema = z.object({
  theme: z.enum(['light', 'dark']).optional(),
  soundEnabled: z.boolean().optional(),
  vibrationEnabled: z.boolean().optional(),
  showOnLeaderboard: z.boolean().optional(),
  shareActivityPublicly: z.boolean().optional(),
});

export const startGameSchema = z.object({
  mode: gameModeSchema,
  eraId: z.number().int().positive().optional(),
  questionCount: z.number().int().min(3).max(15).optional(),
  timezone: z.string().trim().max(64).optional(),
});

export const submitAnswerSchema = z.object({
  questionId: z.string().min(1),
  selectedOptionId: z.string().min(1),
  responseTimeMs: z.number().int().min(0).max(300000),
});

export const completeSessionSchema = z.object({
  durationSeconds: z.number().int().min(0).max(3600),
  timezone: z.string().trim().max(64).optional(),
});

export const syncSessionsSchema = z.object({
  timezone: z.string().trim().max(64).optional(),
  sessions: z
    .array(
      z.object({
        operationId: z.string().uuid(),
        mode: gameModeSchema,
        startedAt: z.string(),
        completedAt: z.string(),
        durationSeconds: z.number().int().min(0).max(3600),
        answers: z
          .array(
            z.object({
              questionId: z.string().min(1),
              poemId: z.number().int().positive(),
              verseId: z.number().int().positive(),
              selectedOptionId: z.string().min(1),
              correctOptionId: z.string().min(1),
              isCorrect: z.boolean(),
              responseTimeMs: z.number().int().min(0).max(300000),
              promptAr: z.string(),
              fullVerseSadr: z.string(),
              fullVerseAjuz: z.string(),
              poetNameAr: z.string(),
              poemTitleAr: z.string(),
              eraNameAr: z.string(),
              meterNameAr: z.string().nullable(),
              correctOptionLabel: z.string(),
            })
          )
          .min(1)
          .max(20),
      })
    )
    .max(50),
});
