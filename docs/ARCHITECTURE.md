# Architecture & Security Overview

## 1. Separation of Concerns

- **Shared (`packages/shared`)**: Pure TypeScript contracts, Zod validation schemas, level curve math, and game mode metadata shared symmetrically between server and client.
- **Database (`database/` & `server/src/db/`)**: Normalized 22-table relational schema keeping the poetry corpus (`eras`, `meters`, `themes`, `rhymes`, `poem_types`, `poets`, `poems`, `poem_verses`) strictly separate from player state (`users`, `user_profiles`, `player_stats`, `player_settings`, `game_sessions`, `game_answers`, `user_achievements`, `refresh_tokens`, `sync_operations`).
- **Backend (`server/src/`)**: Express REST API with Zod request validation, rate-limited authentication endpoints, JWT Bearer authentication, transactional XP/streak computation, and Swagger/OpenAPI documentation (`/api/docs`).
- **Frontend (`src/`)**: React 19 + TypeScript + Tailwind CSS v4 mobile-first RTL web application with IndexedDB offline pack caching, background sync queue, Web Audio API feedback, and light/dark theme support.

## 2. Security Safeguards

- Password hashes use `bcryptjs` (12 salt rounds) and are never returned in API responses.
- Access tokens are short-lived JWTs stored strictly in React/JS memory (`apiClient.ts`), never in `localStorage` or `sessionStorage`.
- Refresh tokens are cryptographically random opaque tokens stored hashed (HMAC-SHA256) in `refresh_tokens`, rotated on every refresh, and transmitted via `HttpOnly` cookies with CSRF origin/header verification.
- All SQL queries across both PostgreSQL (`pg`) and SQLite (`node:sqlite`) use parameterized bindings.
- Daily challenge rewards and offline sync submissions are guarded by unique constraints (`idx_unique_user_daily_challenge` and `sync_operations.operation_id`).
