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

/**
 * ProseMirror mark (bold/italic/링크 등). Phase 1 에서는 옵션 정도만 인식.
 */
export type ProseMirrorMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

/**
 * ProseMirror 의 텍스트/블록 노드.
 *
 * - block-level 노드(heading, paragraph 등) 는 ``attrs.node_id`` 를 가져야 한다.
 *   (NodeId extension 으로 강제)
 * - text 노드는 ``text`` 필드만 의미있다.
 */
export type ProseMirrorNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ProseMirrorNode[];
  marks?: ProseMirrorMark[];
  text?: string;
};

/**
 * 문서 루트. 저장/로드 시 항상 이 shape.
 *
 * ``schema_version`` 은 backend 와 공유하는 포맷 버전 넘버. 누락 시 레거시로
 * 간주 (서버 validator 는 schema_version 을 요구하지 않는다).
 */
export type ProseMirrorDoc = {
  type: "doc";
  schema_version?: number;
  content: ProseMirrorNode[];
};

export const PROSEMIRROR_DOC_SCHEMA_VERSION = 1;

/**
 * 빈 ProseMirror doc. 신규 문서 에디터 초기값으로 사용 가능.
 */
export function emptyProseMirrorDoc(): ProseMirrorDoc {
  return {
    type: "doc",
    schema_version: PROSEMIRROR_DOC_SCHEMA_VERSION,
    content: [],
  };
}

/**
 * ``snapshot`` 이 최소 규격을 만족하는지 얕게 검사한다 (타입 가드).
 */
export function isProseMirrorDoc(snapshot: unknown): snapshot is ProseMirrorDoc {
  if (!snapshot || typeof snapshot !== "object") return false;
  const s = snapshot as Record<string, unknown>;
  if (s.type !== "doc") return false;
  if (!Array.isArray(s.content)) return false;
  return true;
}
