"use client";

/**
 * 계정 관리 레이아웃 (Phase 14-7).
 *
 * 좌측 사이드바 네비게이션 + 우측 컨텐츠 영역.
 * 모바일: 탭 네비게이션으로 전환.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AccountLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  {
    href: "/account/profile",
    label: "프로필",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    href: "/account/security",
    label: "보안",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    href: "/account/sessions",
    label: "세션",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
      </svg>
    ),
  },
] as const;

export function AccountLayout({ children }: AccountLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-50 transition-colors duration-200">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/"
              className="text-gray-400 hover:text-gray-600 transition-colors duration-150 p-2 rounded-lg hover:bg-gray-100 min-h-10 min-w-10 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-blue-500"
              aria-label="홈으로 이동"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">계정 설정</h1>
          </div>
        </div>
      </header>

      {/* 모바일 탭 네비게이션 */}
      <nav className="sm:hidden bg-white border-b border-gray-200 sticky top-[60px] z-30" aria-label="계정 메뉴">
        <div className="flex" role="tablist">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-blue-500 min-h-16",
                  isActive
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700",
                )}
                aria-current={isActive ? "page" : undefined}
                role="tab"
                aria-selected={isActive}
              >
                {item.icon}
                <span className="line-clamp-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 메인 컨텐츠 */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex gap-6 lg:gap-8">
          {/* 데스크탑 사이드바 */}
          <aside className="hidden sm:block w-40 lg:w-48 flex-shrink-0" aria-label="계정 메뉴" role="complementary">
            <nav className="space-y-1 sticky top-20" aria-label="계정 설정 네비게이션">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-blue-500 min-h-10",
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                    )}
                    aria-current={isActive ? "page" : undefined}
                  >
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* 컨텐츠 영역 */}
          <main className="flex-1 min-w-0" aria-label="페이지 콘텐츠">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
