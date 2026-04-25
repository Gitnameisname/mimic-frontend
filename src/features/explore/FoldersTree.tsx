/**
 * FoldersTree — 사이드바 "탐색" 섹션의 계층 폴더 트리.
 *
 * S3 Phase 2 FG 2-1.
 *  - 서버에서 path 순으로 정렬된 flat list 를 받아 계층 렌더
 *  - 각 노드: 접기/펼치기 (로컬 상태) + 클릭 시 `/documents?folder=<id>` 이동
 *  - 루트에 "+ 폴더 추가" / 노드 hover 시 + (하위 추가)
 *  - 뷰 레이어. ACL 에는 영향 없음 (FG 2-0 / FG 2-1 절대 규칙)
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import type { Folder } from "@/lib/api/folders";
import { FolderMoveDialog } from "./FolderMoveDialog";
import { RowMenu } from "./RowMenu";
import {
  useCreateFolder,
  useDeleteFolder,
  useFolders,
  useMoveFolder,
  useRenameFolder,
} from "./hooks/useFolders";

interface Props {
  compact?: boolean;
}

interface TreeNode {
  folder: Folder;
  children: TreeNode[];
}

/** flat list → 계층 트리 (parent_id 기반) */
function buildTree(folders: Folder[]): TreeNode[] {
  const byId = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];
  for (const f of folders) byId.set(f.id, { folder: f, children: [] });
  for (const f of folders) {
    const node = byId.get(f.id)!;
    if (f.parent_id && byId.has(f.parent_id)) {
      byId.get(f.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  // path 순으로 안정 정렬 (서버가 이미 path 순이지만 재확인)
  const sortByPath = (a: TreeNode, b: TreeNode) =>
    a.folder.path.localeCompare(b.folder.path);
  roots.sort(sortByPath);
  const walk = (n: TreeNode) => {
    n.children.sort(sortByPath);
    n.children.forEach(walk);
  };
  roots.forEach(walk);
  return roots;
}

export function FoldersTree({ compact = false }: Props) {
  const { data: folders, isLoading, isError } = useFolders();
  const createMut = useCreateFolder();
  const renameMut = useRenameFolder();
  const moveMut = useMoveFolder();
  const deleteMut = useDeleteFolder();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("folder");

  const tree = useMemo(() => buildTree(folders ?? []), [folders]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [addingUnder, setAddingUnder] = useState<string | "root" | null>(null);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // UX 다듬기 — 인라인 rename / 이동 모달 / 삭제 확인
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [moveTarget, setMoveTarget] = useState<Folder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Folder | null>(null);

  useEffect(() => {
    if (renamingId) renameInputRef.current?.select();
  }, [renamingId]);

  const submitRename = useCallback(async () => {
    if (!renamingId) return;
    const next = renameDraft.trim();
    if (!next) {
      setRenamingId(null);
      return;
    }
    const current = folders?.find((f) => f.id === renamingId);
    if (current && current.name === next) {
      setRenamingId(null);
      return;
    }
    try {
      await renameMut.mutateAsync({ id: renamingId, newName: next });
      setRenamingId(null);
    } catch {
      // toast 처리됨
    }
  }, [renamingId, renameDraft, folders, renameMut]);

  const confirmMove = useCallback(
    async (newParentId: string | null) => {
      if (!moveTarget) return;
      try {
        await moveMut.mutateAsync({ id: moveTarget.id, newParentId });
      } finally {
        setMoveTarget(null);
      }
    },
    [moveTarget, moveMut],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMut]);

  // 활성 폴더 조상 자동 전개
  useEffect(() => {
    if (!activeId || !folders) return;
    const ancestors = new Set<string>();
    let current = folders.find((f) => f.id === activeId);
    while (current && current.parent_id) {
      ancestors.add(current.parent_id);
      current = folders.find((f) => f.id === current!.parent_id);
    }
    setExpanded((prev) => {
      const next = new Set(prev);
      ancestors.forEach((id) => next.add(id));
      return next;
    });
  }, [activeId, folders]);

  useEffect(() => {
    if (addingUnder !== null) inputRef.current?.focus();
  }, [addingUnder]);

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const submitAdd = useCallback(async () => {
    const name = newName.trim();
    if (!name || addingUnder === null) {
      setAddingUnder(null);
      setNewName("");
      return;
    }
    const parentId = addingUnder === "root" ? null : addingUnder;
    try {
      await createMut.mutateAsync({ name, parent_id: parentId });
      setNewName("");
      setAddingUnder(null);
      // 생성한 하위가 보이도록 부모 전개
      if (parentId) {
        setExpanded((prev) => new Set(prev).add(parentId));
      }
    } catch {
      // toast 는 훅에서 처리, 입력 유지
    }
  }, [newName, addingUnder, createMut]);

  if (compact) {
    return (
      <div className="px-2 py-1">
        <Link
          href="/documents"
          title="폴더"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md",
            "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            "hover:bg-[var(--color-surface-subtle)]",
          )}
          aria-label="폴더"
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
              d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
            />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <section aria-labelledby="folders-heading" className="px-3 py-2">
      <header className="flex items-center justify-between px-1 pb-1">
        <h3
          id="folders-heading"
          className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]"
        >
          폴더
        </h3>
        <button
          type="button"
          onClick={() => setAddingUnder("root")}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
          aria-label="루트 폴더 추가"
          title="루트 폴더 추가"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </header>

      {addingUnder === "root" && (
        <InlineInput
          inputRef={inputRef}
          value={newName}
          onChange={setNewName}
          onSubmit={submitAdd}
          onCancel={() => {
            setAddingUnder(null);
            setNewName("");
          }}
          placeholder="새 폴더 이름"
          disabled={createMut.isPending}
          indentPx={0}
        />
      )}

      {isLoading && (
        <ul className="space-y-1 px-1" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-6 animate-pulse rounded bg-[var(--color-surface-subtle)]" />
          ))}
        </ul>
      )}

      {isError && (
        <p className="px-1 py-2 text-xs text-[var(--color-danger-600)]" role="alert">
          폴더를 불러오지 못했습니다.
        </p>
      )}

      {!isLoading && !isError && tree.length === 0 && addingUnder === null && (
        <p className="px-1 py-2 text-xs text-[var(--color-text-muted)]">
          폴더가 없습니다. + 를 눌러 추가하세요.
        </p>
      )}

      {tree.length > 0 && (
        <ul className="space-y-0.5" role="tree" aria-label="폴더 트리">
          {tree.map((node) => (
            <FolderTreeNode
              key={node.folder.id}
              node={node}
              depth={0}
              expanded={expanded}
              toggle={toggleExpand}
              activeId={activeId}
              addingUnder={addingUnder}
              onRequestAddUnder={setAddingUnder}
              inputValue={newName}
              onInputChange={setNewName}
              onSubmit={submitAdd}
              onCancel={() => {
                setAddingUnder(null);
                setNewName("");
              }}
              inputRef={inputRef}
              inputDisabled={createMut.isPending}
              renamingId={renamingId}
              renameInputRef={renameInputRef}
              renameDisabled={renameMut.isPending}
              onRequestRename={(f) => {
                setRenameDraft(f.name);
                setRenamingId(f.id);
              }}
              onRenameDraftChange={setRenameDraft}
              onRenameSubmit={submitRename}
              onRenameCancel={() => setRenamingId(null)}
              onRequestMove={setMoveTarget}
              onRequestDelete={setDeleteTarget}
            />
          ))}
        </ul>
      )}

      <FolderMoveDialog
        open={moveTarget != null}
        current={moveTarget}
        allFolders={folders ?? []}
        loading={moveMut.isPending}
        onConfirm={confirmMove}
        onCancel={() => setMoveTarget(null)}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title={`폴더 "${deleteTarget?.name ?? ""}" 을(를) 삭제할까요?`}
        message="하위 폴더 또는 문서가 있는 폴더는 삭제되지 않습니다. 문서는 폴더에서만 해제됩니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        danger
        loading={deleteMut.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}

