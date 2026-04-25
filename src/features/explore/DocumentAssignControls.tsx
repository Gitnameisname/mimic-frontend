/**
 * DocumentAssignControls — 문서 상세 페이지의 폴더/컬렉션 배치 위젯.
 *
 * S3 Phase 2 FG 2-1 + UX 2차 (2026-04-24).
 *
 * 표시 / 조작
 * ----------
 *  - 폴더 드롭다운: 초기값은 document.folder_id. 변경 시 PUT /documents/{id}/folder
 *  - 컬렉션 칩 행: 현재 포함된 컬렉션을 chip 으로 표시 + X 로 제거
 *  - 컬렉션 추가 드롭다운: 이미 포함된 컬렉션은 disabled. 선택 시 POST 로 추가
 *
 * 절대 규칙
 * --------
 *  - 뷰 레이어, ACL 무영향. 백엔드가 Scope 밖 문서/타 owner 컬렉션은 이미 거부.
 */

"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import type { Folder } from "@/lib/api/folders";
import type { Collection } from "@/lib/api/collections";
import {
  useAddDocumentsToCollection,
  useCollections,
  useRemoveDocumentFromCollection,
} from "./hooks/useCollections";
import { useFolders, useSetDocumentFolder } from "./hooks/useFolders";

interface Props {
  documentId: string;
  /** 문서 상세 쿼리가 전달하는 현재 배치 상태. undefined 이면 조회 전 */
  currentFolderId?: string | null;
  currentCollectionIds?: string[];
}

/** path 를 ` › ` 구분자로 표시 */
function formatFolderLabel(f: Folder): string {
  return f.path.split("/").filter(Boolean).join(" › ");
}

export function DocumentAssignControls({
  documentId,
  currentFolderId,
  currentCollectionIds,
}: Props) {
  const { data: folders, isLoading: foldersLoading } = useFolders();
  const { data: collections, isLoading: collectionsLoading } = useCollections();
  const setFolderMut = useSetDocumentFolder();
  const addDocsMut = useAddDocumentsToCollection();
  const removeDocMut = useRemoveDocumentFromCollection();

  // 컬렉션 추가 드롭다운의 임시 선택 — 선택 즉시 추가하고 리셋
  const [collectionSelection, setCollectionSelection] = useState<string>("");

  const currentCollections = useMemo<Collection[]>(() => {
    if (!collections || !currentCollectionIds?.length) return [];
    const set = new Set(currentCollectionIds);
    return collections.filter((c) => set.has(c.id));
  }, [collections, currentCollectionIds]);

  const availableCollections = useMemo<Collection[]>(() => {
    if (!collections) return [];
    const set = new Set(currentCollectionIds ?? []);
    return collections.filter((c) => !set.has(c.id));
  }, [collections, currentCollectionIds]);

  const folderValue = currentFolderId ?? "";

  const onFolderChange = async (value: string) => {
    const folderId = value === "" ? null : value;
    try {
      await setFolderMut.mutateAsync({ documentId, folderId });
    } catch {
      // toast 는 훅에서 처리
    }
  };

  const onCollectionAdd = async (value: string) => {
    setCollectionSelection(value);
    if (!value) return;
    try {
      await addDocsMut.mutateAsync({ collectionId: value, documentIds: [documentId] });
    } catch {
      // toast 처리
    }
    setCollectionSelection("");
  };

  const onCollectionRemove = async (collectionId: string) => {
    try {
      await removeDocMut.mutateAsync({ collectionId, documentId });
    } catch {
      // toast 처리
    }
  };

  const selectCls =
    "h-8 rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 text-sm text-[var(--color-text)] " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] " +
    "disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div
      className="flex flex-col gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 py-2"
      aria-label="탐색 분류"
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <span>폴더</span>
          <select
            aria-label="문서 폴더 지정"
            className={selectCls}
            value={folderValue}
            disabled={foldersLoading || setFolderMut.isPending}
            onChange={(e) => onFolderChange(e.target.value)}
          >
            <option value="">— 폴더 해제 —</option>
            {folders?.map((f) => (
              <option key={f.id} value={f.id}>
                {formatFolderLabel(f)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
          <span>컬렉션에 추가</span>
          <select
            aria-label="컬렉션에 추가"
            className={selectCls}
            value={collectionSelection}
            disabled={collectionsLoading || addDocsMut.isPending}
            onChange={(e) => onCollectionAdd(e.target.value)}
          >
            <option value="">선택...</option>
            {availableCollections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {currentCollections.length > 0 && (
        <ul
          className="flex flex-wrap items-center gap-1.5"
          aria-label="포함된 컬렉션"
        >
          {currentCollections.map((c) => (
            <li key={c.id}>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-[var(--color-brand-200)] bg-[var(--color-brand-50)]",
                  "px-2 py-0.5 text-xs text-[var(--color-brand-700)]",
                )}
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M4 7h16M4 12h16M4 17h10"
                  />
                </svg>
                <span className="truncate max-w-[12rem]" title={c.name}>
                  {c.name}
                </span>
                <button
                  type="button"
                  onClick={() => onCollectionRemove(c.id)}
                  disabled={removeDocMut.isPending}
                  aria-label={`"${c.name}" 에서 제거`}
                  title="컬렉션에서 제거"
                  className={cn(
                    "ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full",
                    "hover:bg-[var(--color-brand-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                  )}
                >
                  <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
