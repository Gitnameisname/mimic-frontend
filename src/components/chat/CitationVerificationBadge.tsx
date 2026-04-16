"use client";

/**
 * CitationVerificationBadge — content_hash 검증 결과 시각화.
 *
 * 상태:
 *  - verified:  체크마크 (녹색) — hash 검증 성공
 *  - failed:    경고 아이콘 (주황색) — 원본 변경 또는 불일치
 *  - pending:   로딩 (회색) — 검증 진행 중
 */

import { useState } from "react";

export type VerificationStatus = "verified" | "failed" | "pending";

interface CitationVerificationBadgeProps {
  status: VerificationStatus;
}

const STATUS_CONFIG: Record<
  VerificationStatus,
  { icon: string; color: string; label: string; tooltip: string }
> = {
  verified: {
    icon: "✓",
    color: "bg-green-100 text-green-700 border-green-200",
    label: "검증됨",
    tooltip: "인용 출처의 콘텐츠가 검증되었습니다.",
  },
  failed: {
    icon: "⚠",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    label: "검증 실패",
    tooltip: "원본 문서가 변경되었을 수 있습니다.",
  },
  pending: {
    icon: "○",
    color: "bg-gray-100 text-gray-500 border-gray-200",
    label: "검증 중",
    tooltip: "콘텐츠 무결성 검증이 진행 중입니다.",
  },
};

export default function CitationVerificationBadge({
  status,
}: CitationVerificationBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { icon, color, label, tooltip } = STATUS_CONFIG[status];

  return (
    <div className="relative inline-block">
      <div
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium cursor-help ${color}`}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={label}
      >
        <span aria-hidden>{icon}</span>
        <span>{label}</span>
      </div>

      {showTooltip && (
        <div
          role="tooltip"
          className="absolute right-0 top-full mt-1 w-44 px-2 py-1.5 bg-gray-900 text-white text-xs rounded shadow-lg z-30 pointer-events-none"
        >
          {tooltip}
        </div>
      )}
    </div>
  );
}