interface NodeProps {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  toggle: (id: string) => void;
  activeId: string | null;
  addingUnder: string | "root" | null;
  onRequestAddUnder: (id: string | null) => void;
  inputValue: string;
  onInputChange: (s: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  inputDisabled: boolean;
  // UX 다듬기 — rename / move / delete
  renamingId: string | null;
  renameInputRef: React.RefObject<HTMLInputElement | null>;
  renameDisabled: boolean;
  onRequestRename: (f: Folder) => void;
  onRenameDraftChange: (s: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onRequestMove: (f: Folder) => void;
  onRequestDelete: (f: Folder) => void;
}

function FolderTreeNode(props: NodeProps) {
  const {
    node, depth, expanded, toggle, activeId,
    addingUnder, onRequestAddUnder,
    inputValue, onInputChange, onSubmit, onCancel, inputRef, inputDisabled,
    renamingId, renameInputRef, renameDisabled,
    onRequestRename, onRenameDraftChange, onRenameSubmit, onRenameCancel,
    onRequestMove, onRequestDelete,
  } = props;

  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.folder.id);
  const active = node.folder.id === activeId;
  const isRenaming = renamingId === node.folder.id;
  const indent = depth * 12;

  return (
    <li role="treeitem" aria-expanded={hasChildren ? isOpen : undefined}>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-1 py-1 text-sm",
          active
            ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)] font-medium"
            : "text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]",
        )}
        style={{ paddingLeft: 4 + indent }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => toggle(node.folder.id)}
            aria-label={isOpen ? "접기" : "펼치기"}
            className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-[var(--color-surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
          >
            <svg
              className={cn("h-3 w-3 transition-transform", isOpen && "rotate-90")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M9 6l6 6-6 6" />
            </svg>
          </button>
        ) : (
          <span className="inline-block h-5 w-5" aria-hidden="true" />
        )}

        {isRenaming ? (
          <form
            className="min-w-0 flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              onRenameSubmit();
            }}
          >
            <input
              ref={renameInputRef}
              type="text"
              defaultValue={node.folder.name}
              onChange={(e) => onRenameDraftChange(e.target.value)}
              onBlur={onRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.preventDefault();
                  onRenameCancel();
                }
              }}
              maxLength={200}
              aria-label="폴더 이름 변경"
              className="w-full rounded border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-0.5 text-sm text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
              disabled={renameDisabled}
            />
          </form>
        ) : (
          <Link
            href={`/documents?folder=${encodeURIComponent(node.folder.id)}`}
            aria-current={active ? "page" : undefined}
            className="min-w-0 flex-1 truncate focus-visible:outline-none focus-visible:underline"
            title={node.folder.path}
          >
            {node.folder.name}
          </Link>
        )}

        {!isRenaming && (
          <>
            <button
              type="button"
              onClick={() => onRequestAddUnder(node.folder.id)}
              aria-label={`"${node.folder.name}" 안에 폴더 추가`}
              title="하위 폴더 추가"
              className="invisible inline-flex h-5 w-5 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)] group-hover:visible focus-visible:visible focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <RowMenu
              ariaLabel={`"${node.folder.name}" 메뉴`}
              items={[
                {
                  key: "rename",
                  label: "이름 변경",
                  onSelect: () => onRequestRename(node.folder),
                },
                {
                  key: "move",
                  label: "이동",
                  onSelect: () => onRequestMove(node.folder),
                },
                {
                  key: "delete",
                  label: "삭제",
                  danger: true,
                  onSelect: () => onRequestDelete(node.folder),
                },
              ]}
            />
          </>
        )}
      </div>

      {addingUnder === node.folder.id && (
        <InlineInput
          inputRef={inputRef}
          value={inputValue}
          onChange={onInputChange}
          onSubmit={onSubmit}
          onCancel={onCancel}
          placeholder={`"${node.folder.name}" 의 하위 폴더 이름`}
          disabled={inputDisabled}
          indentPx={indent + 24}
        />
      )}

      {isOpen && hasChildren && (
        <ul role="group" className="space-y-0.5">
          {node.children.map((child) => (
            <FolderTreeNode
              key={child.folder.id}
              {...props}
              node={child}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

interface InlineInputProps {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (s: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  placeholder: string;
  disabled: boolean;
  indentPx: number;
}

function InlineInput({
  inputRef, value, onChange, onSubmit, onCancel, placeholder, disabled, indentPx,
}: InlineInputProps) {
  return (
    <form
      className="px-1 py-1"
      style={{ paddingLeft: 4 + indentPx }}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        onBlur={onSubmit}
        placeholder={placeholder}
        maxLength={200}
        aria-label={placeholder}
        className="w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
        disabled={disabled}
      />
    </form>
  );
}

// 테스트용 내부 헬퍼 export
export const __test__ = { buildTree };
