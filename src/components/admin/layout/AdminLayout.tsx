"use client";

/**
 * Admin 전체 레이아웃 (Phase 7 → 14-9 확장).
 *
 * - 데스크탑: 사이드바(접기/펼치기) + 헤더 + 콘텐츠
 * - 모바일: 햄버거 → 오버레이 드로어
 * - AuthGuard: ORG_ADMIN 이상만 접근
 */

import { useCallback, useEffect, useState } from "react";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import { ToastContainer } from "@/components/feedback/Toast";
import { AuthGuard } from "@/components/auth/AuthGuard";

interface Props {
  children: React.ReactNode;
}

export function AdminLayout({ children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // ESC로 모바일 메뉴 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && mobileOpen) {
        setMobileOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  // 모바일 메뉴 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <AuthGuard requiredRole="ORG_ADMIN">
      <div className="flex flex-col h-screen overflow-hidden">
        <AdminHeader
          onToggleMobile={() => setMobileOpen((v) => !v)}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          collapsed={collapsed}
        />

        <div className="flex flex-1 overflow-hidden relative" role="main">
          {/* 데스크탑 사이드바 */}
          <div className="hidden lg:block shrink-0">
            <AdminSidebar collapsed={collapsed} />
          </div>

          {/* 모바일 오버레이 */}
          {mobileOpen && (
            <>
              {/* 배경 딤 */}
              <div
                className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                onClick={closeMobile}
                aria-hidden="true"
                role="presentation"
              />
              {/* 드로어 */}
              <div className="fixed inset-y-0 left-0 z-50 lg:hidden w-64 max-w-[85vw] shadow-xl">
                <AdminSidebar onClose={closeMobile} />
              </div>
            </>
          )}

          {/* 콘텐츠 */}
          <main className="flex-1 overflow-y-auto bg-gray-50">{children}</main>
        </div>

        <ToastContainer />
      </div>
    </AuthGuard>
  );
}
