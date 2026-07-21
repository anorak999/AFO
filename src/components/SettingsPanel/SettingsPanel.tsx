import { useState, useEffect, useCallback } from "react";
import { watchDirectory, unwatchDirectory, listWatchedDirectories, createSchedule, listSchedules, deleteSchedule, toggleSchedule, runScheduleNow, type WatchedDir, type Schedule } from "../../lib/tauri-bridge";
import { showToast } from "../Toast";
import { useTheme } from "../../lib/ThemeProvider";
import { Card, CardHeader, CardDescription, CardRow } from "../ui/Card";
import Button from "../ui/Button";
import Toggle from "../ui/Toggle";
import SegmentedControl from "../ui/SegmentedControl";

const SECTIONS = [
  { id: "general", label: "General" },
  { id: "notifications", label: "Notifications" },
  { id: "privacy", label: "Privacy" },
  { id: "about", label: "About" },
] as const;

type Section = (typeof SECTIONS)[number]["id"];

export default function SettingsPanel() {
  const [activeSection, setActiveSection] = useState<Section>("general");

  return (
    <div className="flex flex-col gap-5 p-6">
      <div><h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Settings</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Application settings and configuration.</p></div>
      <div className="flex gap-6">
        <nav className="w-48 shrink-0 space-y-1">
          {SECTIONS.map((s) => (
            <button key={s.id} onClick={() => setActiveSection(s.id)} className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors"
              style={{ backgroundColor: activeSection === s.id ? "var(--accent-soft)" : "transparent", color: activeSection === s.id ? "var(--accent)" : "var(--text-secondary)" }}>
              {s.label}
            </button>
          ))}
        </nav>
        <div className="min-w-0 flex-1">
          {activeSection === "general" && <GeneralSection />}
          {activeSection === "notifications" && <NotificationsSection />}
          {activeSection === "privacy" && <PrivacySection />}
          {activeSection === "about" && <AboutSection />}
        </div>
      </div>
    </div>
  );
}

