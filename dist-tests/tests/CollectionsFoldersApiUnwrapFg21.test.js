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
 * S3 Phase 2 FG 2-1 — collections/folders API 클라이언트의 envelope unwrap 검증.
 *
 * 백엔드 응답이 `{ data, meta }` 형태라 사용자 친화 타입으로 꺼내는 로직을 확인한다.
 * fetch 를 stub 으로 덮어 각 메서드가 기대된 URL + 메서드를 호출하고 응답을 올바르게
 * 변환하는지 본다.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const originalFetch = global.fetch;
let nextBody = { data: null };
const calls = [];
(0, node_test_1.before)(() => {
    global.fetch = (async (input, init) => {
        const url = typeof input === "string" ? input : String(input);
        calls.push({ url, method: init?.method?.toUpperCase() });
        return new Response(JSON.stringify(nextBody), {
            status: 200,
            headers: { "content-type": "application/json" },
        });
    });
});
(0, node_test_1.after)(() => {
    global.fetch = originalFetch;
});
(0, node_test_1.beforeEach)(() => {
    calls.length = 0;
    nextBody = { data: null };
});
(0, node_test_1.describe)("collectionsApi", () => {
    (0, node_test_1.test)("list — envelope { data: [...] , meta:{total} } → {items,total}", async () => {
        nextBody = {
            data: [
                {
                    id: "c1",
                    owner_id: "u1",
                    name: "My",
                    description: null,
                    created_at: "2026-04-24T00:00:00Z",
                    updated_at: "2026-04-24T00:00:00Z",
                    document_count: 3,
                },
            ],
            meta: { total: 1 },
        };
        const { collectionsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/collections")));
        const res = await collectionsApi.list({ limit: 10 });
        strict_1.default.equal(res.total, 1);
        strict_1.default.equal(res.items.length, 1);
        strict_1.default.equal(res.items[0].document_count, 3);
        const call = calls.at(-1);
        strict_1.default.match(call.url, /\/api\/v1\/collections\?limit=10/);
        strict_1.default.equal(call.method, "GET");
    });
    (0, node_test_1.test)("create — POST body + envelope unwrap", async () => {
        nextBody = {
            data: {
                id: "c2", owner_id: "u1", name: "New", description: "d",
                created_at: "", updated_at: "", document_count: 0,
            },
        };
        const { collectionsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/collections")));
        const res = await collectionsApi.create({ name: "New", description: "d" });
        strict_1.default.equal(res.id, "c2");
        const call = calls.at(-1);
        strict_1.default.equal(call.method, "POST");
        strict_1.default.match(call.url, /\/api\/v1\/collections$/);
    });
    (0, node_test_1.test)("addDocuments — 리포트 4필드 unwrap", async () => {
        nextBody = {
            data: { requested: 3, accepted: 2, inserted: 2, rejected: 1 },
        };
        const { collectionsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/collections")));
        const res = await collectionsApi.addDocuments("c1", ["d1", "d2", "d3"]);
        strict_1.default.equal(res.requested, 3);
        strict_1.default.equal(res.accepted, 2);
        strict_1.default.equal(res.inserted, 2);
        strict_1.default.equal(res.rejected, 1);
        const call = calls.at(-1);
        strict_1.default.match(call.url, /\/api\/v1\/collections\/c1\/documents$/);
        strict_1.default.equal(call.method, "POST");
    });
});
(0, node_test_1.describe)("foldersApi", () => {
    (0, node_test_1.test)("list — root + child 계층 두 노드 unwrap", async () => {
        nextBody = {
            data: [
                { id: "f1", owner_id: "u1", parent_id: null, name: "w", path: "/w/", depth: 0, created_at: "", updated_at: "" },
                { id: "f2", owner_id: "u1", parent_id: "f1", name: "p", path: "/w/p/", depth: 1, created_at: "", updated_at: "" },
            ],
            meta: { total: 2 },
        };
        const { foldersApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/folders")));
        const res = await foldersApi.list();
        strict_1.default.equal(res.total, 2);
        strict_1.default.equal(res.items[0].parent_id, null);
        strict_1.default.equal(res.items[1].parent_id, "f1");
    });
    (0, node_test_1.test)("setDocumentFolder — PUT /documents/{id}/folder 로 folder_id 전송", async () => {
        nextBody = { data: { ok: true } };
        const { foldersApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/folders")));
        await foldersApi.setDocumentFolder("doc-1", "f-2");
        const call = calls.at(-1);
        strict_1.default.match(call.url, /\/api\/v1\/documents\/doc-1\/folder$/);
        strict_1.default.equal(call.method, "PUT");
    });
    (0, node_test_1.test)("setDocumentFolder — null 전달 가능 (폴더 해제)", async () => {
        nextBody = { data: { ok: true } };
        const { foldersApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/folders")));
        await foldersApi.setDocumentFolder("doc-1", null);
        const call = calls.at(-1);
        strict_1.default.match(call.url, /\/api\/v1\/documents\/doc-1\/folder$/);
        strict_1.default.equal(call.method, "PUT");
    });
    (0, node_test_1.test)("move — POST /folders/{id}/move with new_parent_id", async () => {
        nextBody = {
            data: { id: "f1", owner_id: "u1", parent_id: "fp", name: "w", path: "/fp/w/", depth: 1, created_at: "", updated_at: "" },
        };
        const { foldersApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/folders")));
        const res = await foldersApi.move("f1", { new_parent_id: "fp" });
        strict_1.default.equal(res.parent_id, "fp");
        const call = calls.at(-1);
        strict_1.default.match(call.url, /\/api\/v1\/folders\/f1\/move$/);
        strict_1.default.equal(call.method, "POST");
    });
});
