import { toQueryString } from "@/lib/utils/url";
import { api } from "./client";
import type { DiffResult, DiffSummaryResponse } from "@/types/diff";

function wrap<T>(response: { data: T }): T {
  return response.data;
}

export const diffApi = {
  /** 두 버전 간 전체 diff */
  getBetweenVersions: (
    documentId: string,
    v1Id: string,
    v2Id: string,
    options?: { inline_diff?: boolean; include_unchanged?: boolean }
  ) => {
    // 기존 시맨틱 보존: truthy 일 때만 emit (false/omit 둘 다 backend 기본값에 위임).
    const qs = toQueryString({
      inline_diff: options?.inline_diff || undefined,
      include_unchanged: options?.include_unchanged || undefined,
    });
    return api
      .get<{ data: DiffResult }>(
        `/api/v1/documents/${documentId}/versions/${v1Id}/diff/${v2Id}${qs}`
      )
      .then(wrap);
  },

  /** 직전 버전 대비 전체 diff */
  getWithPrevious: (
    documentId: string,
    versionId: string,
    options?: { inline_diff?: boolean }
  ) => {
    const qs = toQueryString({ inline_diff: options?.inline_diff || undefined });
    return api
      .get<{ data: DiffResult }>(
        `/api/v1/documents/${documentId}/versions/${versionId}/diff${qs}`
      )
      .then(wrap);
  },

  /** 두 버전 간 변경 요약 (경량) */
  getSummaryBetween: (
    documentId: string,
    v1Id: string,
    v2Id: string
  ) =>
    api
      .get<{ data: DiffSummaryResponse }>(
        `/api/v1/documents/${documentId}/versions/${v1Id}/diff/${v2Id}/summary`
      )
      .then(wrap),

  /** 직전 버전 대비 변경 요약 (경량) */
  getSummaryWithPrevious: (documentId: string, versionId: string) =>
    api
      .get<{ data: DiffSummaryResponse }>(
        `/api/v1/documents/${documentId}/versions/${versionId}/diff/summary`
      )
      .then(wrap),
};
