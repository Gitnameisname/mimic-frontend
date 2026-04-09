import { api } from "./client";
import type {
  DocumentSearchParams,
  DocumentSearchResponse,
  NodeSearchParams,
  NodeSearchResponse,
  SearchIndexStats,
  UnifiedSearchResponse,
} from "@/types/search";

function buildQuery(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== "" && v !== null
  );
  if (!entries.length) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&");
}

interface ApiResponse<T> {
  data: T;
  meta: { request_id?: string; trace_id?: string };
}

export const searchApi = {
  /** 검색 필터 옵션 조회 (활성 DocumentType 목록) */
  filterOptions() {
    return api
      .get<ApiResponse<{ document_types: { type_code: string; display_name: string }[] }>>(
        "/api/v1/search/filter-options"
      )
      .then((r) => r.data);
  },

  /** 통합 검색 (문서 + 노드, 각 최대 5건) */
  unified(q: string, type?: string, status?: string) {
    const qs = buildQuery({ q, type, status });
    return api
      .get<ApiResponse<UnifiedSearchResponse>>(`/api/v1/search${qs}`)
      .then((r) => r.data);
  },

  /** 문서 단위 전문 검색 */
  documents(params: DocumentSearchParams) {
    const qs = buildQuery(params as Record<string, string | number | undefined>);
    return api
      .get<ApiResponse<DocumentSearchResponse>>(`/api/v1/search/documents${qs}`)
      .then((r) => r.data);
  },

  /** 노드 단위 검색 */
  nodes(params: NodeSearchParams) {
    const qs = buildQuery(params as Record<string, string | number | undefined>);
    return api
      .get<ApiResponse<NodeSearchResponse>>(`/api/v1/search/nodes${qs}`)
      .then((r) => r.data);
  },

  /** Admin: 인덱스 현황 조회 */
  indexStats() {
    return api
      .get<ApiResponse<SearchIndexStats>>("/api/v1/search/index-stats")
      .then((r) => r.data);
  },

  /** Admin: 수동 재인덱싱 */
  reindex() {
    return api
      .post<ApiResponse<{ reindexed: Record<string, number> }>>("/api/v1/search/reindex")
      .then((r) => r.data);
  },
};
