import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const required = ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'] as const;
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing PostgreSQL settings: ${missing.join(', ')}`);
}

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl: process.env.PGSSL === 'true' || process.env.PGSSL === 'require'
    ? { rejectUnauthorized: false }
    : undefined,
  max: 1,
  connectionTimeoutMillis: 15000,
});

async function main() {
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;

    // Temporary tables shadow public tables for this connection only.
    // Nothing in the real application tables is inserted or changed.
    await client.query(`
      CREATE TEMP TABLE eras (
        id SERIAL PRIMARY KEY, source_id INTEGER UNIQUE, slug TEXT NOT NULL UNIQUE,
        name_ar TEXT NOT NULL, name_en TEXT NOT NULL, period_label TEXT NOT NULL
      );
      CREATE TEMP TABLE meters (
        id SERIAL PRIMARY KEY, source_id INTEGER UNIQUE, slug TEXT NOT NULL UNIQUE, name_ar TEXT NOT NULL
      );
      CREATE TEMP TABLE themes (
        id SERIAL PRIMARY KEY, source_id INTEGER UNIQUE, slug TEXT NOT NULL UNIQUE, name_ar TEXT NOT NULL
      );
      CREATE TEMP TABLE rhymes (
        id SERIAL PRIMARY KEY, source_id INTEGER UNIQUE, letter TEXT NOT NULL UNIQUE, name_ar TEXT NOT NULL
      );
      CREATE TEMP TABLE poem_types (
        id SERIAL PRIMARY KEY, source_id INTEGER UNIQUE, slug TEXT NOT NULL UNIQUE, name_ar TEXT NOT NULL
      );
      CREATE TEMP TABLE poets (
        id SERIAL PRIMARY KEY, source_id INTEGER UNIQUE, slug TEXT NOT NULL UNIQUE, name_ar TEXT NOT NULL,
        era_id INTEGER NOT NULL REFERENCES eras(id), bio_ar TEXT NOT NULL
      );
      CREATE TEMP TABLE poems (
        id SERIAL PRIMARY KEY, source_id INTEGER UNIQUE, title_ar TEXT NOT NULL,
        poet_id INTEGER NOT NULL REFERENCES poets(id), era_id INTEGER NOT NULL REFERENCES eras(id),
        meter_id INTEGER REFERENCES meters(id), theme_id INTEGER REFERENCES themes(id),
        rhyme_id INTEGER REFERENCES rhymes(id), poem_type_id INTEGER REFERENCES poem_types(id),
        verse_count INTEGER NOT NULL
      );
      CREATE TEMP TABLE poem_verses (
        id SERIAL PRIMARY KEY, poem_id INTEGER NOT NULL REFERENCES poems(id) ON DELETE CASCADE,
        verse_order INTEGER NOT NULL, sadr TEXT NOT NULL, ajuz TEXT NOT NULL,
        normalized_text TEXT NOT NULL, UNIQUE (poem_id, verse_order)
      );
    `);

    await client.query(`
      INSERT INTO eras (source_id, slug, name_ar, name_en, period_label)
      VALUES (1, 'era_1', 'العصر الجاهلي', 'era_1', '')
      ON CONFLICT (source_id) DO UPDATE SET name_ar = EXCLUDED.name_ar
    `);
    await client.query(`
      INSERT INTO meters (source_id, slug, name_ar) VALUES (1, 'meter_1', 'الطويل')
      ON CONFLICT (source_id) DO UPDATE SET name_ar = EXCLUDED.name_ar
    `);
    await client.query(`
      INSERT INTO themes (source_id, slug, name_ar) VALUES (1, 'theme_1', 'الحكمة')
      ON CONFLICT (source_id) DO UPDATE SET name_ar = EXCLUDED.name_ar
    `);
    await client.query(`
      INSERT INTO rhymes (source_id, letter, name_ar) VALUES (1, 'م', 'الميم')
      ON CONFLICT (source_id) DO UPDATE SET letter = EXCLUDED.letter, name_ar = EXCLUDED.name_ar
    `);
    await client.query(`
      INSERT INTO poem_types (source_id, slug, name_ar) VALUES (1, 'type_1', 'قصيدة')
      ON CONFLICT (source_id) DO UPDATE SET name_ar = EXCLUDED.name_ar
    `);

    await client.query(`
      INSERT INTO poets (source_id, slug, name_ar, era_id, bio_ar)
      SELECT v.source_id, v.slug, v.name_ar, e.id, v.bio_ar
      FROM (VALUES (1::integer, 'poet_1'::text, 'امرؤ القيس'::text, ''::text, 1::integer))
        AS v(source_id, slug, name_ar, bio_ar, era_source_id)
      JOIN eras e ON e.source_id = v.era_source_id
      WHERE TRUE
      ON CONFLICT (source_id) DO UPDATE
      SET name_ar = EXCLUDED.name_ar, era_id = EXCLUDED.era_id, bio_ar = EXCLUDED.bio_ar
    `);

    const poemInsert = await client.query<{ id: number }>(`
      INSERT INTO poems
        (source_id, title_ar, poet_id, era_id, meter_id, theme_id, rhyme_id, poem_type_id, verse_count)
      SELECT v.source_id, v.title_ar, p.id, COALESCE(e.id, p.era_id), m.id, th.id, r.id, pt.id, v.verse_count
      FROM (VALUES
        (1::integer, 'معلقة تجريبية'::text, 1::integer, 1::integer, 1::integer,
         1::integer, 1::integer, 1::integer, 2::integer)
      ) AS v(source_id, title_ar, poet_source_id, era_source_id, meter_source_id,
             theme_source_id, rhyme_source_id, type_source_id, verse_count)
      JOIN poets p ON p.source_id = v.poet_source_id
      LEFT JOIN eras e ON e.source_id = v.era_source_id
      LEFT JOIN meters m ON m.source_id = v.meter_source_id
      LEFT JOIN themes th ON th.source_id = v.theme_source_id
      LEFT JOIN rhymes r ON r.source_id = v.rhyme_source_id
      LEFT JOIN poem_types pt ON pt.source_id = v.type_source_id
      WHERE TRUE
      ON CONFLICT (source_id) DO UPDATE SET
        title_ar = EXCLUDED.title_ar, poet_id = EXCLUDED.poet_id, era_id = EXCLUDED.era_id,
        meter_id = EXCLUDED.meter_id, theme_id = EXCLUDED.theme_id, rhyme_id = EXCLUDED.rhyme_id,
        poem_type_id = EXCLUDED.poem_type_id, verse_count = EXCLUDED.verse_count
      RETURNING id
    `);

    const poemId = poemInsert.rows[0]?.id;
    if (!poemId) throw new Error('Poem INSERT ... SELECT returned no row.');

    await client.query(`
      INSERT INTO poem_verses (poem_id, verse_order, sadr, ajuz, normalized_text)
      VALUES ($1, 1, 'قفا نبك من ذكرى حبيب ومنزل', 'بسقط اللوى بين الدخول فحومل', 'قفا نبك من ذكرى حبيب ومنزل بسقط اللوى بين الدخول فحومل'),
             ($1, 2, 'فتوضح فالمقراة لم يعف رسمها', 'لما نسجتها من جنوب وشمأل', 'فتوضح فالمقراة لم يعف رسمها لما نسجتها من جنوب وشمأل')
      ON CONFLICT (poem_id, verse_order) DO UPDATE
      SET sadr = EXCLUDED.sadr, ajuz = EXCLUDED.ajuz, normalized_text = EXCLUDED.normalized_text
    `, [poemId]);

    await client.query(`
      DELETE FROM poem_verses pv
      USING (VALUES ($1::integer, 2::integer)) AS v(poem_id, verse_count)
      WHERE pv.poem_id = v.poem_id AND pv.verse_order > v.verse_count
    `, [poemId]);

    const counts = await client.query(`
      SELECT
        (SELECT count(*)::int FROM eras) AS eras,
        (SELECT count(*)::int FROM poets) AS poets,
        (SELECT count(*)::int FROM poems) AS poems,
        (SELECT count(*)::int FROM poem_verses) AS verses
    `);
    const result = counts.rows[0];
    if (result.eras !== 1 || result.poets !== 1 || result.poems !== 1 || result.verses !== 2) {
      throw new Error(`Unexpected temporary-table counts: ${JSON.stringify(result)}`);
    }

    await client.query('ROLLBACK');
    transactionOpen = false;
    console.log('POSTGRES SQL TEST PASSED');
    console.log('Temporary fixture counts:', result);
    console.log('ROLLBACK completed; no application data was changed.');
  } catch (error) {
    if (transactionOpen) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error('POSTGRES SQL TEST FAILED:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
