"use client";

/**
 * Admin 사이드바 하단 관리자 패널
 * - Expanded: [avatar | name/role | chevron]  → 메뉴는 위쪽으로 팝업
 * - Compact (rail): [avatar only]              → 메뉴는 오른쪽으로 팝업
 * - 메뉴: 프로필 / 계정 설정 / 일반 화면으로 이동 / 로그아웃
 *
 * 사용자용 `SidebarUserPanel` 과 동일 UX를 따르며, 브랜드 컬러는 blue 로 통일.
 * destructive 액션(로그아웃)만 red 를 유지.
 */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Props {
  /** 사이드바가 축소(collapsed, 레일) 모드인지 */
  compact: boolean;
}

export function AdminUserPanel({ compact }: Props) {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const displayName = user?.display_name || user?.email || "관리자";
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
      <div className="border-t border-gray-200 p-2">
        <div
          className={cn(
            "flex h-10 items-center rounded-md text-sm text-gray-500",
            compact ? "justify-center" : "px-2 gap-2",
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium">
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
        "relative shrink-0 border-t border-gray-200 bg-white",
        compact ? "p-1.5" : "p-2",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="관리자 계정 메뉴 열기"
        aria-haspopup="true"
        aria-expanded={open}
        title={compact ? displayName : undefined}
        className={cn(
          "flex w-full items-center rounded-md text-left transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          compact
            ? "h-11 justify-center hover:bg-gray-100"
            : "gap-2.5 px-2 py-1.5 hover:bg-gray-100",
          open && "bg-gray-100",
        )}
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-sm font-semibold"
        >
          {initial}
        </span>
        {!compact && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-gray-900">
                {displayName}
              </span>
              <span className="block truncate text-[11px] text-gray-500">
                {user.role_name}
              </span>
            </span>
            <svg
              className={cn(
                "h-4 w-4 shrink-0 text-gray-400 transition-transform",
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
          aria-label="관리자 계정 메뉴"
          className={cn(
            "absolute z-50 w-56 py-1 rounded-lg border border-gray-200 bg-white shadow-lg",
            // 위치: 확장은 패널 위쪽, 레일은 패널 오른쪽 위
            compact
              ? "left-[calc(100%+0.5rem)] bottom-1"
              : "left-2 right-2 bottom-[calc(100%-0.25rem)]",
          )}
        >
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="truncate text-sm font-semibold text-gray-900">
              {displayName}
            </p>
            <p className="truncate text-xs text-gray-500">{user.email}</p>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-blue-600 font-semibold">
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

          <hr className="my-1 border-gray-200" />
          <MenuItem
            onClick={() => navigate("/documents")}
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.6}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            }
            label="일반 화면으로 이동"
          />

          <hr className="my-1 border-gray-200" />
          <MenuItem
            onClick={handleLogout}
            disabled={loggingOut}
            tone="danger"
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
        "focus-visible:outline-none focus-visible:bg-gray-100",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        tone === "danger"
          ? "text-red-600 font-medium hover:bg-red-50"
          : "text-gray-700 hover:bg-gray-100",
      )}
    >
      <span className={tone === "danger" ? "text-red-500" : "text-gray-400"}>
        {icon}
      </span>
      {label}
    </button>
  );
}
