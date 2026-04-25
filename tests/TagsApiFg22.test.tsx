/**
 * S3 Phase 2 FG 2-2 — tagsApi URL 조립 + unwrap 규약 검증.
 *
 * - popular: limit/min_usage 전달
 * - autocomplete: q / limit 전달 + 빈 파라미터 생략
 * - delete: DELETE 메서드 + 경로
 * - unwrapList: envelope({data:[...], meta:{total}}) / bare array 둘 다 수용
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

const originalFetch = global.fetch;
type CapturedCall = { url: string; method?: string; init?: RequestInit };
const captured: CapturedCall[] = [];

// 응답 큐를 테스트별로 바꿔 치우는 방식
let nextResponse: () => Response = () =>
  new Response(JSON.stringify({ data: [] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

before(() => {
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : String(input);
    captured.push({ url, method: init?.method, init });
    return nextResponse();
  }) as typeof global.fetch;
});

after(() => {
  global.fetch = originalFetch;
});

describe("tagsApi — FG 2-2 URL 조립", () => {
  test("popular(limit=20) → /api/v1/tags/popular?limit=20", async () => {
    captured.length = 0;
    nextResponse = () =>
      new Response(
        JSON.stringify({
          data: [{ id: "t1", name: "ai", created_at: "2026-04-24T00:00:00Z", usage_count: 3 }],
          meta: { total: 1 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    const { tagsApi } = await import("../src/lib/api/tags");
    const res = await tagsApi.popular({ limit: 20 });
    const last = captured.at(-1);
    assert.match(last!.url, /\/api\/v1\/tags\/popular\?/);
    assert.match(last!.url, /limit=20/);
    assert.equal(res.total, 1);
    assert.equal(res.items[0].name, "ai");
    assert.equal(res.items[0].usage_count, 3);
  });

  test("popular(min_usage=2) → min_usage 파라미터 포함", async () => {
    captured.length = 0;
    nextResponse = () =>
      new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const { tagsApi } = await import("../src/lib/api/tags");
    await tagsApi.popular({ limit: 20, min_usage: 2 });
    const last = captured.at(-1);
    assert.match(last!.url, /min_usage=2/);
  });

  test("autocomplete(q='ai', limit=10) → q+limit 포함", async () => {
    captured.length = 0;
    nextResponse = () =>
      new Response(
        JSON.stringify({ data: [{ id: "t1", name: "ai", created_at: "2026-04-24T00:00:00Z" }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    const { tagsApi } = await import("../src/lib/api/tags");
    const res = await tagsApi.autocomplete({ q: "ai", limit: 10 });
    const last = captured.at(-1);
    assert.match(last!.url, /q=ai/);
    assert.match(last!.url, /limit=10/);
    assert.equal(res.items[0].name, "ai");
  });

  test("autocomplete({}) → 파라미터 없는 평문 경로", async () => {
    captured.length = 0;
    nextResponse = () =>
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const { tagsApi } = await import("../src/lib/api/tags");
    const res = await tagsApi.autocomplete();
    const last = captured.at(-1);
    assert.match(last!.url, /\/api\/v1\/tags(?:$|\?|#)/);
    assert.doesNotMatch(last!.url, /q=/);
    assert.doesNotMatch(last!.url, /limit=/);
    // bare array 도 unwrap
    assert.equal(res.items.length, 0);
  });

  test("delete(id) → DELETE /api/v1/tags/<id>", async () => {
    captured.length = 0;
    nextResponse = () =>
      new Response(null, { status: 204 });
    const { tagsApi } = await import("../src/lib/api/tags");
    await tagsApi.delete("t-123");
    const last = captured.at(-1);
    assert.match(last!.url, /\/api\/v1\/tags\/t-123/);
    assert.equal(last!.method, "DELETE");
  });
});
