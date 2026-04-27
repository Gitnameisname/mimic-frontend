/**
 * useContributors — S3 Phase 3 FG 3-1.
 *
 * React Query 훅:
 *   - 문서 contributors 4 카테고리 묶음 조회 (`GET /api/v1/documents/{id}/contributors`)
 *   - viewer 가 문서를 못 보면 404 → React Query error
 *
 * 정책:
 *   - viewers 키는 응답에 선택적으로 등장 (include_viewers=false 또는 정책 게이트)
 *   - staleTime 30s — 열람자 변동이 빠르므로 너무 길게 가져가지 않음
 *   - refetchOnWindowFocus 는 명시적으로 false (사용자 의도와 무관한 fetch 방지)
 */

"use client";

import { useQuery } from "@tanstack/react-query";

import { contributorsApi, type ContributorsBundle } from "@/lib/api/contributors";

export const CONTRIBUTORS_KEY = ["contributors"] as const;

export interface UseContributorsOptions {
  /** ISO 8601 timestamp. 카테고리별 since 필터. */
  since?: string;
  /** viewers 섹션 포함 여부 (기본 false). */
  includeViewers?: boolean;
  /** 카테고리당 최대 건수 (기본 50). */
  limitPerSection?: number;
  /** false 면 fetch 비활성. */
  enabled?: boolean;
}

export function useContributors(
  documentId: string,
  options: UseContributorsOptions = {},
) {
  const { since, includeViewers = false, limitPerSection = 50, enabled = true } = options;
  return useQuery<ContributorsBundle>({
    queryKey: [
      ...CONTRIBUTORS_KEY,
      documentId,
      { since: since ?? null, includeViewers, limitPerSection },
    ],
    queryFn: () =>
      contributorsApi.get(documentId, {
        since,
        include_viewers: includeViewers,
        limit_per_section: limitPerSection,
      }),
    enabled: enabled && !!documentId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
