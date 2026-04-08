"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "@/lib/api";
import type { DocumentFilters, WorkflowStatus } from "@/types";
import { PageHeader } from "@/components/page/PageHeader";
import { Button } from "@/components/button/Button";
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

export function DocumentListPage() {
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <PageHeader
        title="문서"
        actions={
          <Link href="/documents/new">
            <Button variant="primary" size="sm">
              + 새 문서 만들기
            </Button>
          </Link>
        }
      />

      {/* Action Bar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <SearchInput
          className="w-64"
          placeholder="문서 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => {
            setSearch("");
            setFilters((f) => ({ ...f, q: undefined, page: 1 }));
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />

        <select
          className="text-sm border border-gray-300 rounded-md px-2 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="text-sm border border-gray-300 rounded-md px-2 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ml-auto"
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
            className="text-sm text-blue-600 hover:text-blue-700"
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
        <div className="flex gap-2 mb-3 flex-wrap">
          {filters.q && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
              검색: {filters.q}
              <button onClick={() => { setSearch(""); setFilters((f) => ({ ...f, q: undefined })); }}>×</button>
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200">
              상태: {STATUS_OPTIONS.find((o) => o.value === filters.status)?.label}
              <button onClick={() => setFilters((f) => ({ ...f, status: undefined }))}>×</button>
            </span>
          )}
        </div>
      )}

      {/* 문서 목록 */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* 테이블 헤더 */}
        <div className="grid grid-cols-[1fr_100px_110px_120px_110px] gap-4 px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide">
          <span>제목</span>
          <span>유형</span>
          <span>상태</span>
          <span>작성자</span>
          <span>수정일</span>
        </div>

        {isLoading && (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </>
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

        {!isLoading &&
          !isError &&
          data?.items.map((doc) => (
            <Link
              key={doc.id}
              href={`/documents/${doc.id}`}
              className="grid grid-cols-[1fr_100px_110px_120px_110px] gap-4 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors items-center last:border-b-0"
            >
              <span className="font-medium text-sm text-gray-900 truncate">
                {doc.title}
              </span>
              <DocumentTypeBadge type={doc.document_type} />
              <WorkflowStatusBadge status={doc.workflow_status} />
              <span className="text-sm text-gray-500 truncate">
                {doc.created_by_name}
              </span>
              <span className="text-xs text-gray-400">
                {relativeTime(doc.updated_at)}
              </span>
            </Link>
          ))}
      </div>

      {/* Pagination */}
      {data && data.total_pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">
            총 {data.total}건
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={filters.page === 1}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) - 1 }))}
            >
              이전
            </Button>
            {Array.from({ length: data.total_pages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === data.total_pages ||
                  Math.abs(p - (filters.page ?? 1)) <= 2
              )
              .map((p, idx, arr) => (
                <>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span key={`ellipsis-${p}`} className="px-1 text-gray-400 text-sm">
                      ...
                    </span>
                  )}
                  <Button
                    key={p}
                    variant={filters.page === p ? "primary" : "ghost"}
                    size="sm"
                    onClick={() => setFilters((f) => ({ ...f, page: p }))}
                  >
                    {p}
                  </Button>
                </>
              ))}
            <Button
              variant="ghost"
              size="sm"
              disabled={filters.page === data.total_pages}
              onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 }))}
            >
              다음
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
