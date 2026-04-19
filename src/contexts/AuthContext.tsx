"use client";

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

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";

// ─── 타입 ───

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  auth_provider: string;
  email_verified: boolean;
  role_name: string;
  has_password: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: "LOGIN_SUCCESS"; payload: { user: AuthUser; accessToken: string } }
  | { type: "LOGOUT" }
  | { type: "TOKEN_REFRESHED"; payload: { accessToken: string } }
  | { type: "SET_LOADING"; payload: boolean };

interface AuthContextValue extends AuthState {
  /** 이메일 또는 아이디(username) 로 로그인 */
  login: (identifier: string, password: string) => Promise<void>;
  loginWithGitLab: () => void;
  logout: () => Promise<void>;
  handleOAuthCallback: (accessToken: string) => Promise<void>;
  hasRole: (requiredRole: string) => boolean;
  hasMinimumRole: (requiredRole: string) => boolean;
}

// ─── 역할 계층 (authorization.py와 동기화) ───

const ROLE_HIERARCHY = [
  "VIEWER",
  "AUTHOR",
  "REVIEWER",
  "APPROVER",
  "ORG_ADMIN",
  "SUPER_ADMIN",
] as const;

// ─── 모듈 수준 AT 저장 (API 인터셉터에서 접근) ───

let _accessToken: string | null = null;

export function getAccessToken(): string | null {
  return _accessToken;
}

function setAccessToken(token: string | null) {
  _accessToken = token;
}

// ─── Refresh 큐잉 (동시 401 → 1회만 refresh) ───

let _refreshPromise: Promise<boolean> | null = null;

// ─── API 상수 ───

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8050";

// ─── Reducer ───

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
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

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ───

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── 프로필 조회 ───
  const fetchProfile = useCallback(async (at: string): Promise<AuthUser | null> => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/account/profile`, {
        headers: { Authorization: `Bearer ${at}` },
        credentials: "include",
      });
      if (!res.ok) return null;
      const json = await res.json();
      return json.data ?? null;
    } catch {
      return null;
    }
  }, []);

  // ─── Silent Refresh ───
  const attemptSilentRefresh = useCallback(async (): Promise<boolean> => {
    // 큐잉: 이미 진행 중이면 기존 Promise 재사용
    if (_refreshPromise) return _refreshPromise;

    _refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) return false;

        const json = await res.json();
        const at = json.data?.access_token;
        if (!at) return false;

        setAccessToken(at);
        dispatch({ type: "TOKEN_REFRESHED", payload: { accessToken: at } });

        // 프로필 조회
        const profile = await fetchProfile(at);
        if (profile) {
          dispatch({ type: "LOGIN_SUCCESS", payload: { user: profile, accessToken: at } });
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        _refreshPromise = null;
      }
    })();

    return _refreshPromise;
  }, [fetchProfile]);

  // ─── 토큰 갱신 스케줄링 (만료 5분 전) ───
  const scheduleTokenRefresh = useCallback(
    (at: string) => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      try {
        const parts = at.split(".");
        if (parts.length !== 3) return;
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
      } catch {
        // JWT 디코딩 실패 → 무시
      }
    },
    [attemptSilentRefresh],
  );

  // ─── 앱 마운트 시 silent refresh ───
  useEffect(() => {
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
  useEffect(() => {
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
  const login = useCallback(
    async (identifier: string, password: string) => {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg =
          data?.error?.message ?? data?.detail ?? "로그인에 실패했습니다";
        throw new Error(msg);
      }

      const json = await res.json();
      const at = json.data?.access_token;
      if (!at) throw new Error("토큰을 받지 못했습니다");

      setAccessToken(at);

      const profile = await fetchProfile(at);
      if (!profile) throw new Error("프로필을 불러올 수 없습니다");

      dispatch({ type: "LOGIN_SUCCESS", payload: { user: profile, accessToken: at } });
    },
    [fetchProfile],
  );

  // ─── GitLab 로그인 ───
  const loginWithGitLab = useCallback(() => {
    window.location.href = `${API_BASE}/api/v1/auth/oauth/gitlab`;
  }, []);

  // ─── OAuth 콜백 처리 ───
  const handleOAuthCallback = useCallback(
    async (at: string) => {
      setAccessToken(at);

      const profile = await fetchProfile(at);
      if (!profile) throw new Error("프로필을 불러올 수 없습니다");

      dispatch({ type: "LOGIN_SUCCESS", payload: { user: profile, accessToken: at } });
    },
    [fetchProfile],
  );

  // ─── 로그아웃 ───
  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/v1/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // 무시 — 로그아웃은 항상 성공 처리
    }
    setAccessToken(null);
    dispatch({ type: "LOGOUT" });
  }, []);

  // ─── 역할 확인 ───
  const hasRole = useCallback(
    (role: string) => state.user?.role_name === role,
    [state.user],
  );

  const hasMinimumRole = useCallback(
    (requiredRole: string) => {
      if (!state.user) return false;
      const userIdx = ROLE_HIERARCHY.indexOf(
        state.user.role_name as (typeof ROLE_HIERARCHY)[number],
      );
      const reqIdx = ROLE_HIERARCHY.indexOf(
        requiredRole as (typeof ROLE_HIERARCHY)[number],
      );
      if (userIdx === -1 || reqIdx === -1) return false;
      return userIdx >= reqIdx;
    },
    [state.user],
  );

  // ─── Context value (memoized) ───
  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      loginWithGitLab,
      logout,
      handleOAuthCallback,
      hasRole,
      hasMinimumRole,
    }),
    [state, login, loginWithGitLab, logout, handleOAuthCallback, hasRole, hasMinimumRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── 훅 ───

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

// ─── 외부에서 사용할 silent refresh (API 인터셉터용) ───

export { _refreshPromise };

export async function attemptSilentRefreshForInterceptor(): Promise<boolean> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return false;

      const json = await res.json();
      const at = json.data?.access_token;
      if (!at) return false;

      setAccessToken(at);
      return true;
    } catch {
      return false;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}
