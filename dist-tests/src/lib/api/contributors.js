"use strict";
/**
 * Contributors API 클라이언트 — S3 Phase 3 FG 3-1.
 *
 * 백엔드 `GET /api/v1/documents/{id}/contributors` wrapper.
 * 응답 envelope `{ data, meta }` 의 data 만 꺼내 반환.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.contributorsApi = void 0;
const client_1 = require("./client");
const url_1 = require("@/lib/utils/url");
function unwrap(raw) {
    const r = raw;
    if (r && typeof r === "object" && "data" in r)
        return r.data;
    return raw;
}
exports.contributorsApi = {
    /**
     * 문서 contributors 4 카테고리 묶음 조회.
     *
     * - viewer 가 문서를 못 보면 404.
     * - viewers 섹션은 응답 키 자체가 없을 수 있음 (정책 게이트 또는 include_viewers=false).
     */
    get: async (documentId, params = {}) => {
        const qs = (0, url_1.toQueryString)({
            since: params.since,
            include_viewers: params.include_viewers,
            limit_per_section: params.limit_per_section,
        });
        const raw = await client_1.api.get(`/api/v1/documents/${documentId}/contributors${qs}`);
        return unwrap(raw);
    },
};
