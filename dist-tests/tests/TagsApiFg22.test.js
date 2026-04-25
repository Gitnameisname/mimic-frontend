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
 * S3 Phase 2 FG 2-2 — tagsApi URL 조립 + unwrap 규약 검증.
 *
 * - popular: limit/min_usage 전달
 * - autocomplete: q / limit 전달 + 빈 파라미터 생략
 * - delete: DELETE 메서드 + 경로
 * - unwrapList: envelope({data:[...], meta:{total}}) / bare array 둘 다 수용
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const originalFetch = global.fetch;
const captured = [];
// 응답 큐를 테스트별로 바꿔 치우는 방식
let nextResponse = () => new Response(JSON.stringify({ data: [] }), {
    status: 200,
    headers: { "content-type": "application/json" },
});
(0, node_test_1.before)(() => {
    global.fetch = (async (input, init) => {
        const url = typeof input === "string" ? input : String(input);
        captured.push({ url, method: init?.method, init });
        return nextResponse();
    });
});
(0, node_test_1.after)(() => {
    global.fetch = originalFetch;
});
(0, node_test_1.describe)("tagsApi — FG 2-2 URL 조립", () => {
    (0, node_test_1.test)("popular(limit=20) → /api/v1/tags/popular?limit=20", async () => {
        captured.length = 0;
        nextResponse = () => new Response(JSON.stringify({
            data: [{ id: "t1", name: "ai", created_at: "2026-04-24T00:00:00Z", usage_count: 3 }],
            meta: { total: 1 },
        }), { status: 200, headers: { "content-type": "application/json" } });
        const { tagsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/tags")));
        const res = await tagsApi.popular({ limit: 20 });
        const last = captured.at(-1);
        strict_1.default.match(last.url, /\/api\/v1\/tags\/popular\?/);
        strict_1.default.match(last.url, /limit=20/);
        strict_1.default.equal(res.total, 1);
        strict_1.default.equal(res.items[0].name, "ai");
        strict_1.default.equal(res.items[0].usage_count, 3);
    });
    (0, node_test_1.test)("popular(min_usage=2) → min_usage 파라미터 포함", async () => {
        captured.length = 0;
        nextResponse = () => new Response(JSON.stringify({ data: [] }), {
            status: 200,
            headers: { "content-type": "application/json" },
        });
        const { tagsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/tags")));
        await tagsApi.popular({ limit: 20, min_usage: 2 });
        const last = captured.at(-1);
        strict_1.default.match(last.url, /min_usage=2/);
    });
    (0, node_test_1.test)("autocomplete(q='ai', limit=10) → q+limit 포함", async () => {
        captured.length = 0;
        nextResponse = () => new Response(JSON.stringify({ data: [{ id: "t1", name: "ai", created_at: "2026-04-24T00:00:00Z" }] }), { status: 200, headers: { "content-type": "application/json" } });
        const { tagsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/tags")));
        const res = await tagsApi.autocomplete({ q: "ai", limit: 10 });
        const last = captured.at(-1);
        strict_1.default.match(last.url, /q=ai/);
        strict_1.default.match(last.url, /limit=10/);
        strict_1.default.equal(res.items[0].name, "ai");
    });
    (0, node_test_1.test)("autocomplete({}) → 파라미터 없는 평문 경로", async () => {
        captured.length = 0;
        nextResponse = () => new Response(JSON.stringify([]), {
            status: 200,
            headers: { "content-type": "application/json" },
        });
        const { tagsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/tags")));
        const res = await tagsApi.autocomplete();
        const last = captured.at(-1);
        strict_1.default.match(last.url, /\/api\/v1\/tags(?:$|\?|#)/);
        strict_1.default.doesNotMatch(last.url, /q=/);
        strict_1.default.doesNotMatch(last.url, /limit=/);
        // bare array 도 unwrap
        strict_1.default.equal(res.items.length, 0);
    });
    (0, node_test_1.test)("delete(id) → DELETE /api/v1/tags/<id>", async () => {
        captured.length = 0;
        nextResponse = () => new Response(null, { status: 204 });
        const { tagsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/tags")));
        await tagsApi.delete("t-123");
        const last = captured.at(-1);
        strict_1.default.match(last.url, /\/api\/v1\/tags\/t-123/);
        strict_1.default.equal(last.method, "DELETE");
    });
});
