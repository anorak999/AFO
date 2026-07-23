import type { CaptureStats as CaptureStatsType } from "../../lib/tauri-bridge";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function CaptureStats({ stats }: { stats: CaptureStatsType | null }) {
  if (!stats) return null;

  const items = [
    { label: "Indexed Files", value: stats.total_indexed_files.toLocaleString() },
    { label: "Changes Today", value: stats.total_changes_today.toLocaleString() },
    { label: "Pending Actions", value: stats.pending_actions.toLocaleString(), accent: stats.pending_actions > 0 },
    { label: "Watched Dirs", value: stats.watched_dirs_count.toLocaleString() },
    { label: "Disk Usage", value: formatBytes(stats.total_disk_usage) },
  ];

  return (
    <div className="flex gap-4 flex-wrap">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: "var(--bg-inset)" }}>
          <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>{item.label}</span>
          <span className="text-sm font-semibold" style={{ color: item.accent ? "var(--warning)" : "var(--text-primary)" }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
