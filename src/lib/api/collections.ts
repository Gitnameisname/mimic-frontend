/**
 * Collections API 클라이언트 — S3 Phase 2 FG 2-1.
 *
 * 백엔드 라우터 `/api/v1/collections` 의 thin wrapper.
 * 응답 envelope `{ data, meta }` 는 `.data` 필드를 꺼내 반환한다.
 */

import { toQueryString } from "@/lib/utils/url";
import { api } from "./client";

export interface Collection {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  document_count: number | null;
}

export interface CollectionListResponse {
  items: Collection[];
  total: number;
}

export interface CollectionCreateRequest {
  name: string;
  description?: string | null;
}

export interface CollectionUpdateRequest {
  name?: string | null;
  description?: string | null;
}

export interface AddDocumentsResponse {
  requested: number;
  accepted: number;
  inserted: number;
  rejected: number;
}

export interface CollectionDocumentsResponse {
  collection_id: string;
  document_ids: string[];
}

type Envelope<T> = { data: T; meta?: unknown };
type ListEnvelope<T> = { data: T[]; meta?: { total?: number } };

function unwrap<T>(raw: unknown): T {
  const r = raw as Envelope<T>;
  if (r && typeof r === "object" && "data" in r) return r.data;
  return raw as T;
}

function unwrapList<T>(raw: unknown): { items: T[]; total: number } {
  const r = raw as ListEnvelope<T>;
  if (r && typeof r === "object" && Array.isArray(r.data)) {
    return { items: r.data, total: r.meta?.total ?? r.data.length };
  }
  const arr = raw as T[];
  return { items: Array.isArray(arr) ? arr : [], total: Array.isArray(arr) ? arr.length : 0 };
}

export const collectionsApi = {
  list: async (params: { limit?: number; offset?: number } = {}): Promise<CollectionListResponse> => {
    const path = `/api/v1/collections${toQueryString({
      limit: params.limit,
      offset: params.offset,
    })}`;
    const raw = await api.get<unknown>(path);
    return unwrapList<Collection>(raw);
  },

  get: async (id: string): Promise<Collection> => {
    const raw = await api.get<unknown>(`/api/v1/collections/${id}`);
    return unwrap<Collection>(raw);
  },

  create: async (body: CollectionCreateRequest): Promise<Collection> => {
    const raw = await api.post<unknown>("/api/v1/collections", body);
    return unwrap<Collection>(raw);
  },

  update: async (id: string, body: CollectionUpdateRequest): Promise<Collection> => {
    const raw = await api.patch<unknown>(`/api/v1/collections/${id}`, body);
    return unwrap<Collection>(raw);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete<void>(`/api/v1/collections/${id}`);
  },

  addDocuments: async (
    id: string,
    documentIds: string[],
  ): Promise<AddDocumentsResponse> => {
    const raw = await api.post<unknown>(
      `/api/v1/collections/${id}/documents`,
      { document_ids: documentIds },
    );
    return unwrap<AddDocumentsResponse>(raw);
  },

  removeDocument: async (id: string, documentId: string): Promise<void> => {
    await api.delete<void>(`/api/v1/collections/${id}/documents/${documentId}`);
  },

  listDocumentIds: async (id: string): Promise<CollectionDocumentsResponse> => {
    const raw = await api.get<unknown>(`/api/v1/collections/${id}/documents`);
    return unwrap<CollectionDocumentsResponse>(raw);
  },
};
