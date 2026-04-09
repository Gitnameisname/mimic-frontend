import { api } from "./client";
import { buildQueryString } from "@/lib/utils";
import type {
  Document,
  DocumentListResponse,
  DocumentFilters,
} from "@/types";

export const documentsApi = {
  list: (filters: DocumentFilters = {}) =>
    api.get<DocumentListResponse>(`/api/v1/documents${buildQueryString(filters)}`),

  get: (id: string) => api.get<Document>(`/api/v1/documents/${id}`),

  create: (body: { title: string; document_type: string; metadata?: Record<string, unknown> }) =>
    api.post<Document>("/api/v1/documents", body),

  update: (id: string, body: { title?: string; metadata?: Record<string, unknown> }) =>
    api.patch<Document>(`/api/v1/documents/${id}`, body),
};
