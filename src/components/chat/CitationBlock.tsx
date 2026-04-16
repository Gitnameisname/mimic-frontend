"use client";

/**
 * CitationBlock — 메시지 하단 인용 출처 섹션.
 *
 * - citations 없거나 빈 배열이면 "근거 없음" 경고 배지
 * - citations 있으면 collapsible 섹션으로 CitationItem 목록 표시
 * - 기본값: 항목 수 표시, 클릭 시 펼치기/접기
 */

import { useState } from "react";
import CitationItem from "./CitationItem";
import type { RAGCitationInfo } from "@/types/conversation";

interface CitationBlockProps {
  citations?: RAGCitationInfo[];
  turnId: string;
}

export default function CitationBlock({
  citations,
  turnId,
}: CitationBlockProps) {
  const [expanded, setExpanded] = useState(false);

  // citations 없거나 비어있으면 "근거 없음" 배지
  if (!citations || citations.length === 0) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 border border-orange-200 text-orange-700 rounded-full text-xs font-medium">
          <span aria-hidden>⚠</span>
          <span>근거 없음</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          이 응답에는 인용 출처가 포함되지 않았습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      {/* 토글 버튼 */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
        aria-expanded={expanded}
        aria-controls={`citations-${turnId}`}
      >
        <svg
          className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
        <span>인용 출처 ({citations.length})</span>
      </button>

      {/* 인용 목록 */}
      {expanded && (
        <div
          id={`citations-${turnId}`}
          className="mt-2 space-y-2"
          role="list"
          aria-label="인용 출처 목록"
        >
          {citations.map((c) => (
            <div key={`${turnId}-cit-${c.index}`} role="listitem">
              <CitationItem citation={c} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
