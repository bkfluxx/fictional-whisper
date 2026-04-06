#!/bin/sh
set -e

# Build DATABASE_URL from components so it works regardless of what's in .env
export DATABASE_URL="postgresql://fw:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-aura}"

# Enable pgvector extension before migrations (idempotent — safe to run every start)
psql "${DATABASE_URL}" -c "CREATE EXTENSION IF NOT EXISTS vector;" 2>/dev/null || true

# Run Prisma migrations on startup
node node_modules/prisma/build/index.js migrate deploy

# Start the cron daemon in background
supercronic /app/crontab &

# Start Next.js
exec node server.js
