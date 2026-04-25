"use strict";
/**
 * 추출 결과 상태 배지 className — `docs/함수도서관/frontend.md` §1.7 FE-G3 등록.
 *
 * Tailwind 클래스 조합 문자열. 색상 정책:
 *   - pending_review: amber (주의/대기)
 *   - approved:       green (완료/긍정)
 *   - rejected:       red   (차단/부정)
 *
 * 대비비 4.5:1 이상을 만족하는 -100/-800 조합 (WCAG AA).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXTRACTION_STATUS_BADGE_CLASSES = void 0;
exports.EXTRACTION_STATUS_BADGE_CLASSES = {
    pending_review: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
};
