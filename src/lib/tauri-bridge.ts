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
