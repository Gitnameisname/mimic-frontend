/**
 * docs/함수도서관 §1.2 (b 라운드) — `@/lib/utils/url`
 * `parseListFilterParams` + `filterReaders` 검증.
 */

process.env.TZ = "UTC";

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  parseListFilterParams,
  filterReaders,
  readString,
  readOptionalString,
  readBool,
  readEnum,
  readBoundedInt,
  readRegexString,
  mutateSearchParams,
  type SearchParamsLike,
} from "../src/lib/utils/url";

// 테스트용 mock — `{ get }` 인터페이스만 있으면 된다.
function mock(entries: Record<string, string | null>): SearchParamsLike {
  return {
    get(key: string) {
      const v = entries[key];
      return v === undefined ? null : v;
    },
  };
}

// ---------------------------------------------------------------------------
// 1. readString
// ---------------------------------------------------------------------------

describe("readString", () => {
  test("키 부재 시 fallback (기본 \"\") 반환", () => {
    assert.equal(readString("q")(mock({})), "");
  });

  test("키 부재 시 fallback 명시 적용", () => {
    assert.equal(readString("q", "default")(mock({})), "default");
  });

  test("값이 \"\" 면 \"\" 그대로 (fallback 적용 안 함)", () => {
    // 사용자가 명시적으로 빈 값을 줬다는 의도 보존
    assert.equal(readString("q", "default")(mock({ q: "" })), "");
  });

  test("값이 있으면 그대로 반환", () => {
    assert.equal(readString("q")(mock({ q: "hello" })), "hello");
  });
});

// ---------------------------------------------------------------------------
// 2. readOptionalString
// ---------------------------------------------------------------------------

describe("readOptionalString", () => {
  test("키 부재 시 undefined", () => {
    assert.equal(readOptionalString("q")(mock({})), undefined);
  });

  test("값이 \"\" 면 \"\" 그대로 (undefined 가 아님)", () => {
    assert.equal(readOptionalString("q")(mock({ q: "" })), "");
  });

  test("값이 있으면 그대로", () => {
    assert.equal(readOptionalString("q")(mock({ q: "hello" })), "hello");
  });
});

// ---------------------------------------------------------------------------
// 3. readBool — 기존 (sp.get(k) ?? "").toLowerCase() === "true" 보일러 대체
// ---------------------------------------------------------------------------

describe("readBool", () => {
  test("키 부재 시 false", () => {
    assert.equal(readBool("flag")(mock({})), false);
  });

  test('"true" → true', () => {
    assert.equal(readBool("flag")(mock({ flag: "true" })), true);
  });

  test('"TRUE" / "True" 도 true (case-insensitive)', () => {
    assert.equal(readBool("flag")(mock({ flag: "TRUE" })), true);
    assert.equal(readBool("flag")(mock({ flag: "True" })), true);
  });

  test('"false" → false', () => {
    assert.equal(readBool("flag")(mock({ flag: "false" })), false);
  });

  test('"1" / "yes" / "on" 은 false (엄격)', () => {
    assert.equal(readBool("flag")(mock({ flag: "1" })), false);
    assert.equal(readBool("flag")(mock({ flag: "yes" })), false);
    assert.equal(readBool("flag")(mock({ flag: "on" })), false);
  });

  test('"" → false', () => {
    assert.equal(readBool("flag")(mock({ flag: "" })), false);
  });
});

// ---------------------------------------------------------------------------
// 4. readEnum
// ---------------------------------------------------------------------------

describe("readEnum", () => {
  const ALLOWED = ["asc", "desc"] as const;

  test("키 부재 시 fallback", () => {
    assert.equal(readEnum("order", ALLOWED, "asc")(mock({})), "asc");
  });

  test("허용 값이면 narrowing 된 값", () => {
    assert.equal(readEnum("order", ALLOWED, "asc")(mock({ order: "desc" })), "desc");
  });

  test("허용 안 된 값이면 fallback", () => {
    assert.equal(readEnum("order", ALLOWED, "asc")(mock({ order: "rand" })), "asc");
  });

  test("fallback 미지정 시 undefined 반환 (오버로드)", () => {
    const r = readEnum("order", ALLOWED);
    assert.equal(r(mock({})), undefined);
    assert.equal(r(mock({ order: "asc" })), "asc");
    assert.equal(r(mock({ order: "x" })), undefined);
  });

  test('"" 는 (보통) 허용 목록에 없으므로 fallback', () => {
    assert.equal(readEnum("order", ALLOWED, "asc")(mock({ order: "" })), "asc");
  });
});

// ---------------------------------------------------------------------------
// 5. readBoundedInt
// ---------------------------------------------------------------------------

