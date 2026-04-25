"use strict";
/**
 * docs/함수도서관 §1.7 (FE-G3) — admin 라벨/배지 상수 검증.
 *
 * 검증 항목:
 *   - 5 도메인 모두 라벨이 비공백 문자열.
 *   - 배지 className 이 Tailwind bg/text 토큰을 포함.
 *   - 도메인 enum 의 모든 키를 커버 (라벨/배지 객체 키 일치).
 *   - 기존 thin re-export 가 신규 위치를 가리킴.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
process.env.TZ = "UTC";
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
// 신규 위치 (lib/constants)
const labels_1 = require("../src/lib/constants/labels");
const badges_1 = require("../src/lib/constants/badges");
// 기존 위치 (thin re-export)
const constants_1 = require("../src/features/admin/extraction-queue/constants");
const helpers_1 = require("../src/features/admin/evaluations/helpers");
// ---------------------------------------------------------------------------
// 라벨 — 모두 비공백
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("labels — 비공백 문자열", () => {
    const allLabelMaps = {
        EXTRACTION_STATUS_LABELS: labels_1.EXTRACTION_STATUS_LABELS,
        GOLDEN_SET_STATUS_LABELS: labels_1.GOLDEN_SET_STATUS_LABELS,
        GOLDEN_SET_DOMAIN_LABELS: labels_1.GOLDEN_SET_DOMAIN_LABELS,
        EVALUATION_RUN_STATUS_LABELS: labels_1.EVALUATION_RUN_STATUS_LABELS,
        EVALUATION_METRIC_LABELS: labels_1.EVALUATION_METRIC_LABELS,
    };
    for (const [name, m] of Object.entries(allLabelMaps)) {
        (0, node_test_1.test)(`${name}: 키 ≥1 + 모든 값이 비공백`, () => {
            const keys = Object.keys(m);
            strict_1.default.ok(keys.length >= 1, `${name} 비어있음`);
            for (const k of keys) {
                const v = m[k];
                strict_1.default.equal(typeof v, "string");
                strict_1.default.ok(v.trim().length > 0, `${name}[${k}] 빈 문자열`);
            }
        });
    }
});
// ---------------------------------------------------------------------------
// 배지 — Tailwind bg/text 포함
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("badge classNames — Tailwind 토큰 포함", () => {
    const allBadgeMaps = {
        EXTRACTION_STATUS_BADGE_CLASSES: badges_1.EXTRACTION_STATUS_BADGE_CLASSES,
        GOLDEN_SET_STATUS_BADGE_CLASSES: badges_1.GOLDEN_SET_STATUS_BADGE_CLASSES,
        EVALUATION_RUN_STATUS_BADGE_CLASSES: badges_1.EVALUATION_RUN_STATUS_BADGE_CLASSES,
    };
    for (const [name, m] of Object.entries(allBadgeMaps)) {
        (0, node_test_1.test)(`${name}: 모든 값이 bg- + text- 토큰 포함`, () => {
            for (const v of Object.values(m)) {
                strict_1.default.match(v, /\bbg-/);
                strict_1.default.match(v, /\btext-/);
            }
        });
    }
});
// ---------------------------------------------------------------------------
// 도메인 enum 키 일치 (라벨 키 == 배지 키)
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("키 일치 (라벨 ↔ 배지)", () => {
    (0, node_test_1.test)("EXTRACTION: labels keys === badges keys", () => {
        strict_1.default.deepEqual(Object.keys(labels_1.EXTRACTION_STATUS_LABELS).sort(), Object.keys(badges_1.EXTRACTION_STATUS_BADGE_CLASSES).sort());
    });
    (0, node_test_1.test)("GOLDEN_SET STATUS: labels keys === badges keys", () => {
        strict_1.default.deepEqual(Object.keys(labels_1.GOLDEN_SET_STATUS_LABELS).sort(), Object.keys(badges_1.GOLDEN_SET_STATUS_BADGE_CLASSES).sort());
    });
    (0, node_test_1.test)("EVALUATION RUN STATUS: labels keys === badges keys", () => {
        strict_1.default.deepEqual(Object.keys(labels_1.EVALUATION_RUN_STATUS_LABELS).sort(), Object.keys(badges_1.EVALUATION_RUN_STATUS_BADGE_CLASSES).sort());
    });
});
// ---------------------------------------------------------------------------
// 색상 정책 회귀 — 핵심 상태가 의도한 색상 계열인가
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("색상 정책 회귀", () => {
    (0, node_test_1.test)("EXTRACTION pending_review = amber", () => {
        strict_1.default.match(badges_1.EXTRACTION_STATUS_BADGE_CLASSES.pending_review, /amber/);
    });
    (0, node_test_1.test)("EXTRACTION approved = green", () => {
        strict_1.default.match(badges_1.EXTRACTION_STATUS_BADGE_CLASSES.approved, /green/);
    });
    (0, node_test_1.test)("EXTRACTION rejected = red", () => {
        strict_1.default.match(badges_1.EXTRACTION_STATUS_BADGE_CLASSES.rejected, /red/);
    });
    (0, node_test_1.test)("EVALUATION completed = green", () => {
        strict_1.default.match(badges_1.EVALUATION_RUN_STATUS_BADGE_CLASSES.completed, /green/);
    });
    (0, node_test_1.test)("EVALUATION failed = red", () => {
        strict_1.default.match(badges_1.EVALUATION_RUN_STATUS_BADGE_CLASSES.failed, /red/);
    });
});
// ---------------------------------------------------------------------------
// thin re-export 일관성 — legacy import 가 신규 객체와 동일 (참조 일치)
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("thin re-export 일관성", () => {
    (0, node_test_1.test)("extraction-queue/constants.EXTRACTION_STATUS_LABELS === lib/constants/labels", () => {
        strict_1.default.equal(constants_1.EXTRACTION_STATUS_LABELS, labels_1.EXTRACTION_STATUS_LABELS);
    });
    (0, node_test_1.test)("extraction-queue/constants.EXTRACTION_STATUS_BADGE_CLASSES === lib/constants/badges", () => {
        strict_1.default.equal(constants_1.EXTRACTION_STATUS_BADGE_CLASSES, badges_1.EXTRACTION_STATUS_BADGE_CLASSES);
    });
    (0, node_test_1.test)("evaluations/helpers.STATUS_LABEL === lib/constants/labels.EVALUATION_RUN_STATUS_LABELS", () => {
        strict_1.default.equal(helpers_1.STATUS_LABEL, labels_1.EVALUATION_RUN_STATUS_LABELS);
    });
    (0, node_test_1.test)("evaluations/helpers.STATUS_BADGE_STYLE === lib/constants/badges.EVALUATION_RUN_STATUS_BADGE_CLASSES", () => {
        strict_1.default.equal(helpers_1.STATUS_BADGE_STYLE, badges_1.EVALUATION_RUN_STATUS_BADGE_CLASSES);
    });
    (0, node_test_1.test)("evaluations/helpers.METRIC_LABELS === lib/constants/labels.EVALUATION_METRIC_LABELS", () => {
        strict_1.default.equal(helpers_1.METRIC_LABELS, labels_1.EVALUATION_METRIC_LABELS);
    });
});
