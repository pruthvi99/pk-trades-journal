# PK Trades Journal — Complete Technical Reference

> **For AI Agents:** This document is the single source of truth for the entire application. Read this before making any changes. It covers every layer: architecture, auth, database, API, metrics engine, frontend, and deployment.

---

## Table of Contents

1. [Application Overview](#1-application-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Authentication System](#4-authentication-system)
5. [Database Schema](#5-database-schema)
6. [Query Layer](#6-query-layer)
7. [P&L Engine](#7-pl-engine)
8. [Metrics Engine](#8-metrics-engine)
9. [API Reference](#9-api-reference)
10. [Frontend Pages](#10-frontend-pages)
11. [Component Library](#11-component-library)
12. [User Settings](#12-user-settings)
13. [Tag System](#13-tag-system)
14. [Default Tag Seeding](#14-default-tag-seeding)
15. [Migrations](#15-migrations)
16. [Development Setup](#16-development-setup)
17. [Production Deployment](#17-production-deployment)
18. [UAT Test Users](#18-uat-test-users)
19. [Known Constraints & Design Decisions](#19-known-constraints--design-decisions)

---

## 1. Application Overview

PK Trades Journal is a **multi-user, self-hosted trading journal** built for retail options and stock traders. The core workflows are:

1. **Log trades** — open a trade with entry executions, add/close with exit executions, tag and grade them.
2. **Review performance** — dashboard with headline stats, equity curve, drawdown, win streaks.
3. **Deep analytics** — time analysis, behavioral patterns, edge slicing by symbol/strategy/tag/hour/quality.
4. **Psychology tracking** — pre-trade mood, confidence, sleep; post-trade satisfaction, mistakes, lessons.

The app is intentionally **opinionated and minimal**: no external auth providers, no cloud database, no third-party analytics—just SQLite + Next.js running on a single DigitalOcean droplet.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Runtime | Node.js (server), Edge (middleware) |
| Database | SQLite via `better-sqlite3` |
| ORM | Drizzle ORM |
| Auth | Custom HMAC-SHA256 signed cookies |
| Validation | Zod v4 (`import { z } from 'zod/v4'`) |
| Charts | Recharts |
| Styling | Tailwind CSS with custom `pk-*` design tokens |
| Process Manager | PM2 (production) |
| Reverse Proxy | Caddy (production) |
| UI Components | Custom components + shadcn/ui primitives |

### Key Design Tokens (CSS variables)
```
--pk-purple: #7c5cfc
--pk-purple-bright: #9b82ff
--pk-bg: dark background
--pk-border: #1a1a1f
--pk-border-strong: slightly lighter border
--pk-muted: muted text color
--pk-red: red for losses
--pk-green: green for profits
```

---

## 3. Project Structure

```
pk_trades_journal/
├── app/
│   ├── (app)/                    # Authenticated app routes (route group)
│   │   ├── dashboard/page.tsx    # Main dashboard with headline stats + charts
│   │   ├── trades/
│   │   │   ├── new/page.tsx      # New trade form
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Trade detail server page
│   │   │       └── client.tsx    # Trade detail client (tabs, close dialog, edit)
│   │   ├── analytics/page.tsx    # Deep analytics: time, behavioral, risk, edge
│   │   ├── journal/page.tsx      # Trades list with filters + CSV export
│   │   ├── calendar/page.tsx     # Calendar heatmap of daily P&L
│   │   ├── settings/page.tsx     # User settings (balance, timezone, commission)
│   │   └── layout.tsx            # App shell layout (sidebar, nav)
│   ├── login/page.tsx            # Passcode login
│   ├── signup/page.tsx           # New user signup
│   ├── api/                      # API routes (Next.js route handlers)
│   │   ├── auth/
│   │   │   ├── login/route.ts    # POST /api/auth/login
│   │   │   ├── logout/route.ts   # POST /api/auth/logout
│   │   │   └── signup/route.ts   # POST /api/auth/signup
│   │   ├── trades/
│   │   │   ├── route.ts          # GET/POST /api/trades
│   │   │   ├── [id]/route.ts     # GET/PATCH/DELETE /api/trades/[id]
│   │   │   └── symbols/route.ts  # GET /api/trades/symbols (autocomplete)
│   │   ├── executions/
│   │   │   ├── route.ts          # POST /api/executions (add execution to trade)
│   │   │   └── [id]/route.ts     # DELETE /api/executions/[id]
│   │   ├── strategies/
│   │   │   ├── route.ts          # GET/POST /api/strategies
│   │   │   └── [id]/route.ts     # PATCH /api/strategies/[id]
│   │   ├── tags/
│   │   │   ├── route.ts          # GET/POST /api/tags
│   │   │   └── [id]/route.ts     # PATCH /api/tags/[id]
│   │   ├── metrics/route.ts      # GET /api/metrics (dashboard metrics)
│   │   ├── analytics/route.ts    # GET /api/analytics (deep analytics)
│   │   ├── calendar/route.ts     # GET /api/calendar?year=&month= (daily P&L)
│   │   ├── settings/route.ts     # GET/PATCH /api/settings
│   │   └── admin/
│   │       ├── backup/route.ts   # Admin DB backup
│   │       └── db/snapshot/route.ts
├── components/
│   ├── primitives/               # Low-level reusable UI
│   │   ├── badge.tsx             # Status badge (variant: win/loss/open/mistake)
│   │   ├── chip-select.tsx       # Pill-shaped multi-select chip grid
│   │   └── ...
│   ├── trade/                    # Trade-specific form components
│   │   ├── psychology-fields.tsx # Pre/post psychology fields
│   │   ├── execution-builder.tsx # Execution + leg builder
│   │   ├── edit-trade-dialog.tsx # Full edit dialog
│   │   └── ...
│   └── ui/                       # shadcn/ui components (Button, Dialog, etc.)
├── lib/
│   ├── auth.ts                   # Auth utilities (HMAC, createUser, session)
│   ├── pnl.ts                    # P&L computation engine (pure functions)
│   ├── time.ts                   # UTC timestamp utility
│   ├── validators/               # Zod schemas for request validation
│   │   ├── trade.ts
│   │   ├── execution.ts
│   │   ├── strategy.ts
│   │   └── tag.ts
│   ├── db/
│   │   ├── client.ts             # Drizzle client (singleton, lazy init)
│   │   ├── schema.ts             # All table definitions + relations + type exports
│   │   ├── queries.ts            # All CRUD functions (the only place DB is touched)
│   │   └── seed-defaults.ts      # Default tag seeding for new users
│   └── metrics/                  # Analytics computation (all pure functions)
│       ├── headline.ts           # Win rate, P&L, profit factor, Kelly, etc.
│       ├── distribution.ts       # Equity curve, drawdown, streaks, R distribution
│       ├── edge.ts               # Edge slicing: by symbol, strategy, tag, hour, etc.
│       ├── risk.ts               # Risk metrics: avg risk, plan adherence
│       ├── psychology.ts         # Mood vs outcome, sleep vs win rate
│       ├── behavioral.ts         # Tilt detection, revenge trades, overtrading
│       ├── time-analysis.ts      # Monthly/weekly P&L, rolling metrics, heatmap
│       └── advanced-risk.ts      # Sharpe, Sortino, Calmar, underwater curve
├── db/
│   ├── migrations/               # SQL migration files (Drizzle push format)
│   │   ├── 0000_*.sql
│   │   ├── 0001_*.sql
│   │   ├── ...
│   │   └── meta/_journal.json    # Drizzle migration journal
├── scripts/
│   ├── uat-seed.mjs              # Creates 6 test users + 23 trades + DB assertions
│   ├── uat-api-test.mjs          # 73 HTTP API tests against live server
│   └── apply-migration-0004.mjs  # Manual migration helper (strategies unique)
├── middleware.ts                 # Edge route protection (HMAC verify)
├── next.config.ts
├── drizzle.config.ts
└── package.json
```

---

## 4. Authentication System

### Overview

Authentication is **custom-built** — no NextAuth, no Clerk, no JWT libraries. The system uses:

- **6-digit passcodes** (no usernames, no email/password)
- **HMAC-SHA256 signed session cookies** stored in `pk_session` (underscore, not hyphen)
- **30-day TTL** sessions
- **Edge-compatible** verification in middleware (Web Crypto API only)

### Passcode Rules (`lib/auth.ts → validatePasscode`)

Passcodes must:
- Be exactly 6 digits
- Not be all the same digit (111111, 222222, etc.)
- Not be a simple sequential pattern (123456, 654321, 012345, etc.)

### Session Token Format

```
base64(JSON { userId, iat }).base64(HMAC-SHA256 signature)
```

The token is split at `.` — exactly two parts. The payload is base64-encoded JSON, the signature is base64-encoded HMAC-SHA256 over the encoded payload string.

### Cookie: `pk_session`

- **Name:** `pk_session` (underscore — never hyphen)
- **Flags:** `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000`
- **Value:** May be URL-encoded by the framework — always `decodeURIComponent()` before verification
- **Content:** `{payload}.{signature}` where payload = `btoa(JSON.stringify({ userId, iat }))`

### Key Functions

| Function | Location | Description |
|----------|----------|-------------|
| `validatePasscode(passcode)` | `lib/auth.ts` | Returns `{ valid, error? }` |
| `createUser(passcode, displayName?)` | `lib/auth.ts` | Creates user + seeds 26 default tags |
| `findUserByPasscode(passcode)` | `lib/auth.ts` | Lookup user by passcode |
| `createSessionToken(userId)` | `lib/auth.ts` | Returns signed token string |
| `verifySessionToken(token)` | `lib/auth.ts` | Returns boolean |
| `getUserIdFromRequest(request)` | `lib/auth.ts` | Parses cookie → returns userId or null |

### Dev Mode (no SESSION_SECRET)

If `SESSION_SECRET` is not set or is shorter than 32 chars:
- **Middleware** allows all requests through
- **`getUserIdFromRequest`** returns the admin user ID (`00000000-0000-0000-0000-000000090909`)

This means the app is fully usable in development without setting up any env vars.

### Middleware (`middleware.ts`)

Runs on Edge runtime. Protects all routes except:
- `/login`, `/signup`, `/design`
- `/api/auth/**` (login, logout, signup)
- `/api/admin/**` (admin endpoints)
- `/_next/**`, `/favicon.ico`

On invalid/missing session: redirects to `/login` with **307** (not 401). API clients should handle this.

### Admin User

The admin user is created by the initial migration:
- **ID:** `00000000-0000-0000-0000-000000090909`
- **Passcode:** `090909`
- **isAdmin:** `true`

### Auth API Endpoints

#### `POST /api/auth/login`
```json
// Request
{ "passcode": "123456" }
// Response 200 — sets pk_session cookie
{ "userId": "uuid", "displayName": "Alice" }
// Response 401
{ "error": "Invalid passcode" }
```

#### `POST /api/auth/signup`
```json
// Request
{ "passcode": "789012", "displayName": "Alice" }
// Response 201 — sets pk_session cookie
{ "userId": "uuid" }
// Response 400
{ "error": "Passcode must be exactly 6 digits" }
// Response 409
{ "error": "Passcode already taken" }
```

#### `POST /api/auth/logout`
Clears the `pk_session` cookie. Returns `{ "ok": true }`.

---

## 5. Database Schema

Database: SQLite file at `/var/data/pk_trades.db` (production), `./pk_trades.db` (dev, auto-created).

All schemas are defined in `lib/db/schema.ts` using Drizzle ORM.

### Conventions

- UUIDs stored as `TEXT` (SQLite has no native UUID type)
- Timestamps stored as ISO 8601 UTC strings (`TEXT`)
- Booleans stored as `INTEGER` 0/1
- Enums stored as `TEXT`, validated by Zod at API boundary

### Table: `users`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID v4 |
| `passcode` | TEXT UNIQUE NOT NULL | 6-digit string |
| `display_name` | TEXT | Optional display name |
| `is_admin` | INTEGER | Boolean (0/1), default 0 |
| `created_at` | TEXT | ISO 8601 UTC |

### Table: `user_settings`

Per-user key-value store for application settings.

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | TEXT NOT NULL → users.id CASCADE | |
| `key` | TEXT NOT NULL | Setting key |
| `value` | TEXT | Setting value as string |
| `updated_at` | TEXT | ISO 8601 UTC |

Primary key: `(user_id, key)` composite.

### Table: `strategies`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID v4 |
| `user_id` | TEXT → users.id | Per-user |
| `name` | TEXT NOT NULL | Strategy name |
| `description` | TEXT | Optional |
| `default_instrument` | TEXT | enum: `option`, `stock` |
| `archived` | INTEGER | Boolean, default 0 |
| `created_at` | TEXT | ISO 8601 UTC |
| `updated_at` | TEXT | ISO 8601 UTC |

**Unique index:** `strategies_user_name_unique` on `(user_id, name)` — names are unique **per user**, not globally.

### Table: `tags`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID v4 |
| `user_id` | TEXT → users.id | Per-user |
| `label` | TEXT NOT NULL | Tag text |
| `category` | TEXT NOT NULL | enum: `setup`, `context`, `psychology`, `mistake`, `custom` |
| `archived` | INTEGER | Boolean, default 0 |
| `created_at` | TEXT | ISO 8601 UTC |

**Unique index:** `tags_user_label_unique` on `(user_id, label)` — labels are unique **per user**, not globally.

### Table: `trades`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID v4 |
| `user_id` | TEXT → users.id | Ownership |
| `symbol` | TEXT NOT NULL | e.g. `SPY`, `AAPL` |
| `instrument` | TEXT NOT NULL | enum: `option_spread`, `stock` |
| `direction` | TEXT NOT NULL | enum: `long`, `short`, `neutral` |
| `strategy_id` | TEXT → strategies.id | Optional |
| `status` | TEXT NOT NULL | enum: `open`, `closed`, `cancelled` |
| `planned_entry` | REAL | Target entry price |
| `planned_stop` | REAL | Stop loss price |
| `planned_target` | REAL | Profit target price |
| `planned_size` | REAL | Position size |
| `planned_risk_usd` | REAL | Planned risk in USD (used for R-multiple) |
| `opened_at` | TEXT NOT NULL | ISO 8601 UTC |
| `closed_at` | TEXT | ISO 8601 UTC, null if open |
| `realized_pnl_usd` | REAL | **Computed** from executions, null if open |
| `realized_pnl_r` | REAL | **Computed** R-multiple, null if no risk set |
| `fees_usd` | REAL NOT NULL | **Computed** total fees, default 0 |
| `trade_quality` | TEXT | enum: `A`, `A+`, `A++`, `B`, `B+` |
| `trade_basis` | TEXT | enum: `rules`, `intuition` |
| `notes_md` | TEXT | Markdown notes |
| `pre_confidence` | INTEGER | 1–10 scale |
| `pre_conviction` | TEXT | Free text |
| `pre_mood` | TEXT | enum: `calm`, `anxious`, `fomo`, `revenge`, `tired`, `focused`, `neutral` |
| `pre_sleep_hours` | REAL | Hours slept before trading |
| `pre_caffeine` | INTEGER | Boolean |
| `pre_following_plan` | INTEGER | Boolean |
| `during_stress` | INTEGER | 1–10 stress during trade |
| `during_deviations` | TEXT | Deviations from plan |
| `post_satisfaction` | INTEGER | 1–10 satisfaction |
| `post_mistakes` | TEXT | Free text mistakes |
| `post_lessons` | TEXT | Free text lessons |
| `post_mood` | TEXT | enum: same as pre_mood |
| `post_would_retake` | INTEGER | Boolean |
| `created_at` | TEXT | ISO 8601 UTC |
| `updated_at` | TEXT | ISO 8601 UTC |

**Critical:** `realized_pnl_usd`, `realized_pnl_r`, and `fees_usd` are **computed fields** — never set them manually. They are recalculated by `recomputeTradePnl()` whenever executions change.

### Table: `trade_executions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID v4 |
| `trade_id` | TEXT NOT NULL → trades.id CASCADE DELETE | |
| `kind` | TEXT NOT NULL | enum: `entry`, `exit`, `adjustment` |
| `executed_at` | TEXT NOT NULL | ISO 8601 UTC |
| `notes` | TEXT | Optional notes |
| `fees_usd` | REAL NOT NULL | Fees for this execution, default 0 |
| `created_at` | TEXT | ISO 8601 UTC |

### Table: `trade_execution_legs`

One row per instrument leg within an execution. An option spread has 2+ legs.

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID v4 |
| `execution_id` | TEXT NOT NULL → trade_executions.id CASCADE DELETE | |
| `side` | TEXT NOT NULL | enum: `buy`, `sell` |
| `shares` | REAL | Stock shares |
| `option_type` | TEXT | enum: `call`, `put` |
| `strike` | REAL | Option strike price |
| `expiration` | TEXT | Option expiration date |
| `contracts` | REAL | Number of contracts |
| `price` | REAL NOT NULL | Fill price |
| `multiplier` | INTEGER NOT NULL | 100 for options, 1 for stock |

### Table: `trade_screenshots`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID v4 |
| `trade_id` | TEXT NOT NULL → trades.id CASCADE DELETE | |
| `timeframe` | TEXT NOT NULL | enum: `4H`, `1H`, `15M`, `5M`, `other` |
| `url` | TEXT NOT NULL | URL of screenshot image |
| `label` | TEXT | Optional label |
| `captured_at` | TEXT | When the screenshot was taken |

### Table: `trade_tags` (join table)

| Column | Type | Notes |
|--------|------|-------|
| `trade_id` | TEXT NOT NULL → trades.id CASCADE DELETE | |
| `tag_id` | TEXT NOT NULL → tags.id RESTRICT | Prevent orphan tags from deleting |

### Table: `settings` (global)

Global app settings (not per-user). Currently unused in production — user-specific settings use `user_settings` instead.

### Table: `audit_log`

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID v4 |
| `entity` | TEXT NOT NULL | `trade`, `execution`, etc. |
| `entity_id` | TEXT | ID of the entity |
| `action` | TEXT NOT NULL | enum: `create`, `update`, `delete` |
| `diff_json` | TEXT | JSON diff (not always populated) |
| `occurred_at` | TEXT | ISO 8601 UTC |

### Relations Summary

```
users ──< user_settings       (one-to-many, cascade delete)
users ──< strategies          (one-to-many)
users ──< tags                (one-to-many)
users ──< trades              (one-to-many)
trades ──< trade_executions   (one-to-many, cascade delete)
trade_executions ──< trade_execution_legs (one-to-many, cascade delete)
trades ──< trade_screenshots  (one-to-many, cascade delete)
trades >──< tags              (many-to-many via trade_tags)
trades >── strategies         (many-to-one)
```

---

## 6. Query Layer

All database access goes through `lib/db/queries.ts`. Route handlers should never use `getDb()` directly for CRUD — they call functions from this file.

### Strategy Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `listStrategies` | `(includeArchived, userId?) → Strategy[]` | List user's strategies, sorted by name |
| `getStrategy` | `(id) → Strategy?` | Get single strategy by ID |
| `createStrategy` | `(input) → Strategy` | Insert new strategy |
| `updateStrategy` | `(id, input) → Strategy?` | Update strategy fields |

### Tag Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `listTags` | `(includeArchived, userId?) → Tag[]` | List user's tags, sorted by category+label |
| `getTag` | `(id) → Tag?` | Get single tag by ID |
| `createTag` | `(input) → Tag` | Insert new tag |
| `updateTag` | `(id, input) → Tag?` | Update tag fields (label, category, archived) |

### Trade Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `listTrades` | `(filters?) → { trades, total }` | Paginated trade list with filters |
| `getTrade` | `(id) → TradeWithRelations?` | Full trade + executions + legs + screenshots + tags |
| `createTrade` | `(input) → TradeWithRelations` | Create trade + first execution + legs + tags |
| `updateTrade` | `(id, input) → TradeWithRelations?` | Update trade fields + tags, recompute P&L |
| `deleteTrade` | `(id) → boolean` | Hard delete trade + all related data |

### Execution Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `addExecution` | `(input) → TradeWithRelations?` | Add exit/adjustment execution + legs, recompute P&L |
| `deleteExecution` | `(executionId) → boolean` | Delete execution + legs, recompute P&L |

### Screenshot Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `addScreenshot` | `(input) → void` | Add screenshot to trade |
| `deleteScreenshot` | `(id) → boolean` | Delete screenshot |

### P&L Recomputation

`recomputeTradePnl(tradeId)` — called automatically by `createTrade`, `updateTrade`, `addExecution`, `deleteExecution`.

For **closed** trades: computes `realizedPnlUsd` from all executions, computes `realizedPnlR` from planned risk, updates `feesUsd`.

For **open/cancelled** trades: sets `realizedPnlUsd = null`, `realizedPnlR = null`, still updates `feesUsd`.

### Calendar & Symbols

| Function | Signature | Description |
|----------|-----------|-------------|
| `getCalendarMonth` | `(year, month, userId?) → CalendarDay[]` | Daily P&L for calendar heatmap |
| `getDistinctSymbols` | `(userId?) → string[]` | Distinct symbols for autocomplete |

### Settings

| Function | Signature | Description |
|----------|-----------|-------------|
| `getUserSettings` | `(userId) → Record<string, string>` | Get all settings with defaults |
| `updateUserSettings` | `(userId, updates) → Record<string, string>` | Upsert settings |

**Default settings:**
- `timezone`: `America/Chicago`
- `startingBalance`: `25000`
- `commissionPerContract`: `0.65`
- `commissionPerShare`: `0.005`

### Trade List Filters

The `listTrades` function accepts:
```typescript
{
  userId?: string;
  status?: 'open' | 'closed' | 'cancelled';
  symbol?: string;           // LIKE %symbol%
  strategyId?: string;       // exact match
  instrument?: string;       // exact match
  tagIds?: string[];          // trades that have ANY of these tags
  date?: string;             // 'YYYY-MM-DD' — matches openedAt OR closedAt
  limit?: number;            // default 50
  offset?: number;           // default 0
}
```

Note: `date` and `tagId` filtering is done post-query (in memory) because SQLite lacks some query features.

---

## 7. P&L Engine

`lib/pnl.ts` — all pure functions, no database access.

### Core Formula

```
Realized P&L = Σ(cashFlow per execution) − total fees

cashFlow per execution = Σ(per leg: side==sell ? price*qty*mult : −price*qty*mult)
```

### For Different Instrument Types

| Instrument | Entry | Exit | P&L |
|-----------|-------|------|-----|
| **Credit spread** | Sell higher strike, buy lower (net credit = positive cashflow) | Buy to close (net debit = negative cashflow) | Net credit − net debit − fees |
| **Debit spread** | Buy higher strike, sell lower (net debit = negative cashflow) | Sell to close (net credit = positive cashflow) | Net credit − net debit − fees |
| **Stock long** | Buy shares (negative cashflow) | Sell shares (positive cashflow) | Sale price − purchase price − fees |
| **Stock short** | Sell short (positive cashflow) | Buy to cover (negative cashflow) | Short proceeds − cover cost − fees |

### R-Multiple

```
R = realizedPnlUsd / plannedRiskUsd
```

Returns `null` if `plannedRiskUsd` is null or 0. A 1R trade means you made exactly what you risked. A −1R trade means you hit your full stop.

### Key Functions

```typescript
// Net cash flow from one execution
executionCashFlow(execution: PnlExecution): number

// Full P&L from all executions
computeRealizedPnl(executions: PnlExecution[], tradeLevelFees?: number): number

// R-multiple
computeRMultiple(realizedPnlUsd: number, plannedRiskUsd: number | null): number | null

// Total fees
computeTotalFees(executions: PnlExecution[], tradeLevelFees?: number): number
```

---

## 8. Metrics Engine

All metric modules are in `lib/metrics/`. Every function is **pure** — takes arrays of trade data, returns computed values. No database access, no side effects.

### 8.1 Headline Metrics (`lib/metrics/headline.ts`)

All operate on `MetricTrade[]` (closed trades only for most functions).

| Function | Formula | Notes |
|----------|---------|-------|
| `totalPnlUsd` | Sum of closed realized P&L | |
| `totalPnlPercent` | totalPnl / startingBalance × 100 | |
| `winRate` | wins / closedTrades × 100 | |
| `profitFactor` | grossWins / \|grossLosses\| | Returns `Infinity` if no losses |
| `expectancyUsd` | totalPnl / closedTrades | Avg P&L per trade |
| `expectancyR` | Σ(R) / closedTrades | Avg R-multiple per trade |
| `avgWinUsd` | mean of winning trade P&Ls | |
| `avgLossUsd` | mean of losing trade P&Ls | Negative number |
| `payoffRatio` | avgWin / \|avgLoss\| | |
| `kellyCriterion` | W − (1−W)/R | As percentage |
| `bestTradeUsd` | max(P&L) | |
| `worstTradeUsd` | min(P&L) | |
| `pnlStdDev` | Sample std deviation of P&Ls | |
| `breakEvenCount` | count of $0 P&L trades | |
| `grossProfit` | sum of positive P&Ls | |
| `grossLoss` | \|sum of negative P&Ls\| | Positive number |

### 8.2 Distribution Metrics (`lib/metrics/distribution.ts`)

| Function | Returns | Notes |
|----------|---------|-------|
| `equityCurve` | `EquityPoint[]` | Cumulative P&L + equity at each trade |
| `maxDrawdown` | `DrawdownResult` | Peak-to-trough decline in USD and % |
| `streaks` | `StreakResult` | Win/loss streaks (breakeven trades are **skipped**) |
| `rDistribution` | `number[]` | Sorted R-multiple values for histogram |

**Streak logic:** Breakeven trades (`pnl === 0`) are **skipped** — they neither extend nor break a streak. This matches trading convention.

**Max Drawdown:**
```
Drawdown at point i = equity[i] − peak equity seen so far
Max Drawdown = largest such negative value
longestDrawdownDays = days between drawdown start (first below-peak point) and new peak
```

### 8.3 Edge Slicing (`lib/metrics/edge.ts`)

Generic `sliceBy(trades, keyFn)` returns `EdgeRow[]` sorted by total USD descending.

Each `EdgeRow`:
```typescript
{
  label: string;
  trades: number;
  winPercent: number;
  avgR: number;
  expectancyUsd: number;
  totalUsd: number;
}
```

Available slicers:
- `sliceBySymbol` — group by ticker
- `sliceByStrategy` — group by strategy name
- `sliceByTag` — group by tag label (multi-tag trades appear in multiple rows)
- `sliceByDayOfWeek` — group by UTC day of week
- `sliceByHour` — group by UTC hour of entry (HH:00)
- `sliceByInstrument` — Spreads vs Stocks
- `sliceByQuality` — A/A+/A++/B/B+ vs Ungraded
- `sliceByBasis` — Rules-based vs Intuition

### 8.4 Risk Metrics (`lib/metrics/risk.ts`)

| Function | Description |
|----------|-------------|
| `avgRiskUsd` | Average planned risk per trade |
| `avgRiskPercent` | avgRiskUsd / startingBalance |
| `largestLossUsd` | Most negative single trade P&L |
| `riskAdjustedReturn` | totalPnl / maxDrawdown |
| `planAdherenceRate` | % of trades where `preFollowingPlan = true` |

### 8.5 Psychology Metrics (`lib/metrics/psychology.ts`)

| Function | Returns | Notes |
|----------|---------|-------|
| `confidenceByOutcome` | `{ winnersAvg, losersAvg }` | Avg confidence on wins vs losses |
| `winRateByMood` | `MoodWinRate[]` | Win rate per pre-trade mood |
| `winRateBySleep` | `{ underSixHours, sixPlusHours }` | Win rate by sleep |
| `wouldRetakeRate` | `number` | % of trades trader would repeat |

### 8.6 Behavioral Analytics (`lib/metrics/behavioral.ts`)

| Function | Returns | Description |
|----------|---------|-------------|
| `tiltDetection` | `TiltPoint[]` | Performance change after winning/losing streaks |
| `confidenceCalibration` | `CalibrationBin[]` | Confidence bins (1–3, 4–5, 6–7, 8–10) vs actual win rate |
| `revengeTradeDetection` | `RevengeTradeStat` | Trades opened within 30 min of a loss |
| `overtradingDetection` | `OvertradingStat` | Days with above-average trade count |
| `planDeviationImpact` | `PlanDeviationImpact` | Following plan vs deviating: performance comparison |
| `stressAnalysis` | `StressBin[]` | During-trade stress vs outcome |
| `satisfactionAnalysis` | `SatisfactionStat` | Post-trade satisfaction vs P&L |

### 8.7 Time Analysis (`lib/metrics/time-analysis.ts`)

| Function | Returns | Description |
|----------|---------|-------------|
| `monthlyPnl` | `MonthlyPnl[]` | P&L grouped by close month |
| `weeklyPnl` | `WeeklyPnl[]` | P&L grouped by ISO week |
| `rollingMetrics` | `RollingPoint[]` | Rolling N-trade window: P&L, win rate, expectancy, R |
| `holdingPeriodBuckets` | `HoldingBucket[]` | Buckets: <1h, 1–4h, 4h–1d, 1–3d, 3–7d, 1–2w, 2w+ |
| `tradeFrequencyByMonth` | `FrequencyPoint[]` | Trade count per month |
| `tradeFrequencyByWeek` | `FrequencyPoint[]` | Trade count per week |
| `hourDayHeatmap` | `HeatmapCell[]` | Day × hour grid of P&L and win rate |

### 8.8 Advanced Risk (`lib/metrics/advanced-risk.ts`)

| Function | Returns | Notes |
|----------|---------|-------|
| `sharpeRatio` | `number \| null` | mean(returns)/stddev(returns), null = ∞ (no volatility) |
| `sortinoRatio` | `number \| null` | mean(returns)/downside_stddev, null = ∞ (no losses) |
| `calmarRatio` | `number \| null` | annualizedPnl/maxDrawdown, null = ∞ (no drawdown) |
| `recoveryFactor` | `number \| null` | totalPnl/maxDrawdown, null = ∞ (no drawdown) |
| `underwaterCurve` | `UnderwaterPoint[]` | Drawdown depth at each trade |
| `feeImpact` | `FeeImpact` | Total fees, fee % of gross profit, monthly fee breakdown |
| `riskSizeBins` | `RiskSizeBin[]` | Performance by position size bucket |
| `directionAnalysis` | `DirectionStats[]` | Long vs short vs neutral breakdown |
| `monthlyGrid` | `MonthlyGridCell[]` | Year × month P&L grid for GitHub-style heatmap |

**Important — Infinity → null:** When a metric would be mathematically infinite (e.g., Sortino when there are no losses, Calmar when there is no drawdown), the functions return **`null`** explicitly. This is because `JSON.stringify(Infinity) === 'null'` in JavaScript — returning `Infinity` from an API would silently become `null`. The frontend renders `null` as "∞".

---

## 9. API Reference

All API routes are in `app/api/`. Every authenticated route calls `getUserIdFromRequest(request)` first — returns 401 if not authenticated.

### Auth Routes (no auth required)

#### `POST /api/auth/login`
Login with passcode.
- **Body:** `{ passcode: string }`
- **200:** `{ userId, displayName? }` + sets `pk_session` cookie
- **401:** `{ error: "Invalid passcode" }`

#### `POST /api/auth/signup`
Create new account.
- **Body:** `{ passcode: string, displayName?: string }`
- **201:** `{ userId }` + sets `pk_session` cookie + seeds 26 default tags
- **400:** validation errors
- **409:** `{ error: "Passcode already taken" }`

#### `POST /api/auth/logout`
Clear session.
- **200:** `{ ok: true }` + clears `pk_session` cookie

### Trades

#### `GET /api/trades`
List user's trades with optional filters.
- **Query params:** `status`, `symbol`, `strategyId`, `instrument`, `tagIds` (comma-separated), `date` (YYYY-MM-DD), `limit` (default 50), `offset` (default 0)
- **200:** `{ trades: TradeWithRelations[], total: number }`

#### `POST /api/trades`
Create a new trade with first execution.
- **Body:** Full trade creation payload (see `lib/validators/trade.ts`)
- **201:** `TradeWithRelations`
- **400:** Zod validation errors

#### `GET /api/trades/[id]`
Get single trade with full relations.
- **200:** `TradeWithRelations`
- **403:** Not owner
- **404:** Not found

#### `PATCH /api/trades/[id]`
Update trade fields.
- **Body:** Partial trade fields (any subset)
- **200:** `TradeWithRelations`
- **403:** Not owner
- **404:** Not found

#### `DELETE /api/trades/[id]`
Hard delete trade and all related data.
- **200:** `{ ok: true }`
- **403:** Not owner
- **404:** Not found

#### `GET /api/trades/symbols`
Distinct symbols for autocomplete.
- **200:** `string[]`

### Executions

#### `POST /api/executions`
Add execution to existing trade.
- **Body:** `{ tradeId, kind, executedAt, feesUsd?, legs[], notes? }`
- **201:** `TradeWithRelations`
- **403:** Not owner of trade

#### `DELETE /api/executions/[id]`
Delete execution and its legs. Recomputes P&L.
- **200:** `TradeWithRelations`

### Strategies

#### `GET /api/strategies`
List user's strategies.
- **Query:** `archived=true` to include archived
- **200:** `Strategy[]`

#### `POST /api/strategies`
Create strategy.
- **Body:** `{ name, description?, defaultInstrument? }`
- **201:** `Strategy`
- **409:** Duplicate name for this user

#### `PATCH /api/strategies/[id]`
Update strategy. Ownership check enforced.
- **Body:** `{ name?, description?, defaultInstrument?, archived? }`
- **200:** `Strategy`

### Tags

#### `GET /api/tags`
List user's tags.
- **Query:** `archived=true` to include archived
- **200:** `Tag[]` sorted by category, then label

#### `POST /api/tags`
Create tag.
- **Body:** `{ label, category }`
- **201:** `Tag`
- **409:** Duplicate label for this user

#### `PATCH /api/tags/[id]`
Update tag. Ownership check enforced.
- **Body:** `{ label?, category?, archived? }`
- **200:** `Tag`

### Metrics & Analytics

#### `GET /api/metrics`
Full dashboard metrics for current user.
- **Query:** `startingBalance` (optional, defaults to user's setting)
- **200:** Nested object with:
  ```json
  {
    "summary": { "totalTrades", "openTrades", "closedTrades" },
    "headline": { "totalPnlUsd", "winRate", "profitFactor", "expectancyUsd", ... },
    "distribution": { "equityCurve", "maxDrawdown", "streaks", "rDistribution" },
    "edge": { "bySymbol", "byStrategy", "byDayOfWeek", "byInstrument", "byQuality", "byBasis" },
    "risk": { "avgRiskUsd", "largestLossUsd", "planAdherenceRate", ... },
    "psychology": { "confidenceByOutcome", "winRateByMood", "winRateBySleep", "wouldRetakeRate" }
  }
  ```

#### `GET /api/analytics`
Deep analytics (time analysis, behavioral, advanced risk).
- **Query:** `startingBalance` (optional)
- **200:** Nested object with:
  ```json
  {
    "timeAnalysis": { "monthlyPnl", "weeklyPnl", "rolling10", "rolling20", "holdingPeriods", "frequencyByMonth", "frequencyByWeek", "heatmap" },
    "advancedRisk": { "sharpeRatio", "sortinoRatio", "calmarRatio", "recoveryFactor", "underwaterCurve", "feeImpact", "riskSizeBins", "monthlyGrid", "directionAnalysis" },
    "edgeExtended": { "byTag", "byHour", "byQuality", "byBasis" },
    "behavioral": { "tiltDetection", "confidenceCalibration", "revengeTradeDetection", "overtradingDetection", "planDeviationImpact", "stressAnalysis" }
  }
  ```

#### `GET /api/calendar`
Daily P&L for calendar view.
- **Query:** `year` (required), `month` (required, 1-based)
- **200:** `CalendarDay[]`

### Settings

#### `GET /api/settings`
Get user's settings with defaults.
- **200:** `Record<string, string>` with keys: `timezone`, `startingBalance`, `commissionPerContract`, `commissionPerShare`

#### `PATCH /api/settings`
Update user's settings.
- **Body:** `Record<string, string>` (any subset of known keys)
- **200:** Updated settings object

---

## 10. Frontend Pages

All pages are in `app/(app)/` (route group). They are server components that fetch initial data and pass it to client components. The app shell is in `app/(app)/layout.tsx`.

### Dashboard (`/dashboard`)

Loads via `/api/metrics`. Displays:
- **KPI cards:** Total P&L, Win Rate, Profit Factor, Expectancy (USD and R), Sharpe Ratio
- **Equity Curve:** Recharts LineChart showing cumulative P&L
- **Win Rate by Mood:** Bar chart
- **Edge table:** Performance by symbol, strategy, day-of-week
- **Open trades:** Cards for currently open positions
- **Recent closed trades:** Last 5 closed trades

### Trade Detail (`/trades/[id]`)

Server component fetches the trade, client component renders tabs:

1. **Overview tab** — trade plan fields, execution table, key metrics
2. **Executions tab** — full execution history with legs
3. **Psychology tab** — pre/during/post psychology fields, displayed grouped
4. **Screenshots tab** — chart screenshots by timeframe
5. **Notes tab** — Markdown notes

**Close Trade Dialog** — opens when "Close Trade" button clicked. Loads tags via `GET /api/tags` (fetched only once per dialog open). Allows adding exit execution + post-trade psychology.

**Edit Trade Dialog** — full edit of all trade fields + tag management via TagPicker.

### New Trade (`/trades/new`)

Multi-step form with sections:
1. **Trade basics** — symbol, instrument, direction, strategy
2. **Trade plan** — planned entry/stop/target/size/risk
3. **Execution** — entry execution builder (legs, fees, timestamp)
4. **Pre-trade psychology** — confidence, mood, sleep, caffeine, plan
5. **Tags** — TagPicker for all user tags
6. **Screenshots** — optional chart screenshots

### Journal (`/journal`)

Trades list with filters:
- **Filters:** Status, Symbol (search), Strategy, Instrument, Date, Tags
- **Columns:** Symbol, Direction, Status, P&L, R, Opened, Closed, Quality, Strategy, Tags
- **Export:** CSV export of filtered results (RFC 4180 compliant — fields quoted, double-quotes escaped)
- **Pagination:** 50 trades per page

### Analytics (`/analytics`)

Loads via `/api/analytics`. Three tab groups:

**Performance tab:**
- Monthly P&L bar chart
- Weekly P&L bar chart
- Rolling 10-trade win rate line
- Rolling 20-trade expectancy line

**Advanced Risk tab:**
- Underwater curve (drawdown depth over time)
- Sharpe / Sortino / Calmar / Recovery Factor cards
- Fee impact breakdown
- Risk size bins table

**Behavioral tab:**
- Confidence calibration chart
- Tilt detection table
- Revenge trade stats
- Overtrading detection

**Edge tab:**
- Slicing by tag, hour, quality, basis

### Calendar (`/calendar`)

Monthly calendar grid showing daily P&L. Each day shows:
- Color coded: green (profit), red (loss), neutral (breakeven/no trades)
- Dollar amount on hover
- Month navigation controls

### Settings (`/settings`)

Form with:
- Starting Balance (min: $1, validates positive)
- Timezone (dropdown)
- Commission per contract
- Commission per share
- Display name

---

## 11. Component Library

### Primitive Components (`components/primitives/`)

#### `badge.tsx`
```tsx
<Badge variant="win">+$250</Badge>
<Badge variant="loss">-$100</Badge>
<Badge variant="open">Open</Badge>
<Badge variant="mistake">FOMO</Badge>
```
Variants: `win` (green), `loss` (red), `open` (purple), `neutral` (grey), `mistake` (red/dark)

#### `chip-select.tsx`
Multi-select pill grid for tagging workflows.
```tsx
<ChipSelect
  options={[{ id: "1", label: "FOMO Entry" }, ...]}
  selected={["1"]}
  onChange={(ids) => setSelected(ids)}
  variant="mistake"  // "default" | "mistake"
/>
```
Layout: 2-column grid, mobile-first. Selected state: purple accent (default) or red accent (mistake).

### Trade Components (`components/trade/`)

#### `psychology-fields.tsx`
Two main exports:

**`PrePsychologyFields`** — Pre-trade psychology section. Fields: confidence (1-10), conviction (text), mood (enum select), sleep hours, caffeine toggle, following plan toggle.

**`PostPsychologyFields`** — Post-trade reflection section. Fields: satisfaction (1-10), mistakes (text), lessons (text), mood, would retake toggle.

Both accept optional chip tag props for chip-select integration.

#### `execution-builder.tsx`
Dynamic form for building one execution with multiple legs. Handles stock (shares + price) and option (contracts + strike + expiration + call/put + price) legs. Fee input per execution.

#### `edit-trade-dialog.tsx`
Full edit dialog covering all trade fields. Uses TagPicker for tag management. Does not use chip-select — only TagPicker.

### UI Components (`components/ui/`)
shadcn/ui components: Button, Dialog, Input, Select, Tabs, Toggle, Card, Table, etc.

---

## 12. User Settings

Settings are stored in `user_settings` table as key-value pairs. Values are always strings.

| Key | Default | Description |
|-----|---------|-------------|
| `timezone` | `America/Chicago` | User's timezone for display |
| `startingBalance` | `25000` | Starting account balance for % P&L and Calmar ratio |
| `commissionPerContract` | `0.65` | Default commission per options contract |
| `commissionPerShare` | `0.005` | Default commission per share |

Settings are read by the metrics API when computing `totalPnlPercent` and `calmarRatio`. The `startingBalance` can be overridden per-request via query param `?startingBalance=50000`.

---

## 13. Tag System

Tags are the backbone of categorical analysis. Every tag belongs to exactly one user.

### Tag Categories

| Category | Purpose | Example Tags |
|----------|---------|--------------|
| `setup` | The chart pattern or setup type | Breakout, VWAP Bounce, Gap Fill |
| `context` | Market conditions | High IV, FOMC/News, Trend Day |
| `psychology` | Mental state or behavior | Followed Plan, Tilt, Hesitated |
| `mistake` | Trading mistakes | FOMO Entry, Revenge Trading, Ignored Stop |
| `custom` | User-defined | Anything else |

### Tag Constraints

- Labels are unique **per user** (composite unique index on `(user_id, label)`)
- Tags can be archived (hidden from normal lists) but not deleted if attached to trades
- Deleting a tag that is in use is blocked by `ON DELETE RESTRICT` on `trade_tags.tag_id`

### TagPicker Component

The `TagPicker` component (used in edit dialog) shows all user tags organized by category. Allows multi-select. Displays as a flat list or grouped by category.

### ChipSelect Component

The `ChipSelect` component is used for quick tag selection in new trade + close trade dialogs. Only shows `psychology` and `mistake` category tags respectively. Provides visual chip-style tap targets rather than a dropdown.

---

## 14. Default Tag Seeding

When a new user is created, 26 default tags are automatically seeded via `lib/db/seed-defaults.ts`.

| Category | Tags |
|----------|------|
| `mistake` (9) | Overtrading, Revenge Trading, Risked Too Much, Ignored Stop, FOMO Entry, Chased Entry, No Plan, Early Exit, Moved Stop |
| `setup` (6) | Breakout, VWAP Bounce, Mean Reversion, Trend Continuation, Support/Resistance, Gap Fill |
| `context` (6) | High IV, Low IV, Earnings Play, FOMC/News, Low Volume, Trend Day |
| `psychology` (5) | Followed Plan, Stayed Patient, Managed Emotions, Tilt, Hesitated |

The seeding function (`seedDefaultTags`) is idempotent — it checks if the user already has any tags before inserting. Safe to call multiple times.

---

## 15. Migrations

Migrations are in `db/migrations/`. The format uses Drizzle ORM's push format with `-->statement-breakpoint` markers between SQL statements.

### Applied Migrations

| # | File | Description |
|---|------|-------------|
| 0000 | `0000_initial.sql` | All initial tables |
| 0001 | `0001_add_users.sql` | Multi-user tables |
| 0002 | `0002_add_user_settings.sql` | Per-user settings |
| 0003 | `0003_chip_select_tags.sql` | tags.label: global unique → per-user composite unique |
| 0004 | `0004_strategies_unique_per_user.sql` | strategies.name: global unique → per-user composite unique |

### Running Migrations

```bash
npm run db:migrate
```

Or manually via script:
```bash
node scripts/apply-migration-0004.mjs
```

### Migration Journal

`db/migrations/meta/_journal.json` tracks which migrations have been applied. Each entry:
```json
{ "idx": 4, "version": "5", "when": 1748131200000, "tag": "0004_strategies_unique_per_user", "breakpoints": true }
```

---

## 16. Development Setup

### Prerequisites

- Node.js 20+
- npm

### Install & Run

```bash
# Clone the repo
cd pk_trades_journal
npm install

# Start dev server (Turbopack, port 9999)
npm run dev
```

The dev server runs on **port 9999** (not 3000). Access at `http://localhost:9999`.

In development without `SESSION_SECRET`, the app bypasses auth and uses the admin user automatically.

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | Prod only | Min 32-char string for HMAC signing |
| `DATABASE_PATH` | Optional | Path to SQLite file (default: `./pk_trades.db`) |

Production uses a `.env` file at `/opt/pk-trades/.env`.

### Database Management

```bash
# Generate migration from schema changes
npm run db:generate

# Push schema to DB (without migration files)
npm run db:push

# Apply pending migrations
npm run db:migrate

# Pull schema from existing DB
npm run db:pull
```

### Running Tests

```bash
# Seed test data (6 users, 23 trades)
node scripts/uat-seed.mjs

# API tests (requires running server on port 9999)
node scripts/uat-api-test.mjs
```

---

## 17. Production Deployment

### Infrastructure

- **Server:** DigitalOcean droplet at `161.35.119.190`
- **App directory:** `/opt/pk-trades`
- **Database:** `/var/data/pk_trades.db`
- **Process manager:** PM2 (app name: `pk-trades`)
- **Reverse proxy:** Caddy (handles HTTPS, proxies to port 9999)
- **Git remotes (local dev machine):**
  - `github` → GitHub (push target for production deploy)
  - `origin` → GitLab
- **Git remotes (production server `/opt/pk-trades`):**
  - `origin` → GitHub

### Deploy Process

> **Critical:** Always run `pnpm build` before `pm2 restart`. The app serves a pre-compiled `.next` bundle — skipping the build means the server continues to run the old code even after `git pull`.

```bash
# 1. Commit and push to GitHub (from local dev machine)
git add <files>
git commit -m "description"
git push github main

# 2. SSH to server and deploy
ssh root@161.35.119.190
cd /opt/pk-trades
git pull origin main        # server remote is "origin" (not "github")
pnpm install                # use pnpm — npm fails on workspace:^ protocol
npm run db:migrate          # apply pending migrations + backfill tags
pnpm build                  # REQUIRED: compile new .next bundle before restart
pm2 restart pk-trades

# 3. Verify
pm2 status
pm2 logs pk-trades --lines 20
```

### PM2 Commands

```bash
pm2 status              # Show all running processes
pm2 restart pk-trades   # Restart the app
pm2 logs pk-trades      # Stream logs
pm2 logs pk-trades --lines 100  # Last 100 log lines
```

### Admin DB Backup

`GET /api/admin/backup` — returns a JSON dump of the database. Admin-only endpoint (no auth check in current implementation — protected by obscurity of the URL).

---

## 18. UAT Test Users

Created by `scripts/uat-seed.mjs`. All users can be used for manual testing.

| Passcode | Name | Balance | Timezone | Style |
|----------|------|---------|----------|-------|
| `111111` | Alice Chen | $25,000 | ET | Options trader, multiple strategies |
| `222222` | Marcus Webb | $10,000 | CT | Swing trader, smaller account |
| `333333` | Sofia Ramirez | $50,000 | PT | Options spreads, high confidence |
| `444444` | Derek Park | $5,000 | MT | Small account, learning |
| `555555` | Priya Sharma | $100,000 | ET | Large account, all winners (tests ∞ Sortino) |
| `666666` | Jake Turner | $8,000 | CT | Mixed results, behavioral patterns |

**Note:** These test users exist only in local development. Production database has only the admin user and any real users that have signed up.

---

## 19. Known Constraints & Design Decisions

### Infinity → null in JSON

`JSON.stringify(Infinity)` produces `null` in JavaScript. All metric functions that could theoretically return infinity (Sharpe, Sortino, Calmar, Recovery Factor, Profit Factor) explicitly return `null` instead. The frontend renders `null` as "∞". Do not change this — returning `Infinity` would silently produce wrong data in the API response.

### P&L Only on Closed Trades

`realizedPnlUsd` and `realizedPnlR` are always `null` for open and cancelled trades. This prevents the UI from showing a misleading negative "realized" P&L from just the entry cost. All metrics that reference P&L filter to `status === 'closed'`.

### Date Handling

- All timestamps stored as ISO 8601 UTC in SQLite
- Calendar grouping uses `openedAt` for open trades, `closedAt` for closed trades
- Heatmap uses UTC hours (not user's timezone) — a limitation of the current implementation
- Trade dates are entered by the user in their local time and stored as-is

### Breakeven Streaks

Breakeven trades (`realizedPnlUsd === 0`) are excluded from streak calculations — they neither extend nor break a win/loss streak. This matches standard trading convention.

### Tag Ownership

Per-user unique constraint on `(user_id, label)` means different users can have tags with the same label. The old global unique constraint on `label` was removed in migration 0003.

### Strategy Ownership

Same pattern as tags: per-user unique on `(user_id, name)`. Migration 0004.

### Composite Unique Indexes (manual workaround)

Due to missing Drizzle snapshot files for migrations 0002-0004, the Drizzle migrator doesn't auto-apply migrations 0003 and 0004. They are applied manually via `scripts/apply-migration-0004.mjs`. When adding new migrations, verify they apply correctly with `npm run db:migrate` and check `__drizzle_migrations` table.

### SQLite Write Concurrency

`better-sqlite3` is synchronous and single-threaded. This is fine for a single-user or low-concurrency use case. All writes are serialized. If you need higher concurrency, consider switching to Turso or PostgreSQL.

### Zod v4 Import Path

The app uses Zod v4 which requires the import path `'zod/v4'`:
```typescript
import { z } from 'zod/v4';
// NOT: import { z } from 'zod';
```

Use `z.iso.datetime()` for ISO datetime validation (not `z.string().datetime()`).

### Middleware Redirect vs API 401

The middleware returns **307 redirect to /login** for unauthenticated requests, even for API routes. API clients that call from the browser will follow the redirect. Server-side API clients should handle 307 as auth failure, not just 401.

### No Soft Deletes

Trades, executions, and legs are **hard deleted** (`deleteTrade`, `deleteExecution`). There is no soft-delete/recycle bin. The audit log records create/delete events but does not store the deleted data.

### Commission Calculation

User settings store commission rates (`commissionPerContract`, `commissionPerShare`) but they are not automatically applied to executions. Fees must be entered manually on each execution. The settings are for reference/display only in the current implementation.
