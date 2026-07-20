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

### Phase 2 Frontend — App Shell + OrganizePanel (2025-07-20)
- Installed `@tauri-apps/plugin-dialog` and `@tauri-apps/plugin-fs` npm packages
- Created `src/lib/store.ts` — Zustand store for panel navigation (`activePanel` state)
- Wired `src/App.tsx` — Sidebar + panel switching layout, dark theme, h-screen
- Updated `src/components/Sidebar/Sidebar.tsx` — Active state tracking via zustand, data-driven nav items
- Built `src/components/OrganizePanel/OrganizePanel.tsx` — Full UI:
  - Directory picker via `@tauri-apps/plugin-dialog` with try/catch fallback
  - Mode tabs: By Extension / By Date / Batch Rename
  - Date format dropdown, rename pattern input
  - Dry-run toggle (default ON)
  - Scan button → file count + mini table (max 20 rows)
  - Execute button → calls bridge functions per mode
  - Result card: total/moved/skipped, dry-run badge, errors
- Created `src/types/tauri-plugins.d.ts` — Ambient type declaration for dialog plugin
- Fixed CSS import order (`@import` before `@tailwind` directives)
- Added `tauri-plugin-dialog` to Cargo.toml + registered in lib.rs
- Added dialog permissions to tauri.conf.json
- Frontend builds clean (`npm run build` passes)
- Commit: `feat: add dialog plugin, fix CSS import order, wire up app shell`

### Phase 2 Rust — Category Config + Collision Handling (2025-07-20)
- Updated `src-tauri/src/core/organizer.rs`:
  - `CategoryConfig` struct with `HashMap<String, Vec<String>>` for ext→category mapping
  - Default config: images, documents, audio, video, archives, code
  - Loads from `~/.config/afo/config.json` (field `categories`), falls back to defaults
  - `categorize(ext)` method for extension→category lookup
  - `unique_path(target)` function: appends `_1`, `_2`, ... on name collision
  - `organize_by_extension` now uses configurable categories + collision handling
  - `organize_by_date` and `batch_rename` now use `unique_path` for collision handling
  - Error handling: `match` on rename instead of `?` — logs per-file errors without aborting
- Commit: `feat: configurable category mapping + auto-suffix collision handling`
- **Note**: Rust compilation unverified (missing GTK dev headers) — changes are straightforward

### Phase 3: Rule Engine (2025-07-20)
- Full rule engine implementation in `src-tauri/src/core/rule_engine.rs` (267 lines)
- `Rule`, `Condition`, `Action` structs with serde serialization
- Condition fields: Extension, Name, Size, DateCreated, DateModified
- Operators: Equals, Contains, StartsWith, EndsWith, GreaterThan, LessThan, Regex
- Actions: Move, Copy, Rename
- `load_rules()` / `save_rules()` — JSON at `~/.config/afo/rules.json`
- `evaluate()` — AND-logic condition matching against file metadata
- `apply_rules()` — scans dir, evaluates all enabled rules, executes first match
- Added `regex = "1"` to Cargo.toml
- Added 3 IPC commands: `list_rules`, `save_rules`, `apply_rules`
- Registered commands in lib.rs
- Made `unique_path` pub(crate) for cross-module use
- Commit: `feat: implement rule engine with condition/action evaluation, IPC commands`

### Phase 4: Duplicate Detection (2025-07-20)
- Full implementation in `src-tauri/src/core/duplicates.rs` (229 lines)
- `DuplicateGroup` / `DuplicateFile` structs with serde serialization
- `scan_duplicates()` — parallel blake3 hashing via rayon, depth-capped recursive walk
- `quarantine_duplicates()` — moves to `~/.local/share/afo/quarantine/{hash_prefix}/` with JSON sidecars
- `delete_duplicates()` — permanent removal
- Added 3 IPC commands: `scan_duplicates_cmd`, `quarantine_duplicates_cmd`, `delete_duplicates_cmd`
- Commit: `feat: implement duplicate detection with blake3 + rayon parallelism`

