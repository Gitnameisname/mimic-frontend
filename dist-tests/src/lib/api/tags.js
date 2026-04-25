"use strict";
/**
 * Tags API 클라이언트 — S3 Phase 2 FG 2-2.
 *
 * 백엔드 `/api/v1/tags` wrapper.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagsApi = void 0;
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
    return {
        items: Array.isArray(arr) ? arr : [],
        total: Array.isArray(arr) ? arr.length : 0,
    };
}
exports.tagsApi = {
    autocomplete: async (params = {}) => {
        // q 가 빈 문자열일 때는 omit (toQueryString 시맨틱).
        const path = `/api/v1/tags${(0, url_1.toQueryString)({ q: params.q, limit: params.limit })}`;
        const raw = await client_1.api.get(path);
        return unwrapList(raw);
    },
    popular: async (params = {}) => {
        const path = `/api/v1/tags/popular${(0, url_1.toQueryString)({
            limit: params.limit,
            min_usage: params.min_usage,
        })}`;
        const raw = await client_1.api.get(path);
        return unwrapList(raw);
    },
    delete: async (id) => {
        await client_1.api.delete(`/api/v1/tags/${id}`);
    },
};
