/**
 * FG 0-5 (2026-04-23) — VectorizationPanel STATUS_DISPLAY 매핑 단위 테스트.
 *
 * 런타임: Node 22 내장 `node:test`.
 *
 * 제한:
 *   React Query Provider + MutationObserver + hooks 가 얽혀 있어 full component
 *   render 은 무거우므로, 본 테스트는 **STATUS_DISPLAY 순수 매핑** 만 검증한다.
 *   전체 상호작용 (쿨다운/폴링/버튼 토글) 검증은 E2E 에서 수행한다.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { STATUS_DISPLAY } from "../src/features/documents/VectorizationPanel";

describe("FG 0-5 STATUS_DISPLAY", () => {
  test("6가지 상태 모두 매핑 존재", () => {
    const expected = [
      "indexed",
      "stale",
      "pending",
      "in_progress",
      "failed",
      "not_applicable",
    ] as const;
    for (const s of expected) {
      assert.ok(STATUS_DISPLAY[s], `status=${s} 매핑 누락`);
      assert.ok(STATUS_DISPLAY[s].label.length > 0, `${s} 의 label 공백`);
      assert.ok(STATUS_DISPLAY[s].srText.length > 0, `${s} 의 srText 공백`);
      assert.ok(STATUS_DISPLAY[s].icon.length > 0, `${s} 의 icon 공백`);
    }
  });

  test("색상은 Tailwind bg/text/border 3쌍을 포함", () => {
    for (const [s, v] of Object.entries(STATUS_DISPLAY)) {
      const color = v.color;
      assert.match(color, /\bbg-\S+/, `${s}: bg- 클래스 없음`);
      assert.match(color, /\btext-\S+/, `${s}: text- 클래스 없음`);
      assert.match(color, /\bborder-\S+/, `${s}: border- 클래스 없음`);
    }
  });

  test("indexed 는 초록, failed 는 빨강, stale 은 amber 계열", () => {
    assert.match(STATUS_DISPLAY.indexed.color, /green/);
    assert.match(STATUS_DISPLAY.failed.color, /red/);
    assert.match(STATUS_DISPLAY.stale.color, /amber/);
  });

  test("라벨 중복 없음 (사용자 혼동 방지)", () => {
    const labels = Object.values(STATUS_DISPLAY).map((v) => v.label);
    const unique = new Set(labels);
    assert.equal(unique.size, labels.length, "중복된 label 존재");
  });
});
