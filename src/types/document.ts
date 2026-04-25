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
  // S3 Phase 2 FG 2-1 UX 2차 (2026-04-24): 문서 상세 응답에 포함되는 배치 상태
  folder_id?: string | null;
  in_collection_ids?: string[];
  // S3 Phase 2 FG 2-2 (2026-04-24): 서버 파서가 계산한 태그 목록
  document_tags?: DocumentTagEntry[];
}

export interface DocumentTagEntry {
  id: string;
  name: string;
  source: "inline" | "frontmatter" | "both";
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
  // S3 Phase 2 FG 2-1 (2026-04-24): 컬렉션 / 폴더 필터
  collection?: string;
  folder?: string;
  includeSubfolders?: boolean;
  // S3 Phase 2 FG 2-2 (2026-04-24): 태그 필터 (정규화된 이름)
  tag?: string;
}
