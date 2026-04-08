"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { versionsApi, nodesApi } from "@/lib/api";
import { WorkflowStatusBadge } from "@/components/badge/WorkflowStatusBadge";
import { SkeletonBlock } from "@/components/feedback/SkeletonBlock";
import { ErrorState } from "@/components/feedback/ErrorState";
import { DocumentTree } from "@/features/documents/DocumentTree";
import { NodeRenderer } from "@/features/documents/NodeRenderer";
import { formatDate } from "@/lib/utils";

interface Props {
  documentId: string;
  versionId: string;
}

export function VersionDetailPage({ documentId, versionId }: Props) {
  const versionQuery = useQuery({
    queryKey: ["version", documentId, versionId],
    queryFn: () => versionsApi.get(documentId, versionId),
  });

  const nodesQuery = useQuery({
    queryKey: ["nodes-version", documentId, versionId],
    queryFn: () => nodesApi.listByVersion(documentId, versionId),
    enabled: !!versionQuery.data,
  });

  const version = versionQuery.data;
  const nodes = nodesQuery.data ?? [];

  if (versionQuery.isLoading) {
    return <div className="p-6"><SkeletonBlock rows={8} /></div>;
  }

  if (versionQuery.isError) {
    return <ErrorState retry={versionQuery.refetch} className="mt-16" />;
  }

  if (!version) return null;

  return (
    <div className="flex h-full">
      <aside className="w-52 shrink-0 border-r border-gray-200 bg-white overflow-y-auto py-4">
        <p className="px-3 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">문서 구조</p>
        <DocumentTree nodes={nodes} />
      </aside>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6">
          {/* 읽기 전용 배너 */}
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
            <span className="text-sm text-amber-800">
              v{version.version_number} 버전을 보고 있습니다. 현재 버전이 아닐 수 있습니다.
            </span>
            <Link
              href={`/documents/${documentId}`}
              className="text-sm text-blue-600 hover:text-blue-700 whitespace-nowrap ml-4"
            >
              현재 버전 보기
            </Link>
          </div>

          <div className="mb-6">
            <Link
              href={`/documents/${documentId}/versions`}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-3"
            >
              ← 버전 목록
            </Link>
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-gray-900">v{version.version_number}</span>
              <WorkflowStatusBadge status={version.workflow_status} />
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {version.created_by_name} · {formatDate(version.created_at)}
              {version.change_reason && ` · "${version.change_reason}"`}
            </div>
          </div>

          <div className="prose prose-sm max-w-none">
            {nodesQuery.isLoading ? (
              <SkeletonBlock rows={10} />
            ) : nodes.length === 0 ? (
              <p className="text-gray-400 italic">내용이 없습니다.</p>
            ) : (
              <NodeRenderer nodes={nodes} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
