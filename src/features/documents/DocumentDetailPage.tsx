"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi, versionsApi, nodesApi, workflowApi } from "@/lib/api";
import { toast } from "@/stores/uiStore";
import { WorkflowStatusBadge } from "@/components/badge/WorkflowStatusBadge";
import { DocumentTypeBadge } from "@/components/badge/DocumentTypeBadge";
import { Button } from "@/components/button/Button";
import { SkeletonBlock } from "@/components/feedback/SkeletonBlock";
import { ErrorState } from "@/components/feedback/ErrorState";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { DocumentTree } from "./DocumentTree";
import { NodeRenderer } from "./NodeRenderer";
import { WorkflowActionModal } from "../workflow/WorkflowActionModal";
import { RagPanel } from "../rag/RagPanel";
import { formatDate, relativeTime } from "@/lib/utils";
import type { WorkflowStatus, WorkflowAction } from "@/types";

interface Props {
  documentId: string;
}

export function DocumentDetailPage({ documentId }: Props) {
  const qc = useQueryClient();
  const [actionModal, setActionModal] = useState<"approve" | "reject" | "submit-review" | null>(null);
  const [publishConfirm, setPublishConfirm] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [ragOpen, setRagOpen] = useState(false);

  const docQuery = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => documentsApi.get(documentId),
  });

  const versionQuery = useQuery({
    queryKey: ["version-latest", documentId],
    queryFn: () => versionsApi.getLatest(documentId),
    enabled: !!docQuery.data,
  });

  const nodesQuery = useQuery({
    queryKey: ["nodes", documentId],
    queryFn: () => nodesApi.list(documentId),
    enabled: !!versionQuery.data,
  });

  const historyQuery = useQuery({
    queryKey: ["workflow-history", documentId, versionQuery.data?.id],
    queryFn: () => workflowApi.getHistory(documentId, versionQuery.data!.id),
    enabled: !!versionQuery.data && historyExpanded,
  });

  const publishMutation = useMutation({
    mutationFn: () =>
      workflowApi.publish(documentId, versionQuery.data!.id),
    onSuccess: () => {
      toast("문서가 발행되었습니다", "success");
      qc.invalidateQueries({ queryKey: ["version-latest", documentId] });
      setPublishConfirm(false);
    },
    onError: () => toast("발행에 실패했습니다", "error"),
  });

  const doc = docQuery.data;
  const version = versionQuery.data;
  const nodes = nodesQuery.data ?? [];
  const status = version?.workflow_status as WorkflowStatus | undefined;

  if (docQuery.isLoading || versionQuery.isLoading) {
    return (
      <div className="p-6">
        <SkeletonBlock rows={3} className="mb-6" />
        <SkeletonBlock rows={8} />
      </div>
    );
  }

  if (docQuery.isError) {
    return <ErrorState description="문서를 불러오지 못했습니다." retry={docQuery.refetch} className="mt-16" />;
  }

  if (!doc || !version) return null;

  return (
    <div className="flex h-full">
      {/* 구조 트리 — RAG 열리면 숨김 */}
      {!ragOpen && (
        <aside className="w-52 shrink-0 border-r border-gray-200 bg-white overflow-y-auto py-4">
          <p className="px-3 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            문서 구조
          </p>
          <DocumentTree nodes={nodes} />
        </aside>
      )}

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {/* Document Header */}
          <div className="mb-6">
            <Link
              href="/documents"
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3"
            >
              ← 문서 목록
            </Link>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold text-gray-900 flex-1">{doc.title}</h1>
              <WorkflowStatusBadge status={status!} />
            </div>
            <div className="mt-2 flex items-center gap-3 text-sm text-gray-500 flex-wrap">
              <DocumentTypeBadge type={doc.document_type} />
              <span>v{version.version_number}</span>
              <span>작성자: {doc.created_by_name}</span>
              <span>수정: {relativeTime(version.updated_at)}</span>
            </div>

            {/* 액션 버튼 */}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              {status === "DRAFT" && (
                <>
                  <Link href={`/documents/${documentId}/edit`}>
                    <Button variant="secondary" size="sm">편집</Button>
                  </Link>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActionModal("submit-review")}
                  >
                    검토 요청
                  </Button>
                </>
              )}
              {status === "IN_REVIEW" && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setActionModal("approve")}
                  >
                    승인
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setActionModal("reject")}
                  >
                    반려
                  </Button>
                </>
              )}
              {status === "APPROVED" && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setPublishConfirm(true)}
                >
                  발행
                </Button>
              )}
              {status === "REJECTED" && (
                <Link href={`/documents/${documentId}/edit`}>
                  <Button variant="secondary" size="sm">편집</Button>
                </Link>
              )}
              <Link href={`/documents/${documentId}/versions`}>
                <Button variant="ghost" size="sm">버전 목록</Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRagOpen((v) => !v)}
                className={ragOpen ? "bg-blue-50 text-blue-700 border-blue-200" : ""}
              >
                💬 AI 질의
              </Button>
            </div>
          </div>

          {/* 문서 본문 */}
          <div className="prose prose-sm max-w-none">
            {nodesQuery.isLoading ? (
              <SkeletonBlock rows={10} />
            ) : nodes.length === 0 ? (
              <p className="text-gray-400 italic">문서 내용이 없습니다.</p>
            ) : (
              <NodeRenderer nodes={nodes} />
            )}
          </div>

          {/* 메타데이터 패널 */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              문서 정보
            </p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <dt className="text-gray-500">생성일</dt>
                <dd className="text-gray-900">{formatDate(doc.created_at)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">최종 수정</dt>
                <dd className="text-gray-900">{formatDate(version.updated_at)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">작성자</dt>
                <dd className="text-gray-900">{doc.created_by_name}</dd>
              </div>
              <div>
                <dt className="text-gray-500">현재 버전</dt>
                <dd className="text-gray-900">v{version.version_number}</dd>
              </div>
            </dl>
          </div>

          {/* 워크플로 이력 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 hover:text-gray-700 transition-colors"
              onClick={() => setHistoryExpanded((v) => !v)}
            >
              <span>{historyExpanded ? "▼" : "▶"}</span>
              워크플로 이력
            </button>
            {historyExpanded && (
              <WorkflowHistory
                items={historyQuery.data ?? []}
                isLoading={historyQuery.isLoading}
              />
            )}
          </div>
        </div>
      </div>

      {/* RAG 패널 */}
      {ragOpen && (
        <RagPanel documentId={documentId} onClose={() => setRagOpen(false)} />
      )}

      {/* 워크플로 액션 모달 */}
      {actionModal && (
        <WorkflowActionModal
          action={actionModal}
          documentId={documentId}
          versionId={version.id}
          onClose={() => setActionModal(null)}
          onSuccess={() => {
            setActionModal(null);
            qc.invalidateQueries({ queryKey: ["version-latest", documentId] });
          }}
        />
      )}

      {/* 발행 확인 */}
      <ConfirmDialog
        open={publishConfirm}
        title="문서를 발행하시겠습니까?"
        message="발행 후에는 편집이 불가합니다. 계속하시겠습니까?"
        confirmLabel="발행"
        loading={publishMutation.isPending}
        onConfirm={() => publishMutation.mutate()}
        onCancel={() => setPublishConfirm(false)}
      />
    </div>
  );
}

const ACTION_LABELS: Record<WorkflowAction, string> = {
  "submit-review": "검토 요청",
  approve: "승인",
  reject: "반려",
  publish: "발행",
  archive: "보관",
  "return-to-draft": "초안으로 복귀",
};

const ACTION_COLORS: Record<WorkflowAction, string> = {
  "submit-review": "bg-blue-100 text-blue-700",
  approve: "bg-green-100 text-green-700",
  reject: "bg-red-100 text-red-700",
  publish: "bg-teal-100 text-teal-700",
  archive: "bg-zinc-100 text-zinc-600",
  "return-to-draft": "bg-gray-100 text-gray-700",
};

function WorkflowHistory({
  items,
  isLoading,
}: {
  items: import("@/types").WorkflowHistoryItem[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 italic">이력이 없습니다.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="flex items-start gap-3 text-sm">
          <span
            className={`shrink-0 text-xs px-2 py-0.5 rounded font-medium ${ACTION_COLORS[item.action]}`}
          >
            {ACTION_LABELS[item.action]}
          </span>
          <div className="flex-1 min-w-0">
            <span className="text-gray-700">{item.actor_name}</span>
            {item.comment && (
              <p className="text-gray-500 truncate">&ldquo;{item.comment}&rdquo;</p>
            )}
            {item.reason && (
              <p className="text-gray-500 truncate">사유: {item.reason}</p>
            )}
          </div>
          <span className="shrink-0 text-xs text-gray-400">
            {formatDate(item.created_at)}
          </span>
        </li>
      ))}
    </ul>
  );
}
