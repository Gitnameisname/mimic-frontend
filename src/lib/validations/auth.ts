/**
 * Auth 폼 유효성 검사 스키마 (Phase 14-6).
 *
 * Zod를 사용한 클라이언트 사이드 유효성 검사.
 * 백엔드 검증과 동일한 규칙을 적용한다.
 */

import { z } from "zod";

// ─── 비밀번호 강도 체크 ───

/**
 * 비밀번호 강도를 계산한다.
 * @returns 0 = 미입력, 1 = 약함, 2 = 보통, 3 = 강함
 */
export function getPasswordStrength(password: string): number {
  if (!password) return 0;
  let types = 0;
  if (/[a-zA-Z]/.test(password)) types++;
  if (/[0-9]/.test(password)) types++;
  if (/[^a-zA-Z0-9]/.test(password)) types++;
  return types;
}

export function getPasswordStrengthLabel(
  strength: number,
): { label: string; color: string } {
  switch (strength) {
    case 1:
      return { label: "약함", color: "bg-red-500" };
    case 2:
      return { label: "보통", color: "bg-orange-500" };
    case 3:
      return { label: "강함", color: "bg-green-500" };
    default:
      return { label: "", color: "bg-gray-200" };
  }
}

// ─── 공통 필드 ───

const emailField = z
  .string()
  .min(1, "이메일을 입력해 주세요")
  .email("올바른 이메일 형식을 입력해 주세요");

// 아이디(username) 규칙: 영문자로 시작, 3-30자, 영문/숫자/._- 만 허용
const USERNAME_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{2,29}$/;
const USERNAME_RESERVED = new Set([
  "admin",
  "root",
  "system",
  "anonymous",
  "null",
  "undefined",
  "me",
  "self",
]);

const usernameField = z
  .string()
  .min(3, "아이디는 최소 3자 이상이어야 합니다")
  .max(30, "아이디는 최대 30자 이하여야 합니다")
  .regex(
    USERNAME_PATTERN,
    "아이디는 영문자로 시작하고 영문/숫자/._- 만 사용할 수 있습니다",
  )
  .refine((v) => !USERNAME_RESERVED.has(v.toLowerCase()), {
    message: "사용할 수 없는 아이디입니다",
  });

// 로그인 식별자: 이메일 형식 또는 아이디 형식 중 하나
const identifierField = z
  .string()
  .min(1, "이메일 또는 아이디를 입력해 주세요")
  .max(255, "255자 이하로 입력해 주세요")
  .refine(
    (v) => {
      const trimmed = v.trim();
      if (trimmed.includes("@")) {
        // 이메일 간이 검증
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
      }
      return USERNAME_PATTERN.test(trimmed);
    },
    {
      message: "올바른 이메일 또는 아이디 형식을 입력해 주세요",
    },
  );

const passwordField = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다")
  .max(128, "비밀번호는 128자 이하여야 합니다")
  .refine(
    (pw) => getPasswordStrength(pw) >= 2,
    "영문, 숫자, 특수문자 중 2종 이상을 포함해야 합니다",
  );

// ─── 스키마 ───

/** 로그인 폼 스키마 — 이메일 또는 아이디로 로그인 */
export const loginSchema = z.object({
  identifier: identifierField,
  password: z.string().min(1, "비밀번호를 입력해 주세요"),
});
export type LoginFormData = z.infer<typeof loginSchema>;

/** 회원가입 폼 스키마 */
export const registerSchema = z
  .object({
    email: emailField,
    username: usernameField,
    display_name: z
      .string()
      .min(1, "이름을 입력해 주세요")
      .max(100, "이름은 100자 이하여야 합니다"),
    password: passwordField,
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력해 주세요"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });
export type RegisterFormData = z.infer<typeof registerSchema>;

/** 비밀번호 재설정 요청 스키마 */
export const forgotPasswordSchema = z.object({
  email: emailField,
});
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/** 비밀번호 재설정 실행 스키마 */
export const resetPasswordSchema = z
  .object({
    new_password: passwordField,
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력해 주세요"),
  })
  .refine((data) => data.new_password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

/** 비밀번호 변경 스키마 (계정 관리) */
export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "현재 비밀번호를 입력해 주세요"),
    new_password: passwordField,
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력해 주세요"),
  })
  .refine((data) => data.new_password === data.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다",
    path: ["confirmPassword"],
  });
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
