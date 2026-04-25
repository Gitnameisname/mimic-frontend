"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { QueryLoader } from "@/components/feedback/QueryLoader";
import type { SchemaField, DocTypePluginStatus } from "@/types/admin";
import { formatDateOnly } from "@/lib/utils/date";

interface Props {
  typeCode: string;
}

// ---- 탭 타입 ----
type TabKey = "info" | "chunking" | "rag" | "search" | "metadata" | "workflow";

// ---- 수정 모달 ----
function EditDocTypeModal({
  typeCode,
  initial,
  onClose,
}: {
  typeCode: string;
  initial: { display_name: string; description?: string };
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    display_name: initial.display_name,
    description: initial.description ?? "",
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateDocumentType(typeCode, {
        display_name: form.display_name.trim(),
        description: form.description.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "document-type", typeCode] });
      queryClient.invalidateQueries({ queryKey: ["admin", "document-types"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">문서 유형 수정</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            if (!form.display_name.trim()) return setError("표시 이름을 입력하세요.");
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              표시 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">설명</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 bg-blue-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- 청킹 설정 탭 ----
function ChunkingConfigTab({ typeCode, pluginData }: { typeCode: string; pluginData: DocTypePluginStatus }) {
  const queryClient = useQueryClient();
  const cfg = pluginData.effective_config.chunking as Record<string, unknown>;
  const [form, setForm] = useState({
    max_chunk_tokens: String(cfg.max_chunk_tokens ?? 512),
    min_chunk_tokens: String(cfg.min_chunk_tokens ?? 50),
    overlap_tokens: String(cfg.overlap_tokens ?? 50),
    include_parent_context: Boolean(cfg.include_parent_context ?? true),
    parent_context_depth: String(cfg.parent_context_depth ?? 2),
    index_version_policy: String(cfg.index_version_policy ?? "published_only"),
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateDocumentTypePlugin(typeCode, {
        chunking_config: {
          max_chunk_tokens: parseInt(form.max_chunk_tokens),
          min_chunk_tokens: parseInt(form.min_chunk_tokens),
          overlap_tokens: parseInt(form.overlap_tokens),
          include_parent_context: form.include_parent_context,
          parent_context_depth: parseInt(form.parent_context_depth),
          index_version_policy: form.index_version_policy,
        },
      }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ["admin", "document-type-plugin", typeCode] });
    },
    onError: (e: Error) => setError(e.message),
  });

  const numberInput = (label: string, key: keyof typeof form, hint?: string) => (
    <div>
      <label className="text-xs font-medium text-gray-600 block mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      <input
        type="number"
        value={form[key] as string}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
    </div>
  );

  return (
    <div className="space-y-5">
      {pluginData.is_builtin && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
          내장 플러그인 타입입니다. 값을 수정하면 플러그인 기본값을 오버라이드합니다.
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {numberInput("최대 청크 토큰 수", "max_chunk_tokens", "청크당 최대 토큰 수")}
        {numberInput("최소 청크 토큰 수", "min_chunk_tokens", "이하면 인접 청크와 병합")}
        {numberInput("오버랩 토큰 수", "overlap_tokens", "청크 간 겹치는 토큰")}
        {numberInput("부모 컨텍스트 깊이", "parent_context_depth")}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="include_parent_context"
          checked={form.include_parent_context}
          onChange={(e) => setForm((f) => ({ ...f, include_parent_context: e.target.checked }))}
          className="w-4 h-4 rounded border-gray-300"
        />
        <label htmlFor="include_parent_context" className="text-sm text-gray-700">
          부모 컨텍스트 포함
        </label>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">인덱스 버전 정책</label>
        <select
          value={form.index_version_policy}
          onChange={(e) => setForm((f) => ({ ...f, index_version_policy: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="published_only">게시된 버전만</option>
          <option value="latest">최신 버전</option>
          <option value="all">모든 버전</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {mutation.isPending ? "저장 중..." : saved ? "저장됨 ✓" : "저장"}
        </button>
      </div>
    </div>
  );
}

// ---- RAG 설정 탭 ----
function RAGConfigTab({ typeCode, pluginData }: { typeCode: string; pluginData: DocTypePluginStatus }) {
  const queryClient = useQueryClient();
  const cfg = pluginData.effective_config.rag as Record<string, unknown>;
  const [form, setForm] = useState({
    max_context_tokens: String(cfg.max_context_tokens ?? 6000),
    top_n: String(cfg.top_n ?? 5),
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateDocumentTypePlugin(typeCode, {
        rag_config: {
          max_context_tokens: parseInt(form.max_context_tokens),
          top_n: parseInt(form.top_n),
        },
      }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ["admin", "document-type-plugin", typeCode] });
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="space-y-5">
      {pluginData.is_builtin && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-700">
          내장 플러그인 타입입니다. 값을 수정하면 플러그인 기본값을 오버라이드합니다.
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">최대 컨텍스트 토큰 수</label>
          <input
            type="number"
            value={form.max_context_tokens}
            onChange={(e) => setForm((f) => ({ ...f, max_context_tokens: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Top-N 청크 수</label>
          <input
            type="number"
            value={form.top_n}
            onChange={(e) => setForm((f) => ({ ...f, top_n: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {mutation.isPending ? "저장 중..." : saved ? "저장됨 ✓" : "저장"}
      </button>
    </div>
  );
}

// ---- 검색 설정 탭 ----
function SearchConfigTab({ typeCode, pluginData }: { typeCode: string; pluginData: DocTypePluginStatus }) {
  const queryClient = useQueryClient();
  const boost = pluginData.effective_config.search_boost as Record<string, number>;
  const [boostJson, setBoostJson] = useState(JSON.stringify(boost, null, 2));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(boostJson);
      } catch {
        throw new Error("유효하지 않은 JSON 형식입니다");
      }
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("검색 부스트는 객체(key: number) 형식이어야 합니다");
      }
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof k !== "string" || typeof v !== "number") {
          throw new Error(`"${k}": 숫자 가중치가 필요합니다`);
        }
      }
      return adminApi.updateDocumentTypePlugin(typeCode, {
        search_config: { boost: parsed as Record<string, number> },
      });
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ["admin", "document-type-plugin", typeCode] });
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">
          검색 부스트 가중치 (JSON)
        </label>
        <p className="text-xs text-gray-400 mb-2">필드명: 가중치 형식. 예: title: 2.0</p>
        <textarea
          value={boostJson}
          onChange={(e) => setBoostJson(e.target.value)}
          rows={8}
          className="w-full font-mono text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
        />
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      <button
        onClick={() => {
          setError("");
          try {
            JSON.parse(boostJson);
          } catch {
            setError("유효하지 않은 JSON 형식입니다.");
            return;
          }
          mutation.mutate();
        }}
        disabled={mutation.isPending}
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {mutation.isPending ? "저장 중..." : saved ? "저장됨 ✓" : "저장"}
      </button>
    </div>
  );
}

// ---- Metadata Schema 탭 ----
function MetadataSchemaTab({ typeCode, pluginData }: { typeCode: string; pluginData: DocTypePluginStatus }) {
  const queryClient = useQueryClient();
  const schema = pluginData.effective_config.metadata_schema;
  const [schemaJson, setSchemaJson] = useState(JSON.stringify(schema, null, 2));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(schemaJson);
      } catch {
        throw new Error("유효하지 않은 JSON 형식입니다");
      }
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("메타데이터 스키마는 JSON 객체여야 합니다");
      }
      return adminApi.updateDocumentTypePlugin(typeCode, {
        metadata_schema: parsed as Record<string, unknown>,
      });
    },
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ["admin", "document-type-plugin", typeCode] });
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">
          Metadata JSON Schema (Draft-07)
        </label>
        <p className="text-xs text-gray-400 mb-2">
          빈 스키마 {} = 모든 metadata 허용. 저장 시 JSON Schema 유효성을 검사합니다.
        </p>
        <textarea
          value={schemaJson}
          onChange={(e) => setSchemaJson(e.target.value)}
          rows={14}
          className="w-full font-mono text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-y"
        />
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={() => {
            setError("");
            try {
              JSON.parse(schemaJson);
            } catch {
              setError("유효하지 않은 JSON 형식입니다.");
              return;
            }
            mutation.mutate();
          }}
          disabled={mutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {mutation.isPending ? "저장 중..." : saved ? "저장됨 ✓" : "저장"}
        </button>
        <button
          onClick={() => setSchemaJson("{}")}
          className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
        >
          초기화
        </button>
      </div>
    </div>
  );
}

// ---- 워크플로 탭 ----
function WorkflowConfigTab({ pluginData }: { pluginData: DocTypePluginStatus }) {
  const workflow = pluginData.effective_config.workflow;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">승인 필요 여부</p>
          <p className={`text-sm font-semibold ${workflow.requires_approval ? "text-red-600" : "text-green-600"}`}>
            {workflow.requires_approval ? "필수" : "불필요"}
          </p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">검토 가능 역할</p>
          <p className="text-sm font-medium text-gray-800">
            {workflow.review_roles.length === 0
              ? "모든 역할"
              : workflow.review_roles.join(", ")}
          </p>
        </div>
      </div>
      {pluginData.is_builtin && (
        <p className="text-xs text-gray-400">
          내장 플러그인 타입의 워크플로 설정은 코드에서 관리됩니다.
        </p>
      )}
    </div>
  );
}

// ---- 메인 페이지 ----
export function AdminDocTypeDetailPage({ typeCode }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [showEdit, setShowEdit] = useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);

  const query = useQuery({
    queryKey: ["admin", "document-type", typeCode],
    queryFn: () => adminApi.getDocumentType(typeCode),
  });

  const pluginQuery = useQuery({
    queryKey: ["admin", "document-type-plugin", typeCode],
    queryFn: () => adminApi.getDocumentTypePlugin(typeCode),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => adminApi.deactivateDocumentType(typeCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "document-type", typeCode] });
      queryClient.invalidateQueries({ queryKey: ["admin", "document-types"] });
      setDeactivateConfirm(false);
    },
  });

  const fieldColumns: Column<SchemaField>[] = [
    {
      key: "name",
      header: "필드명",
      render: (r) => (
        <span className="font-mono text-sm font-medium text-gray-800">{r.name}</span>
      ),
    },
    {
      key: "type",
      header: "타입",
      render: (r) => (
        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-mono">
          {r.type}
        </span>
      ),
    },
    {
      key: "required",
      header: "필수",
      width: "70px",
      render: (r) =>
        r.required ? (
          <span className="text-xs font-medium text-red-600">필수</span>
        ) : (
          <span className="text-xs text-gray-400">선택</span>
        ),
    },
    {
      key: "description",
      header: "설명",
      render: (r) => <span className="text-gray-500">{r.description ?? "-"}</span>,
    },
  ];

  const tabs: { key: TabKey; label: string }[] = [
    { key: "info", label: "기본 정보" },
    { key: "metadata", label: "Metadata Schema" },
    { key: "chunking", label: "청킹 설정" },
    { key: "rag", label: "RAG 설정" },
    { key: "search", label: "검색 설정" },
    { key: "workflow", label: "워크플로" },
  ];

  return (
    <QueryLoader
      query={{ isLoading: query.isLoading, isError: query.isError, data: query.data?.data, refetch: query.refetch }}
      error={
        <div className="p-6">
          <p className="text-red-600">문서 유형 정보를 불러올 수 없습니다.</p>
          <button onClick={() => router.back()} className="mt-2 text-sm text-gray-500 hover:underline">
            ← 뒤로
          </button>
        </div>
      }
    >
    {(dt) => {
    const isActive = dt.status === "ACTIVE";
    const isBuiltin = pluginQuery.data?.data?.is_builtin ?? false;

    return (
    <div className="p-6 space-y-5">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        문서 유형 목록
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold text-gray-900">{dt.display_name}</h1>
              <span className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                {dt.type_code}
              </span>
              {isBuiltin && (
                <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium">
                  내장 플러그인
                </span>
              )}
            </div>
            {dt.description && (
              <p className="text-sm text-gray-500 mt-1">{dt.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge value={dt.status} />
            {isActive && !isBuiltin && (
              <button
                onClick={() => setShowEdit(true)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                수정
              </button>
            )}
            {isActive && !isBuiltin && (
              <button
                onClick={() => setDeactivateConfirm(true)}
                className="px-3 py-1.5 text-sm border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                비활성화
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
          <span>
            문서 <strong className="text-gray-800">{dt.document_count}건</strong>
          </span>
          <span>
            스키마 필드 <strong className="text-gray-800">{dt.schema_fields?.length ?? 0}개</strong>
          </span>
          {dt.created_at && (
            <span>
              생성일 <strong className="text-gray-800">{formatDateOnly(dt.created_at)}</strong>
            </span>
          )}
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {activeTab === "info" && (
          <div className="space-y-5">
            {/* Schema Fields */}
            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">스키마 필드</h2>
              {dt.schema_fields && dt.schema_fields.length > 0 ? (
                <DataTable
                  columns={fieldColumns}
                  rows={dt.schema_fields}
                  rowKey={(r) => r.name}
                  emptyMessage="스키마 필드가 없습니다."
                />
              ) : (
                <p className="text-sm text-gray-400">스키마 필드가 없습니다.</p>
              )}
            </div>
            {/* Plugin Config 원본 */}
            {pluginQuery.data?.data && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">플러그인 현황</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "청킹 전략", value: String(pluginQuery.data.data.effective_config.chunking.strategy ?? "-") },
                    { label: "최대 청크", value: `${pluginQuery.data.data.effective_config.chunking.max_chunk_tokens ?? "-"} 토큰` },
                    { label: "RAG Top-N", value: String(pluginQuery.data.data.effective_config.rag.top_n ?? "-") },
                    { label: "승인 필요", value: pluginQuery.data.data.effective_config.workflow.requires_approval ? "필수" : "불필요" },
                  ].map((item) => (
                    <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400">{item.label}</p>
                      <p className="text-sm font-medium text-gray-800 mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "chunking" && pluginQuery.data?.data && (
          <ChunkingConfigTab typeCode={typeCode} pluginData={pluginQuery.data.data} />
        )}
        {activeTab === "rag" && pluginQuery.data?.data && (
          <RAGConfigTab typeCode={typeCode} pluginData={pluginQuery.data.data} />
        )}
        {activeTab === "search" && pluginQuery.data?.data && (
          <SearchConfigTab typeCode={typeCode} pluginData={pluginQuery.data.data} />
        )}
        {activeTab === "metadata" && pluginQuery.data?.data && (
          <MetadataSchemaTab typeCode={typeCode} pluginData={pluginQuery.data.data} />
        )}
        {activeTab === "workflow" && pluginQuery.data?.data && (
          <WorkflowConfigTab pluginData={pluginQuery.data.data} />
        )}

        {/* 로딩 상태 */}
        {(activeTab !== "info") && pluginQuery.isLoading && (
          <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
            플러그인 설정 로딩 중...
          </div>
        )}
      </div>

      {/* 수정 모달 */}
      {showEdit && (
        <EditDocTypeModal
          typeCode={typeCode}
          initial={{ display_name: dt.display_name, description: dt.description }}
          onClose={() => setShowEdit(false)}
        />
      )}

      {/* 비활성화 확인 */}
      {deactivateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">비활성화 확인</h2>
            <p className="text-sm text-gray-600 mb-5">
              <strong>{dt.display_name}</strong> 유형을 비활성화합니다.
              기존 문서는 유지되지만 새 문서 생성 시 이 유형을 선택할 수 없게 됩니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deactivateMutation.mutate()}
                disabled={deactivateMutation.isPending}
                className="flex-1 bg-red-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deactivateMutation.isPending ? "처리 중..." : "비활성화"}
              </button>
              <button
                onClick={() => setDeactivateConfirm(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    );
    }}
    </QueryLoader>
  );
}
