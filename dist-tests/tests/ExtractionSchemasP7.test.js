"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const docTypeNormalize_1 = require("../src/features/admin/extraction-schemas/docTypeNormalize");
// ---------------------------------------------------------------------------
// normalizeDocTypeCode — 공백 제거 + 대문자 변환
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("normalizeDocTypeCode", () => {
    (0, node_test_1.test)("lowercases → uppercase", () => {
        strict_1.default.equal((0, docTypeNormalize_1.normalizeDocTypeCode)("contract"), "CONTRACT");
    });
    (0, node_test_1.test)("mixed case → full uppercase", () => {
        strict_1.default.equal((0, docTypeNormalize_1.normalizeDocTypeCode)("ConTract_v2"), "CONTRACT_V2");
    });
    (0, node_test_1.test)("trims surrounding whitespace first", () => {
        strict_1.default.equal((0, docTypeNormalize_1.normalizeDocTypeCode)("  notice  "), "NOTICE");
    });
    (0, node_test_1.test)("trims tabs and newlines too", () => {
        strict_1.default.equal((0, docTypeNormalize_1.normalizeDocTypeCode)("\tpolicy\n"), "POLICY");
    });
    (0, node_test_1.test)("already-upper is preserved", () => {
        strict_1.default.equal((0, docTypeNormalize_1.normalizeDocTypeCode)("POLICY"), "POLICY");
    });
    (0, node_test_1.test)("digits and separators passthrough unchanged", () => {
        strict_1.default.equal((0, docTypeNormalize_1.normalizeDocTypeCode)("form-2024_rev3"), "FORM-2024_REV3");
    });
    (0, node_test_1.test)("does not validate — invalid input is still normalized", () => {
        // 정규화 책임만 수행. regex 검증은 isValidDocTypeCode 가 별도로 한다.
        strict_1.default.equal((0, docTypeNormalize_1.normalizeDocTypeCode)("1contract"), "1CONTRACT");
    });
});
// ---------------------------------------------------------------------------
// isValidDocTypeCode — 대문자 전제 regex
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("isValidDocTypeCode", () => {
    (0, node_test_1.test)("accepts POLICY", () => {
        strict_1.default.equal((0, docTypeNormalize_1.isValidDocTypeCode)("POLICY"), true);
    });
    (0, node_test_1.test)("accepts single char A", () => {
        strict_1.default.equal((0, docTypeNormalize_1.isValidDocTypeCode)("A"), true);
    });
    (0, node_test_1.test)("accepts letters + digits + separators", () => {
        strict_1.default.equal((0, docTypeNormalize_1.isValidDocTypeCode)("DOC_TYPE-123"), true);
    });
    (0, node_test_1.test)("rejects empty string", () => {
        strict_1.default.equal((0, docTypeNormalize_1.isValidDocTypeCode)(""), false);
    });
    (0, node_test_1.test)("rejects digit-leading", () => {
        strict_1.default.equal((0, docTypeNormalize_1.isValidDocTypeCode)("1CONTRACT"), false);
    });
    (0, node_test_1.test)("rejects lowercase (pre-normalize callers should normalize first)", () => {
        strict_1.default.equal((0, docTypeNormalize_1.isValidDocTypeCode)("contract"), false);
    });
    (0, node_test_1.test)("rejects spaces", () => {
        strict_1.default.equal((0, docTypeNormalize_1.isValidDocTypeCode)("FOO BAR"), false);
    });
    (0, node_test_1.test)("rejects special chars", () => {
        strict_1.default.equal((0, docTypeNormalize_1.isValidDocTypeCode)("FOO!"), false);
        strict_1.default.equal((0, docTypeNormalize_1.isValidDocTypeCode)("A.B"), false);
        strict_1.default.equal((0, docTypeNormalize_1.isValidDocTypeCode)("A/B"), false);
    });
    (0, node_test_1.test)("DOC_TYPE_CODE_PATTERN is exported and matches helper", () => {
        // pattern constant 자체도 의도대로 동작하는지 확인 (역회귀 방지).
        strict_1.default.equal(docTypeNormalize_1.DOC_TYPE_CODE_PATTERN.test("CONTRACT"), true);
        strict_1.default.equal(docTypeNormalize_1.DOC_TYPE_CODE_PATTERN.test("contract"), false);
    });
});
// ---------------------------------------------------------------------------
// isFkMissingDocTypeError — 서버 422 detail 분류
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("isFkMissingDocTypeError", () => {
    (0, node_test_1.test)("matches canonical server message", () => {
        const msg = "DocumentType 'CONTRACT' 이(가) 존재하지 않습니다. 먼저 /admin/document-types 에서 동일한 코드를 생성한 뒤 다시 시도하세요.";
        strict_1.default.equal((0, docTypeNormalize_1.isFkMissingDocTypeError)(msg), true);
    });
    (0, node_test_1.test)("matches message with different code", () => {
        strict_1.default.equal((0, docTypeNormalize_1.isFkMissingDocTypeError)("DocumentType 'NONEXISTENT_TYPE' 이(가) 존재하지 않습니다."), true);
    });
    (0, node_test_1.test)("is tolerant of extra whitespace between tokens", () => {
        strict_1.default.equal((0, docTypeNormalize_1.isFkMissingDocTypeError)("DocumentType  'X'  이(가)   존재하지 않습니다"), true);
    });
    (0, node_test_1.test)("does not match unrelated 422 messages", () => {
        strict_1.default.equal((0, docTypeNormalize_1.isFkMissingDocTypeError)("doc_type_code 는 영문자로 시작하고 영문/숫자/하이픈/언더스코어만 허용됨"), false);
    });
    (0, node_test_1.test)("does not match 409 already-exists message", () => {
        strict_1.default.equal((0, docTypeNormalize_1.isFkMissingDocTypeError)("DocumentType 'CONTRACT'에 대한 추출 스키마가 이미 존재합니다"), false);
    });
    (0, node_test_1.test)("null/undefined/empty → false", () => {
        strict_1.default.equal((0, docTypeNormalize_1.isFkMissingDocTypeError)(null), false);
        strict_1.default.equal((0, docTypeNormalize_1.isFkMissingDocTypeError)(undefined), false);
        strict_1.default.equal((0, docTypeNormalize_1.isFkMissingDocTypeError)(""), false);
    });
    (0, node_test_1.test)("does not match case-shifted regex (code must stay Korean)", () => {
        // 서버 메시지가 영문으로 바뀌면 여기서 false 가 돼야 오탐을 줄일 수 있다.
        // (메시지 바뀌면 여기서 함께 업데이트하라는 규약 명시)
        strict_1.default.equal((0, docTypeNormalize_1.isFkMissingDocTypeError)("DocumentType 'X' does not exist"), false);
    });
});
