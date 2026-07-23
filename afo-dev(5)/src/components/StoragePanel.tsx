import { useState } from 'react';
import { Card, CardHeader, CardRow } from './ui/Card';
import { Button } from './ui/Button';
import { StorageBar, formatBytes, type StorageSegment } from './ui/StorageBar';

// Shape returned by the Rust `scan_storage_breakdown` command (see
// AGENTIC_PROMPT addendum for the backend contract this expects).
interface StorageBreakdownResult {
  directory: string;
  totalScannedBytes: number;
  categories: { label: string; bytes: number }[];
}

const CATEGORY_COLOR: Record<string, string> = {
  Images: 'var(--cat-images)',
  Documents: 'var(--cat-documents)',
  Audio: 'var(--cat-audio)',
  Video: 'var(--cat-video)',
  Archives: 'var(--cat-archives)',
  Code: 'var(--cat-code)',
  Other: 'var(--cat-other)',
};

export function StoragePanel() {
  const [directory, setDirectory] = useState<string | null>(null);
  const [result, setResult] = useState<StorageBreakdownResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleChooseDirectory() {
    // wire to the same Tauri dialog command OrganizePanel uses
    // const picked = await invoke<string | null>('pick_directory');
    // if (!picked) return;
    // setDirectory(picked);
    // await handleScan(picked);
  }

  async function handleScan(dir: string) {
    setLoading(true);
    try {
      // const data = await invoke<StorageBreakdownResult>('scan_storage_breakdown', { directory: dir });
      // setResult(data);
    } finally {
      setLoading(false);
    }
  }

  const segments: StorageSegment[] =
    result?.categories.map((c) => ({
      label: c.label,
      bytes: c.bytes,
      color: CATEGORY_COLOR[c.label] ?? 'var(--cat-other)',
    })) ?? [];

  return (
    <main className="flex-1 overflow-auto px-11 py-9">
      <h1 className="mb-1 text-2xl font-bold tracking-tight text-text">Storage</h1>
      <p className="mb-6 text-[13px] text-text-dim">
        See what's using space in a directory you point AFO at.
      </p>

      <Card>
        <CardHeader>Source</CardHeader>
        <CardRow>
          <span className="text-[12.5px] text-text-dim">
            {directory ?? 'No directory selected'}
          </span>
          <Button onClick={handleChooseDirectory}>Choose Directory</Button>
        </CardRow>
      </Card>

      <Card>
        <CardHeader>Storage Breakdown</CardHeader>
        <div className="px-[18px] py-5">
          {!result && (
            <div className="py-6 text-center text-[13px] text-text-dim">
              {loading ? 'Scanning…' : 'Choose a directory to see its breakdown.'}
            </div>
          )}
          {result && (
            <>
              <div className="mb-3.5 flex items-baseline justify-between">
                <span className="text-[13.5px] font-semibold text-text">{result.directory}</span>
                <span className="text-[12.5px] text-text-dim">
                  {formatBytes(result.totalScannedBytes)} scanned
                </span>
              </div>
              <StorageBar segments={segments} totalBytes={result.totalScannedBytes} />
              <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-2.5">
                {segments.map((s) => (
                  <div key={s.label} className="flex items-center gap-2 text-[12.5px] text-text">
                    <span
                      className="h-[9px] w-[9px] flex-none rounded-[3px]"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.label}
                    <span className="ml-auto text-[12px] text-text-dim">
                      {formatBytes(s.bytes)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Card>
    </main>
  );
}
