# Deployment — DigitalOcean

Single-user Next.js + SQLite app on a DigitalOcean droplet with PM2 and Caddy.

**Server:** `161.35.119.190`  
**App directory:** `/opt/pk-trades`  
**Database:** `/var/data/pk_trades.db`  
**Process manager:** PM2 (`pk-trades`)  
**Reverse proxy:** Caddy

---

## Every deploy

From your local machine, push to GitHub:

```bash
git push github main
```

Then SSH in and run the deploy script:

```bash
ssh root@161.35.119.190 'bash /opt/pk-trades/deploy.sh'
```

Or manually:

```bash
ssh root@161.35.119.190
cd /opt/pk-trades
git pull
pnpm install --frozen-lockfile
pnpm build
DATABASE_PATH=/var/data/pk_trades.db pnpm db:migrate
pm2 restart pk-trades
```

---

## deploy.sh

Located at `/opt/pk-trades/deploy.sh`:

```bash
#!/bin/bash
set -e
cd /opt/pk-trades
git pull
pnpm install --frozen-lockfile
pnpm build
DATABASE_PATH=/var/data/pk_trades.db pnpm db:migrate
pm2 restart pk-trades
echo "Deploy complete!"
```

---

## Environment variables

Located at `/opt/pk-trades/.env`:

```
DATABASE_PATH=/var/data/pk_trades.db
SESSION_SECRET=<32-byte hex>
ADMIN_PASSWORD=<login password>
NODE_ENV=production
TZ=America/Chicago
PORT=3000
```

Generate a new secret: `openssl rand -hex 32`

---

## Database backups

Manual:

```bash
cp /var/data/pk_trades.db /var/data/backups/pk_trades-$(date +%Y-%m-%d).db
```

Automatic nightly backup (cron — already configured):

```
0 6 * * * cp /var/data/pk_trades.db /var/data/backups/pk_trades-$(date +\%Y-\%m-\%d).db && find /var/data/backups -name "*.db" -mtime +30 -delete
```

---

## Rollback

```bash
ssh root@161.35.119.190
cd /opt/pk-trades
git log --oneline -10
git checkout <commit-hash>
pnpm build
pm2 restart pk-trades
```

---

## Quick reference

| What | Command |
|------|---------|
| SSH in | `ssh root@161.35.119.190` |
| View logs | `pm2 logs pk-trades` |
| Restart app | `pm2 restart pk-trades` |
| Stop app | `pm2 stop pk-trades` |
| Deploy | `ssh root@161.35.119.190 'bash /opt/pk-trades/deploy.sh'` |
| Backup DB | `cp /var/data/pk_trades.db /var/data/backups/pk_trades-$(date +%Y-%m-%d).db` |
| Check Caddy | `systemctl status caddy` |
| Check status | `pm2 status` |
| Live logs | `pm2 monit` |
