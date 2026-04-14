"use client";

/**
 * 비밀번호 재설정 요청 페이지 (Phase 14-6).
 */

import { useState } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthInput } from "@/components/auth/AuthInput";
import { Button } from "@/components/button/Button";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validations/auth";
import { authApi } from "@/lib/api/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return false;
    }
    setError("");
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      setSent(true);
    } catch {
      // 백엔드는 사용자 존재 여부와 무관하게 200을 반환하므로
      // 실제 네트워크 오류만 여기에 도달
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <AuthLayout title="이메일 발송 완료">
        <div className="text-center space-y-4" role="status" aria-live="polite">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-2" aria-hidden="true">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-gray-600">
            비밀번호 재설정 링크가 이메일로 발송되었습니다.
          </p>
          <p className="text-sm text-gray-500">
            받은편지함을 확인해 주세요. 이메일이 보이지 않으면 스팸 폴더도 확인해 주세요.
          </p>
          <Link
            href="/login"
            className="inline-block mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500 rounded px-2 py-1 transition-colors duration-150"
          >
            로그인으로 돌아가기
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="비밀번호 재설정"
      subtitle="가입한 이메일을 입력하면 재설정 링크를 보내드립니다"
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
            이메일
          </label>
          <AuthInput
            id="email"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="name@example.com"
            error={error}
            autoComplete="email"
            autoFocus
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="w-full"
        >
          재설정 링크 발송
        </Button>

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-blue-500 rounded px-1 transition-colors duration-150">
            로그인으로 돌아가기
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
