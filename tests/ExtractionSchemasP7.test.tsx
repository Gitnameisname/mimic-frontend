/**
 * P7-1 유틸 단위 테스트 — docTypeNormalize.ts
 *
 * 대상:
 *   - normalizeDocTypeCode      (P7-1-b)
 *   - isValidDocTypeCode        (P7-1-b)
 *   - isFkMissingDocTypeError   (P7-1-c)
 *
 * 런타임: Node 22 내장 `node:test` — React/DOM 의존성 없음.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  DOC_TYPE_CODE_PATTERN,
  isFkMissingDocTypeError,
  isValidDocTypeCode,
  normalizeDocTypeCode,
} from "../src/features/admin/extraction-schemas/docTypeNormalize";

// ---------------------------------------------------------------------------
// normalizeDocTypeCode — 공백 제거 + 대문자 변환
// ---------------------------------------------------------------------------

describe("normalizeDocTypeCode", () => {
  test("lowercases → uppercase", () => {
    assert.equal(normalizeDocTypeCode("contract"), "CONTRACT");
  });

  test("mixed case → full uppercase", () => {
    assert.equal(normalizeDocTypeCode("ConTract_v2"), "CONTRACT_V2");
  });

  test("trims surrounding whitespace first", () => {
    assert.equal(normalizeDocTypeCode("  notice  "), "NOTICE");
  });

  test("trims tabs and newlines too", () => {
    assert.equal(normalizeDocTypeCode("\tpolicy\n"), "POLICY");
  });

  test("already-upper is preserved", () => {
    assert.equal(normalizeDocTypeCode("POLICY"), "POLICY");
  });

  test("digits and separators passthrough unchanged", () => {
    assert.equal(normalizeDocTypeCode("form-2024_rev3"), "FORM-2024_REV3");
  });

  test("does not validate — invalid input is still normalized", () => {
    // 정규화 책임만 수행. regex 검증은 isValidDocTypeCode 가 별도로 한다.
    assert.equal(normalizeDocTypeCode("1contract"), "1CONTRACT");
  });
});

// ---------------------------------------------------------------------------
// isValidDocTypeCode — 대문자 전제 regex
// ---------------------------------------------------------------------------

describe("isValidDocTypeCode", () => {
  test("accepts POLICY", () => {
    assert.equal(isValidDocTypeCode("POLICY"), true);
  });

  test("accepts single char A", () => {
    assert.equal(isValidDocTypeCode("A"), true);
  });

  test("accepts letters + digits + separators", () => {
    assert.equal(isValidDocTypeCode("DOC_TYPE-123"), true);
  });

  test("rejects empty string", () => {
    assert.equal(isValidDocTypeCode(""), false);
  });

  test("rejects digit-leading", () => {
    assert.equal(isValidDocTypeCode("1CONTRACT"), false);
  });

  test("rejects lowercase (pre-normalize callers should normalize first)", () => {
    assert.equal(isValidDocTypeCode("contract"), false);
  });

  test("rejects spaces", () => {
    assert.equal(isValidDocTypeCode("FOO BAR"), false);
  });

  test("rejects special chars", () => {
    assert.equal(isValidDocTypeCode("FOO!"), false);
    assert.equal(isValidDocTypeCode("A.B"), false);
    assert.equal(isValidDocTypeCode("A/B"), false);
  });

  test("DOC_TYPE_CODE_PATTERN is exported and matches helper", () => {
    // pattern constant 자체도 의도대로 동작하는지 확인 (역회귀 방지).
    assert.equal(DOC_TYPE_CODE_PATTERN.test("CONTRACT"), true);
    assert.equal(DOC_TYPE_CODE_PATTERN.test("contract"), false);
  });
});

// ---------------------------------------------------------------------------
// isFkMissingDocTypeError — 서버 422 detail 분류
// ---------------------------------------------------------------------------

describe("isFkMissingDocTypeError", () => {
  test("matches canonical server message", () => {
    const msg =
      "DocumentType 'CONTRACT' 이(가) 존재하지 않습니다. 먼저 /admin/document-types 에서 동일한 코드를 생성한 뒤 다시 시도하세요.";
    assert.equal(isFkMissingDocTypeError(msg), true);
  });

  test("matches message with different code", () => {
    assert.equal(
      isFkMissingDocTypeError("DocumentType 'NONEXISTENT_TYPE' 이(가) 존재하지 않습니다."),
      true
    );
  });

  test("is tolerant of extra whitespace between tokens", () => {
    assert.equal(
      isFkMissingDocTypeError("DocumentType  'X'  이(가)   존재하지 않습니다"),
      true
    );
  });

  test("does not match unrelated 422 messages", () => {
    assert.equal(
      isFkMissingDocTypeError(
        "doc_type_code 는 영문자로 시작하고 영문/숫자/하이픈/언더스코어만 허용됨"
      ),
      false
    );
  });

  test("does not match 409 already-exists message", () => {
    assert.equal(
      isFkMissingDocTypeError(
        "DocumentType 'CONTRACT'에 대한 추출 스키마가 이미 존재합니다"
      ),
      false
    );
  });

  test("null/undefined/empty → false", () => {
    assert.equal(isFkMissingDocTypeError(null), false);
    assert.equal(isFkMissingDocTypeError(undefined), false);
    assert.equal(isFkMissingDocTypeError(""), false);
  });

  test("does not match case-shifted regex (code must stay Korean)", () => {
    // 서버 메시지가 영문으로 바뀌면 여기서 false 가 돼야 오탐을 줄일 수 있다.
    // (메시지 바뀌면 여기서 함께 업데이트하라는 규약 명시)
    assert.equal(
      isFkMissingDocTypeError("DocumentType 'X' does not exist"),
      false
    );
  });
});
