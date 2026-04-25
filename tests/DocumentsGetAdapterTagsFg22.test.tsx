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
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

const originalFetch = global.fetch;

let nextResponse: () => Response = () =>
  new Response("null", { status: 200, headers: { "content-type": "application/json" } });

before(() => {
  global.fetch = (async () => nextResponse()) as typeof global.fetch;
});

after(() => {
  global.fetch = originalFetch;
});

function rawDoc(overrides: Record<string, unknown> = {}) {
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

describe("documentsApi.get adapter — FG 2-2 document_tags", () => {
  test("올바른 세 항목 (inline/frontmatter/both) 전부 보존", async () => {
    nextResponse = () =>
      new Response(
        JSON.stringify(
          rawDoc({
            document_tags: [
              { id: "t1", name: "ai", source: "inline" },
              { id: "t2", name: "ml", source: "frontmatter" },
              { id: "t3", name: "db", source: "both" },
            ],
          }),
        ),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    const { documentsApi } = await import("../src/lib/api/documents");
    const doc = await documentsApi.get("d-1");
    assert.equal(doc.folder_id, "f-1");
    assert.deepEqual(doc.in_collection_ids, ["c-1", "c-2"]);
    assert.equal(doc.document_tags?.length, 3);
    assert.deepEqual(doc.document_tags, [
      { id: "t1", name: "ai", source: "inline" },
      { id: "t2", name: "ml", source: "frontmatter" },
      { id: "t3", name: "db", source: "both" },
    ]);
  });

  test("source 가 알 수 없는 값이면 'inline' 으로 안전하게 fallback (readonly 표시)", async () => {
    // 서버 Pydantic 은 "inline"/"frontmatter"/"both" 만 생성하지만, 프런트 adapter 는
    // 방어적으로 알 수 없는 source 를 "inline" 으로 fallback 시켜 readonly chip 으로 보이게 한다.
    nextResponse = () =>
      new Response(
        JSON.stringify(
          rawDoc({
            document_tags: [
              { id: "t1", name: "ok", source: "inline" },
              { id: "t2", name: "bad", source: "external" },
            ],
          }),
        ),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    const { documentsApi } = await import("../src/lib/api/documents");
    const doc = await documentsApi.get("d-1");
    assert.equal(doc.document_tags?.length, 2);
    assert.equal(doc.document_tags?.[0].source, "inline");
    // 미지의 "external" 은 readonly 로 떨어지도록 "inline" 으로 fallback
    assert.equal(doc.document_tags?.[1].source, "inline");
    assert.equal(doc.document_tags?.[1].name, "bad");
  });

  test("id/name 이 문자열이 아니면 걸러짐", async () => {
    nextResponse = () =>
      new Response(
        JSON.stringify(
          rawDoc({
            document_tags: [
              { id: 42, name: "ok", source: "inline" },
              { id: "t2", name: null, source: "inline" },
              { id: "t3", name: "good", source: "inline" },
            ],
          }),
        ),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    const { documentsApi } = await import("../src/lib/api/documents");
    const doc = await documentsApi.get("d-1");
    assert.equal(doc.document_tags?.length, 1);
    assert.equal(doc.document_tags?.[0].id, "t3");
  });

  test("필드 부재 / null → 빈 배열", async () => {
    nextResponse = () =>
      new Response(JSON.stringify(rawDoc({ document_tags: undefined })), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const { documentsApi } = await import("../src/lib/api/documents");
    const doc = await documentsApi.get("d-1");
    assert.deepEqual(doc.document_tags ?? [], []);
  });
});
