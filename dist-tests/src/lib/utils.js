"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cn = cn;
exports.buildQueryString = buildQueryString;
exports.formatDate = formatDate;
exports.relativeTime = relativeTime;
const clsx_1 = require("clsx");
const tailwind_merge_1 = require("tailwind-merge");
function cn(...inputs) {
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
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
function buildQueryString(params) {
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
function formatDate(iso) {
    return new Date(iso).toLocaleDateString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}
/** 상대 시간: "3일 전" */
function relativeTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const min = Math.floor(diff / 60_000);
    if (min < 1)
        return "방금 전";
    if (min < 60)
        return `${min}분 전`;
    const hr = Math.floor(min / 60);
    if (hr < 24)
        return `${hr}시간 전`;
    const day = Math.floor(hr / 24);
    if (day < 30)
        return `${day}일 전`;
    const mo = Math.floor(day / 30);
    if (mo < 12)
        return `${mo}개월 전`;
    return `${Math.floor(mo / 12)}년 전`;
}
