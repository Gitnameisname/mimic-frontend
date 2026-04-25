"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = exports.NetworkError = exports.ApiError = exports.API_BASE = void 0;
exports.getApiErrorMessage = getApiErrorMessage;
const useAuthz_1 = require("@/hooks/useAuthz");
const guards_1 = require("@/lib/utils/guards");
const AuthContext_1 = require("@/contexts/AuthContext");
exports.API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8050";
const IS_DEV = process.env.NODE_ENV === "development";
// 동시 401 처리: refresh 완료 전 도착하는 요청들을 큐잉하여 1회 refresh 후 일괄 재시도
let _isRedirecting = false;
const _waitQueue = [];
class ApiError extends Error {
    status;
    data;
    /** 백엔드 error.code (예: "NOT_FOUND", "PERMISSION_DENIED") */
    code;
    /**
     * P7-2-a: 서버가 422 detail 을 structured payload 로 내린 경우의 액션 힌트.
     * 소비자(ErrorBanner 등) 가 라우팅 버튼을 렌더할 때 참고한다. 메시지/코드로
     * 이미 충분하면 무시해도 무방.
     */
    hint;
    constructor(status, message, data, code, hint) {
        super(message);
        this.status = status;
        this.data = data;
        this.name = "ApiError";
        this.code = code;
        this.hint = hint;
    }
}
exports.ApiError = ApiError;
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
class NetworkError extends Error {
    url;
    method;
    originalMessage;
    constructor(url, method, originalMessage, options) {
        super(`${method} ${url} 요청에 실패했습니다: ${originalMessage}`);
        this.url = url;
        this.method = method;
        this.originalMessage = originalMessage;
        this.name = "NetworkError";
        if (options?.cause !== undefined) {
            // Error cause 는 ES2022 지원이지만 TS lib 에 따라 타입 누락 — 런타임에만 설정.
            this.cause = options.cause;
        }
    }
}
exports.NetworkError = NetworkError;
/** fetch() 가 던지는 TypeError 의 일반적 메시지 목록.
 * 브라우저별로 조금씩 다르므로 문자열 비교가 아닌 `instanceof TypeError` 로 판별한다.
 * - Chrome/Edge: "Failed to fetch"
 * - Firefox: "NetworkError when attempting to fetch resource."
 * - Safari: "Load failed"
 * - Node undici: "fetch failed"
 */
