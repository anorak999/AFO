# AFO v2.0 — Development TODO

Cross-platform file organizer. Tauri v2 (Rust) + React + Tailwind.

---

## Phase 1: Scaffold & Dev Environment

- [x] `npm create tauri-app@latest afo-tauri` — React + TypeScript + Vite template
- [x] Confirm Tauri v2 prerequisites: Rust stable, Node 20+, system webview (WebKitGTK on Linux)
- [x] Install and configure: Tailwind CSS, Framer Motion, Zustand, `@tauri-apps/api` v2
- [x] Set up `src-tauri/Cargo.toml` with initial crate deps: `serde`, `serde_json`, `tokio`, `blake3`, `rayon`
- [x] Verify dev loop: `cargo tauri dev` hot-reloads both Rust and frontend
- [x] Define project structure per PRD §5 — create empty module files in `src-tauri/core/`
- [x] Scaffold frontend directory tree: `components/Sidebar/`, `OrganizePanel/`, `RuleBuilder/`, `DuplicatesPanel/`, `HistoryPanel/`, `CommandPalette/`, `SettingsPanel/`, `lib/tauri-bridge.ts`
- [x] Configure ESLint, Prettier, rustfmt, clippy
- [x] Write basic `tauri.conf.json` — window title "AFO", dark theme, 1200x800 default size
- [x] Create `capabilities/default.json` for Tauri v2 permissions
- [x] Smoke test: app window opens, shows placeholder "AFO v2.0" text

---

## Phase 2: Core Organization Engine (Rust)

- [x] `src-tauri/core/organizer.rs` — `organize_by_extension(dir, dry_run)`: scan dir, map extensions to categories (images, documents, audio, video, archives, code, other), return planned moves
- [x] Category mapping config — default extension-to-folder map, overridable from `~/.config/afo/config.json`
- [x] File collision handling: auto-suffix `_1`, `_2`, ... on name conflicts
- [x] `organize_by_date(dir, format, source_attr, dry_run)` — sort by created/modified date into `YYYY/MM/` or `YYYY-MM-DD/` folders
- [x] `batch_rename(dir, pattern, dry_run)` — support `{name}`, `{ext}`, `{counter}` placeholders with configurable start index
- [x] All operations execute on background Tokio task — never block UI thread
- [x] Tauri IPC commands in `src-tauri/commands.rs`: `organize_by_extension`, `organize_by_date`, `batch_rename`, `scan_directory`
- [x] Frontend `src/lib/tauri-bridge.ts` — typed wrappers for each IPC command using `invoke()`
- [x] Frontend `OrganizePanel` — directory picker, mode selector (extension/date/rename), pattern input for rename, dry-run preview table, "Execute" button
- [x] Live progress events: Rust emits `afo://progress` events during batch ops, frontend `listen()` updates progress bar
- [x] Dry-run mode for all operations — show what would happen before committing

---

## Phase 3: Rule Engine

- [x] `src-tauri/core/rule_engine.rs` — define Rule struct: `{ id, name, conditions: Vec<Condition>, actions: Vec<Action> }`
- [x] Condition types: `extension`, `name`, `size`, `content`, `date_created`, `date_modified` (EXIF/audio tags deferred to Phase 5)
- [x] Operators: `equals`, `contains`, `starts_with`, `ends_with`, `greater_than`, `less_than`, `regex`
- [x] Action types: `move`, `copy`, `rename`, `symlink` (cloud_sync deferred to Phase 9)
- [x] AND logic for conditions, sequential execution for actions
- [x] Rule serialization: JSON in `~/.config/afo/rules.json`
- [x] IPC commands: `list_rules`, `get_rule`, `create_rule`, `update_rule`, `delete_rule`, `apply_rules`
- [x] `apply_rules(dir, recursive, max_depth)` — scan files, evaluate all rules, execute matched actions, return results
- [x] Recursive mode with configurable max depth (default 5)
- [x] Frontend `RuleBuilder` — React Flow canvas, condition nodes, action nodes, trigger node, connected by edges
- [x] Node palette: drag condition/action types onto canvas
- [x] Property panel: edit node properties (field, operator, value for conditions; type, target for actions)
- [x] Rule validation: client-side regex check before save, server re-validates on apply
- [x] Save/load rules to/from backend via IPC
- [x] Rule list view: table of saved rules with enable/disable toggle, edit/delete actions

---

## Phase 4: Duplicate Detection

- [x] `src-tauri/core/duplicates.rs` — `scan_duplicates(dir, recursive, max_depth)`: parallel blake3 hash of all files using rayon
- [x] Group files by hash, return duplicate groups with full paths and sizes
- [x] First-occurrence heuristic: keep the file with the shortest path or earliest modified date
- [x] IPC command: `scan_duplicates`, `delete_duplicates`, `quarantine_duplicates`
- [x] Quarantine action: move duplicates to `~/.local/share/afo/quarantine/` with metadata JSON (original path, hash, timestamp)
- [x] Frontend `DuplicatesPanel` — duplicate groups list, checkbox per file, size per group, total recoverable space
- [x] Batch actions: "Quarantine selected", "Keep first only", "Review all"
- [x] Progress events during parallel hashing
- [x] Quarantine cleanup: config for auto-delete after N days (default 30)

