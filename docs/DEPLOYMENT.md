# Deployment — Hetzner VPS

Single-user Next.js + SQLite app on a cheap VPS with PM2 and Caddy.

**Cost:** ~$3.79/month (Hetzner CAX11 ARM) or ~$4.35/month (CX22 x86)

---

## 1. Create the server (~2 minutes)

1. Go to [console.hetzner.cloud](https://console.hetzner.cloud) → sign up
2. Click **"Add Server"**
   - Location: **Ashburn** (US East) or your preferred region
   - Image: **Ubuntu 24.04**
   - Type: **Shared vCPU → ARM64 → CAX11** ($3.79/mo — 2 vCPU, 4GB RAM, 40GB disk)
   - SSH Key: click "Add SSH Key" → paste your public key
     - If you don't have one: run `ssh-keygen -t ed25519` locally, then paste `~/.ssh/id_ed25519.pub`
   - Name: `pk-trades`
3. Click **"Create & Buy Now"**
4. Copy the server's **IP address** from the dashboard

---

## 2. Point your domain (optional but recommended)

If you have a domain (e.g. `trades.pk618.com`):

1. Go to your DNS provider
2. Add an **A record**: `trades` → `YOUR_SERVER_IP`
3. Wait a few minutes for propagation

If you don't have a domain, you can access via IP directly (no HTTPS).

---

## 3. SSH in and install dependencies (~5 minutes)

```bash
ssh root@YOUR_SERVER_IP
```

Then run this block:

```bash
# System updates
apt update && apt upgrade -y

# Install Node.js 22 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Install pnpm
npm install -g pnpm@11

# Install PM2 (process manager — keeps app alive)
npm install -g pm2

# Install Caddy (reverse proxy with automatic HTTPS)
apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy

# Create app directory
mkdir -p /opt/pk-trades
mkdir -p /var/data
```

---

## 4. Clone and build the app (~3 minutes)

```bash
cd /opt/pk-trades

# Clone from GitHub
git clone https://github.com/pruthvi99/pk-trades-journal.git .

# Install dependencies
pnpm install --frozen-lockfile

# Build Next.js
pnpm build

# Run database migrations
DATABASE_PATH=/var/data/pk_trades.db pnpm db:migrate
```

---

## 5. Set environment variables

Create the env file:

```bash
cat > /opt/pk-trades/.env << 'EOF'
DATABASE_PATH=/var/data/pk_trades.db
SESSION_SECRET=PASTE_A_RANDOM_HEX_HERE
ADMIN_PASSWORD=YOUR_LOGIN_PASSWORD
NODE_ENV=production
TZ=America/Chicago
PORT=3000
EOF
```

Generate the secret:

```bash
# Run this, then paste the output into .env as SESSION_SECRET
openssl rand -hex 32
```

---

## 6. Start with PM2

```bash
cd /opt/pk-trades

# Start the app
pm2 start pnpm --name pk-trades -- start

# Verify it's running
pm2 logs pk-trades --lines 20

# You should see:
#   ▲ Next.js 16.2.6
#   - Local: http://0.0.0.0:3000

# Save PM2 config so it auto-starts on reboot
pm2 save
pm2 startup
```

Test it works:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login
# Should print: 200
```

---

## 7. Configure Caddy for HTTPS

### With a domain:

```bash
cat > /etc/caddy/Caddyfile << 'EOF'
trades.pk618.com {
    reverse_proxy localhost:3000
}
EOF

systemctl restart caddy
```

Caddy automatically gets an SSL certificate from Let's Encrypt. Your app is now live at `https://trades.pk618.com`.

### Without a domain (IP only, no HTTPS):

```bash
cat > /etc/caddy/Caddyfile << 'EOF'
:80 {
    reverse_proxy localhost:3000
}
EOF

systemctl restart caddy
```

App is live at `http://YOUR_SERVER_IP`.

---

## 8. Firewall

```bash
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

---

## Every future deploy

From your local machine:

```bash
git add .
git commit -m "your change"
git push github
```

Then SSH into the server and run:

```bash
cd /opt/pk-trades
git pull
pnpm install --frozen-lockfile
pnpm build
DATABASE_PATH=/var/data/pk_trades.db pnpm db:migrate
pm2 restart pk-trades
```

Or create a one-liner script at `/opt/pk-trades/deploy.sh`:

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

Then future deploys are just: `ssh root@YOUR_SERVER_IP 'bash /opt/pk-trades/deploy.sh'`

---

## Rollback

```bash
cd /opt/pk-trades
git log --oneline -10          # find the commit to roll back to
git checkout <commit-hash>
pnpm build
pm2 restart pk-trades
```

---

## Database backups

### Manual backup:

```bash
cp /var/data/pk_trades.db /var/data/backups/pk_trades-$(date +%Y-%m-%d).db
```

### Automatic nightly backup (cron):

```bash
mkdir -p /var/data/backups

# Add to crontab
crontab -e
# Add this line:
0 6 * * * cp /var/data/pk_trades.db /var/data/backups/pk_trades-$(date +\%Y-\%m-\%d).db && find /var/data/backups -name "*.db" -mtime +30 -delete
```

This backs up daily at 6 AM and deletes backups older than 30 days.

---

## Monitoring

```bash
pm2 status          # process status
pm2 logs pk-trades  # live logs
pm2 monit           # CPU/memory dashboard
```

---

## Quick reference

| What | Command |
|------|---------|
| SSH in | `ssh root@YOUR_SERVER_IP` |
| View logs | `pm2 logs pk-trades` |
| Restart app | `pm2 restart pk-trades` |
| Stop app | `pm2 stop pk-trades` |
| Deploy | `ssh root@YOUR_SERVER_IP 'bash /opt/pk-trades/deploy.sh'` |
| Backup DB | `cp /var/data/pk_trades.db /var/data/backups/pk_trades-$(date +%Y-%m-%d).db` |
| Check Caddy | `systemctl status caddy` |
| Renew SSL | Automatic (Caddy handles it) |
