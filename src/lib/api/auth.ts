/**
 * Auth API 클라이언트 (Phase 14-6).
 *
 * 인증 관련 백엔드 API를 호출한다.
 * 회원가입, 로그인, 비밀번호 재설정, 이메일 인증 등.
 */

import { isString } from "@/lib/utils/guards";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8050";

// ─── Request / Response 타입 ───

export interface RegisterRequest {
  email: string;
  password: string;
  display_name: string;
  username?: string;
}

export interface RegisterResponse {
  data: {
    id: string;
    email: string;
    display_name: string;
    status: string;
    username?: string | null;
  };
}

export interface LoginRequest {
  /** 이메일 또는 아이디(username) */
  identifier: string;
  password: string;
}

export interface LoginResponse {
  data: {
    access_token: string;
    token_type: string;
    expires_in: number;
  };
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface AuthMessageResponse {
  data: {
    message: string;
  };
}

// ─── API 헬퍼 ───

class AuthApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

async function authRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    },
    credentials: "include", // RT Cookie 포함
  });

  if (!res.ok) {
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = undefined;
    }
    const structured = data as {
      error?: { message?: string };
      detail?: string | { errors?: string[] };
    } | undefined;

    let message = res.statusText;
    if (structured?.error?.message) {
      message = structured.error.message;
    } else if (isString(structured?.detail)) {
      message = structured.detail;
    } else if (
      structured?.detail &&
      typeof structured.detail === "object" &&
      "errors" in structured.detail
    ) {
      message = (structured.detail as { errors: string[] }).errors.join(", ");
    }
    throw new AuthApiError(res.status, message, data);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Auth API ───

export const authApi = {
  /** 회원가입 */
  register: (body: RegisterRequest) =>
    authRequest<RegisterResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** 로그인 */
  login: (body: LoginRequest) =>
    authRequest<LoginResponse>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** 토큰 갱신 */
  refresh: () =>
    authRequest<LoginResponse>("/api/v1/auth/refresh", {
      method: "POST",
    }),

  /** 로그아웃 */
  logout: () =>
    authRequest<AuthMessageResponse>("/api/v1/auth/logout", {
      method: "POST",
    }),

  /** 비밀번호 재설정 요청 */
  forgotPassword: (body: ForgotPasswordRequest) =>
    authRequest<AuthMessageResponse>("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** 비밀번호 재설정 실행 */
  resetPassword: (body: ResetPasswordRequest) =>
    authRequest<AuthMessageResponse>("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** 이메일 인증 */
  verifyEmail: (body: VerifyEmailRequest) =>
    authRequest<AuthMessageResponse>("/api/v1/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** GitLab OAuth 시작 URL */
  getGitLabOAuthUrl: () => `${API_BASE}/api/v1/auth/oauth/gitlab`,
};
