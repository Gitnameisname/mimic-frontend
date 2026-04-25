/**
 * useTags — S3 Phase 2 FG 2-2.
 *
 * React Query 훅:
 *   - usePopularTags — 사이드바 태그 섹션 (staleTime 60s)
 *   - useTagAutocomplete — 자동완성 드롭다운 (q 기반)
 *   - useSetDocumentTags — 문서 frontmatter 태그 PATCH (metadata.tags 갱신)
 *
 * 설계: 서버 파서가 정본이라 **FE 가 직접 document_tags 를 조작하지 않음**.
 * 문서의 frontmatter 태그만 PATCH 하면 서버가 `rebuild_tags_for_document` 로
 * document_tags 를 재계산. 인라인 hashtag 는 본문 편집(TipTap HashtagMark) 로
 * 변경되며, `save_draft` 연쇄에서 자동 반영.
 */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { documentsApi } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api/client";
import { tagsApi } from "@/lib/api/tags";
import { toast } from "@/stores/uiStore";

export const POPULAR_TAGS_KEY = ["tags", "popular"] as const;
export const TAG_AUTOCOMPLETE_KEY = ["tags", "autocomplete"] as const;

export function usePopularTags(limit = 20) {
  return useQuery({
    queryKey: [...POPULAR_TAGS_KEY, { limit }],
    queryFn: async () => (await tagsApi.popular({ limit })).items,
    staleTime: 60_000,
  });
}

/**
 * 자동완성 훅 — q 는 호출자가 debounce 해서 넘김 (기본 150ms 는 상위에서 관리).
 * q 가 빈 문자열이면 빈 배열을 반환 (네트워크 호출 없음).
 */
export function useTagAutocomplete(q: string, limit = 20) {
  const trimmed = q.trim();
  return useQuery({
    queryKey: [...TAG_AUTOCOMPLETE_KEY, { q: trimmed, limit }],
    queryFn: async () => (await tagsApi.autocomplete({ q: trimmed, limit })).items,
    enabled: trimmed.length > 0,
    staleTime: 30_000,
  });
}

/**
 * 문서의 frontmatter 태그(metadata.tags) 를 PATCH.
 * 서버는 이 변경을 받고 `save_draft` 또는 `update_document` 경로에서 다시
 * `rebuild_tags_for_document` 를 호출해 document_tags 를 갱신.
 *
 * 주의: 문서 `metadata` 는 서버에서 **전체 replace** 정책. 따라서 호출자는
 * 기존 metadata 를 보존하면서 tags 만 교체해 전달해야 한다.
 */
export function useSetDocumentTags() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      documentId: string;
      nextTags: string[];
      baseMetadata?: Record<string, unknown>;
    }) => {
      const merged: Record<string, unknown> = {
        ...(args.baseMetadata ?? {}),
        tags: args.nextTags,
      };
      return documentsApi.update(args.documentId, { metadata: merged });
    },
    onSuccess: (_doc, vars) => {
      qc.invalidateQueries({ queryKey: ["document", vars.documentId] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: POPULAR_TAGS_KEY });
      qc.invalidateQueries({ queryKey: TAG_AUTOCOMPLETE_KEY });
      toast("태그가 저장되었습니다", "success");
    },
    onError: (err) => {
      toast(getApiErrorMessage(err, "태그 저장에 실패했습니다"), "error");
    },
  });
}
