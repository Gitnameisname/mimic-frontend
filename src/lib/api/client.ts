/**
 * API 클라이언트 (Phase 14-8 인증 인터셉터 통합).
 *
 * 기능:
 *  - Bearer Token 자동 첨부 (메모리의 AT 사용)
 *  - 401 응답 시 silent refresh → 원래 요청 재시도
 *  - 갱신 실패 시 로그인 페이지 리다이렉트
 *  - 동시 401 발생 시 refresh 1회만 실행 (큐잉)
 *  - 개발 환경 호환 (debug 헤더 유지)
 */

import { useAuthzStore } from "@/hooks/useAuthz";
import {
  getAccessToken,
  attemptSilentRefreshForInterceptor,
} from "@/contexts/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const IS_DEV = process.env.NODE_ENV === "development";

export class ApiError extends Error {
  /** 백엔드 error.code (예: "NOT_FOUND", "PERMISSION_DENIED") */
  code?: string;

  constructor(
    public status: number,
    message: string,
    public data?: unknown,
    code?: string
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  _retry = false,
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // Phase 14-8: Bearer Token 자동 첨부
  const at = getAccessToken();
  if (at) {
    headers["Authorization"] = `Bearer ${at}`;
  }

  // [개발 전용] AT 없을 때 X-Actor-Id/Role dev 헤더 fallback
  // 백엔드 debug=True + environment=development 환경에서만 수락됨 (production 무시)
  // TODO(S3-Phase1): JWT 전환 완료 시 이 블록 제거
  if (IS_DEV && !at) {
    const { role, actorId } = useAuthzStore.getState();
    if (actorId) headers["X-Actor-Id"] = actorId;
    if (role) headers["X-Actor-Role"] = role;
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    // Phase 14-8: 401 시 자동 갱신 후 재시도 (1회만)
    if (res.status === 401 && !_retry) {
      const refreshed = await attemptSilentRefreshForInterceptor();
      if (refreshed) {
        return request<T>(path, options, true);
      }
      // 갱신 실패 → 로그인 페이지로 리다이렉트
      if (typeof window !== "undefined") {
        const currentPath = window.location.pathname;
        // 로그인/공개 페이지에서는 리다이렉트 안 함
        const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/auth/callback"];
        if (!publicPaths.some((p) => currentPath.startsWith(p))) {
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
          return new Promise(() => {}) as T; // 리다이렉트 중 pending
        }
      }
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = undefined;
    }
    const structured = data as {
      error?: { code?: string; message?: string };
      detail?: string;
    } | undefined;
    const message =
      structured?.error?.message ??
      structured?.detail ??
      res.statusText;
    const code = structured?.error?.code;
    throw new ApiError(res.status, message, data, code);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

/**
 * ApiError 또는 일반 Error에서 사용자에게 표시할 메시지를 추출한다.
 */
export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "로그인이 필요합니다.";
    if (err.status === 403) return "이 작업을 수행할 권한이 없습니다.";
    if (err.status === 409) return err.message || fallback;
    if (err.status >= 400 && err.status < 500 && err.message) return err.message;
  }
  return fallback;
}

export const api = {
  get: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: "GET" }),
  post: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: "POST",
      body: body != null ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: "PATCH",
      body: body != null ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: "DELETE" }),
};
