"use client";

/**
 * Admin 헤더 (Phase 7 → 14-9 AuthContext 통합 → UI 개선 2026-04-20).
 *
 * - 모바일 햄버거 메뉴 토글 / 사이드바 접기·펼치기 토글
 * - 로고 + Admin 뱃지
 * - 관리자 사용자 메뉴(아바타/이름/로그아웃) + 일반 화면 복귀는 사이드바 하단 `AdminUserPanel` 로 이동
 */

import Link from "next/link";

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
        className="flex items-center gap-2 font-bold text-gray-900 text-lg min-h-[44px] rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <span className="text-blue-600">M</span>
        <span>Mimir</span>
      </Link>
      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">
        Admin
      </span>

      <div className="flex-1" />
    </header>
  );
}
