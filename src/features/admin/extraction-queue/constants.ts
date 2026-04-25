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

import type { ExtractionResult } from "@/types/s2admin";

/** 상태 리터럴 상수 — as const 로 좁혀 유니온 타입 보증. */
export const EXTRACTION_STATUS = {
  PENDING_REVIEW: "pending_review",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

/** 전체 상태 값 배열 — 드롭다운/테스트에서 순회용. */
export const EXTRACTION_STATUS_VALUES = [
  EXTRACTION_STATUS.PENDING_REVIEW,
  EXTRACTION_STATUS.APPROVED,
  EXTRACTION_STATUS.REJECTED,
] as const;

/**
 * 상태별 한글 라벨 / 배지 className.
 *
 * 도서관 §1.7 FE-G3 (2026-04-25): 정의 위치를 `@/lib/constants/labels/extraction.ts`
 * 와 `@/lib/constants/badges/extraction.ts` 로 이전. 본 모듈은 thin re-export 로
 * 외부 import 호환을 보존한다 (기존 import path 그대로 유효).
 */
export { EXTRACTION_STATUS_LABELS } from "@/lib/constants/labels/extraction";
export { EXTRACTION_STATUS_BADGE_CLASSES } from "@/lib/constants/badges/extraction";

/**
 * status 파라미터 유효성 검사.
 *
 * 필터 쿼리 스트링으로 들어오는 값(저장/복원)이 오염되어도 API 호출에
 * 넣기 전에 걸러 내기 위한 가드. 빈 문자열은 "전체" 의 의미로 허용.
 */
export function isValidExtractionStatus(
  value: string
): value is ExtractionResult["status"] {
  return (EXTRACTION_STATUS_VALUES as readonly string[]).includes(value);
}
