/**
 * URL · Query string 유틸 — `docs/함수도서관/frontend.md` §1.2 등록 함수.
 *
 * 제공 함수:
 *   - {@link toQueryString} — `Record<string, QueryValue>` → `"?k=v&..."`
 *
 * 도입 배경:
 *   - 8개 API 클라이언트(`lib/api/tags.ts`, `lib/api/proposals.ts`,
 *     `lib/api/collections.ts`, `lib/api/diff.ts`, `lib/api/extractions.ts`,
 *     `lib/api/conversation.ts`, `components/chat/CitationItem.tsx` 등) 가
 *     `new URLSearchParams()` 직접 조립 + `if (params?.x != null) qs.set(...)`
 *     보일러플레이트를 도메인마다 반복 작성하고 있었다.
 *   - 배열(`status=a&status=b`)·boolean(`true`/`false`) 같은 케이스가
 *     도메인마다 임의로 다뤄져 일관성이 없었고, 빈 문자열/null/undefined
 *     필터링도 매번 손으로 작성됐다.
 *   - 본 유틸은 기존 `@/lib/utils#buildQueryString`(scalar 만 처리) 의 확장형으로,
 *     **별도 모듈**로 추가하여 점진적으로 마이그레이션한다 (CONSTITUTION 제15조
 *     Bounded Change · 제32조 Reviewable PRs).
 *
 * 시맨틱 (방어적·예측 가능):
 *   - `undefined` / `null` / `""` 값은 **emit 하지 않는다** — 기존 `buildQueryString`
 *     과 동일.
 *   - `boolean` 은 `"true"` / `"false"` 로 emit — 기존 `buildQueryString` 과 동일
 *     (`false` 도 명시적 값으로 보존). "false 면 omit" 이 필요한 호출자는 호출
 *     측에서 `flag || undefined` 로 좁혀 전달한다.
 *   - `number` 중 `NaN` 은 emit 하지 않는다. `Infinity` / `-Infinity` 도 동일.
 *     일반 유한수는 `String(n)` 으로 emit.
 *   - **배열**(`readonly (string|number|boolean|null|undefined)[]`) 은 같은 키를
 *     **반복**해서 emit (`?status=a&status=b`). 배열 내부의 `null`/`undefined`/`""`
 *     원소는 개별 스킵. 결과적으로 모든 원소가 스킵되면 키 자체가 없어진다.
 *   - `prefix: true` (기본값) 이면 결과가 비어있지 않을 때만 `"?"` 를 붙인다.
 *     비어있으면 `""` 를 반환한다 (key 없는 `"?"` 단독 반환 금지).
 *   - 키 인코딩은 `URLSearchParams` 가 처리한다 (RFC 3986 application/x-www-form-urlencoded).
 *   - **순서**: 기본은 `Object.entries` 의 삽입 순서 보존. `sortKeys: true` 로
 *     키 알파벳 정렬을 강제할 수 있다 (캐시 키·서명 등에 유용).
 *
 * 보안 주의:
 *   - 본 유틸은 키·값을 그대로 직렬화한다. 사용자 입력을 키로 쓰는 호출자는
 *     호출 전 화이트리스트 검증을 수행해야 한다 (CLAUDE.md §4.4).
 *   - 본 유틸은 외부 I/O·DOM·콘솔·전역 상태 접근이 없다 (effects: none).
 *
 * 비대상 (intentional non-goals):
 *   - 기존 URL 의 `searchParams` 를 cloning + mutate 하는 패턴은 §1.2c 의
 *     `mutateSearchParams` 로 표준화됨 (G-Carry, 2026-04-25). `toQueryString` 은
 *     build-from-scratch 만 책임진다.
 *   - `URLSearchParams` 의 모든 기능 (예: `append` vs `set` 구분) 은 노출하지 않는다.
 *     본 유틸은 plain object → query string 의 단방향 변환만 책임진다.
 */

/** `toQueryString` 가 받을 수 있는 단일 값 또는 배열 값. */
export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number | boolean | null | undefined)[];

