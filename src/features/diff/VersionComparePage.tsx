"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { versionsApi } from "@/lib/api";
import { DiffViewer } from "./DiffViewer";
import { DiffSummaryBanner } from "./DiffSummaryBanner";
import { SkeletonBlock } from "@/components/feedback/SkeletonBlock";
import { ErrorState } from "@/components/feedback/ErrorState";
import type { Version } from "@/types";

interface Props {
  documentId: string;
  /** 기준 버전 ID (before / v1). 미지정 시 직전 버전 자동 비교 모드 */
  versionAId?: string;
  /** 비교 버전 ID (after / v2) */
  versionBId: string;
}

export function VersionComparePage({
  documentId,
  versionAId,
  versionBId,
}: Props) {
  const [selectedBaseId, setSelectedBaseId] = useState<string | undefined>(
    versionAId
  );

  const { data: versions, isLoading: versionsLoading, isError: versionsError, refetch } =
    useQuery<Version[]>({
      queryKey: ["versions", documentId],
      queryFn: () => versionsApi.list(documentId),
    });

  const versionB = versions?.find((v) => v.id === versionBId);

  // selectedBaseId가 없으면 직전 버전 자동 모드 → DiffViewer가 diff/summary API 활용
  const effectiveBaseId = selectedBaseId;

  if (versionsLoading) return <SkeletonBlock rows={6} />;
  if (versionsError)
    return (
      <ErrorState
        description="버전 목록을 불러오지 못했습니다."
        retry={refetch}
      />
    );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href={`/documents/${documentId}/versions`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← 버전 기록
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">버전 비교</h1>
        </div>

        {/* 기준 버전 선택 */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm text-gray-500">기준 버전:</span>
          <select
            className="text-sm border border-gray-300 rounded px-2 py-1.5 bg-white"
            value={selectedBaseId ?? ""}
            onChange={(e) =>
              setSelectedBaseId(e.target.value || undefined)
            }
          >
            <option value="">직전 버전 (자동)</option>
            {versions
              ?.filter((v) => v.id !== versionBId)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  v{v.version_number} — {v.workflow_status}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* 버전 메타 */}
      {versionB && (
        <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-200">
          <span className="font-medium">비교 대상:</span>{" "}
          v{versionB.version_number}
          {versionB.title_snapshot && (
            <span className="text-gray-500 ml-1">
              — {versionB.title_snapshot}
            </span>
          )}
        </div>
      )}

      {/* 변경 요약 배너 */}
      {effectiveBaseId ? (
        <DiffSummaryBanner
          documentId={documentId}
          versionId={versionBId}
          baseVersionId={effectiveBaseId}
        />
      ) : (
        <DiffSummaryBanner
          documentId={documentId}
          versionId={versionBId}
        />
      )}

      {/* Diff Viewer */}
      {effectiveBaseId ? (
        <DiffViewer
          documentId={documentId}
          versionAId={effectiveBaseId}
          versionBId={versionBId}
        />
      ) : (
        <AutoDiffViewer documentId={documentId} versionBId={versionBId} versions={versions ?? []} />
      )}
    </div>
  );
}

/** 직전 버전을 자동 탐색하여 DiffViewer 렌더링 */
function AutoDiffViewer({
  documentId,
  versionBId,
  versions,
}: {
  documentId: string;
  versionBId: string;
  versions: Version[];
}) {
  const versionB = versions.find((v) => v.id === versionBId);
  if (!versionB) return null;

  // 버전 번호 기준 직전 버전 탐색
  const versionBNumber = parseInt(String(versionB.version_number), 10);
  const prevVersion = versions.find(
    (v) => parseInt(String(v.version_number), 10) === versionBNumber - 1
  );

  if (!prevVersion) {
    return (
      <div className="text-center py-10 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg">
        이 버전은 최초 버전입니다. 비교할 이전 버전이 없습니다.
      </div>
    );
  }

  return (
    <DiffViewer
      documentId={documentId}
      versionAId={prevVersion.id}
      versionBId={versionBId}
    />
  );
}
