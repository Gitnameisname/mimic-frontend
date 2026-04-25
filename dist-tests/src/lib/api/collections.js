"use strict";
/**
 * Collections API 클라이언트 — S3 Phase 2 FG 2-1.
 *
 * 백엔드 라우터 `/api/v1/collections` 의 thin wrapper.
 * 응답 envelope `{ data, meta }` 는 `.data` 필드를 꺼내 반환한다.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectionsApi = void 0;
const url_1 = require("@/lib/utils/url");
const client_1 = require("./client");
function unwrap(raw) {
    const r = raw;
    if (r && typeof r === "object" && "data" in r)
        return r.data;
    return raw;
}
function unwrapList(raw) {
    const r = raw;
    if (r && typeof r === "object" && Array.isArray(r.data)) {
        return { items: r.data, total: r.meta?.total ?? r.data.length };
    }
    const arr = raw;
    return { items: Array.isArray(arr) ? arr : [], total: Array.isArray(arr) ? arr.length : 0 };
}
exports.collectionsApi = {
    list: async (params = {}) => {
        const path = `/api/v1/collections${(0, url_1.toQueryString)({
            limit: params.limit,
            offset: params.offset,
        })}`;
        const raw = await client_1.api.get(path);
        return unwrapList(raw);
    },
    get: async (id) => {
        const raw = await client_1.api.get(`/api/v1/collections/${id}`);
        return unwrap(raw);
    },
    create: async (body) => {
        const raw = await client_1.api.post("/api/v1/collections", body);
        return unwrap(raw);
    },
    update: async (id, body) => {
        const raw = await client_1.api.patch(`/api/v1/collections/${id}`, body);
        return unwrap(raw);
    },
    delete: async (id) => {
        await client_1.api.delete(`/api/v1/collections/${id}`);
    },
    addDocuments: async (id, documentIds) => {
        const raw = await client_1.api.post(`/api/v1/collections/${id}/documents`, { document_ids: documentIds });
        return unwrap(raw);
    },
    removeDocument: async (id, documentId) => {
        await client_1.api.delete(`/api/v1/collections/${id}/documents/${documentId}`);
    },
    listDocumentIds: async (id) => {
        const raw = await client_1.api.get(`/api/v1/collections/${id}/documents`);
        return unwrap(raw);
    },
};
