import { useState, useEffect, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  scanDirectory,
  organizeByExtension,
  organizeByDate,
  batchRename,
  getMetadata,
  type FileInfo,
  type OrganizeResult,
  type FileMetadata,
} from "../../lib/tauri-bridge";
import { showToast } from "../Toast";

type Mode = "extension" | "date" | "rename";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function OrganizePanel() {
  // Directory
  const [dirPath, setDirPath] = useState("");
  const [dirError, setDirError] = useState("");

  // Mode
  const [mode, setMode] = useState<Mode>("extension");
  const [dateFormat, setDateFormat] = useState<"yearmonth" | "fulldate">("yearmonth");
  const [renamePattern, setRenamePattern] = useState("");

  // Options
  const [dryRun, setDryRun] = useState(true);

  // State
  const [scanning, setScanning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [files, setFiles] = useState<FileInfo[]>([]);

  // Progress
  const [progress, setProgress] = useState<{ current: number; total: number; file: string } | null>(
    null,
  );
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  // Results
  const [result, setResult] = useState<OrganizeResult | null>(null);

  // Selected file metadata
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);

  // Listen for progress events
  useEffect(() => {
    const unlisten = listen<{ current: number; total: number; file: string; status: string }>(
      "afo://progress",
      (event) => {
        setProgress({
          current: event.payload.current,
          total: event.payload.total,
          file: event.payload.file,
        });
      },
    );
    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  async function handleFileClick(filePath: string) {
    setSelectedFile(filePath);
    try {
      const meta = await getMetadata(filePath);
      setMetadata(meta);
    } catch {
      setMetadata(null);
    }
  }

  async function pickDirectory() {
    setDirError("");
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true, multiple: false });
      if (selected && typeof selected === "string") {
        setDirPath(selected);
        setFiles([]);
        setResult(null);
      }
    } catch {
      setDirError("Directory picker not available. Backend plugin not installed yet.");
    }
  }

  async function handleScan() {
    if (!dirPath) return;
    setScanning(true);
    setResult(null);
    try {
      const scanned = await scanDirectory(dirPath);
      setFiles(scanned);
    } catch (e) {
      setDirError(String(e));
    } finally {
      setScanning(false);
    }
  }

  async function handleExecute() {
    if (!dirPath) return;
    setExecuting(true);
    setResult(null);
    setProgress(null);
    try {
      let res: OrganizeResult;
      switch (mode) {
        case "extension":
          res = await organizeByExtension(dirPath, dryRun);
          break;
        case "date":
          res = await organizeByDate(dirPath, dryRun);
          break;
        case "rename":
          res = await batchRename(dirPath, renamePattern, dryRun);
          break;
      }
      setResult(res);
      if (res.moved > 0) {
        showToast(
          dryRun
            ? `Preview: ${res.moved} files would be processed`
            : `Organized ${res.moved} files`,
          "success",
        );
      }
    } catch (e) {
      setResult({
        total_files: 0,
        moved: 0,
        skipped: 0,
        errors: [String(e)],
        dry_run: dryRun,
      });
      showToast(`Error: ${e}`, "error");
    } finally {
      setExecuting(false);
      setProgress(null);
    }
  }

  const tabs: { id: Mode; label: string }[] = [
    { id: "extension", label: "By Extension" },
    { id: "date", label: "By Date" },
    { id: "rename", label: "Batch Rename" },
  ];

  const displayedFiles = files.slice(0, 20);

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organize Files</h1>
        <p className="mt-1 text-sm text-white/40">
          Select a directory and choose how to organize your files.
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

      {/* Mode tabs */}
      <div className="flex gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setMode(t.id);
              setResult(null);
            }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              mode === t.id ? "bg-afo-purple/20 text-white" : "text-white/40 hover:text-white/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Mode-specific options */}
      {mode === "date" && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <label className="mb-2 block text-xs font-medium text-white/50">Date Format</label>
          <select
            value={dateFormat}
            onChange={(e) => setDateFormat(e.target.value as typeof dateFormat)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 outline-none focus:border-afo-purple/50"
          >
            <option value="yearmonth">Year/Month (YYYY/MM)</option>
            <option value="fulldate">Full Date (YYYY-MM-DD)</option>
          </select>
          <p className="mt-2 text-xs text-white/30">Backend always organizes by YYYY/MM for now.</p>
        </div>
      )}

      {mode === "rename" && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <label className="mb-2 block text-xs font-medium text-white/50">Rename Pattern</label>
          <input
            type="text"
            value={renamePattern}
            onChange={(e) => setRenamePattern(e.target.value)}
            placeholder="e.g. {name}_{counter}.{ext}"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 placeholder:text-white/20 outline-none focus:border-afo-purple/50"
          />
          <p className="mt-2 text-xs text-white/30">
            Available placeholders: {"{name}"}, {"{ext}"}, {"{counter}"}
          </p>
        </div>
      )}

      {/* Dry-run toggle */}
      <label className="flex cursor-pointer items-center gap-3 self-start">
        <div className="relative">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="peer sr-only"
          />
          <div className="h-5 w-9 rounded-full bg-white/10 transition-colors peer-checked:bg-afo-purple/60" />
          <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-sm text-white/50">Preview only (dry run)</span>
      </label>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleScan}
          disabled={!dirPath || scanning}
          className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {scanning ? "Scanning..." : "Scan"}
        </button>
        <button
          onClick={handleExecute}
          disabled={!dirPath || executing || (mode === "rename" && !renamePattern)}
          className="rounded-xl bg-afo-purple px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-afo-purple/80 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {executing ? "Running..." : "Execute"}
        </button>
      </div>

      {/* Progress bar */}
      {progress && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-white/50">
              Processing: <span className="text-white/70">{progress.file}</span>
            </span>
            <span className="text-white/40">
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-afo-purple transition-all duration-150"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Result card */}
      {result && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold">Result</h3>
            {result.dry_run && (
              <span className="rounded-md bg-afo-amber/15 px-2 py-0.5 text-xs font-medium text-afo-amber">
                Dry Run
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{result.total_files}</div>
              <div className="text-xs text-white/40">Total Files</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-afo-emerald">{result.moved}</div>
              <div className="text-xs text-white/40">Moved</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white/60">{result.skipped}</div>
              <div className="text-xs text-white/40">Skipped</div>
            </div>
          </div>
          {result.errors.length > 0 && (
            <div className="mt-4 rounded-lg bg-afo-rose/10 p-3">
              <p className="mb-1 text-xs font-medium text-afo-rose">Errors</p>
              <ul className="space-y-0.5">
                {result.errors.map((err, i) => (
                  <li key={i} className="text-xs text-afo-rose/80">
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Scan results */}
      {files.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Scanned Files ({files.length})</h3>
            <span className="text-xs text-white/30">
              Showing {displayedFiles.length} of {files.length}
            </span>
          </div>
          <div className="overflow-hidden rounded-lg border border-white/[0.06]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="px-3 py-2 text-xs font-medium text-white/40">Name</th>
                  <th className="px-3 py-2 text-xs font-medium text-white/40">Ext</th>
                  <th className="px-3 py-2 text-xs font-medium text-white/40">Size</th>
                </tr>
              </thead>
              <tbody>
                {displayedFiles.map((f, i) => (
                  <tr
                    key={i}
                    onClick={() => handleFileClick(f.path)}
                    className={`cursor-pointer border-b border-white/[0.03] last:border-0 transition-colors ${
                      selectedFile === f.path ? "bg-afo-purple/10" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="max-w-[240px] truncate px-3 py-1.5 text-white/70">{f.name}</td>
                    <td className="px-3 py-1.5 text-white/40">{f.extension}</td>
                    <td className="px-3 py-1.5 text-white/40">{formatBytes(f.size)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Metadata display */}
      {selectedFile && metadata && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">File Metadata</h3>
            <button
              onClick={() => {
                setSelectedFile(null);
                setMetadata(null);
              }}
              className="text-xs text-white/40 hover:text-white/60"
            >
              Close
            </button>
          </div>
          <div className="text-xs text-white/50 mb-3 truncate">{selectedFile}</div>

          {metadata.exif && (
            <div className="mb-4">
              <h4 className="mb-2 text-xs font-medium text-afo-sky/80">EXIF Data</h4>
              <div className="grid grid-cols-2 gap-2">
                {metadata.exif.camera_make && (
                  <div>
                    <span className="text-white/40">Make: </span>
                    <span className="text-white/70">{metadata.exif.camera_make}</span>
                  </div>
                )}
                {metadata.exif.camera_model && (
                  <div>
                    <span className="text-white/40">Model: </span>
                    <span className="text-white/70">{metadata.exif.camera_model}</span>
                  </div>
                )}
                {metadata.exif.date_taken && (
                  <div>
                    <span className="text-white/40">Date Taken: </span>
                    <span className="text-white/70">{metadata.exif.date_taken}</span>
                  </div>
                )}
                {metadata.exif.gps && (
                  <div>
                    <span className="text-white/40">GPS: </span>
                    <span className="text-white/70">{metadata.exif.gps}</span>
                  </div>
                )}
                {metadata.exif.exposure && (
                  <div>
                    <span className="text-white/40">Exposure: </span>
                    <span className="text-white/70">{metadata.exif.exposure}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {metadata.audio && (
            <div>
              <h4 className="mb-2 text-xs font-medium text-afo-emerald/80">Audio Tags</h4>
              <div className="grid grid-cols-2 gap-2">
                {metadata.audio.artist && (
                  <div>
                    <span className="text-white/40">Artist: </span>
                    <span className="text-white/70">{metadata.audio.artist}</span>
                  </div>
                )}
                {metadata.audio.album && (
                  <div>
                    <span className="text-white/40">Album: </span>
                    <span className="text-white/70">{metadata.audio.album}</span>
                  </div>
                )}
                {metadata.audio.title && (
                  <div>
                    <span className="text-white/40">Title: </span>
                    <span className="text-white/70">{metadata.audio.title}</span>
                  </div>
                )}
                {metadata.audio.genre && (
                  <div>
                    <span className="text-white/40">Genre: </span>
                    <span className="text-white/70">{metadata.audio.genre}</span>
                  </div>
                )}
                {metadata.audio.track && (
                  <div>
                    <span className="text-white/40">Track: </span>
                    <span className="text-white/70">{metadata.audio.track}</span>
                  </div>
                )}
                {metadata.audio.year && (
                  <div>
                    <span className="text-white/40">Year: </span>
                    <span className="text-white/70">{metadata.audio.year}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {!metadata.exif && !metadata.audio && (
            <p className="text-xs text-white/30">No metadata available for this file.</p>
          )}
        </div>
      )}
    </div>
  );
}
