# Changelog

All notable changes to Aura will be documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

## [0.4.0] - 2026-04-06

### Added

- Guided / conversational journal mode — Aura leads a reflective conversation and synthesises it into a structured entry with mood and categories; accessible from the New Entry picker

### Fixed

- User-created categories (auto-generated during onboarding) now display correctly with their emoji and name on the journal list, reading pane, and full entry view page — previously showed raw DB IDs
- Entry preview on the journal list no longer shows template heading text (e.g. "Date & Location Species & Count") — headings are stripped before building the preview
- Onboarding chat now correctly embraces non-standard journaling purposes (e.g. recipe logging, workout tracking) and tells the user a custom template will be created, instead of incorrectly deflecting
- First-run setup page and `/api/setup` were blocked by the auth proxy, causing a redirect to `/login` on a fresh install — proxy matcher now correctly excludes `/setup`, `/api/setup`, and public assets

### Changed

- `docker-compose.yml` is now fully self-contained with no bind mounts — the pgvector extension is created by the entrypoint at startup, making it compatible with Portainer stacks without any local files
- README updated with a ready-to-paste Portainer stack template and improved quick-start documentation

## [0.3.0] - 2026-04-06

### Added

- Voice note recordings saved as encrypted audio attachments on journal entries
- Custom waveform player with amplitude visualisation, scrubbing, and play/pause
- faster-whisper transcription service in Docker Compose — one-click transcribe from any voice note
- Voice-only indicator on journal list (italic "Voice note" label + mic badge)
- Reading pane on large screens — click an entry to preview it without navigating away
- Full-height mic strip on entry cards that have voice recordings
- Text scale setting in Settings → Appearance (90 % – 130 %, persisted across sessions)
- Delete entry button with inline confirm dialog on the edit page
- Voice notes now visible on the read-only entry view page

### Changed

- AI assistant renamed from **Whisper** to **Aura** throughout the app, onboarding, system prompts, and personas
- Voice recording UX redesigned: record → preview with playback → Save note / Transcribe / Discard
- Recording is preserved as an attachment even after transcription; users delete it manually
- Whisper transcription service added to `docker-compose.dev.yml`; commented-out stub in production `docker-compose.yml`

### Fixed

- Waveform bars no longer stretch on wide layouts (capped at 4 px)
- Voice notes now appear on the read-only entry view page, not just the edit page

## [0.2.0] - 2026-04-03

### Added

- Pre-built Docker images published to GitHub Container Registry (`ghcr.io/bkfluxx/fictional-whisper`) on every version tag — no local build required
- Error log viewer in Settings → Advanced: colour-coded preview of application errors, download as `.txt`, and one-click clear
- File-based logger (`/app/logs/aura.log`) with 5 MB rotation, persisted via Docker volume

## [0.1.0] - 2026-04-04

### Added
- AES-256-GCM encrypted journal — all entries, titles, and attachments encrypted at rest
- Mood tracking, categories, tags, and calendar view
- Semantic search via pgvector and nomic-embed-text embeddings
- AI features powered by local Ollama: chat with journal context (RAG), weekly digest, longitudinal pattern insights, per-entry analysis
- AI personas and custom default AI voice (system prompt)
- Journal templates (built-in + custom) with AI-generated template support during onboarding
- Two-factor authentication (TOTP) with authenticator app support
- Auto idle logoff after 30 minutes of inactivity
- Import from Aura JSON, Day One JSON, Markdown files, and Obsidian vaults (zip)
- Export as encrypted JSON or Markdown
- Self-hosted via Docker Compose with PostgreSQL + pgvector
- Nightly encrypted backup with configurable retention
- Analytics: activity heatmap, mood breakdown, category distribution, weekly digest history
- Onboarding flow with AI-guided conversation
