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
    const params = new URLSearchParams();
    if (options?.inline_diff) params.set("inline_diff", "true");
    if (options?.include_unchanged) params.set("include_unchanged", "true");
    const qs = params.toString() ? `?${params}` : "";
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
    const params = new URLSearchParams();
    if (options?.inline_diff) params.set("inline_diff", "true");
    const qs = params.toString() ? `?${params}` : "";
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
