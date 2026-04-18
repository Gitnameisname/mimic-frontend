"use client";

/**
 * 모니터링 대시보드 (Phase 14-12)
 *
 * - 시스템 구성 요소 상태 카드 (PostgreSQL/Valkey/Vector DB/Job Runner)
 * - API 응답 시간 라인 차트 (P50/P95/P99)
 * - 에러 추이 라인 차트 (4xx/5xx)
 * - 최근 에러 상세 테이블 (background_jobs FAILED 재사용)
 * - 자동 갱신 (10초/30초/1분/수동)
 */

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { LineChart, type LineSeries } from "./LineChart";
import type {
  ComponentStatus,
  RecentError,
} from "@/types/admin";

// ---- 자동 갱신 옵션 ----
const REFRESH_OPTIONS = [
  { value: 10000, label: "10초" },
  { value: 30000, label: "30초" },
  { value: 60000, label: "1분" },
  { value: 0, label: "수동" },
];

const PERIOD_OPTIONS = [
  { value: "1h", label: "1시간" },
  { value: "6h", label: "6시간" },
  { value: "24h", label: "24시간" },
  { value: "7d", label: "7일" },
];

// ---- 상태 → 색상 ----
function statusBadge(status: ComponentStatus["status"]): {
  dot: string;
  label: string;
  textColor: string;
} {
  switch (status) {
    case "HEALTHY":
      return { dot: "bg-green-500", label: "정상", textColor: "text-green-700" };
    case "DOWN":
      return { dot: "bg-red-500", label: "장애", textColor: "text-red-700" };
    default:
      return { dot: "bg-gray-400", label: "알 수 없음", textColor: "text-gray-600" };
  }
}

// ---- 컴포넌트 카드 ----