---

## Phase 5: Metadata Extraction

- [x] `src-tauri/core/metadata.rs` — `extract_exif(path)` using `kamadak-exif` (library name is `exif`): camera make/model, date taken, GPS, exposure
- [x] `extract_audio_tags(path)` using `lofty`: artist, album, title, genre, track, year
- [x] Extend rule engine conditions to support EXIF tags and audio tags (add to `ConditionType` enum)
- [x] IPC commands: `get_metadata` — return combined EXIF/audio metadata for a file
- [x] Frontend: metadata display in file preview / organize panel detail view
- [x] Organize-by-date can use EXIF date taken as source attribute (not just filesystem timestamps)
- [x] Graceful fallback: files without metadata skip metadata-based conditions silently

---

## Phase 6: Undo/Redo System

- [x] `src-tauri/core/journal.rs` — SQLite database at `~/.local/share/afo/journal.db`
- [x] Schema: `operations` table — `id`, `type` (move/copy/rename/delete), `source_path`, `dest_path`, `timestamp`, `reverted` (bool)
- [x] Journal write happens **before** operation is reported as successful
- [x] If journal write fails: complete operation anyway, flag "unrecoverable" in result
- [x] IPC commands: `undo_last`, `undo_operation(id)`, `get_history(limit, offset)`, `redo_last`
- [x] Undo logic: reverse the operation (move back, restore from quarantine, rename back)
- [x] Frontend `HistoryPanel` — chronological list of operations, per-entry "Undo" button, bulk undo
- [x] Activity feed: toast notifications for each operation with undo option
- [x] Corrupt config/rules recovery: fall back to defaults, backup original with `.bak` suffix, notify via toast

---

## Phase 7: Real-Time Folder Watching

- [x] `src-tauri/core/watcher.rs` — `start_watching(dir)`, `stop_watching(dir)`, `list_watched()`
- [x] Use `notify` crate with platform-appropriate backend (inotify/ReadDirectoryChangesW/FSEvents)
- [x] 300ms debounce window to avoid thrashing on bulk copy
- [x] Rate limiting: max N operations per second (configurable, default 10)
- [x] On file event: evaluate matching rules, execute actions, journal entry, emit Tauri event
- [x] Auto-restart watcher task on crash with exponential backoff, log failure
- [x] Opt-in per directory — not global by default
- [x] IPC commands: `watch_directory`, `unwatch_directory`, `list_watched_directories`
- [x] Frontend: Watch settings in `SettingsPanel` — add/remove watched dirs, toggle on/off per dir
- [x] Live activity feed: animated toast for each auto-organized file
- [x] Background Tauri process — lightweight, no UI blocking

---

## Phase 8: Scheduled Automation

- [x] `src-tauri/core/scheduler.rs` — cron-like scheduling via `tokio-cron-scheduler`
- [x] Schedule definition: cron expression + action (organize specific dir, apply rules, scan duplicates)
- [x] IPC commands: `create_schedule`, `list_schedules`, `delete_schedule`, `run_now`
- [x] Schedules persist to `~/.config/afo/schedules.json`
- [x] Frontend: Schedule management in `SettingsPanel` — create/edit/delete cron jobs, next-run display
- [x] Scheduled runs use same engine as manual runs (organizer, rule engine, duplicates)
- [x] Notification on scheduled run completion: event to frontend, optional OS notification

---

## Phase 9: Power-User UI

- [x] **Command Palette** (Cmd/Ctrl+K): searchable overlay with all actions, rules, directories
- [x] Fuzzy search across: organize modes, saved rules, recent directories, settings
- [x] Keyboard navigation: arrow keys, Enter to execute, Escape to close
- [x] Staggered reveal animation on open
- [x] **SettingsPanel** — functional settings with General, Watching, Scheduling, About sections
- [ ] **Live Preview Pane**: file tree showing what an organize/rule operation would do before committing
- [ ] Preview updates in real-time as user adjusts parameters
- [ ] Tree shows source files → destination folders with arrows, color-coded by action type
- [x] **Sidebar navigation** — animate active indicator, panel transitions with Framer Motion
- [ ] **Drag-and-drop file intake** — drop files/folders onto the app to organize them
- [x] Dark theme throughout, consistent with design concept
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
- [x] Structured logging via `tracing` — log to `~/.local/share/afo/afo.log`
- [ ] Cloud sync stub: placeholder UI and IPC, no real API calls (defer to post-launch)
- [ ] ML categorization stub: TF-IDF filename similarity, labeled "suggestion" in UI (defer to post-launch)
- [ ] Final UI polish: transitions, hover states, empty states, loading skeletons
- [x] README with build instructions, features overview, screenshots
- [ ] Tag v2.0 release
