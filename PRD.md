# PRD: Fictional Whisper
**A Self-Hosted Personal Journal & Notes Application**

---

## 1. Overview

**Fictional Whisper** is a self-hosted, privacy-first journaling and notes application for a single user. It combines the structured personal diary experience of Day One, the markdown-centric knowledge base feel of Obsidian, and the AI-augmented capture workflow of Blinko — all running entirely on your own infrastructure with no data leaving your machine.

**Tagline:** *Your thoughts, your server, your AI.*

---

## 2. Goals

- Provide a fast, distraction-free writing environment for daily journaling and freeform notes
- Keep all data private: self-hosted, encrypted at rest, with AI powered by a local Ollama instance
- Support rich markdown authoring with tagging, linking, and calendar-based navigation
- Offer AI features that surface insight and aid reflection without requiring cloud services

## 3. Non-Goals

- Multi-user or collaborative editing
- Cloud sync or SaaS hosting
- Mobile-native apps (responsive web only in v1)
- Real-time collaboration or sharing/publishing features
- Replacing a full knowledge graph tool like Obsidian for large second-brain workflows

---

## 4. Target User

**Persona: The Privacy-Conscious Solo Journaler**

- Technical enough to self-host a Docker/Node app and run Postgres
- Wants a single place for daily reflections, notes, ideas, and mood tracking
- Values privacy above all — does not want diary data on any third-party server
- Wants AI to help make sense of past entries, not just store them

---

## 5. Core Features (MVP)

### 5.1 Entry Editor
- Full markdown editor with live preview (split or toggle mode)
- Support for headings, bold/italic, lists, checkboxes, code blocks, blockquotes, tables
- Auto-save with debounce (no manual save required)
- Each entry has: title (optional), body, date/time, tags, mood (optional)
- Drag-and-drop image upload stored locally (no external CDN)

### 5.2 Tags
- Free-form tagging on any entry
- Tag browser/sidebar showing all tags with entry counts
- Filter entries by one or more tags (AND/OR logic)
- Inline `#tag` syntax in markdown auto-detected and linked

### 5.3 Calendar View
- Monthly calendar grid with dots/indicators on days that have entries
- Click a day to see all entries for that date
- Quick-add entry from any day in the calendar

### 5.4 Entry List & Search
- Chronological feed (most recent first) as the default home view
- Full-text search across all entries (see Section 7 for encrypted search strategy)
- Filter by: date range, tags, mood, has-attachment
- Sort by: created date, last modified

#### Search over Encrypted Data

Because entry bodies are AES-256-GCM encrypted, PostgreSQL `tsvector` full-text search cannot operate on them directly. The chosen strategy is **server-side decrypt-then-search**:

1. The API route decrypts entries in batches (e.g., 200 at a time) using the in-memory DEK (see §5.5)
2. Matching is done in Node.js using a simple substring / regex scan over decrypted plaintext
3. Only matching entry stubs (id, title, date, snippet) are returned to the client — never the full decrypted corpus
4. **Performance envelope**: for up to ~5,000 entries on a Pi 5, full-corpus decrypt-and-scan completes in < 500ms. Beyond that, a plaintext keyword-hash index (HMAC of each word, stored in a separate `search_tokens` table) provides O(1) lookups without exposing plaintext.
5. Semantic search (Phase 2) bypasses this entirely — pgvector ANN search operates on embeddings, not plaintext bodies.

Non-goal: client-side search (sending bulk encrypted data to browser) is rejected due to memory and latency on mobile browsers.

### 5.5 Encryption & Key Management

**Envelope encryption (two-layer key scheme):**

1. A random 256-bit **Data Encryption Key (DEK)** is generated once at first run and stored encrypted in the database
2. The DEK is encrypted with a **Key Encryption Key (KEK)** derived from the master password using Argon2id (PBKDF2 fallback)
3. All entry bodies, titles, and attachments are encrypted with the DEK using AES-256-GCM

**Why this matters:** changing the master password only re-encrypts the DEK (a single row), not every entry in the database. This makes password rotation instant regardless of corpus size.

**Key lifecycle:**

- On login: password → Argon2id → KEK → decrypt DEK → hold DEK in server memory for session duration
- On password change: decrypt DEK with old KEK, re-encrypt with new KEK, persist — entries untouched
- DEK never leaves the server; KEK never persists anywhere
- No plaintext journal content stored in the database
- Attachments encrypted on disk using the same DEK

