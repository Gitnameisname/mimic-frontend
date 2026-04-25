"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
(0, node_test_1.describe)("TagChipsEditor.normalizeClient — 서버 normalize_tag 동등성", async () => {
    const { __test__ } = await Promise.resolve().then(() => __importStar(require("../src/features/tags/TagChipsEditor")));
    const { normalizeClient } = __test__;
    (0, node_test_1.test)("공백 / 빈 문자열 → null", () => {
        strict_1.default.equal(normalizeClient(""), null);
        strict_1.default.equal(normalizeClient("   "), null);
    });
    (0, node_test_1.test)("선행 # 1개 제거 후 유효 문자열 → 소문자 이름", () => {
        strict_1.default.equal(normalizeClient("#AI"), "ai");
        strict_1.default.equal(normalizeClient("ai"), "ai");
    });
    (0, node_test_1.test)("## 는 reject (# 만 남기 때문에 slice 후 또 #로 시작)", () => {
        strict_1.default.equal(normalizeClient("##ai"), null);
    });
    (0, node_test_1.test)("NFKC 정규화 후 소문자 — 전각 숫자·한글 호환", () => {
        // 전각 숫자 1 (U+FF11) → NFKC 로 "1"
        strict_1.default.equal(normalizeClient("tag１"), "tag1");
        // 한글은 그대로 보존
        strict_1.default.equal(normalizeClient("문서"), "문서");
    });
    (0, node_test_1.test)("허용 문자 집합: 유니코드 letter/digit + _ / -", () => {
        strict_1.default.equal(normalizeClient("ml/nlp"), "ml/nlp");
        strict_1.default.equal(normalizeClient("prod-2026"), "prod-2026");
        strict_1.default.equal(normalizeClient("snake_case"), "snake_case");
    });
    (0, node_test_1.test)("허용되지 않는 특수문자 → null", () => {
        strict_1.default.equal(normalizeClient("has space"), null);
        strict_1.default.equal(normalizeClient("has!bang"), null);
        strict_1.default.equal(normalizeClient("has.dot"), null);
        strict_1.default.equal(normalizeClient("has@at"), null);
    });
    (0, node_test_1.test)("길이 1..64 만 허용", () => {
        strict_1.default.equal(normalizeClient("a"), "a");
        strict_1.default.equal(normalizeClient("a".repeat(64)), "a".repeat(64));
        strict_1.default.equal(normalizeClient("a".repeat(65)), null);
    });
});
