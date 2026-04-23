/**
 * P5 유틸 단위 테스트 — AdminExtractionSchemasPage 내부 함수
 *
 * 대상:
 *   - detectRepeatRollback  (P5-2)
 *   - diffMismatchSummary   (P5-1)
 *
 * 런타임: Node 22 내장 `node:test`.
 * 이 파일은 React 렌더링을 수행하지 않으므로 ReactDOM 없이 순수 로직만 검증.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  detectRepeatRollback,
  diffMismatchSummary,
  type FieldsDiff,
} from "../src/features/admin/extraction-schemas/diffMismatch";
import type {
  ExtractionSchemaVersion,
  ExtractionSchemaDiff,
} from "../src/types/s2admin";

// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------

function makeVersion(
  overrides: Partial<ExtractionSchemaVersion>
): ExtractionSchemaVersion {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    schema_id: "00000000-0000-0000-0000-000000000001",
    version: 1,
    fields: {},
    is_deprecated: false,
    deprecation_reason: null,
    change_summary: null,
    changed_fields: [],
    created_at: "2026-04-22T00:00:00+00:00",
    created_by: "cck1835@gmail.com",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// detectRepeatRollback
// ---------------------------------------------------------------------------

describe("detectRepeatRollback", () => {
  test("returns detected=false when versions is empty", () => {
    const hint = detectRepeatRollback([], 2, 3);
    assert.equal(hint.detected, false);
  });

  test("detects via rolled_back_from_version metadata", () => {
    const versions = [
      makeVersion({
        version: 3,
        rolled_back_from_version: 2,
        change_summary: "custom label",
      }),
      makeVersion({ version: 2 }),
    ];
    const hint = detectRepeatRollback(versions, 2, 3);
    assert.equal(hint.detected, true);
    assert.equal(hint.via, "metadata");
    assert.equal(hint.recentVersion, 3);
  });

  test("detects via default change_summary pattern (호환)", () => {
    const versions = [
      makeVersion({
        version: 3,
        rolled_back_from_version: null, // 구버전 서버 or 없음
        change_summary: "v2 로 되돌리기",
      }),
      makeVersion({ version: 2 }),
    ];
    const hint = detectRepeatRollback(versions, 2, 3);
    assert.equal(hint.detected, true);
    assert.equal(hint.via, "summary");
  });

  test("does NOT detect when target differs from recent rollback target", () => {
    const versions = [
      makeVersion({
        version: 3,
        rolled_back_from_version: 2,
      }),
    ];
    // 사용자가 이번엔 v1 으로 되돌리려 함 → 경고 없음
    const hint = detectRepeatRollback(versions, 1, 3);
    assert.equal(hint.detected, false);
  });

  test("does NOT detect when head version != currentVersion", () => {
    // 동시 편집 등으로 currentVersion 과 목록 head 가 일시적으로 어긋난 경우
    // → 경고를 띄우지 않는다 (false-positive 방지).
    const versions = [
      makeVersion({ version: 5, rolled_back_from_version: 2 }),
    ];
    const hint = detectRepeatRollback(versions, 2, 4);
    assert.equal(hint.detected, false);
  });

  test("does NOT detect when most recent version is a normal edit", () => {
    const versions = [
      makeVersion({
        version: 3,
        rolled_back_from_version: null,
        change_summary: "add field foo",
      }),
      makeVersion({ version: 2 }),
    ];
    const hint = detectRepeatRollback(versions, 2, 3);
    assert.equal(hint.detected, false);
  });

  test("metadata takes priority over summary", () => {
    const versions = [
      makeVersion({
        version: 3,
        rolled_back_from_version: 2,
        change_summary: "v1 로 되돌리기", // 메타와 불일치한 이상한 케이스
      }),
    ];
    const hint = detectRepeatRollback(versions, 2, 3);
    assert.equal(hint.detected, true);
    assert.equal(hint.via, "metadata");
  });

  test("summary fallback ignores summary when target does not match", () => {
    const versions = [
      makeVersion({
        version: 3,
        rolled_back_from_version: null,
        change_summary: "v1 로 되돌리기",
      }),
    ];
    const hint = detectRepeatRollback(versions, 2, 3);
    assert.equal(hint.detected, false);
  });

  // ─── P6-1: 핑퐁 감지 ────────────────────────────────────────

  test("P6-1: detects ping-pong via metadata in recent history (not head)", () => {
    // head v5 는 일반 편집이지만, v4 가 v2 로 rollback 된 기록이 있고 지금 또
    // v2 로 되돌리려는 시도 → ping-pong 경고.
    const versions = [
      makeVersion({
        version: 5,
        rolled_back_from_version: null,
        change_summary: "normal edit",
      }),
      makeVersion({
        version: 4,
        rolled_back_from_version: 2,
      }),
      makeVersion({ version: 3 }),
      makeVersion({ version: 2 }),
    ];
    const hint = detectRepeatRollback(versions, 2, 5);
    assert.equal(hint.detected, true);
    assert.equal(hint.kind, "ping-pong");
    assert.equal(hint.via, "metadata");
    assert.equal(hint.recentVersion, 4);
  });

  test("P6-1: detects ping-pong via summary fallback", () => {
    const versions = [
      makeVersion({ version: 5, change_summary: "add field foo" }),
      makeVersion({
        version: 4,
        rolled_back_from_version: null,
        change_summary: "v2 로 되돌리기",
      }),
      makeVersion({ version: 3 }),
    ];
    const hint = detectRepeatRollback(versions, 2, 5);
    assert.equal(hint.detected, true);
    assert.equal(hint.kind, "ping-pong");
    assert.equal(hint.via, "summary");
    assert.equal(hint.recentVersion, 4);
  });

  test("P6-1: immediate kind wins over ping-pong when head is the rollback", () => {
    const versions = [
      makeVersion({ version: 5, rolled_back_from_version: 2 }),
      makeVersion({ version: 4, rolled_back_from_version: 2 }),
    ];
    const hint = detectRepeatRollback(versions, 2, 5);
    assert.equal(hint.detected, true);
    assert.equal(hint.kind, "immediate");
    assert.equal(hint.recentVersion, 5);
  });

  test("P6-1: ping-pong lookback respects upper bound of 5", () => {
    // v7(head, 일반 편집) v6 v5 v4 v3 v2 — v2 에 target=2 로의 rollback 이
    // 있어도 lookback(=5) 밖이므로 감지하지 않음.
    //
    // lookback 5 이면 recentVersions[0..4] 까지만 본다. 인덱스 5(=v2) 는 제외.
    const versions = [
      makeVersion({ version: 7 }), // idx 0 (head)
      makeVersion({ version: 6 }), // idx 1
      makeVersion({ version: 5 }), // idx 2
      makeVersion({ version: 4 }), // idx 3
      makeVersion({ version: 3 }), // idx 4
      makeVersion({ version: 2, rolled_back_from_version: 1 }), // idx 5 (out of range)
    ];
    const hint = detectRepeatRollback(versions, 1, 7);
    assert.equal(hint.detected, false);
  });

  test("P6-1: ping-pong target mismatch does not trigger", () => {
    const versions = [
      makeVersion({ version: 5 }),
      makeVersion({ version: 4, rolled_back_from_version: 3 }),
    ];
    // 최근 rollback 은 v3 대상. 지금 v2 로 되돌리려 함 → 감지 없음.
    const hint = detectRepeatRollback(versions, 2, 5);
    assert.equal(hint.detected, false);
  });

  test("P6-1: first matching rollback in lookback wins", () => {
    // v5 head 편집, v4 → v2 롤백(최근), v3 → v2 롤백(더 과거).
    // 둘 다 target=2 와 매칭되지만 "가장 최근" 인 v4 가 근거로 보고됨.
    const versions = [
      makeVersion({ version: 5 }),
      makeVersion({ version: 4, rolled_back_from_version: 2 }),
      makeVersion({ version: 3, rolled_back_from_version: 2 }),
    ];
    const hint = detectRepeatRollback(versions, 2, 5);
    assert.equal(hint.detected, true);
    assert.equal(hint.kind, "ping-pong");
    assert.equal(hint.recentVersion, 4);
  });
});

// ---------------------------------------------------------------------------
// diffMismatchSummary
// ---------------------------------------------------------------------------

function srvDiff(overrides: Partial<ExtractionSchemaDiff> = {}): ExtractionSchemaDiff {
  return {
    doc_type_code: "contract",
    base_version: 1,
    target_version: 2,
    added: [],
    removed: [],
    modified: [],
    unchanged_count: 0,
    ...overrides,
  };
}

function cliDiff(overrides: Partial<FieldsDiff> = {}): FieldsDiff {
  return {
    added: [],
    removed: [],
    modified: [],
    ...overrides,
  };
}

describe("diffMismatchSummary", () => {
  test("equal=true when both diffs are empty", () => {
    const m = diffMismatchSummary(srvDiff(), cliDiff());
    assert.equal(m.equal, true);
  });

  test("equal=true when added/removed/modified match exactly", () => {
    const m = diffMismatchSummary(
      srvDiff({
        added: ["a"],
        removed: ["b"],
        modified: [
          {
            name: "c",
            changes: [{ key: "required", before: true, after: false }],
          },
        ],
      }),
      cliDiff({
        added: ["a"],
        removed: ["b"],
        modified: [
          {
            name: "c",
            changes: [{ key: "required", before: true, after: false }],
          },
        ],
      })
    );
    assert.equal(m.equal, true);
    assert.equal(m.modifiedKeyDiffers.length, 0);
  });

  test("flags serverOnlyAdded when server sees an add that client missed", () => {
    const m = diffMismatchSummary(
      srvDiff({ added: ["a", "b"] }),
      cliDiff({ added: ["a"] })
    );
    assert.equal(m.equal, false);
    assert.deepEqual(m.serverOnlyAdded, ["b"]);
    assert.deepEqual(m.clientOnlyAdded, []);
  });

  test("flags clientOnlyRemoved when client saw a removal server did not", () => {
    const m = diffMismatchSummary(
      srvDiff(),
      cliDiff({ removed: ["ghost"] })
    );
    assert.equal(m.equal, false);
    assert.deepEqual(m.clientOnlyRemoved, ["ghost"]);
  });

  test("flags modifiedKeyDiffers when same field has different property sets", () => {
    // 예: bool vs int 구분 — 서버는 required=1 → true 을 변경으로 보고,
    //       클라는 동일하다고 봄. 같은 field 'c' 지만 속성 키 집합이 다름.
    const m = diffMismatchSummary(
      srvDiff({
        modified: [
          {
            name: "c",
            changes: [
              { key: "required", before: 1, after: true },
              { key: "description", before: "a", after: "b" },
            ],
          },
        ],
      }),
      cliDiff({
        modified: [
          {
            name: "c",
            changes: [{ key: "description", before: "a", after: "b" }],
          },
        ],
      })
    );
    assert.equal(m.equal, false);
    assert.deepEqual(m.modifiedKeyDiffers, ["c"]);
    assert.deepEqual(m.serverOnlyModified, []);
    assert.deepEqual(m.clientOnlyModified, []);
  });

  test("flags serverOnlyModified when server sees modification but client sees unchanged", () => {
    const m = diffMismatchSummary(
      srvDiff({
        modified: [
          {
            name: "c",
            changes: [{ key: "required", before: true, after: 1 }],
          },
        ],
      }),
      cliDiff()
    );
    assert.equal(m.equal, false);
    assert.deepEqual(m.serverOnlyModified, ["c"]);
  });

  test("result fields are sorted", () => {
    const m = diffMismatchSummary(
      srvDiff({ added: ["zeta", "alpha", "mu"] }),
      cliDiff()
    );
    assert.deepEqual(m.serverOnlyAdded, ["alpha", "mu", "zeta"]);
  });
});
