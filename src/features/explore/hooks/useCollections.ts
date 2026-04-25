/**
 * useCollections — S3 Phase 2 FG 2-1.
 *
 * React Query 훅: 목록 조회 + 생성/수정/삭제 + 문서 추가/제거.
 * optimistic update + rollback + toast 패턴은 Phase 1 `useUserPreferences` 와 동일.
 */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  collectionsApi,
  type AddDocumentsResponse,
  type Collection,
  type CollectionCreateRequest,
  type CollectionUpdateRequest,
} from "@/lib/api/collections";
import { getApiErrorMessage } from "@/lib/api/client";
import { toast } from "@/stores/uiStore";

export const COLLECTIONS_QUERY_KEY = ["collections", "list"] as const;
export const COLLECTION_DOCUMENTS_QUERY_KEY = ["collections", "documents"] as const;

export function useCollections() {
  return useQuery({
    queryKey: COLLECTIONS_QUERY_KEY,
    queryFn: async () => (await collectionsApi.list({ limit: 200 })).items,
    staleTime: 30_000,
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: CollectionCreateRequest) => collectionsApi.create(body),
    onSuccess: (created) => {
      qc.setQueryData<Collection[] | undefined>(COLLECTIONS_QUERY_KEY, (prev) =>
        prev ? [created, ...prev] : [created],
      );
      toast(`컬렉션 "${created.name}" 이 생성되었습니다`, "success");
    },
    onError: (err) => {
      toast(getApiErrorMessage(err, "컬렉션 생성에 실패했습니다"), "error");
    },
  });
}

export function useUpdateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; body: CollectionUpdateRequest }) =>
      collectionsApi.update(args.id, args.body),
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey: COLLECTIONS_QUERY_KEY });
      const previous = qc.getQueryData<Collection[]>(COLLECTIONS_QUERY_KEY);
      if (previous) {
        qc.setQueryData<Collection[]>(
          COLLECTIONS_QUERY_KEY,
          previous.map((c) =>
            c.id === id
              ? {
                  ...c,
                  name: body.name ?? c.name,
                  description:
                    body.description !== undefined ? body.description : c.description,
                }
              : c,
          ),
        );
      }
      return { previous };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(COLLECTIONS_QUERY_KEY, ctx.previous);
      toast(getApiErrorMessage(err, "컬렉션 수정에 실패했습니다"), "error");
    },
    onSuccess: () => {
      toast("컬렉션이 수정되었습니다", "success");
    },
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => collectionsApi.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: COLLECTIONS_QUERY_KEY });
      const previous = qc.getQueryData<Collection[]>(COLLECTIONS_QUERY_KEY);
      if (previous) {
        qc.setQueryData<Collection[]>(
          COLLECTIONS_QUERY_KEY,
          previous.filter((c) => c.id !== id),
        );
      }
      return { previous };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(COLLECTIONS_QUERY_KEY, ctx.previous);
      toast(getApiErrorMessage(err, "컬렉션 삭제에 실패했습니다"), "error");
    },
    onSuccess: () => {
      toast("컬렉션이 삭제되었습니다", "success");
    },
  });
}

export function useAddDocumentsToCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { collectionId: string; documentIds: string[] }): Promise<AddDocumentsResponse> =>
      collectionsApi.addDocuments(args.collectionId, args.documentIds),
    onSuccess: (report, vars) => {
      // 문서 수 반영
      qc.setQueryData<Collection[] | undefined>(COLLECTIONS_QUERY_KEY, (prev) =>
        prev
          ? prev.map((c) =>
              c.id === vars.collectionId
                ? { ...c, document_count: (c.document_count ?? 0) + report.inserted }
                : c,
            )
          : prev,
      );
      qc.invalidateQueries({ queryKey: [...COLLECTION_DOCUMENTS_QUERY_KEY, vars.collectionId] });
      // 문서 상세가 in_collection_ids 를 반영하도록 해당 문서 캐시도 invalidate
      vars.documentIds.forEach((id) => qc.invalidateQueries({ queryKey: ["document", id] }));
      // 컬렉션 필터 결과 목록도 갱신 필요
      qc.invalidateQueries({ queryKey: ["documents"] });
      if (report.rejected > 0) {
        toast(
          `${report.inserted}개 추가됨. 접근 권한이 없어 ${report.rejected}개는 제외되었습니다.`,
          "info",
        );
      } else if (report.inserted === 0) {
        toast("모든 문서가 이미 컬렉션에 있습니다", "info");
      } else {
        toast(`${report.inserted}개 문서를 컬렉션에 추가했습니다`, "success");
      }
    },
    onError: (err) => {
      toast(getApiErrorMessage(err, "문서 추가에 실패했습니다"), "error");
    },
  });
}

export function useRemoveDocumentFromCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { collectionId: string; documentId: string }) =>
      collectionsApi.removeDocument(args.collectionId, args.documentId),
    onSuccess: (_r, vars) => {
      qc.setQueryData<Collection[] | undefined>(COLLECTIONS_QUERY_KEY, (prev) =>
        prev
          ? prev.map((c) =>
              c.id === vars.collectionId && c.document_count != null && c.document_count > 0
                ? { ...c, document_count: c.document_count - 1 }
                : c,
            )
          : prev,
      );
      qc.invalidateQueries({ queryKey: [...COLLECTION_DOCUMENTS_QUERY_KEY, vars.collectionId] });
      qc.invalidateQueries({ queryKey: ["document", vars.documentId] });
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast("문서를 컬렉션에서 제거했습니다", "success");
    },
    onError: (err) => {
      toast(getApiErrorMessage(err, "문서 제거에 실패했습니다"), "error");
    },
  });
}
