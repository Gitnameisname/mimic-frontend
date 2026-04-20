"use client";

/**
 * 통합 관리 대시보드 (Phase 7 → 14-9 개선).
 *
 * 변경사항:
 *  - 핵심 4종 메트릭 카드 + 아이콘 + 변화 추이 표시
 *  - 시스템 상태 위젯 (상태 표시등 + 응답시간)
 *  - API 에러 시 graceful fallback (에러 메시지 + 재시도)
 *  - 반응형 그리드 (모바일 1열 → 데스크탑 4열)
 *  - 벡터화 현황 유지
 */

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { SeverityBadge, StatusBadge } from "@/components/admin/StatusBadge";
import { cn } from "@/lib/utils";

// ─── 메트릭 카드 (아이콘 + 변화 추이) ───

interface MetricCardProps {
  label: string;
  value: number | string;
  sub?: string;
  danger?: boolean;
  iconPath: string;
  iconBg: string;
  iconColor: string;
}

function MetricCard({
  label,
  value,
  sub,
  danger,
  iconPath,
  iconBg,
  iconColor,
}: MetricCardProps) {
  return (
    <article className="bg-white rounded-xl border border-gray-200 p-6 flex items-start gap-4">
      <div
        className={cn("w-11 h-11 rounded-lg flex items-center justify-center shrink-0", iconBg)}
      >
        <svg
          className={cn("w-5 h-5", iconColor)}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1 truncate">
          {label}
        </p>
        <p className={cn("text-3xl font-bold", danger ? "text-red-700" : "text-gray-900")}>
          {typeof value === "number" ? value.toLocaleString("ko-KR") : value}
        </p>
        {sub && <p className="text-sm text-gray-600 mt-1 font-medium">{sub}</p>}
      </div>
    </article>
  );
}

// ─── 컴포넌트 상태 표시등 ───

function HealthDot({ status }: { status: string }) {
  const color =
    status === "ok"
      ? "bg-green-500"
      : status === "degraded"
        ? "bg-yellow-500"
        : "bg-red-500";
  return <span className={cn("inline-block w-2.5 h-2.5 rounded-full", color)} aria-hidden="true" />;
}

function HealthLabel({ status }: { status: string }) {
  const text = status === "ok" ? "정상" : status === "degraded" ? "경고" : "오류";
  const color =
    status === "ok"
      ? "text-green-700 font-semibold"
      : status === "degraded"
        ? "text-orange-700 font-semibold"
        : "text-red-700 font-semibold";
  return <span className={cn("text-sm", color)}>{text}</span>;
}

// ─── 에러 상태 표시 ───

function ErrorFallback({
  label,
  onRetry,
}: {
  label: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
      <svg
        className="w-8 h-8 text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <p className="text-sm text-gray-500">{label} 데이터를 불러오지 못했습니다</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm text-blue-700 hover:text-blue-800 font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 transition-all duration-200 min-h-[44px] inline-flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          다시 시도
        </button>
      )}
    </div>
  );
}

// ─── 로딩 스켈레톤 ───

function SkeletonCards({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div className="h-3 w-20 bg-gray-200 rounded mb-3" />
          <div className="h-7 w-16 bg-gray-200 rounded" />
        </div>
      ))}
    </>
  );
}

