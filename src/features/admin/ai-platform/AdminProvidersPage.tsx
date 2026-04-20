"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { providersApi, type ProviderFormData } from "@/lib/api/s2admin";
import type { LLMProvider, ProviderTestResult } from "@/types/s2admin";
import { cn } from "@/lib/utils";

// ─── 상태 배지 ───

function ProviderStatusBadge({ status }: { status: LLMProvider["status"] }) {
  const map = {
    active: "bg-green-100 text-green-800",
    inactive: "bg-gray-100 text-gray-600",
    error: "bg-red-100 text-red-700",
  } as const;
  const label = { active: "활성", inactive: "비활성", error: "오류" } as const;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold", map[status])}>
      {label[status]}
    </span>
  );
}

// ─── 연결 테스트 결과 모달 ───

function TestResultModal({ result, onClose }: { result: ProviderTestResult; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" role="dialog" aria-modal="true" aria-label="연결 테스트 결과">
        <h2 className="text-lg font-bold text-gray-900 mb-4">연결 테스트 결과</h2>
        {result.success ? (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200 mb-4">
            <svg className="w-5 h-5 text-green-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-green-800">연결 성공</p>
              {result.latency_ms !== null && (
                <p className="text-xs text-green-700 mt-0.5">응답 시간: {result.latency_ms}ms</p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg bg-red-50 border border-red-200 mb-4 overflow-hidden">
            <div className="flex items-start gap-3 p-4">
              <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-red-800">
                  연결 실패{result.http_status ? ` (HTTP ${result.http_status})` : ""}
                </p>
                {result.error && (
                  <p className="text-xs text-red-700 mt-1">{result.error}</p>
                )}
              </div>
            </div>
            {result.error_detail && (
              <div className="px-4 pb-4">
                <p className="text-xs text-red-600 font-semibold mb-1">오류 상세</p>
                <pre className="text-xs text-red-700 bg-red-100 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                  {result.error_detail}
                </pre>
              </div>
            )}
          </div>
        )}
        <p className="text-xs text-gray-500 mb-4">테스트 시각: {new Date(result.tested_at).toLocaleString("ko")}</p>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
        >
          닫기
        </button>
      </div>
    </div>
  );
}

// ─── 프로바이더 추가/편집 모달 ───

const EMPTY_FORM: ProviderFormData = {
  name: "",
  type: "llm",
  model_name: "",
  api_base_url: "",
  embed_endpoint: "",
  api_key: "",
  description: "",
  is_default: false,
};

function ProviderFormModal({
  initial,
  onClose,
  onSave,
  isPending,
  serverError,
}: {
  initial?: LLMProvider;
  onClose: () => void;
  onSave: (data: ProviderFormData) => void;
  isPending: boolean;
  serverError?: string;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<ProviderFormData>(
    initial
      ? {
          name: initial.name,
          type: initial.type,
          model_name: initial.model_name,
          api_base_url: initial.api_base_url ?? "",
          embed_endpoint: initial.embed_endpoint ?? "",
          api_key: "",
          description: initial.description ?? "",
          is_default: initial.is_default,
        }
      : EMPTY_FORM
  );
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState("");

  function set(field: keyof ProviderFormData, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("프로바이더 이름을 입력하세요.");
    if (!form.model_name.trim()) return setError("모델명을 입력하세요.");
    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "프로바이더 편집" : "프로바이더 추가"}
      >
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-5">{isEdit ? "프로바이더 편집" : "프로바이더 추가"}</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 이름 */}
            <div>
              <label htmlFor="p-name" className="block text-sm font-semibold text-gray-700 mb-1">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                id="p-name"
                type="text"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="예: OpenAI GPT-4o"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 유형 */}
            <div>
              <label htmlFor="p-type" className="block text-sm font-semibold text-gray-700 mb-1">유형</label>
              <select
                id="p-type"
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                disabled={isEdit}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              >
                <option value="llm">LLM (텍스트 생성)</option>
                <option value="embedding">Embedding (벡터화)</option>
              </select>
            </div>

            {/* 모델명 */}
            <div>
              <label htmlFor="p-model" className="block text-sm font-semibold text-gray-700 mb-1">
                모델명 <span className="text-red-500">*</span>
              </label>
              <input
                id="p-model"
                type="text"
                value={form.model_name}
                onChange={(e) => set("model_name", e.target.value)}
                placeholder="예: gpt-4o, claude-3-5-sonnet, llama3.2"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* API Base URL */}
            <div>
              <label htmlFor="p-url" className="block text-sm font-semibold text-gray-700 mb-1">
                API Base URL
              </label>
              <input
                id="p-url"
                type="url"
                value={form.api_base_url ?? ""}
                onChange={(e) => set("api_base_url", e.target.value)}
                placeholder="예: https://api.openai.com/v1 (비워두면 기본값 사용)"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">OpenAI 호환 API 또는 로컬 Ollama 등 커스텀 엔드포인트</p>
            </div>

            {/* 임베딩 엔드포인트 (embedding 타입만) */}
            {form.type === "embedding" && (
              <div>
                <label htmlFor="p-embed" className="block text-sm font-semibold text-gray-700 mb-1">
                  임베딩 엔드포인트
                </label>
                <input
                  id="p-embed"
                  type="text"
                  value={form.embed_endpoint ?? ""}
                  onChange={(e) => set("embed_endpoint", e.target.value)}
                  placeholder="예: /embed 또는 http://host:8100/embed"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">실제 임베딩 요청 경로 — 절대 URL 또는 Base URL 기준 상대 경로. 설정 시 테스트에서 실제 벡터 응답 여부를 확인합니다.</p>
              </div>
            )}

            {/* API Key */}
            <div>
              <label htmlFor="p-key" className="block text-sm font-semibold text-gray-700 mb-1">
                API Key {isEdit && <span className="text-gray-400 font-normal">(변경 시에만 입력)</span>}
              </label>
              <div className="relative">
                <input
                  id="p-key"
                  type={showKey ? "text" : "password"}
                  value={form.api_key ?? ""}
                  onChange={(e) => set("api_key", e.target.value)}
                  placeholder={isEdit ? "변경하지 않으려면 비워두세요" : "sk-..."}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label={showKey ? "API Key 숨기기" : "API Key 표시"}
                >
                  {showKey ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* 설명 */}
            <div>
              <label htmlFor="p-desc" className="block text-sm font-semibold text-gray-700 mb-1">설명</label>
              <textarea
                id="p-desc"
                rows={2}
                value={form.description ?? ""}
                onChange={(e) => set("description", e.target.value)}
                placeholder="프로바이더에 대한 간단한 설명"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* 기본 모델 */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_default ?? false}
                onChange={(e) => set("is_default", e.target.checked)}
                className="w-4 h-4 rounded accent-blue-600"
              />
              <span className="text-sm font-semibold text-gray-700">이 유형의 기본 모델로 지정</span>
            </label>

            {(error || serverError) && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg" role="alert">
                {error || serverError}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors min-h-[44px] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {isPending ? "저장 중..." : isEdit ? "저장" : "추가"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── 삭제 확인 모달 ───

function DeleteConfirmModal({
  provider,
  onClose,
  onConfirm,
  isPending,
}: {
  provider: LLMProvider;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" role="dialog" aria-modal="true">
        <h2 className="text-lg font-bold text-gray-900 mb-2">프로바이더 삭제</h2>
        <p className="text-sm text-gray-600 mb-6">
          <span className="font-semibold">{provider.name}</span>을(를) 삭제하시겠습니까?<br />
          이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 min-h-[44px]">
            취소
          </button>
          <button type="button" onClick={onConfirm} disabled={isPending}
            className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 min-h-[44px] disabled:opacity-50">
            {isPending ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// AdminProvidersPage
// ═══════════════════════════════════════

export function AdminProvidersPage() {
  const qc = useQueryClient();
  const [testResult, setTestResult] = useState<ProviderTestResult | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<LLMProvider | "new" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LLMProvider | null>(null);
  const [saveError, setSaveError] = useState<string>("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "providers"],
    queryFn: () => providersApi.list(),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "providers"] });

  const testMut = useMutation({
    mutationFn: (id: string) => providersApi.test(id),
    onSuccess: (res) => { invalidate(); setTestResult(res.data); },
    onSettled: () => setTestingId(null),
  });

  function extractSaveError(err: unknown): string {
    if (err instanceof ApiError) {
      const d = err.data as { error?: { message?: string; details?: Array<{ field: string; reason: string }> } } | undefined;
      const details = d?.error?.details;
      if (details && details.length > 0) {
        return details.map((x) => `${x.field}: ${x.reason}`).join(" / ");
      }
      return d?.error?.message ?? err.message ?? "저장에 실패했습니다.";
    }
    return err instanceof Error ? err.message : "저장에 실패했습니다.";
  }

  const createMut = useMutation({
    mutationFn: (body: ProviderFormData) => providersApi.create(body),
    onSuccess: () => { invalidate(); setEditTarget(null); setSaveError(""); },
    onError: (err: unknown) => setSaveError(extractSaveError(err)),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<ProviderFormData> }) =>
      providersApi.update(id, body),
    onSuccess: () => { invalidate(); setEditTarget(null); setSaveError(""); },
    onError: (err: unknown) => setSaveError(extractSaveError(err)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => providersApi.delete(id),
    onSuccess: () => { invalidate(); setDeleteTarget(null); },
  });

  const defaultMut = useMutation({
    mutationFn: ({ id, type }: { id: string; type: "llm" | "embedding" }) =>
      providersApi.setDefault(id, type),
    onSuccess: () => invalidate(),
  });

  const providers = data?.data ?? [];

  function handleSave(form: ProviderFormData) {
    const body: ProviderFormData = {
      ...form,
      api_base_url: form.api_base_url?.trim() || undefined,
      embed_endpoint: form.embed_endpoint?.trim() || undefined,
      api_key: form.api_key?.trim() || undefined,
      description: form.description?.trim() || undefined,
    };
    if (editTarget === "new") {
      createMut.mutate(body);
    } else if (editTarget) {
      updateMut.mutate({ id: editTarget.id, body });
    }
  }

  const savePending = createMut.isPending || updateMut.isPending;

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl">
      {testResult && <TestResultModal result={testResult} onClose={() => setTestResult(null)} />}
      {editTarget && (
        <ProviderFormModal
          initial={editTarget === "new" ? undefined : editTarget}
          onClose={() => { setEditTarget(null); setSaveError(""); }}
          onSave={handleSave}
          isPending={savePending}
          serverError={saveError}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          provider={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          isPending={deleteMut.isPending}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">모델·프로바이더 관리</h1>
        <button
          type="button"
          onClick={() => { setSaveError(""); setEditTarget("new"); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          프로바이더 추가
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center py-12 gap-3">
          <p className="text-sm text-gray-500">프로바이더 목록을 불러오지 못했습니다.</p>
          <button type="button" onClick={() => refetch()}
            className="text-sm text-blue-700 font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 min-h-[44px]">
            다시 시도
          </button>
        </div>
      ) : providers.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-sm">
          등록된 프로바이더가 없습니다.
          <br />
          <button type="button" onClick={() => setEditTarget("new")}
            className="mt-3 text-blue-700 font-semibold hover:underline">
            프로바이더 추가하기
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">이름</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">모델</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">API URL</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">유형</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">기본</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">마지막 테스트</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {providers.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{p.name}</div>
                      {p.description && (
                        <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[180px]">{p.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 font-mono text-xs">{p.model_name}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px]">
                      {p.api_base_url ? (
                        <span className="truncate block font-mono" title={p.api_base_url}>{p.api_base_url}</span>
                      ) : (
                        <span className="text-gray-300">기본값</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold",
                        p.type === "llm" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"
                      )}>
                        {p.type === "llm" ? "LLM" : "Embedding"}
                      </span>
                    </td>
                    <td className="px-4 py-3"><ProviderStatusBadge status={p.status} /></td>
                    <td className="px-4 py-3">
                      {p.is_default ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.163c.969 0 1.371 1.24.588 1.81l-3.369 2.448a1 1 0 00-.364 1.118l1.286 3.957c.3.921-.755 1.688-1.54 1.118l-3.369-2.448a1 1 0 00-1.175 0l-3.369 2.448c-.784.57-1.838-.197-1.539-1.118l1.286-3.957a1 1 0 00-.364-1.118L2.05 9.384c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.951-.69l1.287-3.957z" />
                          </svg>
                          기본
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => defaultMut.mutate({ id: p.id, type: p.type })}
                          disabled={defaultMut.isPending}
                          className="text-xs text-gray-400 hover:text-amber-600 hover:underline disabled:opacity-40"
                        >
                          기본 지정
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {p.last_tested_at
                        ? new Date(p.last_tested_at).toLocaleString("ko", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
                        : "-"}
                      {p.last_test_result && p.last_test_result !== "success" && (
                        <span className="ml-1 text-red-500">({p.last_test_result})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          disabled={testingId === p.id}
                          onClick={() => { setTestingId(p.id); testMut.mutate(p.id); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors min-h-[32px] disabled:opacity-50"
                          aria-label={`${p.name} 연결 테스트`}
                        >
                          {testingId === p.id ? "테스트 중..." : "테스트"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSaveError(""); setEditTarget(p); }}
                          className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors min-h-[32px]"
                          aria-label={`${p.name} 편집`}
                        >
                          편집
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                          className="inline-flex items-center px-2.5 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors min-h-[32px]"
                          aria-label={`${p.name} 삭제`}
                        >
                          삭제
                        </button>
                      </div>
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
