/**
 * AnnotationsPanel — S3 Phase 3 FG 3-3.
 *
 * 문서 상세에 표시되는 인라인 주석 패널.
 *   - 주석 / 답글 트리화 (parent_id 기반 1단계)
 *   - 신규 주석 입력 (현재 노드 선택은 별 라운드 — TipTap mark/gutter 도입 후 통합)
 *   - 해결 / 재오픈 / 삭제 (작성자 또는 admin)
 *   - 고아 주석 별 섹션
 *
 * 본 라운드 단순화:
 *   - 신규 주석 작성은 documentId + 첫 노드 (또는 사용자 입력 node_id) 로 우선 동작
 *   - TipTap 본문 클릭 → 패널 활성화는 후속 (TipTap AnnotationMark/Gutter 도입 시)
 */

"use client";

import { useMemo, useState } from "react";

import { ActorTypeBadge } from "@/components/badge/ActorTypeBadge";
import { Button } from "@/components/button/Button";
import { ErrorState } from "@/components/feedback/ErrorState";
import { SkeletonBlock } from "@/components/feedback/SkeletonBlock";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/utils";
import { toast } from "@/stores/uiStore";
import type { Annotation } from "@/lib/api/annotations";
import { useAuthz } from "@/hooks/useAuthz";

import {
  useAnnotations,
  useCreateAnnotation,
  useDeleteAnnotation,
  useReopenAnnotation,
  useResolveAnnotation,
  useUpdateAnnotation,
} from "./hooks/useAnnotations";

interface Props {
  documentId: string;
  /** 선택적으로 새 주석의 기본 node_id (TipTap 본문에서 선택된 노드). 없으면 사용자가 입력. */
  defaultNodeId?: string;
  className?: string;
  /** 현재 사용자 id (소유권 판단). 없으면 _authz.canAct 기반 fallback. */
  currentUserId?: string;
}

interface AnnotationTreeNode {
  annotation: Annotation;
  replies: Annotation[];
}

function _treeify(items: Annotation[]): AnnotationTreeNode[] {
  const roots: Annotation[] = [];
  const repliesByParent = new Map<string, Annotation[]>();
  for (const a of items) {
    if (a.parent_id) {
      const list = repliesByParent.get(a.parent_id) ?? [];
      list.push(a);
      repliesByParent.set(a.parent_id, list);
    } else {
      roots.push(a);
    }
  }
  return roots.map((root) => ({
    annotation: root,
    replies: (repliesByParent.get(root.id) ?? []).sort((a, b) => a.created_at.localeCompare(b.created_at)),
  }));
}


function _AnnotationCard({
  annotation,
  documentId,
  isOwner,
  isAdmin,
  onReply,
  onResolveChange,
  onDelete,
  onUpdate,
}: {
  annotation: Annotation;
  documentId: string;
  isOwner: boolean;
  isAdmin: boolean;
  onReply: () => void;
  onResolveChange: () => void;
  onDelete: () => void;
  onUpdate: (newContent: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(annotation.content);

  const canEdit = isOwner;
  const canResolve = isOwner || isAdmin;
  const canDelete = isOwner || isAdmin;

  return (
    <div
      className={cn(
        "border rounded-lg p-3 bg-white",
        annotation.is_orphan ? "border-amber-300 bg-amber-50" : "border-gray-200",
        annotation.status === "resolved" && "opacity-70",
      )}
    >
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        <span className="text-sm font-medium text-gray-900">
          {annotation.author_id}
        </span>
        <ActorTypeBadge actorType={annotation.actor_type} />
        {annotation.status === "resolved" && (
          <span className="text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
            해결됨
          </span>
        )}
        {annotation.is_orphan && (
          <span
            className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300"
            title="이 주석이 부착된 노드가 더 이상 본문에 존재하지 않습니다"
          >
            고아
          </span>
        )}
        <span className="text-[11px] text-gray-500 ml-auto">
          {relativeTime(annotation.created_at)}
        </span>
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded p-2 min-h-[60px] focus:outline-none focus:ring-1 focus:ring-blue-500"
            maxLength={10000}
          />
          <div className="flex gap-2 justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDraft(annotation.content);
                setEditing(false);
              }}
            >
              취소
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!draft.trim() || draft === annotation.content}
              onClick={() => {
                onUpdate(draft);
                setEditing(false);
              }}
            >
              저장
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
          {annotation.content}
        </p>
      )}

      {annotation.mentioned_user_ids.length > 0 && (
        <div className="mt-1.5 text-[11px] text-gray-500">
          멘션: {annotation.mentioned_user_ids.length}명
        </div>
      )}

      {!editing && (
        <div className="mt-2 flex gap-2 flex-wrap text-xs">
          {!annotation.parent_id && (
            <button
              type="button"
              className="text-blue-700 hover:text-blue-800"
              onClick={onReply}
            >
              답글
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              className="text-gray-700 hover:text-gray-900"
              onClick={() => setEditing(true)}
            >
              수정
            </button>
          )}
          {canResolve && (
            <button
              type="button"
              className="text-gray-700 hover:text-gray-900"
              onClick={onResolveChange}
            >
              {annotation.status === "open" ? "해결" : "재오픈"}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="text-red-600 hover:text-red-700 ml-auto"
              onClick={onDelete}
            >
              삭제
            </button>
          )}
        </div>
      )}
    </div>
  );
}


