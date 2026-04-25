"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diffApi = void 0;
const url_1 = require("@/lib/utils/url");
const client_1 = require("./client");
function wrap(response) {
    return response.data;
}
exports.diffApi = {
    /** 두 버전 간 전체 diff */
    getBetweenVersions: (documentId, v1Id, v2Id, options) => {
        // 기존 시맨틱 보존: truthy 일 때만 emit (false/omit 둘 다 backend 기본값에 위임).
        const qs = (0, url_1.toQueryString)({
            inline_diff: options?.inline_diff || undefined,
            include_unchanged: options?.include_unchanged || undefined,
        });
        return client_1.api
            .get(`/api/v1/documents/${documentId}/versions/${v1Id}/diff/${v2Id}${qs}`)
            .then(wrap);
    },
    /** 직전 버전 대비 전체 diff */
    getWithPrevious: (documentId, versionId, options) => {
        const qs = (0, url_1.toQueryString)({ inline_diff: options?.inline_diff || undefined });
        return client_1.api
            .get(`/api/v1/documents/${documentId}/versions/${versionId}/diff${qs}`)
            .then(wrap);
    },
    /** 두 버전 간 변경 요약 (경량) */
    getSummaryBetween: (documentId, v1Id, v2Id) => client_1.api
        .get(`/api/v1/documents/${documentId}/versions/${v1Id}/diff/${v2Id}/summary`)
        .then(wrap),
    /** 직전 버전 대비 변경 요약 (경량) */
    getSummaryWithPrevious: (documentId, versionId) => client_1.api
        .get(`/api/v1/documents/${documentId}/versions/${versionId}/diff/summary`)
        .then(wrap),
};
