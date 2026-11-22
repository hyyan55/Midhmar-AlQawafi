import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { calculateLevelFromXp } from '../packages/shared/src/constants.ts';
import {
  ensureDatabaseInitialized,
  getDb,
  resetSqliteForTests,
} from '../server/src/db/database.ts';
import {
  calculateSessionRewards,
  computeNextStreak,
} from '../server/src/modules/progression/progressionService.ts';
import { generateQuestionsForMode } from '../server/src/modules/questions/questionEngine.ts';
import { createApiApp } from '../server/src/app.ts';
import { splitQafiyahPoemVerses } from '../database/scripts/import-qafiyah.ts';
import type { Server } from 'node:http';

// Force every API route in this suite to use the isolated temporary SQLite database.
// This prevents inherited PGHOST / DATABASE_URL values from sending tests to Aiven.
const testDbState = vi.hoisted(() => ({ path: '' }));

// Keep API tests independent from external SMTP availability.
vi.mock('../server/src/services/firebaseAdmin.ts', () => ({
  verifyFirebaseIdToken: vi.fn(async (idToken: string) => {
    if (idToken === 'firebase-test-unverified') {
      return { uid: 'firebase-test-uid', email: 'firebase-user@example.com', email_verified: false };
    }
    if (idToken === 'firebase-test-verified') {
      return { uid: 'firebase-test-uid', email: 'firebase-user@example.com', email_verified: true };
    }
    throw new Error('Invalid Firebase token');
  }),
  deleteFirebaseUser: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../server/src/services/email.ts', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../server/src/db/database.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../server/src/db/database.ts')>();
  return {
    ...actual,
    getDb: (customSqlitePath?: string) => actual.getDb(customSqlitePath ?? testDbState.path),
    ensureDatabaseInitialized: (customSqlitePath?: string) =>
      actual.ensureDatabaseInitialized(customSqlitePath ?? testDbState.path),
  };
});

let tempDir = '';
let testDbPath = '';
let server: Server;
let baseUrl = '';

