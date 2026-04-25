/**
 * S3 Phase 2 FG 2-1 UX 다듬기 — FolderMoveDialog.computeMoveCandidates 단위 테스트.
 *
 * 이동 대상 후보 필터가 자기 자신과 모든 하위 폴더를 정확히 제외하는지 검증.
 * 순환 참조 방지는 서버에서도 재검증되지만 (folders_service.is_descendant),
 * 프런트는 사전에 드롭다운에서 제외해 UX 상 선택 자체가 불가능하게 한다.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { __test__ } from "../src/features/explore/FolderMoveDialog";
import type { Folder } from "../src/lib/api/folders";

const { computeMoveCandidates, formatPath } = __test__;

function f(id: string, name: string, path: string, parent_id: string | null, depth: number): Folder {
  return {
    id,
    owner_id: "owner-1",
    parent_id,
    name,
    path,
    depth,
    created_at: "2026-04-24T00:00:00Z",
    updated_at: "2026-04-24T00:00:00Z",
  };
}


describe("FolderMoveDialog.computeMoveCandidates", () => {
  test("자기 자신은 후보에서 제외", () => {
    const me = f("m", "me", "/me/", null, 0);
    const candidates = computeMoveCandidates(me, [me]);
    assert.equal(candidates.length, 0);
  });

  test("직계 자식은 후보에서 제외 (path prefix 매칭)", () => {
    const root = f("r", "work", "/work/", null, 0);
    const child = f("c", "proj", "/work/proj/", "r", 1);
    const candidates = computeMoveCandidates(root, [root, child]);
    assert.equal(candidates.length, 0);
  });

  test("손자도 후보에서 제외", () => {
    const root = f("r", "a", "/a/", null, 0);
    const child = f("c", "b", "/a/b/", "r", 1);
    const grand = f("g", "c", "/a/b/c/", "c", 2);
    const candidates = computeMoveCandidates(root, [root, child, grand]);
    assert.equal(candidates.length, 0);
  });

  test("형제 폴더는 후보로 포함", () => {
    const a = f("a", "a", "/a/", null, 0);
    const b = f("b", "b", "/b/", null, 0);
    const candidates = computeMoveCandidates(a, [a, b]);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].id, "b");
  });

  test("다른 서브트리 전체가 후보로 포함", () => {
    const root1 = f("r1", "r1", "/r1/", null, 0);
    const root1Child = f("c1", "c", "/r1/c/", "r1", 1);
    const root2 = f("r2", "r2", "/r2/", null, 0);
    const root2Child = f("c2", "c", "/r2/c/", "r2", 1);
    const candidates = computeMoveCandidates(root1, [root1, root1Child, root2, root2Child]);
    // root1 자신과 r1/c/ 는 제외. r2, r2/c/ 는 포함
    assert.equal(candidates.length, 2);
    assert.deepEqual(candidates.map((f) => f.id).sort(), ["c2", "r2"]);
  });

  test("자식이지만 이름이 부분 문자열로 일치해도 정확한 path prefix 만 제외", () => {
    // "/work/" 와 "/workflow/" 는 path prefix 로는 별개여야 함. path 는 항상 `/` 로 종료하므로
    // startsWith("/work/") 가 "/workflow/" 를 먹지 않는다 — 이 규약의 회귀 방어.
    const work = f("w", "work", "/work/", null, 0);
    const workflow = f("wf", "workflow", "/workflow/", null, 0);
    const candidates = computeMoveCandidates(work, [work, workflow]);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].id, "wf");
  });
});


describe("FolderMoveDialog.formatPath", () => {
  test("루트 한 단계", () => {
    const fld = f("r", "work", "/work/", null, 0);
    assert.equal(formatPath(fld), "work");
  });

  test("여러 단계 › 구분자", () => {
    const fld = f("x", "c", "/a/b/c/", "b", 2);
    assert.equal(formatPath(fld), "a › b › c");
  });

  test("빈 세그먼트는 제거", () => {
    // 이론상 불가하지만 방어적으로 처리
    const fld = f("x", "y", "//y//", null, 0);
    assert.equal(formatPath(fld), "y");
  });
});