export function AnnotationsPanel({ documentId, defaultNodeId, className, currentUserId }: Props) {
  const [open, setOpen] = useState(false);
  const [includeResolved, setIncludeResolved] = useState(true);
  const [composing, setComposing] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newNodeId, setNewNodeId] = useState(defaultNodeId ?? "");
  const [replyParentId, setReplyParentId] = useState<string | null>(null);

  const { can, actorId: authActorId } = useAuthz();
  const isAdmin = can("admin.read");
  const effectiveCurrentUserId = currentUserId ?? authActorId ?? "";

  const query = useAnnotations(documentId, {
    includeResolved,
    enabled: open,
  });

  const createMut = useCreateAnnotation(documentId);
  const updateMut = useUpdateAnnotation(documentId);
  const resolveMut = useResolveAnnotation(documentId);
  const reopenMut = useReopenAnnotation(documentId);
  const deleteMut = useDeleteAnnotation(documentId);

  const tree = useMemo(() => _treeify(query.data ?? []), [query.data]);
  const orphans = useMemo(
    () => (query.data ?? []).filter((a) => a.is_orphan),
    [query.data],
  );
  const liveTree = useMemo(
    () => tree.filter((t) => !t.annotation.is_orphan),
    [tree],
  );

  const isOwnedBy = (a: Annotation) =>
    Boolean(effectiveCurrentUserId && a.author_id === effectiveCurrentUserId);

  const handleCreate = async () => {
    if (!newContent.trim() || !newNodeId.trim()) return;
    try {
      await createMut.mutateAsync({
        node_id: newNodeId.trim(),
        content: newContent.trim(),
        parent_id: replyParentId ?? undefined,
      });
      toast({ kind: "success", message: "주석을 저장했습니다." });
      setNewContent("");
      setReplyParentId(null);
      if (!defaultNodeId) setNewNodeId("");
      setComposing(false);
    } catch (err) {
      toast({ kind: "error", message: "주석 저장에 실패했습니다." });
    }
  };

  const handleResolveToggle = async (a: Annotation) => {
    try {
      if (a.status === "open") {
        await resolveMut.mutateAsync(a.id);
        toast({ kind: "success", message: "주석을 해결로 표시했습니다." });
      } else {
        await reopenMut.mutateAsync(a.id);
        toast({ kind: "success", message: "주석을 재오픈했습니다." });
      }
    } catch {
      toast({ kind: "error", message: "처리에 실패했습니다." });
    }
  };

  const handleDelete = async (a: Annotation) => {
    if (!window.confirm("주석을 삭제하시겠습니까? 답글도 함께 삭제됩니다.")) return;
    try {
      await deleteMut.mutateAsync(a.id);
      toast({ kind: "success", message: "주석을 삭제했습니다." });
    } catch {
      toast({ kind: "error", message: "삭제에 실패했습니다." });
    }
  };

  return (
    <div className={cn("border border-gray-200 rounded-lg bg-white", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={open}
        aria-controls={`annotations-panel-${documentId}`}
      >
        <span className="text-sm font-semibold text-gray-800">
          주석{query.data ? ` (${query.data.length})` : ""}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={cn("w-4 h-4 text-gray-500 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <div
          id={`annotations-panel-${documentId}`}
          className="px-4 pb-4 border-t border-gray-100"
        >
          <div className="flex items-center gap-2 mt-3 mb-3 flex-wrap">
            <label className="text-[11px] text-gray-600 inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={includeResolved}
                onChange={(e) => setIncludeResolved(e.target.checked)}
                className="w-3 h-3"
              />
              해결된 항목 포함
            </label>
            <Button
              variant="secondary"
              size="sm"
              className="ml-auto"
              onClick={() => {
                setReplyParentId(null);
                setComposing((c) => !c);
              }}
            >
              {composing ? "입력 닫기" : "+ 새 주석"}
            </Button>
          </div>

          {composing && (
            <div className="border border-gray-300 rounded-lg p-3 mb-3 space-y-2 bg-gray-50">
              {!defaultNodeId && (
                <input
                  type="text"
                  placeholder="대상 node_id (UUID)"
                  value={newNodeId}
                  onChange={(e) => setNewNodeId(e.target.value)}
                  className="w-full text-xs border border-gray-300 rounded p-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}
              <textarea
                placeholder="주석 내용 (@username 으로 멘션 가능)"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded p-2 min-h-[60px] focus:outline-none focus:ring-1 focus:ring-blue-500"
                maxLength={10000}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setNewContent("");
                    setComposing(false);
                  }}
                >
                  취소
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!newContent.trim() || !newNodeId.trim() || createMut.isPending}
                  onClick={handleCreate}
                >
                  저장
                </Button>
              </div>
            </div>
          )}

          {query.isLoading ? (
            <SkeletonBlock rows={4} />
          ) : query.isError ? (
            <ErrorState
              title="주석을 불러올 수 없습니다"
              description="권한이 없거나 일시적인 오류일 수 있습니다."
              retry={() => query.refetch()}
            />
          ) : (
            <div className="space-y-3">
              {liveTree.length === 0 && orphans.length === 0 && (
                <div className="text-xs text-gray-400 py-2">
                  아직 주석이 없습니다.
                </div>
              )}
              {liveTree.map(({ annotation: root, replies }) => (
                <div key={root.id} className="space-y-2">
                  <_AnnotationCard
                    annotation={root}
                    documentId={documentId}
                    isOwner={isOwnedBy(root)}
                    isAdmin={isAdmin}
                    onReply={() => {
                      setReplyParentId(root.id);
                      setNewNodeId(root.node_id);
                      setComposing(true);
                    }}
                    onResolveChange={() => handleResolveToggle(root)}
                    onDelete={() => handleDelete(root)}
                    onUpdate={(content) =>
                      updateMut.mutate({ id: root.id, content })
                    }
                  />
                  {replies.length > 0 && (
                    <div className="ml-6 space-y-2">
                      {replies.map((reply) => (
                        <_AnnotationCard
                          key={reply.id}
                          annotation={reply}
                          documentId={documentId}
                          isOwner={isOwnedBy(reply)}
                          isAdmin={isAdmin}
                          onReply={() => {
                            // 답글의 답글은 root 로 평탄화
                            setReplyParentId(root.id);
                            setNewNodeId(root.node_id);
                            setComposing(true);
                          }}
                          onResolveChange={() => handleResolveToggle(reply)}
                          onDelete={() => handleDelete(reply)}
                          onUpdate={(content) =>
                            updateMut.mutate({ id: reply.id, content })
                          }
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {orphans.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="text-xs font-semibold text-amber-700 mb-2">
                    고아 주석 ({orphans.length}) — 부착 노드가 본문에서 사라짐
                  </div>
                  <div className="space-y-2">
                    {orphans.map((a) => (
                      <_AnnotationCard
                        key={a.id}
                        annotation={a}
                        documentId={documentId}
                        isOwner={isOwnedBy(a)}
                        isAdmin={isAdmin}
                        onReply={() => {}}
                        onResolveChange={() => handleResolveToggle(a)}
                        onDelete={() => handleDelete(a)}
                        onUpdate={(content) =>
                          updateMut.mutate({ id: a.id, content })
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
