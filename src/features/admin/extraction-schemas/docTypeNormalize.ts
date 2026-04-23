/**
 * P7-1 / P7-2 순수 로직 유틸 — React 의존성 없음.
 *
 *   1. `normalizeDocTypeCode` : 앞뒤 공백 제거 + 대문자 변환.
 *      서버 Pydantic validator 와 동일한 정책을 클라이언트에도 적용해
 *      "타이핑한 값" 과 "서버에 저장되는 값" 의 불일치를 제거한다.
 *   2. `DOC_TYPE_CODE_PATTERN` : 서버 정규식과 100% 일치하는 대문자 버전.
 *      (정규화 이후 검증이므로 대문자 전제)
 *   3. `isFkMissingDocTypeError` : 서버가 내려준 422 detail 문자열이
 *      "document_types FK 미존재" 에 해당하는지 판별 (P7-1 폴백).
 *      메시지 규약(P7-1-a): `"DocumentType '<코드>' 이(가) 존재하지 않습니다."`.
 *   4. `DOC_TYPE_ERROR_CODES`, `isDocTypeNotFoundError`,
 *      `resolveDocTypeNotFoundHint` : P7-2-a 구조화 에러 코드 기반 분기.
 *      서버가 `detail.code = "DOC_TYPE_NOT_FOUND"` 를 내려주면 ApiError.code
 *      에 들어오고, 프론트는 문자열 regex 가 아니라 이 상수로 라우팅한다.
 *
 * 이 파일은 pytest/route 테스트와 대응하는 프론트 회귀 커버리지를
 * 제공하기 위해 분리됐다.
 */

import { ApiError, type ApiErrorHint } from "@/lib/api/client";

export const DOC_TYPE_CODE_PATTERN = /^[A-Z][A-Z0-9_-]*$/;

/**
 * P7-2-a: 서버가 내려주는 에러 코드 레지스트리.
 *
 * 반드시 `backend/app/api/v1/extraction_schemas.py` 의 상수와 1:1 동기화.
 * 새 코드 추가 시 양쪽을 함께 수정하고, 테스트에 회귀 케이스를 추가한다.
 */
export const DOC_TYPE_ERROR_CODES = {
  /** `extraction_schemas.doc_type_code` 가 `document_types` 에 없음. */
  DOC_TYPE_NOT_FOUND: "DOC_TYPE_NOT_FOUND",
} as const;

/**
 * `doc_type_code` 를 서버와 동일한 규칙으로 정규화.
 *
 * - 앞뒤 공백 제거
 * - 대문자로 치환
 * - 이 함수는 regex 검증은 하지 않는다 (별도 isValidDocTypeCode).
 *
 * @example
 *   normalizeDocTypeCode("  contract ")  // => "CONTRACT"
 *   normalizeDocTypeCode("ConTract_v2")   // => "CONTRACT_V2"
 */
export function normalizeDocTypeCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidDocTypeCode(normalized: string): boolean {
  return DOC_TYPE_CODE_PATTERN.test(normalized);
}

/**
 * 서버 422 detail 이 "DocumentType 참조가 없음" 에러인지 식별 (P7-1 폴백).
 *
 * 감지 기준: `DocumentType '<code>' 이(가) 존재하지 않` 부분 매칭.
 * 이 문자열은 `backend/app/api/v1/extraction_schemas.py` 의
 * P7-1-a 처리부에 하드코딩되어 있고, 변경되면 여기서도 같이 변경되어야 한다.
 *
 * P7-2-a 이후로는 `isDocTypeNotFoundError(error)` 를 우선 사용하고, 서버가
 * 아직 structured payload 로 넘어오지 않았을 때의 폴백으로 이 함수를 남긴다.
 *
 * 부분 매칭으로 둔 이유: 뒤에 "먼저 /admin/document-types ..." 같은 안내가
 * 붙어도 동일하게 라우트되도록 함.
 */
export function isFkMissingDocTypeError(message: string | null | undefined): boolean {
  if (!message) return false;
  return /DocumentType\s+'[^']+'\s*이\(가\)\s*존재하지\s*않/.test(message);
}

/**
 * P7-2-a: 서버 구조화 에러 코드 우선, 메시지 regex 는 폴백으로 사용.
 *
 * 동작:
 *   1. `error` 가 ApiError 이고 `error.code === "DOC_TYPE_NOT_FOUND"` → true.
 *   2. 아니면 `error.message` 에 대해 `isFkMissingDocTypeError` 폴백.
 *
 * 이 이원화는 배포 순서 (백엔드 먼저 vs 프론트 먼저) 에 관계없이 안전한
 * 전환을 보장한다. 배포가 끝나 둘 다 최신이 된 이후에는 실질적으로 (1) 경로
 * 로만 도달하고 (2) 는 dead path 가 된다.
 */
export function isDocTypeNotFoundError(error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.code === DOC_TYPE_ERROR_CODES.DOC_TYPE_NOT_FOUND) {
      return true;
    }
    // 폴백: 구버전 서버는 문자열 detail 만 내림.
    return isFkMissingDocTypeError(error.message);
  }
  return false;
}

/**
 * P7-2-a: ApiError.hint 와 로컬 기본값을 합쳐 최종 링크를 반환.
 *
 * 서버가 내려준 href 는 반드시 화이트리스트 대조. 현재 허용 경로는
 * `/admin/document-types` (동일 origin 관리자 라우트) 단일. 프론트 보안 관점의
 * 최소 권한 원칙상 서버가 임의 href 를 내려도 클라이언트가 렌더를 거절하고
 * 로컬 fallback 을 쓴다 (Open Redirect / XSS `javascript:` 방어).
 */
export function resolveDocTypeNotFoundHint(error: unknown): ApiErrorHint {
  const allowed = new Set<string>(["/admin/document-types"]);
  const fallback: ApiErrorHint = {
    href: "/admin/document-types",
    label: "문서 유형 관리 열기",
  };
  if (error instanceof ApiError && error.hint) {
    if (allowed.has(error.hint.href)) {
      return error.hint;
    }
  }
  return fallback;
}
