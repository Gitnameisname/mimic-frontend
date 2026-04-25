/**
 * docs/함수도서관 §1.2 — `@/lib/utils/url` `toQueryString` 검증.
 *
 * 결정성:
 *   - 본 유틸은 시간·로케일·환경 의존이 없다 (`URLSearchParams` 만 사용).
 *   - 그러나 호환성을 위해 `process.env.TZ = "UTC"` 를 고정한다 (다른 테스트와의
 *     로드 순서 영향 차단).
 */

process.env.TZ = "UTC";

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { toQueryString } from "../src/lib/utils/url";

// ---------------------------------------------------------------------------
// 1. 시그니처 / 빈 입력
// ---------------------------------------------------------------------------

describe("toQueryString — 시그니처 · 빈 입력", () => {
  test("빈 객체는 빈 문자열을 반환 (\"?\" 도 붙이지 않음)", () => {
    assert.equal(toQueryString({}), "");
  });

  test("모든 값이 omit-대상 이면 빈 문자열", () => {
    assert.equal(toQueryString({ a: undefined, b: null, c: "" }), "");
  });

  test("하나라도 값이 있으면 \"?\" 가 붙는다", () => {
    assert.equal(toQueryString({ a: 1 }), "?a=1");
  });

  test("prefix:false 이면 \"?\" 없이 raw 만 반환", () => {
    assert.equal(toQueryString({ a: 1 }, { prefix: false }), "a=1");
  });

  test("prefix:false 라도 빈 결과는 빈 문자열 (\"\")", () => {
    assert.equal(toQueryString({}, { prefix: false }), "");
  });
});

// ---------------------------------------------------------------------------
// 2. Scalar 값 처리
// ---------------------------------------------------------------------------

describe("toQueryString — Scalar 값", () => {
  test("문자열 값은 그대로 emit", () => {
    assert.equal(toQueryString({ q: "hello" }), "?q=hello");
  });

  test("숫자 값은 String(n) 으로 emit", () => {
    assert.equal(toQueryString({ page: 1, limit: 20 }), "?page=1&limit=20");
  });

  test("0 도 emit (빈 문자열과 다름)", () => {
    assert.equal(toQueryString({ offset: 0 }), "?offset=0");
  });

  test("음수 · 소수도 emit", () => {
    assert.equal(toQueryString({ x: -1, y: 0.5 }), "?x=-1&y=0.5");
  });

  test("boolean true → \"true\"", () => {
    assert.equal(toQueryString({ flag: true }), "?flag=true");
  });

  test("boolean false → \"false\" (omit 하지 않음)", () => {
    // buildQueryString 과 동일한 시맨틱 — false 도 명시 값으로 보존.
    assert.equal(toQueryString({ flag: false }), "?flag=false");
  });

  test("NaN 은 omit", () => {
    assert.equal(toQueryString({ a: NaN }), "");
  });

  test("Infinity / -Infinity 는 omit", () => {
    assert.equal(toQueryString({ a: Infinity, b: -Infinity }), "");
  });
});

// ---------------------------------------------------------------------------
// 3. Skip 시맨틱 (null / undefined / "")
// ---------------------------------------------------------------------------

describe("toQueryString — null / undefined / \"\" 스킵", () => {
  test("undefined 키는 emit 하지 않는다", () => {
    assert.equal(toQueryString({ a: 1, b: undefined }), "?a=1");
  });

  test("null 키는 emit 하지 않는다", () => {
    assert.equal(toQueryString({ a: 1, b: null }), "?a=1");
  });

  test("빈 문자열 키는 emit 하지 않는다", () => {
    assert.equal(toQueryString({ a: 1, b: "" }), "?a=1");
  });

  test("스킵 후에도 나머지는 정상 emit", () => {
    assert.equal(
      toQueryString({ a: undefined, b: 2, c: null, d: "x", e: "" }),
      "?b=2&d=x",
    );
  });
});

// ---------------------------------------------------------------------------
// 4. 배열 값 (반복 키 emit)
// ---------------------------------------------------------------------------

