/**
 * Account API 클라이언트 (Phase 14-7 → 14-8 AuthContext 통합).
 *
 * 계정 관리 관련 백엔드 API를 호출한다.
 * 프로필, 비밀번호 변경, OAuth 계정, 세션 관리.
 */

import { getAccessToken } from "@/contexts/AuthContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── 타입 ───

export interface ProfileData {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  auth_provider: string;
  email_verified: boolean;
  role_name: string;
  created_at: string;
  has_password: boolean;
}

export interface ProfileResponse {
  data: ProfileData;
}

export interface UpdateProfileRequest {
  display_name?: string;
  avatar_url?: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface OAuthAccount {
  provider: string;
  provider_email: string | null;
  provider_name: string | null;
  created_at: string;
}

export interface OAuthAccountsResponse {
  data: OAuthAccount[];
}

export interface SessionData {
  id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  is_current: boolean;
}

export interface SessionsResponse {
  data: SessionData[];
}

export interface MessageResponse {
  data: { message: string };
}

export interface LinkGitLabResponse {
  data: { url: string };
}

// ─── API 헬퍼 ───

class AccountApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "AccountApiError";
  }
}

async function accountRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;

  // AuthContext 모듈 변수에서 AT 가져옴
  const at = getAccessToken();

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(at ? { Authorization: `Bearer ${at}` } : {}),
      ...(options.headers as Record<string, string>),
    },
    credentials: "include",
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
    } else if (typeof structured?.detail === "string") {
      message = structured.detail;
    } else if (
      structured?.detail &&
      typeof structured.detail === "object" &&
      "errors" in structured.detail
    ) {
      message = (structured.detail as { errors: string[] }).errors.join(", ");
    }
    throw new AccountApiError(res.status, message, data);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Account API ───

export const accountApi = {
  /** 프로필 조회 */
  getProfile: () =>
    accountRequest<ProfileResponse>("/api/v1/account/profile"),

  /** 프로필 수정 */
  updateProfile: (body: UpdateProfileRequest) =>
    accountRequest<ProfileResponse>("/api/v1/account/profile", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  /** 비밀번호 변경 */
  changePassword: (body: ChangePasswordRequest) =>
    accountRequest<MessageResponse>("/api/v1/account/change-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** 연결된 OAuth 계정 목록 */
  getOAuthAccounts: () =>
    accountRequest<OAuthAccountsResponse>("/api/v1/account/oauth-accounts"),

  /** GitLab 계정 연결 시작 */
  linkGitLab: () =>
    accountRequest<LinkGitLabResponse>("/api/v1/account/oauth-accounts/gitlab/link", {
      method: "POST",
    }),

  /** GitLab 계정 해제 */
  unlinkGitLab: () =>
    accountRequest<MessageResponse>("/api/v1/account/oauth-accounts/gitlab/unlink", {
      method: "DELETE",
    }),

  /** 활성 세션 목록 */
  getSessions: () =>
    accountRequest<SessionsResponse>("/api/v1/account/sessions"),

  /** 세션 강제 종료 */
  revokeSession: (sessionId: string) =>
    accountRequest<MessageResponse>(`/api/v1/account/sessions/${sessionId}`, {
      method: "DELETE",
    }),
};
