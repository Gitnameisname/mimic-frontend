import { api } from "./client";
import type { Version } from "@/types";

export const versionsApi = {
  list: (documentId: string) =>
    api.get<Version[]>(`/api/v1/documents/${documentId}/versions`),

  get: (documentId: string, versionId: string) =>
    api.get<Version>(`/api/v1/documents/${documentId}/versions/${versionId}`),

  getLatest: (documentId: string) =>
    api.get<Version>(`/api/v1/documents/${documentId}/versions/latest`),

  create: (documentId: string, body?: { change_reason?: string }) =>
    api.post<Version>(`/api/v1/documents/${documentId}/versions`, body),

  saveDraft: (
    documentId: string,
    versionId: string,
    body: { nodes?: unknown[]; title?: string; metadata?: Record<string, unknown> }
  ) =>
    api.patch<Version>(
      `/api/v1/documents/${documentId}/versions/${versionId}/draft`,
      body
    ),
};
