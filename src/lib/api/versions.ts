import { api } from "./client";
import type { Version, WorkflowStatus } from "@/types";

// 백엔드 version status (소문자) → 프론트엔드 WorkflowStatus 매핑
const VERSION_STATUS_TO_WORKFLOW: Record<string, WorkflowStatus> = {
  draft: "DRAFT",
  published: "PUBLISHED",
  archived: "ARCHIVED",
  deprecated: "ARCHIVED",
  superseded: "ARCHIVED",
  discarded: "DRAFT",
  in_review: "IN_REVIEW",
  approved: "APPROVED",
  rejected: "REJECTED",
};

// 백엔드 응답 { data: {...}, meta: {...} } → Version 변환
function adaptVersion(raw: unknown): Version {
  const envelope = raw as { data?: Record<string, unknown> };
  const v: Record<string, unknown> = envelope.data ?? (raw as Record<string, unknown>);

  const rawWorkflow = (v.workflow_status ?? v.status) as string | undefined;
  const workflowStatus: WorkflowStatus =
    VERSION_STATUS_TO_WORKFLOW[rawWorkflow?.toLowerCase() ?? ""] ?? "DRAFT";

  return {
    id: v.id as string,
    document_id: v.document_id as string,
    version_number: String(v.version_number ?? ""),
    workflow_status: workflowStatus,
    created_by: (v.created_by as string) ?? "",
    created_by_name: (v.created_by as string) ?? "",
    created_at: v.created_at as string,
    updated_at: (v.published_at ?? v.created_at) as string,
    change_reason: (v.change_summary as string | undefined),
    metadata: (v.metadata as Record<string, unknown> | undefined),
    title_snapshot: (v.title_snapshot as string | undefined),
    summary_snapshot: (v.summary_snapshot as string | undefined),
  };
}

export const versionsApi = {
  list: (documentId: string) =>
    api.get<Version[]>(`/api/v1/documents/${documentId}/versions`),

  get: async (documentId: string, versionId: string): Promise<Version> => {
    const raw = await api.get<unknown>(`/api/v1/documents/${documentId}/versions/${versionId}`);
    return adaptVersion(raw);
  },

  getLatest: async (documentId: string): Promise<Version> => {
    const raw = await api.get<unknown>(`/api/v1/documents/${documentId}/versions/latest`);
    return adaptVersion(raw);
  },

  create: (documentId: string, body?: { change_reason?: string }) =>
    api.post<Version>(`/api/v1/documents/${documentId}/versions`, body),

  saveDraft: (
    documentId: string,
    versionId: string,
    body: {
      title?: string;
      summary?: string;
      label?: string;
      change_summary?: string;
      nodes?: Array<{
        id?: string;
        node_type: string;
        order: number;
        parent_id?: string | null;
        title?: string;
        content?: string;
        metadata?: Record<string, unknown>;
      }>;
    }
  ) =>
    api.patch<Version>(
      `/api/v1/documents/${documentId}/versions/${versionId}/draft`,
      body
    ),
};
