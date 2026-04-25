/**
 * S3 Phase 2 FG 2-2 UX 다듬기 1차 — ThemeApplier.themePreloadSnippet 검증.
 *
 * IIFE 코드를 vm.runInNewContext 로 격리 실행해 localStorage 값에 따라
 * document.documentElement.getAttribute("data-theme") 가 올바르게 세팅되는지 확인.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";

import { themePreloadSnippet } from "../src/components/theme/ThemeApplier";

function runWithStored(value: string | null): string | null {
  const attrs: Record<string, string> = {};
  const context = {
    localStorage: {
      getItem: (_k: string) => value,
    },
    document: {
      documentElement: {
        setAttribute: (k: string, v: string) => {
          attrs[k] = v;
        },
        getAttribute: (k: string) => attrs[k] ?? null,
      },
    },
  };
  runInNewContext(themePreloadSnippet, context as unknown as object);
  return context.document.documentElement.getAttribute("data-theme");
}

describe("themePreloadSnippet — SSR flash 방지 IIFE", () => {
  test("localStorage dark → data-theme=dark", () => {
    assert.equal(runWithStored("dark"), "dark");
  });

  test("localStorage light → data-theme=light", () => {
    assert.equal(runWithStored("light"), "light");
  });

  test("localStorage system → 속성 미설정 (SSR 기본과 동일, hydration safe)", () => {
    // "system" 은 서버 렌더와 같은 상태를 유지하기 위해 속성을 건드리지 않는다.
    assert.equal(runWithStored("system"), null);
  });

  test("localStorage 없음 → 설정 안 됨 (prefers 기본 동작 유지)", () => {
    assert.equal(runWithStored(null), null);
  });

  test("비인식 값 → 무시 (XSS/오염 방지)", () => {
    assert.equal(runWithStored("<script>"), null);
    assert.equal(runWithStored("sepia"), null);
  });
});
