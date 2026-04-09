export type ChangeType = "ADDED" | "DELETED" | "MODIFIED" | "MOVED" | "UNCHANGED";
export type MoveType = "HIERARCHY_CHANGE" | "REORDER";
export type DiffSeverity = "MAJOR" | "MINOR" | "TRIVIAL";
export type InlineDiffTokenType = "added" | "deleted" | "unchanged";

export interface InlineDiffToken {
  type: InlineDiffTokenType;
  text: string;
}

export interface MoveInfo {
  old_parent_id: string | null;
  new_parent_id: string | null;
  old_order: number;
  new_order: number;
  move_type: MoveType;
}

export interface NodeSnapshot {
  node_id: string;
  node_type: string;
  title: string | null;
  content: string | null;
  parent_id: string | null;
  order: number;
  metadata: Record<string, unknown>;
}

export interface NodeDiff {
  node_id: string;
  change_type: ChangeType;
  before: NodeSnapshot | null;
  after: NodeSnapshot | null;
  inline_diff: InlineDiffToken[] | null;
  inline_diff_skipped: boolean;
  move_info: MoveInfo | null;
}

export interface ChangedSection {
  node_id: string;
  title: string | null;
  change_type: ChangeType;
  sub_changes: number;
}

export interface DiffSummary {
  total_added: number;
  total_deleted: number;
  total_modified: number;
  total_moved: number;
  total_unchanged: number;
  changed_characters: number;
  description: string;
  severity: DiffSeverity | null;
  changed_sections: ChangedSection[];
}

export interface VersionRef {
  id: string;
  version_number: number;
  status: string;
  created_at: string;
  created_by: string | null;
  label: string | null;
  change_summary: string | null;
}

export interface DiffResult {
  document_id: string;
  version_a: VersionRef;
  version_b: VersionRef;
  summary: DiffSummary;
  nodes: NodeDiff[];
  has_data_issue: boolean;
}

export interface DiffSummaryResponse {
  document_id: string;
  version_a: VersionRef;
  version_b: VersionRef;
  summary: DiffSummary;
}
