"use strict";
/**
 * Evaluation 실행 상태 배지 className — `docs/함수도서관/frontend.md` §1.7 FE-G3 등록.
 *
 * 색상 정책:
 *   - queued:    gray (대기)
 *   - running:   blue (진행 중)
 *   - completed: green (성공 종결)
 *   - failed:    red (실패 종결)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVALUATION_RUN_STATUS_BADGE_CLASSES = void 0;
exports.EVALUATION_RUN_STATUS_BADGE_CLASSES = {
    queued: "bg-gray-100 text-gray-700 border border-gray-200",
    running: "bg-blue-50 text-blue-700 border border-blue-200",
    completed: "bg-green-50 text-green-700 border border-green-200",
    failed: "bg-red-50 text-red-700 border border-red-200",
};