### Phase 6: Undo/Redo Journal (2025-07-20)
- Full implementation in `src-tauri/src/core/journal.rs` (204 lines)
- SQLite database at `~/.local/share/afo/journal.db` with WAL mode
- `operations` table: id, operation_type, source_path, dest_path, timestamp, reverted
- `init_journal()`, `record_operation()`, `get_history()`, `undo_last()`, `undo_operation()`, `redo_last()`
- Module-level `OnceLock<Mutex<Connection>>` for state management
- Added 4 IPC commands: `get_history`, `undo_last`, `undo_operation`, `redo_last`
- Commit: `feat: implement undo/redo journal system with SQLite persistence`

### Phase 2 Frontend Panels (2025-07-20)
- Updated `src/lib/tauri-bridge.ts` with typed IPC wrappers for rules, duplicates, journal
- `RuleBuilder.tsx` — Rule management with create/edit/delete, condition/action builder, enable/disable toggle
- `DuplicatesPanel.tsx` — Directory scan, expandable duplicate groups, quarantine/delete actions
- `HistoryPanel.tsx` — Chronological operation list, undo/redo buttons, load more pagination
- Frontend builds clean
- Commit: `feat: build RuleBuilder, DuplicatesPanel, and HistoryPanel components`

### Phase 9: Command Palette (2025-07-20)
- Full implementation in `CommandPalette.tsx` — Cmd/Ctrl+K overlay
- 8 built-in commands: 5 navigation, scan, undo, redo
- Fuzzy search, arrow key navigation, staggered animation
- Portal render, backdrop click/Escape to close
- Wired into App.tsx
- Commit: `feat: implement Command Palette with Cmd/Ctrl+K`

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

## 2025-07-20 — Rule Engine Implementation

### Changes
- Implemented full rule engine in `src-tauri/src/core/rule_engine.rs` (replaced stub)
- Data structures: Rule, Condition, ConditionField, Operator, Action (serde-serializable)
- `load_rules()` — loads from `~/.config/afo/rules.json`, creates file if missing
- `save_rules()` — saves to same path, creates parent dirs
- `evaluate()` — AND-logic condition evaluation against file metadata (size, dates, name, extension, regex)
- `apply_rules()` — scans dir, evaluates enabled rules, executes first matching rule's actions sequentially
- Actions: Move (with unique_path collision handling), Copy, Rename (with `{name}`/`{ext}`/`{counter}` patterns)
- Added `regex = "1"` dependency to Cargo.toml
- Made `unique_path` in organizer.rs `pub(crate)` for cross-module use
- Added IPC commands: `list_rules`, `save_rules`, `apply_rules` in commands.rs
- Registered all new commands in lib.rs invoke_handler

### Notes
- `cargo check` could not run due to missing system GTK dev libraries (`libgtk-3-dev`, `libwebkit2gtk-4.1-dev`)
- Code verified structurally; standalone rustc check confirms only crate-linkage errors (expected)
- Commit: `6ab1abd` feat: implement rule engine with condition/action evaluation, IPC commands

## 2025-07-21 — Duplicate Detection Implementation

### Changes
- Implemented full duplicate detection in `src-tauri/src/core/duplicates.rs` (replaced 7-line stub with 229 lines)
- Data structures: `DuplicateGroup` (hash, files, total_size), `DuplicateFile` (path, size, is_keeper)
- `scan_duplicates()` — parallel blake3 hashing via rayon, depth-capped recursive walk (default max_depth=5), skips symlinks and empty files (<1 byte), keeper selection by shortest path then earliest modified date, groups sorted by total_size descending
- `quarantine_duplicates()` — moves non-keeper files to `~/.local/share/afo/quarantine/{hash_prefix}/`, creates JSON sidecar (`.meta.json`) with original_path, hash, size, quarantined_at
- `delete_duplicates()` — permanently removes non-keeper files from selected groups
- Added 3 IPC commands in `commands.rs`: `scan_duplicates_cmd`, `quarantine_duplicates_cmd`, `delete_duplicates_cmd`
- Registered all 3 commands in `lib.rs` invoke_handler
- Uses `Box<dyn std::error::Error>` (not anyhow — not in Cargo.toml)
- `hash_file()` reads in 64KB chunks via `blake3::Hasher`

