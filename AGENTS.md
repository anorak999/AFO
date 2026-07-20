# AGENTS.md

## Project

**AFO — Advanced File Organizer (v2.0, Tauri Edition).** Cross-platform desktop app for rule-based file organization, duplicate detection, batch rename, and metadata-aware sorting. Complete rewrite from Python/tkinter to Tauri.

## Current State

Pre-code greenfield. The only authored file is `AFO_PRD_Tauri.md` — read it for the full feature spec and architecture.

## Tech Stack (from PRD)

- **Backend:** Tauri + Rust (async Tokio runtime)
- **Frontend:** React or Svelte (undecided), rendered in OS native webview
- **Key crates:** `blake3` (hashing), `rayon` (parallelism), `notify` (fs watching), `rusqlite` (undo journal), `kamadak-exif` + `lofty` (metadata), `tokio-cron-scheduler` (scheduling)
- **Key frontend deps:** Framer Motion or Svelte transitions, React Flow (visual rule builder), Zustand or Svelte stores

## Before Making Changes

- No build/test/lint setup exists yet. You will be creating toolchain config from scratch — follow current best practices for Tauri v2 + your chosen frontend framework.
- The PRD specifies exact crate and package choices. When scaffolding, use the dependencies listed in `AFO_PRD_Tauri.md §8`.
- The intended directory layout is in `AFO_PRD_Tauri.md §5`. Follow it rather than inventing a new structure.

## Rules

1. **Project Log** — Maintain `Project_Log.md` for every development session. Log every test, commit, push, code change, debugging attempt, and architectural decision. If the agent enters a debugging loop, the log is the first place to look for the most efficient path forward. Never delete or overwrite prior log entries — append only.
2. **Commit Every Change** — Every meaningful change (scaffold, feature, fix, config) must be committed and pushed. Use `gh` to interact with the GitHub repo `AF0`. Follow conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`. Push immediately after commit.

## Gotchas

- Undo/redo journal must persist to `~/.local/share/afo/journal.db` (SQLite). Operations must write journal entries **before** reporting success — if journal write fails, flag the operation "unrecoverable" but still complete it.
- Duplicate detection uses `blake3`, not MD5/SHA. The PRD is explicit about this.
- Real-time file watching is **opt-in per directory**, not global. Debounce window is 300ms.
- Recursive scanning has a hard depth cap (default 5). Don't remove it.
- Rule engine uses AND logic for conditions, sequential actions. Rules are JSON-serialized — `AFO_PRD_Tauri.md §4.2` defines the full schema.
- Symlinks require elevated privileges on Windows. Don't assume cross-platform symlink availability.
