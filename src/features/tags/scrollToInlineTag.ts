/**
 * scrollToInlineTag — S3 Phase 2 FG 2-2 UX 다듬기 1차.
 *
 * 문서 본문에서 `<span class="tag-pill" data-tag="<name>">` 의 **첫** 매치를
 * 찾아 부드럽게 스크롤하고 `.tag-pill--flash` 클래스를 잠시 얹어 강조한다.
 *
 * 계약
 * ----
 *  - 인자 `name` 은 정규화된 태그명 (서버 `normalize_tag` 출력 형식).
 *  - 반환값: 매치를 찾아 강조했으면 `true`, 못 찾았으면 `false`.
 *  - `root` 는 검색 범위 제한용. 기본은 `document`.
 *
 * 안전
 * ----
 *  CSS selector 에 주입되지 않도록 `CSS.escape` 로 attribute value 를 이스케이프.
 */
export function scrollToInlineTag(
  name: string,
  root?: Document | HTMLElement,
): boolean {
  if (typeof document === "undefined") return false;
  const clean = (name ?? "").trim();
  if (!clean) return false;

  const scope: Document | HTMLElement = root ?? document;
  const escaped =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(clean)
      : clean.replace(/["\\]/g, "\\$&");
  const selector = `span.tag-pill[data-tag="${escaped}"]`;

  const el = scope.querySelector<HTMLElement>(selector);
  if (!el) return false;

  el.scrollIntoView({ behavior: "smooth", block: "center" });

  // 플래시 — 중복 호출 시 재트리거되도록 클래스를 제거 후 다시 붙임.
  el.classList.remove("tag-pill--flash");
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  el.offsetWidth; // reflow 강제
  el.classList.add("tag-pill--flash");
  window.setTimeout(() => el.classList.remove("tag-pill--flash"), 1300);

  return true;
}