/** `toQueryString` 의 옵션. */
export interface ToQueryStringOptions {
  /**
   * `true` (기본) 이면 결과가 비어있지 않을 때 `"?"` 접두사를 붙인다.
   * `false` 이면 `"k=v&..."` 형태의 raw query 만 반환한다 (이미 `?` 가 있는 URL
   * 에 `&` 로 이어 붙일 때 유용).
   */
  prefix?: boolean;
  /**
   * `true` 이면 키를 알파벳 오름차순으로 정렬해 emit 한다 — 캐시 키·서명 결정성에
   * 유용. 기본은 `false` (삽입 순서 보존).
   */
  sortKeys?: boolean;
}

/** 배열 원소(QueryValue 의 비-배열 부분) 의 정확한 타입 별칭. */
type QueryScalar = string | number | boolean | null | undefined;

/**
 * `value` 가 QueryValue 의 배열 형태인지 판정 — readonly 배열까지 좁힌다.
 *
 * 표준 `Array.isArray` 는 lib.d.ts 정의상 `value is any[]` 로 좁혀
 * `readonly T[] | scalar` 유니언에서 readonly 배열을 정확히 좁히지 못한다.
 * 본 type guard 는 이 좁힘을 명시적으로 수행한다.
 */
function isQueryArray(
  value: QueryValue,
): value is readonly QueryScalar[] {
  return Array.isArray(value);
}

/**
 * 단일 스칼라 값을 query string 에 emit 가능한 문자열로 좁힌다.
 * emit 하지 않아야 하면 `null` 을 반환한다.
 */
function normalizeScalar(value: QueryScalar): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    // NaN / Infinity 는 query string 에 의미가 없다 — 안전하게 omit.
    if (!Number.isFinite(value)) return null;
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return value;
}

/**
 * 객체를 application/x-www-form-urlencoded query string 으로 직렬화한다.
 *
 * @param params - 키→값 맵. 값은 scalar / boolean / 배열 / null·undefined.
 * @param options - prefix·sortKeys 제어 (선택).
 * @returns `"?k=v&..."` 또는 `""` (빈 결과) — `prefix:false` 시 `"?"` 생략.
 *
 * @example
 * toQueryString({ q: "hello", page: 1 })
 * // → "?q=hello&page=1"
 *
 * toQueryString({ status: ["a", "b"], q: "" })
 * // → "?status=a&status=b"  // 빈 문자열 q 는 omit
 *
 * toQueryString({ inline_diff: true, include_unchanged: false })
 * // → "?inline_diff=true&include_unchanged=false"
 *
 * toQueryString({ a: 1, b: 2 }, { sortKeys: true })
 * // → "?a=1&b=2"  // 정렬 보장
 *
 * toQueryString({ a: 1 }, { prefix: false })
 * // → "a=1"
 *
 * toQueryString({ a: undefined, b: null, c: "" })
 * // → ""  // 모두 omit, "?" 도 생략
 */
export function toQueryString(
  params: Record<string, QueryValue>,
  options: ToQueryStringOptions = {},
): string {
  const { prefix = true, sortKeys = false } = options;
  const sp = new URLSearchParams();
  const keys = Object.keys(params);
  if (sortKeys) keys.sort();

  for (const key of keys) {
    const value = params[key];
    if (isQueryArray(value)) {
      // 배열: 같은 키를 반복 emit (URLSearchParams.append).
      // 빈 배열·전원 스킵 시 키 자체가 emit 되지 않는다.
      for (const item of value) {
        const s = normalizeScalar(item);
        if (s !== null) sp.append(key, s);
      }
    } else {
      const s = normalizeScalar(value);
      if (s !== null) sp.append(key, s);
    }
  }

  const qs = sp.toString();
  if (!qs) return "";
  return prefix ? `?${qs}` : qs;
}

