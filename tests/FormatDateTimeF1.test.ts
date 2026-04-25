/**
 * docs/함수도서관 F1 — `@/lib/utils/date` `formatDateTime` 검증.
 *
 * 타임존 결정론을 위해 테스트 파일 로드 시점에 `process.env.TZ = "UTC"` 를 고정한다.
 * Node 런타임은 `Date` 생성 시 TZ 환경변수를 참조하므로, 어떤 호스트에서 실행하든
 * 동일한 결과를 내야 한다.
 */

// 다른 import 보다 먼저 TZ 를 고정한다.
process.env.TZ = "UTC";

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { formatDateTime, formatDateOnly } from "../src/lib/utils/date";

describe("formatDateTime — 정상 입력", () => {
  test("UTC ISO 문자열을 YYYY-MM-DD HH:mm 로 포맷한다", () => {
    // TZ=UTC 이므로 UTC 표기와 동일
    assert.equal(formatDateTime("2026-04-25T11:30:00Z"), "2026-04-25 11:30");
  });

  test("초·밀리초는 버린다 (분 단위까지만)", () => {
    assert.equal(formatDateTime("2026-04-25T11:30:59.999Z"), "2026-04-25 11:30");
  });

  test("offset 이 포함된 ISO 문자열을 UTC 로 정규화한다 (TZ=UTC)", () => {
    // +09:00 의 자정은 UTC 15:00 전날
    assert.equal(formatDateTime("2026-04-25T00:00:00+09:00"), "2026-04-24 15:00");
  });

  test("월·일·시·분이 한 자릿수이면 0 으로 패딩한다", () => {
    assert.equal(formatDateTime("2026-01-02T03:04:05Z"), "2026-01-02 03:04");
  });

  test("epoch(1970-01-01T00:00:00Z) 를 처리한다", () => {
    assert.equal(formatDateTime("1970-01-01T00:00:00Z"), "1970-01-01 00:00");
  });

  test("윤년 2월 29일을 처리한다", () => {
    assert.equal(formatDateTime("2024-02-29T12:34:00Z"), "2024-02-29 12:34");
  });

  test("자정 직전(23:59) 을 처리한다", () => {
    assert.equal(formatDateTime("2026-12-31T23:59:00Z"), "2026-12-31 23:59");
  });
});

describe("formatDateTime — 방어적 반환", () => {
  test("null 은 '-'", () => {
    assert.equal(formatDateTime(null), "-");
  });

  test("undefined 는 '-'", () => {
    assert.equal(formatDateTime(undefined), "-");
  });

  test("빈 문자열은 '-'", () => {
    assert.equal(formatDateTime(""), "-");
  });

  test("파싱 불가능한 문자열은 '-'", () => {
    assert.equal(formatDateTime("not-a-date"), "-");
  });

  test("공백만 있는 문자열은 '-'", () => {
    // new Date("   ") → Invalid Date
    assert.equal(formatDateTime("   "), "-");
  });

  test("완전히 망가진 ISO 는 '-'", () => {
    assert.equal(formatDateTime("2026-13-45T99:99:99Z"), "-");
  });
});

describe("formatDateTime — 반환 계약", () => {
  test("성공 입력은 항상 길이 16 의 문자열을 반환한다", () => {
    const out = formatDateTime("2026-04-25T11:30:00Z");
    assert.equal(out.length, 16);
    assert.match(out, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  test("실패 입력은 항상 정확히 '-' 한 글자", () => {
    for (const bad of [null, undefined, "", "bad"]) {
      const out = formatDateTime(bad);
      assert.equal(out, "-");
      assert.equal(out.length, 1);
    }
  });

  test("동일 입력에 대해 멱등(idempotent) — 호출마다 같은 결과", () => {
    const iso = "2026-04-25T11:30:00Z";
    const a = formatDateTime(iso);
    const b = formatDateTime(iso);
    const c = formatDateTime(iso);
    assert.equal(a, b);
    assert.equal(b, c);
  });
});

// ===========================================================================
// formatDateOnly (FE-G1, 2026-04-25)
// ===========================================================================

describe("formatDateOnly — 정상 입력", () => {
  test("UTC ISO 문자열을 YYYY-MM-DD 로 포맷한다", () => {
    assert.equal(formatDateOnly("2026-04-25T11:30:00Z"), "2026-04-25");
  });

  test("시·분을 무시한다", () => {
    assert.equal(formatDateOnly("2026-04-25T23:59:59Z"), "2026-04-25");
  });

  test("월·일이 한 자릿수이면 0 으로 패딩", () => {
    assert.equal(formatDateOnly("2026-01-02T00:00:00Z"), "2026-01-02");
  });

  test("윤년 2월 29일을 처리한다", () => {
    assert.equal(formatDateOnly("2024-02-29T00:00:00Z"), "2024-02-29");
  });

  test("offset 이 양수면 UTC 자정 전이라도 같은 날짜", () => {
    // UTC TZ 기준이라 offset 무관
    assert.equal(formatDateOnly("2026-04-25T12:00:00+09:00"), "2026-04-25");
  });
});

describe("formatDateOnly — 방어적 반환", () => {
  test("null / undefined / 빈 문자열 → '-'", () => {
    assert.equal(formatDateOnly(null), "-");
    assert.equal(formatDateOnly(undefined), "-");
    assert.equal(formatDateOnly(""), "-");
  });

  test("파싱 불가능한 문자열 → '-'", () => {
    assert.equal(formatDateOnly("not-a-date"), "-");
  });

  test("성공 입력은 길이 10 (YYYY-MM-DD)", () => {
    const out = formatDateOnly("2026-04-25T00:00:00Z");
    assert.equal(out.length, 10);
    assert.match(out, /^\d{4}-\d{2}-\d{2}$/);
  });
});
