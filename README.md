# Arabic Poetry Challenge Platform (`مِضمار القوافي`)

A full-stack, mobile-first, Arabic-first (RTL) poetry challenge and literary discovery platform built with React, TypeScript, Tailwind CSS, Node.js/Express, PostgreSQL (with automatic local SQLite fallback in development), offline IndexedDB caching & synchronization, and Capacitor Android packaging readiness.

---

## Architecture Overview

```text
├── packages/
│   └── shared/                 # Shared TypeScript domain types, XP/level constants, Zod schemas
├── server/
│   └── src/
│       ├── config/             # Environment config & configurable app name
│       ├── db/                 # Dual-driver PostgreSQL (pg) & SQLite (node:sqlite) client
│       ├── middleware/         # JWT Bearer auth, CSRF guard, rate limiting, error handler
│       ├── modules/
│       │   ├── progression/    # Server-authoritative XP, levels, calendar streaks, achievements
│       │   └── questions/      # Authentic verse question generator (4 game modes)
│       ├── routes/             # REST API routers + OpenAPI/Swagger UI (/api/docs)
│       └── app.ts              # Express app factory
├── database/
│   ├── schema/001_initial.sql  # Normalized PostgreSQL DDL (22 tables)
│   ├── migrations/             # Reversible up/down SQL migrations
│   ├── seeds/                  # Verified classical & modern Arabic poetry corpus + achievements
│   └── scripts/                # CLI migrate, seed, and Qafiyah SQL dump import pipeline
├── src/
│   ├── components/             # LayoutShell, AuthModal
│   ├── context/                # AppContext (auth, guest migration, offline sync, gameplay loop)
│   ├── screens/                # Home, Modes, Gameplay, Results, Profile, Leaderboards, Library, Settings
│   ├── services/               # Typed API client (in-memory access tokens + refresh rotation)
│   ├── storage/                # IndexedDB offline pack & sync queue manager
│   └── utils/                  # Web Audio feedback, haptics, timezone/date helpers
├── tests/                      # Vitest integration & unit test suite
├── docs/                       # Architecture, API, and Capacitor Android guides
├── capacitor.config.ts         # Capacitor configuration for Android APK builds
└── server.ts                   # Standalone REST API server (port 4000 by default; serves dist/ when SERVE_SPA=true)
```

---

## Key Features

- **4 Authentic Game Modes**:
  - **من قائل البيت؟** (Identify the poet of an authentic verse)
  - **أكمل البيت** (Match the authentic second hemistich `العجز` to `الصدر`)
  - **تحدي العصور** (Historical era classification from Pre-Islamic to Modern)
  - **التحدي اليومي** (Timezone-aware daily challenge with duplicate-claim protection)
- **Decoupled UI Preview Mode**:
  - The Vite frontend runs independently on port `3000` with zero database, `.env`, or JWT secret requirements.
  - Clear Arabic status notices explain when the backend API is not yet running, without displaying fabricated/mock poetry data.
- **Server-Authoritative Progression**: XP, speed bonuses, perfect round bonuses, level progression, calendar-date streaks, and achievement unlocking are calculated exclusively on the backend inside database transactions.
- **Full Account System + Guest Migration**:
  - `bcryptjs` password hashing (cost factor 12)
  - Short-lived JWT access tokens kept strictly in memory + `HttpOnly` refresh token rotation
  - Password reset flow, change password, profile editing, privacy controls, and account deletion
  - Local guest mode with one-click progress migration upon account registration
- **Offline Gameplay & Idempotent Sync**:
  - Downloadable offline poetry & question packs stored locally
  - Queued offline results with unique UUID `operationId`s synced safely when connectivity returns
- **Poetry Library**: Search across poems, verses, poets, eras, poetic meters (`البحور`), and themes (`الأغراض`), with full poem reader and poet biographies.

---

## Local Development

### Option A: Frontend UI Development (No `.env`, PostgreSQL, or JWT secrets required)

```bash
npm install
npm run dev
```

Open `http://localhost:3000` to preview and iterate on the Arabic RTL interface immediately.

### Option B: Connect Independent Backend API

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. To forward Vite `/api/*` requests to the backend, set `VITE_API_PROXY_TARGET="http://localhost:4000"` (or `VITE_API_BASE_URL="http://localhost:4000"`).
3. Start the backend server in a second terminal:

```bash
npm run dev:api
```

- Leave `DATABASE_URL` and `PGHOST` empty to run immediately against the built-in local SQLite database (`./data/qafiyah_platform.sqlite`), or provide PostgreSQL credentials when ready.
- In development without `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`, ephemeral in-memory secrets are generated automatically. Replace placeholder values in `.env` before deploying to production.
- Interactive Swagger API documentation is available at `http://localhost:4000/api/docs` when the backend server is running.

### Optional Database CLI Commands (When Backend/DB Stage Is Ready)

```bash
npm run db:migrate
npm run db:seed
```

---

## Qafiyah Dataset Import Pipeline (Optional Stage)

When your PostgreSQL instance and local SQL dump are ready, you can import the full extracted Qafiyah PostgreSQL dump (~84,330 poems / 944,704 verses) without duplicating records or modifying the source dump:

1. Place your local SQL dump outside version control (e.g. `./database/raw/qafiyah_dump.sql`, which is excluded in `.gitignore`).
2. Configure PostgreSQL environment variables and `QAFIYAH_DUMP_PATH` in `.env`.
3. Run the repeatable cleaning, validation, and upsert pipeline:

```bash
QAFIYAH_DUMP_PATH=./database/raw/qafiyah_dump.sql npm run db:import-qafiyah
```

If `QAFIYAH_DUMP_PATH` is not configured, the import script exits cleanly without blocking the rest of the project. Cleaned NDJSON artifacts and an `import-report.json` summary (imported, skipped, rejected counts) are written to `./database/cleaned/`.

---

## Testing & Verification

```bash
npm run lint
npm test
npm run build
```

---

## GitHub Publishing Commands

Verify `.gitignore` excludes `node_modules/`, `dist/`, `.env`, `data/`, `database/raw/`, `*.sqlite`, and `android/` before committing:

```bash
git init
git add .
git status
git commit -m "feat: initial Arabic poetry challenge platform"
git branch -M main
git remote add origin <YOUR_REPOSITORY_URL>
git push -u origin main
```
