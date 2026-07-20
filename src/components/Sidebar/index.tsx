export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-white/[0.06] bg-white/[0.015] p-4">
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
        <div className="rounded-lg bg-afo-purple/10 px-3 py-2 text-sm font-medium text-white">
          Organize
        </div>
        <div className="rounded-lg px-3 py-2 text-sm text-white/50 hover:bg-white/[0.04] hover:text-white">
          Rule Builder
        </div>
        <div className="rounded-lg px-3 py-2 text-sm text-white/50 hover:bg-white/[0.04] hover:text-white">
          Duplicates
        </div>
        <div className="rounded-lg px-3 py-2 text-sm text-white/50 hover:bg-white/[0.04] hover:text-white">
          History
        </div>
      </nav>
    </aside>
  );
}
