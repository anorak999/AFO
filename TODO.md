# AFO v2.0 — Development TODO

Cross-platform file organizer. Tauri v2 (Rust) + React + Tailwind.

---

## Phase 1: Scaffold & Dev Environment

- [ ] `npm create tauri-app@latest afo-tauri` — React + TypeScript + Vite template
- [ ] Confirm Tauri v2 prerequisites: Rust stable, Node 20+, system webview (WebKitGTK on Linux)
- [ ] Install and configure: Tailwind CSS, Framer Motion, Zustand, `@tauri-apps/api` v2
- [ ] Set up `src-tauri/Cargo.toml` with initial crate deps: `serde`, `serde_json`, `tokio`, `blake3`, `rayon`
- [ ] Verify dev loop: `cargo tauri dev` hot-reloads both Rust and frontend
- [ ] Define project structure per PRD §5 — create empty module files in `src-tauri/core/`
- [ ] Scaffold frontend directory tree: `components/Sidebar/`, `OrganizePanel/`, `RuleBuilder/`, `DuplicatesPanel/`, `HistoryPanel/`, `CommandPalette/`, `SettingsPanel/`, `lib/tauri-bridge.ts`
- [ ] Configure ESLint, Prettier, rustfmt, clippy
- [ ] Write basic `tauri.conf.json` — window title "AFO", dark theme, 1200x800 default size
- [ ] Smoke test: app window opens, shows placeholder "AFO v2.0" text

---

## Phase 2: Core Organization Engine (Rust)

- [ ] `src-tauri/core/organizer.rs` — `organize_by_extension(dir, dry_run)`: scan dir, map extensions to categories (images, documents, audio, video, archives, code, other), return planned moves
- [ ] Category mapping config — default extension-to-folder map, overridable from `~/.config/afo/config.json`
- [ ] File collision handling: auto-suffix `_1`, `_2`, ... on name conflicts
- [ ] `organize_by_date(dir, format, source_attr, dry_run)` — sort by created/modified date into `YYYY/MM/` or `YYYY-MM-DD/` folders
- [ ] `batch_rename(dir, pattern, dry_run)` — support `{name}`, `{ext}`, `{counter}` placeholders with configurable start index
- [ ] All operations execute on background Tokio task — never block UI thread
- [ ] Tauri IPC commands in `src-tauri/commands.rs`: `organize_by_extension`, `organize_by_date`, `batch_rename`, `scan_directory`
- [ ] Frontend `src/lib/tauri-bridge.ts` — typed wrappers for each IPC command using `invoke()`
- [ ] Frontend `OrganizePanel` — directory picker, mode selector (extension/date/rename), pattern input for rename, dry-run preview table, "Execute" button
- [ ] Live progress events: Rust emits `afo://progress` events during batch ops, frontend `listen()` updates progress bar
- [ ] Dry-run mode for all operations — show what would happen before committing

---

## Phase 3: Rule Engine

- [ ] `src-tauri/core/rule_engine.rs` — define Rule struct: `{ id, name, conditions: Vec<Condition>, actions: Vec<Action> }`
- [ ] Condition types: `extension`, `name`, `size`, `content`, `date_created`, `date_modified` (EXIF/audio tags deferred to Phase 5)
- [ ] Operators: `equals`, `contains`, `starts_with`, `ends_with`, `greater_than`, `less_than`, `regex`
- [ ] Action types: `move`, `copy`, `rename`, `symlink` (cloud_sync deferred to Phase 9)
- [ ] AND logic for conditions, sequential execution for actions
- [ ] Rule serialization: JSON in `~/.config/afo/rules.json`
- [ ] IPC commands: `list_rules`, `get_rule`, `create_rule`, `update_rule`, `delete_rule`, `apply_rules`
- [ ] `apply_rules(dir, recursive, max_depth)` — scan files, evaluate all rules, execute matched actions, return results
- [ ] Recursive mode with configurable max depth (default 5)
- [ ] Frontend `RuleBuilder` — React Flow canvas, condition nodes, action nodes, trigger node, connected by edges
- [ ] Node palette: drag condition/action types onto canvas
- [ ] Property panel: edit node properties (field, operator, value for conditions; type, target for actions)
- [ ] Rule validation: client-side regex check before save, server re-validates on apply
- [ ] Save/load rules to/from backend via IPC
- [ ] Rule list view: table of saved rules with enable/disable toggle, edit/delete actions

---

## Phase 4: Duplicate Detection

- [ ] `src-tauri/core/duplicates.rs` — `scan_duplicates(dir, recursive, max_depth)`: parallel blake3 hash of all files using rayon
- [ ] Group files by hash, return duplicate groups with full paths and sizes
- [ ] First-occurrence heuristic: keep the file with the shortest path or earliest modified date
- [ ] IPC command: `scan_duplicates`, `delete_duplicates`, `quarantine_duplicates`
- [ ] Quarantine action: move duplicates to `~/.local/share/afo/quarantine/` with metadata JSON (original path, hash, timestamp)
- [ ] Frontend `DuplicatesPanel` — duplicate groups list, checkbox per file, size per group, total recoverable space
- [ ] Batch actions: "Quarantine selected", "Keep first only", "Review all"
- [ ] Progress events during parallel hashing
- [ ] Quarantine cleanup: config for auto-delete after N days (default 30)

---

## Phase 5: Metadata Extraction

