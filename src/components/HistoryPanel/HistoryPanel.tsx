import { useState, useEffect, useCallback } from "react";
import { RotateCcw, RotateCw, Undo2 } from "lucide-react";
import { getHistory, undoLast, undoOperation, redoLast, type JournalEntry } from "../../lib/tauri-bridge";
import { Card, CardHeader, CardRow } from "../ui/Card";
import Button from "../ui/Button";
import Toggle from "../ui/Toggle";

const PAGE_SIZE = 20;
const OP_COLORS: Record<string, { bg: string; fg: string }> = {
  move: { bg: "rgba(90,200,250,0.1)", fg: "var(--info)" },
  copy: { bg: "rgba(52,199,89,0.1)", fg: "var(--success)" },
  rename: { bg: "rgba(255,149,0,0.1)", fg: "var(--warning)" },
  delete: { bg: "rgba(255,59,48,0.1)", fg: "var(--danger)" },
};

export default function HistoryPanel() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [acting, setActing] = useState(false);
  const [enableUndoRedo, setEnableUndoRedo] = useState(true);
  const [keepFullHistory] = useState(true);

  const refresh = useCallback(async (off = 0, append = false) => {
    try { const batch = await getHistory(PAGE_SIZE, off); setEntries((p) => (append ? [...p, ...batch] : batch)); setHasMore(batch.length === PAGE_SIZE); }
    catch (e) { setError(String(e)); }
    setLoading(false);
  }, []);

  useEffect(() => { refresh(0); }, [refresh]);

  async function handleLoadMore() { const next = offset + PAGE_SIZE; setOffset(next); await refresh(next, true); }
  async function handleUndoLast() { setActing(true); try { await undoLast(); setOffset(0); await refresh(0); } catch (e) { setError(String(e)); } finally { setActing(false); } }
  async function handleRedo() { setActing(true); try { await redoLast(); setOffset(0); await refresh(0); } catch (e) { setError(String(e)); } finally { setActing(false); } }
  async function handleUndoEntry(id: number) { setActing(true); try { await undoOperation(id); setOffset(0); await refresh(0); } catch (e) { setError(String(e)); } finally { setActing(false); } }

  if (loading) return <div className="p-6"><h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>History</h1><p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>Loading...</p></div>;

  return (
    <div className="flex flex-col gap-5 p-6">
      <div><h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>History</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Browse past operations and undo or redo them.</p></div>

      {/* History Settings */}
      <Card>
        <CardHeader>History Settings</CardHeader>
        <CardRow label="Enable Undo/Redo" description="Allow reverting operations" control={<Toggle checked={enableUndoRedo} onChange={setEnableUndoRedo} />} />
        <CardRow label="Keep Full History" description="Store all operations (always on)" control={<Toggle checked={keepFullHistory} onChange={() => {}} disabled />} />
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>Actions</CardHeader>
        <div className="flex gap-3 mt-1">
          <Button variant="secondary" onClick={handleUndoLast} disabled={acting || entries.length === 0} className="gap-2"><RotateCcw size={14} /> Undo Last</Button>
          <Button variant="secondary" onClick={handleRedo} disabled={acting} className="gap-2"><RotateCw size={14} /> Redo</Button>
        </div>
      </Card>

      {error && <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "rgba(255,59,48,0.06)", color: "var(--danger)" }}>{error}</div>}

      {/* Recent Operations */}
      <Card>
        <CardHeader>Recent Operations</CardHeader>
        {entries.length === 0 ? (
          <p className="text-sm text-center py-4" style={{ color: "var(--text-tertiary)" }}>No history yet. Perform an operation to see it here.</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const colors = OP_COLORS[entry.operation_type.toLowerCase()] ?? { bg: "var(--bg-inset)", fg: "var(--text-secondary)" };
              return (
                <div key={entry.id} className="flex items-center gap-4 rounded-lg px-4 py-3 transition-colors" style={{ borderBottom: "1px solid var(--border-default)", opacity: entry.reverted ? 0.4 : 1 }}>
                  <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ backgroundColor: colors.bg, color: colors.fg }}>{entry.operation_type}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm" style={{ color: "var(--text-primary)" }} title={entry.source_path}>{entry.source_path}</div>
                    <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>→ <span className="truncate" style={{ color: "var(--text-secondary)" }} title={entry.dest_path}>{entry.dest_path || "—"}</span></div>
                  </div>
                  <div className="shrink-0 text-xs" style={{ color: "var(--text-tertiary)" }}>{new Date(entry.timestamp).toLocaleString()}</div>
                  {entry.reverted && <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--bg-inset)", color: "var(--text-tertiary)" }}>Reverted</span>}
                  {!entry.reverted && <Button variant="secondary" onClick={() => handleUndoEntry(entry.id)} disabled={acting} className="text-xs px-3 py-1.5"><Undo2 size={12} /> Undo</Button>}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {hasMore && entries.length > 0 && <Button variant="secondary" onClick={handleLoadMore} className="self-center">Load More</Button>}
    </div>
  );
}
