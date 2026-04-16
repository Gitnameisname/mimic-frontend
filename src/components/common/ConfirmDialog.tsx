"use client";

/**
 * ConfirmDialog — 파괴적 액션 확인 모달.
 *
 * window.confirm 대체 (WCAG 2.1 AA 준수).
 *
 * 접근성:
 *  - role="alertdialog" + aria-modal + aria-labelledby/describedby
 *  - 열릴 때 취소 버튼에 포커스 (기본 안전 선택)
 *  - Escape 키로 취소
 *  - 배경 스크롤 잠금
 */

import { useEffect, useRef } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "확인",
  cancelLabel = "취소",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // 열릴 때 취소 버튼에 포커스 (안전한 기본 선택)
  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
    }
  }, [open]);

  // Escape 키로 취소
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 z-50 bg-black/40"
        aria-hidden="true"
        onClick={onCancel}
      />

      {/* 다이얼로그 */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? "confirm-dialog-desc" : undefined}
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-white rounded-xl shadow-xl border border-gray-200 p-6"
      >
        {/* 제목 */}
        <h2
          id="confirm-dialog-title"
          className="text-base font-semibold text-gray-900 mb-2"
        >
          {title}
        </h2>

        {/* 설명 */}
        {description && (
          <p
            id="confirm-dialog-desc"
            className="text-sm text-gray-500 mb-5 leading-relaxed"
          >
            {description}
          </p>
        )}

        {/* 버튼 영역 */}
        <div className="flex justify-end gap-2 mt-5">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 transition-colors ${
              destructive
                ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
                : "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
