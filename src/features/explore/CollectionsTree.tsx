/**
 * CollectionsTree — 사이드바 "탐색" 섹션의 컬렉션 목록.
 *
 * S3 Phase 2 FG 2-1.
 *  - 목록 + `document_count` 표시
 *  - 클릭 시 `/documents?collection=<id>` 로 이동
 *  - 인라인 생성 (+ 버튼 → 이름 입력)
 *  - 컴팩트 모드 (사이드바 rail) 에서는 아이콘만
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import type { Collection } from "@/lib/api/collections";
import {
  useCollections,
  useCreateCollection,
  useDeleteCollection,
  useUpdateCollection,
} from "./hooks/useCollections";
import { EditCollectionModal } from "./EditCollectionModal";
import { RowMenu } from "./RowMenu";

interface Props {
  /** rail 모드 — 아이콘만 / 툴팁 */
  compact?: boolean;
}

export function CollectionsTree({ compact = false }: Props) {
  const { data: collections, isLoading, isError } = useCollections();
  const createMut = useCreateCollection();
  const updateMut = useUpdateCollection();
  const deleteMut = useDeleteCollection();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("collection");

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // UX 다듬기: 인라인 rename + 삭제 확인 모달 상태
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [editTarget, setEditTarget] = useState<Collection | null>(null);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  useEffect(() => {
    if (renamingId) renameInputRef.current?.select();
  }, [renamingId]);

  const handleSubmit = useCallback(async () => {
    const name = newName.trim();
    if (!name) {
      setAdding(false);
      return;
    }
    try {
      await createMut.mutateAsync({ name });
      setNewName("");
      setAdding(false);
    } catch {
      // useCreateCollection 이 toast 처리. 입력 유지해서 재시도 가능
    }
  }, [newName, createMut]);

  const handleCancel = useCallback(() => {
    setAdding(false);
    setNewName("");
  }, []);

  const submitRename = useCallback(async () => {
    if (!renamingId) return;
    const next = renameDraft.trim();
    if (!next) {
      setRenamingId(null);
      return;
    }
    // 동일 이름이면 no-op
    const current = collections?.find((c) => c.id === renamingId);
    if (current && current.name === next) {
      setRenamingId(null);
      return;
    }
    try {
      await updateMut.mutateAsync({ id: renamingId, body: { name: next } });
      setRenamingId(null);
    } catch {
      // toast 처리됨, 입력 유지
    }
  }, [renamingId, renameDraft, collections, updateMut]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMut]);

  if (compact) {
    // rail 모드에서는 아이콘만. 전개 시 풀 트리 표시 (Sidebar 가 compact=false 로 다시 렌더)
    return (
      <div className="px-2 py-1">
        <Link
          href="/documents"
          title="컬렉션"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md",
            "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            "hover:bg-[var(--color-surface-subtle)]",
          )}
          aria-label="컬렉션"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.6}
              d="M4 7h16M4 12h16M4 17h10"
            />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <section aria-labelledby="collections-heading" className="px-3 py-2">
      <header className="flex items-center justify-between px-1 pb-1">
        <h3
          id="collections-heading"
          className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]"
        >
          컬렉션
        </h3>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
          aria-label="컬렉션 추가"
          title="컬렉션 추가"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </header>

      {adding && (
        <form
          className="px-1 pb-1"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                handleCancel();
              }
            }}
            onBlur={handleSubmit}
            placeholder="컬렉션 이름"
            maxLength={200}
            aria-label="새 컬렉션 이름"
            className="w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
            disabled={createMut.isPending}
          />
        </form>
      )}

      {isLoading && (
        <ul className="space-y-1 px-1" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="h-6 animate-pulse rounded bg-[var(--color-surface-subtle)]"
            />
          ))}
        </ul>
      )}

      {isError && (
        <p className="px-1 py-2 text-xs text-[var(--color-danger-600)]" role="alert">
          컬렉션을 불러오지 못했습니다.
        </p>
      )}

      {!isLoading && !isError && collections && collections.length === 0 && !adding && (
        <p className="px-1 py-2 text-xs text-[var(--color-text-muted)]">
          컬렉션이 없습니다. + 를 눌러 추가하세요.
        </p>
      )}

      {!isLoading && !isError && collections && collections.length > 0 && (
        <ul className="space-y-0.5" role="list">
          {collections.map((c) => {
            const active = c.id === activeId;
            const isRenaming = renamingId === c.id;
            return (
              <li
                key={c.id}
                className={cn(
                  "group flex items-center gap-1 rounded-md pr-1 transition-colors",
                  active
                    ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                    : "text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]",
                )}
              >
                {isRenaming ? (
                  <form
                    className="flex-1 px-1 py-0.5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      submitRename();
                    }}
                  >
                    <input
                      ref={renameInputRef}
                      type="text"
                      defaultValue={c.name}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={submitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setRenamingId(null);
                        }
                      }}
                      maxLength={200}
                      aria-label="컬렉션 이름 변경"
                      className="w-full rounded border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-0.5 text-sm text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
                      disabled={updateMut.isPending}
                    />
                  </form>
                ) : (
                  <Link
                    href={`/documents?collection=${encodeURIComponent(c.id)}`}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-w-0 flex-1 items-center justify-between rounded-md px-2 py-1 text-sm",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]",
                      active ? "font-medium" : "",
                    )}
                  >
                    <span className="truncate" title={c.name}>
                      {c.name}
                    </span>
                    {c.document_count != null && (
                      <span
                        className={cn(
                          "ml-2 shrink-0 rounded-full px-1.5 text-[10px] tabular-nums",
                          c.document_count > 0
                            ? active
                              ? "bg-[var(--color-brand-600)] text-white"
                              : "bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)]"
                            : "bg-transparent text-[var(--color-text-muted)]",
                        )}
                        aria-label={`${c.document_count}개 문서`}
                      >
                        {c.document_count}
                      </span>
                    )}
                  </Link>
                )}

                {!isRenaming && (
                  <RowMenu
                    ariaLabel={`"${c.name}" 메뉴`}
                    items={[
                      {
                        key: "rename",
                        label: "이름 변경",
                        onSelect: () => {
                          setRenameDraft(c.name);
                          setRenamingId(c.id);
                        },
                      },
                      {
                        key: "edit",
                        label: "편집...",
                        onSelect: () => setEditTarget(c),
                      },
                      {
                        key: "delete",
                        label: "삭제",
                        danger: true,
                        onSelect: () => setDeleteTarget({ id: c.id, name: c.name }),
                      },
                    ]}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleteTarget != null}
        title={`컬렉션 "${deleteTarget?.name ?? ""}" 을(를) 삭제할까요?`}
        message="컬렉션만 삭제되며, 컬렉션에 담긴 문서 자체는 유지됩니다. 되돌릴 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        loading={deleteMut.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <EditCollectionModal
        open={editTarget != null}
        collection={editTarget}
        onCancel={() => setEditTarget(null)}
        onSuccess={() => setEditTarget(null)}
      />
    </section>
  );
}
