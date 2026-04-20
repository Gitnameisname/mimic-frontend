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

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8050";
const IS_DEV = process.env.NODE_ENV === "development";

// 동시 401 처리: refresh 완료 전 도착하는 요청들을 큐잉하여 1회 refresh 후 일괄 재시도
let _isRedirecting = false;
type QueueEntry = { resolve: (v: boolean) => void };
const _waitQueue: QueueEntry[] = [];

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

  // FormData 업로드의 경우 브라우저가 boundary 포함한 multipart/form-data 를 자동 지정하도록
  // Content-Type 을 기본값에서 제외한다. (application/json 하드코딩 시 멀티파트가 깨진다.)
  const isFormData =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(!isFormData ? { "Content-Type": "application/json" } : {}),
    ...(options.headers as Record<string, string>),
  };

  // Phase 14-8: Bearer Token 자동 첨부
  const at = getAccessToken();
  if (at) {
    headers["Authorization"] = `Bearer ${at}`;
  }

  // [개발 전용] AT 없을 때 X-Actor-Id/Role dev 헤더 fallback
  // SEC3-FE-003: typeof window !== "undefined" 추가 — SSR/브라우저 빌드에서만 전송
  // 백엔드 debug=True + environment=development/test 환경에서만 수락됨 (production 무시)
  // TODO(S3-Phase1): JWT 전환 완료 시 이 블록 완전 제거
  if (IS_DEV && !at && typeof window !== "undefined") {
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
      // 갱신 실패 → 로그인 페이지로 리다이렉트 (동시 401이 여러 개여도 1회만)
      if (typeof window !== "undefined" && !_isRedirecting) {
        const currentPath = window.location.pathname;
        const publicPaths = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/auth/callback"];
        if (!publicPaths.some((p) => currentPath.startsWith(p))) {
          _isRedirecting = true;
          // 큐에 대기 중인 요청들은 모두 실패로 처리
          _waitQueue.splice(0).forEach((entry) => entry.resolve(false));
          window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
          return new Promise(() => {}) as T; // 리다이렉트 중 pending
        }
      }
      if (_isRedirecting) {
        return new Promise(() => {}) as T;
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
  post: <T>(path: string, body?: unknown, init?: RequestInit) => {
    // FormData / Blob 은 JSON.stringify 하지 않고 그대로 전달 — 업로드 시나리오
    const isBinaryBody =
      (typeof FormData !== "undefined" && body instanceof FormData) ||
      (typeof Blob !== "undefined" && body instanceof Blob);
    return request<T>(path, {
      ...init,
      method: "POST",
      body:
        body == null
          ? undefined
          : isBinaryBody
            ? (body as BodyInit)
            : JSON.stringify(body),
    });
  },
  patch: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: "PATCH",
      body: body != null ? JSON.stringify(body) : undefined,
    }),
  // F-04 시정(2026-04-18): admin.ts 의 `api.put(...)` 호출부가 type error 를 일으켜
  //   put 메서드를 API 클라이언트에 공식 추가. PUT 은 멱등 업데이트(document-type plugin 등)에
  //   사용되며 기존 post/patch 와 동일한 인터셉터(401 재시도, Bearer 자동 첨부)를 공유한다.
  put: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>(path, {
      ...init,
      method: "PUT",
      body: body != null ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string, init?: RequestInit) =>
    request<T>(path, { ...init, method: "DELETE" }),
};