function SkeletonRows({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════
// AdminDashboardPage
// ═══════════════════════════════════════

export function AdminDashboardPage() {
  const metricsQ = useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: () => adminApi.getMetrics(),
    refetchInterval: 30_000,
  });
  const healthQ = useQuery({
    queryKey: ["admin", "health"],
    queryFn: () => adminApi.getHealth(),
    refetchInterval: 30_000,
  });
  const errorsQ = useQuery({
    queryKey: ["admin", "errors"],
    queryFn: () => adminApi.getRecentErrors(),
    refetchInterval: 30_000,
  });
  const auditQ = useQuery({
    queryKey: ["admin", "recent-audit"],
    queryFn: () => adminApi.getRecentAuditLogs(),
    refetchInterval: 30_000,
  });

  const metrics = metricsQ.data?.data;
  const health = healthQ.data?.data;
  const errors = errorsQ.data?.data ?? [];
  const auditLogs = auditQ.data?.data ?? [];
  const vecStats = metrics?.vectorization;

  return (
    <div className="p-3 sm:p-6 space-y-6 sm:space-y-8 max-w-7xl">
      {/* 제목 */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-gray-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">대시보드</h1>
        <span className="text-xs sm:text-sm text-gray-600 font-medium" aria-live="polite" aria-atomic="true">
          30초마다 자동 갱신
        </span>
      </div>

      {/* ── 핵심 메트릭 4종 ── */}
      <section aria-label="핵심 지표">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          {metricsQ.isLoading ? (
            <SkeletonCards count={4} />
          ) : metricsQ.isError ? (
            <div className="col-span-full">
              <ErrorFallback label="메트릭" onRetry={() => metricsQ.refetch()} />
            </div>
          ) : (
            <>
              <MetricCard
                label="총 사용자"
                value={metrics?.total_users ?? "-"}
                sub="활성 계정"
                iconPath="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
              />
              <MetricCard
                label="총 문서"
                value={metrics?.total_documents ?? "-"}
                sub="전체 문서 수"
                iconPath="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                iconBg="bg-green-50"
                iconColor="text-green-600"
              />
              <MetricCard
                label="실행 중 작업"
                value={metrics?.running_jobs ?? "-"}
                sub="백그라운드 작업"
                iconPath="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                iconBg="bg-purple-50"
                iconColor="text-purple-600"
              />
              <MetricCard
                label="실패 작업 (24h)"
                value={metrics?.failed_jobs_24h ?? "-"}
                danger={(metrics?.failed_jobs_24h ?? 0) > 0}
                iconPath="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                iconBg={(metrics?.failed_jobs_24h ?? 0) > 0 ? "bg-red-50" : "bg-gray-50"}
                iconColor={
                  (metrics?.failed_jobs_24h ?? 0) > 0 ? "text-red-600" : "text-gray-400"
                }
              />
            </>
          )}
        </div>
      </section>

      {/* ── 추가 메트릭 (감사 이벤트 + 인덱싱 실패) ── */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <MetricCard
            label="감사 이벤트 (24h)"
            value={metrics.audit_events_24h}
            iconPath="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
          <MetricCard
            label="인덱싱 실패"
            value={metrics.indexing_failed}
            danger={metrics.indexing_failed > 0}
            iconPath="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            iconBg={metrics.indexing_failed > 0 ? "bg-red-50" : "bg-gray-50"}
            iconColor={metrics.indexing_failed > 0 ? "text-red-600" : "text-gray-400"}
          />
        </div>
      )}

      {/* ── 벡터화 파이프라인 현황 (Phase 10) ── */}
      {vecStats && (
        <section
          className="bg-white rounded-xl border border-gray-200 p-6"
          aria-label="벡터화 파이프라인 현황"
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-bold text-gray-900">벡터화 파이프라인 현황</h2>
            <a
              href="/admin/vectorization"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-2 rounded hover:bg-blue-50 transition-all duration-200 min-h-[44px] inline-flex items-center"
            >
              상세 관리
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <MetricCard
              label="현재 청크"
              value={vecStats.current_chunks}
              sub="활성 벡터 청크"
              iconPath="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
              iconBg="bg-indigo-50"
              iconColor="text-indigo-600"
            />
            <MetricCard
              label="임베딩 완료"
              value={vecStats.embedded_chunks}
              sub="embedding 보유"
              iconPath="M5 13l4 4L19 7"
              iconBg="bg-green-50"
              iconColor="text-green-600"
            />
            <MetricCard
              label="임베딩 대기"
              value={vecStats.pending_chunks}
              danger={vecStats.pending_chunks > 0}
              sub="처리 필요"
              iconPath="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              iconBg={vecStats.pending_chunks > 0 ? "bg-orange-50" : "bg-gray-50"}
              iconColor={vecStats.pending_chunks > 0 ? "text-orange-600" : "text-gray-400"}
            />
            <MetricCard
              label="벡터화 문서"
              value={vecStats.vectorized_docs}
              sub="문서 단위"
              iconPath="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              iconBg="bg-cyan-50"
              iconColor="text-cyan-600"
            />
          </div>
        </section>
      )}

      {/* ── 시스템 상태 + 최근 에러 (2열) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
        {/* 시스템 상태 */}
        <section
          className="bg-white rounded-xl border border-gray-200 p-6"
          aria-label="시스템 상태"
        >
          <h2 className="text-lg font-bold text-gray-900 mb-4">시스템 상태</h2>
          {healthQ.isLoading ? (
            <SkeletonRows count={4} />
          ) : healthQ.isError ? (
            <ErrorFallback label="시스템 상태" onRetry={() => healthQ.refetch()} />
          ) : (
            <>
              {/* 전체 상태 */}
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-200">
                <HealthDot status={health?.overall ?? "ok"} />
                <span className="text-sm font-semibold text-gray-900">전체 상태</span>
                <HealthLabel status={health?.overall ?? "ok"} />
              </div>
              {/* 컴포넌트별 */}
              <div className="space-y-3">
                {(health?.components ?? []).map((c) => (
                  <div key={c.name} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2.5">
                      <HealthDot status={c.status} />
                      <span className="text-sm font-medium text-gray-900">{c.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <HealthLabel status={c.status} />
                      {c.detail && (
                        <span className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">{c.detail}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* 최근 에러 */}
        <section
          className="bg-white rounded-xl border border-gray-200 p-6"
          aria-label="최근 오류"
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-bold text-gray-900">최근 오류</h2>
            <a
              href="/admin/monitoring"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-2 rounded hover:bg-blue-50 transition-all duration-200 min-h-[44px] inline-flex items-center"
            >
              모니터링
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          {errorsQ.isLoading ? (
            <SkeletonRows count={3} />
          ) : errorsQ.isError ? (
            <ErrorFallback label="오류" onRetry={() => errorsQ.refetch()} />
          ) : errors.length === 0 ? (
            <div className="text-center py-8" role="status" aria-live="polite">
              <svg
                className="w-10 h-10 text-green-200 mx-auto mb-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm text-gray-400">최근 오류가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2" role="list">
              {errors.slice(0, 5).map((err) => (
                <div
                  key={err.id}
                  className="flex items-start gap-3 p-4 rounded-lg bg-red-50 text-sm border border-red-200 transition-colors hover:bg-red-100"
                  role="listitem"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-red-700 truncate">
                      {err.resource_name || err.job_type}
                    </p>
                    <p className="text-xs text-red-500 truncate mt-0.5">
                      {err.error_code ? `[${err.error_code}] ` : ""}
                      {err.error_message ?? "알 수 없는 오류"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {err.ended_at
                      ? new Date(err.ended_at).toLocaleTimeString("ko", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── 최근 감사 이벤트 ── */}
      <section
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        aria-label="최근 감사 이벤트"
      >
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-bold text-gray-900">최근 감사 이벤트</h2>
          <a
            href="/admin/audit-logs"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-2 rounded hover:bg-blue-50 transition-all duration-200 min-h-[44px] inline-flex items-center"
          >
            전체 보기
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
        {auditQ.isLoading ? (
          <div className="p-4">
            <SkeletonRows count={5} />
          </div>
        ) : auditQ.isError ? (
          <ErrorFallback label="감사 이벤트" onRetry={() => auditQ.refetch()} />
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-8" role="status" aria-live="polite">
            <svg
              className="w-10 h-10 text-gray-200 mx-auto mb-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm text-gray-400">아직 감사 이벤트가 기록되지 않았습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    이벤트 유형
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    행위자
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    심각도
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    결과
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    시간
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 sm:px-6 py-3 font-medium text-gray-900">
                      {log.event_type}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-gray-700">
                      {log.actor_name ?? log.actor_id ?? "-"}
                    </td>
                    <td className="px-4 sm:px-6 py-3">
                      <SeverityBadge severity={log.severity} />
                    </td>
                    <td className="px-4 sm:px-6 py-3">
                      <StatusBadge value={log.result} />
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-gray-600 text-xs whitespace-nowrap font-medium">
                      {new Date(log.created_at).toLocaleString("ko", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
