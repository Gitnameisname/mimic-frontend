"use client";

import { useQuery } from "@tanstack/react-query";
import { capabilitiesApi } from "@/lib/api/s2admin";
import type { SystemCapabilities } from "@/types/s2admin";
import { cn } from "@/lib/utils";

// ─── Capability 카드 ───

function CapabilityCard({
  label,
  value,
  active,
  description,
  iconPath,
}: {
  label: string;
  value: string;
  active: boolean;
  description?: string;
  iconPath: string;
}) {
  return (
    <article
      className={cn(
        "rounded-xl border p-5 flex items-start gap-4 transition-all",
        active ? "bg-white border-gray-200" : "bg-gray-50 border-gray-200 opacity-75"
      )}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          active ? "bg-green-100" : "bg-gray-200"
        )}
        aria-hidden="true"
      >
        <svg
          className={cn("w-5 h-5", active ? "text-green-700" : "text-gray-400")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
        <p className={cn("text-sm font-bold", active ? "text-gray-900" : "text-gray-500")}>
          {value}
        </p>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </div>
      <span
        className={cn(
          "shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold",
          active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-500"
        )}
        aria-label={active ? "활성" : "비활성"}
      >
        {active ? "활성" : "비활성"}
      </span>
    </article>
  );
}

// ─── 저하 배너 ───

function DegradedBanner({ reasons }: { reasons: string[] }) {
  return (
    <div
      className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3"
      role="alert"
      aria-live="polite"
    >
      <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>
        <p className="text-sm font-bold text-amber-800">시스템이 제한된 모드로 동작 중입니다</p>
        {reasons.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {reasons.map((r, i) => (
              <li key={i} className="text-xs text-amber-700">· {r}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── 스켈레톤 ───

function CapabilitySkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );
}

// ─── Capabilities 카드 목록 빌더 ───

function buildCards(cap: SystemCapabilities) {
  return [
    {
      label: "RAG 가용",
      value: cap.rag_available ? "사용 가능" : "사용 불가",
      active: cap.rag_available,
      description: cap.vector_store ? `벡터 스토어: ${cap.vector_store}` : undefined,
      iconPath: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    },
    {
      label: "Embedding 모델",
      value: cap.embedding_model ?? "미설정",
      active: !!cap.embedding_model,
      description: cap.embedding_model ? "활성 임베딩 모델" : "임베딩 모델이 설정되지 않았습니다",
      iconPath: "M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4",
    },
    {
      label: "LLM 프로바이더",
      value: `${cap.active_llm_providers} / ${cap.llm_providers_count}개 활성`,
      active: cap.active_llm_providers > 0,
      description: "등록된 LLM 프로바이더 상태",
      iconPath: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    },
    {
      label: "문서 Chunking",
      value: cap.chunking_enabled ? "활성" : "비활성",
      active: cap.chunking_enabled,
      description: "문서 청킹 파이프라인",
      iconPath: "M4 6h16M4 12h16M4 18h7",
    },
    {
      label: "전문 검색 (FTS)",
      value: cap.fts_enabled ? "활성" : "비활성",
      active: cap.fts_enabled,
      description: "PostgreSQL Full-Text Search",
      iconPath: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10V3L4 14h7v7l9-11h-7z",
    },
    {
      label: "시스템 상태",
      value: cap.degraded ? "제한 모드" : "정상",
      active: !cap.degraded,
      description: cap.degraded ? "일부 기능이 비활성 상태입니다" : "모든 기능 정상 작동 중",
      iconPath: cap.degraded
        ? "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    },
  ];
}

// ═══════════════════════════════════════
// AdminCapabilitiesPage
// ═══════════════════════════════════════

export function AdminCapabilitiesPage() {
  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["admin", "capabilities"],
    queryFn: () => capabilitiesApi.get(),
    refetchInterval: 60_000,
  });

  const cap = data?.data;

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Capabilities 대시보드</h1>
          {dataUpdatedAt > 0 && (
            <p className="text-xs text-gray-500 mt-1">
              마지막 갱신: {new Date(dataUpdatedAt).toLocaleTimeString("ko")} · 60초마다 자동 갱신
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-gray-300"
          aria-label="Capabilities 새로고침"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          새로고침
        </button>
      </div>

      {isLoading ? (
        <CapabilitySkeleton />
      ) : isError ? (
        <div className="flex flex-col items-center py-12 gap-3">
          <p className="text-sm text-gray-500">Capabilities 정보를 불러오지 못했습니다.</p>
          <button type="button" onClick={() => refetch()} className="text-sm text-red-700 font-semibold px-4 py-2 rounded-lg hover:bg-red-50 min-h-[44px]">
            다시 시도
          </button>
        </div>
      ) : cap ? (
        <>
          {cap.degraded && <DegradedBanner reasons={cap.degraded_reasons} />}
          <section aria-label="시스템 기능 상태">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {buildCards(cap).map((c) => (
                <CapabilityCard key={c.label} {...c} />
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
