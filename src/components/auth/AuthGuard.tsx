"use client";

/**
 * AuthGuard — 라우트 보호 컴포넌트 (Phase 14-8).
 *
 * 기능:
 *  - 미인증 시 /login?redirect=... 리다이렉트
 *  - 권한 부족 시 403 Forbidden 표시
 *  - 인증 확인 중 스켈레톤 UI 표시 (깜빡임 방지)
 *
 * 사용법:
 *  <AuthGuard>보호된 페이지</AuthGuard>
 *  <AuthGuard requiredRole="AUTHOR">작성자 이상만</AuthGuard>
 */

import { useEffect, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { SkeletonLayout } from "@/components/auth/SkeletonLayout";
import { ForbiddenContent } from "@/components/auth/ForbiddenContent";

interface AuthGuardProps {
  children: ReactNode;
  /** 최소 필요 역할. 지정하면 역할 계층에 따라 확인한다. */
  requiredRole?: string;
}

export function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { isAuthenticated, isLoading, hasMinimumRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const redirect = encodeURIComponent(pathname);
      router.replace(`/login?redirect=${redirect}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  // 인증 확인 중
  if (isLoading) {
    return <SkeletonLayout />;
  }

  // 미인증 (리다이렉트 중)
  if (!isAuthenticated) {
    return <SkeletonLayout />;
  }

  // 권한 부족
  if (requiredRole && !hasMinimumRole(requiredRole)) {
    return <ForbiddenContent />;
  }

  return <>{children}</>;
}
