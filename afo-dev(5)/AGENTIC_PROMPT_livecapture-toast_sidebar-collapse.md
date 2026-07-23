# AFO — Live Capture toast fix + sidebar collapse

Two independent items — treat as separate fixes, verify each on its
own before moving to the next.

## 1. Live Capture (Notify mode) isn't producing toast notifications

Directory is watched, mode is set to "Notify," dashboard shows the
directory active — but no toast appears when a file changes in that
directory.

Before writing any fix, diagnose which of these it actually is (they
look identical from the screenshot alone, so please report back which
one before proceeding):

a) **Backend isn't emitting the event at all.** Confirm the file
   watcher is actually firing for this directory — add a temporary
   log/println in the watcher's change-detection callback and confirm
   it fires when you touch a file in /home/anorak/Downloads. If it
   doesn't fire, the bug is in the watcher setup for this directory
   (maybe it's watching but not correctly bound to Notify mode's event
   channel), not in the toast system.

b) **Backend emits, but under a different event name/payload shape
   than the frontend listens for.** Check what Tauri event name the
   watcher emits on file change (e.g. `live-capture:file-changed`) vs
   what the frontend's `listen()` call subscribes to — a rename or a
   payload shape change during recent Live Capture work could have
   desynced these without either side erroring.

c) **Event arrives correctly, but nothing calls the Toast system for
   it.** The existing Toast component may only be wired to
   organize/duplicate-detection results, and Live Capture's
   file-change handler might update the Pending Actions / Changes
   Today counters (which the dashboard does show updating) without
   ever calling the toast trigger. This is the most likely one given
   the dashboard counters exist and presumably do update correctly —
   worth checking first.

Once diagnosed:
- Fix the actual break point above.
- Confirm the toast obeys the "Duplicates Found" / "Operation
  Complete" / notification-toggle settings pattern already used
  elsewhere, if Live Capture toasts are meant to respect the same
  Settings > Notifications toggles rather than always firing.
- Verify: with Notify mode active on a real directory, create/modify/
  delete a file and confirm a toast appears for each, with correct
  file name and action type. Also confirm "Changes Today" and
  "Pending Actions" counters update in sync with the toasts (not one
  working while the other doesn't — if they ever disagree, that's a
  sign of two separate code paths reacting to the same event
  inconsistently).

## 2. Sidebar collapse-to-icons toggle

Add a minimize/collapse control to the sidebar that squeezes it down
to an icon-only rail (like VS Code's activity bar or Slack's
collapsed sidebar) — full labels hidden, just the colored icon tiles
remain, so it's usable on smaller windows or just as a preference.

Implementation, building on the existing src/components/Sidebar.tsx:

- Add a collapse toggle button — a chevron/arrow icon (lucide-react's
  `PanelLeftClose` / `PanelLeftOpen`, or `ChevronLeft`/`ChevronRight`)
  placed at the bottom of the sidebar, above the "AFO v2.5.44" version
  label, or as a small button docked to the sidebar's right edge —
  your call on exact placement, but it needs to be visually obvious
  and NOT compete with the nav items above it for attention.

- Collapsed state:
  - Sidebar width shrinks from 230px to roughly 56-64px (enough for
    the 22px icon tile plus padding, nothing else).
  - Nav item labels ("Organize", "Live Capture", etc) hide entirely —
    icon tiles remain, centered horizontally in the narrow rail.
  - The brand/logo block at the top should also collapse — hide the
    "AFO" wordmark + version text, keep just the funnel logo, centered.
  - Active-item highlight (the colored background pill) should still
    render correctly at the narrower width — don't let it clip or
    look stretched.
  - Add a tooltip on hover for each icon in collapsed state, showing
    the label text (e.g. via a simple title attribute, or a proper
    tooltip component if one already exists in the codebase — don't
    add a new tooltip dependency just for this).

- Animate the width transition (Framer Motion, consistent with the
  rest of the app's animation library — don't introduce a second
  animation approach). A simple width/opacity transition on the label
  text and width transition on the sidebar container is enough; this
  doesn't need to be elaborate.

- Persist the collapsed/expanded state to localStorage (same pattern
  as ThemeProvider's persistence) so it survives app restart, not just
  the session.

- Verify: toggle collapse/expand multiple times, confirm no layout
  jump or content overflow during the transition, confirm all 7 nav
  items (including the newer Live Capture and Storage entries) render
  correctly collapsed, confirm state persists across a restart, and
  confirm the main content area correctly reflows to use the extra
  width when the sidebar collapses (it shouldn't leave a gap or leave
  the content area a fixed width that ignores the sidebar shrinking).

Report back on both items separately, pass/fail, with screenshots of
the sidebar in both expanded and collapsed states, and Live Capture
producing a toast for a real file change.
