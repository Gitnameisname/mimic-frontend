"use client";

/**
 * /account/* 공통 레이아웃 (Phase 14-7 → 14-8 AuthGuard 적용).
 *
 * 인증된 사용자만 계정 관리 페이지에 접근 가능.
 */

import { AuthGuard } from "@/components/auth/AuthGuard";
import { AccountLayout } from "@/components/account/AccountLayout";

export default function AccountRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AccountLayout>{children}</AccountLayout>
    </AuthGuard>
  );
}
