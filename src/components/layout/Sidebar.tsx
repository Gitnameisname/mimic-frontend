"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useUiStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";
import { SidebarUserPanel } from "./SidebarUserPanel";
import { SidebarExploreTree } from "@/features/explore/SidebarExploreTree";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/documents",
    label: "문서",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.6}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    href: "/reviews",
    label: "검토 대기",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.6}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
  },
  {
    href: "/extractions",
    label: "추출 검토",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.6}
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
  },
  {
    href: "/rag",
    label: "AI 질의",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.6}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
    ),
  },
];

/** 768px 미만이면 overlay 모드로 전환 */
function useIsMobile(breakpointPx = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [breakpointPx]);
  return isMobile;
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const setCollapsed = useUiStore((s) => s.setSidebarCollapsed);
  const pathname = usePathname();
  const isMobile = useIsMobile();

  // 경로 변경 시 모바일에서는 자동으로 닫기
  useEffect(() => {
    if (isMobile) setCollapsed(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isMobile]);

  // ESC 로 모바일 오버레이 닫기
  useEffect(() => {
    if (!isMobile || collapsed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCollapsed(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobile, collapsed, setCollapsed]);

  // 데스크탑:  expanded(w-56)  /  rail(w-15, icon-only)
  // 모바일:    overlay (open=width + backdrop,  closed=hidden)
  if (isMobile) {
    return (
      <>
        {!collapsed && (
          <button
            type="button"
            aria-label="사이드바 닫기"
            onClick={() => setCollapsed(true)}
            className="fixed inset-0 top-[var(--app-header-h)] z-40 bg-slate-900/40 backdrop-blur-[1px]"
          />
        )}
        <aside
          aria-label="기본 내비게이션"
          className={cn(
            "fixed z-50 top-[var(--app-header-h)] bottom-0 left-0 w-[var(--app-sidebar-w)]",
            "border-r border-[var(--color-border)] bg-[var(--color-surface)]",
            "shadow-[var(--shadow-pop)] transition-transform duration-200 ease-out",
            "flex flex-col",
            collapsed ? "-translate-x-full" : "translate-x-0",
          )}
        >
          <SidebarNav pathname={pathname} compact={false} />
          {/* S3 Phase 2 FG 2-1: 탐색 섹션 (컬렉션 + 폴더) */}
          <SidebarExploreTree compact={false} />
          <SidebarUserPanel compact={false} />
        </aside>
      </>
    );
  }

  return (
    <aside
      aria-label="기본 내비게이션"
      className={cn(
        "shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)]",
        "flex flex-col transition-[width] duration-200 ease-out overflow-hidden",
        collapsed ? "w-[var(--app-sidebar-w-rail)]" : "w-[var(--app-sidebar-w)]",
      )}
    >
      <SidebarNav pathname={pathname} compact={collapsed} />
      {/* S3 Phase 2 FG 2-1: 탐색 섹션 (컬렉션 + 폴더) */}
      <SidebarExploreTree compact={collapsed} />
      <SidebarUserPanel compact={collapsed} />
    </aside>
  );
}

function SidebarNav({ pathname, compact }: { pathname: string; compact: boolean }) {
  return (
    // S3 Phase 2 FG 2-1: 하단에 탐색 섹션이 추가되면서 flex-1 제거. content size 기반.
    <nav className="shrink-0 py-3 px-2 space-y-1">
      {NAV_ITEMS.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            title={compact ? item.label : undefined}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-md text-sm transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]",
              compact ? "justify-center px-0 py-2" : "justify-start px-2.5 py-2",
              active
                ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)] font-semibold"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]",
            )}
          >
            {/* 활성 표시 바 (expanded 에서만) */}
            {active && !compact && (
              <span
                aria-hidden="true"
                className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-[var(--color-brand-600)]"
              />
            )}
            {/* compact(레일) 모드일 때 아이콘 주변을 정사각형 rounded box로 강조 */}
            {compact ? (
              <span
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-md",
                  active
                    ? "bg-[var(--color-brand-600)] text-white shadow-[var(--shadow-soft)]"
                    : "text-inherit",
                )}
              >
                {item.icon}
              </span>
            ) : (
              <span className="shrink-0">{item.icon}</span>
            )}
            {!compact && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
