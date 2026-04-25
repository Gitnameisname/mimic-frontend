"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.versionsApi = void 0;
const client_1 = require("./client");
// 백엔드 version status (소문자) → 프론트엔드 WorkflowStatus 매핑
const VERSION_STATUS_TO_WORKFLOW = {
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
function adaptVersion(raw) {
    const envelope = raw;
    const v = envelope.data ?? raw;
    const rawWorkflow = (v.workflow_status ?? v.status);
    const workflowStatus = VERSION_STATUS_TO_WORKFLOW[rawWorkflow?.toLowerCase() ?? ""] ?? "DRAFT";
    return {
        id: v.id,
        document_id: v.document_id,
        version_number: String(v.version_number ?? ""),
        workflow_status: workflowStatus,
        created_by: v.created_by ?? "",
        created_by_name: v.created_by ?? "",
        created_at: v.created_at,
        updated_at: (v.published_at ?? v.created_at),
        change_reason: v.change_summary,
        metadata: v.metadata,
        title_snapshot: v.title_snapshot,
        summary_snapshot: v.summary_snapshot,
        // Phase 1 FG 1-1: 버전 상세(include_content=true) 응답에 포함.
        // getLatest 기본 응답에는 없을 수 있으므로 호출자는 undefined 가드 필요.
        content_snapshot: v.content_snapshot,
    };
}
exports.versionsApi = {
    list: (documentId) => client_1.api.get(`/api/v1/documents/${documentId}/versions`),
    get: async (documentId, versionId) => {
        const raw = await client_1.api.get(`/api/v1/documents/${documentId}/versions/${versionId}`);
        return adaptVersion(raw);
    },
    getLatest: async (documentId) => {
        const raw = await client_1.api.get(`/api/v1/documents/${documentId}/versions/latest`);
        return adaptVersion(raw);
    },
    create: (documentId, body) => client_1.api.post(`/api/v1/documents/${documentId}/versions`, body),
    /**
     * Draft 저장 (Phase 1 FG 1-1 단일 정본 경로).
     *
     * - 메서드: PUT /api/v1/documents/{id}/draft
     * - 바디의 ``content_snapshot`` 은 ProseMirror doc (``{type:"doc", content:[...]}``).
     * - 서버는 content_snapshot 을 저장한 뒤 nodes 테이블을 자동 파생 동기화한다.
     */
    saveDraft: (documentId, body) => client_1.api.put(`/api/v1/documents/${documentId}/draft`, body),
    /**
     * @deprecated Phase 1 FG 1-1 에서 서버 측 PATCH 엔드포인트가 deprecated 되었다.
     *   ``saveDraft`` (PUT + content_snapshot) 을 사용하라. 본 클라이언트 메서드는
     *   과도기 호환 테스트 용도로만 남겨두며, FG 1-2 종료 시 삭제 예정.
     */
    saveDraftNodes: (documentId, versionId, body) => client_1.api.patch(`/api/v1/documents/${documentId}/versions/${versionId}/draft`, body),
};
