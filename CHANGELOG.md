# Changelog

All notable changes to Aura will be documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

## [0.7.7] - 2026-06-01

### Added

- Mood check-in widget — quick two-tap flow on the Today page (pick group → pick emotion) logs a mood snapshot without opening the editor; shows last logged mood as a hint
- Mood snapshots — dedicated `entryType: "mood"` stored as a first-class entry; renders as a compact pill card in the journal list and Today page entries, with its own detail view (centered face icon + label + timestamp)
- Mood trend chart — 30-day smooth spline area chart on the Analytics Stats tab showing daily average mood score (Bright=5 → Tense=1); hover any dot for the mood label and date; sits above the existing mood dot grid
- Timezone support — `TZ: America/New_York` added to both docker-compose files so all date boundaries, streak calculations, and entry grouping use Eastern time rather than UTC

### Fixed

- Delete confirmation for mood snapshots now uses the same modal overlay pattern as journal entries (blurred backdrop, red Delete button, Cancel button) on both the detail page and the split-pane reading view
- Journal list date grouping — entries were bucketed under the wrong date when the UTC date differed from the local (Eastern) date; all grouping now uses local date methods
- Today page query boundaries — `gte`/`lte` range for today's entries now uses local midnight rather than UTC midnight
- Streak calculation — uses local date arithmetic throughout (today page and analytics) so streaks don't break at UTC midnight
- Analytics heatmap and monthly breakdowns — all date keys now derived from local date methods

## [0.7.6] - 2026-06-01

### Added

- Private entries — entries can be marked private via a lock pill button (desktop toolbar + mobile footer); private entries are blurred in the journal list, reading pane, full reading page, and Today page with a tap-to-reveal interaction; private entries are excluded from weekly digest and AI insights by default with an "Include private entries" toggle on those pages
- Image uploads — images can be attached to entries via a file picker (desktop + mobile) or by pasting directly from the clipboard (Cmd+V / long-press paste); images are encrypted at rest alongside the entry body and render inline in the editor and reading view

### Changed

- Today page — the "recent entry" card below the calendar now shows all entries written today (newest first) with an entry count, rather than the single most recent entry across all dates

### Fixed

- Voice notes section — no longer shows image attachments as blank audio players; filtered to `audio/*` mime types only
- Journal list — mic icon no longer appears on entries that have image attachments but no voice notes
- Image paste on iOS — clipboard items iterated correctly so a multi-representation pasteboard doesn't trigger duplicate uploads

## [0.7.5] - 2026-05-31

### Added

- Transition animations — page content fades in on navigation; formatting toolbar smoothly collapses/expands; delete modal and category picker slide+fade in; goals menu fades from top; all buttons and link-buttons scale to 0.97 on press; all animations respect `prefers-reduced-motion`
- iOS zoom prevention — global CSS rule pins all inputs, selects, and textareas to `font-size: 1rem` on mobile, preventing iOS Safari from auto-zooming on focus

### Changed

- Entry title — replaced single-line `<input>` with an auto-resizing `<textarea>` that wraps naturally for long titles; bumped size to `text-3xl` for clearer visual hierarchy
- Entry metadata row — tags input takes full width on mobile; date and mood are grouped on a row below; collapses to side-by-side on desktop
- Design standardisation — all card borders unified to `border-border` semantic token (was mixed `border-foreground/10`); analytics goals stat cards gain consistent borders; chat page heading raised to `text-xl` to match all other pages; chat send button changed to `rounded-full` pill to match primary button convention throughout the app
- Goals page — status badge bumped from `text-[10px]` to `text-xs`; checkbox and menu button tap targets raised to 44px; filter tabs are horizontally scrollable with `shrink-0` on each tab

### Fixed

- iOS tap-zoom — editor prose font bumped from 15px to 16px (`.fw-prose`); all form inputs across goals, settings, onboarding, guided session, personas, and templates pages now render at 16px minimum on mobile
- `+ category` button — increased vertical padding from `py-0.5` (~26px) to `py-1.5` for a comfortable tap target
- Analytics goals list rows — added `min-h-[44px]` to goal rows
- Entry prose — `max-width: 100%` on `.fw-prose pre` prevents wide code blocks from breaking the mobile layout
- Settings tab bar fade gradient — narrowed from `w-8` to `w-6`

### Accessibility

