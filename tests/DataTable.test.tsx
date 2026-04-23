/**
 * DataTable 단위 테스트 — S2-5 코드 커버리지 보강 (2026-04-21)
 *
 * 런타임: Node 22 내장 `node:test` + React 19 `renderToStaticMarkup`.
 * 의존성: React / ReactDOMServer 외 신규 devDep 0개 (npm registry 접근 제한 대응).
 *
 * 전략:
 *   1. 마크업 수준 검증 — renderToStaticMarkup 으로 <thead>/<tbody>/텍스트/aria-*.
 *   2. Element-tree 수준 검증 — DataTable 함수 컴포넌트를 직접 호출해 반환된
 *      React element 트리에서 onClick/onKeyDown/role/tabIndex prop 조사.
 *   3. 핸들러 호출 검증 — onKeyDown 콜백을 직접 호출해 Enter/Space/기타 키의
 *      분기 동작을 확인.
 *
 * 커버리지 목표: DataTable.tsx 전 분기 (loading / empty / interactive / non-interactive).
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DataTable, type Column } from "../src/components/admin/DataTable";

// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------

/** React element 트리를 깊이 우선 순회하며 술어 만족 요소를 모두 수집한다. */
function findAll(
  node: unknown,
  predicate: (el: React.ReactElement) => boolean,
  out: React.ReactElement[] = []
): React.ReactElement[] {
  if (node == null || typeof node === "boolean") return out;
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, out);
    return out;
  }
  if (typeof node !== "object") return out;
  const el = node as React.ReactElement;
  if (predicate(el)) out.push(el);
  const children = (el.props as { children?: unknown })?.children;
  if (children !== undefined) findAll(children, predicate, out);
  return out;
}

/** el.type 이 주어진 태그명인지 확인 (intrinsic 요소만). */
const isTag = (tag: string) => (el: React.ReactElement) =>
  typeof el.type === "string" && el.type === tag;

/** tbody 의 본문 행(tr with <td> 자식)만 골라낸다. 헤더 tr(<th> 자식) 은 제외. */
function isBodyRow(tr: React.ReactElement): boolean {
  const children = (tr.props as { children?: unknown }).children;
  if (!Array.isArray(children) || children.length === 0) return false;
  const first = children[0];
  if (first == null || typeof first !== "object") return false;
  return (first as React.ReactElement).type === "td";
}

/** DataTable 함수 컴포넌트를 직접 호출해 반환 element 를 얻는다. */
function renderToElement<T>(props: Parameters<typeof DataTable<T>>[0]): React.ReactElement {
  // DataTable 은 순수 함수 컴포넌트(hook 미사용) 이므로 직접 호출 가능.
  const el = DataTable(props);
  return el as React.ReactElement;
}

type Row = { id: string; name: string; email: string };

const SAMPLE_ROWS: Row[] = [
  { id: "r1", name: "Alice", email: "a@e.com" },
  { id: "r2", name: "Bob", email: "b@e.com" },
];

const SAMPLE_COLS: Column<Row>[] = [
  { key: "name", header: "이름", render: (r) => r.name },
  { key: "email", header: "이메일", width: "240px", render: (r) => r.email },
];

const rowKey = (r: Row) => r.id;

// ---------------------------------------------------------------------------
// 1. 헤더 렌더링
// ---------------------------------------------------------------------------

describe("DataTable · 헤더", () => {
  test("각 column.header 가 <th scope='col'> 로 렌더된다", () => {
    const html = renderToStaticMarkup(
      React.createElement(DataTable<Row>, {
        columns: SAMPLE_COLS,
        rows: SAMPLE_ROWS,
        rowKey,
        ariaLabel: "샘플",
      })
    );
    assert.match(html, /<th[^>]*scope="col"[^>]*>이름<\/th>/);
    assert.match(html, /<th[^>]*scope="col"[^>]*>이메일<\/th>/);
  });

  test("column.width 는 <th style='width:...'> 로 적용된다", () => {
    const html = renderToStaticMarkup(
      React.createElement(DataTable<Row>, {
        columns: SAMPLE_COLS,
        rows: SAMPLE_ROWS,
        rowKey,
      })
    );
    // 이메일 컬럼만 width 지정
    assert.match(html, /<th[^>]*style="width:240px"[^>]*>이메일<\/th>/);
    // 이름 컬럼은 style 속성 없음
    assert.doesNotMatch(html, /<th[^>]*style="[^"]*"[^>]*>이름<\/th>/);
  });

  test("ariaLabel prop 은 <table aria-label='...'> 로 전달된다", () => {
    const html = renderToStaticMarkup(
      React.createElement(DataTable<Row>, {
        columns: SAMPLE_COLS,
        rows: SAMPLE_ROWS,
        rowKey,
        ariaLabel: "사용자 목록",
      })
    );
    assert.match(html, /<table[^>]*aria-label="사용자 목록"/);
  });
});

// ---------------------------------------------------------------------------
// 2. 로딩 상태
// ---------------------------------------------------------------------------

