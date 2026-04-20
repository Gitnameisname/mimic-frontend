"use client";

import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { ToastContainer } from "@/components/feedback/Toast";
import { AuthGuard } from "@/components/auth/AuthGuard";

interface Props {
  children: React.ReactNode;
}

/**
 * App Shell
 * - Fixed grid:  header(고정) + [sidebar | main]
 * - Mobile 에서는 사이드바를 overlay 로 전환 (Sidebar 내부에서 분기)
 * - main 영역은 스크롤 컨테이너 1개만 유지 (배경은 surface-muted)
 */
export function AppLayout({ children }: Props) {
  return (
    <AuthGuard>
      <div className="flex h-screen flex-col overflow-hidden bg-[var(--color-surface-muted)] text-[var(--color-text)]">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto overscroll-contain">
            {children}
          </main>
        </div>
        <ToastContainer />
      </div>
    </AuthGuard>
  );
}
