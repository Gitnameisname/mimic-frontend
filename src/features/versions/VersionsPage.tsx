"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { versionsApi } from "@/lib/api";
import { WorkflowStatusBadge } from "@/components/badge/WorkflowStatusBadge";
import { SkeletonBlock } from "@/components/feedback/SkeletonBlock";
import { ErrorState } from "@/components/feedback/ErrorState";
import { EmptyState } from "@/components/feedback/EmptyState";
import { PageHeader } from "@/components/page/PageHeader";
import { formatDate } from "@/lib/utils";

interface Props {
  documentId: string;
}

export function VersionsPage({ documentId }: Props) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["versions", documentId],
    queryFn: () => versionsApi.list(documentId),
  });

  const versions = data ?? [];
  const latestId = versions[0]?.id;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader
        title="버전 기록"
        actions={
          <Link href={`/documents/${documentId}`} className="text-sm text-gray-500 hover:text-gray-700">
            ← 문서로 돌아가기
          </Link>
        }
      />

      {isLoading && <SkeletonBlock rows={6} />}
      {isError && (
        <ErrorState description="버전 목록을 불러오지 못했습니다." retry={refetch} />
      )}
      {!isLoading && !isError && versions.length === 0 && (
        <EmptyState title="버전 기록이 없습니다" />
      )}

      {!isLoading && !isError && versions.length > 0 && (
        <div className="relative">
          {/* Timeline 라인 */}
          <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-gray-200" />

          <ul className="space-y-4">
            {versions.map((v) => {
              const isLatest = v.id === latestId;
              return (
                <li key={v.id} className="relative flex gap-5 pl-8">
                  {/* 타임라인 점 */}
                  <div
                    className={`absolute left-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold
                      ${isLatest ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-300 text-gray-500"}`}
                  >
                    ●
                  </div>

                  <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">
                        v{v.version_number}
                      </span>
                      <WorkflowStatusBadge status={v.workflow_status} />
                      {isLatest && (
                        <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
                          현재 버전
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      {v.created_by_name} · {formatDate(v.created_at)}
                    </div>
                    {v.change_reason && (
                      <p className="mt-1 text-sm text-gray-700">
                        &ldquo;{v.change_reason}&rdquo;
                      </p>
                    )}
                    <div className="mt-2">
                      <Link
                        href={`/documents/${documentId}/versions/${v.id}`}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        상세 보기 →
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
