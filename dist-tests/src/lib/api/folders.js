"use strict";
/**
 * Folders API 클라이언트 — S3 Phase 2 FG 2-1.
 *
 * 백엔드 `/api/v1/folders` + `/api/v1/documents/{id}/folder` 의 wrapper.
 * 응답 envelope `{ data, meta }` 는 data 만 꺼내 반환.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.foldersApi = void 0;
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
exports.foldersApi = {
    list: async () => {
        const raw = await client_1.api.get("/api/v1/folders");
        return unwrapList(raw);
    },
    get: async (id) => {
        const raw = await client_1.api.get(`/api/v1/folders/${id}`);
        return unwrap(raw);
    },
    create: async (body) => {
        const raw = await client_1.api.post("/api/v1/folders", body);
        return unwrap(raw);
    },
    rename: async (id, newName) => {
        const raw = await client_1.api.patch(`/api/v1/folders/${id}`, { name: newName });
        return unwrap(raw);
    },
    move: async (id, body) => {
        const raw = await client_1.api.post(`/api/v1/folders/${id}/move`, body);
        return unwrap(raw);
    },
    delete: async (id) => {
        await client_1.api.delete(`/api/v1/folders/${id}`);
    },
    setDocumentFolder: async (documentId, folderId) => {
        await client_1.api.put(`/api/v1/documents/${documentId}/folder`, {
            folder_id: folderId,
        });
    },
};
