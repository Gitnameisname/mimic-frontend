/**
 * HashtagMark — 본문 인라인 `#태그` 시각 강조 TipTap mark.
 *
 * S3 Phase 2 FG 2-2. 서버 파서가 정본 (`tag_rules.extract_tags_from_snapshot`)
 * 이므로 이 mark 는 순수 시각 강조 + 클릭 네비게이션 목적.
 *
 * InputRule 패턴:
 *   입력 중 "#word " (공백/구두점) 으로 끝나면 word 를 mark.
 *
 * 렌더:
 *   <span class="tag-pill" data-tag="<name>">#<name></span>
 *   클릭 이벤트는 onTagClick 옵션 콜백으로 전파 — 상위가 router.push 등 처리.
 */

import { Mark, markInputRule, markPasteRule } from "@tiptap/core";

export interface HashtagMarkOptions {
  HTMLAttributes: Record<string, unknown>;
  /**
   * Mark 클릭 시 호출 — 상위 (에디터 컴포넌트) 가 router.push(`/documents?tag=<>`)
   * 등으로 처리. editor 가 읽기 전용이 아니어도 호출됨 (UX 일관).
   */
  onTagClick?: (tagName: string) => void;
}

// `#word` — word: 유니코드 letter/number + `_` / `-` / `/`, 1~64자
// 입력 중에 공백·구두점으로 끝날 때 매칭되도록 `(\s|$)` 경계.
//
// **캡처 그룹 규약** (BUG-FG22-02 회귀, 2026-04-25):
//   TipTap 의 markInputRule 은 "last capture group" 의 텍스트만 mark 대상으로
//   보존하고 나머지는 제거한다. 따라서 last group 이 `#word` 전체를 포함해야
//   화면에서 `#` 접두사가 살아남는다. group[1] = `#ai` (전체) 가 last.
//   `getAttributes` 는 이 값을 받아 `#` 를 떼고 lowercase 해서 data-tag 로 저장.
const INPUT_REGEX = /(?:^|[^\w#])(#[\p{L}\p{N}_/-]{1,64})\s$/u;
const PASTE_REGEX = /(?:^|[^\w#])(#[\p{L}\p{N}_/-]{1,64})/gu;

export const HashtagMark = Mark.create<HashtagMarkOptions>({
  name: "hashtag",

  // BUG-FG22-02 (2026-04-25): mark 경계 끝에 입력한 텍스트가 자동으로 mark 에
  // 합류하지 않도록 inclusive=false. 예: "#ai world" 를 타이핑하면 "ai" 만
  // mark 가 되고 " world" 는 일반 text 로 남는다.
  inclusive: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      tag: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-tag"),
        renderHTML: (attrs) => {
          if (!attrs.tag) return {};
          return { "data-tag": attrs.tag };
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: "span.tag-pill[data-tag]" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      {
        ...this.options.HTMLAttributes,
        ...HTMLAttributes,
        class: "tag-pill",
      },
      0,
    ];
  },

  addInputRules() {
    return [
      markInputRule({
        find: INPUT_REGEX,
        type: this.type,
        getAttributes: (match) => ({
        // match[1] 은 `#ai` 전체 (last capture group). `#` 떼고 소문자 정규화.
        tag: (match[1] || "").replace(/^#/, "").toLowerCase(),
      }),
      }),
    ];
  },

  addPasteRules() {
    return [
      markPasteRule({
        find: PASTE_REGEX,
        type: this.type,
        getAttributes: (match) => ({
        // match[1] 은 `#ai` 전체 (last capture group). `#` 떼고 소문자 정규화.
        tag: (match[1] || "").replace(/^#/, "").toLowerCase(),
      }),
      }),
    ];
  },
});

// 렌더된 hashtag 에 클릭 이벤트 붙이는 헬퍼 — 에디터 컴포넌트가 마운트 직후 호출.
export function attachHashtagClickHandler(
  root: HTMLElement,
  onClick: (tagName: string) => void,
): () => void {
  const handler = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const pill = target.closest<HTMLElement>("span.tag-pill[data-tag]");
    if (!pill) return;
    e.preventDefault();
    const name = pill.getAttribute("data-tag") || "";
    if (name) onClick(name);
  };
  root.addEventListener("click", handler);
  return () => root.removeEventListener("click", handler);
}