describe("DataTable · 로딩", () => {
  test("loading=true 일 때 aria-busy='true' 가 테이블에 붙는다", () => {
    const html = renderToStaticMarkup(
      React.createElement(DataTable<Row>, {
        columns: SAMPLE_COLS,
        rows: [],
        rowKey,
        loading: true,
      })
    );
    assert.match(html, /<table[^>]*aria-busy="true"/);
  });

  test("loading=false 일 때 aria-busy 속성이 붙지 않는다", () => {
    const html = renderToStaticMarkup(
      React.createElement(DataTable<Row>, {
        columns: SAMPLE_COLS,
        rows: SAMPLE_ROWS,
        rowKey,
        loading: false,
      })
    );
    assert.doesNotMatch(html, /aria-busy/);
  });

  test("loading=true 일 때 스켈레톤 <tr> 5행이 렌더된다", () => {
    const html = renderToStaticMarkup(
      React.createElement(DataTable<Row>, {
        columns: SAMPLE_COLS,
        rows: SAMPLE_ROWS, // rows 가 있어도 loading 중이면 무시
        rowKey,
        loading: true,
      })
    );
    // tbody 내부 tr 개수
    const tbody = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
    const trCount = (tbody.match(/<tr[\s>]/g) ?? []).length;
    assert.equal(trCount, 5, "로딩 스켈레톤은 5행이어야 함");
    // 실제 row 내용은 렌더되지 않음
    assert.doesNotMatch(html, /Alice/);
    assert.match(html, /animate-pulse/);
  });
});

// ---------------------------------------------------------------------------
// 3. 빈 상태
// ---------------------------------------------------------------------------

describe("DataTable · 빈 상태", () => {
  test("rows=[] 이면 emptyMessage 가 1행으로 렌더되고 colSpan=컬럼수", () => {
    const html = renderToStaticMarkup(
      React.createElement(DataTable<Row>, {
        columns: SAMPLE_COLS,
        rows: [],
        rowKey,
        emptyMessage: "검색 결과가 없습니다.",
      })
    );
    assert.match(html, /colspan="2"/i); // 컬럼 2개
    assert.match(html, /검색 결과가 없습니다\./);
  });

  test("emptyMessage 기본값은 '데이터가 없습니다.'", () => {
    const html = renderToStaticMarkup(
      React.createElement(DataTable<Row>, {
        columns: SAMPLE_COLS,
        rows: [],
        rowKey,
      })
    );
    assert.match(html, /데이터가 없습니다\./);
  });
});

// ---------------------------------------------------------------------------
// 4. 일반 행 렌더링 (non-interactive)
// ---------------------------------------------------------------------------

describe("DataTable · 행 렌더링 (non-interactive)", () => {
  test("render 함수가 각 셀 값으로 호출된다", () => {
    const html = renderToStaticMarkup(
      React.createElement(DataTable<Row>, {
        columns: SAMPLE_COLS,
        rows: SAMPLE_ROWS,
        rowKey,
      })
    );
    assert.match(html, /Alice/);
    assert.match(html, /a@e\.com/);
    assert.match(html, /Bob/);
    assert.match(html, /b@e\.com/);
  });

  test("onRowClick 미제공 시 <tr> 에 role/tabIndex/onClick/onKeyDown 이 모두 없다", () => {
    const el = renderToElement<Row>({
      columns: SAMPLE_COLS,
      rows: SAMPLE_ROWS,
      rowKey,
    });
    const trs = findAll(el, isTag("tr")).filter(isBodyRow);
    assert.equal(trs.length, 2, "본문 <tr> 이 2개여야 함");
    for (const tr of trs) {
      const p = tr.props as Record<string, unknown>;
      assert.equal(p.role, undefined, "non-interactive 행에 role 없어야 함");
      assert.equal(p.tabIndex, undefined, "non-interactive 행에 tabIndex 없어야 함");
      assert.equal(p.onClick, undefined, "non-interactive 행에 onClick 없어야 함");
      assert.equal(p.onKeyDown, undefined, "non-interactive 행에 onKeyDown 없어야 함");
    }
  });
});

// ---------------------------------------------------------------------------
// 5. 상호작용 행 (interactive) — S2-5 P0-2 회귀 방어
// ---------------------------------------------------------------------------

