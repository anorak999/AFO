# AFO v2.5.42 — Storage Breakdown feature

New feature, scoped and honest about its limits: a per-directory
storage breakdown by file category (images/documents/audio/video/
archives/code/other), visualized as a segmented bar + legend —
modeled on the macOS Storage pane's look, but NOT claiming disk-level
accounting. This only reports on directories AFO actually scans, not
total disk capacity, purgeable space, or system data. Don't build
toward the full macOS metaphor — a directory-scoped breakdown is the
honest version of this feature.

Reference: the attached image (macOS System Information > Storage tab)
is a LOOK reference for the segmented bar + legend pattern only — not
a functional spec. Do not attempt to replicate "Manage...", the
disk-image icon, or whole-volume figures.

## Files already written (in this bundle, drop in as-is)

- src/styles/theme.css — appended with --cat-images/documents/audio/
  video/archives/code/other tokens (light + dark), following the same
  pattern as the existing icon-tile tokens.
- src/components/ui/StorageBar.tsx — the segmented bar component.
  Takes `segments: {label, bytes, color}[]` and `totalBytes` (the
  scanned total, i.e. used + free within that directory's scan, NOT
  disk capacity). Segments under ~8% width hide their inline label
  (bar's too narrow) but still appear in the legend. Includes a
  `formatBytes()` helper — reuse it, don't duplicate elsewhere.
- src/components/StoragePanel.tsx — full panel: Source card (directory
  picker, same pattern as OrganizePanel) + Storage Breakdown card
  (bar + 2-column legend grid). The invoke() calls inside are
  commented out as placeholders — you need to wire them to real Tauri
  commands per below.

## Backend work needed (this is the actual new capability)

1. Add a new Tauri command, e.g. `scan_storage_breakdown(directory: String) -> StorageBreakdownResult`,
   in commands.rs, backed by new logic (probably belongs in a new
   `core/storage.rs` or as an addition to `organizer.rs` if the
   existing category-mapping function lives there already).

2. **Reuse the existing category classification** — don't write a
   second file-type-to-category mapping. AFO already classifies files
   into images/documents/audio/video/archives/code for the
   organize-by-extension feature; call into that same function/table
   so the categories shown here are guaranteed consistent with what
   Organize actually does. If that classifier isn't exposed as a
   standalone reusable function yet, factor it out first rather than
   duplicating the extension list.

3. Recursively walk the given directory (reuse whatever the existing
   Directory Scanning / duplicate-detection walker already uses for
   symlink handling and permission-denied handling — this should NOT
   be a third independent directory walker in the codebase), summing
   file sizes per category as it goes.

4. Response shape (matching what StoragePanel.tsx expects):
   ```rust
   struct StorageBreakdownResult {
       directory: String,
       total_scanned_bytes: u64,
       categories: Vec<CategoryBreakdown>,
   }
   struct CategoryBreakdown {
       label: String, // "Images", "Documents", etc — must match
                       // CATEGORY_COLOR keys in StoragePanel.tsx exactly
       bytes: u64,
   }
   ```
   (serde rename to camelCase for the frontend, consistent with
   whatever convention the other commands already use.)

5. Performance: for large directories this needs to not block the UI
   thread — run it async (tokio::task::spawn_blocking or similar,
   consistent with how duplicate detection's blake3 hashing is already
   offloaded) and emit progress events if a full scan of a large tree
   takes more than ~1-2 seconds, reusing the same progress-event
   pattern Directory Scanning already emits during organize operations.

6. Gracefully skip permission-denied subdirectories (same behavior
   already required of Directory Scanning per the README) rather than
   failing the whole scan.

## Frontend wiring

1. In StoragePanel.tsx, replace the commented-out invoke() calls with
   real ones:
   - `handleChooseDirectory`: call whatever command OrganizePanel uses
     for its directory picker (reuse, don't duplicate).
   - `handleScan`: call `scan_storage_breakdown`, set loading state
     around it, surface errors via the existing Toast system.

2. Add "Storage" as a new sidebar entry (new icon — lucide-react's
   `HardDrive` fits the metaphor and is unused elsewhere in the
   sidebar) between Duplicates and History, following the exact same
   pattern as the other Sidebar.tsx nav entries (icon tile color,
   active state, etc).

3. Confirm dark mode: the --cat-* tokens already have dark variants in
   theme.css — no extra work needed here, just don't hardcode any of
   the category colors outside those CSS vars.

## Verification before calling this done

- Point it at a real mixed-content directory (Downloads is usually
  good for this) and confirm the segment sizes roughly match reality
  (spot-check with `du -sh` per category by extension, doesn't need
  to be exact but should be in the right ballpark).
- Confirm a directory AFO doesn't have permission to fully read still
  completes with a partial result rather than erroring out entirely.
- Confirm the bar and legend both repaint correctly switching light
  <-> dark.
- Confirm this doesn't freeze the UI on a large directory (test
  against something with 50k+ files if you have one handy).
- Bump to v2.5.42 in package.json / Cargo.toml / tauri.conf.json
  consistently and cut the GitHub release with deb/rpm packages per
  the existing release process.
