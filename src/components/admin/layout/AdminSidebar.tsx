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
import { AdminUserPanel } from "./AdminUserPanel";

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
  // ── S1 관리 ──
  {
    href: "/admin/dashboard",
    label: "대시보드",
    group: "S1 관리",
    iconPaths: [
      "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    ],
  },
  {
    href: "/admin/users",
    label: "사용자 관리",
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
  // ── S2: AI 플랫폼 ──
  {
    href: "/admin/ai-platform/providers",
    label: "모델·프로바이더",
    group: "AI 플랫폼",
    iconPaths: [
      "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    ],
  },
  {
    href: "/admin/ai-platform/prompts",
    label: "프롬프트 관리",
    iconPaths: [
      "M4 6h16M4 12h16M4 18h7",
    ],
  },
  {
    href: "/admin/ai-platform/capabilities",
    label: "Capabilities",
    iconPaths: [
      "M13 10V3L4 14h7v7l9-11h-7z",
    ],
  },
  {
    href: "/admin/ai-platform/usage",
    label: "비용·사용량",
    iconPaths: [
      "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    ],
  },
  // ── S2: 에이전트·Scope ──
  {
    href: "/admin/agents",
    label: "에이전트 관리",
    group: "에이전트·Scope",
    iconPaths: [
      "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
    ],
  },
  {
    href: "/admin/scope-profiles",
    label: "Scope Profile",
    iconPaths: [
      "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    ],
  },
  {
    href: "/admin/proposals",
    label: "제안 큐",
    iconPaths: [
      "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    ],
  },
  {
    href: "/admin/agent-activity",
    label: "에이전트 활동",
    iconPaths: [
      "M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    ],
  },
  // ── S2: 평가·추출 ──
  //   순서 의도: 추출 스키마·추출 검토 큐가 `document_types` FK 에 의존하므로
  //   "문서 유형" 을 맨 앞에 두어 선행 설정이 필요함을 네비상으로도 드러낸다.
  {
    href: "/admin/document-types",
    label: "문서 유형",
    group: "평가·추출",
    iconPaths: [
      "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    ],
  },
  {
    href: "/admin/golden-sets",
    label: "골든셋 관리",
    iconPaths: [
      "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
    ],
  },
  {
    href: "/admin/evaluations",
    label: "평가 결과",
    iconPaths: [
      "M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    ],
  },
  {
    href: "/admin/extraction-schemas",
    label: "추출 스키마",
    iconPaths: [
      "M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    ],
  },
  {
    href: "/admin/extraction-queue",
    label: "추출 검토 큐",
    iconPaths: [
      "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
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

  // F-05 시정(2026-04-18): 렌더 중 let 변수 변형(reassign after render) 금지 규칙
  //   (react-hooks/immutability) 을 준수하기 위해, 그룹 구분선을 map 상태가 아닌
  //   "이 항목이 해당 그룹의 첫 등장인가?" 로 선계산. ADMIN_NAV_ITEMS 는 모듈 상수이므로
  //   결과는 매 렌더에서 동일하여 useMemo 없이도 안전함.
  const firstIndexByGroup = new Map<string, number>();
  ADMIN_NAV_ITEMS.forEach((item, idx) => {
    if (item.group && !firstIndexByGroup.has(item.group)) {
      firstIndexByGroup.set(item.group, idx);
    }
  });

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-white border-r border-gray-200 transition-all duration-300 ease-out",
        collapsed ? "w-16" : "w-56",
      )}
      aria-label={collapsed ? "관리자 메뉴 (축소됨)" : "관리자 메뉴"}
    >
      {/* 그룹 헤더 + 메뉴 목록 (nav 만 스크롤) */}
      <nav className="flex-1 min-h-0 overflow-y-auto py-3 px-2 space-y-0" aria-label="관리자 네비게이션">
        {ADMIN_NAV_ITEMS.map((item, idx) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin/dashboard" && pathname.startsWith(item.href + "/"));
          // 대시보드는 정확 경로 매칭
          const exactDashboard =
            item.href === "/admin/dashboard" &&
            (pathname === "/admin/dashboard" || pathname === "/admin");

          const active = item.href === "/admin/dashboard" ? exactDashboard : isActive;

          // 그룹 구분선 — 사전 계산된 "그룹별 첫 인덱스" 와 비교 (let reassign 제거)
          const showGroup = !!item.group && firstIndexByGroup.get(item.group) === idx;

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
                    ? "bg-blue-50 text-blue-700 font-semibold shadow-sm"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset",
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

      {/* 하단: 관리자 사용자 패널 (일반 화면 복귀는 이 패널의 메뉴로 통합) */}
      <AdminUserPanel compact={collapsed} />
    </aside>
  );
}
