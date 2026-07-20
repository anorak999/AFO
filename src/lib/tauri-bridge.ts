import { invoke } from "@tauri-apps/api/core";

export interface FileInfo {
  name: string;
  path: string;
  extension: string;
  size: number;
  is_dir: boolean;
}

export interface OrganizeResult {
  total_files: number;
  moved: number;
  skipped: number;
  errors: string[];
  dry_run: boolean;
}

export async function scanDirectory(path: string): Promise<FileInfo[]> {
  return invoke<FileInfo[]>("scan_directory", { path });
}

export async function organizeByExtension(
  path: string,
  dryRun: boolean,
): Promise<OrganizeResult> {
  return invoke<OrganizeResult>("organize_by_extension", { path, dryRun });
}

export async function organizeByDate(
  path: string,
  dryRun: boolean,
): Promise<OrganizeResult> {
  return invoke<OrganizeResult>("organize_by_date", { path, dryRun });
}

export async function batchRename(
  path: string,
  pattern: string,
  dryRun: boolean,
): Promise<OrganizeResult> {
  return invoke<OrganizeResult>("batch_rename", { path, pattern, dryRun });
}

// Rule Engine
export interface RuleCondition {
  field: "Extension" | "Name" | "Size" | "DateCreated" | "DateModified";
  operator: "Equals" | "Contains" | "StartsWith" | "EndsWith" | "GreaterThan" | "LessThan" | "Regex";
  value: string;
}

export interface RuleAction {
  Move?: { destination: string };
  Copy?: { destination: string };
  Rename?: { pattern: string };
}

export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
}

export async function listRules(): Promise<Rule[]> {
  return invoke<Rule[]>("list_rules");
}

export async function saveRules(rules: Rule[]): Promise<void> {
  return invoke("save_rules", { rules });
}

export async function applyRules(path: string, dryRun: boolean): Promise<OrganizeResult> {
  return invoke<OrganizeResult>("apply_rules", { path, dryRun });
}

// Duplicates
export interface DuplicateFile {
  path: string;
  size: number;
  is_keeper: boolean;
}

export interface DuplicateGroup {
  hash: string;
  files: DuplicateFile[];
  total_size: number;
}

export async function scanDuplicates(path: string, recursive: boolean, maxDepth?: number): Promise<DuplicateGroup[]> {
  return invoke<DuplicateGroup[]>("scan_duplicates_cmd", { path, recursive, maxDepth });
}

export async function quarantineDuplicates(groups: DuplicateGroup[], indices: number[]): Promise<void> {
  return invoke("quarantine_duplicates_cmd", { groups, indices });
}

export async function deleteDuplicates(groups: DuplicateGroup[], indices: number[]): Promise<void> {
  return invoke("delete_duplicates_cmd", { groups, indices });
}

// Journal
export interface JournalEntry {
  id: number;
  operation_type: string;
  source_path: string;
  dest_path: string;
  timestamp: string;
  reverted: boolean;
}

export async function getHistory(limit?: number, offset?: number): Promise<JournalEntry[]> {
  return invoke<JournalEntry[]>("get_history", { limit, offset });
}

export async function undoLast(): Promise<JournalEntry | null> {
  return invoke<JournalEntry | null>("undo_last");
}

export async function undoOperation(id: number): Promise<JournalEntry | null> {
  return invoke<JournalEntry | null>("undo_operation", { id });
}

export async function redoLast(): Promise<JournalEntry | null> {
  return invoke<JournalEntry | null>("redo_last");
}
