/**
 * docs/함수도서관 §1.8 (FE-G4) — alert/badge className 토큰 검증.
 */

process.env.TZ = "UTC";

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  BADGE_BASE,
  BADGE_BASE_PILL,
  ALERT_ERROR,
  ALERT_ERROR_COMPACT,
  ALERT_WARNING,
  ALERT_INFO,
  ALERT_SUCCESS,
  BADGE_BASE_DARK,
  ALERT_ERROR_DARK,
  ALERT_WARNING_DARK,
  ALERT_INFO_DARK,
  ALERT_SUCCESS_DARK,
} from "../src/lib/styles/tokens";
import { cn } from "../src/lib/utils";

// ---------------------------------------------------------------------------
// BADGE_BASE
// ---------------------------------------------------------------------------

describe("BADGE_BASE", () => {
  test("핵심 토큰 포함 (inline-flex / items-center / px-2 / py-0.5 / rounded / text-xs / font-semibold)", () => {
    for (const tok of [
      "inline-flex",
      "items-center",
      "px-2",
      "py-0.5",
      "rounded",
      "text-xs",
      "font-semibold",
    ]) {
      assert.match(BADGE_BASE, new RegExp(`\\b${tok}\\b`), `${tok} 누락`);
    }
  });

  test("색상 토큰 미포함 (호출자 책임)", () => {
    // bg-/text- 색상 토큰이 base 에 들어있으면 안 됨
    assert.doesNotMatch(BADGE_BASE, /\bbg-[a-z]+-/);
    assert.doesNotMatch(BADGE_BASE, /\btext-(red|green|blue|amber|gray|yellow|orange)-/);
  });

  test("cn 합성으로 색상 토큰 추가 가능", () => {
    const merged = cn(BADGE_BASE, "bg-amber-100 text-amber-800");
    assert.match(merged, /inline-flex/);
    assert.match(merged, /bg-amber-100/);
    assert.match(merged, /text-amber-800/);
  });
});

// ---------------------------------------------------------------------------
// ALERT_*
// ---------------------------------------------------------------------------

describe("ALERT 토큰", () => {
  const allAlerts = {
    ALERT_ERROR,
    ALERT_WARNING,
    ALERT_INFO,
    ALERT_SUCCESS,
  };

  for (const [name, v] of Object.entries(allAlerts)) {
    test(`${name}: 핵심 토큰 (rounded-lg / border / bg-*-50 / text-*-700|800 / font-medium)`, () => {
      assert.match(v, /\brounded-lg\b/);
      assert.match(v, /\bborder\b/);
      assert.match(v, /\bbg-[a-z]+-50\b/);
      assert.match(v, /\btext-[a-z]+-(700|800)\b/);
      assert.match(v, /\bfont-medium\b/);
    });
  }

  test("ALERT_ERROR = red 계열", () => {
    assert.match(ALERT_ERROR, /bg-red-50/);
    assert.match(ALERT_ERROR, /border-red-200/);
    assert.match(ALERT_ERROR, /text-red-700/);
  });

  test("ALERT_WARNING = amber 계열", () => {
    assert.match(ALERT_WARNING, /amber/);
  });

  test("ALERT_INFO = blue 계열", () => {
    assert.match(ALERT_INFO, /blue/);
  });

  test("ALERT_SUCCESS = green 계열", () => {
    assert.match(ALERT_SUCCESS, /green/);
  });

  test("4 토큰이 서로 다른 색상 (유니크)", () => {
    const colors = [ALERT_ERROR, ALERT_WARNING, ALERT_INFO, ALERT_SUCCESS];
    const set = new Set(colors);
    assert.equal(set.size, 4, "ALERT_* 토큰 4개가 모두 달라야 한다");
  });

  test("cn 합성으로 padding 또는 margin 추가 가능", () => {
    const merged = cn(ALERT_ERROR, "mb-4");
    assert.match(merged, /\bmb-4\b/);
    assert.match(merged, /\brounded-lg\b/);
  });
});

// ---------------------------------------------------------------------------
// 토큰 일관성 — 다 비어있지 않고 string
// ---------------------------------------------------------------------------

