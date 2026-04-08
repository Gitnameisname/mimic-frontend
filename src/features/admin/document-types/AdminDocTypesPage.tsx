"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api/admin";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { AdminDocumentType } from "@/types/admin";

// ---- 생성 모달 ----

function CreateDocTypeModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    type_code: "",
    display_name: "",
    description: "",
  });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.createDocumentType({
        type_code: form.type_code.trim().toUpperCase(),
        display_name: form.display_name.trim(),
        description: form.description.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "document-types"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.type_code.trim()) return setError("타입 코드를 입력하세요.");
    if (!form.display_name.trim()) return setError("표시 이름을 입력하세요.");
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">새 문서 유형 추가</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              타입 코드 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.type_code}
              onChange={(e) => setForm((f) => ({ ...f, type_code: e.target.value }))}
              placeholder="예: NOTICE, CONTRACT"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-300 uppercase"
            />
            <p className="text-xs text-gray-400 mt-0.5">영문 대문자/숫자/밑줄만 사용</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              표시 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              placeholder="예: 공지사항"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">설명</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="문서 유형에 대한 설명 (선택)"
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
              {mutation.isPending ? "생성 중..." : "생성"}
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

export function AdminDocTypesPage() {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "document-types", statusFilter],
    queryFn: () => adminApi.getDocumentTypes({ status: statusFilter || undefined }),
  });

  const columns: Column<AdminDocumentType>[] = [
    {
      key: "type_code",
      header: "타입 코드",
      render: (row) => (
        <span className="font-mono text-sm font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
          {row.type_code}
        </span>
      ),
    },
    {
      key: "display_name",
      header: "표시 이름",
      render: (row) => <span className="font-medium text-gray-900">{row.display_name}</span>,
    },
    {
      key: "description",
      header: "설명",
      render: (row) => (
        <span className="text-gray-500 truncate max-w-xs block">{row.description ?? "-"}</span>
      ),
    },
    {
      key: "schema_field_count",
      header: "스키마 필드",
      width: "100px",
      render: (row) => `${row.schema_field_count}개`,
    },
    {
      key: "document_count",
      header: "문서 수",
      width: "90px",
      render: (row) => `${row.document_count}건`,
    },
    {
      key: "status",
      header: "상태",
      width: "90px",
      render: (row) => <StatusBadge value={row.status} />,
    },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">문서 유형 관리</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          유형 추가
        </button>
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        {["", "ACTIVE", "INACTIVE"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              statusFilter === s
                ? "bg-red-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s === "" ? "전체" : s === "ACTIVE" ? "활성" : "비활성"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 text-sm text-gray-500">
          총 {data?.data?.length ?? 0}개 유형
        </div>
        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(r) => r.type_code}
          loading={isLoading}
          onRowClick={(row) => router.push(`/admin/document-types/${row.type_code}`)}
          emptyMessage="등록된 문서 유형이 없습니다."
        />
      </div>

      {showCreate && <CreateDocTypeModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
