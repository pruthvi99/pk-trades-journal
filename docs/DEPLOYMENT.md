# Deployment — Railway

## Prerequisites

- Railway account (railway.app — Hobby plan $5/mo)
- GitLab repo connected to Railway

## Setup (~10 minutes)

### 1. Create a new project

1. Go to **railway.app** → "New Project"
2. Click **"Deploy from GitLab"** → authorize GitLab → select `pk-trades-journal`
3. Railway detects `railway.toml` automatically — build + start commands are pre-configured

### 2. Add a persistent volume

This is critical. Without it, the SQLite database is lost on every deploy.

1. In your Railway project → click your service → **"Volumes"** tab
2. Click **"Add Volume"**
   - Mount path: `/data`
   - Size: 1 GB (can expand later)
3. Click **"Add"**

### 3. Set environment variables

In your Railway service → **"Variables"** tab, add these:

| Variable | Value |
|----------|-------|
| `DATABASE_PATH` | `/data/pk_trades.db` |
| `SESSION_SECRET` | Run `openssl rand -hex 32` → paste output |
| `ADMIN_PASSWORD` | Your login password |
| `ADMIN_SYNC_TOKEN` | Run `openssl rand -hex 32` → paste output |
| `NODE_ENV` | `production` |
| `TZ` | `America/Chicago` (or your timezone) |

Click **"Deploy"** after saving variables.

### 4. Deploy

Railway auto-deploys on every `git push` to your GitLab `main` branch.

First deploy takes ~3-4 minutes (installs deps + builds Next.js).

### 5. Verify persistent volume

1. Log a trade through the UI
2. Trigger a manual redeploy: Railway dashboard → "Deploy" → "Redeploy"
3. After it completes, check that your trade still exists ✓

---

## Every future deploy

```bash
git add .
git commit -m "your change"
git push
```

Railway picks it up automatically. The `/data/pk_trades.db` volume is never
touched by deploys — only `pnpm db:migrate` runs (safe, additive-only).

---

## Rollback

Railway keeps deploy history. To rollback:
1. Railway dashboard → your service → "Deployments"
2. Click the three dots on a previous successful deploy → "Rollback"

For data rollback, use backups stored in `/data/backups/`:
```bash
# Railway shell (service → "Shell" tab)
cp /data/backups/pk_trades-YYYY-MM-DD.db /data/pk_trades.db
```
Then redeploy.

---

## Nightly backups (optional)

Add a Railway cron job or use an external cron (cron-job.org, free):
- URL: `https://YOUR-APP.railway.app/api/admin/backup`
- Method: POST
- Header: `x-pk-sync-token: YOUR_ADMIN_SYNC_TOKEN`
- Schedule: `0 6 * * *` (6 AM UTC daily)

---

## Monitoring

- Railway provides CPU/memory/network graphs per deploy
- Check `/api/metrics` for trade-level health
