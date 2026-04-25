"use strict";
/**
 * useUserPreferences — Phase 1 FG 1-3 사용자 선호 훅.
 *
 * 책임
 * ----
 *  - `/api/v1/account/preferences` GET / PATCH 래핑
 *  - 400ms debounce 로 연속 토글 시 네트워크 부하 완화
 *  - optimistic update (토글 즉시 UI 반영, 실패 시 rollback + toast)
 *
 * 사용 예
 * -------
 *   const { preferences, updatePreference, isLoading } = useUserPreferences();
 *   const mode = preferences?.editor_view_mode ?? "block";
 *   updatePreference({ editor_view_mode: "flow" });
 */
"use client";
/**
 * useUserPreferences — Phase 1 FG 1-3 사용자 선호 훅.
 *
 * 책임
 * ----
 *  - `/api/v1/account/preferences` GET / PATCH 래핑
 *  - 400ms debounce 로 연속 토글 시 네트워크 부하 완화
 *  - optimistic update (토글 즉시 UI 반영, 실패 시 rollback + toast)
 *
 * 사용 예
 * -------
 *   const { preferences, updatePreference, isLoading } = useUserPreferences();
 *   const mode = preferences?.editor_view_mode ?? "block";
 *   updatePreference({ editor_view_mode: "flow" });
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useUserPreferences = useUserPreferences;
const react_1 = require("react");
const react_query_1 = require("@tanstack/react-query");
const account_1 = require("@/lib/api/account");
const useDebouncedCallback_1 = require("@/hooks/useDebouncedCallback");
const uiStore_1 = require("@/stores/uiStore");
const QUERY_KEY = ["me", "preferences"];
const PATCH_DEBOUNCE_MS = 400;
function useUserPreferences() {
    const qc = (0, react_query_1.useQueryClient)();
    // pendingRef: 여러 번의 updatePreference 호출을 *merge* 하기 위한 누적 버퍼.
    //   useDebouncedCallback 의 last-call-wins 시맨틱과 다른 의미이므로 호출자에서 유지한다.
    const pendingRef = (0, react_1.useRef)(null);
    const query = (0, react_query_1.useQuery)({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            const res = await account_1.accountApi.getPreferences();
            return res.data;
        },
        staleTime: 60_000,
    });
    const mutation = (0, react_query_1.useMutation)({
        mutationFn: async (patch) => {
            const res = await account_1.accountApi.updatePreferences(patch);
            return res.data;
        },
        onMutate: async (patch) => {
            // Optimistic update
            await qc.cancelQueries({ queryKey: QUERY_KEY });
            const previous = qc.getQueryData(QUERY_KEY);
            if (previous) {
                const optimistic = { ...previous };
                for (const [k, v] of Object.entries(patch)) {
                    if (v === null)
                        delete optimistic[k];
                    else
                        optimistic[k] = v;
                }
                qc.setQueryData(QUERY_KEY, optimistic);
            }
            return { previous };
        },
        onError: (_err, _patch, ctx) => {
            // Rollback
            if (ctx?.previous) {
                qc.setQueryData(QUERY_KEY, ctx.previous);
            }
            (0, uiStore_1.toast)("뷰 설정을 저장하지 못했어요. 다음 접속에 복원되지 않을 수 있습니다.", "error");
        },
        onSuccess: (next) => {
            qc.setQueryData(QUERY_KEY, next);
        },
    });
    // pendingRef 의 누적 patch 를 실제 PATCH 로 발사. 누적이 없으면 no-op.
    // (mutation 갱신 시 클로저가 갱신되도록 deps 에 mutation 포함.)
    const firePending = (0, react_1.useCallback)(() => {
        const patch = pendingRef.current;
        pendingRef.current = null;
        if (patch)
            mutation.mutate(patch);
    }, [mutation]);
    // docs/함수도서관 §1.6a `useDebouncedCallback` 적용.
    //  - schedulePending(): 마지막 호출 후 PATCH_DEBOUNCE_MS 경과 시 firePending 1회.
    //  - flushPending():    대기 중이면 즉시 실행.
    //  - cancelPending():   대기 중이면 취소(실행하지 않음).
    const [schedulePending, flushPending, cancelPending] = (0, useDebouncedCallback_1.useDebouncedCallback)(firePending, PATCH_DEBOUNCE_MS);
    const updatePreference = (0, react_1.useCallback)((patch) => {
        // merge 하며 debounce
        pendingRef.current = { ...(pendingRef.current ?? {}), ...patch };
        schedulePending();
    }, [schedulePending]);
    const updatePreferenceImmediate = (0, react_1.useCallback)((patch) => {
        pendingRef.current = { ...(pendingRef.current ?? {}), ...patch };
        flushPending();
    }, [flushPending]);
    // 언마운트 시 pending 전송 (사용자 의도 보존)
    //  - useDebouncedCallback 자체 cleanup 보다 본 effect 의 cleanup 이 LIFO 순서상 먼저 실행되므로
    //    cancelPending() + firePending() 으로 명시적 flush 한다 (timer 발화/cleanup race 회피).
    //  - 주의: deps 에 cancelPending/firePending 을 직접 두면 react-query 의 mutation 객체
    //    재생성에 따라 firePending 신원이 매 렌더 바뀌면서 본 effect cleanup 이 *중간* 에도
    //    호출돼 pendingRef 를 즉시 발사해 버린다 (실측 확인). 따라서 ref 로 최신 클로저를 잡고
    //    deps 는 `[]` 로 고정해 진짜 unmount 에서만 동작하도록 한다.
    const cancelPendingRef = (0, react_1.useRef)(cancelPending);
    cancelPendingRef.current = cancelPending;
    const firePendingRef = (0, react_1.useRef)(firePending);
    firePendingRef.current = firePending;
    (0, react_1.useEffect)(() => {
        return () => {
            if (pendingRef.current) {
                cancelPendingRef.current();
                firePendingRef.current();
            }
        };
    }, []);
    return {
        preferences: query.data,
        isLoading: query.isLoading,
        isError: query.isError,
        updatePreference,
        updatePreferenceImmediate,
    };
}
