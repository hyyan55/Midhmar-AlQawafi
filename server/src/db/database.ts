import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Pool, type PoolClient } from 'pg';
import { env } from '../config/env.ts';
import {
  SEED_ACHIEVEMENTS,
  SEED_ERAS,
  SEED_METERS,
  SEED_POEM_TYPES,
  SEED_POEMS,
  SEED_POETS,
  SEED_RHYMES,
  SEED_THEMES,
} from '../../../database/seeds/authentic_poetry_seed.ts';

export type SqlParam = string | number | boolean | null;

export interface DbClient {
  dialect: 'postgres' | 'sqlite';
  query<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T[]>;
  queryOne<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T | null>;
  execute(sql: string, params?: SqlParam[]): Promise<{ rowCount: number; lastInsertId?: number }>;
  transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T>;
}

const usePostgres = Boolean(env.databaseUrl || env.pgHost);

let pgPool: Pool | null = null;
let sqliteInstance: DatabaseSync | null = null;

function getPgPool(): Pool {
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: env.databaseUrl || undefined,
      host: env.pgHost || undefined,
      port: env.pgPort,
      database: env.pgDatabase || undefined,
      user: env.pgUser || undefined,
      password: env.pgPassword || undefined,
      ssl: env.pgSsl
        ? {
            ca: fs.readFileSync('/etc/secrets/ca.pem', 'utf8'),
            rejectUnauthorized: true,
          }
        : false,
      max: 10,
      connectionTimeoutMillis: 15000,
    });
    pgPool.on('error', (err) => {
      console.error('Idle PostgreSQL pool error:', err);
    });
  }
  return pgPool;
}

function getSqliteDb(customPath?: string): DatabaseSync {
  if (!sqliteInstance) {
    const dbPath = customPath || env.sqlitePath;
    if (dbPath !== ':memory:') {
      fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
    }
    sqliteInstance = new DatabaseSync(dbPath);
    sqliteInstance.exec('PRAGMA foreign_keys = ON;');
    sqliteInstance.exec('PRAGMA journal_mode = WAL;');
  }
  return sqliteInstance;
}

/**
 * Translates PostgreSQL positional parameters ($1, $2...) into SQLite '?'
 * placeholders, expanding repeated parameter references safely.
 */
function translatePgSqlToSqlite(sql: string, params: SqlParam[]): { sql: string; params: SqlParam[] } {
  const expandedParams: SqlParam[] = [];
  const translated = sql.replace(/\$(\d+)/g, (_match, indexStr) => {
    const idx = Number(indexStr) - 1;
    expandedParams.push(params[idx] ?? null);
    return '?';
  });
  return { sql: translated, params: expandedParams };
}

function normalizeSqliteParams(params: SqlParam[]): Array<string | number | null> {
  return params.map((p) => {
    if (typeof p === 'boolean') return p ? 1 : 0;
    return p ?? null;
  });
}

function isPgPool(client: Pool | PoolClient): client is Pool {
  return 'connect' in client && typeof (client as Pool).connect === 'function';
}

function makePgClient(client: Pool | PoolClient): DbClient {
  return {
    dialect: 'postgres',
    async query<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
      const result = await client.query(sql, params);
      return result.rows as T[];
    },
    async queryOne<T>(sql: string, params: SqlParam[] = []): Promise<T | null> {
      const result = await client.query(sql, params);
      return (result.rows[0] as T | undefined) ?? null;
    },
    async execute(sql: string, params: SqlParam[] = []) {
      const result = await client.query(sql, params);
      const firstRow = result.rows[0] as { id?: number } | undefined;
      return {
        rowCount: result.rowCount ?? 0,
        lastInsertId: firstRow?.id,
      };
    },
    async transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
      const poolClient = isPgPool(client) ? await client.connect() : client;
      const shouldRelease = isPgPool(client);
      try {
        await poolClient.query('BEGIN');
        const txClient = makePgClient(poolClient);
        const out = await fn(txClient);
        await poolClient.query('COMMIT');
        return out;
      } catch (error) {
        await poolClient.query('ROLLBACK');
        throw error;
      } finally {
        if (shouldRelease) {
          (poolClient as PoolClient).release();
        }
      }
    },
  };
}

