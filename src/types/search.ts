/** 검색 API 타입 정의 (Phase 8) */

export interface DocumentSnippet {
  field: "title" | "summary" | "content";
  text: string; // <b>키워드</b> 마킹 포함
}

export interface DocumentSearchResult {
  id: string;
  title: string;
  document_type: string;
  status: string;
  summary?: string | null;
  metadata: Record<string, unknown>;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  current_published_version_id?: string | null;
  rank: number;
  snippets: DocumentSnippet[];
}

export interface NodeBreadcrumb {
  node_id: string;
  title?: string | null;
  node_type: string;
}

export interface NodeSearchResult {
  node_id: string;
  node_type: string;
  title?: string | null;
  content_snippet?: string | null;
  order_index: number;
  document_id: string;
  document_title: string;
  document_type: string;
  document_status: string;
  version_id: string;
  version_number: number;
  breadcrumb: NodeBreadcrumb[];
  rank: number;
}

export interface SearchPagination {
  page: number;
  limit: number;
  total: number;
  has_next: boolean;
}

export interface DocumentSearchResponse {
  query: string;
  results: DocumentSearchResult[];
  pagination: SearchPagination;
  search_engine: string;
}

export interface NodeSearchResponse {
  query: string;
  results: NodeSearchResult[];
  pagination: SearchPagination;
  search_engine: string;
}

export interface UnifiedSearchResponse {
  query: string;
  documents: DocumentSearchResult[];
  nodes: NodeSearchResult[];
  total_documents: number;
  total_nodes: number;
  search_engine: string;
}

export interface IndexStatsEntry {
  table_name: string;
  total_rows: number;
  indexed_rows: number;
  unindexed_rows: number;
}

export interface SearchIndexStats {
  stats: IndexStatsEntry[];
  retrieved_at: string;
}

export type SearchSort = "relevance" | "created_at" | "updated_at";

export interface DocumentSearchParams {
  q: string;
  type?: string;
  status?: string;
  from_date?: string;
  to_date?: string;
  sort?: SearchSort;
  page?: number;
  limit?: number;
}

export interface NodeSearchParams {
  q: string;
  document_id?: string;
  type?: string;
  sort?: "relevance" | "created_at";
  page?: number;
  limit?: number;
}
