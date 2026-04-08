export type NodeType =
  | "section"
  | "paragraph"
  | "heading"
  | "list"
  | "list_item"
  | "code_block"
  | "table"
  | "image";

export interface DocumentNode {
  id: string;
  version_id: string;
  parent_id: string | null;
  node_type: NodeType;
  order: number;
  title?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  children?: DocumentNode[];
}
