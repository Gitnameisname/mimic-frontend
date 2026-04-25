"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodesApi = void 0;
const client_1 = require("./client");
function isDocumentNode(v) {
    return typeof v === "object" && v !== null && "id" in v && "node_type" in v;
}
// 백엔드 경로: GET /api/v1/versions/{version_id}/nodes
function adaptNodes(raw) {
    const r = raw;
    const items = r.data ?? raw;
    if (!Array.isArray(items))
        return [];
    return items.filter(isDocumentNode);
}
exports.nodesApi = {
    // version_id 기반 노드 목록 조회 (백엔드 실제 경로)
    list: async (versionId) => {
        const raw = await client_1.api.get(`/api/v1/versions/${versionId}/nodes`);
        return adaptNodes(raw);
    },
    listByVersion: async (documentId, versionId) => {
        const raw = await client_1.api.get(`/api/v1/versions/${versionId}/nodes`);
        return adaptNodes(raw);
    },
};
