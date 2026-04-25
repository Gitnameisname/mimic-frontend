"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { evaluationsApi } from "@/lib/api/s2admin";
import type {
  EvaluationMetricKey,
  EvaluationResultRecord,
  EvaluationRunDetail,
} from "@/types/s2admin";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { cn } from "@/lib/utils";
import { BADGE_BASE } from "@/lib/styles/tokens";
import { formatDateTime } from "@/lib/utils/date";
import {
  METRIC_LABELS,
  STATUS_BADGE_STYLE,
  STATUS_LABEL,
  classifyEvalListError,
  formatCost,
  formatDuration,
  formatInt,
  formatScore,
  scorePasses,
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

function MetricCell({
  metric,
  value,
}: {
  metric: EvaluationMetricKey;
  value: number | null;
}) {
  const pass = scorePasses(metric, value);
  return (
    <span
      className={cn(
        "font-semibold",
        pass === null
          ? "text-gray-400"
          : pass
            ? "text-green-700"
            : "text-red-700",
      )}
      title={pass === null ? "측정 안 됨" : pass ? "임계치 충족" : "임계치 미달"}
    >
      {formatScore(value)}
    </span>
  );
}

function MetricSummary({
  records,
}: {
  records: EvaluationResultRecord[];
}) {
  const avgs = useMemo(() => {
    const out: Record<EvaluationMetricKey, number | null> = {
      faithfulness: null,
      answer_relevance: null,
      context_precision: null,
      context_recall: null,
      citation_present_rate: null,
      hallucination_rate: null,
    };
    for (const m of METRIC_KEYS) {
      const vals = records
        .map((r) => r[m])
        .filter((x): x is number => typeof x === "number");
      out[m] = vals.length
        ? vals.reduce((a, b) => a + b, 0) / vals.length
        : null;
    }
    return out;
  }, [records]);

  return (
    <section
      aria-label="지표별 평균"
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3"
    >
      {METRIC_KEYS.map((m) => {
        const pass = scorePasses(m, avgs[m]);
        return (
          <article
            key={m}
            className={cn(
              "rounded-xl border p-4",
              pass === null
                ? "bg-gray-50 border-gray-200"
                : pass
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200",
            )}
          >
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
              {METRIC_LABELS[m]}
            </p>
            <p
              className={cn(
                "text-2xl font-bold",
                pass === null
                  ? "text-gray-400"
                  : pass
                    ? "text-green-800"
                    : "text-red-800",
              )}
            >
              {formatScore(avgs[m])}
            </p>
          </article>
        );
      })}
    </section>
  );
}

// ─── 행 확장 (질문·응답 전체 보기) ───

function ExpandedRow({ record }: { record: EvaluationResultRecord }) {
  return (
    <div className="bg-gray-50 px-6 py-4 border-t border-b border-gray-200 space-y-3">
      <div>
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
          질문
        </p>
        <p className="text-sm text-gray-900 whitespace-pre-wrap">{record.question}</p>
      </div>
      <div>
        <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">
          응답
        </p>
        <p className="text-sm text-gray-800 whitespace-pre-wrap">{record.answer}</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <p className="font-semibold text-gray-500">Latency</p>
          <p className="text-gray-800">
            {formatDuration(
              record.total_latency_ms !== null
                ? record.total_latency_ms / 1000
                : null,
            )}
          </p>
        </div>
        <div>
          <p className="font-semibold text-gray-500">Tokens</p>
          <p className="text-gray-800">{formatInt(record.total_tokens)}</p>
        </div>
        <div>
          <p className="font-semibold text-gray-500">Cost</p>
          <p className="text-gray-800">{formatCost(record.estimated_cost)}</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// AdminEvaluationDetailPage
// ═══════════════════════════════════════

export function AdminEvaluationDetailPage({ evalId }: { evalId: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["admin", "evaluation-detail", evalId],
    queryFn: () => evaluationsApi.get(evalId),
    retry: false,
  });

  const detail: EvaluationRunDetail | null = detailQuery.data?.data ?? null;
  const results = detail?.results ?? [];

  const errorInfo = detailQuery.isError
    ? classifyEvalListError(detailQuery.error, "평가 실행")
    : null;

  const columns: Column<EvaluationResultRecord>[] = [
    {
      key: "expand",
      header: "",
      width: "40px",
      render: (row) => (
        <button
          type="button"
          aria-label={expandedId === row.id ? "접기" : "펼쳐서 질문·응답 보기"}
          className="text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded p-1"
          onClick={(e) => {
            e.stopPropagation();
            setExpandedId((prev) => (prev === row.id ? null : row.id));
          }}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {expandedId === row.id ? "▼" : "▶"}
        </button>
      ),
    },
    {
      key: "item",
      header: "항목 ID",
      width: "120px",
      render: (row) => (
        <span className="font-mono text-xs text-gray-600 truncate block max-w-[110px]">
          {row.item_id}
        </span>
      ),
    },
    {
      key: "question",
      header: "질문",
      render: (row) => (
        <span
          className="text-sm text-gray-800 block truncate max-w-[320px]"
          title={row.question}
        >
          {row.question}
        </span>
      ),
    },
    ...METRIC_KEYS.map<Column<EvaluationResultRecord>>((m) => ({
      key: m,
      header: METRIC_LABELS[m],
      width: "110px",
      render: (row) => <MetricCell metric={m} value={row[m]} />,
    })),
    {
      key: "overall",
      header: "Overall",
      width: "90px",
      render: (row) => (
        <span className="font-semibold text-gray-900">
          {formatScore(row.overall_score)}
        </span>
      ),
    },
  ];

  // DataTable 은 기본적으로 1단 row 이므로, expand row 를 "별도 렌더" 로 끼워넣기
  // 위해 results 를 그대로 rows 로 사용하되, 아래에 expand panel 을 조건부 렌더.

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl">
      {/* 브레드크럼 */}
      <nav className="text-sm text-gray-500" aria-label="breadcrumb">
        <Link
          href="/admin/evaluations"
          className="hover:text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-1"
        >
          ← 평가 결과
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">실행 상세</span>
      </nav>

      {errorInfo ? (
        <EvaluationErrorBanner
          info={errorInfo}
          onRetry={() => detailQuery.refetch()}
          isRetrying={detailQuery.isFetching}
        />
      ) : detailQuery.isLoading || !detail ? (
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-10 text-center text-gray-400">
          실행 상세를 불러오는 중입니다…
        </div>
      ) : (
        <>
          {/* 헤더 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(BADGE_BASE, STATUS_BADGE_STYLE[detail.status])}
                >
                  {STATUS_LABEL[detail.status]}
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  {detail.id}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                {detail.batch_id}
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                실행 {formatDateTime(detail.created_at)}
                {detail.completed_at
                  ? ` · 완료 ${formatDateTime(detail.completed_at)}`
                  : ""}
                {detail.duration_seconds !== null
                  ? ` · ${formatDuration(detail.duration_seconds)}`
                  : ""}
              </p>
            </div>
            <Link
              href={`/admin/evaluations/compare?a=${detail.id}`}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[36px]"
            >
              다른 run 과 비교
            </Link>
          </div>

          {/* run-level 요약 카드 */}
          <section
            aria-label="실행 요약"
            className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          >
            <article className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                성공 / 전체
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatInt(detail.successful_items)} /{" "}
                {formatInt(detail.total_items)}
              </p>
              {(detail.failed_items ?? 0) > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  실패 {detail.failed_items}건
                </p>
              )}
            </article>
            <article className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                전체 점수
              </p>
              <p
                className={cn(
                  "text-2xl font-bold mt-1",
                  (detail.overall_score ?? 0) >= 0.8
                    ? "text-green-700"
                    : (detail.overall_score ?? 0) > 0
                      ? "text-red-700"
                      : "text-gray-400",
                )}
              >
                {formatScore(detail.overall_score)}
              </p>
            </article>
            <article className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Total Tokens
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatInt(detail.total_tokens ?? null)}
              </p>
            </article>
            <article className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Total Cost
              </p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCost(detail.total_cost ?? null)}
              </p>
            </article>
          </section>

          {/* 6-metric 평균 */}
          <MetricSummary records={results} />

          {/* per-item 결과 */}
          <section
            aria-label="항목별 결과"
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-bold text-gray-900">
                항목별 결과 ({results.length.toLocaleString("ko")}건)
              </h2>
            </div>
            <DataTable
              columns={columns}
              rows={results}
              rowKey={(r) => r.id}
              emptyMessage={
                detail.status === "queued" || detail.status === "running"
                  ? "아직 처리된 항목이 없습니다. 실행이 진행 중입니다."
                  : "이 run 에서 항목 결과를 수집하지 못했습니다."
              }
              ariaLabel="항목별 평가 결과"
            />
            {expandedId && (
              <ExpandedRow
                record={
                  results.find((r) => r.id === expandedId) ??
                  results[0]
                }
              />
            )}
          </section>

          {/* Actor 감사 로그 힌트 (S2 ⑤) */}
          <p className="text-xs text-gray-500">
            이 run 은 {detail.actor_type === "agent" ? "에이전트" : "사용자"}{" "}
            <span className="font-mono">{detail.actor_id}</span> 에 의해 실행되었으며,
            감사 이벤트 <code className="font-mono">evaluation.run.*</code> 으로 기록됩니다. (S2 ⑤)
          </p>
        </>
      )}
    </div>
  );
}
