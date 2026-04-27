/**
 * S3 Phase 3 FG 3-1 — ActorTypeBadge 라벨 / 스타일 매핑 단위 테스트.
 *
 * VectorizationPanel 의 STATUS_DISPLAY 패턴 따라 순수 매핑만 검증.
 * 실제 렌더링은 UI 검수에서.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  ACTOR_TYPE_LABEL,
  ACTOR_TYPE_STYLES,
  type ContributorActorType,
} from "../src/components/badge/ActorTypeBadge";

describe("ACTOR_TYPE_LABEL", () => {
  test("3 종 모두 한국어 라벨이 있음", () => {
    const expected: ContributorActorType[] = ["user", "agent", "system"];
    for (const t of expected) {
      assert.ok(ACTOR_TYPE_LABEL[t], `${t} 라벨 누락`);
      assert.ok(ACTOR_TYPE_LABEL[t].length > 0, `${t} 라벨 공백`);
    }
  });

  test("user='사용자' / agent='에이전트' / system='시스템'", () => {
    assert.equal(ACTOR_TYPE_LABEL.user, "사용자");
    assert.equal(ACTOR_TYPE_LABEL.agent, "에이전트");
    assert.equal(ACTOR_TYPE_LABEL.system, "시스템");
  });

  test("라벨 중복 없음 (사용자 혼동 방지)", () => {
    const labels = Object.values(ACTOR_TYPE_LABEL);
    assert.equal(new Set(labels).size, labels.length);
  });
});

describe("ACTOR_TYPE_STYLES", () => {
  test("3 종 모두 Tailwind bg/text/border 토큰을 가짐", () => {
    const expected: ContributorActorType[] = ["user", "agent", "system"];
    for (const t of expected) {
      const cls = ACTOR_TYPE_STYLES[t];
      assert.match(cls, /\bbg-\S+/, `${t}: bg- 클래스 없음`);
      assert.match(cls, /\btext-\S+/, `${t}: text- 클래스 없음`);
      assert.match(cls, /\bborder-\S+/, `${t}: border- 클래스 없음`);
    }
  });

  test("agent / system 이 user 와 시각적으로 구분됨 (색상 다름)", () => {
    // user=gray, agent=indigo, system=amber — 색상 키워드가 다름을 확인
    assert.match(ACTOR_TYPE_STYLES.user, /gray/);
    assert.match(ACTOR_TYPE_STYLES.agent, /indigo/);
    assert.match(ACTOR_TYPE_STYLES.system, /amber/);
  });

  test("스타일 값 중복 없음", () => {
    const styles = Object.values(ACTOR_TYPE_STYLES);
    assert.equal(new Set(styles).size, styles.length);
  });
});
