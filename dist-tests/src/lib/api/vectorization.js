"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vectorizationApi = void 0;
/**
 * FG 0-5 (2026-04-23) — 문서 벡터화 상태 + 재벡터화 API 클라이언트.
 *
 * 백엔드:
 *  - GET  /api/v1/vectorization/documents/{id}/status
 *  - POST /api/v1/vectorization/documents/{id}
 */
const client_1 = require("./client");
function unwrap(raw) {
    const r = raw;
    return (r.data ?? raw);
}
exports.vectorizationApi = {
    /** 문서 벡터화 상태 조회 — 인증 필요. 폐쇄망 안전 (Milvus off 시에도 동작). */
    getStatus: async (documentId) => {
        const raw = await client_1.api.get(`/api/v1/vectorization/documents/${documentId}/status`);
        return unwrap(raw);
    },
    /** 재벡터화 트리거 — Admin 또는 문서 작성자. 10초 쿨다운 (429 + Retry-After). */
    reindex: async (documentId) => {
        const raw = await client_1.api.post(`/api/v1/vectorization/documents/${documentId}`, {});
        return unwrap(raw);
    },
};
