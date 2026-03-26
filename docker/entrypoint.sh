#!/bin/sh
set -e

# Run Prisma migrations on startup
node_modules/.bin/prisma migrate deploy

# Start the cron daemon in background
supercronic /app/crontab &

# Start Next.js
exec node server.js
