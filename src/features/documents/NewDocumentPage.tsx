"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { documentsApi, versionsApi } from "@/lib/api";
import { toast } from "@/stores/uiStore";
import { Button } from "@/components/button/Button";
import { PageHeader } from "@/components/page/PageHeader";

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
  const [title, setTitle] = useState("");
  const [type, setType] = useState(DOCUMENT_TYPES[0]);
  const [titleError, setTitleError] = useState("");

  const createMutation = useMutation({
    mutationFn: async () => {
      const doc = await documentsApi.create({ title, document_type: type });
      await versionsApi.create(doc.id, { change_reason: "문서 최초 생성" });
      return doc;
    },
    onSuccess: (doc) => {
      toast("문서가 생성되었습니다", "success");
      router.push(`/documents/${doc.id}/edit`);
    },
    onError: () => toast("문서 생성에 실패했습니다", "error"),
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
