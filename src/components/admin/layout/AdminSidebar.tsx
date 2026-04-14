"use client";

/**
 * Admin 사이드바 네비게이션 (Phase 7 → 14-9 확장).
 *
 * - config 기반 메뉴 구조 (향후 확장 용이)
 * - 접기/펼치기(collapsed) 상태 지원
 * - 모바일: 오버레이 드로어 (AdminLayout에서 제어)
 * - 현재 경로 하이라이트 + aria-current
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// ─── 메뉴 설정 (config 기반) ───

export interface NavItem {
  href: string;
  label: string;
  /** SVG path(s) — heroicons outline 24x24 viewBox */
  iconPaths: string[];
  /** 그룹 구분용 (optional divider before this item) */
  group?: string;
}

export const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    href: "/admin/dashboard",
    label: "대시보드",
    group: "개요",
    iconPaths: [
      "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    ],
  },
  {
    href: "/admin/users",
    label: "사용자 관리",
    group: "관리",
    iconPaths: [
      "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
    ],
  },
  {
    href: "/admin/organizations",
    label: "조직 관리",
    iconPaths: [
      "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
    ],
  },
  {
    href: "/admin/roles",
    label: "역할/권한 관리",
    iconPaths: [
      "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    ],
  },
  {
    href: "/admin/settings",
    label: "시스템 설정",
    group: "시스템",
    iconPaths: [
      "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
      "M15 12a3 3 0 11-6 0 3 3 0 016 0z",
    ],
  },
  {
    href: "/admin/monitoring",
    label: "모니터링",
    iconPaths: [
      "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    ],
  },
  {
    href: "/admin/alerts",
    label: "알림 관리",
    iconPaths: [
      "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
    ],
  },
  {
    href: "/admin/jobs",
    label: "배치 작업",
    group: "운영",
    iconPaths: [
      "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    ],
  },
  {
    href: "/admin/audit-logs",
    label: "감사 로그",
    iconPaths: [
      "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    ],
  },
  {
    href: "/admin/api-keys",
    label: "API 키 관리",
    iconPaths: [
      "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z",
    ],
  },
];

// ─── 네비게이션 아이콘 ───

function NavIcon({ paths }: { paths: string[] }) {
  return (
    <svg
      className="w-5 h-5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      {paths.map((d, i) => (
        <path
          key={i}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d={d}
        />
      ))}
    </svg>
  );
}

// ─── Props ───

interface AdminSidebarProps {
  collapsed?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ collapsed = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();

  let lastGroup = "";

  return (
    <aside
      className={cn(
        "flex flex-col bg-white border-r border-gray-200 overflow-y-auto transition-all duration-300 ease-out",
        collapsed ? "w-16" : "w-56",
      )}
      aria-label={collapsed ? "관리자 메뉴 (축소됨)" : "관리자 메뉴"}
    >
      {/* 그룹 헤더 + 메뉴 목록 */}
      <nav className="flex-1 py-3 px-2 space-y-0" aria-label="관리자 네비게이션">
        {ADMIN_NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin/dashboard" && pathname.startsWith(item.href + "/"));
          // 대시보드는 정확 경로 매칭
          const exactDashboard =
            item.href === "/admin/dashboard" &&
            (pathname === "/admin/dashboard" || pathname === "/admin");

          const active = item.href === "/admin/dashboard" ? exactDashboard : isActive;

          // 그룹 구분선
          const showGroup = item.group && item.group !== lastGroup;
          if (item.group) lastGroup = item.group;

          return (
            <div key={item.href}>
              {showGroup && !collapsed && (
                <h3 className="px-3 pt-4 pb-2">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">
                    {item.group}
                  </span>
                </h3>
              )}
              {showGroup && collapsed && (
                <div className="my-2 mx-2 border-t border-gray-100" />
              )}
              <Link
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg text-sm transition-all duration-200 min-h-[44px]",
                  collapsed ? "justify-center px-2.5 py-2.5" : "px-3 py-2.5",
                  active
                    ? "bg-red-50 text-red-700 font-semibold shadow-sm"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-inset",
                )}
              >
                <NavIcon paths={item.iconPaths} />
                {!collapsed && (
                  <span className="whitespace-nowrap truncate">{item.label}</span>
                )}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* 하단: 일반 화면 복귀 */}
      <div className={cn("border-t border-gray-200", collapsed ? "p-2" : "p-3")}>
        <Link
          href="/documents"
          className={cn(
            "flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900 transition-all duration-200 min-h-[44px] px-3 py-2.5 rounded-lg hover:bg-gray-100 font-medium",
            collapsed && "justify-center",
          )}
          title={collapsed ? "일반 화면으로 이동" : undefined}
        >
          <svg
            className="w-3.5 h-3.5 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          {!collapsed && <span>일반 화면으로 이동</span>}
        </Link>
      </div>
    </aside>
  );
}
