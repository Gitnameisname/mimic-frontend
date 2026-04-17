"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchApi } from "@/lib/api/search";
import type {
  DocumentSearchResult,
  NodeSearchResult,
  DocumentSearchParams,
  SearchSort,
} from "@/types/search";
import { DocumentTypeBadge } from "@/components/badge/DocumentTypeBadge";
import { WorkflowStatusBadge } from "@/components/badge/WorkflowStatusBadge";
import type { WorkflowStatus } from "@/types/workflow";
import { EmptyState } from "@/components/feedback/EmptyState";
import { ErrorState } from "@/components/feedback/ErrorState";
import { PageHeader } from "@/components/page/PageHeader";
import { relativeTime } from "@/lib/utils";

// ---------------------------------------------------------------------------
// 스니펫 하이라이팅 렌더러 (<b>...</b> → <mark>)
// ---------------------------------------------------------------------------

/**
 * ts_headline이 반환하는 <b>키워드</b> 마킹을 <mark>으로 변환해 렌더링한다.
 *
 * 보안: <b>/<\/b> 이외의 모든 HTML은 이스케이프 후 처리.
 * 1) 텍스트 전체를 HTML 이스케이프 (< → &lt; 등)
 * 2) 이스케이프된 &lt;b&gt; / &lt;/b&gt;만 <mark>으로 복원
 *
 * 이 방식으로 문서 원본의 악의적 HTML이 DOM에 주입되지 않는다.
 */
function escapeHtmlExceptHighlight(raw: string): string {
  // Step 1: 모든 HTML 특수문자 이스케이프
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
  // Step 2: ts_headline이 생성하는 &lt;b&gt; / &lt;/b&gt; 패턴만 <mark>으로 복원
  const restored = escaped
    .replace(/&lt;b&gt;/g, '<mark class="bg-yellow-100 text-yellow-900 rounded px-0.5">')
    .replace(/&lt;\/b&gt;/g, "</mark>");
  // Step 3: 복원 후 <mark> 이외의 HTML 태그가 남아있으면 안전을 위해 전부 제거
  // (ts_headline이 예상치 않은 태그를 생성했을 때의 방어선)
  const ALLOWED_TAG_RE = /<(?!\/?(mark)[\s>])[^>]+>/gi;
  return restored.replace(ALLOWED_TAG_RE, "");
}

function HighlightedSnippet({ html }: { html: string }) {
  return (
    <span
      className="text-sm text-gray-600 leading-relaxed"
      dangerouslySetInnerHTML={{ __html: escapeHtmlExceptHighlight(html) }}
    />
  );
}

// ---------------------------------------------------------------------------
// 문서 검색 결과 카드
// ---------------------------------------------------------------------------

