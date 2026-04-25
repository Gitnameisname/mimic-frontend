/**
 * S3 Phase 2 FG 2-1 — collections/folders API 클라이언트의 envelope unwrap 검증.
 *
 * 백엔드 응답이 `{ data, meta }` 형태라 사용자 친화 타입으로 꺼내는 로직을 확인한다.
 * fetch 를 stub 으로 덮어 각 메서드가 기대된 URL + 메서드를 호출하고 응답을 올바르게
 * 변환하는지 본다.
 */
import { test, describe, beforeEach, before, after } from "node:test";
import assert from "node:assert/strict";

const originalFetch = global.fetch;
let nextBody: unknown = { data: null };
const calls: { url: string; method: string | undefined }[] = [];

before(() => {
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : String(input);
    calls.push({ url, method: (init?.method as string | undefined)?.toUpperCase() });
    return new Response(JSON.stringify(nextBody), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof global.fetch;
});

after(() => {
  global.fetch = originalFetch;
});

beforeEach(() => {
  calls.length = 0;
  nextBody = { data: null };
});


describe("collectionsApi", () => {
  test("list — envelope { data: [...] , meta:{total} } → {items,total}", async () => {
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
    const { collectionsApi } = await import("../src/lib/api/collections");
    const res = await collectionsApi.list({ limit: 10 });
    assert.equal(res.total, 1);
    assert.equal(res.items.length, 1);
    assert.equal(res.items[0].document_count, 3);
    const call = calls.at(-1)!;
    assert.match(call.url, /\/api\/v1\/collections\?limit=10/);
    assert.equal(call.method, "GET");
  });

  test("create — POST body + envelope unwrap", async () => {
    nextBody = {
      data: {
        id: "c2", owner_id: "u1", name: "New", description: "d",
        created_at: "", updated_at: "", document_count: 0,
      },
    };
    const { collectionsApi } = await import("../src/lib/api/collections");
    const res = await collectionsApi.create({ name: "New", description: "d" });
    assert.equal(res.id, "c2");
    const call = calls.at(-1)!;
    assert.equal(call.method, "POST");
    assert.match(call.url, /\/api\/v1\/collections$/);
  });

  test("addDocuments — 리포트 4필드 unwrap", async () => {
    nextBody = {
      data: { requested: 3, accepted: 2, inserted: 2, rejected: 1 },
    };
    const { collectionsApi } = await import("../src/lib/api/collections");
    const res = await collectionsApi.addDocuments("c1", ["d1", "d2", "d3"]);
    assert.equal(res.requested, 3);
    assert.equal(res.accepted, 2);
    assert.equal(res.inserted, 2);
    assert.equal(res.rejected, 1);
    const call = calls.at(-1)!;
    assert.match(call.url, /\/api\/v1\/collections\/c1\/documents$/);
    assert.equal(call.method, "POST");
  });
});


describe("foldersApi", () => {
  test("list — root + child 계층 두 노드 unwrap", async () => {
    nextBody = {
      data: [
        { id: "f1", owner_id: "u1", parent_id: null, name: "w", path: "/w/", depth: 0, created_at: "", updated_at: "" },
        { id: "f2", owner_id: "u1", parent_id: "f1", name: "p", path: "/w/p/", depth: 1, created_at: "", updated_at: "" },
      ],
      meta: { total: 2 },
    };
    const { foldersApi } = await import("../src/lib/api/folders");
    const res = await foldersApi.list();
    assert.equal(res.total, 2);
    assert.equal(res.items[0].parent_id, null);
    assert.equal(res.items[1].parent_id, "f1");
  });

  test("setDocumentFolder — PUT /documents/{id}/folder 로 folder_id 전송", async () => {
    nextBody = { data: { ok: true } };
    const { foldersApi } = await import("../src/lib/api/folders");
    await foldersApi.setDocumentFolder("doc-1", "f-2");
    const call = calls.at(-1)!;
    assert.match(call.url, /\/api\/v1\/documents\/doc-1\/folder$/);
    assert.equal(call.method, "PUT");
  });

  test("setDocumentFolder — null 전달 가능 (폴더 해제)", async () => {
    nextBody = { data: { ok: true } };
    const { foldersApi } = await import("../src/lib/api/folders");
    await foldersApi.setDocumentFolder("doc-1", null);
    const call = calls.at(-1)!;
    assert.match(call.url, /\/api\/v1\/documents\/doc-1\/folder$/);
    assert.equal(call.method, "PUT");
  });

  test("move — POST /folders/{id}/move with new_parent_id", async () => {
    nextBody = {
      data: { id: "f1", owner_id: "u1", parent_id: "fp", name: "w", path: "/fp/w/", depth: 1, created_at: "", updated_at: "" },
    };
    const { foldersApi } = await import("../src/lib/api/folders");
    const res = await foldersApi.move("f1", { new_parent_id: "fp" });
    assert.equal(res.parent_id, "fp");
    const call = calls.at(-1)!;
    assert.match(call.url, /\/api\/v1\/folders\/f1\/move$/);
    assert.equal(call.method, "POST");
  });
});