function GeneralSection() {
  const { theme, setTheme } = useTheme();
  const [watchedDirs, setWatchedDirs] = useState<WatchedDir[]>([]);
  const [loadingDirs, setLoadingDirs] = useState(true);
  const [newDir, setNewDir] = useState("");

  const refreshDirs = useCallback(async () => {
    try { setWatchedDirs(await listWatchedDirectories()); } catch { /* ignore */ } finally { setLoadingDirs(false); }
  }, []);
  useEffect(() => { refreshDirs(); }, [refreshDirs]);

  async function handleAddDir() {
    if (!newDir.trim()) return;
    try { await watchDirectory(newDir.trim()); setNewDir(""); await refreshDirs(); showToast("Started watching directory", "success"); } catch (e) { showToast(`Failed: ${e}`, "error"); }
  }
  async function handleRemoveDir(dir: string) {
    try { await unwatchDirectory(dir); await refreshDirs(); showToast("Stopped watching", "info"); } catch (e) { showToast(`Failed: ${e}`, "error"); }
  }
  async function handlePickDir() {
    try { const { open } = await import("@tauri-apps/plugin-dialog"); const sel = await open({ directory: true, multiple: false }); if (sel && typeof sel === "string") setNewDir(sel); } catch { showToast("Picker not available", "error"); }
  }

  return (
    <div className="space-y-5">
      {/* Appearance */}
      <Card>
        <CardHeader>General</CardHeader>
        <CardRow label="Appearance" description="Switch between light and dark theme" control={
          <SegmentedControl options={["Light", "Dark"]} value={theme === "light" ? "Light" : "Dark"} onChange={(v) => setTheme(v === "Light" ? "light" : "dark")} size="sm" />
        } />
        <CardRow label="Recursive scan depth" rightValue="5" />
        <CardRow label="Quarantine auto-delete" rightValue="30 days" />
        <CardRow label="Watch debounce" rightValue="300ms" />
      </Card>

      {/* Watched Directories */}
      <Card>
        <CardHeader>Folder Watching</CardHeader>
        <CardDescription>Configure directories for real-time file watching.</CardDescription>
        <div className="flex items-center gap-2 mb-3">
          <Button variant="secondary" onClick={handlePickDir} className="text-xs">Browse</Button>
          <input type="text" value={newDir} onChange={(e) => setNewDir(e.target.value)} placeholder="/path/to/directory" onKeyDown={(e) => e.key === "Enter" && handleAddDir()}
            className="flex-1 rounded-lg px-3 py-2 text-sm outline-none" style={{ backgroundColor: "var(--bg-inset)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
          <Button onClick={handleAddDir} disabled={!newDir.trim()} className="text-xs">Add</Button>
        </div>
        {loadingDirs ? <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Loading...</p> : watchedDirs.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>No directories being watched.</p>
        ) : (
          <div className="space-y-1.5">
            {watchedDirs.map((dir) => (
              <div key={dir.path} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ backgroundColor: "var(--bg-inset)" }}>
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: dir.enabled ? "var(--success)" : "var(--text-tertiary)" }} />
                <span className="flex-1 truncate text-sm" style={{ color: "var(--text-primary)" }}>{dir.path}</span>
                <button onClick={() => handleRemoveDir(dir.path)} className="text-xs" style={{ color: "var(--danger)" }}>Remove</button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Schedules */}
      <SchedulesCard />
    </div>
  );
}

function SchedulesCard() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCron, setNewCron] = useState("");
  const [newAction, setNewAction] = useState("organize_extension");
  const [newPath, setNewPath] = useState("");

  const refresh = useCallback(async () => { try { setSchedules(await listSchedules()); } catch { /* */ } finally { setLoading(false); } }, []);
  useEffect(() => { refresh(); }, [refresh]);

  async function handleCreate() {
    if (!newName.trim() || !newCron.trim() || !newPath.trim()) return;
    try { await createSchedule(newName.trim(), newCron.trim(), newAction, newPath.trim()); setNewName(""); setNewCron(""); setNewPath(""); setShowCreate(false); await refresh(); showToast("Schedule created", "success"); }
    catch (e) { showToast(`Failed: ${e}`, "error"); }
  }

  function getActionLabel(a: Schedule["action"]): string {
    if (a.OrganizeByExtension) return "Organize by Extension";
    if (a.OrganizeByDate) return "Organize by Date";
    if (a.ApplyRules) return "Apply Rules";
    if (a.ScanDuplicates) return "Scan Duplicates";
    return "Unknown";
  }

  return (
    <Card>
      <CardHeader>Schedules</CardHeader>
      <CardDescription>Cron-based automated organization tasks.</CardDescription>
      {!showCreate && <Button variant="secondary" onClick={() => setShowCreate(true)} className="text-xs mb-3">Create Schedule</Button>}
      {showCreate && (
        <div className="mb-3 rounded-lg p-3 space-y-2" style={{ backgroundColor: "var(--bg-inset)", border: "1px solid var(--border-default)" }}>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name" className="rounded-lg px-3 py-1.5 text-sm outline-none" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
            <input type="text" value={newCron} onChange={(e) => setNewCron(e.target.value)} placeholder="Cron (0 9 * * *)" className="rounded-lg px-3 py-1.5 text-sm outline-none" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={newAction} onChange={(e) => setNewAction(e.target.value)} className="rounded-lg px-3 py-1.5 text-sm outline-none" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}>
              <option value="organize_extension">Organize by Extension</option>
              <option value="organize_date">Organize by Date</option>
              <option value="apply_rules">Apply Rules</option>
              <option value="scan_duplicates">Scan Duplicates</option>
            </select>
            <input type="text" value={newPath} onChange={(e) => setNewPath(e.target.value)} placeholder="/path/to/dir" className="rounded-lg px-3 py-1.5 text-sm outline-none" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={!newName.trim() || !newCron.trim() || !newPath.trim()} className="text-xs">Save</Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)} className="text-xs">Cancel</Button>
          </div>
        </div>
      )}
      {loading ? <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Loading...</p> : schedules.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>No schedules configured.</p>
      ) : (
        <div className="space-y-1.5">
          {schedules.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-lg px-3 py-2" style={{ backgroundColor: "var(--bg-inset)", opacity: s.enabled ? 1 : 0.5 }}>
              <Toggle checked={s.enabled} onChange={async () => { await toggleSchedule(s.id, !s.enabled); await refresh(); }} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{s.name}</div>
                <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{s.cron} · {getActionLabel(s.action)}</div>
              </div>
              <Button variant="secondary" onClick={async () => { await runScheduleNow(s.id); await refresh(); showToast("Executed", "success"); }} className="text-xs px-2 py-1">Run</Button>
              <button onClick={async () => { await deleteSchedule(s.id); await refresh(); }} className="text-xs" style={{ color: "var(--danger)" }}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function NotificationsSection() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>Notifications</CardHeader>
        <CardDescription>Configure when and how you receive notifications.</CardDescription>
        <CardRow label="Operation Complete" description="Toast when organize/rename finishes" control={<Toggle checked={true} onChange={() => {}} />} />
        <CardRow label="Scheduled Run" description="Notify on cron job completion" control={<Toggle checked={true} onChange={() => {}} />} />
        <CardRow label="Error Alerts" description="Show errors immediately" control={<Toggle checked={true} onChange={() => {}} />} />
      </Card>
    </div>
  );
}

function PrivacySection() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>Privacy</CardHeader>
        <CardDescription>Control data collection and storage.</CardDescription>
        <CardRow label="Usage Analytics" description="Send anonymous usage data" control={<Toggle checked={false} onChange={() => {}} />} />
        <CardRow label="Log to File" description="Write operation logs to disk" control={<Toggle checked={true} onChange={() => {}} />} />
      </Card>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>About AFO</CardHeader>
        <CardDescription>Advanced File Organizer</CardDescription>
        <CardRow label="Version" rightValue="2.5.1" />
        <CardRow label="Build" rightValue="2026-07-21" />
        <CardRow label="Engine" rightValue="Tauri v2 + Rust" />
        <CardRow label="License" rightValue="MIT" />
      </Card>
      <Card>
        <CardHeader>Data Locations</CardHeader>
        <div className="space-y-1.5 font-mono text-xs" style={{ color: "var(--text-tertiary)" }}>
          <CardRow label="Config" rightValue="~/.config/afo/" />
          <CardRow label="Journal" rightValue="~/.local/share/afo/" />
          <CardRow label="Logs" rightValue="~/.local/share/afo/afo.log" />
        </div>
      </Card>
    </div>
  );
}
