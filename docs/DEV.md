# Development Guide

## Prerequisites

- Node.js 20+
- pnpm 9+

## Local setup

```bash
# Clone and install
git clone <repo-url>
cd pk_trades_journal
pnpm install

# Create .env.local (copy from example)
cp .env.example .env.local
# Edit .env.local — set ADMIN_PASSWORD at minimum

# Run migrations and seed
pnpm db:migrate
pnpm db:seed

# Start dev server
pnpm dev
```

Open http://localhost:3000. Login with the password from `.env.local`.

## Common commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm check` | Biome + typecheck + tests |
| `pnpm lint` | Biome lint only |
| `pnpm lint:fix` | Biome lint + autofix |
| `pnpm typecheck` | TypeScript check |
| `pnpm test` | Run all unit tests |
| `pnpm test:watch` | Tests in watch mode |
| `pnpm test:e2e` | Playwright E2E tests |
| `pnpm db:migrate` | Run pending migrations |
| `pnpm db:seed` | Seed database with sample data |
| `pnpm db:pull` | Download prod DB to local |
| `pnpm db:push` | Upload local DB to prod (dangerous) |
| `pnpm db:generate` | Generate new migration from schema changes |
| `pnpm db:studio` | Open Drizzle Studio |

## Database sync

### Pulling from production

Set these in `.env.local`:
```
PROD_SYNC_URL=https://pk-trades.onrender.com
ADMIN_SYNC_TOKEN=your-sync-token
```

Then run:
```bash
pnpm db:pull
```

This will:
1. Back up your local database
2. Download a consistent snapshot from production
3. Run an integrity check
4. Replace your local database
5. Print a summary of changes

### Auto-sync on dev start

Set `SYNC_ON_DEV=1` in `.env.local` to automatically pull from prod before starting the dev server.

### Pushing to production

```bash
pnpm db:push
```

This requires typing "OVERWRITE PRODUCTION" to confirm. A server-side backup is created first.

## Adding a migration

1. Modify the schema in `lib/db/schema.ts`
2. Generate the migration: `pnpm db:generate`
3. Review the generated SQL in `db/migrations/`
4. Apply: `pnpm db:migrate`

Migrations run automatically on deployment startup.

## Project structure

```
app/                    # Next.js App Router
  (app)/                # Authenticated route group
    journal/            # Trade list
    trades/[id]/        # Trade detail
    trades/new/         # New trade form
    metrics/            # Metrics dashboard
    settings/           # Settings + strategy/tag management
  api/                  # API routes
  login/                # Login page
  design/               # Design system showcase
components/
  primitives/           # Base UI components (Radix-based)
  trade/                # Trade-specific components
  metrics/              # Chart and stat components
  shell/                # Nav, layout
lib/
  db/                   # Drizzle client, schema, migrations, queries
  metrics/              # Pure metric functions
  validators/           # Zod schemas
  auth.ts               # Session auth
  pnl.ts                # P&L computation
tests/                  # Unit + integration tests
scripts/                # CLI scripts (seed, db-pull, db-push)
docs/                   # Documentation
```
