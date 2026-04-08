"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api/admin";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Pagination } from "@/components/admin/Pagination";
import type { AdminUser } from "@/types/admin";

export function AdminUsersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page, search, status],
    queryFn: () => adminApi.getUsers({ page, page_size: 20, search: search || undefined, status: status || undefined }),
  });

  const columns: Column<AdminUser>[] = [
    {
      key: "email",
      header: "이메일",
      render: (row) => (
        <span className="font-medium text-gray-900">{row.email}</span>
      ),
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
        row.last_login_at
          ? new Date(row.last_login_at).toLocaleDateString("ko")
          : "-",
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
      <h1 className="text-xl font-semibold text-gray-900">사용자 관리</h1>

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
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
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
              onClick={() => { setSearch(""); setSearchInput(""); setStatus(""); setPage(1); }}
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
    </div>
  );
}
