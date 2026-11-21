import { Router } from 'express';
import { getDb, normalizeArabicSearch, type SqlParam } from '../db/database.ts';
import { AppError, asyncHandler } from '../middleware/errorHandler.ts';

const router = Router();

router.get(
  '/taxonomy',
  asyncHandler(async (_req, res) => {
    const db = getDb();
    const [eras, meters, themes, rhymes, poemTypes] = await Promise.all([
      db.query('SELECT * FROM eras ORDER BY sort_order ASC'),
      db.query('SELECT * FROM meters ORDER BY id ASC'),
      db.query('SELECT * FROM themes ORDER BY id ASC'),
      db.query('SELECT * FROM rhymes ORDER BY id ASC'),
      db.query('SELECT * FROM poem_types ORDER BY id ASC'),
    ]);

    res.json({
      success: true,
      data: {
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
        rhymes: rhymes.map((r) => ({
          id: Number(r.id),
          sourceId: r.source_id ? Number(r.source_id) : null,
          letter: String(r.letter),
          nameAr: String(r.name_ar),
        })),
        poemTypes: poemTypes.map((pt) => ({
          id: Number(pt.id),
          sourceId: pt.source_id ? Number(pt.source_id) : null,
          slug: String(pt.slug),
          nameAr: String(pt.name_ar),
        })),
      },
    });
  })
);

router.get(
  '/poets',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const eraId = req.query.eraId ? Number(req.query.eraId) : null;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const conditions: string[] = [];
    const params: SqlParam[] = [];

    if (eraId && Number.isInteger(eraId)) {
      params.push(eraId);
      conditions.push(`po.era_id = $${params.length}`);
    }
    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(po.name_ar LIKE $${params.length} OR po.bio_ar LIKE $${params.length})`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await db.query<{
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
      poem_count: number;
    }>(
      `SELECT
         po.id, po.source_id, po.slug, po.name_ar, po.title_ar, po.era_id,
         e.name_ar AS era_name_ar, po.birth_year_label, po.death_year_label, po.bio_ar, po.avatar_key,
         COUNT(pm.id) AS poem_count
       FROM poets po
       JOIN eras e ON po.era_id = e.id
       LEFT JOIN poems pm ON pm.poet_id = po.id
       ${whereClause}
       GROUP BY po.id, e.name_ar
       ORDER BY po.id ASC`,
      params
    );

    res.json({
      success: true,
      data: rows.map((r) => ({
        id: Number(r.id),
        sourceId: r.source_id ? Number(r.source_id) : null,
        slug: r.slug,
        nameAr: r.name_ar,
        titleAr: r.title_ar,
        eraId: Number(r.era_id),
        eraNameAr: r.era_name_ar,
        birthYearLabel: r.birth_year_label,
        deathYearLabel: r.death_year_label,
        bioAr: r.bio_ar,
        avatarKey: r.avatar_key,
        poemCount: Number(r.poem_count),
      })),
    });
  })
);

router.get(
  '/poets/:id',
  asyncHandler(async (req, res) => {
    const poetId = Number(req.params.id);
    if (!Number.isInteger(poetId)) {
      throw new AppError(400, 'INVALID_POET_ID', 'معرف الشاعر غير صالح');
    }

    const db = getDb();
    const poet = await db.queryOne<{
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
       WHERE po.id = $1`,
      [poetId]
    );

    if (!poet) {
      throw new AppError(404, 'POET_NOT_FOUND', 'الشاعر غير موجود');
    }

    const poems = await db.query<{
      id: number;
      title_ar: string;
      verse_count: number;
      meter_name_ar: string | null;
      theme_name_ar: string | null;
    }>(
      `SELECT p.id, p.title_ar, p.verse_count, m.name_ar AS meter_name_ar, th.name_ar AS theme_name_ar
       FROM poems p
       LEFT JOIN meters m ON p.meter_id = m.id
       LEFT JOIN themes th ON p.theme_id = th.id
       WHERE p.poet_id = $1
       ORDER BY p.id ASC`,
      [poetId]
    );

    res.json({
      success: true,
      data: {
        poet: {
          id: Number(poet.id),
          sourceId: poet.source_id ? Number(poet.source_id) : null,
          slug: poet.slug,
          nameAr: poet.name_ar,
          titleAr: poet.title_ar,
          eraId: Number(poet.era_id),
          eraNameAr: poet.era_name_ar,
          birthYearLabel: poet.birth_year_label,
          deathYearLabel: poet.death_year_label,
          bioAr: poet.bio_ar,
          avatarKey: poet.avatar_key,
          poemCount: poems.length,
        },
        poems: poems.map((p) => ({
          id: Number(p.id),
          titleAr: p.title_ar,
          verseCount: Number(p.verse_count),
          meterNameAr: p.meter_name_ar,
          themeNameAr: p.theme_name_ar,
        })),
      },
    });
  })
);

