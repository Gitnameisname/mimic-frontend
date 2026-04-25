"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { evaluationsApi } from "@/lib/api/s2admin";
import type {
  EvaluationCompareResult,
  EvaluationMetricKey,
  EvaluationRunDetail,
} from "@/types/s2admin";
import { cn } from "@/lib/utils";
import { BADGE_BASE } from "@/lib/styles/tokens";
import { formatDateTime } from "@/lib/utils/date";
import {
  METRIC_LABELS,
  STATUS_BADGE_STYLE,
  STATUS_LABEL,
  classifyEvalListError,
  formatDuration,
  formatInt,
  formatScore,
  METRIC_LOWER_IS_BETTER,
} from "./helpers";
import { EvaluationErrorBanner } from "./ErrorBanner";

const METRIC_KEYS: EvaluationMetricKey[] = [
  "faithfulness",
  "answer_relevance",
  "context_precision",
  "context_recall",
  "citation_present_rate",
  "hallucination_rate",
];

function RunHeaderCard({
  role,
  detail,
}: {
  role: "A" | "B";
  detail: EvaluationRunDetail | null;
}) {
  return (
    <article
      className="rounded-xl border border-gray-200 bg-white p-5"
      aria-label={`실행 ${role}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            "inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold",
            role === "A"
              ? "bg-blue-100 text-blue-700"
              : "bg-purple-100 text-purple-700",
          )}
        >
          {role}
        </span>
        {detail ? (
          <span
            className={cn(BADGE_BASE, STATUS_BADGE_STYLE[detail.status])}
          >
            {STATUS_LABEL[detail.status]}
          </span>
        ) : (
          <span className="text-xs text-gray-400">-</span>
        )}
      </div>
      {detail ? (
        <>
          <p className="text-sm font-semibold text-gray-900 truncate">
            {detail.batch_id}
          </p>
          <p className="text-xs text-gray-500 font-mono truncate mt-1">
            {detail.id}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-gray-500">실행일</p>
              <p className="text-gray-800">{formatDateTime(detail.created_at)}</p>
            </div>
            <div>
              <p className="text-gray-500">소요</p>
              <p className="text-gray-800">{formatDuration(detail.duration_seconds)}</p>
            </div>
            <div>
              <p className="text-gray-500">성공/전체</p>
              <p className="text-gray-800">
                {formatInt(detail.successful_items)} / {formatInt(detail.total_items)}
              </p>
            </div>
            <div>
              <p className="text-gray-500">실행자</p>
              <p className="text-gray-800">
                {detail.actor_type === "agent" ? "에이전트" : "사용자"}
              </p>
            </div>
          </div>
          <Link
            href={`/admin/evaluations/${detail.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-800 mt-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1"
          >
            상세 보기 →
          </Link>
        </>
      ) : (
        <p className="text-sm text-gray-400">선택되지 않음</p>
      )}
    </article>
  );
}

function DeltaCell({
  metric,
  a,
  b,
}: {
  metric: EvaluationMetricKey;
  a: number | null;
  b: number | null;
}) {
  if (a === null || b === null) {
    return <span className="text-gray-400">-</span>;
  }
  const diff = b - a;
  const lowerIsBetter = METRIC_LOWER_IS_BETTER[metric];
  const improved = lowerIsBetter ? diff < 0 : diff > 0;
  const sign = diff > 0 ? "+" : "";
  const tone =
    Math.abs(diff) < 0.005
      ? "text-gray-500"
      : improved
        ? "text-green-700 font-semibold"
        : "text-red-700 font-semibold";
  return (
    <span className={tone}>
      {sign}
      {(diff * 100).toFixed(1)}%p
    </span>
  );
}

// ═══════════════════════════════════════
// AdminEvaluationComparePage
// ═══════════════════════════════════════

