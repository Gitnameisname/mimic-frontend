"use strict";
/**
 * docs/함수도서관 §1.2 (b 라운드) — `@/lib/utils/url`
 * `parseListFilterParams` + `filterReaders` 검증.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env.TZ = "UTC";
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const url_1 = require("../src/lib/utils/url");
// 테스트용 mock — `{ get }` 인터페이스만 있으면 된다.
function mock(entries) {
    return {
        get(key) {
            const v = entries[key];
            return v === undefined ? null : v;
        },
    };
}
// ---------------------------------------------------------------------------
// 1. readString
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("readString", () => {
    (0, node_test_1.test)("키 부재 시 fallback (기본 \"\") 반환", () => {
        strict_1.default.equal((0, url_1.readString)("q")(mock({})), "");
    });
    (0, node_test_1.test)("키 부재 시 fallback 명시 적용", () => {
        strict_1.default.equal((0, url_1.readString)("q", "default")(mock({})), "default");
    });
    (0, node_test_1.test)("값이 \"\" 면 \"\" 그대로 (fallback 적용 안 함)", () => {
        // 사용자가 명시적으로 빈 값을 줬다는 의도 보존
        strict_1.default.equal((0, url_1.readString)("q", "default")(mock({ q: "" })), "");
    });
    (0, node_test_1.test)("값이 있으면 그대로 반환", () => {
        strict_1.default.equal((0, url_1.readString)("q")(mock({ q: "hello" })), "hello");
    });
});
// ---------------------------------------------------------------------------
// 2. readOptionalString
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("readOptionalString", () => {
    (0, node_test_1.test)("키 부재 시 undefined", () => {
        strict_1.default.equal((0, url_1.readOptionalString)("q")(mock({})), undefined);
    });
    (0, node_test_1.test)("값이 \"\" 면 \"\" 그대로 (undefined 가 아님)", () => {
        strict_1.default.equal((0, url_1.readOptionalString)("q")(mock({ q: "" })), "");
    });
    (0, node_test_1.test)("값이 있으면 그대로", () => {
        strict_1.default.equal((0, url_1.readOptionalString)("q")(mock({ q: "hello" })), "hello");
    });
});
// ---------------------------------------------------------------------------
// 3. readBool — 기존 (sp.get(k) ?? "").toLowerCase() === "true" 보일러 대체
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("readBool", () => {
    (0, node_test_1.test)("키 부재 시 false", () => {
        strict_1.default.equal((0, url_1.readBool)("flag")(mock({})), false);
    });
    (0, node_test_1.test)('"true" → true', () => {
        strict_1.default.equal((0, url_1.readBool)("flag")(mock({ flag: "true" })), true);
    });
    (0, node_test_1.test)('"TRUE" / "True" 도 true (case-insensitive)', () => {
        strict_1.default.equal((0, url_1.readBool)("flag")(mock({ flag: "TRUE" })), true);
        strict_1.default.equal((0, url_1.readBool)("flag")(mock({ flag: "True" })), true);
    });
    (0, node_test_1.test)('"false" → false', () => {
        strict_1.default.equal((0, url_1.readBool)("flag")(mock({ flag: "false" })), false);
    });
    (0, node_test_1.test)('"1" / "yes" / "on" 은 false (엄격)', () => {
        strict_1.default.equal((0, url_1.readBool)("flag")(mock({ flag: "1" })), false);
        strict_1.default.equal((0, url_1.readBool)("flag")(mock({ flag: "yes" })), false);
        strict_1.default.equal((0, url_1.readBool)("flag")(mock({ flag: "on" })), false);
    });
    (0, node_test_1.test)('"" → false', () => {
        strict_1.default.equal((0, url_1.readBool)("flag")(mock({ flag: "" })), false);
    });
});
// ---------------------------------------------------------------------------
// 4. readEnum
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("readEnum", () => {
    const ALLOWED = ["asc", "desc"];
    (0, node_test_1.test)("키 부재 시 fallback", () => {
        strict_1.default.equal((0, url_1.readEnum)("order", ALLOWED, "asc")(mock({})), "asc");
    });
    (0, node_test_1.test)("허용 값이면 narrowing 된 값", () => {
        strict_1.default.equal((0, url_1.readEnum)("order", ALLOWED, "asc")(mock({ order: "desc" })), "desc");
    });
    (0, node_test_1.test)("허용 안 된 값이면 fallback", () => {
        strict_1.default.equal((0, url_1.readEnum)("order", ALLOWED, "asc")(mock({ order: "rand" })), "asc");
    });
    (0, node_test_1.test)("fallback 미지정 시 undefined 반환 (오버로드)", () => {
        const r = (0, url_1.readEnum)("order", ALLOWED);
        strict_1.default.equal(r(mock({})), undefined);
        strict_1.default.equal(r(mock({ order: "asc" })), "asc");
        strict_1.default.equal(r(mock({ order: "x" })), undefined);
    });
    (0, node_test_1.test)('"" 는 (보통) 허용 목록에 없으므로 fallback', () => {
        strict_1.default.equal((0, url_1.readEnum)("order", ALLOWED, "asc")(mock({ order: "" })), "asc");
    });
});
// ---------------------------------------------------------------------------
// 5. readBoundedInt
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("readBoundedInt", () => {
    const opt = { min: 1, max: 100, fallback: 1 };
    (0, node_test_1.test)("키 부재 시 fallback", () => {
        strict_1.default.equal((0, url_1.readBoundedInt)("page", opt)(mock({})), 1);
    });
    (0, node_test_1.test)("정상 정수", () => {
        strict_1.default.equal((0, url_1.readBoundedInt)("page", opt)(mock({ page: "5" })), 5);
    });
    (0, node_test_1.test)("min · max 경계 포함", () => {
        strict_1.default.equal((0, url_1.readBoundedInt)("page", opt)(mock({ page: "1" })), 1);
        strict_1.default.equal((0, url_1.readBoundedInt)("page", opt)(mock({ page: "100" })), 100);
    });
    (0, node_test_1.test)("범위 초과 시 fallback", () => {
        strict_1.default.equal((0, url_1.readBoundedInt)("page", opt)(mock({ page: "0" })), 1);
        strict_1.default.equal((0, url_1.readBoundedInt)("page", opt)(mock({ page: "101" })), 1);
        strict_1.default.equal((0, url_1.readBoundedInt)("page", opt)(mock({ page: "-1" })), 1);
    });
    (0, node_test_1.test)("소수 / 말미 비숫자 / hex 거부 → fallback", () => {
        strict_1.default.equal((0, url_1.readBoundedInt)("page", opt)(mock({ page: "1.5" })), 1);
        strict_1.default.equal((0, url_1.readBoundedInt)("page", opt)(mock({ page: "1abc" })), 1);
        strict_1.default.equal((0, url_1.readBoundedInt)("page", opt)(mock({ page: "0x10" })), 1);
    });
    (0, node_test_1.test)('"" 는 fallback', () => {
        strict_1.default.equal((0, url_1.readBoundedInt)("page", opt)(mock({ page: "" })), 1);
    });
    (0, node_test_1.test)("앞뒤 공백 허용 (trim)", () => {
        strict_1.default.equal((0, url_1.readBoundedInt)("page", opt)(mock({ page: " 5 " })), 5);
    });
});
// ---------------------------------------------------------------------------
// 6. parseListFilterParams (러너) + 타입 추론
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("parseListFilterParams", () => {
    (0, node_test_1.test)("schema 의 모든 키를 한 번에 파싱", () => {
        const sp = mock({ q: "hello", include_subfolders: "true", page: "3" });
        const result = (0, url_1.parseListFilterParams)(sp, {
            q: url_1.filterReaders.optionalString("q"),
            include_subfolders: url_1.filterReaders.bool("include_subfolders"),
            page: url_1.filterReaders.boundedInt("page", { min: 1, max: 100, fallback: 1 }),
        });
        strict_1.default.deepEqual(result, {
            q: "hello",
            include_subfolders: true,
            page: 3,
        });
    });
    (0, node_test_1.test)("키 부재 케이스도 reader 가 알아서 fallback", () => {
        const sp = mock({});
        const result = (0, url_1.parseListFilterParams)(sp, {
            q: url_1.filterReaders.optionalString("q"),
            include_subfolders: url_1.filterReaders.bool("include_subfolders"),
            page: url_1.filterReaders.boundedInt("page", { min: 1, max: 100, fallback: 1 }),
        });
        strict_1.default.deepEqual(result, {
            q: undefined,
            include_subfolders: false,
            page: 1,
        });
    });
    (0, node_test_1.test)("실 URLSearchParams 와도 동작 (mock 과 동등)", () => {
        const sp = new URLSearchParams("?q=foo&include_subfolders=true&page=42");
        const result = (0, url_1.parseListFilterParams)(sp, {
            q: url_1.filterReaders.optionalString("q"),
            include_subfolders: url_1.filterReaders.bool("include_subfolders"),
            page: url_1.filterReaders.boundedInt("page", { min: 1, max: 100, fallback: 1 }),
        });
        strict_1.default.equal(result.q, "foo");
        strict_1.default.equal(result.include_subfolders, true);
        strict_1.default.equal(result.page, 42);
    });
    (0, node_test_1.test)("빈 schema → 빈 객체", () => {
        strict_1.default.deepEqual((0, url_1.parseListFilterParams)(mock({}), {}), {});
    });
    (0, node_test_1.test)("타입 추론 — bool / int / string|undefined 가 정확히 좁혀진다", () => {
        const result = (0, url_1.parseListFilterParams)(mock({ flag: "true", page: "5", q: "hi" }), {
            flag: url_1.filterReaders.bool("flag"),
            page: url_1.filterReaders.boundedInt("page", { min: 1, max: 10, fallback: 1 }),
            q: url_1.filterReaders.optionalString("q"),
        });
        // 컴파일러 narrowing — 런타임 비교는 부수 검증
        const flag = result.flag;
        const page = result.page;
        const q = result.q;
        strict_1.default.equal(flag, true);
        strict_1.default.equal(page, 5);
        strict_1.default.equal(q, "hi");
    });
    (0, node_test_1.test)("프로토타입 오염 키는 무시 (hasOwnProperty 가드)", () => {
        // 일반 객체 리터럴은 prototype property 를 own property 로 가지지 않으므로
        // 표준 사용에서는 영향 없음. 확실하게 가드 동작 검증:
        const schema = Object.create({
            injected: url_1.filterReaders.optionalString("injected"),
        });
        schema.q = url_1.filterReaders.optionalString("q");
        const result = (0, url_1.parseListFilterParams)(mock({ q: "x", injected: "y" }), schema);
        strict_1.default.equal(result.q, "x");
        // injected 는 own property 가 아니라 ignored
        strict_1.default.equal(result.injected, undefined);
    });
});
// ---------------------------------------------------------------------------
// 7. filterReaders 별칭이 named export 와 동일 함수 가리킴
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("filterReaders 객체 — alias 일관성", () => {
    (0, node_test_1.test)("filterReaders.string === readString", () => {
        strict_1.default.equal(url_1.filterReaders.string, url_1.readString);
    });
    (0, node_test_1.test)("filterReaders.optionalString === readOptionalString", () => {
        strict_1.default.equal(url_1.filterReaders.optionalString, url_1.readOptionalString);
    });
    (0, node_test_1.test)("filterReaders.bool === readBool", () => {
        strict_1.default.equal(url_1.filterReaders.bool, url_1.readBool);
    });
    (0, node_test_1.test)("filterReaders.enum === readEnum", () => {
        strict_1.default.equal(url_1.filterReaders.enum, url_1.readEnum);
    });
    (0, node_test_1.test)("filterReaders.boundedInt === readBoundedInt", () => {
        strict_1.default.equal(url_1.filterReaders.boundedInt, url_1.readBoundedInt);
    });
    (0, node_test_1.test)("filterReaders.regexString === readRegexString (G-Carry)", () => {
        strict_1.default.equal(url_1.filterReaders.regexString, url_1.readRegexString);
    });
});
// ---------------------------------------------------------------------------
// 9. readRegexString (G-Carry §1.2c)
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("readRegexString — 정규식 검증 + normalize", () => {
    const _UUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    const _UPPER_SNAKE = /^[A-Z][A-Z0-9_-]{0,63}$/;
    (0, node_test_1.test)("키 부재 시 fallback (기본 \"\")", () => {
        strict_1.default.equal((0, url_1.readRegexString)("scope", _UUID)(mock({})), "");
    });
    (0, node_test_1.test)("빈 값도 fallback", () => {
        strict_1.default.equal((0, url_1.readRegexString)("scope", _UUID)(mock({ scope: "" })), "");
    });
    (0, node_test_1.test)("정규식 매치되면 그대로 반환", () => {
        const uuid = "550e8400-e29b-41d4-a716-446655440000";
        strict_1.default.equal((0, url_1.readRegexString)("scope", _UUID)(mock({ scope: uuid })), uuid);
    });
    (0, node_test_1.test)("정규식 불일치 시 fallback", () => {
        strict_1.default.equal((0, url_1.readRegexString)("scope", _UUID)(mock({ scope: "not-a-uuid" })), "");
    });
    (0, node_test_1.test)("normalize 적용 후 검증 — uppercase 케이스", () => {
        const r = (0, url_1.readRegexString)("type", _UPPER_SNAKE, {
            normalize: (s) => s.toUpperCase(),
        });
        strict_1.default.equal(r(mock({ type: "policy_doc" })), "POLICY_DOC");
    });
    (0, node_test_1.test)("normalize 후에도 매치 안 되면 fallback", () => {
        const r = (0, url_1.readRegexString)("type", _UPPER_SNAKE, {
            normalize: (s) => s.toUpperCase(),
        });
        // 숫자로 시작 → 정규식 거부
        strict_1.default.equal(r(mock({ type: "1bad" })), "");
    });
    (0, node_test_1.test)("fallback 옵션 명시", () => {
        const r = (0, url_1.readRegexString)("scope", _UUID, { fallback: "ALL" });
        strict_1.default.equal(r(mock({})), "ALL");
        strict_1.default.equal(r(mock({ scope: "x" })), "ALL");
    });
    (0, node_test_1.test)("normalize 가 빈 문자열을 반환하면 fallback", () => {
        const r = (0, url_1.readRegexString)("type", _UPPER_SNAKE, {
            normalize: (s) => s.trim().toUpperCase(),
        });
        strict_1.default.equal(r(mock({ type: "   " })), "");
    });
});
// ---------------------------------------------------------------------------
// 10. mutateSearchParams (G-Carry §1.2c)
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("mutateSearchParams — URL state 키 set/delete", () => {
    (0, node_test_1.test)("URLSearchParams 입력 + set", () => {
        const sp = new URLSearchParams("collection=c-1");
        strict_1.default.equal((0, url_1.mutateSearchParams)(sp, { q: "hello" }), "?collection=c-1&q=hello");
    });
    (0, node_test_1.test)("string 입력 (\"?\" 포함) + set", () => {
        strict_1.default.equal((0, url_1.mutateSearchParams)("?a=1", { b: "2" }), "?a=1&b=2");
    });
    (0, node_test_1.test)("string 입력 (\"?\" 없음) + set", () => {
        strict_1.default.equal((0, url_1.mutateSearchParams)("a=1", { b: "2" }), "?a=1&b=2");
    });
    (0, node_test_1.test)("null/undefined 입력 → 빈 params 에서 시작", () => {
        strict_1.default.equal((0, url_1.mutateSearchParams)(null, { q: "x" }), "?q=x");
        strict_1.default.equal((0, url_1.mutateSearchParams)(undefined, { q: "x" }), "?q=x");
    });
    (0, node_test_1.test)("값이 null 이면 키 삭제", () => {
        const sp = new URLSearchParams("a=1&b=2");
        strict_1.default.equal((0, url_1.mutateSearchParams)(sp, { a: null }), "?b=2");
    });
    (0, node_test_1.test)("값이 undefined 이면 키 삭제", () => {
        const sp = new URLSearchParams("a=1&b=2");
        strict_1.default.equal((0, url_1.mutateSearchParams)(sp, { b: undefined }), "?a=1");
    });
    (0, node_test_1.test)("\"\" 는 명시적 빈 값으로 보존 (set)", () => {
        // 기존 toSearchParamsString 의 \"status=\" (전체) 시맨틱과 호환
        const sp = new URLSearchParams("a=1");
        strict_1.default.equal((0, url_1.mutateSearchParams)(sp, { status: "" }), "?a=1&status=");
    });
    (0, node_test_1.test)("기존에 없는 키도 set 가능", () => {
        strict_1.default.equal((0, url_1.mutateSearchParams)("", { q: "hi" }), "?q=hi");
    });
    (0, node_test_1.test)("mutations 에 없는 키는 보존 (touched 안 함)", () => {
        const sp = new URLSearchParams("a=1&b=2&c=3");
        // b 만 변경
        strict_1.default.equal((0, url_1.mutateSearchParams)(sp, { b: "20" }), "?a=1&b=20&c=3");
    });
    (0, node_test_1.test)("입력 URLSearchParams 는 변형하지 않는다 (불변)", () => {
        const sp = new URLSearchParams("a=1");
        (0, url_1.mutateSearchParams)(sp, { a: "999", b: "2" });
        strict_1.default.equal(sp.toString(), "a=1");
    });
    (0, node_test_1.test)("결과가 비면 \"\" 반환", () => {
        const sp = new URLSearchParams("a=1");
        strict_1.default.equal((0, url_1.mutateSearchParams)(sp, { a: null }), "");
    });
    (0, node_test_1.test)("prefix:false → \"?\" 생략", () => {
        strict_1.default.equal((0, url_1.mutateSearchParams)("a=1", { b: "2" }, { prefix: false }), "a=1&b=2");
    });
    (0, node_test_1.test)("Next.js ReadonlyURLSearchParams 호환 (toString 보유 객체)", () => {
        // 가짜 ReadonlyURLSearchParams: get 만 있고 toString 도 있는 객체
        const fake = {
            get: (k) => (k === "a" ? "1" : null),
            toString: () => "a=1",
        };
        strict_1.default.equal((0, url_1.mutateSearchParams)(fake, { b: "2" }), "?a=1&b=2");
    });
    (0, node_test_1.test)("값이 특수문자면 인코딩 적용", () => {
        strict_1.default.equal((0, url_1.mutateSearchParams)("", { q: "a b" }), "?q=a+b");
        strict_1.default.equal((0, url_1.mutateSearchParams)("", { q: "a&b" }), "?q=a%26b");
    });
});
// ---------------------------------------------------------------------------
// 8. 회귀 — DocumentListPage / SearchPage 의 기존 패턴이 그대로 재현되는가
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("회귀 — 기존 호출지 패턴 재현", () => {
    (0, node_test_1.test)("DocumentListPage 5 필드", () => {
        const sp = mock({
            collection: "c-1",
            folder: "f-1",
            include_subfolders: "true",
            q: "hello",
            tag: "review",
        });
        const result = (0, url_1.parseListFilterParams)(sp, {
            q: url_1.filterReaders.optionalString("q"),
            collection: url_1.filterReaders.optionalString("collection"),
            folder: url_1.filterReaders.optionalString("folder"),
            include_subfolders: url_1.filterReaders.bool("include_subfolders"),
            tag: url_1.filterReaders.optionalString("tag"),
        });
        strict_1.default.deepEqual(result, {
            q: "hello",
            collection: "c-1",
            folder: "f-1",
            include_subfolders: true,
            tag: "review",
        });
    });
    (0, node_test_1.test)("DocumentListPage — 모든 키 부재 시 기본값", () => {
        const sp = mock({});
        const result = (0, url_1.parseListFilterParams)(sp, {
            q: url_1.filterReaders.optionalString("q"),
            collection: url_1.filterReaders.optionalString("collection"),
            folder: url_1.filterReaders.optionalString("folder"),
            include_subfolders: url_1.filterReaders.bool("include_subfolders"),
            tag: url_1.filterReaders.optionalString("tag"),
        });
        strict_1.default.deepEqual(result, {
            q: undefined,
            collection: undefined,
            folder: undefined,
            include_subfolders: false,
            tag: undefined,
        });
    });
    (0, node_test_1.test)("SearchPage — q 는 string 기본값 \"\" (initialQ 패턴)", () => {
        const sp = mock({});
        const result = (0, url_1.parseListFilterParams)(sp, {
            q: url_1.filterReaders.string("q", ""),
            collection: url_1.filterReaders.optionalString("collection"),
            folder: url_1.filterReaders.optionalString("folder"),
            include_subfolders: url_1.filterReaders.bool("include_subfolders"),
        });
        strict_1.default.deepEqual(result, {
            q: "",
            collection: undefined,
            folder: undefined,
            include_subfolders: false,
        });
    });
    (0, node_test_1.test)("SearchPage include_subfolders=TRUE (case-insensitive 회귀)", () => {
        const sp = mock({ include_subfolders: "TRUE" });
        const result = (0, url_1.parseListFilterParams)(sp, {
            include_subfolders: url_1.filterReaders.bool("include_subfolders"),
        });
        strict_1.default.equal(result.include_subfolders, true);
    });
});
