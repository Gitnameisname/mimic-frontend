"use client";

/**
 * useFocusTrap — aria-modal 다이얼로그용 포커스 트랩 훅.
 *
 * WCAG 2.4.3 Focus Order / 2.4.11 Focus Not Obscured 대응.
 *
 * 동작:
 *  1. active=true 가 되면 현재 활성 요소를 저장한 뒤,
 *     컨테이너 내부의 첫 tabbable 요소로 포커스를 이동한다.
 *  2. 컨테이너 외부로 Tab 이 빠져나가려 하면 경계에서 반대편으로 wrap 한다.
 *  3. active=false 로 바뀌면 저장된 요소로 포커스를 복귀시킨다
 *     (요소가 여전히 문서에 붙어 있을 때만; 제거됐다면 body 로 fallback).
 *
 * 사용 예:
 * ```tsx
 * const panelRef = useRef<HTMLDivElement>(null);
 * useFocusTrap(panelRef, open);
 * return <div ref={panelRef} role="dialog" aria-modal="true">…</div>;
 * ```
 */

import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "iframe",
  "object",
  "embed",
  '[tabindex]:not([tabindex="-1"])',
  "[contenteditable]",
].join(",");

function getTabbables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => {
      if (el.hasAttribute("disabled")) return false;
      if (el.getAttribute("aria-hidden") === "true") return false;
      // 화면에 보이지 않는 요소(display:none 포함)는 offsetParent === null
      if (el.offsetParent === null && el.tagName !== "IFRAME") return false;
      return true;
    }
  );
}

export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  active: boolean
): void {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused =
      (document.activeElement as HTMLElement | null) ?? null;

    // 초기 포커스 이동 — 컨테이너 자신이 tabindex=-1 이면 거기에, 아니면 첫 tabbable 에.
    const tabbables = getTabbables(container);
    if (tabbables.length > 0) {
      tabbables[0].focus();
    } else if (container.tabIndex >= -1) {
      container.focus();
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const currentTabbables = getTabbables(container);
      if (currentTabbables.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = currentTabbables[0];
      const last = currentTabbables[currentTabbables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (activeEl === last || !container.contains(activeEl)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("keydown", handleKey);
      // 복귀: 요소가 여전히 문서에 붙어 있고 focus() 메서드를 가진 경우에만.
      if (
        previouslyFocused &&
        document.contains(previouslyFocused) &&
        typeof previouslyFocused.focus === "function"
      ) {
        previouslyFocused.focus();
      }
    };
  }, [active, containerRef]);
}
