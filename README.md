# AFO — Advanced File Organizer

Cross-platform desktop file organization application built with Tauri v2 (Rust backend) and React (TypeScript frontend).

## Features

- **One-click file sorting** by extension, date, or custom rules
- **Duplicate detection** with blake3 hashing and parallel scanning
- **Batch rename** with pattern templates (`{name}`, `{ext}`, `{counter}`)
- **Visual rule builder** with node-based editor (React Flow)
- **Metadata extraction** from EXIF and audio tags
- **Real-time folder watching** with configurable directories
- **Undo/redo** with full file operation reversal
- **Scheduled automation** with cron expressions
- **Command palette** (Cmd/Ctrl+K) for quick navigation
- **Dark theme** with fluid animations

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Rust, Tauri v2, Tokio |
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Animation | Framer Motion |
| Rule Editor | React Flow |
| Hashing | blake3 |
| Parallelism | rayon |
| File Watching | notify |
| Database | SQLite (rusqlite) |
| Scheduling | tokio-cron-scheduler |

## Prerequisites

- **Rust** (stable): [rustup.rs](https://rustup.rs/)
- **Node.js** 20+: [nodejs.org](https://nodejs.org/)
- **System dependencies** (Linux):
  ```bash
  sudo apt-get install libgtk-3-dev libwebkit2gtk-4.1-dev
  ```

## Installation

```bash
# Clone the repository
git clone https://github.com/anorak999/AF0.git
cd AF0

# Install frontend dependencies
npm install

# Run in development mode
cargo tauri dev

# Build for production
cargo tauri build
```

## Development

```bash
# Frontend dev server (hot reload)
npm run dev

# Rust backend (hot reload)
cargo tauri dev

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Formatting
npm run format
```

## Project Structure

```
afo/
├── src-tauri/                 # Rust backend
│   ├── src/
│   │   ├── main.rs           # Entry point
│   │   ├── lib.rs            # Tauri builder
│   │   ├── commands.rs       # IPC command handlers
│   │   └── core/
│   │       ├── organizer.rs  # File organization engine
│   │       ├── rule_engine.rs # Rule evaluation
│   │       ├── duplicates.rs # Duplicate detection
│   │       ├── metadata.rs   # EXIF/audio extraction
│   │       ├── journal.rs    # Undo/redo system
│   │       ├── watcher.rs    # Folder watching
│   │       └── scheduler.rs  # Cron automation
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                       # React frontend
│   ├── components/
│   │   ├── Sidebar/
│   │   ├── OrganizePanel/
│   │   ├── RuleBuilder/
│   │   ├── DuplicatesPanel/
│   │   ├── HistoryPanel/
│   │   ├── CommandPalette/
│   │   └── SettingsPanel/
│   ├── lib/
│   │   ├── store.ts          # Zustand store
│   │   └── tauri-bridge.ts   # IPC wrappers
│   └── App.tsx
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## Data Locations

| Data | Location |
|------|----------|
| Config | `~/.config/afo/config.json` |
| Rules | `~/.config/afo/rules.json` |
| Schedules | `~/.config/afo/schedules.json` |
| Journal | `~/.local/share/afo/journal.db` |
| Quarantine | `~/.local/share/afo/quarantine/` |
| Logs | `~/.local/share/afo/afo.log` |

## License

MIT
