import { useAppStore, type Panel } from "../../lib/store";

const NAV_ITEMS: { id: Panel; label: string }[] = [
  { id: "organize", label: "Organize" },
  { id: "rules", label: "Rule Builder" },
  { id: "duplicates", label: "Duplicates" },
  { id: "history", label: "History" },
  { id: "settings", label: "Settings" },
];

export default function Sidebar() {
  const activePanel = useAppStore((s) => s.activePanel);
  const setActivePanel = useAppStore((s) => s.setActivePanel);

  return (
    <aside className="w-64 shrink-0 border-r border-white/[0.06] bg-white/[0.015] p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-afo-purple to-[#5B3FD9] text-sm font-bold text-white">
          AF
        </div>
        <div>
          <div className="text-sm font-semibold">AFO</div>
          <div className="text-[10px] text-white/30">v2.0 Tauri</div>
        </div>
      </div>
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = activePanel === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                active
                  ? "bg-white/10 font-medium text-white"
                  : "text-white/50 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
