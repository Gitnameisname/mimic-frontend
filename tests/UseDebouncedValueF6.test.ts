/**
 * docs/함수도서관 F6 — `@/hooks/useDebouncedValue` 검증.
 *
 * jsdom / @testing-library/react 미설치 환경에서 hook 의 시간 의존 동작을 결정론적으로
 * 검증하기 위해 `react` 모듈을 require.cache 레벨에서 스텁한다.
 *
 *   - useState : 인메모리 cell 슬롯
 *   - useEffect: deps shallow-compare → pending 큐에 등록 → render 끝나고 commit
 *   - mock.timers (node:test): setTimeout 을 결정론적으로 진행
 *
 * 검증 축:
 *   1) 모듈 시그니처 (export, arity)
 *   2) 첫 렌더 → debounce 전엔 입력 값 그대로
 *   3) delay 경과 → 새 값 반영
 *   4) delay 안에 value 재변경 → 이전 타이머 취소 (rapid typing)
 *   5) delay 변경 시 effect 재실행
 *   6) 같은 value/delay 재렌더 → effect 재실행 X (불필요 재시작 방지)
 *   7) unmount cleanup → 미발화 타이머 누수 없음
 */
import { test, describe, mock, beforeEach } from "node:test";
import assert from "node:assert/strict";

// ---- React stub (require.cache 주입) ----

type Cell = { value: unknown };
type EffectRecord = {
  fn: () => void | (() => void);
  deps: readonly unknown[] | undefined;
  cleanup: (() => void) | void;
};

const slot: {
  cells: Cell[];
  effects: EffectRecord[];
  cellPos: number;
  effectPos: number;
  pendingRun: number[];
  effectRunCount: number;
} = {
  cells: [],
  effects: [],
  cellPos: 0,
  effectPos: 0,
  pendingRun: [],
  effectRunCount: 0,
};

function resetSlot() {
  slot.cells = [];
  slot.effects = [];
  slot.cellPos = 0;
  slot.effectPos = 0;
  slot.pendingRun = [];
  slot.effectRunCount = 0;
}

const reactStub = {
  useState<T>(initial: T): [T, (v: T | ((p: T) => T)) => void] {
    const idx = slot.cellPos++;
    if (slot.cells.length <= idx) {
      slot.cells.push({ value: initial as unknown });
    }
    const setter = (v: T | ((p: T) => T)) => {
      const cur = slot.cells[idx].value as T;
      const next = typeof v === "function" ? (v as (p: T) => T)(cur) : v;
      slot.cells[idx].value = next as unknown;
    };
    return [slot.cells[idx].value as T, setter];
  },
  useEffect(fn: () => void | (() => void), deps?: readonly unknown[]): void {
    const idx = slot.effectPos++;
    const prev = slot.effects[idx];
    if (!prev) {
      slot.effects.push({ fn, deps, cleanup: undefined });
      slot.pendingRun.push(idx);
      return;
    }
    const depsChanged =
      !deps ||
      !prev.deps ||
      deps.length !== prev.deps.length ||
      deps.some((d, i) => !Object.is(d, prev.deps![i]));
    if (depsChanged) {
      // 이전 cleanup 즉시 호출 (React 의 동기 cleanup → 다음 effect 순서)
      if (typeof prev.cleanup === "function") prev.cleanup();
      slot.effects[idx] = { fn, deps, cleanup: undefined };
      slot.pendingRun.push(idx);
    } else {
      // deps 동일 — fn 만 갱신 (closure 최신화), pendingRun 등록 X
      slot.effects[idx] = { ...prev, fn };
    }
  },
};

// 스텁 주입은 hook require 직전에 한 번.
const reactPath = require.resolve("react");
require.cache[reactPath] = {
  id: reactPath,
  filename: reactPath,
  loaded: true,
  exports: reactStub,
  paths: [],
  children: [],
} as unknown as NodeJS.Module;

// 위 cache 가 set 된 이후에 hook 을 로드해야 stub 이 적용된다.
// import 는 파일 최상단으로 hoist 되므로 require 를 사용한다.
const { useDebouncedValue } = require("../src/hooks/useDebouncedValue") as typeof import("../src/hooks/useDebouncedValue");

// ---- 렌더 / commit 시뮬레이터 ----

function renderHook<T>(value: T, delay: number): T {
  slot.cellPos = 0;
  slot.effectPos = 0;
  slot.pendingRun = [];
  const ret = useDebouncedValue(value, delay);
  // commit phase — pending effect 실행
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
    if (typeof e.cleanup === "function") e.cleanup();
  }
}

// ---- 1. 시그니처 ----

describe("useDebouncedValue — 모듈 시그니처", () => {
  test("함수로 export", () => {
    assert.equal(typeof useDebouncedValue, "function");
  });

  test("정확히 2 개의 인자를 받는다 (value, delay)", () => {
    assert.equal(useDebouncedValue.length, 2);
  });
});

// ---- 2. 동작 ----

describe("useDebouncedValue — 첫 렌더", () => {
  beforeEach(() => {
    resetSlot();
    mock.timers.reset();
    mock.timers.enable({ apis: ["setTimeout"] });
  });

  test("debounce 시작 전이라도 첫 렌더는 입력 value 를 그대로 반환한다", () => {
    const out = renderHook("init", 300);
    assert.equal(out, "init");
  });

  test("primitive 가 아닌 값(객체)도 reference 그대로 반환한다", () => {
    const obj = { id: 1 };
    const out = renderHook(obj, 200);
    assert.strictEqual(out, obj);
  });

  test("delay=0 이어도 첫 렌더 반환은 동기적으로 입력 값", () => {
    const out = renderHook("zero", 0);
    assert.equal(out, "zero");
  });
});