describe("readBoundedInt", () => {
  const opt = { min: 1, max: 100, fallback: 1 };

  test("키 부재 시 fallback", () => {
    assert.equal(readBoundedInt("page", opt)(mock({})), 1);
  });

  test("정상 정수", () => {
    assert.equal(readBoundedInt("page", opt)(mock({ page: "5" })), 5);
  });

  test("min · max 경계 포함", () => {
    assert.equal(readBoundedInt("page", opt)(mock({ page: "1" })), 1);
    assert.equal(readBoundedInt("page", opt)(mock({ page: "100" })), 100);
  });

  test("범위 초과 시 fallback", () => {
    assert.equal(readBoundedInt("page", opt)(mock({ page: "0" })), 1);
    assert.equal(readBoundedInt("page", opt)(mock({ page: "101" })), 1);
    assert.equal(readBoundedInt("page", opt)(mock({ page: "-1" })), 1);
  });

  test("소수 / 말미 비숫자 / hex 거부 → fallback", () => {
    assert.equal(readBoundedInt("page", opt)(mock({ page: "1.5" })), 1);
    assert.equal(readBoundedInt("page", opt)(mock({ page: "1abc" })), 1);
    assert.equal(readBoundedInt("page", opt)(mock({ page: "0x10" })), 1);
  });

  test('"" 는 fallback', () => {
    assert.equal(readBoundedInt("page", opt)(mock({ page: "" })), 1);
  });

  test("앞뒤 공백 허용 (trim)", () => {
    assert.equal(readBoundedInt("page", opt)(mock({ page: " 5 " })), 5);
  });
});

// ---------------------------------------------------------------------------
// 6. parseListFilterParams (러너) + 타입 추론
// ---------------------------------------------------------------------------

describe("parseListFilterParams", () => {
  test("schema 의 모든 키를 한 번에 파싱", () => {
    const sp = mock({ q: "hello", include_subfolders: "true", page: "3" });
    const result = parseListFilterParams(sp, {
      q: filterReaders.optionalString("q"),
      include_subfolders: filterReaders.bool("include_subfolders"),
      page: filterReaders.boundedInt("page", { min: 1, max: 100, fallback: 1 }),
    });
    assert.deepEqual(result, {
      q: "hello",
      include_subfolders: true,
      page: 3,
    });
  });

  test("키 부재 케이스도 reader 가 알아서 fallback", () => {
    const sp = mock({});
    const result = parseListFilterParams(sp, {
      q: filterReaders.optionalString("q"),
      include_subfolders: filterReaders.bool("include_subfolders"),
      page: filterReaders.boundedInt("page", { min: 1, max: 100, fallback: 1 }),
    });
    assert.deepEqual(result, {
      q: undefined,
      include_subfolders: false,
      page: 1,
    });
  });

  test("실 URLSearchParams 와도 동작 (mock 과 동등)", () => {
    const sp = new URLSearchParams("?q=foo&include_subfolders=true&page=42");
    const result = parseListFilterParams(sp, {
      q: filterReaders.optionalString("q"),
      include_subfolders: filterReaders.bool("include_subfolders"),
      page: filterReaders.boundedInt("page", { min: 1, max: 100, fallback: 1 }),
    });
    assert.equal(result.q, "foo");
    assert.equal(result.include_subfolders, true);
    assert.equal(result.page, 42);
  });

  test("빈 schema → 빈 객체", () => {
    assert.deepEqual(parseListFilterParams(mock({}), {}), {});
  });

  test("타입 추론 — bool / int / string|undefined 가 정확히 좁혀진다", () => {
    const result = parseListFilterParams(mock({ flag: "true", page: "5", q: "hi" }), {
      flag: filterReaders.bool("flag"),
      page: filterReaders.boundedInt("page", { min: 1, max: 10, fallback: 1 }),
      q: filterReaders.optionalString("q"),
    });
    // 컴파일러 narrowing — 런타임 비교는 부수 검증
    const flag: boolean = result.flag;
    const page: number = result.page;
    const q: string | undefined = result.q;
    assert.equal(flag, true);
    assert.equal(page, 5);
    assert.equal(q, "hi");
  });

  test("프로토타입 오염 키는 무시 (hasOwnProperty 가드)", () => {
    // 일반 객체 리터럴은 prototype property 를 own property 로 가지지 않으므로
    // 표준 사용에서는 영향 없음. 확실하게 가드 동작 검증:
    const schema = Object.create({
      injected: filterReaders.optionalString("injected"),
    }) as Record<string, ReturnType<typeof filterReaders.optionalString>>;
    schema.q = filterReaders.optionalString("q");
    const result = parseListFilterParams(mock({ q: "x", injected: "y" }), schema);
    assert.equal(result.q, "x");
    // injected 는 own property 가 아니라 ignored
    assert.equal((result as Record<string, unknown>).injected, undefined);
  });
});

