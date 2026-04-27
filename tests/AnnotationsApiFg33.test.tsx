/**
 * S3 Phase 3 FG 3-3 — annotationsApi + notificationsApi URL/method 검증.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

const originalFetch = global.fetch;
type CapturedCall = { url: string; method: string; body: unknown };
const captured: CapturedCall[] = [];
let nextResponseBody: unknown = { data: [] };

before(() => {
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
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
  }) as typeof global.fetch;
});

after(() => {
  global.fetch = originalFetch;
});

describe("annotationsApi.list", () => {
  test("기본 호출 — query string 없음", async () => {
    captured.length = 0;
    nextResponseBody = { data: [] };
    const { annotationsApi } = await import("../src/lib/api/annotations");
    await annotationsApi.list("doc-1");
    assert.equal(captured[0].method, "GET");
    assert.match(captured[0].url, /\/api\/v1\/documents\/doc-1\/annotations$/);
  });

  test("include_resolved=false 전파", async () => {
    captured.length = 0;
    const { annotationsApi } = await import("../src/lib/api/annotations");
    await annotationsApi.list("doc-1", { include_resolved: false, include_orphans: true });
    assert.match(captured[0].url, /include_resolved=false/);
    assert.match(captured[0].url, /include_orphans=true/);
  });

  test("응답 envelope { data: [...] } 에서 data 만 unwrap", async () => {
    nextResponseBody = {
      data: [
        { id: "a1", document_id: "doc-1", node_id: "n1", author_id: "u-1", actor_type: "user",
          content: "hi", status: "open", parent_id: null, is_orphan: false,
          created_at: "2026-04-27", updated_at: "2026-04-27", mentioned_user_ids: [],
          version_id: null, span_start: null, span_end: null,
          resolved_at: null, resolved_by: null, orphaned_at: null },
      ],
    };
    const { annotationsApi } = await import("../src/lib/api/annotations");
    const items = await annotationsApi.list("doc-1");
    assert.equal(items.length, 1);
    assert.equal(items[0].id, "a1");
  });
});

describe("annotationsApi.create / update / resolve / reopen / delete", () => {
  test("create — POST + body", async () => {
    captured.length = 0;
    nextResponseBody = { data: { id: "a1" } };
    const { annotationsApi } = await import("../src/lib/api/annotations");
    await annotationsApi.create("doc-1", {
      node_id: "n1",
      content: "@alice 보세요",
      span_start: 0,
      span_end: 10,
    });
    assert.equal(captured[0].method, "POST");
    assert.match(captured[0].url, /\/documents\/doc-1\/annotations$/);
    assert.deepEqual(captured[0].body, {
      node_id: "n1",
      content: "@alice 보세요",
      span_start: 0,
      span_end: 10,
    });
  });

  test("update — PATCH + content body", async () => {
    captured.length = 0;
    nextResponseBody = { data: { id: "a1" } };
    const { annotationsApi } = await import("../src/lib/api/annotations");
    await annotationsApi.update("a1", "수정된 내용");
    assert.equal(captured[0].method, "PATCH");
    assert.match(captured[0].url, /\/api\/v1\/annotations\/a1$/);
    assert.deepEqual(captured[0].body, { content: "수정된 내용" });
  });

  test("resolve — POST /resolve", async () => {
    captured.length = 0;
    const { annotationsApi } = await import("../src/lib/api/annotations");
    await annotationsApi.resolve("a1");
    assert.equal(captured[0].method, "POST");
    assert.match(captured[0].url, /\/annotations\/a1\/resolve$/);
  });

  test("reopen — POST /reopen", async () => {
    captured.length = 0;
    const { annotationsApi } = await import("../src/lib/api/annotations");
    await annotationsApi.reopen("a1");
    assert.match(captured[0].url, /\/annotations\/a1\/reopen$/);
  });

  test("delete — DELETE", async () => {
    captured.length = 0;
    const { annotationsApi } = await import("../src/lib/api/annotations");
    await annotationsApi.delete("a1");
    assert.equal(captured[0].method, "DELETE");
    assert.match(captured[0].url, /\/api\/v1\/annotations\/a1$/);
  });
});

describe("notificationsApi", () => {
  test("list — GET + query", async () => {
    captured.length = 0;
    nextResponseBody = { data: [] };
    const { notificationsApi } = await import("../src/lib/api/annotations");
    await notificationsApi.list({ unread_only: true, limit: 10 });
    assert.equal(captured[0].method, "GET");
    assert.match(captured[0].url, /unread_only=true/);
    assert.match(captured[0].url, /limit=10/);
  });

  test("unreadCount — unwrap unread_count", async () => {
    nextResponseBody = { data: { unread_count: 7 } };
    const { notificationsApi } = await import("../src/lib/api/annotations");
    const count = await notificationsApi.unreadCount();
    assert.equal(count, 7);
  });

  test("markRead — POST + body.ids", async () => {
    captured.length = 0;
    nextResponseBody = { data: { marked_read: 2 } };
    const { notificationsApi } = await import("../src/lib/api/annotations");
    const result = await notificationsApi.markRead(["n1", "n2"]);
    assert.equal(captured[0].method, "POST");
    assert.match(captured[0].url, /\/notifications\/read$/);
    assert.deepEqual(captured[0].body, { ids: ["n1", "n2"] });
    assert.equal(result, 2);
  });
});
