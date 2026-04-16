"use client";

/**
 * ConversationList — 대화 목록 사이드바 (Task 3-9).
 *
 * 포함:
 *  - 새 대화 버튼
 *  - SearchBox (debounce 검색)
 *  - FilterTabs (전체/7일/30일/보관함)
 *  - ConversationItem 목록 (제목 수정, 아카이브, 삭제, 내보내기)
 *  - 페이지네이션 "더 보기"
 *  - 로딩 / 빈 상태
 *
 * 접근성 (WCAG 2.1 AA):
 *  - role="navigation" + aria-label
 *  - aria-live="polite" 목록 영역
 *  - 로딩 스피너: role="status" + aria-label
 *  - ConfirmDialog: role="alertdialog" (window.confirm 대체)
 */

import { useEffect, useCallback, useState } from "react";
import { useConversationListStore, type FilterTab } from "@/stores/conversationListStore";
import { conversationApi } from "@/lib/api/conversation";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import SearchBox from "./SearchBox";
import FilterTabs from "./FilterTabs";
import ConversationItem from "./ConversationItem";

const PAGE_SIZE = 20;

interface ConversationListProps {
  selectedId?: string;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
}

function tabToStatus(tab: FilterTab): string | undefined {
  if (tab === "archived") return "archived";
  return "active";
}

function dateFilter(tab: FilterTab) {
  if (tab === "week") return Date.now() - 7 * 24 * 3600_000;
  if (tab === "month") return Date.now() - 30 * 24 * 3600_000;
  return null;
}

export default function ConversationList({
  selectedId,
  onSelect,
  onNewConversation,
}: ConversationListProps) {
  const {
    conversations,
    searchQuery,
    filterTab,
    loading,
    hasMore,
    page,
    setConversations,
    appendConversations,
    updateConversation,
    removeConversation,
    setSearchQuery,
    setFilterTab,
    setLoading,
    setHasMore,
    incrementPage,
  } = useConversationListStore();

  // 삭제 확인 다이얼로그 상태
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const loadConversations = useCallback(async (pg = 1, append = false) => {
    setLoading(true);
    try {
      const res = await conversationApi.list(pg, PAGE_SIZE, {
        status: tabToStatus(filterTab),
        search: searchQuery || undefined,
      });
      const minTime = dateFilter(filterTab);
      const filtered = minTime
        ? res.conversations.filter(
            (c) => new Date(c.updated_at).getTime() >= minTime
          )
        : res.conversations;

      if (append) {
        appendConversations(filtered);
      } else {
        setConversations(filtered);
      }
      setHasMore(filtered.length === PAGE_SIZE);
    } catch {
      // 로그인 안 됨 또는 네트워크 오류 — 빈 목록 유지
    } finally {
      setLoading(false);
    }
  }, [filterTab, searchQuery, setLoading, setConversations, appendConversations, setHasMore]);

  useEffect(() => {
    loadConversations(1, false);
  }, [loadConversations]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    incrementPage();
    await loadConversations(nextPage, true);
  };

  const handleRename = async (id: string, newTitle: string) => {
    try {
      const updated = await conversationApi.update(id, { title: newTitle });
      updateConversation(id, { title: updated.title });
    } catch { /* 실패 무시 */ }
  };

  const handleArchive = async (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    if (!conv) return;
    try {
      if (conv.status === "archived") {
        const updated = await conversationApi.update(id, { status: "active" });
        updateConversation(id, { status: updated.status });
      } else {
        await conversationApi.archive(id);
        if (filterTab === "archived") {
          removeConversation(id);
        } else {
          updateConversation(id, { status: "archived" });
        }
      }
    } catch { /* 실패 무시 */ }
  };

  // 삭제: ConfirmDialog 요청
  const handleDeleteRequest = (id: string) => {
    setDeleteTarget(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    try {
      await conversationApi.delete(id);
      removeConversation(id);
    } catch { /* 실패 무시 */ }
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  const handleExport = async (id: string) => {
    try {
      const data = await conversationApi.exportJson(id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `conversation-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* 내보내기 실패 무시 */ }
  };

  return (
    <nav
      aria-label="대화 목록 내비게이션"
      className="flex flex-col h-full"
    >
      {/* 새 대화 버튼 */}
      <div className="px-3 py-3 border-b border-gray-100">
        <button
          onClick={onNewConversation}
          className="w-full text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded-lg px-3 py-2 transition-colors"
          aria-label="새 대화 시작"
        >
          + 새 대화
        </button>
      </div>

      {/* 검색 */}
      <SearchBox value={searchQuery} onChange={setSearchQuery} />

      {/* 필터 탭 */}
      <FilterTabs activeTab={filterTab} onTabChange={setFilterTab} />

      {/* 대화 목록 */}
      <div
        className="flex-1 overflow-y-auto py-1"
        aria-live="polite"
        aria-atomic="false"
        role="region"
        aria-label="대화 목록"
      >
        {loading && conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2" role="status" aria-label="대화 목록 로딩 중">
            <svg className="w-5 h-5 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
            </svg>
            <p className="text-xs text-gray-400">불러오는 중…</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-gray-400">
              {searchQuery
                ? `"${searchQuery}" 검색 결과가 없습니다.`
                : filterTab === "archived"
                ? "보관된 대화가 없습니다."
                : "대화가 없습니다."}
            </p>
            {!searchQuery && filterTab !== "archived" && (
              <button
                onClick={onNewConversation}
                className="mt-2 text-xs text-blue-600 hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded"
              >
                새 대화 시작
              </button>
            )}
          </div>
        ) : (
          <ul className="px-2 space-y-0.5" role="listbox" aria-label="대화 목록">
            {conversations.map((conv) => (
              <li key={conv.id} role="option" aria-selected={selectedId === conv.id}>
                <ConversationItem
                  conversation={conv}
                  isSelected={selectedId === conv.id}
                  onSelect={() => onSelect(conv.id)}
                  onRename={handleRename}
                  onArchive={handleArchive}
                  onDelete={handleDeleteRequest}
                  onExport={handleExport}
                />
              </li>
            ))}
          </ul>
        )}

        {/* 더 보기 */}
        {hasMore && !loading && (
          <div className="px-3 py-3 text-center">
            <button
              onClick={handleLoadMore}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded px-2 py-1"
            >
              더 보기
            </button>
          </div>
        )}

        {loading && conversations.length > 0 && (
          <p className="text-xs text-gray-400 text-center py-2" role="status" aria-live="polite">
            불러오는 중…
          </p>
        )}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="대화를 삭제하시겠습니까?"
        description="삭제 후에는 복구할 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </nav>
  );
}
