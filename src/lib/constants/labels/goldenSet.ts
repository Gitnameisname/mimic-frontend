/**
 * GoldenSet 상태 + 도메인 라벨 — `docs/함수도서관/frontend.md` §1.7 FE-G3 등록.
 */

import type { GoldenSetDomain, GoldenSetStatus } from "@/types/s2admin";

export const GOLDEN_SET_STATUS_LABELS: Record<GoldenSetStatus, string> = {
  draft: "초안",
  published: "게시됨",
  archived: "보관됨",
};

export const GOLDEN_SET_DOMAIN_LABELS: Record<GoldenSetDomain, string> = {
  policy: "정책",
  regulation: "규정",
  technical_guide: "기술 가이드",
  manual: "매뉴얼",
  faq: "FAQ",
  custom: "사용자 정의",
};
