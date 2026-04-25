"use strict";
/**
 * Evaluation 실행 상태 + 지표 라벨 — `docs/함수도서관/frontend.md` §1.7 FE-G3 등록.
 *
 * 정책 상수 (METRIC_THRESHOLDS, METRIC_LOWER_IS_BETTER, scorePasses) 는 도메인 정책
 * 이라 `features/admin/evaluations/helpers.ts` 에 그대로 둔다 — 본 모듈은 표시
 * 메타데이터(라벨)만 담당.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVALUATION_METRIC_LABELS = exports.EVALUATION_RUN_STATUS_LABELS = void 0;
exports.EVALUATION_RUN_STATUS_LABELS = {
    queued: "대기 중",
    running: "실행 중",
    completed: "완료",
    failed: "실패",
};
exports.EVALUATION_METRIC_LABELS = {
    faithfulness: "Faithfulness",
    answer_relevance: "Answer Relevance",
    context_precision: "Context Precision",
    context_recall: "Context Recall",
    citation_present_rate: "Citation-present",
    hallucination_rate: "Hallucination",
};
