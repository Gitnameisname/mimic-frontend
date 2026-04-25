"use client";

/**
 * 회원가입 페이지 (Phase 14-6).
 *
 * - 이메일, 이름, 비밀번호, 비밀번호 확인
 * - 비밀번호 강도 표시 바
 * - Zod 클라이언트 유효성 검사
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { ALERT_ERROR } from "@/lib/styles/tokens";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/button/Button";
import { registerSchema, type RegisterFormData } from "@/lib/validations/auth";
import { authApi } from "@/lib/api/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    username: "",
    display_name: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const result = registerSchema.safeParse(form);
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
      await authApi.register({
        email: form.email,
        username: form.username,
        password: form.password,
        display_name: form.display_name,
      });
      setSuccess(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "회원가입에 실패했습니다";
      setServerError(message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <AuthLayout title="회원가입 완료" subtitle="이메일 인증을 진행해 주세요">
        <div className="text-center space-y-4" role="status" aria-live="polite">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-2" aria-hidden="true">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-gray-600 break-words">
            <span className="font-medium text-gray-900 break-all">{form.email}</span>로
            인증 이메일을 발송했습니다.
          </p>
          <p className="text-sm text-gray-500">
            받은편지함을 확인하여 이메일 인증을 완료해 주세요.
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
    <AuthLayout title="회원가입" subtitle="Mimir 계정을 만드세요">
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {serverError && (
          <div
            role="alert"
            // 도서관 §1.8 FE-G4 (2026-04-25): ALERT_ERROR 토큰
            className={ALERT_ERROR}
          >
            {serverError}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
            이메일
          </label>
          <AuthInput
            id="email"
            type="email"
            value={form.email}
            onChange={(v) => setForm((f) => ({ ...f, email: v }))}
            placeholder="name@example.com"
            error={errors.email}
            autoComplete="email"
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            아이디
          </label>
          <AuthInput
            id="username"
            value={form.username}
            onChange={(v) => setForm((f) => ({ ...f, username: v }))}
            placeholder="영문 시작, 3-30자 (예: mimir_user)"
            error={errors.username}
            autoComplete="username"
          />
          <p className="mt-1 text-xs text-gray-500">
            이메일과 별도로, 로그인 시 사용할 아이디를 설정합니다.
          </p>
        </div>

        <div>
          <label htmlFor="display_name" className="block text-sm font-medium text-gray-700 mb-1">
            이름
          </label>
          <AuthInput
            id="display_name"
            value={form.display_name}
            onChange={(v) => setForm((f) => ({ ...f, display_name: v }))}
            placeholder="표시 이름"
            error={errors.display_name}
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호
          </label>
          <PasswordInput
            id="password"
            value={form.password}
            onChange={(v) => setForm((f) => ({ ...f, password: v }))}
            placeholder="8자 이상, 2종 이상 조합"
            error={errors.password}
            showStrength
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
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
          회원가입
        </Button>

        <p className="text-center text-sm text-gray-500 mt-4">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500 rounded px-1 transition-colors duration-150">
            로그인
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
