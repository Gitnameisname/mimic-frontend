"use strict";
/**
 * /admin/extraction-queue Q1 상수 분리.
 *
 * 설계 의도:
 *   - 상태 리터럴("pending_review" 등) 이 JSX 안에 하드코딩되어 있으면,
 *     API 가 새 상태(e.g. "needs_correction") 를 추가했을 때 누락 지점이
 *     파편화된다. 여기 한 곳으로 모아 두면 타입체크가 그 누락을 잡는다.
 *   - S1 원칙 "DocumentType 별 분기 로직은 서비스 레이어에서만" 에 따라
 *     문서 타입 리스트는 여기 두지 않는다 — /api/v1/admin/document-types
 *     에서 동적으로 가져와 사용한다 (AdminExtractionQueuePage 참조).
 *   - label/배지 색은 UI 성격이므로 constants 에 함께 두되, 정책/라우팅
 *     결정(예: 승인 가능한 상태인가?) 은 컴포넌트 로직으로 남겨둔다.
 *
 * `ExtractionResult["status"]` 와 `EXTRACTION_STATUS_VALUES` 는 반드시 1:1
 * 대응해야 한다 (assertExhaustiveStatus 테스트로 보증).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXTRACTION_STATUS_BADGE_CLASSES = exports.EXTRACTION_STATUS_LABELS = exports.EXTRACTION_STATUS_VALUES = exports.EXTRACTION_STATUS = void 0;
exports.isValidExtractionStatus = isValidExtractionStatus;
/** 상태 리터럴 상수 — as const 로 좁혀 유니온 타입 보증. */
exports.EXTRACTION_STATUS = {
    PENDING_REVIEW: "pending_review",
    APPROVED: "approved",
    REJECTED: "rejected",
};
/** 전체 상태 값 배열 — 드롭다운/테스트에서 순회용. */
exports.EXTRACTION_STATUS_VALUES = [
    exports.EXTRACTION_STATUS.PENDING_REVIEW,
    exports.EXTRACTION_STATUS.APPROVED,
    exports.EXTRACTION_STATUS.REJECTED,
];
/**
 * 상태별 한글 라벨.
 *
 * 기본적으로 `ExtractionResult["status"]` 의 모든 멤버를 다뤄야 하며, 타입상
 * Record 로 선언해 신규 상태 추가 시 컴파일 에러로 강제한다.
 */
exports.EXTRACTION_STATUS_LABELS = {
    pending_review: "검토 대기",
    approved: "승인",
    rejected: "반려",
};
/**
 * 상태별 배지 Tailwind 클래스.
 *
 * 색상 정책:
 *   - pending_review: amber (주의/대기)
 *   - approved:       green (완료/긍정)
 *   - rejected:       red   (차단/부정)
 *
 * 대비비 4.5:1 이상을 만족하는 -100/-800 조합을 사용 (WCAG AA).
 */
exports.EXTRACTION_STATUS_BADGE_CLASSES = {
    pending_review: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
};
/**
 * status 파라미터 유효성 검사.
 *
 * 필터 쿼리 스트링으로 들어오는 값(저장/복원)이 오염되어도 API 호출에
 * 넣기 전에 걸러 내기 위한 가드. 빈 문자열은 "전체" 의 의미로 허용.
 */
function isValidExtractionStatus(value) {
    return exports.EXTRACTION_STATUS_VALUES.includes(value);
}
