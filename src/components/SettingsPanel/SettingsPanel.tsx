import { useState, useEffect, useCallback } from "react";
import {
  watchDirectory,
  unwatchDirectory,
  listWatchedDirectories,
  createSchedule,
  listSchedules,
  deleteSchedule,
  toggleSchedule,
  runScheduleNow,
  cloudListProviders,
  cloudSyncNow,
  mlSuggestCategory,
  type WatchedDir,
  type Schedule,
  type CloudProvider,
} from "../../lib/tauri-bridge";
import { showToast } from "../Toast";

const SECTIONS = [
  { id: "general", label: "General" },
  { id: "watching", label: "Folder Watching" },
  { id: "scheduling", label: "Schedules" },
  { id: "cloud", label: "Cloud Sync" },
  { id: "ml", label: "Smart Categorize" },
  { id: "about", label: "About" },
] as const;

type Section = (typeof SECTIONS)[number]["id"];

export default function SettingsPanel() {
  const [activeSection, setActiveSection] = useState<Section>("general");

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-white/40">Application settings and configuration.</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-48 shrink-0 space-y-1">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                activeSection === s.id
                  ? "bg-white/10 font-medium text-white"
                  : "text-white/50 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {activeSection === "general" && <GeneralSection />}
          {activeSection === "watching" && <WatchingSection />}
          {activeSection === "scheduling" && <SchedulingSection />}
          {activeSection === "cloud" && <CloudSyncSection />}
          {activeSection === "ml" && <MLSection />}
          {activeSection === "about" && <AboutSection />}
        </div>
      </div>
    </div>
  );
}

