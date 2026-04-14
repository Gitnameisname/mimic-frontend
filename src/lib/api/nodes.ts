import { api } from "./client";
import type { DocumentNode } from "@/types";

// 백엔드 경로: GET /api/v1/versions/{version_id}/nodes
function adaptNodes(raw: unknown): DocumentNode[] {
  const r = raw as { data?: unknown[] };
  const items = r.data ?? (raw as unknown[]);
  return Array.isArray(items) ? (items as DocumentNode[]) : [];
}

export const nodesApi = {
  // version_id 기반 노드 목록 조회 (백엔드 실제 경로)
  list: async (versionId: string): Promise<DocumentNode[]> => {
    const raw = await api.get<unknown>(`/api/v1/versions/${versionId}/nodes`);
    return adaptNodes(raw);
  },

  listByVersion: async (documentId: string, versionId: string): Promise<DocumentNode[]> => {
    const raw = await api.get<unknown>(`/api/v1/versions/${versionId}/nodes`);
    return adaptNodes(raw);
  },
};
