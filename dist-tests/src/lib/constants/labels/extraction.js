"use strict";
/**
 * 추출 결과 상태 라벨 — `docs/함수도서관/frontend.md` §1.7 FE-G3 등록.
 *
 * 도입 배경:
 *   - `features/admin/extraction-queue/constants.ts` 의 `EXTRACTION_STATUS_LABELS`
 *     를 `lib/constants` 로 이전. 기존 위치는 thin re-export 로 호환 유지.
 *   - 5 도메인 라벨/배지 객체를 한 디렉토리에 모아 i18n 도입 시 한 번에 이관 가능.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXTRACTION_STATUS_LABELS = void 0;
/** 추출 결과 상태별 한글 라벨. */
exports.EXTRACTION_STATUS_LABELS = {
    pending_review: "검토 대기",
    approved: "승인",
    rejected: "반려",
};
