/**
 * S3 Phase 2 FG 2-1 UX 5차 — DocumentListPage ?q= URL 동기화 규약.
 *
 * 전체 컴포넌트 마운트는 React Query/Next.js 의존성이 커서 어려우므로, URL 병합 규칙만
 * 추출해 테스트한다. DocumentListPage 의 useEffect 내 `URLSearchParams` 조작 로직과
 * 동일한 규약을 작은 유틸로 재현한다.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

function mergeSearchQuery(currentQs: string, nextQ: string | undefined): string {
  const next = new URLSearchParams(currentQs);
  const trimmed = (nextQ ?? "").trim();
  if (trimmed) next.set("q", trimmed);
  else next.delete("q");
  return next.toString();
}

describe("DocumentListPage URL 동기화 규약", () => {
  test("빈 쿼리에 q 주입", () => {
    assert.equal(mergeSearchQuery("", "정책"), "q=%EC%A0%95%EC%B1%85");
  });

  test("기존 collection / folder 보존", () => {
    const result = mergeSearchQuery("collection=c1&folder=f1", "audit");
    const params = new URLSearchParams(result);
    assert.equal(params.get("collection"), "c1");
    assert.equal(params.get("folder"), "f1");
    assert.equal(params.get("q"), "audit");
  });

  test("빈 q 이면 URL 에서 q 제거", () => {
    assert.equal(mergeSearchQuery("q=old&collection=c1", ""), "collection=c1");
  });

  test("공백만이면 q 제거", () => {
    assert.equal(mergeSearchQuery("q=old", "   "), "");
  });

  test("undefined 이면 q 제거", () => {
    assert.equal(mergeSearchQuery("q=old&folder=f1", undefined), "folder=f1");
  });

  test("앞뒤 공백은 trim 후 URL 에 반영", () => {
    assert.equal(mergeSearchQuery("", "  hello  "), "q=hello");
  });

  test("include_subfolders 등 다른 파라미터 완전 보존", () => {
    const result = mergeSearchQuery(
      "collection=c1&folder=f1&include_subfolders=true",
      "foo",
    );
    const params = new URLSearchParams(result);
    assert.equal(params.get("include_subfolders"), "true");
    assert.equal(params.get("folder"), "f1");
    assert.equal(params.get("q"), "foo");
  });
});
