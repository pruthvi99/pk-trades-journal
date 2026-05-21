#!/bin/sh
set -e

echo "=== pk_trades starting ==="
echo "DATABASE_PATH=$DATABASE_PATH"
echo "PORT=$PORT"
echo "NODE_ENV=$NODE_ENV"

# Ensure data directory exists for SQLite
mkdir -p "$(dirname "$DATABASE_PATH")"

# Run database migrations
echo "Running migrations..."
pnpm db:migrate

# Start Next.js — explicit flags so Docker/Railway env can't interfere
echo "Starting Next.js on 0.0.0.0:${PORT:-3000}..."
exec ./node_modules/.bin/next start -H 0.0.0.0 -p "${PORT:-3000}"
