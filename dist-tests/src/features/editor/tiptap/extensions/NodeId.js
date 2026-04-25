"use strict";
/**
 * NodeId — 블록 레벨 노드에 stable `node_id` 속성을 강제하는 TipTap extension.
 *
 * Phase 1 FG 1-2 에서 도입.
 *
 * 설계
 * ----
 * ProseMirror doc 의 블록 레벨 노드에 **서버 표준과 동일한 snake_case** 필드명
 * ``node_id`` 로 UUID 속성을 부여한다. 이 UUID 는:
 *   - Citation 5-tuple 의 ``node_id`` 좌표
 *   - Phase 3 의 인라인 주석 앵커 키
 *   - `snapshot_sync_service` 의 nodes 테이블 동기화 키
 * 의 기반이다. 따라서 **토글·편집 전후로 기존 노드의 node_id 가 변하지 않아야
 * 한다** (FG 1-3 의 핵심 불변식).
 *
 * 구현 방식
 * ---------
 * 1. ``addGlobalAttributes`` 로 대상 타입(heading/paragraph/bulletList/
 *    orderedList/codeBlock) 에 ``node_id`` attribute 추가.
 * 2. HTML 왕복 시 ``data-node-id`` 속성으로 직렬화/역직렬화.
 * 3. ``keepOnSplit: false`` — Enter 로 블록 분할 시 **새 블록에는 id 가
 *    없도록** 한다. 이후 appendTransaction 플러그인이 새 블록에만 UUID 부여.
 * 4. ``appendTransaction`` 으로 id 없는 블록 전부에 UUID 자동 부여
 *    (신규 입력 / paste / setContent / 분할 등 모든 경로 커버).
 *
 * 옵션
 * ----
 * - ``types`` — node_id 를 강제할 TipTap 노드 type name 목록.
 *   section 같은 커스텀 노드가 추가되면 여기에 append.
 *
 * 의존
 * ----
 * @tiptap/core (Extension, Plugin 사용은 @tiptap/pm 경유)
 * crypto.randomUUID — 브라우저 전용. useEditor 는 client-side 라 안전.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeId = exports.NODE_ID_PLUGIN_KEY = void 0;
const core_1 = require("@tiptap/core");
const state_1 = require("@tiptap/pm/state");
// ---------------------------------------------------------------------------
// 기본 UUID 생성기
// ---------------------------------------------------------------------------
function defaultGenerate() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    // 테스트/구형 환경 폴백 — UUID v4 호환
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
// ---------------------------------------------------------------------------
// PluginKey — 트랜잭션에서 적용 루프 방지 플래그로 사용
// ---------------------------------------------------------------------------
exports.NODE_ID_PLUGIN_KEY = new state_1.PluginKey("nodeId");
// ---------------------------------------------------------------------------
// Extension
// ---------------------------------------------------------------------------
exports.NodeId = core_1.Extension.create({
    name: "nodeId",
    addOptions() {
        return {
            types: ["heading", "paragraph", "bulletList", "orderedList", "codeBlock"],
            generate: defaultGenerate,
        };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    node_id: {
                        default: null,
                        // HTML 왕복: data-node-id
                        parseHTML: (element) => element.getAttribute("data-node-id"),
                        renderHTML: (attrs) => {
                            if (!attrs.node_id)
                                return {};
                            return { "data-node-id": attrs.node_id };
                        },
                        // 블록 분할 시 새 블록은 id 없음 → 아래 appendTransaction 이 새 id 부여
                        keepOnSplit: false,
                    },
                },
            },
        ];
    },
    addProseMirrorPlugins() {
        const types = this.options.types;
        const generate = this.options.generate;
        return [
            new state_1.Plugin({
                key: exports.NODE_ID_PLUGIN_KEY,
                // appendTransaction: 각 transaction 이후 id 없는 블록을 찾아 id 부여
                appendTransaction: (_transactions, _oldState, newState) => {
                    const tr = newState.tr;
                    let modified = false;
                    newState.doc.descendants((node, pos) => {
                        if (!types.includes(node.type.name))
                            return;
                        if (node.attrs?.node_id)
                            return;
                        tr.setNodeMarkup(pos, undefined, {
                            ...node.attrs,
                            node_id: generate(),
                        });
                        modified = true;
                    });
                    return modified ? tr : null;
                },
            }),
        ];
    },
});
exports.default = exports.NodeId;
