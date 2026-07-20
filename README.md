# AFO — Advanced File Organizer v2.0

Cross-platform desktop file organizer built with Tauri (Rust backend + React frontend).

## Features

- **Organize by extension** — auto-sort files into categories (images, documents, audio, video, archives, code)
- **Organize by date** — sort files into year/month folders
- **Batch rename** — pattern templates with `{name}`, `{ext}`, `{counter}` placeholders
- **Rule engine** — JSON-serialized condition/action pairs (Phase 3)
- **Duplicate detection** — blake3 content hashing with rayon parallelism (Phase 4)
- **Metadata extraction** — EXIF and audio tags (Phase 5)
- **Undo/redo** — reversible operations via SQLite journal (Phase 6)
- **Real-time folder watching** — auto-organize as files land (Phase 7)
- **Scheduled automation** — cron-like periodic runs (Phase 8)
- **Command palette** — Cmd/Ctrl+K quick actions (Phase 9)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Rust + Tauri v2 |
| Frontend | React 18 + TypeScript + Vite 5 |
| Styling | Tailwind CSS 3.4 |
| Animation | Framer Motion 11 |
| State | Zustand 4 |
| Rule Builder | ReactFlow 11 |
| Hashing | blake3 |
| Parallelism | rayon |
| File watching | notify 6 |
| Journal | rusqlite (SQLite) |

## Development

```bash
# Install dependencies
npm install

# Start dev server
cargo tauri dev

# Build for production
cargo tauri build
```

## Project Structure

```
afo/
├── src-tauri/              # Rust backend
│   ├── core/               # Business logic modules
│   │   ├── organizer.rs    # File organization
│   │   ├── rule_engine.rs  # Condition/action rules
│   │   ├── duplicates.rs   # Duplicate detection
│   │   ├── metadata.rs     # EXIF/audio extraction
│   │   ├── journal.rs      # Undo/redo log
│   │   ├── watcher.rs      # Folder watching
│   │   ├── scheduler.rs    # Cron automation
│   │   └── cloud_sync.rs   # Cloud sync stub
│   ├── commands.rs         # Tauri IPC handlers
│   └── main.rs
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── lib/tauri-bridge.ts # Typed IPC wrappers
│   └── App.tsx
└── tauri.conf.json
```

## License

MIT
