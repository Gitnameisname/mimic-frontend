/**
 * useFolders — S3 Phase 2 FG 2-1.
 *
 * React Query 훅: 전체 트리 조회 + 생성 / rename / move / delete + document_folder 설정.
 */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  foldersApi,
  type Folder,
  type FolderCreateRequest,
} from "@/lib/api/folders";
import { getApiErrorMessage } from "@/lib/api/client";
import { toast } from "@/stores/uiStore";

export const FOLDERS_QUERY_KEY = ["folders", "tree"] as const;

export function useFolders() {
  return useQuery({
    queryKey: FOLDERS_QUERY_KEY,
    queryFn: async () => (await foldersApi.list()).items,
    staleTime: 30_000,
  });
}

export function useCreateFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: FolderCreateRequest) => foldersApi.create(body),
    onSuccess: (created) => {
      qc.setQueryData<Folder[] | undefined>(FOLDERS_QUERY_KEY, (prev) =>
        prev ? [...prev, created].sort((a, b) => a.path.localeCompare(b.path)) : [created],
      );
      toast(`폴더 "${created.name}" 이 생성되었습니다`, "success");
    },
    onError: (err) => {
      toast(getApiErrorMessage(err, "폴더 생성에 실패했습니다"), "error");
    },
  });
}

export function useRenameFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; newName: string }) =>
      foldersApi.rename(args.id, args.newName),
    onSuccess: () => {
      // rename 은 path prefix 변경으로 다른 폴더도 영향. 전체 invalidate
      qc.invalidateQueries({ queryKey: FOLDERS_QUERY_KEY });
      toast("폴더 이름이 변경되었습니다", "success");
    },
    onError: (err) => {
      toast(getApiErrorMessage(err, "폴더 이름 변경에 실패했습니다"), "error");
    },
  });
}

export function useMoveFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; newParentId: string | null }) =>
      foldersApi.move(args.id, { new_parent_id: args.newParentId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: FOLDERS_QUERY_KEY });
      toast("폴더가 이동되었습니다", "success");
    },
    onError: (err) => {
      toast(getApiErrorMessage(err, "폴더 이동에 실패했습니다"), "error");
    },
  });
}

export function useDeleteFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => foldersApi.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: FOLDERS_QUERY_KEY });
      const previous = qc.getQueryData<Folder[]>(FOLDERS_QUERY_KEY);
      if (previous) {
        qc.setQueryData<Folder[]>(
          FOLDERS_QUERY_KEY,
          previous.filter((f) => f.id !== id),
        );
      }
      return { previous };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(FOLDERS_QUERY_KEY, ctx.previous);
      toast(getApiErrorMessage(err, "폴더 삭제에 실패했습니다"), "error");
    },
    onSuccess: () => {
      toast("폴더가 삭제되었습니다", "success");
    },
  });
}

export function useSetDocumentFolder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { documentId: string; folderId: string | null }) =>
      foldersApi.setDocumentFolder(args.documentId, args.folderId),
    onSuccess: (_data, vars) => {
      // 문서 목록 / 문서 상세 모두 polder 변화에 반응하도록 invalidate.
      // DocumentListPage 는 ["documents", ...] 단수 prefix 로 캐시되고, DocumentDetailPage 는
      // ["document", id] 로 캐시된다 — 두 개를 분리 invalidate 해야 UI 가 stale 이 안 된다.
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["document", vars.documentId] });
      toast("문서 폴더가 변경되었습니다", "success");
    },
    onError: (err) => {
      toast(getApiErrorMessage(err, "문서 폴더 변경에 실패했습니다"), "error");
    },
  });
}
