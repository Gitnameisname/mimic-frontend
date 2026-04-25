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
import { isString } from "@/lib/utils/guards";
import {
  getAccessToken,
  attemptSilentRefreshForInterceptor,
} from "@/contexts/AuthContext";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8050";
const IS_DEV = process.env.NODE_ENV === "development";

// 동시 401 처리: refresh 완료 전 도착하는 요청들을 큐잉하여 1회 refresh 후 일괄 재시도
let _isRedirecting = false;
type QueueEntry = { resolve: (v: boolean) => void };
const _waitQueue: QueueEntry[] = [];

/**
 * 서버가 structured error payload 와 함께 내려줄 수 있는 액션 힌트.
 *
 * P7-2-a: FastAPI `HTTPException(detail={"code", "message", "hint"})` 형식의
 *   응답에서 `hint` 를 그대로 추출해 UI 레이어가 버튼/링크를 렌더할 수 있도록
 *   보존한다. 해당 href 는 서버가 내려준 값이므로 신뢰 경계 관점에서 반드시
 *   프론트 화이트리스트 (현재는 `/admin/document-types` 전용) 에 대조한 뒤
 *   사용해야 한다. 본 타입은 값만 운반할 뿐 렌더 정책은 소비자가 결정한다.
 */
export interface ApiErrorHint {
  href: string;
  label: string;
}

export class ApiError extends Error {
  /** 백엔드 error.code (예: "NOT_FOUND", "PERMISSION_DENIED") */
  code?: string;

  /**
   * P7-2-a: 서버가 422 detail 을 structured payload 로 내린 경우의 액션 힌트.
   * 소비자(ErrorBanner 등) 가 라우팅 버튼을 렌더할 때 참고한다. 메시지/코드로
   * 이미 충분하면 무시해도 무방.
   */
  hint?: ApiErrorHint;

  constructor(
    public status: number,
    message: string,
    public data?: unknown,
    code?: string,
    hint?: ApiErrorHint,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.hint = hint;
  }
}

/**
 * 네트워크 레벨 실패 (DNS, TCP 거절, CORS, Mixed content, TLS 등).
 *
 * fetch() 가 HTTP 응답을 받기도 전에 예외를 던진 경우에만 발생한다.
 * 관리자가 근본 원인을 특정할 수 있도록 공격 대상 URL·요청 메서드·원본 오류 메시지를
 * 모두 보존한다. 화면 계층은 ApiError (HTTP 4xx/5xx) 와 이 클래스를 구분해 다른 문구·
 * 체크리스트를 렌더링해야 한다.
 *
 * `cause` 는 원래의 TypeError (e.g. `TypeError: Failed to fetch`) 를 그대로 담는다.
 */
export class NetworkError extends Error {
  constructor(
    public url: string,
    public method: string,
    public originalMessage: string,
    options?: { cause?: unknown },
  ) {
    super(`${method} ${url} 요청에 실패했습니다: ${originalMessage}`);
    this.name = "NetworkError";
    if (options?.cause !== undefined) {
      // Error cause 는 ES2022 지원이지만 TS lib 에 따라 타입 누락 — 런타임에만 설정.
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

/** fetch() 가 던지는 TypeError 의 일반적 메시지 목록.
 * 브라우저별로 조금씩 다르므로 문자열 비교가 아닌 `instanceof TypeError` 로 판별한다.
 * - Chrome/Edge: "Failed to fetch"
 * - Firefox: "NetworkError when attempting to fetch resource."
 * - Safari: "Load failed"
 * - Node undici: "fetch failed"
 */

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

  const method = (options.method ?? "GET").toUpperCase();
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch (err) {
    // fetch() 는 HTTP 응답을 받기 전의 모든 실패를 TypeError 로 던진다
    // (DNS, TCP RST, CORS preflight 차단, Mixed content, TLS 에러 등).
    // 상위 계층에서 4xx/5xx (ApiError) 와 구분해 진단 배너를 노출할 수 있도록
    // NetworkError 로 감싼다. AbortError 등 다른 오류는 원본 그대로 재던진다.
    if (err instanceof TypeError) {
      throw new NetworkError(url, method, err.message || "unknown network error", {
        cause: err,
      });
    }
    throw err;
  }

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
    // P7-2-a: FastAPI HTTPException 의 detail 은 문자열 또는 object.
    //   - 문자열: 기존 P7-1 까지 써 온 형태 (`{"detail": "..."}`).
    //   - object: structured error payload (`{code, message, hint}`) — 프론트
    //     라우팅 키(`code`) 와 액션 힌트(`hint`) 를 동반한다.
    //   둘 다 하위호환되도록 아래 로직은 먼저 `error.*` (별도 인코딩 레이어) 를
    //   보고, 다음으로 detail 이 object 인지 string 인지 분기한다.
    const structured = data as {
      error?: { code?: string; message?: string };
      detail?:
        | string
        | {
            code?: string;
            message?: string;
            hint?: { href?: string; label?: string };
          };
    } | undefined;

    let message: string = res.statusText;
    let code: string | undefined = structured?.error?.code;
    let hint: ApiErrorHint | undefined;

    if (structured?.error?.message) {
      message = structured.error.message;
    } else if (isString(structured?.detail)) {
      message = structured.detail;
    } else if (
      structured?.detail &&
      typeof structured.detail === "object" &&
      !Array.isArray(structured.detail)
    ) {
      // Structured detail (P7-2-a). code 는 detail.code 우선, 없으면 error.code 유지.
      const d = structured.detail as {
        code?: string;
        message?: string;
        hint?: { href?: string; label?: string };
      };
      if (!code && isString(d.code)) {
        code = d.code;
      }
      if (isString(d.message)) {
        message = d.message;
      }
      if (
        d.hint &&
        typeof d.hint === "object" &&
        isString(d.hint.href) &&
        isString(d.hint.label)
      ) {
        hint = { href: d.hint.href, label: d.hint.label };
      }
    }

    throw new ApiError(res.status, message, data, code, hint);
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
