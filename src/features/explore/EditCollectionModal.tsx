/**
 * EditCollectionModal — 컬렉션 이름 + 설명 풀 편집 모달.
 *
 * S3 Phase 2 FG 2-1 UX 6차 (2026-04-24).
 *
 * RowMenu 의 "편집..." 항목에서 여는 모달.
 *  - 이름: 기존 CollectionsTree 의 인라인 rename 과 같은 규약 (Trim + 1-200자)
 *  - 설명: textarea + 2000자 상한
 *  - 저장 실패 시 toast (useUpdateCollection), 성공 시 토스트 + 모달 닫기
 *  - 인라인 rename 은 빠른 경로로 그대로 유지, 이 모달은 **설명까지 편집하는 풀 편집** 전용
 */

"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/button/Button";
import type { Collection } from "@/lib/api/collections";
import { useUpdateCollection } from "./hooks/useCollections";

interface Props {
  open: boolean;
  collection: Collection | null;
  onCancel: () => void;
  onSuccess?: () => void;
}

const NAME_MAX = 200;
const DESC_MAX = 2000;

export function EditCollectionModal({ open, collection, onCancel, onSuccess }: Props) {
  const updateMut = useUpdateCollection();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  // 모달이 열릴 때마다 현재 컬렉션 값으로 리셋
  useEffect(() => {
    if (open && collection) {
      setName(collection.name);
      setDescription(collection.description ?? "");
      setNameError(null);
    }
  }, [open, collection]);

  if (!open || !collection) return null;

  const trimmedName = name.trim();
  const descLen = description.length;
  const nameLen = trimmedName.length;

  const handleSubmit = async () => {
    if (nameLen < 1) {
      setNameError("이름을 입력하세요");
      return;
    }
    if (nameLen > NAME_MAX) {
      setNameError(`이름은 ${NAME_MAX}자 이하여야 합니다`);
      return;
    }
    if (descLen > DESC_MAX) return;
    const nextDescription = description.trim() ? description : null;
    const nextName = trimmedName === collection.name ? undefined : trimmedName;
    const descChanged = (collection.description ?? null) !== nextDescription;
    if (nextName === undefined && !descChanged) {
      // 변경 없음 — 그냥 닫기
      onSuccess?.();
      return;
    }
    try {
      await updateMut.mutateAsync({
        id: collection.id,
        body: {
          ...(nextName !== undefined ? { name: nextName } : {}),
          ...(descChanged ? { description: nextDescription } : {}),
        },
      });
      onSuccess?.();
    } catch {
      // 훅이 toast 로 에러 처리
    }
  };

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
        aria-labelledby="edit-collection-title"
        className="relative mx-4 flex w-full max-w-md flex-col rounded-xl bg-[var(--color-surface)] shadow-xl"
      >
        <header className="border-b border-[var(--color-border)] px-5 py-4">
          <h3 id="edit-collection-title" className="text-base font-semibold text-[var(--color-text)]">
            컬렉션 편집
          </h3>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            이름과 설명을 한꺼번에 수정합니다.
          </p>
        </header>

        <form
          className="flex flex-col gap-4 px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <label className="flex flex-col gap-1 text-sm text-[var(--color-text)]">
            <span className="text-xs text-[var(--color-text-muted)]">이름</span>
            <input
              type="text"
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(null);
              }}
              aria-label="컬렉션 이름"
              aria-invalid={nameError ? "true" : undefined}
              className="rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
              disabled={updateMut.isPending}
            />
            {nameError && (
              <span className="text-xs text-[var(--color-danger-600)]" role="alert">
                {nameError}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1 text-sm text-[var(--color-text)]">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)]">설명 (선택)</span>
              <span
                className={
                  descLen > DESC_MAX
                    ? "text-xs text-[var(--color-danger-600)]"
                    : "text-[11px] text-[var(--color-text-muted)]"
                }
              >
                {descLen}/{DESC_MAX}
              </span>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              aria-label="컬렉션 설명"
              className="resize-y rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
              placeholder="이 컬렉션이 어떤 문서 묶음인지 한두 문장으로…"
              disabled={updateMut.isPending}
            />
          </label>
        </form>

        <footer className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-3">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={updateMut.isPending}>
            취소
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            loading={updateMut.isPending}
            disabled={nameLen < 1 || nameLen > NAME_MAX || descLen > DESC_MAX}
          >
            저장
          </Button>
        </footer>
      </div>
    </div>
  );
}

// 테스트용 내부 헬퍼 — 저장 버튼이 보낼 body 페이로드 조합 규약만 추출
export function computeUpdateBody(
  current: Collection,
  next: { name: string; description: string },
): { name?: string; description?: string | null } | null {
  const trimmedName = next.name.trim();
  if (trimmedName.length < 1 || trimmedName.length > NAME_MAX) return null;
  if (next.description.length > DESC_MAX) return null;

  const nextDescription = next.description.trim() ? next.description : null;
  const nameChanged = trimmedName !== current.name;
  const descChanged = (current.description ?? null) !== nextDescription;
  if (!nameChanged && !descChanged) return {}; // 변경 없음

  const body: { name?: string; description?: string | null } = {};
  if (nameChanged) body.name = trimmedName;
  if (descChanged) body.description = nextDescription;
  return body;
}
