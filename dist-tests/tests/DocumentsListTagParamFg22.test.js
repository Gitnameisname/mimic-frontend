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
 * S3 Phase 2 FG 2-2 — documentsApi.list 가 tag 필터를 URL 로 전파하는지 검증.
 *
 * - tag="ai" → ?tag=ai
 * - tag="" / 공백만 → 파라미터 생략
 * - collection / folder / includeSubfolders / q 와 조합 가능
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const originalFetch = global.fetch;
const captured = [];
(0, node_test_1.before)(() => {
    global.fetch = (async (input) => {
        const url = typeof input === "string" ? input : String(input);
        captured.push({ url });
        return new Response(JSON.stringify({ data: [], meta: { pagination: { total: 0, page: 1, page_size: 20 } } }), { status: 200, headers: { "content-type": "application/json" } });
    });
});
(0, node_test_1.after)(() => {
    global.fetch = originalFetch;
});
(0, node_test_1.describe)("documentsApi.list — FG 2-2 tag 필터 전파", () => {
    (0, node_test_1.test)("tag='ai' → URL 에 tag=ai", async () => {
        captured.length = 0;
        const { documentsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/documents")));
        await documentsApi.list({ tag: "ai" });
        const last = captured.at(-1);
        strict_1.default.match(last.url, /[?&]tag=ai(?:&|$)/);
    });
    (0, node_test_1.test)("tag 공백 → tag 파라미터 생략", async () => {
        captured.length = 0;
        const { documentsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/documents")));
        await documentsApi.list({ tag: "   " });
        const last = captured.at(-1);
        strict_1.default.doesNotMatch(last.url, /[?&]tag=/);
    });
    (0, node_test_1.test)("tag + collection + folder + q 조합", async () => {
        captured.length = 0;
        const { documentsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/documents")));
        await documentsApi.list({
            tag: "ml",
            collection: "coll-1",
            folder: "f-1",
            includeSubfolders: true,
            q: "hello",
        });
        const last = captured.at(-1);
        strict_1.default.match(last.url, /tag=ml/);
        strict_1.default.match(last.url, /collection=coll-1/);
        strict_1.default.match(last.url, /folder=f-1/);
        strict_1.default.match(last.url, /include_subfolders=true/);
        strict_1.default.match(last.url, /q=hello/);
    });
    (0, node_test_1.test)("tag 미지정 → URL 에 tag 없음", async () => {
        captured.length = 0;
        const { documentsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/documents")));
        await documentsApi.list({});
        const last = captured.at(-1);
        strict_1.default.doesNotMatch(last.url, /[?&]tag=/);
    });
});
