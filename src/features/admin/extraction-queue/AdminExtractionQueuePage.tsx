"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { extractionQueueApi } from "@/lib/api/s2admin";
import type { ExtractionResult, ExtractionResultDetail } from "@/types/s2admin";
import { cn } from "@/lib/utils";

// ─── 스켈레톤 배너 ───

function SkeletonBanner() {
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
      <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <p className="text-sm font-bold text-amber-800">스켈레톤 상태</p>
        <p className="text-xs text-amber-700 mt-0.5">
          이 페이지는 Phase 8 FG8.2/8.3 완료 후 추출 결과 API와 연결됩니다.
        </p>
      </div>
    </div>
  );
}

// ─── 목 데이터 ───

const MOCK_RESULTS: ExtractionResult[] = [
  { id: "er-1", document_id: "doc-1", document_title: "2026 서비스 계약서", document_type_code: "contract", extracted_at: "2026-04-15T10:00:00Z", status: "pending_review", reviewer_id: null, reviewed_at: null },
  { id: "er-2", document_id: "doc-2", document_title: "2026년 3월 인보이스", document_type_code: "invoice", extracted_at: "2026-04-14T14:00:00Z", status: "approved", reviewer_id: "user-1", reviewed_at: "2026-04-14T16:00:00Z" },
  { id: "er-3", document_id: "doc-3", document_title: "분기 보고서 Q1", document_type_code: "report", extracted_at: "2026-04-13T09:00:00Z", status: "rejected", reviewer_id: "user-2", reviewed_at: "2026-04-13T11:00:00Z" },
];

// ─── 상태 배지 ───

function StatusBadge({ status }: { status: ExtractionResult["status"] }) {
  const map = {
    pending_review: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  } as const;
  const label = { pending_review: "검토 대기", approved: "승인", rejected: "반려" } as const;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold", map[status])}>
      {label[status]}
    </span>
  );
}

// ─── 추출 결과 상세 패널 ───

function ExtractionDetailPanel({
  result,
  onClose,
  onReviewed,
}: {
  result: ExtractionResult;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const qc = useQueryClient();
  const [rejectReason, setRejectReason] = useState("");

  const detailQ = useQuery({
    queryKey: ["admin", "extraction-results", result.id],
    queryFn: () => extractionQueueApi.get(result.id),
    retry: false,
  });

  const approveMut = useMutation({
    mutationFn: () => extractionQueueApi.approve(result.id),
    onSuccess: () => { onReviewed(); onClose(); },
  });

  const rejectMut = useMutation({
    mutationFn: () => extractionQueueApi.reject(result.id, rejectReason || undefined),
    onSuccess: () => { onReviewed(); onClose(); },
  });

  const detail: ExtractionResultDetail | undefined = detailQ.data?.data;

  const mockDetail: ExtractionResultDetail = {
    ...result,
    original_content_preview: "이 계약은 2026년 1월 1일부로 효력이 발생하며...",
    extracted_fields: {
      party_a: "주식회사 미미르",
      party_b: "주식회사 테스트",
      contract_date: "2026-01-01",
      amount: 50000000,
    },
    field_spans: {
      party_a: "1-4행",
      party_b: "5-8행",
      contract_date: "12행",
      amount: "20행",
    },
  };

  const displayDetail = detail ?? mockDetail;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-xl flex flex-col" role="dialog" aria-modal="true" aria-label="추출 결과 상세">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-bold text-gray-900 truncate">{result.document_title}</h2>
            <StatusBadge status={result.status} />
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300" aria-label="닫기">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          <SkeletonBanner />

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">DocumentType</p>
              <p className="font-semibold text-gray-900 font-mono text-xs">{result.document_type_code}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">추출 시각</p>
              <p className="font-semibold text-gray-900 text-xs">{new Date(result.extracted_at).toLocaleString("ko")}</p>
            </div>
          </div>

          {/* 원본 미리보기 */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">원본 문서 미리보기</h3>
            <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-700 font-mono max-h-32 overflow-y-auto">
              {displayDetail.original_content_preview}
            </div>
          </div>

          {/* 추출된 필드 */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">추출된 필드 값</h3>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">필드</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">값</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">위치 (Phase 8 후)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(displayDetail.extracted_fields).map(([k, v]) => (
                    <tr key={k} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-semibold text-gray-900 font-mono text-xs">{k}</td>
                      <td className="px-4 py-2.5 text-gray-700 text-xs">{String(v)}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{displayDetail.field_spans[k] ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 승인/반려 액션 */}
          {result.status === "pending_review" && (
            <div className="space-y-3">
              <div>
                <label htmlFor="reject-reason" className="block text-sm font-semibold text-gray-700 mb-1.5">반려 사유 (선택)</label>
                <textarea
                  id="reject-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  placeholder="반려 시 사유 입력..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={rejectMut.isPending || approveMut.isPending}
                  onClick={() => rejectMut.mutate()}
                  className="flex-1 py-2.5 rounded-lg bg-red-50 border border-red-300 text-red-700 text-sm font-semibold hover:bg-red-100 min-h-[44px] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {rejectMut.isPending ? "처리 중..." : "반려"}
                </button>
                <button
                  type="button"
                  disabled={approveMut.isPending || rejectMut.isPending}
                  onClick={() => approveMut.mutate()}
                  className="flex-1 py-2.5 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 min-h-[44px] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2"
                >
                  {approveMut.isPending ? "처리 중..." : "모두 승인"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// AdminExtractionQueuePage (스켈레톤)
// ═══════════════════════════════════════

export function AdminExtractionQueuePage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending_review");
  const [typeFilter, setTypeFilter] = useState("");
  const [selected, setSelected] = useState<ExtractionResult | null>(null);

  const { data, isError } = useQuery({
    queryKey: ["admin", "extraction-results", statusFilter, typeFilter],
    queryFn: () => extractionQueueApi.list({ status: statusFilter || undefined, document_type: typeFilter || undefined, page_size: 20 }),
    retry: false,
  });

  const results = isError ? MOCK_RESULTS : (data?.data ?? MOCK_RESULTS);

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl">
      {selected && (
        <ExtractionDetailPanel
          result={selected}
          onClose={() => setSelected(null)}
          onReviewed={() => qc.invalidateQueries({ queryKey: ["admin", "extraction-results"] })}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">추출 결과 검토 큐</h1>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[40px]"
            aria-label="상태 필터"
          >
            <option value="">전체</option>
            <option value="pending_review">검토 대기</option>
            <option value="approved">승인</option>
            <option value="rejected">반려</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[40px]"
            aria-label="DocumentType 필터"
          >
            <option value="">전체 타입</option>
            <option value="contract">contract</option>
            <option value="invoice">invoice</option>
            <option value="report">report</option>
          </select>
        </div>
      </div>

      <SkeletonBanner />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">문서</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">DocumentType</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">추출 시각</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상태</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {results.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelected(r)}>
                  <td className="px-4 py-3 font-semibold text-gray-900 max-w-xs truncate">{r.document_title}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{r.document_type_code}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(r.extracted_at).toLocaleString("ko", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setSelected(r)}
                      className="text-xs font-semibold text-red-700 hover:text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50 min-h-[36px] focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      검토
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
