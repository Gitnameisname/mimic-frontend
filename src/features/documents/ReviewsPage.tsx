"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "@/lib/api";
import { PageContainer } from "@/components/page/PageContainer";
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
    <PageContainer>
      <PageHeader
        title="검토 대기"
        description={
          !isLoading && !isError
            ? `${(data?.total ?? 0).toLocaleString("ko-KR")}건의 문서가 검토를 기다리고 있습니다`
            : undefined
        }
      />

      <div className="doc-list overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
        <div
          role="row"
          className="doc-grid px-4 py-2.5 bg-[var(--color-surface-subtle)] border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]"
        >
          <span data-col="title">제목</span>
          <span data-col="type">유형</span>
          <span data-col="status">상태</span>
          <span data-col="author">요청자</span>
          <span data-col="updated">요청일</span>
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

        {!isLoading && !isError && items.map((doc) => (
          <Link
            key={doc.id}
            href={`/documents/${doc.id}`}
            className="doc-grid px-4 py-3 border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-subtle)] focus-visible:bg-[var(--color-surface-subtle)] focus-visible:outline-none transition-colors"
          >
            <span data-col="title" className="min-w-0 truncate text-sm font-medium text-[var(--color-text)]">
              {doc.title}
            </span>
            <span data-col="type" className="min-w-0">
              <DocumentTypeBadge type={doc.document_type} />
            </span>
            <span data-col="status" className="min-w-0">
              <WorkflowStatusBadge status={doc.workflow_status} />
            </span>
            <span data-col="author" className="min-w-0 truncate text-sm text-[var(--color-text-muted)]">
              {doc.created_by_name || "—"}
            </span>
            <span data-col="updated" className="min-w-0 truncate text-xs text-[var(--color-text-subtle)]">
              {relativeTime(doc.updated_at)}
            </span>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
