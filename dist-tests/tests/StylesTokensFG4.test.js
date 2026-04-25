"use strict";
/**
 * docs/함수도서관 §1.8 (FE-G4) — alert/badge className 토큰 검증.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env.TZ = "UTC";
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const tokens_1 = require("../src/lib/styles/tokens");
const utils_1 = require("../src/lib/utils");
// ---------------------------------------------------------------------------
// BADGE_BASE
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("BADGE_BASE", () => {
    (0, node_test_1.test)("핵심 토큰 포함 (inline-flex / items-center / px-2 / py-0.5 / rounded / text-xs / font-semibold)", () => {
        for (const tok of [
            "inline-flex",
            "items-center",
            "px-2",
            "py-0.5",
            "rounded",
            "text-xs",
            "font-semibold",
        ]) {
            strict_1.default.match(tokens_1.BADGE_BASE, new RegExp(`\\b${tok}\\b`), `${tok} 누락`);
        }
    });
    (0, node_test_1.test)("색상 토큰 미포함 (호출자 책임)", () => {
        // bg-/text- 색상 토큰이 base 에 들어있으면 안 됨
        strict_1.default.doesNotMatch(tokens_1.BADGE_BASE, /\bbg-[a-z]+-/);
        strict_1.default.doesNotMatch(tokens_1.BADGE_BASE, /\btext-(red|green|blue|amber|gray|yellow|orange)-/);
    });
    (0, node_test_1.test)("cn 합성으로 색상 토큰 추가 가능", () => {
        const merged = (0, utils_1.cn)(tokens_1.BADGE_BASE, "bg-amber-100 text-amber-800");
        strict_1.default.match(merged, /inline-flex/);
        strict_1.default.match(merged, /bg-amber-100/);
        strict_1.default.match(merged, /text-amber-800/);
    });
});
// ---------------------------------------------------------------------------
// ALERT_*
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("ALERT 토큰", () => {
    const allAlerts = {
        ALERT_ERROR: tokens_1.ALERT_ERROR,
        ALERT_WARNING: tokens_1.ALERT_WARNING,
        ALERT_INFO: tokens_1.ALERT_INFO,
        ALERT_SUCCESS: tokens_1.ALERT_SUCCESS,
    };
    for (const [name, v] of Object.entries(allAlerts)) {
        (0, node_test_1.test)(`${name}: 핵심 토큰 (rounded-lg / border / bg-*-50 / text-*-700|800 / font-medium)`, () => {
            strict_1.default.match(v, /\brounded-lg\b/);
            strict_1.default.match(v, /\bborder\b/);
            strict_1.default.match(v, /\bbg-[a-z]+-50\b/);
            strict_1.default.match(v, /\btext-[a-z]+-(700|800)\b/);
            strict_1.default.match(v, /\bfont-medium\b/);
        });
    }
    (0, node_test_1.test)("ALERT_ERROR = red 계열", () => {
        strict_1.default.match(tokens_1.ALERT_ERROR, /bg-red-50/);
        strict_1.default.match(tokens_1.ALERT_ERROR, /border-red-200/);
        strict_1.default.match(tokens_1.ALERT_ERROR, /text-red-700/);
    });
    (0, node_test_1.test)("ALERT_WARNING = amber 계열", () => {
        strict_1.default.match(tokens_1.ALERT_WARNING, /amber/);
    });
    (0, node_test_1.test)("ALERT_INFO = blue 계열", () => {
        strict_1.default.match(tokens_1.ALERT_INFO, /blue/);
    });
    (0, node_test_1.test)("ALERT_SUCCESS = green 계열", () => {
        strict_1.default.match(tokens_1.ALERT_SUCCESS, /green/);
    });
    (0, node_test_1.test)("4 토큰이 서로 다른 색상 (유니크)", () => {
        const colors = [tokens_1.ALERT_ERROR, tokens_1.ALERT_WARNING, tokens_1.ALERT_INFO, tokens_1.ALERT_SUCCESS];
        const set = new Set(colors);
        strict_1.default.equal(set.size, 4, "ALERT_* 토큰 4개가 모두 달라야 한다");
    });
    (0, node_test_1.test)("cn 합성으로 padding 또는 margin 추가 가능", () => {
        const merged = (0, utils_1.cn)(tokens_1.ALERT_ERROR, "mb-4");
        strict_1.default.match(merged, /\bmb-4\b/);
        strict_1.default.match(merged, /\brounded-lg\b/);
    });
});
// ---------------------------------------------------------------------------
// 토큰 일관성 — 다 비어있지 않고 string
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("토큰 일관성", () => {
    (0, node_test_1.test)("모든 토큰이 비공백 문자열", () => {
        for (const v of [tokens_1.BADGE_BASE, tokens_1.ALERT_ERROR, tokens_1.ALERT_WARNING, tokens_1.ALERT_INFO, tokens_1.ALERT_SUCCESS]) {
            strict_1.default.equal(typeof v, "string");
            strict_1.default.ok(v.trim().length > 0);
        }
    });
});
// ===========================================================================
// R3 변형 토큰 (2026-04-25)
// ===========================================================================
(0, node_test_1.describe)("BADGE_BASE_PILL", () => {
    (0, node_test_1.test)("rounded-full 포함", () => {
        strict_1.default.match(tokens_1.BADGE_BASE_PILL, /\brounded-full\b/);
    });
    (0, node_test_1.test)("색상 미포함", () => {
        strict_1.default.doesNotMatch(tokens_1.BADGE_BASE_PILL, /\bbg-[a-z]+-/);
    });
});
(0, node_test_1.describe)("ALERT_ERROR_COMPACT", () => {
    (0, node_test_1.test)("text-red-600 변형 (강도 600)", () => {
        strict_1.default.match(tokens_1.ALERT_ERROR_COMPACT, /\btext-red-600\b/);
    });
    (0, node_test_1.test)("responsive padding", () => {
        strict_1.default.match(tokens_1.ALERT_ERROR_COMPACT, /\bpx-3\b/);
        strict_1.default.match(tokens_1.ALERT_ERROR_COMPACT, /\bsm:px-4\b/);
    });
    (0, node_test_1.test)("animate-in 애니메이션 토큰 포함", () => {
        strict_1.default.match(tokens_1.ALERT_ERROR_COMPACT, /\banimate-in\b/);
    });
});
// ===========================================================================
// R3 다크모드 토큰
// ===========================================================================
(0, node_test_1.describe)("다크모드 토큰", () => {
    const darkTokens = {
        BADGE_BASE_DARK: tokens_1.BADGE_BASE_DARK,
        ALERT_ERROR_DARK: tokens_1.ALERT_ERROR_DARK,
        ALERT_WARNING_DARK: tokens_1.ALERT_WARNING_DARK,
        ALERT_INFO_DARK: tokens_1.ALERT_INFO_DARK,
        ALERT_SUCCESS_DARK: tokens_1.ALERT_SUCCESS_DARK,
    };
    for (const [name, v] of Object.entries(darkTokens)) {
        (0, node_test_1.test)(`${name}: dark: 접두사 포함`, () => {
            strict_1.default.match(v, /\bdark:/);
        });
    }
    (0, node_test_1.test)("ALERT_*_DARK 4종이 서로 다른 색상", () => {
        const set = new Set([tokens_1.ALERT_ERROR_DARK, tokens_1.ALERT_WARNING_DARK, tokens_1.ALERT_INFO_DARK, tokens_1.ALERT_SUCCESS_DARK]);
        strict_1.default.equal(set.size, 4);
    });
    (0, node_test_1.test)("ALERT_ERROR_DARK = red 계열", () => {
        strict_1.default.match(tokens_1.ALERT_ERROR_DARK, /red/);
    });
});
