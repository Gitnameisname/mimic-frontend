"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { SeverityBadge, StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import type { AuditLog, AuditLogDetail } from "@/types/admin";
import { cn } from "@/lib/utils";

// --- Side Panel ---
function AuditLogPanel({
  eventId,
  onClose,
}: {
  eventId: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit-log", eventId],
    queryFn: () => adminApi.getAuditLog(eventId),
    enabled: !!eventId,
  });
  const log = data?.data;

  return (
    <div className="w-96 shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">감사 이벤트 상세</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-sm">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : !log ? (
          <p className="text-gray-400">정보를 불러올 수 없습니다.</p>
        ) : (
          <>
            <DetailRow label="이벤트 ID" value={log.id} mono />
            <DetailRow label="이벤트 유형" value={log.event_type} />
            <DetailRow
              label="심각도"
              value={<SeverityBadge severity={log.severity} />}
            />
            <DetailRow
              label="결과"
              value={<StatusBadge value={log.result} />}
            />
            <DetailRow label="행위자" value={log.actor_name ?? log.actor_id ?? "-"} />
            <DetailRow label="대상" value={log.target_name ?? log.target_id ?? "-"} />
            <DetailRow label="IP" value={log.ip_address ?? "-"} />
            <DetailRow
              label="시간"
              value={new Date(log.created_at).toLocaleString("ko")}
            />
            {log.before_state && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">변경 전</p>
                <pre className="bg-gray-50 rounded p-2 text-xs text-gray-600 overflow-x-auto">
                  {JSON.stringify(log.before_state, null, 2)}
                </pre>
              </div>
            )}
            {log.after_state && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1">변경 후</p>
                <pre className="bg-gray-50 rounded p-2 text-xs text-gray-600 overflow-x-auto">
                  {JSON.stringify(log.after_state, null, 2)}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <div className={cn("text-gray-700", mono && "font-mono text-xs")}>{value}</div>
    </div>
  );
}

// --- Main Page ---
export function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [eventType, setEventType] = useState("");
  const [result, setResult] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit-logs", page, from, to, eventType, result],
    queryFn: () =>
      adminApi.getAuditLogs({
        page,
        page_size: 50,
        from: from || undefined,
        to: to || undefined,
        event_type: eventType || undefined,
        result: result || undefined,
      }),
  });

  const columns: Column<AuditLog>[] = [
    {
      key: "severity",
      header: "심각도",
      width: "90px",
      render: (row) => <SeverityBadge severity={row.severity} />,
    },
    {
      key: "event_type",
      header: "이벤트 유형",
      render: (row) => (
        <span className="font-medium text-gray-800">{row.event_type}</span>
      ),
    },
    {
      key: "actor",
      header: "행위자",
      render: (row) => row.actor_name ?? row.actor_id ?? "-",
    },
    {
      key: "target",
      header: "대상",
      render: (row) => row.target_name ?? row.target_id ?? "-",
    },
    {
      key: "result",
      header: "결과",
      width: "100px",
      render: (row) => <StatusBadge value={row.result} />,
    },
    {
      key: "created_at",
      header: "시간",
      render: (row) =>
        new Date(row.created_at).toLocaleString("ko", {
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
  ];

  return (
    <div className="flex h-full">
      <div className="flex-1 p-6 space-y-5 overflow-y-auto">
        <h1 className="text-xl font-semibold text-gray-900">감사 로그</h1>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-xs text-gray-500 block mb-1">시작일</label>
              <input
                type="date"
                value={from}
                onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">종료일</label>
              <input
                type="date"
                value={to}
                onChange={(e) => { setTo(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">이벤트 유형</label>
              <input
                type="text"
                value={eventType}
                onChange={(e) => { setEventType(e.target.value); setPage(1); }}
                placeholder="예: USER_LOGIN"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 w-36"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">결과</label>
              <select
                value={result}
                onChange={(e) => { setResult(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                <option value="">전체</option>
                <option value="SUCCESS">성공</option>
                <option value="FAILURE">실패</option>
                <option value="DENIED">거부</option>
              </select>
            </div>
            {(from || to || eventType || result) && (
              <button
                onClick={() => { setFrom(""); setTo(""); setEventType(""); setResult(""); setPage(1); }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
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
            emptyMessage="감사 로그가 없습니다."
          />
          <Pagination
            page={page}
            pageSize={50}
            total={data?.total ?? 0}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Side Panel */}
      {selectedId && (
        <AuditLogPanel
          eventId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
