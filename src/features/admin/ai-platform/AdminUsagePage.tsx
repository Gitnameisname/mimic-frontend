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
import { usageApi } from "@/lib/api/s2admin";
import type { UsageMetric, UsageSummary } from "@/types/s2admin";

// ─── 기간 선택 ───

const PERIOD_OPTIONS = [
  { label: "7일", value: 7 },
  { label: "30일", value: 30 },
  { label: "90일", value: 90 },
] as const;

// ─── 토큰 포맷 ───

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── 요약 카드 ───

function SummaryCard({
  label,
  value,
  sub,
  iconPath,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  sub?: string;
  iconPath: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <article className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`} aria-hidden="true">
        <svg className={`w-5 h-5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </article>
  );
}

// ─── 일별 집계 (stacked bar용) ───

function aggregateDailySeries(metrics: UsageMetric[]) {
  const byDate = new Map<string, { date: string; input: number; output: number; calls: number }>();
  for (const m of metrics) {
    const entry = byDate.get(m.date) ?? { date: m.date, input: 0, output: 0, calls: 0 };
    entry.input += m.input_tokens;
    entry.output += m.output_tokens;
    entry.calls += m.call_count;
    byDate.set(m.date, entry);
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ─── 모델별 상세 테이블 ───

function ModelSummaryTable({ rows }: { rows: UsageSummary[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">모델</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">프로바이더</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">입력 토큰</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">출력 토큰</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">호출 수</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">평균 지연</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">예상 비용</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={`${r.provider}-${r.model_name}`} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-semibold text-gray-900 font-mono text-xs">{r.model_name}</td>
              <td className="px-4 py-3 text-gray-600">{r.provider}</td>
              <td className="px-4 py-3 text-right text-gray-700">{fmtTokens(r.total_input_tokens)}</td>
              <td className="px-4 py-3 text-right text-gray-700">{fmtTokens(r.total_output_tokens)}</td>
              <td className="px-4 py-3 text-right text-gray-700">{r.total_calls.toLocaleString("ko")}</td>
              <td className="px-4 py-3 text-right text-gray-700">{r.avg_latency_ms.toFixed(0)}ms</td>
              <td className="px-4 py-3 text-right font-semibold text-gray-900">
                ${r.total_cost_usd.toFixed(4)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── CSV Export 링크 ───

function ExportButton({ days }: { days: number }) {
  const href = usageApi.exportCsv({ days });
  return (
    <a
      href={href}
      download
      className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-gray-300"
      aria-label="CSV 다운로드"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      CSV 다운로드
    </a>
  );
}

// ═══════════════════════════════════════
// AdminUsagePage
// ═══════════════════════════════════════

export function AdminUsagePage() {
  const [days, setDays] = useState<7 | 30 | 90>(30);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "usage", days],
    queryFn: () => usageApi.getDashboard({ days }),
  });

  const dashboard = data?.data;
  const dailySeries = dashboard ? aggregateDailySeries(dashboard.daily_metrics) : [];

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">비용·사용량 현황</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-gray-300 overflow-hidden" role="group" aria-label="기간 선택">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setDays(opt.value as 7 | 30 | 90)}
                className={`px-3 py-2 text-sm font-semibold transition-colors min-h-[40px] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-inset ${
                  days === opt.value
                    ? "bg-red-700 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
                aria-pressed={days === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {dashboard && <ExportButton days={days} />}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center py-12 gap-3">
          <p className="text-sm text-gray-500">사용량 데이터를 불러오지 못했습니다.</p>
          <button type="button" onClick={() => refetch()} className="text-sm text-red-700 font-semibold px-4 py-2 rounded-lg hover:bg-red-50 min-h-[44px]">
            다시 시도
          </button>
        </div>
      ) : dashboard ? (
        <>
          {/* 요약 카드 */}
          <section aria-label="사용량 요약" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <SummaryCard
              label="총 예상 비용"
              value={`$${dashboard.total_cost_usd.toFixed(4)}`}
              sub={`최근 ${days}일`}
              iconPath="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              iconBg="bg-green-50"
              iconColor="text-green-600"
            />
            <SummaryCard
              label="총 토큰 사용량"
              value={fmtTokens(
                dashboard.summary_by_model.reduce((s, r) => s + r.total_input_tokens + r.total_output_tokens, 0)
              )}
              sub="입력 + 출력"
              iconPath="M4 6h16M4 12h16M4 18h7"
              iconBg="bg-blue-50"
              iconColor="text-blue-600"
            />
            <SummaryCard
              label="총 API 호출"
              value={dashboard.summary_by_model.reduce((s, r) => s + r.total_calls, 0).toLocaleString("ko")}
              sub="전체 모델 합산"
              iconPath="M13 10V3L4 14h7v7l9-11h-7z"
              iconBg="bg-purple-50"
              iconColor="text-purple-600"
            />
          </section>

          {/* 토큰 사용량 (Stacked Bar) */}
          {dailySeries.length > 0 && (
            <section aria-label="일별 토큰 사용량" className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-base font-bold text-gray-900 mb-4">모델별 토큰 사용량 (일별)</h2>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={dailySeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tickFormatter={fmtTokens} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(value, name) => [fmtTokens(Number(value)), name === "input" ? "입력 토큰" : "출력 토큰"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend formatter={(v) => (v === "input" ? "입력 토큰" : "출력 토큰")} />
                  <Bar dataKey="input" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} name="input" />
                  <Bar dataKey="output" stackId="a" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="output" />
                </BarChart>
              </ResponsiveContainer>
            </section>
          )}

          {/* 호출 수 (Line) */}
          {dailySeries.length > 0 && (
            <section aria-label="일별 API 호출 수" className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-base font-bold text-gray-900 mb-4">API 호출 수 추이</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailySeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="calls" stroke="#b91c1c" strokeWidth={2} dot={false} name="호출 수" />
                </LineChart>
              </ResponsiveContainer>
            </section>
          )}

          {/* 모델별 상세 테이블 */}
          {dashboard.summary_by_model.length > 0 && (
            <section aria-label="모델별 상세 통계" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-base font-bold text-gray-900">모델별 상세</h2>
              </div>
              <ModelSummaryTable rows={dashboard.summary_by_model} />
            </section>
          )}

          {dailySeries.length === 0 && dashboard.summary_by_model.length === 0 && (
            <div className="text-center py-16 text-gray-500 text-sm">
              선택한 기간의 사용 데이터가 없습니다.
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
