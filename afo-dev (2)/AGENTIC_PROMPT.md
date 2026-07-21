# Task: integrate the "Native" design system into AFO

Context: AFO is a Tauri v2 + React 18 + TypeScript + Tailwind CSS desktop
app (repo: anorak999/AFO). We're replacing the current basic UI with a
macOS System-Settings-inspired design system, applied to the app's real
screens (Organize, Rule Builder, Duplicates, History, Settings) rather
than a literal settings list. It must ship with a light theme (default)
and a dark theme, toggleable and persisted.

I'm attaching the following files, already written to match this
codebase's conventions — copy them in as-is, then wire them up:

- src/styles/theme.css        → CSS custom properties for both themes
- tailwind.tokens.js          → merge into tailwind.config.js (adds
                                 colors/shadows/radii mapped to the CSS
                                 vars; sets darkMode: 'class')
- src/lib/ThemeProvider.tsx   → React context, localStorage-persisted,
                                 defaults to light on first run
- src/components/ui/Toggle.tsx
- src/components/ui/SegmentedControl.tsx
- src/components/ui/Card.tsx  → Card / CardHeader / CardRow / CardFooter
- src/components/ui/Button.tsx
- src/components/Sidebar.tsx  → uses lucide-react icons + logo.png
- src/components/OrganizePanel.tsx → reference implementation showing
                                 how the primitives above compose

## What I need you to do

1. **Merge tailwind.tokens.js into tailwind.config.js.** Don't overwrite
   existing config — merge `theme.extend` and set `darkMode: 'class'`.
   Import `src/styles/theme.css` once, before the Tailwind directives,
   in the app's global stylesheet (likely `src/index.css`).

2. **Install `lucide-react` and `framer-motion`** if either isn't
   already a dependency (Framer Motion is already in the stack per the
   README tech list — reuse it, don't add a second animation library).

3. **Drop the funnel logo PNG at `src/assets/logo.png`** (I'll supply
   the file) and confirm `Sidebar.tsx`'s import path resolves.

4. **Wrap the app root in `<ThemeProvider>`** (in `App.tsx` or wherever
   the router/shell lives), so every screen can call `useTheme()`.

5. **Rebuild the existing panels — OrganizePanel, RuleBuilder,
   DuplicatesPanel, HistoryPanel, SettingsPanel — using the `Card` /
   `CardHeader` / `CardRow` / `CardFooter` / `Toggle` / `SegmentedControl`
   / `Button` primitives**, following the pattern in the attached
   `OrganizePanel.tsx`. Keep each panel's actual copy and settings as
   they exist today — only the presentation layer changes:
   - Rule Builder: "Rule Builder Settings" card (Visual Rule Editor /
     Live Preview toggles) + "Quick Actions" card (Create New Rule as
     a primary Button, full width).
   - Duplicates: "Detection Settings" card (Auto-Quarantine / Preserve
     First Occurrence toggles) + "Hashing Algorithm" card using
     SegmentedControl for BLAKE3 / SHA-256 / MD5 + "Quick Actions" card.
   - History: "History Settings" card (Enable Undo/Redo / Keep Full
     History toggles) + "Recent Operations" card (empty state text) +
     "Actions" card with a `variant="danger"` Button for Clear History.
   - Settings: General / Notifications / Privacy / About, each as its
     own Card with CardRows — About's Version/Build rows are read-only
     (no toggle), right-aligned value text.

6. **Replace every icon in the sidebar and elsewhere with lucide-react
   icons** at a consistent stroke width (default is fine) — no mixed
   icon sets, no emoji, no placeholder glyphs. Match the icon-to-tile
   color mapping already defined in `theme.css`
   (--icon-organize/rules/duplicates/history/settings).

7. **Add a theme toggle to the Settings screen's General card** — a
   `CardRow` with label "Appearance" and a control that switches
   between Light/Dark (either the `Toggle` component or, if you'd
   rather match macOS exactly, a small two-option `SegmentedControl`
   labeled "Light" / "Dark"). Call `useTheme().toggleTheme` /
   `setTheme`.

8. **Verify dark mode end-to-end**: toggle it, confirm every card,
   border, icon tile, and button repaints correctly with no
   hard-coded light-only colors left in any panel (grep for stray hex
   values outside `theme.css` — there shouldn't be any).

9. Keep the existing native macOS traffic-light titlebar chrome as-is;
   only the content area and sidebar are in scope here.

Ask me before renaming any existing component files if it would break
other imports — otherwise proceed and run the type checker
(`npx tsc --noEmit`) plus `cargo tauri dev` to confirm it boots clean.
