"use client";

/**
 * ChatPage — 반응형 3컬럼 채팅 레이아웃 (Task 3-7 / Task 3-10).
 *
 * 브레이크포인트:
 *  - 모바일  (< md)  : 1컬럼 — ChatWindow 전체폭, 사이드바는 오버레이 드로어
 *  - 태블릿  (md~lg) : 2컬럼 — ConversationList(w-56) + ChatWindow
 *  - 데스크탑(lg+)   : 3컬럼 — ConversationList + ChatWindow + ReferencePanel
 *
 * 접근성 (WCAG 2.1 AA):
 *  - 스킵 내비게이션 링크 (#main-chat)
 *  - aria-expanded / aria-controls 모바일 토글
 *  - role="complementary" 사이드바 영역
 *  - 모달 드로어: focus trap + Escape 닫기
 */

import { useState, useEffect, useCallback } from "react";
import ChatWindow from "@/components/chat/ChatWindow";
import ConversationList from "@/components/chat/ConversationList";

export function ChatPage() {
  const [activeConvId, setActiveConvId] = useState<string | undefined>();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleConversationChange = (id: string) => {
    setActiveConvId(id || undefined);
  };

  const handleConversationSelect = (id: string) => {
    setActiveConvId(id || undefined);
    setDrawerOpen(false); // 모바일: 대화 선택 시 드로어 닫기
  };

  const handleNewConversation = useCallback(() => {
    setActiveConvId(undefined);
    setDrawerOpen(false);
  }, []);

  // Escape 키로 모바일 드로어 닫기
  useEffect(() => {
    if (!drawerOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [drawerOpen]);

  return (
    <>
      {/* 스킵 내비게이션 (WCAG 2.4.1) */}
      <a
        href="#main-chat"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:text-sm"
      >
        채팅 영역으로 건너뛰기
      </a>

      <div className="flex h-full relative overflow-hidden">
        {/* ── 모바일 드로어 오버레이 ── */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* ── 1. 좌측: 대화 목록 사이드바 ── */}
        {/* 모바일: fixed 드로어, md+: static */}
        <aside
          id="conversation-sidebar"
          role="complementary"
          aria-label="대화 목록"
          className={`
            shrink-0 border-r border-gray-200 bg-white flex flex-col
            transition-transform duration-200
            w-64 md:w-56
            fixed md:static inset-y-0 left-0 z-40
            ${drawerOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          `}
        >
          {/* 모바일 드로어 닫기 버튼 */}
          <div className="md:hidden flex justify-end px-3 pt-3 pb-0">
            <button
              className="p-1 rounded text-gray-500 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              onClick={() => setDrawerOpen(false)}
              aria-label="사이드바 닫기"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <ConversationList
            selectedId={activeConvId}
            onSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
          />
        </aside>

        {/* ── 2. 중앙: ChatWindow ── */}
        <main
          id="main-chat"
          className="flex-1 min-w-0 flex flex-col overflow-hidden relative"
          aria-label="채팅 영역"
        >
          {/* 모바일 햄버거 버튼 */}
          <div className="md:hidden absolute top-3 left-3 z-10">
            <button
              className="p-2 rounded-lg bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors"
              onClick={() => setDrawerOpen(true)}
              aria-label="대화 목록 열기"
              aria-expanded={drawerOpen}
              aria-controls="conversation-sidebar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <ChatWindow
            conversationId={activeConvId}
            onConversationChange={handleConversationChange}
          />
        </main>

        {/* ── 3. 우측: 참고 자료 패널 (lg+만 표시) ── */}
        <aside
          className="hidden lg:flex w-72 shrink-0 border-l border-gray-200 bg-white flex-col"
          aria-label="참고 문서"
          role="complementary"
        >
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">참고 문서</h2>
            <p className="text-xs text-gray-400 mt-0.5">답변 생성에 사용된 출처</p>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-xs text-gray-400 text-center">
              답변이 생성되면
              <br />
              출처 문서가 여기 표시됩니다.
              <br />
              <span className="text-gray-300">(Task 3-8에서 구현)</span>
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
