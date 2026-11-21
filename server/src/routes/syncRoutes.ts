import crypto from 'node:crypto';
import { Router } from 'express';
import {
  syncSessionsSchema,
  type OfflinePackPayload,
  type OfflineQuestionPack,
  type PoemDetail,
} from '../../../packages/shared/src/index.ts';
import { getDb } from '../db/database.ts';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.ts';
import { asyncHandler } from '../middleware/errorHandler.ts';
import { applySessionProgressionTx } from '../modules/progression/progressionService.ts';
import { generateQuestionsForMode } from '../modules/questions/questionEngine.ts';
import { loadAuthUserBundle } from './authRoutes.ts';

const router = Router();

router.get(
  '/pack',
  asyncHandler(async (_req, res) => {
    const db = getDb();

    const [eras, meters, themes, poets, poems] = await Promise.all([
      db.query('SELECT * FROM eras ORDER BY sort_order ASC'),
      db.query('SELECT * FROM meters ORDER BY id ASC'),
      db.query('SELECT * FROM themes ORDER BY id ASC'),
      db.query<{
        id: number;
        source_id: number | null;
        slug: string;
        name_ar: string;
        title_ar: string | null;
        era_id: number;
        era_name_ar: string;
        birth_year_label: string | null;
        death_year_label: string | null;
        bio_ar: string;
        avatar_key: string | null;
      }>(
        `SELECT po.*, e.name_ar AS era_name_ar
         FROM poets po
         JOIN eras e ON po.era_id = e.id
         ORDER BY po.id ASC`
      ),
      db.query<{
        id: number;
        source_id: number | null;
        title_ar: string;
        poet_id: number;
        poet_name_ar: string;
        poet_bio_ar: string;
        era_id: number;
        era_name_ar: string;
        era_period: string;
        meter_id: number | null;
        meter_name_ar: string | null;
        theme_id: number | null;
        theme_name_ar: string | null;
        rhyme_id: number | null;
        rhyme_name_ar: string | null;
        poem_type_id: number | null;
        poem_type_name_ar: string | null;
        verse_count: number;
      }>(
        `SELECT
           p.id, p.source_id, p.title_ar,
           po.id AS poet_id, po.name_ar AS poet_name_ar, po.bio_ar AS poet_bio_ar,
           e.id AS era_id, e.name_ar AS era_name_ar, e.period_label AS era_period,
           m.id AS meter_id, m.name_ar AS meter_name_ar,
           th.id AS theme_id, th.name_ar AS theme_name_ar,
           rh.id AS rhyme_id, rh.name_ar AS rhyme_name_ar,
           pt.id AS poem_type_id, pt.name_ar AS poem_type_name_ar,
           p.verse_count
         FROM poems p
         JOIN poets po ON p.poet_id = po.id
         JOIN eras e ON p.era_id = e.id
         LEFT JOIN meters m ON p.meter_id = m.id
         LEFT JOIN themes th ON p.theme_id = th.id
         LEFT JOIN rhymes rh ON p.rhyme_id = rh.id
         LEFT JOIN poem_types pt ON p.poem_type_id = pt.id
         ORDER BY p.id ASC
         LIMIT 50`
      ),
    ]);

    const allVerses = await db.query<{
      id: number;
      poem_id: number;
      verse_order: number;
      sadr: string;
      ajuz: string;
    }>('SELECT id, poem_id, verse_order, sadr, ajuz FROM poem_verses ORDER BY poem_id ASC, verse_order ASC');

    const versesByPoem = new Map<number, PoemDetail['verses']>();
    for (const v of allVerses) {
      const pid = Number(v.poem_id);
      const list = versesByPoem.get(pid) ?? [];
      list.push({
        id: Number(v.id),
        poemId: pid,
        verseOrder: Number(v.verse_order),
        sadr: v.sadr,
        ajuz: v.ajuz,
      });
      versesByPoem.set(pid, list);
    }

    const poemDetails: PoemDetail[] = poems.map((p) => {
      const pVerses = versesByPoem.get(Number(p.id)) ?? [];
      return {
        id: Number(p.id),
        sourceId: p.source_id ? Number(p.source_id) : null,
        titleAr: p.title_ar,
        poetId: Number(p.poet_id),
        poetNameAr: p.poet_name_ar,
        poetBioAr: p.poet_bio_ar,
        eraId: Number(p.era_id),
        eraNameAr: p.era_name_ar,
        poetEraPeriod: p.era_period,
        meterId: p.meter_id ? Number(p.meter_id) : null,
        meterNameAr: p.meter_name_ar,
        themeId: p.theme_id ? Number(p.theme_id) : null,
        themeNameAr: p.theme_name_ar,
        rhymeId: p.rhyme_id ? Number(p.rhyme_id) : null,
        rhymeNameAr: p.rhyme_name_ar,
        poemTypeId: p.poem_type_id ? Number(p.poem_type_id) : null,
        poemTypeNameAr: p.poem_type_name_ar,
        verseCount: Number(p.verse_count),
        excerptSadr: pVerses[0]?.sadr || '',
        excerptAjuz: pVerses[0]?.ajuz || '',
        verses: pVerses,
      };
    });

    const [whoSaidQs, completeQs, eraQs] = await Promise.all([
      generateQuestionsForMode(db, { mode: 'who_said', count: 15 }),
      generateQuestionsForMode(db, { mode: 'complete_verse', count: 15 }),
      generateQuestionsForMode(db, { mode: 'era_challenge', count: 15 }),
    ]);

    const questionPacks: OfflineQuestionPack[] = [
      { packId: crypto.randomUUID(), generatedAt: new Date().toISOString(), mode: 'who_said', questions: whoSaidQs },
      { packId: crypto.randomUUID(), generatedAt: new Date().toISOString(), mode: 'complete_verse', questions: completeQs },
      { packId: crypto.randomUUID(), generatedAt: new Date().toISOString(), mode: 'era_challenge', questions: eraQs },
    ];

    const payload: OfflinePackPayload = {
      version: '1.0.0',
      downloadedAt: new Date().toISOString(),
      eras: eras.map((e) => ({
        id: Number(e.id),
        sourceId: e.source_id ? Number(e.source_id) : null,
        slug: String(e.slug),
        nameAr: String(e.name_ar),
        nameEn: String(e.name_en),
        periodLabel: String(e.period_label),
        description: String(e.description),
        sortOrder: Number(e.sort_order),
      })),
      meters: meters.map((m) => ({
        id: Number(m.id),
        sourceId: m.source_id ? Number(m.source_id) : null,
        slug: String(m.slug),
        nameAr: String(m.name_ar),
        patternAr: String(m.pattern_ar),
        description: String(m.description),
      })),
      themes: themes.map((t) => ({
        id: Number(t.id),
        sourceId: t.source_id ? Number(t.source_id) : null,
        slug: String(t.slug),
        nameAr: String(t.name_ar),
        description: String(t.description),
      })),
      poets: poets.map((po) => ({
        id: Number(po.id),
        sourceId: po.source_id ? Number(po.source_id) : null,
        slug: po.slug,
        nameAr: po.name_ar,
        titleAr: po.title_ar,
        eraId: Number(po.era_id),
        eraNameAr: po.era_name_ar,
        birthYearLabel: po.birth_year_label,
        deathYearLabel: po.death_year_label,
        bioAr: po.bio_ar,
        avatarKey: po.avatar_key,
      })),
      poems: poemDetails,
      questionPacks,
    };

    res.json({ success: true, data: payload });
  })
);