function DocumentResultCard({ result }: { result: DocumentSearchResult }) {
  const titleSnippet = result.snippets.find((s) => s.field === "title");
  const summarySnippet = result.snippets.find((s) => s.field === "summary");

  return (
    <Link href={`/documents/${result.id}`} className="block group">
      <div className="p-4 rounded-lg border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all">
        <div className="flex items-start gap-3">
          {/* 아이콘 */}
          <div className="mt-0.5 w-8 h-8 rounded-md bg-blue-50 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            {/* 제목 */}
            <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
              {titleSnippet ? (
                <HighlightedSnippet html={titleSnippet.text} />
              ) : (
                result.title
              )}
            </h3>

            {/* 배지 */}
            <div className="flex items-center gap-2 mt-1.5">
              <DocumentTypeBadge type={result.document_type} />
              <WorkflowStatusBadge status={result.status.toUpperCase() as WorkflowStatus} />
              <span className="text-xs text-gray-400">{relativeTime(result.updated_at)}</span>
            </div>

            {/* 스니펫 */}
            {summarySnippet && (
              <p className="mt-2 line-clamp-2">
                <HighlightedSnippet html={summarySnippet.text} />
              </p>
            )}
            {!summarySnippet && result.summary && (
              <p className="mt-2 text-sm text-gray-500 line-clamp-2">{result.summary}</p>
            )}
          </div>

          {/* 관련도 점수 (개발용, 숨김) */}
          {process.env.NODE_ENV === "development" && (
            <span className="text-xs text-gray-300 shrink-0 hidden">
              {result.rank.toFixed(4)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// 노드 검색 결과 카드
// ---------------------------------------------------------------------------

function NodeResultCard({ result }: { result: NodeSearchResult }) {
  const href = `/documents/${result.document_id}#node-${result.node_id}`;

  return (
    <Link href={href} className="block group">
      <div className="p-4 rounded-lg border border-gray-200 bg-white hover:border-green-300 hover:shadow-sm transition-all">
        <div className="flex items-start gap-3">
          {/* 아이콘 */}
          <div className="mt-0.5 w-8 h-8 rounded-md bg-green-50 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h8" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            {/* 노드 제목 */}
            <h3 className="font-medium text-gray-900 group-hover:text-green-600 transition-colors">
              {result.title || `(${result.node_type})`}
            </h3>

            {/* breadcrumb */}
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400 flex-wrap">
              <span className="text-blue-600 font-medium truncate max-w-40">{result.document_title}</span>
              {result.breadcrumb.map((b) => (
                <span key={b.node_id} className="flex items-center gap-1">
                  <span>›</span>
                  <span className="truncate max-w-32">{b.title || b.node_type}</span>
                </span>
              ))}
            </div>

            {/* 배지 */}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                {result.node_type}
              </span>
              <DocumentTypeBadge type={result.document_type} />
            </div>

            {/* 스니펫 */}
            {result.content_snippet && (
              <p className="mt-2 line-clamp-2">
                <HighlightedSnippet html={result.content_snippet} />
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// 탭
// ---------------------------------------------------------------------------

type Tab = "documents" | "nodes";

// ---------------------------------------------------------------------------
// 메인 SearchPage 컴포넌트
// ---------------------------------------------------------------------------

const SORT_OPTIONS: { value: SearchSort; label: string }[] = [
  { value: "relevance", label: "관련도순" },
  { value: "updated_at", label: "최신 수정순" },
  { value: "created_at", label: "생성일순" },
];

const STATUS_OPTIONS = [
  { value: "", label: "전체 상태" },
  { value: "published", label: "발행됨" },
  { value: "draft", label: "초안" },
  { value: "archived", label: "보관됨" },
];

export function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQ = searchParams.get("q") ?? "";

  const [tab, setTab] = useState<Tab>("documents");
  const [inputValue, setInputValue] = useState(initialQ);
  const [params, setParams] = useState<DocumentSearchParams>({
    q: initialQ,
    sort: "relevance",
    page: 1,
    limit: 20,
  });

  // DocumentType 목록 동적 로드 (CLAUDE.md: 문서 타입 하드코딩 금지)
  const { data: filterOptions } = useQuery({
    queryKey: ["search-filter-options"],
    queryFn: () => searchApi.filterOptions(),
    staleTime: 5 * 60_000, // 5분 캐시
  });
  const typeOptions = [
    { value: "", label: "전체 유형" },
    ...(filterOptions?.document_types ?? []).map((t) => ({
      value: t.type_code,
      label: t.display_name,
    })),
  ];

  // URL q 파라미터가 변경되면 검색 상태 동기화
  const prevQ = useRef(initialQ);
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    if (q !== prevQ.current) {
      prevQ.current = q;
      setInputValue(q);
      setParams((prev) => ({ ...prev, q, page: 1 }));
      setTab("documents");
    }
  }, [searchParams]);

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = inputValue.trim();
      if (!q) return;
      router.push(`/search?q=${encodeURIComponent(q)}`);
    },
    [inputValue, router]
  );

  // 문서 검색 쿼리
  const docQuery = useQuery({
    queryKey: ["search-documents", params],
    queryFn: () => searchApi.documents(params),
    enabled: !!params.q,
    staleTime: 30_000,
  });

  // 노드 검색 쿼리
  const nodeQuery = useQuery({
    queryKey: ["search-nodes", { q: params.q, type: params.type, page: params.page, limit: params.limit }],
    queryFn: () =>
      searchApi.nodes({
        q: params.q,
        type: params.type,
        sort: "relevance",
        page: params.page,
        limit: params.limit,
      }),
    enabled: !!params.q && tab === "nodes",
    staleTime: 30_000,
  });

  const activeQuery = tab === "documents" ? docQuery : nodeQuery;
  const isLoading = activeQuery.isLoading;
  const isError = activeQuery.isError;

  const docData = docQuery.data;
  const nodeData = nodeQuery.data;

  const totalDocs = docData?.pagination.total ?? 0;
  // 섹션 탭을 클릭하기 전에는 카운트를 알 수 없으므로 로드된 경우만 표시
  const totalNodes = tab === "nodes" ? (nodeData?.pagination.total ?? 0) : null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader title="검색" />

      {/* 검색 인풋 */}
      <form onSubmit={handleSearch} className="mt-4 mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="제목, 내용, 메타데이터 검색..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            검색
          </button>
        </div>
      </form>

      {params.q && (
        <>
          {/* 필터 바 */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* 정렬 */}
            <select
              value={params.sort ?? "relevance"}
              onChange={(e) =>
                setParams((p) => ({ ...p, sort: e.target.value as SearchSort, page: 1 }))
              }
              className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* 유형 필터 */}
            <select
              value={params.type ?? ""}
              onChange={(e) =>
                setParams((p) => ({ ...p, type: e.target.value || undefined, page: 1 }))
              }
              className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {typeOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* 상태 필터 */}
            <select
              value={params.status ?? ""}
              onChange={(e) =>
                setParams((p) => ({ ...p, status: e.target.value || undefined, page: 1 }))
              }
              className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* 활성 필터 칩 */}
            {(params.type || params.status) && (
              <button
                onClick={() => setParams((p) => ({ ...p, type: undefined, status: undefined, page: 1 }))}
                className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                필터 초기화
              </button>
            )}
          </div>

          {/* 탭 */}
          <div className="flex gap-1 mb-4 border-b border-gray-200">
            <button
              onClick={() => setTab("documents")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === "documents"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              문서
              {totalDocs > 0 && (
                <span className="ml-1.5 text-xs bg-blue-50 text-blue-600 rounded-full px-1.5 py-0.5">
                  {totalDocs}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab("nodes")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === "nodes"
                  ? "border-green-600 text-green-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              섹션
              {totalNodes !== null && totalNodes > 0 && (
                <span className="ml-1.5 text-xs bg-green-50 text-green-600 rounded-full px-1.5 py-0.5">
                  {totalNodes}
                </span>
              )}
            </button>
          </div>

          {/* 결과 */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg border border-gray-100 bg-white animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-md bg-gray-100 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-2/3" />
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                      <div className="h-3 bg-gray-100 rounded w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <ErrorState message="검색 중 오류가 발생했습니다." retry={() => activeQuery.refetch()} />
          ) : tab === "documents" ? (
            docData && docData.results.length > 0 ? (
              <>
                <p className="text-xs text-gray-400 mb-3">
                  &ldquo;{params.q}&rdquo; — {docData.pagination.total.toLocaleString()}건
                </p>
                <div className="space-y-3">
                  {docData.results.map((r) => (
                    <DocumentResultCard key={r.id} result={r} />
                  ))}
                </div>
                {/* 페이지네이션 */}
                {(docData.pagination.page > 1 || docData.pagination.has_next) && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                    <button
                      disabled={params.page === 1}
                      onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
                      className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      이전
                    </button>
                    <span className="text-sm text-gray-500">페이지 {params.page}</span>
                    <button
                      disabled={!docData.pagination.has_next}
                      onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
                      className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      다음
                    </button>
                  </div>
                )}
              </>
            ) : (
              docData ? (
                <EmptyState
                  title="검색 결과 없음"
                  description={`"${params.q}"에 해당하는 문서를 찾지 못했습니다.`}
                />
              ) : null
            )
          ) : (
            // 노드 탭
            nodeData && nodeData.results.length > 0 ? (
              <>
                <p className="text-xs text-gray-400 mb-3">
                  &ldquo;{params.q}&rdquo; — 섹션 {nodeData.pagination.total.toLocaleString()}건
                </p>
                <div className="space-y-3">
                  {nodeData.results.map((r) => (
                    <NodeResultCard key={r.node_id} result={r} />
                  ))}
                </div>
                {(nodeData.pagination.page > 1 || nodeData.pagination.has_next) && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                    <button
                      disabled={params.page === 1}
                      onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) - 1 }))}
                      className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      이전
                    </button>
                    <span className="text-sm text-gray-500">페이지 {params.page}</span>
                    <button
                      disabled={!nodeData.pagination.has_next}
                      onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 1) + 1 }))}
                      className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      다음
                    </button>
                  </div>
                )}
              </>
            ) : (
              nodeData ? (
                <EmptyState
                  title="섹션 검색 결과 없음"
                  description={`"${params.q}"에 해당하는 섹션을 찾지 못했습니다.`}
                />
              ) : null
            )
          )}
        </>
      )}

      {/* 초기 상태 (검색어 없음) */}
      {!params.q && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <svg className="w-12 h-12 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-sm">검색어를 입력하세요</p>
          <p className="text-xs mt-1 opacity-60">제목, 내용, 메타데이터에서 검색합니다</p>
        </div>
      )}
    </div>
  );
}
