# Product Requirements Document
## AFO — Advanced File Organizer (v2.0, Tauri Edition)

---

## 1. Product Overview

**AFO** is a cross-platform desktop file organization application. This version is a complete ground-up rewrite of the original Python/tkinter implementation, built on **Tauri** (Rust backend) with a **React (or Svelte) web frontend** rendered in the OS's native webview. The rewrite exists to deliver two things the original stack could not: a rich, fluid, animated UI, and a backend fast enough to support real-time file watching and large-scale batch operations without blocking the UI thread.

### Why This Rewrite Exists
The original AFO proved the product concept — rule-based organization, metadata-aware sorting, duplicate detection — but tkinter imposes a hard ceiling on UI quality: no compositor, no native animation timeline, and single-threaded UI updates that jitter under load. Tauri solves both problems: Rust handles file I/O, hashing, and rule evaluation on background threads with real concurrency, while the webview frontend gets full access to modern animation libraries (Framer Motion, GSAP) for a fluid, professional interface — without the memory overhead of bundling a full Chromium runtime (as Electron does).

---

## 2. Goals and Objectives

| # | Goal | Why It Matters |
|---|------|----------------|
| G1 | One-click file sorting by type, date, or custom rules | Core value proposition; must remain zero-friction |
| G2 | Duplicate detection and removal | Reclaims disk space, reduces clutter |
| G3 | Batch rename with pattern templates | Standardizes messy filenames at scale |
| G4 | Extensible rule engine (condition/action pairs) | Covers edge cases beyond built-in sorting |
| G5 | Metadata-aware organization (EXIF, audio tags, content) | Enables organization by data filenames don't carry |
| G6 | Scheduled and real-time automation | "Set and forget" organization |
| G7 | **Fluid, animated, native-feeling UI** | Primary differentiator of this rewrite |
| G8 | Cross-platform (Linux, Windows, macOS) | Single codebase, consistent behavior everywhere |
| G9 | **Reversible operations (undo/redo)** *(suggested by Claude)* | File-moving tools without undo carry real user risk; this closes AFO's biggest historical gap |
| G10 | **Live, real-time folder watching** *(suggested by Claude)* | Rust's async I/O makes always-on background organization practical in a way it wasn't in the Python version |

---

## 3. User Personas

### Primary: The Accumulated-Downloads User
Has hundreds of unsorted files, wants one click to get images/docs/audio/video into folders, values simplicity.

### Secondary: The Media Collector
Manages large photo/music libraries, wants EXIF/ID3-aware sorting and duplicate cleanup.

### Tertiary: The Power User / Developer
Wants regex conditions, content-based rules, symlink actions, and now — with this rewrite — a visual rule builder and command-palette-driven workflow.

---

## 4. Feature Specification

### 4.1 Core Organization Engine (Rust)
- **Organize by extension** — directory scan, category mapping, move/copy with collision handling (`_1`, `_2`, …), executed on a background Tokio task so the UI never blocks.
- **Organize by date** — configurable date format and source attribute (created/modified), same collision handling.
- **Batch rename** — pattern templates with `{name}`, `{ext}`, `{counter}` placeholders, live preview of renamed output before committing.

### 4.2 Rule Engine
- JSON-serialized rules: `id`, `name`, `conditions[]` (AND logic), `actions[]` (sequential).
- Conditions: `extension`, `name`, `size`, `content`, `date_created`, `date_modified`, EXIF tags, audio tags.
- Operators: `equals`, `contains`, `starts_with`, `ends_with`, `greater_than`, `less_than`, `regex`.
- Actions: `move`, `copy`, `rename`, `symlink`, `cloud_sync` (stub).
- **New: Visual, node-based rule builder** *(suggested by Claude)* — conditions and actions as connected nodes on a canvas (React Flow), replacing AFO's modal-dialog rule editor. This is a natural fit for a rich-animation frontend and makes complex multi-condition rules easier to reason about.

