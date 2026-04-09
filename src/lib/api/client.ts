import { useAuthzStore } from "@/hooks/useAuthz";

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
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  // 개발 환경: 백엔드 debug 모드 개발 헤더로 인증 (settings.debug=True 전용)
  // 프로덕션 환경: Authorization Bearer 토큰으로 교체 예정 (Phase 인증 연동 시)
  if (IS_DEV) {
    const { role, actorId } = useAuthzStore.getState();
    if (actorId) headers["X-Actor-Id"] = actorId;
    if (role) headers["X-Actor-Role"] = role;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
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
 *
 * - 401: 인증 필요 고정 메시지
 * - 403: 권한 없음 고정 메시지
 * - 4xx: 백엔드 error.message (한국어/영어 혼용) — fallback으로 치환
 * - 5xx / 기타: fallback 메시지
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
