"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * S3 Phase 2 FG 2-2 UX 다듬기 1차 — `scrollToInlineTag` 헬퍼 단위 테스트.
 *
 * 브라우저 DOM 없이 **최소 DOM shim** (querySelector, classList, scrollIntoView) 을
 * mock 해 로직(첫 매치 선택 + class toggle + CSS.escape 적용) 만 검증.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const scrollToInlineTag_1 = require("../src/features/tags/scrollToInlineTag");
// ---------------------------------------------------------------------------
// 전역 document / CSS / window shim (테스트 범위 내에서만 장착)
// ---------------------------------------------------------------------------
class FakeClassList {
    set = new Set();
    add(...c) { c.forEach((x) => this.set.add(x)); }
    remove(...c) { c.forEach((x) => this.set.delete(x)); }
    contains(c) { return this.set.has(c); }
    toString() { return [...this.set].join(" "); }
}
function makeFakeEl(tag) {
    return {
        classList: new FakeClassList(),
        dataset: { tag },
        offsetWidth: 1,
        scrollIntoView(opts) {
            this.scrollIntoViewCalledWith = opts;
        },
    };
}
const originalDocument = globalThis.document;
const originalCSS = globalThis.CSS;
const originalWindow = globalThis.window;
let lastSelector = "";
let store = {};
let timeoutHandlers = [];
(0, node_test_1.before)(() => {
    globalThis.document = {
        querySelector: (sel) => {
            lastSelector = sel;
            return store[sel] ?? null;
        },
    };
    globalThis.CSS = {
        escape: (s) => s.replace(/["\\]/g, "\\$&"),
    };
    globalThis.window = {
        setTimeout: (fn) => {
            timeoutHandlers.push(fn);
            return 1;
        },
    };
});
(0, node_test_1.after)(() => {
    if (originalDocument === undefined)
        delete globalThis.document;
    else
        globalThis.document = originalDocument;
    if (originalCSS === undefined)
        delete globalThis.CSS;
    else
        globalThis.CSS = originalCSS;
    if (originalWindow === undefined)
        delete globalThis.window;
    else
        globalThis.window = originalWindow;
});
(0, node_test_1.describe)("scrollToInlineTag", () => {
    (0, node_test_1.test)("매치 없음 → false + selector 는 정확한 포맷", () => {
        store = {};
        timeoutHandlers = [];
        const ok = (0, scrollToInlineTag_1.scrollToInlineTag)("정책");
        strict_1.default.equal(ok, false);
        strict_1.default.equal(lastSelector, 'span.tag-pill[data-tag="정책"]');
    });
    (0, node_test_1.test)("빈 이름 / 공백 → false (selector 조회 skip)", () => {
        store = {};
        lastSelector = "";
        strict_1.default.equal((0, scrollToInlineTag_1.scrollToInlineTag)(""), false);
        strict_1.default.equal((0, scrollToInlineTag_1.scrollToInlineTag)("   "), false);
        strict_1.default.equal(lastSelector, ""); // 호출되지 않아야 함
    });
    (0, node_test_1.test)("매치 있음 → scrollIntoView + tag-pill--flash 부착", () => {
        const el = makeFakeEl("ai");
        store = { 'span.tag-pill[data-tag="ai"]': el };
        timeoutHandlers = [];
        const ok = (0, scrollToInlineTag_1.scrollToInlineTag)("ai");
        strict_1.default.equal(ok, true);
        strict_1.default.deepEqual(el.scrollIntoViewCalledWith, {
            behavior: "smooth",
            block: "center",
        });
        strict_1.default.equal(el.classList.contains("tag-pill--flash"), true);
        // setTimeout 안에서 remove 처리
        timeoutHandlers.forEach((fn) => fn());
        strict_1.default.equal(el.classList.contains("tag-pill--flash"), false);
    });
    (0, node_test_1.test)("CSS selector 주입 방지 — 따옴표 / 역슬래시 이스케이프", () => {
        const el = makeFakeEl('bad"val');
        // CSS.escape 는 `"` 를 `\"` 로 바꾼다 → selector 안에서도 닫히지 않고 그대로 조회
        store = { 'span.tag-pill[data-tag="bad\\"val"]': el };
        const ok = (0, scrollToInlineTag_1.scrollToInlineTag)('bad"val');
        strict_1.default.equal(ok, true);
        strict_1.default.match(lastSelector, /bad\\"val/);
    });
    (0, node_test_1.test)("슬래시 포함 nested tag 도 매치 가능", () => {
        const el = makeFakeEl("ml/nlp");
        store = { 'span.tag-pill[data-tag="ml/nlp"]': el };
        strict_1.default.equal((0, scrollToInlineTag_1.scrollToInlineTag)("ml/nlp"), true);
    });
});