- `prefers-reduced-motion` — global CSS rule collapses all transition and animation durations to near-zero when the OS preference is set
- Focus rings — title textarea, tags input, date, and mood select in the entry form now show a visible `primary/40` ring on keyboard focus via `focus-visible`
- `aria-label` — added to entry title textarea, tags input, date input, mood select, delete button, and goals menu button
- `aria-live="polite"` — save state span ("Saving…" / "Saved" / "Error") now announced by screen readers
- `role="dialog"` + `aria-modal` + `aria-labelledby` — delete confirmation modal correctly identified as a dialog by assistive technology
- `aria-expanded` — goals menu button reflects open/closed state

## [0.7.4] - 2026-05-31

### Added

- Template and category SVG icons — unique Heroicons-based icons for every built-in template and journal type, rendered consistently across the New Entry picker, Templates settings, Categories settings, journal list cards, and entry detail view; eliminates `[?]` rendering on iOS
- Formatting toolbar toggle — a "Format" strip above the editor lets users collapse the toolbar on both mobile and desktop; defaults to open on desktop, closed on mobile
- Mobile floating footer — Mic and AI buttons appear as matching pill buttons anchored to the bottom of the editor on mobile
- Desktop toolbar action pills — Mic and AI pill buttons live in the toolbar strip on desktop so they're always visible and accessible regardless of toolbar state

### Fixed

- Delete confirmation — replaced the inline header expansion (which overflowed on narrow mobile screens) with a centered modal overlay
- AI panel — opens as a full-screen overlay on mobile instead of pushing the editor aside; includes a close button

## [0.7.3] - 2026-05-30

### Fixed

- Export section — added plaintext warning banner reminding users that exported files contain unencrypted journal entries
- Mobile nav drawer — removed search bar from slide-over menu (search is accessible via the journal page)
- Personas settings — enable/disable toggle now uses `shrink-0` and a fixed gap so it no longer clips at the screen edge on narrow mobile layouts

## [0.7.2] - 2026-05-30

### Fixed

- PWA safe area — mobile top bar now absorbs `env(safe-area-inset-top)` via `viewport-fit=cover`; content no longer clips under the notch when the app is opened from a home screen bookmark
- Chat sidebar — on mobile and tablet the sidebar now opens as a full-width overlay with a dark backdrop instead of splitting the screen; closes on backdrop tap or session selection; defaults to open only at ≥1024px
- Entry detail view — category pill labels no longer include emoji (fixes `[?]` rendering on iOS)
- Settings tab bar — restricted drag to horizontal-only with `touch-pan-x`; added right-edge fade gradient to hint at horizontal scroll
- Analytics stat cards — hero and goals stat rows changed from fixed `grid-cols-3` to `grid-cols-1 sm:grid-cols-3` to prevent cramped layout on narrow screens
- Touch targets — MobileNav hamburger and close buttons, journal "New entry" button, entry view back link and edit link all raised to 44px minimum touch target height

## [0.7.1] - 2026-05-30

### Fixed

- Today page calendar — prev navigation now caps at the month of the oldest journal entry; previously the calendar could be scrolled back indefinitely into empty months
- Journal date filter — single-day links from the calendar now correctly include entries written at any time of day (filter extended to cover full 24 hours: `T00:00:00Z` – `T23:59:59Z`)
- Journal page — date filter label shown below heading when arriving from a calendar link; empty state adapts to "No entries on this day" with a "View all entries" CTA when a date filter is active

## [0.7.0] - 2026-05-29

### Added

- Loading skeletons — replaced all bare "Loading…" text across 9 components (goals, entry pane, chat history, AI models, personas, two-factor, categories, templates, error log) with animated pulse skeleton placeholders that match each section's shape
- Toast notification system — integrated Sonner; `<ToasterProvider>` mounted once in the app layout; `toast.success/error/loading` called at every async action site (save entry, delete entry, goals CRUD, personas CRUD, categories CRUD, templates CRUD, export, import, password change, system prompt save)
- Export and import toasts — export shows a loading toast that morphs to success/error on completion; import mirrors the same pattern; `alert()` calls removed

### Changed

- Entry save/delete — explicit Save button and Cmd+S now fire a `toast.success("Entry saved")` confirmation; errors surface via `toast.error` instead of silently failing

### Fixed

