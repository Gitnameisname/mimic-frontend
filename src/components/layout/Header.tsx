"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useCallback, useEffect } from "react";
import { useUiStore } from "@/stores/uiStore";

export function Header() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const router = useRouter();
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
    [searchValue, router]
  );

  // 단축키: Cmd+K / Ctrl+K 로 검색 포커스
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center px-4 gap-3 shrink-0 z-30">
      {/* Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 transition-colors"
        aria-label="사이드바 토글"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Logo */}
      <Link href="/documents" className="flex items-center gap-2 font-semibold text-gray-900 text-lg shrink-0">
        <span className="text-blue-600">M</span>
        <span>Mimir</span>
      </Link>

      {/* 글로벌 검색 바 */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl mx-4">
        <div
          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors ${
            searchFocused
              ? "border-blue-400 bg-white shadow-sm"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          <svg
            className="w-4 h-4 text-gray-400 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
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
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none min-w-0"
          />
          {!searchFocused && (
            <kbd className="hidden sm:flex items-center gap-0.5 text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5 shrink-0">
              <span>⌘</span><span>K</span>
            </kbd>
          )}
        </div>
      </form>

      {/* 사용자 메뉴 (Phase 2 인증 연동 전 placeholder) */}
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-medium shrink-0">
        U
      </div>
    </header>
  );
}
