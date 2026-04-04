# Changelog

All notable changes to Aura will be documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

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
