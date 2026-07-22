import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAppStore, type Panel } from "../../lib/store";
import { undoLast, redoLast } from "../../lib/tauri-bridge";
import { showToast } from "../Toast";

// ── Types ──────────────────────────────────────────────

interface PaletteCommand {
  id: string;
  label: string;
  category: string;
  action: () => void;
  keywords: string[];
}

// ── Hook: open state ───────────────────────────────────

let externalOpen: (() => void) | null = null;

/** Allow other components to open the palette by importing this. */
export function openCommandPalette() {
  externalOpen?.();
}

// ── Component ──────────────────────────────────────────

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const setActivePanel = useAppStore((s) => s.setActivePanel);

  const openPalette = useCallback(() => {
    setQuery("");
    setActiveIndex(0);
    setVisibleCount(0);
    setOpen(true);
  }, []);

  // Register external opener
  useEffect(() => {
    externalOpen = openPalette;
    return () => {
      externalOpen = null;
    };
  }, [openPalette]);

  // ── Global key listener ──────────────────────────────

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) {
          setOpen(false);
        } else {
          openPalette();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, openPalette]);

  // ── Commands ─────────────────────────────────────────

  const navigate = useCallback(
    (panel: Panel) => {
      setActivePanel(panel);
      setOpen(false);
    },
    [setActivePanel],
  );

  const commands: PaletteCommand[] = useMemo(
    () => [
      {
        id: "nav-organize",
        label: "Go to Organize",
        category: "Navigate",
        action: () => navigate("organize"),
        keywords: ["organize", "files", "panel"],
      },
      {
        id: "nav-rules",
        label: "Go to Rule Builder",
        category: "Navigate",
        action: () => navigate("rules"),
        keywords: ["rules", "builder", "automation"],
      },
      {
        id: "nav-duplicates",
        label: "Go to Duplicates",
        category: "Navigate",
        action: () => navigate("duplicates"),
        keywords: ["duplicates", "dups", "copy"],
      },
      {
        id: "nav-history",
        label: "Go to History",
        category: "Navigate",
        action: () => navigate("history"),
        keywords: ["history", "undo", "log"],
      },
      {
        id: "nav-settings",
        label: "Go to Settings",
        category: "Navigate",
        action: () => navigate("settings"),
        keywords: ["settings", "preferences", "config"],
      },
      {
        id: "action-scan",
        label: "Go to Organize",
        category: "Actions",
        action: () => navigate("organize"),
        keywords: ["scan", "directory", "folder", "analyze"],
      },
      {
        id: "action-undo",
        label: "Undo Last Operation",
        category: "Actions",
        action: async () => {
          setOpen(false);
          try {
            const entry = await undoLast();
            if (entry) showToast(`Undid ${entry.operation_type}`, "success");
            else showToast("Nothing to undo", "info");
          } catch (e) { showToast(`Undo failed: ${e}`, "error"); }
        },
        keywords: ["undo", "revert", "back"],
      },
      {
        id: "action-redo",
        label: "Redo Last Operation",
        category: "Actions",
        action: async () => {
          setOpen(false);
          try {
            const entry = await redoLast();
            if (entry) showToast(`Redid ${entry.operation_type}`, "success");
            else showToast("Nothing to redo", "info");
          } catch (e) { showToast(`Redo failed: ${e}`, "error"); }
        },
        keywords: ["redo", "forward"],
      },
    ],
    [navigate],
  );

  // ── Fuzzy search ─────────────────────────────────────

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.category.toLowerCase().includes(q) ||
        cmd.keywords.some((kw) => kw.includes(q)),
    );
  }, [commands, query]);

  // ── Group by category ────────────────────────────────

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteCommand[]>();
    for (const cmd of filtered) {
      const arr = map.get(cmd.category) ?? [];
      arr.push(cmd);
      map.set(cmd.category, arr);
    }
    return map;
  }, [filtered]);

  // ── Reset on open / query change ─────────────────────

  useEffect(() => {
    if (open) {
      // Focus after render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // ── Staggered reveal ─────────────────────────────────

  useEffect(() => {
    if (!open) return;
    if (visibleCount >= filtered.length) return;
    const delay = 25;
    const timer = setTimeout(() => setVisibleCount((c) => c + 1), delay);
    return () => clearTimeout(timer);
  }, [open, visibleCount, filtered.length]);

  // ── Keyboard nav ─────────────────────────────────────

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[activeIndex]?.action();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-cmd-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  // ── Render ───────────────────────────────────────────

  if (!open) return null;

  const isMac =
    typeof navigator !== "undefined" && navigator.platform?.toUpperCase().includes("MAC");
  const modKey = isMac ? "⌘" : "Ctrl";

  let flatIndex = 0;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onKeyDown={onKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Card */}
      <div className="relative w-full max-w-[640px] rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl shadow-black/50">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-4">
          <svg
            className="h-5 w-5 shrink-0 text-white/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command…"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
          <kbd className="hidden rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] text-white/30 sm:inline">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[360px] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-white/30">No commands found.</div>
          )}

          {[...grouped.entries()].map(([category, commands]) => (
            <div key={category}>
              <div className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-white/20">
                {category}
              </div>
              {commands.map((cmd) => {
                const idx = flatIndex++;
                const isActive = idx === activeIndex;
                const visible = idx < visibleCount;
                return (
                  <button
                    key={cmd.id}
                    data-cmd-index={idx}
                    onClick={cmd.action}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-all duration-150 ${
                      isActive
                        ? "bg-afo-purple/15 text-white"
                        : "text-white/60 hover:bg-white/[0.04]"
                    } ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
                    style={{ transitionDelay: visible ? `${idx * 25}ms` : "0ms" }}
                  >
                    <span className="flex-1 truncate">{cmd.label}</span>
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                        isActive
                          ? "bg-afo-purple/20 text-afo-purple"
                          : "bg-white/[0.06] text-white/25"
                      }`}
                    >
                      {cmd.category}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 border-t border-white/[0.06] px-5 py-2.5 text-[11px] text-white/20">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5">↑↓</kbd>
            navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5">↵</kbd>
            select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5">
              {modKey}K
            </kbd>
            toggle
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
