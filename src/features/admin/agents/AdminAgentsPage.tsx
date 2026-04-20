"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { agentsApi } from "@/lib/api/s2admin";
import type { Agent, AgentDetail, AgentRateLimits } from "@/types/s2admin";
import { cn } from "@/lib/utils";

// ─── 상태 배지 ───

function AgentStatusBadge({ status }: { status: Agent["status"] }) {
  return status === "active" ? (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
      활성
    </span>
  ) : (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">
      차단
    </span>
  );
}

// ─── 킬스위치 모달 ───

const killSchema = z.object({
  duration: z.enum(["1h", "24h", "permanent"]),
  reason: z.string().optional(),
  reject_pending: z.boolean().optional(),
});
type KillForm = z.infer<typeof killSchema>;

function KillSwitchModal({
  agentName,
  onConfirm,
  onClose,
}: {
  agentName: string;
  onConfirm: (data: KillForm) => void;
  onClose: () => void;
}) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<KillForm>({
    resolver: zodResolver(killSchema),
    defaultValues: { duration: "1h", reject_pending: false },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" role="dialog" aria-modal="true" aria-label="에이전트 차단">
        <h2 className="text-lg font-bold text-gray-900 mb-2">에이전트 차단</h2>
        <p className="text-sm text-gray-600 mb-5">
          <span className="font-semibold text-red-700">{agentName}</span> 에이전트를 차단합니다.
        </p>
        <form onSubmit={handleSubmit(onConfirm)} noValidate>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">차단 기간</label>
              <div className="space-y-2">
                {([["1h", "1시간"], ["24h", "24시간"], ["permanent", "영구"]] as const).map(([val, label]) => (
                  <label key={val} className="flex items-center gap-3 cursor-pointer">
                    <input type="radio" value={val} {...register("duration")} className="w-4 h-4 text-red-700 focus:ring-red-500" />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="kill-reason" className="block text-sm font-semibold text-gray-700 mb-1.5">사유 (선택)</label>
              <input
                id="kill-reason"
                type="text"
                {...register("reason")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="차단 사유 입력..."
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register("reject_pending")} className="w-4 h-4 text-red-700 focus:ring-red-500 rounded" />
              <span className="text-sm text-gray-700">대기 중인 제안 자동 거절</span>
            </label>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-gray-300">
              취소
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 rounded-lg bg-red-700 text-white text-sm font-semibold hover:bg-red-800 min-h-[44px] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2">
              차단
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Rate Limit 편집 모달 ───

function RateLimitModal({
  agentId,
  agentName,
  current,
  onClose,
}: {
  agentId: string;
  agentName: string;
  current: AgentRateLimits;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [limits, setLimits] = useState<AgentRateLimits>({ ...current });

  const mut = useMutation({
    mutationFn: () => agentsApi.updateRateLimits(agentId, limits),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "agents", agentId] });
      onClose();
    },
  });

  const fields: [keyof AgentRateLimits, string][] = [
    ["tool_call", "Tool Call (분당)"],
    ["stream", "Stream (분당)"],
    ["read", "Read (분당)"],
    ["init", "Init (분당)"],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" role="dialog" aria-modal="true" aria-label="Rate Limit 설정">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Rate Limit 설정</h2>
        <p className="text-sm text-gray-600 mb-5 truncate">{agentName}</p>
        <div className="space-y-3 mb-6">
          {fields.map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`rl-${key}`} className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
              <input
                id={`rl-${key}`}
                type="number"
                min={1}
                value={limits[key]}
                onChange={(e) => setLimits((prev) => ({ ...prev, [key]: parseInt(e.target.value, 10) || 1 }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
        {mut.isError && <p className="mb-3 text-xs text-red-600" role="alert">저장 중 오류가 발생했습니다.</p>}
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 min-h-[44px]">취소</button>
          <button type="button" disabled={mut.isPending} onClick={() => mut.mutate()} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 min-h-[44px] disabled:opacity-50">
            {mut.isPending ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── 에이전트 상세 패널 ───

function AgentDetailPanel({ agent, onClose }: { agent: Agent; onClose: () => void }) {
  const qc = useQueryClient();
  const [showKill, setShowKill] = useState(false);
  const [showRateLimit, setShowRateLimit] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "audit">("info");

  const detailQ = useQuery({
    queryKey: ["admin", "agents", agent.id],
    queryFn: () => agentsApi.get(agent.id),
  });

  const rateLimitQ = useQuery({
    queryKey: ["admin", "agents", agent.id, "rate-limits"],
    queryFn: () => agentsApi.getRateLimits(agent.id),
  });

  const auditQ = useQuery({
    queryKey: ["admin", "agents", agent.id, "audit"],
    queryFn: () => agentsApi.getAuditHistory(agent.id, { page_size: 20 }),
    enabled: activeTab === "audit",
  });

  const blockMut = useMutation({
    mutationFn: (d: { duration: "1h" | "24h" | "permanent"; reject_pending?: boolean; reason?: string }) =>
      agentsApi.block(agent.id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "agents"] });
      setShowKill(false);
    },
  });

  const unblockMut = useMutation({
    mutationFn: () => agentsApi.unblock(agent.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "agents"] }),
  });

  const revokeMut = useMutation({
    mutationFn: (userId: string) => agentsApi.revokeDelegation(agent.id, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "agents", agent.id] }),
  });

  const detail: AgentDetail | undefined = detailQ.data?.data;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      {showKill && (
        <KillSwitchModal
          agentName={agent.name}
          onConfirm={(d) => blockMut.mutate(d)}
          onClose={() => setShowKill(false)}
        />
      )}
      {showRateLimit && rateLimitQ.data?.data && (
        <RateLimitModal
          agentId={agent.id}
          agentName={agent.name}
          current={rateLimitQ.data.data}
          onClose={() => setShowRateLimit(false)}
        />
      )}
      <div className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-xl flex flex-col" role="dialog" aria-modal="true" aria-label={`${agent.name} 에이전트 상세`}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-900 truncate">{agent.name}</h2>
            <AgentStatusBadge status={agent.status} />
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300" aria-label="닫기">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 탭 */}
        <div className="border-b border-gray-200 px-5">
          <div className="flex gap-0" role="tablist">
            {(["info", "audit"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={activeTab === tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-3 text-sm font-semibold border-b-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset",
                  activeTab === tab
                    ? "border-blue-700 text-blue-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}
              >
                {tab === "info" ? "기본 정보" : "감사 이력"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {activeTab === "info" ? (
            <>
              {agent.description && <p className="text-sm text-gray-600">{agent.description}</p>}

              {/* 킬스위치 */}
              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">킬스위치</h3>
                {agent.status === "active" ? (
                  <button
                    type="button"
                    onClick={() => setShowKill(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 border border-red-300 text-red-700 text-sm font-semibold hover:bg-red-100 transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    이 에이전트 차단
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={unblockMut.isPending}
                    onClick={() => unblockMut.mutate()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-50 border border-green-300 text-green-700 text-sm font-semibold hover:bg-green-100 transition-colors min-h-[44px] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    차단 해제
                  </button>
                )}
                {detail?.kill_switch_history && detail.kill_switch_history.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">차단 이력</p>
                    {detail.kill_switch_history.slice(0, 3).map((e) => (
                      <p key={e.id} className="text-xs text-gray-600">
                        {new Date(e.blocked_at).toLocaleString("ko")} · {e.duration} · {e.triggered_by}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* Rate Limit */}
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">Rate Limit 설정</h3>
                  <button
                    type="button"
                    onClick={() => setShowRateLimit(true)}
                    className="text-xs font-semibold text-blue-700 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 min-h-[36px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    수정
                  </button>
                </div>
                {rateLimitQ.isLoading ? (
                  <div className="h-16 bg-gray-100 rounded animate-pulse" />
                ) : rateLimitQ.data?.data ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(rateLimitQ.data.data).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <span className="text-gray-600 font-mono text-xs">{k}</span>
                        <span className="font-semibold text-gray-900">{v}/min</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Rate Limit 정보를 불러오지 못했습니다.</p>
                )}
              </div>

              {/* 위임 */}
              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3">위임 사용자</h3>
                {detailQ.isLoading ? (
                  <div className="space-y-2">
                    {[...Array(2)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
                  </div>
                ) : !detail?.delegations?.length ? (
                  <p className="text-sm text-gray-500">위임된 사용자가 없습니다.</p>
                ) : (
                  <ul className="space-y-2">
                    {detail.delegations.map((d) => (
                      <li key={d.user_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{d.user_name ?? d.user_email}</p>
                          <p className="text-xs text-gray-500">{d.user_email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => revokeMut.mutate(d.user_id)}
                          className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 min-h-[32px] focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          위임 해제
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Scope */}
              {detail?.scope_names && detail.scope_names.length > 0 && (
                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">허용된 Scope</h3>
                  <div className="flex flex-wrap gap-2">
                    {detail.scope_names.map((s) => (
                      <span key={s} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* 감사 이력 탭 */
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900">감사 이벤트</h3>
              {auditQ.isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
                </div>
              ) : !auditQ.data?.data?.length ? (
                <p className="text-sm text-gray-500">감사 이벤트가 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {auditQ.data.data.map((e) => (
                    <div key={e.id} className="rounded-lg border border-gray-100 p-3 bg-gray-50">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-xs font-semibold text-gray-900">{e.event_type}</p>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold",
                            e.actor_type === "agent" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-700"
                          )}>
                            {e.actor_type}
                          </span>
                          <span className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold",
                            e.action_result === "success" ? "bg-green-100 text-green-800"
                              : e.action_result === "failure" ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          )}>
                            {e.action_result}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{new Date(e.occurred_at).toLocaleString("ko")}</p>
                      {e.reason && <p className="text-xs text-gray-600 mt-0.5">{e.reason}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 에이전트 생성 모달 ───

const createSchema = z.object({
  name: z.string().min(1, "이름을 입력하세요"),
  description: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

function CreateAgentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });
  const mut = useMutation({
    mutationFn: (d: CreateForm) => agentsApi.create(d),
    onSuccess: () => { onCreated(); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" role="dialog" aria-modal="true" aria-label="에이전트 생성">
        <h2 className="text-lg font-bold text-gray-900 mb-5">에이전트 생성</h2>
        <form onSubmit={handleSubmit((d) => mut.mutate(d))} noValidate>
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="agent-name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                이름 <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input id="agent-name" type="text" {...register("name")} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="에이전트 이름" aria-required="true" />
              {errors.name && <p className="mt-1 text-xs text-red-600" role="alert">{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="agent-desc" className="block text-sm font-semibold text-gray-700 mb-1.5">설명</label>
              <textarea id="agent-desc" {...register("description")} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="에이전트 설명..." />
            </div>
          </div>
          {mut.isError && <p className="mb-3 text-xs text-red-600" role="alert">생성 중 오류가 발생했습니다.</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 min-h-[44px]">취소</button>
            <button type="submit" disabled={isSubmitting || mut.isPending} className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 min-h-[44px] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              {mut.isPending ? "생성 중..." : "생성"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// AdminAgentsPage
// ═══════════════════════════════════════

export function AdminAgentsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Agent | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "agents", page, statusFilter],
    queryFn: () => agentsApi.list({ page, page_size: 20, status: statusFilter || undefined }),
  });

  const agents = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl">
      {showCreate && (
        <CreateAgentModal
          onClose={() => setShowCreate(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["admin", "agents"] })}
        />
      )}
      {selected && <AgentDetailPanel agent={selected} onClose={() => setSelected(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">에이전트 관리</h1>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px]"
            aria-label="상태 필터"
          >
            <option value="">전체</option>
            <option value="active">활성</option>
            <option value="blocked">차단</option>
          </select>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            에이전트 생성
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center py-12 gap-3">
          <p className="text-sm text-gray-500">에이전트 목록을 불러오지 못했습니다.</p>
          <button type="button" onClick={() => refetch()} className="text-sm text-blue-700 font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 min-h-[44px]">다시 시도</button>
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-sm">등록된 에이전트가 없습니다.</div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">이름</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">설명</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">위임 사용자</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상태</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">마지막 활동</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {agents.map((a) => (
                    <tr
                      key={a.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${a.name} 에이전트 상세 열기`}
                      className="hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus-visible:bg-blue-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                      onClick={() => setSelected(a)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(a);
                        }
                      }}
                    >
                      <td className="px-4 py-3 font-semibold text-gray-900">{a.name}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{a.description ?? "-"}</td>
                      <td className="px-4 py-3 text-gray-700">{a.delegated_users_count}명</td>
                      <td className="px-4 py-3"><AgentStatusBadge status={a.status} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {a.last_activity_at ? new Date(a.last_activity_at).toLocaleString("ko", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelected(a); }}
                          className="text-xs font-semibold text-blue-700 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 min-h-[36px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          상세
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 min-h-[40px]">이전</button>
              <span className="text-sm text-gray-600">{page} / {meta.total_pages}</span>
              <button type="button" disabled={page >= meta.total_pages} onClick={() => setPage((p) => p + 1)} className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 min-h-[40px]">다음</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
