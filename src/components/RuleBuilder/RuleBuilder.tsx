import { useState, useEffect, useCallback } from "react";
import {
  listRules,
  saveRules,
  applyRules,
  type Rule,
  type RuleCondition,
  type RuleAction,
} from "../../lib/tauri-bridge";

const FIELDS: RuleCondition["field"][] = ["Extension", "Name", "Size", "DateCreated", "DateModified"];
const OPERATORS: RuleCondition["operator"][] = ["Equals", "Contains", "StartsWith", "EndsWith", "GreaterThan", "LessThan", "Regex"];
const ACTION_TYPES = ["Move", "Copy", "Rename"] as const;

function emptyCondition(): RuleCondition {
  return { field: "Extension", operator: "Contains", value: "" };
}

function emptyAction(): RuleAction {
  return { Move: { destination: "" } };
}

function makeId(): string {
  return crypto.randomUUID();
}

function getActionType(a: RuleAction): "Move" | "Copy" | "Rename" {
  if (a.Move) return "Move";
  if (a.Copy) return "Copy";
  return "Rename";
}

function getActionValue(a: RuleAction): string {
  if (a.Move) return a.Move.destination;
  if (a.Copy) return a.Copy.destination;
  return a.Rename?.pattern ?? "";
}

const inputCls =
  "rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80 outline-none focus:border-afo-purple/50";
const selectCls =
  "rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white/80 outline-none focus:border-afo-purple/50";