// ---------------------------------------------------------------------------
// 7. filterReaders 별칭이 named export 와 동일 함수 가리킴
// ---------------------------------------------------------------------------

describe("filterReaders 객체 — alias 일관성", () => {
  test("filterReaders.string === readString", () => {
    assert.equal(filterReaders.string, readString);
  });
  test("filterReaders.optionalString === readOptionalString", () => {
    assert.equal(filterReaders.optionalString, readOptionalString);
  });
  test("filterReaders.bool === readBool", () => {
    assert.equal(filterReaders.bool, readBool);
  });
  test("filterReaders.enum === readEnum", () => {
    assert.equal(filterReaders.enum, readEnum);
  });
  test("filterReaders.boundedInt === readBoundedInt", () => {
    assert.equal(filterReaders.boundedInt, readBoundedInt);
  });
  test("filterReaders.regexString === readRegexString (G-Carry)", () => {
    assert.equal(filterReaders.regexString, readRegexString);
  });
});

// ---------------------------------------------------------------------------
// 9. readRegexString (G-Carry §1.2c)
// ---------------------------------------------------------------------------

describe("readRegexString — 정규식 검증 + normalize", () => {
  const _UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const _UPPER_SNAKE = /^[A-Z][A-Z0-9_-]{0,63}$/;

  test("키 부재 시 fallback (기본 \"\")", () => {
    assert.equal(readRegexString("scope", _UUID)(mock({})), "");
  });

  test("빈 값도 fallback", () => {
    assert.equal(readRegexString("scope", _UUID)(mock({ scope: "" })), "");
  });

  test("정규식 매치되면 그대로 반환", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    assert.equal(readRegexString("scope", _UUID)(mock({ scope: uuid })), uuid);
  });

  test("정규식 불일치 시 fallback", () => {
    assert.equal(readRegexString("scope", _UUID)(mock({ scope: "not-a-uuid" })), "");
  });

  test("normalize 적용 후 검증 — uppercase 케이스", () => {
    const r = readRegexString("type", _UPPER_SNAKE, {
      normalize: (s) => s.toUpperCase(),
    });
    assert.equal(r(mock({ type: "policy_doc" })), "POLICY_DOC");
  });

  test("normalize 후에도 매치 안 되면 fallback", () => {
    const r = readRegexString("type", _UPPER_SNAKE, {
      normalize: (s) => s.toUpperCase(),
    });
    // 숫자로 시작 → 정규식 거부
    assert.equal(r(mock({ type: "1bad" })), "");
  });

  test("fallback 옵션 명시", () => {
    const r = readRegexString("scope", _UUID, { fallback: "ALL" });
    assert.equal(r(mock({})), "ALL");
    assert.equal(r(mock({ scope: "x" })), "ALL");
  });

  test("normalize 가 빈 문자열을 반환하면 fallback", () => {
    const r = readRegexString("type", _UPPER_SNAKE, {
      normalize: (s) => s.trim().toUpperCase(),
    });
    assert.equal(r(mock({ type: "   " })), "");
  });
});

// ---------------------------------------------------------------------------
// 10. mutateSearchParams (G-Carry §1.2c)
// ---------------------------------------------------------------------------

