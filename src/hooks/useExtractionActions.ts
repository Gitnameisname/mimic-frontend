"use client";

import { useQueryClient } from "@tanstack/react-query";
import { extractionsApi } from "@/lib/api/extractions";
import { useExtractionStore } from "@/stores/extractionStore";
import { useMutationWithToast } from "./useMutationWithToast";

export function useApproveExtraction(onSuccess?: () => void) {
  return useMutationWithToast<unknown, string>({
    mutationFn: (id) => extractionsApi.approve(id),
    successMessage: "추출 결과가 승인되었습니다.",
    errorMessage: "승인에 실패했습니다.",
    invalidateKeys: [["extractions", "pending"]],
    onSuccess,
  });
}

export function useModifyExtraction(onSuccess?: () => void) {
  const { editedFields, editReasons } = useExtractionStore();
  return useMutationWithToast<unknown, string>({
    mutationFn: (id) =>
      extractionsApi.modify(id, {
        modifications: editedFields,
        reasons: editReasons,
      }),
    successMessage: "수정 후 승인되었습니다.",
    errorMessage: "수정 승인에 실패했습니다.",
    invalidateKeys: [["extractions", "pending"]],
    onSuccess,
  });
}

export function useRejectExtraction(reason: string, onSuccess?: () => void) {
  return useMutationWithToast<void, string>({
    mutationFn: (id) => extractionsApi.reject(id, { reason }),
    successMessage: "추출 결과가 거절되었습니다.",
    errorMessage: "거절에 실패했습니다.",
    invalidateKeys: [["extractions", "pending"]],
    onSuccess,
  });
}

export function useBatchApprove(onSuccess?: () => void) {
  const clearSelection = useExtractionStore((s) => s.clearSelection);
  return useMutationWithToast<unknown, string[]>({
    mutationFn: (ids) => extractionsApi.batchApprove({ candidate_ids: ids }),
    successMessage: "일괄 승인되었습니다.",
    errorMessage: "일괄 승인에 실패했습니다.",
    invalidateKeys: [["extractions", "pending"]],
    onSuccess: () => {
      clearSelection();
      onSuccess?.();
    },
  });
}

export function useBatchReject(reason: string, onSuccess?: () => void) {
  const clearSelection = useExtractionStore((s) => s.clearSelection);
  return useMutationWithToast<unknown, string[]>({
    mutationFn: (ids) => extractionsApi.batchReject({ candidate_ids: ids, reason }),
    successMessage: "일괄 거절되었습니다.",
    errorMessage: "일괄 거절에 실패했습니다.",
    invalidateKeys: [["extractions", "pending"]],
    onSuccess: () => {
      clearSelection();
      onSuccess?.();
    },
  });
}

export function useExtractionDetail(id: string | null, onLoaded?: () => void) {
  const queryClient = useQueryClient();
  return {
    prefetch: () => {
      if (!id) return;
      queryClient.prefetchQuery({
        queryKey: ["extractions", id],
        queryFn: () => extractionsApi.getById(id),
      });
    },
  };
}
