/**
 * P7-2 유틸 단위 테스트 — 구조화 에러 코드 + 힌트 라우팅
 *
 * 대상:
 *   - DOC_TYPE_ERROR_CODES                (P7-2-a 상수 레지스트리)
 *   - isDocTypeNotFoundError(error)       (P7-2-a 코드 우선 + regex 폴백)
 *   - resolveDocTypeNotFoundHint(error)   (P7-2-a 화이트리스트 기반 힌트 해석)
 *   - ApiError.hint / .code 파싱          (client.ts structured detail 파싱)
 *
 * 런타임: Node 22 내장 `node:test`. React/DOM 의존성 없음.
 *
 * P7-1 (ExtractionSchemasP7.test.tsx) 는 문자열 regex 단독 분기를 검증하고,
 * 이 파일(P7-2)은 배포 순서(서버 먼저 vs 프론트 먼저) 양쪽에서 안전하게
 * 동작해야 하는 "구조화 코드 vs 폴백" 이원화를 검증한다.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  DOC_TYPE_ERROR_CODES,
  isDocTypeNotFoundError,
  isFkMissingDocTypeError,
  resolveDocTypeNotFoundHint,
} from "../src/features/admin/extraction-schemas/docTypeNormalize";
import { ApiError } from "../src/lib/api/client";

// ---------------------------------------------------------------------------
// DOC_TYPE_ERROR_CODES — 백엔드 상수와 1:1 일치해야 함
// ---------------------------------------------------------------------------

describe("DOC_TYPE_ERROR_CODES", () => {
  test("DOC_TYPE_NOT_FOUND 상수 값이 백엔드 ERR_DOC_TYPE_NOT_FOUND 와 일치", () => {
    // backend/app/api/v1/extraction_schemas.py 의
    //   ERR_DOC_TYPE_NOT_FOUND = "DOC_TYPE_NOT_FOUND"
    // 와 반드시 동일. 변경 시 양쪽 동시에 수정하고 이 테스트로 회귀 방지.
    assert.equal(DOC_TYPE_ERROR_CODES.DOC_TYPE_NOT_FOUND, "DOC_TYPE_NOT_FOUND");
  });

  test("다른 코드는 노출하지 않음 (레지스트리 축소 금지용 가드)", () => {
    const keys = Object.keys(DOC_TYPE_ERROR_CODES);
    assert.deepEqual(keys.sort(), ["DOC_TYPE_NOT_FOUND"]);
  });
});

// ---------------------------------------------------------------------------
// isDocTypeNotFoundError — 코드 우선 + 메시지 regex 폴백
// ---------------------------------------------------------------------------

describe("isDocTypeNotFoundError", () => {
  test("ApiError.code === DOC_TYPE_NOT_FOUND → true (최신 서버 경로)", () => {
    const err = new ApiError(
      422,
      "아무 메시지나", // 메시지와 무관하게 code 만으로 분기되어야 함
      undefined,
      "DOC_TYPE_NOT_FOUND"
    );
    assert.equal(isDocTypeNotFoundError(err), true);
  });

  test("ApiError.code 없음 + 메시지가 canonical FK 문자열 → true (폴백)", () => {
    // P7-2 배포 이전 서버가 아직 string detail 만 내리는 구버전인 경우.
    const err = new ApiError(
      422,
      "DocumentType 'CONTRACT' 이(가) 존재하지 않습니다."
    );
    assert.equal(isDocTypeNotFoundError(err), true);
  });

  test("ApiError.code 없음 + 메시지도 무관 → false", () => {
    const err = new ApiError(422, "다른 validation 에러");
    assert.equal(isDocTypeNotFoundError(err), false);
  });

  test("ApiError.code 가 다른 값 + 메시지는 FK regex 일치 → true (폴백 동작)", () => {
    // 서버가 code 는 다른 값을 주지만 메시지는 여전히 FK 문자열인 과도기 상황.
    const err = new ApiError(
      422,
      "DocumentType 'X' 이(가) 존재하지 않습니다.",
      undefined,
      "OTHER_CODE"
    );
    // code 가 DOC_TYPE_NOT_FOUND 는 아니지만 메시지 폴백으로 true.
    assert.equal(isDocTypeNotFoundError(err), true);
  });

  test("ApiError 가 아닌 객체 → false", () => {
    assert.equal(isDocTypeNotFoundError({ code: "DOC_TYPE_NOT_FOUND" }), false);
    assert.equal(
      isDocTypeNotFoundError(new Error("DocumentType 'X' 이(가) 존재하지 않")),
      false
    );
  });

  test("null/undefined/primitive → false", () => {
    assert.equal(isDocTypeNotFoundError(null), false);
    assert.equal(isDocTypeNotFoundError(undefined), false);
    assert.equal(isDocTypeNotFoundError("DocumentType 'X' 이(가) 존재하지 않"), false);
    assert.equal(isDocTypeNotFoundError(422), false);
  });

  test("ApiError 이지만 status 가 422 가 아니어도 code 일치 시 true", () => {
    // 코드 기반 분기는 status 에 의존하지 않도록 설계 (강제 조건 아님).
    const err = new ApiError(500, "msg", undefined, "DOC_TYPE_NOT_FOUND");
    assert.equal(isDocTypeNotFoundError(err), true);
  });

  test("isFkMissingDocTypeError 는 독립적으로 동작 (regex 전용)", () => {
    // 폴백 함수가 ApiError 래핑 없이 직접 호출되는 경로 회귀.
    assert.equal(
      isFkMissingDocTypeError("DocumentType 'POLICY' 이(가) 존재하지 않"),
      true
    );
  });
});

// ---------------------------------------------------------------------------
// resolveDocTypeNotFoundHint — href 화이트리스트 방어
// ---------------------------------------------------------------------------

describe("resolveDocTypeNotFoundHint", () => {
  const FALLBACK = {
    href: "/admin/document-types",
    label: "문서 유형 관리 열기",
  };

  test("서버 힌트의 href 가 화이트리스트 /admin/document-types → 서버 hint 사용", () => {
    const err = new ApiError(422, "msg", undefined, "DOC_TYPE_NOT_FOUND", {
      href: "/admin/document-types",
      label: "사용자 정의 라벨",
    });
    const hint = resolveDocTypeNotFoundHint(err);
    assert.equal(hint.href, "/admin/document-types");
    // 라벨은 서버가 보낸 걸 그대로 사용해야 한다 (i18n 흐름).
    assert.equal(hint.label, "사용자 정의 라벨");
  });

  test("서버 힌트의 href 가 javascript: → fallback (XSS 방어)", () => {
    const err = new ApiError(422, "msg", undefined, "DOC_TYPE_NOT_FOUND", {
      href: "javascript:alert(1)",
      label: "xss",
    });
    assert.deepEqual(resolveDocTypeNotFoundHint(err), FALLBACK);
  });

  test("서버 힌트의 href 가 외부 도메인 → fallback (Open Redirect 방어)", () => {
    const err = new ApiError(422, "msg", undefined, "DOC_TYPE_NOT_FOUND", {
      href: "https://evil.example.com/phish",
      label: "click me",
    });
    assert.deepEqual(resolveDocTypeNotFoundHint(err), FALLBACK);
  });

  test("서버 힌트의 href 가 다른 내부 경로여도 → fallback (화이트리스트 엄격)", () => {
    // /admin/settings, /admin/document-types/ (trailing slash) 등은 허용 X.
    const err1 = new ApiError(422, "msg", undefined, "DOC_TYPE_NOT_FOUND", {
      href: "/admin/settings",
      label: "settings",
    });
    const err2 = new ApiError(422, "msg", undefined, "DOC_TYPE_NOT_FOUND", {
      href: "/admin/document-types/",
      label: "trailing slash",
    });
    assert.deepEqual(resolveDocTypeNotFoundHint(err1), FALLBACK);
    assert.deepEqual(resolveDocTypeNotFoundHint(err2), FALLBACK);
  });

  test("ApiError 에 hint 가 없으면 → fallback", () => {
    const err = new ApiError(422, "msg", undefined, "DOC_TYPE_NOT_FOUND");
    assert.deepEqual(resolveDocTypeNotFoundHint(err), FALLBACK);
  });

  test("ApiError 가 아닌 입력 → fallback", () => {
    assert.deepEqual(resolveDocTypeNotFoundHint(null), FALLBACK);
    assert.deepEqual(resolveDocTypeNotFoundHint(undefined), FALLBACK);
    assert.deepEqual(resolveDocTypeNotFoundHint(new Error("boom")), FALLBACK);
    assert.deepEqual(
      resolveDocTypeNotFoundHint({ hint: { href: "/admin/document-types", label: "x" } }),
      FALLBACK
    );
  });

  test("fallback 의 href 는 화이트리스트의 정확한 경로와 일치", () => {
    // Fallback 이 화이트리스트 외부 경로라면 정책 모순.
    const err = new ApiError(422, "msg");
    const hint = resolveDocTypeNotFoundHint(err);
    assert.equal(hint.href, "/admin/document-types");
    assert.ok(hint.label.length > 0, "fallback 라벨은 비어있지 않아야 한다");
  });
});

// ---------------------------------------------------------------------------
// ApiError 직접 구성 — client.ts 파싱 결과를 흉내낸 회귀
// ---------------------------------------------------------------------------

describe("ApiError structured payload", () => {
  test("code + hint 를 모두 보존한다", () => {
    const err = new ApiError(
      422,
      "DocumentType 'CONTRACT' 이(가) 존재하지 않습니다.",
      { detail: { code: "DOC_TYPE_NOT_FOUND" } },
      "DOC_TYPE_NOT_FOUND",
      { href: "/admin/document-types", label: "문서 유형 관리 열기" }
    );
    assert.equal(err.status, 422);
    assert.equal(err.code, "DOC_TYPE_NOT_FOUND");
    assert.equal(err.hint?.href, "/admin/document-types");
    assert.equal(err.hint?.label, "문서 유형 관리 열기");
  });

  test("code 만 있고 hint 없음 — hint 는 undefined", () => {
    const err = new ApiError(422, "msg", undefined, "DOC_TYPE_NOT_FOUND");
    assert.equal(err.code, "DOC_TYPE_NOT_FOUND");
    assert.equal(err.hint, undefined);
  });

  test("구버전 ApiError (code/hint 미지정) 는 undefined", () => {
    const err = new ApiError(500, "server error");
    assert.equal(err.code, undefined);
    assert.equal(err.hint, undefined);
  });
});
