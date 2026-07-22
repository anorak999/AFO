import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { listRules, saveRules, applyRules, type Rule, type RuleCondition, type RuleAction } from "../../lib/tauri-bridge";
import { Card, CardHeader, CardDescription, CardRow } from "../ui/Card";
import Button from "../ui/Button";
import Toggle from "../ui/Toggle";
import RuleFlowEditor from "./RuleFlowEditor";

function emptyCondition(): RuleCondition { return { field: "Extension", operator: "Contains", value: "" }; }
function emptyAction(): RuleAction { return { Move: { destination: "" } }; }
function makeId(): string { return crypto.randomUUID(); }

const inputCls = "rounded-lg px-3 py-1.5 text-sm outline-none";
const inputStyle = { backgroundColor: "var(--bg-inset)", border: "1px solid var(--border-default)", color: "var(--text-primary)" };

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
  const [useVisualEditor, setUseVisualEditor] = useState(false);

  const refresh = useCallback(async () => { try { setRules(await listRules()); } catch (e) { setError(String(e)); } }, []);
  useEffect(() => { refresh().finally(() => setLoading(false)); }, [refresh]);

  function startCreate() { setEditing("new"); setFormName(""); setFormConditions([emptyCondition()]); setFormActions([emptyAction()]); }
  function startEdit(rule: Rule) { setEditing(rule.id); setFormName(rule.name); setFormConditions([...rule.conditions]); setFormActions([...rule.actions]); }
  function cancel() { setEditing(null); }

  async function handleSave() {
    if (!formName.trim()) return;
    const updated = editing === "new"
      ? [...rules, { id: makeId(), name: formName.trim(), enabled: true, conditions: formConditions, actions: formActions }]
      : rules.map((r) => r.id === editing ? { ...r, name: formName.trim(), conditions: formConditions, actions: formActions } : r);
    try { await saveRules(updated); setRules(updated); setEditing(null); } catch (e) { setError(String(e)); }
  }

  async function toggleRule(id: string) {
    const updated = rules.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r);
    try { await saveRules(updated); setRules(updated); } catch (e) { setError(String(e)); }
  }

  async function deleteRule(id: string) {
    const updated = rules.filter((r) => r.id !== id);
    try { await saveRules(updated); setRules(updated); if (editing === id) setEditing(null); } catch (e) { setError(String(e)); }
  }

  async function handleDryRun() {
    if (!dryRunPath) return;
    try { const res = await applyRules(dryRunPath, true); setDryRunResult(`${res.moved} files affected (${res.skipped} skipped, ${res.errors.length} errors)`); } catch (e) { setDryRunResult(`Error: ${e}`); }
  }

  if (loading) return <div className="p-6"><h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Rule Builder</h1><p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>Loading rules...</p></div>;

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex items-start justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>Rule Builder</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>Define conditions and actions to organize files automatically.</p></div>
        <Button onClick={startCreate} className="gap-2"><Plus size={14} /> Create Rule</Button>
      </div>

      {error && <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: "rgba(255,59,48,0.06)", color: "var(--danger)" }}>{error}</div>}

      {/* Rule Builder Settings */}
      <Card>
        <CardHeader>Rule Builder Settings</CardHeader>
        <CardDescription>Configure how the rule builder behaves.</CardDescription>
        <CardRow label="Visual Rule Editor" description="Use node-based flow editor" control={<Toggle checked={useVisualEditor} onChange={setUseVisualEditor} />} />
        <CardRow label="Live Preview" description="Not yet connected to backend" control={<Toggle checked={true} onChange={() => {}} disabled />} />
      </Card>

      {/* Rules List */}
      {rules.length === 0 && !editing ? (
        <Card><p className="text-sm text-center py-4" style={{ color: "var(--text-tertiary)" }}>No rules yet. Create one to get started.</p></Card>
      ) : (
        <div className="space-y-2">
          {/* New rule form (above existing rules) */}
          {editing === "new" && (
            useVisualEditor ? (
              <Card>
                <RuleFlowEditor
                  rule={{ id: "", name: formName || "New Rule", enabled: true, conditions: [], actions: [] }}
                  onSave={(conditions, actions) => {
                    const newRule = { id: makeId(), name: formName.trim() || "New Rule", enabled: true, conditions, actions };
                    const updated = [...rules, newRule];
                    saveRules(updated).then(() => { setRules(updated); setEditing(null); }).catch((e) => setError(String(e)));
                  }}
                  onCancel={cancel}
                />
              </Card>
            ) : (
              <Card>
                <div className="space-y-3">
                  <div><label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Rule Name</label>
                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Organize images" className={`w-full ${inputCls}`} style={inputStyle} /></div>
                  <div><label className="mb-2 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Conditions</label>
                    {formConditions.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <select value={c.field} onChange={(e) => setFormConditions((prev) => prev.map((x, j) => j === i ? { ...x, field: e.target.value as RuleCondition["field"] } : x))} className={`rounded-lg px-2 py-1.5 text-sm ${inputCls}`} style={inputStyle}>
                          {["Extension", "Name", "Size", "DateCreated", "DateModified"].map((f) => <option key={f}>{f}</option>)}
                        </select>
                        <select value={c.operator} onChange={(e) => setFormConditions((prev) => prev.map((x, j) => j === i ? { ...x, operator: e.target.value as RuleCondition["operator"] } : x))} className={`rounded-lg px-2 py-1.5 text-sm ${inputCls}`} style={inputStyle}>
                          {["Equals", "Contains", "StartsWith", "EndsWith", "GreaterThan", "LessThan", "Regex"].map((o) => <option key={o}>{o}</option>)}
                        </select>
                        <input type="text" value={c.value} onChange={(e) => setFormConditions((prev) => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} placeholder="value" className={`min-w-0 flex-1 ${inputCls}`} style={inputStyle} />
                        {formConditions.length > 1 && <button onClick={() => setFormConditions((prev) => prev.filter((_, j) => j !== i))} style={{ color: "var(--text-tertiary)" }}><Trash2 size={12} /></button>}
                      </div>
                    ))}
                    <button onClick={() => setFormConditions((prev) => [...prev, emptyCondition()])} className="text-xs" style={{ color: "var(--accent)" }}>+ Add Condition</button>
                  </div>
                  <div className="flex gap-2"><Button onClick={handleSave}>Save Rule</Button><Button variant="secondary" onClick={cancel}>Cancel</Button></div>
                </div>
              </Card>
            )
          )}

          {/* Existing rules */}
          {rules.map((rule) => editing === rule.id ? (
            useVisualEditor ? (
              <Card key={rule.id}>
                <RuleFlowEditor
                  rule={rule}
                  onSave={(conditions, actions) => {
                    const updated = rules.map((r) => r.id === editing ? { ...r, name: formName.trim() || rule.name, conditions, actions } : r);
                    saveRules(updated).then(() => { setRules(updated); setEditing(null); }).catch((e) => setError(String(e)));
                  }}
                  onCancel={cancel}
                />
              </Card>
            ) : (
              <Card key={rule.id}>
                <div className="space-y-3">
                  <div><label className="mb-1 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Rule Name</label>
                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Organize images" className={`w-full ${inputCls}`} style={inputStyle} /></div>
                  <div><label className="mb-2 block text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Conditions</label>
                    {formConditions.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <select value={c.field} onChange={(e) => setFormConditions((prev) => prev.map((x, j) => j === i ? { ...x, field: e.target.value as RuleCondition["field"] } : x))} className={`rounded-lg px-2 py-1.5 text-sm ${inputCls}`} style={inputStyle}>
                          {["Extension", "Name", "Size", "DateCreated", "DateModified"].map((f) => <option key={f}>{f}</option>)}
                        </select>
                        <select value={c.operator} onChange={(e) => setFormConditions((prev) => prev.map((x, j) => j === i ? { ...x, operator: e.target.value as RuleCondition["operator"] } : x))} className={`rounded-lg px-2 py-1.5 text-sm ${inputCls}`} style={inputStyle}>
                          {["Equals", "Contains", "StartsWith", "EndsWith", "GreaterThan", "LessThan", "Regex"].map((o) => <option key={o}>{o}</option>)}
                        </select>
                        <input type="text" value={c.value} onChange={(e) => setFormConditions((prev) => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} placeholder="value" className={`min-w-0 flex-1 ${inputCls}`} style={inputStyle} />
                        {formConditions.length > 1 && <button onClick={() => setFormConditions((prev) => prev.filter((_, j) => j !== i))} style={{ color: "var(--text-tertiary)" }}><Trash2 size={12} /></button>}
                      </div>
                    ))}
                    <button onClick={() => setFormConditions((prev) => [...prev, emptyCondition()])} className="text-xs" style={{ color: "var(--accent)" }}>+ Add Condition</button>
                  </div>
                  <div className="flex gap-2"><Button onClick={handleSave}>Save Rule</Button><Button variant="secondary" onClick={cancel}>Cancel</Button></div>
                </div>
              </Card>
            )
          ) : (
            <Card key={rule.id}>
              <div className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium" style={{ color: rule.enabled ? "var(--text-primary)" : "var(--text-tertiary)" }}>{rule.name}</div>
                  <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{rule.conditions.length} condition{rule.conditions.length !== 1 ? "s" : ""} · {rule.actions.length} action{rule.actions.length !== 1 ? "s" : ""}</div>
                </div>
                <Toggle checked={rule.enabled} onChange={() => toggleRule(rule.id)} size="sm" />
                <Button variant="secondary" onClick={() => startEdit(rule)} className="text-xs px-3 py-1.5">Edit</Button>
                <Button variant="danger" onClick={() => deleteRule(rule.id)} className="text-xs px-3 py-1.5 opacity-70 hover:opacity-100">Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Test Rules */}
      <Card>
        <CardHeader>Test Rules</CardHeader>
        <CardDescription>Enter a directory path to dry-run all rules against.</CardDescription>
        <div className="flex items-center gap-3">
          <input type="text" value={dryRunPath} onChange={(e) => setDryRunPath(e.target.value)} placeholder="/path/to/directory" className={`min-w-0 flex-1 ${inputCls}`} style={inputStyle} />
          <Button variant="secondary" onClick={handleDryRun} disabled={!dryRunPath}>Dry Run</Button>
        </div>
        {dryRunResult && <p className="mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>{dryRunResult}</p>}
      </Card>
    </div>
  );
}
