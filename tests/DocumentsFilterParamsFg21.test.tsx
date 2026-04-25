/**
 * S3 Phase 2 FG 2-1 — documentsApi 의 buildDocumentListParams 가 collection /
 * folder / include_subfolders 필터를 제대로 전달하는지 검증.
 *
 * buildDocumentListParams 는 internal 이므로 직접 export 하지 않는다. 대신
 * documentsApi.list 가 내부적으로 fetch URL 을 구성할 때 API base fetch 를
 * intercept 해 path 를 관찰한다.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

// API 모듈 로드 전에 전역 fetch 를 stub
const originalFetch = global.fetch;

type CapturedCall = { url: string; init?: RequestInit };
const captured: CapturedCall[] = [];

before(() => {
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : String(input);
    captured.push({ url, init });
    return new Response(JSON.stringify({ data: [], meta: { pagination: { total: 0, page: 1, page_size: 20 } } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof global.fetch;
});

after(() => {
  global.fetch = originalFetch;
});

describe("documentsApi.list — FG 2-1 필터 전파", () => {
  test("collection 만 주면 URL 에 collection=<id> 만 포함", async () => {
    captured.length = 0;
    const { documentsApi } = await import("../src/lib/api/documents");
    await documentsApi.list({ collection: "coll-1" });
    const last = captured.at(-1);
    assert.ok(last, "fetch call captured");
    assert.match(last!.url, /collection=coll-1/);
    assert.doesNotMatch(last!.url, /folder=/);
    assert.doesNotMatch(last!.url, /include_subfolders=/);
  });

  test("folder + includeSubfolders=true → folder + include_subfolders=true", async () => {
    captured.length = 0;
    const { documentsApi } = await import("../src/lib/api/documents");
    await documentsApi.list({ folder: "f-1", includeSubfolders: true });
    const last = captured.at(-1);
    assert.match(last!.url, /folder=f-1/);
    assert.match(last!.url, /include_subfolders=true/);
  });

  test("folder 만 (include 없음) → include_subfolders 파라미터 없음", async () => {
    captured.length = 0;
    const { documentsApi } = await import("../src/lib/api/documents");
    await documentsApi.list({ folder: "f-1" });
    const last = captured.at(-1);
    assert.match(last!.url, /folder=f-1/);
    assert.doesNotMatch(last!.url, /include_subfolders=/);
  });

  test("collection + folder + includeSubfolders 조합", async () => {
    captured.length = 0;
    const { documentsApi } = await import("../src/lib/api/documents");
    await documentsApi.list({
      collection: "coll-1",
      folder: "f-1",
      includeSubfolders: true,
    });
    const last = captured.at(-1);
    assert.match(last!.url, /collection=coll-1/);
    assert.match(last!.url, /folder=f-1/);
    assert.match(last!.url, /include_subfolders=true/);
  });

  test("아무 필터 없이 호출 → collection / folder / include_subfolders 파라미터 없음", async () => {
    captured.length = 0;
    const { documentsApi } = await import("../src/lib/api/documents");
    await documentsApi.list({});
    const last = captured.at(-1);
    assert.doesNotMatch(last!.url, /collection=/);
    assert.doesNotMatch(last!.url, /folder=/);
    assert.doesNotMatch(last!.url, /include_subfolders=/);
  });
});
