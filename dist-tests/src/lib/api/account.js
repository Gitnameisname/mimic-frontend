"use strict";
/**
 * Account API 클라이언트 (Phase 14-7 → 14-8 AuthContext 통합).
 *
 * 계정 관리 관련 백엔드 API를 호출한다.
 * 프로필, 비밀번호 변경, OAuth 계정, 세션 관리.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountApi = void 0;
const AuthContext_1 = require("@/contexts/AuthContext");
const guards_1 = require("@/lib/utils/guards");
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8050";
// ─── API 헬퍼 ───
class AccountApiError extends Error {
    status;
    data;
    constructor(status, message, data) {
        super(message);
        this.status = status;
        this.data = data;
        this.name = "AccountApiError";
    }
}
async function accountRequest(path, options = {}) {
    const url = `${API_BASE}${path}`;
    // AuthContext 모듈 변수에서 AT 가져옴
    const at = (0, AuthContext_1.getAccessToken)();
    const res = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(at ? { Authorization: `Bearer ${at}` } : {}),
            ...options.headers,
        },
        credentials: "include",
    });
    if (!res.ok) {
        let data;
        try {
            data = await res.json();
        }
        catch {
            data = undefined;
        }
        const structured = data;
        let message = res.statusText;
        if (structured?.error?.message) {
            message = structured.error.message;
        }
        else if ((0, guards_1.isString)(structured?.detail)) {
            message = structured.detail;
        }
        else if (structured?.detail &&
            typeof structured.detail === "object" &&
            "errors" in structured.detail) {
            message = structured.detail.errors.join(", ");
        }
        throw new AccountApiError(res.status, message, data);
    }
    if (res.status === 204)
        return undefined;
    return res.json();
}
// ─── Account API ───
exports.accountApi = {
    /** 프로필 조회 */
    getProfile: () => accountRequest("/api/v1/account/profile"),
    /** 프로필 수정 */
    updateProfile: (body) => accountRequest("/api/v1/account/profile", {
        method: "PATCH",
        body: JSON.stringify(body),
    }),
    /** 비밀번호 변경 */
    changePassword: (body) => accountRequest("/api/v1/account/change-password", {
        method: "POST",
        body: JSON.stringify(body),
    }),
    /** 연결된 OAuth 계정 목록 */
    getOAuthAccounts: () => accountRequest("/api/v1/account/oauth-accounts"),
    /** GitLab 계정 연결 시작 */
    linkGitLab: () => accountRequest("/api/v1/account/oauth-accounts/gitlab/link", {
        method: "POST",
    }),
    /** GitLab 계정 해제 */
    unlinkGitLab: () => accountRequest("/api/v1/account/oauth-accounts/gitlab/unlink", {
        method: "DELETE",
    }),
    /** 활성 세션 목록 */
    getSessions: () => accountRequest("/api/v1/account/sessions"),
    /** 세션 강제 종료 */
    revokeSession: (sessionId) => accountRequest(`/api/v1/account/sessions/${sessionId}`, {
        method: "DELETE",
    }),
    /**
     * 사용자 선호 조회 (Phase 1 FG 1-3).
     * 빈 선호 상태면 빈 객체 형태로 응답.
     */
    getPreferences: () => accountRequest("/api/v1/account/preferences"),
    /**
     * 사용자 선호 partial update.
     * 키를 명시적 ``null`` 로 보내면 해당 키 삭제 (서버 shallow merge).
     */
    updatePreferences: (body) => accountRequest("/api/v1/account/preferences", {
        method: "PATCH",
        body: JSON.stringify(body),
    }),
};
