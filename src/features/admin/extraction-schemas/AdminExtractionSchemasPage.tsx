"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { extractionSchemasApi } from "@/lib/api/s2admin";
import type { ExtractionSchema, ExtractionSchemaField } from "@/types/s2admin";

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
          이 페이지는 Phase 8 FG8.1 완료 후 추출 스키마 API와 연결됩니다.
        </p>
      </div>
    </div>
  );
}

// ─── 목 데이터 ───

const MOCK_SCHEMAS: ExtractionSchema[] = [
  { id: "es-1", document_type_code: "contract", fields_count: 8, extraction_mode: "deterministic", updated_at: "2026-04-10T09:00:00Z" },
  { id: "es-2", document_type_code: "invoice", fields_count: 12, extraction_mode: "deterministic", updated_at: "2026-04-12T11:00:00Z" },
  { id: "es-3", document_type_code: "report", fields_count: 5, extraction_mode: "probabilistic", updated_at: "2026-04-14T15:00:00Z" },
];

const MOCK_FIELDS: ExtractionSchemaField[] = [
  { name: "party_a", type: "string", required: true, description: "계약 당사자 A" },
  { name: "party_b", type: "string", required: true, description: "계약 당사자 B" },
  { name: "contract_date", type: "string", required: true, description: "계약 체결일" },
  { name: "amount", type: "number", required: false, description: "계약 금액" },
  { name: "clauses", type: "array", required: false, description: "계약 조항 목록" },
];

// ─── 스키마 상세 패널 ───

function SchemaDetailPanel({ schema, onClose }: { schema: ExtractionSchema; onClose: () => void }) {
  const { data, isError } = useQuery({
    queryKey: ["admin", "extraction-schemas", schema.document_type_code],
    queryFn: () => extractionSchemasApi.get(schema.document_type_code),
    retry: false,
  });

  const fields: ExtractionSchemaField[] = isError
    ? MOCK_FIELDS
    : (data?.data?.fields ?? MOCK_FIELDS);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-xl flex flex-col" role="dialog" aria-modal="true" aria-label={`${schema.document_type_code} 스키마 상세`}>
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">{schema.document_type_code}</h2>
            <p className="text-xs text-gray-500">추출 스키마 편집</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300" aria-label="닫기">
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          <SkeletonBanner />

          {/* 추출 모드 */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-gray-700">추출 모드:</span>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
              schema.extraction_mode === "deterministic" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
            }`}>
              {schema.extraction_mode === "deterministic" ? "결정론적" : "확률적"}
            </span>
            <button
              type="button"
              disabled
              className="text-xs text-gray-400 cursor-not-allowed"
              title="Phase 8 완료 후 활성화"
            >
              변경 (Phase 8 후)
            </button>
          </div>

          {/* 필드 테이블 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">스키마 필드 ({fields.length}개)</h3>
              <button
                type="button"
                disabled
                className="text-xs font-semibold text-gray-400 border border-gray-200 px-3 py-1.5 rounded-lg cursor-not-allowed min-h-[36px]"
                title="Phase 8 완료 후 활성화"
              >
                필드 추가 (Phase 8 후)
              </button>
            </div>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">필드명</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">타입</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">필수</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">설명</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fields.map((f) => (
                    <tr key={f.name} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900 font-mono text-xs">{f.name}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 font-mono">
                          {f.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {f.required ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">필수</span>
                        ) : (
                          <span className="text-gray-400 text-xs">선택</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{f.description ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// AdminExtractionSchemasPage (스켈레톤)
// ═══════════════════════════════════════

export function AdminExtractionSchemasPage() {
  const [selected, setSelected] = useState<ExtractionSchema | null>(null);

  const { data, isError } = useQuery({
    queryKey: ["admin", "extraction-schemas"],
    queryFn: () => extractionSchemasApi.list(),
    retry: false,
  });

  const schemas = isError ? MOCK_SCHEMAS : (data?.data ?? MOCK_SCHEMAS);

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl">
      {selected && <SchemaDetailPanel schema={selected} onClose={() => setSelected(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">추출 스키마 관리</h1>
      </div>

      <SkeletonBanner />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">DocumentType</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">정의된 필드</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">추출 모드</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">최종 수정일</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schemas.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setSelected(s)}>
                  <td className="px-4 py-3 font-semibold text-gray-900 font-mono">{s.document_type_code}</td>
                  <td className="px-4 py-3 text-gray-700">{s.fields_count}개</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                      s.extraction_mode === "deterministic" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                    }`}>
                      {s.extraction_mode === "deterministic" ? "결정론적" : "확률적"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(s.updated_at).toLocaleDateString("ko")}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setSelected(s); }}
                      className="text-xs font-semibold text-red-700 hover:text-red-800 px-3 py-1.5 rounded-lg hover:bg-red-50 min-h-[36px] focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      스키마 편집
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
