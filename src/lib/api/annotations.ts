/**
 * Annotations + Notifications API 클라이언트 — S3 Phase 3 FG 3-3.
 */

import { api } from "./client";
import { toQueryString } from "@/lib/utils/url";

export type AnnotationStatus = "open" | "resolved";
export type AnnotationActorType = "user" | "agent" | "system";

export interface Annotation {
  id: string;
  document_id: string;
  version_id: string | null;
  node_id: string;
  span_start: number | null;
  span_end: number | null;
  author_id: string;
  actor_type: AnnotationActorType;
  content: string;
  status: AnnotationStatus;
  resolved_at: string | null;
  resolved_by: string | null;
  parent_id: string | null;
  is_orphan: boolean;
  orphaned_at: string | null;
  created_at: string;
  updated_at: string;
  mentioned_user_ids: string[];
}

export interface AnnotationCreateRequest {
  node_id: string;
  content: string;
  span_start?: number | null;
  span_end?: number | null;
  parent_id?: string | null;
  version_id?: string | null;
}

export interface ListAnnotationsParams {
  include_resolved?: boolean;
  include_orphans?: boolean;
  limit?: number;
}

type Envelope<T> = { data: T; meta?: unknown };
type ListEnvelope<T> = { data: T[]; meta?: { total?: number } };

function unwrap<T>(raw: unknown): T {
  const r = raw as Envelope<T>;
  if (r && typeof r === "object" && "data" in r) return r.data;
  return raw as T;
}

function unwrapList<T>(raw: unknown): T[] {
  const r = raw as ListEnvelope<T>;
  if (r && typeof r === "object" && Array.isArray(r.data)) return r.data;
  return Array.isArray(raw) ? (raw as T[]) : [];
}

export const annotationsApi = {
  /** 문서의 주석 목록 */
  list: async (
    documentId: string,
    params: ListAnnotationsParams = {},
  ): Promise<Annotation[]> => {
    const qs = toQueryString({
      include_resolved: params.include_resolved,
      include_orphans: params.include_orphans,
      limit: params.limit,
    });
    const raw = await api.get<unknown>(
      `/api/v1/documents/${documentId}/annotations${qs}`,
    );
    return unwrapList<Annotation>(raw);
  },

  /** 주석 단건 */
  get: async (annotationId: string): Promise<Annotation> => {
    const raw = await api.get<unknown>(`/api/v1/annotations/${annotationId}`);
    return unwrap<Annotation>(raw);
  },

  /** 신규 주석 또는 답글 */
  create: async (
    documentId: string,
    body: AnnotationCreateRequest,
  ): Promise<Annotation> => {
    const raw = await api.post<unknown>(
      `/api/v1/documents/${documentId}/annotations`,
      body,
    );
    return unwrap<Annotation>(raw);
  },

  /** 본문 수정 (작성자 본인만) */
  update: async (annotationId: string, content: string): Promise<Annotation> => {
    const raw = await api.patch<unknown>(
      `/api/v1/annotations/${annotationId}`,
      { content },
    );
    return unwrap<Annotation>(raw);
  },

  /** 해결 (작성자 또는 admin) */
  resolve: async (annotationId: string): Promise<Annotation> => {
    const raw = await api.post<unknown>(
      `/api/v1/annotations/${annotationId}/resolve`,
      {},
    );
    return unwrap<Annotation>(raw);
  },

  /** 재오픈 */
  reopen: async (annotationId: string): Promise<Annotation> => {
    const raw = await api.post<unknown>(
      `/api/v1/annotations/${annotationId}/reopen`,
      {},
    );
    return unwrap<Annotation>(raw);
  },

  /** 삭제 (cascade 답글) */
  delete: async (annotationId: string): Promise<void> => {
    await api.delete<unknown>(`/api/v1/annotations/${annotationId}`);
  },
};

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  user_id: string;
  kind: string;
  payload: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}

export const notificationsApi = {
  list: async (params: {
    unread_only?: boolean;
    limit?: number;
  } = {}): Promise<Notification[]> => {
    const qs = toQueryString({
      unread_only: params.unread_only,
      limit: params.limit,
    });
    const raw = await api.get<unknown>(`/api/v1/notifications${qs}`);
    return unwrapList<Notification>(raw);
  },

  unreadCount: async (): Promise<number> => {
    const raw = await api.get<unknown>(`/api/v1/notifications/unread-count`);
    const data = unwrap<{ unread_count: number }>(raw);
    return data?.unread_count ?? 0;
  },

  markRead: async (ids: string[]): Promise<number> => {
    const raw = await api.post<unknown>(`/api/v1/notifications/read`, { ids });
    const data = unwrap<{ marked_read: number }>(raw);
    return data?.marked_read ?? 0;
  },
};