- Theme palette switcher not updating surface and tertiary colors — `buildVars()` in `theme.ts` now outputs `--theme-hue`, `--tertiary`, `--tertiary-foreground`, `--surface-dark`, and `--surface-dark-foreground` so the injected style tag takes full ownership of all accent tokens; previously only `--primary` was overridden, leaving teal artifacts from the default hue
- Weekly digest error masking — unhandled throws from `generateText` caused Next.js to return an HTML 500 page; the client's unconditional `res.json()` call on that HTML threw into the generic catch and showed a misleading "Something went wrong — is Ollama running?" regardless of the real error; fixed with server-side try/catch returning proper JSON 502 with a descriptive message, and client-side safe JSON parsing
- Database name inconsistency — `.env.example` and `docker-compose.dev.yml` referenced `fictional_whisper`; corrected to `aura` to match `entrypoint.sh`'s override and the actual running database

## [0.6.0] - 2026-05-29

### Added

- Today page — new default landing page at `/today`; shows a time-aware greeting (computed client-side for correct local timezone), current streak badge, prompt-of-the-day card with CTA to new entry, mini dot-calendar for the current month, and most recent entry preview card
- Entry date picker — date input in the entry editor metadata row allows backdating entries to any past date; `entryDate` drives list order, calendar, and analytics
- Analytics stat row — 3-card hero strip (🔥 streak / 📓 this month / 📅 days written) at the top of the Stats tab; mood breakdown section now rendered inside a dark `bg-foreground` card

### Changed

- Color palette switched from olive/green to warm cream/ivory — background is a parchment tone (`oklch(0.960 0.018 82)`), foreground is warm ink brown (`oklch(0.165 0.028 62)`), cards are near-white for visible white-on-cream separation
- Journal list redesigned — vertical timeline (dots + connecting line) removed; each day group opens with a `Weekday · Date` section header in small-caps; card padding increased to `px-5 py-4`; most recent entry gets a dark inverted card (`bg-foreground text-background`)
- Entry view polished — date displayed as small-caps uppercase header; mood shown as a pill badge; categories and tags use larger `px-3 py-1` pills; word count added to nav bar; subtle divider separates metadata from body
- Sidebar — logo reduced to 32×32 inline with app name text; active nav item uses a full pill (`rounded-full bg-foreground text-background`) instead of a square highlight; "Today" added as the first nav item with a home icon
- All primary CTA buttons standardised to `rounded-full` across every page and settings panel (26 occurrences)
- Editor toolbar fades to 15% opacity while typing and restores smoothly after 1.5 s idle or immediately on mouse hover
- Default route `/` and post-login redirect now land on `/today`

## [0.5.0] - 2026-05-22

### Added

- Goal / intention tracking — create goals with a title, description, and optional target date; set status (active, completed, abandoned); weekly AI digest now includes active goals in its summary
- Recovery codes — generate a one-time emergency recovery code in Settings → Security; consuming the code decrypts and re-wraps the account key so the master password can be reset without data loss
- Model capabilities detection — app auto-detects whether the selected Ollama model supports thinking, vision, or completion-only mode and adjusts AI features accordingly
- Empty states for journal list, goals, analytics, and chat sidebar — consistent design with icon, heading, subtitle, and contextual CTA
- Mobile bottom navigation bar — persistent tab bar on small screens for journal, goals, analytics, calendar, chat, and settings
- Color palette system — CSS variable-driven palette with Olive/Green default theme; palette is fully switchable via `globals.css` without touching component code
- Custom typography — Lora (headings) and Roboto (body) via Google Fonts; Geist Mono for code blocks
- Content density setting — choose Comfortable / Balanced / Compact in Settings → Appearance

### Changed

- Replaced FlyonUI with Shadcn/ui and next-themes — cleaner component primitives, first-class dark-mode support, and no dependency on DaisyUI's CSS cascade
- Replaced all hardcoded `indigo-*` Tailwind classes with CSS variable tokens (`bg-primary`, `text-primary`, `border-primary`, etc.) across 36 files — the entire color accent system is now theme-driven with zero hardcoded colors

### Fixed

- Onboarding AI chat timed out on qwen3.5 and other reasoning models — disabled thinking mode (`think: false`) and capped context to 4 k tokens (`num_ctx: 4096`); the default 262 k context window required a massive KV cache allocation that stalled the first response for 2+ minutes
- 5 UI issues in settings and analytics (layout overflow, contrast, spacing)

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
