import { api } from "./client";
import type { WorkflowHistoryItem, ReviewActionItem } from "@/types";

const base = (docId: string, verId: string) =>
  `/api/v1/documents/${docId}/versions/${verId}/workflow`;

export const workflowApi = {
  submitReview: (docId: string, verId: string, body?: { comment?: string }) =>
    api.post<void>(`${base(docId, verId)}/submit-review`, body),

  approve: (docId: string, verId: string, body?: { comment?: string }) =>
    api.post<void>(`${base(docId, verId)}/approve`, body),

  reject: (
    docId: string,
    verId: string,
    body: { reason: string; comment?: string }
  ) => api.post<void>(`${base(docId, verId)}/reject`, body),

  publish: (docId: string, verId: string) =>
    api.post<void>(`${base(docId, verId)}/publish`),

  archive: (docId: string, verId: string) =>
    api.post<void>(`${base(docId, verId)}/archive`),

  returnToDraft: (docId: string, verId: string, body?: { comment?: string }) =>
    api.post<void>(`${base(docId, verId)}/return-to-draft`, body),

  getHistory: async (docId: string, verId: string): Promise<WorkflowHistoryItem[]> => {
    const raw = await api.get<unknown>(`${base(docId, verId)}/history`);
    const r = raw as { data?: unknown[] };
    const items = r.data ?? (raw as unknown[]);
    return Array.isArray(items) ? (items as WorkflowHistoryItem[]) : [];
  },

  getReviewActions: async (docId: string, verId: string): Promise<ReviewActionItem[]> => {
    const raw = await api.get<unknown>(`${base(docId, verId)}/review-actions`);
    const r = raw as { data?: unknown[] };
    const items = r.data ?? (raw as unknown[]);
    return Array.isArray(items) ? (items as ReviewActionItem[]) : [];
  },
};
