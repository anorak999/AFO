<div align="center">

# ⚡ AFO — Advanced File Organizer

**Tauri v2 · Rust · React · TypeScript**

Cross-platform desktop file organization with rule-based sorting, duplicate detection, batch rename, and metadata-aware automation.

---

[![Rust](https://img.shields.io/badge/Rust-1.70+-FF6B35?style=flat-square&logo=rust&logoColor=white)](https://www.rust-lang.org/)
[![Tauri](https://img.shields.io/badge/Tauri-v2-FFC131?style=flat-square&logo=tauri&logoColor=black)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-00D2FF?style=flat-square)](LICENSE)

---

</div>

## Features

### Smart Organization
- One-click sorting by extension, date, or metadata
- 6 built-in categories (images, documents, audio, video, archives, code)
- Configurable mapping — override categories from `config.json`
- Auto-suffix collisions — `_1`, `_2`, `_3` on name conflicts

### Batch Rename
- Pattern templates — `{name}`, `{ext}`, `{counter}`
- Configurable start index — resume from any number
- Preview before execute — dry-run mode shows planned changes
- Live progress bar — real-time updates during operations

### Duplicate Detection
- blake3 hashing — faster and more secure than MD5/SHA
- Rayon parallelism — multi-core scanning for large directories
- Size pre-filtering — skips unique-size files before hashing
- Quarantine system — safe staging before permanent deletion

### Visual Rule Builder
- React Flow canvas — drag-and-drop node editor
- 12 condition types — extension, name, size, dates, EXIF, audio
- 7 operators — equals, contains, regex, greater/less than
- 3 action types — move, copy, rename

### Metadata Extraction
- EXIF data — camera make/model, date taken, GPS, exposure
- Audio tags — artist, album, title, genre, track, year
- Smart date sorting — uses EXIF date taken for photos
- Graceful fallback — files without metadata skip silently

### Undo/Redo System
- SQLite journal — every operation logged before execution
- Full reversal — move back, restore from quarantine, rename back
- Bulk undo — revert multiple operations at once
- Activity feed — toast notifications with undo option

### Real-Time Folder Watching
- Opt-in per directory — watch only what you need
- 300ms debounce — handles bulk copy without thrashing
- Rate limiting — max 10 ops/second (configurable)
- Auto-restart — exponential backoff on crash

### Scheduled Automation
- Cron expressions — `0 9 * * *` for daily at 9am
- 4 action types — organize, rules, duplicates, custom
- Persistent schedules — survives app restart
- Completion events — frontend notifications on finish

---

## v3.0.0 — Major Release

### Tutorial Panel
- Dedicated tutorial panel in sidebar (no modal overlay)
- 6-step onboarding: Welcome, Quick Start, Features, How It Works, Tips, Ready
- Minimal design: clickable dot indicators, single action button
- Auto-navigates on first launch, re-openable from Settings

### Storage Redesign (macOS Style)
- Auto-detects system drives with `sysinfo` crate
- Drive icons: folder for internal, drive for external
- Custom directory analysis with localStorage persistence
- Category breakdown with colored segments and legend
- Shows free/total space, usage percentage

### Live Capture Improvements
- Remove directory button for watched folders
- Backend: `remove_directory` command for config cleanup

### Accent Color Update
- New accent: `#0071E3` (light) / `#409cff` (dark)
- Consistent across all UI elements

### Bug Fixes
- CommandPalette: stopPropagation prevents accidental close
- Modal overlay bugs eliminated (tutorial now a panel)
- Storage bar now works for custom directories

---

## v2.5.2 — GitHub-Style Buttons & UI Refinements

- **GitHub-style buttons** — clean, minimal button design with subtle shadows and hover effects (primary/secondary/danger variants)
- **SegmentedControl** — rebuilt with Uiverse pill-radio sliding indicator, themed for light/dark modes
- **HoverButton component** — pointer-trail glass morphism effect for interactive elements
- **cn() utility** — clsx + tailwind-merge for className composition
- **RuleFlowEditor toolbar** — converted to use Button component for consistency
- **GitHub link** — added to About section in Settings

---

## v2.5 — Native Design System

The v2.5 release introduces a macOS System Settings-inspired design system:

- **Light + Dark themes** — toggleable, persisted in localStorage
- **Card/CardRow/Toggle/SegmentedControl/Button** primitives
- **lucide-react icons** — consistent stroke icons across all screens
- **Theme Provider** — React context wrapping the entire app
- **Zero hardcoded colors** — all surfaces use CSS custom properties

---

## Tech Stack

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| Backend | Rust + Tauri v2 | Native performance, system access |
| Runtime | Tokio | Async I/O, background tasks |
| Frontend | React 18 + TypeScript | Type-safe UI development |
| Styling | Tailwind CSS + CSS vars | Theme-aware design system |
| Animation | Framer Motion | Fluid transitions and gestures |
| Icons | lucide-react | Consistent stroke icons |
| Rule Editor | React Flow | Visual node-based programming |
| Hashing | blake3 | Fast, secure file fingerprinting |
| Parallelism | Rayon | Data-parallel file scanning |
| Watching | notify | Cross-platform filesystem events |
| Database | SQLite (rusqlite) | Undo/redo journal persistence |
| Scheduling | tokio-cron-scheduler | Cron-based automation |
| Metadata | kamadak-exif + lofty | EXIF and audio tag extraction |

---

## Quick Start

### Prerequisites

| Requirement | Version | Install |
|:------------|:--------|:--------|
| Rust | stable | [rustup.rs](https://rustup.rs/) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org/) |
| Linux deps | — | `sudo apt-get install libgtk-3-dev libwebkit2gtk-4.1-dev` |

### From Source

```bash
git clone https://github.com/anorak999/AFO.git
cd AFO
npm install
cargo tauri dev
```

### From Release

Download the latest release from [GitHub Releases](https://github.com/anorak999/AFO/releases):

| Platform | Format | Install |
|:---------|:-------|:--------|
| Linux | `.deb` | `sudo dpkg -i AFO_3.0.0_amd64.deb` |
| Linux | `.rpm` | `sudo rpm -i AFO-3.0.0-1.x86_64.rpm` |
| Windows | `.exe` | Run the NSIS installer |
| macOS | `.dmg` | Open and drag to Applications |

### Development Commands

```bash
npm run dev          # Frontend dev server (HMR)
cargo tauri dev      # Full stack dev mode
npx tsc --noEmit     # Type checking
npm run lint         # Linting
npm run format       # Code formatting
```

---

## Project Structure

```
AFO/
├── .github/workflows/          # CI/CD
│   └── release.yml             # Cross-platform build + release
│
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── main.rs             # Entry point
│   │   ├── lib.rs              # Tauri builder + setup
│   │   ├── commands.rs         # 25+ IPC command handlers
│   │   └── core/
│   │       ├── organizer.rs    # File organization engine
│   │       ├── rule_engine.rs  # Rule evaluation + regex cache
│   │       ├── duplicates.rs   # blake3 duplicate detection
│   │       ├── metadata.rs     # EXIF/audio extraction
│   │       ├── journal.rs      # Undo/redo SQLite journal
│   │       ├── watcher.rs      # Real-time folder watching
│   │       ├── scheduler.rs    # Cron automation
│   │       └── cloud_sync.rs   # Cloud sync (post-launch)
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── capabilities/default.json
│
├── src/                        # React frontend
│   ├── components/
│   │   ├── ui/                 # Design system primitives
│   │   │   ├── Card.tsx        # Card / CardHeader / CardRow
│   │   │   ├── Toggle.tsx      # macOS-style toggle switch
│   │   │   ├── SegmentedControl.tsx  # Pill-radio tabs
│   │   │   ├── Button.tsx      # Primary / secondary / danger
│   │   │   └── hover-button.tsx  # Pointer-trail effect
│   │   ├── Sidebar/            # Navigation with lucide icons
│   │   ├── OrganizePanel/      # Main organize UI
│   │   ├── RuleBuilder/        # React Flow rule editor
│   │   ├── DuplicatesPanel/    # Duplicate management
│   │   ├── HistoryPanel/       # Undo/redo history
│   │   ├── SettingsPanel/      # App configuration
│   │   ├── PreviewPane/        # Live operation preview
│   │   ├── DropZone/           # Drag-and-drop intake
│   │   └── CommandPalette/     # Cmd/Ctrl+K quick actions
│   ├── lib/
│   │   ├── store.ts            # Zustand state management
│   │   ├── ThemeProvider.tsx    # Light/dark theme context
│   │   ├── tauri-bridge.ts     # Typed IPC wrappers
│   │   └── utils.ts            # cn() className utility
│   ├── styles/
│   │   └── theme.css           # CSS custom properties (light + dark)
│   ├── App.tsx
│   └── index.css
│
├── docs/                       # Documentation + assets
│   ├── AFO.png                 # App screenshot
│   ├── Project_Log.md          # Development log
│   └── afo-design-concept.html # Design concept
│
├── package.json
├── tailwind.config.js          # Theme tokens + darkMode: 'class'
├── vite.config.ts
└── README.md
```

---

## Data Locations

| Data | Path | Format |
|:-----|:-----|:-------|
| Config | `~/.config/afo/config.json` | JSON |
| Rules | `~/.config/afo/rules.json` | JSON |
| Schedules | `~/.config/afo/schedules.json` | JSON |
| Journal | `~/.local/share/afo/journal.db` | SQLite |
| Quarantine | `~/.local/share/afo/quarantine/` | Directories |
| Logs | `~/.local/share/afo/afo.log` | Rolling daily |

---

## Performance

| Operation | Before | After | Improvement |
|:----------|:-------|:------|:------------|
| Regex evaluation | 500ms | <1ms | **99.8%** |
| Rules per directory | 500ms | 5ms | **99%** |
| EXIF on non-images | 200ms | <10ms | **95%** |
| Duplicate hashing | 5s | ~2s | **60%** |
| Watcher rule reload | 500ms | 5ms | **99%** |

---

## License

MIT License
