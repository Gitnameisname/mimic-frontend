/**
 * FG 0-5 (2026-04-23) — 문서 벡터화 상태 + 재벡터화 API 클라이언트.
 *
 * 백엔드:
 *  - GET  /api/v1/vectorization/documents/{id}/status
 *  - POST /api/v1/vectorization/documents/{id}
 */
import { api } from "./client";

export type VectorizationStatus =
  | "indexed"
  | "pending"
  | "in_progress"
  | "failed"
  | "stale"
  | "not_applicable";

export interface VectorizationStatusResponse {
  document_id: string;
  status: VectorizationStatus;
  latest_published_version_id: string | null;
  indexed_version_id: string | null;
  chunk_count: number;
  last_vectorized_at: string | null;   // ISO 8601
  last_error: string | null;
  can_reindex: boolean;
  reindex_cooldown_sec: number;
}

export interface ReindexResponse {
  document_id: string;
  version_id: string;
  chunks_created: number;
  chunks_failed: number;
  total_tokens: number;
  model: string | null;
  error: string | null;
}

function unwrap<T>(raw: unknown): T {
  const r = raw as { data?: T };
  return (r.data ?? (raw as T)) as T;
}

export const vectorizationApi = {
  /** 문서 벡터화 상태 조회 — 인증 필요. 폐쇄망 안전 (Milvus off 시에도 동작). */
  getStatus: async (documentId: string): Promise<VectorizationStatusResponse> => {
    const raw = await api.get<unknown>(
      `/api/v1/vectorization/documents/${documentId}/status`,
    );
    return unwrap<VectorizationStatusResponse>(raw);
  },

  /** 재벡터화 트리거 — Admin 또는 문서 작성자. 10초 쿨다운 (429 + Retry-After). */
  reindex: async (documentId: string): Promise<ReindexResponse> => {
    const raw = await api.post<unknown>(
      `/api/v1/vectorization/documents/${documentId}`,
      {},
    );
    return unwrap<ReindexResponse>(raw);
  },
};
