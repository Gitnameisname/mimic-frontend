"use client";

/**
 * 로그인 페이지 (Phase 14-6 → 14-8 AuthContext 통합).
 *
 * - 이메일/비밀번호 로그인 (useAuth().login)
 * - GitLab OAuth 로그인 (useAuth().loginWithGitLab)
 * - 비밀번호 재설정 / 회원가입 링크
 * - ?redirect= 파라미터로 로그인 후 원래 페이지 복귀
 */

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { GitLabButton } from "@/components/auth/GitLabButton";
import { Button } from "@/components/button/Button";
import { loginSchema, type LoginFormData } from "@/lib/validations/auth";
import { useAuth } from "@/contexts/AuthContext";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginWithGitLab, isAuthenticated } = useAuth();
  const [form, setForm] = useState<LoginFormData>({ identifier: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  // 이미 인증된 사용자 → redirect 또는 홈으로 이동
  useEffect(() => {
    if (isAuthenticated) {
      const raw = searchParams.get("redirect");
      const safeRedirect = raw && decodeURIComponent(raw).startsWith("/") ? decodeURIComponent(raw) : "/";
      router.replace(safeRedirect);
    }
  }, [isAuthenticated, router, searchParams]);

  function validate(): boolean {
    const result = loginSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginFormData;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    setLoading(true);
    try {
      await login(form.identifier, form.password);
      // 로그인 성공 → redirect 파라미터 또는 홈으로 이동 (외부 URL 차단)
      const raw = searchParams.get("redirect");
      const safeRedirect = raw && decodeURIComponent(raw).startsWith("/") ? decodeURIComponent(raw) : "/";
      router.push(safeRedirect);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "로그인에 실패했습니다";
      setServerError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleGitLabLogin() {
    loginWithGitLab();
  }

  return (
    <AuthLayout title="Mimir" subtitle="로그인하여 시작하세요">
      <form onSubmit={handleSubmit} className="space-y-6" noValidate aria-busy={loading}>
        {serverError && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium flex items-start gap-3"
          >
            <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{serverError}</span>
          </div>
        )}

        <div>
          <label htmlFor="identifier" className="block text-sm font-semibold text-gray-900 mb-2.5">
            이메일 또는 아이디
          </label>
          <AuthInput
            id="identifier"
            type="text"
            value={form.identifier}
            onChange={(v) => setForm((f) => ({ ...f, identifier: v }))}
            placeholder="name@example.com 또는 아이디"
            error={errors.identifier}
            autoComplete="username"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2.5">
            비밀번호
          </label>
          <PasswordInput
            id="password"
            value={form.password}
            onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            placeholder="비밀번호"
            error={errors.password}
            autoComplete="current-password"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="w-full min-h-[44px]"
        >
          로그인
        </Button>

        <div className="flex items-center justify-end pt-1">
          <Link
            href="/forgot-password"
            className="inline-block text-sm text-blue-600 hover:text-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 rounded px-2 py-1 transition-colors duration-150"
          >
            비밀번호를 잊으셨나요?
          </Link>
        </div>

        {/* 구분선 */}
        <div className="relative py-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-3 text-gray-500 font-medium">또는</span>
          </div>
        </div>

        <GitLabButton onClick={handleGitLabLogin} disabled={loading} />

        <Link
          href={`/register${
            searchParams.get("redirect")
              ? `?redirect=${encodeURIComponent(searchParams.get("redirect") ?? "")}`
              : ""
          }`}
          className="flex items-center justify-center w-full min-h-[44px] px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 transition-colors duration-150"
        >
          회원가입
        </Link>

        <p className="text-center text-xs text-gray-500 leading-relaxed pt-1">
          계정이 없으신가요? 위 회원가입 버튼을 눌러 새 계정을 만드세요.
        </p>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <AuthLayout title="Mimir" subtitle="로그인하여 시작하세요">
        <div className="flex flex-col items-center justify-center py-8 gap-3" role="status" aria-live="polite">
          <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" aria-hidden="true" />
          <span className="text-xs text-gray-500">로딩 중...</span>
        </div>
      </AuthLayout>
    }>
      <LoginContent />
    </Suspense>
  );
}
