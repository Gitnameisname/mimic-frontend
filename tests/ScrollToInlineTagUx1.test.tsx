/**
 * S3 Phase 2 FG 2-2 UX 다듬기 1차 — `scrollToInlineTag` 헬퍼 단위 테스트.
 *
 * 브라우저 DOM 없이 **최소 DOM shim** (querySelector, classList, scrollIntoView) 을
 * mock 해 로직(첫 매치 선택 + class toggle + CSS.escape 적용) 만 검증.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import { scrollToInlineTag } from "../src/features/tags/scrollToInlineTag";

// ---------------------------------------------------------------------------
// 전역 document / CSS / window shim (테스트 범위 내에서만 장착)
// ---------------------------------------------------------------------------

class FakeClassList {
  private set = new Set<string>();
  add(...c: string[]) { c.forEach((x) => this.set.add(x)); }
  remove(...c: string[]) { c.forEach((x) => this.set.delete(x)); }
  contains(c: string) { return this.set.has(c); }
  toString() { return [...this.set].join(" "); }
}

interface FakeEl {
  classList: FakeClassList;
  scrollIntoViewCalledWith?: ScrollIntoViewOptions;
  dataset: Record<string, string>;
  offsetWidth: number;
  scrollIntoView: (opts?: ScrollIntoViewOptions) => void;
}

function makeFakeEl(tag: string): FakeEl {
  return {
    classList: new FakeClassList(),
    dataset: { tag },
    offsetWidth: 1,
    scrollIntoView(opts) {
      this.scrollIntoViewCalledWith = opts;
    },
  } as FakeEl;
}

const originalDocument = (globalThis as { document?: unknown }).document;
const originalCSS = (globalThis as { CSS?: unknown }).CSS;
const originalWindow = (globalThis as { window?: unknown }).window;

let lastSelector = "";
let store: Record<string, FakeEl | null> = {};
let timeoutHandlers: Array<() => void> = [];

before(() => {
  (globalThis as unknown as { document: Document }).document = {
    querySelector: (sel: string) => {
      lastSelector = sel;
      return (store[sel] as unknown) ?? null;
    },
  } as unknown as Document;
  (globalThis as unknown as { CSS: { escape: (s: string) => string } }).CSS = {
    escape: (s: string) => s.replace(/["\\]/g, "\\$&"),
  };
  (globalThis as unknown as { window: Window }).window = {
    setTimeout: (fn: () => void) => {
      timeoutHandlers.push(fn);
      return 1 as unknown as number;
    },
  } as unknown as Window;
});

after(() => {
  if (originalDocument === undefined) delete (globalThis as { document?: unknown }).document;
  else (globalThis as { document?: unknown }).document = originalDocument;
  if (originalCSS === undefined) delete (globalThis as { CSS?: unknown }).CSS;
  else (globalThis as { CSS?: unknown }).CSS = originalCSS;
  if (originalWindow === undefined) delete (globalThis as { window?: unknown }).window;
  else (globalThis as { window?: unknown }).window = originalWindow;
});

describe("scrollToInlineTag", () => {
  test("매치 없음 → false + selector 는 정확한 포맷", () => {
    store = {};
    timeoutHandlers = [];
    const ok = scrollToInlineTag("정책");
    assert.equal(ok, false);
    assert.equal(lastSelector, 'span.tag-pill[data-tag="정책"]');
  });

  test("빈 이름 / 공백 → false (selector 조회 skip)", () => {
    store = {};
    lastSelector = "";
    assert.equal(scrollToInlineTag(""), false);
    assert.equal(scrollToInlineTag("   "), false);
    assert.equal(lastSelector, ""); // 호출되지 않아야 함
  });

  test("매치 있음 → scrollIntoView + tag-pill--flash 부착", () => {
    const el = makeFakeEl("ai");
    store = { 'span.tag-pill[data-tag="ai"]': el };
    timeoutHandlers = [];
    const ok = scrollToInlineTag("ai");
    assert.equal(ok, true);
    assert.deepEqual(el.scrollIntoViewCalledWith, {
      behavior: "smooth",
      block: "center",
    });
    assert.equal(el.classList.contains("tag-pill--flash"), true);

    // setTimeout 안에서 remove 처리
    timeoutHandlers.forEach((fn) => fn());
    assert.equal(el.classList.contains("tag-pill--flash"), false);
  });

  test("CSS selector 주입 방지 — 따옴표 / 역슬래시 이스케이프", () => {
    const el = makeFakeEl('bad"val');
    // CSS.escape 는 `"` 를 `\"` 로 바꾼다 → selector 안에서도 닫히지 않고 그대로 조회
    store = { 'span.tag-pill[data-tag="bad\\"val"]': el };
    const ok = scrollToInlineTag('bad"val');
    assert.equal(ok, true);
    assert.match(lastSelector, /bad\\"val/);
  });

  test("슬래시 포함 nested tag 도 매치 가능", () => {
    const el = makeFakeEl("ml/nlp");
    store = { 'span.tag-pill[data-tag="ml/nlp"]': el };
    assert.equal(scrollToInlineTag("ml/nlp"), true);
  });
});
