"use client";

import { useState, useCallback, Fragment, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { documentsApi } from "@/lib/api";
import type { DocumentFilters, WorkflowStatus } from "@/types";
import { useCollections } from "@/features/explore/hooks/useCollections";
import { useFolders } from "@/features/explore/hooks/useFolders";
import { AddDocumentsToCollectionModal } from "@/features/explore/AddDocumentsToCollectionModal";
import { PageContainer } from "@/components/page/PageContainer";
import { PageHeader } from "@/components/page/PageHeader";
import { Button } from "@/components/button/Button";
import { useAuthz } from "@/hooks/useAuthz";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { SearchInput } from "@/components/form/SearchInput";
import { WorkflowStatusBadge } from "@/components/badge/WorkflowStatusBadge";
import { DocumentTypeBadge } from "@/components/badge/DocumentTypeBadge";
import { SkeletonRow } from "@/components/feedback/SkeletonBlock";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { relativeTime } from "@/lib/utils";
import { parseListFilterParams, filterReaders, mutateSearchParams } from "@/lib/utils/url";

const SEARCH_DEBOUNCE_MS = 300;

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
  const router = useRouter();
  const searchParams = useSearchParams();

  // S3 Phase 2 FG 2-1: URL 의 collection/folder/include_subfolders 를 구독해 filter 에 반영
  // UX 5차 (2026-04-24): 검색어 URL 동기화 (북마크/뒤로가기/공유)
  // S3 Phase 2 FG 2-2 (2026-04-24): 태그 필터 URL 동기화
  // 도서관 §1.2b (2026-04-25): parseListFilterParams 로 5 키를 한 번에 파싱.
  const {
    q: urlQ,
    collection: urlCollection,
    folder: urlFolder,
    include_subfolders: urlIncludeSub,
    tag: urlTag,
  } = parseListFilterParams(searchParams, {
    q: filterReaders.optionalString("q"),
    collection: filterReaders.optionalString("collection"),
    folder: filterReaders.optionalString("folder"),
    include_subfolders: filterReaders.bool("include_subfolders"),
    tag: filterReaders.optionalString("tag"),
  });

  const [filters, setFilters] = useState<DocumentFilters>({
    page: 1,
    limit: 20,
    sort: "updated_at",
    order: "desc",
    collection: urlCollection,
    folder: urlFolder,
    includeSubfolders: urlIncludeSub,
    q: urlQ,
    tag: urlTag,
  });
  const [search, setSearch] = useState(urlQ ?? "");
  // UX 2차: 빈 컬렉션 맥락에서 "기존 문서 추가" 모달 제어
  const [addDocsOpen, setAddDocsOpen] = useState(false);

  // S3 Phase 2 FG 2-1 UX 4차 (2026-04-24): Enter 대신 입력 debounce 로 자동 검색.
  //   - 300ms 동안 추가 입력이 없으면 filters.q 로 반영 → /documents?q= 서버 ILIKE
  //   - placeholder 는 실제 동작(title 부분 일치)에 맞춰 "제목 검색..." 으로 정돈
  // UX 5차 (2026-04-24): 동시에 URL `?q=` 도 동기화 (replace) — 북마크/뒤로가기/공유 지원
  // 도서관 F6 (2026-04-25): debounce 타이머는 useDebouncedValue 로 추출. 부수효과
  // (setFilters / router.replace) 는 debouncedSearch 를 deps 로 두는 별도 useEffect 로 분리.
  const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    const nextQ = debouncedSearch.trim() || undefined;
    setFilters((f) => (nextQ === f.q ? f : { ...f, q: nextQ, page: 1 }));

    // URL 쪽도 맞춰 준다. 다른 파라미터 (collection/folder/include_subfolders)는 보존.
    const currentUrlQ = searchParams.get("q") ?? undefined;
    if ((nextQ ?? undefined) === (currentUrlQ ?? undefined)) return;
    // 도서관 §1.2c (2026-04-25): mutateSearchParams 로 cloning + set/delete 표준화.
    const qs = mutateSearchParams(searchParams, { q: nextQ ?? null });
    router.replace(`/documents${qs}`);
  }, [debouncedSearch, router, searchParams]);

  // 뒤로가기/외부 URL 변경으로 ?q= 가 바뀌면 input state 도 맞춘다
  useEffect(() => {
    setSearch(urlQ ?? "");
    setFilters((f) => ((urlQ ?? undefined) === f.q ? f : { ...f, q: urlQ, page: 1 }));
  }, [urlQ]);

  // URL 변경 시 filter 동기화
  useEffect(() => {
    setFilters((f) => ({
      ...f,
      collection: urlCollection,
      folder: urlFolder,
      includeSubfolders: urlIncludeSub,
      tag: urlTag,
      page: 1,
    }));
  }, [urlCollection, urlFolder, urlIncludeSub, urlTag]);

  const { data: collections } = useCollections();
  const { data: folders } = useFolders();

  const activeCollection = useMemo(
    () => collections?.find((c) => c.id === urlCollection),
    [collections, urlCollection],
  );
  const activeFolder = useMemo(
    () => folders?.find((f) => f.id === urlFolder),
    [folders, urlFolder],
  );

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["documents", filters],
    queryFn: () => documentsApi.list(filters),
  });

  // 입력 중 Enter 를 누르면 즉시 반영 (debounce 대기 없이)
  const handleSearchSubmit = useCallback(() => {
    setFilters((f) => ({ ...f, q: search.trim() || undefined, page: 1 }));
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

  // FG 2-1: URL 기반 필터도 "활성 필터" 로 포함
  // FG 2-2: 태그 필터도 포함
  const hasFilters =
    !!filters.q || !!filters.status || !!urlCollection || !!urlFolder || !!urlTag;

  // URL 의 collection/folder 만 제거하는 helper — 나머지 query 는 유지
  const removeUrlFilter = useCallback(
    (keys: string[]) => {
      // 도서관 §1.2c (2026-04-25): null 값 → delete 시맨틱.
      const mutations: Record<string, null> = {};
      keys.forEach((k) => { mutations[k] = null; });
      const qs = mutateSearchParams(searchParams, mutations);
      router.replace(`/documents${qs}`);
    },
    [router, searchParams],
  );

  const toggleIncludeSubfolders = useCallback(() => {
    // 도서관 §1.2c (2026-04-25): toggle = null 또는 "true" 값 매핑.
    const qs = mutateSearchParams(searchParams, {
      include_subfolders: urlIncludeSub ? null : "true",
    });
    router.replace(`/documents${qs}`);
  }, [router, searchParams, urlIncludeSub]);

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
          placeholder="제목 검색..."
          aria-label="문서 제목 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => {
            setSearch("");
            setFilters((f) => ({ ...f, q: undefined, page: 1 }));
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
        />

        {/* S3 Phase 2 FG 2-1 UX 4차 (2026-04-24): 본문까지 찾고 싶을 때 /search 로 자연 전환.
            리스트 ?q= 는 제목 ILIKE 만, /search 는 tsvector FTS. UX 에서 두 진입점을 연결. */}
        <Link
          href={search.trim() ? `/search?q=${encodeURIComponent(search.trim())}` : "/search"}
          className="inline-flex items-center gap-1 text-xs text-[var(--color-brand-600)] hover:text-[var(--color-brand-700)] focus-visible:outline-none focus-visible:underline"
          aria-label="본문까지 전체 검색"
          title="제목 검색으로 부족하면 본문까지 찾습니다"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          본문까지 전체 검색 →
        </Link>

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
              // URL 기반 컬렉션/폴더/q/tag 도 함께 제거
              if (urlCollection || urlFolder || urlQ || urlTag) {
                removeUrlFilter(["collection", "folder", "include_subfolders", "q", "tag"]);
              }
            }}
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* 활성 필터 태그 */}
      {hasFilters && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
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
          {/* S3 Phase 2 FG 2-1: 컬렉션 / 폴더 필터 뱃지 */}
          {urlCollection && (
            <FilterChip
              label={`컬렉션: ${activeCollection?.name ?? urlCollection.slice(0, 8)}`}
              onRemove={() => removeUrlFilter(["collection"])}
            />
          )}
          {urlFolder && (
            <FilterChip
              label={`폴더: ${activeFolder?.name ?? urlFolder.slice(0, 8)}${
                urlIncludeSub ? " (+ 하위)" : ""
              }`}
              onRemove={() => removeUrlFilter(["folder", "include_subfolders"])}
            />
          )}
          {urlFolder && (
            <label className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
              <input
                type="checkbox"
                checked={urlIncludeSub}
                onChange={toggleIncludeSubfolders}
                className="h-3.5 w-3.5 rounded border-[var(--color-border-strong)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)]"
              />
              <span>하위 폴더 포함</span>
            </label>
          )}
          {/* S3 Phase 2 FG 2-2 (2026-04-24): 태그 필터 뱃지 */}
          {urlTag && (
            <FilterChip
              label={`태그: #${urlTag}`}
              onRemove={() => removeUrlFilter(["tag"])}
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
          urlCollection && activeCollection ? (
            /* S3 Phase 2 FG 2-1 UX 2차: 빈 컬렉션 맥락 유지 CTA */
            <EmptyState
              title={`"${activeCollection.name}" 컬렉션이 비어 있습니다`}
              description="기존 문서를 추가하거나 새 문서를 만들어 컬렉션에 담아보세요."
              action={
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {canCreate && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setAddDocsOpen(true)}
                    >
                      기존 문서 추가
                    </Button>
                  )}
                  {canCreate && (
                    <Link href={`/documents/new?collection=${encodeURIComponent(urlCollection)}`}>
                      <Button variant="secondary" size="sm">+ 새 문서 만들기</Button>
                    </Link>
                  )}
                </div>
              }
            />
          ) : (
            <EmptyState
              title={filters.q ? "검색 결과가 없습니다" : "문서가 없습니다"}
              description={
                filters.q
                  ? "다른 키워드로 검색해 보세요."
                  : "첫 번째 문서를 만들어 보세요."
              }
              action={
                !filters.q && canCreate ? (
                  <Link href="/documents/new">
                    <Button variant="primary" size="sm">+ 새 문서 만들기</Button>
                  </Link>
                ) : undefined
              }
            />
          )
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

      {/* S3 Phase 2 FG 2-1 UX 2차: 빈 컬렉션 CTA 에서 여는 모달 */}
      {urlCollection && activeCollection && (
        <AddDocumentsToCollectionModal
          open={addDocsOpen}
          collectionId={urlCollection}
          collectionName={activeCollection.name}
          onCancel={() => setAddDocsOpen(false)}
          onSuccess={() => setAddDocsOpen(false)}
        />
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
