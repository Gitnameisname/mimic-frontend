"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * S3 Phase 1 FG 1-1 — versionsApi.saveDraft 가 PUT + content_snapshot 으로
 * 호출되는지 확인.
 *
 * fetch 를 전역 mock 으로 바꿔 실제 호출 URL / method / body shape 을 본다.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const versions_1 = require("../src/lib/api/versions");
const prosemirror_1 = require("../src/types/prosemirror");
function stubFetch() {
    const captured = {};
    const original = globalThis.fetch;
    globalThis.fetch = (async (input, init) => {
        captured.url = typeof input === "string" ? input : input.toString();
        captured.method = init?.method;
        captured.body = init?.body ? JSON.parse(init.body) : undefined;
        captured.headers = init?.headers;
        return new Response(JSON.stringify({
            data: {
                id: "ver-1",
                document_id: "doc-1",
                version_number: 1,
                status: "draft",
                workflow_status: "draft",
                created_by: "u",
                created_at: "2026-04-24T00:00:00Z",
            },
            meta: {},
        }), { status: 200, headers: { "content-type": "application/json" } });
    });
    return {
        captured,
        restore: () => {
            globalThis.fetch = original;
        },
    };
}
(0, node_test_1.describe)("versionsApi.saveDraft (FG 1-1 PUT 경로)", () => {
    (0, node_test_1.test)("calls PUT /api/v1/documents/{id}/draft with content_snapshot body", async () => {
        const { captured, restore } = stubFetch();
        try {
            await versions_1.versionsApi.saveDraft("doc-123", {
                title: "T",
                content_snapshot: (0, prosemirror_1.emptyProseMirrorDoc)(),
            });
        }
        finally {
            restore();
        }
        strict_1.default.ok(captured.url?.endsWith("/api/v1/documents/doc-123/draft"), `unexpected url: ${captured.url}`);
        strict_1.default.equal(captured.method, "PUT");
        const body = captured.body;
        strict_1.default.equal(body.title, "T");
        strict_1.default.equal(body.content_snapshot?.type, "doc");
        // nodes 필드는 새 API 에서 더 이상 전송하지 않는다
        strict_1.default.equal(body.nodes, undefined);
    });
    (0, node_test_1.test)("saveDraftNodes (deprecated) still calls PATCH for compatibility", async () => {
        const { captured, restore } = stubFetch();
        try {
            await versions_1.versionsApi.saveDraftNodes("doc-123", "ver-abc", {
                title: "T",
                nodes: [
                    {
                        id: "11111111-1111-4111-8111-111111111111",
                        node_type: "paragraph",
                        order: 0,
                        content: "x",
                    },
                ],
            });
        }
        finally {
            restore();
        }
        strict_1.default.ok(captured.url?.endsWith("/api/v1/documents/doc-123/versions/ver-abc/draft"), `unexpected url: ${captured.url}`);
        strict_1.default.equal(captured.method, "PATCH");
    });
});
