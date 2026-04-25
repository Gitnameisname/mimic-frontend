/**
 * Account API 클라이언트 (Phase 14-7 → 14-8 AuthContext 통합).
 *
 * 계정 관리 관련 백엔드 API를 호출한다.
 * 프로필, 비밀번호 변경, OAuth 계정, 세션 관리.
 */

import { getAccessToken } from "@/contexts/AuthContext";
import { isString } from "@/lib/utils/guards";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8050";

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
    } else if (isString(structured?.detail)) {
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

  /**
   * 사용자 선호 조회 (Phase 1 FG 1-3).
   * 빈 선호 상태면 빈 객체 형태로 응답.
   */
  getPreferences: () =>
    accountRequest<PreferencesResponse>("/api/v1/account/preferences"),

  /**
   * 사용자 선호 partial update.
   * 키를 명시적 ``null`` 로 보내면 해당 키 삭제 (서버 shallow merge).
   */
  updatePreferences: (body: UpdatePreferencesRequest) =>
    accountRequest<PreferencesResponse>("/api/v1/account/preferences", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
};

// ─── Preferences 타입 (Phase 1 FG 1-3) ───

export type EditorViewMode = "block" | "flow";

// S3 Phase 2 FG 2-2 UX1 (2026-04-25): 테마 선호
//   "system" = prefers-color-scheme 추종 (기본). null/undefined 는 "system" 과 동등.
export type ThemePreference = "system" | "light" | "dark";

export interface UserPreferences {
  /** 에디터 뷰 모드 선호. 미설정 시 프런트 기본값("block") 사용. */
  editor_view_mode?: EditorViewMode | null;
  /** 테마 선호 (FG 2-2 UX1). 미설정/null → "system". */
  theme?: ThemePreference | null;
  // 확장용 (서버 extra=allow)
  [key: string]: unknown;
}

export interface PreferencesResponse {
  data: UserPreferences;
}

export interface UpdatePreferencesRequest {
  editor_view_mode?: EditorViewMode | null;
  theme?: ThemePreference | null;
  [key: string]: unknown;
}
