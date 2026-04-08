import { api } from "./client";
import type { DocumentNode } from "@/types";

export const nodesApi = {
  list: (documentId: string) =>
    api.get<DocumentNode[]>(`/api/v1/documents/${documentId}/nodes`),

  listByVersion: (documentId: string, versionId: string) =>
    api.get<DocumentNode[]>(
      `/api/v1/documents/${documentId}/versions/${versionId}/nodes`
    ),
};
