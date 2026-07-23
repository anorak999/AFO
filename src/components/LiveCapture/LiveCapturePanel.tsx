import { useState, useEffect, useCallback } from "react";
import { FolderOpen } from "lucide-react";
import {
  getCaptureConfig,
  getCaptureStats,
  getDirStats,
  getPendingActions,
  watchDirectory,
  type CaptureConfig,
  type CaptureStats as CaptureStatsType,
  type DirStats,
  type PendingAction,
} from "../../lib/tauri-bridge";
import { Card, CardHeader, CardDescription } from "../ui/Card";
import Button from "../ui/Button";
import CaptureStatsBar from "./CaptureStats";
import DirConfigCard from "./DirConfigCard";
import PendingActionsList from "./PendingActions";
import FileIndexView from "./FileIndexView";
import ChangeTimeline from "./ChangeTimeline";

type Tab = "dashboard" | "index" | "timeline";

export default function LiveCapturePanel() {
  const [config, setConfig] = useState<CaptureConfig | null>(null);
  const [stats, setStats] = useState<CaptureStatsType | null>(null);
  const [dirStats, setDirStats] = useState<Record<string, DirStats>>({});
  const [pending, setPending] = useState<PendingAction[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [newDir, setNewDir] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [c, s, p] = await Promise.all([getCaptureConfig(), getCaptureStats(), getPendingActions()]);
      setConfig(c);
      setStats(s);
      setPending(p);

      // Load per-dir stats
      const ds: Record<string, DirStats> = {};
      for (const dir of c.directories) {
        try {
          ds[dir.path] = await getDirStats(dir.path);
        } catch { /* skip */ }
      }
      setDirStats(ds);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleAddDir() {
    if (!newDir.trim()) return;
    try {
      await watchDirectory(newDir.trim());
      setNewDir("");
      await refresh();
    } catch { /* ignore */ }
  }

  async function handlePickDir() {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const sel = await open({ directory: true, multiple: false });
      if (sel && typeof sel === "string") {
        await watchDirectory(sel);
        await refresh();
      }
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Live Capture</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>Loading...</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "index", label: "File Index" },
    { id: "timeline", label: "Timeline" },
  ];

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Live Capture</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Real-time monitoring and control for watched directories.</p>
      </div>

      {/* Stats bar */}
      <CaptureStatsBar stats={stats} />

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg p-1" style={{ backgroundColor: "var(--bg-inset)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              backgroundColor: activeTab === tab.id ? "var(--bg-card)" : "transparent",
              color: activeTab === tab.id ? "var(--text-primary)" : "var(--text-tertiary)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "dashboard" && (
        <div className="space-y-4">
          {/* Add directory */}
          <Card>
            <CardHeader>Add Watched Directory</CardHeader>
            <CardDescription>Add a new directory to monitor with Live Capture.</CardDescription>
            <div className="flex items-center gap-2 mt-2">
              <Button variant="secondary" onClick={handlePickDir} className="text-xs gap-1">
                <FolderOpen size={12} /> Browse
              </Button>
              <input
                type="text"
                value={newDir}
                onChange={(e) => setNewDir(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDir()}
                placeholder="/path/to/directory"
                className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none"
                style={{ backgroundColor: "var(--bg-inset)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
              />
              <Button onClick={handleAddDir} disabled={!newDir.trim()} className="text-xs">Add</Button>
            </div>
          </Card>

          {/* Directory cards */}
          {config && config.directories.length > 0 && (
            <div className="space-y-3">
              {config.directories.map((dir) => (
                <DirConfigCard
                  key={dir.path}
                  config={dir}
                  stats={dirStats[dir.path] || null}
                  onRemoved={refresh}
                />
              ))}
            </div>
          )}

          {config && config.directories.length === 0 && (
            <Card>
              <p className="text-sm text-center py-4" style={{ color: "var(--text-tertiary)" }}>
                No directories being watched. Add one above to get started.
              </p>
            </Card>
          )}

          {/* Pending actions */}
          {pending.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2" style={{ color: "var(--text-primary)" }}>Pending Actions</h3>
              <PendingActionsList actions={pending} onRefresh={refresh} />
            </div>
          )}
        </div>
      )}

      {activeTab === "index" && <FileIndexView />}
      {activeTab === "timeline" && <ChangeTimeline />}
    </div>
  );
}
