/**
 * NotificationsBell — S3 Phase 3 FG 3-3.
 *
 * 헤더 우상단에 종 아이콘 + 미읽음 카운트 뱃지.
 * 클릭 시 드롭다운으로 최근 알림 N건 표시.
 *   - 폴링 30s (useUnreadNotificationCount)
 *   - 클릭 시 알림 list fetch (useNotifications enabled=open)
 *   - 알림 클릭 → 해당 문서로 이동 + read 처리
 */

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/utils";
import {
  useMarkNotificationsRead,
  useNotifications,
  useUnreadNotificationCount,
} from "@/features/documents/hooks/useAnnotations";

interface Props {
  /** 인증된 사용자만 종 아이콘 표시 (anonymous 는 부모가 mount 안 함) */
  enabled?: boolean;
  className?: string;
}

export function NotificationsBell({ enabled = true, className }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const unreadQ = useUnreadNotificationCount(enabled);
  const listQ = useNotifications({ enabled: enabled && open });
  const markReadMut = useMarkNotificationsRead();

  const unreadCount = unreadQ.data ?? 0;

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!enabled) return null;

  const handleNotificationClick = (id: string, documentId: string | undefined) => {
    if (documentId) {
      // read 처리 → 라우팅 (Link 가 처리)
      markReadMut.mutate([id]);
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
        aria-label={`알림 ${unreadCount > 0 ? `(${unreadCount}개 미읽음)` : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
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
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
            aria-hidden="true"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 max-h-[60vh] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg z-50"
          role="menu"
          aria-label="알림 목록"
        >
          <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">알림</span>
            {listQ.data && listQ.data.length > 0 && (
              <button
                type="button"
                className="text-xs text-blue-700 hover:text-blue-800"
                onClick={() => {
                  const ids = (listQ.data ?? [])
                    .filter((n) => !n.read_at)
                    .map((n) => n.id);
                  if (ids.length > 0) {
                    markReadMut.mutate(ids);
                  }
                }}
              >
                모두 읽음
              </button>
            )}
          </div>

          {listQ.isLoading ? (
            <div className="px-4 py-6 text-center text-xs text-gray-400">
              불러오는 중…
            </div>
          ) : listQ.isError ? (
            <div className="px-4 py-6 text-center text-xs text-red-600">
              알림을 불러올 수 없습니다.
            </div>
          ) : !listQ.data || listQ.data.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-gray-400">
              새 알림이 없습니다.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {listQ.data.map((n) => {
                const docId =
                  typeof n.payload?.document_id === "string"
                    ? (n.payload.document_id as string)
                    : undefined;
                const annotationId =
                  typeof n.payload?.annotation_id === "string"
                    ? (n.payload.annotation_id as string)
                    : undefined;
                const authorId =
                  typeof n.payload?.author_id === "string"
                    ? (n.payload.author_id as string)
                    : "사용자";
                const snippet =
                  typeof n.payload?.snippet === "string"
                    ? (n.payload.snippet as string)
                    : "";
                const href = docId
                  ? `/documents/${docId}${annotationId ? `#annotation-${annotationId}` : ""}`
                  : "#";
                return (
                  <li key={n.id}>
                    <Link
                      href={href}
                      onClick={() => handleNotificationClick(n.id, docId)}
                      className={cn(
                        "block px-4 py-2.5 hover:bg-gray-50",
                        !n.read_at && "bg-blue-50/50",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read_at && (
                          <span
                            className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0"
                            aria-label="미읽음"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-gray-700">
                            {n.kind === "annotation.mention" ? (
                              <>
                                <span className="font-medium">{authorId}</span>
                                님이 회원님을 멘션했습니다
                              </>
                            ) : (
                              <span>{n.kind}</span>
                            )}
                          </div>
                          {snippet && (
                            <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                              {snippet}
                            </div>
                          )}
                          <div className="text-[10px] text-gray-400 mt-1">
                            {relativeTime(n.created_at)}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
