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
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const React = __importStar(require("react"));
const server_1 = require("react-dom/server");
const NodeId_1 = require("../src/features/editor/tiptap/extensions/NodeId");
const DocumentTipTapEditor_1 = require("../src/features/editor/tiptap/DocumentTipTapEditor");
const prosemirror_1 = require("../src/types/prosemirror");
(0, node_test_1.describe)("NodeId extension 구조", () => {
    (0, node_test_1.test)("addProseMirrorPlugins / addGlobalAttributes 는 function", () => {
        const cfg = NodeId_1.NodeId.config;
        strict_1.default.equal(cfg.name, "nodeId");
        strict_1.default.equal(typeof cfg.addProseMirrorPlugins, "function");
        strict_1.default.equal(typeof cfg.addGlobalAttributes, "function");
        strict_1.default.equal(typeof cfg.addOptions, "function");
    });
    (0, node_test_1.test)("default options.types 에 block-level 5종 포함", () => {
        const cfg = NodeId_1.NodeId.config;
        const opts = cfg.addOptions?.();
        strict_1.default.ok(opts, "addOptions 결과 존재");
        strict_1.default.ok(Array.isArray(opts.types));
        for (const t of ["heading", "paragraph", "bulletList", "orderedList", "codeBlock"]) {
            strict_1.default.ok(opts.types.includes(t), `types 에 ${t} 포함 (실제: ${JSON.stringify(opts.types)})`);
        }
    });
    (0, node_test_1.test)("default options.generate 는 UUID v4 포맷 반환", () => {
        const cfg = NodeId_1.NodeId.config;
        const opts = cfg.addOptions?.();
        const id = opts.generate();
        // UUID v4: 8-4-4-4-12 hex, 4번째 그룹 첫 글자 4
        strict_1.default.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/i, `UUID v4 포맷: ${id}`);
    });
});
(0, node_test_1.describe)("DocumentTipTapEditor wrapperClass viewMode 분기", () => {
    // 주의: TipTap Editor 인스턴스는 renderToStaticMarkup 하에서 DOM 이 없어
    // null 을 반환할 수 있지만, 상위 wrapper div (className 포함) 는 렌더된다.
    // 본 테스트는 wrapperClass 규약만 검증.
    (0, node_test_1.test)("viewMode=block 은 mimir-editor--block 클래스", () => {
        const element = React.createElement(DocumentTipTapEditor_1.DocumentTipTapEditor, {
            initialContent: (0, prosemirror_1.emptyProseMirrorDoc)(),
            onChange: () => undefined,
            viewMode: "block",
        });
        const html = (0, server_1.renderToStaticMarkup)(element);
        strict_1.default.ok(html.includes("mimir-editor--block"), `block 클래스 포함 expected. html=${html.slice(0, 200)}`);
        strict_1.default.ok(html.includes('data-view-mode="block"'));
    });
    (0, node_test_1.test)("viewMode=flow 는 mimir-editor--flow 클래스", () => {
        const element = React.createElement(DocumentTipTapEditor_1.DocumentTipTapEditor, {
            initialContent: (0, prosemirror_1.emptyProseMirrorDoc)(),
            onChange: () => undefined,
            viewMode: "flow",
        });
        const html = (0, server_1.renderToStaticMarkup)(element);
        strict_1.default.ok(html.includes("mimir-editor--flow"));
        strict_1.default.ok(html.includes('data-view-mode="flow"'));
    });
    (0, node_test_1.test)("두 뷰 모두 mimir-editor 공통 클래스 유지", () => {
        for (const mode of ["block", "flow"]) {
            const element = React.createElement(DocumentTipTapEditor_1.DocumentTipTapEditor, {
                initialContent: (0, prosemirror_1.emptyProseMirrorDoc)(),
                onChange: () => undefined,
                viewMode: mode,
            });
            const html = (0, server_1.renderToStaticMarkup)(element);
            strict_1.default.ok(html.includes("mimir-editor"), `mode=${mode} 공통 클래스`);
        }
    });
});
(0, node_test_1.describe)("ProseMirrorDoc 타입 가드 회귀", () => {
    (0, node_test_1.test)("emptyProseMirrorDoc 왕복: 빈 content + type=doc", () => {
        const doc = (0, prosemirror_1.emptyProseMirrorDoc)();
        strict_1.default.ok((0, prosemirror_1.isProseMirrorDoc)(doc));
        strict_1.default.equal(doc.content.length, 0);
    });
    (0, node_test_1.test)("비표준 루트는 거부 (type=document / text)", () => {
        strict_1.default.equal((0, prosemirror_1.isProseMirrorDoc)({ type: "document", content: [] }), false);
        strict_1.default.equal((0, prosemirror_1.isProseMirrorDoc)({ type: "text", content: "x" }), false);
    });
});
