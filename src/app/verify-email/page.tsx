"use client";

/**
 * 이메일 인증 결과 페이지 (Phase 14-6).
 *
 * URL: /verify-email?token=...
 * 페이지 로드 시 자동으로 인증 API를 호출한다.
 */

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { authApi } from "@/lib/api/auth";

type VerifyState = "loading" | "success" | "error";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [state, setState] = useState<VerifyState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setState("error");
      setErrorMessage("유효하지 않은 인증 링크입니다.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await authApi.verifyEmail({ token });
        if (!cancelled) setState("success");
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "이메일 인증에 실패했습니다";
        setErrorMessage(msg);
        setState("error");
      }
    })();

    return () => { cancelled = true; };
  }, [token]);

  if (state === "loading") {
    return (
      <AuthLayout title="이메일 인증">
        <div className="text-center py-8 space-y-4" role="status" aria-live="polite" aria-label="로딩 상태">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" aria-hidden="true" />
          <p className="text-sm text-gray-500">이메일 인증 처리 중...</p>
        </div>
      </AuthLayout>
    );
  }

  if (state === "success") {
    return (
      <AuthLayout title="이메일 인증 완료">
        <div className="text-center space-y-4" role="status" aria-live="polite">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-2" aria-hidden="true">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">
            이메일 인증이 완료되었습니다.
          </p>
          <Link
            href="/login"
            className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500 rounded px-2 py-1 transition-colors duration-150"
          >
            로그인 페이지로 이동
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="인증 실패">
      <div className="text-center space-y-4" role="alert" aria-live="assertive">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-2" aria-hidden="true">
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="text-sm text-red-600 break-words">{errorMessage}</p>
        <Link
          href="/login"
          className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          로그인 페이지로 이동
        </Link>
      </div>
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="이메일 인증">
          <div className="flex flex-col items-center justify-center py-8 gap-3" role="status" aria-live="polite">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" aria-hidden="true" />
            <p className="text-xs text-gray-500">로딩 중...</p>
          </div>
        </AuthLayout>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
