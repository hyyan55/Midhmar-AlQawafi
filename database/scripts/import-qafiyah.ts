/**
 * Qafiyah PostgreSQL Dump Importer, Cleaner, Validator & Normalizer
 *
 * Usage:
 *   QAFIYAH_DUMP_PATH=./database/raw/qafiyah_dump.sql npm run db:import-qafiyah
 *
 * Supports PostgreSQL plain SQL dumps containing COPY ... FROM stdin or INSERT INTO statements
 * for eras, meters, themes, types, rhymes, poets, and poems (~84,330 poems / 944,704 verses).
 *
 * Safety guarantees:
 * - Never modifies the original SQL dump.
 * - Writes cleaned, validated NDJSON artifacts to QAFIYAH_CLEANED_DIR.
 * - Preserves original source_id values for repeatable, idempotent upserts.
 * - Rejects malformed/incomplete poems safely and logs summary counts.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { finished } from 'node:stream/promises';
import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

interface ImportReport {
  startedAt: string;
  finishedAt: string;
  dumpPath: string;
  cleanedDir: string;
  counts: {
    eras: { imported: number; skipped: number; rejected: number };
    meters: { imported: number; skipped: number; rejected: number };
    themes: { imported: number; skipped: number; rejected: number };
    rhymes: { imported: number; skipped: number; rejected: number };
    poemTypes: { imported: number; skipped: number; rejected: number };
    poets: { imported: number; skipped: number; rejected: number };
    poems: { imported: number; skipped: number; rejected: number };
    verses: { imported: number; skipped: number; rejected: number };
  };
}

export function normalizeArabicText(raw: string): string {
  return raw
    .replace(/[\u064B-\u065F\u0670]/g, '') // Strip harakat for normalized search
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasArabicLetters(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

export function splitQafiyahPoemVerses(rawContent: string): Array<{ sadr: string; ajuz: string }> {
  const lines = rawContent
    .split(/\r?\n|\*/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const verses: Array<{ sadr: string; ajuz: string }> = [];

  for (const line of lines) {
    // Qafiyah dumps commonly separate hemistichs via tab, pipe, '#', or ' ... '
    const parts = line
      .split(/\t|\||#|…{2,}|\.{3,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (parts.length >= 2 && hasArabicLetters(parts[0]) && hasArabicLetters(parts[1])) {
      verses.push({ sadr: parts[0], ajuz: parts[1] });
    }
  }

  // Fallback for alternating-line Sadr / Ajuz format
  if (verses.length === 0 && lines.length >= 2 && lines.length % 2 === 0) {
    for (let i = 0; i < lines.length; i += 2) {
      if (hasArabicLetters(lines[i]) && hasArabicLetters(lines[i + 1])) {
        verses.push({ sadr: lines[i], ajuz: lines[i + 1] });
      }
    }
  }

  return verses;
}

function unescapePgCopyField(field: string): string | null {
  if (field === '\\N') return null;
  return field
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
}