describe("토큰 일관성", () => {
  test("모든 토큰이 비공백 문자열", () => {
    for (const v of [BADGE_BASE, ALERT_ERROR, ALERT_WARNING, ALERT_INFO, ALERT_SUCCESS]) {
      assert.equal(typeof v, "string");
      assert.ok(v.trim().length > 0);
    }
  });
});

// ===========================================================================
// R3 변형 토큰 (2026-04-25)
// ===========================================================================

describe("BADGE_BASE_PILL", () => {
  test("rounded-full 포함", () => {
    assert.match(BADGE_BASE_PILL, /\brounded-full\b/);
  });
  test("색상 미포함", () => {
    assert.doesNotMatch(BADGE_BASE_PILL, /\bbg-[a-z]+-/);
  });
});

describe("ALERT_ERROR_COMPACT", () => {
  test("text-red-600 변형 (강도 600)", () => {
    assert.match(ALERT_ERROR_COMPACT, /\btext-red-600\b/);
  });
  test("responsive padding", () => {
    assert.match(ALERT_ERROR_COMPACT, /\bpx-3\b/);
    assert.match(ALERT_ERROR_COMPACT, /\bsm:px-4\b/);
  });
  test("animate-in 애니메이션 토큰 포함", () => {
    assert.match(ALERT_ERROR_COMPACT, /\banimate-in\b/);
  });
});

// ===========================================================================
// R3 다크모드 토큰
// ===========================================================================

describe("다크모드 토큰", () => {
  const darkTokens = {
    BADGE_BASE_DARK,
    ALERT_ERROR_DARK,
    ALERT_WARNING_DARK,
    ALERT_INFO_DARK,
    ALERT_SUCCESS_DARK,
  };
  for (const [name, v] of Object.entries(darkTokens)) {
    test(`${name}: dark: 접두사 포함`, () => {
      assert.match(v, /\bdark:/);
    });
  }
  test("ALERT_*_DARK 4종이 서로 다른 색상", () => {
    const set = new Set([ALERT_ERROR_DARK, ALERT_WARNING_DARK, ALERT_INFO_DARK, ALERT_SUCCESS_DARK]);
    assert.equal(set.size, 4);
  });
  test("ALERT_ERROR_DARK = red 계열", () => {
    assert.match(ALERT_ERROR_DARK, /red/);
  });
});

// ===========================================================================
// F-N1 (2026-04-25) — 폼 인라인 에러 토큰 (FORM_ERROR_*)
// ===========================================================================

import {
  FORM_ERROR_INLINE,
  FORM_ERROR_INLINE_STRONG,
  FORM_ERROR_BANNER,
  FORM_ERROR_BOX,
  FORM_ERROR_INLINE_DARK,
  FORM_ERROR_INLINE_STRONG_DARK,
  FORM_ERROR_BANNER_DARK,
  FORM_ERROR_BOX_DARK,
} from "../src/lib/styles/tokens";

describe("FORM_ERROR_INLINE (가장 흔한 react-hook-form 패턴)", () => {
  test("핵심 토큰 mt-1 / text-xs / text-red-600", () => {
    assert.match(FORM_ERROR_INLINE, /\bmt-1\b/);
    assert.match(FORM_ERROR_INLINE, /\btext-xs\b/);
    assert.match(FORM_ERROR_INLINE, /\btext-red-600\b/);
  });

  test("background / border 미포함 (인라인이므로 박스 아님)", () => {
    assert.doesNotMatch(FORM_ERROR_INLINE, /\bbg-/);
    assert.doesNotMatch(FORM_ERROR_INLINE, /\bborder\b/);
  });

  test("font-medium 미포함 (STRONG 변형과 구분)", () => {
    assert.doesNotMatch(FORM_ERROR_INLINE, /\bfont-medium\b/);
  });
});

