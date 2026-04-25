"use strict";
/**
 * GoldenSet 상태 배지 className — `docs/함수도서관/frontend.md` §1.7 FE-G3 등록.
 *
 * 색상 정책:
 *   - draft:     gray (작성 중/임시)
 *   - published: blue (운용 중)
 *   - archived:  gray dark (보관)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GOLDEN_SET_STATUS_BADGE_CLASSES = void 0;
exports.GOLDEN_SET_STATUS_BADGE_CLASSES = {
    draft: "bg-gray-100 text-gray-700",
    published: "bg-blue-50 text-blue-700 border border-blue-200",
    archived: "bg-gray-200 text-gray-600",
};