### 5.6 Authentication
- Single-user password login (no registration flow)
- Session-based auth via NextAuth.js with credentials provider
- Optional: passphrase prompt on app load as a second layer before the session
- Brute-force protection (rate limiting on login route)

### 5.7 Data Import

Importing existing journals avoids lock-in and makes adoption frictionless.

Supported import sources (Phase 1):

- **Day One JSON export** — parse the standard Day One `.zip` (JSON + media), map entries to the internal schema, preserve original `createdDate`
- **Obsidian vault (markdown folder)** — ingest a directory of `.md` files; parse YAML frontmatter for date/tags; filenames become titles
- **Generic markdown** — single `.md` file or `.zip` of markdown files as a fallback

Import rules:

- Duplicate detection by `(createdAt, title)` — skip silently, don't overwrite
- All imported content encrypted with the DEK before writing to DB
- Import runs as a background job with a progress indicator; does not block the UI

### 5.8 Automated Local Backups

A nightly backup job (cron inside the Next.js container) runs `pg_dump`, encrypts the output with the KEK-wrapped DEK, and writes to a configurable local path (e.g., a mounted NAS or USB drive).

- Backup file format: `fictional-whisper-{YYYY-MM-DD}.pgdump.enc`
- Retention: keep last 30 backups, delete older ones automatically
- Backup status visible in Settings (last run, last success, file size)
- Restore: documented manual process via `pg_restore` + decryption script
- Optional: rsync to a secondary local path (no cloud)

### 5.9 Settings

- Change master password (re-encrypts DEK only, not entries)
- Configure Ollama endpoint URL and model names
- Toggle AI features on/off
- Export all entries (decrypted) as: JSON, Markdown zip, or CSV
- Configure backup destination path and retention count
- Trigger manual backup
- Danger zone: wipe all entries

---

## 6. AI Features (Ollama-Powered)

All AI features use a locally running Ollama instance. No data is sent to external APIs.

### 6.1 Mood Analysis
- After saving an entry, automatically infer mood (e.g., joyful, anxious, neutral, reflective, frustrated) from content
- Store mood tag alongside entry
- Mood trend chart on dashboard (last 30/90 days)
- User can override the inferred mood

### 6.2 Entry Summaries
- One-click "Summarize" button on any entry generates a 2–3 sentence TL;DR
- "Weekly Digest" — auto-summarize all entries from the past 7 days into a brief narrative
- Summaries are stored and re-usable (not re-generated on every view)

### 6.3 Writing Prompts
- "Inspire me" button on the new entry screen suggests a contextual writing prompt
- Prompts can be: general reflection, gratitude, goal-setting, or based on recent entry themes
- Option to seed prompts from the user's own past entries ("What were you thinking about this time last year?")

### 6.4 Semantic Search
- Embed entries using Ollama embedding models (e.g., `nomic-embed-text`)
- Store embeddings in Postgres using `pgvector` extension
- Semantic search UI: natural language query returns conceptually related entries even without keyword overlap
- "Similar entries" panel on each entry view

### 6.5 Chat with Your Journal
- Conversational interface to query across all journal entries
- RAG (Retrieval-Augmented Generation): semantic search retrieves relevant entries, then Ollama generates a response grounded in them
- Example queries: "What were my main stressors in February?", "When did I last write about my project goals?"
- Chat history is session-only (not persisted)

---

## 7. Technical Architecture

### Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Database | PostgreSQL + `pgvector` extension |
| ORM | Prisma |
| Auth | NextAuth.js (credentials provider) |
| Markdown | `@uiw/react-md-editor` or `TipTap` with markdown extension |
| AI Runtime | Ollama (local) via REST API |
| Encryption | Node.js `crypto` (AES-256-GCM) |
| Styling | Tailwind CSS |
| Deployment | Docker Compose (Next.js + Postgres + Ollama) |

### Data Model (simplified)

```
Entry
  id            UUID PK
  createdAt     Timestamp
  updatedAt     Timestamp
  title         Text (encrypted)
  body          Text (encrypted, markdown)
  mood          Enum (inferred or manual)
  embedding     Vector(1536)   -- pgvector
  tags          Tag[]

Tag
  id            UUID PK
  name          Text (unique)
  entries       Entry[]

Attachment
  id            UUID PK
  entryId       UUID FK
  filename      Text
  mimeType      Text
  data          Bytes (encrypted)
  createdAt     Timestamp
```