async function request(path, options = {}, _retry = false) {
    const url = `${exports.API_BASE}${path}`;
    // FormData 업로드의 경우 브라우저가 boundary 포함한 multipart/form-data 를 자동 지정하도록
    // Content-Type 을 기본값에서 제외한다. (application/json 하드코딩 시 멀티파트가 깨진다.)
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
    const headers = {
        ...(!isFormData ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
    };
    // Phase 14-8: Bearer Token 자동 첨부
    const at = (0, AuthContext_1.getAccessToken)();
    if (at) {
        headers["Authorization"] = `Bearer ${at}`;
    }
    // [개발 전용] AT 없을 때 X-Actor-Id/Role dev 헤더 fallback
    // SEC3-FE-003: typeof window !== "undefined" 추가 — SSR/브라우저 빌드에서만 전송
    // 백엔드 debug=True + environment=development/test 환경에서만 수락됨 (production 무시)
    // TODO(S3-Phase1): JWT 전환 완료 시 이 블록 완전 제거
    if (IS_DEV && !at && typeof window !== "undefined") {
        const { role, actorId } = useAuthz_1.useAuthzStore.getState();
        if (actorId)
            headers["X-Actor-Id"] = actorId;
        if (role)
            headers["X-Actor-Role"] = role;
    }
    const method = (options.method ?? "GET").toUpperCase();
    let res;
    try {
        res = await fetch(url, {
            ...options,
            headers,
            credentials: "include",
        });
    }
    catch (err) {
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
            const refreshed = await (0, AuthContext_1.attemptSilentRefreshForInterceptor)();
            if (refreshed) {
                return request(path, options, true);
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
                    return new Promise(() => { }); // 리다이렉트 중 pending
                }
            }
            if (_isRedirecting) {
                return new Promise(() => { });
            }
        }
        let data;
        try {
            data = await res.json();
        }
        catch {
            data = undefined;
        }
        // P7-2-a: FastAPI HTTPException 의 detail 은 문자열 또는 object.
        //   - 문자열: 기존 P7-1 까지 써 온 형태 (`{"detail": "..."}`).
        //   - object: structured error payload (`{code, message, hint}`) — 프론트
        //     라우팅 키(`code`) 와 액션 힌트(`hint`) 를 동반한다.
        //   둘 다 하위호환되도록 아래 로직은 먼저 `error.*` (별도 인코딩 레이어) 를
        //   보고, 다음으로 detail 이 object 인지 string 인지 분기한다.
        const structured = data;
        let message = res.statusText;
        let code = structured?.error?.code;
        let hint;
        if (structured?.error?.message) {
            message = structured.error.message;
        }
        else if ((0, guards_1.isString)(structured?.detail)) {
            message = structured.detail;
        }
        else if (structured?.detail &&
            typeof structured.detail === "object" &&
            !Array.isArray(structured.detail)) {
            // Structured detail (P7-2-a). code 는 detail.code 우선, 없으면 error.code 유지.
            const d = structured.detail;
            if (!code && (0, guards_1.isString)(d.code)) {
                code = d.code;
            }
            if ((0, guards_1.isString)(d.message)) {
                message = d.message;
            }
            if (d.hint &&
                typeof d.hint === "object" &&
                (0, guards_1.isString)(d.hint.href) &&
                (0, guards_1.isString)(d.hint.label)) {
                hint = { href: d.hint.href, label: d.hint.label };
            }
        }
        throw new ApiError(res.status, message, data, code, hint);
    }
    // 204 No Content
    if (res.status === 204)
        return undefined;
    return res.json();
}
/**
 * ApiError 또는 일반 Error에서 사용자에게 표시할 메시지를 추출한다.
 */
function getApiErrorMessage(err, fallback) {
    if (err instanceof ApiError) {
        if (err.status === 401)
            return "로그인이 필요합니다.";
        if (err.status === 403)
            return "이 작업을 수행할 권한이 없습니다.";
        if (err.status === 409)
            return err.message || fallback;
        if (err.status >= 400 && err.status < 500 && err.message)
            return err.message;
    }
    return fallback;
}
exports.api = {
    get: (path, init) => request(path, { ...init, method: "GET" }),
    post: (path, body, init) => {
        // FormData / Blob 은 JSON.stringify 하지 않고 그대로 전달 — 업로드 시나리오
        const isBinaryBody = (typeof FormData !== "undefined" && body instanceof FormData) ||
            (typeof Blob !== "undefined" && body instanceof Blob);
        return request(path, {
            ...init,
            method: "POST",
            body: body == null
                ? undefined
                : isBinaryBody
                    ? body
                    : JSON.stringify(body),
        });
    },
    patch: (path, body, init) => request(path, {
        ...init,
        method: "PATCH",
        body: body != null ? JSON.stringify(body) : undefined,
    }),
    // F-04 시정(2026-04-18): admin.ts 의 `api.put(...)` 호출부가 type error 를 일으켜
    //   put 메서드를 API 클라이언트에 공식 추가. PUT 은 멱등 업데이트(document-type plugin 등)에
    //   사용되며 기존 post/patch 와 동일한 인터셉터(401 재시도, Bearer 자동 첨부)를 공유한다.
    put: (path, body, init) => request(path, {
        ...init,
        method: "PUT",
        body: body != null ? JSON.stringify(body) : undefined,
    }),
    delete: (path, init) => request(path, { ...init, method: "DELETE" }),
};
