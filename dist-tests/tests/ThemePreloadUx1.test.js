"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * S3 Phase 2 FG 2-2 UX 다듬기 1차 — ThemeApplier.themePreloadSnippet 검증.
 *
 * IIFE 코드를 vm.runInNewContext 로 격리 실행해 localStorage 값에 따라
 * document.documentElement.getAttribute("data-theme") 가 올바르게 세팅되는지 확인.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const node_vm_1 = require("node:vm");
const ThemeApplier_1 = require("../src/components/theme/ThemeApplier");
function runWithStored(value) {
    const attrs = {};
    const context = {
        localStorage: {
            getItem: (_k) => value,
        },
        document: {
            documentElement: {
                setAttribute: (k, v) => {
                    attrs[k] = v;
                },
                getAttribute: (k) => attrs[k] ?? null,
            },
        },
    };
    (0, node_vm_1.runInNewContext)(ThemeApplier_1.themePreloadSnippet, context);
    return context.document.documentElement.getAttribute("data-theme");
}
(0, node_test_1.describe)("themePreloadSnippet — SSR flash 방지 IIFE", () => {
    (0, node_test_1.test)("localStorage dark → data-theme=dark", () => {
        strict_1.default.equal(runWithStored("dark"), "dark");
    });
    (0, node_test_1.test)("localStorage light → data-theme=light", () => {
        strict_1.default.equal(runWithStored("light"), "light");
    });
    (0, node_test_1.test)("localStorage system → 속성 미설정 (SSR 기본과 동일, hydration safe)", () => {
        // "system" 은 서버 렌더와 같은 상태를 유지하기 위해 속성을 건드리지 않는다.
        strict_1.default.equal(runWithStored("system"), null);
    });
    (0, node_test_1.test)("localStorage 없음 → 설정 안 됨 (prefers 기본 동작 유지)", () => {
        strict_1.default.equal(runWithStored(null), null);
    });
    (0, node_test_1.test)("비인식 값 → 무시 (XSS/오염 방지)", () => {
        strict_1.default.equal(runWithStored("<script>"), null);
        strict_1.default.equal(runWithStored("sepia"), null);
    });
});
