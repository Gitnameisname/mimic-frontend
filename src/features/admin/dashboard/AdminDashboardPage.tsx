"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { SeverityBadge, StatusBadge } from "@/components/admin/StatusBadge";
import { cn } from "@/lib/utils";

// --- Metric Card ---
function MetricCard({
  label,
  value,
  sub,
  danger,
}: {
  label: string;
  value: number | string;
  sub?: string;
  danger?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={cn("text-3xl font-bold", danger ? "text-red-600" : "text-gray-900")}>
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// --- Health Dot ---
function HealthDot({ status }: { status: string }) {
  const color =
    status === "ok"
      ? "bg-green-500"
      : status === "degraded"
      ? "bg-yellow-500"
      : "bg-red-500";
  return <span className={cn("inline-block w-2 h-2 rounded-full", color)} />;
}

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

  // Phase 10: 벡터화 지표
  const vecStats = metrics?.vectorization;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">시스템 상태 대시보드</h1>
        <span className="text-xs text-gray-400">30초마다 자동 갱신</span>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          label="총 사용자"
          value={metrics?.total_users ?? "-"}
          sub="활성 계정"
        />
        <MetricCard
          label="총 문서"
          value={metrics?.total_documents ?? "-"}
          sub="전체 문서 수"
        />
        <MetricCard
          label="실행 중 작업"
          value={metrics?.running_jobs ?? "-"}
          sub="백그라운드 작업"
        />
        <MetricCard
          label="실패 작업 (24h)"
          value={metrics?.failed_jobs_24h ?? "-"}
          danger={(metrics?.failed_jobs_24h ?? 0) > 0}
        />
        <MetricCard
          label="감사 이벤트 (24h)"
          value={metrics?.audit_events_24h ?? "-"}
        />
        <MetricCard
          label="인덱싱 실패"
          value={metrics?.indexing_failed ?? "-"}
          danger={(metrics?.indexing_failed ?? 0) > 0}
        />
      </div>

      {/* Phase 10: 벡터화 현황 카드 */}
      {vecStats && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">벡터화 파이프라인 현황</h2>
            <a
              href="/admin/vectorization"
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              상세 관리 →
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              label="현재 청크"
              value={vecStats.current_chunks ?? "-"}
              sub="활성 벡터 청크"
            />
            <MetricCard
              label="임베딩 완료"
              value={vecStats.embedded_chunks ?? "-"}
              sub="embedding 보유"
            />
            <MetricCard
              label="임베딩 대기"
              value={vecStats.pending_chunks ?? "-"}
              sub="처리 필요"
              danger={(vecStats.pending_chunks ?? 0) > 0}
            />
            <MetricCard
              label="벡터화 문서"
              value={vecStats.vectorized_docs ?? "-"}
              sub="문서 단위"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Component Health */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">컴포넌트 상태</h2>
          {healthQ.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                <HealthDot status={health?.overall ?? "ok"} />
                <span className="text-sm font-medium text-gray-700">
                  전체:{" "}
                  <span
                    className={
                      health?.overall === "ok"
                        ? "text-green-600"
                        : health?.overall === "degraded"
                        ? "text-yellow-600"
                        : "text-red-600"
                    }
                  >
                    {health?.overall?.toUpperCase() ?? "N/A"}
                  </span>
                </span>
              </div>
              <div className="space-y-2">
                {(health?.components ?? []).map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <HealthDot status={c.status} />
                      <span className="text-gray-600">{c.name}</span>
                    </div>
                    <span className="text-xs text-gray-400">{c.detail ?? c.status}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Recent Errors */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">최근 오류</h2>
          {errorsQ.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : errors.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">최근 오류가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {errors.slice(0, 5).map((err) => (
                <div
                  key={err.id}
                  className="flex items-start gap-3 p-2 rounded-lg bg-red-50 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-red-700 truncate">{err.resource_name || err.job_type}</p>
                    <p className="text-xs text-red-500 truncate mt-0.5">
                      {err.error_code ? `[${err.error_code}] ` : ""}
                      {err.error_message ?? "알 수 없는 오류"}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {err.ended_at ? new Date(err.ended_at).toLocaleTimeString("ko", { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Audit Logs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">최근 감사 이벤트</h2>
          <a href="/admin/audit-logs" className="text-xs text-red-600 hover:underline">
            전체 보기 →
          </a>
        </div>
        {auditQ.isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : auditLogs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">최근 감사 이벤트가 없습니다.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">이벤트 유형</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">행위자</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">심각도</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">결과</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">시간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-700">{log.event_type}</td>
                  <td className="px-4 py-2.5 text-gray-500">{log.actor_name ?? log.actor_id ?? "-"}</td>
                  <td className="px-4 py-2.5">
                    <SeverityBadge severity={log.severity} />
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge value={log.result} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">
                    {new Date(log.created_at).toLocaleString("ko", {
                      month: "2-digit", day: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
