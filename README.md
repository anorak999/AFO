<div align="center">

# <img src="https://raw.githubusercontent.com/aha-app/aha/main/docs/logo.svg" width="0" height="0" alt="AFO"> ⚡ AFO

### Advanced File Organizer

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

## ✨ Features

<table>
<tr>
<td width="50%">

### 🗂️ Smart Organization
- **One-click sorting** by extension, date, or metadata
- **6 built-in categories** (images, documents, audio, video, archives, code)
- **Configurable mapping** — override categories from `config.json`
- **Auto-suffix collisions** — `_1`, `_2`, `_3` on name conflicts

</td>
<td width="50%">

### 🔁 Batch Rename
- **Pattern templates** — `{name}`, `{ext}`, `{counter}`
- **Configurable start index** — resume from any number
- **Preview before execute** — dry-run mode shows planned changes
- **Live progress bar** — real-time updates during operations

</td>
</tr>
<tr>
<td>

### 🔍 Duplicate Detection
- **blake3 hashing** — faster and more secure than MD5/SHA
- **Rayon parallelism** — multi-core scanning for large directories
- **Size pre-filtering** — skips unique-size files before hashing
- **Quarantine system** — safe staging before permanent deletion

</td>
<td>

### 📋 Visual Rule Builder
- **React Flow canvas** — drag-and-drop node editor
- **12 condition types** — extension, name, size, dates, EXIF, audio
- **7 operators** — equals, contains, regex, greater/less than
- **3 action types** — move, copy, rename

</td>
</tr>
<tr>
<td>

### 🎵 Metadata Extraction
- **EXIF data** — camera make/model, date taken, GPS, exposure
- **Audio tags** — artist, album, title, genre, track, year
- **Smart date sorting** — uses EXIF date taken for photos
- **Graceful fallback** — files without metadata skip silently

</td>
<td>

### ⏱️ Undo/Redo System
- **SQLite journal** — every operation logged before execution
- **Full reversal** — move back, restore from quarantine, rename back
- **Bulk undo** — revert multiple operations at once
- **Activity feed** — toast notifications with undo option

</td>
</tr>
<tr>
<td>

### 👁️ Real-Time Folder Watching
- **Opt-in per directory** — watch only what you need
- **300ms debounce** — handles bulk copy without thrashing
- **Rate limiting** — max 10 ops/second (configurable)
- **Auto-restart** — exponential backoff on crash

</td>
<td>

### ⏰ Scheduled Automation
- **Cron expressions** — `0 9 * * *` for daily at 9am
- **4 action types** — organize, rules, duplicates, custom
- **Persistent schedules** — survives app restart
- **Completion events** — frontend notifications on finish

</td>
</tr>
</table>

---

## 🎨 Interface

<table>
<tr>
<td width="33%">

**Command Palette**
`Cmd/Ctrl+K`

Fuzzy search across all
actions, rules, and settings

</td>
<td width="33%">

**Live Preview**
Real-time

Source → destination tree
with color-coded actions

</td>
<td width="34%">

**Drag & Drop**
Native

Drop files anywhere to
start organizing

</td>
</tr>
</table>

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AFO v2.0 Architecture                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐    IPC    ┌──────────────────────┐   │
│  │   Frontend    │ ◄──────► │      Backend         │   │
│  │   React 18    │  invoke  │      Rust + Tauri    │   │
│  ├──────────────┤          ├──────────────────────┤   │
│  │  Components   │          │  Core Modules        │   │
│  │  ├ Sidebar    │          │  ├ organizer.rs      │   │
│  │  ├ Organize   │          │  ├ rule_engine.rs    │   │
│  │  ├ Rules      │          │  ├ duplicates.rs     │   │
│  │  ├ Duplicates │          │  ├ metadata.rs       │   │
│  │  ├ History    │          │  ├ journal.rs        │   │
│  │  ├ Settings   │          │  ├ watcher.rs        │   │
│  │  └ Commands   │          │  └ scheduler.rs      │   │
│  ├──────────────┤          ├──────────────────────┤   │
│  │  State        │          │  Storage             │   │
│  │  ├ Zustand    │          │  ├ ~/.config/afo/    │   │
│  │  └ Bridge     │          │  ├ ~/.local/share/   │   │
│  └──────────────┘          │  └ SQLite + JSON      │   │
│                             └──────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ Tech Stack

| Layer | Technology | Purpose |
|:------|:-----------|:--------|
| 🦀 Backend | **Rust** + **Tauri v2** | Native performance, system access |
| ⚡ Runtime | **Tokio** | Async I/O, background tasks |
| ⚛️ Frontend | **React 18** + **TypeScript** | Type-safe UI development |
| 🎨 Styling | **Tailwind CSS** | Utility-first design system |
| 🎭 Animation | **Framer Motion** | Fluid transitions and gestures |
| 📊 Rule Editor | **React Flow** | Visual node-based programming |
| 🔐 Hashing | **blake3** | Fast, secure file fingerprinting |
| 🧵 Parallelism | **Rayon** | Data-parallel file scanning |
| 👁️ Watching | **notify** | Cross-platform filesystem events |
| 💾 Database | **SQLite** (rusqlite) | Undo/redo journal persistence |
| ⏰ Scheduling | **tokio-cron-scheduler** | Cron-based automation |
| 📸 Metadata | **kamadak-exif** + **lofty** | EXIF and audio tag extraction |

