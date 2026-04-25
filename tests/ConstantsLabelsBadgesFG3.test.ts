/**
 * docs/함수도서관 §1.7 (FE-G3) — admin 라벨/배지 상수 검증.
 *
 * 검증 항목:
 *   - 5 도메인 모두 라벨이 비공백 문자열.
 *   - 배지 className 이 Tailwind bg/text 토큰을 포함.
 *   - 도메인 enum 의 모든 키를 커버 (라벨/배지 객체 키 일치).
 *   - 기존 thin re-export 가 신규 위치를 가리킴.
 */

process.env.TZ = "UTC";

import { test, describe } from "node:test";
import assert from "node:assert/strict";

// 신규 위치 (lib/constants)
import {
  EXTRACTION_STATUS_LABELS,
  GOLDEN_SET_STATUS_LABELS,
  GOLDEN_SET_DOMAIN_LABELS,
  EVALUATION_RUN_STATUS_LABELS,
  EVALUATION_METRIC_LABELS,
} from "../src/lib/constants/labels";
import {
  EXTRACTION_STATUS_BADGE_CLASSES,
  GOLDEN_SET_STATUS_BADGE_CLASSES,
  EVALUATION_RUN_STATUS_BADGE_CLASSES,
} from "../src/lib/constants/badges";

// 기존 위치 (thin re-export)
import {
  EXTRACTION_STATUS_LABELS as EXT_LABELS_LEGACY,
  EXTRACTION_STATUS_BADGE_CLASSES as EXT_BADGE_LEGACY,
} from "../src/features/admin/extraction-queue/constants";
import {
  STATUS_LABEL as EVAL_STATUS_LABEL_LEGACY,
  STATUS_BADGE_STYLE as EVAL_BADGE_LEGACY,
  METRIC_LABELS as METRIC_LABELS_LEGACY,
} from "../src/features/admin/evaluations/helpers";

// ---------------------------------------------------------------------------
// 라벨 — 모두 비공백
// ---------------------------------------------------------------------------

describe("labels — 비공백 문자열", () => {
  const allLabelMaps = {
    EXTRACTION_STATUS_LABELS,
    GOLDEN_SET_STATUS_LABELS,
    GOLDEN_SET_DOMAIN_LABELS,
    EVALUATION_RUN_STATUS_LABELS,
    EVALUATION_METRIC_LABELS,
  };
  for (const [name, m] of Object.entries(allLabelMaps)) {
    test(`${name}: 키 ≥1 + 모든 값이 비공백`, () => {
      const keys = Object.keys(m);
      assert.ok(keys.length >= 1, `${name} 비어있음`);
      for (const k of keys) {
        const v = (m as Record<string, string>)[k];
        assert.equal(typeof v, "string");
        assert.ok(v.trim().length > 0, `${name}[${k}] 빈 문자열`);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 배지 — Tailwind bg/text 포함
// ---------------------------------------------------------------------------

describe("badge classNames — Tailwind 토큰 포함", () => {
  const allBadgeMaps = {
    EXTRACTION_STATUS_BADGE_CLASSES,
    GOLDEN_SET_STATUS_BADGE_CLASSES,
    EVALUATION_RUN_STATUS_BADGE_CLASSES,
  };
  for (const [name, m] of Object.entries(allBadgeMaps)) {
    test(`${name}: 모든 값이 bg- + text- 토큰 포함`, () => {
      for (const v of Object.values(m as Record<string, string>)) {
        assert.match(v, /\bbg-/);
        assert.match(v, /\btext-/);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 도메인 enum 키 일치 (라벨 키 == 배지 키)
// ---------------------------------------------------------------------------

describe("키 일치 (라벨 ↔ 배지)", () => {
  test("EXTRACTION: labels keys === badges keys", () => {
    assert.deepEqual(
      Object.keys(EXTRACTION_STATUS_LABELS).sort(),
      Object.keys(EXTRACTION_STATUS_BADGE_CLASSES).sort(),
    );
  });
  test("GOLDEN_SET STATUS: labels keys === badges keys", () => {
    assert.deepEqual(
      Object.keys(GOLDEN_SET_STATUS_LABELS).sort(),
      Object.keys(GOLDEN_SET_STATUS_BADGE_CLASSES).sort(),
    );
  });
  test("EVALUATION RUN STATUS: labels keys === badges keys", () => {
    assert.deepEqual(
      Object.keys(EVALUATION_RUN_STATUS_LABELS).sort(),
      Object.keys(EVALUATION_RUN_STATUS_BADGE_CLASSES).sort(),
    );
  });
});

// ---------------------------------------------------------------------------
// 색상 정책 회귀 — 핵심 상태가 의도한 색상 계열인가
// ---------------------------------------------------------------------------

describe("색상 정책 회귀", () => {
  test("EXTRACTION pending_review = amber", () => {
    assert.match(EXTRACTION_STATUS_BADGE_CLASSES.pending_review, /amber/);
  });
  test("EXTRACTION approved = green", () => {
    assert.match(EXTRACTION_STATUS_BADGE_CLASSES.approved, /green/);
  });
  test("EXTRACTION rejected = red", () => {
    assert.match(EXTRACTION_STATUS_BADGE_CLASSES.rejected, /red/);
  });
  test("EVALUATION completed = green", () => {
    assert.match(EVALUATION_RUN_STATUS_BADGE_CLASSES.completed, /green/);
  });
  test("EVALUATION failed = red", () => {
    assert.match(EVALUATION_RUN_STATUS_BADGE_CLASSES.failed, /red/);
  });
});

// ---------------------------------------------------------------------------
// thin re-export 일관성 — legacy import 가 신규 객체와 동일 (참조 일치)
// ---------------------------------------------------------------------------

describe("thin re-export 일관성", () => {
  test("extraction-queue/constants.EXTRACTION_STATUS_LABELS === lib/constants/labels", () => {
    assert.equal(EXT_LABELS_LEGACY, EXTRACTION_STATUS_LABELS);
  });
  test("extraction-queue/constants.EXTRACTION_STATUS_BADGE_CLASSES === lib/constants/badges", () => {
    assert.equal(EXT_BADGE_LEGACY, EXTRACTION_STATUS_BADGE_CLASSES);
  });
  test("evaluations/helpers.STATUS_LABEL === lib/constants/labels.EVALUATION_RUN_STATUS_LABELS", () => {
    assert.equal(EVAL_STATUS_LABEL_LEGACY, EVALUATION_RUN_STATUS_LABELS);
  });
  test("evaluations/helpers.STATUS_BADGE_STYLE === lib/constants/badges.EVALUATION_RUN_STATUS_BADGE_CLASSES", () => {
    assert.equal(EVAL_BADGE_LEGACY, EVALUATION_RUN_STATUS_BADGE_CLASSES);
  });
  test("evaluations/helpers.METRIC_LABELS === lib/constants/labels.EVALUATION_METRIC_LABELS", () => {
    assert.equal(METRIC_LABELS_LEGACY, EVALUATION_METRIC_LABELS);
  });
});