### Notes
- `cargo check` still blocked by missing GTK dev headers — structural verification via `rustfmt --edition 2021` confirms no syntax issues in our files
- No new dependencies added — uses existing blake3, rayon, chrono, dirs, serde_json
- Commit: `31be798` feat: implement duplicate detection with blake3 + rayon parallelism

## [2026-07-21] Undo/Redo Journal System

### Changes
- **`src-tauri/src/core/journal.rs`** — Full implementation replacing 24-line stub
  - `JournalEntry` struct with Serialize/Deserialize, id as i64, reverted as bool
  - `OnceLock<Mutex<Connection>>` for module-level DB state (initialized once at startup)
  - `init_journal()` — opens/creates SQLite DB at `~/.local/share/afo/journal.db`, WAL mode, creates `operations` table, creates parent dirs
  - `record_operation()` — INSERT new operation row
  - `get_history(limit, offset)` — SELECT non-reverted entries, ORDER BY timestamp DESC
  - `undo_last()` — SELECT most recent non-reverted entry, mark reverted=1, return it
  - `undo_operation(id)` — SELECT specific entry, mark reverted=1, return it
  - `redo_last()` — SELECT most recent reverted entry, mark reverted=0, return it
  - Uses `rusqlite::OptionalExtension` for `.optional()` on query_row results
  - All queries use `rusqlite::params![]` for parameterized access
- **`src-tauri/src/commands.rs`** — Added 4 IPC commands
  - `get_history(limit: Option<i64>, offset: Option<i64>)` — defaults: limit=50, offset=0
  - `undo_last()` — delegates to journal module
  - `undo_operation(id: i64)` — delegates to journal module
  - `redo_last()` — delegates to journal module
- **`src-tauri/src/lib.rs`** — Registered all 4 new commands in invoke_handler

### Architecture Decisions
- `OnceLock<Mutex<Connection>>` over open-per-call: avoids repeated `Connection::open` overhead; SQLite WAL handles concurrent reads while Mutex serializes writes
- `with_db()` helper reduces boilerplate — all DB functions use same lock-acquire pattern
- Journal returns `Option<JournalEntry>` (not error) when entry not found — caller decides if that's an error
- `record_operation()` doesn't auto-generate timestamps — caller provides them (keeps function pure)

### Notes
- `cargo check` blocked by missing GTK dev headers (pre-existing) — `rustfmt --edition 2021 --check` confirms no syntax issues
- No new dependencies added — uses existing rusqlite, serde, dirs, std (OnceLock, Mutex, fs)

## 2025-07-21 — Core Gap Implementation (5 tasks)

### Build Fixes
- Fixed `tauri.conf.json` — moved `permissions` from `app.security` to separate `capabilities/default.json` file (Tauri v2 pattern)
- Created valid RGBA PNG icon at `src-tauri/icons/icon.png` (64x64, purple)
- Fixed `kamadak-exif` import — crate lib name is `exif` (not `kamadak_exif`), updated to v0.6 for API compatibility
- Updated `lofty` usage — `read_from_path(path)` (no second arg), `TaggedFileExt` + `Accessor` traits at crate root

### Task 1: Metadata Extraction (metadata.rs)
- Replaced 26-line stub with full implementation
- EXIF extraction via `exif` crate (Reader, Tag, In): camera_make, camera_model, date_taken, gps, exposure
- Audio tag extraction via `lofty` crate: artist, album, title, genre, track, year
- Added `get_metadata` IPC command + frontend `getMetadata()` bridge
- `Metadata` struct serializable for frontend consumption

