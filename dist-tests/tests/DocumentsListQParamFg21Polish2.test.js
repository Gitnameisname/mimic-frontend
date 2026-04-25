"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * S3 Phase 2 FG 2-1 UX 3차 — documentsApi.list 가 filters.q 를 서버로 전송하는지 검증.
 *
 * 이전 라운드까지는 q 파라미터가 클라이언트에서 필터링만 됐으나, 서버 지원이 생겼으므로
 * 실제로 URL 에 `q=` 가 실리는지 fetch stub 으로 확인한다.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const originalFetch = global.fetch;
const calls = [];
(0, node_test_1.before)(() => {
    global.fetch = (async (input) => {
        calls.push({ url: typeof input === "string" ? input : String(input) });
        return new Response(JSON.stringify({ data: [], meta: { pagination: { total: 0, page: 1, page_size: 20 } } }), { status: 200, headers: { "content-type": "application/json" } });
    });
});
(0, node_test_1.after)(() => {
    global.fetch = originalFetch;
});
(0, node_test_1.beforeEach)(() => {
    calls.length = 0;
});
(0, node_test_1.describe)("documentsApi.list — FG 2-1 UX 3차 q 파라미터", () => {
    (0, node_test_1.test)("q 가 주어지면 URL 에 q=<value> 포함", async () => {
        const { documentsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/documents")));
        await documentsApi.list({ q: "정책" });
        const last = calls.at(-1);
        strict_1.default.match(last.url, /q=%EC%A0%95%EC%B1%85|q=정책/);
    });
    (0, node_test_1.test)("q 가 공백만이면 전송하지 않음", async () => {
        const { documentsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/documents")));
        await documentsApi.list({ q: "   " });
        const last = calls.at(-1);
        strict_1.default.doesNotMatch(last.url, /[?&]q=/);
    });
    (0, node_test_1.test)("q 빈 문자열도 전송하지 않음", async () => {
        const { documentsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/documents")));
        await documentsApi.list({ q: "" });
        const last = calls.at(-1);
        strict_1.default.doesNotMatch(last.url, /[?&]q=/);
    });
    (0, node_test_1.test)("q 가 없으면 URL 에 q 파라미터 자체가 없음", async () => {
        const { documentsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/documents")));
        await documentsApi.list({ page: 1, limit: 20 });
        const last = calls.at(-1);
        strict_1.default.doesNotMatch(last.url, /[?&]q=/);
    });
    (0, node_test_1.test)("q 와 collection/folder 가 함께 전송", async () => {
        const { documentsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/documents")));
        await documentsApi.list({
            q: "foo",
            collection: "c1",
            folder: "f1",
            includeSubfolders: true,
        });
        const last = calls.at(-1);
        strict_1.default.match(last.url, /q=foo/);
        strict_1.default.match(last.url, /collection=c1/);
        strict_1.default.match(last.url, /folder=f1/);
        strict_1.default.match(last.url, /include_subfolders=true/);
    });
    (0, node_test_1.test)("q 앞뒤 공백은 trim 후 전송", async () => {
        const { documentsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/documents")));
        await documentsApi.list({ q: "  hello  " });
        const last = calls.at(-1);
        strict_1.default.match(last.url, /q=hello(?:&|$)/);
        // trim 이 안 되었으면 공백 → `%20` 이 URL 에 실림
        strict_1.default.doesNotMatch(last.url, /q=%20/);
    });
});
