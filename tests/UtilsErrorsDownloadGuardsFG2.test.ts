/**
 * docs/함수도서관 §1.3/§1.4/§1.5 (FE-G2) — 작은 단발 utils 검증.
 */

process.env.TZ = "UTC";

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ApiError, NetworkError } from "../src/lib/api/client";
import { classifyApiError } from "../src/lib/utils/errors";
import { downloadJsonFile } from "../src/lib/utils/download";
import { isString, isNonEmptyString, isPlainObject } from "../src/lib/utils/guards";

// ===========================================================================
// 1. classifyApiError
// ===========================================================================

describe("classifyApiError", () => {
  test("ApiError 4xx → code=api_error / status / recoverable=false", () => {
    const e = new ApiError(404, "찾을 수 없습니다.", null, "NOT_FOUND");
    const c = classifyApiError(e);
    assert.equal(c.code, "api_error");
    assert.equal(c.status, 404);
    assert.equal(c.serverCode, "NOT_FOUND");
    assert.equal(c.message, "찾을 수 없습니다.");
    assert.equal(c.recoverable, false);
  });

  test("ApiError 5xx → recoverable=true", () => {
    const e = new ApiError(503, "서비스 불가", null);
    const c = classifyApiError(e);
    assert.equal(c.code, "api_error");
    assert.equal(c.status, 503);
    assert.equal(c.recoverable, true);
  });

  test("ApiError 4xx 빈 message → fallback", () => {
    const e = new ApiError(400, "", null);
    const c = classifyApiError(e, "기본 메시지");
    assert.equal(c.message, "기본 메시지");
  });

  test("NetworkError → code=network_error / recoverable=true", () => {
    const e = new NetworkError("/api/x", "GET", "Failed to fetch");
    const c = classifyApiError(e);
    assert.equal(c.code, "network_error");
    assert.equal(c.recoverable, true);
    assert.match(c.message, /네트워크|fetch/i);
  });

  test("AbortError-like (DOMException name=AbortError) → code=abort_error", () => {
    const aborter = { name: "AbortError", message: "사용자 취소" };
    const c = classifyApiError(aborter);
    assert.equal(c.code, "abort_error");
    assert.equal(c.recoverable, true);
    assert.equal(c.message, "사용자 취소");
  });

  test("일반 Error → code=generic_error / recoverable=false", () => {
    const c = classifyApiError(new Error("뭔가 깨짐"));
    assert.equal(c.code, "generic_error");
    assert.equal(c.recoverable, false);
    assert.equal(c.message, "뭔가 깨짐");
  });

  test("string → code=unknown_error / message=string", () => {
    const c = classifyApiError("문자열 오류");
    assert.equal(c.code, "unknown_error");
    assert.equal(c.message, "문자열 오류");
  });

  test("null/undefined → code=unknown_error / fallback", () => {
    assert.equal(classifyApiError(null).code, "unknown_error");
    assert.equal(classifyApiError(null).message, "요청 처리 중 오류가 발생했습니다.");
    assert.equal(classifyApiError(undefined).message, "요청 처리 중 오류가 발생했습니다.");
  });

  test("커스텀 fallbackMessage 적용", () => {
    const c = classifyApiError(undefined, "특수 fallback");
    assert.equal(c.message, "특수 fallback");
  });
});

// ===========================================================================
// 2. downloadJsonFile (SSR no-op + Blob/링크 시뮬레이션)
// ===========================================================================

