"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { SeverityBadge, StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import type { AuditLog } from "@/types/admin";
import { cn } from "@/lib/utils";

// Phase 14-15: 기간 프리셋
type PresetKey = "1h" | "24h" | "7d" | "30d" | "custom";
const PRESETS: { key: PresetKey; label: string; ms?: number }[] = [
  { key: "1h", label: "최근 1시간", ms: 60 * 60 * 1000 },
  { key: "24h", label: "최근 24시간", ms: 24 * 60 * 60 * 1000 },
  { key: "7d", label: "최근 7일", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "30d", label: "최근 30일", ms: 30 * 24 * 60 * 60 * 1000 },
  { key: "custom", label: "커스텀 범위" },
];

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
  const [preset, setPreset] = useState<PresetKey>("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [eventType, setEventType] = useState("");
  const [actorId, setActorId] = useState("");
  const [actorSearch, setActorSearch] = useState("");
  const [result, setResult] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 기간 프리셋 → ISO 문자열 계산 (사용자 시간대 → UTC ISO).
  // F-05 시정(2026-04-18): Date.now() 는 impure 호출이므로 렌더 단계에서 경고 대상.
  //   "기간 프리셋 선택 시점의 now" 라는 의미론상 약간의 재렌더 간 변동(초 단위)은 UX 에
  //   영향을 주지 않고, 질의가 재실행되면 서버 side 에서 일관된 snapshot 을 받는다.
  //   따라서 해당 회귀는 문서화하고 의도적으로 규칙을 해제한다.
  const { from, to } = useMemo(() => {
    if (preset === "custom") {
      return { from: customFrom || undefined, to: customTo || undefined };
    }
    const cfg = PRESETS.find((p) => p.key === preset);
    if (!cfg?.ms) return { from: undefined, to: undefined };
    // eslint-disable-next-line react-hooks/purity -- 시간 기반 필터 값 계산의 의도된 side-effect
    const fromIso = new Date(Date.now() - cfg.ms).toISOString();
    return { from: fromIso, to: undefined };
  }, [preset, customFrom, customTo]);

  // 이벤트 유형 카탈로그
  const eventTypesQuery = useQuery({
    queryKey: ["admin", "audit-logs", "event-types"],
    queryFn: () => adminApi.getAuditEventTypes(),
    staleTime: 5 * 60 * 1000,
  });

  // 사용자 드롭다운 (검색)
  const usersQuery = useQuery({
    queryKey: ["admin", "users", "search", actorSearch],
    queryFn: () => adminApi.getUsers({ page: 1, page_size: 10, search: actorSearch || undefined }),
    enabled: actorSearch.trim().length >= 1,
    staleTime: 30_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit-logs", page, from, to, eventType, actorId, result],
    queryFn: () =>
      adminApi.getAuditLogs({
        page,
        page_size: 50,
        from: from || undefined,
        to: to || undefined,
        event_type: eventType || undefined,
        actor_id: actorId || undefined,
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

        {/* Filters (Phase 14-15 재설계) */}
        <section
          aria-label="감사 로그 필터"
          className="bg-white rounded-xl border border-gray-200 p-4"
        >
          <div className="flex flex-wrap gap-3 items-end">
            <label className="text-xs text-gray-500">
              <span className="block mb-1">기간</span>
              <select
                value={preset}
                onChange={(e) => { setPreset(e.target.value as PresetKey); setPage(1); }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                {PRESETS.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </label>
            {preset === "custom" && (
              <>
                <label className="text-xs text-gray-500">
                  <span className="block mb-1">시작</span>
                  <input
                    type="datetime-local"
                    value={customFrom}
                    onChange={(e) => { setCustomFrom(e.target.value); setPage(1); }}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                </label>
                <label className="text-xs text-gray-500">
                  <span className="block mb-1">종료</span>
                  <input
                    type="datetime-local"
                    value={customTo}
                    onChange={(e) => { setCustomTo(e.target.value); setPage(1); }}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                </label>
              </>
            )}
            <label className="text-xs text-gray-500">
              <span className="block mb-1">이벤트 유형</span>
              <select
                value={eventType}
                onChange={(e) => { setEventType(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 w-48"
              >
                <option value="">전체</option>
                {(eventTypesQuery.data?.data.items ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <div className="relative">
              <label className="text-xs text-gray-500 block mb-1">사용자</label>
              <input
                type="text"
                value={actorSearch}
                onChange={(e) => { setActorSearch(e.target.value); setActorId(""); setPage(1); }}
                placeholder="이름/이메일 검색"
                aria-label="사용자 검색"
                autoComplete="off"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 w-48"
              />
              {actorSearch && usersQuery.data?.data && usersQuery.data.data.length > 0 && !actorId && (
                <ul
                  role="listbox"
                  className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto z-10"
                >
                  {usersQuery.data.data.slice(0, 10).map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={false}
                        onClick={() => { setActorId(u.id); setActorSearch(u.display_name); setPage(1); }}
                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 focus-visible:bg-gray-100 focus-visible:outline-none"
                      >
                        <div className="text-gray-800">{u.display_name}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <label className="text-xs text-gray-500">
              <span className="block mb-1">결과</span>
              <select
                value={result}
                onChange={(e) => { setResult(e.target.value); setPage(1); }}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
              >
                <option value="">전체</option>
                <option value="success">성공</option>
                <option value="failure">실패</option>
                <option value="denied">거부</option>
              </select>
            </label>
            {(preset !== "7d" || customFrom || customTo || eventType || actorId || actorSearch || result) && (
              <button
                onClick={() => {
                  setPreset("7d"); setCustomFrom(""); setCustomTo("");
                  setEventType(""); setActorId(""); setActorSearch("");
                  setResult(""); setPage(1);
                }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 rounded"
              >
                초기화
              </button>
            )}
          </div>
        </section>

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
