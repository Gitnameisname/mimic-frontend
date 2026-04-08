import type { WorkflowStatus } from "./workflow";

export interface Document {
  id: string;
  title: string;
  document_type: string;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  current_version_id?: string;
  current_version_number?: string;
  workflow_status?: WorkflowStatus;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface DocumentListItem {
  id: string;
  title: string;
  document_type: string;
  created_by_name: string;
  updated_at: string;
  version_number: string;
  workflow_status: WorkflowStatus;
}

export interface DocumentListResponse {
  items: DocumentListItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface DocumentFilters {
  q?: string;
  status?: WorkflowStatus;
  type?: string;
  author?: string;
  page?: number;
  limit?: number;
  sort?: "updated_at" | "created_at" | "title";
  order?: "asc" | "desc";
}
