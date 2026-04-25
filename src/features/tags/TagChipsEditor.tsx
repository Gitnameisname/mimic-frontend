/**
 * TagChipsEditor — 문서 상세의 태그 칩 입력 위젯.
 *
 * S3 Phase 2 FG 2-2.
 *
 * 규약 (블로커1 결정서):
 *   - 서버 파서가 정본. 본 위젯은 frontmatter (`metadata.tags`) 만 편집.
 *   - 인라인 `#tag` 는 본문에서 편집 (TipTap HashtagMark).
 *   - document_tags 응답의 `source` 로 chip 을 렌더:
 *       - frontmatter / both → 이 위젯에서 제거 가능
 *       - inline-only → 읽기 전용 (제거하려면 본문에서 지워야 함을 안내)
 *
 * UX:
 *   - 칩 입력: Tab / `,` / Enter → 확정
 *   - Backspace: 입력 비어있으면 마지막 칩 제거
 *   - 자동완성 드롭다운: 150ms debounce + ↑↓ Enter Esc
 *   - 저장: 칩 추가/제거 즉시 PATCH (useSetDocumentTags)
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { DocumentTagEntry } from "@/types/document";
import { useSetDocumentTags, useTagAutocomplete } from "./hooks/useTags";

const AUTOCOMPLETE_DEBOUNCE_MS = 150;
const NAME_MAX = 64;
const SPLIT_CHARS = /[\s,]+/;

interface Props {
  documentId: string;
  currentTags: DocumentTagEntry[];
  /** 기존 metadata (tags 외 키 보존용) */
  baseMetadata?: Record<string, unknown>;
  /**
   * Inline (source="inline") chip 클릭 시 호출 — 상위가 본문에서 해당 태그의
   * 첫 위치를 찾아 scrollIntoView + flash 강조. 미제공 시 칩은 단순 readonly
   * (클릭 없음) 로 렌더. S3 Phase 2 FG 2-2 UX1.
   */
  onJumpToInlineTag?: (tagName: string) => void;
}

function normalizeClient(raw: string): string | null {
  // 서버 normalize_tag 와 **동일 규약** 을 클라이언트에서도 선적용 (UX 피드백 빠름).
  // 서버가 최종 정본이므로 미스매치 시 서버 결과 따름.
  let s = (raw ?? "").trim();
  if (!s) return null;
  if (s.startsWith("#")) s = s.slice(1);
  if (!s || s.startsWith("#")) return null;
  try {
    s = s.normalize("NFKC").toLowerCase();
  } catch {
    return null;
  }
  if (!/^[\p{L}\p{N}_/-]{1,64}$/u.test(s)) return null;
  return s;
}

