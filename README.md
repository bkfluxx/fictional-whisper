# Aura

A self-hosted, privacy-first personal journal. All data stays on your machine — AI runs locally via Ollama, everything is encrypted at rest with AES-256-GCM, and there is no cloud dependency of any kind.

## Features

- **Journal** — Rich-text entries with mood tracking, categories, tags, and templates
- **Voice notes** — Record audio attachments; transcribe with local faster-whisper
- **Guided sessions** — Conversational journaling guided by Aura, synthesised into an entry
- **AI chat** — RAG-powered chat grounded in your own entries (Ollama, fully local)
- **AI personas** — Shape the tone of chat and analysis with built-in or custom personas
- **Weekly digest** — AI-generated weekly reflection, auto-scheduled via cron
- **Insights** — Longitudinal pattern analysis across a custom date range
- **Analytics** — Streak tracking, activity heatmap, mood and category breakdowns
- **Full-text search** — HMAC-tokenised keyword search (no plaintext indexed)
- **Encrypted backups** — Scheduled exports with a separate backup key
- **Themes & text scale** — 12 built-in themes, adjustable font size

## Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router) · TypeScript |
| Database | PostgreSQL 16 + pgvector |
| ORM | Prisma |
| Styling | Tailwind CSS v4 · FlyonUI |
| Auth | NextAuth (credentials + optional TOTP) |
| AI | Ollama (local LLM + embeddings) |
| Transcription | faster-whisper-server (optional) |
| Encryption | AES-256-GCM (application layer) |
| Deployment | Docker Compose |

---

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose v2
- [Ollama](https://ollama.com/) running on the host (or as a container — see compose file)

### 1. Download the compose file

```bash
curl -fsSL https://raw.githubusercontent.com/bkfluxx/fictional-whisper/main/docker-compose.yml -o docker-compose.yml
```

### 2. Set your secrets

Open `docker-compose.yml` and replace every value marked `← CHANGE THIS`. Generate secrets with:

```bash
openssl rand -base64 32
```

Key variables:

| Variable | Description |
| --- | --- |
| `POSTGRES_PASSWORD` | Database password — must match in both `app` and `db` services |
| `NEXTAUTH_SECRET` | Random secret for session signing |
| `NEXTAUTH_URL` | Public URL of your instance, e.g. `http://192.168.1.10:3000` |
| `SEARCH_HMAC_SECRET` | HMAC key for keyword search — **do not change after first run** |
| `BACKUP_SECRET` | Encrypts backup exports — optional, leave blank to skip |
| `CRON_SECRET` | Bearer token for the digest cron endpoint |

### 3. Start

```bash
docker compose up -d
```

The image is pulled automatically from `ghcr.io/bkfluxx/fictional-whisper:latest`. No local build required.

### 4. Create your account

Visit `http://localhost:3000` (or your configured `NEXTAUTH_URL`) and follow the setup wizard to create your password and complete onboarding.

### 5. Configure Ollama

In **Settings → AI Settings**, set your Ollama base URL and choose a model.

Recommended models:

| Purpose | Model |
| --- | --- |
| LLM | `qwen3:5b` or `llama3.2:3b` |
| Embeddings | `nomic-embed-text` or `qwen3-embedding` |

If Ollama runs on the Docker host, use `http://host.docker.internal:11434` as the base URL.

---

## Portainer (Stack)

Paste the following into **Portainer → Stacks → Add stack → Web editor**.  
Replace every `changeme` value with a real secret before deploying.

```yaml
services:

  app:
    image: ghcr.io/bkfluxx/fictional-whisper:latest
    container_name: aura
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      POSTGRES_PASSWORD: changeme          # must match db service below
      POSTGRES_DB: aura
      NEXTAUTH_SECRET: changeme
      NEXTAUTH_URL: http://YOUR_IP:3000    # ← your server IP or domain
      SEARCH_HMAC_SECRET: changeme
      BACKUP_PATH: /app/backups
      BACKUP_SECRET: changeme
      CRON_SECRET: changeme
      # Ollama on the host (most common for Portainer users):
      OLLAMA_BASE_URL: http://host.docker.internal:11434
      # Uncomment if using the whisper service below:
      # WHISPER_BASE_URL: http://whisper:8000
    volumes:
      - aura_attachments:/app/attachments
      - aura_backups:/app/backups
      - aura_logs:/app/logs
    depends_on:
      db:
        condition: service_healthy

  db:
    image: pgvector/pgvector:pg16
    container_name: aura-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: aura
      POSTGRES_USER: fw
      POSTGRES_PASSWORD: changeme          # must match app service above
    volumes:
      - aura_db:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fw -d aura"]
      interval: 5s
      timeout: 5s
      retries: 10

  # Optional — local speech-to-text for voice note transcription
  # Uncomment and set WHISPER_BASE_URL in the app service above
  # whisper:
  #   image: fedirz/faster-whisper-server:latest-cpu
  #   container_name: aura-whisper
  #   restart: unless-stopped
  #   environment:
  #     ASR_MODEL: Systran/faster-whisper-small
  #   volumes:
  #     - aura_whisper_models:/root/.cache/huggingface

volumes:
  aura_db:
  aura_attachments:
  aura_backups:
  aura_logs:
  aura_whisper_models:
```

> **Tip — Ollama on the host:** In Portainer the hostname `host.docker.internal` resolves to the Docker host on most setups. If it doesn't, replace it with your server's LAN IP (e.g. `http://192.168.1.10:11434`).

---

## Optional Services

### Voice transcription (faster-whisper)

Uncomment the `whisper` service in the compose file and set `WHISPER_BASE_URL: http://whisper:8000` in the `app` environment. On first start the model (~500 MB for `small`) is downloaded automatically.

### Ollama inside Docker

If you'd rather not install Ollama on the host, uncomment the `ollama` service in the compose file. After starting, pull the models:

```bash
docker exec aura-ollama ollama pull qwen3:5b
docker exec aura-ollama ollama pull nomic-embed-text
```

---

## Updating

```bash
docker compose pull
docker compose up -d
```

Database migrations run automatically on startup.

To pin a specific version:

```yaml
image: ghcr.io/bkfluxx/fictional-whisper:0.3.0
```

Available tags are listed on the [releases page](https://github.com/bkfluxx/fictional-whisper/releases).

---

## Weekly Digest (cron)

To auto-generate weekly digests, call this endpoint on a schedule (e.g. every Sunday at 08:00):

```http
POST http://your-instance/api/ai/digest
Authorization: Bearer <CRON_SECRET>
```

---

## Security Notes

- All journal content is encrypted with AES-256-GCM at rest. The encryption key is derived from your password and never stored in plaintext.
- Keyword search uses HMAC tokens — no plaintext is indexed.
- Changing `SEARCH_HMAC_SECRET` after entries exist requires re-running `scripts/reindex-search.ts`.
- This app is designed for single-user, private self-hosting. Expose it over the internet only behind a reverse proxy with HTTPS.

## License

See [LICENSE](./LICENSE).
