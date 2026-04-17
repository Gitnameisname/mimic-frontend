"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { goldenSetsApi } from "@/lib/api/s2admin";
import type { GoldenSet } from "@/types/s2admin";

// ─── 스켈레톤 배너 ───

function SkeletonBanner() {
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
      <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div>
        <p className="text-sm font-bold text-amber-800">스켈레톤 상태</p>
        <p className="text-xs text-amber-700 mt-0.5">
          이 페이지는 Phase 7 FG7.1 완료 후 골든셋 API와 연결됩니다.
          현재는 레이아웃 및 UX 검증을 위한 목 데이터로 동작합니다.
        </p>
      </div>
    </div>
  );
}

// ─── 목 데이터 ───

const MOCK_GOLDEN_SETS: GoldenSet[] = [
  { id: "gs-1", name: "RAG 기본 평가셋", description: "RAG 시스템 기본 질의응답 평가", item_count: 50, current_version: 3, created_at: "2026-04-01T09:00:00Z", updated_at: "2026-04-15T14:30:00Z" },
  { id: "gs-2", name: "문서 검색 평가셋", description: "문서 검색 및 citation 정확성 평가", item_count: 30, current_version: 1, created_at: "2026-04-05T10:00:00Z", updated_at: "2026-04-05T10:00:00Z" },
  { id: "gs-3", name: "다국어 지원 평가셋", description: "한국어/영어 혼합 질의 평가", item_count: 20, current_version: 2, created_at: "2026-04-10T11:00:00Z", updated_at: "2026-04-12T16:00:00Z" },
];

// ─── 골든셋 상세 패널 (스켈레톤) ───

function GoldenSetDetailPanel({ set, onClose }: { set: GoldenSet; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-xl flex flex-col" role="dialog" aria-modal="true" aria-label={`${set.name} 상세`}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 truncate">{set.name}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300" aria-label="닫기">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 p-5 space-y-5">
          <SkeletonBanner />

          {set.description && <p className="text-sm text-gray-600">{set.description}</p>}

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-gray-900">{set.item_count}</p>
              <p className="text-xs text-gray-500 mt-1">문항 수</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-gray-900">v{set.current_version}</p>
              <p className="text-xs text-gray-500 mt-1">현재 버전</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-2xl font-bold text-gray-400">-</p>
              <p className="text-xs text-gray-500 mt-1">평가 횟수</p>
            </div>
          </div>

          {/* Q&A 항목 테이블 (스켈레톤) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">질문-답변 항목</h3>
              <button
                type="button"
                disabled
                className="text-xs font-semibold text-gray-400 border border-gray-200 px-3 py-1.5 rounded-lg cursor-not-allowed min-h-[36px]"
                title="Phase 7 완료 후 활성화"
              >
                항목 추가 (Phase 7 후)
              </button>
            </div>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">질문</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">기대 답변</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">citation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500 text-sm">
                      Phase 7 FG7.1 완료 후 데이터 연결
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 버전 이력 탭 */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">버전 이력</h3>
            <div className="border-l-2 border-gray-200 pl-4 space-y-2">
              {Array.from({ length: set.current_version }).map((_, i) => (
                <div key={i} className="relative">
                  <span className="absolute -left-[17px] top-1 w-3 h-3 rounded-full bg-gray-300" aria-hidden="true" />
                  <p className="text-sm text-gray-600">v{set.current_version - i}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Import/Export */}
          <div className="flex gap-3">
            <button
              type="button"
              disabled
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-400 cursor-not-allowed min-h-[44px]"
              title="Phase 7 완료 후 활성화"
            >
              Import (JSON)
            </button>
            <button
              type="button"
              disabled
              className="flex-1 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-400 cursor-not-allowed min-h-[44px]"
              title="Phase 7 완료 후 활성화"
            >
              Export (JSON)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// AdminGoldenSetsPage (스켈레톤)
// ═══════════════════════════════════════

export function AdminGoldenSetsPage() {
  const [selected, setSelected] = useState<GoldenSet | null>(null);

  // 실제 API 연결 시도 (실패 시 목 데이터 폴백)
  const { data, isError } = useQuery({
    queryKey: ["admin", "golden-sets"],
    queryFn: () => goldenSetsApi.list({ page_size: 20 }),
    retry: false,
  });

  const sets = isError ? MOCK_GOLDEN_SETS : (data?.data ?? MOCK_GOLDEN_SETS);

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl">
      {selected && <GoldenSetDetailPanel set={selected} onClose={() => setSelected(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">골든셋 관리</h1>
        <button
          type="button"
          disabled
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-200 text-gray-500 text-sm font-semibold cursor-not-allowed min-h-[44px]"
          title="Phase 7 완료 후 활성화"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          골든셋 생성 (Phase 7 후)
        </button>
      </div>

      <SkeletonBanner />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">이름</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">설명</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">문항 수</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">최신 버전</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">생성일</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sets.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelected(s)}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{s.description ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-700">{s.item_count}</td>
                  <td className="px-4 py-3 text-gray-700">v{s.current_version}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(s.created_at).toLocaleDateString("ko")}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelected(s); }}
                      className="text-xs font-semibold text-red-700 hover:text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50 min-h-[36px] focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      상세
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
