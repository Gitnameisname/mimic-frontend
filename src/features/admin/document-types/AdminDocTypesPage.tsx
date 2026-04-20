"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api/admin";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Modal, ModalActions } from "@/components/feedback/Modal";
import { FormField } from "@/components/form/FormField";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import type { AdminDocumentType } from "@/types/admin";

// ---- 생성 모달 ----

function CreateDocTypeModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    type_code: "",
    display_name: "",
    description: "",
  });
  const [error, setError] = useState("");

  const mutation = useMutationWithToast({
    mutationFn: () =>
      adminApi.createDocumentType({
        type_code: form.type_code.trim().toUpperCase(),
        display_name: form.display_name.trim(),
        description: form.description.trim() || undefined,
      }),
    successMessage: "문서 유형이 생성되었습니다.",
    errorMessage: "문서 유형 생성에 실패했습니다.",
    invalidateKeys: [["admin", "document-types"]],
    onSuccess: () => onClose(),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.type_code.trim()) return setError("타입 코드를 입력하세요.");
    if (!form.display_name.trim()) return setError("표시 이름을 입력하세요.");
    mutation.mutate();
  }

  return (
    <Modal title="새 문서 유형 추가" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="타입 코드" required
          value={form.type_code}
          onChange={(v) => setForm((f) => ({ ...f, type_code: v }))}
          placeholder="예: NOTICE, CONTRACT"
          inputClassName="font-mono uppercase"
          hint="영문 대문자/숫자/밑줄만 사용"
        />
        <FormField
          label="표시 이름" required
          value={form.display_name}
          onChange={(v) => setForm((f) => ({ ...f, display_name: v }))}
          placeholder="예: 공지사항"
        />
        <FormField
          label="설명"
          type="textarea"
          value={form.description}
          onChange={(v) => setForm((f) => ({ ...f, description: v }))}
          placeholder="문서 유형에 대한 설명 (선택)"
          rows={2}
        />
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <ModalActions onClose={onClose} isPending={mutation.isPending} />
      </form>
    </Modal>
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
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-sm font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
            {row.type_code}
          </span>
          {row.is_builtin && (
            <span className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
              내장
            </span>
          )}
        </div>
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
      key: "plugin_registered",
      header: "플러그인",
      width: "90px",
      render: (row) => (
        <span className={`text-xs font-medium ${row.plugin_registered ? "text-emerald-600" : "text-gray-400"}`}>
          {row.plugin_registered ? "등록됨" : "미등록"}
        </span>
      ),
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
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
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
                ? "bg-blue-600 text-white"
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