describe("mutateSearchParams — URL state 키 set/delete", () => {
  test("URLSearchParams 입력 + set", () => {
    const sp = new URLSearchParams("collection=c-1");
    assert.equal(mutateSearchParams(sp, { q: "hello" }), "?collection=c-1&q=hello");
  });

  test("string 입력 (\"?\" 포함) + set", () => {
    assert.equal(mutateSearchParams("?a=1", { b: "2" }), "?a=1&b=2");
  });

  test("string 입력 (\"?\" 없음) + set", () => {
    assert.equal(mutateSearchParams("a=1", { b: "2" }), "?a=1&b=2");
  });

  test("null/undefined 입력 → 빈 params 에서 시작", () => {
    assert.equal(mutateSearchParams(null, { q: "x" }), "?q=x");
    assert.equal(mutateSearchParams(undefined, { q: "x" }), "?q=x");
  });

  test("값이 null 이면 키 삭제", () => {
    const sp = new URLSearchParams("a=1&b=2");
    assert.equal(mutateSearchParams(sp, { a: null }), "?b=2");
  });

  test("값이 undefined 이면 키 삭제", () => {
    const sp = new URLSearchParams("a=1&b=2");
    assert.equal(mutateSearchParams(sp, { b: undefined }), "?a=1");
  });

  test("\"\" 는 명시적 빈 값으로 보존 (set)", () => {
    // 기존 toSearchParamsString 의 \"status=\" (전체) 시맨틱과 호환
    const sp = new URLSearchParams("a=1");
    assert.equal(mutateSearchParams(sp, { status: "" }), "?a=1&status=");
  });

  test("기존에 없는 키도 set 가능", () => {
    assert.equal(mutateSearchParams("", { q: "hi" }), "?q=hi");
  });

  test("mutations 에 없는 키는 보존 (touched 안 함)", () => {
    const sp = new URLSearchParams("a=1&b=2&c=3");
    // b 만 변경
    assert.equal(mutateSearchParams(sp, { b: "20" }), "?a=1&b=20&c=3");
  });

  test("입력 URLSearchParams 는 변형하지 않는다 (불변)", () => {
    const sp = new URLSearchParams("a=1");
    mutateSearchParams(sp, { a: "999", b: "2" });
    assert.equal(sp.toString(), "a=1");
  });

  test("결과가 비면 \"\" 반환", () => {
    const sp = new URLSearchParams("a=1");
    assert.equal(mutateSearchParams(sp, { a: null }), "");
  });

  test("prefix:false → \"?\" 생략", () => {
    assert.equal(mutateSearchParams("a=1", { b: "2" }, { prefix: false }), "a=1&b=2");
  });

  test("Next.js ReadonlyURLSearchParams 호환 (toString 보유 객체)", () => {
    // 가짜 ReadonlyURLSearchParams: get 만 있고 toString 도 있는 객체
    const fake: SearchParamsLike & { toString(): string } = {
      get: (k) => (k === "a" ? "1" : null),
      toString: () => "a=1",
    };
    assert.equal(mutateSearchParams(fake, { b: "2" }), "?a=1&b=2");
  });

  test("값이 특수문자면 인코딩 적용", () => {
    assert.equal(mutateSearchParams("", { q: "a b" }), "?q=a+b");
    assert.equal(mutateSearchParams("", { q: "a&b" }), "?q=a%26b");
  });
});

// ---------------------------------------------------------------------------
// 8. 회귀 — DocumentListPage / SearchPage 의 기존 패턴이 그대로 재현되는가
// ---------------------------------------------------------------------------

describe("회귀 — 기존 호출지 패턴 재현", () => {
  test("DocumentListPage 5 필드", () => {
    const sp = mock({
      collection: "c-1",
      folder: "f-1",
      include_subfolders: "true",
      q: "hello",
      tag: "review",
    });
    const result = parseListFilterParams(sp, {
      q: filterReaders.optionalString("q"),
      collection: filterReaders.optionalString("collection"),
      folder: filterReaders.optionalString("folder"),
      include_subfolders: filterReaders.bool("include_subfolders"),
      tag: filterReaders.optionalString("tag"),
    });
    assert.deepEqual(result, {
      q: "hello",
      collection: "c-1",
      folder: "f-1",
      include_subfolders: true,
      tag: "review",
    });
  });

  test("DocumentListPage — 모든 키 부재 시 기본값", () => {
    const sp = mock({});
    const result = parseListFilterParams(sp, {
      q: filterReaders.optionalString("q"),
      collection: filterReaders.optionalString("collection"),
      folder: filterReaders.optionalString("folder"),
      include_subfolders: filterReaders.bool("include_subfolders"),
      tag: filterReaders.optionalString("tag"),
    });
    assert.deepEqual(result, {
      q: undefined,
      collection: undefined,
      folder: undefined,
      include_subfolders: false,
      tag: undefined,
    });
  });

  test("SearchPage — q 는 string 기본값 \"\" (initialQ 패턴)", () => {
    const sp = mock({});
    const result = parseListFilterParams(sp, {
      q: filterReaders.string("q", ""),
      collection: filterReaders.optionalString("collection"),
      folder: filterReaders.optionalString("folder"),
      include_subfolders: filterReaders.bool("include_subfolders"),
    });
    assert.deepEqual(result, {
      q: "",
      collection: undefined,
      folder: undefined,
      include_subfolders: false,
    });
  });

  test("SearchPage include_subfolders=TRUE (case-insensitive 회귀)", () => {
    const sp = mock({ include_subfolders: "TRUE" });
    const result = parseListFilterParams(sp, {
      include_subfolders: filterReaders.bool("include_subfolders"),
    });
    assert.equal(result.include_subfolders, true);
  });
});
