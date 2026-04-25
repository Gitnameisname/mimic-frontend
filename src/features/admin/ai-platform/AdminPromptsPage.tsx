"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { promptsApi } from "@/lib/api/s2admin";
import type { Prompt, PromptVersion } from "@/types/s2admin";
import { cn } from "@/lib/utils";
import { formatDateOnly } from "@/lib/utils/date";

// ─── 모달: 프롬프트 생성 ───

const createSchema = z.object({
  name: z.string().min(1, "이름을 입력하세요"),
  description: z.string().optional(),
  content: z.string().min(1, "내용을 입력하세요"),
});
type CreateForm = z.infer<typeof createSchema>;

function CreatePromptModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({ resolver: zodResolver(createSchema) });

  const mut = useMutation({
    mutationFn: (data: CreateForm) =>
      promptsApi.create({ name: data.name, description: data.description, content: data.content }),
    onSuccess: () => {
      onCreated();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div
        className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4"
        role="dialog"
        aria-modal="true"
        aria-label="프롬프트 생성"
      >
        <h2 className="text-lg font-bold text-gray-900 mb-5">프롬프트 생성</h2>
        <form onSubmit={handleSubmit((d) => mut.mutate(d))} noValidate>
          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="prompt-name" className="block text-sm font-semibold text-gray-700 mb-1.5">
                이름 <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <input
                id="prompt-name"
                type="text"
                {...register("name")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: rag_system_prompt"
                aria-required="true"
                aria-describedby={errors.name ? "prompt-name-err" : undefined}
              />
              {errors.name && (
                <p id="prompt-name-err" className="mt-1 text-xs text-red-600" role="alert">{errors.name.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="prompt-desc" className="block text-sm font-semibold text-gray-700 mb-1.5">
                설명
              </label>
              <input
                id="prompt-desc"
                type="text"
                {...register("description")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="프롬프트 용도 설명"
              />
            </div>
            <div>
              <label htmlFor="prompt-content" className="block text-sm font-semibold text-gray-700 mb-1.5">
                초기 내용 <span className="text-red-500" aria-hidden="true">*</span>
              </label>
              <textarea
                id="prompt-content"
                {...register("content")}
                rows={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                placeholder="프롬프트 내용 입력..."
                aria-required="true"
                aria-describedby={errors.content ? "prompt-content-err" : undefined}
              />
              {errors.content && (
                <p id="prompt-content-err" className="mt-1 text-xs text-red-600" role="alert">{errors.content.message}</p>
              )}
            </div>
          </div>
          {mut.isError && (
            <p className="mb-3 text-xs text-red-600" role="alert">저장 중 오류가 발생했습니다.</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || mut.isPending}
              className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors min-h-[44px] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {mut.isPending ? "저장 중..." : "생성"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── 버전 타임라인 ───

function VersionTimeline({
  versions,
  activeVersionId,
  onActivate,
  activating,
}: {
  versions: PromptVersion[];
  activeVersionId: string | null;
  onActivate: (versionId: string) => void;
  activating: boolean;
}) {
  const sorted = [...versions].sort((a, b) => b.version_number - a.version_number);
  return (
    <ol className="relative border-l-2 border-gray-200 space-y-4 ml-3">
      {sorted.map((v) => (
        <li key={v.id} className="pl-6 relative">
          <span
            className={cn(
              "absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center",
              v.is_active || v.id === activeVersionId
                ? "bg-blue-600 border-blue-600"
                : "bg-white border-gray-300"
            )}
            aria-hidden="true"
          />
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                v{v.version_number}
                {(v.is_active || v.id === activeVersionId) && (
                  <span className="ml-2 text-xs font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                    활성
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(v.created_at).toLocaleString("ko")}
                {v.created_by && ` · ${v.created_by}`}
              </p>
              <pre className="mt-2 text-xs text-gray-700 bg-gray-50 rounded-lg p-3 overflow-x-auto max-h-24 font-mono whitespace-pre-wrap">
                {v.content.slice(0, 200)}{v.content.length > 200 ? "..." : ""}
              </pre>
            </div>
            {!(v.is_active || v.id === activeVersionId) && (
              <button
                type="button"
                disabled={activating}
                onClick={() => onActivate(v.id)}
                className="shrink-0 px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 text-xs font-semibold hover:bg-blue-50 transition-colors min-h-[36px] disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                이 버전 활성화
              </button>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ─── 프롬프트 상세 패널 ───

function PromptDetailPanel({
  prompt,
  onClose,
}: {
  prompt: Prompt;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [addingVersion, setAddingVersion] = useState(false);
  const [newContent, setNewContent] = useState("");

  const detailQ = useQuery({
    queryKey: ["admin", "prompts", prompt.id],
    queryFn: () => promptsApi.get(prompt.id),
  });

  const activateMut = useMutation({
    mutationFn: (versionId: string) => promptsApi.activateVersion(prompt.id, versionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "prompts"] }),
  });

  const newVersionMut = useMutation({
    mutationFn: (content: string) => promptsApi.newVersion(prompt.id, { content }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "prompts", prompt.id] });
      qc.invalidateQueries({ queryKey: ["admin", "prompts"] });
      setAddingVersion(false);
      setNewContent("");
    },
  });

  const detail = detailQ.data?.data;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div
        className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={`${prompt.name} 프롬프트 상세`}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 truncate">{prompt.name}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-5 space-y-6">
          {prompt.description && (
            <p className="text-sm text-gray-600">{prompt.description}</p>
          )}

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">버전 이력</h3>
            <button
              type="button"
              onClick={() => setAddingVersion(true)}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 min-h-[36px] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              + 새 버전 추가
            </button>
          </div>

          {addingVersion && (
            <div className="rounded-xl border border-gray-200 p-4 space-y-3">
              <label htmlFor="new-version-content" className="block text-sm font-semibold text-gray-700">
                새 버전 내용
              </label>
              <textarea
                id="new-version-content"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                placeholder="새 버전의 프롬프트 내용..."
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setAddingVersion(false); setNewContent(""); }}
                  className="flex-1 py-2 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 min-h-[36px]"
                >
                  취소
                </button>
                <button
                  type="button"
                  disabled={!newContent.trim() || newVersionMut.isPending}
                  onClick={() => newVersionMut.mutate(newContent)}
                  className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 min-h-[36px] disabled:opacity-50"
                >
                  {newVersionMut.isPending ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          )}

          {detailQ.isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : detail?.versions && detail.versions.length > 0 ? (
            <VersionTimeline
              versions={detail.versions}
              activeVersionId={detail.active_version_id}
              onActivate={(vid) => activateMut.mutate(vid)}
              activating={activateMut.isPending}
            />
          ) : (
            <p className="text-sm text-gray-500">버전이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// AdminPromptsPage
// ═══════════════════════════════════════

export function AdminPromptsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Prompt | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "prompts", page],
    queryFn: () => promptsApi.list({ page, page_size: 20 }),
  });

  const prompts = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl">
      {showCreate && (
        <CreatePromptModal
          onClose={() => setShowCreate(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ["admin", "prompts"] })}
        />
      )}
      {selected && (
        <PromptDetailPanel prompt={selected} onClose={() => setSelected(null)} />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">프롬프트 관리</h1>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          프롬프트 생성
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center py-12 gap-3">
          <p className="text-sm text-gray-500">프롬프트 목록을 불러오지 못했습니다.</p>
          <button type="button" onClick={() => refetch()} className="text-sm text-blue-700 font-semibold px-4 py-2 rounded-lg hover:bg-blue-50 min-h-[44px]">
            다시 시도
          </button>
        </div>
      ) : prompts.length === 0 ? (
        <div className="text-center py-16 text-gray-500 text-sm">등록된 프롬프트가 없습니다.</div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">이름</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">설명</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">활성 버전</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">A/B 테스트</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">수정일</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {prompts.map((p) => (
                    <tr
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${p.name} 프롬프트 상세 열기`}
                      className="hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus-visible:bg-blue-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                      onClick={() => setSelected(p)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(p);
                        }
                      }}
                    >
                      <td className="px-4 py-3 font-semibold text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{p.description ?? "-"}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {p.active_version !== null ? `v${p.active_version}` : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        {p.ab_test_config ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                            A/B 활성
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {formatDateOnly(p.updated_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelected(p); }}
                          className="text-xs font-semibold text-blue-700 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 min-h-[36px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          상세 보기
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
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 min-h-[40px]"
              >
                이전
              </button>
              <span className="text-sm text-gray-600">{page} / {meta.total_pages}</span>
              <button
                type="button"
                disabled={page >= meta.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 min-h-[40px]"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
