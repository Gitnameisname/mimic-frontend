"use client";

/**
 * 루트 페이지 — 인증 상태에 따라 로그인 화면 또는 문서 목록으로 분기한다.
 *
 * - isLoading: AuthContext 가 silent-refresh 수행 중 → SkeletonLayout
 * - isAuthenticated=true → /documents
 * - isAuthenticated=false → /login
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { SkeletonLayout } from "@/components/auth/SkeletonLayout";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      router.replace("/documents");
    } else {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  return <SkeletonLayout />;
}
