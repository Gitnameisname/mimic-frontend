"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DataTable, type Column } from "@/components/admin/DataTable";
import type { SchemaField } from "@/types/admin";

interface Props {
  typeCode: string;
}

export function AdminDocTypeDetailPage({ typeCode }: Props) {
  const router = useRouter();
  const [jsonView, setJsonView] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "document-type", typeCode],
    queryFn: () => adminApi.getDocumentType(typeCode),
  });

  const dt = data?.data;

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
      render: (r) => (
        <span className="text-gray-500">{r.description ?? "-"}</span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !dt) {
    return (
      <div className="p-6">
        <p className="text-red-600">문서 유형 정보를 불러올 수 없습니다.</p>
        <button
          onClick={() => router.back()}
          className="mt-2 text-sm text-gray-500 hover:underline"
        >
          ← 뒤로
        </button>
      </div>
    );
  }

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
          <StatusBadge value={dt.status} />
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
                  {dt.plugin_config[key] ? String(dt.plugin_config[key]) : (
                    <span className="text-gray-300">미설정</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
