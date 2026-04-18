import { api } from "./client";
import type {
  DocumentSearchParams,
  DocumentSearchResponse,
  NodeSearchParams,
  NodeSearchResponse,
  SearchIndexStats,
  UnifiedSearchResponse,
} from "@/types/search";

// F-04 시정(2026-04-18): 호출부에서 `as Record<string, string | number | undefined>` 캐스팅이
//   인덱스 시그니처 불일치로 TS2352 를 유발했음. object 로 완화하여 DocumentSearchParams /
//   NodeSearchParams 같은 interface 를 캐스팅 없이 직접 전달할 수 있도록 함. 내부 Object.entries
//   결과에 대해 undefined/null/"" 필터링과 String() 변환이 모두 수행되므로 런타임 의미는 유지됨.
function buildQuery(params: object): string {
  const entries = Object.entries(params as Record<string, unknown>).filter(
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
    const qs = buildQuery(params);
    return api
      .get<ApiResponse<DocumentSearchResponse>>(`/api/v1/search/documents${qs}`)
      .then((r) => r.data);
  },

  /** 노드 단위 검색 */
  nodes(params: NodeSearchParams) {
    const qs = buildQuery(params);
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
