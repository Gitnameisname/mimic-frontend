/**
 * useTheme — S3 Phase 2 FG 2-2 UX 다듬기 1차 (2026-04-25).
 *
 * 사용자 선호 테마(`system` | `light` | `dark`) 를 읽고, 시스템 추종의 경우
 * `prefers-color-scheme` 를 구독해 **실제 적용될 테마(effective)** 를 돌려준다.
 *
 * 적용 경로
 * --------
 *  - `<html data-theme="...">` 속성을 직접 조작 (ThemeApplier 컴포넌트에서)
 *  - CSS 는 globals.css 에서 `:root[data-theme="dark"]` 와
 *    `@media (prefers-color-scheme: dark)` 두 축으로 토큰 오버라이드
 *
 * `preference` / `effective` 구분
 * --------------------------------
 *  - preference: 사용자가 명시한 값 ("system" 포함, 기본 "system")
 *  - effective: 실제 적용되는 값 ("light" | "dark")
 */

"use client";

import { useCallback, useEffect, useState } from "react";

import type { ThemePreference } from "@/lib/api/account";
import { useUserPreferences } from "./useUserPreferences";

export type EffectiveTheme = "light" | "dark";

export interface UseThemeResult {
  /** 사용자가 명시한 선호 (저장된 값). null/undefined 는 "system" 과 등가. */
  preference: ThemePreference;
  /** 실제로 적용되고 있는 테마. */
  effective: EffectiveTheme;
  /** 테마 변경 — 서버 preferences PATCH + 로컬 즉시 반영 (optimistic). */
  setPreference: (next: ThemePreference) => void;
  /** 초기 preferences 아직 로딩 중인지. */
  isLoading: boolean;
}

function readSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function useTheme(): UseThemeResult {
  const { preferences, isLoading, updatePreferenceImmediate } = useUserPreferences();
  const preference: ThemePreference =
    (preferences?.theme as ThemePreference | null | undefined) ?? "system";

  const [systemDark, setSystemDark] = useState<boolean>(() => readSystemPrefersDark());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    // Safari 구버전 호환: addListener
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, []);

  const effective: EffectiveTheme =
    preference === "dark"
      ? "dark"
      : preference === "light"
        ? "light"
        : systemDark
          ? "dark"
          : "light";

  const setPreference = useCallback(
    (next: ThemePreference) => {
      // data-theme 를 즉시 적용 (서버 응답 대기 X) — optimistic UX.
      // "system" 은 속성을 지워 CSS 의 prefers-color-scheme 경로로 복귀.
      if (typeof document !== "undefined") {
        const el = document.documentElement;
        if (next === "light" || next === "dark") {
          el.dataset.theme = next;
        } else {
          delete el.dataset.theme;
        }
      }
      updatePreferenceImmediate({ theme: next });
    },
    [updatePreferenceImmediate],
  );

  return { preference, effective, setPreference, isLoading };
}
