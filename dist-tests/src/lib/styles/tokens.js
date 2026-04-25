"use strict";
/**
 * 디자인 토큰 (Tailwind className 상수) — `docs/함수도서관/frontend.md` §1.8 FE-G4 등록.
 *
 * 도입 배경:
 *   - 27회 반복되는 배지 베이스 (`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold`)
 *     와, login/register/reset-password 등에 반복되는 alert 박스 색·간격 조합을 토큰화.
 *   - Tailwind 의 `@apply` 대신 상수로 유지 — 트리쉐이킹 + Tailwind 버전 의존성 회피.
 *
 * 사용 패턴:
 *   - 단독 사용: `<span className={BADGE_BASE} />`
 *   - 색상 합성: `<span className={cn(BADGE_BASE, "bg-amber-100 text-amber-800")} />`
 *     → `cn` 유틸 (`@/lib/utils#cn`) 이 tailwind-merge 로 충돌 해소.
 *
 * R3 확장 (2026-04-25):
 *   - 변형 토큰 추가: BADGE_BASE_PILL (rounded-full), ALERT_ERROR_COMPACT (text-red-600 + 작은 padding)
 *   - 다크모드 토큰: BADGE_DARK / ALERT_*_DARK — `dark:` 접두로 preferences.theme 토글과 호환.
 *
 * 비대상 (intentional non-goals):
 *   - **Toast / Modal 컨테이너** — 별 토큰 (Toast 는 useMutationWithToast 가 이미 처리).
 *   - **상태별 배지 색상** (extraction/golden-set/evaluation) — `lib/constants/badges` 가 처리 (FE-G3).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALERT_SUCCESS_DARK = exports.ALERT_INFO_DARK = exports.ALERT_WARNING_DARK = exports.ALERT_ERROR_DARK = exports.BADGE_BASE_DARK = exports.ALERT_ERROR_COMPACT = exports.BADGE_BASE_PILL = exports.ALERT_SUCCESS = exports.ALERT_INFO = exports.ALERT_WARNING = exports.ALERT_ERROR = exports.BADGE_BASE = void 0;
// ===========================================================================
// 배지 (Badge) — 인라인 작은 라벨/상태 표시
// ===========================================================================
/**
 * 배지 베이스 — 색상 토큰 (`bg-*-100 text-*-800` 등) 은 호출자가 추가.
 *
 * @example
 * import { cn } from "@/lib/utils";
 * <span className={cn(BADGE_BASE, "bg-green-100 text-green-800")}>승인</span>
 */
exports.BADGE_BASE = "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold";
// ===========================================================================
// Alert 박스 — role="alert" 또는 비-인터랙티브 안내 박스
// ===========================================================================
/**
 * 에러 alert — 빨강 계열 (4xx/5xx 응답, 폼 검증 실패 등).
 *
 * @example
 * <div role="alert" className={ALERT_ERROR}>비밀번호가 일치하지 않습니다.</div>
 */
exports.ALERT_ERROR = "rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium";
/**
 * 경고 alert — 주황/amber 계열 (주의 사항, 임시 차단 등).
 */
exports.ALERT_WARNING = "rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 font-medium";
/**
 * 정보 alert — 파랑 계열 (안내, 진행 중 메시지).
 */
exports.ALERT_INFO = "rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-700 font-medium";
/**
 * 성공 alert — 초록 계열 (저장 완료, 발행 성공 등).
 */
exports.ALERT_SUCCESS = "rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-medium";
// ===========================================================================
// R3 (2026-04-25) — 변형 토큰
// ===========================================================================
/**
 * 배지 베이스 (pill 모양) — `rounded-full` 변형. account/sessions 등.
 */
exports.BADGE_BASE_PILL = "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium";
/**
 * 에러 alert — 작은 변형 (text-red-600 + responsive padding).
 * account/security, account/sessions, account/profile 의 폼 인라인 에러 박스.
 */
exports.ALERT_ERROR_COMPACT = "animate-in fade-in slide-in-from-top-2 duration-300 rounded-lg bg-red-50 border border-red-200 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-red-600 font-medium";
// ===========================================================================
// R3 (2026-04-25) — 다크모드 토큰 (`dark:` 접두 포함)
// ===========================================================================
//
// 사용 패턴:
//   <div className={cn(ALERT_ERROR, ALERT_ERROR_DARK)}>...</div>
//   tailwind-merge 가 light/dark 충돌 해소.
//
// preferences.theme 토글은 이미 도입됨 (S3 P2 FG2-2 UX1). 본 토큰은 admin 페이지
// 다크 전면 도입 시 호출자가 합성해 사용.
exports.BADGE_BASE_DARK = "dark:bg-opacity-20";
exports.ALERT_ERROR_DARK = "dark:bg-red-950/40 dark:border-red-900 dark:text-red-200";
exports.ALERT_WARNING_DARK = "dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-200";
exports.ALERT_INFO_DARK = "dark:bg-blue-950/40 dark:border-blue-900 dark:text-blue-200";
exports.ALERT_SUCCESS_DARK = "dark:bg-green-950/40 dark:border-green-900 dark:text-green-200";
