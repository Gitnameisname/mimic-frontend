"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * S3 Phase 2 FG 2-1 UX 5차 — DocumentListPage ?q= URL 동기화 규약.
 *
 * 전체 컴포넌트 마운트는 React Query/Next.js 의존성이 커서 어려우므로, URL 병합 규칙만
 * 추출해 테스트한다. DocumentListPage 의 useEffect 내 `URLSearchParams` 조작 로직과
 * 동일한 규약을 작은 유틸로 재현한다.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
function mergeSearchQuery(currentQs, nextQ) {
    const next = new URLSearchParams(currentQs);
    const trimmed = (nextQ ?? "").trim();
    if (trimmed)
        next.set("q", trimmed);
    else
        next.delete("q");
    return next.toString();
}
(0, node_test_1.describe)("DocumentListPage URL 동기화 규약", () => {
    (0, node_test_1.test)("빈 쿼리에 q 주입", () => {
        strict_1.default.equal(mergeSearchQuery("", "정책"), "q=%EC%A0%95%EC%B1%85");
    });
    (0, node_test_1.test)("기존 collection / folder 보존", () => {
        const result = mergeSearchQuery("collection=c1&folder=f1", "audit");
        const params = new URLSearchParams(result);
        strict_1.default.equal(params.get("collection"), "c1");
        strict_1.default.equal(params.get("folder"), "f1");
        strict_1.default.equal(params.get("q"), "audit");
    });
    (0, node_test_1.test)("빈 q 이면 URL 에서 q 제거", () => {
        strict_1.default.equal(mergeSearchQuery("q=old&collection=c1", ""), "collection=c1");
    });
    (0, node_test_1.test)("공백만이면 q 제거", () => {
        strict_1.default.equal(mergeSearchQuery("q=old", "   "), "");
    });
    (0, node_test_1.test)("undefined 이면 q 제거", () => {
        strict_1.default.equal(mergeSearchQuery("q=old&folder=f1", undefined), "folder=f1");
    });
    (0, node_test_1.test)("앞뒤 공백은 trim 후 URL 에 반영", () => {
        strict_1.default.equal(mergeSearchQuery("", "  hello  "), "q=hello");
    });
    (0, node_test_1.test)("include_subfolders 등 다른 파라미터 완전 보존", () => {
        const result = mergeSearchQuery("collection=c1&folder=f1&include_subfolders=true", "foo");
        const params = new URLSearchParams(result);
        strict_1.default.equal(params.get("include_subfolders"), "true");
        strict_1.default.equal(params.get("folder"), "f1");
        strict_1.default.equal(params.get("q"), "foo");
    });
});