- [ ] `src-tauri/core/metadata.rs` — `extract_exif(path)` using `kamadak-exif`: camera make/model, date taken, GPS, exposure
- [ ] `extract_audio_tags(path)` using `lofty`: artist, album, title, genre, track, year
- [ ] Extend rule engine conditions to support EXIF tags and audio tags (add to `ConditionType` enum)
- [ ] IPC commands: `get_metadata` — return combined EXIF/audio metadata for a file
- [ ] Frontend: metadata display in file preview / organize panel detail view
- [ ] Organize-by-date can use EXIF date taken as source attribute (not just filesystem timestamps)
- [ ] Graceful fallback: files without metadata skip metadata-based conditions silently

---

## Phase 6: Undo/Redo System

- [ ] `src-tauri/core/journal.rs` — SQLite database at `~/.local/share/afo/journal.db`
- [ ] Schema: `operations` table — `id`, `type` (move/copy/rename/delete), `source_path`, `dest_path`, `timestamp`, `reverted` (bool)
- [ ] Journal write happens **before** operation is reported as successful
- [ ] If journal write fails: complete operation anyway, flag "unrecoverable" in result
- [ ] IPC commands: `undo_last`, `undo_operation(id)`, `get_history(limit, offset)`, `redo_last`
- [ ] Undo logic: reverse the operation (move back, restore from quarantine, rename back)
- [ ] Frontend `HistoryPanel` — chronological list of operations, per-entry "Undo" button, bulk undo
- [ ] Activity feed: toast notifications for each operation with undo option
- [ ] Corrupt config/rules recovery: fall back to defaults, backup original with `.bak` suffix, notify via toast

---

## Phase 7: Real-Time Folder Watching

- [ ] `src-tauri/core/watcher.rs` — `start_watching(dir)`, `stop_watching(dir)`, `list_watched()`
- [ ] Use `notify` crate with platform-appropriate backend (inotify/ReadDirectoryChangesW/FSEvents)
- [ ] 300ms debounce window to avoid thrashing on bulk copy
- [ ] Rate limiting: max N operations per second (configurable, default 10)
- [ ] On file event: evaluate matching rules, execute actions, journal entry, emit Tauri event
- [ ] Auto-restart watcher task on crash with exponential backoff, log failure
- [ ] Opt-in per directory — not global by default
- [ ] IPC commands: `watch_directory`, `unwatch_directory`, `list_watched_directories`
- [ ] Frontend: Watch settings in `SettingsPanel` — add/remove watched dirs, toggle on/off per dir
- [ ] Live activity feed: animated toast for each auto-organized file
- [ ] Background Tauri process — lightweight, no UI blocking

---

## Phase 8: Scheduled Automation

- [ ] `src-tauri/core/scheduler.rs` — cron-like scheduling via `tokio-cron-scheduler`
- [ ] Schedule definition: cron expression + action (organize specific dir, apply rules, scan duplicates)
- [ ] IPC commands: `create_schedule`, `list_schedules`, `delete_schedule`, `run_now`
- [ ] Schedules persist to `~/.config/afo/config.json`
- [ ] Frontend: Schedule management in `SettingsPanel` — create/edit/delete cron jobs, next-run display
- [ ] Scheduled runs use same engine as manual runs (organizer, rule engine, duplicates)
- [ ] Notification on scheduled run completion: event to frontend, optional OS notification

---

## Phase 9: Power-User UI

- [ ] **Command Palette** (Cmd/Ctrl+K): searchable overlay with all actions, rules, directories
- [ ] Fuzzy search across: organize modes, saved rules, recent directories, settings
- [ ] Keyboard navigation: arrow keys, Enter to execute, Escape to close
- [ ] Staggered reveal animation on open
- [ ] **Live Preview Pane**: file tree showing what an organize/rule operation would do before committing
- [ ] Preview updates in real-time as user adjusts parameters
- [ ] Tree shows source files → destination folders with arrows, color-coded by action type
- [ ] **Sidebar navigation** — animate active indicator, panel transitions with Framer Motion
- [ ] **Drag-and-drop file intake** — drop files/folders onto the app to organize them
- [ ] Dark theme throughout, consistent with design concept
- [ ] Responsive layout: works on 1024px+ screens (desktop app, but don't break on smaller monitors)

---

## Phase 10: Polish, Testing & Release Prep

- [ ] Error handling audit — all IPC commands return typed errors, no panics
- [ ] Permission denied: caught per-file, logged, surfaced with retry option
- [ ] Name collision: auto-suffix everywhere, consistent behavior
- [ ] Corrupt config/rules: fallback + `.bak` backup + toast notification
- [ ] Cross-platform testing: Linux (Ubuntu/Fedora), Windows 10+, macOS 12+
- [ ] Symlink handling: graceful fallback on Windows without elevated privileges
- [ ] Performance: profile batch operations on 10k+ files, ensure UI stays responsive
- [ ] Installers: `.deb` / `.AppImage` (Linux), `.msi` (Windows), `.dmg` (macOS)
- [ ] App icon and branding assets
- [ ] Structured logging via `tracing` — log to `~/.local/share/afo/afo.log`
- [ ] Cloud sync stub: placeholder UI and IPC, no real API calls (defer to post-launch)
- [ ] ML categorization stub: TF-IDF filename similarity, labeled "suggestion" in UI (defer to post-launch)
- [ ] Final UI polish: transitions, hover states, empty states, loading skeletons
- [ ] README with build instructions, features overview, screenshots
- [ ] Tag v2.0 release
