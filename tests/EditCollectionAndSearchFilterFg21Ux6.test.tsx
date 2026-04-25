/**
 * S3 Phase 2 FG 2-1 UX 6차 — 남은 이월 2건 회귀.
 *
 * 1) EditCollectionModal.computeUpdateBody — 이름·설명 변경을 PATCH payload 로 조립하는 규약
 * 2) /search URL 조합 — searchApi.documents 가 collection / folder / include_subfolders 를 서버에 전송
 */
import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { computeUpdateBody } from "../src/features/explore/EditCollectionModal";
import type { Collection } from "../src/lib/api/collections";


function c(overrides: Partial<Collection> = {}): Collection {
  return {
    id: "c1",
    owner_id: "u1",
    name: "원본",
    description: null,
    created_at: "2026-04-24T00:00:00Z",
    updated_at: "2026-04-24T00:00:00Z",
    document_count: 0,
    ...overrides,
  };
}


describe("EditCollectionModal.computeUpdateBody", () => {
  test("이름만 변경", () => {
    const body = computeUpdateBody(c(), { name: "새이름", description: "" });
    assert.deepEqual(body, { name: "새이름" });
  });

  test("설명만 추가", () => {
    const body = computeUpdateBody(c(), { name: "원본", description: "설명임" });
    assert.deepEqual(body, { description: "설명임" });
  });

  test("이름 + 설명 동시 변경", () => {
    const body = computeUpdateBody(c(), { name: "새이름", description: "설명" });
    assert.deepEqual(body, { name: "새이름", description: "설명" });
  });

  test("설명을 빈 문자열로 → null 로 전송 (서버 nullable)", () => {
    const body = computeUpdateBody(c({ description: "기존" }), { name: "원본", description: "   " });
    // description 공백만이면 null. (서버는 null 허용)
    assert.deepEqual(body, { description: null });
  });

  test("앞뒤 공백 trim", () => {
    const body = computeUpdateBody(c(), { name: "  새이름  ", description: "" });
    assert.deepEqual(body, { name: "새이름" });
  });

  test("아무것도 안 바꾸면 빈 객체 (= 변경 없음)", () => {
    const body = computeUpdateBody(c({ description: "x" }), { name: "원본", description: "x" });
    assert.deepEqual(body, {});
  });

  test("이름이 비어 있으면 null (검증 실패)", () => {
    assert.equal(computeUpdateBody(c(), { name: "   ", description: "x" }), null);
  });

  test("이름이 너무 길면 null", () => {
    assert.equal(
      computeUpdateBody(c(), { name: "x".repeat(201), description: "" }),
      null,
    );
  });

  test("설명이 2000 자 초과면 null", () => {
    assert.equal(
      computeUpdateBody(c(), { name: "원본", description: "x".repeat(2001) }),
      null,
    );
  });
});


// ---------------------------------------------------------------------------
// 2) /search 의 searchApi.documents 가 collection/folder/include_subfolders 를 전송
// ---------------------------------------------------------------------------

const originalFetch = global.fetch;
const calls: { url: string }[] = [];

before(() => {
  global.fetch = (async (input: RequestInfo | URL) => {
    calls.push({ url: typeof input === "string" ? input : String(input) });
    return new Response(
      JSON.stringify({
        data: { query: "", results: [], pagination: { page: 1, limit: 20, total: 0, has_next: false } },
      }),
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


describe("searchApi.documents — FG 2-1 UX 6차 파라미터", () => {
  test("collection 파라미터 URL 에 전송", async () => {
    const { searchApi } = await import("../src/lib/api/search");
    await searchApi.documents({ q: "hello", collection: "c1" });
    assert.match(calls.at(-1)!.url, /collection=c1/);
    assert.match(calls.at(-1)!.url, /q=hello/);
  });

  test("folder + include_subfolders 함께 전송", async () => {
    const { searchApi } = await import("../src/lib/api/search");
    await searchApi.documents({ q: "x", folder: "f1", include_subfolders: true });
    assert.match(calls.at(-1)!.url, /folder=f1/);
    assert.match(calls.at(-1)!.url, /include_subfolders=true/);
  });

  test("세 필터 모두 + q 함께 전송", async () => {
    const { searchApi } = await import("../src/lib/api/search");
    await searchApi.documents({
      q: "foo",
      collection: "c1",
      folder: "f1",
      include_subfolders: true,
    });
    const url = calls.at(-1)!.url;
    assert.match(url, /q=foo/);
    assert.match(url, /collection=c1/);
    assert.match(url, /folder=f1/);
    assert.match(url, /include_subfolders=true/);
  });

  test("필터 없으면 기본 q 만 전송", async () => {
    const { searchApi } = await import("../src/lib/api/search");
    await searchApi.documents({ q: "plain" });
    const url = calls.at(-1)!.url;
    assert.match(url, /q=plain/);
    assert.doesNotMatch(url, /[?&]collection=/);
    assert.doesNotMatch(url, /[?&]folder=/);
    assert.doesNotMatch(url, /[?&]include_subfolders=/);
  });
});
