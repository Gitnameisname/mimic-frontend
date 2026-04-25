"use strict";
/**
 * 타입 가드 유틸 — `docs/함수도서관/frontend.md` §1.5 등록.
 *
 * 제공 함수:
 *   - {@link isString} — `typeof value === "string"` (TypeScript narrowing 보장).
 *   - {@link isNonEmptyString} — `string` AND `length > 0` AND trim 후에도 비어있지 않음.
 *   - {@link isPlainObject} — `Record<string, unknown>` (배열·null·primitive 제외).
 *
 * 도입 배경:
 *   - 51회 분산된 `typeof x === "string"` / `x !== null && typeof x === "object"` 패턴.
 *   - 가독성 + 명명 일관성 + ESLint custom rule 도입의 발판.
 *
 * 비대상:
 *   - `isNumber` / `isBoolean` 등 추가 가드 — 호출 빈도 부족, 필요 시 추가.
 *   - JSON parsing 검증 (별 도메인 — 백엔드와 contract test).
 *   - Class 인스턴스 검사 (`isError`) — 표준 `instanceof` 사용 권장.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isString = isString;
exports.isNonEmptyString = isNonEmptyString;
exports.isPlainObject = isPlainObject;
/**
 * `value` 가 문자열인지 검사 (TypeScript narrowing 보장).
 *
 * @example
 * if (isString(x)) { x.toUpperCase(); /* x: string */ /* }
*/
function isString(value) {
    return typeof value === "string";
}
/**
 * `value` 가 비어있지 않은 문자열인지 검사.
 *
 * 빈 문자열 `""` 와 공백만 있는 `"   "` 모두 `false` (trim 후 길이 검사).
 *
 * @example
 * if (isNonEmptyString(input)) {
 *   // input: string, "" / "   " 는 분기 못 들어옴
 * }
 */
function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
}
/**
 * `value` 가 plain object 인지 검사 (`{ key: value, ... }` 형태).
 *
 * - 배열 → `false`
 * - `null` → `false`
 * - primitive (string/number/boolean/bigint/symbol/undefined) → `false`
 * - Date/Map/Set/Error 등 클래스 인스턴스 → `false` (생성자가 Object.prototype 가 아닌 경우)
 *
 * 주의: cross-realm object (다른 iframe 등) 는 `Object.prototype` 일관성이 안 맞아
 * `false` 일 수 있다. 본 가드는 같은 realm 의 객체 리터럴 / `Object.create(null)`
 * 결과를 참으로 본다.
 *
 * @example
 * if (isPlainObject(payload)) {
 *   for (const k in payload) { /* payload[k]: unknown */ /* }
* }
*/
function isPlainObject(value) {
    if (value === null || typeof value !== "object")
        return false;
    if (Array.isArray(value))
        return false;
    const proto = Object.getPrototypeOf(value);
    // Object.prototype 또는 null prototype (Object.create(null))
    return proto === Object.prototype || proto === null;
}