router.post(
  '/sessions',
  requireAuth,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const parsed = syncSessionsSchema.parse(req.body);
    const db = getDb();
    const userId = req.authUser!.userId;
    const timezone = parsed.timezone || 'UTC';

    const syncedOperationIds: string[] = [];
    const skippedOperationIds: string[] = [];

    await db.transaction(async (tx) => {
      for (const item of parsed.sessions) {
        const existingOp = await tx.queryOne<{ operation_id: string }>(
          'SELECT operation_id FROM sync_operations WHERE operation_id = $1',
          [item.operationId]
        );
        if (existingOp) {
          skippedOperationIds.push(item.operationId);
          continue;
        }

        // Verify referenced answers against authoritative verses in DB when available
        const verifiedAnswers: Array<{ isCorrect: boolean; responseTimeMs: number }> = [];
        for (const ans of item.answers) {
          const verseExists = await tx.queryOne<{ id: number }>(
            'SELECT id FROM poem_verses WHERE id = $1 AND poem_id = $2',
            [ans.verseId, ans.poemId]
          );
          if (!verseExists) continue;
          verifiedAnswers.push({
            isCorrect: ans.selectedOptionId === ans.correctOptionId && ans.isCorrect,
            responseTimeMs: ans.responseTimeMs,
          });
        }

        const completedDate = item.completedAt.slice(0, 10);
        const progression = await applySessionProgressionTx(tx, {
          userId,
          mode: item.mode,
          totalQuestions: item.answers.length,
          answers: verifiedAnswers,
          timezone,
          completedAtDate: /^\d{4}-\d{2}-\d{2}$/.test(completedDate) ? completedDate : undefined,
        });

        const sessionId = crypto.randomUUID();
        await tx.execute(
          `INSERT INTO game_sessions (
             id, user_id, mode, status, total_questions, correct_count,
             xp_earned, streak_bonus_xp, speed_bonus_xp, duration_seconds,
             question_payload_json, operation_id, started_at, completed_at
           ) VALUES ($1, $2, $3, 'completed', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            sessionId,
            userId,
            item.mode,
            item.answers.length,
            progression.rewards.correctCount,
            progression.rewards.totalXpEarned,
            progression.rewards.streakBonusXp,
            progression.rewards.speedBonusXp,
            item.durationSeconds,
            JSON.stringify(item.answers),
            item.operationId,
            item.startedAt,
            item.completedAt,
          ]
        );

        await tx.execute(
          'INSERT INTO sync_operations (operation_id, user_id) VALUES ($1, $2)',
          [item.operationId, userId]
        );

        syncedOperationIds.push(item.operationId);
      }
    });

    const userBundle = await loadAuthUserBundle(db, userId);

    res.json({
      success: true,
      data: {
        syncedOperationIds,
        skippedOperationIds,
        user: userBundle,
      },
    });
  })
);

export default router;
