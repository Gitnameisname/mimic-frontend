"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { DataTable, type Column } from "@/components/admin/DataTable";
import type { AdminRole } from "@/types/admin";

// ---- 역할 생성 모달 ----

function CreateRoleModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.createRole({
        name: form.name.trim().toUpperCase().replace(/\s+/g, "_"),
        description: form.description.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">역할 추가</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            if (!form.name.trim()) return setError("역할 이름을 입력하세요.");
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              역할 이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="예: LEGAL_REVIEWER"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-300 uppercase"
            />
            <p className="text-xs text-gray-400 mt-0.5">영문 대문자/숫자/밑줄로 자동 변환됩니다</p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">설명</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="역할 설명 (선택)"
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
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">역할 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            시스템 역할은 수정·삭제할 수 없습니다. 커스텀 역할은 추가·삭제 가능합니다.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
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

      {showCreate && <CreateRoleModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
