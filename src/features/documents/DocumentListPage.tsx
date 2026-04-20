"use client";

import { useState, useCallback, Fragment } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "@/lib/api";
import type { DocumentFilters, WorkflowStatus } from "@/types";
import { PageContainer } from "@/components/page/PageContainer";
import { PageHeader } from "@/components/page/PageHeader";
import { Button } from "@/components/button/Button";
import { useAuthz } from "@/hooks/useAuthz";
import { SearchInput } from "@/components/form/SearchInput";
import { WorkflowStatusBadge } from "@/components/badge/WorkflowStatusBadge";
import { DocumentTypeBadge } from "@/components/badge/DocumentTypeBadge";
import { SkeletonRow } from "@/components/feedback/SkeletonBlock";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { relativeTime } from "@/lib/utils";

const STATUS_OPTIONS: { value: WorkflowStatus | ""; label: string }[] = [
  { value: "", label: "전체 상태" },
  { value: "DRAFT", label: "초안" },
  { value: "IN_REVIEW", label: "검토 중" },
  { value: "APPROVED", label: "승인됨" },
  { value: "PUBLISHED", label: "발행됨" },
  { value: "REJECTED", label: "반려됨" },
  { value: "ARCHIVED", label: "보관됨" },
];

const SORT_OPTIONS = [
  { value: "updated_at|desc", label: "최신 수정순" },
  { value: "created_at|desc", label: "생성일 최신순" },
  { value: "title|asc", label: "이름순" },
];

const SELECT_CLS =
  "h-9 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 pr-8 text-sm text-[var(--color-text)] " +
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus:border-transparent " +
  "appearance-none bg-no-repeat bg-[right_0.5rem_center] " +
  "[background-image:url(\"data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A//www.w3.org/2000/svg'%20viewBox%3D'0%200%2020%2020'%20fill%3D'%2364748b'%3E%3Cpath%20d%3D'M5.23%207.21a.75.75%200%20011.06.02L10%2011.04l3.71-3.81a.75.75%200%20111.08%201.04l-4.25%204.36a.75.75%200%2001-1.08%200L5.21%208.27a.75.75%200%20010-1.06z'/%3E%3C/svg%3E\")]";

