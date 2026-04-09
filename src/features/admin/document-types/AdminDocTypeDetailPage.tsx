"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { QueryLoader } from "@/components/feedback/QueryLoader";
import type { SchemaField } from "@/types/admin";

interface Props {
  typeCode: string;
}

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
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">설명</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 bg-red-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-red-700 disabled:opacity-50 transition-colors"
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

// ---- 메인 페이지 ----

export function AdminDocTypeDetailPage({ typeCode }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [jsonView, setJsonView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);

  const query = useQuery({
    queryKey: ["admin", "document-type", typeCode],
    queryFn: () => adminApi.getDocumentType(typeCode),
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
    return (
    <div className="p-6 space-y-6">
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
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold text-gray-900">{dt.display_name}</h1>
              <span className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                {dt.type_code}
              </span>
            </div>
            {dt.description && (
              <p className="text-sm text-gray-500 mt-1">{dt.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge value={dt.status} />
            {isActive && (
              <button
                onClick={() => setShowEdit(true)}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                수정
              </button>
            )}
            {isActive && (
              <button
                onClick={() => setDeactivateConfirm(true)}
                className="px-3 py-1.5 text-sm border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                비활성화
              </button>
            )}
          </div>
        </div>
        <div className="mt-4 flex gap-6 text-sm text-gray-500">
          <span>
            문서 <strong className="text-gray-800">{dt.document_count}건</strong>
          </span>
          <span>
            스키마 필드 <strong className="text-gray-800">{dt.schema_fields.length}개</strong>
          </span>
          <span>
            생성일 <strong className="text-gray-800">{new Date(dt.created_at).toLocaleDateString("ko")}</strong>
          </span>
        </div>
      </div>

      {/* Schema Fields */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">스키마 필드</h2>
          <button
            onClick={() => setJsonView(!jsonView)}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            {jsonView ? "테이블 보기" : "JSON 보기"}
          </button>
        </div>
        {jsonView ? (
          <pre className="p-4 text-xs text-gray-600 bg-gray-50 overflow-x-auto">
            {JSON.stringify(dt.schema_fields, null, 2)}
          </pre>
        ) : (
          <DataTable
            columns={fieldColumns}
            rows={dt.schema_fields}
            rowKey={(r) => r.name}
            emptyMessage="스키마 필드가 없습니다."
          />
        )}
      </div>

      {/* Plugin Config */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">플러그인 설정</h2>
        {Object.keys(dt.plugin_config).length === 0 ? (
          <p className="text-sm text-gray-400">설정된 플러그인이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(["editor", "renderer", "workflow", "chunking"] as const).map((key) => (
              <div key={key}>
                <p className="text-xs text-gray-400 mb-0.5 capitalize">{key}</p>
                <p className="text-sm font-medium text-gray-700">
                  {dt.plugin_config[key] ? (
                    String(dt.plugin_config[key])
                  ) : (
                    <span className="text-gray-300">미설정</span>
                  )}
                </p>
              </div>
            ))}
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
