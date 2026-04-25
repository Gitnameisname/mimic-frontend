"use strict";
/**
 * ProseMirror doc 최소 타입 정의.
 *
 * Phase 1 FG 1-1 에서 도입. ``content_snapshot`` 이 Draft 저장의 단일 정본이
 * 되면서, 프런트도 이 포맷을 직접 다뤄야 한다.
 *
 * 본 파일은 저장/로드/어댑터 레이어가 타입만 맞으면 되도록 최소 shape 만
 * 정의한다. FG 1-2 의 TipTap 이식 시 node type alias(`heading` / `paragraph` /
 * `bulletList` / `codeBlock` / `section` 등) 를 구체화한다.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROSEMIRROR_DOC_SCHEMA_VERSION = void 0;
exports.emptyProseMirrorDoc = emptyProseMirrorDoc;
exports.isProseMirrorDoc = isProseMirrorDoc;
exports.PROSEMIRROR_DOC_SCHEMA_VERSION = 1;
/**
 * 빈 ProseMirror doc. 신규 문서 에디터 초기값으로 사용 가능.
 */
function emptyProseMirrorDoc() {
    return {
        type: "doc",
        schema_version: exports.PROSEMIRROR_DOC_SCHEMA_VERSION,
        content: [],
    };
}
/**
 * ``snapshot`` 이 최소 규격을 만족하는지 얕게 검사한다 (타입 가드).
 */
function isProseMirrorDoc(snapshot) {
    if (!snapshot || typeof snapshot !== "object")
        return false;
    const s = snapshot;
    if (s.type !== "doc")
        return false;
    if (!Array.isArray(s.content))
        return false;
    return true;
}
