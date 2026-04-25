"use strict";
/**
 * docs/함수도서관 §1.3/§1.4/§1.5 (FE-G2) — 작은 단발 utils 검증.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env.TZ = "UTC";
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const client_1 = require("../src/lib/api/client");
const errors_1 = require("../src/lib/utils/errors");
const download_1 = require("../src/lib/utils/download");
const guards_1 = require("../src/lib/utils/guards");
// ===========================================================================
// 1. classifyApiError
// ===========================================================================
(0, node_test_1.describe)("classifyApiError", () => {
    (0, node_test_1.test)("ApiError 4xx → code=api_error / status / recoverable=false", () => {
        const e = new client_1.ApiError(404, "찾을 수 없습니다.", null, "NOT_FOUND");
        const c = (0, errors_1.classifyApiError)(e);
        strict_1.default.equal(c.code, "api_error");
        strict_1.default.equal(c.status, 404);
        strict_1.default.equal(c.serverCode, "NOT_FOUND");
        strict_1.default.equal(c.message, "찾을 수 없습니다.");
        strict_1.default.equal(c.recoverable, false);
    });
    (0, node_test_1.test)("ApiError 5xx → recoverable=true", () => {
        const e = new client_1.ApiError(503, "서비스 불가", null);
        const c = (0, errors_1.classifyApiError)(e);
        strict_1.default.equal(c.code, "api_error");
        strict_1.default.equal(c.status, 503);
        strict_1.default.equal(c.recoverable, true);
    });
    (0, node_test_1.test)("ApiError 4xx 빈 message → fallback", () => {
        const e = new client_1.ApiError(400, "", null);
        const c = (0, errors_1.classifyApiError)(e, "기본 메시지");
        strict_1.default.equal(c.message, "기본 메시지");
    });
    (0, node_test_1.test)("NetworkError → code=network_error / recoverable=true", () => {
        const e = new client_1.NetworkError("/api/x", "GET", "Failed to fetch");
        const c = (0, errors_1.classifyApiError)(e);
        strict_1.default.equal(c.code, "network_error");
        strict_1.default.equal(c.recoverable, true);
        strict_1.default.match(c.message, /네트워크|fetch/i);
    });
    (0, node_test_1.test)("AbortError-like (DOMException name=AbortError) → code=abort_error", () => {
        const aborter = { name: "AbortError", message: "사용자 취소" };
        const c = (0, errors_1.classifyApiError)(aborter);
        strict_1.default.equal(c.code, "abort_error");
        strict_1.default.equal(c.recoverable, true);
        strict_1.default.equal(c.message, "사용자 취소");
    });
    (0, node_test_1.test)("일반 Error → code=generic_error / recoverable=false", () => {
        const c = (0, errors_1.classifyApiError)(new Error("뭔가 깨짐"));
        strict_1.default.equal(c.code, "generic_error");
        strict_1.default.equal(c.recoverable, false);
        strict_1.default.equal(c.message, "뭔가 깨짐");
    });
    (0, node_test_1.test)("string → code=unknown_error / message=string", () => {
        const c = (0, errors_1.classifyApiError)("문자열 오류");
        strict_1.default.equal(c.code, "unknown_error");
        strict_1.default.equal(c.message, "문자열 오류");
    });
    (0, node_test_1.test)("null/undefined → code=unknown_error / fallback", () => {
        strict_1.default.equal((0, errors_1.classifyApiError)(null).code, "unknown_error");
        strict_1.default.equal((0, errors_1.classifyApiError)(null).message, "요청 처리 중 오류가 발생했습니다.");
        strict_1.default.equal((0, errors_1.classifyApiError)(undefined).message, "요청 처리 중 오류가 발생했습니다.");
    });
    (0, node_test_1.test)("커스텀 fallbackMessage 적용", () => {
        const c = (0, errors_1.classifyApiError)(undefined, "특수 fallback");
        strict_1.default.equal(c.message, "특수 fallback");
    });
});
// ===========================================================================
// 2. downloadJsonFile (SSR no-op + Blob/링크 시뮬레이션)
// ===========================================================================
(0, node_test_1.describe)("downloadJsonFile", () => {
    (0, node_test_1.test)("SSR (window 없음) 에서 no-op", () => {
        // 본 테스트는 node 환경 — window 자체가 없음. throw 없이 반환.
        strict_1.default.doesNotThrow(() => (0, download_1.downloadJsonFile)("x.json", { a: 1 }));
    });
    (0, node_test_1.test)("브라우저 시뮬레이션 — Blob/URL/<a> click 흐름", () => {
        // 최소한의 DOM stub
        const calls = [];
        let createdHref = "";
        let createdName = "";
        let revoked = null;
        const fakeAnchor = {
            _href: "",
            _download: "",
            set href(v) {
                this._href = v;
                createdHref = v;
                calls.push("set-href");
            },
            get href() {
                return this._href;
            },
            set download(v) {
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
        globalThis.window = {};
        globalThis.document = {
            createElement: (tag) => {
                calls.push(`create-${tag}`);
                return fakeAnchor;
            },
            body: {
                appendChild: () => calls.push("append"),
                removeChild: () => calls.push("remove"),
            },
        };
        globalThis.Blob = class {
            parts;
            opts;
            constructor(parts, opts) {
                this.parts = parts;
                this.opts = opts;
                calls.push("blob");
            }
        };
        globalThis.URL = {
            createObjectURL: (_) => {
                calls.push("createObjectURL");
                return "blob:fake-url";
            },
            revokeObjectURL: (u) => {
                revoked = u;
                calls.push("revoke");
            },
        };
        try {
            (0, download_1.downloadJsonFile)("data.json", { a: 1, 한글: "값" });
            strict_1.default.equal(createdName, "data.json");
            strict_1.default.equal(createdHref, "blob:fake-url");
            strict_1.default.equal(revoked, "blob:fake-url"); // try/finally 보장
            strict_1.default.deepEqual(calls.slice(0, 3), ["blob", "createObjectURL", "create-a"]);
            strict_1.default.ok(calls.includes("click"));
            strict_1.default.ok(calls.includes("revoke"));
        }
        finally {
            delete globalThis.window;
            delete globalThis.document;
            delete globalThis.Blob;
            delete globalThis.URL;
        }
    });
});
// ===========================================================================
// 3. type guards
// ===========================================================================
(0, node_test_1.describe)("isString", () => {
    (0, node_test_1.test)("문자열 → true", () => {
        strict_1.default.equal((0, guards_1.isString)("hello"), true);
        strict_1.default.equal((0, guards_1.isString)(""), true);
    });
    (0, node_test_1.test)("non-string → false", () => {
        for (const v of [0, 1, true, false, null, undefined, {}, [], Symbol()]) {
            strict_1.default.equal((0, guards_1.isString)(v), false);
        }
    });
});
(0, node_test_1.describe)("isNonEmptyString", () => {
    (0, node_test_1.test)("내용 있는 문자열 → true", () => {
        strict_1.default.equal((0, guards_1.isNonEmptyString)("hello"), true);
        strict_1.default.equal((0, guards_1.isNonEmptyString)("a"), true);
    });
    (0, node_test_1.test)('"" 와 "   " (공백만) → false', () => {
        strict_1.default.equal((0, guards_1.isNonEmptyString)(""), false);
        strict_1.default.equal((0, guards_1.isNonEmptyString)("   "), false);
        strict_1.default.equal((0, guards_1.isNonEmptyString)("\t\n"), false);
    });
    (0, node_test_1.test)("non-string → false", () => {
        for (const v of [null, undefined, 0, 1, {}, []]) {
            strict_1.default.equal((0, guards_1.isNonEmptyString)(v), false);
        }
    });
});
(0, node_test_1.describe)("isPlainObject", () => {
    (0, node_test_1.test)("객체 리터럴 → true", () => {
        strict_1.default.equal((0, guards_1.isPlainObject)({}), true);
        strict_1.default.equal((0, guards_1.isPlainObject)({ a: 1 }), true);
    });
    (0, node_test_1.test)("Object.create(null) → true", () => {
        strict_1.default.equal((0, guards_1.isPlainObject)(Object.create(null)), true);
    });
    (0, node_test_1.test)("배열 → false", () => {
        strict_1.default.equal((0, guards_1.isPlainObject)([]), false);
        strict_1.default.equal((0, guards_1.isPlainObject)([1, 2]), false);
    });
    (0, node_test_1.test)("null / primitive → false", () => {
        for (const v of [null, undefined, 0, 1, "x", true, Symbol()]) {
            strict_1.default.equal((0, guards_1.isPlainObject)(v), false);
        }
    });
    (0, node_test_1.test)("클래스 인스턴스 → false (Date / Map / Set / Error)", () => {
        strict_1.default.equal((0, guards_1.isPlainObject)(new Date()), false);
        strict_1.default.equal((0, guards_1.isPlainObject)(new Map()), false);
        strict_1.default.equal((0, guards_1.isPlainObject)(new Set()), false);
        strict_1.default.equal((0, guards_1.isPlainObject)(new Error("x")), false);
    });
    (0, node_test_1.test)("class 사용자 정의 → false", () => {
        class Foo {
        }
        strict_1.default.equal((0, guards_1.isPlainObject)(new Foo()), false);
    });
});
