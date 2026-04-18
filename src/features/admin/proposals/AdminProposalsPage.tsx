"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proposalsApi } from "@/lib/api/s2admin";
import type { Proposal, ProposalDetail, ProposalStatus } from "@/types/s2admin";
import { cn } from "@/lib/utils";

// ─── 상태 배지 ───

function ProposalStatusBadge({ status }: { status: ProposalStatus }) {
  const map = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
  } as const;
  const label = { pending: "대기", approved: "승인", rejected: "거절" } as const;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold", map[status])}>
      {label[status]}
    </span>
  );
}

// ─── Diff 뷰어 ───

function DiffViewer({ original, proposed }: { original: string; proposed: string }) {
  const origLines = original.split("\n");
  const propLines = proposed.split("\n");
  const maxLen = Math.max(origLines.length, propLines.length);

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden text-xs font-mono">
      <div className="grid grid-cols-2 border-b border-gray-200">
        <div className="px-3 py-2 bg-red-50 text-red-700 font-semibold border-r border-gray-200">기존</div>
        <div className="px-3 py-2 bg-green-50 text-green-700 font-semibold">제안</div>
      </div>
      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        {Array.from({ length: maxLen }).map((_, i) => {
          const orig = origLines[i] ?? "";
          const prop = propLines[i] ?? "";
          const changed = orig !== prop;
          return (
            <div key={i} className="grid grid-cols-2 border-b border-gray-100 last:border-0">
              <div className={cn(
                "px-3 py-1 border-r border-gray-200 whitespace-pre-wrap break-all",
                changed ? "bg-red-50 text-red-800" : "text-gray-700"
              )}>
                <span className="select-none text-gray-300 mr-2">{i + 1}</span>
                {orig}
              </div>
              <div className={cn(
                "px-3 py-1 whitespace-pre-wrap break-all",
                changed ? "bg-green-50 text-green-800" : "text-gray-700"
              )}>
                <span className="select-none text-gray-300 mr-2">{i + 1}</span>
                {prop}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 제안 상세 패널 ───

function ProposalDetailPanel({
  proposal,
  onClose,
  onReviewed,
}: {
  proposal: Proposal;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const [feedback, setFeedback] = useState("");

  const detailQ = useQuery({
    queryKey: ["admin", "proposals", proposal.id],
    queryFn: () => proposalsApi.get(proposal.id),
  });

  const approveMut = useMutation({
    mutationFn: () => proposalsApi.approve(proposal.id, feedback || undefined),
    onSuccess: () => { onReviewed(); onClose(); },
  });

  const rejectMut = useMutation({
    mutationFn: () => proposalsApi.reject(proposal.id, feedback || undefined),
    onSuccess: () => { onReviewed(); onClose(); },
  });

  const detail: ProposalDetail | undefined = detailQ.data?.data;
  const isPending = proposal.status === "pending";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div
        className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="제안 상세"
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-bold text-gray-900 truncate">{proposal.document_title}</h2>
            <ProposalStatusBadge status={proposal.status} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* 메타데이터 */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">에이전트</p>
              <p className="font-semibold text-gray-900">{proposal.agent_name}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">제안 시각</p>
              <p className="font-semibold text-gray-900">{new Date(proposal.proposed_at).toLocaleString("ko")}</p>
            </div>
            {detail?.target_status && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">목표 상태</p>
                <p className="font-semibold text-gray-900">{detail.target_status}</p>
              </div>
            )}
            {detail?.proposal_reason && (
              <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                <p className="text-xs font-semibold text-gray-500 mb-1">제안 사유</p>
                <p className="text-gray-700">{detail.proposal_reason}</p>
              </div>
            )}
          </div>

          {/* 요약 */}
          <div className="rounded-xl border border-gray-200 p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">변경 요약</p>
            <p className="text-sm text-gray-700">{proposal.summary}</p>
          </div>

          {/* Diff 뷰 */}
          {detailQ.isLoading ? (
            <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          ) : detail ? (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">변경 내용 비교</h3>
              <DiffViewer
                original={detail.original_content}
                proposed={detail.proposed_content}
              />
            </div>
          ) : null}

          {/* 피드백 + 액션 */}
          {isPending && (
            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-900">검토 피드백 (선택)</h3>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                placeholder="피드백을 입력하세요..."
                aria-label="검토 피드백"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={rejectMut.isPending || approveMut.isPending}
                  onClick={() => rejectMut.mutate()}
                  className="flex-1 py-2.5 rounded-lg bg-red-50 border border-red-300 text-red-700 text-sm font-semibold hover:bg-red-100 transition-colors min-h-[44px] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  {rejectMut.isPending ? "처리 중..." : "거절"}
                </button>
                <button
                  type="button"
                  disabled={approveMut.isPending || rejectMut.isPending}
                  onClick={() => approveMut.mutate()}
                  className="flex-1 py-2.5 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 transition-colors min-h-[44px] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-700 focus:ring-offset-2"
                >
                  {approveMut.isPending ? "처리 중..." : "승인"}
                </button>
              </div>
            </div>
          )}

          {/* 이미 검토된 경우 */}
          {!isPending && proposal.reviewed_at && (
            <div className={cn(
              "rounded-xl border p-4",
              proposal.status === "approved" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            )}>
              <p className="text-sm font-semibold text-gray-900">
                {proposal.status === "approved" ? "승인됨" : "거절됨"}
              </p>
              <p className="text-xs text-gray-600 mt-1">{new Date(proposal.reviewed_at).toLocaleString("ko")}</p>
              {proposal.feedback && <p className="text-sm text-gray-700 mt-2">{proposal.feedback}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 일괄 처리 툴바 ───

function BatchToolbar({
  selectedIds,
  onApprove,
  onReject,
  loading,
}: {
  selectedIds: string[];
  onApprove: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  if (selectedIds.length === 0) return null;
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-xl shadow-lg px-5 py-3 flex items-center gap-4 z-40"
      role="toolbar"
      aria-label="일괄 처리"
    >
      <span className="text-sm font-semibold">{selectedIds.length}개 선택</span>
      <button
        type="button"
        disabled={loading}
        onClick={onApprove}
        className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 min-h-[40px] focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        모두 승인
      </button>
      <button
        type="button"
        disabled={loading}
        onClick={onReject}
        className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 min-h-[40px] focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        모두 거절
      </button>
    </div>
  );
}

// ═══════════════════════════════════════
// AdminProposalsPage
// ═══════════════════════════════════════

type LastBatchOp = {
  ids: string[];
  action: "approve" | "reject";
};

const UNDO_SECONDS = 30;

export function AdminProposalsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [lastBatchOp, setLastBatchOp] = useState<LastBatchOp | null>(null);
  const [undoCountdown, setUndoCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // F-05 시정(2026-04-18): 효과 본문 동기 setState (set-state-in-effect) 제거.
  //   lastBatchOp 변화 시점을 기준으로 Date.now() 경과를 계산하여 매 tick 에서
  //   setUndoCountdown — 리셋을 위한 동기 setState 호출이 사라짐.
  useEffect(() => {
    if (!lastBatchOp) return;
    const startedAt = Date.now();
    countdownRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = UNDO_SECONDS - elapsed;
      if (remaining <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setUndoCountdown(0);
        setLastBatchOp(null);
        return;
      }
      setUndoCountdown(remaining);
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [lastBatchOp]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "proposals", page, statusFilter],
    queryFn: () => proposalsApi.list({ page, page_size: 20, status: statusFilter || undefined }),
    refetchInterval: 15_000,
  });

  const batchRollbackMut = useMutation({
    mutationFn: (op: LastBatchOp) => proposalsApi.batchRollback(op.ids, op.action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "proposals"] });
      if (countdownRef.current) clearInterval(countdownRef.current);
      setLastBatchOp(null);
      setUndoCountdown(0);
    },
  });

  const batchApproveMut = useMutation({
    mutationFn: () => proposalsApi.batchApprove([...checkedIds]),
    onSuccess: () => {
      const ids = [...checkedIds];
      qc.invalidateQueries({ queryKey: ["admin", "proposals"] });
      setCheckedIds(new Set());
      // F-05: 카운트다운 초기값은 이벤트 핸들러(여기) 에서 설정 — effect 내부
      //   동기 setState 경로를 제거하기 위함.
      setUndoCountdown(UNDO_SECONDS);
      setLastBatchOp({ ids, action: "approve" });
    },
  });

  const batchRejectMut = useMutation({
    mutationFn: () => proposalsApi.batchReject([...checkedIds]),
    onSuccess: () => {
      const ids = [...checkedIds];
      qc.invalidateQueries({ queryKey: ["admin", "proposals"] });
      setCheckedIds(new Set());
      setUndoCountdown(UNDO_SECONDS);
      setLastBatchOp({ ids, action: "reject" });
    },
  });

  const proposals = data?.data ?? [];
  const meta = data?.meta;
  const batchLoading = batchApproveMut.isPending || batchRejectMut.isPending;
  const pendingProposals = proposals.filter((p) => p.status === "pending");

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (checkedIds.size === pendingProposals.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(pendingProposals.map((p) => p.id)));
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl pb-24">
      {lastBatchOp && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl text-sm font-medium"
        >
          <span>
            {lastBatchOp.action === "approve" ? "승인" : "거절"} 완료 — {lastBatchOp.ids.length}건
          </span>
          <span className="text-gray-400 tabular-nums">{undoCountdown}초</span>
          <button
            type="button"
            onClick={() => batchRollbackMut.mutate(lastBatchOp)}
            disabled={batchRollbackMut.isPending}
            className="ml-1 px-3 py-1 rounded-lg bg-white text-gray-900 font-semibold text-xs hover:bg-gray-100 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white min-h-[32px]"
          >
            {batchRollbackMut.isPending ? "처리 중…" : "되돌리기"}
          </button>
        </div>
      )}

      {selected && (
        <ProposalDetailPanel
          proposal={selected}
          onClose={() => setSelected(null)}
          onReviewed={() => qc.invalidateQueries({ queryKey: ["admin", "proposals"] })}
        />
      )}

      <BatchToolbar
        selectedIds={[...checkedIds]}
        onApprove={() => batchApproveMut.mutate()}
        onReject={() => batchRejectMut.mutate()}
        loading={batchLoading}
      />

      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">에이전트 제안 큐</h1>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); setCheckedIds(new Set()); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[40px]"
            aria-label="상태 필터"
          >
            <option value="">전체</option>
            <option value="pending">대기</option>
            <option value="approved">승인</option>
            <option value="rejected">거절</option>
          </select>
          <button
            type="button"
            onClick={() => refetch()}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 min-h-[40px] focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="새로고침"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : isError ? (
        <div className="flex flex-col items-center py-12 gap-3">
          <p className="text-sm text-gray-500">제안 목록을 불러오지 못했습니다.</p>
          <button type="button" onClick={() => refetch()} className="text-sm text-red-700 font-semibold px-4 py-2 rounded-lg hover:bg-red-50 min-h-[44px]">다시 시도</button>
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-sm">제안이 없습니다.</div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 w-10">
                      {statusFilter === "pending" || statusFilter === "" ? (
                        <input
                          type="checkbox"
                          checked={pendingProposals.length > 0 && checkedIds.size === pendingProposals.length}
                          onChange={toggleAll}
                          className="w-4 h-4 text-red-700 rounded focus:ring-red-500"
                          aria-label="전체 선택"
                        />
                      ) : null}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">에이전트</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">문서</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">요약</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상태</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">제안 시각</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {proposals.map((p) => (
                    <tr
                      key={p.id}
                      className={cn("hover:bg-gray-50 transition-colors cursor-pointer", checkedIds.has(p.id) && "bg-red-50")}
                      onClick={() => setSelected(p)}
                    >
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {p.status === "pending" && (
                          <input
                            type="checkbox"
                            checked={checkedIds.has(p.id)}
                            onChange={() => toggleCheck(p.id)}
                            className="w-4 h-4 text-red-700 rounded focus:ring-red-500"
                            aria-label={`${p.document_title} 선택`}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{p.agent_name}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-xs truncate">{p.document_title}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-sm truncate">{p.summary}</td>
                      <td className="px-4 py-3"><ProposalStatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(p.proposed_at).toLocaleString("ko", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelected(p)}
                          className="text-xs font-semibold text-red-700 hover:text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50 min-h-[36px] focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          상세
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 min-h-[40px]">이전</button>
              <span className="text-sm text-gray-600">{page} / {meta.total_pages}</span>
              <button type="button" disabled={page >= meta.total_pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 min-h-[40px]">다음</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
