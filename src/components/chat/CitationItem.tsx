"use client";

/**
 * CitationItem — 개별 Citation 아이템.
 *
 * - document_id, version_id, node_id 등 5-tuple 표시
 * - "원문 보기" 링크 → /documents/{id}/nodes/{nodeId}?version=...&highlight=...
 * - content_hash 검증 상태 배지 (CitationVerificationBadge)
 * - snippet 미리보기 (최대 100자)
 * - BibTeX 클립보드 복사
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import CitationVerificationBadge, {
  type VerificationStatus,
} from "./CitationVerificationBadge";
import { verifyCitationHash } from "@/lib/citationService";
import type { RAGCitationInfo } from "@/types/conversation";

interface CitationItemProps {
  citation: RAGCitationInfo;
}

export default function CitationItem({ citation }: CitationItemProps) {
  const [status, setStatus] = useState<VerificationStatus>("pending");
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const { index, snippet, citation: c } = citation;

  // 백그라운드 hash 검증
  useEffect(() => {
    let cancelled = false;
    verifyCitationHash(c.document_id, c.version_id, c.node_id, c.content_hash)
      .then((valid) => {
        if (!cancelled) setStatus(valid ? "verified" : "failed");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });
    return () => { cancelled = true; };
  }, [c.document_id, c.version_id, c.node_id, c.content_hash]);

  // 원문 보기 URL 구성
  const docUrl = (() => {
    const base = `/documents/${c.document_id}`;
    const params = new URLSearchParams();
    if (c.version_id) params.set("version", c.version_id);
    if (c.node_id) params.set("node", c.node_id);
    if (c.span_offset != null) params.set("highlight", String(c.span_offset));
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  })();

  // BibTeX 복사
  const handleCopyBibTex = async () => {
    const year = new Date().getFullYear();
    const bibtex =
      `@misc{${c.document_id.slice(0, 8)},\n` +
      `  title={Document},\n` +
      `  year={${year}},\n` +
      `  url={${docUrl}}\n` +
      `}`;
    try {
      await navigator.clipboard.writeText(bibtex);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard 거부 시 무시 */
    }
  };

  return (
    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-800 truncate">
            출처 [{index}]
          </p>
          <p className="text-gray-500 mt-0.5 truncate">
            {c.document_id.slice(0, 8)}…
            {c.node_id && ` · ${c.node_id.slice(0, 8)}…`}
            {c.version_id && ` · v${c.version_id.slice(0, 8)}…`}
          </p>
        </div>
        <CitationVerificationBadge status={status} />
      </div>

      {/* snippet 미리보기 */}
      {snippet && (
        <div className="mb-2">
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="text-blue-600 hover:text-blue-800 underline text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            aria-expanded={showPreview}
            aria-label={showPreview ? "스니펫 미리보기 숨기기" : "스니펫 미리보기 보기"}
          >
            {showPreview ? "미리보기 숨기기" : "미리보기"}
          </button>
          {showPreview && (
            <p className="mt-1 px-3 py-2 bg-white border border-gray-200 rounded text-gray-700 italic leading-relaxed">
              &quot;{snippet.slice(0, 100)}{snippet.length > 100 ? "…" : ""}&quot;
            </p>
          )}
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="flex items-center gap-2">
        <Link
          href={docUrl}
          className="px-2.5 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors text-xs font-medium"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`출처 ${index} 원문 문서 새 탭에서 보기`}
        >
          원문 보기
        </Link>

        <button
          onClick={handleCopyBibTex}
          className="px-2.5 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 transition-colors text-xs font-medium"
          aria-label={copied ? "인용 형식 복사 완료" : "BibTeX 인용 형식 클립보드에 복사"}
          aria-live="polite"
          aria-atomic="true"
        >
          {copied ? "복사됨!" : "인용 형식"}
        </button>
      </div>
    </div>
  );
}
