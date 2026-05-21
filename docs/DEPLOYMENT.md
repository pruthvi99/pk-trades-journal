# Deployment — Render.com

## Prerequisites

- Render account (Starter plan, $7/mo)
- GitHub repo connected to Render

## Setup

### 1. Create the web service

1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repo
3. Render will auto-detect `render.yaml` — use it as a blueprint
4. Or manually configure:
   - **Runtime:** Node
   - **Plan:** Starter
   - **Build command:** `pnpm install --frozen-lockfile && pnpm build`
   - **Start command:** `pnpm db:migrate && pnpm start`

### 2. Create a persistent disk

- **Name:** pk-trades-data
- **Mount path:** `/var/data`
- **Size:** 1 GB

This is critical. Without it, the SQLite database is lost on every deploy.

### 3. Set environment variables

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Auto-set by Render |
| `DATABASE_PATH` | `/var/data/pk_trades.db` | On the persistent disk |
| `SESSION_SECRET` | (generate 32+ random chars) | Use `openssl rand -hex 32` |
| `ADMIN_PASSWORD` | (your login password) | Set manually |
| `ADMIN_SYNC_TOKEN` | (generate long random token) | For db:pull/push |
| `TZ` | `America/Chicago` | Or your timezone |

### 4. Deploy

Push to main. Render will:
1. Install dependencies (`pnpm install --frozen-lockfile`)
2. Build the Next.js app (`pnpm build`)
3. Run migrations on startup (`pnpm db:migrate`)
4. Start the server (`pnpm start`)

### 5. Set up nightly backups

Add a Render cron job:
- **Schedule:** `0 6 * * *` (6 AM UTC daily)
- **Command:** `curl -X POST https://pk-trades.onrender.com/api/admin/backup -H "x-pk-sync-token: YOUR_TOKEN"`

Or use Render's built-in cron jobs to hit the backup endpoint.

## Verify persistent disk

1. Log a trade through the UI
2. Trigger a manual deploy (push an empty commit)
3. After deploy, verify the trade still exists

## Rollback

Render keeps recent deploys. To rollback:
1. Go to Render Dashboard → your service → Deploys
2. Click "Rollback" on a previous successful deploy

For data rollback:
1. Backups are in `/var/data/backups/`
2. SSH into the Render instance (Starter plan supports shell access)
3. Copy the backup over the live database:
   ```bash
   cp /var/data/backups/pk_trades-YYYY-MM-DD.db /var/data/pk_trades.db
   ```
4. Restart the service

## Monitoring

- Render provides basic CPU/memory graphs
- Check `/api/metrics` for application-level health (trade counts, etc.)
- Backup route returns the number of backups and last backup path
