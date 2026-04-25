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
 * S3 Phase 2 FG 2-2 — documentsApi.get adapter 가 DocumentResponse 의
 * document_tags 를 Document.document_tags 로 보존하는지, 또 잘못된 항목은
 * 걸러내는지 검증.
 *
 * - source ∈ {"inline", "frontmatter", "both"} 만 허용
 * - id / name 가 문자열이 아니면 skip
 * - 빈 배열 / 필드 부재는 [] 로 흘림
 * - 기존 FG 2-1 필드 (folder_id / in_collection_ids) 병행 유지
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const originalFetch = global.fetch;
let nextResponse = () => new Response("null", { status: 200, headers: { "content-type": "application/json" } });
(0, node_test_1.before)(() => {
    global.fetch = (async () => nextResponse());
});
(0, node_test_1.after)(() => {
    global.fetch = originalFetch;
});
function rawDoc(overrides = {}) {
    return {
        data: {
            id: "d-1",
            title: "t",
            document_type: "policy",
            status: "draft",
            metadata: {},
            summary: null,
            created_by: "u-1",
            updated_by: null,
            created_at: "2026-04-24T00:00:00Z",
            updated_at: "2026-04-24T00:00:00Z",
            current_draft_version_id: null,
            current_published_version_id: null,
            scope_profile_id: null,
            folder_id: "f-1",
            in_collection_ids: ["c-1", "c-2"],
            document_tags: [],
            ...overrides,
        },
    };
}
(0, node_test_1.describe)("documentsApi.get adapter — FG 2-2 document_tags", () => {
    (0, node_test_1.test)("올바른 세 항목 (inline/frontmatter/both) 전부 보존", async () => {
        nextResponse = () => new Response(JSON.stringify(rawDoc({
            document_tags: [
                { id: "t1", name: "ai", source: "inline" },
                { id: "t2", name: "ml", source: "frontmatter" },
                { id: "t3", name: "db", source: "both" },
            ],
        })), { status: 200, headers: { "content-type": "application/json" } });
        const { documentsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/documents")));
        const doc = await documentsApi.get("d-1");
        strict_1.default.equal(doc.folder_id, "f-1");
        strict_1.default.deepEqual(doc.in_collection_ids, ["c-1", "c-2"]);
        strict_1.default.equal(doc.document_tags?.length, 3);
        strict_1.default.deepEqual(doc.document_tags, [
            { id: "t1", name: "ai", source: "inline" },
            { id: "t2", name: "ml", source: "frontmatter" },
            { id: "t3", name: "db", source: "both" },
        ]);
    });
    (0, node_test_1.test)("source 가 알 수 없는 값이면 'inline' 으로 안전하게 fallback (readonly 표시)", async () => {
        // 서버 Pydantic 은 "inline"/"frontmatter"/"both" 만 생성하지만, 프런트 adapter 는
        // 방어적으로 알 수 없는 source 를 "inline" 으로 fallback 시켜 readonly chip 으로 보이게 한다.
        nextResponse = () => new Response(JSON.stringify(rawDoc({
            document_tags: [
                { id: "t1", name: "ok", source: "inline" },
                { id: "t2", name: "bad", source: "external" },
            ],
        })), { status: 200, headers: { "content-type": "application/json" } });
        const { documentsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/documents")));
        const doc = await documentsApi.get("d-1");
        strict_1.default.equal(doc.document_tags?.length, 2);
        strict_1.default.equal(doc.document_tags?.[0].source, "inline");
        // 미지의 "external" 은 readonly 로 떨어지도록 "inline" 으로 fallback
        strict_1.default.equal(doc.document_tags?.[1].source, "inline");
        strict_1.default.equal(doc.document_tags?.[1].name, "bad");
    });
    (0, node_test_1.test)("id/name 이 문자열이 아니면 걸러짐", async () => {
        nextResponse = () => new Response(JSON.stringify(rawDoc({
            document_tags: [
                { id: 42, name: "ok", source: "inline" },
                { id: "t2", name: null, source: "inline" },
                { id: "t3", name: "good", source: "inline" },
            ],
        })), { status: 200, headers: { "content-type": "application/json" } });
        const { documentsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/documents")));
        const doc = await documentsApi.get("d-1");
        strict_1.default.equal(doc.document_tags?.length, 1);
        strict_1.default.equal(doc.document_tags?.[0].id, "t3");
    });
    (0, node_test_1.test)("필드 부재 / null → 빈 배열", async () => {
        nextResponse = () => new Response(JSON.stringify(rawDoc({ document_tags: undefined })), {
            status: 200,
            headers: { "content-type": "application/json" },
        });
        const { documentsApi } = await Promise.resolve().then(() => __importStar(require("../src/lib/api/documents")));
        const doc = await documentsApi.get("d-1");
        strict_1.default.deepEqual(doc.document_tags ?? [], []);
    });
});
