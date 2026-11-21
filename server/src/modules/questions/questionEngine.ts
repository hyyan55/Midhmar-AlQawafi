import crypto from 'node:crypto';
import type { ChallengeQuestion, GameMode, QuestionOption } from '../../../../packages/shared/src/types.ts';
import { GAME_MODES_META } from '../../../../packages/shared/src/constants.ts';
import type { DbClient } from '../../db/database.ts';

export interface StoredQuestionWithAnswer extends ChallengeQuestion {
  correctOptionId: string;
  correctOptionLabel: string;
  poetNameAr: string;
  poemTitleAr: string;
  fullVerseSadr: string;
  fullVerseAjuz: string;
}

interface VerseJoinRow {
  verse_id: number;
  poem_id: number;
  poem_title_ar: string;
  sadr: string;
  ajuz: string;
  poet_id: number;
  poet_name_ar: string;
  poet_title_ar: string | null;
  era_id: number;
  era_name_ar: string;
  era_period: string;
  meter_name_ar: string | null;
}

function deterministicHash(seed: string): number {
  const hex = crypto.createHash('sha256').update(seed).digest('hex').slice(0, 8);
  return parseInt(hex, 16);
}

function seededShuffle<T>(items: T[], seed?: string): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = seed
      ? deterministicHash(`${seed}:${i}`) % (i + 1)
      : Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function generateQuestionsForMode(
  db: DbClient,
  params: {
    mode: GameMode;
    count?: number;
    eraId?: number;
    excludeVerseIds?: number[];
    seed?: string;
  }
): Promise<StoredQuestionWithAnswer[]> {
  const meta = GAME_MODES_META[params.mode];
  const targetCount = params.count ?? meta.questionCount;

  const allVerses = await db.query<VerseJoinRow>(
    `SELECT
       pv.id AS verse_id,
       p.id AS poem_id,
       p.title_ar AS poem_title_ar,
       pv.sadr,
       pv.ajuz,
       po.id AS poet_id,
       po.name_ar AS poet_name_ar,
       po.title_ar AS poet_title_ar,
       e.id AS era_id,
       e.name_ar AS era_name_ar,
       e.period_label AS era_period,
       m.name_ar AS meter_name_ar
     FROM poem_verses pv
     JOIN poems p ON pv.poem_id = p.id
     JOIN poets po ON p.poet_id = po.id
     JOIN eras e ON p.era_id = e.id
     LEFT JOIN meters m ON p.meter_id = m.id
     ORDER BY pv.id ASC`
  );

  const allPoets = await db.query<{
    id: number;
    name_ar: string;
    era_id: number;
    era_name_ar: string;
  }>(
    `SELECT po.id, po.name_ar, po.era_id, e.name_ar AS era_name_ar
     FROM poets po
     JOIN eras e ON po.era_id = e.id`
  );

  const allEras = await db.query<{
    id: number;
    name_ar: string;
    period_label: string;
  }>('SELECT id, name_ar, period_label FROM eras ORDER BY sort_order ASC');

  let pool = params.eraId
    ? allVerses.filter((v) => Number(v.era_id) === params.eraId)
    : allVerses;

  if (pool.length === 0) {
    pool = allVerses;
  }

  const excluded = new Set(params.excludeVerseIds ?? []);
  const unseen = pool.filter((v) => !excluded.has(Number(v.verse_id)));
  const candidates = unseen.length >= targetCount ? unseen : pool;

  const shuffledVerses = seededShuffle(candidates, params.seed);
  const selectedVerses: VerseJoinRow[] = [];
  const usedPoems = new Set<number>();

  for (const verse of shuffledVerses) {
    if (selectedVerses.length >= targetCount) break;
    if (!usedPoems.has(Number(verse.poem_id)) || selectedVerses.length + (shuffledVerses.length - selectedVerses.length) <= targetCount) {
      selectedVerses.push(verse);
      usedPoems.add(Number(verse.poem_id));
    }
  }

  // Ensure exact target count if poems were fewer than targetCount
  if (selectedVerses.length < targetCount) {
    const selectedIds = new Set(selectedVerses.map((v) => v.verse_id));
    for (const v of shuffledVerses) {
      if (selectedVerses.length >= targetCount) break;
      if (!selectedIds.has(v.verse_id)) {
        selectedVerses.push(v);
      }
    }
  }

  return selectedVerses.map((verse, idx) => {
    const subMode: Exclude<GameMode, 'daily_challenge'> =
      params.mode === 'daily_challenge'
        ? (['who_said', 'complete_verse', 'era_challenge'][idx % 3] as Exclude<GameMode, 'daily_challenge'>)
        : params.mode;

    const qSeed = params.seed ? `${params.seed}:q:${idx}` : undefined;
    const questionId = params.seed
      ? `q_${deterministicHash(`${params.seed}_${verse.verse_id}_${idx}`).toString(16)}`
      : crypto.randomUUID();

    if (subMode === 'who_said') {
      const sameEraDistractors = allPoets.filter(
        (p) => Number(p.id) !== Number(verse.poet_id) && Number(p.era_id) === Number(verse.era_id)
      );
      const otherPoets = allPoets.filter((p) => Number(p.id) !== Number(verse.poet_id));
      const distractorPool = seededShuffle(
        [...sameEraDistractors, ...otherPoets.filter((o) => !sameEraDistractors.some((s) => s.id === o.id))],
        qSeed
      );

      const distinctDistractors: typeof allPoets = [];
      const seenPoetIds = new Set<number>([Number(verse.poet_id)]);
      for (const p of distractorPool) {
        if (distinctDistractors.length >= 3) break;
        if (!seenPoetIds.has(Number(p.id))) {
          seenPoetIds.add(Number(p.id));
          distinctDistractors.push(p);
        }
      }

      const options: QuestionOption[] = seededShuffle(
        [
          {
            id: `poet_${verse.poet_id}`,
            label: verse.poet_name_ar,
            secondaryLabel: verse.era_name_ar,
          },
          ...distinctDistractors.map((d) => ({
            id: `poet_${d.id}`,
            label: d.name_ar,
            secondaryLabel: d.era_name_ar,
          })),
        ],
        qSeed
      );

      return {
        id: questionId,
        orderIndex: idx,
        mode: params.mode,
        promptAr: 'من قائل هذا البيت الشعري؟',
        verseSadr: verse.sadr,
        verseAjuz: verse.ajuz,
        poemId: Number(verse.poem_id),
        verseId: Number(verse.verse_id),
        eraNameAr: verse.era_name_ar,
        meterNameAr: verse.meter_name_ar,
        options,
        timeLimitSeconds: meta.timeLimitSeconds,
        correctOptionId: `poet_${verse.poet_id}`,
        correctOptionLabel: verse.poet_name_ar,
        poetNameAr: verse.poet_name_ar,
        poemTitleAr: verse.poem_title_ar,
        fullVerseSadr: verse.sadr,
        fullVerseAjuz: verse.ajuz,
      };
    }

    if (subMode === 'complete_verse') {
      const sameMeterVerses = allVerses.filter(
        (v) =>
          Number(v.verse_id) !== Number(verse.verse_id) &&
          v.ajuz !== verse.ajuz &&
          v.meter_name_ar === verse.meter_name_ar
      );
      const otherVerses = allVerses.filter(
        (v) => Number(v.verse_id) !== Number(verse.verse_id) && v.ajuz !== verse.ajuz
      );
      const distractorPool = seededShuffle(
        [
          ...sameMeterVerses,
          ...otherVerses.filter((o) => !sameMeterVerses.some((s) => s.verse_id === o.verse_id)),
        ],
        qSeed
      );

      const distinctAjuz: VerseJoinRow[] = [];
      const seenAjuz = new Set<string>([verse.ajuz]);
      for (const candidate of distractorPool) {
        if (distinctAjuz.length >= 3) break;
        if (!seenAjuz.has(candidate.ajuz)) {
          seenAjuz.add(candidate.ajuz);
          distinctAjuz.push(candidate);
        }
      }

      const options: QuestionOption[] = seededShuffle(
        [
          { id: `verse_${verse.verse_id}`, label: verse.ajuz },
          ...distinctAjuz.map((d) => ({
            id: `verse_${d.verse_id}`,
            label: d.ajuz,
          })),
        ],
        qSeed
      );

      return {
        id: questionId,
        orderIndex: idx,
        mode: params.mode,
        promptAr: 'اختر العجز الصحيح لإكمال هذا البيت:',
        verseSadr: verse.sadr,
        poemId: Number(verse.poem_id),
        verseId: Number(verse.verse_id),
        eraNameAr: verse.era_name_ar,
        meterNameAr: verse.meter_name_ar,
        options,
        timeLimitSeconds: meta.timeLimitSeconds,
        correctOptionId: `verse_${verse.verse_id}`,
        correctOptionLabel: verse.ajuz,
        poetNameAr: verse.poet_name_ar,
        poemTitleAr: verse.poem_title_ar,
        fullVerseSadr: verse.sadr,
        fullVerseAjuz: verse.ajuz,
      };
    }

    // Mode C: era_challenge
    const otherEras = seededShuffle(
      allEras.filter((e) => Number(e.id) !== Number(verse.era_id)),
      qSeed
    ).slice(0, 3);

    const options: QuestionOption[] = seededShuffle(
      [
        {
          id: `era_${verse.era_id}`,
          label: verse.era_name_ar,
          secondaryLabel: verse.era_period,
        },
        ...otherEras.map((e) => ({
          id: `era_${e.id}`,
          label: e.name_ar,
          secondaryLabel: e.period_label,
        })),
      ],
      qSeed
    );

    return {
      id: questionId,
      orderIndex: idx,
      mode: params.mode,
      promptAr: `إلى أي عصرٍ أدبيٍّ ينتمي الشاعر ${verse.poet_name_ar} صاحب هذا البيت؟`,
      verseSadr: verse.sadr,
      verseAjuz: verse.ajuz,
      poemId: Number(verse.poem_id),
      verseId: Number(verse.verse_id),
      eraNameAr: verse.era_name_ar,
      meterNameAr: verse.meter_name_ar,
      options,
      timeLimitSeconds: meta.timeLimitSeconds,
      correctOptionId: `era_${verse.era_id}`,
      correctOptionLabel: verse.era_name_ar,
      poetNameAr: verse.poet_name_ar,
      poemTitleAr: verse.poem_title_ar,
      fullVerseSadr: verse.sadr,
      fullVerseAjuz: verse.ajuz,
    };
  });
}

export function stripAnswerSecrets(q: StoredQuestionWithAnswer): ChallengeQuestion {
  return {
    id: q.id,
    orderIndex: q.orderIndex,
    mode: q.mode,
    promptAr: q.promptAr,
    verseSadr: q.verseSadr,
    verseAjuz: q.verseAjuz,
    poemId: q.poemId,
    verseId: q.verseId,
    eraNameAr: q.eraNameAr,
    meterNameAr: q.meterNameAr,
    options: q.options,
    timeLimitSeconds: q.timeLimitSeconds,
  };
}
