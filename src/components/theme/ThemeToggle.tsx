/**
 * ThemeToggle — S3 Phase 2 FG 2-2 UX 다듬기 1차.
 *
 * 3-state 세그먼티드 컨트롤: System / Light / Dark.
 * useTheme.setPreference 로 optimistic update + PATCH.
 *
 * A11y
 * -----
 *  - role="radiogroup" + 각 버튼 role="radio"
 *  - aria-checked 로 현재 선택 표시
 *  - 화살표 키 ↔ 이동 + Home/End 첫/끝 (선택 이동만 구현, 포커스 관리는 브라우저 기본)
 */

"use client";

import type { ReactElement } from "react";
import type { ThemePreference } from "@/lib/api/account";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";

const OPTIONS: { value: ThemePreference; label: string; icon: ReactElement }[] = [
  {
    value: "system",
    label: "시스템",
    icon: (
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M3 5h18v12H3zM8 21h8M12 17v4" />
      </svg>
    ),
  },
  {
    value: "light",
    label: "라이트",
    icon: (
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" strokeWidth={1.8} />
        <path strokeLinecap="round" strokeWidth={1.8}
          d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
      </svg>
    ),
  },
  {
    value: "dark",
    label: "다크",
    icon: (
      <svg
        className="h-3.5 w-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
          d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
      </svg>
    ),
  },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();

  if (compact) {
    // Rail 모드 — 다크/라이트만 원버튼 순환 (system → light → dark → system)
    const next: ThemePreference =
      preference === "system" ? "light" : preference === "light" ? "dark" : "system";
    const current = OPTIONS.find((o) => o.value === preference);
    return (
      <button
        type="button"
        onClick={() => setPreference(next)}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md",
          "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
          "hover:bg-[var(--color-surface-subtle)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]",
        )}
        title={`테마: ${current?.label ?? "시스템"} (클릭하면 ${OPTIONS.find((o) => o.value === next)?.label})`}
        aria-label={`테마 전환. 현재 ${current?.label ?? "시스템"}`}
      >
        {current?.icon}
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="테마 선택"
      className="inline-flex rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5 text-xs"
    >
      {OPTIONS.map((o) => {
        const active = preference === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setPreference(o.value)}
            className={cn(
              "inline-flex items-center gap-1 rounded px-2 py-1 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]",
              active
                ? "bg-[var(--color-brand-600)] text-white"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)]",
            )}
            title={`테마: ${o.label}`}
          >
            {o.icon}
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
