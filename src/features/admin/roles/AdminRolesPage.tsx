"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { Modal, ModalActions } from "@/components/feedback/Modal";
import { FormField } from "@/components/form/FormField";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import type { AdminRole } from "@/types/admin";
import { PermissionMatrix } from "./PermissionMatrix";

// ---- 역할 생성 모달 ----

function CreateRoleModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");

  const mutation = useMutationWithToast({
    mutationFn: () =>
      adminApi.createRole({
        name: form.name.trim().toUpperCase().replace(/\s+/g, "_"),
        description: form.description.trim() || undefined,
      }),
    successMessage: "역할이 생성되었습니다.",
    errorMessage: "역할 생성에 실패했습니다.",
    invalidateKeys: [["admin", "roles"]],
    onSuccess: () => onClose(),
  });

  return (
    <Modal title="역할 추가" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          if (!form.name.trim()) return setError("역할 이름을 입력하세요.");
          mutation.mutate();
        }}
        className="space-y-4"
      >
        <FormField
          label="역할 이름" required
          value={form.name}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          placeholder="예: LEGAL_REVIEWER"
          inputClassName="font-mono uppercase"
          hint="영문 대문자/숫자/밑줄로 자동 변환됩니다"
        />
        <FormField
          label="설명"
          type="textarea"
          value={form.description}
          onChange={(v) => setForm((f) => ({ ...f, description: v }))}
          placeholder="역할 설명 (선택)"
          rows={2}
        />
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <ModalActions onClose={onClose} isPending={mutation.isPending} />
      </form>
    </Modal>
  );
}

// ---- 메인 페이지 ----

export function AdminRolesPage() {
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "roles"],
    queryFn: () => adminApi.getRoles(),
  });

  const ROLE_DESCRIPTIONS: Record<string, string> = {
    SUPER_ADMIN: "전체 시스템 관리 권한",
    ORG_ADMIN: "조직 내 관리 권한",
    AUTHOR: "문서 작성 권한",
    REVIEWER: "검토 권한",
    APPROVER: "승인 권한",
    VIEWER: "읽기 전용",
  };

  const columns: Column<AdminRole>[] = [
    {
      key: "name",
      header: "역할 이름",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 font-mono">{row.name}</span>
          {row.is_system && (
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">시스템</span>
          )}
        </div>
      ),
    },
    {
      key: "description",
      header: "설명",
      render: (row) => (
        <span className="text-gray-500">
          {row.description ?? ROLE_DESCRIPTIONS[row.name] ?? "-"}
        </span>
      ),
    },
    {
      key: "user_count",
      header: "사용자 수",
      width: "120px",
      render: (row) => (
        <span className="font-medium text-gray-700">{row.user_count}명</span>
      ),
    },
  ];

  const systemRoles = (data?.data ?? []).filter((r) => r.is_system);
  const customRoles = (data?.data ?? []).filter((r) => !r.is_system);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">역할 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            시스템 역할은 수정·삭제할 수 없습니다. 커스텀 역할은 추가·삭제 가능합니다.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          역할 추가
        </button>
      </div>

      {/* 시스템 역할 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          시스템 역할
        </div>
        <DataTable
          columns={columns}
          rows={systemRoles}
          rowKey={(r) => r.name}
          loading={isLoading}
          emptyMessage="시스템 역할이 없습니다."
        />
      </div>

      {/* 커스텀 역할 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          커스텀 역할
        </div>
        <DataTable
          columns={columns}
          rows={customRoles}
          rowKey={(r) => r.name}
          loading={isLoading}
          emptyMessage="커스텀 역할이 없습니다. '역할 추가'로 새 역할을 생성하세요."
        />
      </div>

      {/* 권한 매트릭스 */}
      <PermissionMatrix />

      {showCreate && <CreateRoleModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
