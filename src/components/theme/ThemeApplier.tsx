/**
 * ThemeApplier — S3 Phase 2 FG 2-2 UX 다듬기 1차.
 *
 * 역할
 * ----
 *  - 로그인된 사용자의 preferences.theme 값에 따라 `<html data-theme>` 속성을 설정
 *  - 동시에 localStorage("mimir:theme") 에 저장해 다음 접속 시 flash 없이 복원
 *
 * 초기 flash 방지
 * ----------------
 *  SSR 시점에는 preferences 를 알 수 없으므로 flash 가 발생할 수 있다.
 *  layout.tsx 가 inline script 로 localStorage 값을 미리 적용 (아래 `themePreloadSnippet`)
 *  해서 첫 paint 전에 data-theme 을 설정.
 *
 * 컴포넌트는 마운트 시 useTheme 로부터 최신값을 가져와 실제 적용. 로그아웃 등으로
 * preferences 가 비면 localStorage 값만 남아있어도 UX 가 유지됨.
 */

"use client";

import { useEffect } from "react";

import { useTheme } from "@/hooks/useTheme";

const LS_KEY = "mimir:theme";

export function ThemeApplier() {
  const { preference } = useTheme();
  useEffect(() => {
    if (typeof document === "undefined") return;
    // "system" 은 data-theme 속성 없음 = 기본 (CSS 의 `:root:not([data-theme])` 규칙이
    // prefers-color-scheme 을 추종). 명시적 "system" 저장 시에도 속성은 지운다.
    const el = document.documentElement;
    if (preference === "light" || preference === "dark") {
      el.dataset.theme = preference;
    } else {
      delete el.dataset.theme;
    }
    try {
      window.localStorage.setItem(LS_KEY, preference);
    } catch {
      // 개인정보/시크릿 저장 아님 — 저장 실패 시 무시
    }
  }, [preference]);
  return null;
}

/**
 * layout.tsx 의 <head> 에 inline script 로 심을 코드. IIFE 로 실행된다.
 *
 * "system" 은 **속성을 설정하지 않는다** — 서버 렌더 HTML 과 동일 상태를 유지해
 * hydration mismatch 를 회피. "light"/"dark" 만 명시 오버라이드.
 */
export const themePreloadSnippet = `(function(){try{var t=localStorage.getItem("${LS_KEY}");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;
