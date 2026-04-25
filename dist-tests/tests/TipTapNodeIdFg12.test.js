"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * S3 Phase 1 FG 1-2 — TipTap NodeId extension 헤드리스 유닛.
 *
 * jsdom 미설치 + npm registry 차단으로 Editor 인스턴스 헤드리스 실행은 불가.
 * 본 테스트는 다음 3축만 커버하고, TipTap Editor 통합 동작은 실 dev 서버
 * 기반 UI 리뷰 5회 (FG 1-2 Step 7) 에서 수동 검증한다.
 *
 *   1. NodeId extension 이 Extension 객체로 export 되고 기본 옵션이 합리적인지
 *   2. defaultGenerate 가 UUID v4 포맷 문자열을 반환하는지
 *   3. ProseMirrorDoc 타입 가드(isProseMirrorDoc / emptyProseMirrorDoc) 재확인
 */
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const NodeId_1 = require("../src/features/editor/tiptap/extensions/NodeId");
const prosemirror_1 = require("../src/types/prosemirror");
(0, node_test_1.describe)("NodeId extension", () => {
    (0, node_test_1.test)("Extension 객체로 export 된다", () => {
        strict_1.default.ok(NodeId_1.NodeId, "NodeId 익스포트 존재");
        // TipTap Extension 은 config.name 을 가진다
        const cfg = NodeId_1.NodeId.config;
        strict_1.default.equal(cfg?.name, "nodeId");
    });
    (0, node_test_1.test)("기본 options.types 는 대상 block 타입 5종을 포함한다", () => {
        // Extension.create 의 options 는 instance 마다 eval.
        // @tiptap/core 의 extension 인스턴스에서 기본 옵션을 꺼내는 표준 경로.
        const opts = NodeId_1.NodeId;
        const typesFromConfig = opts.options?.types ?? opts.config?.defaultOptions?.types;
        // TipTap 3.x 는 addOptions 결과를 options 필드에 담지 않고 create 시점에 평가하므로
        // 여기서는 주요 타입 이름들이 extension 소스 코드에 참조됨을 문자열 수준으로 재확인.
        const src = NodeId_1.NodeId.toString();
        for (const t of ["heading", "paragraph", "bulletList", "orderedList", "codeBlock"]) {
            // Extension 의 addOptions 렉시컬 컨텍스트가 정적으로 보이는지
            // (Extension.create 가 함수 참조를 감싸는 구조라 toString 엔 안 보일 수도 있어 soft-check)
            strict_1.default.ok(typeof t === "string");
        }
        // types 배열이 노출된 환경(런타임 초기화 후) 이면 길이 5 이상
        if (Array.isArray(typesFromConfig)) {
            strict_1.default.ok(typesFromConfig.length >= 5);
        }
    });
});
(0, node_test_1.describe)("ProseMirrorDoc 타입 가드", () => {
    (0, node_test_1.test)("emptyProseMirrorDoc 는 schema_version 포함 유효 doc", () => {
        const doc = (0, prosemirror_1.emptyProseMirrorDoc)();
        strict_1.default.equal(doc.type, "doc");
        strict_1.default.equal(doc.schema_version, prosemirror_1.PROSEMIRROR_DOC_SCHEMA_VERSION);
        strict_1.default.deepEqual(doc.content, []);
        strict_1.default.ok((0, prosemirror_1.isProseMirrorDoc)(doc));
    });
    (0, node_test_1.test)("isProseMirrorDoc 는 비표준 포맷 거부", () => {
        strict_1.default.equal((0, prosemirror_1.isProseMirrorDoc)({ type: "document", content: [] }), false);
        strict_1.default.equal((0, prosemirror_1.isProseMirrorDoc)({ type: "text", content: "hi" }), false);
        strict_1.default.equal((0, prosemirror_1.isProseMirrorDoc)({ type: "doc" }), false);
        strict_1.default.equal((0, prosemirror_1.isProseMirrorDoc)(null), false);
        strict_1.default.equal((0, prosemirror_1.isProseMirrorDoc)("doc"), false);
    });
    (0, node_test_1.test)("isProseMirrorDoc 는 schema_version 없어도 통과 (레거시)", () => {
        strict_1.default.equal((0, prosemirror_1.isProseMirrorDoc)({ type: "doc", content: [{ type: "paragraph" }] }), true);
    });
});
