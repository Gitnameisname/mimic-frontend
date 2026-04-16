"use client";

/**
 * Admin 헤더 (Phase 7 → 14-9 AuthContext 통합).
 *
 * - 사용자 이름 표시 (useAuth)
 * - 로그아웃 버튼
 * - 모바일 햄버거 메뉴 토글
 * - 사이드바 접기/펼치기 토글
 */

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface AdminHeaderProps {
  onToggleMobile?: () => void;
  onToggleCollapse?: () => void;
  collapsed?: boolean;
}

export function AdminHeader({
  onToggleMobile,
  onToggleCollapse,
  collapsed,
}: AdminHeaderProps) {
  const { user, logout, isAuthenticated } = useAuth();

  const displayName = user?.display_name || user?.email || "관리자";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center px-4 gap-3 shrink-0 z-30 shadow-sm" role="banner">
      {/* 모바일 햄버거 */}
      <button
        type="button"
        onClick={onToggleMobile}
        className="lg:hidden p-2.5 -ml-2.5 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 active:scale-95"
        aria-label="관리자 메뉴 열기"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 데스크탑 접기/펼치기 */}
      <button
        type="button"
        onClick={onToggleCollapse}
        className="hidden lg:block p-2.5 -ml-2.5 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-all duration-200 active:scale-95"
        aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        aria-pressed={collapsed}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          {collapsed ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          )}
        </svg>
      </button>

      {/* Logo */}
      <Link
        href="/admin/dashboard"
        className="flex items-center gap-2 font-bold text-gray-900 text-lg min-h-[44px] rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
      >
        <span className="text-red-600">M</span>
        <span>Mimir</span>
      </Link>
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-600 text-white">
        Admin
      </span>

      <div className="flex-1" />

      {/* User UI로 돌아가기 */}
      <Link
        href="/documents"
        className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1"
        aria-label="User UI로 돌아가기"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>User UI</span>
      </Link>

      {/* 사용자 정보 + 로그아웃 */}
      {isAuthenticated && user && (
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:block text-sm text-gray-700 font-medium truncate max-w-[160px]">
            {displayName}
          </span>
          <div
            className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-medium shrink-0"
            aria-hidden="true"
            role="img"
            aria-label={displayName}
          >
            {initial}
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="계정에서 로그아웃"
            className="text-sm text-gray-700 hover:text-gray-900 px-3 py-2 rounded hover:bg-red-50 transition-all duration-200 font-medium active:scale-95"
          >
            로그아웃
          </button>
        </div>
      )}

      {!isAuthenticated && (
        <span className="text-xs text-gray-400">관리자 모드</span>
      )}
    </header>
  );
}
