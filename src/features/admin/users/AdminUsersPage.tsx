"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api/admin";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import { Modal, ModalActions } from "@/components/feedback/Modal";
import { FormField } from "@/components/form/FormField";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import type { AdminUser } from "@/types/admin";

const ROLES = ["VIEWER", "AUTHOR", "REVIEWER", "APPROVER", "ORG_ADMIN", "SUPER_ADMIN"] as const;

// ---- 사용자 생성 모달 ----

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ email: "", display_name: "", role_name: "VIEWER" });
  const [error, setError] = useState("");

  const mutation = useMutationWithToast({
    mutationFn: () => adminApi.createUser(form),
    successMessage: "사용자가 생성되었습니다.",
    errorMessage: "사용자 생성에 실패했습니다.",
    invalidateKeys: [["admin", "users"]],
    onSuccess: () => onClose(),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.email.trim()) return setError("이메일을 입력하세요.");
    if (!form.display_name.trim()) return setError("이름을 입력하세요.");
    mutation.mutate();
  }

  return (
    <Modal title="사용자 추가" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="이메일" required
          type="email"
          value={form.email}
          onChange={(v) => setForm((f) => ({ ...f, email: v }))}
          placeholder="user@example.com"
        />
        <FormField
          label="이름" required
          value={form.display_name}
          onChange={(v) => setForm((f) => ({ ...f, display_name: v }))}
          placeholder="홍길동"
        />
        <FormField
          label="역할"
          type="select"
          value={form.role_name}
          onChange={(v) => setForm((f) => ({ ...f, role_name: v }))}
          options={ROLES.map((r) => ({ label: r, value: r }))}
        />
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <ModalActions onClose={onClose} isPending={mutation.isPending} />
      </form>
    </Modal>
  );
}

// ---- 메인 페이지 ----

export function AdminUsersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page, search, status, role],
    queryFn: () =>
      adminApi.getUsers({
        page,
        page_size: 20,
        search: search || undefined,
        status: status || undefined,
        role: role || undefined,
      }),
  });

  const activateMutation = useMutationWithToast({
    mutationFn: (userId: string) => adminApi.activateUser(userId),
    successMessage: "사용자를 활성화했습니다.",
    errorMessage: "활성화에 실패했습니다.",
    invalidateKeys: [["admin", "users"]],
  });

  const columns: Column<AdminUser>[] = [
    {
      key: "email",
      header: "이메일",
      render: (row) => <span className="font-medium text-gray-900">{row.email}</span>,
    },
    {
      key: "display_name",
      header: "이름",
      render: (row) => row.display_name,
    },
    {
      key: "role_name",
      header: "역할",
      render: (row) => (
        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
          {row.role_name}
        </span>
      ),
    },
    {
      key: "status",
      header: "상태",
      width: "120px",
      render: (row) => (
        <div className="flex items-center gap-2">
          <StatusBadge
            value={row.status}
            label={row.status === "PENDING" ? "승인 대기" : row.status === "ACTIVE" ? "활성" : row.status === "INACTIVE" ? "비활성" : "정지"}
            variant={row.status === "PENDING" ? "warning" : undefined}
          />
          {row.status === "PENDING" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                activateMutation.mutate(row.id);
              }}
              disabled={activateMutation.isPending}
              className="text-xs px-2 py-0.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[24px]"
              aria-label={`${row.display_name} 승인`}
            >
              승인
            </button>
          )}
        </div>
      ),
    },
    {
      key: "last_login_at",
      header: "마지막 로그인",
      render: (row) =>
        row.last_login_at ? new Date(row.last_login_at).toLocaleDateString("ko") : "-",
    },
    {
      key: "created_at",
      header: "가입일",
      render: (row) => new Date(row.created_at).toLocaleDateString("ko"),
    },
  ];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">사용자 관리</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-all duration-200 active:scale-95 min-h-[40px] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          사용자 추가
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="text-xs text-gray-500 block mb-1">이메일/이름 검색</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="이메일 또는 이름..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
          <div>
            <label htmlFor="filter-role" className="text-xs text-gray-500 block mb-1">역할</label>
            <select
              id="filter-role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 min-h-[40px]"
            >
              <option value="">전체</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="filter-status" className="text-xs text-gray-500 block mb-1">상태</label>
            <select
              id="filter-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 min-h-[40px]"
            >
              <option value="">전체</option>
              <option value="ACTIVE">활성</option>
              <option value="PENDING">승인 대기</option>
              <option value="INACTIVE">비활성</option>
              <option value="SUSPENDED">정지</option>
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
          >
            검색
          </button>
          {(search || status || role) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSearchInput("");
                setStatus("");
                setRole("");
                setPage(1);
              }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              초기화
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 text-sm text-gray-500">
          총 {data?.total ?? 0}명
        </div>
        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(r) => r.id}
          loading={isLoading}
          onRowClick={(row) => router.push(`/admin/users/${row.id}`)}
          emptyMessage="등록된 사용자가 없습니다."
        />
        <Pagination
          page={page}
          pageSize={20}
          total={data?.total ?? 0}
          onPageChange={setPage}
        />
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
