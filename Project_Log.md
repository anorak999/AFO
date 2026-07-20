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

### Phase 1 Completion (2025-07-20)
- Ran `npm install` — generated `package-lock.json` (193 packages)
- Created GitHub repo `https://github.com/anorak999/AF0` via `gh repo create AF0 --private`
- First commit: `feat: initial Tauri v2 scaffold with React frontend and Rust backend` (49 files)
- Pushed to `origin/master`
- Frontend builds successfully (`npm run build` — Vite production build OK)
- **Rust backend smoke test blocked**: Missing GTK3/WebKit2GTK dev headers on this system
  - Error: `gdk-3.0.pc` not found — need `libgtk-3-dev` and `libwebkit2gtk-4.1-dev`
  - Runtime libs installed (`libwebkit2gtk-4.1-0`) but not `-dev` packages
  - Requires `sudo apt-get install libgtk-3-dev libwebkit2gtk-4.1-dev`
  - **Blocker**: No sudo access in this session — user must install manually or configure NOPASSWD

## 2025-07-21 — App Shell & Full OrganizePanel

### What changed
- **`src/lib/store.ts`** (new) — Zustand store for active panel state (`Panel` union type)
- **`src/App.tsx`** — Replaced placeholder with flex layout: Sidebar (256px) + main content area, zustand-driven panel routing
- **`src/components/Sidebar/Sidebar.tsx`** — Reads `activePanel` from zustand store, highlights active nav item with `bg-white/10`, data-driven NAV_ITEMS array
- **`src/components/Sidebar/index.tsx`** — Updated to re-export from `./Sidebar`
- **`src/components/OrganizePanel/OrganizePanel.tsx`** — Full UI: directory picker (try/catch around `@tauri-apps/plugin-dialog` dynamic import), mode tabs (extension/date/rename), date format selector, rename pattern input with placeholder docs, dry-run toggle, scan + execute buttons calling tauri-bridge functions, result summary card, scan results table (max 20 rows)
- **`src/components/OrganizePanel/index.tsx`** — Updated to re-export from `./OrganizePanel`
- **`src/types/tauri-plugins.d.ts`** (new) — Ambient type declaration for `@tauri-apps/plugin-dialog` (not yet installed as npm dep)

### Design decisions
- Zustand chosen over lifting state to App because it's already installed and keeps components decoupled
- Directory picker wrapped in dynamic `import()` + try/catch so app works before the dialog plugin is installed — falls back to error text
- Rename mode disables Execute if pattern is empty
- Dry run defaults to ON to prevent accidental moves
- OrganizeResult uses the existing `tauri-bridge.ts` interface types directly — no duplication
