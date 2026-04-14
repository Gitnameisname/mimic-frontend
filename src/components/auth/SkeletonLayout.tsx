"use client";

/**
 * 인증 확인 중 스켈레톤 레이아웃 (Phase 14-8).
 *
 * 페이지 로딩 시 깜빡임을 방지하기 위한 placeholder UI.
 */

export function SkeletonLayout() {
  return (
    <div className="min-h-screen bg-gray-50" role="status" aria-live="polite" aria-label="페이지 로딩 중" aria-busy="true">
      {/* 상단 헤더 스켈레톤 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" aria-hidden="true" />
            <div className="flex-1" />
            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" aria-hidden="true" />
          </div>
        </div>
      </header>

      {/* 콘텐츠 스켈레톤 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* 제목 */}
          <div className="space-y-2">
            <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" aria-hidden="true" />
            <div className="h-4 w-80 bg-gray-100 rounded animate-pulse" aria-hidden="true" />
          </div>

          {/* 카드 블록 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" aria-hidden="true" />
            <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" aria-hidden="true" />
            <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" aria-hidden="true" />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="h-4 w-full bg-gray-100 rounded animate-pulse" aria-hidden="true" />
            <div className="h-4 w-2/3 bg-gray-100 rounded animate-pulse" aria-hidden="true" />
          </div>
        </div>
      </main>

      <span className="sr-only">페이지를 불러오는 중입니다</span>
    </div>
  );
}