### Deployment
- Single `docker-compose.yml` spins up: Next.js app, Postgres (with pgvector), and optionally Ollama
- `.env` file holds: `DATABASE_URL`, `ENCRYPTION_KEY`, `NEXTAUTH_SECRET`, `OLLAMA_URL`
- Designed to run on a home server, VPS, or Raspberry Pi 5

### Raspberry Pi 5 Resource Guidance

The Pi 5 (8GB) can run the full stack, but model selection is critical. Expected idle memory footprint:

| Service | RAM |
|---|---|
| Next.js (prod build) | ~150 MB |
| PostgreSQL | ~100 MB |
| Ollama daemon | ~200 MB |
| **Headroom for models** | **~7.5 GB** |

**Recommended Ollama models:**

| Use case | Model | VRAM/RAM |
| --- | --- | --- |
| Generation (summaries, prompts, chat) | `phi3:mini` (Q4_K_M) | ~2.2 GB |
| Generation (higher quality) | `llama3.2:3b` (Q4_K_M) | ~2.0 GB |
| Embeddings (semantic search) | `nomic-embed-text` | ~270 MB |

**Constraints to design around:**

- Inference is CPU-only on Pi 5 — generation will take 5–20 seconds per response; design AI UIs with async loading states, never block the write path
- Run Ollama with `OLLAMA_NUM_PARALLEL=1` and `OLLAMA_MAX_LOADED_MODELS=1` to cap memory
- Embedding pipeline should run as a background job after save, not inline with the request
- Do not load the generation model and embedding model simultaneously; offload between tasks

---

## 8. Security & Privacy

| Concern | Mitigation |
|---|---|
| Data at rest | AES-256-GCM application-layer encryption; key never in DB |
| Auth brute force | Rate limiting + lockout on `/api/auth/...` routes |
| Session hijacking | HttpOnly, Secure, SameSite=Strict cookies |
| SQL injection | Prisma parameterized queries |
| XSS in markdown | Sanitize rendered HTML with DOMPurify |
| Ollama exposure | Ollama bound to localhost only; not exposed to public internet |
| Backup | Export flow provides decrypted backup; encrypted DB backups via pg_dump |

---

## 9. UX Principles

- **Speed first**: editor loads instantly; no loading spinners on the main write path
- **Dark mode by default**: easy on the eyes for late-night journaling; light mode toggle available
- **Minimal chrome**: sidebar collapses; fullscreen writing mode available
- **Keyboard-driven**: common actions have keyboard shortcuts (new entry, search, toggle preview)
- **No onboarding friction**: first run = immediately in the editor

---

## 10. Phased Roadmap

### Phase 1 — Foundation (MVP)
- [ ] Project scaffold: Next.js + Prisma + Postgres + Docker Compose
- [ ] Auth: single-user login with NextAuth credentials
- [ ] Entry CRUD with markdown editor
- [ ] Encryption at rest (entries + attachments)
- [ ] Tags + tag filtering
- [ ] Full-text search (server-side decrypt-then-scan + HMAC token index)
- [ ] Calendar view
- [ ] Export (JSON + Markdown zip)
- [ ] Data import (Day One JSON, Obsidian vault, generic markdown)
- [ ] Automated nightly local backup (encrypted pg_dump)

### Phase 2 — AI Layer
- [ ] Ollama integration + settings UI
- [ ] Mood analysis on save
- [ ] Entry summarization (single + weekly digest)
- [ ] pgvector setup + embedding pipeline
- [ ] Semantic search UI
- [ ] Writing prompts

### Phase 3 — Polish & Depth
- [ ] Chat with your journal (RAG interface)
- [ ] Mood trend dashboard / analytics
- [ ] "On this day" widget (past entries same date)
- [ ] Linked entries (wiki-style `[[entry]]` linking)
- [ ] PWA support for mobile browser use
- [ ] Optional rsync/S3-compatible offsite backup target

---

## 11. Success Criteria

- Entries are never stored or transmitted in plaintext
- All AI features work fully offline (Ollama only)
- Cold load of the editor < 1 second on local network
- Full-text search returns results < 200ms for up to 10,000 entries
- Single `docker-compose up` gets the app running from a fresh clone