function ComponentCard({ component }: { component: ComponentStatus }) {
  const badge = statusBadge(component.status);
  const meta = component.metadata ?? {};
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors"
      role="group"
      aria-label={`${component.name} 상태: ${badge.label}`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${badge.dot} flex-shrink-0`}
            aria-hidden="true"
          />
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {component.name}
          </h3>
        </div>
        <span
          className={`text-xs font-medium ${badge.textColor} px-2 py-0.5 bg-gray-50 rounded`}
        >
          {badge.label}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-gray-900 font-mono">
          {component.latency_ms !== null ? component.latency_ms : "-"}
        </span>
        <span className="text-xs text-gray-400">ms</span>
      </div>
      {Object.keys(meta).length > 0 && (
        <dl className="mt-2 text-xs text-gray-500 space-y-0.5">
          {Object.entries(meta)
            .filter(([k]) => k !== "error")
            .slice(0, 3)
            .map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <dt className="text-gray-400">{k}:</dt>
                <dd className="font-mono text-gray-700 truncate">{String(v)}</dd>
              </div>
            ))}
          {meta.error != null && (
            <div className="text-red-600 truncate" title={String(meta.error)}>
              {String(meta.error)}
            </div>
          )}
        </dl>
      )}
    </div>
  );
}

// ---- 메인 페이지 ----

export function AdminMonitoringPage() {
  const [refreshInterval, setRefreshInterval] = useState<number>(30000);
  const [period, setPeriod] = useState<string>("24h");

  // 컴포넌트 상태
  const componentsQuery = useQuery({
    queryKey: ["admin", "monitoring", "components"],
    queryFn: () => adminApi.getMonitoringComponents(),
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
    placeholderData: (prev) => prev, // 갱신 중 이전 데이터 유지
  });

  // 응답 시간
  const rtQuery = useQuery({
    queryKey: ["admin", "monitoring", "response-times", period],
    queryFn: () => adminApi.getResponseTimeTrend(period),
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
    placeholderData: (prev) => prev,
  });

  // 에러 추이
  const errQuery = useQuery({
    queryKey: ["admin", "monitoring", "error-trends", period],
    queryFn: () => adminApi.getErrorTrend(period),
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
    placeholderData: (prev) => prev,
  });

  // 최근 에러 (기존 dashboard/errors API 재사용)
  const recentErrorsQuery = useQuery({
    queryKey: ["admin", "monitoring", "recent-errors"],
    queryFn: () => adminApi.getRecentErrors(),
    refetchInterval: refreshInterval > 0 ? refreshInterval : false,
    placeholderData: (prev) => prev,
  });

  // 갱신 카운트다운 (UX).
  // F-05 시정(2026-04-18): 효과 본문 동기 setState (set-state-in-effect) 제거를 위해
  //   초기 리셋을 setInterval 콜백 안의 첫 tick 으로 위임. dataUpdatedAt / refreshInterval
  //   변경 시 effect 가 재실행되어 새 interval 이 즉시 시작되므로 UX 차이는 1초 미만.
  const [secondsToNext, setSecondsToNext] = useState<number>(
    Math.floor(refreshInterval / 1000),
  );
  useEffect(() => {
    if (refreshInterval === 0) return;
    const total = Math.floor(refreshInterval / 1000);
    const startedAt = Date.now();
    const handle = window.setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - startedAt) / 1000);
      const remaining = total - (elapsedSec % total);
      setSecondsToNext(remaining === 0 ? total : remaining);
    }, 1000);
    return () => window.clearInterval(handle);
  }, [refreshInterval, componentsQuery.dataUpdatedAt]);

  function refetchAll() {
    componentsQuery.refetch();
    rtQuery.refetch();
    errQuery.refetch();
    recentErrorsQuery.refetch();
  }

  // 차트 데이터
  const rtData = rtQuery.data?.data?.data ?? [];
  const errData = errQuery.data?.data?.data ?? [];

  const rtTimestamps = useMemo(() => rtData.map((p) => p.timestamp), [rtData]);
  const rtSeries: LineSeries[] = useMemo(
    () => [
      { key: "p50", label: "P50", color: "#22c55e", values: rtData.map((p) => p.p50) },
      { key: "p95", label: "P95", color: "#f59e0b", values: rtData.map((p) => p.p95) },
      { key: "p99", label: "P99", color: "#ef4444", values: rtData.map((p) => p.p99) },
    ],
    [rtData],
  );

  const errTimestamps = useMemo(() => errData.map((p) => p.timestamp), [errData]);
  const errSeries: LineSeries[] = useMemo(
    () => [
      {
        key: "client",
        label: "4xx (클라이언트)",
        color: "#f59e0b",
        values: errData.map((p) => p.client_errors),
      },
      {
        key: "server",
        label: "5xx (서버)",
        color: "#ef4444",
        values: errData.map((p) => p.server_errors),
      },
    ],
    [errData],
  );

  const components = componentsQuery.data?.data?.components ?? [];
  const recentErrors: RecentError[] = (recentErrorsQuery.data?.data ?? []).slice(0, 10);

  // 자동 갱신 중 에러 — 이전 데이터 유지하면서 배너만 표시
  const anyError =
    componentsQuery.isError ||
    rtQuery.isError ||
    errQuery.isError ||
    recentErrorsQuery.isError;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            모니터링 대시보드
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            시스템 상태와 성능 지표를 실시간으로 확인합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label htmlFor="refresh-interval" className="sr-only">
            자동 갱신 주기
          </label>
          <select
            id="refresh-interval"
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white min-h-[40px]
              focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none"
          >
            {REFRESH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                자동 갱신: {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={refetchAll}
            className="px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg
              hover:bg-gray-50 transition-colors min-h-[40px]
              focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none active:scale-[0.98]"
            aria-label="모든 데이터 새로고침"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* 갱신 상태 표시 */}
      {refreshInterval > 0 && (
        <p
          className="text-xs text-gray-400"
          aria-live="polite"
          aria-atomic="true"
        >
          다음 갱신까지 {secondsToNext}초 · 최근 갱신{" "}
          {componentsQuery.dataUpdatedAt
            ? new Date(componentsQuery.dataUpdatedAt).toLocaleTimeString("ko-KR")
            : "—"}
        </p>
      )}

      {/* 에러 배너 */}
      {anyError && (
        <div
          role="alert"
          className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800 flex items-center gap-2"
        >
          <span aria-hidden="true">⚠</span>
          일부 데이터를 불러오지 못했습니다. 표시된 정보는 이전 갱신 기준입니다.
        </div>
      )}

      {/* 시스템 상태 카드 그리드 */}
      <section aria-labelledby="components-heading">
        <h2
          id="components-heading"
          className="text-sm font-semibold text-gray-700 mb-2"
        >
          시스템 상태
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {componentsQuery.isLoading && components.length === 0
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 bg-gray-100 rounded-xl animate-pulse"
                  role="status"
                  aria-label="로딩 중"
                />
              ))
            : components.map((c) => <ComponentCard key={c.name} component={c} />)}
        </div>
      </section>

      {/* 차트 영역 */}
      <section aria-labelledby="charts-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2
            id="charts-heading"
            className="text-sm font-semibold text-gray-700"
          >
            추이 차트
          </h2>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
            {PERIOD_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setPeriod(o.value)}
                aria-pressed={period === o.value}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors min-h-[32px]
                  focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none
                  ${period === o.value
                    ? "bg-white text-red-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* 응답 시간 차트 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              API 응답 시간 (P50 / P95 / P99)
              <span className="ml-2 text-xs text-gray-400 font-normal">단위: ms</span>
            </h3>
            <LineChart
              timestamps={rtTimestamps}
              series={rtSeries}
              unit="ms"
              ariaLabel="API 응답 시간 추이 차트"
              emptyMessage={
                rtQuery.isLoading ? "데이터 불러오는 중..." : "응답 시간 데이터 수집 중"
              }
            />
          </div>

          {/* 에러 추이 차트 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              에러 추이 (4xx / 5xx)
              <span className="ml-2 text-xs text-gray-400 font-normal">단위: 건수</span>
            </h3>
            <LineChart
              timestamps={errTimestamps}
              series={errSeries}
              unit="건"
              ariaLabel="에러 추이 차트"
              emptyMessage={
                errQuery.isLoading ? "데이터 불러오는 중..." : "에러 데이터 없음 (정상)"
              }
            />
          </div>
        </div>
      </section>

      {/* 최근 에러 테이블 */}
      <section aria-labelledby="recent-errors-heading">
        <h2
          id="recent-errors-heading"
          className="text-sm font-semibold text-gray-700 mb-2"
        >
          최근 에러 (백그라운드 작업)
        </h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    발생 시간
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    유형
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    리소스
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    에러 코드
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentErrorsQuery.isLoading && recentErrors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-sm text-gray-400"
                      role="status"
                    >
                      로딩 중...
                    </td>
                  </tr>
                ) : recentErrors.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-sm text-gray-400"
                    >
                      최근 에러가 없습니다. 🎉
                    </td>
                  </tr>
                ) : (
                  recentErrors.map((err) => (
                    <tr
                      key={err.id}
                      className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60 transition-colors"
                    >
                      <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                        {err.ended_at
                          ? new Date(err.ended_at).toLocaleString("ko-KR")
                          : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-sm font-mono text-gray-900">
                        {err.job_type ?? "-"}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-700">
                        {err.resource_name ?? "-"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-red-700 font-mono"
                          title={err.error_message ?? undefined}>
                        {err.error_code ?? "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
