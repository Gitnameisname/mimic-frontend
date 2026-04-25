"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { documentsApi, versionsApi, getApiErrorMessage } from "@/lib/api";
import { collectionsApi } from "@/lib/api/collections";
import { toast } from "@/stores/uiStore";
import { Button } from "@/components/button/Button";
import { PageHeader } from "@/components/page/PageHeader";
import { useAddDocumentsToCollection } from "@/features/explore/hooks/useCollections";

const DOCUMENT_TYPES = [
  "기술명세",
  "기획서",
  "회의록",
  "정책문서",
  "가이드",
  "보고서",
  "기타",
];

export function NewDocumentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [title, setTitle] = useState("");
  const [type, setType] = useState(DOCUMENT_TYPES[0]);
  const [titleError, setTitleError] = useState("");

  // S3 Phase 2 FG 2-1 UX 3차 (2026-04-24): 빈 컬렉션 CTA 에서 넘어온 경우 맥락 유지.
  // `?collection=<id>` 가 있으면 생성 성공 후 해당 컬렉션에 자동 연결한다.
  const targetCollectionId = searchParams.get("collection") ?? null;
  const addToCollection = useAddDocumentsToCollection();

  const { data: targetCollection } = useQuery({
    queryKey: ["collection", targetCollectionId],
    queryFn: () => collectionsApi.get(targetCollectionId as string),
    enabled: !!targetCollectionId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const doc = await documentsApi.create({ title, document_type: type });
      await versionsApi.create(doc.id, { change_reason: "문서 최초 생성" });
      return doc;
    },
    onSuccess: async (doc) => {
      toast("문서가 생성되었습니다", "success");
      if (targetCollectionId) {
        try {
          // 훅이 toast 를 띄우지만, 여기서는 사용자가 흐름을 의식하도록 둔다.
          await addToCollection.mutateAsync({
            collectionId: targetCollectionId,
            documentIds: [doc.id],
          });
        } catch {
          // 훅이 이미 에러 토스트 처리. 문서는 이미 생성됐으니 편집 화면으로 이동.
        }
      }
      router.push(`/documents/${doc.id}/edit`);
    },
    onError: (err) => toast(getApiErrorMessage(err, "문서 생성에 실패했습니다"), "error"),
  });

  const handleSubmit = () => {
    if (!title.trim()) {
      setTitleError("제목을 입력해 주세요");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <PageHeader title="새 문서 만들기" />

      {/* S3 Phase 2 FG 2-1 UX 3차: 빈 컬렉션 CTA 에서 넘어온 맥락 배너 */}
      {targetCollectionId && (
        <div
          className="mb-4 flex items-center gap-2 rounded-md border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-3 py-2 text-sm text-[var(--color-brand-700)]"
          role="status"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7h16M4 12h16M4 17h10" />
          </svg>
          <span>
            생성 후
            {targetCollection ? (
              <> <b>&quot;{targetCollection.name}&quot;</b> 컬렉션에 자동으로 추가됩니다.</>
            ) : (
              <> 지정된 컬렉션에 자동으로 추가됩니다.</>
            )}
          </span>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            제목 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="문서 제목을 입력하세요"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError("");
            }}
          />
          {titleError && (
            <p className="mt-1 text-xs text-red-500">{titleError}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            문서 유형
          </label>
          <select
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            disabled={createMutation.isPending}
          >
            취소
          </Button>
          <Button
            variant="primary"
            size="sm"
            loading={createMutation.isPending}
            onClick={handleSubmit}
          >
            생성
          </Button>
        </div>
      </div>
    </div>
  );
}
