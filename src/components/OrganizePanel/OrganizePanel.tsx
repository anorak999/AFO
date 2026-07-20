export default function OrganizePanel() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold tracking-tight mb-4">Organize Files</h1>
      <p className="text-white/40 text-sm">Select a directory and choose an organization mode.</p>
      <div className="mt-6 space-y-3">
        <button className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-left text-sm text-white/70 hover:bg-white/10 transition-colors">
          Organize by Extension
        </button>
        <button className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-left text-sm text-white/70 hover:bg-white/10 transition-colors">
          Organize by Date
        </button>
        <button className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-left text-sm text-white/70 hover:bg-white/10 transition-colors">
          Batch Rename
        </button>
      </div>
    </div>
  );
}