export function DocumentListPage() {
  const { can } = useAuthz();
  const canCreate = can("document.create");

  const [filters, setFilters] = useState<DocumentFilters>({
    page: 1,
    limit: 20,
    sort: "updated_at",
    order: "desc",
  });
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["documents", filters],
    queryFn: () => documentsApi.list(filters),
  });

  const handleSearch = useCallback(() => {
    setFilters((f) => ({ ...f, q: search || undefined, page: 1 }));
  }, [search]);

  const handleStatusChange = (v: string) => {
    setFilters((f) => ({
      ...f,
      status: (v as WorkflowStatus) || undefined,
      page: 1,
    }));
  };

  const handleSortChange = (v: string) => {
    const [sort, order] = v.split("|");
    setFilters((f) => ({
      ...f,
      sort: sort as DocumentFilters["sort"],
      order: order as DocumentFilters["order"],
    }));
  };

  const hasFilters = !!filters.q || !!filters.status;

  const page = filters.page ?? 1;
  const limit = filters.limit ?? 20;
  const rangeStart = data && data.total > 0 ? (page - 1) * limit + 1 : 0;
  const rangeEnd = data ? Math.min(page * limit, data.total) : 0;

  return (
    <PageContainer>
      <PageHeader
        title="문서"
        description={data ? `총 ${data.total.toLocaleString("ko-KR")}건의 문서` : undefined}
        actions={
          canCreate ? (
            <Link href="/documents/new">
              <Button variant="primary" size="sm">
                <span aria-hidden="true">＋</span>
                <span>새 문서 만들기</span>
              </Button>
            </Link>
          ) : (
            <div title="문서 작성 권한(AUTHOR 이상)이 없습니다">
              <Button variant="primary" size="sm" disabled>
                <span aria-hidden="true">＋</span>
                <span>새 문서 만들기</span>
              </Button>
            </div>
          )
        }
      />

      {/* Action Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          className="w-full max-w-[18rem]"
          placeholder="제목·내용 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => {
            setSearch("");
            setFilters((f) => ({ ...f, q: undefined, page: 1 }));
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />

        <select
          aria-label="상태 필터"
          className={SELECT_CLS}
          value={filters.status ?? ""}
          onChange={(e) => handleStatusChange(e.target.value)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          aria-label="정렬"
          className={`${SELECT_CLS} ml-auto`}
          value={`${filters.sort}|${filters.order}`}
          onChange={(e) => handleSortChange(e.target.value)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            className="text-sm text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] focus-visible:outline-none focus-visible:underline"
            onClick={() => {
              setSearch("");
              setFilters({ page: 1, limit: 20, sort: "updated_at", order: "desc" });
            }}
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* 활성 필터 태그 */}
      {hasFilters && (
        <div className="mb-3 flex flex-wrap gap-2">
          {filters.q && (
            <FilterChip
              label={`검색: ${filters.q}`}
              onRemove={() => {
                setSearch("");
                setFilters((f) => ({ ...f, q: undefined }));
              }}
            />
          )}
          {filters.status && (
            <FilterChip
              label={`상태: ${STATUS_OPTIONS.find((o) => o.value === filters.status)?.label}`}
              onRemove={() => setFilters((f) => ({ ...f, status: undefined }))}
            />
          )}
        </div>
      )}

      {/* 문서 목록 */}
      <div className="doc-list overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
        {/* 테이블 헤더 */}
        <div
          role="row"
          className="doc-grid px-4 py-2.5 bg-[var(--color-surface-subtle)] border-b border-[var(--color-border)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]"
        >
          <span data-col="title">제목</span>
          <span data-col="type">유형</span>
          <span data-col="status">상태</span>
          <span data-col="author">작성자</span>
          <span data-col="updated">수정일</span>
        </div>

        {isLoading && (
          <div>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        )}

        {isError && (
          <ErrorState
            description="문서 목록을 불러오지 못했습니다."
            retry={refetch}
          />
        )}

        {!isLoading && !isError && data?.items.length === 0 && (
          <EmptyState
            title={filters.q ? "검색 결과가 없습니다" : "문서가 없습니다"}
            description={
              filters.q
                ? "다른 키워드로 검색해 보세요."
                : "첫 번째 문서를 만들어 보세요."
            }
            action={
              !filters.q ? (
                <Link href="/documents/new">
                  <Button variant="primary" size="sm">+ 새 문서 만들기</Button>
                </Link>
              ) : undefined
            }
          />
        )}

        {!isLoading && !isError && data?.items.map((doc) => (
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

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="mt-4 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-[var(--color-text-subtle)]">
            {rangeStart.toLocaleString("ko-KR")}–{rangeEnd.toLocaleString("ko-KR")} /{" "}
            {data.total.toLocaleString("ko-KR")}건
          </span>
          <div className="flex items-center gap-1 overflow-x-auto">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 1}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
            >
              이전
            </Button>
            {buildPageList(page, data.total_pages).map((item, idx) =>
              item === "…" ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1 text-sm text-[var(--color-text-subtle)]"
                  aria-hidden="true"
                >
                  …
                </span>
              ) : (
                <Fragment key={item}>
                  <Button
                    variant={page === item ? "primary" : "ghost"}
                    size="sm"
                    aria-current={page === item ? "page" : undefined}
                    onClick={() => setFilters((f) => ({ ...f, page: item }))}
                  >
                    {item}
                  </Button>
                </Fragment>
              ),
            )}
            <Button
              variant="ghost"
              size="sm"
              disabled={page === data.total_pages}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
            >
              다음
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-brand-700)]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`${label} 필터 제거`}
        className="rounded-full p-0.5 hover:bg-[var(--color-brand-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

/**
 * 페이지 목록 빌더 — 현재 페이지 주변 ±2 + 첫/마지막 페이지 + 생략 기호
 */
function buildPageList(current: number, total: number): (number | "…")[] {
  const result: (number | "…")[] = [];
  const nearby = new Set<number>([1, total, current - 1, current, current + 1]);
  for (let i = 1; i <= total; i++) {
    if (nearby.has(i)) result.push(i);
  }
  // 간격에 … 삽입
  const withEllipsis: (number | "…")[] = [];
  for (let i = 0; i < result.length; i++) {
    if (i > 0) {
      const prev = result[i - 1] as number;
      const curr = result[i] as number;
      if (curr - prev > 1) withEllipsis.push("…");
    }
    withEllipsis.push(result[i]);
  }
  return withEllipsis;
}
