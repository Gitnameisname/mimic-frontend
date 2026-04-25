/**
 * 날짜·시간 포맷 유틸 — `docs/함수도서관/frontend.md` §1.1 F1 + FE-G1 등록 함수.
 *
 * 제공 함수:
 *   - {@link formatDateTime} — ISO 문자열 → `"YYYY-MM-DD HH:mm"` (로컬 시간 기준, F1)
 *   - {@link formatDateOnly} — ISO 문자열 → `"YYYY-MM-DD"` (로컬 시간 기준, FE-G1)
 *
 * 도입 배경:
 *   - `features/admin/api-keys/AdminApiKeysPage.tsx`, `features/admin/evaluations/helpers.ts`,
 *     `app/account/sessions/page.tsx` 에 서로 다른 스타일의 로컬 `formatDateTime` /
 *     `formatDate` 가 분산되어 있었다 (`toLocaleString("ko")` / `toLocaleString("ko-KR", {...})`).
 *   - 일관된 ISO 스타일(`YYYY-MM-DD HH:mm`) 로 통일하여 로케일 독립적·예측 가능한
 *     관리자 UI 시간 표기를 제공.
 *   - `CONSTITUTION.md` 제8조(Single Responsibility), 제10조(Docstring as Agent Contract),
 *     프로젝트 `CLAUDE.md` §3.1(두 번 이상 사용 시 함수화) 준수.
 *
 * 주의:
 *   - 본 모듈은 **순수 함수만** 제공한다. 외부 I/O·DOM 접근·콘솔 로깅 없음.
 *   - 시간은 **브라우저(또는 Node) 런타임의 로컬 타임존** 으로 렌더링한다.
 *     UTC 고정 표기가 필요한 경우 별도 유틸을 도입한다 (현재 요구 사례 없음).
 *   - 잘못된 입력(`null`, `undefined`, 빈 문자열, 파싱 실패) 은 모두 `"-"` 로 방어적 반환.
 */

/**
 * ISO 문자열을 `"YYYY-MM-DD HH:mm"` 형식(로컬 시간)으로 변환한다.
 *
 * @param iso - ISO 8601 문자열 또는 falsy 값. `null` / `undefined` / `""` / 파싱 실패 시 `"-"` 반환.
 * @returns `"YYYY-MM-DD HH:mm"` 형식의 문자열 또는 `"-"`.
 *
 * @example
 * formatDateTime("2026-04-25T11:30:00Z") // → "2026-04-25 20:30" (Asia/Seoul 기준)
 * formatDateTime(null)                   // → "-"
 * formatDateTime("not-a-date")           // → "-"
 * formatDateTime("")                     // → "-"
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (iso === null || iso === undefined || iso === "") return "-";
  const d = new Date(iso);
  const t = d.getTime();
  if (Number.isNaN(t)) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  const h = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${y}-${mo}-${da} ${h}:${mi}`;
}

/**
 * ISO 문자열을 `"YYYY-MM-DD"` 형식(로컬 시간)으로 변환한다.
 *
 * F1 `formatDateTime` 의 date-only 버전. 시·분을 표기하지 않는 admin 테이블 ·
 * "가입일" 같은 라벨에 사용.
 *
 * @param iso - ISO 8601 문자열 또는 falsy 값. `null` / `undefined` / `""` / 파싱 실패 시 `"-"` 반환.
 * @returns `"YYYY-MM-DD"` 형식의 문자열 또는 `"-"`.
 *
 * @example
 * formatDateOnly("2026-04-25T11:30:00Z") // → "2026-04-26" (Asia/Seoul 기준 — 자정 넘어감)
 * formatDateOnly(null)                   // → "-"
 * formatDateOnly("not-a-date")           // → "-"
 */
export function formatDateOnly(iso: string | null | undefined): string {
  if (iso === null || iso === undefined || iso === "") return "-";
  const d = new Date(iso);
  const t = d.getTime();
  if (Number.isNaN(t)) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const mo = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  return `${y}-${mo}-${da}`;
}
