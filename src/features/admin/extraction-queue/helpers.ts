/**
 * /admin/extraction-queue 순수 헬퍼 (React 의존성 없음).
 *
 * 목적:
 *   - 에러 분기/직렬화 로직을 페이지 컴포넌트 본체와 분리해 node:test 로 단위
 *     회귀 커버리지를 얻는다.
 *   - 페이지 import 체인(@tanstack/react-query 등) 에 묶이지 않아 tsc 테스트
 *     컴파일 비용이 작다.
 *
 * B 스코프(2026-04-22) 변경:
 *   - 백엔드 `/api/v1/admin/extraction-results` 가 구현되었으므로 "라우트 미구현"
 *     분기(`isRouteMissingError`) 는 제거했다. 404 는 이제 일반적으로 "해당 id
 *     없음" 의미이며, `mutationErrorMessage` 가 일관되게 처리한다.
 *   - 승인 payload 직렬화 헬퍼(`buildApprovePayload`) 를 추가했다.
 *     프론트의 override 편집 UI ↔ 백엔드 `AdminApproveExtractionRequest`
 *     계약의 경계 어댑터.
 *
 * C 스코프(2026-04-22) 변경:
 *   - URL state 어댑터(`parseFiltersFromUrl` / `toSearchParamsString`) 추가.
 *     새로고침·딥링크·뒤로가기에서 필터 상태를 유지하기 위한 단방향 인코더.
 *   - 반려 사유 검증기(`validateRejectReason`) 추가. 서버 max 1024, 프론트는
 *     trim 후 0 길이는 허용(reason 생략) / 1~1024 허용 / 초과는 안내 문구.
 *
 * 분기 설계:
 *   1. `mutationErrorMessage(error)` — 사용자에게 보여줄 한국어 메시지.
 *      상태 코드별 정책:
 *        401 → 인증 만료       (세션 재로그인 유도)
 *        403 → 권한 부족       (Scope Profile/역할 점검 유도)
 *        404 → 자원 없음       (삭제됨 또는 잘못된 ID)
 *        409 → 상태 충돌       (이미 처리된 결과)
 *        422 → 입력 오류       (서버 message 우선)
 *        NetworkError → 연결 불가
 *        그 외 → 서버 메시지 노출, 공백이면 fallback
 *   2. `formatFieldValue(v)` — 추출 필드 값 표시용. 객체/배열은 JSON
 *      직렬화, null/undefined 는 "-", 원시는 String 캐스트.
 *   3. `buildApprovePayload(overrides)` — 빈/미지정 overrides 는 서버로
 *      전달하지 않는다(422 방어 + payload 최소화).
 *   4. `parseFiltersFromUrl(sp)` / `toSearchParamsString(filters)` — URL ↔ state
 *      쌍. 악의적/잘못된 값은 조용히 버리고 기본값으로 대체.
 *   5. `validateRejectReason(raw)` — 반려 사유의 프론트 단 검증. 서버가
 *      최종 권위(1024자 상한) 지만 UX 를 위해 선-가드.
 */

import { ApiError, NetworkError } from "@/lib/api/client";
import {
  EXTRACTION_STATUS,
  isValidExtractionStatus,
} from "./constants";

/**
 * 에러 객체 → 사용자 친화 메시지.
 *
 * ApiError.message 는 서버가 내려준 detail 을 담고 있어 경우에 따라 그대로
 * 노출해도 괜찮지만, status 기반 카테고리 메시지가 있으면 우선한다.
 */
export function mutationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return "대상 추출 결과를 찾을 수 없습니다.";
    if (error.status === 403)
      return "접근 권한이 없습니다. Scope Profile 또는 역할을 확인하세요.";
    if (error.status === 401) return "인증이 만료되었습니다. 다시 로그인해 주세요.";
    if (error.status === 409)
      return (
        error.message ||
        "이미 처리된 추출 결과입니다. 목록을 새로고침한 뒤 다시 시도하세요."
      );
    return error.message || "요청 처리 중 오류가 발생했습니다.";
  }
  if (error instanceof NetworkError) {
    return "네트워크에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (error instanceof Error) return error.message;
  return "알 수 없는 오류";
}

/**
 * 추출 필드 값을 화면 표시용 문자열로 직렬화.
 *
 * 주의:
 *   - JSON.stringify 는 순환 참조에서 throw 하지만, 추출 결과는 서버가 유효
 *     JSON 을 보장하므로 여기선 방어하지 않는다.
 *   - number 도 String() 으로 변환해 "1,000,000" 포맷은 사용하지 않는다
 *     (로케일 의존 포맷은 상위 컴포넌트에서 결정).
 */
