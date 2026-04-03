# Fictional Whisper

A self-hosted, privacy-first personal journal. All data stays on your machine — AI runs locally via Ollama, everything is encrypted at rest, and there is no cloud dependency of any kind.

## Features

- **Journal** — Rich-text entries with mood tracking, categories, and templates
- **AI chat** — RAG-powered chat grounded in your own entries (Ollama, fully local)
- **AI personas** — Shape the tone of chat and analysis with built-in or custom personas
- **Weekly digest** — AI-generated weekly reflection, schedulable via cron
- **Insights** — Longitudinal pattern analysis across a custom date range
- **Analytics** — Streak tracking, activity heatmap, mood and category breakdowns
- **Full-text search** — HMAC-tokenised keyword search (no plaintext stored)
- **Encrypted backups** — Scheduled exports with a separate backup key
- **Themes** — 12 built-in themes (light, dark, and everything in between)

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) · TypeScript |
| Database | PostgreSQL 16 + pgvector |
| ORM | Prisma |
| Styling | Tailwind CSS v4 · FlyonUI |
| Auth | NextAuth (credentials) |
| AI | Ollama (local LLM + embeddings) |
| Encryption | AES-256-GCM (application layer) |
| Deployment | Docker Compose |

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Ollama](https://ollama.com/) running on the host (or as a separate container)

### 1. Clone and configure

```bash
git clone https://github.com/bkfluxx/fictional-whisper.git
cd fictional-whisper
cp .env.example .env
```

Edit `.env` and fill in every `CHANGE_ME` value. Generate secrets with:

```bash
openssl rand -base64 32
```

Key variables:

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (use `db` as the host) |
| `POSTGRES_PASSWORD` | Must match the password in `DATABASE_URL` |
| `NEXTAUTH_SECRET` | Random secret for session signing |
| `NEXTAUTH_URL` | Public URL of your instance (e.g. `http://192.168.1.10:3000`) |
| `SEARCH_HMAC_SECRET` | HMAC key for keyword search — do not change after first run |
| `BACKUP_SECRET` | Optional: encrypts backup exports |

### 2. Start

```bash
docker compose up -d
```

### 3. Create your account

```bash
docker compose exec app npx tsx scripts/create-user.ts
```

Follow the prompts to set your password. Then open `http://localhost:3000` and complete the onboarding wizard.

### 4. Configure Ollama

In **Settings → AI Settings**, set your Ollama base URL and choose a model.

Recommended models:

- **LLM**: `qwen3:5b` or `llama3.2:3b` (balance of speed and quality)
- **Embeddings**: `nomic-embed-text` or `qwen3-embedding`

If Ollama is running on the Docker host, use `http://host.docker.internal:11434` as the base URL.

## Weekly Digest (optional cron)

To auto-generate digests, add a cron job that calls:

```http
POST http://your-instance/api/ai/digest
Authorization: Bearer <CRON_SECRET>
```

`CRON_SECRET` defaults to the value in `docker-compose.yml` but can be overridden in `.env`.

## Updating

```bash
git pull
docker compose build --no-cache
docker compose up -d
```

Database migrations are applied automatically on startup.

## Security Notes

- All journal content is encrypted with AES-256-GCM at rest. The encryption key is derived from your password and never stored in plaintext.
- Keyword search uses HMAC tokens — no plaintext is indexed.
- Changing `SEARCH_HMAC_SECRET` after entries exist requires re-running `scripts/reindex-search.ts`.
- This app is designed for single-user, private self-hosting. If you expose it over the internet, use a reverse proxy with HTTPS and strong authentication.

## License

See [LICENSE](./LICENSE).
