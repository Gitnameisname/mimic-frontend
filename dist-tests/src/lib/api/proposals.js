"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proposalsApi = void 0;
const url_1 = require("@/lib/utils/url");
const client_1 = require("./client");
function extractData(raw) {
    const r = raw;
    return (r.data ?? raw);
}
exports.proposalsApi = {
    // 내 문서의 에이전트 제안 목록 (일반 사용자)
    listMine: async (params) => {
        // 기존 시맨틱 보존: page=0 / page_size=0 도 truthy-skip 했으므로 || undefined 로 좁힌다.
        const path = `/api/v1/my/proposals${(0, url_1.toQueryString)({
            status: params?.status,
            page: params?.page || undefined,
            page_size: params?.page_size || undefined,
        })}`;
        const raw = await client_1.api.get(path);
        return extractData(raw);
    },
    // 제안 상세 (Admin)
    getAdmin: async (proposalId) => {
        const raw = await client_1.api.get(`/api/v1/admin/proposals/${proposalId}`);
        return extractData(raw);
    },
    // 제안 목록 (Admin)
    listAdmin: async (params) => {
        // 기존 시맨틱 보존: page=0 / page_size=0 도 truthy-skip.
        const path = `/api/v1/admin/proposals${(0, url_1.toQueryString)({
            status: params?.status,
            agent_id: params?.agent_id,
            proposal_type: params?.proposal_type,
            page: params?.page || undefined,
            page_size: params?.page_size || undefined,
        })}`;
        const raw = await client_1.api.get(path);
        return extractData(raw);
    },
    // 통계 (Admin)
    statsAdmin: async (agentId) => {
        // 기존 시맨틱: agentId 가 falsy 면 ? 자체를 omit.
        // toQueryString 도 undefined/"" 를 omit 하고 모두 omit 시 "" 를 반환.
        const path = `/api/v1/admin/proposals/stats${(0, url_1.toQueryString)({ agent_id: agentId })}`;
        const raw = await client_1.api.get(path);
        return extractData(raw);
    },
    // Draft 승인
    approveDraft: (draftId, body) => client_1.api.post(`/api/v1/drafts/${draftId}/approve`, body ?? {}),
    // Draft 반려
    rejectDraft: (draftId, body) => client_1.api.post(`/api/v1/drafts/${draftId}/reject`, body),
};
