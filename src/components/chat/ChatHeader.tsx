"use client";

/**
 * ChatHeader — 채팅창 상단 헤더.
 *
 * - 현재 대화 제목 표시
 * - 새 대화 버튼
 * - 옵션 메뉴 (더보기 / 삭제)
 * - 로딩 인디케이터
 *
 * 접근성 (WCAG 2.1 AA):
 *  - role="banner" (landmark)
 *  - aria-live 로딩 상태
 *  - focus-visible ring
 *  - Escape 메뉴 닫기
 *  - 모바일: 왼쪽 햄버거 버튼 공간 확보 (pl-14)
 */

import { useState, useEffect, useRef } from "react";
import type { Conversation } from "@/types/conversation";

interface ChatHeaderProps {
  conversation: Conversation;
  loading?: boolean;
  onNewConversation: () => void;
  onDeleteConversation?: () => void;
}

export default function ChatHeader({
  conversation,
  loading = false,
  onNewConversation,
  onDeleteConversation,
}: ChatHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowMenu(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showMenu]);

  return (
    <div
      role="banner"
      className="shrink-0 border-b border-gray-200 px-4 py-3 pl-14 md:pl-4 flex items-center justify-between bg-white"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-base font-semibold text-gray-900 truncate" title={conversation.title}>
            {conversation.title || "새 대화"}
          </h1>
          {loading && (
            <span
              role="status"
              aria-live="polite"
              className="inline-flex items-center gap-1 text-xs text-blue-600"
            >
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>응답 생성 중…</span>
            </span>
          )}
        </div>
        <time
          dateTime={conversation.created_at}
          className="text-xs text-gray-400 mt-0.5 block"
        >
          {new Date(conversation.created_at).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </time>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onNewConversation}
          className="hidden sm:block px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 transition-colors"
          aria-label="새 대화 시작"
        >
          + 새 대화
        </button>

        {/* 더보기 메뉴 */}
        <div className="relative">
          <button
            ref={menuButtonRef}
            onClick={() => setShowMenu((v) => !v)}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded-lg transition-colors"
            aria-label="대화 옵션 메뉴"
            aria-expanded={showMenu}
            aria-haspopup="menu"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden="true"
                onClick={() => setShowMenu(false)}
              />
              <div
                role="menu"
                aria-label="대화 옵션"
                className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 overflow-hidden"
              >
                {/* 모바일에서만 표시: 새 대화 (sm에서 숨겨진 버튼의 대체) */}
                <button
                  role="menuitem"
                  className="sm:hidden w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50 transition-colors"
                  onClick={() => {
                    setShowMenu(false);
                    onNewConversation();
                  }}
                >
                  새 대화
                </button>
                {onDeleteConversation && (
                  <button
                    role="menuitem"
                    className="w-full px-4 py-2 text-left text-xs text-red-600 hover:bg-red-50 focus:outline-none focus-visible:bg-red-50 transition-colors"
                    onClick={() => {
                      setShowMenu(false);
                      onDeleteConversation();
                    }}
                  >
                    대화 삭제
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