// ===========================================================================
// §1.2b — URL search-params 읽기 헬퍼 (`parseListFilterParams` + readers)
// ===========================================================================
//
// 도입 배경:
//   - DocumentListPage / SearchPage 가 `searchParams.get(k) ?? undefined / "" / ...`
//     패턴을 5+회 반복하고, `(searchParams.get(k) ?? "").toLowerCase() === "true"`
//     같은 boolean 파싱 보일러를 3+곳에 복붙해 두고 있다.
//   - 본 헬퍼는 **읽기 전용** 의 작은 reader 팩토리들과, 그것을 객체 단위로 묶어
//     실행하는 `parseListFilterParams` 러너를 제공한다.
//   - 단순 / 안전 / `URLSearchParams` 와 Next.js `ReadonlyURLSearchParams` 양쪽
//     호환을 우선시한다 (둘 다 `get(key) → string | null` 인터페이스만 노출).
//
// 비대상 (intentional non-goals):
//   - `features/admin/extraction-queue/helpers.ts` 의 `parseFiltersFromUrl` 같은
//     **bespoke sentinel** (status: null vs "" vs valid 구분, documentType 의 정규식
//     normalize, scopeProfileId UUID 검증) 은 본 러너로 표현하기에 이질적이다.
//     해당 사이트는 본 라운드 마이그레이션 비대상.
//   - 본 헬퍼는 schema 검증 라이브러리(zod 등) 의 부분 대체가 **아니다**. 단순
//     URL 필터 파싱만 책임진다.

/**
 * `URLSearchParams` · `ReadonlyURLSearchParams` (Next.js) 와 mock 객체가 모두
 * 만족하는 최소 인터페이스. 테스트 친화 + 의존성 0.
 */
export interface SearchParamsLike {
  get(key: string): string | null;
}

/** 단일 키를 읽어 `T` 로 변환하는 reader. 부수효과 없음. */
export type FilterReader<T> = (sp: SearchParamsLike) => T;

// ---------------------------------------------------------------------------
// reader 팩토리 — `filterReaders.<kind>(key, options?)` 형태로 schema 에 사용.
// ---------------------------------------------------------------------------

/**
 * 문자열 reader (기본값 fallback).
 *
 * - 키가 없으면 `fallback` (기본 `""`).
 * - 키가 있고 값이 `""` 이면 `""` 그대로 (fallback 적용 안 함 — 사용자가 명시한
 *   빈 값을 보존).
 */
export function readString(
  key: string,
  fallback: string = "",
): FilterReader<string> {
  return (sp) => sp.get(key) ?? fallback;
}

/**
 * 옵셔널 문자열 reader.
 * - 키가 없으면 `undefined`.
 * - 키가 있으면 `""` 든 `"foo"` 든 그대로 (string).
 */
export function readOptionalString(key: string): FilterReader<string | undefined> {
  return (sp) => sp.get(key) ?? undefined;
}

/**
 * boolean reader — case-insensitive `"true"` 만 `true`, 그 외(키 부재 포함) 는 `false`.
 *
 * 기존 코드의 `(sp.get(k) ?? "").toLowerCase() === "true"` 보일러를 deduplicate.
 *
 * 주의: `"1"`/`"yes"`/`"on"` 등은 `false` 로 본다 (불필요한 파서 너그러움 회피).
 */
export function readBool(key: string): FilterReader<boolean> {
  return (sp) => (sp.get(key) ?? "").toLowerCase() === "true";
}

/**
 * Enum reader.
 *
 * - 키가 없거나 허용 목록에 없으면 `fallback` 반환.
 * - 허용 목록에 있으면 narrowing 된 값 반환.
 *
 * @param allowed - 허용되는 값들 (readonly tuple 권장 — 좁은 리터럴 추론)
 * @param fallback - default 값. `undefined` 가능 (그 경우 결과 타입은 `T | undefined`).
 */
export function readEnum<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): FilterReader<T>;
export function readEnum<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback?: undefined,
): FilterReader<T | undefined>;
export function readEnum<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback?: T,
): FilterReader<T | undefined> {
  return (sp) => {
    const v = sp.get(key);
    if (v !== null && (allowed as readonly string[]).includes(v)) return v as T;
    return fallback;
  };
}

/**
 * 정수 reader — `[min, max]` 범위 + 정수 검증, 범위 밖 / 비정수 / 부재 시 `fallback`.
 *
 * - `Number.parseInt` 사용 (소수점 → 정수 부분만 채택은 의도와 다르므로 `parseInt`
 *   + 정확 일치 검사로 막음).
 */
export function readBoundedInt(
  key: string,
  options: { min: number; max: number; fallback: number },
): FilterReader<number> {
  const { min, max, fallback } = options;
  return (sp) => {
    const raw = sp.get(key);
    if (raw === null || raw === "") return fallback;
    // 엄격 정수: parseInt 결과를 String() 했을 때 원본과 같아야 함.
    // 이로써 "1.5" / "1abc" / "0x10" 등을 거부.
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return fallback;
    if (String(n) !== raw.trim()) return fallback;
    if (n < min || n > max) return fallback;
    return n;
  };
}

