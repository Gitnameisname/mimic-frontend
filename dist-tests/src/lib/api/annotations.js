"use strict";
/**
 * Annotations + Notifications API 클라이언트 — S3 Phase 3 FG 3-3.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsApi = exports.annotationsApi = void 0;
const client_1 = require("./client");
const url_1 = require("@/lib/utils/url");
function unwrap(raw) {
    const r = raw;
    if (r && typeof r === "object" && "data" in r)
        return r.data;
    return raw;
}
function unwrapList(raw) {
    const r = raw;
    if (r && typeof r === "object" && Array.isArray(r.data))
        return r.data;
    return Array.isArray(raw) ? raw : [];
}
exports.annotationsApi = {
    /** 문서의 주석 목록 */
    list: async (documentId, params = {}) => {
        const qs = (0, url_1.toQueryString)({
            include_resolved: params.include_resolved,
            include_orphans: params.include_orphans,
            limit: params.limit,
        });
        const raw = await client_1.api.get(`/api/v1/documents/${documentId}/annotations${qs}`);
        return unwrapList(raw);
    },
    /** 주석 단건 */
    get: async (annotationId) => {
        const raw = await client_1.api.get(`/api/v1/annotations/${annotationId}`);
        return unwrap(raw);
    },
    /** 신규 주석 또는 답글 */
    create: async (documentId, body) => {
        const raw = await client_1.api.post(`/api/v1/documents/${documentId}/annotations`, body);
        return unwrap(raw);
    },
    /** 본문 수정 (작성자 본인만) */
    update: async (annotationId, content) => {
        const raw = await client_1.api.patch(`/api/v1/annotations/${annotationId}`, { content });
        return unwrap(raw);
    },
    /** 해결 (작성자 또는 admin) */
    resolve: async (annotationId) => {
        const raw = await client_1.api.post(`/api/v1/annotations/${annotationId}/resolve`, {});
        return unwrap(raw);
    },
    /** 재오픈 */
    reopen: async (annotationId) => {
        const raw = await client_1.api.post(`/api/v1/annotations/${annotationId}/reopen`, {});
        return unwrap(raw);
    },
    /** 삭제 (cascade 답글) */
    delete: async (annotationId) => {
        await client_1.api.delete(`/api/v1/annotations/${annotationId}`);
    },
};
exports.notificationsApi = {
    list: async (params = {}) => {
        const qs = (0, url_1.toQueryString)({
            unread_only: params.unread_only,
            limit: params.limit,
        });
        const raw = await client_1.api.get(`/api/v1/notifications${qs}`);
        return unwrapList(raw);
    },
    unreadCount: async () => {
        const raw = await client_1.api.get(`/api/v1/notifications/unread-count`);
        const data = unwrap(raw);
        return data?.unread_count ?? 0;
    },
    markRead: async (ids) => {
        const raw = await client_1.api.post(`/api/v1/notifications/read`, { ids });
        const data = unwrap(raw);
        return data?.marked_read ?? 0;
    },
};
