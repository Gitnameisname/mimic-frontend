"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const React = __importStar(require("react"));
const server_1 = require("react-dom/server");
const DataTable_1 = require("../src/components/admin/DataTable");
// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------
/** React element 트리를 깊이 우선 순회하며 술어 만족 요소를 모두 수집한다. */
function findAll(node, predicate, out = []) {
    if (node == null || typeof node === "boolean")
        return out;
    if (Array.isArray(node)) {
        for (const child of node)
            findAll(child, predicate, out);
        return out;
    }
    if (typeof node !== "object")
        return out;
    const el = node;
    if (predicate(el))
        out.push(el);
    const children = el.props?.children;
    if (children !== undefined)
        findAll(children, predicate, out);
    return out;
}
/** el.type 이 주어진 태그명인지 확인 (intrinsic 요소만). */
const isTag = (tag) => (el) => typeof el.type === "string" && el.type === tag;
/** tbody 의 본문 행(tr with <td> 자식)만 골라낸다. 헤더 tr(<th> 자식) 은 제외. */
function isBodyRow(tr) {
    const children = tr.props.children;
    if (!Array.isArray(children) || children.length === 0)
        return false;
    const first = children[0];
    if (first == null || typeof first !== "object")
        return false;
    return first.type === "td";
}
/** DataTable 함수 컴포넌트를 직접 호출해 반환 element 를 얻는다. */
function renderToElement(props) {
    // DataTable 은 순수 함수 컴포넌트(hook 미사용) 이므로 직접 호출 가능.
    const el = (0, DataTable_1.DataTable)(props);
    return el;
}
const SAMPLE_ROWS = [
    { id: "r1", name: "Alice", email: "a@e.com" },
    { id: "r2", name: "Bob", email: "b@e.com" },
];
const SAMPLE_COLS = [
    { key: "name", header: "이름", render: (r) => r.name },
    { key: "email", header: "이메일", width: "240px", render: (r) => r.email },
];
const rowKey = (r) => r.id;
// ---------------------------------------------------------------------------
// 1. 헤더 렌더링
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("DataTable · 헤더", () => {
    (0, node_test_1.test)("각 column.header 가 <th scope='col'> 로 렌더된다", () => {
        const html = (0, server_1.renderToStaticMarkup)(React.createElement((DataTable_1.DataTable), {
            columns: SAMPLE_COLS,
            rows: SAMPLE_ROWS,
            rowKey,
            ariaLabel: "샘플",
        }));
        strict_1.default.match(html, /<th[^>]*scope="col"[^>]*>이름<\/th>/);
        strict_1.default.match(html, /<th[^>]*scope="col"[^>]*>이메일<\/th>/);
    });
    (0, node_test_1.test)("column.width 는 <th style='width:...'> 로 적용된다", () => {
        const html = (0, server_1.renderToStaticMarkup)(React.createElement((DataTable_1.DataTable), {
            columns: SAMPLE_COLS,
            rows: SAMPLE_ROWS,
            rowKey,
        }));
        // 이메일 컬럼만 width 지정
        strict_1.default.match(html, /<th[^>]*style="width:240px"[^>]*>이메일<\/th>/);
        // 이름 컬럼은 style 속성 없음
        strict_1.default.doesNotMatch(html, /<th[^>]*style="[^"]*"[^>]*>이름<\/th>/);
    });
    (0, node_test_1.test)("ariaLabel prop 은 <table aria-label='...'> 로 전달된다", () => {
        const html = (0, server_1.renderToStaticMarkup)(React.createElement((DataTable_1.DataTable), {
            columns: SAMPLE_COLS,
            rows: SAMPLE_ROWS,
            rowKey,
            ariaLabel: "사용자 목록",
        }));
        strict_1.default.match(html, /<table[^>]*aria-label="사용자 목록"/);
    });
});
// ---------------------------------------------------------------------------
// 2. 로딩 상태
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("DataTable · 로딩", () => {
    (0, node_test_1.test)("loading=true 일 때 aria-busy='true' 가 테이블에 붙는다", () => {
        const html = (0, server_1.renderToStaticMarkup)(React.createElement((DataTable_1.DataTable), {
            columns: SAMPLE_COLS,
            rows: [],
            rowKey,
            loading: true,
        }));
        strict_1.default.match(html, /<table[^>]*aria-busy="true"/);
    });
    (0, node_test_1.test)("loading=false 일 때 aria-busy 속성이 붙지 않는다", () => {
        const html = (0, server_1.renderToStaticMarkup)(React.createElement((DataTable_1.DataTable), {
            columns: SAMPLE_COLS,
            rows: SAMPLE_ROWS,
            rowKey,
            loading: false,
        }));
        strict_1.default.doesNotMatch(html, /aria-busy/);
    });
    (0, node_test_1.test)("loading=true 일 때 스켈레톤 <tr> 5행이 렌더된다", () => {
        const html = (0, server_1.renderToStaticMarkup)(React.createElement((DataTable_1.DataTable), {
            columns: SAMPLE_COLS,
            rows: SAMPLE_ROWS, // rows 가 있어도 loading 중이면 무시
            rowKey,
            loading: true,
        }));
        // tbody 내부 tr 개수
        const tbody = html.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/)?.[1] ?? "";
        const trCount = (tbody.match(/<tr[\s>]/g) ?? []).length;
        strict_1.default.equal(trCount, 5, "로딩 스켈레톤은 5행이어야 함");
        // 실제 row 내용은 렌더되지 않음
        strict_1.default.doesNotMatch(html, /Alice/);
        strict_1.default.match(html, /animate-pulse/);
    });
});
// ---------------------------------------------------------------------------
// 3. 빈 상태
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("DataTable · 빈 상태", () => {
    (0, node_test_1.test)("rows=[] 이면 emptyMessage 가 1행으로 렌더되고 colSpan=컬럼수", () => {
        const html = (0, server_1.renderToStaticMarkup)(React.createElement((DataTable_1.DataTable), {
            columns: SAMPLE_COLS,
            rows: [],
            rowKey,
            emptyMessage: "검색 결과가 없습니다.",
        }));
        strict_1.default.match(html, /colspan="2"/i); // 컬럼 2개
        strict_1.default.match(html, /검색 결과가 없습니다\./);
    });
    (0, node_test_1.test)("emptyMessage 기본값은 '데이터가 없습니다.'", () => {
        const html = (0, server_1.renderToStaticMarkup)(React.createElement((DataTable_1.DataTable), {
            columns: SAMPLE_COLS,
            rows: [],
            rowKey,
        }));
        strict_1.default.match(html, /데이터가 없습니다\./);
    });
});
// ---------------------------------------------------------------------------
// 4. 일반 행 렌더링 (non-interactive)
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("DataTable · 행 렌더링 (non-interactive)", () => {
    (0, node_test_1.test)("render 함수가 각 셀 값으로 호출된다", () => {
        const html = (0, server_1.renderToStaticMarkup)(React.createElement((DataTable_1.DataTable), {
            columns: SAMPLE_COLS,
            rows: SAMPLE_ROWS,
            rowKey,
        }));
        strict_1.default.match(html, /Alice/);
        strict_1.default.match(html, /a@e\.com/);
        strict_1.default.match(html, /Bob/);
        strict_1.default.match(html, /b@e\.com/);
    });
    (0, node_test_1.test)("onRowClick 미제공 시 <tr> 에 role/tabIndex/onClick/onKeyDown 이 모두 없다", () => {
        const el = renderToElement({
            columns: SAMPLE_COLS,
            rows: SAMPLE_ROWS,
            rowKey,
        });
        const trs = findAll(el, isTag("tr")).filter(isBodyRow);
        strict_1.default.equal(trs.length, 2, "본문 <tr> 이 2개여야 함");
        for (const tr of trs) {
            const p = tr.props;
            strict_1.default.equal(p.role, undefined, "non-interactive 행에 role 없어야 함");
            strict_1.default.equal(p.tabIndex, undefined, "non-interactive 행에 tabIndex 없어야 함");
            strict_1.default.equal(p.onClick, undefined, "non-interactive 행에 onClick 없어야 함");
            strict_1.default.equal(p.onKeyDown, undefined, "non-interactive 행에 onKeyDown 없어야 함");
        }
    });
});
// ---------------------------------------------------------------------------
// 5. 상호작용 행 (interactive) — S2-5 P0-2 회귀 방어
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("DataTable · 상호작용 행 (interactive)", () => {
    (0, node_test_1.test)("onRowClick 제공 시 <tr role='button' tabIndex=0> 이 붙는다", () => {
        const el = renderToElement({
            columns: SAMPLE_COLS,
            rows: SAMPLE_ROWS,
            rowKey,
            onRowClick: () => { },
        });
        const trs = findAll(el, isTag("tr")).filter(isBodyRow);
        strict_1.default.equal(trs.length, 2);
        for (const tr of trs) {
            const p = tr.props;
            strict_1.default.equal(p.role, "button");
            strict_1.default.equal(p.tabIndex, 0);
            strict_1.default.equal(typeof p.onClick, "function");
            strict_1.default.equal(typeof p.onKeyDown, "function");
        }
    });
    (0, node_test_1.test)("onClick 호출 시 해당 row 로 onRowClick 가 호출된다", () => {
        const calls = [];
        const el = renderToElement({
            columns: SAMPLE_COLS,
            rows: SAMPLE_ROWS,
            rowKey,
            onRowClick: (row) => calls.push(row),
        });
        const trs = findAll(el, isTag("tr")).filter(isBodyRow);
        trs[0].props.onClick();
        trs[1].props.onClick();
        strict_1.default.deepEqual(calls.map((c) => c.id), ["r1", "r2"]);
    });
    (0, node_test_1.test)("onKeyDown Enter → preventDefault + onRowClick 호출", () => {
        const calls = [];
        let prevented = false;
        const el = renderToElement({
            columns: SAMPLE_COLS,
            rows: [SAMPLE_ROWS[0]],
            rowKey,
            onRowClick: (row) => calls.push(row),
        });
        const tr = findAll(el, isTag("tr")).filter(isBodyRow)[0];
        const onKeyDown = tr.props.onKeyDown;
        onKeyDown({
            key: "Enter",
            preventDefault: () => {
                prevented = true;
            },
        });
        strict_1.default.equal(prevented, true, "Enter 에서 preventDefault 호출되어야 함");
        strict_1.default.deepEqual(calls.map((c) => c.id), ["r1"]);
    });
    (0, node_test_1.test)("onKeyDown Space(' ') → preventDefault + onRowClick 호출", () => {
        const calls = [];
        let prevented = false;
        const el = renderToElement({
            columns: SAMPLE_COLS,
            rows: [SAMPLE_ROWS[1]],
            rowKey,
            onRowClick: (row) => calls.push(row),
        });
        const tr = findAll(el, isTag("tr")).filter(isBodyRow)[0];
        const onKeyDown = tr.props.onKeyDown;
        onKeyDown({
            key: " ",
            preventDefault: () => {
                prevented = true;
            },
        });
        strict_1.default.equal(prevented, true, "Space 에서 preventDefault 호출되어야 함");
        strict_1.default.deepEqual(calls.map((c) => c.id), ["r2"]);
    });
    (0, node_test_1.test)("onKeyDown 기타 키(Escape/a) → onRowClick 호출 안 함, preventDefault 도 안 함", () => {
        const calls = [];
        let prevented = false;
        const el = renderToElement({
            columns: SAMPLE_COLS,
            rows: [SAMPLE_ROWS[0]],
            rowKey,
            onRowClick: (row) => calls.push(row),
        });
        const tr = findAll(el, isTag("tr")).filter(isBodyRow)[0];
        const onKeyDown = tr.props.onKeyDown;
        for (const key of ["Escape", "a", "Tab", "ArrowDown"]) {
            onKeyDown({
                key,
                preventDefault: () => {
                    prevented = true;
                },
            });
        }
        strict_1.default.equal(prevented, false, "활성화 키 외에는 preventDefault 호출 안 해야 함");
        strict_1.default.deepEqual(calls, []);
    });
    (0, node_test_1.test)("interactive 행에 focus-visible:ring / hover:bg-gray-50 스타일 클래스가 포함된다", () => {
        const html = (0, server_1.renderToStaticMarkup)(React.createElement((DataTable_1.DataTable), {
            columns: SAMPLE_COLS,
            rows: SAMPLE_ROWS,
            rowKey,
            onRowClick: () => { },
        }));
        strict_1.default.match(html, /hover:bg-gray-50/);
        strict_1.default.match(html, /focus-visible:ring-2/);
        strict_1.default.match(html, /cursor-pointer/);
    });
});
// ---------------------------------------------------------------------------
// 6. rowKey 적용
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("DataTable · rowKey", () => {
    (0, node_test_1.test)("rowKey 콜백은 각 row 로 호출되어 key 로 사용된다", () => {
        const ids = [];
        const html = (0, server_1.renderToStaticMarkup)(React.createElement((DataTable_1.DataTable), {
            columns: SAMPLE_COLS,
            rows: SAMPLE_ROWS,
            rowKey: (r) => {
                ids.push(r.id);
                return r.id;
            },
        }));
        // 각 row 에 대해 호출되었음 — React 는 key 조회를 위해 중복 호출할 수 있으므로 set 으로 비교
        strict_1.default.deepEqual([...new Set(ids)].sort(), ["r1", "r2"]);
        // HTML 에 각 row 콘텐츠가 포함
        strict_1.default.match(html, /Alice/);
        strict_1.default.match(html, /Bob/);
    });
});
// ---------------------------------------------------------------------------
// 7. className pass-through
// ---------------------------------------------------------------------------
(0, node_test_1.describe)("DataTable · className", () => {
    (0, node_test_1.test)("className prop 은 루트 div 의 클래스에 병합된다", () => {
        const html = (0, server_1.renderToStaticMarkup)(React.createElement((DataTable_1.DataTable), {
            columns: SAMPLE_COLS,
            rows: SAMPLE_ROWS,
            rowKey,
            className: "my-custom-class",
        }));
        // 루트: <div class="overflow-x-auto my-custom-class">
        strict_1.default.match(html, /<div[^>]*class="[^"]*my-custom-class[^"]*"/);
        strict_1.default.match(html, /overflow-x-auto/);
    });
});
