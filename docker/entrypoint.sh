#!/bin/sh
set -e

# Use Docker service name for db host (DATABASE_URL from .env.local uses localhost for dev)
export DATABASE_URL="postgresql://fw:${POSTGRES_PASSWORD}@db:5432/fictional_whisper"

# Run Prisma migrations on startup
node node_modules/prisma/build/index.js migrate deploy

# Start the cron daemon in background
supercronic /app/crontab &

# Start Next.js
exec node server.js
