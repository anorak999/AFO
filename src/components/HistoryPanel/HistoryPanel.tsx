import { useState, useEffect, useCallback } from "react";
import {
  getHistory,
  undoLast,
  undoOperation,
  redoLast,
  type JournalEntry,
} from "../../lib/tauri-bridge";

const PAGE_SIZE = 20;

const OP_COLORS: Record<string, string> = {
  move: "bg-afo-sky/15 text-afo-sky",
  copy: "bg-afo-emerald/15 text-afo-emerald",
  rename: "bg-afo-amber/15 text-afo-amber",
  delete: "bg-afo-rose/15 text-afo-rose",
};

function opBadgeClass(op: string): string {
  return OP_COLORS[op.toLowerCase()] ?? "bg-white/10 text-white/50";
}

export default function HistoryPanel() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [acting, setActing] = useState(false);

  const refresh = useCallback(async (off = 0, append = false) => {
    try {
      const batch = await getHistory(PAGE_SIZE, off);
      setEntries((prev) => (append ? [...prev, ...batch] : batch));
      setHasMore(batch.length === PAGE_SIZE);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    refresh(0);
  }, [refresh]);

  useEffect(() => {
    if (entries.length > 0 || error) {
      setLoading(false);
    }
  }, [entries, error]);

  async function handleLoadMore() {
    const next = offset + PAGE_SIZE;
    setOffset(next);
    await refresh(next, true);
  }

  async function handleUndoLast() {
    setActing(true);
    try {
      await undoLast();
      setOffset(0);
      await refresh(0);
    } catch (e) {
      setError(String(e));
    } finally {
      setActing(false);
    }
  }

  async function handleRedo() {
    setActing(true);
    try {
      await redoLast();
      setOffset(0);
      await refresh(0);
    } catch (e) {
      setError(String(e));
    } finally {
      setActing(false);
    }
  }

  async function handleUndoEntry(id: number) {
    setActing(true);
    try {
      await undoOperation(id);
      setOffset(0);
      await refresh(0);
    } catch (e) {
      setError(String(e));
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-8">
        <h1 className="text-2xl font-bold tracking-tight">History</h1>
        <div className="text-sm text-white/40">Loading history...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">History</h1>
          <p className="mt-1 text-sm text-white/40">
            Browse past operations and undo or redo them.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleUndoLast}
            disabled={acting || entries.length === 0}
            className="shrink-0 rounded-xl border border-afo-amber/30 bg-afo-amber/10 px-4 py-2.5 text-sm font-medium text-afo-amber transition-colors hover:bg-afo-amber/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Undo Last
          </button>
          <button
            onClick={handleRedo}
            disabled={acting}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Redo
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-afo-rose/10 px-3 py-2 text-xs text-afo-rose">{error}</p>
      )}

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/40">
            No history yet. Perform an operation to see it here.
          </p>
        </div>
      )}

      {/* Entries */}
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3.5 ${
              entry.reverted ? "opacity-40" : ""
            }`}
          >
            {/* Type badge */}
            <span
              className={`shrink-0 rounded-md px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${opBadgeClass(entry.operation_type)}`}
            >
              {entry.operation_type}
            </span>

            {/* Paths */}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-white/70" title={entry.source_path}>
                {entry.source_path}
              </div>
              <div className="text-xs text-white/30">
                →{" "}
                <span className="truncate text-white/50" title={entry.dest_path}>
                  {entry.dest_path || "—"}
                </span>
              </div>
            </div>

            {/* Timestamp */}
            <div className="shrink-0 text-xs text-white/30" title={entry.timestamp}>
              {new Date(entry.timestamp).toLocaleString()}
            </div>

            {/* Reverted badge */}
            {entry.reverted && (
              <span className="shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/40">
                Reverted
              </span>
            )}

            {/* Undo button */}
            {!entry.reverted && (
              <button
                onClick={() => handleUndoEntry(entry.id)}
                disabled={acting}
                className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Undo
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Load more */}
      {hasMore && entries.length > 0 && (
        <button
          onClick={handleLoadMore}
          className="self-center rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          Load More
        </button>
      )}
    </div>
  );
}
