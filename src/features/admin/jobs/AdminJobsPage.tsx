"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import type { BackgroundJob, JobSummary } from "@/types/admin";
import { cn } from "@/lib/utils";

// --- Summary Cards ---
function SummaryCards({ summary }: { summary: JobSummary }) {
  const items = [
    { label: "대기", count: summary.pending, color: "text-gray-700" },
    { label: "실행 중", count: summary.running, color: "text-blue-700" },
    { label: "완료", count: summary.completed, color: "text-green-700" },
    { label: "실패", count: summary.failed, color: "text-red-700" },
    { label: "건너뜀", count: summary.skipped, color: "text-gray-400" },
  ];
  return (
    <div className="grid grid-cols-5 gap-4">
      {items.map((item) => (
        <div key={item.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">{item.label}</p>
          <p className={cn("text-2xl font-bold", item.color)}>{item.count}</p>
        </div>
      ))}
    </div>
  );
}

// --- Detail Panel ---
function JobDetailPanel({
  jobId,
  onClose,
}: {
  jobId: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "job", jobId],
    queryFn: () => adminApi.getJob(jobId),
    enabled: !!jobId,
  });
  const job = data?.data;

  const durationMinutes = job?.started_at && job?.ended_at
    ? Math.round((new Date(job.ended_at).getTime() - new Date(job.started_at).getTime()) / 60_000)
    : null;

  return (
    <div className="w-80 shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">작업 상세</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : !job ? (
          <p className="text-gray-400">정보를 불러올 수 없습니다.</p>
        ) : (
          <>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">작업 ID</p>
              <p className="font-mono text-xs text-gray-600">{job.id}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">작업 유형</p>
              <p className="font-medium text-gray-800">{job.job_type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">상태</p>
              <StatusBadge value={job.status} />
            </div>
            {job.resource_name && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">대상 리소스</p>
                <p className="text-gray-700">{job.resource_name}</p>
              </div>
            )}
            {job.progress !== undefined && (
              <div>
                <p className="text-xs text-gray-400 mb-1">진행률</p>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{job.progress}%</p>
              </div>
            )}
            {job.started_at && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">시작 시간</p>
                <p className="text-gray-700">{new Date(job.started_at).toLocaleString("ko")}</p>
              </div>
            )}
            {job.ended_at && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">종료 시간</p>
                <p className="text-gray-700">{new Date(job.ended_at).toLocaleString("ko")}</p>
              </div>
            )}
            {durationMinutes !== null && (
              <div>
                <p className="text-xs text-gray-400 mb-0.5">소요 시간</p>
                <p className={cn("text-gray-700", durationMinutes > 30 && "text-orange-600 font-medium")}>
                  {durationMinutes}분
                  {durationMinutes > 30 && " ⚠ 장시간 작업"}
                </p>
              </div>
            )}
            {job.error_code && (
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-600 mb-1">
                  오류: {job.error_code}
                </p>
                <p className="text-xs text-red-500">{job.error_message}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --- Main Page ---
export function AdminJobsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const summaryQ = useQuery({
    queryKey: ["admin", "job-summary"],
    queryFn: () => adminApi.getJobSummary(),
    refetchInterval: 15_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "jobs", page, status],
    queryFn: () => adminApi.getJobs({ page, page_size: 30, status: status || undefined }),
    refetchInterval: 15_000,
  });

  const columns: Column<BackgroundJob>[] = [
    {
      key: "job_type",
      header: "작업 유형",
      render: (row) => (
        <span className="font-medium text-gray-800">{row.job_type}</span>
      ),
    },
    {
      key: "resource_name",
      header: "대상",
      render: (row) => row.resource_name ?? "-",
    },
    {
      key: "status",
      header: "상태",
      width: "100px",
      render: (row) => <StatusBadge value={row.status} />,
    },
    {
      key: "progress",
      header: "진행률",
      width: "100px",
      render: (row) =>
        row.progress !== undefined ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${row.progress}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{row.progress}%</span>
          </div>
        ) : (
          <span className="text-gray-300">-</span>
        ),
    },
    {
      key: "created_at",
      header: "생성 시간",
      render: (row) =>
        new Date(row.created_at).toLocaleString("ko", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    {
      key: "error",
      header: "오류",
      render: (row) =>
        row.error_code ? (
          <span className="text-xs text-red-600 font-mono">{row.error_code}</span>
        ) : (
          <span className="text-gray-300">-</span>
        ),
    },
  ];

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 space-y-5 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">백그라운드 작업</h1>
          <span className="text-xs text-gray-400">15초마다 자동 갱신</span>
        </div>

        {summaryQ.data?.data && (
          <SummaryCards summary={summaryQ.data.data} />
        )}

        {/* Filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-end gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">상태 필터</label>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                <option value="">전체</option>
                <option value="PENDING">대기</option>
                <option value="RUNNING">실행 중</option>
                <option value="COMPLETED">완료</option>
                <option value="FAILED">실패</option>
                <option value="SKIPPED">건너뜀</option>
              </select>
            </div>
            {status && (
              <button
                onClick={() => { setStatus(""); setPage(1); }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                초기화
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm text-gray-500">
            총 {data?.total ?? 0}건
          </div>
          <DataTable
            columns={columns}
            rows={data?.data ?? []}
            rowKey={(r) => r.id}
            loading={isLoading}
            onRowClick={(row) => setSelectedId(row.id === selectedId ? null : row.id)}
            emptyMessage="작업이 없습니다."
          />
          <Pagination
            page={page}
            pageSize={30}
            total={data?.total ?? 0}
            onPageChange={setPage}
          />
        </div>
      </div>

      {selectedId && (
        <JobDetailPanel
          jobId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
