"use client";

/**
 * 403 Forbidden 콘텐츠 컴포넌트 (Phase 14-8).
 *
 * 권한 부족 시 AuthGuard 및 /forbidden 페이지에서 표시.
 */

import Link from "next/link";

export function ForbiddenContent() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4" aria-hidden="true">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">접근 권한 없음</h1>
        <p className="text-sm text-gray-500 mb-6">
          이 페이지에 접근할 권한이 없습니다. 관리자에게 문의하거나 다른 계정으로 로그인해 주세요.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 transition-colors duration-150"
          >
            홈으로 이동
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 transition-colors duration-150"
          >
            다시 로그인
          </Link>
        </div>
      </div>
    </main>
  );
}
