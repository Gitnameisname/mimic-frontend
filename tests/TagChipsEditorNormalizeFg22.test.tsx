/**
 * S3 Phase 2 FG 2-2 — TagChipsEditor.normalizeClient 규약 검증.
 *
 * 서버 `normalize_tag` 와 동일 규약:
 *   1) trim
 *   2) 선행 `#` 1개만 허용 (`##` 는 reject)
 *   3) NFKC + toLowerCase
 *   4) [\p{L}\p{N}_/-]{1,64} 매칭
 *
 * 서버가 최종 정본이므로 클라이언트는 빠른 UX 피드백 용도.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("TagChipsEditor.normalizeClient — 서버 normalize_tag 동등성", async () => {
  const { __test__ } = await import("../src/features/tags/TagChipsEditor");
  const { normalizeClient } = __test__;

  test("공백 / 빈 문자열 → null", () => {
    assert.equal(normalizeClient(""), null);
    assert.equal(normalizeClient("   "), null);
  });

  test("선행 # 1개 제거 후 유효 문자열 → 소문자 이름", () => {
    assert.equal(normalizeClient("#AI"), "ai");
    assert.equal(normalizeClient("ai"), "ai");
  });

  test("## 는 reject (# 만 남기 때문에 slice 후 또 #로 시작)", () => {
    assert.equal(normalizeClient("##ai"), null);
  });

  test("NFKC 정규화 후 소문자 — 전각 숫자·한글 호환", () => {
    // 전각 숫자 1 (U+FF11) → NFKC 로 "1"
    assert.equal(normalizeClient("tag１"), "tag1");
    // 한글은 그대로 보존
    assert.equal(normalizeClient("문서"), "문서");
  });

  test("허용 문자 집합: 유니코드 letter/digit + _ / -", () => {
    assert.equal(normalizeClient("ml/nlp"), "ml/nlp");
    assert.equal(normalizeClient("prod-2026"), "prod-2026");
    assert.equal(normalizeClient("snake_case"), "snake_case");
  });

  test("허용되지 않는 특수문자 → null", () => {
    assert.equal(normalizeClient("has space"), null);
    assert.equal(normalizeClient("has!bang"), null);
    assert.equal(normalizeClient("has.dot"), null);
    assert.equal(normalizeClient("has@at"), null);
  });

  test("길이 1..64 만 허용", () => {
    assert.equal(normalizeClient("a"), "a");
    assert.equal(normalizeClient("a".repeat(64)), "a".repeat(64));
    assert.equal(normalizeClient("a".repeat(65)), null);
  });
});
