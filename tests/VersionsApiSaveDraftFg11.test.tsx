/**
 * S3 Phase 1 FG 1-1 — versionsApi.saveDraft 가 PUT + content_snapshot 으로
 * 호출되는지 확인.
 *
 * fetch 를 전역 mock 으로 바꿔 실제 호출 URL / method / body shape 을 본다.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import { versionsApi } from "../src/lib/api/versions";
import { emptyProseMirrorDoc } from "../src/types/prosemirror";

type Captured = {
  url?: string;
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

function stubFetch(): { captured: Captured; restore: () => void } {
  const captured: Captured = {};
  const original = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    captured.url = typeof input === "string" ? input : (input as URL).toString();
    captured.method = init?.method;
    captured.body = init?.body ? JSON.parse(init.body as string) : undefined;
    captured.headers = init?.headers as Record<string, string>;
    return new Response(
      JSON.stringify({
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
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;

  return {
    captured,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

describe("versionsApi.saveDraft (FG 1-1 PUT 경로)", () => {
  test("calls PUT /api/v1/documents/{id}/draft with content_snapshot body", async () => {
    const { captured, restore } = stubFetch();
    try {
      await versionsApi.saveDraft("doc-123", {
        title: "T",
        content_snapshot: emptyProseMirrorDoc(),
      });
    } finally {
      restore();
    }

    assert.ok(
      captured.url?.endsWith("/api/v1/documents/doc-123/draft"),
      `unexpected url: ${captured.url}`,
    );
    assert.equal(captured.method, "PUT");
    const body = captured.body as {
      title: string;
      content_snapshot?: { type: string };
      nodes?: unknown;
    };
    assert.equal(body.title, "T");
    assert.equal(body.content_snapshot?.type, "doc");
    // nodes 필드는 새 API 에서 더 이상 전송하지 않는다
    assert.equal(body.nodes, undefined);
  });

  test("saveDraftNodes (deprecated) still calls PATCH for compatibility", async () => {
    const { captured, restore } = stubFetch();
    try {
      await versionsApi.saveDraftNodes("doc-123", "ver-abc", {
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
    } finally {
      restore();
    }

    assert.ok(
      captured.url?.endsWith("/api/v1/documents/doc-123/versions/ver-abc/draft"),
      `unexpected url: ${captured.url}`,
    );
    assert.equal(captured.method, "PATCH");
  });
});
