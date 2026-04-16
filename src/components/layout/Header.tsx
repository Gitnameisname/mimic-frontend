"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useCallback, useEffect } from "react";
import { useUiStore } from "@/stores/uiStore";
import { useAuth } from "@/contexts/AuthContext";

export function Header() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const router = useRouter();
  const { user, logout, isAuthenticated, hasMinimumRole } = useAuth();

  const [searchValue, setSearchValue] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdmin = hasMinimumRole("ORG_ADMIN");
  const displayName = user?.display_name || user?.email || "User";
  const initial = displayName.charAt(0).toUpperCase();

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

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    setIsMenuOpen(false);
    try {
      await logout();
      router.push("/login");
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout, router]);

  const handleMenuNavigate = useCallback(
    (path: string) => {
      setIsMenuOpen(false);
      router.push(path);
    },
    [router]
  );

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  // ESC 키로 메뉴 닫기
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

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

      {/* 사용자 메뉴 */}
      {isAuthenticated && user ? (
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setIsMenuOpen((v) => !v)}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
            aria-label="사용자 메뉴 열기"
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-medium">
              {initial}
            </div>
            <span className="hidden sm:block text-sm text-gray-700 font-medium max-w-[120px] truncate">
              {displayName}
            </span>
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-1.5 w-52 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50"
            >
              {/* 사용자 정보 */}
              <div className="px-4 py-2.5 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">{user.role_name}</p>
              </div>

              {/* 메뉴 항목 */}
              <button
                role="menuitem"
                type="button"
                onClick={() => handleMenuNavigate("/account/profile")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                프로필
              </button>
              <button
                role="menuitem"
                type="button"
                onClick={() => handleMenuNavigate("/account")}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                계정 설정
              </button>

              {/* Admin 역할 전용 */}
              {isAdmin && (
                <>
                  <hr className="my-1 border-gray-100" />
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => handleMenuNavigate("/admin")}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    관리자 설정
                  </button>
                </>
              )}

              <hr className="my-1 border-gray-100" />
              <button
                role="menuitem"
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-sm font-medium shrink-0">
          U
        </div>
      )}
    </header>
  );
}
