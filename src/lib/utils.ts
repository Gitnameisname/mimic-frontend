import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 객체에서 `undefined`/`null`/빈 문자열 필드를 제외하고 query string을 만든다.
 *
 * 사용 예:
 * ```ts
 * buildQueryString({ page: 1, q: "hello", status: undefined })
 * // → "?page=1&q=hello"
 * ```
 */
export function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      p.set(k, String(v));
    }
  }
  const qs = p.toString();
  return qs ? `?${qs}` : "";
}

/** "2026-04-08T10:00:00Z" → "2026-04-08" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

/** 상대 시간: "3일 전" */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}개월 전`;
  return `${Math.floor(mo / 12)}년 전`;
}
