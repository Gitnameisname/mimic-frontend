"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractionQueueApi = exports.extractionSchemasApi = exports.evaluationsApi = exports.goldenSetsApi = exports.agentActivityApi = exports.proposalsApi = exports.scopeProfilesApi = exports.agentsApi = exports.usageApi = exports.capabilitiesApi = exports.promptsApi = exports.providersApi = void 0;
const client_1 = require("./client");
const url_1 = require("@/lib/utils/url");
exports.providersApi = {
    list: () => client_1.api.get("/api/v1/admin/providers"),
    create: (body) => client_1.api.post("/api/v1/admin/providers", body),
    update: (id, body) => client_1.api.patch(`/api/v1/admin/providers/${id}`, body),
    delete: (id) => client_1.api.delete(`/api/v1/admin/providers/${id}`),
    test: (id) => client_1.api.post(`/api/v1/admin/providers/${id}/test`, {}),
    setDefault: (id, type) => client_1.api.post(`/api/v1/admin/providers/${id}/set-default`, { type }),
};
exports.promptsApi = {
    list: (params) => client_1.api.get(`/api/v1/admin/prompts${(0, url_1.toQueryString)(params ?? {})}`),
    get: (id) => client_1.api.get(`/api/v1/admin/prompts/${id}`),
    create: (body) => client_1.api.post("/api/v1/admin/prompts", body),
    newVersion: (id, body) => client_1.api.post(`/api/v1/admin/prompts/${id}/versions`, body),
    activateVersion: (id, versionId) => client_1.api.post(`/api/v1/admin/prompts/${id}/versions/${versionId}/activate`, {}),
    setABTest: (id, config) => client_1.api.patch(`/api/v1/admin/prompts/${id}/ab-test`, { ab_test_config: config }),
};
exports.capabilitiesApi = {
    get: () => client_1.api.get("/api/v1/admin/system/capabilities"),
};
exports.usageApi = {
    getDashboard: (params) => client_1.api.get(`/api/v1/admin/usage${(0, url_1.toQueryString)(params ?? {})}`),
    exportCsv: (params) => `/api/v1/admin/usage/export${(0, url_1.toQueryString)(params ?? {})}`,
};
// ── FG6.2: Agents & Scope ──
exports.agentsApi = {
    list: (params) => client_1.api.get(`/api/v1/admin/agents${(0, url_1.toQueryString)(params ?? {})}`),
    get: (id) => client_1.api.get(`/api/v1/admin/agents/${id}`),
    create: (body) => client_1.api.post("/api/v1/admin/agents", body),
    revokeDelegation: (agentId, userId) => client_1.api.delete(`/api/v1/admin/agents/${agentId}/delegations/${userId}`),
    block: (id, body) => client_1.api.post(`/api/v1/admin/agents/${id}/block`, body),
    unblock: (id) => client_1.api.post(`/api/v1/admin/agents/${id}/unblock`, {}),
    reissueApiKey: (id, body) => client_1.api.post(`/api/v1/admin/agents/${id}/api-keys`, body),
    getRateLimits: (id) => client_1.api.get(`/api/v1/admin/agents/${id}/rate-limits`),
    updateRateLimits: (id, limits) => client_1.api.patch(`/api/v1/admin/agents/${id}/rate-limits`, limits),
    getAuditHistory: (id, params) => client_1.api.get(`/api/v1/admin/agents/${id}/audit${(0, url_1.toQueryString)(params ?? {})}`),
};
exports.scopeProfilesApi = {
    list: (params) => client_1.api.get(`/api/v1/admin/scope-profiles${(0, url_1.toQueryString)(params ?? {})}`),
    get: (id) => client_1.api.get(`/api/v1/admin/scope-profiles/${id}`),
    create: (body) => client_1.api.post("/api/v1/admin/scope-profiles", body),
    /**
     * Scope Profile 수정. 백엔드는 PUT verb 를 사용 (전체 PATCH 시맨틱 — 명시되지 않은 필드는 미수정).
     * S3 Phase 3 FG 3-2 (2026-04-27): settings (expose_viewers 등) 부분 갱신 추가.
     */
    update: (id, body) => client_1.api.put(`/api/v1/admin/scope-profiles/${id}`, body),
    delete: (id) => client_1.api.delete(`/api/v1/admin/scope-profiles/${id}`),
    addScope: (id, scope) => client_1.api.post(`/api/v1/admin/scope-profiles/${id}/scopes`, scope),
    updateScope: (id, scopeName, scope) => client_1.api.patch(`/api/v1/admin/scope-profiles/${id}/scopes/${scopeName}`, scope),
    deleteScope: (id, scopeName) => client_1.api.delete(`/api/v1/admin/scope-profiles/${id}/scopes/${scopeName}`),
};
exports.proposalsApi = {
    list: (params) => client_1.api.get(`/api/v1/admin/proposals${(0, url_1.toQueryString)(params ?? {})}`),
    get: (id) => client_1.api.get(`/api/v1/admin/proposals/${id}`),
    approve: (id, feedback) => client_1.api.post(`/api/v1/admin/proposals/${id}/approve`, { feedback }),
    reject: (id, feedback) => client_1.api.post(`/api/v1/admin/proposals/${id}/reject`, { feedback }),
    batchApprove: (ids) => client_1.api.post("/api/v1/admin/proposals/batch-approve", { ids }),
    batchReject: (ids, feedback) => client_1.api.post("/api/v1/admin/proposals/batch-reject", { ids, feedback }),
    batchRollback: (ids, original_action) => client_1.api.post("/api/v1/admin/proposals/batch-rollback", { ids, original_action }),
};
exports.agentActivityApi = {
    getDashboard: (params) => client_1.api.get(`/api/v1/admin/agent-activity${(0, url_1.toQueryString)(params ?? {})}`),
};
// 경로 정정(2026-04-20): 백엔드 router.py L107 기준 prefix 는 `/golden-sets` 이며 admin 하위가 아님.
// 따라서 전체 호출부를 `/api/v1/golden-sets*` 로 교체한다.  ACL 은 scope_profile_id 바인딩으로 보장되므로
// admin 경로가 아니어도 S2 ⑥ 원칙은 유지된다.
exports.goldenSetsApi = {
    list: (params) => client_1.api.get(`/api/v1/golden-sets${(0, url_1.toQueryString)(params ?? {})}`),
    get: (id) => client_1.api.get(`/api/v1/golden-sets/${id}`),
    create: (body) => client_1.api.post("/api/v1/golden-sets", body),
    update: (id, body) => client_1.api.put(`/api/v1/golden-sets/${id}`, body),
    delete: (id) => client_1.api.delete(`/api/v1/golden-sets/${id}`),
    listItems: (id, params) => client_1.api.get(`/api/v1/golden-sets/${id}/items${(0, url_1.toQueryString)(params ?? {})}`),
    addItem: (id, body) => client_1.api.post(`/api/v1/golden-sets/${id}/items`, body),
    updateItem: (id, itemId, body) => client_1.api.put(`/api/v1/golden-sets/${id}/items/${itemId}`, body),
    deleteItem: (id, itemId) => client_1.api.delete(`/api/v1/golden-sets/${id}/items/${itemId}`),
    versions: (id) => client_1.api.get(`/api/v1/golden-sets/${id}/versions`),
    // Import/Export: FormData 기반 업로드 + JSON 다운로드
    // Export 는 같은 JSON API 계약(success_response) 으로 내려오므로 그대로 data 사용.
    exportJson: (id) => client_1.api.get(`/api/v1/golden-sets/${id}/export`),
    importJson: (id, file) => {
        // 주의: 백엔드는 application/json, text/json, text/plain MIME 만 수락하며 확장자도 .json 이어야 한다.
        const form = new FormData();
        form.append("file", file);
        return client_1.api.post(`/api/v1/golden-sets/${id}/import`, form);
    },
};
// Phase 7 FG7.2: 평가 실행 API.
// 경로는 /api/v1/evaluations (admin prefix 아님). ACL 은 ActorContext 의 scope_profile_id 로 보장.
exports.evaluationsApi = {
    listRuns: (params) => client_1.api.get(`/api/v1/evaluations${(0, url_1.toQueryString)(params ?? {})}`),
    get: (evalId) => client_1.api.get(`/api/v1/evaluations/${evalId}`),
    compare: (evalId1, evalId2) => client_1.api.get(`/api/v1/evaluations/${evalId1}/compare${(0, url_1.toQueryString)({ eval_id2: evalId2 })}`),
};
exports.extractionSchemasApi = {
    list: (params) => client_1.api.get(`/api/v1/extraction-schemas${(0, url_1.toQueryString)(params ?? {})}`),
    get: (docTypeCode, params) => client_1.api.get(`/api/v1/extraction-schemas/${encodeURIComponent(docTypeCode)}${(0, url_1.toQueryString)(params ?? {})}`),
    getVersions: (docTypeCode, params) => client_1.api.get(`/api/v1/extraction-schemas/${encodeURIComponent(docTypeCode)}/versions${(0, url_1.toQueryString)(params ?? {})}`),
    // P4-A: 서버 정본 버전 diff.
    // GET /extraction-schemas/{doc_type}/versions/diff?base_version=X&target_version=Y
    diffVersions: (docTypeCode, params) => client_1.api.get(`/api/v1/extraction-schemas/${encodeURIComponent(docTypeCode)}/versions/diff${(0, url_1.toQueryString)(params)}`),
    // P4-B: 특정 버전으로 되돌리기 (새 버전 생성).
    rollback: (docTypeCode, body) => client_1.api.post(`/api/v1/extraction-schemas/${encodeURIComponent(docTypeCode)}/rollback`, body),
    create: (body) => client_1.api.post("/api/v1/extraction-schemas", body),
    update: (docTypeCode, body) => client_1.api.put(`/api/v1/extraction-schemas/${encodeURIComponent(docTypeCode)}`, body),
    deprecate: (docTypeCode, reason) => client_1.api.patch(`/api/v1/extraction-schemas/${encodeURIComponent(docTypeCode)}/deprecate`, { reason }),
    delete: (docTypeCode) => client_1.api.delete(`/api/v1/extraction-schemas/${encodeURIComponent(docTypeCode)}`),
};
exports.extractionQueueApi = {
    /**
     * 추출 결과 목록.
     *
     * Q1-A5: `scope_profile_id` 는 S2 ⑥ 원칙(ACL 필터링 의무) 에 따라
     * 모든 조회 API 에 전달되어야 한다. 서버가 scope_profile_id 를 받아
     * 접근 가능한 문서의 추출 결과만 반환하도록 게이트한다.
     * 빈 문자열은 "전역 스코프(혹은 사용자 기본 스코프)" 로 취급.
     *
     * B 스코프(2026-04-22): 응답 타입을 envelope 에 맞춰 `ExtractionQueuePagedResponse`
     * 로 교체. 페이지네이션 total/has_next 가 표시된다.
     */
    list: (params) => client_1.api.get(`/api/v1/admin/extraction-results${(0, url_1.toQueryString)(params ?? {})}`),
    get: (id, params) => client_1.api.get(`/api/v1/admin/extraction-results/${id}${(0, url_1.toQueryString)(params ?? {})}`),
    approve: (id, body) => client_1.api.post(`/api/v1/admin/extraction-results/${id}/approve`, body ?? {}),
    reject: (id, reason) => client_1.api.post(`/api/v1/admin/extraction-results/${id}/reject`, { reason }),
};
