"use client";

/**
 * 프로필 편집 페이지 (Phase 14-7).
 *
 * 표시 이름, 아바타 URL 수정.
 * 이메일, 역할, 가입일은 읽기 전용.
 */

import { useEffect, useState } from "react";
import { accountApi, type ProfileData } from "@/lib/api/account";
import { AuthInput } from "@/components/auth/AuthInput";
import { Button } from "@/components/button/Button";
import { cn } from "@/lib/utils";
import { formatDateOnly } from "@/lib/utils/date";

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 편집 폼
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await accountApi.getProfile();
        if (!cancelled) {
          setProfile(res.data);
          setDisplayName(res.data.display_name);
          setAvatarUrl(res.data.avatar_url ?? "");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "프로필을 불러올 수 없습니다");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const body: Record<string, string> = {};
      if (displayName.trim() !== profile?.display_name) {
        body.display_name = displayName.trim();
      }
      const newAvatar = avatarUrl.trim() || "";
      if (newAvatar !== (profile?.avatar_url ?? "")) {
        body.avatar_url = newAvatar;
      }

      if (Object.keys(body).length === 0) {
        setError("변경된 항목이 없습니다");
        return;
      }

      const res = await accountApi.updateProfile(body);
      setProfile(res.data);
      setSuccess("프로필이 저장되었습니다");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "프로필 저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 sm:py-16" role="status" aria-live="polite">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" aria-hidden="true" />
        <span className="sr-only">로딩 중</span>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12 sm:py-16" role="alert">
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 font-medium inline-block">
          {error || "프로필을 불러올 수 없습니다"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-4 sm:pb-6">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900">프로필</h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">계정의 기본 정보를 관리합니다.</p>
      </div>

      {/* 읽기 전용 정보 */}
      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-5 lg:p-6 space-y-4 transition-all duration-200 hover:border-gray-300" role="region" aria-label="계정 정보">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-700">계정 정보</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
          <div className="min-w-0">
            <dt className="text-gray-500 font-medium">이메일</dt>
            <dd className="text-gray-900 font-medium mt-1 break-all" title={profile.email || ""}>{profile.email || "-"}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-gray-500 font-medium">역할</dt>
            <dd className="text-gray-900 font-medium mt-1 truncate" title={profile.role_name || ""}>{profile.role_name || "-"}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-gray-500 font-medium">인증 방식</dt>
            <dd className="text-gray-900 font-medium mt-1 truncate">
              {profile.auth_provider === "local" ? "이메일/비밀번호" : "GitLab"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-gray-500 font-medium">이메일 인증</dt>
            <dd className={cn(
              "font-medium mt-1 truncate",
              profile.email_verified ? "text-green-600" : "text-orange-600",
            )}>
              {profile.email_verified ? "인증 완료" : "미인증"}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-gray-500 font-medium">가입일</dt>
            <dd className="text-gray-900 font-medium mt-1">
              {/* 도서관 §1.1 R2 (2026-04-25): formatDateOnly 표준화 (ko locale → ISO식) */}
              {formatDateOnly(profile.created_at)}
            </dd>
          </div>
        </dl>
      </div>

      {/* 편집 가능 정보 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 transition-all duration-200 hover:border-gray-300" noValidate role="region" aria-label="프로필 편집">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-700">프로필 편집</h3>

        {error && (
          <div role="alert" aria-live="assertive" aria-atomic="true" className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-lg bg-red-50 border border-red-200 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-600 font-medium">
            {error}
          </div>
        )}
        {success && (
          <div role="status" aria-live="polite" aria-atomic="true" className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-lg bg-green-50 border border-green-200 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-green-600 font-medium">
            {success}
          </div>
        )}

        <div>
          <label htmlFor="display_name" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
            표시 이름
          </label>
          <AuthInput
            id="display_name"
            value={displayName}
            onChange={setDisplayName}
            placeholder="이름을 입력하세요"
            autoComplete="name"
          />
          <p id="display_name_hint" className="text-xs text-gray-400 mt-1.5">
            계정에서 표시할 이름입니다.
          </p>
        </div>

        <div>
          <label htmlFor="avatar_url" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
            아바타 URL
          </label>
          <AuthInput
            id="avatar_url"
            value={avatarUrl}
            onChange={setAvatarUrl}
            placeholder="https://example.com/avatar.png"
            autoComplete="url"
          />
          <p id="avatar_url_hint" className="text-xs text-gray-400 mt-1.5">
            프로필 이미지 URL을 입력하세요. 비워두면 기본 아바타가 표시됩니다.
          </p>
        </div>

        {/* 아바타 미리보기 — SEC4-FE-002: https/http 스킴만 허용 */}
        {avatarUrl.trim() && /^https?:\/\//i.test(avatarUrl.trim()) && (
          <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg bg-gray-50 border border-gray-200" role="region" aria-label="아바타 미리보기">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={avatarUrl.trim()}
                alt="현재 입력한 아바타 URL의 미리보기 이미지"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">미리보기</p>
              <p className="text-xs text-gray-400 mt-0.5 truncate">{avatarUrl.trim()}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-1 sm:pt-2">
          <Button type="submit" variant="primary" size="md" loading={saving}>
            저장
          </Button>
        </div>
      </form>
    </div>
  );
}
