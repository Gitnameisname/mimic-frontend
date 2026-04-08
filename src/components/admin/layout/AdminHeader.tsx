"use client";

import Link from "next/link";

export function AdminHeader() {
  return (
    <header className="h-14 border-b border-gray-200 bg-white flex items-center px-4 gap-3 shrink-0 z-30">
      {/* Logo */}
      <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold text-gray-900 text-lg">
        <span className="text-red-600">M</span>
        <span>Mimir</span>
      </Link>
      <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
        Admin
      </span>

      <div className="flex-1" />

      <span className="text-xs text-gray-400">관리자 모드</span>
      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 text-sm font-medium">
        A
      </div>
    </header>
  );
}
