/**
 * S3 Phase 2 FG 2-1 — FoldersTree.buildTree 순수 함수 테스트.
 *
 * buildTree 는 서버에서 받은 flat Folder[] → parent_id 기반 계층 트리로 변환한다.
 * 렌더 로직(hooks 의존) 과는 분리해 단위 테스트 가능하다.
 *
 * 런타임: Node 22 내장 node:test. 외부 devDep 0.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { __test__ } from "../src/features/explore/FoldersTree";
import type { Folder } from "../src/lib/api/folders";

const { buildTree } = __test__;

function f(
  id: string,
  name: string,
  path: string,
  depth: number,
  parent_id: string | null,
): Folder {
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


describe("FoldersTree.buildTree", () => {
  test("빈 배열 → 빈 트리", () => {
    assert.deepEqual(buildTree([]), []);
  });

  test("단일 루트", () => {
    const tree = buildTree([f("r1", "work", "/work/", 0, null)]);
    assert.equal(tree.length, 1);
    assert.equal(tree[0].folder.id, "r1");
    assert.equal(tree[0].children.length, 0);
  });

  test("두 레벨 계층 — 자식을 parent.children 에 넣는다", () => {
    const tree = buildTree([
      f("a", "work", "/work/", 0, null),
      f("b", "proj", "/work/proj/", 1, "a"),
    ]);
    assert.equal(tree.length, 1);
    assert.equal(tree[0].folder.id, "a");
    assert.equal(tree[0].children.length, 1);
    assert.equal(tree[0].children[0].folder.id, "b");
  });

  test("3 레벨 — 손자까지 재귀", () => {
    const tree = buildTree([
      f("a", "work", "/work/", 0, null),
      f("b", "proj", "/work/proj/", 1, "a"),
      f("c", "2026", "/work/proj/2026/", 2, "b"),
    ]);
    assert.equal(tree.length, 1);
    assert.equal(tree[0].children[0].children[0].folder.id, "c");
  });

  test("같은 부모 아래 여러 자식 — path 오름차순 정렬", () => {
    // 서버가 이미 path 순으로 주지만 buildTree 도 안정 정렬 수행
    const tree = buildTree([
      f("a", "root", "/root/", 0, null),
      f("c2", "z", "/root/z/", 1, "a"),
      f("c1", "a", "/root/a/", 1, "a"),
    ]);
    assert.equal(tree[0].children.length, 2);
    assert.equal(tree[0].children[0].folder.id, "c1"); // /root/a/ 가 먼저
    assert.equal(tree[0].children[1].folder.id, "c2");
  });

  test("부모가 리스트에 없으면 고아 노드는 루트로 취급 (데이터 정합성 방어)", () => {
    // 비정상 데이터지만 크래시 없이 렌더되도록
    const tree = buildTree([
      f("orphan", "stray", "/stray/", 0, "missing-parent"),
    ]);
    assert.equal(tree.length, 1);
    assert.equal(tree[0].folder.id, "orphan");
  });

  test("여러 루트 동시 존재", () => {
    const tree = buildTree([
      f("a", "a", "/a/", 0, null),
      f("b", "b", "/b/", 0, null),
    ]);
    assert.equal(tree.length, 2);
  });
});