### 4.3 Duplicate Detection
- Content-hashing via Rust's `blake3` (faster and more collision-resistant than MD5, at comparable speed) run in parallel across files using `rayon`.
- Duplicate groups reported with full paths; optional safe-delete (keeps first occurrence, moves rest to a recoverable Trash/Quarantine folder rather than permanent delete — see 4.6).

### 4.4 Metadata Extraction
- EXIF (camera make/model, date taken, GPS, exposure) via Rust's `kamadak-exif` crate.
- Audio tags (artist, album, title, genre, track, year) via `lofty`.

### 4.5 ML-Based Categorization
- Lightweight local suggestion model (TF-IDF-style filename similarity) as a fallback categorizer. Same scope as original — clearly labeled a scaffold, not a trained model, in the UI.

### 4.6 Undo / Redo System *(suggested by Claude)*
- Every organize/rename/rule-apply operation writes a journal entry (source path, destination path, operation type, timestamp) to a local SQLite log.
- "Undo last operation" and full operation history panel with one-click revert.
- Deletions from duplicate cleanup go to a local Quarantine folder for N days before permanent removal, rather than being destroyed immediately.
- **Why:** this was AFO's most-flagged limitation historically; irreversible file operations are the single biggest source of user distrust in this category of tool.

### 4.7 Real-Time Folder Watching *(suggested by Claude)*
- Uses Rust's `notify` crate to watch configured directories and apply matching rules as files land, instead of only running on manual trigger or a fixed schedule.
- Debounced and rate-limited to avoid thrashing on bulk copy operations.
- Toggleable per-directory; runs as a lightweight background Tauri process.

### 4.8 Recursive Directory Scanning *(suggested by Claude)*
- Optional recursive mode for organize/rule operations, with configurable max depth and a live tree preview before committing — addresses the "single-directory scope" limitation from the original AFO.

### 4.9 Cloud Sync
- Stub scaffold for Dropbox/Google Drive, same status as original (authentication + transfer stubs, real SDK integration deferred to a later milestone).

### 4.10 Scheduled Automation
- Cron-like scheduling (via Rust `tokio-cron-scheduler`) for periodic organize runs, in addition to the new real-time watch mode.

