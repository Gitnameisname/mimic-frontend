"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { workflowApi, getApiErrorMessage } from "@/lib/api";
import { toast } from "@/stores/uiStore";
import { Button } from "@/components/button/Button";
import { DiffSummaryBanner } from "@/features/diff/DiffSummaryBanner";
import { DiffViewerAuto } from "@/features/diff/DiffViewerAuto";

type Action = "approve" | "reject" | "submit-review";

interface Props {
  action: Action;
  documentId: string;
  versionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ACTION_LABELS: Record<Action, { title: string; label: string; successMsg: string; danger: boolean }> = {
  approve: {
    title: "승인하시겠습니까?",
    label: "승인 완료",
    successMsg: "문서가 승인되었습니다",
    danger: false,
  },
  reject: {
    title: "반려하시겠습니까?",
    label: "반려",
    successMsg: "문서가 반려되었습니다",
    danger: true,
  },
  "submit-review": {
    title: "검토를 요청하시겠습니까?",
    label: "검토 요청",
    successMsg: "검토가 요청되었습니다",
    danger: false,
  },
};

export function WorkflowActionModal({
  action,
  documentId,
  versionId,
  onClose,
  onSuccess,
}: Props) {
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [showDiff, setShowDiff] = useState(false);
  const meta = ACTION_LABELS[action];

  // approve/reject 시에만 diff 배너 표시
  const isDiffVisible = action === "approve" || action === "reject";

  const mutation = useMutation({
    mutationFn: () => {
      if (action === "approve")
        return workflowApi.approve(documentId, versionId, { comment: comment || undefined });
      if (action === "reject")
        return workflowApi.reject(documentId, versionId, { reason, comment: comment || undefined });
      return workflowApi.submitReview(documentId, versionId, { comment: comment || undefined });
    },
    onSuccess: () => {
      toast(meta.successMsg, "success");
      onSuccess();
    },
    onError: (err) => toast(getApiErrorMessage(err, "처리에 실패했습니다. 다시 시도해 주세요."), "error"),
  });

  const canSubmit = action !== "reject" || reason.trim().length >= 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-base font-semibold text-gray-900">{meta.title}</h3>

        {/* 변경 내용 배너 (approve/reject 시) */}
        {isDiffVisible && (
          <div className="mt-4">
            <DiffSummaryBanner
              documentId={documentId}
              versionId={versionId}
              label="변경 내용 확인"
              onToggleDetail={() => setShowDiff((v) => !v)}
              showDetail={showDiff}
            />
            {showDiff && (
              <div className="mt-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
                <DiffViewerAuto documentId={documentId} versionId={versionId} />
              </div>
            )}
          </div>
        )}

        {action === "reject" && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              반려 사유 <span className="text-red-500">*</span>
            </label>
            <textarea
              className="w-full border border-gray-300 rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="반려 사유를 입력해 주세요."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        <div className="mt-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            검토 의견{" "}
            <span className="text-gray-400 font-normal">(선택 사항)</span>
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="의견을 입력하세요."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        {action === "reject" && (
          <p className="mt-2 text-xs text-amber-600">
            ⚠ 반려 시 작성자에게 문서가 반환됩니다.
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={mutation.isPending}>
            취소
          </Button>
          <Button
            variant={meta.danger ? "danger" : "primary"}
            size="sm"
            loading={mutation.isPending}
            disabled={!canSubmit}
            onClick={() => mutation.mutate()}
          >
            {meta.label}
          </Button>
        </div>
      </div>
    </div>
  );
}
