"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDebouncedCallback = useDebouncedCallback;
/**
 * useDebouncedCallback — 함수 호출 자체를 debounce 하는 훅.
 *
 * docs/함수도서관 §1.6a (2026-04-25 신설, F6 후속).
 *
 * 사용처 (S3 Phase 2 기준):
 *  - `hooks/useUserPreferences`              — PATCH 호출 400ms (merge 시맨틱은 호출자 유지)
 *  - `features/editor/DocumentEditPage`      — autoSave 30,000ms (마지막 입력 후 1회)
 *  - `components/chat/SearchBox`             — onChange(input) 500ms
 *
 * F6 (`useDebouncedValue`) 와의 차이:
 *  - F6 는 *값* 의 갱신을 늦춘다 → 입력 → 안정된 값 → effect 트리거.
 *  - 본 훅은 *함수 호출* 자체를 늦춘다 → 부수효과(PATCH/저장/콜백)를 늦춰서 1회만.
 *  - 호출 인자(`...args`) 는 마지막 호출의 것이 그대로 fn 에 전달된다 (last-call wins).
 *
 * API:
 *  - `[debounced, flush, cancel] = useDebouncedCallback(fn, delay)`
 *  - `debounced(...args)` : 마지막 호출 시점부터 `delay` ms 후 `fn(...args)` 1회 실행.
 *  - `flush()`            : 대기 중인 호출이 있으면 즉시 실행 + 타이머 취소. 없으면 no-op.
 *  - `cancel()`           : 대기 중인 호출이 있으면 취소(실행하지 않음). 없으면 no-op.
 *
 * 시맨틱:
 *  - 가장 최신의 `fn` 참조를 ref 에 보관 → 컴포넌트 리렌더로 fn 이 갱신돼도 최근 클로저로 실행.
 *  - 컴포넌트 unmount 시 대기 중 타이머는 자동으로 cancel (실행하지 않음).
 *    → flush-on-unmount 가 필요하면 호출자가 별도 useEffect cleanup 으로 `flush()` 를 부른다.
 *      (예: useUserPreferences 는 사용자가 누른 토글이 사라지면 안 되므로 flush.)
 *  - `delay` 변경은 다음 `debounced(...)` 호출부터 즉시 반영. 이미 진행 중인 타이머는 영향 없음.
 *  - `debounced` / `flush` / `cancel` 는 매 렌더에서 stable identity 를 유지 (useCallback + ref).
 *    → useEffect deps 에 안전하게 넣을 수 있고, 자식 컴포넌트의 React.memo 무효화도 일으키지 않음.
 *
 * 호출 규약:
 *  - `delay` 는 호출자가 의미값(150 / 300 / 500 / 30_000 등) 으로 직접 주입.
 *  - 음수·NaN·`Infinity` 는 setTimeout 기본 동작에 위임 (음수/NaN → 0ms 처럼 동작).
 *  - `fn` 은 호출 시점에 stable 일 필요 없음 (ref 로 최신성 보장).
 *  - 반환된 `debounced` 의 반환값은 항상 `void` (실제 fn 실행은 비동기로 분리되므로 의미 없음).
 *
 * SSR / Next.js:
 *  - 본문에서 `setTimeout` 만 사용. 서버 측 첫 렌더에서도 타이머는 호출되지 않음
 *    (호출자가 effect / 이벤트 핸들러에서 `debounced(...)` 호출).
 *  - `useRef` / `useEffect` 만 사용 → Next.js 16 RSC 와 양립.
 *
 * 사용 예:
 * ```ts
 * const [debouncedSave, flushSave, cancelSave] = useDebouncedCallback(
 *   (text: string) => api.save({ text }),
 *   500,
 * );
 * onInput((e) => debouncedSave(e.target.value));
 * onBlur(() => flushSave());     // 떠나기 전에 즉시 저장
 * onCancel(() => cancelSave());  // 사용자가 취소
 * ```
 */
const react_1 = require("react");
function useDebouncedCallback(fn, delay) {
    // 1) 항상 최신 fn 을 가리키는 ref (closure 갈아끼움 안전).
    const fnRef = (0, react_1.useRef)(fn);
    fnRef.current = fn;
    // 2) 항상 최신 delay 를 가리키는 ref (debounced 호출 시점의 값을 사용).
    const delayRef = (0, react_1.useRef)(delay);
    delayRef.current = delay;
    // 3) 진행 중인 타이머와 보류된 인자.
    const timerRef = (0, react_1.useRef)(null);
    const pendingArgsRef = (0, react_1.useRef)(null);
    const cancel = (0, react_1.useCallback)(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        pendingArgsRef.current = null;
    }, []);
    const flush = (0, react_1.useCallback)(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        const args = pendingArgsRef.current;
        pendingArgsRef.current = null;
        if (args !== null) {
            // 최신 fn 으로 실행. 반환값은 의도적으로 폐기.
            fnRef.current(...args);
        }
    }, []);
    const debounced = (0, react_1.useCallback)((...args) => {
        pendingArgsRef.current = args;
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            const pending = pendingArgsRef.current;
            pendingArgsRef.current = null;
            if (pending !== null) {
                fnRef.current(...pending);
            }
        }, delayRef.current);
    }, []);
    // 4) Unmount 시 대기 중인 타이머는 자동 취소 (실행하지 않음).
    //    flush-on-unmount 가 필요한 호출자는 별도 useEffect 에서 `flush()` 를 부른다.
    (0, react_1.useEffect)(() => {
        return () => {
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            pendingArgsRef.current = null;
        };
    }, []);
    // useMemo 로 튜플을 stable 하게 유지 → 호출자 useEffect deps 에 넣어도 매 렌더 재실행 X.
    return (0, react_1.useMemo)(() => [debounced, flush, cancel], [debounced, flush, cancel]);
}
exports.default = useDebouncedCallback;