describe("DataTable · 상호작용 행 (interactive)", () => {
  test("onRowClick 제공 시 <tr role='button' tabIndex=0> 이 붙는다", () => {
    const el = renderToElement<Row>({
      columns: SAMPLE_COLS,
      rows: SAMPLE_ROWS,
      rowKey,
      onRowClick: () => {},
    });
    const trs = findAll(el, isTag("tr")).filter(isBodyRow);
    assert.equal(trs.length, 2);
    for (const tr of trs) {
      const p = tr.props as Record<string, unknown>;
      assert.equal(p.role, "button");
      assert.equal(p.tabIndex, 0);
      assert.equal(typeof p.onClick, "function");
      assert.equal(typeof p.onKeyDown, "function");
    }
  });

  test("onClick 호출 시 해당 row 로 onRowClick 가 호출된다", () => {
    const calls: Row[] = [];
    const el = renderToElement<Row>({
      columns: SAMPLE_COLS,
      rows: SAMPLE_ROWS,
      rowKey,
      onRowClick: (row) => calls.push(row),
    });
    const trs = findAll(el, isTag("tr")).filter(isBodyRow);
    (trs[0].props as { onClick: () => void }).onClick();
    (trs[1].props as { onClick: () => void }).onClick();
    assert.deepEqual(
      calls.map((c) => c.id),
      ["r1", "r2"]
    );
  });

  test("onKeyDown Enter → preventDefault + onRowClick 호출", () => {
    const calls: Row[] = [];
    let prevented = false;
    const el = renderToElement<Row>({
      columns: SAMPLE_COLS,
      rows: [SAMPLE_ROWS[0]],
      rowKey,
      onRowClick: (row) => calls.push(row),
    });
    const tr = findAll(el, isTag("tr")).filter(isBodyRow)[0];
    const onKeyDown = (tr.props as { onKeyDown: (e: unknown) => void }).onKeyDown;
    onKeyDown({
      key: "Enter",
      preventDefault: () => {
        prevented = true;
      },
    });
    assert.equal(prevented, true, "Enter 에서 preventDefault 호출되어야 함");
    assert.deepEqual(calls.map((c) => c.id), ["r1"]);
  });

  test("onKeyDown Space(' ') → preventDefault + onRowClick 호출", () => {
    const calls: Row[] = [];
    let prevented = false;
    const el = renderToElement<Row>({
      columns: SAMPLE_COLS,
      rows: [SAMPLE_ROWS[1]],
      rowKey,
      onRowClick: (row) => calls.push(row),
    });
    const tr = findAll(el, isTag("tr")).filter(isBodyRow)[0];
    const onKeyDown = (tr.props as { onKeyDown: (e: unknown) => void }).onKeyDown;
    onKeyDown({
      key: " ",
      preventDefault: () => {
        prevented = true;
      },
    });
    assert.equal(prevented, true, "Space 에서 preventDefault 호출되어야 함");
    assert.deepEqual(calls.map((c) => c.id), ["r2"]);
  });

  test("onKeyDown 기타 키(Escape/a) → onRowClick 호출 안 함, preventDefault 도 안 함", () => {
    const calls: Row[] = [];
    let prevented = false;
    const el = renderToElement<Row>({
      columns: SAMPLE_COLS,
      rows: [SAMPLE_ROWS[0]],
      rowKey,
      onRowClick: (row) => calls.push(row),
    });
    const tr = findAll(el, isTag("tr")).filter(isBodyRow)[0];
    const onKeyDown = (tr.props as { onKeyDown: (e: unknown) => void }).onKeyDown;
    for (const key of ["Escape", "a", "Tab", "ArrowDown"]) {
      onKeyDown({
        key,
        preventDefault: () => {
          prevented = true;
        },
      });
    }
    assert.equal(prevented, false, "활성화 키 외에는 preventDefault 호출 안 해야 함");
    assert.deepEqual(calls, []);
  });

  test("interactive 행에 focus-visible:ring / hover:bg-gray-50 스타일 클래스가 포함된다", () => {
    const html = renderToStaticMarkup(
      React.createElement(DataTable<Row>, {
        columns: SAMPLE_COLS,
        rows: SAMPLE_ROWS,
        rowKey,
        onRowClick: () => {},
      })
    );
    assert.match(html, /hover:bg-gray-50/);
    assert.match(html, /focus-visible:ring-2/);
    assert.match(html, /cursor-pointer/);
  });
});

// ---------------------------------------------------------------------------
// 6. rowKey 적용
// ---------------------------------------------------------------------------

describe("DataTable · rowKey", () => {
  test("rowKey 콜백은 각 row 로 호출되어 key 로 사용된다", () => {
    const ids: string[] = [];
    const html = renderToStaticMarkup(
      React.createElement(DataTable<Row>, {
        columns: SAMPLE_COLS,
        rows: SAMPLE_ROWS,
        rowKey: (r) => {
          ids.push(r.id);
          return r.id;
        },
      })
    );
    // 각 row 에 대해 호출되었음 — React 는 key 조회를 위해 중복 호출할 수 있으므로 set 으로 비교
    assert.deepEqual(
      [...new Set(ids)].sort(),
      ["r1", "r2"]
    );
    // HTML 에 각 row 콘텐츠가 포함
    assert.match(html, /Alice/);
    assert.match(html, /Bob/);
  });
});

// ---------------------------------------------------------------------------
// 7. className pass-through
// ---------------------------------------------------------------------------

describe("DataTable · className", () => {
  test("className prop 은 루트 div 의 클래스에 병합된다", () => {
    const html = renderToStaticMarkup(
      React.createElement(DataTable<Row>, {
        columns: SAMPLE_COLS,
        rows: SAMPLE_ROWS,
        rowKey,
        className: "my-custom-class",
      })
    );
    // 루트: <div class="overflow-x-auto my-custom-class">
    assert.match(html, /<div[^>]*class="[^"]*my-custom-class[^"]*"/);
    assert.match(html, /overflow-x-auto/);
  });
});
