/**
 * S3 Phase 2 FG 2-1 UX 2차 — adaptDocument 가 folder_id / in_collection_ids 필드를 보존하는지.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { adaptDocument } from "../src/lib/api/documents";


describe("adaptDocument — FG 2-1 UX 2차 assignment 필드", () => {
  test("envelope { data } 에서 folder_id / in_collection_ids 보존", () => {
    const raw = {
      data: {
        id: "d1",
        title: "T",
        document_type: "policy",
        created_by: "u1",
        created_at: "2026-04-24T00:00:00Z",
        updated_at: "2026-04-24T00:00:00Z",
        folder_id: "f1",
        in_collection_ids: ["c1", "c2"],
      },
    };
    const doc = adaptDocument(raw);
    assert.equal(doc.folder_id, "f1");
    assert.deepEqual(doc.in_collection_ids, ["c1", "c2"]);
  });

  test("folder_id 가 null 로 오면 null 유지 (폴더 미배치 문서)", () => {
    const raw = {
      data: {
        id: "d1",
        title: "T",
        document_type: "policy",
        created_by: "u1",
        created_at: "2026-04-24T00:00:00Z",
        updated_at: "2026-04-24T00:00:00Z",
        folder_id: null,
        in_collection_ids: [],
      },
    };
    const doc = adaptDocument(raw);
    assert.equal(doc.folder_id, null);
    assert.deepEqual(doc.in_collection_ids, []);
  });

  test("필드 없으면 기본값 (서버가 필드를 안 보낸 레거시 응답 호환)", () => {
    const raw = {
      data: {
        id: "d1",
        title: "T",
        document_type: "policy",
        created_by: "u1",
        created_at: "2026-04-24T00:00:00Z",
        updated_at: "2026-04-24T00:00:00Z",
      },
    };
    const doc = adaptDocument(raw);
    assert.equal(doc.folder_id, null);
    assert.deepEqual(doc.in_collection_ids, []);
  });

  test("envelope 없는 평평한 형태도 허용", () => {
    const raw = {
      id: "d1",
      title: "T",
      document_type: "policy",
      created_by: "u1",
      created_at: "2026-04-24T00:00:00Z",
      updated_at: "2026-04-24T00:00:00Z",
      folder_id: "f1",
      in_collection_ids: ["c1"],
    };
    const doc = adaptDocument(raw);
    assert.equal(doc.folder_id, "f1");
    assert.deepEqual(doc.in_collection_ids, ["c1"]);
  });

  test("in_collection_ids 가 비 배열이면 빈 배열로 정규화", () => {
    const raw = {
      data: {
        id: "d1",
        title: "T",
        document_type: "policy",
        created_by: "u1",
        created_at: "2026-04-24T00:00:00Z",
        updated_at: "2026-04-24T00:00:00Z",
        in_collection_ids: "not-an-array",
      },
    };
    const doc = adaptDocument(raw);
    assert.deepEqual(doc.in_collection_ids, []);
  });
});