function makeSqliteClient(sqlite: DatabaseSync, inTx = false): DbClient {
  return {
    dialect: 'sqlite',
    async query<T>(sql: string, params: SqlParam[] = []): Promise<T[]> {
      const mapped = translatePgSqlToSqlite(sql, params);
      const stmt = sqlite.prepare(mapped.sql);
      return stmt.all(...normalizeSqliteParams(mapped.params)) as T[];
    },
    async queryOne<T>(sql: string, params: SqlParam[] = []): Promise<T | null> {
      const mapped = translatePgSqlToSqlite(sql, params);
      const stmt = sqlite.prepare(mapped.sql);
      return (stmt.get(...normalizeSqliteParams(mapped.params)) as T | undefined) ?? null;
    },
    async execute(sql: string, params: SqlParam[] = []) {
      const mapped = translatePgSqlToSqlite(sql, params);
      const stmt = sqlite.prepare(mapped.sql);
      if (/\bRETURNING\b/i.test(mapped.sql)) {
        const row = stmt.get(...normalizeSqliteParams(mapped.params)) as { id?: number } | undefined;
        return {
          rowCount: row ? 1 : 0,
          lastInsertId: row?.id !== undefined ? Number(row.id) : undefined,
        };
      }
      const info = stmt.run(...normalizeSqliteParams(mapped.params));
      return {
        rowCount: Number(info.changes ?? 0),
        lastInsertId: info.lastInsertRowid !== undefined ? Number(info.lastInsertRowid) : undefined,
      };
    },
    async transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
      if (inTx) {
        return fn(this);
      }
      sqlite.exec('BEGIN IMMEDIATE;');
      try {
        const out = await fn(makeSqliteClient(sqlite, true));
        sqlite.exec('COMMIT;');
        return out;
      } catch (error) {
        sqlite.exec('ROLLBACK;');
        throw error;
      }
    },
  };
}

export function getDb(customSqlitePath?: string): DbClient {
  if (usePostgres && !customSqlitePath) {
    return makePgClient(getPgPool());
  }
  return makeSqliteClient(getSqliteDb(customSqlitePath));
}

export function resetSqliteForTests(sqlitePath: string): void {
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
  }
  getSqliteDb(sqlitePath);
}

