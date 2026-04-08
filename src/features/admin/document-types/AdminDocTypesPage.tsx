"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api/admin";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { AdminDocumentType } from "@/types/admin";

export function AdminDocTypesPage() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "document-types"],
    queryFn: () => adminApi.getDocumentTypes(),
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
      render: (row) => (
        <span className="font-medium text-gray-900">{row.display_name}</span>
      ),
    },
    {
      key: "description",
      header: "설명",
      render: (row) => (
        <span className="text-gray-500 truncate max-w-xs block">
          {row.description ?? "-"}
        </span>
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
      <h1 className="text-xl font-semibold text-gray-900">문서 유형 관리</h1>

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
    </div>
  );
}