export function formatFieldValue(v: unknown): string {
  if (v === null || v === undefined) return "-";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/**
 * 승인 payload 빌더.
 *
 * 서버 `AdminApproveExtractionRequest` 는 `overrides` 가 Optional 이며 빈 dict
 * 와 None 을 동일하게 취급한다. 프론트에서는 상태 모델을 단순하게 두기 위해
 * "편집한 필드 맵" 을 그대로 관리하다가, 최종 서버 호출 직전에 이 헬퍼를
 * 거쳐 "빈 dict → 키 제거" 로 정규화한다.
 *
 * 입력/출력 계약:
 *   - overrides 가 undefined / null / 빈 객체 → `{}` 반환 (모두 승인)
 *   - 값이 있으면 원본을 그대로 복사해 `{ overrides: {...} }` 반환
 */
export function buildApprovePayload(
  overrides: Record<string, unknown> | null | undefined,
): { overrides?: Record<string, unknown> } {
  if (!overrides) return {};
  const keys = Object.keys(overrides);
  if (keys.length === 0) return {};
  return { overrides: { ...overrides } };
}

// ---------------------------------------------------------------------------
// URL state — C 스코프
// ---------------------------------------------------------------------------

/** 페이지가 이해하는 필터 state 의 단순 dict. */
export interface QueueFilters {
  status: string; // "" | "pending_review" | "approved" | "rejected"
  documentType: string; // "" 또는 서버가 허용하는 UPPER-SNAKE 코드
  scopeProfileId: string; // "" 또는 UUID (길이 ≥32 기준은 UI 에서 별도 표시)
  page: number; // >=1 (1 이하 값은 조용히 1로 clamp)
}

/** 기본 필터값. 목록 진입 시 pending_review 를 보여주는 의도 유지. */
export const DEFAULT_QUEUE_FILTERS: QueueFilters = {
  status: EXTRACTION_STATUS.PENDING_REVIEW,
  documentType: "",
  scopeProfileId: "",
  page: 1,
};

// URL 파라미터 키 — 외부 공개되는 이름. 서버 쿼리와 다르게 짧게 유지.
const URL_PARAM_STATUS = "status";
const URL_PARAM_TYPE = "type";
const URL_PARAM_SCOPE = "scope";
const URL_PARAM_PAGE = "page";

// document_type 기본 정규식 — 서버와 동일(P7 UPPER-SNAKE 정책).
// 프론트에서는 공격 payload 만 차단하면 되므로 조금 느슨하게 허용.
const _DOC_TYPE_RE = /^[A-Z][A-Z0-9_-]{0,63}$/;

// scope_profile_id 약식 검증 — UUID v4 모양만 체크. 실검증은 서버.
const _UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * URLSearchParams (혹은 get 가능한 객체) → QueueFilters.
 *
 * Next.js `useSearchParams()` 는 `ReadonlyURLSearchParams` 를 반환하지만,
 * 본 헬퍼는 `{get: (k)=>string|null}` 형태만 요구해 테스트 친화적이다.
 *
 * 허용되지 않는 값(정규식 불일치, 음수 page 등)은 조용히 기본값으로 대체하고
 * throw 하지 않는다 — URL 오염에 대해 UI 가 5xx/에러 배너를 내지 않도록.
 */
export function parseFiltersFromUrl(sp: {
  get: (key: string) => string | null;
}): QueueFilters {
  const rawStatus = sp.get(URL_PARAM_STATUS); // null | "" | "…"
  const rawType = sp.get(URL_PARAM_TYPE) ?? "";
  const rawScope = sp.get(URL_PARAM_SCOPE) ?? "";
  const rawPage = sp.get(URL_PARAM_PAGE) ?? "";

  // status:
  //   - 키 자체가 없음(null) → 기본값(pending_review)
  //   - status= (빈 문자열) → 사용자 명시적 "전체" 선택 → ""
  //   - status=허용값 → 그 값
  //   - status=알 수 없는 값 → 기본값 fallback
  let status: string;
  if (rawStatus === null) {
    status = DEFAULT_QUEUE_FILTERS.status;
  } else if (rawStatus === "") {
    status = "";
  } else if (isValidExtractionStatus(rawStatus)) {
    status = rawStatus;
  } else {
    status = DEFAULT_QUEUE_FILTERS.status;
  }

  // document_type: 서버 정규식과 동일한 형태만 허용 (CHECK 위반 / SQLi 방어).
  let documentType = "";
  if (rawType && _DOC_TYPE_RE.test(rawType.toUpperCase())) {
    documentType = rawType.toUpperCase();
  }

  // scope_profile_id: UUID 형태만 허용.
  let scopeProfileId = "";
  if (rawScope && _UUID_RE.test(rawScope)) {
    scopeProfileId = rawScope;
  }

  // page: 양수 정수만. 10000 초과도 서버 상한과 동일하게 clamp.
  let page = 1;
  if (rawPage) {
    const parsed = Number.parseInt(rawPage, 10);
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 10_000) {
      page = parsed;
    }
  }

  return { status, documentType, scopeProfileId, page };
}