const SQLITE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS eras (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  period_label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  pattern_ar TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS themes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rhymes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER UNIQUE,
  letter TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS poem_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS poets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  title_ar TEXT,
  era_id INTEGER NOT NULL REFERENCES eras(id),
  birth_year_label TEXT,
  death_year_label TEXT,
  bio_ar TEXT NOT NULL DEFAULT '',
  avatar_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS poems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER UNIQUE,
  title_ar TEXT NOT NULL,
  poet_id INTEGER NOT NULL REFERENCES poets(id),
  era_id INTEGER NOT NULL REFERENCES eras(id),
  meter_id INTEGER REFERENCES meters(id),
  theme_id INTEGER REFERENCES themes(id),
  rhyme_id INTEGER REFERENCES rhymes(id),
  poem_type_id INTEGER REFERENCES poem_types(id),
  verse_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS poem_verses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  poem_id INTEGER NOT NULL REFERENCES poems(id) ON DELETE CASCADE,
  verse_order INTEGER NOT NULL,
  sadr TEXT NOT NULL,
  ajuz TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  UNIQUE(poem_id, verse_order)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_id TEXT NOT NULL DEFAULT 'scholar_astrolabe',
  bio TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS player_stats (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_played_date TEXT,
  games_played INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  daily_challenges_completed INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS player_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'light',
  sound_enabled INTEGER NOT NULL DEFAULT 1,
  vibration_enabled INTEGER NOT NULL DEFAULT 1,
  show_on_leaderboard INTEGER NOT NULL DEFAULT 1,
  share_activity_publicly INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS poem_questions (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL,
  poem_id INTEGER NOT NULL REFERENCES poems(id) ON DELETE CASCADE,
  verse_id INTEGER NOT NULL REFERENCES poem_verses(id) ON DELETE CASCADE,
  prompt_ar TEXT NOT NULL,
  correct_option_key TEXT NOT NULL,
  time_limit_seconds INTEGER NOT NULL DEFAULT 25,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS question_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question_id TEXT NOT NULL REFERENCES poem_questions(id) ON DELETE CASCADE,
  option_key TEXT NOT NULL,
  label_ar TEXT NOT NULL,
  secondary_label_ar TEXT,
  is_correct INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_date TEXT NOT NULL UNIQUE,
  seed_hash TEXT NOT NULL,
  question_ids_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL,
  challenge_date TEXT,
  status TEXT NOT NULL DEFAULT 'in_progress',
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  streak_bonus_xp INTEGER NOT NULL DEFAULT 0,
  speed_bonus_xp INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  question_payload_json TEXT NOT NULL,
  operation_id TEXT UNIQUE,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_daily_challenge
  ON game_sessions (user_id, challenge_date)
  WHERE mode = 'daily_challenge' AND status = 'completed' AND user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS game_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  poem_id INTEGER NOT NULL REFERENCES poems(id) ON DELETE CASCADE,
  verse_id INTEGER NOT NULL REFERENCES poem_verses(id) ON DELETE CASCADE,
  selected_option_id TEXT NOT NULL,
  correct_option_id TEXT NOT NULL,
  is_correct INTEGER NOT NULL,
  response_time_ms INTEGER NOT NULL DEFAULT 0,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  answered_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(session_id, question_id)
);

CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  title_ar TEXT NOT NULL,
  description_ar TEXT NOT NULL,
  category TEXT NOT NULL,
  xp_bonus INTEGER NOT NULL DEFAULT 0,
  criteria_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period TEXT NOT NULL,
  period_key TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  accuracy REAL NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  rank_position INTEGER NOT NULL,
  captured_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(period, period_key, user_id)
);

CREATE TABLE IF NOT EXISTS sync_operations (
  operation_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  processed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

export function normalizeArabicSearch(text: string): string {
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function runMigrations(customSqlitePath?: string): Promise<void> {
  const db = getDb(customSqlitePath);
  if (db.dialect === 'sqlite') {
    const sqlite = getSqliteDb(customSqlitePath);
    sqlite.exec(SQLITE_SCHEMA_SQL);
    return;
  }
  const schemaPath = path.resolve(process.cwd(), 'database/schema/001_initial.sql');
  const pgSchemaSql = fs.readFileSync(schemaPath, 'utf8');
  await getPgPool().query(pgSchemaSql);
}

export async function seedAuthenticPoetry(customSqlitePath?: string): Promise<void> {
  const db = getDb(customSqlitePath);

  await db.transaction(async (tx) => {
    for (const era of SEED_ERAS) {
      await tx.execute(
        `INSERT INTO eras (source_id, slug, name_ar, name_en, period_label, description, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (slug) DO UPDATE SET name_ar = EXCLUDED.name_ar, period_label = EXCLUDED.period_label, description = EXCLUDED.description`,
        [era.sourceId, era.slug, era.nameAr, era.nameEn, era.periodLabel, era.description, era.sortOrder]
      );
    }

    for (const meter of SEED_METERS) {
      await tx.execute(
        `INSERT INTO meters (source_id, slug, name_ar, pattern_ar, description)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO UPDATE SET name_ar = EXCLUDED.name_ar, pattern_ar = EXCLUDED.pattern_ar`,
        [meter.sourceId, meter.slug, meter.nameAr, meter.patternAr, meter.description]
      );
    }

    for (const theme of SEED_THEMES) {
      await tx.execute(
        `INSERT INTO themes (source_id, slug, name_ar, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO UPDATE SET name_ar = EXCLUDED.name_ar, description = EXCLUDED.description`,
        [theme.sourceId, theme.slug, theme.nameAr, theme.description]
      );
    }

    for (const rhyme of SEED_RHYMES) {
      await tx.execute(
        `INSERT INTO rhymes (source_id, letter, name_ar)
         VALUES ($1, $2, $3)
         ON CONFLICT (letter) DO UPDATE SET name_ar = EXCLUDED.name_ar`,
        [rhyme.sourceId, rhyme.letter, rhyme.nameAr]
      );
    }

    for (const ptype of SEED_POEM_TYPES) {
      await tx.execute(
        `INSERT INTO poem_types (source_id, slug, name_ar)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name_ar = EXCLUDED.name_ar`,
        [ptype.sourceId, ptype.slug, ptype.nameAr]
      );
    }

    for (const poet of SEED_POETS) {
      const era = await tx.queryOne<{ id: number }>('SELECT id FROM eras WHERE slug = $1', [poet.eraSlug]);
      if (!era) continue;
      await tx.execute(
        `INSERT INTO poets (source_id, slug, name_ar, title_ar, era_id, birth_year_label, death_year_label, bio_ar, avatar_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (slug) DO UPDATE SET name_ar = EXCLUDED.name_ar, bio_ar = EXCLUDED.bio_ar, title_ar = EXCLUDED.title_ar`,
        [
          poet.sourceId,
          poet.slug,
          poet.nameAr,
          poet.titleAr,
          era.id,
          poet.birthYearLabel,
          poet.deathYearLabel,
          poet.bioAr,
          poet.avatarKey,
        ]
      );
    }

    for (const poem of SEED_POEMS) {
      const poet = await tx.queryOne<{ id: number }>('SELECT id FROM poets WHERE slug = $1', [poem.poetSlug]);
      const era = await tx.queryOne<{ id: number }>('SELECT id FROM eras WHERE slug = $1', [poem.eraSlug]);
      const meter = await tx.queryOne<{ id: number }>('SELECT id FROM meters WHERE slug = $1', [poem.meterSlug]);
      const theme = await tx.queryOne<{ id: number }>('SELECT id FROM themes WHERE slug = $1', [poem.themeSlug]);
      const rhyme = await tx.queryOne<{ id: number }>('SELECT id FROM rhymes WHERE letter = $1', [poem.rhymeLetter]);
      const ptype = await tx.queryOne<{ id: number }>('SELECT id FROM poem_types WHERE slug = $1', [poem.poemTypeSlug]);
      if (!poet || !era) continue;

      await tx.execute(
        `INSERT INTO poems (source_id, title_ar, poet_id, era_id, meter_id, theme_id, rhyme_id, poem_type_id, verse_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (source_id) DO UPDATE SET title_ar = EXCLUDED.title_ar, verse_count = EXCLUDED.verse_count`,
        [
          poem.sourceId,
          poem.titleAr,
          poet.id,
          era.id,
          meter?.id ?? null,
          theme?.id ?? null,
          rhyme?.id ?? null,
          ptype?.id ?? null,
          poem.verses.length,
        ]
      );

      const poemRow = await tx.queryOne<{ id: number }>('SELECT id FROM poems WHERE source_id = $1', [poem.sourceId]);
      if (!poemRow) continue;

      for (let i = 0; i < poem.verses.length; i += 1) {
        const v = poem.verses[i];
        await tx.execute(
          `INSERT INTO poem_verses (poem_id, verse_order, sadr, ajuz, normalized_text)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (poem_id, verse_order) DO UPDATE SET sadr = EXCLUDED.sadr, ajuz = EXCLUDED.ajuz, normalized_text = EXCLUDED.normalized_text`,
          [poemRow.id, i + 1, v.sadr, v.ajuz, normalizeArabicSearch(`${v.sadr} ${v.ajuz}`)]
        );
      }
    }

    for (const ach of SEED_ACHIEVEMENTS) {
      await tx.execute(
        `INSERT INTO achievements (code, title_ar, description_ar, category, xp_bonus)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (code) DO UPDATE SET title_ar = EXCLUDED.title_ar, description_ar = EXCLUDED.description_ar, xp_bonus = EXCLUDED.xp_bonus`,
        [ach.code, ach.titleAr, ach.descriptionAr, ach.category, ach.xpBonus]
      );
    }
  });
}

let bootInitPromise: Promise<void> | null = null;

export async function ensureDatabaseInitialized(customSqlitePath?: string): Promise<void> {
  if (!bootInitPromise || customSqlitePath) {
    const task = (async () => {
      await runMigrations(customSqlitePath);
      const db = getDb(customSqlitePath);
      const existing = await db.queryOne<{ count: number | string }>('SELECT COUNT(*) as count FROM poems');
      if (Number(existing?.count || 0) === 0) {
        await seedAuthenticPoetry(customSqlitePath);
      }
    })();
    if (customSqlitePath) return task;
    bootInitPromise = task;
  }
  return bootInitPromise;
}
