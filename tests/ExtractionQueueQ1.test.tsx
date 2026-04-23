/**
 * Q1 단위 테스트 — 상수/라벨/배지 맵 + 에러/payload 헬퍼.
 *
 * 범위:
 *   - constants.ts    : EXTRACTION_STATUS / VALUES / LABELS / BADGE_CLASSES
 *                       + isValidExtractionStatus
 *   - helpers.ts      : mutationErrorMessage / formatFieldValue / buildApprovePayload
 *
 * B 스코프(2026-04-22) 변경:
 *   - `isRouteMissingError` 테스트 블록 제거 — 백엔드 라우트가 실제로 구현되어
 *     "라우트 미구현" 감지 함수 자체가 사라졌다.
 *   - 409 상태 코드(이미 처리됨) 분기 추가 테스트.
 *   - 승인 payload 빌더(`buildApprovePayload`) 정규화 테스트 추가.
 *
 * 런타임: Node 22 내장 `node:test`. React/DOM 의존성 없음.
 *
 * 이 테스트는 AdminExtractionQueuePage.tsx 본체 (React hooks, react-query)
 * 를 importing 하지 않는다. 페이지 본체는 tsc 컴파일 대상에서 자연스럽게
 * 제외되어 테스트 빌드가 가볍게 유지된다.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  EXTRACTION_STATUS,
  EXTRACTION_STATUS_VALUES,
  EXTRACTION_STATUS_LABELS,
  EXTRACTION_STATUS_BADGE_CLASSES,
  isValidExtractionStatus,
} from "../src/features/admin/extraction-queue/constants";
import {
  mutationErrorMessage,
  formatFieldValue,
  buildApprovePayload,
  parseFiltersFromUrl,
  toSearchParamsString,
  validateRejectReason,
  DEFAULT_QUEUE_FILTERS,
  REJECT_REASON_MAX_LENGTH,
} from "../src/features/admin/extraction-queue/helpers";
import { ApiError, NetworkError } from "../src/lib/api/client";

// ---------------------------------------------------------------------------
// 상수 자체 무결성
// ---------------------------------------------------------------------------

describe("EXTRACTION_STATUS 상수", () => {
  test("세 가지 상태 문자열 값이 백엔드 계약과 동일", () => {
    assert.equal(EXTRACTION_STATUS.PENDING_REVIEW, "pending_review");
    assert.equal(EXTRACTION_STATUS.APPROVED, "approved");
    assert.equal(EXTRACTION_STATUS.REJECTED, "rejected");
  });

  test("EXTRACTION_STATUS_VALUES 가 3건이고 중복 없음", () => {
    assert.equal(EXTRACTION_STATUS_VALUES.length, 3);
    const unique = new Set(EXTRACTION_STATUS_VALUES);
    assert.equal(unique.size, 3);
  });

  test("ExtractionResult.status 유니온과 1:1 대응 (라벨/배지 키 누락 없음)", () => {
    for (const s of EXTRACTION_STATUS_VALUES) {
      assert.equal(typeof EXTRACTION_STATUS_LABELS[s], "string");
      assert.notEqual(EXTRACTION_STATUS_LABELS[s], "");
      assert.equal(typeof EXTRACTION_STATUS_BADGE_CLASSES[s], "string");
      assert.notEqual(EXTRACTION_STATUS_BADGE_CLASSES[s], "");
    }
  });

  test("배지 클래스에 bg-/text- 접두사가 각각 포함 (Tailwind 규약)", () => {
    for (const s of EXTRACTION_STATUS_VALUES) {
      const cls = EXTRACTION_STATUS_BADGE_CLASSES[s];
      assert.match(cls, /\bbg-\w+-\d+/, `${s}: 배경 클래스 누락`);
      assert.match(cls, /\btext-\w+-\d+/, `${s}: 텍스트 클래스 누락`);
    }
  });
});

// ---------------------------------------------------------------------------
// isValidExtractionStatus
// ---------------------------------------------------------------------------

describe("isValidExtractionStatus", () => {
  test("정의된 3가지 값 → true", () => {
    assert.equal(isValidExtractionStatus("pending_review"), true);
    assert.equal(isValidExtractionStatus("approved"), true);
    assert.equal(isValidExtractionStatus("rejected"), true);
  });

  test("빈 문자열 → false (전체 필터는 호출부에서 별도 처리)", () => {
    assert.equal(isValidExtractionStatus(""), false);
  });

  test("오타/대소문자 → false", () => {
    assert.equal(isValidExtractionStatus("PENDING_REVIEW"), false);
    assert.equal(isValidExtractionStatus("pending"), false);
    assert.equal(isValidExtractionStatus("approved "), false); // trailing space
  });

  test("SQL/JS 인젝션 시도 → false", () => {
    assert.equal(isValidExtractionStatus("'; DROP TABLE"), false);
    assert.equal(isValidExtractionStatus("<script>"), false);
  });
});

// ---------------------------------------------------------------------------
// mutationErrorMessage
// ---------------------------------------------------------------------------

describe("mutationErrorMessage", () => {
  test("ApiError 404 → 자원 없음 메시지", () => {
    const msg = mutationErrorMessage(new ApiError(404, "server msg"));
    assert.match(msg, /찾을 수 없습니다/);
  });

  test("ApiError 403 → Scope Profile 안내", () => {
    const msg = mutationErrorMessage(new ApiError(403, "denied"));
    assert.match(msg, /Scope Profile/);
  });

  test("ApiError 401 → 세션 재로그인 안내", () => {
    const msg = mutationErrorMessage(new ApiError(401, "token"));
    assert.match(msg, /다시 로그인/);
  });

  test("ApiError 409 + message 존재 → 서버 message 우선 노출", () => {
    const msg = mutationErrorMessage(
      new ApiError(409, "이미 승인된 결과입니다"),
    );
    assert.equal(msg, "이미 승인된 결과입니다");
  });

  test("ApiError 409 + message 공백 → '이미 처리된' fallback", () => {
    const msg = mutationErrorMessage(new ApiError(409, ""));
    assert.match(msg, /이미 처리된/);
  });

  test("ApiError 그 외 + message 존재 → 서버 message 우선 노출", () => {
    const msg = mutationErrorMessage(new ApiError(422, "필드 xxx 는 필수입니다"));
    assert.equal(msg, "필드 xxx 는 필수입니다");
  });

  test("ApiError 그 외 + message 공백 → fallback 메시지", () => {
    const msg = mutationErrorMessage(new ApiError(500, ""));
    assert.match(msg, /오류가 발생했습니다/);
  });

  test("NetworkError → 네트워크 메시지", () => {
    const err = new NetworkError("/api/x", "POST", "Failed to fetch");
    assert.match(mutationErrorMessage(err), /네트워크/);
  });

  test("일반 Error → error.message 노출", () => {
    assert.equal(mutationErrorMessage(new Error("hi")), "hi");
  });

  test("unknown (문자열/숫자/null) → 고정 fallback", () => {
    assert.equal(mutationErrorMessage("str"), "알 수 없는 오류");
    assert.equal(mutationErrorMessage(42), "알 수 없는 오류");
    assert.equal(mutationErrorMessage(null), "알 수 없는 오류");
  });
});

// ---------------------------------------------------------------------------
// formatFieldValue
// ---------------------------------------------------------------------------

describe("formatFieldValue", () => {
  test("null/undefined → '-'", () => {
    assert.equal(formatFieldValue(null), "-");
    assert.equal(formatFieldValue(undefined), "-");
  });

  test("문자열 그대로", () => {
    assert.equal(formatFieldValue("hello"), "hello");
    assert.equal(formatFieldValue(""), "");
  });

  test("숫자 → 문자열 변환 (로케일 포맷 없음)", () => {
    assert.equal(formatFieldValue(1000000), "1000000");
    assert.equal(formatFieldValue(0), "0");
    assert.equal(formatFieldValue(-3.14), "-3.14");
  });

  test("boolean → 'true'/'false'", () => {
    assert.equal(formatFieldValue(true), "true");
    assert.equal(formatFieldValue(false), "false");
  });

  test("객체 → JSON 직렬화", () => {
    assert.equal(formatFieldValue({ a: 1, b: "x" }), '{"a":1,"b":"x"}');
  });

  test("배열 → JSON 직렬화", () => {
    assert.equal(formatFieldValue([1, 2, 3]), "[1,2,3]");
  });

  test("중첩 객체 → 재귀 JSON", () => {
    assert.equal(
      formatFieldValue({ outer: { inner: [1, 2] } }),
      '{"outer":{"inner":[1,2]}}',
    );
  });
});

// ---------------------------------------------------------------------------
// buildApprovePayload — B 스코프(2026-04-22) 신규
// ---------------------------------------------------------------------------

describe("buildApprovePayload", () => {
  test("undefined → 빈 객체 (서버 all-approve 의미)", () => {
    const out = buildApprovePayload(undefined);
    assert.deepEqual(out, {});
    // overrides 키 자체가 없어야 한다 (Optional 생략 규약).
    assert.equal(Object.prototype.hasOwnProperty.call(out, "overrides"), false);
  });

  test("null → 빈 객체", () => {
    assert.deepEqual(buildApprovePayload(null), {});
  });

  test("빈 객체 → 빈 객체 (키 제거 = Optional 생략)", () => {
    const out = buildApprovePayload({});
    assert.deepEqual(out, {});
    assert.equal(Object.prototype.hasOwnProperty.call(out, "overrides"), false);
  });

  test("값이 있는 객체 → overrides 로 감싸서 반환", () => {
    const out = buildApprovePayload({ price: 1000, vendor: "acme" });
    assert.deepEqual(out, { overrides: { price: 1000, vendor: "acme" } });
  });

  test("원본 overrides 는 새 객체에 복사 (얕은 격리)", () => {
    const input = { a: 1 };
    const out = buildApprovePayload(input);
    assert.ok(out.overrides);
    // 원본과 출력의 overrides 가 동일 참조가 아니어야 함.
    assert.notStrictEqual(out.overrides, input);
    // 출력 수정이 원본에 영향 없음.
    (out.overrides as Record<string, unknown>).a = 999;
    assert.equal(input.a, 1);
  });

  test("빈 문자열 값이라도 키가 있으면 보존 (서버 검증 대상)", () => {
    const out = buildApprovePayload({ note: "" });
    assert.deepEqual(out, { overrides: { note: "" } });
  });

  test("null/undefined 값도 키가 있으면 보존 (서버가 검증)", () => {
    const out = buildApprovePayload({ a: null, b: undefined });
    assert.ok(out.overrides);
    assert.equal(Object.prototype.hasOwnProperty.call(out.overrides, "a"), true);
    assert.equal(Object.prototype.hasOwnProperty.call(out.overrides, "b"), true);
  });
});

// ---------------------------------------------------------------------------
// parseFiltersFromUrl — C 스코프(2026-04-22)
// ---------------------------------------------------------------------------

function makeSp(obj: Record<string, string>): { get: (k: string) => string | null } {
  return { get: (k: string) => (k in obj ? obj[k] : null) };
}

describe("parseFiltersFromUrl", () => {
  test("빈 URL → DEFAULT_QUEUE_FILTERS (page=1, status=pending_review, 나머지 공백)", () => {
    const f = parseFiltersFromUrl(makeSp({}));
    assert.deepEqual(f, DEFAULT_QUEUE_FILTERS);
  });

  test("허용된 status 는 그대로 수용", () => {
    assert.equal(parseFiltersFromUrl(makeSp({ status: "approved" })).status, "approved");
    assert.equal(parseFiltersFromUrl(makeSp({ status: "rejected" })).status, "rejected");
    assert.equal(
      parseFiltersFromUrl(makeSp({ status: "pending_review" })).status,
      "pending_review",
    );
  });

  test("status=빈문자열 은 '전체' 의미로 보존", () => {
    assert.equal(parseFiltersFromUrl(makeSp({ status: "" })).status, "");
  });

  test("status 오타/대소문자 불일치 → 기본값 fallback (throw 안함)", () => {
    assert.equal(
      parseFiltersFromUrl(makeSp({ status: "APPROVED" })).status,
      DEFAULT_QUEUE_FILTERS.status,
    );
    assert.equal(
      parseFiltersFromUrl(makeSp({ status: "not-a-status" })).status,
      DEFAULT_QUEUE_FILTERS.status,
    );
  });

  test("document_type 소문자 입력은 UPPER 정규화", () => {
    assert.equal(parseFiltersFromUrl(makeSp({ type: "invoice" })).documentType, "INVOICE");
  });

  test("document_type 이 정규식 불일치 → 빈값", () => {
    assert.equal(parseFiltersFromUrl(makeSp({ type: "9INVALID" })).documentType, "");
    assert.equal(parseFiltersFromUrl(makeSp({ type: "a b" })).documentType, "");
    assert.equal(parseFiltersFromUrl(makeSp({ type: "'; DROP TABLE--" })).documentType, "");
  });

  test("scope 가 UUID 면 수용, 아니면 빈값", () => {
    const ok = "11111111-2222-3333-4444-555555555555";
    assert.equal(parseFiltersFromUrl(makeSp({ scope: ok })).scopeProfileId, ok);
    assert.equal(parseFiltersFromUrl(makeSp({ scope: "not-a-uuid" })).scopeProfileId, "");
  });

  test("page 가 양수면 수용, 음수/0/NaN → 1", () => {
    assert.equal(parseFiltersFromUrl(makeSp({ page: "7" })).page, 7);
    assert.equal(parseFiltersFromUrl(makeSp({ page: "0" })).page, 1);
    assert.equal(parseFiltersFromUrl(makeSp({ page: "-5" })).page, 1);
    assert.equal(parseFiltersFromUrl(makeSp({ page: "abc" })).page, 1);
  });

  test("page 상한 10,000 초과 → 1 로 fallback (서버 상한 보호)", () => {
    assert.equal(parseFiltersFromUrl(makeSp({ page: "99999" })).page, 1);
  });

  test("복합 URL 파라미터 → 모든 필드 동시 반영", () => {
    const uuid = "11111111-2222-3333-4444-555555555555";
    const f = parseFiltersFromUrl(
      makeSp({ status: "approved", type: "invoice", scope: uuid, page: "3" }),
    );
    assert.deepEqual(f, {
      status: "approved",
      documentType: "INVOICE",
      scopeProfileId: uuid,
      page: 3,
    });
  });
});

// ---------------------------------------------------------------------------
// toSearchParamsString — C 스코프(2026-04-22)
// ---------------------------------------------------------------------------

describe("toSearchParamsString", () => {
  test("DEFAULT_QUEUE_FILTERS → 빈 문자열 (기본 URL 은 쿼리 없이)", () => {
    assert.equal(toSearchParamsString(DEFAULT_QUEUE_FILTERS), "");
    assert.equal(toSearchParamsString({}), "");
  });

  test("status 변경분만 기록", () => {
    assert.equal(
      toSearchParamsString({ ...DEFAULT_QUEUE_FILTERS, status: "approved" }),
      "status=approved",
    );
  });

  test("status='' (전체) 는 명시적으로 기록해 사용자 의도 보존", () => {
    assert.equal(
      toSearchParamsString({ ...DEFAULT_QUEUE_FILTERS, status: "" }),
      "status=",
    );
  });

  test("documentType, scopeProfileId 는 공백이면 생략", () => {
    const out = toSearchParamsString({
      ...DEFAULT_QUEUE_FILTERS,
      documentType: "INVOICE",
    });
    assert.equal(out, "type=INVOICE");
  });

  test("page=1 생략, >1 만 기록", () => {
    assert.equal(
      toSearchParamsString({ ...DEFAULT_QUEUE_FILTERS, page: 1 }),
      "",
    );
    assert.equal(
      toSearchParamsString({ ...DEFAULT_QUEUE_FILTERS, page: 5 }),
      "page=5",
    );
  });

  test("round-trip: parse(toString(x)) == x", () => {
    const uuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    const original = {
      status: "rejected",
      documentType: "CONTRACT",
      scopeProfileId: uuid,
      page: 9,
    };
    const qs = toSearchParamsString(original);
    const parsed = parseFiltersFromUrl(new URLSearchParams(qs));
    assert.deepEqual(parsed, original);
  });

  test("round-trip: 기본값 + 전체상태(빈문자열) 도 왕복", () => {
    const original = {
      status: "",
      documentType: "",
      scopeProfileId: "",
      page: 1,
    };
    const qs = toSearchParamsString(original);
    const parsed = parseFiltersFromUrl(new URLSearchParams(qs));
    assert.deepEqual(parsed, original);
  });

  test("URL-unsafe 문자는 URLSearchParams 가 인코딩 (주입 방어)", () => {
    // documentType 은 정규식 때문에 여기 도달 불가능하지만, 일반 scope 로도 확인.
    // URLSearchParams 는 자동 인코딩이 원칙 — 검증 목적.
    const sp = new URLSearchParams();
    sp.set("x", "<script>alert(1)</script>");
    assert.match(sp.toString(), /%3Cscript%3E/);
  });
});

// ---------------------------------------------------------------------------
// validateRejectReason — C 스코프(2026-04-22)
// ---------------------------------------------------------------------------

describe("validateRejectReason", () => {
  test("null/undefined → 빈 문자열 정규화 + valid=true (사유 생략 허용)", () => {
    const a = validateRejectReason(null);
    assert.equal(a.valid, true);
    assert.equal(a.normalized, "");
    assert.equal(a.errorMessage, null);

    const b = validateRejectReason(undefined);
    assert.equal(b.valid, true);
    assert.equal(b.normalized, "");
  });

  test("빈 문자열 → valid=true", () => {
    const r = validateRejectReason("");
    assert.equal(r.valid, true);
    assert.equal(r.normalized, "");
    assert.equal(r.remaining, REJECT_REASON_MAX_LENGTH);
  });

  test("공백만 → 미입력 취급(valid=true, normalized='')", () => {
    const r = validateRejectReason("   \t\n  ");
    assert.equal(r.valid, true);
    assert.equal(r.normalized, "");
  });

  test("1자 → invalid (실수 방지)", () => {
    const r = validateRejectReason("a");
    assert.equal(r.valid, false);
    assert.match(r.errorMessage ?? "", /3자 이상/);
  });

  test("2자 → invalid (실수 방지)", () => {
    const r = validateRejectReason("ab");
    assert.equal(r.valid, false);
  });

  test("3자 → valid 경계", () => {
    const r = validateRejectReason("abc");
    assert.equal(r.valid, true);
    assert.equal(r.normalized, "abc");
  });

  test("표준 한국어 사유 → valid", () => {
    const r = validateRejectReason("필드 값이 일치하지 않음");
    assert.equal(r.valid, true);
    assert.ok(r.normalized.length > 0);
  });

  test("최대 1024자 경계 → valid", () => {
    const r = validateRejectReason("a".repeat(REJECT_REASON_MAX_LENGTH));
    assert.equal(r.valid, true);
    assert.equal(r.remaining, 0);
  });

  test("1025자 이상 → invalid (서버 상한 선-방어)", () => {
    const r = validateRejectReason("a".repeat(REJECT_REASON_MAX_LENGTH + 1));
    assert.equal(r.valid, false);
    assert.match(r.errorMessage ?? "", /1,?024자/);
    assert.ok(r.remaining < 0);
  });

  test("제어 문자 포함 → invalid (paste 오염 방어)", () => {
    const r = validateRejectReason("abc\x00def");
    assert.equal(r.valid, false);
    assert.match(r.errorMessage ?? "", /제어 문자/);
  });

  test("탭/개행은 허용 (정상 사유 입력 가능)", () => {
    const r = validateRejectReason("첫 줄\n두 번째 줄\t탭");
    assert.equal(r.valid, true);
  });

  test("trim 후에만 검증 — 앞뒤 공백이 붙은 3자는 허용", () => {
    const r = validateRejectReason("  abc  ");
    assert.equal(r.valid, true);
    assert.equal(r.normalized, "abc");
  });

  test("remaining 은 trim 전 length 기준 (UX: 타이핑 중 실시간 카운터)", () => {
    const text = "hello";
    const r = validateRejectReason(text);
    assert.equal(r.remaining, REJECT_REASON_MAX_LENGTH - text.length);
  });

  test("숫자(null 안전) 방어 — 타입스크립트 우회 입력도 크래시 없이", () => {
    // @ts-expect-error 의도적 잘못된 타입
    const r = validateRejectReason(42);
    assert.equal(r.valid, true);
    assert.equal(r.normalized, "");
  });
});
