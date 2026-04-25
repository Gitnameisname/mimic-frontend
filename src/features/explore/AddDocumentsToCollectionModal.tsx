/**
 * AddDocumentsToCollectionModal — 컬렉션에 기존 문서를 일괄 추가하는 모달.
 *
 * S3 Phase 2 FG 2-1 UX 2차 (2026-04-24).
 *
 *  - 최근 수정순 문서 목록을 페이지 단위로 표시 (기본 20건)
 *  - 검색어 입력으로 제목 필터 (서버는 아직 q 미지원 — 클라이언트 측 filter + 설명)
 *  - 체크박스 multi-select 후 "추가" 버튼 → useAddDocumentsToCollection
 *  - 이미 컬렉션에 포함된 문서는 체크박스 disabled + "이미 포함됨" 안내
 *  - Scope 밖 문서는 백엔드가 조용히 reject — 훅이 info 톤 토스트로 안내
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/button/Button";
import { documentsApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAddDocumentsToCollection } from "./hooks/useCollections";

const SEARCH_DEBOUNCE_MS = 300;

interface Props {
  open: boolean;
  collectionId: string;
  collectionName: string;
  alreadyIncluded?: string[];
  onCancel: () => void;
  /** 성공 시 호출 — 0건 이상 추가되면 모달 닫기 편의 */
  onSuccess?: () => void;
}

export function AddDocumentsToCollectionModal({
  open,
  collectionId,
  collectionName,
  alreadyIncluded = [],
  onCancel,
  onSuccess,
}: Props) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const addMut = useAddDocumentsToCollection();

  // 검색 debounce — 도서관 F6 useDebouncedValue 로 통일 (2026-04-25).
  //   - 모달 닫힘 상태에서도 hook 은 항상 동작하지만, 본 컴포넌트의 useQuery 는
  //     `enabled: open` 으로 막혀 있어 실제 fetch 는 발생하지 않는다.
  //   - 닫고 즉시 다시 여는 (~300ms 이내) 케이스에서는 짧게 직전 검색어가 잔존할
  //     수 있으나 modal 의 onSuccess/onCancel 가 search 를 "" 로 리셋하므로
  //     debounce 가 수렴하면 곧바로 빈 검색 결과로 refetch 된다.
  const debouncedQuery = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);

  const listParams = useMemo(() => {
    const base: { page: number; limit: number; sort: "updated_at"; order: "desc"; q?: string } = {
      page: 1,
      limit: 50,
      sort: "updated_at",
      order: "desc",
    };
    if (debouncedQuery) base.q = debouncedQuery;
    return base;
  }, [debouncedQuery]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["documents", listParams],
    queryFn: () => documentsApi.list(listParams),
    enabled: open,
  });

  // 모달 재오픈 시 선택 / 검색 초기화
  // (debouncedQuery 는 useDebouncedValue 가 search 를 따라 자동 수렴하므로 별도 초기화 불요)
  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setSearch("");
    }
  }, [open]);

  const includedSet = useMemo(() => new Set(alreadyIncluded), [alreadyIncluded]);

  // 서버에서 이미 필터링된 결과를 그대로 사용
  const items = data?.items ?? [];

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const submit = useCallback(async () => {
    if (selected.size === 0) return;
    try {
      await addMut.mutateAsync({
        collectionId,
        documentIds: Array.from(selected),
      });
      onSuccess?.();
    } catch {
      // 훅에서 toast
    }
  }, [addMut, collectionId, selected, onSuccess]);

  if (!open) return null;

  const selectedCount = selected.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="닫기"
        className="absolute inset-0 bg-black/30"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-docs-title"
        className="relative mx-4 flex w-full max-w-xl flex-col overflow-hidden rounded-xl bg-[var(--color-surface)] shadow-xl"
        style={{ maxHeight: "min(80vh, 640px)" }}
      >
        <header className="px-5 py-4 border-b border-[var(--color-border)]">
          <h3 id="add-docs-title" className="text-base font-semibold text-[var(--color-text)]">
            &quot;{collectionName}&quot; 에 문서 추가
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            기존 문서를 선택해 컬렉션에 담습니다. 권한 밖 문서는 자동으로 제외됩니다.
          </p>
        </header>

        <div className="px-5 py-3 border-b border-[var(--color-border)]">
          <div className="relative">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="제목으로 검색..."
              aria-label="문서 제목으로 검색"
              className="w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
            />
            {isFetching && !isLoading && (
              <span
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--color-text-muted)]"
                aria-live="polite"
              >
                검색 중...
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading && (
            <div className="px-5 py-6 text-sm text-[var(--color-text-muted)]">
              문서 목록 불러오는 중...
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-[var(--color-text-muted)]">
              {debouncedQuery ? "검색 결과가 없습니다." : "추가할 문서가 없습니다."}
            </div>
          )}

          {!isLoading && items.length > 0 && (
            <ul className="divide-y divide-[var(--color-border)]">
              {items.map((d) => {
                const included = includedSet.has(d.id);
                const checked = selected.has(d.id);
                const disabled = included;
                return (
                  <li key={d.id}>
                    <label
                      className={cn(
                        "flex items-center gap-3 px-5 py-2 text-sm",
                        disabled
                          ? "cursor-not-allowed opacity-60"
                          : "cursor-pointer hover:bg-[var(--color-surface-subtle)]",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked || disabled}
                        disabled={disabled}
                        onChange={() => toggle(d.id)}
                        aria-label={`${d.title} 선택`}
                        className="h-4 w-4 rounded border-[var(--color-border-strong)] text-[var(--color-brand-600)] focus:ring-[var(--color-brand-500)]"
                      />
                      <span className="min-w-0 flex-1 truncate" title={d.title}>
                        {d.title || "(제목 없음)"}
                      </span>
                      <span className="shrink-0 text-xs text-[var(--color-text-muted)]">
                        {d.document_type}
                      </span>
                      {included && (
                        <span className="shrink-0 rounded-full bg-[var(--color-surface-subtle)] px-2 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                          이미 포함됨
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-5 py-3">
          <span className="text-xs text-[var(--color-text-muted)]">
            {selectedCount > 0 ? `${selectedCount}개 선택됨` : "문서를 선택하세요"}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={addMut.isPending}>
              취소
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={submit}
              disabled={selectedCount === 0 || addMut.isPending}
              loading={addMut.isPending}
            >
              {selectedCount > 0 ? `${selectedCount}개 추가` : "추가"}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
