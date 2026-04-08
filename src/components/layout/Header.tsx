"use client";

import Link from "next/link";
import { useUiStore } from "@/stores/uiStore";

export function Header() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

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
      <Link href="/documents" className="flex items-center gap-2 font-semibold text-gray-900 text-lg">
        <span className="text-blue-600">M</span>
        <span>Mimir</span>
      </Link>

      <div className="flex-1" />

      {/* 사용자 메뉴 (Phase 2 인증 연동 전 placeholder) */}
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-medium">
        U
      </div>
    </header>
  );
}
