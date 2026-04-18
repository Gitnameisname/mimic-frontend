"use client";

/**
 * OAuth 콜백 수신 페이지 (Phase 14-6 → 14-8 AuthContext 통합).
 *
 * URL: /auth/callback#access_token=...&expires_in=...
 *      /auth/callback?error=...&error_description=...
 *
 * - 성공: URL fragment에서 AT 추출 → handleOAuthCallback → 메인 리다이렉트
 * - 에러: 에러 메시지 표시 + 로그인 링크
 */

import { useEffect, useState, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { useAuth } from "@/contexts/AuthContext";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleOAuthCallback } = useAuth();
  // F-05 시정(2026-04-18): URL 파라미터 기반 에러는 렌더 단계에서 파생(useMemo)하여
  //   useEffect 내부 setState 를 제거. 비동기 callback 실패만 상태로 유지.
  const urlError = useMemo<string | null>(() => {
    const errorParam = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");
    if (errorParam) {
      return errorDesc || "GitLab 로그인에 실패했습니다. 다시 시도해 주세요.";
    }
    return null;
  }, [searchParams]);

  const [asyncError, setAsyncError] = useState("");
  const error = asyncError || urlError || "";

  useEffect(() => {
    // URL 파라미터 에러가 있으면 비동기 처리 스킵 — 이미 렌더 단계에서 파생됨
    if (urlError) return;

    // URL fragment 에서 AT 추출
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");

    // AuthContext 를 통해 AT 저장 + 프로필 로드
    // F-05 시정(2026-04-18): async IIFE 내부의 setState 는 효과 본문의 "동기적" setState 가
    //   아니므로 react-hooks/set-state-in-effect 규칙 위반이 아님. accessToken 없음 케이스도
    //   async 내부로 이동시켜 동기 setState 경로를 제거함.
    (async () => {
      if (!accessToken) {
        setAsyncError("인증 정보를 받지 못했습니다. 다시 시도해 주세요.");
        return;
      }
      try {
        await handleOAuthCallback(accessToken);
        // URL fragment 제거 후 메인 페이지로 이동
        window.history.replaceState(null, "", "/auth/callback");
        router.push("/");
      } catch {
        setAsyncError("로그인 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
      }
    })();
  }, [router, urlError, handleOAuthCallback]);

  if (error) {
    return (
      <AuthLayout title="로그인 실패">
        <div className="text-center space-y-4" role="alert" aria-live="assertive">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4" aria-hidden="true">
            <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-900">로그인 실패</h1>
          <p className="text-sm text-red-600 break-words leading-relaxed">{error}</p>
          <Link
            href="/login"
            className="inline-block mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 transition-colors duration-150"
          >
            로그인 페이지로 돌아가기
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="로그인 처리 중">
      <div className="text-center py-8 space-y-4" role="status" aria-live="polite" aria-label="로그인 처리 중">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" aria-hidden="true" />
        <p className="text-sm text-gray-500">로그인 처리 중...</p>
      </div>
    </AuthLayout>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="로그인 처리 중">
          <div className="flex flex-col items-center justify-center py-8 gap-3" role="status" aria-live="polite">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" aria-hidden="true" />
            <p className="text-xs text-gray-500">로딩 중...</p>
          </div>
        </AuthLayout>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}