router.get(
  '/poems',
  asyncHandler(async (req, res) => {
    const db = getDb();
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;

    const eraId = req.query.eraId ? Number(req.query.eraId) : null;
    const meterId = req.query.meterId ? Number(req.query.meterId) : null;
    const themeId = req.query.themeId ? Number(req.query.themeId) : null;
    const poetId = req.query.poetId ? Number(req.query.poetId) : null;
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';

    const conditions: string[] = [];
    const params: SqlParam[] = [];

    if (eraId && Number.isInteger(eraId)) {
      params.push(eraId);
      conditions.push(`p.era_id = $${params.length}`);
    }
    if (meterId && Number.isInteger(meterId)) {
      params.push(meterId);
      conditions.push(`p.meter_id = $${params.length}`);
    }
    if (themeId && Number.isInteger(themeId)) {
      params.push(themeId);
      conditions.push(`p.theme_id = $${params.length}`);
    }
    if (poetId && Number.isInteger(poetId)) {
      params.push(poetId);
      conditions.push(`p.poet_id = $${params.length}`);
    }
    if (q) {
      const normalized = normalizeArabicSearch(q);
      params.push(`%${q}%`);
      const qIdx = params.length;
      params.push(`%${normalized}%`);
      const normIdx = params.length;
      conditions.push(
        `(p.title_ar LIKE $${qIdx} OR po.name_ar LIKE $${qIdx} OR EXISTS (SELECT 1 FROM poem_verses pv2 WHERE pv2.poem_id = p.id AND pv2.normalized_text LIKE $${normIdx}))`
      );
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await db.queryOne<{ total: number }>(
      `SELECT COUNT(*) AS total
       FROM poems p
       JOIN poets po ON p.poet_id = po.id
       ${whereClause}`,
      params
    );

    const total = Number(countRow?.total || 0);
    const listParams = [...params, limit, offset];

    const rows = await db.query<{
      id: number;
      source_id: number | null;
      title_ar: string;
      poet_id: number;
      poet_name_ar: string;
      era_id: number;
      era_name_ar: string;
      meter_id: number | null;
      meter_name_ar: string | null;
      theme_id: number | null;
      theme_name_ar: string | null;
      rhyme_id: number | null;
      rhyme_name_ar: string | null;
      poem_type_id: number | null;
      poem_type_name_ar: string | null;
      verse_count: number;
      excerpt_sadr: string | null;
      excerpt_ajuz: string | null;
    }>(
      `SELECT
         p.id, p.source_id, p.title_ar,
         po.id AS poet_id, po.name_ar AS poet_name_ar,
         e.id AS era_id, e.name_ar AS era_name_ar,
         m.id AS meter_id, m.name_ar AS meter_name_ar,
         th.id AS theme_id, th.name_ar AS theme_name_ar,
         rh.id AS rhyme_id, rh.name_ar AS rhyme_name_ar,
         pt.id AS poem_type_id, pt.name_ar AS poem_type_name_ar,
         p.verse_count,
         fv.sadr AS excerpt_sadr,
         fv.ajuz AS excerpt_ajuz
       FROM poems p
       JOIN poets po ON p.poet_id = po.id
       JOIN eras e ON p.era_id = e.id
       LEFT JOIN meters m ON p.meter_id = m.id
       LEFT JOIN themes th ON p.theme_id = th.id
       LEFT JOIN rhymes rh ON p.rhyme_id = rh.id
       LEFT JOIN poem_types pt ON p.poem_type_id = pt.id
       LEFT JOIN poem_verses fv ON fv.poem_id = p.id AND fv.verse_order = 1
       ${whereClause}
       ORDER BY p.id ASC
       LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`,
      listParams
    );

    res.json({
      success: true,
      data: rows.map((r) => ({
        id: Number(r.id),
        sourceId: r.source_id ? Number(r.source_id) : null,
        titleAr: r.title_ar,
        poetId: Number(r.poet_id),
        poetNameAr: r.poet_name_ar,
        eraId: Number(r.era_id),
        eraNameAr: r.era_name_ar,
        meterId: r.meter_id ? Number(r.meter_id) : null,
        meterNameAr: r.meter_name_ar,
        themeId: r.theme_id ? Number(r.theme_id) : null,
        themeNameAr: r.theme_name_ar,
        rhymeId: r.rhyme_id ? Number(r.rhyme_id) : null,
        rhymeNameAr: r.rhyme_name_ar,
        poemTypeId: r.poem_type_id ? Number(r.poem_type_id) : null,
        poemTypeNameAr: r.poem_type_name_ar,
        verseCount: Number(r.verse_count),
        excerptSadr: r.excerpt_sadr || '',
        excerptAjuz: r.excerpt_ajuz || '',
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  })
);

router.get(
  '/poems/:id',
  asyncHandler(async (req, res) => {
    const poemId = Number(req.params.id);
    if (!Number.isInteger(poemId)) {
      throw new AppError(400, 'INVALID_POEM_ID', 'معرف القصيدة غير صالح');
    }

    const db = getDb();
    const row = await db.queryOne<{
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
       WHERE p.id = $1`,
      [poemId]
    );

    if (!row) {
      throw new AppError(404, 'POEM_NOT_FOUND', 'القصيدة غير موجودة');
    }

    const verses = await db.query<{
      id: number;
      poem_id: number;
      verse_order: number;
      sadr: string;
      ajuz: string;
    }>('SELECT id, poem_id, verse_order, sadr, ajuz FROM poem_verses WHERE poem_id = $1 ORDER BY verse_order ASC', [
      poemId,
    ]);

    res.json({
      success: true,
      data: {
        id: Number(row.id),
        sourceId: row.source_id ? Number(row.source_id) : null,
        titleAr: row.title_ar,
        poetId: Number(row.poet_id),
        poetNameAr: row.poet_name_ar,
        poetBioAr: row.poet_bio_ar,
        eraId: Number(row.era_id),
        eraNameAr: row.era_name_ar,
        poetEraPeriod: row.era_period,
        meterId: row.meter_id ? Number(row.meter_id) : null,
        meterNameAr: row.meter_name_ar,
        themeId: row.theme_id ? Number(row.theme_id) : null,
        themeNameAr: row.theme_name_ar,
        rhymeId: row.rhyme_id ? Number(row.rhyme_id) : null,
        rhymeNameAr: row.rhyme_name_ar,
        poemTypeId: row.poem_type_id ? Number(row.poem_type_id) : null,
        poemTypeNameAr: row.poem_type_name_ar,
        verseCount: Number(row.verse_count),
        excerptSadr: verses[0]?.sadr || '',
        excerptAjuz: verses[0]?.ajuz || '',
        verses: verses.map((v) => ({
          id: Number(v.id),
          poemId: Number(v.poem_id),
          verseOrder: Number(v.verse_order),
          sadr: v.sadr,
          ajuz: v.ajuz,
        })),
      },
    });
  })
);

export default router;
