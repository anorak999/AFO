import { motion } from "framer-motion";
import { FolderOpen, GitBranch, Copy, History, Settings, Radio } from "lucide-react";
import { useAppStore, type Panel } from "../../lib/store";
import logo from "../../assets/logo.png";

const NAV_ITEMS: { id: Panel; label: string; icon: typeof FolderOpen; cssVar: string }[] = [
  { id: "organize", label: "Organize", icon: FolderOpen, cssVar: "--icon-organize" },
  { id: "capture", label: "Live Capture", icon: Radio, cssVar: "--icon-capture" },
  { id: "rules", label: "Rule Builder", icon: GitBranch, cssVar: "--icon-rules" },
  { id: "duplicates", label: "Duplicates", icon: Copy, cssVar: "--icon-duplicates" },
  { id: "history", label: "History", icon: History, cssVar: "--icon-history" },
  { id: "settings", label: "Settings", icon: Settings, cssVar: "--icon-settings" },
];

export default function Sidebar() {
  const activePanel = useAppStore((s) => s.activePanel);
  const setActivePanel = useAppStore((s) => s.setActivePanel);

  return (
    <aside
      className="flex w-60 shrink-0 flex-col border-r py-4"
      style={{
        backgroundColor: "var(--bg-sidebar)",
        borderColor: "var(--border-default)",
      }}
    >
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3 px-5">
        <img
          src={logo}
          alt="AFO"
          className="h-9 w-9 rounded-[10px] object-cover"
        />
      </div>

      {/* Nav */}
      <nav className="relative flex-1 space-y-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active = activePanel === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className="group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors"
              style={{
                color: active ? "var(--text-primary)" : "var(--text-secondary)",
              }}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    backgroundColor: "var(--accent-soft)",
                  }}
                  transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                />
              )}
              <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-md" style={{ backgroundColor: `var(${item.cssVar})` }}>
                <Icon size={16} style={{ color: `var(${item.cssVar}-fg)` }} strokeWidth={1.8} />
              </span>
              <span className="relative z-10 truncate font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Version footer */}
      <div className="px-5 pt-4" style={{ borderTop: "1px solid var(--border-default)" }}>
        <div className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
          AFO v2.5.42
        </div>
      </div>
    </aside>
  );
}