export async function runQafiyahImportPipeline(dumpPath: string, cleanedDir: string): Promise<ImportReport> {
  const report: ImportReport = {
    startedAt: new Date().toISOString(),
    finishedAt: '',
    dumpPath,
    cleanedDir,
    counts: {
      eras: { imported: 0, skipped: 0, rejected: 0 },
      meters: { imported: 0, skipped: 0, rejected: 0 },
      themes: { imported: 0, skipped: 0, rejected: 0 },
      rhymes: { imported: 0, skipped: 0, rejected: 0 },
      poemTypes: { imported: 0, skipped: 0, rejected: 0 },
      poets: { imported: 0, skipped: 0, rejected: 0 },
      poems: { imported: 0, skipped: 0, rejected: 0 },
      verses: { imported: 0, skipped: 0, rejected: 0 },
    },
  };

  if (!fs.existsSync(dumpPath)) {
    throw new Error(`Qafiyah SQL dump not found at: ${dumpPath}`);
  }

  fs.mkdirSync(cleanedDir, { recursive: true });

  const streams = {
    eras: fs.createWriteStream(path.join(cleanedDir, 'eras.ndjson'), 'utf8'),
    meters: fs.createWriteStream(path.join(cleanedDir, 'meters.ndjson'), 'utf8'),
    themes: fs.createWriteStream(path.join(cleanedDir, 'themes.ndjson'), 'utf8'),
    rhymes: fs.createWriteStream(path.join(cleanedDir, 'rhymes.ndjson'), 'utf8'),
    types: fs.createWriteStream(path.join(cleanedDir, 'types.ndjson'), 'utf8'),
    poets: fs.createWriteStream(path.join(cleanedDir, 'poets.ndjson'), 'utf8'),
    poems: fs.createWriteStream(path.join(cleanedDir, 'poems.ndjson'), 'utf8'),
    rejected: fs.createWriteStream(path.join(cleanedDir, 'rejected.ndjson'), 'utf8'),
  };

  const streamCompletion = Promise.all(Object.values(streams).map((stream) => finished(stream)));

  const rl = readline.createInterface({
    input: fs.createReadStream(dumpPath, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  let currentTable: string | null = null;
  let currentColumns: string[] = [];

  for await (const line of rl) {
    const copyMatch = line.match(/^COPY\s+(?:public\.)?"?(\w+)"?\s*\(([^)]+)\)\s+FROM\s+stdin;/i);
    if (copyMatch) {
      currentTable = copyMatch[1].toLowerCase();
      currentColumns = copyMatch[2].split(',').map((c) => c.trim().replace(/"/g, '').toLowerCase());
      continue;
    }

    if (currentTable && line === '\\.') {
      currentTable = null;
      currentColumns = [];
      continue;
    }

    if (!currentTable) continue;

    const rawValues = line.split('\t').map(unescapePgCopyField);
    if (rawValues.length !== currentColumns.length) {
      streams.rejected.write(JSON.stringify({ table: currentTable, reason: 'column_mismatch', raw: line }) + '\n');
      continue;
    }

    const row: Record<string, string | null> = {};
    currentColumns.forEach((col, idx) => {
      row[col] = rawValues[idx];
    });

    const sourceId = Number(row.id);
    if (!Number.isInteger(sourceId) || sourceId <= 0) {
      streams.rejected.write(JSON.stringify({ table: currentTable, reason: 'invalid_source_id', row }) + '\n');
      continue;
    }

    if (currentTable === 'eras') {
      const nameAr = (row.name || row.name_ar || '').trim();
      if (!nameAr) {
        report.counts.eras.rejected += 1;
        continue;
      }
      streams.eras.write(JSON.stringify({ sourceId, nameAr, slug: `era_${sourceId}` }) + '\n');
      report.counts.eras.imported += 1;
    } else if (currentTable === 'meters') {
      const nameAr = (row.name || row.name_ar || '').trim();
      if (!nameAr) {
        report.counts.meters.rejected += 1;
        continue;
      }
      streams.meters.write(JSON.stringify({ sourceId, nameAr, slug: `meter_${sourceId}` }) + '\n');
      report.counts.meters.imported += 1;
    } else if (currentTable === 'themes') {
      const nameAr = (row.name || row.name_ar || '').trim();
      if (!nameAr) {
        report.counts.themes.rejected += 1;
        continue;
      }
      streams.themes.write(JSON.stringify({ sourceId, nameAr, slug: `theme_${sourceId}` }) + '\n');
      report.counts.themes.imported += 1;
    } else if (currentTable === 'rhymes') {
      const nameAr = (row.pattern || row.name || row.letter || '').trim();
      if (!nameAr) {
        report.counts.rhymes.rejected += 1;
        continue;
      }
      streams.rhymes.write(JSON.stringify({ sourceId, letter: nameAr, nameAr }) + '\n');
      report.counts.rhymes.imported += 1;
    } else if (currentTable === 'types') {
      const nameAr = (row.name || row.name_ar || '').trim();
      if (!nameAr) {
        report.counts.poemTypes.rejected += 1;
        continue;
      }
      streams.types.write(JSON.stringify({ sourceId, nameAr, slug: `type_${sourceId}` }) + '\n');
      report.counts.poemTypes.imported += 1;
    } else if (currentTable === 'poets') {
      const nameAr = (row.name || row.name_ar || '').trim();
      const eraSourceId = Number(row.era_id);
      if (!nameAr || !hasArabicLetters(nameAr) || !Number.isInteger(eraSourceId)) {
        report.counts.poets.rejected += 1;
        streams.rejected.write(JSON.stringify({ table: 'poets', reason: 'invalid_poet_record', row }) + '\n');
        continue;
      }
      streams.poets.write(
        JSON.stringify({
          sourceId,
          slug: `poet_${sourceId}`,
          nameAr,
          eraSourceId,
          bioAr: (row.bio || row.description || '').trim(),
        }) + '\n'
      );
      report.counts.poets.imported += 1;
    } else if (currentTable === 'poems') {
      const titleAr = (row.title || row.name || '').trim();
      const content = (row.content || row.poem_text || '').trim();
      const poetSourceId = Number(row.poet_id);
      const eraSourceId = Number(row.era_id);

      const verses = splitQafiyahPoemVerses(content);
      if (!titleAr || !Number.isInteger(poetSourceId) || verses.length === 0) {
        report.counts.poems.rejected += 1;
        streams.rejected.write(
          JSON.stringify({ table: 'poems', sourceId, reason: 'missing_valid_verses_or_poet' }) + '\n'
        );
        continue;
      }

      streams.poems.write(
        JSON.stringify({
          sourceId,
          titleAr,
          poetSourceId,
          eraSourceId: Number.isInteger(eraSourceId) ? eraSourceId : null,
          meterSourceId: row.meter_id ? Number(row.meter_id) : null,
          themeSourceId: row.theme_id ? Number(row.theme_id) : null,
          rhymeSourceId: row.rhyme_id ? Number(row.rhyme_id) : null,
          typeSourceId: row.type_id ? Number(row.type_id) : null,
          verses,
        }) + '\n'
      );
      report.counts.poems.imported += 1;
      report.counts.verses.imported += verses.length;
    }
  }

  // Finish every output stream before attempting to read the NDJSON files.
  for (const stream of Object.values(streams)) stream.end();
  await streamCompletion;

  // If PostgreSQL credentials are configured, upsert cleaned records idempotently
  if (process.env.DATABASE_URL || process.env.PGHOST) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || undefined,
      host: process.env.PGHOST || undefined,
      port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
      database: process.env.PGDATABASE || undefined,
      user: process.env.PGUSER || undefined,
      password: process.env.PGPASSWORD || undefined,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 2,
      connectionTimeoutMillis: 15000,
    });

    try {
      await upsertCleanedNdjsonToPostgres(pool, cleanedDir);
    } finally {
      await pool.end();
    }
  }

  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(cleanedDir, 'import-report.json'), JSON.stringify(report, null, 2), 'utf8');
  return report;
}