describe("toQueryString — 배열 값", () => {
  test("배열은 같은 키를 반복 emit", () => {
    assert.equal(
      toQueryString({ status: ["a", "b"] }),
      "?status=a&status=b",
    );
  });

  test("숫자 배열도 동일", () => {
    assert.equal(
      toQueryString({ ids: [1, 2, 3] }),
      "?ids=1&ids=2&ids=3",
    );
  });

  test("boolean 배열 — false 도 보존", () => {
    assert.equal(
      toQueryString({ flags: [true, false] }),
      "?flags=true&flags=false",
    );
  });

  test("배열 내부의 null/undefined/빈 문자열은 개별 스킵", () => {
    assert.equal(
      toQueryString({ tags: ["a", null, "b", undefined, "", "c"] }),
      "?tags=a&tags=b&tags=c",
    );
  });

  test("빈 배열은 키 자체가 emit 되지 않는다", () => {
    assert.equal(toQueryString({ a: 1, status: [] }), "?a=1");
  });

  test("전원이 스킵-대상인 배열은 키 emit 안 함", () => {
    assert.equal(
      toQueryString({ a: 1, status: [null, undefined, ""] }),
      "?a=1",
    );
  });

  test("배열·스칼라 혼재 — 순서 보존", () => {
    assert.equal(
      toQueryString({
        page: 1,
        status: ["pending", "approved"],
        limit: 20,
      }),
      "?page=1&status=pending&status=approved&limit=20",
    );
  });
});

// ---------------------------------------------------------------------------
// 5. 키 순서 / sortKeys
// ---------------------------------------------------------------------------

describe("toQueryString — 키 순서", () => {
  test("기본은 삽입 순서 보존", () => {
    assert.equal(
      toQueryString({ z: 1, a: 2, m: 3 }),
      "?z=1&a=2&m=3",
    );
  });

  test("sortKeys:true 면 알파벳 정렬", () => {
    assert.equal(
      toQueryString({ z: 1, a: 2, m: 3 }, { sortKeys: true }),
      "?a=2&m=3&z=1",
    );
  });

  test("sortKeys 가 배열 키에도 적용된다 (키 자체만 정렬, 배열 원소는 유지)", () => {
    assert.equal(
      toQueryString(
        { z: ["b", "a"], a: 1 },
        { sortKeys: true },
      ),
      "?a=1&z=b&z=a",
    );
  });
});

// ---------------------------------------------------------------------------
// 6. 인코딩 (URLSearchParams 위임)
// ---------------------------------------------------------------------------

describe("toQueryString — 인코딩", () => {
  test("공백은 + 로 인코딩 (application/x-www-form-urlencoded)", () => {
    assert.equal(toQueryString({ q: "a b" }), "?q=a+b");
  });

  test("한글 값은 percent-encoding", () => {
    // "안녕" → URLSearchParams 가 UTF-8 percent-encode
    const out = toQueryString({ q: "안녕" });
    assert.equal(out, "?q=%EC%95%88%EB%85%95");
  });

  test("&·=·# 같은 reserved 문자는 안전하게 인코딩", () => {
    assert.equal(
      toQueryString({ q: "a&b=c#d" }),
      "?q=a%26b%3Dc%23d",
    );
  });

  test("키에 공백/한글이 있어도 인코딩 (호출자 책임이지만 동작은 안전)", () => {
    assert.equal(
      toQueryString({ "filter name": "x" }),
      "?filter+name=x",
    );
  });
});

// ---------------------------------------------------------------------------
// 7. 호환 / 회귀
// ---------------------------------------------------------------------------

describe("toQueryString — 호환 / 회귀", () => {
  test("buildQueryString 동등 케이스 — 스칼라 + null/undefined/\"\" 스킵", () => {
    // 기존 buildQueryString 의 docstring 예시: {page:1, q:"hello", status:undefined}
    assert.equal(
      toQueryString({ page: 1, q: "hello", status: undefined }),
      "?page=1&q=hello",
    );
  });

  test("멱등 — 같은 입력은 같은 출력", () => {
    const input = {
      page: 1,
      status: ["a", "b"],
      flag: true,
      q: "hello",
    } as const;
    const a = toQueryString(input);
    const b = toQueryString(input);
    const c = toQueryString(input);
    assert.equal(a, b);
    assert.equal(b, c);
  });

  test("순수 함수 — 입력 객체를 변형하지 않는다", () => {
    const input = { a: 1, status: ["x", "y"] };
    const before = JSON.stringify(input);
    toQueryString(input);
    assert.equal(JSON.stringify(input), before);
  });
});
