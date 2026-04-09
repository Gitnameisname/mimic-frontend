"use client";

import { type ReactNode } from "react";

interface ModalProps {
  /** 모달 타이틀 */
  title: string;
  /** 모달 닫기 콜백 */
  onClose: () => void;
  /** 모달 본문 */
  children: ReactNode;
  /** 최대 너비 (기본값 "max-w-md") */
  maxWidth?: string;
}

/**
 * 공통 모달 오버레이 + 컨테이너.
 *
 * 모든 admin 모달에서 반복되는
 *   <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
 *     <div className="bg-white rounded-2xl shadow-xl ...">
 * 패턴을 캡슐화한다.
 */
export function Modal({ title, onClose, children, maxWidth = "max-w-md" }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`bg-white rounded-2xl shadow-xl w-full ${maxWidth} p-6`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface ModalActionsProps {
  onClose: () => void;
  isPending: boolean;
  submitLabel?: string;
  pendingLabel?: string;
  destructive?: boolean;
}

/**
 * 모달 하단 확인/취소 버튼 쌍.
 * form의 마지막 요소로 사용한다.
 */
export function ModalActions({
  onClose,
  isPending,
  submitLabel = "생성",
  pendingLabel,
  destructive = false,
}: ModalActionsProps) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        type="submit"
        disabled={isPending}
        className={`flex-1 text-white text-sm font-medium rounded-lg py-2 disabled:opacity-50 transition-colors ${
          destructive
            ? "bg-red-700 hover:bg-red-800"
            : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {isPending ? (pendingLabel ?? `${submitLabel} 중...`) : submitLabel}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="flex-1 border border-gray-200 text-gray-600 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors"
      >
        취소
      </button>
    </div>
  );
}
