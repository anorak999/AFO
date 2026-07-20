import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  Handle,
  Position,
  BackgroundVariant,
} from "reactflow";
import "reactflow/dist/style.css";
import type { Rule, RuleCondition, RuleAction } from "../../lib/tauri-bridge";

// ── Node Types ──────────────────────────────────────────

interface TriggerNodeData {
  label: string;
}

function TriggerNode({ data }: { data: TriggerNodeData }) {
  return (
    <div className="rounded-xl border border-afo-purple/40 bg-afo-purple/10 px-4 py-3 text-sm font-medium text-white shadow-lg">
      <div className="text-[10px] uppercase tracking-wider text-afo-purple/60 mb-1">Trigger</div>
      {data.label}
      <Handle type="source" position={Position.Bottom} className="!bg-afo-purple" />
    </div>
  );
}

interface ConditionNodeData {
  field: string;
  operator: string;
  value: string;
  onUpdate: (field: string, operator: string, value: string) => void;
}

function ConditionNode({ data }: { data: ConditionNodeData }) {
  return (
    <div className="rounded-xl border border-afo-sky/40 bg-afo-sky/10 px-4 py-3 text-sm text-white shadow-lg min-w-[200px]">
      <Handle type="target" position={Position.Top} className="!bg-afo-sky" />
      <div className="text-[10px] uppercase tracking-wider text-afo-sky/60 mb-2">Condition</div>
      <div className="space-y-1.5">
        <select
          value={data.field}
          onChange={(e) => data.onUpdate(e.target.value, data.operator, data.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 outline-none"
        >
          <option value="Extension">Extension</option>
          <option value="Name">Name</option>
          <option value="Size">Size</option>
          <option value="DateCreated">Date Created</option>
          <option value="DateModified">Date Modified</option>
        </select>
        <select
          value={data.operator}
          onChange={(e) => data.onUpdate(data.field, e.target.value, data.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 outline-none"
        >
          <option value="Equals">Equals</option>
          <option value="Contains">Contains</option>
          <option value="StartsWith">Starts With</option>
          <option value="EndsWith">Ends With</option>
          <option value="GreaterThan">Greater Than</option>
          <option value="LessThan">Less Than</option>
          <option value="Regex">Regex</option>
        </select>
        <input
          type="text"
          value={data.value}
          onChange={(e) => data.onUpdate(data.field, data.operator, e.target.value)}
          placeholder="value"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 placeholder:text-white/30 outline-none"
        />
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-afo-sky" />
    </div>
  );
}

interface ActionNodeData {
  actionType: string;
  value: string;
  onUpdate: (type: string, value: string) => void;
}

function ActionNode({ data }: { data: ActionNodeData }) {
  return (
    <div className="rounded-xl border border-afo-emerald/40 bg-afo-emerald/10 px-4 py-3 text-sm text-white shadow-lg min-w-[200px]">
      <Handle type="target" position={Position.Top} className="!bg-afo-emerald" />
      <div className="text-[10px] uppercase tracking-wider text-afo-emerald/60 mb-2">Action</div>
      <div className="space-y-1.5">
        <select
          value={data.actionType}
          onChange={(e) => data.onUpdate(e.target.value, data.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 outline-none"
        >
          <option value="Move">Move</option>
          <option value="Copy">Copy</option>
          <option value="Rename">Rename</option>
        </select>
        <input
          type="text"
          value={data.value}
          onChange={(e) => data.onUpdate(data.actionType, e.target.value)}
          placeholder={data.actionType === "Rename" ? "{name}_sorted.{ext}" : "/destination/path"}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/80 placeholder:text-white/30 outline-none"
        />
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};

// ── Flow Editor ─────────────────────────────────────────

interface RuleFlowEditorProps {
  rule: Rule;
  onSave: (conditions: RuleCondition[], actions: RuleAction[]) => void;
  onCancel: () => void;
}

export default function RuleFlowEditor({ rule, onSave, onCancel }: RuleFlowEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const nodeIdRef = useRef(1);

  // Initialize nodes from rule
  useState(() => {
    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];
    let nodeId = 1;

    // Trigger node
    const triggerId = `trigger-${nodeId++}`;
    initialNodes.push({
      id: triggerId,
      type: "trigger",
      position: { x: 250, y: 0 },
      data: { label: rule.name || "New Rule" },
    });

    // Condition nodes
    let lastId = triggerId;
    let yOffset = 100;

    rule.conditions.forEach((cond) => {
      const condId = `condition-${nodeId++}`;
      initialNodes.push({
        id: condId,
        type: "condition",
        position: { x: 250, y: yOffset },
        data: {
          field: cond.field,
          operator: cond.operator,
          value: cond.value,
          onUpdate: (field: string, operator: string, value: string) => {
            updateConditionNode(condId, field, operator, value);
          },
        },
      });
      initialEdges.push({
        id: `e-${lastId}-${condId}`,
        source: lastId,
        target: condId,
        animated: true,
        style: { stroke: "#38BDF8" },
      });
      lastId = condId;
      yOffset += 150;
    });

    // Action nodes
    rule.actions.forEach((action) => {
      const actionId = `action-${nodeId++}`;
      const actionType = action.Move ? "Move" : action.Copy ? "Copy" : "Rename";
      const value = action.Move?.destination || action.Copy?.destination || action.Rename?.pattern || "";
      initialNodes.push({
        id: actionId,
        type: "action",
        position: { x: 250, y: yOffset },
        data: {
          actionType,
          value,
          onUpdate: (type: string, val: string) => {
            updateActionNode(actionId, type, val);
          },
        },
      });
      initialEdges.push({
        id: `e-${lastId}-${actionId}`,
        source: lastId,
        target: actionId,
        animated: true,
        style: { stroke: "#34D399" },
      });
      lastId = actionId;
      yOffset += 150;
    });

    // If no conditions/actions, add placeholders
    if (rule.conditions.length === 0) {
      const condId = `condition-${nodeId++}`;
      initialNodes.push({
        id: condId,
        type: "condition",
        position: { x: 250, y: yOffset },
        data: {
          field: "Extension",
          operator: "Contains",
          value: "",
          onUpdate: (field: string, operator: string, value: string) => {
            updateConditionNode(condId, field, operator, value);
          },
        },
      });
      initialEdges.push({
        id: `e-${lastId}-${condId}`,
        source: lastId,
        target: condId,
        animated: true,
        style: { stroke: "#38BDF8" },
      });
      lastId = condId;
      yOffset += 150;
    }

    if (rule.actions.length === 0) {
      const actionId = `action-${nodeId++}`;
      initialNodes.push({
        id: actionId,
        type: "action",
        position: { x: 250, y: yOffset },
        data: {
          actionType: "Move",
          value: "",
          onUpdate: (type: string, val: string) => {
            updateActionNode(actionId, type, val);
          },
        },
      });
      initialEdges.push({
        id: `e-${lastId}-${actionId}`,
        source: lastId,
        target: actionId,
        animated: true,
        style: { stroke: "#34D399" },
      });
    }

    nodeIdRef.current = nodeId;
    setNodes(initialNodes);
    setEdges(initialEdges);
  });

  function updateConditionNode(id: string, field: string, operator: string, value: string) {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, field, operator, value } } : n
      )
    );
  }

  function updateActionNode(id: string, actionType: string, value: string) {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, actionType, value } } : n
      )
    );
  }

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  const handleAddCondition = () => {
    const id = `condition-${nodeIdRef.current++}`;
    const lastNode = nodes[nodes.length - 1];
    const newY = lastNode ? lastNode.position.y + 150 : 100;

    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "condition",
        position: { x: 250, y: newY },
        data: {
          field: "Extension",
          operator: "Contains",
          value: "",
          onUpdate: (field: string, operator: string, value: string) => {
            updateConditionNode(id, field, operator, value);
          },
        },
      },
    ]);
  };

  const handleAddAction = () => {
    const id = `action-${nodeIdRef.current++}`;
    const lastNode = nodes[nodes.length - 1];
    const newY = lastNode ? lastNode.position.y + 150 : 100;

    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "action",
        position: { x: 250, y: newY },
        data: {
          actionType: "Move",
          value: "",
          onUpdate: (type: string, val: string) => {
            updateActionNode(id, type, val);
          },
        },
      },
    ]);
  };

  function extractRule() {
    const conditions: RuleCondition[] = [];
    const actions: RuleAction[] = [];

    for (const node of nodes) {
      if (node.type === "condition") {
        const d = node.data as ConditionNodeData;
        if (d.value) {
          conditions.push({
            field: d.field as RuleCondition["field"],
            operator: d.operator as RuleCondition["operator"],
            value: d.value,
          });
        }
      } else if (node.type === "action") {
        const d = node.data as ActionNodeData;
        if (d.value) {
          if (d.actionType === "Move") {
            actions.push({ Move: { destination: d.value } });
          } else if (d.actionType === "Copy") {
            actions.push({ Copy: { destination: d.value } });
          } else {
            actions.push({ Rename: { pattern: d.value } });
          }
        }
      }
    }

    return { conditions, actions };
  }

  function handleSave() {
    const { conditions, actions } = extractRule();
    onSave(conditions, actions);
  }

  return (
    <div className="flex flex-col h-[500px] rounded-xl border border-white/[0.06] bg-white/[0.02]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-2">
        <button
          onClick={handleAddCondition}
          className="rounded-lg border border-afo-sky/30 bg-afo-sky/10 px-3 py-1.5 text-xs font-medium text-afo-sky transition-colors hover:bg-afo-sky/20"
        >
          + Condition
        </button>
        <button
          onClick={handleAddAction}
          className="rounded-lg border border-afo-emerald/30 bg-afo-emerald/10 px-3 py-1.5 text-xs font-medium text-afo-emerald transition-colors hover:bg-afo-emerald/20"
        >
          + Action
        </button>
        <div className="flex-1" />
        <button
          onClick={onCancel}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="rounded-lg bg-afo-purple px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-afo-purple/80"
        >
          Save Rule
        </button>
      </div>

      {/* Flow canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Controls className="!bg-[#0a0a0a] !border-white/10 !rounded-lg" />
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="rgba(255,255,255,0.05)"
          />
        </ReactFlow>
      </div>
    </div>
  );
}
