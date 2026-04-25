"use strict";
/**
 * docs/함수도서관 F1 — `@/lib/utils/date` `formatDateTime` 검증.
 *
 * 타임존 결정론을 위해 테스트 파일 로드 시점에 `process.env.TZ = "UTC"` 를 고정한다.
 * Node 런타임은 `Date` 생성 시 TZ 환경변수를 참조하므로, 어떤 호스트에서 실행하든
 * 동일한 결과를 내야 한다.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// 다른 import 보다 먼저 TZ 를 고정한다.
process.env.TZ = "UTC";
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const date_1 = require("../src/lib/utils/date");
(0, node_test_1.describe)("formatDateTime — 정상 입력", () => {
    (0, node_test_1.test)("UTC ISO 문자열을 YYYY-MM-DD HH:mm 로 포맷한다", () => {
        // TZ=UTC 이므로 UTC 표기와 동일
        strict_1.default.equal((0, date_1.formatDateTime)("2026-04-25T11:30:00Z"), "2026-04-25 11:30");
    });
    (0, node_test_1.test)("초·밀리초는 버린다 (분 단위까지만)", () => {
        strict_1.default.equal((0, date_1.formatDateTime)("2026-04-25T11:30:59.999Z"), "2026-04-25 11:30");
    });
    (0, node_test_1.test)("offset 이 포함된 ISO 문자열을 UTC 로 정규화한다 (TZ=UTC)", () => {
        // +09:00 의 자정은 UTC 15:00 전날
        strict_1.default.equal((0, date_1.formatDateTime)("2026-04-25T00:00:00+09:00"), "2026-04-24 15:00");
    });
    (0, node_test_1.test)("월·일·시·분이 한 자릿수이면 0 으로 패딩한다", () => {
        strict_1.default.equal((0, date_1.formatDateTime)("2026-01-02T03:04:05Z"), "2026-01-02 03:04");
    });
    (0, node_test_1.test)("epoch(1970-01-01T00:00:00Z) 를 처리한다", () => {
        strict_1.default.equal((0, date_1.formatDateTime)("1970-01-01T00:00:00Z"), "1970-01-01 00:00");
    });
    (0, node_test_1.test)("윤년 2월 29일을 처리한다", () => {
        strict_1.default.equal((0, date_1.formatDateTime)("2024-02-29T12:34:00Z"), "2024-02-29 12:34");
    });
    (0, node_test_1.test)("자정 직전(23:59) 을 처리한다", () => {
        strict_1.default.equal((0, date_1.formatDateTime)("2026-12-31T23:59:00Z"), "2026-12-31 23:59");
    });
});
(0, node_test_1.describe)("formatDateTime — 방어적 반환", () => {
    (0, node_test_1.test)("null 은 '-'", () => {
        strict_1.default.equal((0, date_1.formatDateTime)(null), "-");
    });
    (0, node_test_1.test)("undefined 는 '-'", () => {
        strict_1.default.equal((0, date_1.formatDateTime)(undefined), "-");
    });
    (0, node_test_1.test)("빈 문자열은 '-'", () => {
        strict_1.default.equal((0, date_1.formatDateTime)(""), "-");
    });
    (0, node_test_1.test)("파싱 불가능한 문자열은 '-'", () => {
        strict_1.default.equal((0, date_1.formatDateTime)("not-a-date"), "-");
    });
    (0, node_test_1.test)("공백만 있는 문자열은 '-'", () => {
        // new Date("   ") → Invalid Date
        strict_1.default.equal((0, date_1.formatDateTime)("   "), "-");
    });
    (0, node_test_1.test)("완전히 망가진 ISO 는 '-'", () => {
        strict_1.default.equal((0, date_1.formatDateTime)("2026-13-45T99:99:99Z"), "-");
    });
});
(0, node_test_1.describe)("formatDateTime — 반환 계약", () => {
    (0, node_test_1.test)("성공 입력은 항상 길이 16 의 문자열을 반환한다", () => {
        const out = (0, date_1.formatDateTime)("2026-04-25T11:30:00Z");
        strict_1.default.equal(out.length, 16);
        strict_1.default.match(out, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    });
    (0, node_test_1.test)("실패 입력은 항상 정확히 '-' 한 글자", () => {
        for (const bad of [null, undefined, "", "bad"]) {
            const out = (0, date_1.formatDateTime)(bad);
            strict_1.default.equal(out, "-");
            strict_1.default.equal(out.length, 1);
        }
    });
    (0, node_test_1.test)("동일 입력에 대해 멱등(idempotent) — 호출마다 같은 결과", () => {
        const iso = "2026-04-25T11:30:00Z";
        const a = (0, date_1.formatDateTime)(iso);
        const b = (0, date_1.formatDateTime)(iso);
        const c = (0, date_1.formatDateTime)(iso);
        strict_1.default.equal(a, b);
        strict_1.default.equal(b, c);
    });
});
// ===========================================================================
// formatDateOnly (FE-G1, 2026-04-25)
// ===========================================================================
(0, node_test_1.describe)("formatDateOnly — 정상 입력", () => {
    (0, node_test_1.test)("UTC ISO 문자열을 YYYY-MM-DD 로 포맷한다", () => {
        strict_1.default.equal((0, date_1.formatDateOnly)("2026-04-25T11:30:00Z"), "2026-04-25");
    });
    (0, node_test_1.test)("시·분을 무시한다", () => {
        strict_1.default.equal((0, date_1.formatDateOnly)("2026-04-25T23:59:59Z"), "2026-04-25");
    });
    (0, node_test_1.test)("월·일이 한 자릿수이면 0 으로 패딩", () => {
        strict_1.default.equal((0, date_1.formatDateOnly)("2026-01-02T00:00:00Z"), "2026-01-02");
    });
    (0, node_test_1.test)("윤년 2월 29일을 처리한다", () => {
        strict_1.default.equal((0, date_1.formatDateOnly)("2024-02-29T00:00:00Z"), "2024-02-29");
    });
    (0, node_test_1.test)("offset 이 양수면 UTC 자정 전이라도 같은 날짜", () => {
        // UTC TZ 기준이라 offset 무관
        strict_1.default.equal((0, date_1.formatDateOnly)("2026-04-25T12:00:00+09:00"), "2026-04-25");
    });
});
(0, node_test_1.describe)("formatDateOnly — 방어적 반환", () => {
    (0, node_test_1.test)("null / undefined / 빈 문자열 → '-'", () => {
        strict_1.default.equal((0, date_1.formatDateOnly)(null), "-");
        strict_1.default.equal((0, date_1.formatDateOnly)(undefined), "-");
        strict_1.default.equal((0, date_1.formatDateOnly)(""), "-");
    });
    (0, node_test_1.test)("파싱 불가능한 문자열 → '-'", () => {
        strict_1.default.equal((0, date_1.formatDateOnly)("not-a-date"), "-");
    });
    (0, node_test_1.test)("성공 입력은 길이 10 (YYYY-MM-DD)", () => {
        const out = (0, date_1.formatDateOnly)("2026-04-25T00:00:00Z");
        strict_1.default.equal(out.length, 10);
        strict_1.default.match(out, /^\d{4}-\d{2}-\d{2}$/);
    });
});
