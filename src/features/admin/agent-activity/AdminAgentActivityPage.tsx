"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { agentActivityApi } from "@/lib/api/s2admin";
import type { AgentActivityStats, AgentAnomaly } from "@/types/s2admin";
import { cn } from "@/lib/utils";

// ─── 기간 선택 ───

const PERIOD_OPTIONS = [
  { label: "7일", value: 7 },
  { label: "30일", value: 30 },
] as const;

// ─── 이상 알림 배너 ───

function AnomalyBanner({ anomaly }: { anomaly: AgentAnomaly }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
      <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>
        <p className="text-sm font-semibold text-amber-800">{anomaly.agent_name}</p>
        <p className="text-xs text-amber-700 mt-0.5">{anomaly.detail}</p>
        <p className="text-xs text-amber-600 mt-0.5">{new Date(anomaly.detected_at).toLocaleString("ko")}</p>
      </div>
    </div>
  );
}

// ─── 에이전트별 통계 테이블 ───

function AgentStatsTable({ stats }: { stats: AgentActivityStats[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">에이전트</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">총 제안</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">승인</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">거절</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">대기</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">승인율</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">평균 검토 소요</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {stats.map((s) => (
            <tr key={s.agent_id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-semibold text-gray-900">{s.agent_name}</td>
              <td className="px-4 py-3 text-right text-gray-700">{s.total_proposals}</td>
              <td className="px-4 py-3 text-right">
                <span className="font-semibold text-green-700">{s.approved}</span>
              </td>
              <td className="px-4 py-3 text-right">
                <span className={cn("font-semibold", s.rejected > 0 ? "text-red-700" : "text-gray-500")}>
                  {s.rejected}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-amber-700">{s.pending}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-16 bg-gray-200 rounded-full h-1.5" aria-hidden="true">
                    <div
                      className={cn("h-1.5 rounded-full", s.approval_rate >= 70 ? "bg-green-500" : s.approval_rate >= 40 ? "bg-amber-500" : "bg-red-500")}
                      style={{ width: `${Math.min(s.approval_rate, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{s.approval_rate.toFixed(1)}%</span>
                </div>
              </td>
              <td className="px-4 py-3 text-right text-gray-600 text-xs">
                {s.avg_review_hours !== null ? `${s.avg_review_hours.toFixed(1)}시간` : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════
// AdminAgentActivityPage
// ═══════════════════════════════════════

export function AdminAgentActivityPage() {
  const [days, setDays] = useState<7 | 30>(30);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "agent-activity", days],
    queryFn: () => agentActivityApi.getDashboard({ days }),
    refetchInterval: 60_000,
  });

  const dashboard = data?.data;

  // 차트용 집계: 날짜별 총 제안 수
  const chartData = dashboard
    ? Object.values(
        dashboard.series.reduce(
          (acc, s) => {
            if (!acc[s.date]) acc[s.date] = { date: s.date, proposals: 0, approved: 0 };
            acc[s.date].proposals += s.proposals;
            acc[s.date].approved += s.approved;
            return acc;
          },
          {} as Record<string, { date: string; proposals: number; approved: number }>
        )
      ).sort((a, b) => a.date.localeCompare(b.date))
    : [];

  // 승인률 시계열
  const approvalRateSeries = chartData.map((d) => ({
    date: d.date,
    rate: d.proposals > 0 ? Math.round((d.approved / d.proposals) * 100) : 0,
  }));

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">에이전트 활동 대시보드</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden" role="group" aria-label="기간 선택">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDays(opt.value as 7 | 30)}
                className={`px-3 py-2 text-sm font-semibold transition-colors min-h-[40px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset ${
                  days === opt.value ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                aria-pressed={days === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 min-h-[40px] focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="새로고침"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center py-12 gap-3">
          <p className="text-sm text-gray-500">활동 데이터를 불러오지 못했습니다.</p>
          <button type="button" onClick={() => refetch()} className="text-sm text-blue-700 font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 min-h-[44px]">다시 시도</button>
        </div>
      ) : dashboard ? (
        <>
          {/* 이상 알림 */}
          {dashboard.anomalies.length > 0 && (
            <section aria-label="이상 행동 알림">
              <h2 className="text-sm font-bold text-gray-900 mb-3">이상 행동 감지</h2>
              <div className="space-y-2">
                {dashboard.anomalies.map((a, i) => (
                  <AnomalyBanner key={i} anomaly={a} />
                ))}
              </div>
            </section>
          )}

          {/* 제안 수 시계열 */}
          {chartData.length > 0 && (
            <section aria-label="에이전트별 제안 수" className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-base font-bold text-gray-900 mb-4">일별 제안 수</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend />
                  <Bar dataKey="proposals" fill="#3b82f6" name="총 제안" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="approved" fill="#22c55e" name="승인" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}

          {/* 승인률 추이 */}
          {approvalRateSeries.length > 0 && (
            <section aria-label="승인률 추이" className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-base font-bold text-gray-900 mb-4">승인률 추이 (%)</h2>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={approvalRateSeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => [`${v}%`, "승인률"]} />
                  <Line type="monotone" dataKey="rate" stroke="#b91c1c" strokeWidth={2} dot={false} name="승인률" />
                </LineChart>
              </ResponsiveContainer>
            </section>
          )}

          {/* 에이전트별 상세 통계 */}
          {dashboard.stats_by_agent.length > 0 && (
            <section aria-label="에이전트별 상세 통계" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-base font-bold text-gray-900">에이전트별 상세 통계</h2>
              </div>
              <AgentStatsTable stats={dashboard.stats_by_agent} />
            </section>
          )}

          {chartData.length === 0 && dashboard.stats_by_agent.length === 0 && (
            <div className="text-center py-16 text-gray-500 text-sm">
              선택한 기간의 에이전트 활동이 없습니다.
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
