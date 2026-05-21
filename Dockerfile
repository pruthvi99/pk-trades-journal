FROM node:20-bookworm-slim

# Install build deps for better-sqlite3 native compilation
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

# Install pnpm 11 (matches local version)
RUN npm install -g pnpm@11

WORKDIR /app

# Copy dependency manifests first (Docker layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Rebuild better-sqlite3 for this platform
RUN pnpm rebuild better-sqlite3

# Copy application source
COPY . .

# Build Next.js
RUN pnpm build

# Runtime config — Next.js reads these
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Start: create data dir, run migrations, serve
CMD ["sh", "-c", "mkdir -p \"$(dirname \"$DATABASE_PATH\")\" && pnpm db:migrate && pnpm start"]
