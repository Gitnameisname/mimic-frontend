"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api/admin";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import type { AdminUser } from "@/types/admin";

const ROLES = ["VIEWER", "AUTHOR", "REVIEWER", "APPROVER", "ORG_ADMIN", "SUPER_ADMIN"] as const;

// ---- 사용자 생성 모달 ----

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: "", display_name: "", role_name: "VIEWER" });
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => adminApi.createUser(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.email.trim()) return setError("이메일을 입력하세요.");
    if (!form.display_name.trim()) return setError("이름을 입력하세요.");
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">사용자 추가</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              이메일 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="user@example.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              placeholder="홍길동"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">역할</label>
            <select
              value={form.role_name}
              onChange={(e) => setForm((f) => ({ ...f, role_name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
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

export function AdminUsersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page, search, status],
    queryFn: () =>
      adminApi.getUsers({
        page,
        page_size: 20,
        search: search || undefined,
        status: status || undefined,
      }),
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
      width: "100px",
      render: (row) => <StatusBadge value={row.status} />,
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
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">사용자 관리</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
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
            <label className="text-xs text-gray-500 block mb-1">상태</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              <option value="">전체</option>
              <option value="ACTIVE">활성</option>
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
          {(search || status) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSearchInput("");
                setStatus("");
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
