"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { DataTable, type Column } from "@/components/admin/DataTable";
import type { AdminRole } from "@/types/admin";

export function AdminRolesPage() {
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
        <span className="font-medium text-gray-900">{row.name}</span>
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

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-semibold text-gray-900">역할 관리</h1>
      <p className="text-sm text-gray-500">
        시스템에 등록된 역할 목록입니다. 각 역할별 사용자 현황을 확인할 수 있습니다.
      </p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <DataTable
          columns={columns}
          rows={data?.data ?? []}
          rowKey={(r) => r.name}
          loading={isLoading}
          emptyMessage="등록된 역할이 없습니다."
        />
      </div>
    </div>
  );
}
