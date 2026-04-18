"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import {
  adminApi,
  type ChunkListResponse,
  type VectorizationStats,
  type TokenUsageListResponse,
} from "@/lib/api/admin";
import type { SingleResponse } from "@/types/admin";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// 공통 컴포넌트
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: "green" | "yellow" | "red" | "blue";
}) {
  const colorMap = {
    green: "text-green-600",
    yellow: "text-yellow-600",
    red: "text-red-600",
    blue: "text-blue-600",
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={cn("text-3xl font-bold", accent ? colorMap[accent] : "text-gray-900")}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const variantMap = {
    default: "bg-gray-100 text-gray-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    danger: "bg-red-100 text-red-700",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", variantMap[variant])}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// 메인 페이지
// ---------------------------------------------------------------------------

export function AdminVectorizationPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"overview" | "chunks" | "tokens">("overview");
  const [chunkPage, setChunkPage] = useState(1);
  const [tokenPage, setTokenPage] = useState(1);
  const [filterDocType, setFilterDocType] = useState("");
  const [filterHasEmbedding, setFilterHasEmbedding] = useState<boolean | undefined>(undefined);
  const [statusMsg, setStatusMsg] = useState<{ type: "info" | "success" | "error"; text: string } | null>(null);

  // --- 데이터 조회 ---
  const statsQ = useQuery({
    queryKey: ["admin", "vectorization", "stats"],
    queryFn: () => adminApi.getVectorizationStats(),
    refetchInterval: 30_000,
  });

  const chunksQ = useQuery({
    queryKey: ["admin", "vectorization", "chunks", chunkPage, filterDocType, filterHasEmbedding],
    queryFn: () =>
      adminApi.getChunks({
        page: chunkPage,
        limit: 20,
        document_type: filterDocType || undefined,
        has_embedding: filterHasEmbedding,
      }),
    enabled: activeTab === "chunks",
  });

  const tokensQ = useQuery({
    queryKey: ["admin", "vectorization", "tokens", tokenPage],
    queryFn: () => adminApi.getTokenUsage({ page: tokenPage, limit: 20 }),
    enabled: activeTab === "tokens",
  });

  // --- 전체 재색인 ---
  const reindexAllMutation = useMutation({
    mutationFn: () => adminApi.reindexAll({ limit: 200 }),
    onSuccess: (res) => {
      const d = res.data;
      setStatusMsg({
        type: "success",
        text: `재색인 완료: 총 ${d.total}건 중 성공 ${d.succeeded}건, 실패 ${d.failed}건`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "vectorization"] });
    },
    onError: () => setStatusMsg({ type: "error", text: "재색인 실패. 서버 로그를 확인하세요." }),
  });

  // --- cleanup ---
  const cleanupMutation = useMutation({
    mutationFn: () => adminApi.cleanupChunks(30),
    onSuccess: (res) => {
      setStatusMsg({ type: "success", text: `청크 정리 완료: ${res.data.deleted}건 삭제됨` });
      queryClient.invalidateQueries({ queryKey: ["admin", "vectorization"] });
    },
    onError: () => setStatusMsg({ type: "error", text: "청크 정리 실패. 서버 로그를 확인하세요." }),
  });

  const stats = statsQ.data?.data;

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">벡터화 파이프라인 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            문서 청킹 · 임베딩 생성 · pgvector 저장 상태 관리
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!window.confirm("30일 이상 지난 비활성 청크를 삭제합니다. 계속하시겠습니까?")) return;
              setStatusMsg(null);
              cleanupMutation.mutate();
            }}
            disabled={cleanupMutation.isPending}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {cleanupMutation.isPending ? "정리 중..." : "오래된 청크 정리"}
          </button>
          <button
            onClick={() => {
              if (!window.confirm("모든 Published 문서(최대 200건)를 재색인합니다. 임베딩 비용이 발생할 수 있습니다. 계속하시겠습니까?")) return;
              setStatusMsg(null);
              reindexAllMutation.mutate();
            }}
            disabled={reindexAllMutation.isPending}
            className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {reindexAllMutation.isPending ? "재색인 중..." : "전체 재색인"}
          </button>
        </div>
      </div>

      {/* 상태 메시지 */}
      {statusMsg && (
        <div className={cn(
          "rounded-lg px-4 py-3 text-sm flex items-center justify-between",
          statusMsg.type === "error"
            ? "bg-red-50 border border-red-200 text-red-700"
            : "bg-green-50 border border-green-200 text-green-700"
        )}>
          <span>{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="ml-4 text-current opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* 지표 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
        <StatCard
          label="현재 청크"
          value={stats?.chunks.current ?? "-"}
          sub="is_current=true"
          accent="blue"
        />
        <StatCard
          label="임베딩 완료"
          value={stats?.chunks.embedded ?? "-"}
          sub="embedding 보유"
          accent="green"
        />
        <StatCard
          label="임베딩 대기"
          value={stats?.chunks.pending ?? "-"}
          sub="embedding 없음"
          accent={((stats?.chunks.pending ?? 0) > 0) ? "yellow" : undefined}
        />
        <StatCard
          label="벡터화 문서"
          value={stats?.documents.vectorized ?? "-"}
          sub={`/ ${stats?.documents.total_published ?? 0} 게시 문서`}
          accent="blue"
        />
        <StatCard
          label="총 토큰 사용"
          value={
            stats
              ? stats.token_usage.total_tokens >= 1_000_000
                ? `${(stats.token_usage.total_tokens / 1_000_000).toFixed(2)}M`
                : `${stats.token_usage.total_tokens.toLocaleString()}`
              : "-"
          }
          sub="임베딩 API 누적"
        />
        <StatCard
          label="처리 청크 수"
          value={stats?.token_usage.total_chunks_processed ?? "-"}
          sub="임베딩 처리 누적"
        />
      </div>

      {/* DocumentType별 청크 분포 */}
      {stats && stats.by_type.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">문서 유형별 청크 분포</h2>
          <div className="flex flex-wrap gap-2">
            {stats.by_type.map((t) => (
              <div
                key={t.document_type}
                className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
              >
                <span className="text-xs font-medium text-gray-600">{t.document_type}</span>
                <span className="text-xs font-bold text-gray-900">{t.chunk_count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 탭 */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-4">
          {(["overview", "chunks", "tokens"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "pb-2 text-sm font-medium border-b-2 transition-colors",
                activeTab === tab
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              )}
            >
              {tab === "overview" ? "개요" : tab === "chunks" ? "청크 목록" : "토큰 사용량"}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === "overview" && (
        <OverviewTab stats={stats} />
      )}
      {activeTab === "chunks" && (
        <ChunksTab
          chunksQ={chunksQ}
          page={chunkPage}
          setPage={setChunkPage}
          filterDocType={filterDocType}
          setFilterDocType={setFilterDocType}
          filterHasEmbedding={filterHasEmbedding}
          setFilterHasEmbedding={setFilterHasEmbedding}
        />
      )}
      {activeTab === "tokens" && (
        <TokensTab tokensQ={tokensQ} page={tokenPage} setPage={setTokenPage} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 개요 탭
// ---------------------------------------------------------------------------

function OverviewTab({ stats }: { stats: VectorizationStats | undefined }) {
  const completionRate =
    stats && stats.documents.total_published > 0
      ? Math.round((stats.documents.vectorized / stats.documents.total_published) * 100)
      : 0;

  const embeddingRate =
    stats && stats.chunks.current > 0
      ? Math.round((stats.chunks.embedded / stats.chunks.current) * 100)
      : 0;

  return (
    <div className="space-y-4">
      {/* 완료율 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">벡터화 완료율</h2>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>문서 벡터화율</span>
              <span>{completionRate}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>청크 임베딩율</span>
              <span>{embeddingRate}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${embeddingRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 운영 가이드 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-amber-800 mb-2">운영 안내</h3>
        <ul className="text-xs text-amber-700 space-y-1">
          <li>• 문서를 Published 상태로 전환하면 자동으로 벡터화가 시작됩니다.</li>
          <li>• 전체 재색인은 모든 Published 문서를 대상으로 임베딩을 재생성합니다.</li>
          <li>• 오래된 청크 정리는 30일 이상 지난 비활성(is_current=false) 청크를 삭제합니다.</li>
          <li>• 하이브리드 검색(<code>mode=hybrid</code>)은 임베딩이 완료된 문서에서만 벡터 점수가 반영됩니다.</li>
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 청크 목록 탭
// ---------------------------------------------------------------------------

function ChunksTab({
  chunksQ,
  page,
  setPage,
  filterDocType,
  setFilterDocType,
  filterHasEmbedding,
  setFilterHasEmbedding,
}: {
  // F-04 시정(2026-04-18): ReturnType<typeof useQuery> 는 generic 을 잃어버려
  //   data 가 `{}` 로 추론됨. UseQueryResult 를 명시적으로 지정.
  chunksQ: UseQueryResult<SingleResponse<ChunkListResponse>>;
  page: number;
  setPage: (p: number) => void;
  filterDocType: string;
  setFilterDocType: (v: string) => void;
  filterHasEmbedding: boolean | undefined;
  setFilterHasEmbedding: (v: boolean | undefined) => void;
}) {
  const data = chunksQ.data?.data;

  return (
    <div className="space-y-4">
      {/* 필터 */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="문서 유형 필터 (예: POLICY)"
          value={filterDocType}
          onChange={(e) => { setFilterDocType(e.target.value.toUpperCase()); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-1 focus:ring-red-400"
        />
        <select
          value={filterHasEmbedding === undefined ? "" : String(filterHasEmbedding)}
          onChange={(e) => {
            setFilterHasEmbedding(e.target.value === "" ? undefined : e.target.value === "true");
            setPage(1);
          }}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-400"
        >
          <option value="">전체 (임베딩 여부)</option>
          <option value="true">임베딩 완료</option>
          <option value="false">임베딩 없음</option>
        </select>
      </div>

      {/* 테이블 */}
      {chunksQ.isLoading ? (
        <div className="flex justify-center py-12 text-sm text-gray-400">로딩 중...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">청크 인덱스</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">유형</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">경로</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">미리보기</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">토큰</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">임베딩</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(data?.items ?? []).map((chunk) => (
                <tr key={chunk.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500 tabular-nums">#{chunk.chunk_index}</td>
                  <td className="px-4 py-3">
                    <Badge>{chunk.document_type}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">
                    {chunk.node_path.join(" › ") || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-[240px] truncate" title={chunk.source_text}>
                    {chunk.source_text}
                  </td>
                  <td className="px-4 py-3 text-gray-500 tabular-nums">{chunk.token_count}</td>
                  <td className="px-4 py-3">
                    {chunk.has_embedding ? (
                      <Badge variant="success">완료</Badge>
                    ) : (
                      <Badge variant="warning">없음</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {(data?.items ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">
                    청크가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      {data && data.total > data.limit && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">총 {data.total}건</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1 text-xs border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
            >
              이전
            </button>
            <span className="text-xs text-gray-600">{page} / {Math.ceil(data.total / data.limit)}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * data.limit >= data.total}
              className="px-3 py-1 text-xs border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 토큰 사용량 탭
// ---------------------------------------------------------------------------

function TokensTab({
  tokensQ,
  page,
  setPage,
}: {
  // F-04 시정(2026-04-18): ReturnType 대신 UseQueryResult 로 generic 명시.
  tokensQ: UseQueryResult<SingleResponse<TokenUsageListResponse>>;
  page: number;
  setPage: (p: number) => void;
}) {
  const data = tokensQ.data?.data;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[540px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">문서 ID</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">모델</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">토큰</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">청크 수</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">처리 시각</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(data?.items ?? []).map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 text-xs font-mono truncate max-w-[160px]">
                  {item.document_id ? item.document_id.slice(0, 8) + "..." : "-"}
                </td>
                <td className="px-4 py-3 text-gray-700">{item.model}</td>
                <td className="px-4 py-3 text-gray-900 tabular-nums font-medium">
                  {item.total_tokens.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-gray-500 tabular-nums">{item.chunk_count}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {item.created_at ? new Date(item.created_at).toLocaleString("ko-KR") : "-"}
                </td>
              </tr>
            ))}
            {(data?.items ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                  토큰 사용 이력이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > data.limit && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">총 {data.total}건</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1 text-xs border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
            >
              이전
            </button>
            <span className="text-xs text-gray-600">{page} / {Math.ceil(data.total / data.limit)}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page * data.limit >= data.total}
              className="px-3 py-1 text-xs border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-50"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
