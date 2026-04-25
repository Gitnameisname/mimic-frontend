"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowApi = void 0;
const client_1 = require("./client");
function isWorkflowHistoryItem(v) {
    return typeof v === "object" && v !== null && "action" in v && "actor_id" in v;
}
function isReviewActionItem(v) {
    return typeof v === "object" && v !== null && "id" in v;
}
const base = (docId, verId) => `/api/v1/documents/${docId}/versions/${verId}/workflow`;
exports.workflowApi = {
    submitReview: (docId, verId, body) => client_1.api.post(`${base(docId, verId)}/submit-review`, body),
    approve: (docId, verId, body) => client_1.api.post(`${base(docId, verId)}/approve`, body),
    reject: (docId, verId, body) => client_1.api.post(`${base(docId, verId)}/reject`, body),
    publish: (docId, verId) => client_1.api.post(`${base(docId, verId)}/publish`),
    archive: (docId, verId) => client_1.api.post(`${base(docId, verId)}/archive`),
    returnToDraft: (docId, verId, body) => client_1.api.post(`${base(docId, verId)}/return-to-draft`, body),
    getHistory: async (docId, verId) => {
        const raw = await client_1.api.get(`${base(docId, verId)}/history`);
        const r = raw;
        const items = r.data ?? raw;
        if (!Array.isArray(items))
            return [];
        return items.filter(isWorkflowHistoryItem);
    },
    getReviewActions: async (docId, verId) => {
        const raw = await client_1.api.get(`${base(docId, verId)}/review-actions`);
        const r = raw;
        const items = r.data ?? raw;
        if (!Array.isArray(items))
            return [];
        return items.filter(isReviewActionItem);
    },
};
