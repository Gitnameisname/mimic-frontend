"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { extractionsApi } from "@/lib/api/extractions";
import { useExtractionStore } from "@/stores/extractionStore";
import { useBatchApprove, useBatchReject } from "@/hooks/useExtractionActions";
import { ExtractionReviewDetail } from "@/components/extraction/ExtractionReviewDetail";
import { PageHeader } from "@/components/page/PageHeader";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { SkeletonRow } from "@/components/feedback/SkeletonBlock";
import { cn } from "@/lib/utils";

type StatusFilter = "pending" | "approved" | "rejected" | "modified";

const STATUS_LABELS: Record<StatusFilter, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "거절",
  modified: "수정승인",
};

const STATUS_STYLES: Record<StatusFilter, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  modified: "bg-blue-100 text-blue-800",
};

const PAGE_SIZE = 20;

export function ExtractionReviewPage() {
  const [page, setPage] = useState(0);
  const [batchRejectReason, setBatchRejectReason] = useState("");
  const [showBatchRejectInput, setShowBatchRejectInput] = useState(false);

  const selectedId = useExtractionStore((s) => s.selectedId);
  const setSelectedId = useExtractionStore((s) => s.setSelectedId);
  const selectedIds = useExtractionStore((s) => s.selectedIds);
  const toggleSelectId = useExtractionStore((s) => s.toggleSelectId);
  const selectAll = useExtractionStore((s) => s.selectAll);
  const clearSelection = useExtractionStore((s) => s.clearSelection);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["extractions", "pending", page],
    queryFn: () =>
      extractionsApi.listPending({ limit: PAGE_SIZE, offset: page * PAGE_SIZE }),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pendingCount = data?.pending_count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const batchApprove = useBatchApprove();
  const batchReject = useBatchReject(batchRejectReason);

  const allSelected =
    items.length > 0 && items.every((item) => selectedIds.has(item.id));

  const handleSelectAll = () => {
    if (allSelected) clearSelection();
    else selectAll(items.map((i) => i.id));
  };

  const handleBatchApprove = () => {
    batchApprove.mutate(Array.from(selectedIds));
  };

  const handleBatchReject = () => {
    if (!batchRejectReason.trim()) return;
    batchReject.mutate(Array.from(selectedIds));
    setShowBatchRejectInput(false);
    setBatchRejectReason("");
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: list panel */}
      <div
        className={cn(
          "flex flex-col border-r border-gray-200 bg-white overflow-hidden transition-all duration-200",
          selectedId ? "w-80 shrink-0" : "flex-1"
        )}
      >
        {/* List header */}
        <div className="px-4 py-3 border-b border-gray-200 shrink-0 space-y-2">
          <div className="flex items-center justify-between">
            <PageHeader
              title="추출 검토"
              description={`대기 ${pendingCount}건 / 전체 ${total}건`}
            />
          </div>

          {/* Batch action toolbar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-md border border-blue-200">
              <span className="text-xs font-medium text-blue-700 mr-1">
                {selectedIds.size}건 선택됨
              </span>
              <button
                className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition-colors"
                onClick={handleBatchApprove}
                disabled={batchApprove.isPending}
                aria-label="선택 항목 일괄 승인"
              >
                일괄 승인
              </button>
              <button
                className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors"
                onClick={() => setShowBatchRejectInput((v) => !v)}
                aria-label="선택 항목 일괄 거절"
              >
                일괄 거절
              </button>
              <button
                className="text-xs text-gray-500 hover:text-gray-700 ml-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                onClick={clearSelection}
                aria-label="선택 해제"
              >
                해제
              </button>
            </div>
          )}

          {showBatchRejectInput && (
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 text-xs border border-red-200 rounded p-1.5 focus:outline-none focus:ring-2 focus:ring-red-400"
                placeholder="일괄 거절 사유"
                value={batchRejectReason}
                onChange={(e) => setBatchRejectReason(e.target.value)}
                aria-label="일괄 거절 사유 입력"
              />
              <button
                className="text-xs px-2 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 transition-colors"
                onClick={handleBatchReject}
                disabled={!batchRejectReason.trim() || batchReject.isPending}
                aria-label="일괄 거절 확정"
              >
                확정
              </button>
            </div>
          )}
        </div>

        {/* Column header */}
        <div className="grid grid-cols-[24px_1fr_72px_64px] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide shrink-0">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
            aria-label="전체 선택"
            className="w-4 h-4 rounded border-gray-300"
          />
          <span>스키마 / 문서</span>
          <span>상태</span>
          <span>신뢰도</span>
        </div>

        {/* List body */}
        <div className="flex-1 overflow-y-auto">
          {isLoading &&
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}

          {isError && (
            <ErrorState description="추출 목록을 불러오지 못했습니다." retry={refetch} />
          )}

          {!isLoading && !isError && items.length === 0 && (
            <EmptyState
              title="검토할 추출 결과가 없습니다"
              description="새 문서가 처리되면 여기에 표시됩니다."
            />
          )}

          {!isLoading &&
            !isError &&
            items.map((item) => {
              const avgConf =
                item.confidence_scores.length > 0
                  ? item.confidence_scores.reduce((s, c) => s + c.confidence, 0) /
                    item.confidence_scores.length
                  : null;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "grid grid-cols-[24px_1fr_72px_64px] gap-3 px-4 py-3 border-b border-gray-100 cursor-pointer items-start transition-colors",
                    selectedId === item.id
                      ? "bg-blue-50 border-l-2 border-l-blue-500"
                      : "hover:bg-gray-50"
                  )}
                  onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
                  role="row"
                  aria-selected={selectedId === item.id}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(item.id === selectedId ? null : item.id);
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleSelectId(item.id);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-300 mt-0.5"
                    aria-label={`${item.id} 선택`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.extraction_schema_id}
                    </p>
                    <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
                      doc:{item.document_id.slice(0, 8)}…
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium px-1.5 py-0.5 rounded-full self-start",
                      STATUS_STYLES[item.status as StatusFilter] ??
                        "bg-gray-100 text-gray-600"
                    )}
                  >
                    {STATUS_LABELS[item.status as StatusFilter] ?? item.status}
                  </span>
                  <span className="text-xs text-gray-500 self-start">
                    {avgConf !== null ? `${Math.round(avgConf * 100)}%` : "—"}
                  </span>
                </div>
              );
            })}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 shrink-0 text-xs text-gray-500">
            <button
              className="disabled:opacity-40 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="이전 페이지"
            >
              ← 이전
            </button>
            <span>
              {page + 1} / {totalPages}
            </span>
            <button
              className="disabled:opacity-40 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              aria-label="다음 페이지"
            >
              다음 →
            </button>
          </div>
        )}
      </div>

      {/* Right: detail panel */}
      {selectedId ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <ExtractionReviewDetail
            candidateId={selectedId}
            onDone={() => {
              setSelectedId(null);
              refetch();
            }}
          />
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center text-gray-400 text-sm bg-gray-50">
          목록에서 항목을 선택하면 여기에 상세 내용이 표시됩니다.
        </div>
      )}
    </div>
  );
}
