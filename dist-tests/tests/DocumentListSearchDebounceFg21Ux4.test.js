"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * S3 Phase 2 FG 2-1 UX 4차 — DocumentListPage 검색 debounce + 전체검색 링크 방향.
 *
 * 실제 DocumentListPage 컴포넌트는 React Query/Next.js hook 의존이 커서 Node 러너에서
 * 직접 마운트하기 어렵다. 그래서 두 얇은 순수 로직을 검증한다:
 *
 *   1) 검색 입력이 여러 번 빠르게 들어올 때 마지막 값만 반영되는 `debounce` 타이밍 패턴.
 *      DocumentListPage 의 `useEffect(setTimeout 300ms)` 가 구현하는 규약과 동일한 함수를
 *      테스트 내부 재구현으로 확인한다 (단위 타이머 → 타이밍 의도 회귀 방어).
 *
 *   2) DocumentListPage 가 쓰는 /search 링크 URL 조합 규칙 — 현재 검색어가 있으면
 *      `/search?q=<encoded>`, 없으면 `/search` 로 이동.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
// ---------------------------------------------------------------------------
// 1) debounce 타이밍 패턴 — DocumentListPage useEffect 안의 setTimeout 로직과 동일 규약
// ---------------------------------------------------------------------------
function makeDebouncedApplier(ms, onApply) {
    return (value) => {
        const handle = setTimeout(() => onApply(value), ms);
        return () => clearTimeout(handle);
    };
}
(0, node_test_1.describe)("검색 debounce 타이밍", () => {
    (0, node_test_1.test)("여러 입력이 300ms 내에 연달아 오면 마지막 값만 반영", async () => {
        const applied = [];
        const schedule = makeDebouncedApplier(80, (v) => applied.push(v));
        // 빠른 연속 입력 — 기존 타이머를 취소하고 새로 등록하는 react useEffect cleanup 규약 흉내
        let cancel = schedule("a");
        await new Promise((r) => setTimeout(r, 20));
        cancel();
        cancel = schedule("ab");
        await new Promise((r) => setTimeout(r, 20));
        cancel();
        cancel = schedule("abc");
        // 마지막 예약만 남기고 wait
        await new Promise((r) => setTimeout(r, 120));
        strict_1.default.deepEqual(applied, ["abc"]);
    });
    (0, node_test_1.test)("타이머 만료 전 cleanup 이면 apply 가 호출되지 않음", async () => {
        const applied = [];
        const schedule = makeDebouncedApplier(80, (v) => applied.push(v));
        const cancel = schedule("x");
        cancel();
        await new Promise((r) => setTimeout(r, 120));
        strict_1.default.deepEqual(applied, []);
    });
});
// ---------------------------------------------------------------------------
// 2) /search 링크 URL 규칙 — "본문까지 전체 검색 →" 버튼 href 조합
// ---------------------------------------------------------------------------
function searchLinkHref(currentSearch) {
    const trimmed = currentSearch.trim();
    return trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search";
}
(0, node_test_1.describe)("전체 검색 링크 URL", () => {
    (0, node_test_1.test)("검색어 있으면 /search?q=<encoded>", () => {
        strict_1.default.equal(searchLinkHref("정책"), "/search?q=%EC%A0%95%EC%B1%85");
        strict_1.default.equal(searchLinkHref("hello world"), "/search?q=hello%20world");
    });
    (0, node_test_1.test)("비어있으면 /search 로 이동 (q 없음)", () => {
        strict_1.default.equal(searchLinkHref(""), "/search");
        strict_1.default.equal(searchLinkHref("   "), "/search");
    });
    (0, node_test_1.test)("앞뒤 공백은 trim 후 전송", () => {
        strict_1.default.equal(searchLinkHref("  x  "), "/search?q=x");
    });
});
