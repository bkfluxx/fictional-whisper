# ---------- builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN apk add --no-cache openssl && npx prisma generate
RUN npm run build

# ---------- runner ----------
FROM node:20-alpine AS runner
WORKDIR /app

# Install pg_dump for the backup script and supercronic for cron
RUN apk add --no-cache postgresql16-client openssl && \
    ARCH=$(uname -m | sed 's/aarch64/arm64/;s/x86_64/amd64/') && \
    wget -qO /usr/local/bin/supercronic \
      "https://github.com/aptible/supercronic/releases/download/v0.2.29/supercronic-linux-${ARCH}" && \
    chmod +x /usr/local/bin/supercronic

ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/docker/crontab ./crontab

# Prisma CLI + engines needed for migrate deploy at startup
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
# pg driver needed by Prisma at runtime (migrate deploy + query engine)
COPY --from=builder /app/node_modules/pg ./node_modules/pg
COPY --from=builder /app/node_modules/pg-cloudflare ./node_modules/pg-cloudflare
COPY --from=builder /app/node_modules/pg-connection-string ./node_modules/pg-connection-string
COPY --from=builder /app/node_modules/pg-int8 ./node_modules/pg-int8
COPY --from=builder /app/node_modules/pg-pool ./node_modules/pg-pool
COPY --from=builder /app/node_modules/pg-protocol ./node_modules/pg-protocol
COPY --from=builder /app/node_modules/pg-types ./node_modules/pg-types
COPY --from=builder /app/node_modules/pgpass ./node_modules/pgpass

RUN mkdir -p /app/attachments /app/backups /app/logs

# Entrypoint runs both Next.js and the cron daemon
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
