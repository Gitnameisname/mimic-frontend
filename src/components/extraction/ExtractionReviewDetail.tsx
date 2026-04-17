"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { extractionsApi } from "@/lib/api/extractions";
import { useExtractionStore } from "@/stores/extractionStore";
import {
  useApproveExtraction,
  useModifyExtraction,
  useRejectExtraction,
} from "@/hooks/useExtractionActions";
import { FieldEditor } from "./FieldEditor";
import { cn } from "@/lib/utils";

interface ExtractionReviewDetailProps {
  candidateId: string;
  onDone?: () => void;
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.85
      ? "bg-green-100 text-green-800"
      : score >= 0.70
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", color)}>
      {pct}%
    </span>
  );
}

type PanelTab = "fields" | "raw";

export function ExtractionReviewDetail({
  candidateId,
  onDone,
}: ExtractionReviewDetailProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("fields");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const initEdits = useExtractionStore((s) => s.initEdits);
  const editedFields = useExtractionStore((s) => s.editedFields);
  const resetEdits = useExtractionStore((s) => s.resetEdits);
  const isDirty = Object.keys(editedFields).length > 0;

  const { data: candidate, isLoading, isError } = useQuery({
    queryKey: ["extractions", candidateId],
    queryFn: () => extractionsApi.getById(candidateId),
    enabled: !!candidateId,
  });

  useEffect(() => {
    if (candidate) initEdits(candidate);
  }, [candidate, initEdits]);

  const handleDone = () => {
    resetEdits();
    onDone?.();
  };

  const approve = useApproveExtraction(handleDone);
  const modify = useModifyExtraction(handleDone);
  const reject = useRejectExtraction(rejectReason, handleDone);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        불러오는 중...
      </div>
    );
  }

  if (isError || !candidate) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-500 text-sm">
        상세 정보를 불러올 수 없습니다.
      </div>
    );
  }

  const fieldNames = Object.keys(candidate.extracted_fields);
  const avgConfidence =
    candidate.confidence_scores.length > 0
      ? candidate.confidence_scores.reduce((s, c) => s + c.confidence, 0) /
        candidate.confidence_scores.length
      : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-start gap-3 shrink-0">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-mono truncate">{candidate.id}</p>
          <p className="text-sm font-semibold text-gray-900 mt-0.5">
            스키마: {candidate.extraction_schema_id} v{candidate.extraction_schema_version}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-gray-500">
              모델: {candidate.extraction_model}
            </span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs text-gray-500">
              {candidate.extraction_latency_ms}ms
            </span>
            {avgConfidence !== null && (
              <>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-xs text-gray-500">평균 신뢰도</span>
                <ConfidenceBadge score={avgConfidence} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 shrink-0">
        {(["fields", "raw"] as PanelTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              activeTab === tab
                ? "border-b-2 border-blue-600 text-blue-700"
                : "text-gray-500 hover:text-gray-800"
            )}
            aria-selected={activeTab === tab}
            role="tab"
          >
            {tab === "fields" ? "필드 편집" : "원본 JSON"}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === "fields" &&
          fieldNames.map((name) => (
            <FieldEditor
              key={name}
              fieldName={name}
              originalValue={candidate.extracted_fields[name]}
              confidenceScores={candidate.confidence_scores}
              readOnly={candidate.status !== "pending"}
            />
          ))}

        {activeTab === "raw" && (
          <pre className="text-xs font-mono bg-gray-50 rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-words">
            {JSON.stringify(candidate.extracted_fields, null, 2)}
          </pre>
        )}
      </div>

      {/* Reject form */}
      {showRejectForm && (
        <div className="px-4 py-3 border-t border-gray-200 bg-red-50 shrink-0">
          <label
            htmlFor="reject-reason"
            className="block text-xs font-medium text-red-700 mb-1"
          >
            거절 사유 <span aria-hidden="true">*</span>
          </label>
          <input
            id="reject-reason"
            type="text"
            className="w-full text-sm border border-red-200 rounded p-2 focus:outline-none focus:ring-2 focus:ring-red-400"
            placeholder="거절 사유를 입력하세요"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            aria-required="true"
          />
          <div className="flex gap-2 mt-2">
            <button
              className="flex-1 py-1.5 text-sm font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors"
              onClick={() => reject.mutate(candidateId)}
              disabled={!rejectReason.trim() || reject.isPending}
              aria-label="거절 확정"
            >
              {reject.isPending ? "처리 중..." : "거절 확정"}
            </button>
            <button
              className="px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-colors"
              onClick={() => {
                setShowRejectForm(false);
                setRejectReason("");
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Action bar */}
      {candidate.status === "pending" && !showRejectForm && (
        <div className="px-4 py-3 border-t border-gray-200 flex gap-2 shrink-0 flex-wrap">
          {isDirty ? (
            <button
              className="flex-1 py-2 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
              onClick={() => modify.mutate(candidateId)}
              disabled={modify.isPending}
              aria-label="수정 후 승인"
            >
              {modify.isPending ? "처리 중..." : "수정 후 승인"}
            </button>
          ) : (
            <button
              className="flex-1 py-2 text-sm font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition-colors"
              onClick={() => approve.mutate(candidateId)}
              disabled={approve.isPending}
              aria-label="승인"
            >
              {approve.isPending ? "처리 중..." : "승인"}
            </button>
          )}
          <button
            className="px-4 py-2 text-sm font-medium bg-white border border-red-300 text-red-600 rounded hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transition-colors"
            onClick={() => setShowRejectForm(true)}
            aria-label="거절"
          >
            거절
          </button>
          {isDirty && (
            <button
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-colors"
              onClick={resetEdits}
              aria-label="편집 내용 초기화"
            >
              초기화
            </button>
          )}
        </div>
      )}

      {candidate.status !== "pending" && (
        <div className="px-4 py-3 border-t border-gray-200 shrink-0">
          <p className="text-sm text-center text-gray-500">
            이미 처리된 항목입니다:{" "}
            <span className="font-medium text-gray-700">{candidate.status}</span>
          </p>
        </div>
      )}
    </div>
  );
}
