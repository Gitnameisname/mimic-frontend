"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { diffApi } from "@/lib/api/diff";
import type { DiffSummaryResponse, ChangedSection } from "@/types/diff";

interface Props {
  documentId: string;
  versionId: string;
  /** 비교 기준 버전 ID. 미지정 시 직전 버전 자동 탐색 */
  baseVersionId?: string;
  /** 배너 제목 (기본: "변경 내용") */
  label?: string;
  /** 상세 보기 토글 이벤트 */
  onToggleDetail?: () => void;
  /** 상세 보기 현재 상태 */
  showDetail?: boolean;
}

const CHANGE_TYPE_LABELS: Record<string, string> = {
  ADDED: "추가",
  DELETED: "삭제",
  MODIFIED: "수정",
  MOVED: "이동",
};

const CHANGE_TYPE_COLORS: Record<string, string> = {
  ADDED: "bg-green-50 text-green-700 border-green-200",
  DELETED: "bg-red-50 text-red-700 border-red-200",
  MODIFIED: "bg-yellow-50 text-yellow-700 border-yellow-200",
  MOVED: "bg-blue-50 text-blue-700 border-blue-200",
};

function SectionChip({
  section,
  onClick,
}: {
  section: ChangedSection;
  onClick?: () => void;
}) {
  const colorClass =
    CHANGE_TYPE_COLORS[section.change_type] ??
    "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-xs border rounded px-2 py-0.5 transition-colors hover:opacity-80 ${colorClass}`}
    >
      <span>{CHANGE_TYPE_LABELS[section.change_type] ?? section.change_type}</span>
      <span className="font-medium truncate max-w-[120px]">
        {section.title ?? section.node_id.slice(0, 8)}
      </span>
      {section.sub_changes > 0 && (
        <span className="opacity-60">+{section.sub_changes}</span>
      )}
    </button>
  );
}

function BannerSkeleton() {
  return (
    <div className="border border-gray-200 rounded-lg p-3 animate-pulse bg-white">
      <div className="h-4 bg-gray-200 rounded w-48 mb-2" />
      <div className="flex gap-2">
        <div className="h-5 bg-gray-200 rounded w-20" />
        <div className="h-5 bg-gray-200 rounded w-24" />
      </div>
    </div>
  );
}

export function DiffSummaryBanner({
  documentId,
  versionId,
  baseVersionId,
  label = "변경 내용",
  onToggleDetail,
  showDetail = false,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const { data, isLoading, isError } = useQuery<DiffSummaryResponse>({
    queryKey: ["diff-summary", documentId, versionId, baseVersionId],
    queryFn: () =>
      baseVersionId
        ? diffApi.getSummaryBetween(documentId, baseVersionId, versionId)
        : diffApi.getSummaryWithPrevious(documentId, versionId),
    retry: 1,
  });

  if (isLoading) return <BannerSkeleton />;

  // NO_PREVIOUS_VERSION — 첫 버전은 배너 숨김
  if (isError) return null;

  if (!data) return null;

  const { summary, version_a } = data;
  const hasChanges =
    summary.total_added > 0 ||
    summary.total_deleted > 0 ||
    summary.total_modified > 0 ||
    summary.total_moved > 0;

  if (!hasChanges) return null;

  const baseLabel = version_a
    ? `v${version_a.version_number}`
    : "이전 버전";

  return (
    <div className="border border-amber-200 bg-amber-50 rounded-lg overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold text-amber-800 shrink-0">
            {label}
          </span>
          <span className="text-xs text-amber-600 shrink-0">
            ({baseLabel} → 현재)
          </span>
          <span className="text-xs text-amber-800 font-medium truncate">
            {summary.description}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          {onToggleDetail && (
            <button
              type="button"
              onClick={onToggleDetail}
              className="text-xs text-amber-700 hover:text-amber-900 underline underline-offset-2"
            >
              {showDetail ? "변경 내용 접기 ∧" : "변경 내용 상세 보기 ∨"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-amber-600 hover:text-amber-800"
            aria-label={expanded ? "섹션 목록 접기" : "섹션 목록 펼치기"}
          >
            {expanded ? "∧" : "∨"}
          </button>
        </div>
      </div>

      {/* 카운트 요약 바 */}
      <div className="flex items-center gap-2 px-4 pb-2.5 flex-wrap">
        {summary.total_added > 0 && (
          <span className="text-xs bg-green-100 text-green-700 rounded px-1.5 py-0.5">
            +{summary.total_added} 추가
          </span>
        )}
        {summary.total_deleted > 0 && (
          <span className="text-xs bg-red-100 text-red-700 rounded px-1.5 py-0.5">
            -{summary.total_deleted} 삭제
          </span>
        )}
        {summary.total_modified > 0 && (
          <span className="text-xs bg-yellow-100 text-yellow-700 rounded px-1.5 py-0.5">
            ~{summary.total_modified} 수정
          </span>
        )}
        {summary.total_moved > 0 && (
          <span className="text-xs bg-blue-100 text-blue-700 rounded px-1.5 py-0.5">
            ↕{summary.total_moved} 이동
          </span>
        )}
      </div>

      {/* 변경된 섹션 칩 (expanded) */}
      {expanded && summary.changed_sections.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5 border-t border-amber-200 pt-2.5">
          {summary.changed_sections.map((s) => (
            <SectionChip key={s.node_id} section={s} />
          ))}
        </div>
      )}
    </div>
  );
}
