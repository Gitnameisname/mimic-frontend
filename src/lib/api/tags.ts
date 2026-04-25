/**
 * Tags API 클라이언트 — S3 Phase 2 FG 2-2.
 *
 * 백엔드 `/api/v1/tags` wrapper.
 */

import { toQueryString } from "@/lib/utils/url";
import { api } from "./client";

export interface Tag {
  id: string;
  name: string;
  created_at: string;
  usage_count?: number | null;
}

export interface TagListResponse {
  items: Tag[];
  total: number;
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
  return {
    items: Array.isArray(arr) ? arr : [],
    total: Array.isArray(arr) ? arr.length : 0,
  };
}

export const tagsApi = {
  autocomplete: async (
    params: { q?: string; limit?: number } = {},
  ): Promise<TagListResponse> => {
    // q 가 빈 문자열일 때는 omit (toQueryString 시맨틱).
    const path = `/api/v1/tags${toQueryString({ q: params.q, limit: params.limit })}`;
    const raw = await api.get<unknown>(path);
    return unwrapList<Tag>(raw);
  },

  popular: async (
    params: { limit?: number; min_usage?: number } = {},
  ): Promise<TagListResponse> => {
    const path = `/api/v1/tags/popular${toQueryString({
      limit: params.limit,
      min_usage: params.min_usage,
    })}`;
    const raw = await api.get<unknown>(path);
    return unwrapList<Tag>(raw);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete<void>(`/api/v1/tags/${id}`);
  },
};

// DocumentResponse 에 포함되는 document_tags 엔트리
export interface DocumentTagEntry {
  id: string;
  name: string;
  source: "inline" | "frontmatter" | "both";
}
