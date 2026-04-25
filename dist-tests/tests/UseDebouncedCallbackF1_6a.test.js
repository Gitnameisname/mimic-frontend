"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * docs/함수도서관 §1.6a — `@/hooks/useDebouncedCallback` 검증.
 *
 * F6(`useDebouncedValue`) 와 동일한 require.cache React 스텁 + node:test mock.timers
 * 패턴을 사용한다. useRef / useCallback / useMemo 까지 스텁 범위를 확장한다.
 *
 * 검증 축:
 *   1) 모듈 시그니처 (export, arity, 튜플 길이/타입)
 *   2) 기본 debounce — delay 후 1회 실행
 *   3) 연속 호출 — 마지막 args 만 실행 (last-call wins)
 *   4) flush() — 즉시 실행 + 1회만 + 타이머 정리
 *   5) cancel() — 미실행 + 타이머 정리
 *   6) unmount 자동 cancel (flush 아님)
 *   7) fn 최신성 — 리렌더로 fn 갈아끼움 후 다음 실행은 새 fn
 *   8) delay 변경 — 다음 호출부터 새 delay 적용
 *   9) delay=0 — 다음 macrotask 에 실행
 *  10) 튜플 identity — 리렌더 후에도 [debounced, flush, cancel] 동일 reference
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const slot = {
    cells: [],
    refs: [],
    effects: [],
    callbacks: [],
    memos: [],
    cellPos: 0,
    refPos: 0,
    effectPos: 0,
    callbackPos: 0,
    memoPos: 0,
    pendingRun: [],
    effectRunCount: 0,
};
function resetSlot() {
    slot.cells = [];
    slot.refs = [];
    slot.effects = [];
    slot.callbacks = [];
    slot.memos = [];
    slot.cellPos = 0;
    slot.refPos = 0;
    slot.effectPos = 0;
    slot.callbackPos = 0;
    slot.memoPos = 0;
    slot.pendingRun = [];
    slot.effectRunCount = 0;
}
const reactStub = {
    useState(initial) {
        const idx = slot.cellPos++;
        if (slot.cells.length <= idx)
            slot.cells.push({ value: initial });
        const setter = (v) => {
            const cur = slot.cells[idx].value;
            const next = typeof v === "function" ? v(cur) : v;
            slot.cells[idx].value = next;
        };
        return [slot.cells[idx].value, setter];
    },
    useRef(initial) {
        const idx = slot.refPos++;
        if (slot.refs.length <= idx) {
            slot.refs.push({ current: initial });
        }
        return slot.refs[idx];
    },
    useEffect(fn, deps) {
        const idx = slot.effectPos++;
        const prev = slot.effects[idx];
        if (!prev) {
            slot.effects.push({ fn, deps, cleanup: undefined });
            slot.pendingRun.push(idx);
            return;
        }
        const depsChanged = !deps ||
            !prev.deps ||
            deps.length !== prev.deps.length ||
            deps.some((d, i) => !Object.is(d, prev.deps[i]));
        if (depsChanged) {
            if (typeof prev.cleanup === "function")
                prev.cleanup();
            slot.effects[idx] = { fn, deps, cleanup: undefined };
            slot.pendingRun.push(idx);
        }
        else {
            slot.effects[idx] = { ...prev, fn };
        }
    },
    useCallback(fn, deps) {
        const idx = slot.callbackPos++;
        const prev = slot.callbacks[idx];
        if (!prev) {
            slot.callbacks.push({ value: fn, deps });
            return fn;
        }
        const depsChanged = deps.length !== prev.deps.length ||
            deps.some((d, i) => !Object.is(d, prev.deps[i]));
        if (depsChanged) {
            slot.callbacks[idx] = { value: fn, deps };
            return fn;
        }
        return prev.value;
    },
    useMemo(factory, deps) {
        const idx = slot.memoPos++;
        const prev = slot.memos[idx];
        if (!prev) {
            const v = factory();
            slot.memos.push({ value: v, deps });
            return v;
        }
        const depsChanged = deps.length !== prev.deps.length ||
            deps.some((d, i) => !Object.is(d, prev.deps[i]));
        if (depsChanged) {
            const v = factory();
            slot.memos[idx] = { value: v, deps };
            return v;
        }
        return prev.value;
    },
};
const reactPath = require.resolve("react");
require.cache[reactPath] = {
    id: reactPath,
    filename: reactPath,
    loaded: true,
    exports: reactStub,
    paths: [],
    children: [],
};
const { useDebouncedCallback } = require("../src/hooks/useDebouncedCallback");
function renderHook(fn, delay) {
    slot.cellPos = 0;
    slot.refPos = 0;
    slot.effectPos = 0;
    slot.callbackPos = 0;
    slot.memoPos = 0;
    slot.pendingRun = [];
    const ret = useDebouncedCallback(fn, delay);
    for (const idx of slot.pendingRun) {
        const e = slot.effects[idx];
        e.cleanup = e.fn();
        slot.effectRunCount++;
    }
    slot.pendingRun = [];
    return ret;
}
function unmountHook() {
    for (const e of slot.effects) {
        if (typeof e.cleanup === "function")
            e.cleanup();
    }
}
// ---- 1. 시그니처 ----
(0, node_test_1.describe)("useDebouncedCallback — 모듈 시그니처", () => {
    (0, node_test_1.test)("함수로 export", () => {
        strict_1.default.equal(typeof useDebouncedCallback, "function");
    });
    (0, node_test_1.test)("정확히 2 개의 인자를 받는다 (fn, delay)", () => {
        strict_1.default.equal(useDebouncedCallback.length, 2);
    });
    (0, node_test_1.test)("반환값은 [debounced, flush, cancel] 3-tuple", () => {
        resetSlot();
        node_test_1.mock.timers.reset();
        node_test_1.mock.timers.enable({ apis: ["setTimeout"] });
        const tuple = renderHook(() => undefined, 100);
        strict_1.default.equal(tuple.length, 3);
        strict_1.default.equal(typeof tuple[0], "function");
        strict_1.default.equal(typeof tuple[1], "function");
        strict_1.default.equal(typeof tuple[2], "function");
    });
});
// ---- 2. 기본 debounce ----
(0, node_test_1.describe)("useDebouncedCallback — 기본 동작", () => {
    (0, node_test_1.beforeEach)(() => {
        resetSlot();
        node_test_1.mock.timers.reset();
        node_test_1.mock.timers.enable({ apis: ["setTimeout"] });
    });
    (0, node_test_1.test)("debounced 호출 후 delay 경과 시 fn 1회 실행", () => {
        let calls = 0;
        let lastArg = null;
        const fn = (s) => {
            calls++;
            lastArg = s;
        };
        const [debounced] = renderHook(fn, 200);
        debounced("a");
        strict_1.default.equal(calls, 0);
        node_test_1.mock.timers.tick(199);
        strict_1.default.equal(calls, 0);
        node_test_1.mock.timers.tick(1);
        strict_1.default.equal(calls, 1);
        strict_1.default.equal(lastArg, "a");
    });
    (0, node_test_1.test)("호출 없이 delay 경과해도 fn 은 실행되지 않는다", () => {
        let calls = 0;
        renderHook(() => {
            calls++;
        }, 100);
        node_test_1.mock.timers.tick(1000);
        strict_1.default.equal(calls, 0);
    });
});
// ---- 3. 연속 호출 (last-call wins) ----
(0, node_test_1.describe)("useDebouncedCallback — 연속 호출", () => {
    (0, node_test_1.beforeEach)(() => {
        resetSlot();
        node_test_1.mock.timers.reset();
        node_test_1.mock.timers.enable({ apis: ["setTimeout"] });
    });
    (0, node_test_1.test)("delay 안에 여러 번 호출되면 마지막 args 만 실행", () => {
        let calls = 0;
        let received = [];
        const [debounced] = renderHook((s) => {
            calls++;
            received.push(s);
        }, 300);
        debounced("a");
        node_test_1.mock.timers.tick(100);
        debounced("b");
        node_test_1.mock.timers.tick(100);
        debounced("c");
        node_test_1.mock.timers.tick(299);
        strict_1.default.equal(calls, 0);
        node_test_1.mock.timers.tick(1);
        strict_1.default.equal(calls, 1);
        strict_1.default.deepEqual(received, ["c"]);
    });
    (0, node_test_1.test)("delay 경과 후 다시 호출하면 새 debounce 사이클", () => {
        let received = [];
        const [debounced] = renderHook((s) => received.push(s), 200);
        debounced("first");
        node_test_1.mock.timers.tick(200);
        strict_1.default.deepEqual(received, ["first"]);
        debounced("second");
        node_test_1.mock.timers.tick(199);
        strict_1.default.deepEqual(received, ["first"]);
        node_test_1.mock.timers.tick(1);
        strict_1.default.deepEqual(received, ["first", "second"]);
    });
});
// ---- 4. flush() ----
(0, node_test_1.describe)("useDebouncedCallback — flush()", () => {
    (0, node_test_1.beforeEach)(() => {
        resetSlot();
        node_test_1.mock.timers.reset();
        node_test_1.mock.timers.enable({ apis: ["setTimeout"] });
    });
    (0, node_test_1.test)("flush() 는 대기 중인 호출을 즉시 실행한다", () => {
        let calls = 0;
        let lastArg = null;
        const [debounced, flush] = renderHook((n) => {
            calls++;
            lastArg = n;
        }, 500);
        debounced(42);
        flush();
        strict_1.default.equal(calls, 1);
        strict_1.default.equal(lastArg, 42);
    });
    (0, node_test_1.test)("flush() 후 원래 타이머가 발화해도 두 번 실행되지 않는다", () => {
        let calls = 0;
        const [debounced, flush] = renderHook(() => {
            calls++;
        }, 500);
        debounced();
        node_test_1.mock.timers.tick(100);
        flush();
        strict_1.default.equal(calls, 1);
        node_test_1.mock.timers.tick(1000);
        strict_1.default.equal(calls, 1);
    });
    (0, node_test_1.test)("대기 중 호출이 없으면 flush() 는 no-op", () => {
        let calls = 0;
        const [, flush] = renderHook(() => {
            calls++;
        }, 200);
        flush();
        flush();
        strict_1.default.equal(calls, 0);
    });
    (0, node_test_1.test)("flush() 후 새 debounced() 호출은 정상적으로 새 사이클", () => {
        let received = [];
        const [debounced, flush] = renderHook((s) => received.push(s), 300);
        debounced("a");
        flush();
        debounced("b");
        node_test_1.mock.timers.tick(300);
        strict_1.default.deepEqual(received, ["a", "b"]);
    });
});
// ---- 5. cancel() ----
(0, node_test_1.describe)("useDebouncedCallback — cancel()", () => {
    (0, node_test_1.beforeEach)(() => {
        resetSlot();
        node_test_1.mock.timers.reset();
        node_test_1.mock.timers.enable({ apis: ["setTimeout"] });
    });
    (0, node_test_1.test)("cancel() 후 타이머 발화해도 fn 실행되지 않는다", () => {
        let calls = 0;
        const [debounced, , cancel] = renderHook(() => {
            calls++;
        }, 300);
        debounced();
        node_test_1.mock.timers.tick(100);
        cancel();
        node_test_1.mock.timers.tick(1000);
        strict_1.default.equal(calls, 0);
    });
    (0, node_test_1.test)("cancel() 후 새 debounced() 호출은 정상", () => {
        let received = [];
        const [debounced, , cancel] = renderHook((s) => received.push(s), 200);
        debounced("a");
        cancel();
        debounced("b");
        node_test_1.mock.timers.tick(200);
        strict_1.default.deepEqual(received, ["b"]);
    });
    (0, node_test_1.test)("대기 중 호출이 없으면 cancel() 은 no-op", () => {
        let calls = 0;
        const [, , cancel] = renderHook(() => {
            calls++;
        }, 100);
        cancel();
        cancel();
        strict_1.default.equal(calls, 0);
        node_test_1.mock.timers.tick(1000);
        strict_1.default.equal(calls, 0);
    });
});
// ---- 6. unmount 자동 cancel ----
(0, node_test_1.describe)("useDebouncedCallback — unmount 자동 cancel", () => {
    (0, node_test_1.beforeEach)(() => {
        resetSlot();
        node_test_1.mock.timers.reset();
        node_test_1.mock.timers.enable({ apis: ["setTimeout"] });
    });
    (0, node_test_1.test)("unmount 후 타이머 발화해도 fn 실행되지 않는다 (flush 아님)", () => {
        let calls = 0;
        const [debounced] = renderHook(() => {
            calls++;
        }, 500);
        debounced();
        node_test_1.mock.timers.tick(100);
        unmountHook();
        node_test_1.mock.timers.tick(1000);
        strict_1.default.equal(calls, 0);
    });
    (0, node_test_1.test)("unmount 시 throw 없이 cleanup", () => {
        const [debounced] = renderHook(() => undefined, 200);
        debounced();
        strict_1.default.doesNotThrow(() => unmountHook());
    });
});
// ---- 7. fn 최신성 ----
(0, node_test_1.describe)("useDebouncedCallback — fn 최신성", () => {
    (0, node_test_1.beforeEach)(() => {
        resetSlot();
        node_test_1.mock.timers.reset();
        node_test_1.mock.timers.enable({ apis: ["setTimeout"] });
    });
    (0, node_test_1.test)("리렌더로 fn 이 갈아끼워지면 다음 발화는 새 fn 으로 실행", () => {
        let calls = [];
        const fn1 = () => calls.push("fn1");
        const fn2 = () => calls.push("fn2");
        const [debounced] = renderHook(fn1, 200);
        debounced();
        node_test_1.mock.timers.tick(100);
        // 리렌더로 fn 교체 (delay 동일)
        renderHook(fn2, 200);
        node_test_1.mock.timers.tick(100);
        // 타이머는 그대로 진행 → 발화 시점에 ref.current 가 fn2
        strict_1.default.deepEqual(calls, ["fn2"]);
    });
    (0, node_test_1.test)("flush() 도 최신 fn 을 사용한다", () => {
        let calls = [];
        const fn1 = () => calls.push("fn1");
        const fn2 = () => calls.push("fn2");
        const [debounced, flush] = renderHook(fn1, 500);
        debounced();
        // 리렌더 후 fn 교체. 같은 튜플 identity 가 유지되므로 기존 [debounced, flush] 그대로 사용 가능.
        renderHook(fn2, 500);
        flush();
        strict_1.default.deepEqual(calls, ["fn2"]);
    });
});
// ---- 8. delay 변경 ----
(0, node_test_1.describe)("useDebouncedCallback — delay 변경", () => {
    (0, node_test_1.beforeEach)(() => {
        resetSlot();
        node_test_1.mock.timers.reset();
        node_test_1.mock.timers.enable({ apis: ["setTimeout"] });
    });
    (0, node_test_1.test)("delay 변경은 다음 debounced() 호출부터 적용된다", () => {
        let calls = 0;
        const [debounced] = renderHook(() => {
            calls++;
        }, 500);
        // 1) 500ms 사이클 시작
        debounced();
        node_test_1.mock.timers.tick(500);
        strict_1.default.equal(calls, 1);
        // 2) 리렌더로 delay 변경 → 새 호출은 100ms 사이클
        const [debounced2] = renderHook(() => {
            calls++;
        }, 100);
        debounced2();
        node_test_1.mock.timers.tick(99);
        strict_1.default.equal(calls, 1);
        node_test_1.mock.timers.tick(1);
        strict_1.default.equal(calls, 2);
    });
});
// ---- 9. delay=0 ----
(0, node_test_1.describe)("useDebouncedCallback — delay=0", () => {
    (0, node_test_1.beforeEach)(() => {
        resetSlot();
        node_test_1.mock.timers.reset();
        node_test_1.mock.timers.enable({ apis: ["setTimeout"] });
    });
    (0, node_test_1.test)("delay=0 이면 다음 macrotask 에 실행", () => {
        let calls = 0;
        const [debounced] = renderHook(() => {
            calls++;
        }, 0);
        debounced();
        strict_1.default.equal(calls, 0); // 동기 호출 시점엔 아직 실행 X
        node_test_1.mock.timers.tick(0);
        strict_1.default.equal(calls, 1);
    });
});
// ---- 10. 튜플 identity 안정성 ----
(0, node_test_1.describe)("useDebouncedCallback — 튜플 identity", () => {
    (0, node_test_1.beforeEach)(() => {
        resetSlot();
        node_test_1.mock.timers.reset();
        node_test_1.mock.timers.enable({ apis: ["setTimeout"] });
    });
    (0, node_test_1.test)("동일 fn/delay 재렌더 시 [debounced, flush, cancel] 동일 reference", () => {
        const fn = () => undefined;
        const t1 = renderHook(fn, 200);
        const t2 = renderHook(fn, 200);
        strict_1.default.strictEqual(t1, t2);
        strict_1.default.strictEqual(t1[0], t2[0]);
        strict_1.default.strictEqual(t1[1], t2[1]);
        strict_1.default.strictEqual(t1[2], t2[2]);
    });
    (0, node_test_1.test)("fn 만 바뀌어도 튜플 identity 는 유지 (debounced/flush/cancel 모두 stable)", () => {
        const t1 = renderHook(() => undefined, 200);
        const t2 = renderHook(() => undefined, 200);
        // debounced/flush/cancel 자체는 useCallback([]) 으로 stable 이어야 한다.
        // (튜플은 useMemo 이므로 deps 동일 시 동일 reference.)
        strict_1.default.strictEqual(t1[0], t2[0]);
        strict_1.default.strictEqual(t1[1], t2[1]);
        strict_1.default.strictEqual(t1[2], t2[2]);
        strict_1.default.strictEqual(t1, t2);
    });
});
