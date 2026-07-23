import { useState } from "react";
import { HardDrive } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { showToast } from "../Toast";
import { Card, CardHeader, CardDescription } from "../ui/Card";
import Button from "../ui/Button";
import { StorageBar, formatBytes, type StorageSegment } from "../ui/StorageBar";

interface CategoryBreakdown {
  label: string;
  bytes: number;
}

interface StorageBreakdownResult {
  directory: string;
  totalScannedBytes: number;
  categories: CategoryBreakdown[];
}

const CATEGORY_COLOR: Record<string, string> = {
  Images: "var(--cat-images)",
  Documents: "var(--cat-documents)",
  Audio: "var(--cat-audio)",
  Video: "var(--cat-video)",
  Archives: "var(--cat-archives)",
  Code: "var(--cat-code)",
  Other: "var(--cat-other)",
};

export default function StoragePanel() {
  const [directory, setDirectory] = useState<string | null>(null);
  const [result, setResult] = useState<StorageBreakdownResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleChooseDirectory() {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({ directory: true, multiple: false });
      if (selected && typeof selected === "string") {
        setDirectory(selected);
        await handleScan(selected);
      }
    } catch (e) {
      showToast(`Directory picker failed: ${e}`, "error");
    }
  }

  async function handleScan(dir: string) {
    setLoading(true);
    setResult(null);
    try {
      const data = await invoke<StorageBreakdownResult>("scan_storage_breakdown", {
        directory: dir,
      });
      setResult(data);
    } catch (e) {
      showToast(`Scan failed: ${e}`, "error");
    } finally {
      setLoading(false);
    }
  }

  const segments: StorageSegment[] =
    result?.categories
      .filter((c) => c.bytes > 0)
      .map((c) => ({
        label: c.label,
        bytes: c.bytes,
        color: CATEGORY_COLOR[c.label] ?? "var(--cat-other)",
      })) ?? [];

  return (
    <div className="flex flex-col gap-5 p-6">
      <div>
        <h1
          className="text-2xl font-bold tracking-tight"
          style={{ color: "var(--text-primary)" }}
        >
          Storage
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          See what's using space in a directory you point AFO at.
        </p>
      </div>

      {/* Source */}
      <Card>
        <CardHeader>Source</CardHeader>
        <CardDescription>
          Choose a directory to see its storage breakdown by file type.
        </CardDescription>
        <div className="flex items-center gap-3 mt-2">
          <Button
            variant="secondary"
            onClick={handleChooseDirectory}
            disabled={loading}
            className="gap-2"
          >
            <HardDrive size={14} /> Choose Directory
          </Button>
          <div
            className="flex-1 truncate rounded-lg px-3 py-2 text-sm"
            style={{
              backgroundColor: "var(--bg-inset)",
              color: directory ? "var(--text-primary)" : "var(--text-tertiary)",
            }}
          >
            {directory || "No directory selected"}
          </div>
        </div>
      </Card>

      {/* Breakdown */}
      <Card>
        <CardHeader>Storage Breakdown</CardHeader>
        <div className="px-[18px] py-5">
          {!result && (
            <div
              className="py-6 text-center text-[13px]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {loading ? "Scanning…" : "Choose a directory to see its breakdown."}
            </div>
          )}
          {result && (
            <>
              <div className="mb-3.5 flex items-baseline justify-between">
                <span
                  className="text-[13.5px] font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {result.directory}
                </span>
                <span
                  className="text-[12.5px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {formatBytes(result.totalScannedBytes)} scanned
                </span>
              </div>
              <StorageBar
                segments={segments}
                totalBytes={result.totalScannedBytes}
              />
              <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2.5">
                {segments.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center gap-2 text-[12.5px]"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <span
                      className="h-[9px] w-[9px] flex-none rounded-[3px]"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.label}
                    <span
                      className="ml-auto text-[12px]"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {formatBytes(s.bytes)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