/**
 * 정규식 검증 + (옵션) normalize 가 적용된 문자열 reader.
 *
 * - 키 부재 / 빈 값 → `fallback` (기본 `""`).
 * - 키가 있고 값이 있으면, `normalize` 가 있으면 먼저 적용 → 그 결과가 `regex`
 *   에 매치되면 채택, 아니면 `fallback`.
 *
 * 도입 동기: `extraction-queue/helpers.ts` `parseFiltersFromUrl` 의 documentType
 * (UPPER-SNAKE 정규식 + uppercase normalize) · scopeProfileId (UUID 정규식)
 * 같은 "값 모양 검증 + 가벼운 normalize" 패턴이 반복됨. 본 reader 가 이 패턴을
 * 캡슐화한다.
 *
 * @param key - URL 파라미터 키.
 * @param regex - 검증 정규식. `test` 만 사용.
 * @param options.normalize - 검증 전에 적용할 변환 (예: `(s) => s.toUpperCase()`).
 *   `null` / `undefined` 반환 시 fallback 처리됨.
 * @param options.fallback - 매치 실패 / 키 부재 시 반환값. 기본 `""`.
 *
 * @example
 * const _UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
 * readRegexString("scope", _UUID_RE)         // → "" if absent or invalid; UUID otherwise
 *
 * const _DOC_TYPE_RE = /^[A-Z][A-Z0-9_-]{0,63}$/;
 * readRegexString("type", _DOC_TYPE_RE, { normalize: (s) => s.toUpperCase() })
 */
export function readRegexString(
  key: string,
  regex: RegExp,
  options: { normalize?: (raw: string) => string | null | undefined; fallback?: string } = {},
): FilterReader<string> {
  const { normalize, fallback = "" } = options;
  return (sp) => {
    const raw = sp.get(key);
    if (raw === null || raw === "") return fallback;
    const candidate = normalize ? normalize(raw) : raw;
    if (candidate === null || candidate === undefined || candidate === "") return fallback;
    return regex.test(candidate) ? candidate : fallback;
  };
}

/**
 * 같은 도메인의 reader 팩토리들을 객체로 모아 둔다 — 호출지에서
 * `parseListFilterParams(sp, { q: filterReaders.optionalString("q"), ... })`
 * 처럼 짧게 쓸 수 있다.
 *
 * 개별 함수도 named export 로 노출한다 (tree-shaking · grep 친화).
 */
export const filterReaders = {
  string: readString,
  optionalString: readOptionalString,
  bool: readBool,
  enum: readEnum,
  boundedInt: readBoundedInt,
  regexString: readRegexString,
} as const;

// ---------------------------------------------------------------------------
// schema 러너
// ---------------------------------------------------------------------------

/** `parseListFilterParams` 가 받는 schema 형태. 키→reader 맵. */
export type FilterSchema = Record<string, FilterReader<unknown>>;

/**
 * 객체 모양의 schema 를 실행해 `{ key: value }` 결과를 반환한다.
 *
 * 결과 타입은 schema 의 각 reader 반환 타입에서 자동 추론된다 — 호출지에서 수동
 * 타입 선언이 필요 없다.
 *
 * @param sp - `URLSearchParams` 호환 (`{ get(key): string | null }`).
 * @param schema - 키→reader 맵.
 * @returns `{ [K in keyof S]: ReturnType<S[K]> }` — readonly 가 아닌 일반 객체.
 *
 * @example
 * const filters = parseListFilterParams(searchParams, {
 *   q: filterReaders.optionalString("q"),
 *   include_subfolders: filterReaders.bool("include_subfolders"),
 *   page: filterReaders.boundedInt("page", { min: 1, max: 10_000, fallback: 1 }),
 * });
 * // filters: { q: string | undefined; include_subfolders: boolean; page: number; }
 */
