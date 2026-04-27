"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * S3 Phase 3 FG 3-1 — ActorTypeBadge 라벨 / 스타일 매핑 단위 테스트.
 *
 * VectorizationPanel 의 STATUS_DISPLAY 패턴 따라 순수 매핑만 검증.
 * 실제 렌더링은 UI 검수에서.
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const ActorTypeBadge_1 = require("../src/components/badge/ActorTypeBadge");
(0, node_test_1.describe)("ACTOR_TYPE_LABEL", () => {
    (0, node_test_1.test)("3 종 모두 한국어 라벨이 있음", () => {
        const expected = ["user", "agent", "system"];
        for (const t of expected) {
            strict_1.default.ok(ActorTypeBadge_1.ACTOR_TYPE_LABEL[t], `${t} 라벨 누락`);
            strict_1.default.ok(ActorTypeBadge_1.ACTOR_TYPE_LABEL[t].length > 0, `${t} 라벨 공백`);
        }
    });
    (0, node_test_1.test)("user='사용자' / agent='에이전트' / system='시스템'", () => {
        strict_1.default.equal(ActorTypeBadge_1.ACTOR_TYPE_LABEL.user, "사용자");
        strict_1.default.equal(ActorTypeBadge_1.ACTOR_TYPE_LABEL.agent, "에이전트");
        strict_1.default.equal(ActorTypeBadge_1.ACTOR_TYPE_LABEL.system, "시스템");
    });
    (0, node_test_1.test)("라벨 중복 없음 (사용자 혼동 방지)", () => {
        const labels = Object.values(ActorTypeBadge_1.ACTOR_TYPE_LABEL);
        strict_1.default.equal(new Set(labels).size, labels.length);
    });
});
(0, node_test_1.describe)("ACTOR_TYPE_STYLES", () => {
    (0, node_test_1.test)("3 종 모두 Tailwind bg/text/border 토큰을 가짐", () => {
        const expected = ["user", "agent", "system"];
        for (const t of expected) {
            const cls = ActorTypeBadge_1.ACTOR_TYPE_STYLES[t];
            strict_1.default.match(cls, /\bbg-\S+/, `${t}: bg- 클래스 없음`);
            strict_1.default.match(cls, /\btext-\S+/, `${t}: text- 클래스 없음`);
            strict_1.default.match(cls, /\bborder-\S+/, `${t}: border- 클래스 없음`);
        }
    });
    (0, node_test_1.test)("agent / system 이 user 와 시각적으로 구분됨 (색상 다름)", () => {
        // user=gray, agent=indigo, system=amber — 색상 키워드가 다름을 확인
        strict_1.default.match(ActorTypeBadge_1.ACTOR_TYPE_STYLES.user, /gray/);
        strict_1.default.match(ActorTypeBadge_1.ACTOR_TYPE_STYLES.agent, /indigo/);
        strict_1.default.match(ActorTypeBadge_1.ACTOR_TYPE_STYLES.system, /amber/);
    });
    (0, node_test_1.test)("스타일 값 중복 없음", () => {
        const styles = Object.values(ActorTypeBadge_1.ACTOR_TYPE_STYLES);
        strict_1.default.equal(new Set(styles).size, styles.length);
    });
});
