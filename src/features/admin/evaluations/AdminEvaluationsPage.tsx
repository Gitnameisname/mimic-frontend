"use client";

import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { evaluationsApi } from "@/lib/api/s2admin";
import type { EvaluationRun, EvaluationMetricSeries } from "@/types/s2admin";
import { cn } from "@/lib/utils";

// ─── 스켈레톤 배너 ───

function SkeletonBanner() {
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
      <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <p className="text-sm font-bold text-amber-800">스켈레톤 상태</p>
        <p className="text-xs text-amber-700 mt-0.5">
          이 페이지는 Phase 7 FG7.2 완료 후 평가 러너 API와 연결됩니다. 현재는 목 데이터로 동작합니다.
        </p>
      </div>
    </div>
  );
}

// ─── 목 데이터 ───

const MOCK_RUNS: EvaluationRun[] = [
  { id: "er-1", golden_set_id: "gs-1", golden_set_name: "RAG 기본 평가셋", prompt_version_id: "pv-1", model_name: "gpt-4o", ran_at: "2026-04-15T10:00:00Z", item_count: 50, avg_faithfulness: 0.87, avg_answer_relevance: 0.82, citation_present_rate: 0.94, passed_ci: true },
  { id: "er-2", golden_set_id: "gs-1", golden_set_name: "RAG 기본 평가셋", prompt_version_id: "pv-2", model_name: "claude-sonnet-4-6", ran_at: "2026-04-14T14:30:00Z", item_count: 50, avg_faithfulness: 0.91, avg_answer_relevance: 0.88, citation_present_rate: 0.96, passed_ci: true },
  { id: "er-3", golden_set_id: "gs-2", golden_set_name: "문서 검색 평가셋", prompt_version_id: "pv-1", model_name: "gpt-4o", ran_at: "2026-04-13T09:00:00Z", item_count: 30, avg_faithfulness: 0.75, avg_answer_relevance: 0.79, citation_present_rate: 0.87, passed_ci: false },
];

const MOCK_SERIES: EvaluationMetricSeries[] = [
  { date: "2026-04-10", faithfulness: 0.81, answer_relevance: 0.79, citation_present_rate: 0.90 },
  { date: "2026-04-11", faithfulness: 0.83, answer_relevance: 0.81, citation_present_rate: 0.91 },
  { date: "2026-04-12", faithfulness: 0.85, answer_relevance: 0.83, citation_present_rate: 0.92 },
  { date: "2026-04-13", faithfulness: 0.75, answer_relevance: 0.79, citation_present_rate: 0.87 },
  { date: "2026-04-14", faithfulness: 0.91, answer_relevance: 0.88, citation_present_rate: 0.96 },
  { date: "2026-04-15", faithfulness: 0.87, answer_relevance: 0.82, citation_present_rate: 0.94 },
];

const THRESHOLDS = {
  faithfulness: 0.80,
  answer_relevance: 0.75,
  citation_present_rate: 0.90,
};

// ─── 지표 카드 ───

function MetricCard({
  label,
  value,
  threshold,
}: {
  label: string;
  value: number | null;
  threshold: number;
}) {
  const pass = value !== null && value >= threshold;
  return (
    <article className={cn(
      "rounded-xl border p-4",
      value === null ? "bg-gray-50 border-gray-200" : pass ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
    )}>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <p className={cn("text-3xl font-bold", value === null ? "text-gray-400" : pass ? "text-green-800" : "text-red-800")}>
        {value !== null ? (value * 100).toFixed(1) + "%" : "-"}
      </p>
      <p className="text-xs text-gray-500 mt-1">
        기준: {(threshold * 100).toFixed(0)}% · {value === null ? "데이터 없음" : pass ? "통과" : "미달"}
      </p>
    </article>
  );
}

// ═══════════════════════════════════════
// AdminEvaluationsPage (스켈레톤)
// ═══════════════════════════════════════

