-- PostgreSQL Normalized Schema for Arabic Poetry Challenge Platform
-- Separates the poetry corpus from user/account/gameplay state.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 1. POETRY CORPUS DOMAIN
-- ============================================================================

CREATE TABLE IF NOT EXISTS eras (
  id SERIAL PRIMARY KEY,
  source_id INTEGER UNIQUE,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name_ar VARCHAR(120) NOT NULL,
  name_en VARCHAR(120) NOT NULL,
  period_label VARCHAR(80) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meters (
  id SERIAL PRIMARY KEY,
  source_id INTEGER UNIQUE,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name_ar VARCHAR(120) NOT NULL,
  pattern_ar VARCHAR(180) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS themes (
  id SERIAL PRIMARY KEY,
  source_id INTEGER UNIQUE,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name_ar VARCHAR(120) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rhymes (
  id SERIAL PRIMARY KEY,
  source_id INTEGER UNIQUE,
  letter VARCHAR(16) NOT NULL UNIQUE,
  name_ar VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poem_types (
  id SERIAL PRIMARY KEY,
  source_id INTEGER UNIQUE,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name_ar VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poets (
  id SERIAL PRIMARY KEY,
  source_id INTEGER UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  name_ar VARCHAR(180) NOT NULL,
  title_ar VARCHAR(180),
  era_id INTEGER NOT NULL REFERENCES eras(id) ON DELETE RESTRICT,
  birth_year_label VARCHAR(60),
  death_year_label VARCHAR(60),
  bio_ar TEXT NOT NULL DEFAULT '',
  avatar_key VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poems (
  id SERIAL PRIMARY KEY,
  source_id INTEGER UNIQUE,
  title_ar VARCHAR(240) NOT NULL,
  poet_id INTEGER NOT NULL REFERENCES poets(id) ON DELETE RESTRICT,
  era_id INTEGER NOT NULL REFERENCES eras(id) ON DELETE RESTRICT,
  meter_id INTEGER REFERENCES meters(id) ON DELETE SET NULL,
  theme_id INTEGER REFERENCES themes(id) ON DELETE SET NULL,
  rhyme_id INTEGER REFERENCES rhymes(id) ON DELETE SET NULL,
  poem_type_id INTEGER REFERENCES poem_types(id) ON DELETE SET NULL,
  verse_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poem_verses (
  id SERIAL PRIMARY KEY,
  poem_id INTEGER NOT NULL REFERENCES poems(id) ON DELETE CASCADE,
  verse_order INTEGER NOT NULL,
  sadr TEXT NOT NULL,
  ajuz TEXT NOT NULL,
  normalized_text TEXT NOT NULL,
  UNIQUE (poem_id, verse_order)
);

-- ============================================================================
-- 2. USER ACCOUNTS, PROFILES, STATS & SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(40) NOT NULL UNIQUE,
  display_name VARCHAR(80) NOT NULL,
  avatar_id VARCHAR(40) NOT NULL DEFAULT 'scholar_astrolabe',
  bio VARCHAR(240) NOT NULL DEFAULT '',
  timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_stats (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_played_date DATE,
  games_played INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  daily_challenges_completed INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(16) NOT NULL DEFAULT 'light',
  sound_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  vibration_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  show_on_leaderboard BOOLEAN NOT NULL DEFAULT TRUE,
  share_activity_publicly BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. QUESTIONS, GAMEPLAY SESSIONS, DAILY CHALLENGES & ACHIEVEMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS poem_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode VARCHAR(32) NOT NULL,
  poem_id INTEGER NOT NULL REFERENCES poems(id) ON DELETE CASCADE,
  verse_id INTEGER NOT NULL REFERENCES poem_verses(id) ON DELETE CASCADE,
  prompt_ar TEXT NOT NULL,
  correct_option_key VARCHAR(64) NOT NULL,
  time_limit_seconds INTEGER NOT NULL DEFAULT 25,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS question_options (
  id SERIAL PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES poem_questions(id) ON DELETE CASCADE,
  option_key VARCHAR(64) NOT NULL,
  label_ar TEXT NOT NULL,
  secondary_label_ar TEXT,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_challenges (
  id SERIAL PRIMARY KEY,
  challenge_date DATE NOT NULL UNIQUE,
  seed_hash VARCHAR(64) NOT NULL,
  question_ids_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mode VARCHAR(32) NOT NULL,
  challenge_date DATE,
  status VARCHAR(24) NOT NULL DEFAULT 'in_progress',
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  streak_bonus_xp INTEGER NOT NULL DEFAULT 0,
  speed_bonus_xp INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  question_payload_json JSONB NOT NULL,
  operation_id UUID UNIQUE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_daily_challenge
  ON game_sessions (user_id, challenge_date)
  WHERE mode = 'daily_challenge' AND status = 'completed' AND user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS game_answers (
  id SERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  question_id VARCHAR(64) NOT NULL,
  poem_id INTEGER NOT NULL REFERENCES poems(id) ON DELETE CASCADE,
  verse_id INTEGER NOT NULL REFERENCES poem_verses(id) ON DELETE CASCADE,
  selected_option_id VARCHAR(64) NOT NULL,
  correct_option_id VARCHAR(64) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time_ms INTEGER NOT NULL DEFAULT 0,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, question_id)
);

CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  code VARCHAR(64) NOT NULL UNIQUE,
  title_ar VARCHAR(120) NOT NULL,
  description_ar TEXT NOT NULL,
  category VARCHAR(40) NOT NULL,
  xp_bonus INTEGER NOT NULL DEFAULT 0,
  criteria_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INTEGER NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS leaderboard_snapshots (
  id SERIAL PRIMARY KEY,
  period VARCHAR(24) NOT NULL,
  period_key VARCHAR(32) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  accuracy NUMERIC(5,2) NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  rank_position INTEGER NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period, period_key, user_id)
);

CREATE TABLE IF NOT EXISTS sync_operations (
  operation_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_poets_era ON poets(era_id);
CREATE INDEX IF NOT EXISTS idx_poems_poet ON poems(poet_id);
CREATE INDEX IF NOT EXISTS idx_poems_era ON poems(era_id);
CREATE INDEX IF NOT EXISTS idx_poems_meter ON poems(meter_id);
CREATE INDEX IF NOT EXISTS idx_poems_theme ON poems(theme_id);
CREATE INDEX IF NOT EXISTS idx_verses_poem ON poem_verses(poem_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON game_sessions(user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_answers_session ON game_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_period ON leaderboard_snapshots(period, period_key, rank_position);
