/**
 * S3 Phase 2 FG 2-2 — documentsApi.list 가 tag 필터를 URL 로 전파하는지 검증.
 *
 * - tag="ai" → ?tag=ai
 * - tag="" / 공백만 → 파라미터 생략
 * - collection / folder / includeSubfolders / q 와 조합 가능
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

const originalFetch = global.fetch;
type CapturedCall = { url: string };
const captured: CapturedCall[] = [];

before(() => {
  global.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : String(input);
    captured.push({ url });
    return new Response(
      JSON.stringify({ data: [], meta: { pagination: { total: 0, page: 1, page_size: 20 } } }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof global.fetch;
});

after(() => {
  global.fetch = originalFetch;
});

describe("documentsApi.list — FG 2-2 tag 필터 전파", () => {
  test("tag='ai' → URL 에 tag=ai", async () => {
    captured.length = 0;
    const { documentsApi } = await import("../src/lib/api/documents");
    await documentsApi.list({ tag: "ai" });
    const last = captured.at(-1);
    assert.match(last!.url, /[?&]tag=ai(?:&|$)/);
  });

  test("tag 공백 → tag 파라미터 생략", async () => {
    captured.length = 0;
    const { documentsApi } = await import("../src/lib/api/documents");
    await documentsApi.list({ tag: "   " });
    const last = captured.at(-1);
    assert.doesNotMatch(last!.url, /[?&]tag=/);
  });

  test("tag + collection + folder + q 조합", async () => {
    captured.length = 0;
    const { documentsApi } = await import("../src/lib/api/documents");
    await documentsApi.list({
      tag: "ml",
      collection: "coll-1",
      folder: "f-1",
      includeSubfolders: true,
      q: "hello",
    });
    const last = captured.at(-1);
    assert.match(last!.url, /tag=ml/);
    assert.match(last!.url, /collection=coll-1/);
    assert.match(last!.url, /folder=f-1/);
    assert.match(last!.url, /include_subfolders=true/);
    assert.match(last!.url, /q=hello/);
  });

  test("tag 미지정 → URL 에 tag 없음", async () => {
    captured.length = 0;
    const { documentsApi } = await import("../src/lib/api/documents");
    await documentsApi.list({});
    const last = captured.at(-1);
    assert.doesNotMatch(last!.url, /[?&]tag=/);
  });
});