/**
 * QueueFilters → URL 쿼리 문자열 (prefix 없음; 호출부가 `?` 를 붙임).
 *
 * 규칙:
 *   - 기본값과 동일한 필드는 URL 에서 생략 (깔끔한 기본 URL 유지)
 *   - 단, status="" (전체) 는 사용자 의도 표현이므로 반드시 `status=` 로 남김
 *   - page=1 은 생략, >1 만 기록
 *   - 값 인코딩은 URLSearchParams 에 위임 (XSS/주입 방어)
 */
export function toSearchParamsString(filters: Partial<QueueFilters>): string {
  const full: QueueFilters = { ...DEFAULT_QUEUE_FILTERS, ...filters };
  const sp = new URLSearchParams();

  // status: 기본값과 다르거나 명시적 빈값일 때 기록.
  if (full.status !== DEFAULT_QUEUE_FILTERS.status) {
    // 빈 문자열도 보존 — 사용자가 "전체" 를 고른 상태를 잃지 않기 위해.
    sp.set(URL_PARAM_STATUS, full.status);
  }
  if (full.documentType) {
    sp.set(URL_PARAM_TYPE, full.documentType);
  }
  if (full.scopeProfileId) {
    sp.set(URL_PARAM_SCOPE, full.scopeProfileId);
  }
  if (full.page > 1) {
    sp.set(URL_PARAM_PAGE, String(full.page));
  }

  return sp.toString();
}

// ---------------------------------------------------------------------------
// 반려 사유 검증 — C 스코프
// ---------------------------------------------------------------------------

/** 반려 사유 최대 길이 — 서버 `AdminRejectExtractionRequest.reason` 과 동일. */
export const REJECT_REASON_MAX_LENGTH = 1024;

/** 반려 사유 최소 길이 — 빈 사유 허용이므로 0, 채웠다면 trim 후 3자 이상 권장. */
export const REJECT_REASON_MIN_LENGTH_WHEN_PRESENT = 3;

export interface RejectReasonValidation {
  /** 서버로 전송할 값 (trim 후). 빈 문자열이면 서버에서 None 으로 정규화. */
  normalized: string;
  /** 프론트 검증 통과 여부. */
  valid: boolean;
  /** valid=false 일 때 사용자에게 보여줄 한국어 메시지. */
  errorMessage: string | null;
  /** 표시용 남은 글자 수 (max - length). 음수는 초과분. */
  remaining: number;
}

/**
 * 반려 사유 검증.
 *
 * 규칙:
 *   - 입력이 `null|undefined` → {valid, normalized:""} (사유 생략 허용).
 *   - trim 후 빈 문자열 → {valid, normalized:""} (공백만 입력은 미입력 취급).
 *   - trim 후 1~2자 → {invalid, "너무 짧습니다"} — 실수로 한 글자 전송 방지.
 *   - trim 후 3~1024자 → {valid}.
 *   - trim 후 1025자 이상 → {invalid, "최대 1024자"} (서버 422 선-방어).
 *   - 제어 문자(탭/개행 제외)가 포함 → {invalid}. (paste 류 오염 방어)
 *
 * 이 함수는 React 의존성이 없어 node:test 로 단위 커버 가능하다.
 */
export function validateRejectReason(
  raw: string | null | undefined,
): RejectReasonValidation {
  const text = typeof raw === "string" ? raw : "";
  const trimmed = text.trim();
  const remaining = REJECT_REASON_MAX_LENGTH - text.length;

  // 빈 값은 허용. 서버에서 None 정규화.
  if (trimmed === "") {
    return {
      normalized: "",
      valid: true,
      errorMessage: null,
      remaining,
    };
  }

  if (trimmed.length < REJECT_REASON_MIN_LENGTH_WHEN_PRESENT) {
    return {
      normalized: trimmed,
      valid: false,
      errorMessage: `반려 사유는 ${REJECT_REASON_MIN_LENGTH_WHEN_PRESENT}자 이상 입력해 주세요 (미입력 가능).`,
      remaining,
    };
  }

  if (text.length > REJECT_REASON_MAX_LENGTH) {
    return {
      normalized: trimmed,
      valid: false,
      errorMessage: `반려 사유는 최대 ${REJECT_REASON_MAX_LENGTH.toLocaleString("ko")}자까지 입력 가능합니다.`,
      remaining,
    };
  }

  // 탭·개행·캐리지리턴 외의 제어문자(0x00-0x08, 0x0B, 0x0C, 0x0E-0x1F) 감지.
  // (사용자가 의도적으로 붙여넣기 한 바이너리 류 입력 차단)
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(trimmed)) {
    return {
      normalized: trimmed,
      valid: false,
      errorMessage: "반려 사유에 허용되지 않는 제어 문자가 포함되어 있습니다.",
      remaining,
    };
  }

  return {
    normalized: trimmed,
    valid: true,
    errorMessage: null,
    remaining,
  };
}
