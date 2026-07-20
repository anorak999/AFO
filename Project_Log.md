# Project Log — AFO v2.0

Development log. Append-only. Every commit, push, code change, and decision is recorded here.

---

## 2025-07-20 — Phase 1: Scaffold & Dev Environment

### Session Start
- Loaded AGENTS.md, AFO_PRD_Tauri.md, TODO.md
- User requested Phase 1 scaffolding with two rules: maintain Project_Log.md, commit+push every change

### AGENTS.md Updated
- Added Rule 1: Maintain Project_Log.md for every dev session
- Added Rule 2: Commit and push every change using `gh`, repo `AF0`, conventional commits

### Prerequisites Verified
- Rust 1.96.1, Cargo 1.96.1
- Node 22.23.1, npm 10.9.8
- gh 2.96.0
- webkit2gtk-4.1 installed (Linux)
- No remote configured — repo `AF0` to be created

### Tauri v2 Scaffold — Manual
- `create-tauri-app` CLI hung on interactive prompts → manual scaffolding chosen
- Created directory structure per PRD §5

### Frontend Config Files Created
- `package.json` — React 18, Vite 5, Tailwind 3.4, Framer Motion 11, ReactFlow 11, Zustand 4, @tauri-apps/api v2
- `tsconfig.json` / `tsconfig.node.json` — strict TS, ES2021
- `vite.config.ts` — React plugin, Tauri HMR, path aliases
- `tailwind.config.js` — Geist font, AFO color palette
- `postcss.config.js` — tailwindcss + autoprefixer

### React Entry Files
- `index.html` — Vite entry point
- `src/main.tsx` — React root mount
- `src/App.tsx` — placeholder "AFO v2.0" text
- `src/index.css` — Tailwind directives, Geist font import, custom scrollbar

### Rust Backend
- `src-tauri/Cargo.toml` — all deps per PRD §8 (tauri 2, tokio, rayon, blake3, notify, rusqlite, kamadak-exif, lofty, tokio-cron-scheduler, chrono, uuid, dirs)
- `src-tauri/build.rs` — tauri_build
- `src-tauri/tauri.conf.json` — window 1200x800, title "AFO"
- `src-tauri/src/main.rs` — entry point
- `src-tauri/src/lib.rs` — Tauri builder with 4 initial commands
- `src-tauri/src/commands.rs` — scan_directory, organize_by_extension, organize_by_date, batch_rename
- `src-tauri/src/core/mod.rs` — 8 module declarations

### Core Module Stubs
- `organizer.rs` — full implementation of scan, organize_by_extension, organize_by_date, batch_rename
- `rule_engine.rs` — stub (Phase 3)
- `duplicates.rs` — stub (Phase 4)
- `metadata.rs` — stub (Phase 5)
- `journal.rs` — stub (Phase 6)
- `watcher.rs` — stub (Phase 7)
- `scheduler.rs` — stub (Phase 8)
- `cloud_sync.rs` — stub (post-launch)

### Frontend Components
- `Sidebar.tsx` — navigation stub with 5 nav items
- `OrganizePanel.tsx` — 3 mode buttons stub
- `RuleBuilder.tsx` — Phase 3 placeholder
- `DuplicatesPanel.tsx` — Phase 4 placeholder
- `HistoryPanel.tsx` — Phase 6 placeholder
- `CommandPalette.tsx` — Phase 9 placeholder
- `SettingsPanel.tsx` — Phase 7/8 placeholder
- `lib/tauri-bridge.ts` — typed IPC wrappers for 4 commands

### Other Files
- `.gitignore` — node_modules, dist, target, .env, IDE, OS files
- `Project_Log.md` — this file
- `TODO.md` — 10-phase development plan

### Remaining Phase 1 Tasks
- `npm install` to generate lockfile
- Create GitHub repo `AF0` via `gh`
- First commit and push
- Smoke test `cargo tauri dev`
