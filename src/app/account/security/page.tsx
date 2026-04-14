"use client";

/**
 * 보안 설정 페이지 (Phase 14-7).
 *
 * 비밀번호 변경 + GitLab 계정 연결/해제.
 */

import { useEffect, useState } from "react";
import { accountApi, type ProfileData, type OAuthAccount } from "@/lib/api/account";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/button/Button";
import { changePasswordSchema } from "@/lib/validations/auth";

export default function SecurityPage() {
  // 프로필 정보 (has_password 확인용)
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [oauthAccounts, setOauthAccounts] = useState<OAuthAccount[]>([]);
  const [pageLoading, setPageLoading] = useState(true);

  // 비밀번호 변경 폼
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirmPassword: "" });
  const [pwErrors, setPwErrors] = useState<Partial<Record<string, string>>>({});
  const [pwServerError, setPwServerError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // GitLab 연결/해제
  const [gitlabLoading, setGitlabLoading] = useState(false);
  const [gitlabError, setGitlabError] = useState("");
  const [gitlabSuccess, setGitlabSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profileRes, oauthRes] = await Promise.all([
          accountApi.getProfile(),
          accountApi.getOAuthAccounts(),
        ]);
        if (!cancelled) {
          setProfile(profileRes.data);
          setOauthAccounts(oauthRes.data);
        }
      } catch {
        // 에러 시 빈 상태로 표시
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ─── 비밀번호 변경 ───

  function validatePassword(): boolean {
    const result = changePasswordSchema.safeParse(pwForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = String(issue.path[0]);
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      }
      setPwErrors(fieldErrors);
      return false;
    }
    setPwErrors({});
    return true;
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwServerError("");
    setPwSuccess("");
    if (!validatePassword()) return;

    setPwLoading(true);
    try {
      await accountApi.changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      setPwSuccess("비밀번호가 변경되었습니다. 다시 로그인해 주세요.");
      setPwForm({ current_password: "", new_password: "", confirmPassword: "" });
    } catch (err: unknown) {
      setPwServerError(err instanceof Error ? err.message : "비밀번호 변경에 실패했습니다");
    } finally {
      setPwLoading(false);
    }
  }

  // ─── GitLab 연결/해제 ───

  async function handleLinkGitLab() {
    setGitlabError("");
    setGitlabSuccess("");
    setGitlabLoading(true);
    try {
      const res = await accountApi.linkGitLab();
      // GitLab 인증 페이지로 이동
      window.location.href = res.data.url;
    } catch (err: unknown) {
      setGitlabError(err instanceof Error ? err.message : "GitLab 연결에 실패했습니다");
      setGitlabLoading(false);
    }
  }

  async function handleUnlinkGitLab() {
    setGitlabError("");
    setGitlabSuccess("");
    setGitlabLoading(true);
    try {
      await accountApi.unlinkGitLab();
      setOauthAccounts((prev) => prev.filter((a) => a.provider !== "gitlab"));
      setGitlabSuccess("GitLab 계정 연결이 해제되었습니다");
    } catch (err: unknown) {
      setGitlabError(err instanceof Error ? err.message : "GitLab 해제에 실패했습니다");
    } finally {
      setGitlabLoading(false);
    }
  }

  const gitlabAccount = oauthAccounts.find((a) => a.provider === "gitlab");

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-12 sm:py-16" role="status" aria-live="polite">
        <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" aria-hidden="true" />
        <span className="sr-only">로딩 중</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-4 sm:pb-6">
      <div>
        <h2 className="text-base sm:text-lg font-bold text-gray-900">보안</h2>
        <p className="text-xs sm:text-sm text-gray-500 mt-1">비밀번호와 연결된 계정을 관리합니다.</p>
      </div>

      {/* 비밀번호 변경 섹션 */}
      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-5 lg:p-6 transition-all duration-200 hover:border-gray-300" role="region" aria-label="비밀번호 변경">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-4">비밀번호 변경</h3>

        {!profile?.has_password ? (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-amber-700" role="status" aria-live="polite">
            소셜 로그인으로 가입한 계정입니다. 비밀번호를 설정하려면 비밀번호 재설정 기능을 사용해 주세요.
          </div>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-3 sm:space-y-4" noValidate>
            {pwServerError && (
              <div role="alert" aria-live="assertive" aria-atomic="true" className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-lg bg-red-50 border border-red-200 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-600 font-medium">
                {pwServerError}
              </div>
            )}
            {pwSuccess && (
              <div role="status" aria-live="polite" aria-atomic="true" className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-lg bg-green-50 border border-green-200 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-green-600 font-medium">
                {pwSuccess}
              </div>
            )}

            <div>
              <label htmlFor="current_password" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                현재 비밀번호
                <span className="text-red-600 ml-1" aria-label="필수 항목">*</span>
              </label>
              <PasswordInput
                id="current_password"
                value={pwForm.current_password}
                onChange={(v) => setPwForm((f) => ({ ...f, current_password: v }))}
                placeholder="현재 비밀번호"
                error={pwErrors.current_password}
                autoComplete="current-password"
                required
                aria-required="true"
              />
            </div>

            <div>
              <label htmlFor="new_password" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                새 비밀번호
                <span className="text-red-600 ml-1" aria-label="필수 항목">*</span>
              </label>
              <PasswordInput
                id="new_password"
                value={pwForm.new_password}
                onChange={(v) => setPwForm((f) => ({ ...f, new_password: v }))}
                placeholder="8자 이상, 2종 이상 조합"
                error={pwErrors.new_password}
                showStrength
                autoComplete="new-password"
                required
                aria-required="true"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
                비밀번호 확인
                <span className="text-red-600 ml-1" aria-label="필수 항목">*</span>
              </label>
              <PasswordInput
                id="confirmPassword"
                value={pwForm.confirmPassword}
                onChange={(v) => setPwForm((f) => ({ ...f, confirmPassword: v }))}
                placeholder="비밀번호를 다시 입력해 주세요"
                error={pwErrors.confirmPassword}
                autoComplete="new-password"
                required
                aria-required="true"
              />
            </div>

            <div className="flex justify-end pt-1 sm:pt-2">
              <Button type="submit" variant="primary" size="md" loading={pwLoading}>
                비밀번호 변경
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* GitLab 계정 연결 섹션 */}
      <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-5 lg:p-6 transition-all duration-200 hover:border-gray-300" role="region" aria-label="연결된 계정">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-700 mb-4">연결된 계정</h3>

        {gitlabError && (
          <div role="alert" aria-live="assertive" aria-atomic="true" className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-lg bg-red-50 border border-red-200 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-600 font-medium mb-4">
            {gitlabError}
          </div>
        )}
        {gitlabSuccess && (
          <div role="status" aria-live="polite" aria-atomic="true" className="animate-in fade-in slide-in-from-top-2 duration-300 rounded-lg bg-green-50 border border-green-200 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-green-600 font-medium mb-4">
            {gitlabSuccess}
          </div>
        )}

        <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border border-gray-200 bg-gray-50 flex-col sm:flex-row transition-all duration-200 hover:border-gray-300 hover:bg-gray-100/50" role="complementary" aria-label="GitLab 계정 연결 상태">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* GitLab 로고 */}
            <div className="w-10 h-10 rounded-lg bg-[#FC6D26] flex items-center justify-center flex-shrink-0" aria-label="GitLab">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 01-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 014.82 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0118.6 2a.43.43 0 01.58 0 .42.42 0 01.11.18l2.44 7.51L23 13.45a.84.84 0 01-.35.94z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-medium text-gray-900">GitLab</p>
              {gitlabAccount ? (
                <p className="text-xs text-gray-500 mt-0.5 break-all" title={gitlabAccount.provider_email || gitlabAccount.provider_name || ""}>
                  {gitlabAccount.provider_email || gitlabAccount.provider_name || "연결됨"}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-0.5">연결되지 않음</p>
              )}
            </div>
          </div>

          {gitlabAccount ? (
            <Button
              variant="danger"
              size="sm"
              onClick={handleUnlinkGitLab}
              loading={gitlabLoading}
              className="flex-shrink-0 w-full sm:w-auto"
            >
              해제
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLinkGitLab}
              loading={gitlabLoading}
              className="flex-shrink-0 w-full sm:w-auto"
            >
              연결
            </Button>
          )}
        </div>

        {gitlabAccount && !profile?.has_password && (
          <p className="text-xs text-amber-600 mt-3 font-medium">
            GitLab 계정을 해제하려면 먼저 비밀번호를 설정해야 합니다.
          </p>
        )}
      </div>
    </div>
  );
}
