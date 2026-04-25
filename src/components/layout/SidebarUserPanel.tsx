"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface Props {
  /** 사이드바 레일(아이콘 전용) 모드 */
  compact: boolean;
}

/**
 * 사이드바 하단 사용자 패널
 * - Expanded: [avatar | name/role | chevron]  → 메뉴는 위쪽으로 팝업
 * - Compact (rail): [avatar only]              → 메뉴는 오른쪽으로 팝업
 * - 메뉴: 프로필 / 계정 설정 / (관리자) / 로그아웃
 */
export function SidebarUserPanel({ compact }: Props) {
  const router = useRouter();
  const { user, logout, isAuthenticated, hasMinimumRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isAdmin = hasMinimumRole("ORG_ADMIN");

  const displayName = user?.display_name || user?.email || "User";
  const initial = displayName.charAt(0).toUpperCase();

  // 바깥 클릭으로 메뉴 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const navigate = useCallback(
    (path: string) => {
      setOpen(false);
      router.push(path);
    },
    [router],
  );

  const handleLogout = useCallback(async () => {
    setLoggingOut(true);
    setOpen(false);
    try {
      await logout();
      router.push("/login");
    } finally {
      setLoggingOut(false);
    }
  }, [logout, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="border-t border-[var(--color-border)] p-2">
        <div
          className={cn(
            "flex h-10 items-center rounded-md text-sm text-[var(--color-text-subtle)]",
            compact ? "justify-center" : "px-2 gap-2",
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-subtle)] text-sm font-medium">
            U
          </div>
          {!compact && <span className="truncate">로그인되지 않음</span>}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={cn(
        "relative shrink-0 border-t border-[var(--color-border)]",
        compact ? "p-1.5" : "p-2",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="사용자 메뉴 열기"
        aria-haspopup="true"
        aria-expanded={open}
        title={compact ? displayName : undefined}
        className={cn(
          "flex w-full items-center rounded-md text-left transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]",
          compact
            ? "h-11 justify-center hover:bg-[var(--color-surface-subtle)]"
            : "gap-2.5 px-2 py-1.5 hover:bg-[var(--color-surface-subtle)]",
          open && "bg-[var(--color-surface-subtle)]",
        )}
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-700)] text-sm font-semibold"
        >
          {initial}
        </span>
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-[var(--color-text)]">
                {displayName}
              </span>
              <span className="block truncate text-[11px] text-[var(--color-text-subtle)]">
                {user.role_name}
              </span>
            </span>
            <svg
              className={cn(
                "h-4 w-4 shrink-0 text-[var(--color-text-subtle)] transition-transform",
                open && "rotate-180",
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="사용자 메뉴"
          className={cn(
            "absolute z-50 w-56 py-1",
            "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]",
            "shadow-[var(--shadow-pop)]",
            // 위치: 확장 모드는 패널 바로 위, 레일 모드는 패널 오른쪽 위
            compact
              ? "left-[calc(100%+0.5rem)] bottom-1"
              : "left-2 right-2 bottom-[calc(100%-0.25rem)]",
          )}
        >
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <p className="truncate text-sm font-semibold text-[var(--color-text)]">
              {displayName}
            </p>
            <p className="truncate text-xs text-[var(--color-text-subtle)]">{user.email}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-[var(--color-text-subtle)]">
              {user.role_name}
            </p>
          </div>

          <MenuItem
            onClick={() => navigate("/account/profile")}
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.6}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            }
            label="프로필"
          />
          <MenuItem
            onClick={() => navigate("/account")}
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.6}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
            label="계정 설정"
          />

          {/* S3 Phase 2 FG 2-2 UX1 (2026-04-25): 테마 선택 세그먼트 */}
          <hr className="my-1 border-[var(--color-border)]" />
          <div className="px-4 py-2">
            <p className="mb-1.5 text-[11px] uppercase tracking-wide text-[var(--color-text-subtle)]">
              테마
            </p>
            <ThemeToggle />
          </div>

          {isAdmin && (
            <>
              <hr className="my-1 border-[var(--color-border)]" />
              <MenuItem
                tone="danger"
                onClick={() => navigate("/admin")}
                icon={
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.6}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                }
                label="관리자 설정"
              />
            </>
          )}

          <hr className="my-1 border-[var(--color-border)]" />
          <MenuItem
            onClick={handleLogout}
            disabled={loggingOut}
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.6}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            }
            label={loggingOut ? "로그아웃 중..." : "로그아웃"}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  disabled,
  icon,
  label,
  tone = "default",
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  tone?: "default" | "danger";
}) {
  return (
    <button
      role="menuitem"
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors",
        "focus-visible:outline-none focus-visible:bg-[var(--color-surface-subtle)]",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        tone === "danger"
          ? "text-red-600 font-medium hover:bg-red-50"
          : "text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]",
      )}
    >
      <span className={tone === "danger" ? "text-red-500" : "text-[var(--color-text-subtle)]"}>
        {icon}
      </span>
      {label}
    </button>
  );
}
