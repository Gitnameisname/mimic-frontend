/**
 * S3 Phase 2 FG 2-1 UX 3차 — documentsApi.list 가 filters.q 를 서버로 전송하는지 검증.
 *
 * 이전 라운드까지는 q 파라미터가 클라이언트에서 필터링만 됐으나, 서버 지원이 생겼으므로
 * 실제로 URL 에 `q=` 가 실리는지 fetch stub 으로 확인한다.
 */
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

const originalFetch = global.fetch;
const calls: { url: string }[] = [];

before(() => {
  global.fetch = (async (input: RequestInfo | URL) => {
    calls.push({ url: typeof input === "string" ? input : String(input) });
    return new Response(
      JSON.stringify({ data: [], meta: { pagination: { total: 0, page: 1, page_size: 20 } } }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof global.fetch;
});

after(() => {
  global.fetch = originalFetch;
});

beforeEach(() => {
  calls.length = 0;
});

describe("documentsApi.list — FG 2-1 UX 3차 q 파라미터", () => {
  test("q 가 주어지면 URL 에 q=<value> 포함", async () => {
    const { documentsApi } = await import("../src/lib/api/documents");
    await documentsApi.list({ q: "정책" });
    const last = calls.at(-1)!;
    assert.match(last.url, /q=%EC%A0%95%EC%B1%85|q=정책/);
  });

  test("q 가 공백만이면 전송하지 않음", async () => {
    const { documentsApi } = await import("../src/lib/api/documents");
    await documentsApi.list({ q: "   " });
    const last = calls.at(-1)!;
    assert.doesNotMatch(last.url, /[?&]q=/);
  });

  test("q 빈 문자열도 전송하지 않음", async () => {
    const { documentsApi } = await import("../src/lib/api/documents");
    await documentsApi.list({ q: "" });
    const last = calls.at(-1)!;
    assert.doesNotMatch(last.url, /[?&]q=/);
  });

  test("q 가 없으면 URL 에 q 파라미터 자체가 없음", async () => {
    const { documentsApi } = await import("../src/lib/api/documents");
    await documentsApi.list({ page: 1, limit: 20 });
    const last = calls.at(-1)!;
    assert.doesNotMatch(last.url, /[?&]q=/);
  });

  test("q 와 collection/folder 가 함께 전송", async () => {
    const { documentsApi } = await import("../src/lib/api/documents");
    await documentsApi.list({
      q: "foo",
      collection: "c1",
      folder: "f1",
      includeSubfolders: true,
    });
    const last = calls.at(-1)!;
    assert.match(last.url, /q=foo/);
    assert.match(last.url, /collection=c1/);
    assert.match(last.url, /folder=f1/);
    assert.match(last.url, /include_subfolders=true/);
  });

  test("q 앞뒤 공백은 trim 후 전송", async () => {
    const { documentsApi } = await import("../src/lib/api/documents");
    await documentsApi.list({ q: "  hello  " });
    const last = calls.at(-1)!;
    assert.match(last.url, /q=hello(?:&|$)/);
    // trim 이 안 되었으면 공백 → `%20` 이 URL 에 실림
    assert.doesNotMatch(last.url, /q=%20/);
  });
});