export function AdminEvaluationComparePage({
  a,
  b,
}: {
  a: string | null;
  b: string | null;
}) {
  const detailA = useQuery({
    queryKey: ["admin", "evaluation-detail", a],
    queryFn: () => (a ? evaluationsApi.get(a) : Promise.reject(new Error("missing a"))),
    enabled: Boolean(a),
    retry: false,
  });
  const detailB = useQuery({
    queryKey: ["admin", "evaluation-detail", b],
    queryFn: () => (b ? evaluationsApi.get(b) : Promise.reject(new Error("missing b"))),
    enabled: Boolean(b),
    retry: false,
  });
  const compareQuery = useQuery({
    queryKey: ["admin", "evaluation-compare", a, b],
    queryFn: () =>
      a && b
        ? evaluationsApi.compare(a, b)
        : Promise.reject(new Error("missing")),
    enabled: Boolean(a && b),
    retry: false,
  });

  const runA = detailA.data?.data ?? null;
  const runB = detailB.data?.data ?? null;
  const compare: EvaluationCompareResult | null =
    compareQuery.data?.data ?? null;

  const compareError =
    detailA.isError
      ? classifyEvalListError(detailA.error, "실행 A")
      : detailB.isError
        ? classifyEvalListError(detailB.error, "실행 B")
        : compareQuery.isError
          ? classifyEvalListError(compareQuery.error, "비교 결과")
          : null;

  const retryFailingQueries = () => {
    if (detailA.isError) void detailA.refetch();
    if (detailB.isError) void detailB.refetch();
    if (compareQuery.isError) void compareQuery.refetch();
  };
  const isAnyRetrying =
    detailA.isFetching || detailB.isFetching || compareQuery.isFetching;

  // a 또는 b 누락 시 안내
  if (!a || !b) {
    return (
      <div className="p-3 sm:p-6 space-y-6 max-w-7xl">
        <nav className="text-sm text-gray-500" aria-label="breadcrumb">
          <Link
            href="/admin/evaluations"
            className="hover:text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1"
          >
            ← 평가 결과
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-700">비교</span>
        </nav>
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-5">
          <p className="text-sm font-bold text-amber-800">
            비교할 두 run 이 선택되지 않았습니다
          </p>
          <p className="text-xs text-amber-700 mt-1">
            목록 화면에서 체크박스로 두 run 을 선택한 뒤 &ldquo;두 run 비교&rdquo; 버튼을
            누르거나, URL 에 <code className="font-mono">?a=&lt;id&gt;&amp;b=&lt;id&gt;</code>
            파라미터를 함께 전달해 주세요.
          </p>
          <Link
            href="/admin/evaluations"
            className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-900 mt-3 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 rounded px-1"
          >
            목록으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const isLoading =
    detailA.isLoading ||
    detailB.isLoading ||
    compareQuery.isLoading;

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl">
      <nav className="text-sm text-gray-500" aria-label="breadcrumb">
        <Link
          href="/admin/evaluations"
          className="hover:text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1"
        >
          ← 평가 결과
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">비교</span>
      </nav>

      <div className="pb-2 border-b border-gray-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          평가 실행 비교
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          6개 지표의 평균 변화와 전체 점수 개선 폭(B - A)을 확인합니다.
        </p>
      </div>

      {compareError && (
        <EvaluationErrorBanner
          info={compareError}
          onRetry={retryFailingQueries}
          isRetrying={isAnyRetrying}
        />
      )}

      {/* 두 run 헤더 */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <RunHeaderCard role="A" detail={runA} />
        <RunHeaderCard role="B" detail={runB} />
      </section>

      {/* Overall 개선 폭 */}
      {compare && (
        <section
          aria-label="전체 점수 개선"
          className="rounded-xl border border-gray-200 bg-white p-5"
        >
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            전체 점수 개선 (B - A)
          </p>
          <div className="flex items-baseline gap-3 flex-wrap">
            <span className="text-3xl font-bold text-gray-900">
              {formatScore(compare.overall_score_1)}
            </span>
            <span className="text-gray-400 text-xl" aria-hidden="true">
              →
            </span>
            <span className="text-3xl font-bold text-gray-900">
              {formatScore(compare.overall_score_2)}
            </span>
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded text-sm font-semibold ml-2",
                Math.abs(compare.improvement) < 0.005
                  ? "bg-gray-100 text-gray-600"
                  : compare.improvement > 0
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800",
              )}
            >
              {compare.improvement > 0 ? "+" : ""}
              {(compare.improvement * 100).toFixed(1)}%p
            </span>
          </div>
        </section>
      )}

      {/* 지표별 비교 */}
      <section
        aria-label="지표별 비교"
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-bold text-gray-900">지표별 평균 비교</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" aria-label="지표별 평균 비교">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th
                  scope="col"
                  className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  지표
                </th>
                <th
                  scope="col"
                  className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  A
                </th>
                <th
                  scope="col"
                  className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  B
                </th>
                <th
                  scope="col"
                  className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide"
                >
                  Δ (B - A)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && !compare ? (
                Array.from({ length: METRIC_KEYS.length }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : compare ? (
                METRIC_KEYS.map((m) => {
                  const entry = compare.metric_comparison[m];
                  return (
                    <tr key={m} className="bg-white hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {METRIC_LABELS[m]}
                        {METRIC_LOWER_IS_BETTER[m] && (
                          <span className="ml-1 text-[10px] text-gray-400">
                            (낮을수록 좋음)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-800">
                        {formatScore(entry.eval1)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-800">
                        {formatScore(entry.eval2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DeltaCell metric={m} a={entry.eval1} b={entry.eval2} />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-gray-400"
                  >
                    비교 데이터가 아직 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs text-gray-500">
        차이는 백분율 포인트(p.p.) 단위입니다. Hallucination 지표는 낮을수록 좋으므로
        녹색은 감소(개선), 빨강은 증가(악화)를 의미합니다.
      </p>
    </div>
  );
}
