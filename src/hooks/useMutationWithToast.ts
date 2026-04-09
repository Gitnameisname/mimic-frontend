"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type InvalidateQueryFilters,
} from "@tanstack/react-query";
import { getApiErrorMessage } from "@/lib/api";
import { toast } from "@/stores/uiStore";

interface MutationWithToastOptions<TData, TVariables> {
  /** 실제 mutationFn */
  mutationFn: (variables: TVariables) => Promise<TData>;
  /** 성공 토스트 메시지 */
  successMessage?: string;
  /** 실패 토스트 fallback 메시지 */
  errorMessage?: string;
  /** 성공 후 무효화할 queryKey 목록 */
  invalidateKeys?: InvalidateQueryFilters["queryKey"][];
  /** 성공 후 추가 콜백 */
  onSuccess?: (data: TData) => void;
  /** 실패 후 추가 콜백 */
  onError?: (error: unknown) => void;
  /** tanstack-query 기타 옵션 (onSuccess/onError 제외) */
  options?: Omit<UseMutationOptions<TData, unknown, TVariables>, "mutationFn" | "onSuccess" | "onError">;
}

/**
 * 토스트 알림 + queryKey 무효화를 자동 처리하는 useMutation 래퍼.
 *
 * 사용 예:
 * ```tsx
 * const { mutate, isPending } = useMutationWithToast({
 *   mutationFn: () => adminApi.createUser(form),
 *   successMessage: "사용자가 생성되었습니다.",
 *   errorMessage: "사용자 생성에 실패했습니다.",
 *   invalidateKeys: [["admin", "users"]],
 *   onSuccess: () => onClose(),
 * });
 * ```
 */
export function useMutationWithToast<TData = unknown, TVariables = void>({
  mutationFn,
  successMessage,
  errorMessage = "오류가 발생했습니다.",
  invalidateKeys,
  onSuccess,
  onError,
  options,
}: MutationWithToastOptions<TData, TVariables>) {
  const queryClient = useQueryClient();

  return useMutation<TData, unknown, TVariables>({
    mutationFn,
    onSuccess: (data) => {
      if (successMessage) toast(successMessage, "success");
      if (invalidateKeys) {
        for (const key of invalidateKeys) {
          queryClient.invalidateQueries({ queryKey: key });
        }
      }
      onSuccess?.(data);
    },
    onError: (error) => {
      toast(getApiErrorMessage(error, errorMessage), "error");
      onError?.(error);
    },
    ...options,
  });
}
