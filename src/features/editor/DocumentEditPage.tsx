"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi, versionsApi, nodesApi, getApiErrorMessage } from "@/lib/api";
import { toast } from "@/stores/uiStore";
import { Button } from "@/components/button/Button";
import { SkeletonBlock } from "@/components/feedback/SkeletonBlock";
import { ErrorState } from "@/components/feedback/ErrorState";
import { useAuthz } from "@/hooks/useAuthz";
import type { DocumentNode } from "@/types";

interface Props {
  documentId: string;
}

type SaveStatus = "saved" | "unsaved" | "saving" | "error";

export function DocumentEditPage({ documentId }: Props) {
  const router = useRouter();
  const qc = useQueryClient();
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { can } = useAuthz();
  const readOnly = !can("document.edit");

  const [title, setTitle] = useState("");
  const [nodes, setNodes] = useState<DocumentNode[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [isDirty, setIsDirty] = useState(false);

  const docQuery = useQuery({
    queryKey: ["document", documentId],
    queryFn: () => documentsApi.get(documentId),
  });

  const versionQuery = useQuery({
    queryKey: ["version-latest", documentId],
    queryFn: () => versionsApi.getLatest(documentId),
    enabled: !!docQuery.data,
  });

  const nodesQuery = useQuery({
    queryKey: ["nodes", documentId],
    queryFn: () => nodesApi.list(documentId),
    enabled: !!versionQuery.data,
  });

  // 초기 데이터 로드
  // 제목 우선순위: version.title_snapshot(최신 저장본) → doc.title(생성 시 제목).
  // F-05 시정(2026-04-18): "서버에서 fetch → 로컬 편집 state 로 복사" 는 전형적인
  //   synchronizing-to-external-system 효과로 set-state-in-effect 규칙의 의도된
  //   예외 영역임(React 문서의 "You Might Not Need an Effect" 중 "Resetting all state
  //   when a prop changes" 패턴 참고). 다만 sync 조건에 "초기 1회" 가드를 두어
  //   refetch 시 사용자의 미저장 편집을 덮어쓰지 않도록 보강.
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    const hasSeed = (versionQuery.data?.title_snapshot ?? docQuery.data) != null;
    const hasNodes = nodesQuery.data != null;
    if (!hasSeed || !hasNodes) return;
    /* eslint-disable react-hooks/set-state-in-effect -- 서버에서 로드된 버전 스냅샷을
       로컬 편집 state 로 1회 복사하는 동기화 효과. initializedRef 가드로 refetch 덮어쓰기 방지. */
    setTitle(versionQuery.data?.title_snapshot ?? docQuery.data?.title ?? "");
    setNodes(nodesQuery.data ?? []);
    /* eslint-enable react-hooks/set-state-in-effect */
    initializedRef.current = true;
  }, [docQuery.data, versionQuery.data, nodesQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      versionsApi.saveDraft(documentId, versionQuery.data!.id, {
        title,
        nodes: nodes.map((n) => ({
          id: n.id,
          node_type: n.node_type,
          order: n.order,
          parent_id: n.parent_id,
          title: n.title,
          content: n.content,
          metadata: n.metadata,
        })),
      }),
    onMutate: () => setSaveStatus("saving"),
    onSuccess: () => {
      setSaveStatus("saved");
      setIsDirty(false);
      qc.invalidateQueries({ queryKey: ["document", documentId] });
    },
    onError: (err) => {
      setSaveStatus("error");
      toast(getApiErrorMessage(err, "저장에 실패했습니다"), "error");
    },
  });

  const handleSave = useCallback(() => {
    if (!versionQuery.data) return;
    saveMutation.mutate();
  }, [saveMutation, versionQuery.data]);

  // 자동 저장 (30초)
  useEffect(() => {
    if (!isDirty) return;
    autoSaveTimer.current = setTimeout(() => handleSave(), 30_000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [isDirty, handleSave]);

  // Cmd/Ctrl + S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave]);

  const markDirty = () => {
    setIsDirty(true);
    setSaveStatus("unsaved");
  };

  const addNode = (type: DocumentNode["node_type"]) => {
    const newNode: DocumentNode = {
      id: crypto.randomUUID(),
      version_id: versionQuery.data?.id ?? "",
      parent_id: null,
      node_type: type,
      order: nodes.filter((n) => !n.parent_id).length,
      title: type === "section" ? "새 섹션" : undefined,
      content: type !== "section" ? "" : undefined,
    };
    setNodes((prev) => [...prev, newNode]);
    markDirty();
  };

  const updateNode = (id: string, changes: Partial<DocumentNode>) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...changes } : n))
    );
    markDirty();
  };

  const removeNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id && n.parent_id !== id));
    markDirty();
  };

  const moveNode = (id: string, direction: "up" | "down") => {
    setNodes((prev) => {
      const roots = prev
        .filter((n) => !n.parent_id)
        .sort((a, b) => a.order - b.order);
      const idx = roots.findIndex((n) => n.id === id);
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= roots.length) return prev;
      const updated = prev.map((n) => {
        if (n.id === roots[idx].id) return { ...n, order: roots[swapIdx].order };
        if (n.id === roots[swapIdx].id) return { ...n, order: roots[idx].order };
        return n;
      });
      return updated;
    });
    markDirty();
  };

  const SAVE_STATUS_TEXT: Record<SaveStatus, string> = {
    saved: "저장됨 ✓",
    unsaved: "저장되지 않은 변경사항",
    saving: "저장 중...",
    error: "저장 실패 — 클릭하여 재시도",
  };

  const SAVE_STATUS_COLOR: Record<SaveStatus, string> = {
    saved: "text-gray-400",
    unsaved: "text-amber-500",
    saving: "text-gray-400",
    error: "text-red-500 cursor-pointer",
  };

  if (docQuery.isLoading || versionQuery.isLoading || nodesQuery.isLoading) {
    return <div className="p-6"><SkeletonBlock rows={10} /></div>;
  }

  if (docQuery.isError) {
    return <ErrorState retry={docQuery.refetch} className="mt-16" />;
  }

  if (readOnly) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
        <div className="text-4xl">🔒</div>
        <p className="text-gray-700 font-medium">이 문서를 편집할 권한이 없습니다.</p>
        <p className="text-sm text-gray-500">문서 편집은 작성자(AUTHOR) 이상의 역할이 필요합니다.</p>
        <Button variant="secondary" size="sm" onClick={() => router.push(`/documents/${documentId}`)}>
          문서로 돌아가기
        </Button>
      </div>
    );
  }

  const rootNodes = nodes
    .filter((n) => !n.parent_id)
    .sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col h-full">
      {/* Edit Header */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (isDirty) {
              if (!confirm("저장하지 않은 변경사항이 있습니다. 나가시겠습니까?")) return;
            }
            router.push(`/documents/${documentId}`);
          }}
        >
          ← 취소
        </Button>

        <input
          type="text"
          className="flex-1 text-lg font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-0 placeholder-gray-300"
          value={title}
          placeholder="제목 없음"
          onChange={(e) => {
            setTitle(e.target.value);
            markDirty();
          }}
        />

        <span
          className={`text-xs shrink-0 ${SAVE_STATUS_COLOR[saveStatus]}`}
          onClick={saveStatus === "error" ? handleSave : undefined}
        >
          {SAVE_STATUS_TEXT[saveStatus]}
        </span>

        <Button
          variant="primary"
          size="sm"
          loading={saveMutation.isPending}
          disabled={!isDirty}
          onClick={handleSave}
        >
          저장
        </Button>
      </div>

      {/* Toolbar */}
      <div className="shrink-0 border-b border-gray-100 bg-white px-4 py-1.5 flex items-center gap-2">
        <span className="text-xs text-gray-500 mr-1">블록 추가:</span>
        {(["section", "paragraph", "heading", "list", "code_block"] as const).map((t) => {
          const labels: Record<string, string> = {
            section: "섹션",
            paragraph: "단락",
            heading: "제목",
            list: "목록",
            code_block: "코드",
          };
          return (
            <button
              key={t}
              className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              onClick={() => addNode(t)}
            >
              + {labels[t]}
            </button>
          );
        })}
      </div>

      {/* Editor Body */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl mx-auto w-full">
        {rootNodes.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">위의 버튼으로 블록을 추가해 편집을 시작하세요.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rootNodes.map((node, idx) => (
              <EditableNode
                key={node.id}
                node={node}
                isFirst={idx === 0}
                isLast={idx === rootNodes.length - 1}
                onUpdate={updateNode}
                onRemove={removeNode}
                onMove={moveNode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EditableNode({
  node,
  isFirst,
  isLast,
  onUpdate,
  onRemove,
  onMove,
}: {
  node: DocumentNode;
  isFirst: boolean;
  isLast: boolean;
  onUpdate: (id: string, changes: Partial<DocumentNode>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
}) {
  const baseClass =
    "w-full border border-transparent hover:border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:border-blue-300 focus:bg-blue-50/20 transition-colors resize-none";

  return (
    <div className="group relative pr-8">
      {/* 우측 액션 버튼 */}
      <div className="absolute right-0 top-0 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={() => onMove(node.id, "up")}
          disabled={isFirst}
          title="위로 이동"
        >
          ▲
        </button>
        <button
          className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          onClick={() => onMove(node.id, "down")}
          disabled={isLast}
          title="아래로 이동"
        >
          ▼
        </button>
        <button
          className="p-0.5 text-gray-400 hover:text-red-500 mt-1"
          onClick={() => onRemove(node.id)}
          title="삭제"
        >
          ×
        </button>
      </div>

      {node.node_type === "section" && (
        <input
          className={`${baseClass} text-lg font-semibold text-gray-900 bg-transparent`}
          value={node.title ?? ""}
          placeholder="섹션 제목..."
          onChange={(e) => onUpdate(node.id, { title: e.target.value })}
        />
      )}

      {node.node_type === "heading" && (
        <input
          className={`${baseClass} text-base font-semibold text-gray-800 bg-transparent`}
          value={node.content ?? ""}
          placeholder="제목..."
          onChange={(e) => onUpdate(node.id, { content: e.target.value })}
        />
      )}

      {node.node_type === "paragraph" && (
        <textarea
          className={`${baseClass} text-sm text-gray-700 bg-transparent`}
          value={node.content ?? ""}
          placeholder="내용을 입력하세요..."
          rows={3}
          onChange={(e) => onUpdate(node.id, { content: e.target.value })}
        />
      )}

      {node.node_type === "list" && (
        <textarea
          className={`${baseClass} text-sm text-gray-700 bg-transparent font-mono`}
          value={node.content ?? ""}
          placeholder="항목을 입력하세요 (한 줄에 하나씩)..."
          rows={4}
          onChange={(e) => onUpdate(node.id, { content: e.target.value })}
        />
      )}

      {node.node_type === "code_block" && (
        <textarea
          className={`${baseClass} text-sm text-gray-100 bg-gray-900 rounded-lg font-mono`}
          value={node.content ?? ""}
          placeholder="코드를 입력하세요..."
          rows={6}
          onChange={(e) => onUpdate(node.id, { content: e.target.value })}
        />
      )}
    </div>
  );
}