export function AdminEvaluationsPage() {
  const { data: runsData, isError: runsError } = useQuery({
    queryKey: ["admin", "evaluation-runs"],
    queryFn: () => evaluationsApi.listRuns({ page_size: 10 }),
    retry: false,
  });

  const { data: seriesData, isError: seriesError } = useQuery({
    queryKey: ["admin", "evaluation-series"],
    queryFn: () => evaluationsApi.getMetricSeries({ days: 30 }),
    retry: false,
  });

  const runs = runsError ? MOCK_RUNS : (runsData?.data ?? MOCK_RUNS);
  const series = seriesError ? MOCK_SERIES : (seriesData?.data ?? MOCK_SERIES);

  const latest = runs[0];

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">평가 결과 대시보드</h1>
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold",
          latest?.passed_ci ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        )}>
          <span className={cn("w-2 h-2 rounded-full", latest?.passed_ci ? "bg-green-500" : "bg-red-500")} aria-hidden="true" />
          CI: {latest?.passed_ci ? "통과" : "실패"}
        </div>
      </div>

      <SkeletonBanner />

      {/* 최근 실행 요약 */}
      {latest && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3">최근 평가 실행 요약</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">골든셋</p>
              <p className="font-semibold text-gray-900 truncate">{latest.golden_set_name}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">모델</p>
              <p className="font-semibold text-gray-900 font-mono text-xs">{latest.model_name}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">평가 항목 수</p>
              <p className="font-semibold text-gray-900">{latest.item_count}개</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">실행 시각</p>
              <p className="font-semibold text-gray-900 text-xs">{new Date(latest.ran_at).toLocaleString("ko")}</p>
            </div>
          </div>
        </div>
      )}

      {/* 지표별 현황 */}
      <section aria-label="지표별 현황" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard label="Faithfulness" value={latest?.avg_faithfulness ?? null} threshold={THRESHOLDS.faithfulness} />
        <MetricCard label="Answer Relevance" value={latest?.avg_answer_relevance ?? null} threshold={THRESHOLDS.answer_relevance} />
        <MetricCard label="Citation Present Rate" value={latest?.citation_present_rate ?? null} threshold={THRESHOLDS.citation_present_rate} />
      </section>

      {/* 추이 그래프 */}
      {series.length > 0 && (
        <section aria-label="지표 추이" className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-bold text-gray-900 mb-4">30일 지표 추이</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={series} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [`${(Number(v) * 100).toFixed(1)}%`]} contentStyle={{ fontSize: 12 }} />
              <Legend />
              <Line type="monotone" dataKey="faithfulness" stroke="#3b82f6" strokeWidth={2} dot={false} name="Faithfulness" />
              <Line type="monotone" dataKey="answer_relevance" stroke="#22c55e" strokeWidth={2} dot={false} name="Answer Relevance" />
              <Line type="monotone" dataKey="citation_present_rate" stroke="#f59e0b" strokeWidth={2} dot={false} name="Citation Present" />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* 실행 이력 테이블 */}
      <section aria-label="평가 실행 이력" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">평가 실행 이력</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">골든셋</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">모델</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Faithfulness</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Answer Rel.</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Citation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">CI</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">실행일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {runs.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900">{r.golden_set_name}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{r.model_name}</td>
                  <td className="px-4 py-3 text-right">
                    {r.avg_faithfulness !== null ? (
                      <span className={r.avg_faithfulness >= THRESHOLDS.faithfulness ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
                        {(r.avg_faithfulness * 100).toFixed(1)}%
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.avg_answer_relevance !== null ? (
                      <span className={r.avg_answer_relevance >= THRESHOLDS.answer_relevance ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
                        {(r.avg_answer_relevance * 100).toFixed(1)}%
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.citation_present_rate !== null ? (
                      <span className={r.citation_present_rate >= THRESHOLDS.citation_present_rate ? "text-green-700 font-semibold" : "text-red-700 font-semibold"}>
                        {(r.citation_present_rate * 100).toFixed(1)}%
                      </span>
                    ) : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {r.passed_ci === null ? (
                      <span className="text-gray-400 text-xs">-</span>
                    ) : r.passed_ci ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">통과</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">실패</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(r.ran_at).toLocaleDateString("ko")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
