"use client";

/**
 * 비밀번호 재설정 실행 페이지 (Phase 14-6).
 *
 * URL: /reset-password?token=...
 */

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/button/Button";
import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/validations/auth";
import { authApi } from "@/lib/api/auth";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [form, setForm] = useState({ new_password: "", confirmPassword: "" });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <AuthLayout title="잘못된 링크">
        <div className="text-center space-y-4" role="alert">
          <p className="text-sm text-gray-600">
            유효하지 않은 비밀번호 재설정 링크입니다.
          </p>
          <Link
            href="/forgot-password"
            className="inline-block text-sm text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500 rounded px-2 py-1 transition-colors duration-150"
          >
            재설정 다시 요청하기
          </Link>
        </div>
      </AuthLayout>
    );
  }

  function validate(): boolean {
    const result = resetPasswordSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0]);
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
      await authApi.resetPassword({
        token,
        new_password: form.new_password,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "비밀번호 변경에 실패했습니다";
      setServerError(message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthLayout title="비밀번호 변경 완료">
        <div className="text-center space-y-4" role="status" aria-live="polite">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-2" aria-hidden="true">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">
            비밀번호가 성공적으로 변경되었습니다.
          </p>
          <p className="text-sm text-gray-500">
            새 비밀번호로 로그인해 주세요.
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
    <AuthLayout title="새 비밀번호 설정" subtitle="새로운 비밀번호를 입력해 주세요">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {serverError && (
          <div
            role="alert"
            className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium"
          >
            {serverError}
          </div>
        )}

        <div>
          <label htmlFor="new_password" className="block text-sm font-semibold text-gray-700 mb-2">
            새 비밀번호
          </label>
          <PasswordInput
            id="new_password"
            value={form.new_password}
            onChange={(v) => setForm((f) => ({ ...f, new_password: v }))}
            placeholder="8자 이상, 2종 이상 조합"
            error={errors.new_password}
            showStrength
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 mb-2">
            비밀번호 확인
          </label>
          <PasswordInput
            id="confirmPassword"
            value={form.confirmPassword}
            onChange={(v) => setForm((f) => ({ ...f, confirmPassword: v }))}
            placeholder="비밀번호를 다시 입력해 주세요"
            error={errors.confirmPassword}
            autoComplete="new-password"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="w-full"
        >
          비밀번호 변경
        </Button>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout title="새 비밀번호 설정">
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
            <p className="text-xs text-gray-500">로딩 중...</p>
          </div>
        </AuthLayout>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
