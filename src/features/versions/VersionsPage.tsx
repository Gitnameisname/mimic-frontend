"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { versionsApi } from "@/lib/api";
import { diffApi } from "@/lib/api/diff";
import { WorkflowStatusBadge } from "@/components/badge/WorkflowStatusBadge";
import { SkeletonBlock } from "@/components/feedback/SkeletonBlock";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { PageHeader } from "@/components/page/PageHeader";
import { formatDate } from "@/lib/utils";
import type { Version } from "@/types";
import type { DiffSummaryResponse } from "@/types/diff";

interface Props {
  documentId: string;
}

/** 버전 항목 하나 + 인접 버전 대비 변경 요약 */
function VersionTimelineItem({
  version,
  prevVersion,
  documentId,
  isLatest,
}: {
  version: Version;
  prevVersion: Version | null;
  documentId: string;
  isLatest: boolean;
}) {
  // 직전 버전 대비 변경 요약 (lazy — prevVersion이 있을 때만)
  const { data: summaryData } = useQuery<DiffSummaryResponse>({
    queryKey: ["diff-summary", documentId, version.id],
    queryFn: () =>
      diffApi.getSummaryWithPrevious(documentId, version.id),
    enabled: !!prevVersion,
    retry: false,
  });

  const isPublished = version.workflow_status === "PUBLISHED";
  const isFirstVersion = !prevVersion;

  return (
    <li className="relative flex gap-5 pl-8">
      {/* 타임라인 점 */}
      <div
        className={`absolute left-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold z-10
          ${isPublished
            ? "bg-purple-600 border-purple-600 text-white"
            : isLatest
            ? "bg-blue-600 border-blue-600 text-white"
            : "bg-white border-gray-300 text-gray-500"
          }`}
      >
        {isPublished ? "★" : "●"}
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4">
        {/* 헤더 행 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900">
            v{version.version_number}
          </span>
          <WorkflowStatusBadge status={version.workflow_status} />
          {isLatest && (
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
              현재 버전
            </span>
          )}
          {isPublished && (
            <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded">
              ★ Published
            </span>
          )}
          {isFirstVersion && (
            <span className="text-xs bg-gray-50 text-gray-500 border border-gray-200 px-1.5 py-0.5 rounded">
              최초 작성
            </span>
          )}
        </div>

        {/* 메타 */}
        <div className="mt-1 text-sm text-gray-500">
          {version.created_by_name} · {formatDate(version.created_at)}
        </div>

        {/* 변경 사유 */}
        {version.change_reason && (
          <p className="mt-1.5 text-sm text-gray-700 italic">
            &ldquo;{version.change_reason}&rdquo;
          </p>
        )}

        {/* diff 변경 요약 (이전 버전 존재 시) */}
        {summaryData && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-400">변경:</span>
            <span className="text-xs text-gray-600">
              {summaryData.summary.description}
            </span>
            <div className="flex gap-1">
              {summaryData.summary.total_added > 0 && (
                <span className="text-xs bg-green-50 text-green-700 px-1 rounded">
                  +{summaryData.summary.total_added}
                </span>
              )}
              {summaryData.summary.total_deleted > 0 && (
                <span className="text-xs bg-red-50 text-red-700 px-1 rounded">
                  -{summaryData.summary.total_deleted}
                </span>
              )}
              {summaryData.summary.total_modified > 0 && (
                <span className="text-xs bg-yellow-50 text-yellow-700 px-1 rounded">
                  ~{summaryData.summary.total_modified}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="mt-2.5 flex items-center gap-3 flex-wrap">
          <Link
            href={`/documents/${documentId}/versions/${version.id}`}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            상세 보기 →
          </Link>
          {!isFirstVersion && (
            <Link
              href={`/documents/${documentId}/versions/${version.id}/compare`}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              직전 버전과 비교 →
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}

export function VersionsPage({ documentId }: Props) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["versions", documentId],
    queryFn: () => versionsApi.list(documentId),
  });

  const versions: Version[] = data ?? [];
  const latestId = versions[0]?.id;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="버전 기록"
        actions={
          <Link
            href={`/documents/${documentId}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← 문서로 돌아가기
          </Link>
        }
      />

      {isLoading && <SkeletonBlock rows={6} />}
      {isError && (
        <ErrorState
          description="버전 목록을 불러오지 못했습니다."
          retry={refetch}
        />
      )}
      {!isLoading && !isError && versions.length === 0 && (
        <EmptyState title="버전 기록이 없습니다" />
      )}

      {!isLoading && !isError && versions.length > 0 && (
        <div className="relative">
          {/* Timeline 라인 */}
          <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-gray-200" />

          <ul className="space-y-4">
            {versions.map((v, idx) => {
              const prevVersion = idx < versions.length - 1 ? versions[idx + 1] : null;
              return (
                <VersionTimelineItem
                  key={v.id}
                  version={v}
                  prevVersion={prevVersion}
                  documentId={documentId}
                  isLatest={v.id === latestId}
                />
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
