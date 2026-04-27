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
 * S3 Phase 3 FG 3-3 — annotationsApi + notificationsApi URL/method 검증.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const originalFetch = global.fetch;
const captured = [];
let nextResponseBody = { data: [] };
(0, node_test_1.before)(() => {
    global.fetch = (async (input, init) => {
        const url = typeof input === "string" ? input : String(input);
        captured.push({
            url,
            method: init?.method ?? "GET",
            body: init?.body ? JSON.parse(String(init.body)) : null,
        });
        return new Response(JSON.stringify(nextResponseBody), {
            status: 200,
            headers: { "content-type": "application/json" },
        });
    });
});
(0, node_test_1.after)(() => {
    global.fetch = originalFetch;
});
(0, node_test_1.describe)("annotationsApi.list", () => {
    (0, node_test_1.test)("기본 호출 — query string 없음", async () => {
        captured.length = 0;
        nextResponseBody = { data: [] };
        const { annotationsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/annotations")));
        await annotationsApi.list("doc-1");
        strict_1.default.equal(captured[0].method, "GET");
        strict_1.default.match(captured[0].url, /\/api\/v1\/documents\/doc-1\/annotations$/);
    });
    (0, node_test_1.test)("include_resolved=false 전파", async () => {
        captured.length = 0;
        const { annotationsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/annotations")));
        await annotationsApi.list("doc-1", { include_resolved: false, include_orphans: true });
        strict_1.default.match(captured[0].url, /include_resolved=false/);
        strict_1.default.match(captured[0].url, /include_orphans=true/);
    });
    (0, node_test_1.test)("응답 envelope { data: [...] } 에서 data 만 unwrap", async () => {
        nextResponseBody = {
            data: [
                { id: "a1", document_id: "doc-1", node_id: "n1", author_id: "u-1", actor_type: "user",
                    content: "hi", status: "open", parent_id: null, is_orphan: false,
                    created_at: "2026-04-27", updated_at: "2026-04-27", mentioned_user_ids: [],
                    version_id: null, span_start: null, span_end: null,
                    resolved_at: null, resolved_by: null, orphaned_at: null },
            ],
        };
        const { annotationsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/annotations")));
        const items = await annotationsApi.list("doc-1");
        strict_1.default.equal(items.length, 1);
        strict_1.default.equal(items[0].id, "a1");
    });
});
(0, node_test_1.describe)("annotationsApi.create / update / resolve / reopen / delete", () => {
    (0, node_test_1.test)("create — POST + body", async () => {
        captured.length = 0;
        nextResponseBody = { data: { id: "a1" } };
        const { annotationsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/annotations")));
        await annotationsApi.create("doc-1", {
            node_id: "n1",
            content: "@alice 보세요",
            span_start: 0,
            span_end: 10,
        });
        strict_1.default.equal(captured[0].method, "POST");
        strict_1.default.match(captured[0].url, /\/documents\/doc-1\/annotations$/);
        strict_1.default.deepEqual(captured[0].body, {
            node_id: "n1",
            content: "@alice 보세요",
            span_start: 0,
            span_end: 10,
        });
    });
    (0, node_test_1.test)("update — PATCH + content body", async () => {
        captured.length = 0;
        nextResponseBody = { data: { id: "a1" } };
        const { annotationsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/annotations")));
        await annotationsApi.update("a1", "수정된 내용");
        strict_1.default.equal(captured[0].method, "PATCH");
        strict_1.default.match(captured[0].url, /\/api\/v1\/annotations\/a1$/);
        strict_1.default.deepEqual(captured[0].body, { content: "수정된 내용" });
    });
    (0, node_test_1.test)("resolve — POST /resolve", async () => {
        captured.length = 0;
        const { annotationsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/annotations")));
        await annotationsApi.resolve("a1");
        strict_1.default.equal(captured[0].method, "POST");
        strict_1.default.match(captured[0].url, /\/annotations\/a1\/resolve$/);
    });
    (0, node_test_1.test)("reopen — POST /reopen", async () => {
        captured.length = 0;
        const { annotationsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/annotations")));
        await annotationsApi.reopen("a1");
        strict_1.default.match(captured[0].url, /\/annotations\/a1\/reopen$/);
    });
    (0, node_test_1.test)("delete — DELETE", async () => {
        captured.length = 0;
        const { annotationsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/annotations")));
        await annotationsApi.delete("a1");
        strict_1.default.equal(captured[0].method, "DELETE");
        strict_1.default.match(captured[0].url, /\/api\/v1\/annotations\/a1$/);
    });
});
(0, node_test_1.describe)("notificationsApi", () => {
    (0, node_test_1.test)("list — GET + query", async () => {
        captured.length = 0;
        nextResponseBody = { data: [] };
        const { notificationsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/annotations")));
        await notificationsApi.list({ unread_only: true, limit: 10 });
        strict_1.default.equal(captured[0].method, "GET");
        strict_1.default.match(captured[0].url, /unread_only=true/);
        strict_1.default.match(captured[0].url, /limit=10/);
    });
    (0, node_test_1.test)("unreadCount — unwrap unread_count", async () => {
        nextResponseBody = { data: { unread_count: 7 } };
        const { notificationsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/annotations")));
        const count = await notificationsApi.unreadCount();
        strict_1.default.equal(count, 7);
    });
    (0, node_test_1.test)("markRead — POST + body.ids", async () => {
        captured.length = 0;
        nextResponseBody = { data: { marked_read: 2 } };
        const { notificationsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/annotations")));
        const result = await notificationsApi.markRead(["n1", "n2"]);
        strict_1.default.equal(captured[0].method, "POST");
        strict_1.default.match(captured[0].url, /\/notifications\/read$/);
        strict_1.default.deepEqual(captured[0].body, { ids: ["n1", "n2"] });
        strict_1.default.equal(result, 2);
    });
});