### 4.11 UI / UX
- Sidebar navigation, dark theme, animated panel transitions (Framer Motion / Svelte transitions), animated drag-and-drop file intake, live progress bars for batch operations backed by real-time Rust → frontend event streaming (Tauri's event system).
- **Command palette (Cmd/Ctrl+K)** *(suggested by Claude)* for power users to jump to any action, rule, or directory without leaving the keyboard.
- **Live preview pane** *(suggested by Claude)* — shows a file tree preview of what an organize/rule operation *would* do before the user commits, reducing the need for undo in the first place.

---

## 5. Architecture

```
afo-tauri/
├── src-tauri/                     # Rust backend
│   ├── core/
│   │   ├── organizer.rs           # organize_by_extension, organize_by_date, batch_rename
│   │   ├── rule_engine.rs         # condition/action evaluation
│   │   ├── duplicates.rs          # blake3 hashing, parallel scan (rayon)
│   │   ├── metadata.rs            # EXIF (kamadak-exif), audio (lofty)
│   │   ├── journal.rs             # undo/redo log (SQLite via rusqlite)
│   │   ├── watcher.rs             # real-time folder watching (notify)
│   │   ├── scheduler.rs           # cron automation (tokio-cron-scheduler)
│   │   └── cloud_sync.rs          # stub
│   ├── commands.rs                # Tauri IPC command handlers
│   └── main.rs
├── src/                           # React/Svelte frontend
│   ├── components/
│   │   ├── Sidebar/
│   │   ├── OrganizePanel/
│   │   ├── RuleBuilder/           # node-based visual rule editor (React Flow)
│   │   ├── DuplicatesPanel/
│   │   ├── HistoryPanel/          # undo/redo UI
│   │   ├── CommandPalette/
│   │   └── SettingsPanel/
│   ├── lib/tauri-bridge.ts        # typed IPC wrappers
│   └── App.tsx
└── tauri.conf.json
```

---

## 6. Data Flow (Real-Time Watch Example)

```
notify crate detects file change in watched directory
  → watcher.rs debounces event (300ms window)
  → rule_engine.rs evaluates rules against new file's metadata
  → matched rule triggers action (move/copy/rename)
  → journal.rs records operation for undo
  → Tauri event emitted to frontend ("afo://file-organized")
  → React/Svelte UI updates activity feed with animated toast + live counter
```

---

## 7. Data Storage

| Data | Location | Format |
|------|----------|--------|
| Config | `~/.config/afo/config.json` | JSON |
| Rules | `~/.config/afo/rules.json` | JSON |
| Operation journal (undo) | `~/.local/share/afo/journal.db` | SQLite |
| Logs | `~/.local/share/afo/afo.log` | Structured text (via `tracing`) |
| Quarantine (soft-delete) | `~/.local/share/afo/quarantine/` | Filesystem |

---

## 8. Dependencies

### Backend (Rust)
| Crate | Purpose |
|-------|---------|
| `tauri` | App shell, IPC, native window |
| `tokio` | Async runtime |
| `rayon` | Parallel duplicate hashing |
| `blake3` | Fast file hashing |
| `notify` | Filesystem watching |
| `rusqlite` | Undo journal storage |
| `kamadak-exif` | EXIF metadata |
| `lofty` | Audio tag metadata |
| `tokio-cron-scheduler` | Scheduled automation |
| `serde` / `serde_json` | Serialization |

### Frontend
| Package | Purpose |
|---------|---------|
| `react` / `svelte` | UI framework |
| `framer-motion` (React) / native Svelte transitions | Animation |
| `reactflow` | Visual rule builder |
| `zustand` / Svelte stores | State management |
| `@tauri-apps/api` | Frontend-to-Rust IPC bridge |

---

## 9. Error Handling

| Scenario | Behavior |
|----------|----------|
| Directory not found | IPC command returns typed error; UI shows inline error, no crash |
| Permission denied | Caught per-file, logged, surfaced in activity feed with retry option |
| Name collision | Auto-suffix (`_1`, `_2`, …) |
| Invalid regex in rule | Rule builder validates regex client-side before save; server re-validates on evaluation |
| Corrupt config/rules | Falls back to defaults; user notified via toast, original file backed up with `.bak` suffix |
| Watcher crash | Auto-restarts watcher task with exponential backoff; logged |
| Journal write failure | Operation still completes but is flagged "unrecoverable" in the activity feed so the user isn't misled about undo availability |

---

## 10. Platform Considerations

| Concern | Linux | Windows | macOS |
|---------|-------|---------|-------|
| Native webview | WebKitGTK | WebView2 (Edge) | WKWebView |
| Symlinks | `std::os::unix::fs::symlink` | Requires elevated privileges or Developer Mode | `std::os::unix::fs::symlink` |
| File watching | inotify (via `notify`) | ReadDirectoryChangesW | FSEvents |
| Installer | `.deb` / `.AppImage` | `.msi` | `.dmg` |

---

## 11. Known Limitations (v2.0 launch)

1. Cloud sync remains a stub — no real Dropbox/Drive API calls at launch.
2. ML categorization is still a static-scaffold suggestion model, not a learned one.
3. Recursive scanning has a configurable but hard depth cap (default 5) to protect against runaway operations on deeply nested filesystems.
4. Real-time watch mode is opt-in per directory, not global by default, to avoid unexpected background disk activity.

---

## 12. Future Roadmap

| Priority | Feature | Rationale |
|----------|---------|-----------|
| P1 | Plugin system (WASM-based custom actions) | Rust + Tauri makes WASM plugins a natural extension point, safer than raw script execution |
| P1 | ML training from user history | Learn from accepted/rejected suggestions instead of static extension map |
| P2 | Multi-device rule sync | Once real cloud sync lands, sync rules/config across devices |
| P2 | Preset profiles ("Downloads cleanup", "Photo import") | Reduce setup friction |
| P3 | Mobile companion app (Tauri Mobile) | View/trigger organize jobs remotely |

---

*New features and architectural suggestions in this document beyond the original AFO scope are marked "(suggested by Claude)".*
