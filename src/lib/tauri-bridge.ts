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

export async function organizeByExtension(path: string, dryRun: boolean): Promise<OrganizeResult> {
  return invoke<OrganizeResult>("organize_by_extension", { path, dryRun });
}

export async function organizeByDate(path: string, dryRun: boolean): Promise<OrganizeResult> {
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
  operator:
    "Equals" | "Contains" | "StartsWith" | "EndsWith" | "GreaterThan" | "LessThan" | "Regex";
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

export async function scanDuplicates(
  path: string,
  recursive: boolean,
  maxDepth?: number,
): Promise<DuplicateGroup[]> {
  return invoke<DuplicateGroup[]>("scan_duplicates_cmd", { path, recursive, maxDepth });
}

export async function quarantineDuplicates(
  groups: DuplicateGroup[],
  indices: number[],
): Promise<void> {
  return invoke("quarantine_duplicates_cmd", { groups, indices });
}

export async function deleteDuplicates(groups: DuplicateGroup[], indices: number[]): Promise<void> {
  return invoke("delete_duplicates_cmd", { groups, indices });
}

export async function cleanupQuarantine(maxAgeDays?: number): Promise<number> {
  return invoke<number>("cleanup_quarantine_cmd", { maxAgeDays });
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

// Metadata
export interface ExifData {
  camera_make: string | null;
  camera_model: string | null;
  date_taken: string | null;
  gps: string | null;
  exposure: string | null;
}

export interface AudioData {
  artist: string | null;
  album: string | null;
  title: string | null;
  genre: string | null;
  track: number | null;
  year: number | null;
}

export interface FileMetadata {
  exif: ExifData | null;
  audio: AudioData | null;
}

export async function getMetadata(path: string): Promise<FileMetadata> {
  return invoke<FileMetadata>("get_metadata", { path });
}

// Watcher
export interface WatchedDir {
  path: string;
  enabled: boolean;
}

export async function watchDirectory(dir: string): Promise<void> {
  return invoke("watch_directory", { dir });
}

export async function unwatchDirectory(dir: string): Promise<void> {
  return invoke("unwatch_directory", { dir });
}

export async function listWatchedDirectories(): Promise<WatchedDir[]> {
  return invoke<WatchedDir[]>("list_watched_directories");
}

// Scheduler
export interface Schedule {
  id: string;
  name: string;
  cron: string;
  action: {
    OrganizeByExtension?: { path: string };
    OrganizeByDate?: { path: string };
    ApplyRules?: { path: string };
    ScanDuplicates?: { path: string };
  };
  enabled: boolean;
  last_run: string | null;
  next_run: string | null;
}

export async function createSchedule(
  name: string,
  cron: string,
  actionType: string,
  path: string,
): Promise<Schedule> {
  return invoke<Schedule>("create_schedule_cmd", { name, cron, actionType, path });
}

export async function listSchedules(): Promise<Schedule[]> {
  return invoke<Schedule[]>("list_schedules_cmd");
}

export async function deleteSchedule(id: string): Promise<void> {
  return invoke("delete_schedule_cmd", { id });
}

export async function toggleSchedule(id: string, enabled: boolean): Promise<void> {
  return invoke("toggle_schedule_cmd", { id, enabled });
}

export async function runScheduleNow(id: string): Promise<void> {
  return invoke("run_schedule_now", { id });
}

// Cloud sync stubs
export interface CloudProvider {
  id: string;
  name: string;
  provider_type: string;
  local_path: string;
  remote_path: string;
  enabled: boolean;
}

export async function cloudListProviders(): Promise<CloudProvider[]> {
  return invoke<CloudProvider[]>("cloud_list_providers");
}

export async function cloudSyncNow(path: string): Promise<void> {
  return invoke("cloud_sync_now", { path });
}

// ML categorization stub
export async function mlSuggestCategory(filePath: string): Promise<string> {
  return invoke<string>("ml_suggest_category", { filePath });
}
