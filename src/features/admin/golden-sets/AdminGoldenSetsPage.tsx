"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { goldenSetsApi, type GoldenItemCreateFormData } from "@/lib/api/s2admin";
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  GoldenSet,
  GoldenSetDetail,
  GoldenSetDomain,
  GoldenSetItem,
  GoldenSetStatus,
  GoldenSetVersionInfo,
  SourceRef,
} from "@/types/s2admin";

// ─── 상수 ───

const DOMAIN_LABELS: Record<GoldenSetDomain, string> = {
  policy: "정책",
  regulation: "규정",
  technical_guide: "기술 가이드",
  manual: "매뉴얼",
  faq: "FAQ",
  custom: "사용자 정의",
};

const STATUS_LABELS: Record<GoldenSetStatus, string> = {
  draft: "초안",
  published: "게시됨",
  archived: "보관됨",
};

const STATUS_BADGE_STYLE: Record<GoldenSetStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  published: "bg-blue-50 text-blue-700 border border-blue-200",
  archived: "bg-gray-200 text-gray-600",
};

// ─── 공용 유틸 ───

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("ko");
  } catch {
    return "-";
  }
}

function downloadJsonFile(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Create Modal ───

interface CreateModalProps {
  onClose: () => void;
  onCreated: (gs: GoldenSet) => void;
}

function GoldenSetCreateModal({ onClose, onCreated }: CreateModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState<GoldenSetDomain>("custom");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const mutation = useMutation({
    mutationFn: () =>
      goldenSetsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        domain,
      }),
    onSuccess: (resp) => {
      onCreated(resp.data);
    },
    onError: (err) => {
      setSubmitError(
        getApiErrorMessage(err, "골든셋 생성에 실패했습니다."),
      );
    },
  });

  const canSubmit =
    name.trim().length > 0 && name.trim().length <= 200 && !mutation.isPending;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="새 골든셋 생성"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">새 골든셋 생성</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form
          className="p-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) mutation.mutate();
          }}
        >
          <div>
            <label htmlFor="gs-name" className="block text-sm font-semibold text-gray-800 mb-1">
              이름 <span className="text-red-600" aria-hidden="true">*</span>
            </label>
            <input
              id="gs-name"
              ref={nameRef}
              type="text"
              required
              maxLength={200}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              placeholder="예: RAG 기본 평가셋"
            />
          </div>
          <div>
            <label htmlFor="gs-description" className="block text-sm font-semibold text-gray-800 mb-1">
              설명
            </label>
            <textarea
              id="gs-description"
              maxLength={1000}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              placeholder="평가셋의 목적과 범위를 간단히 기술하세요 (선택)"
            />
          </div>
          <div>
            <label htmlFor="gs-domain" className="block text-sm font-semibold text-gray-800 mb-1">
              도메인
            </label>
            <select
              id="gs-domain"
              value={domain}
              onChange={(e) => setDomain(e.target.value as GoldenSetDomain)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {(Object.keys(DOMAIN_LABELS) as GoldenSetDomain[]).map((d) => (
                <option key={d} value={d}>
                  {DOMAIN_LABELS[d]}
                </option>
              ))}
            </select>
          </div>
          {submitError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2" role="alert">
              {submitError}
            </p>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 min-h-[40px]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed min-h-[40px]"
            >
              {mutation.isPending ? "생성 중..." : "생성"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Item Add Form (detail panel 내부) ───

interface ItemAddFormProps {
  goldenSetId: string;
  onAdded: () => void;
  onCancel: () => void;
}

function GoldenItemAddForm({ goldenSetId, onAdded, onCancel }: ItemAddFormProps) {
  const [question, setQuestion] = useState("");
  const [expectedAnswer, setExpectedAnswer] = useState("");
  const [docId, setDocId] = useState("");
  const [versionId, setVersionId] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const sourceRef: SourceRef = {
        document_id: docId.trim(),
        version_id: versionId.trim(),
        node_id: nodeId.trim(),
      };
      const body: GoldenItemCreateFormData = {
        question: question.trim(),
        expected_answer: expectedAnswer.trim(),
        expected_source_docs: [sourceRef],
        notes: notes.trim() || undefined,
      };
      return goldenSetsApi.addItem(goldenSetId, body);
    },
    onSuccess: () => onAdded(),
    onError: (err) => {
      setSubmitError(getApiErrorMessage(err, "항목 추가에 실패했습니다."));
    },
  });

  const canSubmit =
    question.trim().length > 0 &&
    expectedAnswer.trim().length > 0 &&
    docId.trim().length > 0 &&
    versionId.trim().length > 0 &&
    nodeId.trim().length > 0 &&
    !mutation.isPending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) mutation.mutate();
      }}
      className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3"
    >
      <p className="text-xs text-gray-600">
        질문과 기대 답변, 그리고 근거 문서 참조(최소 1개)를 입력하세요. 대량 추가는 JSON import 를 권장합니다.
      </p>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          질문 <span className="text-red-600" aria-hidden="true">*</span>
        </label>
        <textarea
          required
          maxLength={2000}
          rows={2}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          기대 답변 <span className="text-red-600" aria-hidden="true">*</span>
        </label>
        <textarea
          required
          maxLength={5000}
          rows={3}
          value={expectedAnswer}
          onChange={(e) => setExpectedAnswer(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input
          required
          placeholder="document_id *"
          value={docId}
          onChange={(e) => setDocId(e.target.value)}
          aria-label="근거 문서 document_id"
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
        <input
          required
          placeholder="version_id *"
          value={versionId}
          onChange={(e) => setVersionId(e.target.value)}
          aria-label="근거 문서 version_id"
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
        <input
          required
          placeholder="node_id *"
          value={nodeId}
          onChange={(e) => setNodeId(e.target.value)}
          aria-label="근거 문서 node_id"
          className="px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">노트</label>
        <input
          maxLength={1000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        />
      </div>
      {submitError && (
        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1.5" role="alert">
          {submitError}
        </p>
      )}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-semibold text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 min-h-[32px]"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed min-h-[32px]"
        >
          {mutation.isPending ? "추가 중..." : "항목 추가"}
        </button>
      </div>
    </form>
  );
}

// ─── Detail Panel ───

interface DetailPanelProps {
  goldenSetId: string;
  onClose: () => void;
}

function GoldenSetDetailPanel({ goldenSetId, onClose }: DetailPanelProps) {
  const queryClient = useQueryClient();
  const [addingItem, setAddingItem] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detailQuery = useQuery({
    queryKey: ["admin", "golden-sets", goldenSetId],
    queryFn: () => goldenSetsApi.get(goldenSetId),
    retry: false,
  });

  const versionsQuery = useQuery({
    queryKey: ["admin", "golden-sets", goldenSetId, "versions"],
    queryFn: () => goldenSetsApi.versions(goldenSetId),
    retry: false,
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => goldenSetsApi.deleteItem(goldenSetId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "golden-sets", goldenSetId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "golden-sets"] });
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => goldenSetsApi.importJson(goldenSetId, file),
    onSuccess: () => {
      setImportError(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "golden-sets", goldenSetId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "golden-sets", goldenSetId, "versions"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "golden-sets"] });
    },
    onError: (err) => setImportError(getApiErrorMessage(err, "import 에 실패했습니다.")),
  });

  const exportMutation = useMutation({
    mutationFn: () => goldenSetsApi.exportJson(goldenSetId),
    onSuccess: (resp) => {
      const payload = resp.data;
      const detail = detailQuery.data?.data;
      const filename = `golden-set-${detail?.name ?? goldenSetId}.json`;
      downloadJsonFile(payload, filename.replace(/\s+/g, "_"));
    },
  });

  const detail: GoldenSetDetail | undefined = detailQuery.data?.data;
  const versions: GoldenSetVersionInfo[] = versionsQuery.data?.data ?? [];

  const errorMessage = detailQuery.isError
    ? getApiErrorMessage(detailQuery.error, "골든셋을 불러오지 못했습니다.")
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-label="골든셋 상세"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="text-base font-bold text-gray-900 truncate">
            {detail?.name ?? "로딩 중..."}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-5 space-y-6">
          {detailQuery.isLoading && (
            <p className="text-sm text-gray-500">로딩 중...</p>
          )}

          {errorMessage && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4" role="alert">
              <p className="text-sm font-bold text-red-800">상세를 불러오지 못했습니다</p>
              <p className="text-xs text-red-700 mt-1">{errorMessage}</p>
            </div>
          )}

          {detail && (
            <>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                  {DOMAIN_LABELS[detail.domain]}
                </span>
                <span className={`px-2 py-0.5 rounded-md ${STATUS_BADGE_STYLE[detail.status]}`}>
                  {STATUS_LABELS[detail.status]}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                  v{detail.version}
                </span>
              </div>

              {detail.description && (
                <p className="text-sm text-gray-700 leading-6">{detail.description}</p>
              )}

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-gray-900">{detail.items.length}</p>
                  <p className="text-xs text-gray-500 mt-1">문항 수</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-gray-900">v{detail.version}</p>
                  <p className="text-xs text-gray-500 mt-1">현재 버전</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-2xl font-bold text-gray-900">{versions.length}</p>
                  <p className="text-xs text-gray-500 mt-1">버전 이력</p>
                </div>
              </div>

              {/* Q&A 항목 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">질문-답변 항목</h3>
                  {!addingItem && (
                    <button
                      type="button"
                      onClick={() => setAddingItem(true)}
                      className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg min-h-[32px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      + 항목 추가
                    </button>
                  )}
                </div>

                {addingItem && (
                  <div className="mb-3">
                    <GoldenItemAddForm
                      goldenSetId={goldenSetId}
                      onAdded={() => {
                        setAddingItem(false);
                        queryClient.invalidateQueries({ queryKey: ["admin", "golden-sets", goldenSetId] });
                        queryClient.invalidateQueries({ queryKey: ["admin", "golden-sets", goldenSetId, "versions"] });
                        queryClient.invalidateQueries({ queryKey: ["admin", "golden-sets"] });
                      }}
                      onCancel={() => setAddingItem(false)}
                    />
                  </div>
                )}

                <ItemList
                  items={detail.items}
                  onDelete={(id) => {
                    if (confirm("이 항목을 삭제하시겠습니까? (soft delete)")) {
                      deleteItemMutation.mutate(id);
                    }
                  }}
                  deleting={deleteItemMutation.isPending}
                />
              </div>

              {/* 버전 이력 */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">버전 이력</h3>
                {versionsQuery.isLoading ? (
                  <p className="text-xs text-gray-500">로딩 중...</p>
                ) : versions.length === 0 ? (
                  <p className="text-xs text-gray-500">버전 이력이 없습니다.</p>
                ) : (
                  <div className="border-l-2 border-gray-200 pl-4 space-y-2">
                    {versions.map((v) => (
                      <div key={v.version} className="relative">
                        <span className="absolute -left-[17px] top-1 w-3 h-3 rounded-full bg-blue-500" aria-hidden="true" />
                        <p className="text-sm text-gray-800">v{v.version} · {v.item_count} 문항</p>
                        <p className="text-xs text-gray-500">{formatDate(v.created_at)} · {v.created_by}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Import / Export */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Import / Export</h3>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={importMutation.isPending}
                    className="flex-1 py-2.5 rounded-lg border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700 hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    {importMutation.isPending ? "Import 중..." : "Import (JSON)"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) importMutation.mutate(file);
                      // 같은 파일 재선택 가능하도록 value 리셋
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => exportMutation.mutate()}
                    disabled={exportMutation.isPending}
                    className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
                  >
                    {exportMutation.isPending ? "Export 중..." : "Export (JSON)"}
                  </button>
                </div>
                {importError && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-2" role="alert">
                    {importError}
                  </p>
                )}
                {importMutation.data && !importError && (
                  <p className="text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 mt-2">
                    Import 완료 — 성공 {importMutation.data.data.successful_items} / 실패 {importMutation.data.data.failed_items} / 총 {importMutation.data.data.total_items}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ItemList({
  items,
  onDelete,
  deleting,
}: {
  items: GoldenSetItem[];
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
        항목이 없습니다. 위 &ldquo;+ 항목 추가&rdquo; 또는 Import (JSON) 를 사용하세요.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">질문</th>
            <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">기대 답변</th>
            <th scope="col" className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">근거</th>
            <th scope="col" className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500">작업</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((it) => (
            <tr key={it.id}>
              <td className="px-3 py-2.5 text-gray-800 max-w-[220px] truncate" title={it.question}>{it.question}</td>
              <td className="px-3 py-2.5 text-gray-600 max-w-[280px] truncate" title={it.expected_answer}>{it.expected_answer}</td>
              <td className="px-3 py-2.5 text-xs text-gray-500">{it.expected_source_docs.length} ref</td>
              <td className="px-3 py-2.5 text-right">
                <button
                  type="button"
                  onClick={() => onDelete(it.id)}
                  disabled={deleting}
                  className="text-xs font-semibold text-red-700 hover:text-red-800 px-2 py-1 rounded-md hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50"
                  aria-label={`${it.question.slice(0, 30)} 항목 삭제`}
                >
                  삭제
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════
// AdminGoldenSetsPage
// ═══════════════════════════════════════

export function AdminGoldenSetsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const listQuery = useQuery({
    queryKey: ["admin", "golden-sets"],
    queryFn: () => goldenSetsApi.list({ limit: 50 }),
    retry: false,
  });

  const sets: GoldenSet[] = useMemo(
    () => listQuery.data?.data ?? [],
    [listQuery.data],
  );

  const errorMessage = listQuery.isError
    ? getApiErrorMessage(listQuery.error, "골든셋 목록을 불러오지 못했습니다.")
    : null;

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl">
      {selectedId && (
        <GoldenSetDetailPanel
          goldenSetId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}

      {showCreate && (
        <GoldenSetCreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(gs) => {
            setShowCreate(false);
            queryClient.invalidateQueries({ queryKey: ["admin", "golden-sets"] });
            setSelectedId(gs.id);
          }}
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">골든셋 관리</h1>
          <p className="text-sm text-gray-600 mt-1">
            RAG 품질 평가를 위한 Q&A 컬렉션(Golden Set)을 관리합니다. 항목은 직접 추가하거나 JSON 파일로 bulk import 할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[44px]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          골든셋 생성
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4" role="alert">
          <p className="text-sm font-bold text-red-800">목록을 불러오지 못했습니다</p>
          <p className="text-xs text-red-700 mt-1">{errorMessage}</p>
          <p className="text-xs text-red-700 mt-1">Scope Profile 바인딩 또는 권한을 확인해 주세요. (S2 ⑥)</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="min-w-full text-sm"
            aria-label="골든셋 목록"
            aria-busy={listQuery.isLoading}
          >
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">이름</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">설명</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">도메인</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상태</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">문항</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">버전</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">생성일</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {listQuery.isLoading && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-sm">
                    로딩 중...
                  </td>
                </tr>
              )}
              {!listQuery.isLoading && sets.length === 0 && !errorMessage && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-sm">
                    아직 생성된 골든셋이 없습니다. 우측 상단 “골든셋 생성” 버튼으로 시작하세요.
                  </td>
                </tr>
              )}
              {sets.map((s) => (
                <tr
                  key={s.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${s.name} 골든셋 상세 열기`}
                  className="hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus-visible:bg-blue-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                  onClick={() => setSelectedId(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(s.id);
                    }
                  }}
                >
                  <td className="px-4 py-3 font-semibold text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{s.description ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-700">{DOMAIN_LABELS[s.domain] ?? s.domain}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-md ${STATUS_BADGE_STYLE[s.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{s.item_count ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-700">v{s.version}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(s.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(s.id);
                      }}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 min-h-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
    </div>
  );
}
