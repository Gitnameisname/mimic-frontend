"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const constants_1 = require("../src/features/admin/extraction-queue/constants");
const helpers_1 = require("../src/features/admin/extraction-queue/helpers");
const client_1 = require("../src/lib/api/client");
// ---------------------------------------------------------------------------
// 상수 자체 무결성
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("EXTRACTION_STATUS 상수", () => {
    (0, node_test_1.test)("세 가지 상태 문자열 값이 백엔드 계약과 동일", () => {
        strict_1.default.equal(constants_1.EXTRACTION_STATUS.PENDING_REVIEW, "pending_review");
        strict_1.default.equal(constants_1.EXTRACTION_STATUS.APPROVED, "approved");
        strict_1.default.equal(constants_1.EXTRACTION_STATUS.REJECTED, "rejected");
    });
    (0, node_test_1.test)("EXTRACTION_STATUS_VALUES 가 3건이고 중복 없음", () => {
        strict_1.default.equal(constants_1.EXTRACTION_STATUS_VALUES.length, 3);
        const unique = new Set(constants_1.EXTRACTION_STATUS_VALUES);
        strict_1.default.equal(unique.size, 3);
    });
    (0, node_test_1.test)("ExtractionResult.status 유니온과 1:1 대응 (라벨/배지 키 누락 없음)", () => {
        for (const s of constants_1.EXTRACTION_STATUS_VALUES) {
            strict_1.default.equal(typeof constants_1.EXTRACTION_STATUS_LABELS[s], "string");
            strict_1.default.notEqual(constants_1.EXTRACTION_STATUS_LABELS[s], "");
            strict_1.default.equal(typeof constants_1.EXTRACTION_STATUS_BADGE_CLASSES[s], "string");
            strict_1.default.notEqual(constants_1.EXTRACTION_STATUS_BADGE_CLASSES[s], "");
        }
    });
    (0, node_test_1.test)("배지 클래스에 bg-/text- 접두사가 각각 포함 (Tailwind 규약)", () => {
        for (const s of constants_1.EXTRACTION_STATUS_VALUES) {
            const cls = constants_1.EXTRACTION_STATUS_BADGE_CLASSES[s];
            strict_1.default.match(cls, /\bbg-\w+-\d+/, `${s}: 배경 클래스 누락`);
            strict_1.default.match(cls, /\btext-\w+-\d+/, `${s}: 텍스트 클래스 누락`);
        }
    });
});
// ---------------------------------------------------------------------------
// isValidExtractionStatus
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("isValidExtractionStatus", () => {
    (0, node_test_1.test)("정의된 3가지 값 → true", () => {
        strict_1.default.equal((0, constants_1.isValidExtractionStatus)("pending_review"), true);
        strict_1.default.equal((0, constants_1.isValidExtractionStatus)("approved"), true);
        strict_1.default.equal((0, constants_1.isValidExtractionStatus)("rejected"), true);
    });
    (0, node_test_1.test)("빈 문자열 → false (전체 필터는 호출부에서 별도 처리)", () => {
        strict_1.default.equal((0, constants_1.isValidExtractionStatus)(""), false);
    });
    (0, node_test_1.test)("오타/대소문자 → false", () => {
        strict_1.default.equal((0, constants_1.isValidExtractionStatus)("PENDING_REVIEW"), false);
        strict_1.default.equal((0, constants_1.isValidExtractionStatus)("pending"), false);
        strict_1.default.equal((0, constants_1.isValidExtractionStatus)("approved "), false); // trailing space
    });
    (0, node_test_1.test)("SQL/JS 인젝션 시도 → false", () => {
        strict_1.default.equal((0, constants_1.isValidExtractionStatus)("'; DROP TABLE"), false);
        strict_1.default.equal((0, constants_1.isValidExtractionStatus)("<script>"), false);
    });
});
// ---------------------------------------------------------------------------
// mutationErrorMessage
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("mutationErrorMessage", () => {
    (0, node_test_1.test)("ApiError 404 → 자원 없음 메시지", () => {
        const msg = (0, helpers_1.mutationErrorMessage)(new client_1.ApiError(404, "server msg"));
        strict_1.default.match(msg, /찾을 수 없습니다/);
    });
    (0, node_test_1.test)("ApiError 403 → Scope Profile 안내", () => {
        const msg = (0, helpers_1.mutationErrorMessage)(new client_1.ApiError(403, "denied"));
        strict_1.default.match(msg, /Scope Profile/);
    });
    (0, node_test_1.test)("ApiError 401 → 세션 재로그인 안내", () => {
        const msg = (0, helpers_1.mutationErrorMessage)(new client_1.ApiError(401, "token"));
        strict_1.default.match(msg, /다시 로그인/);
    });
    (0, node_test_1.test)("ApiError 409 + message 존재 → 서버 message 우선 노출", () => {
        const msg = (0, helpers_1.mutationErrorMessage)(new client_1.ApiError(409, "이미 승인된 결과입니다"));
        strict_1.default.equal(msg, "이미 승인된 결과입니다");
    });
    (0, node_test_1.test)("ApiError 409 + message 공백 → '이미 처리된' fallback", () => {
        const msg = (0, helpers_1.mutationErrorMessage)(new client_1.ApiError(409, ""));
        strict_1.default.match(msg, /이미 처리된/);
    });
    (0, node_test_1.test)("ApiError 그 외 + message 존재 → 서버 message 우선 노출", () => {
        const msg = (0, helpers_1.mutationErrorMessage)(new client_1.ApiError(422, "필드 xxx 는 필수입니다"));
        strict_1.default.equal(msg, "필드 xxx 는 필수입니다");
    });
    (0, node_test_1.test)("ApiError 그 외 + message 공백 → fallback 메시지", () => {
        const msg = (0, helpers_1.mutationErrorMessage)(new client_1.ApiError(500, ""));
        strict_1.default.match(msg, /오류가 발생했습니다/);
    });
    (0, node_test_1.test)("NetworkError → 네트워크 메시지", () => {
        const err = new client_1.NetworkError("/api/x", "POST", "Failed to fetch");
        strict_1.default.match((0, helpers_1.mutationErrorMessage)(err), /네트워크/);
    });
    (0, node_test_1.test)("일반 Error → error.message 노출", () => {
        strict_1.default.equal((0, helpers_1.mutationErrorMessage)(new Error("hi")), "hi");
    });
    (0, node_test_1.test)("unknown (문자열/숫자/null) → 고정 fallback", () => {
        strict_1.default.equal((0, helpers_1.mutationErrorMessage)("str"), "알 수 없는 오류");
        strict_1.default.equal((0, helpers_1.mutationErrorMessage)(42), "알 수 없는 오류");
        strict_1.default.equal((0, helpers_1.mutationErrorMessage)(null), "알 수 없는 오류");
    });
});
// ---------------------------------------------------------------------------
// formatFieldValue
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("formatFieldValue", () => {
    (0, node_test_1.test)("null/undefined → '-'", () => {
        strict_1.default.equal((0, helpers_1.formatFieldValue)(null), "-");
        strict_1.default.equal((0, helpers_1.formatFieldValue)(undefined), "-");
    });
    (0, node_test_1.test)("문자열 그대로", () => {
        strict_1.default.equal((0, helpers_1.formatFieldValue)("hello"), "hello");
        strict_1.default.equal((0, helpers_1.formatFieldValue)(""), "");
    });
    (0, node_test_1.test)("숫자 → 문자열 변환 (로케일 포맷 없음)", () => {
        strict_1.default.equal((0, helpers_1.formatFieldValue)(1000000), "1000000");
        strict_1.default.equal((0, helpers_1.formatFieldValue)(0), "0");
        strict_1.default.equal((0, helpers_1.formatFieldValue)(-3.14), "-3.14");
    });
    (0, node_test_1.test)("boolean → 'true'/'false'", () => {
        strict_1.default.equal((0, helpers_1.formatFieldValue)(true), "true");
        strict_1.default.equal((0, helpers_1.formatFieldValue)(false), "false");
    });
    (0, node_test_1.test)("객체 → JSON 직렬화", () => {
        strict_1.default.equal((0, helpers_1.formatFieldValue)({ a: 1, b: "x" }), '{"a":1,"b":"x"}');
    });
    (0, node_test_1.test)("배열 → JSON 직렬화", () => {
        strict_1.default.equal((0, helpers_1.formatFieldValue)([1, 2, 3]), "[1,2,3]");
    });
    (0, node_test_1.test)("중첩 객체 → 재귀 JSON", () => {
        strict_1.default.equal((0, helpers_1.formatFieldValue)({ outer: { inner: [1, 2] } }), '{"outer":{"inner":[1,2]}}');
    });
});
// ---------------------------------------------------------------------------
// buildApprovePayload — B 스코프(2026-04-22) 신규
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("buildApprovePayload", () => {
    (0, node_test_1.test)("undefined → 빈 객체 (서버 all-approve 의미)", () => {
        const out = (0, helpers_1.buildApprovePayload)(undefined);
        strict_1.default.deepEqual(out, {});
        // overrides 키 자체가 없어야 한다 (Optional 생략 규약).
        strict_1.default.equal(Object.prototype.hasOwnProperty.call(out, "overrides"), false);
    });
    (0, node_test_1.test)("null → 빈 객체", () => {
        strict_1.default.deepEqual((0, helpers_1.buildApprovePayload)(null), {});
    });
    (0, node_test_1.test)("빈 객체 → 빈 객체 (키 제거 = Optional 생략)", () => {
        const out = (0, helpers_1.buildApprovePayload)({});
        strict_1.default.deepEqual(out, {});
        strict_1.default.equal(Object.prototype.hasOwnProperty.call(out, "overrides"), false);
    });
    (0, node_test_1.test)("값이 있는 객체 → overrides 로 감싸서 반환", () => {
        const out = (0, helpers_1.buildApprovePayload)({ price: 1000, vendor: "acme" });
        strict_1.default.deepEqual(out, { overrides: { price: 1000, vendor: "acme" } });
    });
    (0, node_test_1.test)("원본 overrides 는 새 객체에 복사 (얕은 격리)", () => {
        const input = { a: 1 };
        const out = (0, helpers_1.buildApprovePayload)(input);
        strict_1.default.ok(out.overrides);
        // 원본과 출력의 overrides 가 동일 참조가 아니어야 함.
        strict_1.default.notStrictEqual(out.overrides, input);
        // 출력 수정이 원본에 영향 없음.
        out.overrides.a = 999;
        strict_1.default.equal(input.a, 1);
    });
    (0, node_test_1.test)("빈 문자열 값이라도 키가 있으면 보존 (서버 검증 대상)", () => {
        const out = (0, helpers_1.buildApprovePayload)({ note: "" });
        strict_1.default.deepEqual(out, { overrides: { note: "" } });
    });
    (0, node_test_1.test)("null/undefined 값도 키가 있으면 보존 (서버가 검증)", () => {
        const out = (0, helpers_1.buildApprovePayload)({ a: null, b: undefined });
        strict_1.default.ok(out.overrides);
        strict_1.default.equal(Object.prototype.hasOwnProperty.call(out.overrides, "a"), true);
        strict_1.default.equal(Object.prototype.hasOwnProperty.call(out.overrides, "b"), true);
    });
});
// ---------------------------------------------------------------------------
// parseFiltersFromUrl — C 스코프(2026-04-22)
// ---------------------------------------------------------------------------
function makeSp(obj) {
    return { get: (k) => (k in obj ? obj[k] : null) };
}
(0, node_test_1.describe)("parseFiltersFromUrl", () => {
    (0, node_test_1.test)("빈 URL → DEFAULT_QUEUE_FILTERS (page=1, status=pending_review, 나머지 공백)", () => {
        const f = (0, helpers_1.parseFiltersFromUrl)(makeSp({}));
        strict_1.default.deepEqual(f, helpers_1.DEFAULT_QUEUE_FILTERS);
    });
    (0, node_test_1.test)("허용된 status 는 그대로 수용", () => {
        strict_1.default.equal((0, helpers_1.parseFiltersFromUrl)(makeSp({ status: "approved" })).status, "approved");
        strict_1.default.equal((0, helpers_1.parseFiltersFromUrl)(makeSp({ status: "rejected" })).status, "rejected");
        strict_1.default.equal((0, helpers_1.parseFiltersFromUrl)(makeSp({ status: "pending_review" })).status, "pending_review");
    });
    (0, node_test_1.test)("status=빈문자열 은 '전체' 의미로 보존", () => {
        strict_1.default.equal((0, helpers_1.parseFiltersFromUrl)(makeSp({ status: "" })).status, "");
    });
    (0, node_test_1.test)("status 오타/대소문자 불일치 → 기본값 fallback (throw 안함)", () => {
        strict_1.default.equal((0, helpers_1.parseFiltersFromUrl)(makeSp({ status: "APPROVED" })).status, helpers_1.DEFAULT_QUEUE_FILTERS.status);
        strict_1.default.equal((0, helpers_1.parseFiltersFromUrl)(makeSp({ status: "not-a-status" })).status, helpers_1.DEFAULT_QUEUE_FILTERS.status);
    });
    (0, node_test_1.test)("document_type 소문자 입력은 UPPER 정규화", () => {
        strict_1.default.equal((0, helpers_1.parseFiltersFromUrl)(makeSp({ type: "invoice" })).documentType, "INVOICE");
    });
    (0, node_test_1.test)("document_type 이 정규식 불일치 → 빈값", () => {
        strict_1.default.equal((0, helpers_1.parseFiltersFromUrl)(makeSp({ type: "9INVALID" })).documentType, "");
        strict_1.default.equal((0, helpers_1.parseFiltersFromUrl)(makeSp({ type: "a b" })).documentType, "");
        strict_1.default.equal((0, helpers_1.parseFiltersFromUrl)(makeSp({ type: "'; DROP TABLE--" })).documentType, "");
    });
    (0, node_test_1.test)("scope 가 UUID 면 수용, 아니면 빈값", () => {
        const ok = "11111111-2222-3333-4444-555555555555";
        strict_1.default.equal((0, helpers_1.parseFiltersFromUrl)(makeSp({ scope: ok })).scopeProfileId, ok);
        strict_1.default.equal((0, helpers_1.parseFiltersFromUrl)(makeSp({ scope: "not-a-uuid" })).scopeProfileId, "");
    });
    (0, node_test_1.test)("page 가 양수면 수용, 음수/0/NaN → 1", () => {
        strict_1.default.equal((0, helpers_1.parseFiltersFromUrl)(makeSp({ page: "7" })).page, 7);
        strict_1.default.equal((0, helpers_1.parseFiltersFromUrl)(makeSp({ page: "0" })).page, 1);
        strict_1.default.equal((0, helpers_1.parseFiltersFromUrl)(makeSp({ page: "-5" })).page, 1);
        strict_1.default.equal((0, helpers_1.parseFiltersFromUrl)(makeSp({ page: "abc" })).page, 1);
    });
    (0, node_test_1.test)("page 상한 10,000 초과 → 1 로 fallback (서버 상한 보호)", () => {
        strict_1.default.equal((0, helpers_1.parseFiltersFromUrl)(makeSp({ page: "99999" })).page, 1);
    });
    (0, node_test_1.test)("복합 URL 파라미터 → 모든 필드 동시 반영", () => {
        const uuid = "11111111-2222-3333-4444-555555555555";
        const f = (0, helpers_1.parseFiltersFromUrl)(makeSp({ status: "approved", type: "invoice", scope: uuid, page: "3" }));
        strict_1.default.deepEqual(f, {
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
(0, node_test_1.describe)("toSearchParamsString", () => {
    (0, node_test_1.test)("DEFAULT_QUEUE_FILTERS → 빈 문자열 (기본 URL 은 쿼리 없이)", () => {
        strict_1.default.equal((0, helpers_1.toSearchParamsString)(helpers_1.DEFAULT_QUEUE_FILTERS), "");
        strict_1.default.equal((0, helpers_1.toSearchParamsString)({}), "");
    });
    (0, node_test_1.test)("status 변경분만 기록", () => {
        strict_1.default.equal((0, helpers_1.toSearchParamsString)({ ...helpers_1.DEFAULT_QUEUE_FILTERS, status: "approved" }), "status=approved");
    });
    (0, node_test_1.test)("status='' (전체) 는 명시적으로 기록해 사용자 의도 보존", () => {
        strict_1.default.equal((0, helpers_1.toSearchParamsString)({ ...helpers_1.DEFAULT_QUEUE_FILTERS, status: "" }), "status=");
    });
    (0, node_test_1.test)("documentType, scopeProfileId 는 공백이면 생략", () => {
        const out = (0, helpers_1.toSearchParamsString)({
            ...helpers_1.DEFAULT_QUEUE_FILTERS,
            documentType: "INVOICE",
        });
        strict_1.default.equal(out, "type=INVOICE");
    });
    (0, node_test_1.test)("page=1 생략, >1 만 기록", () => {
        strict_1.default.equal((0, helpers_1.toSearchParamsString)({ ...helpers_1.DEFAULT_QUEUE_FILTERS, page: 1 }), "");
        strict_1.default.equal((0, helpers_1.toSearchParamsString)({ ...helpers_1.DEFAULT_QUEUE_FILTERS, page: 5 }), "page=5");
    });
    (0, node_test_1.test)("round-trip: parse(toString(x)) == x", () => {
        const uuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
        const original = {
            status: "rejected",
            documentType: "CONTRACT",
            scopeProfileId: uuid,
            page: 9,
        };
        const qs = (0, helpers_1.toSearchParamsString)(original);
        const parsed = (0, helpers_1.parseFiltersFromUrl)(new URLSearchParams(qs));
        strict_1.default.deepEqual(parsed, original);
    });
    (0, node_test_1.test)("round-trip: 기본값 + 전체상태(빈문자열) 도 왕복", () => {
        const original = {
            status: "",
            documentType: "",
            scopeProfileId: "",
            page: 1,
        };
        const qs = (0, helpers_1.toSearchParamsString)(original);
        const parsed = (0, helpers_1.parseFiltersFromUrl)(new URLSearchParams(qs));
        strict_1.default.deepEqual(parsed, original);
    });
    (0, node_test_1.test)("URL-unsafe 문자는 URLSearchParams 가 인코딩 (주입 방어)", () => {
        // documentType 은 정규식 때문에 여기 도달 불가능하지만, 일반 scope 로도 확인.
        // URLSearchParams 는 자동 인코딩이 원칙 — 검증 목적.
        const sp = new URLSearchParams();
        sp.set("x", "<script>alert(1)</script>");
        strict_1.default.match(sp.toString(), /%3Cscript%3E/);
    });
});
// ---------------------------------------------------------------------------
// validateRejectReason — C 스코프(2026-04-22)
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("validateRejectReason", () => {
    (0, node_test_1.test)("null/undefined → 빈 문자열 정규화 + valid=true (사유 생략 허용)", () => {
        const a = (0, helpers_1.validateRejectReason)(null);
        strict_1.default.equal(a.valid, true);
        strict_1.default.equal(a.normalized, "");
        strict_1.default.equal(a.errorMessage, null);
        const b = (0, helpers_1.validateRejectReason)(undefined);
        strict_1.default.equal(b.valid, true);
        strict_1.default.equal(b.normalized, "");
    });
    (0, node_test_1.test)("빈 문자열 → valid=true", () => {
        const r = (0, helpers_1.validateRejectReason)("");
        strict_1.default.equal(r.valid, true);
        strict_1.default.equal(r.normalized, "");
        strict_1.default.equal(r.remaining, helpers_1.REJECT_REASON_MAX_LENGTH);
    });
    (0, node_test_1.test)("공백만 → 미입력 취급(valid=true, normalized='')", () => {
        const r = (0, helpers_1.validateRejectReason)("   \t\n  ");
        strict_1.default.equal(r.valid, true);
        strict_1.default.equal(r.normalized, "");
    });
    (0, node_test_1.test)("1자 → invalid (실수 방지)", () => {
        const r = (0, helpers_1.validateRejectReason)("a");
        strict_1.default.equal(r.valid, false);
        strict_1.default.match(r.errorMessage ?? "", /3자 이상/);
    });
    (0, node_test_1.test)("2자 → invalid (실수 방지)", () => {
        const r = (0, helpers_1.validateRejectReason)("ab");
        strict_1.default.equal(r.valid, false);
    });
    (0, node_test_1.test)("3자 → valid 경계", () => {
        const r = (0, helpers_1.validateRejectReason)("abc");
        strict_1.default.equal(r.valid, true);
        strict_1.default.equal(r.normalized, "abc");
    });
    (0, node_test_1.test)("표준 한국어 사유 → valid", () => {
        const r = (0, helpers_1.validateRejectReason)("필드 값이 일치하지 않음");
        strict_1.default.equal(r.valid, true);
        strict_1.default.ok(r.normalized.length > 0);
    });
    (0, node_test_1.test)("최대 1024자 경계 → valid", () => {
        const r = (0, helpers_1.validateRejectReason)("a".repeat(helpers_1.REJECT_REASON_MAX_LENGTH));
        strict_1.default.equal(r.valid, true);
        strict_1.default.equal(r.remaining, 0);
    });
    (0, node_test_1.test)("1025자 이상 → invalid (서버 상한 선-방어)", () => {
        const r = (0, helpers_1.validateRejectReason)("a".repeat(helpers_1.REJECT_REASON_MAX_LENGTH + 1));
        strict_1.default.equal(r.valid, false);
        strict_1.default.match(r.errorMessage ?? "", /1,?024자/);
        strict_1.default.ok(r.remaining < 0);
    });
    (0, node_test_1.test)("제어 문자 포함 → invalid (paste 오염 방어)", () => {
        const r = (0, helpers_1.validateRejectReason)("abc\x00def");
        strict_1.default.equal(r.valid, false);
        strict_1.default.match(r.errorMessage ?? "", /제어 문자/);
    });
    (0, node_test_1.test)("탭/개행은 허용 (정상 사유 입력 가능)", () => {
        const r = (0, helpers_1.validateRejectReason)("첫 줄\n두 번째 줄\t탭");
        strict_1.default.equal(r.valid, true);
    });
    (0, node_test_1.test)("trim 후에만 검증 — 앞뒤 공백이 붙은 3자는 허용", () => {
        const r = (0, helpers_1.validateRejectReason)("  abc  ");
        strict_1.default.equal(r.valid, true);
        strict_1.default.equal(r.normalized, "abc");
    });
    (0, node_test_1.test)("remaining 은 trim 전 length 기준 (UX: 타이핑 중 실시간 카운터)", () => {
        const text = "hello";
        const r = (0, helpers_1.validateRejectReason)(text);
        strict_1.default.equal(r.remaining, helpers_1.REJECT_REASON_MAX_LENGTH - text.length);
    });
    (0, node_test_1.test)("숫자(null 안전) 방어 — 타입스크립트 우회 입력도 크래시 없이", () => {
        // @ts-expect-error 의도적 잘못된 타입
        const r = (0, helpers_1.validateRejectReason)(42);
        strict_1.default.equal(r.valid, true);
        strict_1.default.equal(r.normalized, "");
    });
});
