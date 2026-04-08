import { api } from "./client";
import type {
  Document,
  DocumentListResponse,
  DocumentFilters,
} from "@/types";

function buildQuery(filters: DocumentFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.author) params.set("author", filters.author);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.order) params.set("order", filters.order);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const documentsApi = {
  list: (filters: DocumentFilters = {}) =>
    api.get<DocumentListResponse>(`/api/v1/documents${buildQuery(filters)}`),

  get: (id: string) => api.get<Document>(`/api/v1/documents/${id}`),

  create: (body: { title: string; document_type: string; metadata?: Record<string, unknown> }) =>
    api.post<Document>("/api/v1/documents", body),

  update: (id: string, body: { title?: string; metadata?: Record<string, unknown> }) =>
    api.patch<Document>(`/api/v1/documents/${id}`, body),
};