describe("downloadJsonFile", () => {
  test("SSR (window 없음) 에서 no-op", () => {
    // 본 테스트는 node 환경 — window 자체가 없음. throw 없이 반환.
    assert.doesNotThrow(() => downloadJsonFile("x.json", { a: 1 }));
  });

  test("브라우저 시뮬레이션 — Blob/URL/<a> click 흐름", () => {
    // 최소한의 DOM stub
    const calls: string[] = [];
    let createdHref = "";
    let createdName = "";
    let revoked: string | null = null;

    const fakeAnchor = {
      _href: "",
      _download: "",
      set href(v: string) {
        this._href = v;
        createdHref = v;
        calls.push("set-href");
      },
      get href() {
        return this._href;
      },
      set download(v: string) {
        this._download = v;
        createdName = v;
        calls.push("set-download");
      },
      get download() {
        return this._download;
      },
      click() {
        calls.push("click");
      },
    };

    (globalThis as Record<string, unknown>).window = {} as unknown;
    (globalThis as Record<string, unknown>).document = {
      createElement: (tag: string) => {
        calls.push(`create-${tag}`);
        return fakeAnchor;
      },
      body: {
        appendChild: () => calls.push("append"),
        removeChild: () => calls.push("remove"),
      },
    } as unknown;
    (globalThis as Record<string, unknown>).Blob = class {
      constructor(public parts: BlobPart[], public opts: BlobPropertyBag) {
        calls.push("blob");
      }
    } as unknown;
    (globalThis as Record<string, unknown>).URL = {
      createObjectURL: (_: Blob) => {
        calls.push("createObjectURL");
        return "blob:fake-url";
      },
      revokeObjectURL: (u: string) => {
        revoked = u;
        calls.push("revoke");
      },
    } as unknown;

    try {
      downloadJsonFile("data.json", { a: 1, 한글: "값" });
      assert.equal(createdName, "data.json");
      assert.equal(createdHref, "blob:fake-url");
      assert.equal(revoked, "blob:fake-url"); // try/finally 보장
      assert.deepEqual(calls.slice(0, 3), ["blob", "createObjectURL", "create-a"]);
      assert.ok(calls.includes("click"));
      assert.ok(calls.includes("revoke"));
    } finally {
      delete (globalThis as Record<string, unknown>).window;
      delete (globalThis as Record<string, unknown>).document;
      delete (globalThis as Record<string, unknown>).Blob;
      delete (globalThis as Record<string, unknown>).URL;
    }
  });
});

// ===========================================================================
// 3. type guards
// ===========================================================================

describe("isString", () => {
  test("문자열 → true", () => {
    assert.equal(isString("hello"), true);
    assert.equal(isString(""), true);
  });
  test("non-string → false", () => {
    for (const v of [0, 1, true, false, null, undefined, {}, [], Symbol()]) {
      assert.equal(isString(v), false);
    }
  });
});

describe("isNonEmptyString", () => {
  test("내용 있는 문자열 → true", () => {
    assert.equal(isNonEmptyString("hello"), true);
    assert.equal(isNonEmptyString("a"), true);
  });
  test('"" 와 "   " (공백만) → false', () => {
    assert.equal(isNonEmptyString(""), false);
    assert.equal(isNonEmptyString("   "), false);
    assert.equal(isNonEmptyString("\t\n"), false);
  });
  test("non-string → false", () => {
    for (const v of [null, undefined, 0, 1, {}, []]) {
      assert.equal(isNonEmptyString(v), false);
    }
  });
});

describe("isPlainObject", () => {
  test("객체 리터럴 → true", () => {
    assert.equal(isPlainObject({}), true);
    assert.equal(isPlainObject({ a: 1 }), true);
  });
  test("Object.create(null) → true", () => {
    assert.equal(isPlainObject(Object.create(null)), true);
  });
  test("배열 → false", () => {
    assert.equal(isPlainObject([]), false);
    assert.equal(isPlainObject([1, 2]), false);
  });
  test("null / primitive → false", () => {
    for (const v of [null, undefined, 0, 1, "x", true, Symbol()]) {
      assert.equal(isPlainObject(v), false);
    }
  });
  test("클래스 인스턴스 → false (Date / Map / Set / Error)", () => {
    assert.equal(isPlainObject(new Date()), false);
    assert.equal(isPlainObject(new Map()), false);
    assert.equal(isPlainObject(new Set()), false);
    assert.equal(isPlainObject(new Error("x")), false);
  });
  test("class 사용자 정의 → false", () => {
    class Foo {}
    assert.equal(isPlainObject(new Foo()), false);
  });
});
