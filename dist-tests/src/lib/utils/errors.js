"use strict";
/**
 * 에러 분류 유틸 — `docs/함수도서관/frontend.md` §1.3 등록.
 *
 * 제공 함수:
 *   - {@link classifyApiError} — `ApiError` / `NetworkError` / 일반 Error / 미지의 값을
 *     단일 결과 객체로 분류.
 *
 * 도입 배경:
 *   - `getApiErrorMessage` (lib/api/client.ts) 는 message 만 반환.
 *   - `mutationErrorMessage` (extraction-queue/helpers.ts), `classifyListError`
 *     (golden-sets) 등 도메인별 wrapper 가 비슷한 분기를 반복.
 *   - 본 helper 는 그 superset — message + code + status + recoverable 를
 *     일관 결과로 반환해 호출지가 자기 도메인 메시지 매핑만 책임지게 한다.
 *
 * 비대상 (intentional non-goals):
 *   - 도메인별 한국어 메시지 사전화 (예: 404 → "X를 찾을 수 없습니다") — 호출자가
 *     도메인 컨텍스트로 결정.
 *   - 백엔드 Shared Error Contract 의 `safe_retry`/`required_scope`/
 *     `suggested_next_action` — 백엔드가 헤더/detail 로 노출하기 전까지 보류.
 *   - i18n — 별 도메인.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyApiError = classifyApiError;
const client_1 = require("@/lib/api/client");
const guards_1 = require("@/lib/utils/guards");
/**
 * 알 수 없는 예외 값을 통일된 분류 결과로 변환한다.
 *
 * - `ApiError` → `code: "api_error"`, `status` 와 `serverCode` 채움.
 * - `NetworkError` → `code: "network_error"`, recoverable=true.
 * - `AbortError` (DOMException name) → `code: "abort_error"`.
 * - `Error` (그 외) → `code: "generic_error"`, recoverable=false.
 * - 그 외 (string / object / null / undefined) → `code: "unknown_error"`,
 *   message 는 toString 또는 fallback.
 *
 * @param error - 잡힌 예외 값 (try/catch 의 raw error).
 * @param fallbackMessage - 메시지를 추출 못 했을 때 쓸 한국어 fallback. 기본 "요청 처리 중 오류가 발생했습니다."
 */
function classifyApiError(error, fallbackMessage = "요청 처리 중 오류가 발생했습니다.") {
    if (error instanceof client_1.ApiError) {
        const status = error.status;
        const recoverable = status >= 500 && status < 600;
        return {
            code: "api_error",
            status,
            serverCode: error.code,
            message: error.message || fallbackMessage,
            recoverable,
        };
    }
    if (error instanceof client_1.NetworkError) {
        return {
            code: "network_error",
            message: error.message || "네트워크에 연결할 수 없습니다.",
            recoverable: true,
        };
    }
    if (typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError") {
        const e = error;
        return {
            code: "abort_error",
            message: e.message || "요청이 중단되었습니다.",
            recoverable: true,
        };
    }
    if (error instanceof Error) {
        return {
            code: "generic_error",
            message: error.message || fallbackMessage,
            recoverable: false,
        };
    }
    if ((0, guards_1.isString)(error) && error) {
        return { code: "unknown_error", message: error, recoverable: false };
    }
    return { code: "unknown_error", message: fallbackMessage, recoverable: false };
}
