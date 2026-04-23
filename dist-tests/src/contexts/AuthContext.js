"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports._refreshPromise = void 0;
exports.getAccessToken = getAccessToken;
exports.AuthProvider = AuthProvider;
exports.useAuth = useAuth;
exports.attemptSilentRefreshForInterceptor = attemptSilentRefreshForInterceptor;
const jsx_runtime_1 = require("react/jsx-runtime");
/**
 * AuthContext — 프론트엔드 인증 상태 관리 (Phase 14-8).
 *
 * 책임:
 *  - Access Token 메모리 저장 및 관리
 *  - 앱 마운트 시 silent refresh (RT Cookie → AT 갱신)
 *  - AT 만료 5분 전 자동 갱신 타이머
 *  - 로그인/로그아웃 액션
 *  - 인증 상태(user, isAuthenticated, isLoading) 제공
 *
 * 보안 원칙:
 *  - AT는 메모리(모듈 변수)에만 저장 — localStorage/sessionStorage 금지
 *  - RT는 HttpOnly Cookie로만 전송 (JS 접근 불가)
 *  - 동시 다발 401 시 refresh 1회만 실행 (큐잉)
 */
const react_1 = require("react");
const useAuthz_1 = require("@/hooks/useAuthz");
// ─── 역할 계층 (authorization.py와 동기화) ───
const ROLE_HIERARCHY = [
    "VIEWER",
    "AUTHOR",
    "REVIEWER",
    "APPROVER",
    "ORG_ADMIN",
    "SUPER_ADMIN",
];
// ─── 모듈 수준 AT 저장 (API 인터셉터에서 접근) ───
let _accessToken = null;
function getAccessToken() {
    return _accessToken;
}
function setAccessToken(token) {
    _accessToken = token;
}
// ─── Refresh 큐잉 (동시 401 → 1회만 refresh) ───
let _refreshPromise = null;
exports._refreshPromise = _refreshPromise;
// ─── API 상수 ───
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8050";
// ─── Reducer ───
const initialState = {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isLoading: true,
};
function authReducer(state, action) {
    switch (action.type) {
        case "LOGIN_SUCCESS":
            return {
                user: action.payload.user,
                accessToken: action.payload.accessToken,
                isAuthenticated: true,
                isLoading: false,
            };
        case "LOGOUT":
            return {
                user: null,
                accessToken: null,
                isAuthenticated: false,
                isLoading: false,
            };
        case "TOKEN_REFRESHED":
            return {
                ...state,
                accessToken: action.payload.accessToken,
            };
        case "SET_LOADING":
            return {
                ...state,
                isLoading: action.payload,
            };
        default:
            return state;
    }
}
// ─── Context ───
const AuthContext = (0, react_1.createContext)(null);
// ─── Provider ───
function AuthProvider({ children }) {
    const [state, dispatch] = (0, react_1.useReducer)(authReducer, initialState);
    const refreshTimerRef = (0, react_1.useRef)(null);
    // ─── 프로필 조회 ───
    const fetchProfile = (0, react_1.useCallback)(async (at) => {
        try {
            const res = await fetch(`${API_BASE}/api/v1/account/profile`, {
                headers: { Authorization: `Bearer ${at}` },
                credentials: "include",
            });
            if (!res.ok)
                return null;
            const json = await res.json();
            return json.data ?? null;
        }
        catch {
            return null;
        }
    }, []);
    // ─── Silent Refresh ───
    const attemptSilentRefresh = (0, react_1.useCallback)(async () => {
        // 큐잉: 이미 진행 중이면 기존 Promise 재사용
        if (_refreshPromise)
            return _refreshPromise;
        exports._refreshPromise = _refreshPromise = (async () => {
            try {
                const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
                    method: "POST",
                    credentials: "include",
                });
                if (!res.ok)
                    return false;
                const json = await res.json();
                const at = json.data?.access_token;
                if (!at)
                    return false;
                setAccessToken(at);
                dispatch({ type: "TOKEN_REFRESHED", payload: { accessToken: at } });
                // 프로필 조회
                const profile = await fetchProfile(at);
                if (profile) {
                    dispatch({ type: "LOGIN_SUCCESS", payload: { user: profile, accessToken: at } });
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    useAuthz_1.useAuthzStore.getState().setRole(profile.role_name);
                    useAuthz_1.useAuthzStore.getState().setActorId(profile.id);
                    return true;
                }
                return false;
            }
            catch {
                return false;
            }
            finally {
                exports._refreshPromise = _refreshPromise = null;
            }
        })();
        return _refreshPromise;
    }, [fetchProfile]);
    // ─── 토큰 갱신 스케줄링 (만료 5분 전) ───
    const scheduleTokenRefresh = (0, react_1.useCallback)((at) => {
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
        }
        try {
            const parts = at.split(".");
            if (parts.length !== 3)
                return;
            // JWT payload 는 base64url 인코딩이므로 atob 호출 전 변환 필요
            // (atob 은 표준 base64 만 허용 — `-`/`_` 포함 시 예외 발생)
            const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
            const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
            const payload = JSON.parse(atob(b64 + pad));
            const expiresAt = payload.exp * 1000;
            const refreshAt = expiresAt - 5 * 60 * 1000; // 5분 전
            const delay = Math.max(refreshAt - Date.now(), 0);
            refreshTimerRef.current = setTimeout(() => {
                attemptSilentRefresh();
            }, delay);
        }
        catch {
            // JWT 디코딩 실패 → 무시
        }
    }, [attemptSilentRefresh]);
    // ─── 앱 마운트 시 silent refresh ───
    (0, react_1.useEffect)(() => {
        let cancelled = false;
        (async () => {
            const ok = await attemptSilentRefresh();
            if (!cancelled && !ok) {
                dispatch({ type: "SET_LOADING", payload: false });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [attemptSilentRefresh]);
    // ─── AT 변경 시 갱신 타이머 ───
    (0, react_1.useEffect)(() => {
        if (state.accessToken) {
            scheduleTokenRefresh(state.accessToken);
        }
        return () => {
            if (refreshTimerRef.current) {
                clearTimeout(refreshTimerRef.current);
            }
        };
    }, [state.accessToken, scheduleTokenRefresh]);
    // ─── 로그인 ───
    const login = (0, react_1.useCallback)(async (identifier, password) => {
        const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier, password }),
            credentials: "include",
        });
        if (!res.ok) {
            const data = await res.json().catch(() => null);
            const msg = data?.error?.message ?? data?.detail ?? "로그인에 실패했습니다";
            throw new Error(msg);
        }
        const json = await res.json();
        const at = json.data?.access_token;
        if (!at)
            throw new Error("토큰을 받지 못했습니다");
        setAccessToken(at);
        const profile = await fetchProfile(at);
        if (!profile)
            throw new Error("프로필을 불러올 수 없습니다");
        dispatch({ type: "LOGIN_SUCCESS", payload: { user: profile, accessToken: at } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useAuthz_1.useAuthzStore.getState().setRole(profile.role_name);
        useAuthz_1.useAuthzStore.getState().setActorId(profile.id);
    }, [fetchProfile]);
    // ─── GitLab 로그인 ───
    const loginWithGitLab = (0, react_1.useCallback)(() => {
        window.location.href = `${API_BASE}/api/v1/auth/oauth/gitlab`;
    }, []);
    // ─── OAuth 콜백 처리 ───
    const handleOAuthCallback = (0, react_1.useCallback)(async (at) => {
        setAccessToken(at);
        const profile = await fetchProfile(at);
        if (!profile)
            throw new Error("프로필을 불러올 수 없습니다");
        dispatch({ type: "LOGIN_SUCCESS", payload: { user: profile, accessToken: at } });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useAuthz_1.useAuthzStore.getState().setRole(profile.role_name);
        useAuthz_1.useAuthzStore.getState().setActorId(profile.id);
    }, [fetchProfile]);
    // ─── 로그아웃 ───
    const logout = (0, react_1.useCallback)(async () => {
        try {
            await fetch(`${API_BASE}/api/v1/auth/logout`, {
                method: "POST",
                credentials: "include",
            });
        }
        catch {
            // 무시 — 로그아웃은 항상 성공 처리
        }
        setAccessToken(null);
        dispatch({ type: "LOGOUT" });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        useAuthz_1.useAuthzStore.getState().setRole("VIEWER");
        useAuthz_1.useAuthzStore.getState().setActorId("");
    }, []);
    // ─── 역할 확인 ───
    const hasRole = (0, react_1.useCallback)((role) => state.user?.role_name === role, [state.user]);
    const hasMinimumRole = (0, react_1.useCallback)((requiredRole) => {
        if (!state.user)
            return false;
        const userIdx = ROLE_HIERARCHY.indexOf(state.user.role_name);
        const reqIdx = ROLE_HIERARCHY.indexOf(requiredRole);
        if (userIdx === -1 || reqIdx === -1)
            return false;
        return userIdx >= reqIdx;
    }, [state.user]);
    // ─── Context value (memoized) ───
    const value = (0, react_1.useMemo)(() => ({
        ...state,
        login,
        loginWithGitLab,
        logout,
        handleOAuthCallback,
        hasRole,
        hasMinimumRole,
    }), [state, login, loginWithGitLab, logout, handleOAuthCallback, hasRole, hasMinimumRole]);
    return (0, jsx_runtime_1.jsx)(AuthContext.Provider, { value: value, children: children });
}
// ─── 훅 ───
function useAuth() {
    const ctx = (0, react_1.useContext)(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return ctx;
}
async function attemptSilentRefreshForInterceptor() {
    if (_refreshPromise)
        return _refreshPromise;
    exports._refreshPromise = _refreshPromise = (async () => {
        try {
            const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
                method: "POST",
                credentials: "include",
            });
            if (!res.ok)
                return false;
            const json = await res.json();
            const at = json.data?.access_token;
            if (!at)
                return false;
            setAccessToken(at);
            return true;
        }
        catch {
            return false;
        }
        finally {
            exports._refreshPromise = _refreshPromise = null;
        }
    })();
    return _refreshPromise;
}
