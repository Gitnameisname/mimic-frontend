"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TAG_AUTOCOMPLETE_KEY = exports.POPULAR_TAGS_KEY = void 0;
exports.usePopularTags = usePopularTags;
exports.useTagAutocomplete = useTagAutocomplete;
exports.useSetDocumentTags = useSetDocumentTags;
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("@/lib/api");
const client_1 = require("@/lib/api/client");
const tags_1 = require("@/lib/api/tags");
const uiStore_1 = require("@/stores/uiStore");
exports.POPULAR_TAGS_KEY = ["tags", "popular"];
exports.TAG_AUTOCOMPLETE_KEY = ["tags", "autocomplete"];
function usePopularTags(limit = 20) {
    return (0, react_query_1.useQuery)({
        queryKey: [...exports.POPULAR_TAGS_KEY, { limit }],
        queryFn: async () => (await tags_1.tagsApi.popular({ limit })).items,
        staleTime: 60_000,
    });
}
/**
 * 자동완성 훅 — q 는 호출자가 debounce 해서 넘김 (기본 150ms 는 상위에서 관리).
 * q 가 빈 문자열이면 빈 배열을 반환 (네트워크 호출 없음).
 */
function useTagAutocomplete(q, limit = 20) {
    const trimmed = q.trim();
    return (0, react_query_1.useQuery)({
        queryKey: [...exports.TAG_AUTOCOMPLETE_KEY, { q: trimmed, limit }],
        queryFn: async () => (await tags_1.tagsApi.autocomplete({ q: trimmed, limit })).items,
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
function useSetDocumentTags() {
    const qc = (0, react_query_1.useQueryClient)();
    return (0, react_query_1.useMutation)({
        mutationFn: async (args) => {
            const merged = {
                ...(args.baseMetadata ?? {}),
                tags: args.nextTags,
            };
            return api_1.documentsApi.update(args.documentId, { metadata: merged });
        },
        onSuccess: (_doc, vars) => {
            qc.invalidateQueries({ queryKey: ["document", vars.documentId] });
            qc.invalidateQueries({ queryKey: ["documents"] });
            qc.invalidateQueries({ queryKey: exports.POPULAR_TAGS_KEY });
            qc.invalidateQueries({ queryKey: exports.TAG_AUTOCOMPLETE_KEY });
            (0, uiStore_1.toast)("태그가 저장되었습니다", "success");
        },
        onError: (err) => {
            (0, uiStore_1.toast)((0, client_1.getApiErrorMessage)(err, "태그 저장에 실패했습니다"), "error");
        },
    });
}
