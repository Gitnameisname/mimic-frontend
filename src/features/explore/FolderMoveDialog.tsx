/**
 * FolderMoveDialog — 폴더 이동 선택 모달.
 *
 * S3 Phase 2 FG 2-1 UX 다듬기.
 *
 *  - 새 부모 폴더 선택 (select). 자기 자신 + 모든 하위는 선택 불가
 *  - "(루트로 이동)" 선택지 제공
 *  - 서버는 순환 참조 / 깊이 상한 재검증 → 실패 시 toast (훅에서 처리)
 */

"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/button/Button";
import type { Folder } from "@/lib/api/folders";

interface Props {
  open: boolean;
  current: Folder | null;
  allFolders: Folder[];
  loading?: boolean;
  onConfirm: (newParentId: string | null) => void;
  onCancel: () => void;
}

/** path 경로를 ` › ` 로 표시 */
function formatPath(f: Folder): string {
  return f.path.split("/").filter(Boolean).join(" › ");
}

/**
 * 이동 대상 후보 필터 — 자기 자신 + 모든 하위 폴더 제외.
 * 테스트 편의상 export.
 */
export function computeMoveCandidates(current: Folder, all: Folder[]): Folder[] {
  return all.filter((f) => {
    if (f.id === current.id) return false;
    if (f.path.startsWith(current.path)) return false;
    return true;
  });
}

// 테스트용 export
export const __test__ = { computeMoveCandidates, formatPath };

export function FolderMoveDialog({
  open, current, allFolders, loading = false, onConfirm, onCancel,
}: Props) {
  const [selected, setSelected] = useState<string>("");

  // 자기 자신 + 하위는 target 후보에서 제외
  const candidates = useMemo(() => {
    if (!current) return [] as Folder[];
    return allFolders.filter((f) => {
      if (f.id === current.id) return false;
      // 하위 (path prefix 매칭) 제외
      if (f.path.startsWith(current.path)) return false;
      return true;
    });
  }, [allFolders, current]);

  if (!open || !current) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/30"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="folder-move-title"
        className="relative mx-4 w-full max-w-md rounded-xl bg-[var(--color-surface)] p-6 shadow-xl"
      >
        <h3 id="folder-move-title" className="text-base font-semibold text-[var(--color-text)]">
          &quot;{current.name}&quot; 이동
        </h3>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          현재 경로: <code>{current.path}</code>
        </p>
        <label className="mt-4 block text-sm text-[var(--color-text)]">
          <span className="block pb-1 text-xs text-[var(--color-text-muted)]">새 부모 폴더</span>
          <select
            className="w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
            value={selected}
            disabled={loading}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="새 부모 폴더"
          >
            <option value="">(루트로 이동)</option>
            {candidates.map((f) => (
              <option key={f.id} value={f.id}>
                {formatPath(f)}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-[11px] text-[var(--color-text-muted)]">
          자기 자신과 하위 폴더는 대상에서 제외되며, 이동 후 하위 폴더의 경로가 함께 갱신됩니다.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
            취소
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onConfirm(selected || null)}
            loading={loading}
          >
            이동
          </Button>
        </div>
      </div>
    </div>
  );
}
