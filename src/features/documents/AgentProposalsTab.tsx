"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proposalsApi, getApiErrorMessage } from "@/lib/api";
import type { AgentProposal } from "@/lib/api";
import { toast } from "@/stores/uiStore";
import { Button } from "@/components/button/Button";
import { SkeletonBlock } from "@/components/feedback/SkeletonBlock";

interface Props {
  documentId: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "검토 대기",
  approved: "승인됨",
  rejected: "반려됨",
  withdrawn: "회수됨",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  withdrawn: "bg-gray-100 text-gray-600",
};

const TAB_STATUSES = ["pending", "approved", "rejected", "withdrawn"] as const;
type TabStatus = (typeof TAB_STATUSES)[number];

export function AgentProposalsTab({ documentId }: Props) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabStatus>("pending");
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const proposalsQuery = useQuery({
    queryKey: ["my-proposals", documentId, activeTab],
    queryFn: () =>
      proposalsApi.listMine({ status: activeTab, page_size: 50 }),
  });

  const proposals: AgentProposal[] = proposalsQuery.data?.items ?? [];

  // documentId 기준으로 이 문서 소속 제안만 필터
  const filtered = proposals.filter(
    (p) => !p.document_id || p.document_id === documentId
  );

  const approveMutation = useMutation({
    mutationFn: (draftId: string) =>
      proposalsApi.approveDraft(draftId, { notes: "문서 검토 완료" }),
    onSuccess: () => {
      toast("제안이 승인되었습니다", "success");
      qc.invalidateQueries({ queryKey: ["my-proposals", documentId] });
      qc.invalidateQueries({ queryKey: ["version-latest", documentId] });
    },
    onError: (err) =>
      toast(getApiErrorMessage(err, "승인에 실패했습니다"), "error"),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ draftId, reason }: { draftId: string; reason: string }) =>
      proposalsApi.rejectDraft(draftId, { reason }),
    onSuccess: () => {
      toast("제안이 반려되었습니다", "success");
      setRejectTarget(null);
      setRejectReason("");
      qc.invalidateQueries({ queryKey: ["my-proposals", documentId] });
    },
    onError: (err) =>
      toast(getApiErrorMessage(err, "반려에 실패했습니다"), "error"),
  });

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
        AI 에이전트 제안
      </p>

      {/* 상태 탭 */}
      <div
        className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit"
        role="tablist"
        aria-label="제안 상태 탭"
      >
        {TAB_STATUSES.map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={activeTab === s}
            onClick={() => setActiveTab(s)}
            className={[
              "px-3 py-1 rounded text-sm font-medium transition-colors min-h-[36px]",
              activeTab === s
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            ].join(" ")}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* 제안 목록 */}
      {proposalsQuery.isLoading ? (
        <SkeletonBlock rows={3} />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">
          {activeTab === "pending"
            ? "검토 대기 중인 에이전트 제안이 없습니다."
            : `${STATUS_LABELS[activeTab]} 제안이 없습니다.`}
        </p>
      ) : (
        <ul className="space-y-3" aria-label="에이전트 제안 목록">
          {filtered.map((p) => (
            <ProposalCard
              key={p.id}
              proposal={p}
              onApprove={() => approveMutation.mutate(p.reference_id)}
              onReject={() => setRejectTarget(p.reference_id)}
              isApproving={
                approveMutation.isPending &&
                approveMutation.variables === p.reference_id
              }
            />
          ))}
        </ul>
      )}

      {/* 반려 사유 입력 모달 */}
      {rejectTarget && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-label="반려 사유 입력"
        >
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-base font-semibold text-gray-900 mb-3">
              반려 사유 입력
            </h3>
            <textarea
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="반려 사유를 입력하세요"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              aria-label="반려 사유"
            />
            <div className="flex gap-2 mt-4 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
              >
                취소
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!rejectReason.trim() || rejectMutation.isPending}
                onClick={() =>
                  rejectMutation.mutate({
                    draftId: rejectTarget,
                    reason: rejectReason.trim(),
                  })
                }
              >
                {rejectMutation.isPending ? "처리 중..." : "반려"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProposalCard
// ---------------------------------------------------------------------------

interface CardProps {
  proposal: AgentProposal;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
}

function ProposalCard({ proposal: p, onApprove, onReject, isApproving }: CardProps) {
  const [expanded, setExpanded] = useState(false);

  const createdAt = p.created_at
    ? new Date(p.created_at).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <li className="border border-gray-200 rounded-lg p-4 bg-white hover:border-blue-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* 에이전트명 + 상태 배지 */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-medium text-gray-900 truncate">
              {p.agent_name ?? `에이전트 ${p.agent_id.slice(0, 8)}...`}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status]}`}
            >
              {STATUS_LABELS[p.status]}
            </span>
          </div>

          {/* 제안된 버전 제목 */}
          {p.version_title && (
            <p className="text-sm text-gray-700 truncate">{p.version_title}</p>
          )}

          {/* 생성 시각 */}
          <p className="text-xs text-gray-400 mt-1">{createdAt}</p>

          {/* 내용 미리보기 (접기/펼치기) */}
          {p.content_preview && (
            <div className="mt-2">
              <button
                className="text-xs text-blue-600 hover:underline"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
              >
                {expanded ? "내용 접기" : "내용 미리보기"}
              </button>
              {expanded && (
                <pre className="mt-2 text-xs text-gray-600 bg-gray-50 rounded p-3 overflow-x-auto whitespace-pre-wrap break-words max-h-48">
                  {p.content_preview}
                </pre>
              )}
            </div>
          )}

          {/* 반려/회수 사유 */}
          {(p.status === "rejected" || p.status === "withdrawn") && p.review_notes && (
            <p className="mt-2 text-xs text-red-600 bg-red-50 rounded p-2">
              사유: {p.review_notes}
            </p>
          )}
        </div>

        {/* 승인/반려 버튼 (pending 상태만) */}
        {p.status === "pending" && (
          <div className="flex gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              disabled={isApproving}
              onClick={onApprove}
              aria-label="제안 승인"
            >
              {isApproving ? "..." : "승인"}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={onReject}
              aria-label="제안 반려"
            >
              반려
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}