export function parseListFilterParams<S extends FilterSchema>(
  sp: SearchParamsLike,
  schema: S,
): { [K in keyof S]: ReturnType<S[K]> } {
  const out = {} as { [K in keyof S]: ReturnType<S[K]> };
  for (const key in schema) {
    if (Object.prototype.hasOwnProperty.call(schema, key)) {
      out[key] = schema[key](sp) as ReturnType<S[typeof key]>;
    }
  }
  return out;
}

// ===========================================================================
// §1.2c — URL state mutate helper
// ===========================================================================
//
// 도입 배경:
//   - DocumentListPage / SearchPage 의 router.replace 흐름이 `new URLSearchParams(
//     searchParams.toString()); next.set(k,v) 또는 next.delete(k); ... ;
//     router.replace(qs ? \`/x?${qs}\` : "/x")` 패턴을 4+회 반복.
//   - 본 helper 는 "현재 URL params 를 cloning + 일부 키만 mutate + 직렬화" 의 한
//     줄짜리 함수. router.replace 호출은 호출자가 책임 (path 결정 + scroll 옵션
//     결정 등이 호출자 도메인이라).

/**
 * 현재 URLSearchParams (또는 호환 객체) 을 복제해 일부 키만 set / delete 하고
 * 결과 query string 을 반환한다. 입력은 변형하지 않는다 (불변).
 *
 * @param current - `URLSearchParams` / `ReadonlyURLSearchParams` (Next.js) /
 *   `string` (raw query string, "?" 유무 무관) / `null` / `undefined` 모두 허용.
 *   `null`/`undefined` 면 빈 params 에서 시작.
 * @param mutations - 키→값 맵.
 *   - `string` → `set(key, value)` (기존 같은 키 모두 교체).
 *   - `null` 또는 `undefined` → `delete(key)`.
 *   - 빈 문자열 `""` → `set(key, "")` (사용자 명시적 빈 값 보존).
 *   - 키 자체가 mutations 에 없으면 기존 값 유지 (touched 안 함).
 * @param options.prefix - 결과가 비어있지 않을 때 `"?"` 접두 부착 여부. 기본 `true`.
 * @returns query string. mutations 적용 후 비어있으면 `""`.
 *
 * @example
 * // 단일 키 set
 * mutateSearchParams(searchParams, { q: "hello" })
 * // → "?collection=c-1&q=hello"  (기존 collection 보존)
 *
 * // 키 delete
 * mutateSearchParams(searchParams, { q: null })
 * // → "?collection=c-1"
 *
 * // 여러 키 동시
 * mutateSearchParams(searchParams, { q: "hi", include_subfolders: null })
 *
 * // path 합성은 호출자 책임:
 * const qs = mutateSearchParams(searchParams, { q: nextQ });
 * router.replace(qs ? `/documents${qs}` : "/documents");
 */
export function mutateSearchParams(
  current:
    | URLSearchParams
    | SearchParamsLike
    | string
    | null
    | undefined,
  mutations: Record<string, string | null | undefined>,
  options: { prefix?: boolean } = {},
): string {
  const { prefix = true } = options;

  // current 를 URLSearchParams 로 정규화 (입력 불변 보장).
  let next: URLSearchParams;
  if (current === null || current === undefined) {
    next = new URLSearchParams();
  } else if (typeof current === "string") {
    // 도서관 §1.5 R2 (2026-04-25): isString 자동 변환에서 제외.
    // user-defined type guard 가 union (string | URLSearchParams | SearchParamsLike)
    // narrowing 에서 정확히 좁히지 못해 직접 typeof 유지.
    next = new URLSearchParams(current.startsWith("?") ? current.slice(1) : current);
  } else if (current instanceof URLSearchParams) {
    // toString 경유로 deep copy — 표준 URLSearchParams 는 readonly snapshot 이 없음.
    next = new URLSearchParams(current.toString());
  } else {
    // SearchParamsLike (예: Next.js ReadonlyURLSearchParams) — toString() 이 보통 있음.
    // 안전하게 dynamic-cast 후 try.
    const c = current as unknown as { toString?: () => string };
    next = new URLSearchParams(typeof c.toString === "function" ? c.toString() : "");
  }

  for (const [key, value] of Object.entries(mutations)) {
    if (value === null || value === undefined) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }

  const qs = next.toString();
  if (!qs) return "";
  return prefix ? `?${qs}` : qs;
}
