import { useState } from "react";
import {
  scanDuplicates,
  quarantineDuplicates,
  deleteDuplicates,
  type DuplicateGroup,
} from "../../lib/tauri-bridge";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function DuplicatesPanel() {
  const [dirPath, setDirPath] = useState("");
  const [dirError, setDirError] = useState("");
  const [recursive, setRecursive] = useState(true);
  const [maxDepth, setMaxDepth] = useState(5);
  const [scanning, setScanning] = useState(false);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Map<number, Set<number>>>(new Map()); // groupIdx -> set of fileIdx
  const [actionError, setActionError] = useState("");

  async function pickDirectory() {
    setDirError("");
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const result = await open({ directory: true, multiple: false });
      if (result && typeof result === "string") {
        setDirPath(result);
        setGroups([]);
        setSelected(new Map());
        setExpanded(new Set());
      }
    } catch {
      setDirError("Directory picker not available.");
    }
  }

  async function handleScan() {
    if (!dirPath) return;
    setScanning(true);
    setActionError("");
    try {
      const res = await scanDuplicates(dirPath, recursive, recursive ? maxDepth : undefined);
      setGroups(res);
      setSelected(new Map());
      setExpanded(new Set());
    } catch (e) {
      setActionError(String(e));
    } finally {
      setScanning(false);
    }
  }

  function toggleExpand(idx: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }

  function toggleFile(groupIdx: number, fileIdx: number) {
    setSelected((prev) => {
      const next = new Map(prev);
      const group = new Set(next.get(groupIdx) ?? []);
      if (group.has(fileIdx)) {
        group.delete(fileIdx);
      } else {
        group.add(fileIdx);
      }
      next.set(groupIdx, group);
      return next;
    });
  }

  function toggleGroupAll(groupIdx: number, fileCount: number) {
    setSelected((prev) => {
      const next = new Map(prev);
      const current = next.get(groupIdx);
      const allSelected = current && current.size === fileCount;
      next.set(
        groupIdx,
        allSelected ? new Set() : new Set(Array.from({ length: fileCount }, (_, i) => i)),
      );
      return next;
    });
  }

  function getSelectedIndices(): number[] {
    // Returns group indices that have at least one file selected
    return groups.reduce<number[]>((acc, _, gi) => {
      const files = selected.get(gi);
      if (files && files.size > 0) acc.push(gi);
      return acc;
    }, []);
  }

  async function handleQuarantine() {
    const indices = getSelectedIndices();
    if (indices.length === 0) return;
    try {
      // Pass groups and indices — but we need to reconstruct per-group file selections
      // For simplicity, pass all selected groups with their full file list
      const relevantGroups = indices.map((i) => groups[i]);
      await quarantineDuplicates(relevantGroups, indices);
      // Refresh
      await handleScan();
    } catch (e) {
      setActionError(String(e));
    }
  }

  async function handleDelete() {
    const indices = getSelectedIndices();
    if (indices.length === 0) return;
    if (!confirm(`Permanently delete selected duplicate files? This cannot be undone.`)) return;
    try {
      const relevantGroups = indices.map((i) => groups[i]);
      await deleteDuplicates(relevantGroups, indices);
      await handleScan();
    } catch (e) {
      setActionError(String(e));
    }
  }

  const totalRecoverable = groups.reduce((sum, g) => {
    // All files except the keeper contribute to recoverable space
    const nonKeeperSize = g.files.filter((f) => !f.is_keeper).reduce((s, f) => s + f.size, 0);
    return sum + nonKeeperSize;
  }, 0);

  const totalNonKeeperFiles = groups.reduce(
    (sum, g) => sum + g.files.filter((f) => !f.is_keeper).length,
    0,
  );

  const hasSelection = getSelectedIndices().length > 0;

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Duplicate Detection</h1>
        <p className="mt-1 text-sm text-white/40">
          Find and manage duplicate files across your directories.
        </p>
      </div>

      {/* Directory picker */}
      <div className="flex items-center gap-3">
        <button
          onClick={pickDirectory}
          className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          Choose Directory
        </button>
        <div className="min-w-0 flex-1 truncate rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-white/40">
          {dirPath || "No directory selected"}
        </div>
      </div>
      {dirError && <p className="text-xs text-afo-rose">{dirError}</p>}

      {/* Options */}
      <div className="flex items-center gap-6">
        <label className="flex cursor-pointer items-center gap-3">
          <div className="relative">
            <input
              type="checkbox"
              checked={recursive}
              onChange={(e) => setRecursive(e.target.checked)}
              className="peer sr-only"
            />
            <div className="h-5 w-9 rounded-full bg-white/10 transition-colors peer-checked:bg-afo-purple/60" />
            <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-sm text-white/50">Recursive</span>
        </label>

        {recursive && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/40">Max depth</label>
            <input
              type="number"
              min={1}
              max={20}
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value) || 5)}
              className="w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white/80 outline-none focus:border-afo-purple/50"
            />
          </div>
        )}
      </div>

      {/* Scan button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleScan}
          disabled={!dirPath || scanning}
          className="rounded-xl bg-afo-purple px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-afo-purple/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {scanning ? "Scanning..." : "Scan for Duplicates"}
        </button>
      </div>

      {actionError && (
        <p className="rounded-lg bg-afo-rose/10 px-3 py-2 text-xs text-afo-rose">{actionError}</p>
      )}

      {/* Results */}
      {groups.length > 0 && (
        <>
          {/* Summary */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{groups.length}</div>
                <div className="text-xs text-white/40">Duplicate Groups</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-afo-amber">{totalNonKeeperFiles}</div>
                <div className="text-xs text-white/40">Recoverable Files</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-afo-emerald">
                  {formatBytes(totalRecoverable)}
                </div>
                <div className="text-xs text-white/40">Recoverable Space</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleQuarantine}
              disabled={!hasSelection}
              className="rounded-xl border border-afo-amber/30 bg-afo-amber/10 px-4 py-2 text-sm font-medium text-afo-amber transition-colors hover:bg-afo-amber/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Quarantine Selected
            </button>
            <button
              onClick={handleDelete}
              disabled={!hasSelection}
              className="rounded-xl border border-afo-rose/30 bg-afo-rose/10 px-4 py-2 text-sm font-medium text-afo-rose transition-colors hover:bg-afo-rose/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Delete Selected
            </button>
          </div>

          {/* Groups list */}
          <div className="space-y-2">
            {groups.map((group, gi) => {
              const isExpanded = expanded.has(gi);
              const groupSelected = selected.get(gi) ?? new Set();
              const allSelected = groupSelected.size === group.files.length;
              return (
                <div key={gi} className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  {/* Group header */}
                  <div className="flex items-center gap-4 px-5 py-3.5">
                    <button
                      onClick={() => toggleExpand(gi)}
                      className="shrink-0 text-xs text-white/40 transition-transform hover:text-white/60"
                      style={{ transform: isExpanded ? "rotate(90deg)" : "" }}
                    >
                      ▶
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-mono text-xs text-white/60" title={group.hash}>
                        {group.hash}
                      </div>
                      <div className="mt-0.5 text-xs text-white/30">
                        {group.files.length} file{group.files.length !== 1 ? "s" : ""} ·{" "}
                        {formatBytes(group.total_size)}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleGroupAll(gi, group.files.length)}
                      className={`shrink-0 rounded-lg border px-3 py-1 text-xs transition-colors ${
                        allSelected
                          ? "border-afo-purple/40 bg-afo-purple/10 text-afo-purple"
                          : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10"
                      }`}
                    >
                      {allSelected ? "Deselect All" : "Select All"}
                    </button>
                  </div>

                  {/* Expanded file list */}
                  {isExpanded && (
                    <div className="border-t border-white/[0.06] px-5 py-3">
                      <div className="space-y-1.5">
                        {group.files.map((file, fi) => (
                          <label
                            key={fi}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                              groupSelected.has(fi) ? "bg-afo-purple/5" : "hover:bg-white/[0.02]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={groupSelected.has(fi)}
                              onChange={() => toggleFile(gi, fi)}
                              className="h-4 w-4 rounded border-white/20 bg-white/5 text-afo-purple accent-afo-purple"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm text-white/70">{file.path}</div>
                              <div className="text-xs text-white/30">{formatBytes(file.size)}</div>
                            </div>
                            {file.is_keeper && (
                              <span className="shrink-0 rounded-md bg-afo-emerald/15 px-2 py-0.5 text-[10px] font-medium text-afo-emerald">
                                Keeper
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Empty state after scan */}
      {!scanning && dirPath && groups.length === 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/40">No duplicates found.</p>
        </div>
      )}
    </div>
  );
}
