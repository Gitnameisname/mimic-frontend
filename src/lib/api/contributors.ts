/**
 * Contributors API 클라이언트 — S3 Phase 3 FG 3-1.
 *
 * 백엔드 `GET /api/v1/documents/{id}/contributors` wrapper.
 * 응답 envelope `{ data, meta }` 의 data 만 꺼내 반환.
 */

import { api } from "./client";
import { toQueryString } from "@/lib/utils/url";

export type ContributorActorType = "user" | "agent" | "system";

export interface Contributor {
  actor_id: string;
  display_name: string;
  actor_type: ContributorActorType;
  last_activity_at: string | null;
  role_badge: string | null;
}

/**
 * 백엔드 응답:
 *   - viewers 키는 응답에 **선택적으로** 등장 (include_viewers=false 또는 정책 게이트 차단 시 없음)
 */
export interface ContributorsBundle {
  creator: Contributor | null;
  editors: Contributor[];
  approvers: Contributor[];
  viewers?: Contributor[];
}

export interface GetContributorsParams {
  /** ISO 8601 timestamp. 카테고리별 occurred_at/created_at 하한. */
  since?: string;
  /** viewers 섹션 포함 여부 (기본 false). */
  include_viewers?: boolean;
  /** 카테고리당 최대 건수 (1~200, 기본 50). */
  limit_per_section?: number;
}

type Envelope<T> = { data: T; meta?: unknown };

function unwrap<T>(raw: unknown): T {
  const r = raw as Envelope<T>;
  if (r && typeof r === "object" && "data" in r) return r.data;
  return raw as T;
}

export const contributorsApi = {
  /**
   * 문서 contributors 4 카테고리 묶음 조회.
   *
   * - viewer 가 문서를 못 보면 404.
   * - viewers 섹션은 응답 키 자체가 없을 수 있음 (정책 게이트 또는 include_viewers=false).
   */
  get: async (
    documentId: string,
    params: GetContributorsParams = {},
  ): Promise<ContributorsBundle> => {
    const qs = toQueryString({
      since: params.since,
      include_viewers: params.include_viewers,
      limit_per_section: params.limit_per_section,
    });
    const raw = await api.get<unknown>(
      `/api/v1/documents/${documentId}/contributors${qs}`,
    );
    return unwrap<ContributorsBundle>(raw);
  },
};
