"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const VectorizationPanel_1 = require("../src/features/documents/VectorizationPanel");
(0, node_test_1.describe)("FG 0-5 STATUS_DISPLAY", () => {
    (0, node_test_1.test)("6가지 상태 모두 매핑 존재", () => {
        const expected = [
            "indexed",
            "stale",
            "pending",
            "in_progress",
            "failed",
            "not_applicable",
        ];
        for (const s of expected) {
            strict_1.default.ok(VectorizationPanel_1.STATUS_DISPLAY[s], `status=${s} 매핑 누락`);
            strict_1.default.ok(VectorizationPanel_1.STATUS_DISPLAY[s].label.length > 0, `${s} 의 label 공백`);
            strict_1.default.ok(VectorizationPanel_1.STATUS_DISPLAY[s].srText.length > 0, `${s} 의 srText 공백`);
            strict_1.default.ok(VectorizationPanel_1.STATUS_DISPLAY[s].icon.length > 0, `${s} 의 icon 공백`);
        }
    });
    (0, node_test_1.test)("색상은 Tailwind bg/text/border 3쌍을 포함", () => {
        for (const [s, v] of Object.entries(VectorizationPanel_1.STATUS_DISPLAY)) {
            const color = v.color;
            strict_1.default.match(color, /\bbg-\S+/, `${s}: bg- 클래스 없음`);
            strict_1.default.match(color, /\btext-\S+/, `${s}: text- 클래스 없음`);
            strict_1.default.match(color, /\bborder-\S+/, `${s}: border- 클래스 없음`);
        }
    });
    (0, node_test_1.test)("indexed 는 초록, failed 는 빨강, stale 은 amber 계열", () => {
        strict_1.default.match(VectorizationPanel_1.STATUS_DISPLAY.indexed.color, /green/);
        strict_1.default.match(VectorizationPanel_1.STATUS_DISPLAY.failed.color, /red/);
        strict_1.default.match(VectorizationPanel_1.STATUS_DISPLAY.stale.color, /amber/);
    });
    (0, node_test_1.test)("라벨 중복 없음 (사용자 혼동 방지)", () => {
        const labels = Object.values(VectorizationPanel_1.STATUS_DISPLAY).map((v) => v.label);
        const unique = new Set(labels);
        strict_1.default.equal(unique.size, labels.length, "중복된 label 존재");
    });
});
