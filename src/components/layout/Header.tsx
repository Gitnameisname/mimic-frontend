"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useCallback, useEffect } from "react";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";
// S3 Phase 3 FG 3-3: 알림 종 아이콘
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { useAuthz } from "@/hooks/useAuthz";

/**
 * 상단 헤더
 * - 사이드바 토글 / 로고 / 글로벌 검색
 * - 사용자 메뉴는 좌측 사이드바 하단(`SidebarUserPanel`)으로 이동 (일반적 UX 컨벤션)
 */
export function Header() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const router = useRouter();
  const { actorId } = useAuthz();
  const isAuthenticated = Boolean(actorId);

  const [searchValue, setSearchValue] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const q = searchValue.trim();
      if (q) {
        router.push(`/search?q=${encodeURIComponent(q)}`);
        setSearchValue("");
        inputRef.current?.blur();
      }
    },
    [searchValue, router],
  );

  // 단축키: Cmd+K / Ctrl+K 로 검색 포커스
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <header
      className={cn(
        "h-[var(--app-header-h)] shrink-0",
        "border-b border-[var(--color-border)] bg-[var(--color-surface)]",
        "flex items-center gap-2 px-3 sm:px-4",
        "z-30",
      )}
    >
      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className={cn(
          "p-2 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]",
          "transition-colors",
        )}
        aria-label="사이드바 토글"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.6}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Logo */}
      <Link
        href="/documents"
        className="flex items-center gap-2 shrink-0 font-semibold text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded-md px-1"
        aria-label="Mimir 홈으로"
      >
        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-brand-600)] text-white text-sm font-bold shadow-[var(--shadow-soft)]"
        >
          M
        </span>
        <span className="text-base sm:text-lg tracking-tight">Mimir</span>
      </Link>

      {/* 글로벌 검색 바 */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-2xl mx-2 sm:mx-4">
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors",
            searchFocused
              ? "border-[var(--color-brand-400)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]"
              : "border-transparent bg-[var(--color-surface-subtle)] hover:bg-[var(--color-border)]/60",
          )}
        >
          <svg
            className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="문서 검색..."
            aria-label="문서 검색"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder-[var(--color-text-subtle)] outline-none"
          />
          {!searchFocused && (
            <kbd
              aria-hidden="true"
              className="hidden sm:flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-subtle)] bg-[var(--color-surface)] border border-[var(--color-border)] shrink-0"
            >
              <span>⌘</span>
              <span>K</span>
            </kbd>
          )}
        </div>
      </form>

      {/* S3 Phase 3 FG 3-3: 알림 종 아이콘 (인증된 사용자만) */}
      <NotificationsBell enabled={isAuthenticated} />
    </header>
  );
}