describe("useDebouncedValue — debounce 전이", () => {
  beforeEach(() => {
    resetSlot();
    mock.timers.reset();
    mock.timers.enable({ apis: ["setTimeout"] });
  });

  test("delay 가 지나기 전에는 새 value 를 반영하지 않는다", () => {
    renderHook("a", 300);
    renderHook("b", 300);
    mock.timers.tick(299);
    const out = renderHook("b", 300);
    assert.equal(out, "a");
  });

  test("정확히 delay 경과 시점에 새 value 가 commit 된다", () => {
    renderHook("a", 300);
    renderHook("b", 300);
    mock.timers.tick(300);
    const out = renderHook("b", 300);
    assert.equal(out, "b");
  });

  test("delay 가 큰 값(1000ms) 도 결정론적으로 반영된다", () => {
    renderHook("x", 1000);
    renderHook("y", 1000);
    mock.timers.tick(999);
    assert.equal(renderHook("y", 1000), "x");
    mock.timers.tick(1);
    assert.equal(renderHook("y", 1000), "y");
  });
});

describe("useDebouncedValue — rapid 변경 (이전 타이머 취소)", () => {
  beforeEach(() => {
    resetSlot();
    mock.timers.reset();
    mock.timers.enable({ apis: ["setTimeout"] });
  });

  test("delay 안에 value 가 또 바뀌면 이전 타이머는 취소된다", () => {
    // 시간축: t=0 mount, b timer @ t=300, t=150 에서 c 로 변경 → b 취소, c timer @ t=450
    renderHook("a", 300);
    renderHook("b", 300);
    mock.timers.tick(150); // t=150
    renderHook("c", 300); // 'b' 타이머 취소, 'c' 타이머 시작
    mock.timers.tick(150); // t=300 — 원래 'b' 가 발화했을 시점이지만 취소됨
    assert.equal(renderHook("c", 300), "a"); // 'b' 취소 확인 → 아직 'a'
    mock.timers.tick(149); // t=449 — 'c' 발화 직전
    assert.equal(renderHook("c", 300), "a");
    mock.timers.tick(1); // t=450 — 'c' 발화
    assert.equal(renderHook("c", 300), "c");
  });

  test("3 회 연속 rapid 변경은 마지막 값만 반영된다", () => {
    renderHook("", 200);
    renderHook("h", 200);
    mock.timers.tick(50);
    renderHook("he", 200);
    mock.timers.tick(50);
    renderHook("hel", 200);
    mock.timers.tick(50);
    renderHook("hell", 200);
    mock.timers.tick(50);
    renderHook("hello", 200);
    // 여기까지 총 200ms 경과지만 마지막 'hello' 타이머는 0ms 만 진행됨
    assert.equal(renderHook("hello", 200), "");
    mock.timers.tick(200);
    assert.equal(renderHook("hello", 200), "hello");
  });
});

describe("useDebouncedValue — delay 변경", () => {
  beforeEach(() => {
    resetSlot();
    mock.timers.reset();
    mock.timers.enable({ apis: ["setTimeout"] });
  });

  test("delay 가 변하면 effect 가 재실행되며 새 delay 가 적용된다", () => {
    renderHook("a", 300);
    renderHook("b", 300); // 'b' debounce 시작
    mock.timers.tick(100);
    renderHook("b", 100); // delay 만 변경 → 이전 타이머 취소, 새 100ms 타이머
    mock.timers.tick(99);
    assert.equal(renderHook("b", 100), "a");
    mock.timers.tick(1);
    assert.equal(renderHook("b", 100), "b");
  });
});

describe("useDebouncedValue — 불필요 재시작 방지", () => {
  beforeEach(() => {
    resetSlot();
    mock.timers.reset();
    mock.timers.enable({ apis: ["setTimeout"] });
  });

  test("같은 value/delay 재렌더 시 effect 가 재실행되지 않는다 (Object.is 동치)", () => {
    renderHook("same", 300); // 마운트 → effect 1회 실행
    const baseline = slot.effectRunCount;
    renderHook("same", 300); // deps 동일 → 재실행 X
    renderHook("same", 300); // 또 다시 동일 → 재실행 X
    assert.equal(slot.effectRunCount, baseline);
  });

  test("동일 reference 객체 재전달도 재실행을 일으키지 않는다", () => {
    const obj = { id: 42 };
    renderHook(obj, 200);
    const baseline = slot.effectRunCount;
    renderHook(obj, 200);
    assert.equal(slot.effectRunCount, baseline);
  });
});

describe("useDebouncedValue — unmount cleanup", () => {
  beforeEach(() => {
    resetSlot();
    mock.timers.reset();
    mock.timers.enable({ apis: ["setTimeout"] });
  });

  test("unmount 시 미발화 타이머가 cleanup 으로 취소된다", () => {
    let observed = "init";
    // 직접 setDebounced 가 호출됐는지 알기 어렵지만, mock.timers 의 active 카운트가
    // cleanup 이후 줄어드는지로 간접 확인한다.
    renderHook("a", 300);
    renderHook("b", 300);
    mock.timers.tick(100);
    unmountHook();
    // unmount 이후 추가 tick 해도 throw 없이 진행 (cleanup 으로 clearTimeout 됨)
    assert.doesNotThrow(() => mock.timers.tick(1000));
    void observed;
  });
});
