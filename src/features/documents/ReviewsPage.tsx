"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "@/lib/api";
import { PageHeader } from "@/components/page/PageHeader";
import { WorkflowStatusBadge } from "@/components/badge/WorkflowStatusBadge";
import { DocumentTypeBadge } from "@/components/badge/DocumentTypeBadge";
import { SkeletonRow } from "@/components/feedback/SkeletonBlock";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { relativeTime } from "@/lib/utils";

export function ReviewsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["documents", { status: "IN_REVIEW" }],
    queryFn: () => documentsApi.list({ status: "IN_REVIEW", limit: 50 }),
  });

  const items = data?.items ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title="검토 대기"
        description={!isLoading && !isError ? `${data?.total ?? 0}건` : undefined}
      />

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-[1fr_100px_120px_110px] gap-4 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
          <span>제목</span>
          <span>유형</span>
          <span>요청자</span>
          <span>요청일</span>
        </div>

        {isLoading && Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}

        {isError && (
          <ErrorState description="검토 목록을 불러오지 못했습니다." retry={refetch} />
        )}

        {!isLoading && !isError && items.length === 0 && (
          <EmptyState
            title="현재 검토할 문서가 없습니다"
            description="검토 요청이 들어오면 여기에 표시됩니다."
          />
        )}

        {!isLoading &&
          !isError &&
          items.map((doc) => (
            <Link
              key={doc.id}
              href={`/documents/${doc.id}`}
              className="grid grid-cols-[1fr_100px_120px_110px] gap-4 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors items-center last:border-b-0"
            >
              <div>
                <span className="font-medium text-sm text-gray-900 truncate block">
                  {doc.title}
                </span>
                <WorkflowStatusBadge status={doc.workflow_status} className="mt-0.5" />
              </div>
              <DocumentTypeBadge type={doc.document_type} />
              <span className="text-sm text-gray-500 truncate">
                {doc.created_by_name}
              </span>
              <span className="text-xs text-gray-400">
                {relativeTime(doc.updated_at)}
              </span>
            </Link>
          ))}
      </div>
    </div>
  );
}
