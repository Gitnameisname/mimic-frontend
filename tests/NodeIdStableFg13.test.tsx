/**
 * S3 Phase 1 FG 1-3 Step 1 — node_id stable 규약 회귀 스위트.
 *
 * 제약: sandbox 에 jsdom 미설치 + npm registry 차단으로 TipTap Editor 헤드리스
 * 실행 불가. 실 런타임의 텍스트 입력 / 블록 분할 / setContent 시나리오는
 * 운영자 로컬 수동 smoke + FG 1-3 Step 7 integration (testcontainers CI) 에서
 * 검증한다. 본 스위트는 정적 구조 + 어댑터 계층에서 커버 가능한 축만 담당.
 *
 * 커버:
 *   1. NodeId extension 의 addProseMirrorPlugins / addGlobalAttributes 정의 존재
 *   2. NodeId extension default options.types 가 block-level 5종 포함
 *   3. DocumentTipTapEditor wrapperClass 가 viewMode 에 따라 정확히 분기
 *   4. ProseMirrorDoc 타입 가드 재검증 (회귀)
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { NodeId } from "../src/features/editor/tiptap/extensions/NodeId";
import { DocumentTipTapEditor } from "../src/features/editor/tiptap/DocumentTipTapEditor";
import { emptyProseMirrorDoc, isProseMirrorDoc } from "../src/types/prosemirror";

describe("NodeId extension 구조", () => {
  test("addProseMirrorPlugins / addGlobalAttributes 는 function", () => {
    const cfg = (NodeId as unknown as {
      config: {
        name?: string;
        addProseMirrorPlugins?: () => unknown;
        addGlobalAttributes?: () => unknown;
        addOptions?: () => unknown;
      };
    }).config;
    assert.equal(cfg.name, "nodeId");
    assert.equal(typeof cfg.addProseMirrorPlugins, "function");
    assert.equal(typeof cfg.addGlobalAttributes, "function");
    assert.equal(typeof cfg.addOptions, "function");
  });

  test("default options.types 에 block-level 5종 포함", () => {
    const cfg = (NodeId as unknown as {
      config: { addOptions?: () => { types: string[]; generate: () => string } };
    }).config;
    const opts = cfg.addOptions?.();
    assert.ok(opts, "addOptions 결과 존재");
    assert.ok(Array.isArray(opts.types));
    for (const t of ["heading", "paragraph", "bulletList", "orderedList", "codeBlock"]) {
      assert.ok(
        opts.types.includes(t),
        `types 에 ${t} 포함 (실제: ${JSON.stringify(opts.types)})`,
      );
    }
  });

  test("default options.generate 는 UUID v4 포맷 반환", () => {
    const cfg = (NodeId as unknown as {
      config: { addOptions?: () => { types: string[]; generate: () => string } };
    }).config;
    const opts = cfg.addOptions?.();
    const id = opts!.generate();
    // UUID v4: 8-4-4-4-12 hex, 4번째 그룹 첫 글자 4
    assert.match(
      id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      `UUID v4 포맷: ${id}`,
    );
  });
});

describe("DocumentTipTapEditor wrapperClass viewMode 분기", () => {
  // 주의: TipTap Editor 인스턴스는 renderToStaticMarkup 하에서 DOM 이 없어
  // null 을 반환할 수 있지만, 상위 wrapper div (className 포함) 는 렌더된다.
  // 본 테스트는 wrapperClass 규약만 검증.
  test("viewMode=block 은 mimir-editor--block 클래스", () => {
    const element = React.createElement(DocumentTipTapEditor, {
      initialContent: emptyProseMirrorDoc(),
      onChange: () => undefined,
      viewMode: "block",
    });
    const html = renderToStaticMarkup(element);
    assert.ok(
      html.includes("mimir-editor--block"),
      `block 클래스 포함 expected. html=${html.slice(0, 200)}`,
    );
    assert.ok(html.includes('data-view-mode="block"'));
  });

  test("viewMode=flow 는 mimir-editor--flow 클래스", () => {
    const element = React.createElement(DocumentTipTapEditor, {
      initialContent: emptyProseMirrorDoc(),
      onChange: () => undefined,
      viewMode: "flow",
    });
    const html = renderToStaticMarkup(element);
    assert.ok(html.includes("mimir-editor--flow"));
    assert.ok(html.includes('data-view-mode="flow"'));
  });

  test("두 뷰 모두 mimir-editor 공통 클래스 유지", () => {
    for (const mode of ["block", "flow"] as const) {
      const element = React.createElement(DocumentTipTapEditor, {
        initialContent: emptyProseMirrorDoc(),
        onChange: () => undefined,
        viewMode: mode,
      });
      const html = renderToStaticMarkup(element);
      assert.ok(html.includes("mimir-editor"), `mode=${mode} 공통 클래스`);
    }
  });
});

describe("ProseMirrorDoc 타입 가드 회귀", () => {
  test("emptyProseMirrorDoc 왕복: 빈 content + type=doc", () => {
    const doc = emptyProseMirrorDoc();
    assert.ok(isProseMirrorDoc(doc));
    assert.equal(doc.content.length, 0);
  });

  test("비표준 루트는 거부 (type=document / text)", () => {
    assert.equal(isProseMirrorDoc({ type: "document", content: [] }), false);
    assert.equal(isProseMirrorDoc({ type: "text", content: "x" }), false);
  });
});