export default function RuleBuilder() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formConditions, setFormConditions] = useState<RuleCondition[]>([emptyCondition()]);
  const [formActions, setFormActions] = useState<RuleAction[]>([emptyAction()]);

  const [dryRunPath, setDryRunPath] = useState("");
  const [dryRunResult, setDryRunResult] = useState("");

  const refresh = useCallback(async () => {
    try {
      setRules(await listRules());
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  function startCreate() {
    setEditing("new");
    setFormName("");
    setFormConditions([emptyCondition()]);
    setFormActions([emptyAction()]);
  }

  function startEdit(rule: Rule) {
    setEditing(rule.id);
    setFormName(rule.name);
    setFormConditions(rule.conditions.length ? [...rule.conditions] : [emptyCondition()]);
    setFormActions(rule.actions.length ? [...rule.actions] : [emptyAction()]);
  }

  function cancel() {
    setEditing(null);
  }

  async function handleSave() {
    if (!formName.trim()) return;
    const updated =
      editing === "new"
        ? [...rules, { id: makeId(), name: formName.trim(), enabled: true, conditions: formConditions, actions: formActions }]
        : rules.map((r) => (r.id === editing ? { ...r, name: formName.trim(), conditions: formConditions, actions: formActions } : r));
    try {
      await saveRules(updated);
      setRules(updated);
      setEditing(null);
    } catch (e) {
      setError(String(e));
    }
  }

  async function toggleRule(id: string) {
    const updated = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    try {
      await saveRules(updated);
      setRules(updated);
    } catch (e) {
      setError(String(e));
    }
  }

  async function deleteRule(id: string) {
    const updated = rules.filter((r) => r.id !== id);
    try {
      await saveRules(updated);
      setRules(updated);
      if (editing === id) setEditing(null);
    } catch (e) {
      setError(String(e));
    }
  }

  async function handleDryRun() {
    if (!dryRunPath) return;
    try {
      const res = await applyRules(dryRunPath, true);
      setDryRunResult(`${res.moved} files would be affected (${res.skipped} skipped, ${res.errors.length} errors)`);
    } catch (e) {
      setDryRunResult(`Error: ${e}`);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-8">
        <h1 className="text-2xl font-bold tracking-tight">Rule Builder</h1>
        <div className="text-sm text-white/40">Loading rules...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rule Builder</h1>
          <p className="mt-1 text-sm text-white/40">Define conditions and actions to organize files automatically.</p>
        </div>
        <button
          onClick={startCreate}
          className="shrink-0 rounded-xl bg-afo-purple px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-afo-purple/80"
        >
          Create Rule
        </button>
      </div>

      {error && <p className="rounded-lg bg-afo-rose/10 px-3 py-2 text-xs text-afo-rose">{error}</p>}

      {/* Rules list */}
      {rules.length === 0 && !editing ? (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center">
          <p className="text-sm text-white/40">No rules yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) =>
            editing === rule.id ? (
              <div key={rule.id} className="rounded-xl border border-afo-purple/30 bg-white/[0.03] p-5">
                <RuleForm
                  name={formName}
                  setName={setFormName}
                  conditions={formConditions}
                  setConditions={setFormConditions}
                  actions={formActions}
                  setActions={setFormActions}
                  onSave={handleSave}
                  onCancel={cancel}
                />
              </div>
            ) : (
              <div
                key={rule.id}
                className={`flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-3.5 transition-colors ${
                  !rule.enabled ? "opacity-50" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white/90">{rule.name}</div>
                  <div className="mt-0.5 text-xs text-white/30">
                    {rule.conditions.length} condition{rule.conditions.length !== 1 ? "s" : ""}
                    {" · "}
                    {rule.actions.length} action{rule.actions.length !== 1 ? "s" : ""}
                  </div>
                </div>

                <button onClick={() => toggleRule(rule.id)} className="relative shrink-0" title={rule.enabled ? "Disable" : "Enable"}>
                  <div className={`h-5 w-9 rounded-full transition-colors ${rule.enabled ? "bg-afo-purple/60" : "bg-white/10"}`} />
                  <div className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${rule.enabled ? "translate-x-4" : ""}`} />
                </button>

                <button
                  onClick={() => startEdit(rule)}
                  className="shrink-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="shrink-0 rounded-lg border border-afo-rose/20 bg-afo-rose/5 px-3 py-1.5 text-xs text-afo-rose/80 transition-colors hover:bg-afo-rose/15 hover:text-afo-rose"
                >
                  Delete
                </button>
              </div>
            ),
          )}

          {editing === "new" && (
            <div className="rounded-xl border border-afo-purple/30 bg-white/[0.03] p-5">
              <RuleForm
                name={formName}
                setName={setFormName}
                conditions={formConditions}
                setConditions={setFormConditions}
                actions={formActions}
                setActions={setFormActions}
                onSave={handleSave}
                onCancel={cancel}
              />
            </div>
          )}
        </div>
      )}

      {/* Dry run */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
        <h3 className="mb-2 text-sm font-semibold">Test Rules</h3>
        <p className="mb-3 text-xs text-white/30">Enter a directory path to dry-run all rules against.</p>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={dryRunPath}
            onChange={(e) => setDryRunPath(e.target.value)}
            placeholder="/path/to/directory"
            className={`min-w-0 flex-1 ${inputCls}`}
          />
          <button
            onClick={handleDryRun}
            disabled={!dryRunPath}
            className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Dry Run
          </button>
        </div>
        {dryRunResult && <p className="mt-2 text-xs text-white/50">{dryRunResult}</p>}
      </div>
    </div>
  );
}

/* ---------- Inline form ---------- */

interface RuleFormProps {
  name: string;
  setName: (v: string) => void;
  conditions: RuleCondition[];
  setConditions: React.Dispatch<React.SetStateAction<RuleCondition[]>>;
  actions: RuleAction[];
  setActions: React.Dispatch<React.SetStateAction<RuleAction[]>>;
  onSave: () => void;
  onCancel: () => void;
}

function RuleForm({ name, setName, conditions, setConditions, actions, setActions, onSave, onCancel }: RuleFormProps) {
  function updateCondition(idx: number, patch: Partial<RuleCondition>) {
    setConditions((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  }
  function removeCondition(idx: number) {
    setConditions((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateAction(idx: number, type: "Move" | "Copy" | "Rename", dest: string) {
    setActions((prev) =>
      prev.map((a, i) => {
        if (i !== idx) return a;
        if (type === "Move") return { Move: { destination: dest } };
        if (type === "Copy") return { Copy: { destination: dest } };
        return { Rename: { pattern: dest } };
      }),
    );
  }
  function setActionType(idx: number, type: "Move" | "Copy" | "Rename") {
    setActions((prev) =>
      prev.map((a, i) => {
        if (i !== idx) return a;
        if (type === "Move") return { Move: { destination: "" } };
        if (type === "Copy") return { Copy: { destination: "" } };
        return { Rename: { pattern: "" } };
      }),
    );
  }
  function removeAction(idx: number) {
    setActions((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Name */}
      <div>
        <label className="mb-1 block text-xs font-medium text-white/50">Rule Name</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Organize images" className={`w-full ${inputCls}`} />
      </div>

      {/* Conditions */}
      <div>
        <label className="mb-2 block text-xs font-medium text-white/50">Conditions</label>
        <div className="space-y-2">
          {conditions.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <select value={c.field} onChange={(e) => updateCondition(i, { field: e.target.value as RuleCondition["field"] })} className={selectCls}>
                {FIELDS.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              <select value={c.operator} onChange={(e) => updateCondition(i, { operator: e.target.value as RuleCondition["operator"] })} className={selectCls}>
                {OPERATORS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
              <input type="text" value={c.value} onChange={(e) => updateCondition(i, { value: e.target.value })} placeholder="value" className={`min-w-0 flex-1 ${inputCls}`} />
              {conditions.length > 1 && (
                <button onClick={() => removeCondition(i)} className="shrink-0 text-xs text-white/30 hover:text-afo-rose">✕</button>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => setConditions((prev) => [...prev, emptyCondition()])} className="mt-2 text-xs text-afo-purple/80 hover:text-afo-purple">+ Add Condition</button>
      </div>

      {/* Actions */}
      <div>
        <label className="mb-2 block text-xs font-medium text-white/50">Actions</label>
        <div className="space-y-2">
          {actions.map((a, i) => {
            const type = getActionType(a);
            return (
              <div key={i} className="flex items-center gap-2">
                <select value={type} onChange={(e) => setActionType(i, e.target.value as "Move" | "Copy" | "Rename")} className={selectCls}>
                  {ACTION_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={getActionValue(a)}
                  onChange={(e) => updateAction(i, type, e.target.value)}
                  placeholder={type === "Rename" ? "{name}_sorted.{ext}" : "/destination/path"}
                  className={`min-w-0 flex-1 ${inputCls}`}
                />
                {actions.length > 1 && (
                  <button onClick={() => removeAction(i)} className="shrink-0 text-xs text-white/30 hover:text-afo-rose">✕</button>
                )}
              </div>
            );
          })}
        </div>
        <button onClick={() => setActions((prev) => [...prev, emptyAction()])} className="mt-2 text-xs text-afo-purple/80 hover:text-afo-purple">+ Add Action</button>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-1">
        <button onClick={onSave} className="rounded-xl bg-afo-purple px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-afo-purple/80">Save Rule</button>
        <button onClick={onCancel} className="rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white">Cancel</button>
      </div>
    </div>
  );
}