export function TagChipsEditor({ documentId, currentTags, baseMetadata, onJumpToInlineTag }: Props) {
  const [draft, setDraft] = useState("");
  const [cursor, setCursor] = useState<number>(-1);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 자동완성 debounce — 도서관 F6 useDebouncedValue 로 통일 (2026-04-25).
  const debouncedQuery = useDebouncedValue(draft, AUTOCOMPLETE_DEBOUNCE_MS);

  const setTagsMut = useSetDocumentTags();
  const { data: suggestions, isFetching } = useTagAutocomplete(debouncedQuery, 10);

  // 포커스 바깥 클릭 → 드롭다운 닫기
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // 이미 달린 태그 이름 집합 (중복 방지)
  const currentNames = useMemo(
    () => new Set(currentTags.map((t) => t.name)),
    [currentTags],
  );

  // frontmatter/both 만 사용자가 여기서 제거 가능. inline-only 는 읽기 전용
  const removableChips = useMemo(
    () => currentTags.filter((t) => t.source !== "inline"),
    [currentTags],
  );
  const readonlyInlineChips = useMemo(
    () => currentTags.filter((t) => t.source === "inline"),
    [currentTags],
  );

  // PATCH 시 frontmatter 기존 태그 집합을 기준으로 조작
  // (metadata.tags 는 frontmatter 만 포함. inline 은 별도 본문에서 관리)
  const frontmatterNames = useMemo(
    () =>
      currentTags.filter((t) => t.source !== "inline").map((t) => t.name),
    [currentTags],
  );

  const commit = useCallback(
    (nextFrontmatter: string[]) => {
      setTagsMut.mutate({
        documentId,
        nextTags: nextFrontmatter,
        baseMetadata,
      });
    },
    [documentId, baseMetadata, setTagsMut],
  );

  const addTagByName = useCallback(
    (rawName: string) => {
      const normalized = normalizeClient(rawName);
      if (!normalized) return;
      if (currentNames.has(normalized)) {
        // 이미 있으면 draft 만 비우기
        setDraft("");
        setOpen(false);
        return;
      }
      const next = Array.from(new Set([...frontmatterNames, normalized]));
      commit(next);
      setDraft("");
      // setOpen(false) 가 dropdown 을 닫아 시각적 잔존이 없고, useTagAutocomplete 는
      // staleTime=30s 캐시 + enabled: trimmed>0 라 추가 fetch 도 발생하지 않는다.
      setOpen(false);
      setCursor(-1);
    },
    [commit, currentNames, frontmatterNames],
  );

  const removeTag = useCallback(
    (name: string) => {
      // frontmatter 태그만 제거. inline 은 본문 편집으로 유도 (제거 버튼 자체가 없음)
      const next = frontmatterNames.filter((n) => n !== name);
      commit(next);
    },
    [commit, frontmatterNames],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // 구분자로 확정
      if (e.key === "Enter" || e.key === "Tab" || e.key === ",") {
        if (draft.trim()) {
          e.preventDefault();
          // 자동완성 커서 있으면 해당 항목 사용
          const picked =
            cursor >= 0 && suggestions && suggestions[cursor]
              ? suggestions[cursor].name
              : draft;
          addTagByName(picked);
        } else if (e.key === "Enter") {
          e.preventDefault();
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setCursor(-1);
        return;
      }
      if (e.key === "Backspace" && draft.length === 0 && removableChips.length > 0) {
        e.preventDefault();
        removeTag(removableChips[removableChips.length - 1].name);
        return;
      }
      if (!suggestions || suggestions.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => (c + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) =>
          c <= 0 ? suggestions.length - 1 : c - 1,
        );
      }
    },
    [draft, cursor, suggestions, addTagByName, removeTag, removableChips],
  );

  // draft 가 바뀌면 cursor 리셋
  useEffect(() => {
    setCursor(-1);
  }, [draft]);

  const filteredSuggestions = useMemo(() => {
    if (!suggestions) return [];
    return suggestions.filter((s) => !currentNames.has(s.name));
  }, [suggestions, currentNames]);

  return (
    <div
      className="flex flex-col gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 py-2"
      aria-label="태그 편집"
    >
      <span className="text-xs text-[var(--color-text-muted)]">태그</span>
      <div className="relative">
        <div className="flex flex-wrap items-center gap-1.5">
          {currentTags.map((t) => {
            const isReadonly = t.source === "inline";
            const chipClass = cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]",
              isReadonly
                ? "border border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-text-muted)]"
                : "border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]",
            );
            const jumpAvailable = isReadonly && !!onJumpToInlineTag;
            const chipContent = (
              <>
                <span>#{t.name}</span>
                {!isReadonly && (
                  <button
                    type="button"
                    aria-label={`태그 "${t.name}" 제거`}
                    onClick={() => removeTag(t.name)}
                    className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-[var(--color-brand-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
                    disabled={setTagsMut.isPending}
                  >
                    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </>
            );
            // S3 Phase 2 FG 2-2 UX1 (2026-04-25): inline chip 은 점프 핸들러가
            // 있는 경우 button 으로 렌더해 본문 해당 위치로 이동 + flash.
            if (jumpAvailable) {
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onJumpToInlineTag!(t.name)}
                  className={cn(chipClass, "cursor-pointer hover:bg-[var(--color-surface-subtle)]")}
                  title={`본문 내 #${t.name} 위치로 이동`}
                  aria-label={`본문 내 #${t.name} 위치로 이동`}
                >
                  {chipContent}
                </button>
              );
            }
            return (
              <span
                key={t.id}
                className={chipClass}
                title={
                  isReadonly
                    ? "본문에 #태그 로 들어있는 태그입니다. 본문에서 지우면 제거됩니다."
                    : t.name
                }
              >
                {chipContent}
              </span>
            );
          })}
          <input
            ref={inputRef}
            type="text"
            value={draft}
            maxLength={NAME_MAX}
            onFocus={() => setOpen(true)}
            onChange={(e) => {
              setDraft(e.target.value);
              setOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={currentTags.length ? "태그 추가…" : "예: #정책 #ai"}
            aria-label="태그 입력"
            className="min-w-[8rem] flex-1 border-0 bg-transparent px-1 py-0.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
            disabled={setTagsMut.isPending}
          />
        </div>
        {open && filteredSuggestions.length > 0 && (
          <ul
            role="listbox"
            className="absolute left-0 top-full z-30 mt-1 max-h-48 w-full min-w-[12rem] overflow-y-auto rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-pop)]"
          >
            {filteredSuggestions.map((s, i) => {
              const active = i === cursor;
              return (
                <li
                  key={s.id}
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setCursor(i)}
                  onMouseDown={(e) => {
                    // 포커스 잃지 않도록 mousedown 에서 처리
                    e.preventDefault();
                    addTagByName(s.name);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center justify-between px-3 py-1.5 text-sm",
                    active
                      ? "bg-[var(--color-surface-subtle)] text-[var(--color-text)]"
                      : "text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]",
                  )}
                >
                  <span>#{s.name}</span>
                  {s.usage_count != null && (
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {s.usage_count}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {readonlyInlineChips.length > 0 && (
        <span className="text-[11px] text-[var(--color-text-muted)]">
          회색 칩은 본문 <code>#태그</code> 에서 자동 감지된 태그입니다. 본문에서 직접 편집하세요.
        </span>
      )}
      {isFetching && debouncedQuery && (
        <span className="text-[11px] text-[var(--color-text-muted)]" aria-live="polite">
          검색 중…
        </span>
      )}
    </div>
  );
}

// 테스트용 순수 헬퍼
export const __test__ = { normalizeClient };
