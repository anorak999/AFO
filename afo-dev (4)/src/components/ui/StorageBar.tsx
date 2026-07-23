interface StorageSegment {
  label: string;
  bytes: number;
  color: string; // pass a CSS var, e.g. 'var(--cat-images)'
}

interface StorageBarProps {
  segments: StorageSegment[];
  totalBytes: number; // denominator — total scanned size (used + free), NOT full disk capacity
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Rounded multi-segment bar, modeled on the macOS Storage pane —
 * scoped to a directory AFO has scanned, not full-disk capacity.
 * Segments below ~6% width omit their inline label (it won't fit)
 * but still show in the legend below.
 */
export function StorageBar({ segments, totalBytes }: StorageBarProps) {
  const usedBytes = segments.reduce((sum, s) => sum + s.bytes, 0);
  const freeBytes = Math.max(totalBytes - usedBytes, 0);

  return (
    <div className="flex h-[26px] overflow-hidden rounded-[7px] border border-black/[0.06]">
      {segments.map((seg) => {
        const pct = totalBytes > 0 ? (seg.bytes / totalBytes) * 100 : 0;
        if (pct <= 0) return null;
        return (
          <div
            key={seg.label}
            style={{ width: `${pct}%`, backgroundColor: seg.color }}
            className="flex items-center justify-center overflow-hidden whitespace-nowrap text-[11px] font-semibold text-white"
            title={`${seg.label}: ${formatBytes(seg.bytes)}`}
          >
            {pct >= 8 ? seg.label : ''}
          </div>
        );
      })}
      {freeBytes > 0 && (
        <div
          style={{ width: `${(freeBytes / totalBytes) * 100}%` }}
          className="bg-[repeating-linear-gradient(45deg,#f0f0f2_0_6px,#fafafa_6px_12px)]"
          title={`Free: ${formatBytes(freeBytes)}`}
        />
      )}
    </div>
  );
}

export { formatBytes };
export type { StorageSegment };