describe("FORM_ERROR_INLINE_STRONG (auth 컴포넌트 변형)", () => {
  test("mt-1.5 + font-medium 포함 (강조 변형)", () => {
    assert.match(FORM_ERROR_INLINE_STRONG, /\bmt-1\.5\b/);
    assert.match(FORM_ERROR_INLINE_STRONG, /\bfont-medium\b/);
    assert.match(FORM_ERROR_INLINE_STRONG, /\btext-red-600\b/);
  });

  test("INLINE 과 다름 (font-medium 차이)", () => {
    assert.notEqual(FORM_ERROR_INLINE, FORM_ERROR_INLINE_STRONG);
  });
});

describe("FORM_ERROR_BANNER (mutation isError 배너)", () => {
  test("mb-3 + text-xs + text-red-600", () => {
    assert.match(FORM_ERROR_BANNER, /\bmb-3\b/);
    assert.match(FORM_ERROR_BANNER, /\btext-xs\b/);
    assert.match(FORM_ERROR_BANNER, /\btext-red-600\b/);
  });

  test("INLINE 과 다른 마진 (mt vs mb)", () => {
    assert.doesNotMatch(FORM_ERROR_BANNER, /\bmt-/);
  });
});

describe("FORM_ERROR_BOX (admin 컴팩트 박스)", () => {
  test("핵심 토큰 text-sm / text-red-600 / bg-red-50 / px-3 / py-2 / rounded-lg", () => {
    for (const tok of ["text-sm", "text-red-600", "bg-red-50", "px-3", "py-2", "rounded-lg"]) {
      assert.match(FORM_ERROR_BOX, new RegExp(`\\b${tok.replace(/-/g, "\\-")}\\b`), `${tok} 누락`);
    }
  });

  test("border / animate 없음 (ALERT_ERROR_COMPACT 와 구분)", () => {
    assert.doesNotMatch(FORM_ERROR_BOX, /\bborder\b/);
    assert.doesNotMatch(FORM_ERROR_BOX, /\banimate-in\b/);
  });
});

describe("FORM_ERROR_* 다크 토큰", () => {
  const darkTokens = {
    FORM_ERROR_INLINE_DARK,
    FORM_ERROR_INLINE_STRONG_DARK,
    FORM_ERROR_BANNER_DARK,
    FORM_ERROR_BOX_DARK,
  };
  for (const [name, v] of Object.entries(darkTokens)) {
    test(`${name}: dark: 접두 포함`, () => {
      assert.match(v, /\bdark:/);
    });
    test(`${name}: red 계열`, () => {
      assert.match(v, /red/);
    });
  }

  test("INLINE/STRONG/BANNER 다크는 단순 색상만 (background 없음)", () => {
    for (const v of [FORM_ERROR_INLINE_DARK, FORM_ERROR_INLINE_STRONG_DARK, FORM_ERROR_BANNER_DARK]) {
      assert.doesNotMatch(v, /\bdark:bg-/);
    }
  });

  test("BOX 다크는 background 포함", () => {
    assert.match(FORM_ERROR_BOX_DARK, /\bdark:bg-/);
  });
});

describe("FORM_ERROR_* + cn 합성", () => {
  test("INLINE + role attribute 호환 (className 만 합성)", () => {
    const merged = cn(FORM_ERROR_INLINE, FORM_ERROR_INLINE_DARK);
    assert.match(merged, /mt-1/);
    assert.match(merged, /dark:text-red-300/);
  });

  test("BOX + 추가 padding 변형 가능", () => {
    const merged = cn(FORM_ERROR_BOX, "py-3");
    // tailwind-merge 가 py-2 → py-3 로 덮어씌움
    assert.match(merged, /py-3/);
  });
});

describe("FORM_ERROR_* 토큰 일관성", () => {
  test("4 라이트 토큰 모두 비공백 string", () => {
    for (const v of [FORM_ERROR_INLINE, FORM_ERROR_INLINE_STRONG, FORM_ERROR_BANNER, FORM_ERROR_BOX]) {
      assert.equal(typeof v, "string");
      assert.ok(v.trim().length > 0);
    }
  });

  test("4 라이트 토큰 모두 text-red-600 공유", () => {
    for (const v of [FORM_ERROR_INLINE, FORM_ERROR_INLINE_STRONG, FORM_ERROR_BANNER, FORM_ERROR_BOX]) {
      assert.match(v, /\btext-red-600\b/);
    }
  });
});
