"use client";

/**
 * ConversationItem — 사이드바의 단일 대화 항목.
 *
 * - 제목 (최대 2줄 ellipsis)
 * - 상대 시간 표시 ("2시간 전")
 * - hover 시 옵션 메뉴 (⋮)
 * - 상태 배지 (archived)
 * - 인라인 제목 수정 지원
 *
 * 접근성 (WCAG 2.1 AA):
 *  - Enter/Space 키로 대화 선택
 *  - tabIndex=0 (키보드 접근 가능)
 *  - aria-current="true" 선택된 항목
 *  - focus-visible ring
 *  - 메뉴 버튼 aria-label + aria-expanded
 *  - 드롭다운 Escape 닫기
 */

import { useState, useRef, useEffect } from "react";
import type { Conversation } from "@/types/conversation";

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onSelect: () => void;
  onRename?: (id: string, newTitle: string) => void;
  onArchive?: (id: string) => void;
  onDelete?: (id: string) => void;
  onExport?: (id: string) => void;
}

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "방금";
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function ConversationItem({
  conversation,
  isSelected,
  onSelect,
  onRename,
  onArchive,
  onDelete,
  onExport,
}: ConversationItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  // 메뉴 Escape 닫기
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

  const handleRenameConfirm = () => {
    if (editValue.trim() && editValue !== conversation.title) {
      onRename?.(conversation.id, editValue.trim());
    }
    setEditing(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleRenameConfirm();
    if (e.key === "Escape") { setEditing(false); setEditValue(conversation.title); }
  };

  const handleItemKeyDown = (e: React.KeyboardEvent) => {
    if (editing) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  const isArchived = conversation.status === "archived";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={isSelected ? "true" : undefined}
      aria-label={`대화: ${conversation.title || "새 대화"}, ${relativeTime(conversation.updated_at)}`}
      className={`group relative flex items-start px-3 py-2.5 rounded-lg cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
        isSelected
          ? "bg-blue-50 border-l-2 border-l-blue-500"
          : "hover:bg-gray-50 border-l-2 border-l-transparent"
      }`}
      onClick={() => !editing && onSelect()}
      onKeyDown={handleItemKeyDown}
    >
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleRenameConfirm}
            onKeyDown={handleRenameKeyDown}
            className="w-full text-xs font-medium px-1 py-0.5 border border-blue-300 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            onClick={(e) => e.stopPropagation()}
            aria-label="대화 제목 편집"
            maxLength={100}
          />
        ) : (
          <p className={`text-xs font-medium leading-tight line-clamp-2 ${
            isSelected ? "text-blue-900" : "text-gray-700"
          }`}>
            {conversation.title || "새 대화"}
          </p>
        )}

        <div className="flex items-center gap-1.5 mt-1">
          <time
            dateTime={conversation.updated_at}
            className="text-xs text-gray-400"
          >
            {relativeTime(conversation.updated_at)}
          </time>
          {isArchived && (
            <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full" aria-label="보관됨">
              보관됨
            </span>
          )}
        </div>
      </div>

      {/* 옵션 버튼 */}
      {!editing && (
        <div className="shrink-0 ml-1">
          <button
            ref={menuButtonRef}
            onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
            className="p-1 text-gray-300 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded transition-colors"
            aria-label={`${conversation.title || "대화"} 옵션 메뉴`}
            aria-expanded={showMenu}
            aria-haspopup="menu"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        </div>
      )}

      {/* 드롭다운 메뉴 */}
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden="true"
            onClick={(e) => { e.stopPropagation(); setShowMenu(false); }}
          />
          <div
            role="menu"
            aria-label="대화 옵션"
            className="absolute right-0 top-8 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden py-1"
          >
            {onRename && (
              <button
                role="menuitem"
                className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  setEditing(true);
                }}
              >
                이름 바꾸기
              </button>
            )}
            {onArchive && (
              <button
                role="menuitem"
                className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onArchive(conversation.id);
                }}
              >
                {isArchived ? "보관 해제" : "보관하기"}
              </button>
            )}
            {onExport && (
              <button
                role="menuitem"
                className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onExport(conversation.id);
                }}
              >
                JSON 내보내기
              </button>
            )}
            <button
              role="menuitem"
              className="w-full px-3 py-2 text-left text-xs text-gray-300 cursor-not-allowed"
              disabled
              aria-disabled="true"
              title="곧 출시"
            >
              공유 (출시 예정)
            </button>
            {onDelete && (
              <button
                role="menuitem"
                className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 focus:outline-none focus-visible:bg-red-50 transition-colors border-t border-gray-100 mt-1 pt-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  onDelete(conversation.id);
                }}
              >
                삭제하기
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
