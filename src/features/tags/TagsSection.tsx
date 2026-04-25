/**
 * TagsSection — 사이드바 "탐색" 섹션의 popular 태그 목록.
 *
 * S3 Phase 2 FG 2-2.
 *   - popular 상위 N (기본 20) 표시
 *   - 클릭 시 /documents?tag=<name> 이동
 *   - 현재 URL 의 ?tag=<name> 과 일치하면 활성 상태 표시
 *   - compact 모드(rail) 에서는 아이콘만
 */

"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { usePopularTags } from "./hooks/useTags";

interface Props {
  compact?: boolean;
}

export function TagsSection({ compact = false }: Props) {
  const { data: tags, isLoading, isError } = usePopularTags(20);
  const searchParams = useSearchParams();
  const activeTag = searchParams.get("tag");

  if (compact) {
    return (
      <div className="px-2 py-1">
        <Link
          href="/documents"
          title="태그"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md",
            "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            "hover:bg-[var(--color-surface-subtle)]",
          )}
          aria-label="태그"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.6}
              d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <section aria-labelledby="tags-heading" className="px-3 py-2">
      <header className="flex items-center justify-between px-1 pb-1">
        <h3
          id="tags-heading"
          className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]"
        >
          태그
        </h3>
      </header>

      {isLoading && (
        <ul className="space-y-1 px-1" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="h-6 animate-pulse rounded bg-[var(--color-surface-subtle)]"
            />
          ))}
        </ul>
      )}

      {isError && (
        <p className="px-1 py-2 text-xs text-[var(--color-danger-600)]" role="alert">
          태그를 불러오지 못했습니다.
        </p>
      )}

      {!isLoading && !isError && tags && tags.length === 0 && (
        <p className="px-1 py-2 text-xs text-[var(--color-text-muted)]">
          아직 사용된 태그가 없습니다.
        </p>
      )}

      {!isLoading && !isError && tags && tags.length > 0 && (
        <ul className="flex flex-wrap gap-1 px-1" role="list">
          {tags.map((t) => {
            const active = t.name === activeTag;
            return (
              <li key={t.id}>
                <Link
                  href={`/documents?tag=${encodeURIComponent(t.name)}`}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]",
                    active
                      ? "bg-[var(--color-brand-600)] text-white"
                      : "bg-[var(--color-surface-subtle)] text-[var(--color-text)] hover:bg-[var(--color-surface-strong)]",
                  )}
                  title={`#${t.name}`}
                >
                  <span>#{t.name}</span>
                  {t.usage_count != null && (
                    <span
                      className={cn(
                        "tabular-nums",
                        active
                          ? "text-white/80"
                          : "text-[var(--color-text-muted)]",
                      )}
                    >
                      {t.usage_count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
