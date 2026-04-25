"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDebouncedValue = useDebouncedValue;
/**
 * useDebouncedValue — 입력 값을 `delay` ms 동안 안정될 때까지 늦춰서 반환하는 훅.
 *
 * docs/함수도서관 F6 (2026-04-25 신설).
 *
 * 사용처 (S3 Phase 2 기준):
 *  - `features/tags/TagChipsEditor`           — 태그 자동완성 입력 (150ms)
 *  - `features/explore/AddDocumentsToCollectionModal` — 문서 검색 입력 (300ms)
 *  - `features/documents/DocumentListPage`    — 제목 ILIKE 검색 입력 (300ms)
 *
 * 시맨틱:
 *  - `value` 가 변경되면 `delay` 만큼 기다렸다가 반환 값을 갱신한다.
 *  - 그 사이에 또 변경되면 이전 타이머는 취소되고 새 타이머가 시작된다.
 *  - 컴포넌트 언마운트 시 타이머는 자동으로 정리된다 (메모리 누수 방지).
 *
 * 호출 규약:
 *  - `delay` 는 호출자가 의도한 의미값 (자동완성·검색 등) 에 맞춰 직접 주입한다.
 *  - 음수·NaN·`Infinity` 는 React state 갱신을 일으키지 않으므로 호출 측에서 정상 범위
 *    (≥ 0, 일반적으로 100~500ms) 를 보장할 것.
 *  - `value` 는 React 의 `Object.is` 비교를 통해 변경 여부가 판단된다 (deep compare 아님).
 *    객체/배열을 직접 넘기면 매 렌더마다 타이머가 재시작될 수 있으니 호출 측에서
 *    primitive 또는 안정된 reference 로 좁힐 것.
 *
 * SSR / Next.js:
 *  - `useEffect` 안에서만 `setTimeout` 을 호출하므로 SSR 에서 문제 없음.
 *  - 첫 렌더에는 `value` 가 그대로 반환되며, 이후 effect 가 실행되면서 debounce 가 시작된다.
 *
 * 사용 예:
 * ```ts
 * const [draft, setDraft] = useState("");
 * const debouncedDraft = useDebouncedValue(draft, 300);
 * useEffect(() => {
 *   if (debouncedDraft) fetchSuggestions(debouncedDraft);
 * }, [debouncedDraft]);
 * ```
 */
const react_1 = require("react");
function useDebouncedValue(value, delay) {
    const [debounced, setDebounced] = (0, react_1.useState)(value);
    (0, react_1.useEffect)(() => {
        const handle = setTimeout(() => {
            setDebounced(value);
        }, delay);
        return () => clearTimeout(handle);
    }, [value, delay]);
    return debounced;
}
exports.default = useDebouncedValue;
