export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-white/10 p-4">
      <h2 className="text-sm font-semibold text-white/80 mb-4">AFO</h2>
      <nav className="space-y-1">
        <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white/90 transition-colors">
          Organize
        </button>
        <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white/90 transition-colors">
          Rules
        </button>
        <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white/90 transition-colors">
          Duplicates
        </button>
        <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white/90 transition-colors">
          History
        </button>
        <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/60 hover:bg-white/5 hover:text-white/90 transition-colors">
          Settings
        </button>
      </nav>
    </aside>
  );
}
