import { api } from "./client";
import type { ProseMirrorDoc, Version, WorkflowStatus } from "@/types";

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
    // Phase 1 FG 1-1: 버전 상세(include_content=true) 응답에 포함.
    // getLatest 기본 응답에는 없을 수 있으므로 호출자는 undefined 가드 필요.
    content_snapshot: v.content_snapshot as ProseMirrorDoc | undefined,
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

  /**
   * Draft 저장 (Phase 1 FG 1-1 단일 정본 경로).
   *
   * - 메서드: PUT /api/v1/documents/{id}/draft
   * - 바디의 ``content_snapshot`` 은 ProseMirror doc (``{type:"doc", content:[...]}``).
   * - 서버는 content_snapshot 을 저장한 뒤 nodes 테이블을 자동 파생 동기화한다.
   */
  saveDraft: (
    documentId: string,
    body: {
      title?: string;
      summary?: string;
      label?: string;
      change_summary?: string;
      content_snapshot: ProseMirrorDoc;
    }
  ) => api.put<Version>(`/api/v1/documents/${documentId}/draft`, body),

  /**
   * @deprecated Phase 1 FG 1-1 에서 서버 측 PATCH 엔드포인트가 deprecated 되었다.
   *   ``saveDraft`` (PUT + content_snapshot) 을 사용하라. 본 클라이언트 메서드는
   *   과도기 호환 테스트 용도로만 남겨두며, FG 1-2 종료 시 삭제 예정.
   */
  saveDraftNodes: (
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
