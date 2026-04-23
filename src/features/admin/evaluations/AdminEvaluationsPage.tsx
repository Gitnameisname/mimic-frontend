"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { evaluationsApi } from "@/lib/api/s2admin";
import type { EvaluationRun, EvaluationRunStatus } from "@/types/s2admin";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { cn } from "@/lib/utils";
import {
  STATUS_BADGE_STYLE,
  STATUS_LABEL,
  classifyEvalListError,
  formatCost,
  formatDateTime,
  formatDuration,
  formatInt,
  formatScore,
} from "./helpers";
import { EvaluationErrorBanner } from "./ErrorBanner";

const STATUS_OPTIONS: Array<{ value: EvaluationRunStatus | "all"; label: string }> = [
  { value: "all", label: "전체" },
  { value: "queued", label: STATUS_LABEL.queued },
  { value: "running", label: STATUS_LABEL.running },
  { value: "completed", label: STATUS_LABEL.completed },
  { value: "failed", label: STATUS_LABEL.failed },
];

// ─── 상태 배지 ───

function StatusBadge({ status }: { status: EvaluationRunStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
        STATUS_BADGE_STYLE[status],
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function ActorBadge({ type }: { type: "user" | "agent" }) {
  return type === "user" ? (
    <span className="inline-flex items-center gap-1 text-xs text-gray-600">
      <span aria-hidden="true">👤</span>
      <span>사용자</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-purple-700">
      <span aria-hidden="true">🤖</span>
      <span>에이전트</span>
    </span>
  );
}

function ScoreBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400">-</span>;
  const pct = value * 100;
  const tone =
    pct >= 80
      ? "text-green-700 font-semibold"
      : pct >= 60
        ? "text-amber-700 font-semibold"
        : "text-red-700 font-semibold";
  return <span className={tone}>{formatScore(value)}</span>;
}

// ─── 요약 카드 ───

function SummaryCards({
  runs,
  loading,
}: {
  runs: EvaluationRun[];
  loading: boolean;
}) {
  const latest = runs[0];
  const completed = runs.filter((r) => r.status === "completed");
  const pass = completed.filter(
    (r) => (r.overall_score ?? 0) >= 0.8,
  ).length;
  const failed = runs.filter((r) => r.status === "failed").length;

  const cards: Array<{ label: string; value: string; tone?: string }> = [
    {
      label: "최근 실행",
      value: latest ? formatDateTime(latest.created_at) : "-",
    },
    {
      label: "완료된 run 중 통과",
      value: completed.length
        ? `${pass} / ${completed.length}`
        : "-",
      tone: completed.length && pass === completed.length ? "text-green-700" : undefined,
    },
    {
      label: "실패 run",
      value: failed ? String(failed) : "0",
      tone: failed > 0 ? "text-red-700" : undefined,
    },
    {
      label: "최근 전체 점수",
      value:
        latest && latest.overall_score !== null
          ? formatScore(latest.overall_score)
          : "-",
      tone:
        latest && (latest.overall_score ?? 0) >= 0.8
          ? "text-green-700"
          : latest && (latest.overall_score ?? 0) > 0
            ? "text-red-700"
            : undefined,
    },
  ];

  return (
    <section
      aria-label="평가 현황 요약"
      className="grid grid-cols-2 sm:grid-cols-4 gap-3"
    >
      {cards.map((c) => (
        <article
          key={c.label}
          className="rounded-xl border border-gray-200 bg-white p-4"
        >
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {c.label}
          </p>
          <p
            className={cn(
              "text-2xl font-bold mt-1 truncate",
              loading ? "text-gray-300" : c.tone ?? "text-gray-900",
            )}
          >
            {loading ? "—" : c.value}
          </p>
        </article>
      ))}
    </section>
  );
}

// ═══════════════════════════════════════
// AdminEvaluationsPage
// ═══════════════════════════════════════

export function AdminEvaluationsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<EvaluationRunStatus | "all">("all");
  const [compareSelection, setCompareSelection] = useState<string[]>([]);

  const listQuery = useQuery({
    queryKey: ["admin", "evaluations", statusFilter],
    queryFn: () =>
      evaluationsApi.listRuns({
        limit: 50,
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      }),
    retry: false,
  });

  const runs: EvaluationRun[] = useMemo(
    () => listQuery.data?.data ?? [],
    [listQuery.data],
  );

  const errorInfo = listQuery.isError
    ? classifyEvalListError(listQuery.error, "평가 목록")
    : null;

  const toggleCompare = (id: string) => {
    setCompareSelection((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // 가장 오래된 선택 교체
      return [...prev, id];
    });
  };

  const columns: Column<EvaluationRun>[] = [
    {
      key: "compare",
      header: "비교",
      width: "56px",
      render: (row) => {
        const checked = compareSelection.includes(row.id);
        // 체크박스 조작은 행 클릭(상세 이동)과 독립적. 이미 2개 선택 상태에서 세 번째를
        // 선택하면 toggleCompare() 가 가장 오래된 선택을 교체한다(사용자 혼란 감소 목적).
        return (
          <label
            className="flex items-center justify-center cursor-pointer"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={() => toggleCompare(row.id)}
              aria-label={`${row.batch_id} 을(를) 비교 대상으로 선택`}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        );
      },
    },
    {
      key: "batch",
      header: "배치 ID",
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs text-gray-900 truncate max-w-[220px]">
            {row.batch_id}
          </span>
          <span className="text-[11px] text-gray-400 font-mono truncate max-w-[220px]">
            {row.id.slice(0, 8)}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "상태",
      width: "100px",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "progress",
      header: "성공 / 전체",
      width: "120px",
      render: (row) => (
        <span className="text-gray-700">
          {formatInt(row.successful_items)} / {formatInt(row.total_items)}
          {(row.failed_items ?? 0) > 0 && (
            <span className="ml-2 text-red-600 text-xs">
              (실패 {row.failed_items})
            </span>
          )}
        </span>
      ),
    },
    {
      key: "overall",
      header: "전체 점수",
      width: "110px",
      render: (row) => <ScoreBadge value={row.overall_score} />,
    },
    {
      key: "duration",
      header: "소요시간",
      width: "110px",
      render: (row) => (
        <span className="text-gray-600 text-xs">
          {formatDuration(row.duration_seconds)}
        </span>
      ),
    },
    {
      key: "actor",
      header: "실행자",
      width: "110px",
      render: (row) => <ActorBadge type={row.actor_type} />,
    },
    {
      key: "created",
      header: "실행일",
      width: "160px",
      render: (row) => (
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {formatDateTime(row.created_at)}
        </span>
      ),
    },
  ];

  const canCompare = compareSelection.length === 2;

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl">
      {/* 헤더 */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            평가 결과
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            RAG 품질 평가 실행 이력과 지표를 확인합니다. 두 run 을 선택해 비교할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!canCompare}
            onClick={() => {
              if (!canCompare) return;
              const [a, b] = compareSelection;
              router.push(`/admin/evaluations/compare?a=${a}&b=${b}`);
            }}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors",
              canCompare
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-100 text-gray-400 cursor-not-allowed",
            )}
            aria-disabled={!canCompare}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01"
              />
            </svg>
            두 run 비교 ({compareSelection.length}/2)
          </button>
        </div>
      </div>

      {/* 요약 카드 */}
      <SummaryCards runs={runs} loading={listQuery.isLoading} />

      {/* 필터 + 에러 + 테이블 */}
      <section
        aria-label="평가 실행 이력"
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-bold text-gray-900">실행 이력</h2>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600" htmlFor="status-filter">
              상태 필터
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as EvaluationRunStatus | "all")
              }
              className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[36px]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {errorInfo && (
          <EvaluationErrorBanner
            info={errorInfo}
            onRetry={() => listQuery.refetch()}
            isRetrying={listQuery.isFetching}
          />
        )}

        {!errorInfo && (
          <DataTable
            columns={columns}
            rows={runs}
            rowKey={(r) => r.id}
            onRowClick={(r) => router.push(`/admin/evaluations/${r.id}`)}
            loading={listQuery.isLoading}
            emptyMessage={
              statusFilter === "all"
                ? "아직 실행된 평가가 없습니다. POST /api/v1/evaluations/run 으로 시작할 수 있습니다."
                : `${STATUS_LABEL[statusFilter as EvaluationRunStatus]} 상태의 run 이 없습니다.`
            }
            ariaLabel="평가 실행 이력"
          />
        )}
      </section>

      {/* Foot note: 평가 러너 호출 정보 */}
      <p className="text-xs text-gray-500">
        평가 비용/지연시간의 자세한 metric(토큰, {formatCost(0.0001)} 단위 비용 등)은
        각 run 의 상세 화면에서 확인하실 수 있습니다.
      </p>
    </div>
  );
}
