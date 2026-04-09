"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { diffApi } from "@/lib/api/diff";
import type { DiffResult, NodeDiff, ChangeType } from "@/types/diff";
import { InlineDiffRenderer } from "./InlineDiffRenderer";
import { SkeletonBlock } from "@/components/feedback/SkeletonBlock";
import { ErrorState } from "@/components/feedback/ErrorState";

// ---------------------------------------------------------------------------
// 변경 유형별 시각 표현
// ---------------------------------------------------------------------------

const CHANGE_CONFIG: Record<
  ChangeType,
  {
    bgClass: string;
    borderClass: string;
    badgeClass: string;
    label: string;
    icon: string;
  }
> = {
  ADDED: {
    bgClass: "bg-green-50",
    borderClass: "border-l-4 border-green-500",
    badgeClass: "bg-green-100 text-green-800",
    label: "추가됨",
    icon: "+",
  },
  DELETED: {
    bgClass: "bg-red-50",
    borderClass: "border-l-4 border-red-500",
    badgeClass: "bg-red-100 text-red-800",
    label: "삭제됨",
    icon: "−",
  },
  MODIFIED: {
    bgClass: "bg-yellow-50",
    borderClass: "border-l-4 border-yellow-500",
    badgeClass: "bg-yellow-100 text-yellow-800",
    label: "수정됨",
    icon: "~",
  },
  MOVED: {
    bgClass: "bg-blue-50",
    borderClass: "border-l-4 border-blue-500",
    badgeClass: "bg-blue-100 text-blue-800",
    label: "이동됨",
    icon: "↕",
  },
  UNCHANGED: {
    bgClass: "bg-white",
    borderClass: "border-l-4 border-transparent",
    badgeClass: "bg-gray-100 text-gray-600",
    label: "변경 없음",
    icon: "·",
  },
};

const NODE_TYPE_LABELS: Record<string, string> = {
  section: "섹션",
  paragraph: "단락",
  list: "목록",
  table: "표",
  heading: "헤딩",
  image: "이미지",
  code: "코드",
};

function nodeTypeLabel(nodeType: string): string {
  return NODE_TYPE_LABELS[nodeType] ?? nodeType;
}

// ---------------------------------------------------------------------------
// 단일 NodeDiff 카드
// ---------------------------------------------------------------------------

interface NodeDiffCardProps {
  diff: NodeDiff;
  showInlineDiff: boolean;
}