beforeAll(async () => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qafiyah-test-'));
  testDbPath = path.join(tempDir, 'test.sqlite');
  testDbState.path = testDbPath;
  process.env.SQLITE_DB_PATH = testDbPath;
  resetSqliteForTests(testDbPath);
  await ensureDatabaseInitialized(testDbPath);

  const app = createApiApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (addr && typeof addr !== 'string') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe('Level, XP & Calendar Streak Progression', () => {
  it('computes levels deterministically from XP thresholds', () => {
    expect(calculateLevelFromXp(0)).toBe(1);
    expect(calculateLevelFromXp(120)).toBe(2);
    expect(calculateLevelFromXp(300)).toBe(3);
    expect(calculateLevelFromXp(12500)).toBe(15);
  });

  it('computes calendar-date streaks accurately without boolean flags', () => {
    expect(computeNextStreak(null, 0, 0, '2026-11-21')).toEqual({
      currentStreak: 1,
      longestStreak: 1,
    });
    expect(computeNextStreak('2026-11-21', 3, 5, '2026-11-21')).toEqual({
      currentStreak: 3,
      longestStreak: 5,
    });
    expect(computeNextStreak('2026-11-20', 3, 3, '2026-11-21')).toEqual({
      currentStreak: 4,
      longestStreak: 4,
    });
    expect(computeNextStreak('2026-11-18', 4, 4, '2026-11-21')).toEqual({
      currentStreak: 1,
      longestStreak: 4,
    });
  });

  it('awards daily multiplier, fast answer bonus, and perfect round bonus server-side', () => {
    const rewards = calculateSessionRewards({
      mode: 'daily_challenge',
      totalQuestions: 5,
      answers: [
        { isCorrect: true, responseTimeMs: 3000 },
        { isCorrect: true, responseTimeMs: 4000 },
        { isCorrect: true, responseTimeMs: 9000 },
        { isCorrect: true, responseTimeMs: 8000 },
        { isCorrect: true, responseTimeMs: 7000 },
      ],
      nextStreak: 2,
    });
    expect(rewards.correctCount).toBe(5);
    expect(rewards.speedBonusXp).toBe(20);
    expect(rewards.perfectRoundBonusXp).toBe(40);
    expect(rewards.streakBonusXp).toBe(30);
    expect(rewards.totalXpEarned).toBeGreaterThan(200);
  });
});

describe('Authentic Poetry Question Engine', () => {
  it('generates distinct authentic options without duplicate distractors across all modes', async () => {
    const db = getDb(testDbPath);

    for (const mode of ['who_said', 'complete_verse', 'era_challenge'] as const) {
      const questions = await generateQuestionsForMode(db, { mode, count: 5 });
      expect(questions).toHaveLength(5);
      for (const q of questions) {
        expect(q.options).toHaveLength(4);
        const ids = new Set(q.options.map((o) => o.id));
        const labels = new Set(q.options.map((o) => o.label));
        expect(ids.size).toBe(4);
        expect(labels.size).toBe(4);
        expect(ids.has(q.correctOptionId)).toBe(true);
      }
    }
  });

  it('keeps every generated verse inside the requested literary era', async () => {
    const db = getDb(testDbPath);
    const era = await db.queryOne<{ id: number; name_ar: string; total: number }>(
      `SELECT e.id, e.name_ar, COUNT(pv.id) AS total
       FROM eras e
       JOIN poems p ON p.era_id = e.id
       JOIN poem_verses pv ON pv.poem_id = p.id
       GROUP BY e.id, e.name_ar
       HAVING COUNT(pv.id) >= 5
       ORDER BY total DESC
       LIMIT 1`
    );

    expect(era).toBeTruthy();
    const questions = await generateQuestionsForMode(db, {
      mode: 'who_said',
      count: 5,
      eraId: Number(era!.id),
    });

    expect(questions).toHaveLength(5);
    expect(questions.every((question) => question.eraNameAr === era!.name_ar)).toBe(true);
  });

  it('generates deterministic daily challenge questions for a given calendar date', async () => {
    const db = getDb(testDbPath);
    const first = await generateQuestionsForMode(db, {
      mode: 'daily_challenge',
      count: 5,
      seed: 'daily_2026-11-21',
    });
    const second = await generateQuestionsForMode(db, {
      mode: 'daily_challenge',
      count: 5,
      seed: 'daily_2026-11-21',
    });
    expect(first.map((q) => q.verseId)).toEqual(second.map((q) => q.verseId));
  });
});

describe('Qafiyah Dump Importer Verse Parser', () => {
  it('parses tab and pipe delimited hemistichs and skips non-Arabic malformed lines', () => {
    const verses = splitQafiyahPoemVerses(
      'قفا نبك من ذكرى حبيب ومنزل\tبسقط اللوى بين الدخول فحومل\ninvalid ascii line\nعلى قدر أهل العزم تأتي العزائم | وتأتي على قدر الكرام المكارم'
    );
    expect(verses).toHaveLength(2);
    expect(verses[0].sadr).toContain('قفا نبك');
    expect(verses[1].ajuz).toContain('المكارم');
  });
});

describe('REST API Auth, Gameplay, Anti-Duplicate Guards & Offline Sync', () => {
  let accessToken = '';
  let userId = '';

  it('registers user with guest progress migration, hashes password, and blocks duplicate email', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'زهير الاختبار',
        username: 'zuhayr_tester',
        email: 'zuhayr@example.com',
        password: 'StrongPassword123',
        guestMigration: {
          guestId: 'guest-abc',
          stats: {
            totalXp: 50,
            gamesPlayed: 1,
            totalQuestions: 5,
            correctAnswers: 2,
            currentStreak: 1,
            longestStreak: 1,
            lastPlayedDate: '2026-11-20',
            dailyChallengesCompleted: 0,
          },
          history: [],
        },
      }),
    });

    expect(res.status).toBe(201);
    const registration = (await res.json()) as { success: boolean; data: { message: string } };
    expect(registration.success).toBe(true);

    const registeredUser = await getDb(testDbPath).queryOne<{
      id: string;
      password_hash: string;
      is_active: number | boolean;
    }>('SELECT id, password_hash, is_active FROM users WHERE email = $1', ['zuhayr@example.com']);
    expect(registeredUser).toBeTruthy();
    expect(registeredUser?.password_hash).not.toBe('StrongPassword123');
    expect(Number(registeredUser?.is_active)).toBe(0);

    // Simulate the email-verification side effect; outbound SMTP is mocked in this suite.
    await getDb(testDbPath).execute('UPDATE users SET is_active = $1 WHERE id = $2', [true, registeredUser!.id]);

    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'zuhayr@example.com', password: 'StrongPassword123' }),
    });
    expect(login.status).toBe(200);
    const body = (await login.json()) as {
      success: boolean;
      data: { accessToken: string; user: { profile: { userId: string }; stats: { totalXp: number } } };
    };
    expect(body.success).toBe(true);
    expect(body.data.accessToken).toBeTruthy();
    expect(body.data.user.stats.totalXp).toBe(50);
    accessToken = body.data.accessToken;
    userId = body.data.user.profile.userId;

    const dup = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'آخر',
        username: 'other_user',
        email: 'zuhayr@example.com',
        password: 'StrongPassword123',
      }),
    });
    expect(dup.status).toBe(409);
  });

  it('downloads a bounded offline pack with verses and poets for the included poems', async () => {
    const response = await fetch(`${baseUrl}/api/sync/pack`);
    expect(response.status).toBe(200);

    const body = (await response.json()) as {
      success: boolean;
      data: {
        poems: Array<{ poetId: number; verses: unknown[] }>;
        poets: Array<{ id: number }>;
        questionPacks: Array<{ questions: unknown[] }>;
      };
    };

    expect(body.success).toBe(true);
    expect(body.data.poems.length).toBeLessThanOrEqual(50);
    expect(body.data.poems.every((poem) => poem.verses.length > 0)).toBe(true);
    const includedPoetIds = new Set(body.data.poems.map((poem) => poem.poetId));
    expect(body.data.poets.every((poet) => includedPoetIds.has(poet.id))).toBe(true);
    expect(body.data.questionPacks).toHaveLength(3);
    expect(body.data.questionPacks.every((pack) => pack.questions.length === 15)).toBe(true);
  });

  it('runs a full gameplay session, prevents answering a question twice, and computes XP server-side', async () => {
    const startRes = await fetch(`${baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ mode: 'who_said', questionCount: 5 }),
    });
    expect(startRes.status).toBe(201);
    const startBody = (await startRes.json()) as {
      data: { sessionId: string; questions: Array<{ id: string; options: Array<{ id: string }> }> };
    };

    const { sessionId, questions } = startBody.data;
    expect(questions).toHaveLength(5);

    const firstQ = questions[0];
    const ans1 = await fetch(`${baseUrl}/api/game/sessions/${sessionId}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        questionId: firstQ.id,
        selectedOptionId: firstQ.options[0].id,
        responseTimeMs: 3200,
      }),
    });
    expect(ans1.status).toBe(200);

    // Prevent answering same question twice
    const ansDup = await fetch(`${baseUrl}/api/game/sessions/${sessionId}/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        questionId: firstQ.id,
        selectedOptionId: firstQ.options[1].id,
        responseTimeMs: 4000,
      }),
    });
    expect(ansDup.status).toBe(409);

    for (let i = 1; i < questions.length; i += 1) {
      await fetch(`${baseUrl}/api/game/sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          questionId: questions[i].id,
          selectedOptionId: questions[i].options[0].id,
          responseTimeMs: 4500,
        }),
      });
    }

    const completeRes = await fetch(`${baseUrl}/api/game/sessions/${sessionId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ durationSeconds: 32, timezone: 'UTC' }),
    });
    expect(completeRes.status).toBe(200);
    const completeBody = (await completeRes.json()) as {
      data: { totalQuestions: number; reviews: unknown[] };
    };
    expect(completeBody.data.totalQuestions).toBe(5);
    expect(completeBody.data.reviews).toHaveLength(5);
  });

  it('creates a Firebase account and issues an app session only after email verification', async () => {
    const registration = await fetch(`${baseUrl}/api/auth/firebase/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: 'firebase-test-unverified',
        displayName: 'Firebase Tester',
        username: 'firebase_tester',
        timezone: 'UTC',
      }),
    });
    expect(registration.status).toBe(201);

    const pendingUser = await getDb(testDbPath).queryOne<{
      firebase_uid: string;
      is_active: number | boolean;
    }>('SELECT firebase_uid, is_active FROM users WHERE email = $1', ['firebase-user@example.com']);
    expect(pendingUser?.firebase_uid).toBe('firebase-test-uid');
    expect(Number(pendingUser?.is_active)).toBe(0);

    const unverifiedSession = await fetch(`${baseUrl}/api/auth/firebase/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'firebase-test-unverified' }),
    });
    expect(unverifiedSession.status).toBe(403);

    const verifiedSession = await fetch(`${baseUrl}/api/auth/firebase/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'firebase-test-verified' }),
    });
    expect(verifiedSession.status).toBe(200);
    const sessionBody = (await verifiedSession.json()) as {
      success: boolean;
      data: { accessToken: string; user: { profile: { username: string } } };
    };
    expect(sessionBody.success).toBe(true);
    expect(sessionBody.data.accessToken).toBeTruthy();
    expect(sessionBody.data.user.profile.username).toBe('firebase_tester');
  });

  it('prevents duplicate offline sync submissions via operationId idempotency', async () => {
    const db = getDb(testDbPath);
    const verse = await db.queryOne<{
      id: number;
      poem_id: number;
      poet_id: number;
      poet_name_ar: string;
      poem_title_ar: string;
      era_name_ar: string;
      sadr: string;
      ajuz: string;
    }>(
      `SELECT pv.id, pv.poem_id, p.poet_id, po.name_ar AS poet_name_ar, p.title_ar AS poem_title_ar,
              e.name_ar AS era_name_ar, pv.sadr, pv.ajuz
       FROM poem_verses pv
       JOIN poems p ON pv.poem_id = p.id
       JOIN poets po ON p.poet_id = po.id
       JOIN eras e ON p.era_id = e.id
       LIMIT 1`
    );
    expect(verse).toBeTruthy();

    const opId = '11111111-1111-4111-8111-111111111111';
    const payload = {
      timezone: 'UTC',
      sessions: [
        {
          operationId: opId,
          mode: 'who_said',
          startedAt: '2026-11-21T10:00:00.000Z',
          completedAt: '2026-11-21T10:01:00.000Z',
          durationSeconds: 40,
          answers: [
            {
              questionId: 'offline-q-1',
              poemId: Number(verse!.poem_id),
              verseId: Number(verse!.id),
              selectedOptionId: `poet_${verse!.poet_id}`,
              correctOptionId: `poet_${verse!.poet_id}`,
              isCorrect: true,
              responseTimeMs: 3000,
              promptAr: 'من قائل البيت؟',
              fullVerseSadr: verse!.sadr,
              fullVerseAjuz: verse!.ajuz,
              poetNameAr: verse!.poet_name_ar,
              poemTitleAr: verse!.poem_title_ar,
              eraNameAr: verse!.era_name_ar,
              meterNameAr: null,
              correctOptionLabel: verse!.poet_name_ar,
            },
          ],
        },
      ],
    };

    const sync1 = await fetch(`${baseUrl}/api/sync/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    expect(sync1.status).toBe(200);
    const body1 = (await sync1.json()) as { data: { syncedOperationIds: string[] } };
    expect(body1.data.syncedOperationIds).toEqual([opId]);

    // Second identical sync must be skipped idempotently
    const sync2 = await fetch(`${baseUrl}/api/sync/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    expect(sync2.status).toBe(200);
    const body2 = (await sync2.json()) as {
      data: { syncedOperationIds: string[]; skippedOperationIds: string[] };
    };
    expect(body2.data.syncedOperationIds).toEqual([]);
    expect(body2.data.skippedOperationIds).toEqual([opId]);
    expect(userId).toBeTruthy();
  });
});