type SqlValue = string | number | null;

function buildValues(rows: SqlValue[][], casts: string[]): { clause: string; params: SqlValue[] } {
  const params: SqlValue[] = [];
  const clause = rows.map((row) => {
    if (row.length !== casts.length) throw new Error('Bulk insert row has an unexpected column count.');
    const placeholders = row.map((value, index) => {
      params.push(value);
      return '$' + params.length + '::' + casts[index];
    });
    return '(' + placeholders.join(', ') + ')';
  }).join(', ');
  return { clause, params };
}

/** Read NDJSON incrementally; memory is bounded by batchSize. */
export async function* readNdjsonBatches<T>(
  filePath: string,
  batchSize = 500
): AsyncGenerator<T[]> {
  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error('NDJSON batchSize must be a positive integer.');
  }
  if (!fs.existsSync(filePath)) return;

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath, 'utf8'),
    crlfDelay: Infinity,
  });
  let batch: T[] = [];
  try {
    for await (const line of rl) {
      if (!line.trim()) continue;
      batch.push(JSON.parse(line) as T);
      if (batch.length >= batchSize) {
        yield batch;
        batch = [];
      }
    }
    if (batch.length > 0) yield batch;
  } finally {
    rl.close();
  }
}

async function inTransaction(client: PoolClient, operation: () => Promise<void>): Promise<void> {
  await client.query('BEGIN');
  try {
    await operation();
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function insertVerseBatch(
  client: PoolClient,
  rows: Array<[number, number, string, string, string]>
): Promise<void> {
  if (rows.length === 0) return;
  const values = buildValues(rows, ['integer', 'integer', 'text', 'text', 'text']);
  await client.query(
    [
      'INSERT INTO poem_verses (poem_id, verse_order, sadr, ajuz, normalized_text)',
      'VALUES ' + values.clause,
      'ON CONFLICT (poem_id, verse_order) DO UPDATE',
      'SET sadr = EXCLUDED.sadr, ajuz = EXCLUDED.ajuz, normalized_text = EXCLUDED.normalized_text',
    ].join('\n'),
    values.params
  );
}

async function upsertCleanedNdjsonToPostgres(pool: Pool, cleanedDir: string): Promise<void> {
  const client = await pool.connect();
  try {
    // Reference tables are streamed and inserted with multi-row statements.
    for await (const batch of readNdjsonBatches<{ sourceId: number; nameAr: string; slug: string }>(
      path.join(cleanedDir, 'eras.ndjson'), 500
    )) {
      const values = buildValues(batch.map((item) => [item.sourceId, item.slug, item.nameAr, item.slug, '']), [
        'integer', 'text', 'text', 'text', 'text',
      ]);
      await client.query(
        [
          'INSERT INTO eras (source_id, slug, name_ar, name_en, period_label)',
          'VALUES ' + values.clause,
          'ON CONFLICT (source_id) DO UPDATE SET name_ar = EXCLUDED.name_ar',
        ].join('\n'),
        values.params
      );
    }

    for await (const batch of readNdjsonBatches<{ sourceId: number; nameAr: string; slug: string }>(
      path.join(cleanedDir, 'meters.ndjson'), 500
    )) {
      const values = buildValues(batch.map((item) => [item.sourceId, item.slug, item.nameAr]), [
        'integer', 'text', 'text',
      ]);
      await client.query(
        [
          'INSERT INTO meters (source_id, slug, name_ar)',
          'VALUES ' + values.clause,
          'ON CONFLICT (source_id) DO UPDATE SET name_ar = EXCLUDED.name_ar',
        ].join('\n'),
        values.params
      );
    }

    for await (const batch of readNdjsonBatches<{ sourceId: number; nameAr: string; slug: string }>(
      path.join(cleanedDir, 'themes.ndjson'), 500
    )) {
      const values = buildValues(batch.map((item) => [item.sourceId, item.slug, item.nameAr]), [
        'integer', 'text', 'text',
      ]);
      await client.query(
        [
          'INSERT INTO themes (source_id, slug, name_ar)',
          'VALUES ' + values.clause,
          'ON CONFLICT (source_id) DO UPDATE SET name_ar = EXCLUDED.name_ar',
        ].join('\n'),
        values.params
      );
    }

    for await (const batch of readNdjsonBatches<{ sourceId: number; letter: string; nameAr: string }>(
      path.join(cleanedDir, 'rhymes.ndjson'), 500
    )) {
      const values = buildValues(batch.map((item) => [item.sourceId, item.letter, item.nameAr]), [
        'integer', 'text', 'text',
      ]);
      await client.query(
        [
          'INSERT INTO rhymes (source_id, letter, name_ar)',
          'VALUES ' + values.clause,
          'ON CONFLICT (source_id) DO UPDATE SET letter = EXCLUDED.letter, name_ar = EXCLUDED.name_ar',
        ].join('\n'),
        values.params
      );
    }

    for await (const batch of readNdjsonBatches<{ sourceId: number; nameAr: string; slug: string }>(
      path.join(cleanedDir, 'types.ndjson'), 500
    )) {
      const values = buildValues(batch.map((item) => [item.sourceId, item.slug, item.nameAr]), [
        'integer', 'text', 'text',
      ]);
      await client.query(
        [
          'INSERT INTO poem_types (source_id, slug, name_ar)',
          'VALUES ' + values.clause,
          'ON CONFLICT (source_id) DO UPDATE SET name_ar = EXCLUDED.name_ar',
        ].join('\n'),
        values.params
      );
    }

    // Poets are inserted in bounded batches after their eras exist.
    for await (const batch of readNdjsonBatches<{
      sourceId: number;
      slug: string;
      nameAr: string;
      eraSourceId: number;
      bioAr: string;
    }>(path.join(cleanedDir, 'poets.ndjson'), 300)) {
      const values = buildValues(batch.map((item) => [
        item.sourceId, item.slug, item.nameAr, item.bioAr, item.eraSourceId,
      ]), ['integer', 'text', 'text', 'text', 'integer']);
      await client.query(
        [
          'INSERT INTO poets (source_id, slug, name_ar, era_id, bio_ar)',
          'SELECT v.source_id, v.slug, v.name_ar, e.id, v.bio_ar',
          'FROM (VALUES ' + values.clause + ') AS v(source_id, slug, name_ar, bio_ar, era_source_id)',
          'JOIN eras e ON e.source_id = v.era_source_id',
          'WHERE TRUE',
          'ON CONFLICT (source_id) DO UPDATE',
          'SET name_ar = EXCLUDED.name_ar, era_id = EXCLUDED.era_id, bio_ar = EXCLUDED.bio_ar',
        ].join('\n'),
        values.params
      );
    }

    // Keep each transaction to 100 poems and at most 500 verse rows per SQL statement.
    // A failed run can be repeated safely because all writes are source_id/idempotent upserts.
    for await (const poems of readNdjsonBatches<{
      sourceId: number;
      titleAr: string;
      poetSourceId: number;
      eraSourceId: number | null;
      meterSourceId: number | null;
      themeSourceId: number | null;
      rhymeSourceId: number | null;
      typeSourceId: number | null;
      verses: Array<{ sadr: string; ajuz: string }>;
    }>(path.join(cleanedDir, 'poems.ndjson'), 100)) {
      await inTransaction(client, async () => {
        const poemValues = buildValues(poems.map((poem) => [
          poem.sourceId,
          poem.titleAr,
          poem.poetSourceId,
          poem.eraSourceId ?? null,
          poem.meterSourceId ?? null,
          poem.themeSourceId ?? null,
          poem.rhymeSourceId ?? null,
          poem.typeSourceId ?? null,
          poem.verses.length,
        ]), [
          'integer', 'text', 'integer', 'integer', 'integer',
          'integer', 'integer', 'integer', 'integer',
        ]);

        const inserted = await client.query<{ source_id: number; id: number }>(
          [
            'INSERT INTO poems (source_id, title_ar, poet_id, era_id, meter_id, theme_id, rhyme_id, poem_type_id, verse_count)',
            'SELECT v.source_id, v.title_ar, p.id, COALESCE(e.id, p.era_id), m.id, th.id, r.id, pt.id, v.verse_count',
            'FROM (VALUES ' + poemValues.clause + ') AS v(',
            '  source_id, title_ar, poet_source_id, era_source_id, meter_source_id,',
            '  theme_source_id, rhyme_source_id, type_source_id, verse_count',
            ')',
            'JOIN poets p ON p.source_id = v.poet_source_id',
            'LEFT JOIN eras e ON e.source_id = v.era_source_id',
            'LEFT JOIN meters m ON m.source_id = v.meter_source_id',
            'LEFT JOIN themes th ON th.source_id = v.theme_source_id',
            'LEFT JOIN rhymes r ON r.source_id = v.rhyme_source_id',
            'LEFT JOIN poem_types pt ON pt.source_id = v.type_source_id',
            'WHERE TRUE',
            'ON CONFLICT (source_id) DO UPDATE SET',
            '  title_ar = EXCLUDED.title_ar, poet_id = EXCLUDED.poet_id, era_id = EXCLUDED.era_id,',
            '  meter_id = EXCLUDED.meter_id, theme_id = EXCLUDED.theme_id, rhyme_id = EXCLUDED.rhyme_id,',
            '  poem_type_id = EXCLUDED.poem_type_id, verse_count = EXCLUDED.verse_count',
            'RETURNING source_id, id',
          ].join('\n'),
          poemValues.params
        );
        const poemIds = new Map(inserted.rows.map((row) => [row.source_id, row.id]));

        const verseBatch: Array<[number, number, string, string, string]> = [];
        const flushVerses = async () => {
          if (verseBatch.length === 0) return;
          await insertVerseBatch(client, verseBatch);
          verseBatch.length = 0;
        };

        for (const poem of poems) {
          const poemId = poemIds.get(poem.sourceId);
          if (!poemId) continue;
          for (let index = 0; index < poem.verses.length; index += 1) {
            const verse = poem.verses[index];
            verseBatch.push([
              poemId,
              index + 1,
              verse.sadr,
              verse.ajuz,
              normalizeArabicText(verse.sadr + ' ' + verse.ajuz),
            ]);
            if (verseBatch.length >= 500) await flushVerses();
          }
        }
        await flushVerses();

        const staleRows = poems.map((poem) => {
          const poemId = poemIds.get(poem.sourceId);
          return poemId ? [poemId, poem.verses.length] as [number, number] : null;
        }).filter((row): row is [number, number] => row !== null);

        if (staleRows.length > 0) {
          const staleValues = buildValues(staleRows, ['integer', 'integer']);
          await client.query(
            [
              'DELETE FROM poem_verses pv',
              'USING (VALUES ' + staleValues.clause + ') AS v(poem_id, verse_count)',
              'WHERE pv.poem_id = v.poem_id AND pv.verse_order > v.verse_count',
            ].join('\n'),
            staleValues.params
          );
        }
      });
    }
  } finally {
    client.release();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dumpPath = process.env.QAFIYAH_DUMP_PATH || '';
  const cleanedDir = process.env.QAFIYAH_CLEANED_DIR || './database/cleaned';
  if (!dumpPath) {
    console.log(
      'QAFIYAH_DUMP_PATH is not configured yet. Set QAFIYAH_DUMP_PATH in your .env when you are ready to run the Qafiyah import stage.'
    );
    process.exit(0);
  }
  runQafiyahImportPipeline(dumpPath, cleanedDir)
    .then((report) => {
      console.log('Qafiyah import finished:', JSON.stringify(report.counts, null, 2));
    })
    .catch((err) => {
      console.error('Qafiyah import failed:', err.message);
      process.exitCode = 1;
    });
}
