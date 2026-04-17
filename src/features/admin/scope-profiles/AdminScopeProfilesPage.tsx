"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { scopeProfilesApi } from "@/lib/api/s2admin";
import type { ScopeProfile, ScopeProfileDetail, ScopeEntry, FilterExpression } from "@/types/s2admin";
import { cn } from "@/lib/utils";

// ─── ACL 필터 시각 빌더 ───

const FIELD_OPTIONS = [
  "organization_id",
  "team_id",
  "visibility",
  "classification",
  "document_type",
  "owner_id",
];

const OPERATOR_OPTIONS = [
  { value: "eq", label: "= (같음)" },
  { value: "neq", label: "≠ (다름)" },
  { value: "in", label: "in (포함)" },
  { value: "contains", label: "contains (포함문자)" },
  { value: "gt", label: "> (초과)" },
  { value: "gte", label: "≥ (이상)" },
  { value: "lt", label: "< (미만)" },
  { value: "lte", label: "≤ (이하)" },
];

function FilterBuilder({
  value,
  onChange,
}: {
  value: FilterExpression | null;
  onChange: (v: FilterExpression | null) => void;
}) {
  const [mode, setMode] = useState<"visual" | "json">("visual");
  const [jsonText, setJsonText] = useState(value ? JSON.stringify(value, null, 2) : "");
  const [jsonError, setJsonError] = useState<string | null>(null);

  const [field, setField] = useState(FIELD_OPTIONS[0]);
  const [op, setOp] = useState("eq");
  const [val, setVal] = useState("");

  const applyCondition = () => {
    const condition = { field, op: op as import("@/types/s2admin").FilterOperator, value: val };
    const expr: FilterExpression = { condition };
    onChange(expr);
    setJsonText(JSON.stringify(expr, null, 2));
  };

  const applyJson = () => {
    try {
      const parsed = JSON.parse(jsonText) as FilterExpression;
      onChange(parsed);
      setJsonError(null);
    } catch {
      setJsonError("JSON 형식이 올바르지 않습니다.");
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-gray-700">ACL 필터</span>
        <button
          type="button"
          onClick={() => setMode(mode === "visual" ? "json" : "visual")}
          className="text-xs font-semibold text-red-700 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          {mode === "visual" ? "JSON 편집" : "시각 편집"}
        </button>
      </div>

      {mode === "visual" ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">필드</label>
              <select
                value={field}
                onChange={(e) => setField(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {FIELD_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">연산자</label>
              <select
                value={op}
                onChange={(e) => setOp(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {OPERATOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">값</label>
              <input
                type="text"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="값 또는 $ctx.field"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={applyCondition}
            className="text-xs font-semibold text-red-700 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-50 min-h-[32px] focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            조건 적용
          </button>
          {value && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">현재 필터:</p>
              <pre className="text-xs text-gray-700 font-mono overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={6}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-red-500 resize-y"
            placeholder='{"condition": {"field": "organization_id", "op": "eq", "value": "$ctx.organization_id"}}'
            aria-label="ACL 필터 JSON"
          />
          {jsonError && <p className="text-xs text-red-600" role="alert">{jsonError}</p>}
          <button
            type="button"
            onClick={applyJson}
            className="text-xs font-semibold text-red-700 border border-red-300 px-3 py-1.5 rounded-lg hover:bg-red-50 min-h-[32px] focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            JSON 적용
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Scope 추가 모달 ───

function AddScopeModal({
  onAdd,
  onClose,
}: {
  onAdd: (scope: ScopeEntry) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [filter, setFilter] = useState<FilterExpression | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4" role="dialog" aria-modal="true" aria-label="Scope 추가">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Scope 추가</h2>
        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="scope-name" className="block text-sm font-semibold text-gray-700 mb-1.5">
              Scope 이름 <span className="text-red-500" aria-hidden="true">*</span>
            </label>
            <input
              id="scope-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="예: read:documents"
              aria-required="true"
            />
          </div>
          <FilterBuilder value={filter} onChange={setFilter} />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 min-h-[44px]">취소</button>
          <button
            type="button"
            disabled={!name.trim()}
            onClick={() => { onAdd({ name, filter }); onClose(); }}
            className="flex-1 py-2.5 rounded-lg bg-red-700 text-white text-sm font-semibold hover:bg-red-800 min-h-[44px] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Scope Profile 상세 패널 ───

function ScopeProfileDetailPanel({
  profile,
  onClose,
}: {
  profile: ScopeProfile;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [showAddScope, setShowAddScope] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const detailQ = useQuery({
    queryKey: ["admin", "scope-profiles", profile.id],
    queryFn: () => scopeProfilesApi.get(profile.id),
  });

  const addScopeMut = useMutation({
    mutationFn: (scope: ScopeEntry) => scopeProfilesApi.addScope(profile.id, scope),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "scope-profiles", profile.id] }),
  });

  const deleteScopeMut = useMutation({
    mutationFn: (scopeName: string) => scopeProfilesApi.deleteScope(profile.id, scopeName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "scope-profiles", profile.id] });
      setConfirmDelete(null);
    },
  });

  const detail: ScopeProfileDetail | undefined = detailQ.data?.data;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      {showAddScope && (
        <AddScopeModal
          onAdd={(scope) => addScopeMut.mutate(scope)}
          onClose={() => setShowAddScope(false)}
        />
      )}
      <div className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-xl flex flex-col" role="dialog" aria-modal="true" aria-label={`${profile.name} Scope Profile 상세`}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 truncate">{profile.name}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300" aria-label="닫기">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {profile.description && <p className="text-sm text-gray-600">{profile.description}</p>}

          {/* Scope 목록 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Scope 목록 ({detail?.scopes?.length ?? 0}개)</h3>
              <button
                type="button"
                onClick={() => setShowAddScope(true)}
                className="text-xs font-semibold text-red-700 hover:text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50 min-h-[36px] focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                + Scope 추가
              </button>
            </div>
            {detailQ.isLoading ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />)}</div>
            ) : !detail?.scopes?.length ? (
              <p className="text-sm text-gray-500">정의된 Scope가 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {detail.scopes.map((s) => (
                  <div key={s.name} className="rounded-lg border border-gray-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900 font-mono">{s.name}</span>
                      <div className="flex gap-2">
                        {confirmDelete === s.name ? (
                          <>
                            <button
                              type="button"
                              onClick={() => deleteScopeMut.mutate(s.name)}
                              disabled={deleteScopeMut.isPending}
                              className="text-xs font-semibold text-red-700 px-2 py-1 rounded hover:bg-red-50 min-h-[28px]"
                            >
                              확인
                            </button>
                            <button type="button" onClick={() => setConfirmDelete(null)} className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-50 min-h-[28px]">취소</button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(s.name)}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 min-h-[28px]"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    </div>
                    {s.filter ? (
                      <pre className="mt-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2 overflow-x-auto font-mono">
                        {JSON.stringify(s.filter, null, 2)}
                      </pre>
                    ) : (
                      <p className="mt-1 text-xs text-gray-400">필터 없음 (모든 리소스 허용)</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 연결된 API 키 */}
          {detail?.api_key_refs && detail.api_key_refs.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-3">연결된 API 키 ({detail.api_key_refs.length}개)</h3>
              <div className="space-y-1.5">
                {detail.api_key_refs.map((k) => (
                  <div key={k.id} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    <span className="font-mono">{k.key_prefix}...</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 생성 모달 ───

const createSchema = z.object({
  name: z.string().min(1, "이름을 입력하세요"),
  description: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

function CreateProfileModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });
  const mut = useMutation({
    mutationFn: (d: CreateForm) => scopeProfilesApi.create(d),
    onSuccess: () => { onCreated(); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" role="dialog" aria-modal="true" aria-label="Scope Profile 생성">
        <h2 className="text-lg font-bold text-gray-900 mb-5">Scope Profile 생성</h2>
        <form onSubmit={handleSubmit((d) => mut.mutate(d))} noValidate>
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="sp-name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                이름 <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input id="sp-name" type="text" {...register("name")} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="예: team_read_only" aria-required="true" />
              {errors.name && <p className="mt-1 text-xs text-red-600" role="alert">{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="sp-desc" className="block text-sm font-semibold text-gray-700 mb-1.5">설명</label>
              <textarea id="sp-desc" {...register("description")} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" placeholder="Profile 설명..." />
            </div>
          </div>
          {mut.isError && <p className="mb-3 text-xs text-red-600" role="alert">생성 중 오류가 발생했습니다.</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 min-h-[44px]">취소</button>
            <button type="submit" disabled={isSubmitting || mut.isPending} className="flex-1 py-2.5 rounded-lg bg-red-700 text-white text-sm font-semibold hover:bg-red-800 min-h-[44px] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2">
              {mut.isPending ? "생성 중..." : "생성"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// AdminScopeProfilesPage
// ═══════════════════════════════════════

export function AdminScopeProfilesPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<ScopeProfile | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "scope-profiles"],
    queryFn: () => scopeProfilesApi.list({ page_size: 50 }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => scopeProfilesApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "scope-profiles"] });
      setConfirmDeleteId(null);
    },
  });

  const profiles = data?.data ?? [];

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl">
      {showCreate && (
        <CreateProfileModal
          onClose={() => setShowCreate(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["admin", "scope-profiles"] })}
        />
      )}
      {selected && <ScopeProfileDetailPanel profile={selected} onClose={() => setSelected(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Scope Profile 관리</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-700 text-white text-sm font-semibold hover:bg-red-800 transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Scope Profile 생성
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : isError ? (
        <div className="flex flex-col items-center py-12 gap-3">
          <p className="text-sm text-gray-500">Scope Profile 목록을 불러오지 못했습니다.</p>
          <button type="button" onClick={() => refetch()} className="text-sm text-red-700 font-semibold px-4 py-2 rounded-lg hover:bg-red-50 min-h-[44px]">다시 시도</button>
        </div>
      ) : profiles.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-sm">등록된 Scope Profile이 없습니다.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">이름</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">설명</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Scope 수</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">사용 중인 API 키</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {profiles.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelected(p)}>
                    <td className="px-4 py-3 font-semibold text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{p.description ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-700">{p.scopes_count}</td>
                    <td className="px-4 py-3 text-gray-700">{p.api_keys_count}</td>
                    <td className="px-4 py-3 text-right flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelected(p)}
                        className="text-xs font-semibold text-red-700 hover:text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50 min-h-[36px] focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        상세
                      </button>
                      {confirmDeleteId === p.id ? (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => deleteMut.mutate(p.id)}
                            disabled={deleteMut.isPending || p.api_keys_count > 0}
                            title={p.api_keys_count > 0 ? "사용 중인 API 키가 있어 삭제할 수 없습니다" : undefined}
                            className="text-xs font-semibold text-red-700 px-2 py-1 rounded hover:bg-red-50 min-h-[28px] disabled:opacity-40"
                          >
                            확인
                          </button>
                          <button type="button" onClick={() => setConfirmDeleteId(null)} className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-50 min-h-[28px]">취소</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(p.id)}
                          className="text-xs font-semibold text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 min-h-[36px] focus:outline-none focus:ring-2 focus:ring-red-500"
                        >
                          삭제
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
