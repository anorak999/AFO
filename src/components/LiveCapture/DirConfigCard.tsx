import { useState } from "react";
import { Scan } from "lucide-react";
import { type DirectoryConfig, type DirStats, type CaptureMode, setCaptureMode, setDirEnabled, scanAndIndex } from "../../lib/tauri-bridge";
import Button from "../ui/Button";
import Toggle from "../ui/Toggle";

const MODES: { value: CaptureMode; label: string; description: string }[] = [
  { value: "auto_organize", label: "Auto", description: "Silently move files matching rules" },
  { value: "notify_only", label: "Notify", description: "Queue moves for approval" },
  { value: "full_capture", label: "Capture", description: "Index everything, no auto-move" },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

interface Props {
  config: DirectoryConfig;
  stats: DirStats | null;
  onRemoved: () => void;
}

export default function DirConfigCard({ config, stats, onRemoved }: Props) {
  const [scanning, setScanning] = useState(false);

  async function handleModeChange(mode: CaptureMode) {
    await setCaptureMode(config.path, mode);
    onRemoved(); // trigger refresh
  }

  async function handleToggle(enabled: boolean) {
    await setDirEnabled(config.path, enabled);
    onRemoved();
  }

  async function handleScan() {
    setScanning(true);
    try {
      await scanAndIndex(config.path);
      onRemoved(); // trigger refresh
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "var(--bg-inset)", border: "1px solid var(--border-default)" }}>
      <div className="flex items-center gap-3">
        <Toggle checked={config.enabled} onChange={handleToggle} size="sm" />
        <span className="flex-1 text-sm font-medium truncate" style={{ color: config.enabled ? "var(--text-primary)" : "var(--text-tertiary)" }} title={config.path}>
          {config.path}
        </span>
        <Button variant="secondary" onClick={handleScan} disabled={scanning} className="text-xs px-2 py-1 gap-1">
          <Scan size={12} /> {scanning ? "Scanning..." : "Scan"}
        </Button>
      </div>

      {/* Mode selector */}
      <div className="flex gap-1.5">
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => handleModeChange(m.value)}
            className="flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: config.capture_mode === m.value ? "var(--accent-soft)" : "transparent",
              color: config.capture_mode === m.value ? "var(--accent)" : "var(--text-tertiary)",
              border: `1px solid ${config.capture_mode === m.value ? "var(--accent)" : "var(--border-default)"}`,
            }}
            title={m.description}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {stats && (
        <div className="flex gap-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
          <span>{stats.file_count.toLocaleString()} files</span>
          <span>{formatBytes(stats.disk_usage)}</span>
          <span>{stats.changes_per_minute.toFixed(1)}/min</span>
          {stats.last_triggered_rule && <span>Last: {stats.last_triggered_rule}</span>}
        </div>
      )}
    </div>
  );
}
