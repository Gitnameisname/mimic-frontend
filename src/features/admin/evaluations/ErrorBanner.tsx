"use client";

/**
 * 평가 결과 화면 공용 에러 배너.
 *
 * - 제목/본문/힌트는 기본 노출
 * - 관리자 진단용 기술 정보(technical) 는 기본적으로 펼친 상태로 노출 — 근본 원인이 없으면 화면이 조용히 실패하지 않도록.
 * - 조치 체크리스트(checklist) 는 네트워크 실패 등 다수 후보가 있을 때만 표시.
 * - "복사" 버튼으로 관리자가 지원 요청 시 바로 붙여넣을 수 있도록 기술 정보를 클립보드로 복사.
 */

import { useState } from "react";
import type { ListErrorInfo } from "./helpers";

export function EvaluationErrorBanner({
  info,
  onRetry,
  isRetrying,
}: {
  info: ListErrorInfo;
  onRetry?: () => void;
  isRetrying?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const technicalText = (info.technical ?? [])
    .map((t) => `${t.label}: ${t.value}`)
    .join("\n");

  const handleCopy = async () => {
    if (!technicalText || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(technicalText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 무시 — 권한 거부 등
    }
  };

  return (
    <div className="m-5 rounded-xl bg-red-50 border border-red-200 p-4" role="alert">
      <p className="text-sm font-bold text-red-800">{info.title}</p>
      <p className="text-xs text-red-700 mt-1">{info.body}</p>

      {info.hint && (
        <p className="text-xs text-red-700 mt-1">{info.hint}</p>
      )}

      {info.technical && info.technical.length > 0 && (
        <div className="mt-3 rounded-md bg-white border border-red-100 p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-bold text-red-800 uppercase tracking-wide">
              기술 정보
            </p>
            {technicalText && (
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] font-semibold text-red-700 hover:text-red-900 px-2 py-0.5 rounded border border-red-200 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                aria-label="기술 정보 복사"
              >
                {copied ? "복사됨" : "복사"}
              </button>
            )}
          </div>
          <dl className="text-[11px] text-red-900 font-mono space-y-0.5">
            {info.technical.map((t) => (
              <div key={t.label} className="flex gap-2">
                <dt className="font-semibold shrink-0">{t.label}:</dt>
                <dd className="break-all">{t.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {info.checklist && info.checklist.length > 0 && (
        <details className="mt-3" open>
          <summary className="text-xs font-bold text-red-800 cursor-pointer select-none">
            관리자 확인 사항 ({info.checklist.length})
          </summary>
          <ol className="mt-2 space-y-1.5 text-xs text-red-800 list-decimal list-inside">
            {info.checklist.map((item, idx) => (
              <li key={idx}>
                <span className="font-semibold">{item.title}</span>
                <p className="mt-0.5 ml-5 text-red-700 font-normal">{item.detail}</p>
              </li>
            ))}
          </ol>
        </details>
      )}

      {info.canRetry && onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-800 px-3 py-1.5 rounded-md border border-red-300 hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-60 min-h-[32px]"
        >
          {isRetrying ? "재시도 중..." : "다시 시도"}
        </button>
      )}
    </div>
  );
}