function NodeDiffCard({ diff, showInlineDiff }: NodeDiffCardProps) {
  const [expanded, setExpanded] = useState(true);
  const cfg = CHANGE_CONFIG[diff.change_type];
  const node = diff.after ?? diff.before;

  return (
    <div
      className={`rounded-r-lg overflow-hidden mb-2 ${cfg.bgClass} ${cfg.borderClass}`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded ${cfg.badgeClass}`}
          >
            {cfg.icon}
          </span>
          <span className="text-xs text-gray-500">
            [{nodeTypeLabel(node?.node_type ?? "")}]
          </span>
          <span className="text-sm font-medium text-gray-900 truncate">
            {node?.title ?? node?.content?.slice(0, 60) ?? `노드 ${diff.node_id.slice(0, 8)}`}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className={`text-xs px-1.5 py-0.5 rounded ${cfg.badgeClass}`}>
            {cfg.label}
          </span>
          <button
            type="button"
            className="text-xs text-gray-400 hover:text-gray-600"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "∧" : "∨"}
          </button>
        </div>
      </div>

      {/* 내용 */}
      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {/* ADDED — 이후 내용 표시 */}
          {diff.change_type === "ADDED" && diff.after?.content && (
            <p className="text-sm text-green-900 whitespace-pre-wrap">
              {diff.after.content}
            </p>
          )}

          {/* DELETED — 이전 내용 표시 */}
          {diff.change_type === "DELETED" && diff.before?.content && (
            <p className="text-sm text-red-900 line-through whitespace-pre-wrap opacity-70">
              {diff.before.content}
            </p>
          )}

          {/* MODIFIED — 인라인 diff 또는 이전/이후 비교 */}
          {diff.change_type === "MODIFIED" && (
            <>
              {showInlineDiff && diff.inline_diff ? (
                <div className="text-sm text-gray-800">
                  <InlineDiffRenderer
                    tokens={diff.inline_diff}
                    skipped={diff.inline_diff_skipped}
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  {diff.before?.content && (
                    <div className="text-sm">
                      <span className="text-xs text-gray-400 mr-1">이전:</span>
                      <span className="text-red-700 line-through">
                        {diff.before.content}
                      </span>
                    </div>
                  )}
                  {diff.after?.content && (
                    <div className="text-sm">
                      <span className="text-xs text-gray-400 mr-1">이후:</span>
                      <span className="text-green-700">
                        {diff.after.content}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* MOVED — 위치 변경 정보 */}
          {diff.change_type === "MOVED" && diff.move_info && (
            <div className="text-xs text-blue-700">
              {diff.move_info.move_type === "HIERARCHY_CHANGE"
                ? `상위 노드 변경 (순서: ${diff.move_info.old_order} → ${diff.move_info.new_order})`
                : `순서 변경: ${diff.move_info.old_order} → ${diff.move_info.new_order}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// DiffViewer (Unified 뷰)
// ---------------------------------------------------------------------------

interface DiffViewerProps {
  documentId: string;
  /** 이전 버전 (before) */
  versionAId: string;
  /** 이후 버전 (after) */
  versionBId: string;
  /** 인라인 compact 모드 (검토 화면 내 임베드용) */
  compact?: boolean;
}

export function DiffViewer({
  documentId,
  versionAId,
  versionBId,
  compact = false,
}: DiffViewerProps) {
  const [showInlineDiff, setShowInlineDiff] = useState(false);
  const [showUnchanged, setShowUnchanged] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery<DiffResult>({
    queryKey: ["diff", documentId, versionAId, versionBId, showInlineDiff, showUnchanged],
    queryFn: () =>
      diffApi.getBetweenVersions(documentId, versionAId, versionBId, {
        inline_diff: showInlineDiff,
        include_unchanged: showUnchanged,
      }),
  });

  if (isLoading) return <SkeletonBlock rows={compact ? 4 : 8} />;
  if (isError)
    return (
      <ErrorState
        description="변경 내용을 불러오지 못했습니다."
        retry={refetch}
      />
    );
  if (!data) return null;

  const { nodes, summary, version_a, version_b } = data;

  const visibleNodes = showUnchanged
    ? nodes
    : nodes.filter((n) => n.change_type !== "UNCHANGED");

  const hasChanges =
    summary.total_added > 0 ||
    summary.total_deleted > 0 ||
    summary.total_modified > 0 ||
    summary.total_moved > 0;

  return (
    <div className="space-y-3">
      {/* 컨트롤 바 */}
      {!compact && (
        <div className="flex items-center gap-3 flex-wrap text-sm">
          <span className="text-gray-600 font-medium">
            v{version_a.version_number} → v{version_b.version_number}
          </span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showInlineDiff}
              onChange={(e) => setShowInlineDiff(e.target.checked)}
              className="rounded"
            />
            <span className="text-gray-600">인라인 Diff</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showUnchanged}
              onChange={(e) => setShowUnchanged(e.target.checked)}
              className="rounded"
            />
            <span className="text-gray-600">변경 없는 항목 보기</span>
          </label>
        </div>
      )}

      {/* 변경 없음 */}
      {!hasChanges && (
        <div className="text-center py-8 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg">
          두 버전 간 변경 사항이 없습니다.
        </div>
      )}

      {/* 노드 목록 */}
      {hasChanges && visibleNodes.length === 0 && (
        <div className="text-center py-6 text-sm text-gray-400">
          변경된 항목이 없습니다.
        </div>
      )}

      <div className={compact ? "max-h-96 overflow-y-auto pr-1" : ""}>
        {visibleNodes.map((nd) => (
          <NodeDiffCard
            key={nd.node_id}
            diff={nd}
            showInlineDiff={showInlineDiff}
          />
        ))}
      </div>
    </div>
  );
}
