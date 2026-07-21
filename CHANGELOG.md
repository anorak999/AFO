# Changelog

## v2.5.1 (2026-07-21)

### Fixed
- **Panel state loss on tab switch**: Switching between tabs (Organize, Rule Builder, Duplicates, History, Settings) no longer destroys local state. All panels are now kept mounted and toggled via CSS visibility instead of being unmounted/remounted by `AnimatePresence`. This fixes the issue where tabs appeared "empty" after executing an operation or switching away and back.
- Eliminated redundant Tauri IPC calls (`listRules`, `getHistory`, `listWatchedDirectories`, `listSchedules`) that previously fired on every panel re-mount.

## v2.5.0

### Added
- Native design system — macOS-inspired light/dark theme with Card, Toggle, SegmentedControl, Button primitives
- AFO.png as sidebar logo and desktop app icon

### Fixed
- Toggle knob positioning
- Settings panel blank page
- Watcher debounce thread runtime
- Comprehensive .deb dependencies
- Icon generation at all required sizes