function GeneralSection() {
  return (
    <div className="space-y-6">
      <SectionCard title="Category Mapping">
        <p className="text-xs text-white/40 mb-3">
          File extensions are mapped to category folders during organize-by-extension. Default
          mapping is used unless overridden in{" "}
          <code className="text-afo-purple/80">~/.config/afo/config.json</code>.
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            ["Images", "jpg, jpeg, png, gif, bmp, svg, webp, heic"],
            ["Documents", "pdf, doc, docx, txt, rtf, odt"],
            ["Audio", "mp3, wav, flac, aac, ogg, m4a"],
            ["Video", "mp4, mkv, avi, mov, wmv, flv"],
            ["Archives", "zip, tar, gz, rar, 7z"],
            ["Code", "rs, py, js, ts, go, c, cpp, h"],
          ].map(([cat, exts]) => (
            <div
              key={cat}
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
            >
              <span className="font-medium text-white/70">{cat}</span>
              <span className="ml-2 text-white/30">{exts}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Default Options">
        <div className="space-y-3">
          <SettingRow label="Recursive scan depth" value="5 (default)" />
          <SettingRow label="Quarantine auto-delete" value="30 days" />
          <SettingRow label="Watch debounce" value="300ms" />
        </div>
      </SectionCard>
    </div>
  );
}

function WatchingSection() {
  const [watchedDirs, setWatchedDirs] = useState<WatchedDir[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDir, setNewDir] = useState("");

  const refresh = useCallback(async () => {
    try {
      const dirs = await listWatchedDirectories();
      setWatchedDirs(dirs);
    } catch (e) {
      console.error("Failed to load watched directories:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleAdd() {
    if (!newDir.trim()) return;
    try {
      await watchDirectory(newDir.trim());
      setNewDir("");
      await refresh();
      showToast("Started watching directory", "success");
    } catch (e) {
      showToast(`Failed: ${e}`, "error");
    }
  }

  async function handleRemove(dir: string) {
    try {
      await unwatchDirectory(dir);
      await refresh();
      showToast("Stopped watching directory", "info");
    } catch (e) {
      showToast(`Failed: ${e}`, "error");
    }
  }

  async function handlePickDir() {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true, multiple: false });
      if (selected && typeof selected === "string") {
        setNewDir(selected);
      }
    } catch {
      showToast("Directory picker not available", "error");
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Watched Directories">
        <p className="text-xs text-white/40 mb-3">
          Configure directories for real-time file watching. Files added to watched directories will
          be automatically organized based on your rules.
        </p>

        {/* Add directory */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handlePickDir}
            className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          >
            Browse
          </button>
          <input
            type="text"
            value={newDir}
            onChange={(e) => setNewDir(e.target.value)}
            placeholder="/path/to/directory"
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 placeholder:text-white/30 outline-none focus:border-afo-purple/50"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={!newDir.trim()}
            className="shrink-0 rounded-lg bg-afo-purple px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-afo-purple/80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add
          </button>
        </div>

        {/* Directory list */}
        {loading ? (
          <p className="text-xs text-white/30">Loading...</p>
        ) : watchedDirs.length === 0 ? (
          <p className="text-xs text-white/30">No directories being watched.</p>
        ) : (
          <div className="space-y-2">
            {watchedDirs.map((dir) => (
              <div
                key={dir.path}
                className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
              >
                <div
                  className={`h-2 w-2 rounded-full ${dir.enabled ? "bg-afo-emerald" : "bg-white/20"}`}
                />
                <span className="flex-1 truncate text-sm text-white/70">{dir.path}</span>
                <button
                  onClick={() => handleRemove(dir.path)}
                  className="shrink-0 text-xs text-white/30 hover:text-afo-rose"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function SchedulingSection() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCron, setNewCron] = useState("");
  const [newAction, setNewAction] = useState<string>("organize_extension");
  const [newPath, setNewPath] = useState("");

  const refresh = useCallback(async () => {
    try {
      const list = await listSchedules();
      setSchedules(list);
    } catch (e) {
      console.error("Failed to load schedules:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleCreate() {
    if (!newName.trim() || !newCron.trim() || !newPath.trim()) return;
    try {
      await createSchedule(newName.trim(), newCron.trim(), newAction, newPath.trim());
      setNewName("");
      setNewCron("");
      setNewPath("");
      setShowCreate(false);
      await refresh();
      showToast("Schedule created", "success");
    } catch (e) {
      showToast(`Failed: ${e}`, "error");
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteSchedule(id);
      await refresh();
      showToast("Schedule deleted", "info");
    } catch (e) {
      showToast(`Failed: ${e}`, "error");
    }
  }

  async function handleToggle(id: string, enabled: boolean) {
    try {
      await toggleSchedule(id, enabled);
      await refresh();
    } catch (e) {
      showToast(`Failed: ${e}`, "error");
    }
  }

  async function handleRunNow(id: string) {
    try {
      await runScheduleNow(id);
      await refresh();
      showToast("Schedule executed", "success");
    } catch (e) {
      showToast(`Failed: ${e}`, "error");
    }
  }

  function getActionLabel(action: Schedule["action"]): string {
    if (action.OrganizeByExtension) return "Organize by Extension";
    if (action.OrganizeByDate) return "Organize by Date";
    if (action.ApplyRules) return "Apply Rules";
    if (action.ScanDuplicates) return "Scan Duplicates";
    return "Unknown";
  }

  function getActionPath(action: Schedule["action"]): string {
    if (action.OrganizeByExtension) return action.OrganizeByExtension.path;
    if (action.OrganizeByDate) return action.OrganizeByDate.path;
    if (action.ApplyRules) return action.ApplyRules.path;
    if (action.ScanDuplicates) return action.ScanDuplicates.path;
    return "";
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Scheduled Tasks">
        <p className="text-xs text-white/40 mb-3">
          Set up cron-like schedules for automatic organization runs.
        </p>

        {/* Create button */}
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="mb-4 rounded-lg bg-afo-purple px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-afo-purple/80"
          >
            Create Schedule
          </button>
        )}

        {/* Create form */}
        {showCreate && (
          <div className="mb-4 rounded-lg border border-afo-purple/30 bg-white/[0.02] p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-white/50">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Daily organize"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 placeholder:text-white/30 outline-none focus:border-afo-purple/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/50">Cron Expression</label>
                <input
                  type="text"
                  value={newCron}
                  onChange={(e) => setNewCron(e.target.value)}
                  placeholder="0 9 * * * (daily at 9am)"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 placeholder:text-white/30 outline-none focus:border-afo-purple/50"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-white/50">Action</label>
                <select
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 outline-none focus:border-afo-purple/50"
                >
                  <option value="organize_extension">Organize by Extension</option>
                  <option value="organize_date">Organize by Date</option>
                  <option value="apply_rules">Apply Rules</option>
                  <option value="scan_duplicates">Scan Duplicates</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-white/50">Directory Path</label>
                <input
                  type="text"
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  placeholder="/path/to/directory"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 placeholder:text-white/30 outline-none focus:border-afo-purple/50"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || !newCron.trim() || !newPath.trim()}
                className="rounded-lg bg-afo-purple px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-afo-purple/80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Schedule list */}
        {loading ? (
          <p className="text-xs text-white/30">Loading...</p>
        ) : schedules.length === 0 ? (
          <p className="text-xs text-white/30">No schedules configured.</p>
        ) : (
          <div className="space-y-2">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className={`flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 ${
                  !schedule.enabled ? "opacity-50" : ""
                }`}
              >
                <button
                  onClick={() => handleToggle(schedule.id, !schedule.enabled)}
                  className="relative shrink-0"
                >
                  <div
                    className={`h-5 w-9 rounded-full transition-colors ${
                      schedule.enabled ? "bg-afo-purple/60" : "bg-white/10"
                    }`}
                  />
                  <div
                    className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      schedule.enabled ? "translate-x-4" : ""
                    }`}
                  />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white/80">{schedule.name}</div>
                  <div className="text-xs text-white/40">
                    {schedule.cron} · {getActionLabel(schedule.action)}
                  </div>
                  <div className="text-xs text-white/30 truncate">{getActionPath(schedule.action)}</div>
                </div>

                <button
                  onClick={() => handleRunNow(schedule.id)}
                  className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Run Now
                </button>
                <button
                  onClick={() => handleDelete(schedule.id)}
                  className="shrink-0 text-xs text-white/30 hover:text-afo-rose"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function AboutSection() {
  return (
    <div className="space-y-6">
      <SectionCard title="About AFO">
        <div className="space-y-2 text-sm text-white/50">
          <p>
            <span className="font-medium text-white/70">AFO</span> — Advanced File Organizer
          </p>
          <p>Version 2.0.0 (Tauri Edition)</p>
          <p className="text-xs text-white/30 mt-4">
            Cross-platform desktop file organization. Rule-based sorting, duplicate detection, batch
            rename, and metadata-aware organization.
          </p>
        </div>
      </SectionCard>

      <SectionCard title="Data Locations">
        <div className="space-y-1.5 font-mono text-xs text-white/40">
          <p>Config: ~/.config/afo/config.json</p>
          <p>Rules: ~/.config/afo/rules.json</p>
          <p>Journal: ~/.local/share/afo/journal.db</p>
          <p>Quarantine: ~/.local/share/afo/quarantine/</p>
          <p>Logs: ~/.local/share/afo/afo.log</p>
        </div>
      </SectionCard>
    </div>
  );
}

function CloudSyncSection() {
  const [providers, setProviders] = useState<CloudProvider[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const list = await cloudListProviders();
      setProviders(list);
    } catch (e) {
      console.error("Failed to load cloud providers:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSync(path: string) {
    try {
      await cloudSyncNow(path);
      showToast("Cloud sync initiated", "success");
    } catch (e) {
      showToast(`${e}`, "info");
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Cloud Sync">
        <p className="text-xs text-white/40 mb-3">
          Connect cloud storage providers for automatic file synchronization. Coming in a future
          release.
        </p>

        {loading ? (
          <div className="flex items-center gap-2 text-xs text-white/30">
            <div className="h-3 w-3 animate-spin rounded-full border border-white/20 border-t-white/60" />
            Loading...
          </div>
        ) : providers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-6 text-center">
            <p className="text-xs text-white/30">No cloud providers configured yet.</p>
            <p className="mt-1 text-[10px] text-white/20">
              Dropbox, Google Drive, and OneDrive support coming soon.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {providers.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
              >
                <div
                  className={`h-2 w-2 rounded-full ${p.enabled ? "bg-afo-emerald" : "bg-white/20"}`}
                />
                <span className="flex-1 truncate text-sm text-white/70">{p.name}</span>
                <button
                  onClick={() => handleSync(p.local_path)}
                  className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Sync
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function MLSection() {
  const [testFile, setTestFile] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [testing, setTesting] = useState(false);

  async function handleTest() {
    if (!testFile.trim()) return;
    setTesting(true);
    setSuggestion("");
    try {
      const result = await mlSuggestCategory(testFile.trim());
      setSuggestion(result);
    } catch (e) {
      showToast(`${e}`, "error");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <SectionCard title="Smart Categorization (ML)">
        <p className="text-xs text-white/40 mb-3">
          AI-powered file categorization suggestions based on filename analysis. Labeled as
          "suggestion" in the organize panel — you always confirm before organizing.
        </p>

        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-6">
          <p className="text-xs text-white/30 mb-3">Try a filename:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={testFile}
              onChange={(e) => setTestFile(e.target.value)}
              placeholder="e.g. vacation_photo.jpg"
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-afo-purple/50"
              onKeyDown={(e) => e.key === "Enter" && handleTest()}
            />
            <button
              onClick={handleTest}
              disabled={!testFile.trim() || testing}
              className="shrink-0 rounded-lg bg-afo-purple/20 px-3 py-2 text-xs font-medium text-afo-purple transition-colors hover:bg-afo-purple/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {testing ? "..." : "Suggest"}
            </button>
          </div>
          {suggestion && (
            <div className="mt-3 rounded-lg bg-white/[0.03] px-3 py-2">
              <span className="text-xs text-white/40">Suggested category: </span>
              <span className="text-xs font-medium text-afo-purple">{suggestion}</span>
              <span className="ml-2 text-[10px] text-white/20">(ML suggestion)</span>
            </div>
          )}
        </div>

        <p className="mt-3 text-[10px] text-white/20">
          Post-launch: TF-IDF filename similarity with labeled training data.
        </p>
      </SectionCard>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      <h3 className="mb-3 text-sm font-semibold text-white/80">{title}</h3>
      {children}
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
      <span className="text-sm text-white/60">{label}</span>
      <span className="text-sm text-white/40">{value}</span>
    </div>
  );
}
