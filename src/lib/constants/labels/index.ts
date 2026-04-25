/**
 * `@/lib/constants/labels` — 도메인별 표시 라벨 재노출.
 *
 * 사용 예:
 *   import { EXTRACTION_STATUS_LABELS, GOLDEN_SET_STATUS_LABELS } from "@/lib/constants/labels";
 *
 * i18n 도입 시 본 디렉토리만 i18n 파일로 교체 (badge className 과 분리).
 */

export { EXTRACTION_STATUS_LABELS } from "./extraction";
export {
  GOLDEN_SET_STATUS_LABELS,
  GOLDEN_SET_DOMAIN_LABELS,
} from "./goldenSet";
export {
  EVALUATION_RUN_STATUS_LABELS,
  EVALUATION_METRIC_LABELS,
} from "./evaluation";
