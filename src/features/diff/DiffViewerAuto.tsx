"use client";

/**
 * 직전 버전 대비 diff를 자동으로 계산하는 DiffViewer 래퍼.
 *
 * WorkflowActionModal 등 기준 버전을 알 수 없는 컨텍스트에서 사용한다.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { diffApi } from "@/lib/api/diff";
import type { DiffResult } from "@/types/diff";
import { InlineDiffRenderer } from "./InlineDiffRenderer";
import { SkeletonBlock } from "@/components/feedback/SkeletonBlock";
import { ErrorState } from "@/components/feedback/ErrorState";
import type { ChangeType } from "@/types/diff";

const CHANGE_CONFIG: Record<ChangeType, { bgClass: string; borderClass: string; badgeClass: string; label: string; icon: string }> = {
  ADDED:     { bgClass: "bg-green-50",  borderClass: "border-l-4 border-green-500",  badgeClass: "bg-green-100 text-green-800",  label: "추가됨",    icon: "+" },
  DELETED:   { bgClass: "bg-red-50",    borderClass: "border-l-4 border-red-500",    badgeClass: "bg-red-100 text-red-800",      label: "삭제됨",    icon: "−" },
  MODIFIED:  { bgClass: "bg-yellow-50", borderClass: "border-l-4 border-yellow-500", badgeClass: "bg-yellow-100 text-yellow-800", label: "수정됨",   icon: "~" },
  MOVED:     { bgClass: "bg-blue-50",   borderClass: "border-l-4 border-blue-500",   badgeClass: "bg-blue-100 text-blue-800",    label: "이동됨",    icon: "↕" },
  UNCHANGED: { bgClass: "bg-white",     borderClass: "border-l-4 border-transparent", badgeClass: "bg-gray-100 text-gray-600",  label: "변경 없음", icon: "·" },
};

interface Props {
  documentId: string;
  versionId: string;
}

export function DiffViewerAuto({ documentId, versionId }: Props) {
  const [showInlineDiff, setShowInlineDiff] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<DiffResult>({
    queryKey: ["diff-auto", documentId, versionId, showInlineDiff],
    queryFn: () =>
      diffApi.getWithPrevious(documentId, versionId, {
        inline_diff: showInlineDiff,
      }),
    retry: 1,
  });

  if (isLoading) return <SkeletonBlock rows={4} />;
  if (isError)
    return (
      <ErrorState
        description="변경 내용을 불러오지 못했습니다."
        retry={refetch}
      />
    );
  if (!data) return null;

  const { nodes, summary } = data;
  const changedNodes = nodes.filter((n) => n.change_type !== "UNCHANGED");

  const hasChanges =
    summary.total_added > 0 ||
    summary.total_deleted > 0 ||
    summary.total_modified > 0 ||
    summary.total_moved > 0;

  return (
    <div className="space-y-2">
      {/* 인라인 diff 토글 */}
      <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
        <input
          type="checkbox"
          checked={showInlineDiff}
          onChange={(e) => setShowInlineDiff(e.target.checked)}
          className="rounded"
        />
        인라인 Diff 보기
      </label>

      {!hasChanges && (
        <div className="text-center py-4 text-xs text-gray-400 border border-dashed border-gray-300 rounded">
          변경 사항이 없습니다.
        </div>
      )}

      <div className="max-h-72 overflow-y-auto pr-1 space-y-1.5">
        {changedNodes.map((nd) => {
          const cfg = CHANGE_CONFIG[nd.change_type];
          const node = nd.after ?? nd.before;
          return (
            <div
              key={nd.node_id}
              className={`rounded-r text-xs p-2 ${cfg.bgClass} ${cfg.borderClass}`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`px-1 py-0.5 rounded font-bold ${cfg.badgeClass}`}>
                  {cfg.icon}
                </span>
                <span className="font-medium text-gray-800 truncate">
                  {node?.title ?? node?.content?.slice(0, 50) ?? nd.node_id.slice(0, 8)}
                </span>
                <span className="text-gray-400">{cfg.label}</span>
              </div>
              {nd.change_type === "MODIFIED" && showInlineDiff && nd.inline_diff && (
                <div className="mt-1 pl-4">
                  <InlineDiffRenderer tokens={nd.inline_diff} skipped={nd.inline_diff_skipped} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