---

## 🚀 Quick Start

### Prerequisites

| Requirement | Version | Install |
|:------------|:--------|:--------|
| 🦀 Rust | stable | [rustup.rs](https://rustup.rs/) |
| 📦 Node.js | 20+ | [nodejs.org](https://nodejs.org/) |
| 🐧 Linux deps | — | `sudo apt-get install libgtk-3-dev libwebkit2gtk-4.1-dev` |

### Installation

```bash
# 📥 Clone
git clone https://github.com/anorak999/AF0.git
cd AF0

# 📦 Install
npm install

# 🚀 Run
cargo tauri dev

# 🏗️ Build
cargo tauri build
```

### Development Commands

```bash
npm run dev          # 🎨 Frontend dev server (HMR)
cargo tauri dev      # 🦀 Full stack dev mode
npx tsc --noEmit     # 🔍 Type checking
npm run lint         # 🧹 Linting
npm run format       # ✨ Code formatting
cargo clippy -- -D warnings  # 🦀 Rust linting
cargo fmt            # 🦀 Rust formatting
```

---

## 📁 Project Structure

```
afo/
├── 🦀 src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── main.rs                  # Entry point
│   │   ├── lib.rs                   # Tauri builder + setup
│   │   ├── commands.rs              # 25+ IPC command handlers
│   │   └── core/
│   │       ├── organizer.rs         # 🗂️ File organization engine
│   │       ├── rule_engine.rs       # 📋 Rule evaluation + regex cache
│   │       ├── duplicates.rs        # 🔍 blake3 duplicate detection
│   │       ├── metadata.rs          # 🎵 EXIF/audio extraction
│   │       ├── journal.rs           # ⏪ Undo/redo SQLite journal
│   │       ├── watcher.rs           # 👁️ Real-time folder watching
│   │       ├── scheduler.rs         # ⏰ Cron automation
│   │       └── cloud_sync.rs        # ☁️ Cloud sync (post-launch)
│   ├── Cargo.toml                   # 15 crate dependencies
│   ├── tauri.conf.json              # App config + installer targets
│   └── capabilities/default.json    # Tauri v2 permissions
│
├── ⚛️ src/                           # React frontend
│   ├── components/
│   │   ├── Sidebar/                 # 🧭 Navigation with icons
│   │   ├── OrganizePanel/           # 🗂️ Main organize UI
│   │   ├── RuleBuilder/             # 📋 React Flow rule editor
│   │   ├── DuplicatesPanel/         # 🔍 Duplicate management
│   │   ├── HistoryPanel/            # ⏪ Undo/redo history
│   │   ├── CommandPalette/          # ⌘K Quick actions
│   │   ├── SettingsPanel/           # ⚙️ App configuration
│   │   ├── PreviewPane/             # 👁️ Live operation preview
│   │   ├── DropZone/                # 📥 Drag-and-drop intake
│   │   └── Toast.tsx                # 🔔 Notification system
│   ├── lib/
│   │   ├── store.ts                 # 🗃️ Zustand state management
│   │   └── tauri-bridge.ts          # 🔌 Typed IPC wrappers
│   ├── App.tsx                      # 🏠 App shell + routing
│   └── index.css                    # 🎨 Global styles + scrollbar
│
├── 📦 package.json                  # Frontend dependencies
├── 🎨 tailwind.config.js            # Design tokens + colors
├── ⚡ vite.config.ts                # Build configuration
└── 📖 README.md                     # This file
```

---

## 💾 Data Locations

| Data | Path | Format |
|:-----|:-----|:-------|
| 📝 Config | `~/.config/afo/config.json` | JSON |
| 📋 Rules | `~/.config/afo/rules.json` | JSON |
| ⏰ Schedules | `~/.config/afo/schedules.json` | JSON |
| 📜 Journal | `~/.local/share/afo/journal.db` | SQLite |
| 🗑️ Quarantine | `~/.local/share/afo/quarantine/` | Directories |
| 📊 Logs | `~/.local/share/afo/afo.log` | Rolling daily |

---

## 🎯 Performance

| Operation | Before | After | Improvement |
|:----------|:-------|:------|:------------|
| Regex evaluation | 500ms | <1ms | **99.8%** |
| Rules per directory | 500ms | 5ms | **99%** |
| EXIF on non-images | 200ms | <10ms | **95%** |
| Duplicate hashing | 5s | ~2s | **60%** |
| Watcher rule reload | 500ms | 5ms | **99%** |

*Benchmarked on 10k files, 100 subdirectories, 5 regex rules.*

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ⚡ by the AFO team**

*Star ⭐ if you find this useful*

</div>
