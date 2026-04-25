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
 * S3 Phase 2 FG 2-1 — documentsApi 의 buildDocumentListParams 가 collection /
 * folder / include_subfolders 필터를 제대로 전달하는지 검증.
 *
 * buildDocumentListParams 는 internal 이므로 직접 export 하지 않는다. 대신
 * documentsApi.list 가 내부적으로 fetch URL 을 구성할 때 API base fetch 를
 * intercept 해 path 를 관찰한다.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
// API 모듈 로드 전에 전역 fetch 를 stub
const originalFetch = global.fetch;
const captured = [];
(0, node_test_1.before)(() => {
    global.fetch = (async (input, init) => {
        const url = typeof input === "string" ? input : String(input);
        captured.push({ url, init });
        return new Response(JSON.stringify({ data: [], meta: { pagination: { total: 0, page: 1, page_size: 20 } } }), {
            status: 200,
            headers: { "content-type": "application/json" },
        });
    });
});
(0, node_test_1.after)(() => {
    global.fetch = originalFetch;
});
(0, node_test_1.describe)("documentsApi.list — FG 2-1 필터 전파", () => {
    (0, node_test_1.test)("collection 만 주면 URL 에 collection=<id> 만 포함", async () => {
        captured.length = 0;
        const { documentsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/documents")));
        await documentsApi.list({ collection: "coll-1" });
        const last = captured.at(-1);
        strict_1.default.ok(last, "fetch call captured");
        strict_1.default.match(last.url, /collection=coll-1/);
        strict_1.default.doesNotMatch(last.url, /folder=/);
        strict_1.default.doesNotMatch(last.url, /include_subfolders=/);
    });
    (0, node_test_1.test)("folder + includeSubfolders=true → folder + include_subfolders=true", async () => {
        captured.length = 0;
        const { documentsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/documents")));
        await documentsApi.list({ folder: "f-1", includeSubfolders: true });
        const last = captured.at(-1);
        strict_1.default.match(last.url, /folder=f-1/);
        strict_1.default.match(last.url, /include_subfolders=true/);
    });
    (0, node_test_1.test)("folder 만 (include 없음) → include_subfolders 파라미터 없음", async () => {
        captured.length = 0;
        const { documentsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/documents")));
        await documentsApi.list({ folder: "f-1" });
        const last = captured.at(-1);
        strict_1.default.match(last.url, /folder=f-1/);
        strict_1.default.doesNotMatch(last.url, /include_subfolders=/);
    });
    (0, node_test_1.test)("collection + folder + includeSubfolders 조합", async () => {
        captured.length = 0;
        const { documentsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/documents")));
        await documentsApi.list({
            collection: "coll-1",
            folder: "f-1",
            includeSubfolders: true,
        });
        const last = captured.at(-1);
        strict_1.default.match(last.url, /collection=coll-1/);
        strict_1.default.match(last.url, /folder=f-1/);
        strict_1.default.match(last.url, /include_subfolders=true/);
    });
    (0, node_test_1.test)("아무 필터 없이 호출 → collection / folder / include_subfolders 파라미터 없음", async () => {
        captured.length = 0;
        const { documentsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/documents")));
        await documentsApi.list({});
        const last = captured.at(-1);
        strict_1.default.doesNotMatch(last.url, /collection=/);
        strict_1.default.doesNotMatch(last.url, /folder=/);
        strict_1.default.doesNotMatch(last.url, /include_subfolders=/);
    });
});
