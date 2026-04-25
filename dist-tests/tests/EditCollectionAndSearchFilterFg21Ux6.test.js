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
 * S3 Phase 2 FG 2-1 UX 6차 — 남은 이월 2건 회귀.
 *
 * 1) EditCollectionModal.computeUpdateBody — 이름·설명 변경을 PATCH payload 로 조립하는 규약
 * 2) /search URL 조합 — searchApi.documents 가 collection / folder / include_subfolders 를 서버에 전송
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const EditCollectionModal_1 = require("../src/features/explore/EditCollectionModal");
function c(overrides = {}) {
    return {
        id: "c1",
        owner_id: "u1",
        name: "원본",
        description: null,
        created_at: "2026-04-24T00:00:00Z",
        updated_at: "2026-04-24T00:00:00Z",
        document_count: 0,
        ...overrides,
    };
}
(0, node_test_1.describe)("EditCollectionModal.computeUpdateBody", () => {
    (0, node_test_1.test)("이름만 변경", () => {
        const body = (0, EditCollectionModal_1.computeUpdateBody)(c(), { name: "새이름", description: "" });
        strict_1.default.deepEqual(body, { name: "새이름" });
    });
    (0, node_test_1.test)("설명만 추가", () => {
        const body = (0, EditCollectionModal_1.computeUpdateBody)(c(), { name: "원본", description: "설명임" });
        strict_1.default.deepEqual(body, { description: "설명임" });
    });
    (0, node_test_1.test)("이름 + 설명 동시 변경", () => {
        const body = (0, EditCollectionModal_1.computeUpdateBody)(c(), { name: "새이름", description: "설명" });
        strict_1.default.deepEqual(body, { name: "새이름", description: "설명" });
    });
    (0, node_test_1.test)("설명을 빈 문자열로 → null 로 전송 (서버 nullable)", () => {
        const body = (0, EditCollectionModal_1.computeUpdateBody)(c({ description: "기존" }), { name: "원본", description: "   " });
        // description 공백만이면 null. (서버는 null 허용)
        strict_1.default.deepEqual(body, { description: null });
    });
    (0, node_test_1.test)("앞뒤 공백 trim", () => {
        const body = (0, EditCollectionModal_1.computeUpdateBody)(c(), { name: "  새이름  ", description: "" });
        strict_1.default.deepEqual(body, { name: "새이름" });
    });
    (0, node_test_1.test)("아무것도 안 바꾸면 빈 객체 (= 변경 없음)", () => {
        const body = (0, EditCollectionModal_1.computeUpdateBody)(c({ description: "x" }), { name: "원본", description: "x" });
        strict_1.default.deepEqual(body, {});
    });
    (0, node_test_1.test)("이름이 비어 있으면 null (검증 실패)", () => {
        strict_1.default.equal((0, EditCollectionModal_1.computeUpdateBody)(c(), { name: "   ", description: "x" }), null);
    });
    (0, node_test_1.test)("이름이 너무 길면 null", () => {
        strict_1.default.equal((0, EditCollectionModal_1.computeUpdateBody)(c(), { name: "x".repeat(201), description: "" }), null);
    });
    (0, node_test_1.test)("설명이 2000 자 초과면 null", () => {
        strict_1.default.equal((0, EditCollectionModal_1.computeUpdateBody)(c(), { name: "원본", description: "x".repeat(2001) }), null);
    });
});
// ---------------------------------------------------------------------------
// 2) /search 의 searchApi.documents 가 collection/folder/include_subfolders 를 전송
// ---------------------------------------------------------------------------
const originalFetch = global.fetch;
const calls = [];
(0, node_test_1.before)(() => {
    global.fetch = (async (input) => {
        calls.push({ url: typeof input === "string" ? input : String(input) });
        return new Response(JSON.stringify({
            data: { query: "", results: [], pagination: { page: 1, limit: 20, total: 0, has_next: false } },
        }), { status: 200, headers: { "content-type": "application/json" } });
    });
});
(0, node_test_1.after)(() => {
    global.fetch = originalFetch;
});
(0, node_test_1.beforeEach)(() => {
    calls.length = 0;
});
(0, node_test_1.describe)("searchApi.documents — FG 2-1 UX 6차 파라미터", () => {
    (0, node_test_1.test)("collection 파라미터 URL 에 전송", async () => {
        const { searchApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/search")));
        await searchApi.documents({ q: "hello", collection: "c1" });
        strict_1.default.match(calls.at(-1).url, /collection=c1/);
        strict_1.default.match(calls.at(-1).url, /q=hello/);
    });
    (0, node_test_1.test)("folder + include_subfolders 함께 전송", async () => {
        const { searchApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/search")));
        await searchApi.documents({ q: "x", folder: "f1", include_subfolders: true });
        strict_1.default.match(calls.at(-1).url, /folder=f1/);
        strict_1.default.match(calls.at(-1).url, /include_subfolders=true/);
    });
    (0, node_test_1.test)("세 필터 모두 + q 함께 전송", async () => {
        const { searchApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/search")));
        await searchApi.documents({
            q: "foo",
            collection: "c1",
            folder: "f1",
            include_subfolders: true,
        });
        const url = calls.at(-1).url;
        strict_1.default.match(url, /q=foo/);
        strict_1.default.match(url, /collection=c1/);
        strict_1.default.match(url, /folder=f1/);
        strict_1.default.match(url, /include_subfolders=true/);
    });
    (0, node_test_1.test)("필터 없으면 기본 q 만 전송", async () => {
        const { searchApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/search")));
        await searchApi.documents({ q: "plain" });
        const url = calls.at(-1).url;
        strict_1.default.match(url, /q=plain/);
        strict_1.default.doesNotMatch(url, /[?&]collection=/);
        strict_1.default.doesNotMatch(url, /[?&]folder=/);
        strict_1.default.doesNotMatch(url, /[?&]include_subfolders=/);
    });
});