### Task 2: Folder Watching (watcher.rs)
- Replaced 12-line stub with full implementation
- `notify` crate `RecommendedWatcher` with platform-appropriate backend
- Event forwarding via `std::sync::mpsc` → `tokio::sync::mpsc` bridge thread
- `start_watching(dir)` — registers directory with RecursiveMode::Recursive
- `stop_watching(dir)` — unregisters directory
- `list_watched()` — returns all watched dirs with enabled status
- Added 3 IPC commands: `watch_directory`, `unwatch_directory`, `list_watched_directories`
- Frontend `watchDirectory()`, `unwatchDirectory()`, `listWatchedDirectories()` bridge functions

### Task 3: Scheduled Automation (scheduler.rs)
- Replaced 10-line stub with full implementation
- `Schedule` struct with id, name, cron, action, enabled, last_run
- `ScheduleAction` enum: OrganizeByExtension, OrganizeByDate, ApplyRules, ScanDuplicates
- JSON persistence at `~/.config/afo/schedules.json`
- `create_schedule()` — creates schedule + saves to JSON
- `list_schedules()`, `delete_schedule()`, `toggle_schedule()` — CRUD operations
- `run_now()` — executes action immediately, updates last_run timestamp
- Fixed Send issue: MutexGuard dropped before await points
- Added 5 IPC commands: create, list, delete, toggle, run_now
- Frontend bridge functions for all scheduler operations

### Task 4: Undo Actually Reverses (journal.rs)
- Added `reverse_operation()` — moves file back from dest to source
- Added `forward_operation()` — re-executes the original operation (redo)
- `undo_last()`, `undo_operation()` — now actually reverse file moves/copies/renames
- `redo_last()` — now actually re-applies the operation
- Handles edge cases: missing files, missing parents, unknown operation types

### Task 5: Recursive Scanning (rule_engine.rs)
- Added `apply_rules_recursive()` — recursive directory traversal with depth limit
- `apply_rules()` now calls `apply_rules_recursive()` with max_depth=1 (non-recursive by default)
- Subdirectory results merged into parent result (total_files, moved, skipped, errors)
- Depth check: subdirectories scanned only if current_depth < max_depth

### Settings Panel Upgrade
- Replaced 8-line placeholder with full settings UI
- 4 sections: General, Folder Watching, Schedules, About
- General: category mapping display, default options
- Watching: placeholder for Phase 7 UI
- Scheduling: placeholder for Phase 8 UI
- About: version info, data locations

### Build Verification
- `cargo check` — ✅ Clean (0 errors, 0 warnings)
- `npx tsc --noEmit` — ✅ Clean
- All 14 modified files + 3 new files (capabilities, icons, gen)

### Files Modified
- `src-tauri/Cargo.toml` — kamadak-exif v0.5 → v0.6
- `src-tauri/Cargo.lock` — updated lockfile
- `src-tauri/tauri.conf.json` — removed permissions (moved to capabilities)
- `src-tauri/capabilities/default.json` — new Tauri v2 permissions file
- `src-tauri/icons/icon.png` — new RGBA icon
- `src-tauri/src/lib.rs` — registered 8 new commands (metadata, watcher, scheduler)
- `src-tauri/src/commands.rs` — added 8 IPC commands
- `src-tauri/src/core/metadata.rs` — full EXIF + audio extraction
- `src-tauri/src/core/watcher.rs` — full notify-based watcher
- `src-tauri/src/core/scheduler.rs` — full cron scheduler
- `src-tauri/src/core/journal.rs` — added actual undo/redo file operations
- `src-tauri/src/core/rule_engine.rs` — added recursive scanning
- `src/lib/tauri-bridge.ts` — added metadata, watcher, scheduler types and functions
- `src/components/SettingsPanel/SettingsPanel.tsx` — full settings UI
- `TODO.md` — updated 5 items from [ ] to [x]
