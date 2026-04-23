"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { extractionSchemasApi } from "@/lib/api/s2admin";
import { ApiError, NetworkError } from "@/lib/api/client";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import FieldsEditor from "./FieldsEditor";
import type {
  ExtractionSchema,
  ExtractionSchemaField,
  ExtractionSchemaVersion,
  ExtractionSchemaDiff,
} from "@/types/s2admin";
import {
  detectRepeatRollback as _detectRepeatRollback,
  diffMismatchSummary as _diffMismatchSummary,
  type DiffMismatchSummary,
  type FieldsDiff as _FieldsDiff,
  type PropertyChange as _PropertyChange,
  type RepeatRollbackHint,
} from "./diffMismatch";
import {
  normalizeDocTypeCode,
  isValidDocTypeCode,
  isDocTypeNotFoundError,
  resolveDocTypeNotFoundHint,
} from "./docTypeNormalize";

// P5: 순수 로직 유틸은 diffMismatch.ts 에서 구현되며 테스트가 직접 import 한다.
// 이 파일은 공통 타입과 함수를 재export 해 호출부 호환을 유지한다.
export type PropertyChange = _PropertyChange;
export type FieldsDiff = _FieldsDiff;
export { type DiffMismatchSummary, type RepeatRollbackHint };
export const diffMismatchSummary = _diffMismatchSummary;
export const detectRepeatRollback = _detectRepeatRollback;

// ═════════════════════════════════════════════════════════════
// 공통: 에러 배너
// ═════════════════════════════════════════════════════════════

function ErrorBanner({ error }: { error: unknown }) {
  let title = "추출 스키마를 불러오지 못했습니다";
  let body = "잠시 후 다시 시도해 주세요.";
  // P7-1-c / P7-2-a: 422 중에서도 FK 미존재(= DocumentType 이 document_types 에 없음) 는
  //   "/admin/document-types 로 이동" 이라는 명확한 해결 경로가 있으므로
  //   일반 422 ("입력값 검증 실패") 와 구분해 액션 버튼을 달아 주기 위한 플래그.
  //
  // P7-2-a: 감지 우선순위가 바뀌었다.
  //   1. 서버가 `detail.code = "DOC_TYPE_NOT_FOUND"` 로 내려주면
  //      `isDocTypeNotFoundError` 가 ApiError.code 로 즉시 true.
  //   2. 구버전 서버(P7-1) 로 문자열 detail 만 올 때는 동일 함수가
  //      내부적으로 `isFkMissingDocTypeError` 로 폴백.
  //   → 프론트는 서버 롤백/롤아웃 순서와 관계없이 동일 UX.
  let hint: { href: string; label: string } | null = null;

  if (error instanceof NetworkError) {
    title = "API 서버에 연결하지 못했습니다";
    body = `${error.method} ${error.url} — ${error.originalMessage}`;
  } else if (error instanceof ApiError) {
    if (error.status === 403) {
      title = "이 목록을 열람할 권한이 없습니다";
      body = "Scope Profile 관리자에게 문의하세요.";
    } else if (error.status === 404) {
      title = "요청한 스키마를 찾을 수 없습니다";
      body = error.message;
    } else if (error.status === 409) {
      title = "이미 존재하는 DocumentType 입니다";
      body = error.message;
    } else if (error.status === 422 && isDocTypeNotFoundError(error)) {
      // 서버 구조화 에러 코드(P7-2-a) 우선, 메시지 regex(P7-1) 폴백.
      title = "참조하는 DocumentType 이 없습니다";
      body = error.message;
      // `resolveDocTypeNotFoundHint` 는 ApiError.hint 를 화이트리스트로 검증한
      // 뒤 반환. 서버가 악의적 href 를 내려보내도 클라이언트가 로컬 상수로
      // fallback 하므로 open redirect 벡터가 차단된다 (P7-2 보안보고서 C7).
      hint = resolveDocTypeNotFoundHint(error);
    } else if (error.status === 422) {
      title = "입력값 검증에 실패했습니다";
      body = error.message || body;
    } else {
      title = `서버 오류 (HTTP ${error.status})`;
      body = error.message || body;
    }
  }

  return (
    <div
      role="alert"
      className="rounded-xl bg-red-50 border border-red-200 p-4 flex items-start gap-3"
    >
      <svg
        className="w-5 h-5 text-red-600 shrink-0 mt-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-red-800">{title}</p>
        <p className="text-xs text-red-700 mt-0.5 break-words">{body}</p>
        {hint && (
          // Next.js <Link> 대신 순수 <a> 를 쓰는 이유:
          //   이 배너는 모달 안에서도 뜨는데, 이미 `onClick={onClose}` 가 걸린
          //   overlay 영역이라 Link 의 client-side navigation 이 stopPropagation
          //   타이밍 이슈를 만들 수 있음. 단순 <a> 가 가장 예측 가능.
          <a
            href={hint.href}
            className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 text-xs font-semibold text-red-800 bg-white border border-red-300 rounded-md hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            {hint.label}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// fields 객체 검증 유틸 (P2-A)
// ═════════════════════════════════════════════════════════════

const FIELD_NAME_RE = /^[a-z][a-z0-9_]*$/;

/**
 * FieldsEditor 가 산출한 fields 객체에 대해 제출 직전 최종 검증.
 *
 * — 키와 field_name 이 일치하는가
 * — 필수 속성(field_name, field_type, description) 이 모두 채워졌는가
 * — 키 snake_case 규칙 준수
 * — 중복 이름 없음 (Record 는 키 유일성을 강제하지만 rename 시
 *   임시로 field_name 만 바뀌어 중복이 발생할 수 있으므로 이중 검사)
 * — enum 타입이면 enum_values 1개 이상
 */
function validateFieldsObject(
  fields: Record<string, ExtractionSchemaField>
): { ok: true } | { ok: false; error: string } {
  const entries = Object.entries(fields);
  if (entries.length === 0) {
    return { ok: false, error: "최소 1개 이상의 필드가 필요합니다." };
  }

  const names = new Set<string>();
  for (const [k, v] of entries) {
    if (!v || typeof v !== "object") {
      return { ok: false, error: `필드 '${k}' 의 값이 객체가 아닙니다.` };
    }
    if (typeof v.field_name !== "string" || !v.field_name) {
      return { ok: false, error: `필드 '${k}' 에 field_name 이 필요합니다.` };
    }
    if (!FIELD_NAME_RE.test(v.field_name)) {
      return {
        ok: false,
        error: `필드 '${v.field_name}' 은(는) snake_case(소문자/숫자/언더스코어) 여야 합니다.`,
      };
    }
    if (k !== v.field_name) {
      return {
        ok: false,
        error: `필드 키('${k}') 와 field_name('${v.field_name}') 이 일치하지 않습니다. 이름을 확정한 뒤 저장하세요.`,
      };
    }
    if (names.has(v.field_name)) {
      return {
        ok: false,
        error: `중복된 필드명이 있습니다: '${v.field_name}'`,
      };
    }
    names.add(v.field_name);

    if (typeof v.field_type !== "string") {
      return { ok: false, error: `필드 '${k}' 의 field_type 이 유효하지 않습니다.` };
    }
    if (typeof v.description !== "string" || !v.description.trim()) {
      return { ok: false, error: `필드 '${k}' 의 설명(description) 을 입력하세요.` };
    }
    if (v.field_type === "enum") {
      const vals = v.enum_values ?? [];
      if (!Array.isArray(vals) || vals.length === 0) {
        return {
          ok: false,
          error: `필드 '${k}' 는 enum 타입이므로 enum_values 를 1개 이상 입력하세요.`,
        };
      }
    }
  }
  return { ok: true };
}

// ═════════════════════════════════════════════════════════════
// 스키마 생성 모달
// ═════════════════════════════════════════════════════════════

const CREATE_FIELDS_DEFAULT: Record<string, ExtractionSchemaField> = {
  party_a: {
    field_name: "party_a",
    field_type: "string",
    required: true,
    description: "계약 당사자 A",
  },
  amount: {
    field_name: "amount",
    field_type: "number",
    required: false,
    description: "계약 금액",
  },
};

function CreateSchemaModal({ onClose }: { onClose: () => void }) {
  const [docTypeCode, setDocTypeCode] = useState("");
  const [fields, setFields] = useState<Record<string, ExtractionSchemaField>>(
    () => CREATE_FIELDS_DEFAULT
  );
  const [scopeProfileId, setScopeProfileId] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, true);

  // Escape 로 닫기
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const createMutation = useMutationWithToast({
    mutationFn: (payload: Parameters<typeof extractionSchemasApi.create>[0]) =>
      extractionSchemasApi.create(payload),
    successMessage: "추출 스키마를 생성했습니다.",
    errorMessage: "추출 스키마 생성에 실패했습니다.",
    invalidateKeys: [["admin", "extraction-schemas"]],
    onSuccess: () => onClose(),
  });

  const submit = () => {
    setValidationError(null);

    // P7-1-b: document_types.type_code 는 서버/프론트 양쪽 모두 대문자로 통일한다.
    //   CreateDocTypeModal 이 UPPERCASE 로 저장하는데 여기서 소문자로 보내면
    //   FK mismatch (404/422) 를 맞는다. 서버 Pydantic validator 가 최종 정규화를
    //   해 주지만, 여기서도 미리 맞춰 두면 사용자 화면에서 본 값과 실제 저장값이
    //   동일해져 혼선이 줄어든다.
    const normalizedDocTypeCode = normalizeDocTypeCode(docTypeCode);
    if (!isValidDocTypeCode(normalizedDocTypeCode)) {
      setValidationError(
        "doc_type_code 는 영문자로 시작하고 영문/숫자/하이픈/언더스코어만 허용됩니다."
      );
      return;
    }

    const result = validateFieldsObject(fields);
    if (!result.ok) {
      setValidationError(result.error);
      return;
    }

    let scope: string | null = null;
    if (scopeProfileId.trim()) {
      // 최소 UUID 길이 체크만 (서버가 최종 검증)
      if (scopeProfileId.trim().length < 32) {
        setValidationError("scope_profile_id 는 UUID 형식이어야 합니다.");
        return;
      }
      scope = scopeProfileId.trim();
    }

    createMutation.mutate({
      doc_type_code: normalizedDocTypeCode,
      fields,
      scope_profile_id: scope,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-schema-title"
        className="bg-white w-full max-w-2xl rounded-xl shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <h2 id="create-schema-title" className="text-base font-bold text-gray-900">
            추출 스키마 생성
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label htmlFor="create-doc-type-code" className="block text-xs font-semibold text-gray-700 mb-1">
              DocumentType 코드 <span className="text-red-600">*</span>
            </label>
            <input
              id="create-doc-type-code"
              type="text"
              value={docTypeCode}
              onChange={(e) => setDocTypeCode(e.target.value)}
              placeholder="예: CONTRACT"
              // P7-1-b: `uppercase` 클래스로 타이핑 중에도 대문자로 보이게 해
              //   "저장되는 값" 과 "보이는 값" 을 일치시킨다. 실제 대문자 변환은
              //   submit() 에서 수행 — IME 조합 중 onChange 에서 건드리면
              //   한글·일본어 등 조합형 입력이 깨질 수 있어 표시만 CSS 로 처리.
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
              aria-describedby="create-doc-type-code-hint"
              autoComplete="off"
              spellCheck={false}
            />
            <p id="create-doc-type-code-hint" className="text-[10px] text-gray-500 mt-1">
              영문자로 시작, 영문/숫자/하이픈/언더스코어만 허용. 서버에 저장될 때는 대문자로 변환됩니다.
            </p>
          </div>

          <div>
            <label htmlFor="create-scope-profile-id" className="block text-xs font-semibold text-gray-700 mb-1">
              Scope Profile ID (선택)
            </label>
            <input
              id="create-scope-profile-id"
              type="text"
              value={scopeProfileId}
              onChange={(e) => setScopeProfileId(e.target.value)}
              placeholder="UUID — 비우면 전역 스키마"
              className="w-full px-3 py-2 text-[11px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              autoComplete="off"
            />
          </div>

          <div>
            <label id="create-fields-label" className="block text-xs font-semibold text-gray-700 mb-1">
              필드 정의 <span className="text-red-600">*</span>
            </label>
            <div role="group" aria-labelledby="create-fields-label">
              <FieldsEditor fields={fields} onChange={setFields} />
            </div>
            <p className="text-[10px] text-gray-500 mt-1">
              필드를 추가하고 타입별 제약을 설정합니다. 고급 속성(nested_schema 등)은
              오른쪽 상단 <strong>JSON 모드</strong> 에서 편집하세요.
            </p>
          </div>

          {validationError && <ErrorBanner error={new Error(validationError)} />}
          {createMutation.isError && <ErrorBanner error={createMutation.error} />}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={createMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? "생성 중…" : "생성"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// 버전 diff 계산 유틸 (P2-B)
// ═════════════════════════════════════════════════════════════

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const ak = Object.keys(a as Record<string, unknown>).sort();
    const bk = Object.keys(b as Record<string, unknown>).sort();
    if (ak.length !== bk.length) return false;
    if (!ak.every((k, i) => k === bk[i])) return false;
    return ak.every((k) =>
      deepEqual(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k]
      )
    );
  }
  return false;
}

function computeFieldsDiff(
  base: Record<string, ExtractionSchemaField>,
  target: Record<string, ExtractionSchemaField>
): FieldsDiff {
  const baseKeys = Object.keys(base);
  const targetKeys = Object.keys(target);
  const baseSet = new Set(baseKeys);
  const targetSet = new Set(targetKeys);

  const added = targetKeys.filter((k) => !baseSet.has(k)).sort();
  const removed = baseKeys.filter((k) => !targetSet.has(k)).sort();
  const modified: FieldsDiff["modified"] = [];

  for (const k of baseKeys.filter((k) => targetSet.has(k)).sort()) {
    const b = base[k] as unknown as Record<string, unknown>;
    const t = target[k] as unknown as Record<string, unknown>;
    const allKeys = Array.from(
      new Set([...Object.keys(b ?? {}), ...Object.keys(t ?? {})])
    ).sort();
    const changes: PropertyChange[] = [];
    for (const pk of allKeys) {
      const bv = b?.[pk];
      const tv = t?.[pk];
      if (!deepEqual(bv, tv)) {
        changes.push({ key: pk, before: bv, after: tv });
      }
    }
    if (changes.length > 0) modified.push({ name: k, changes });
  }
  return { added, removed, modified };
}

function renderValue(v: unknown): string {
  if (v === undefined) return "—";
  if (v === null) return "null";
  if (typeof v === "string") return v === "" ? '""' : v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

// ═════════════════════════════════════════════════════════════
// DiffView — 두 버전 필드 비교 결과 렌더
// ═════════════════════════════════════════════════════════════

function DiffView({
  diff,
  baseVersion,
  targetVersion,
  onClear,
}: {
  diff: FieldsDiff;
  baseVersion: number;
  targetVersion: number;
  onClear: () => void;
}) {
  const total = diff.added.length + diff.removed.length + diff.modified.length;

  return (
    <section
      aria-labelledby="version-diff-title"
      className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h4 id="version-diff-title" className="text-sm font-bold text-blue-900">
          버전 비교 · v{baseVersion} → v{targetVersion}
        </h4>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="font-mono text-blue-900">변경 {total}건</span>
          <button
            type="button"
            onClick={onClear}
            className="text-blue-700 hover:text-blue-900 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
          >
            초기화
          </button>
        </div>
      </div>

      {total === 0 ? (
        <p className="text-xs text-gray-500">두 버전의 fields 가 동일합니다.</p>
      ) : (
        <ul className="space-y-2 text-xs">
          {diff.added.map((name) => (
            <li
              key={`add-${name}`}
              className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 flex items-start gap-2"
            >
              <span className="font-mono font-bold text-green-700 mt-0.5">+</span>
              <div className="min-w-0 flex-1">
                <p className="font-mono font-semibold text-green-900 break-all">
                  {name}
                </p>
                <p className="text-[10px] text-green-700 mt-0.5">추가됨</p>
              </div>
            </li>
          ))}
          {diff.removed.map((name) => (
            <li
              key={`rm-${name}`}
              className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 flex items-start gap-2"
            >
              <span className="font-mono font-bold text-red-700 mt-0.5">−</span>
              <div className="min-w-0 flex-1">
                <p className="font-mono font-semibold text-red-900 break-all">
                  {name}
                </p>
                <p className="text-[10px] text-red-700 mt-0.5">제거됨</p>
              </div>
            </li>
          ))}
          {diff.modified.map((mod) => (
            <li
              key={`mod-${mod.name}`}
              className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2"
            >
              <div className="flex items-start gap-2 mb-2">
                <span className="font-mono font-bold text-amber-700 mt-0.5">~</span>
                <div className="min-w-0 flex-1">
                  <p className="font-mono font-semibold text-amber-900 break-all">
                    {mod.name}
                  </p>
                  <p className="text-[10px] text-amber-700 mt-0.5">
                    수정됨 ({mod.changes.length}개 속성)
                  </p>
                </div>
              </div>
              <ul className="ml-5 space-y-1">
                {mod.changes.map((ch) => (
                  <li
                    key={ch.key}
                    className="text-[11px] rounded bg-white/60 border border-amber-100 px-2 py-1"
                  >
                    <span className="font-mono font-semibold text-gray-700">
                      {ch.key}
                    </span>
                    <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 mt-0.5">
                      <span className="text-red-600 font-mono">−</span>
                      <code className="font-mono text-red-700 break-all">
                        {renderValue(ch.before)}
                      </code>
                      <span className="text-green-600 font-mono">+</span>
                      <code className="font-mono text-green-700 break-all">
                        {renderValue(ch.after)}
                      </code>
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// VersionDiffModal (P4-D) — 서버 정본 diff 조회 및 모달 표시
// ═════════════════════════════════════════════════════════════
//
// 클라이언트 computeFieldsDiff 는 방어용이고, 최종 "무엇을 되돌리는가" 판단은
// 서버 /extraction-schemas/{doc_type}/versions/diff 응답을 정본으로 삼는다.
// 두 버전의 fields 객체를 각각 캐시에서 꺼내 로컬 계산할 수도 있지만:
//   1) 서버-측 deep-equal 규칙(예: bool vs int 엄격 구분) 과 일치시키려면
//      서버 응답을 받는 편이 안전하고
//   2) scope_profile_id 게이트를 통과해서 응답이 왔다는 것 자체가 ACL 보증이 된다.

function VersionDiffModal({
  docTypeCode,
  schemaId,
  baseVersion,
  targetVersion,
  scopeProfileId,
  clientDiff,
  onClose,
}: {
  docTypeCode: string;
  /**
   * P5-3: 동일한 doc_type_code 로 하드삭제 → 재생성 이 일어나면 이전 스키마의
   * diff 캐시가 오염될 수 있다. schema_id 를 queryKey 에 포함시켜 스키마 수명
   * 주기가 다르면 캐시도 분리되도록 한다. 상위 상세 패널은 현재 스키마의
   * `id` 를 알고 있으므로 비용 없이 주입 가능.
   */
  schemaId: string;
  baseVersion: number;
  targetVersion: number;
  scopeProfileId?: string | null;
  /**
   * P5-1: 상위(`VersionHistorySection`) 가 이미 보유하고 있는 로컬 계산 diff.
   * 전달되면 서버 정본과 어긋난 지점을 요약해 사용자에게 투명하게 보여준다.
   */
  clientDiff?: FieldsDiff | null;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  useFocusTrap(modalRef, true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "admin",
      "extraction-schemas",
      docTypeCode,
      "diff",
      // P5-3: schema_id 를 캐시 키에 포함. doc_type_code 가 재사용되어도
      // schema_id 가 달라지면 전혀 다른 캐시 슬롯으로 저장된다.
      schemaId,
      baseVersion,
      targetVersion,
      scopeProfileId ?? null,
    ],
    queryFn: () =>
      extractionSchemasApi.diffVersions(docTypeCode, {
        base_version: baseVersion,
        target_version: targetVersion,
        scope_profile_id: scopeProfileId ?? null,
      }),
    retry: false,
    // P5-3: 과거 버전들의 diff 결과는 immutable 하므로 staleTime=Infinity 가
    // 의미상 올바르다. 그럼에도 스키마 상태가 바뀌면 상위 mutation 의
    // `invalidateKeys: [["admin", "extraction-schemas"]]` 프리픽스가 이 쿼리도
    // 무효화한다 (TanStack v5 prefix 매칭). 따라서 staleness 는 발생하지 않음.
    staleTime: Infinity,
    // gcTime 기본값(5분) 유지 — 모달 닫았다가 잠깐 뒤에 다시 여는 UX 에서
    // 네트워크 없이 즉시 결과를 볼 수 있다.
  });

  const diff: ExtractionSchemaDiff | null = data?.data ?? null;
  const total =
    (diff?.added.length ?? 0) +
    (diff?.removed.length ?? 0) +
    (diff?.modified.length ?? 0);

  // P5-1: 서버/클라 diff 불일치 요약. clientDiff 가 전달되지 않았다면 건너뜀.
  const mismatch: DiffMismatchSummary | null = useMemo(() => {
    if (!diff || !clientDiff) return null;
    return diffMismatchSummary(diff, clientDiff);
  }, [diff, clientDiff]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-diff-modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
      >
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="version-diff-modal-title"
              className="text-base font-bold text-gray-900"
            >
              서버 정본 버전 비교
            </h2>
            <p className="text-xs text-gray-600 mt-0.5 font-mono break-all">
              {docTypeCode} · v{baseVersion} → v{targetVersion}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="닫기"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading && (
            <p className="text-sm text-gray-500" role="status">
              서버 정본 비교 결과를 불러오는 중…
            </p>
          )}

          {isError && <ErrorBanner error={error} />}

          {diff && (
            <>
              {/* P5-1: 서버/클라 diff 불일치 인디케이터 */}
              {mismatch && !mismatch.equal && (
                <section
                  role="status"
                  aria-label="서버 결과와 클라이언트 미리보기 간 차이"
                  className="rounded-lg bg-indigo-50 border border-indigo-200 p-3 text-[11px] text-indigo-900 space-y-1"
                >
                  <p className="font-semibold flex items-center gap-1">
                    <svg
                      aria-hidden="true"
                      className="w-3.5 h-3.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-.001V10a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    서버 결과가 로컬 미리보기와 다릅니다 — 이 화면이 기준입니다.
                  </p>
                  <ul className="ml-4 list-disc space-y-0.5">
                    {mismatch.serverOnlyAdded.length > 0 && (
                      <li>
                        서버만 추가로 본 필드(add):{" "}
                        <span className="font-mono">
                          {mismatch.serverOnlyAdded.join(", ")}
                        </span>
                      </li>
                    )}
                    {mismatch.clientOnlyAdded.length > 0 && (
                      <li>
                        로컬만 추가로 본 필드(add):{" "}
                        <span className="font-mono">
                          {mismatch.clientOnlyAdded.join(", ")}
                        </span>
                      </li>
                    )}
                    {mismatch.serverOnlyRemoved.length > 0 && (
                      <li>
                        서버만 제거로 본 필드(remove):{" "}
                        <span className="font-mono">
                          {mismatch.serverOnlyRemoved.join(", ")}
                        </span>
                      </li>
                    )}
                    {mismatch.clientOnlyRemoved.length > 0 && (
                      <li>
                        로컬만 제거로 본 필드(remove):{" "}
                        <span className="font-mono">
                          {mismatch.clientOnlyRemoved.join(", ")}
                        </span>
                      </li>
                    )}
                    {mismatch.serverOnlyModified.length > 0 && (
                      <li>
                        서버만 수정으로 본 필드:{" "}
                        <span className="font-mono">
                          {mismatch.serverOnlyModified.join(", ")}
                        </span>
                      </li>
                    )}
                    {mismatch.clientOnlyModified.length > 0 && (
                      <li>
                        로컬만 수정으로 본 필드:{" "}
                        <span className="font-mono">
                          {mismatch.clientOnlyModified.join(", ")}
                        </span>
                      </li>
                    )}
                    {mismatch.modifiedKeyDiffers.length > 0 && (
                      <li>
                        수정된 속성 키 집합이 다른 필드:{" "}
                        <span className="font-mono">
                          {mismatch.modifiedKeyDiffers.join(", ")}
                        </span>{" "}
                        <span className="text-indigo-700">
                          (예: bool vs 1/0 등 타입 엄격성 차이 가능)
                        </span>
                      </li>
                    )}
                  </ul>
                </section>
              )}

              {mismatch && mismatch.equal && (
                <p
                  role="status"
                  className="text-[10px] text-gray-500 text-right"
                >
                  로컬 미리보기와 서버 결과가 일치합니다.
                </p>
              )}

              <dl
                className="grid grid-cols-4 gap-2 text-center text-xs"
                aria-label="요약"
              >
                <div className="rounded-lg bg-green-50 border border-green-200 p-2">
                  <dt className="text-green-700 text-[10px]">추가</dt>
                  <dd className="font-mono font-bold text-green-900 text-base">
                    {diff.added.length}
                  </dd>
                </div>
                <div className="rounded-lg bg-red-50 border border-red-200 p-2">
                  <dt className="text-red-700 text-[10px]">제거</dt>
                  <dd className="font-mono font-bold text-red-900 text-base">
                    {diff.removed.length}
                  </dd>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-2">
                  <dt className="text-amber-700 text-[10px]">수정</dt>
                  <dd className="font-mono font-bold text-amber-900 text-base">
                    {diff.modified.length}
                  </dd>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-2">
                  <dt className="text-gray-600 text-[10px]">동일</dt>
                  <dd className="font-mono font-bold text-gray-800 text-base">
                    {diff.unchanged_count}
                  </dd>
                </div>
              </dl>

              {total === 0 ? (
                <p className="text-xs text-gray-500">
                  두 버전의 fields 가 서버 기준으로도 동일합니다.
                </p>
              ) : (
                <ul className="space-y-2 text-xs" aria-label="변경 내역">
                  {diff.added.map((name) => (
                    <li
                      key={`srv-add-${name}`}
                      className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 flex items-start gap-2"
                    >
                      <span
                        aria-hidden="true"
                        className="font-mono font-bold text-green-700 mt-0.5"
                      >
                        +
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono font-semibold text-green-900 break-all">
                          {name}
                        </p>
                        <p className="text-[10px] text-green-700 mt-0.5">
                          추가됨 (target 에 새로 생김)
                        </p>
                      </div>
                    </li>
                  ))}
                  {diff.removed.map((name) => (
                    <li
                      key={`srv-rm-${name}`}
                      className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 flex items-start gap-2"
                    >
                      <span
                        aria-hidden="true"
                        className="font-mono font-bold text-red-700 mt-0.5"
                      >
                        −
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono font-semibold text-red-900 break-all">
                          {name}
                        </p>
                        <p className="text-[10px] text-red-700 mt-0.5">
                          제거됨 (target 에서 없어짐)
                        </p>
                      </div>
                    </li>
                  ))}
                  {diff.modified.map((mod) => (
                    <li
                      key={`srv-mod-${mod.name}`}
                      className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span
                          aria-hidden="true"
                          className="font-mono font-bold text-amber-700 mt-0.5"
                        >
                          ~
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono font-semibold text-amber-900 break-all">
                            {mod.name}
                          </p>
                          <p className="text-[10px] text-amber-700 mt-0.5">
                            수정됨 ({mod.changes.length}개 속성)
                          </p>
                        </div>
                      </div>
                      <ul className="ml-5 space-y-1">
                        {mod.changes.map((ch) => (
                          <li
                            key={ch.key}
                            className="text-[11px] rounded bg-white/60 border border-amber-100 px-2 py-1"
                          >
                            <span className="font-mono font-semibold text-gray-700">
                              {ch.key}
                            </span>
                            <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 mt-0.5">
                              <span
                                aria-hidden="true"
                                className="text-red-600 font-mono"
                              >
                                −
                              </span>
                              <code className="font-mono text-red-700 break-all">
                                {renderValue(ch.before)}
                              </code>
                              <span
                                aria-hidden="true"
                                className="text-green-600 font-mono"
                              >
                                +
                              </span>
                              <code className="font-mono text-green-700 break-all">
                                {renderValue(ch.after)}
                              </code>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 min-h-[36px]"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// RollbackDialog (P4-E) — 과거 버전으로 되돌리기 확인 모달
// ═════════════════════════════════════════════════════════════
//
// 되돌리기는 서버 측에서 "새 버전을 찍는" 동작(v{현재+1} 생성) 이지, 과거 버전을
// 덮어쓰거나 지우지 않는다. 그래도 사용자 입장에서는 내용이 바뀌는 작업이므로
// 확인 모달을 한 번 거치게 한다.
//
// `change_summary` 는 선택. 비워두면 서버가 "v{target} 로 되돌리기" 라는 기본
// 요약을 생성한다 (repository 의 기본 동작). 사용자 정의 요약이 있으면 그것을
// 그대로 보낸다.

function RollbackDialog({
  docTypeCode,
  currentVersion,
  targetVersion,
  scopeProfileId,
  recentVersions,
  onClose,
  onSuccess,
}: {
  docTypeCode: string;
  currentVersion: number;
  targetVersion: number;
  scopeProfileId?: string | null;
  /**
   * P5-2: 상위 섹션이 이미 보유한 버전 이력 (DESC 순, 최신 먼저). 가장 최근
   * 버전이 동일 target 으로의 롤백이면 "직전에 이미 되돌리셨습니다" 경고를
   * 표시한다. 빈 배열/미전달 시 경고는 표시하지 않음 (안전 기본값).
   */
  recentVersions?: ExtractionSchemaVersion[];
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [summary, setSummary] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [userAcknowledged, setUserAcknowledged] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  // P5-2: 반복 rollback 감지. 경고 자체는 막지 않지만 사용자가 체크박스로
  // 명시 확인하지 않으면 "되돌리기" 버튼을 비활성화한다 (실수 방지 UX).
  const repeatHint: RepeatRollbackHint = useMemo(() => {
    if (!recentVersions) return { detected: false };
    return detectRepeatRollback(recentVersions, targetVersion, currentVersion);
  }, [recentVersions, targetVersion, currentVersion]);

  const mutation = useMutationWithToast({
    mutationFn: (payload: Parameters<typeof extractionSchemasApi.rollback>[1]) =>
      extractionSchemasApi.rollback(docTypeCode, payload),
    successMessage: `v${targetVersion} 로 되돌렸습니다.`,
    errorMessage: "되돌리기에 실패했습니다.",
    invalidateKeys: [
      ["admin", "extraction-schemas"],
      ["admin", "extraction-schemas", docTypeCode],
      ["admin", "extraction-schemas", docTypeCode, "versions"],
    ],
    onSuccess: () => {
      setSummary("");
      setValidationError(null);
      setUserAcknowledged(false);
      onSuccess?.();
      onClose();
    },
  });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !mutation.isPending) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, mutation.isPending]);

  const handleConfirm = () => {
    setValidationError(null);
    // 서버 모델이 control-char 를 거부하므로 방어.
    const trimmed = summary.trim();
    // eslint-disable-next-line no-control-regex
    if (trimmed && /[\u0000-\u001F\u007F]/.test(trimmed)) {
      setValidationError("변경 요약에 제어 문자가 포함될 수 없습니다.");
      return;
    }
    mutation.mutate({
      target_version: targetVersion,
      change_summary: trimmed ? trimmed : null,
      scope_profile_id: scopeProfileId ?? null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => {
        if (!mutation.isPending) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rollback-dialog-title"
        aria-describedby="rollback-dialog-desc"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col"
      >
        <div className="px-5 py-4 border-b border-gray-200">
          <h2
            id="rollback-dialog-title"
            className="text-base font-bold text-gray-900"
          >
            이 버전으로 되돌리기
          </h2>
          <p
            id="rollback-dialog-desc"
            className="text-xs text-gray-600 mt-0.5"
          >
            현재 v{currentVersion} 의 내용을 v{targetVersion} 로 되돌립니다. 기존
            과거 버전은 그대로 남고, v{currentVersion + 1} 이 새로 생성됩니다.
          </p>
        </div>

        <div className="p-5 space-y-3">
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-800 space-y-1">
            <p>
              · 기준 스키마(
              <span className="font-mono">{docTypeCode}</span>) 은 현재{" "}
              <span className="font-mono font-semibold">
                v{currentVersion}
              </span>{" "}
              입니다.
            </p>
            <p>
              · 되돌린 결과는{" "}
              <span className="font-mono font-semibold">
                v{currentVersion + 1}
              </span>{" "}
              로 기록됩니다 (과거 버전 삭제 없음).
            </p>
            <p>· 변경 요약을 비워두면 기본 요약이 자동 생성됩니다.</p>
          </div>

          {/* P5-2 / P6-1: 반복 rollback 경고 (immediate/ping-pong 분기) */}
          {repeatHint.detected && (
            <div
              role="alert"
              className="rounded-lg bg-orange-50 border border-orange-300 p-3 text-[11px] text-orange-900 space-y-2"
            >
              <p className="font-semibold flex items-center gap-1">
                <svg
                  aria-hidden="true"
                  className="w-4 h-4 shrink-0"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                    clipRule="evenodd"
                  />
                </svg>
                {repeatHint.kind === "ping-pong"
                  ? `최근 v${repeatHint.recentVersion} 에서 이미 v${targetVersion} 로 되돌리신 적이 있습니다.`
                  : `직전에 이미 v${targetVersion} 로 되돌리셨습니다 (현재 v${repeatHint.recentVersion}).`}
              </p>
              <p>
                {repeatHint.kind === "ping-pong"
                  ? "버전 간 왕복(핑퐁) 은 감사 로그와 버전 이력을 빠르게 팽창시킵니다."
                  : "같은 버전으로의 반복 롤백은 감사 로그와 버전 이력을 불필요하게 늘립니다."}{" "}
                {repeatHint.via === "metadata"
                  ? "서버 메타데이터"
                  : "변경 요약"}{" "}
                에 근거해 감지되었습니다.
              </p>
              <label className="flex items-center gap-2 cursor-pointer select-none mt-1">
                <input
                  type="checkbox"
                  checked={userAcknowledged}
                  onChange={(e) => setUserAcknowledged(e.target.checked)}
                  className="w-4 h-4 text-orange-600 border-orange-400 rounded focus:ring-2 focus:ring-orange-500"
                  disabled={mutation.isPending}
                />
                <span className="font-semibold">
                  그래도 v{targetVersion} 로 되돌리겠습니다
                </span>
              </label>
            </div>
          )}

          <div>
            <label
              htmlFor="rollback-summary"
              className="block text-xs font-semibold text-gray-700 mb-1"
            >
              변경 요약 (선택)
            </label>
            <input
              id="rollback-summary"
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={`예: v${targetVersion} 로 되돌리기 (승인됨)`}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              maxLength={1024}
              autoComplete="off"
              disabled={mutation.isPending}
            />
          </div>

          {validationError && (
            <ErrorBanner error={new Error(validationError)} />
          )}
          {mutation.isError && <ErrorBanner error={mutation.error} />}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={mutation.isPending}
            className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={
              mutation.isPending ||
              (repeatHint.detected && !userAcknowledged)
            }
            title={
              repeatHint.detected && !userAcknowledged
                ? "반복 롤백 경고를 확인하고 체크박스를 선택해 주세요"
                : undefined
            }
            className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[36px] disabled:bg-amber-300 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? "되돌리는 중…" : `v${targetVersion} 로 되돌리기`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// 버전 이력 섹션 (+ 버전 비교)
// ═════════════════════════════════════════════════════════════

/** P3-D: 한 번에 가져오는 버전 수. 너무 크면 과거 버전이 많은 스키마에서 payload 비대. */
const VERSION_PAGE_SIZE = 10;

function VersionHistorySection({
  docTypeCode,
  schemaId,
  scopeProfileId,
  latestVersion,
  isDeprecated,
}: {
  docTypeCode: string;
  /**
   * P5-3: 동일 doc_type_code 로 하드삭제→재생성된 스키마의 diff 캐시 오염을
   * 방지하기 위해 VersionDiffModal 의 queryKey 에 주입한다.
   */
  schemaId: string;
  /**
   * P3 후속-B: 상세 패널이 드러내는 스키마의 scope_profile_id.
   * 초기 로드와 추가 페이지 모두에 전달해 ACL 필터가 일관되게 작동하도록 한다.
   * null/undefined 이면 서버는 scope 제한 없이 반환(기존 동작).
   */
  scopeProfileId?: string | null;
  /**
   * P4-E: 현재 스키마의 최신 버전. 되돌리기 버튼은 "v{현재} 보다 작은" 과거
   * 버전에서만 활성화된다. 버전 목록이 DESC 순이므로 첫 번째 row 가 곧 current.
   */
  latestVersion: number;
  /**
   * P4-E: 폐기된 스키마는 되돌리기 불가(서버가 422 로 거절). UI 에서도 사전 차단.
   */
  isDeprecated: boolean;
}) {
  // 초기 페이지는 TanStack Query 로 — invalidate 시 자동 재로딩되는 속성 유지.
  // queryKey 에 scopeProfileId 를 포함시켜, 동일 docType 이라도 scope 전환 시 캐시가 분리되도록.
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "admin",
      "extraction-schemas",
      docTypeCode,
      "versions",
      scopeProfileId ?? null,
    ],
    queryFn: () =>
      extractionSchemasApi.getVersions(docTypeCode, {
        limit: VERSION_PAGE_SIZE,
        offset: 0,
        scope_profile_id: scopeProfileId ?? null,
      }),
    retry: false,
  });

  // P3-D: "더 보기" 로 순차 로딩되는 추가 페이지 버퍼.
  const [extraPages, setExtraPages] = useState<ExtractionSchemaVersion[][]>([]);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<unknown>(null);

  // 초기 페이지가 새로 로드되면(또는 invalidate 로 교체되면) 추가 페이지 버퍼를 초기화.
  useEffect(() => {
    setExtraPages([]);
    setLoadMoreError(null);
    setIsFetchingMore(false);
  }, [data]);

  const firstPage: ExtractionSchemaVersion[] = data?.data ?? [];

  // 모든 페이지를 평탄화. 직렬이므로 순서는 DESC (최신 우선) 를 유지.
  const versions: ExtractionSchemaVersion[] = useMemo(
    () => [...firstPage, ...extraPages.flat()],
    [firstPage, extraPages]
  );

  // hasMore: 마지막으로 로드된 페이지가 정확히 PAGE_SIZE 면 더 있을 수 있음 (heuristic).
  const lastPageLen =
    extraPages.length > 0
      ? extraPages[extraPages.length - 1].length
      : firstPage.length;
  const hasMore = lastPageLen === VERSION_PAGE_SIZE;

  const handleLoadMore = async () => {
    if (isFetchingMore || !hasMore) return;
    setIsFetchingMore(true);
    setLoadMoreError(null);
    try {
      const nextOffset = versions.length;
      const res = await extractionSchemasApi.getVersions(docTypeCode, {
        limit: VERSION_PAGE_SIZE,
        offset: nextOffset,
        scope_profile_id: scopeProfileId ?? null,
      });
      const fetched = res.data ?? [];
      setExtraPages((cur) => [...cur, fetched]);
    } catch (e) {
      setLoadMoreError(e);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const [baseVersion, setBaseVersion] = useState<number | null>(null);
  const [targetVersion, setTargetVersion] = useState<number | null>(null);

  // versions 가 달라지면 과거 선택이 더 이상 유효하지 않을 수 있으므로 정리.
  useEffect(() => {
    const versionSet = new Set(versions.map((v) => v.version));
    if (baseVersion !== null && !versionSet.has(baseVersion)) {
      setBaseVersion(null);
    }
    if (targetVersion !== null && !versionSet.has(targetVersion)) {
      setTargetVersion(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versions.map((v) => v.version).join(",")]);

  const diff = useMemo(() => {
    if (baseVersion === null || targetVersion === null) return null;
    if (baseVersion === targetVersion) return null;
    const b = versions.find((v) => v.version === baseVersion);
    const t = versions.find((v) => v.version === targetVersion);
    if (!b || !t) return null;
    return computeFieldsDiff(b.fields, t.fields);
  }, [baseVersion, targetVersion, versions]);

  const clearCompare = () => {
    setBaseVersion(null);
    setTargetVersion(null);
  };

  const toggleBase = (v: number) => {
    setBaseVersion((cur) => (cur === v ? null : v));
  };
  const toggleTarget = (v: number) => {
    setTargetVersion((cur) => (cur === v ? null : v));
  };

  // P4-D: 서버 정본 비교 모달
  const [showServerDiff, setShowServerDiff] = useState(false);
  // P4-E: 되돌리기 확인 모달 (대상 버전 번호 보관, null 이면 닫힘)
  const [rollbackTarget, setRollbackTarget] = useState<number | null>(null);

  const canCompareServer =
    baseVersion !== null &&
    targetVersion !== null &&
    baseVersion !== targetVersion;

  return (
    <section aria-labelledby="version-history-title" className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 id="version-history-title" className="text-sm font-bold text-gray-900">
          버전 이력 ({versions.length}건)
        </h3>
        <div className="flex items-center gap-2">
          {canCompareServer && (
            <button
              type="button"
              onClick={() => setShowServerDiff(true)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg px-2 py-1 min-h-[28px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              aria-label={`서버 정본으로 v${baseVersion} 과 v${targetVersion} 비교`}
              title="서버 정본(API) 결과로 두 버전을 비교합니다. 클라이언트 diff 와 일치하지 않는 경우 서버 결과가 기준입니다."
            >
              서버 정본 비교
            </button>
          )}
          {(baseVersion !== null || targetVersion !== null) && (
            <button
              type="button"
              onClick={clearCompare}
              className="text-[11px] text-gray-600 hover:text-gray-800 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded"
            >
              비교 선택 지우기
            </button>
          )}
        </div>
      </div>

      {isError && <ErrorBanner error={error} />}

      {diff !== null && baseVersion !== null && targetVersion !== null && (
        <DiffView
          diff={diff}
          baseVersion={baseVersion}
          targetVersion={targetVersion}
          onClear={clearCompare}
        />
      )}

      {baseVersion !== null && targetVersion !== null && baseVersion === targetVersion && (
        <p role="status" className="text-[11px] text-gray-500">
          같은 버전을 Base/Target 으로 선택할 수 없습니다.
        </p>
      )}

      {isLoading ? (
        <p className="text-xs text-gray-400">불러오는 중…</p>
      ) : versions.length === 0 && !isError ? (
        <p className="text-xs text-gray-400">기록된 버전이 없습니다.</p>
      ) : (
        <ol className="space-y-2">
          {versions.map((v) => {
            const isBase = baseVersion === v.version;
            const isTarget = targetVersion === v.version;
            const isCurrent = v.version === latestVersion;
            // 되돌리기: 과거 버전에만 허용, 폐기된 스키마는 차단.
            const canRollback = !isCurrent && !isDeprecated && v.version < latestVersion;
            return (
              <li
                key={v.id}
                className={`rounded-lg border p-3 text-xs space-y-1 transition-colors ${
                  isBase
                    ? "border-red-300 bg-red-50/40"
                    : isTarget
                    ? "border-green-300 bg-green-50/40"
                    : "border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-mono font-semibold text-gray-800">
                    v{v.version}
                    {isCurrent && (
                      <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-blue-100 text-blue-800 align-middle">
                        현재
                      </span>
                    )}
                  </span>
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => toggleBase(v.version)}
                      aria-pressed={isBase}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border min-h-[24px] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                        isBase
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-white text-red-700 border-red-200 hover:bg-red-50"
                      }`}
                      title="이 버전을 비교 기준(Base) 으로 지정"
                    >
                      Base
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleTarget(v.version)}
                      aria-pressed={isTarget}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border min-h-[24px] focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 ${
                        isTarget
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-green-700 border-green-200 hover:bg-green-50"
                      }`}
                      title="이 버전을 비교 대상(Target) 으로 지정"
                    >
                      Target
                    </button>
                    {/* P4-E: 되돌리기 — 현재 버전/폐기 스키마에서는 비활성화 */}
                    <button
                      type="button"
                      onClick={() => setRollbackTarget(v.version)}
                      disabled={!canRollback}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border min-h-[24px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                        canRollback
                          ? "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
                          : "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                      }`}
                      title={
                        isCurrent
                          ? "현재 버전은 되돌릴 수 없습니다"
                          : isDeprecated
                          ? "폐기된 스키마는 되돌릴 수 없습니다"
                          : `v${v.version} 로 되돌리기`
                      }
                      aria-label={
                        canRollback
                          ? `v${v.version} 로 되돌리기`
                          : `v${v.version} 되돌리기 비활성화`
                      }
                    >
                      되돌리기
                    </button>
                    <span className="ml-2 text-gray-500">
                      {new Date(v.created_at).toLocaleString("ko")}
                    </span>
                  </div>
                </div>
                {v.change_summary && (
                  <p className="text-gray-700">{v.change_summary}</p>
                )}
                {v.changed_fields.length > 0 && (
                  <p className="text-[10px] text-gray-500">
                    변경된 필드:{" "}
                    {v.changed_fields.map((name) => (
                      <span
                        key={name}
                        className="inline-block mr-1 px-1.5 py-0.5 bg-gray-100 rounded font-mono"
                      >
                        {name}
                      </span>
                    ))}
                  </p>
                )}
                <p className="text-[10px] text-gray-400 font-mono">
                  by {v.created_by}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      {/* P3-D: 더 보기 + 로드 중 상태 + 에러 */}
      {!isLoading && versions.length > 0 && (
        <div className="pt-2 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[10px] text-gray-500" aria-live="polite">
            {versions.length}건 표시 {hasMore ? "(더 있음)" : "(전체 로드됨)"}
          </span>
          {hasMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={isFetchingMore}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg min-h-[32px] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              aria-label={`버전 이력 ${VERSION_PAGE_SIZE}건 더 불러오기`}
            >
              {isFetchingMore ? "불러오는 중…" : `더 보기 (+${VERSION_PAGE_SIZE})`}
            </button>
          )}
        </div>
      )}
      {loadMoreError !== null && <ErrorBanner error={loadMoreError} />}

      {/* P4-D: 서버 정본 diff 모달 (P5-1: clientDiff 전달, P5-3: schema_id 전달) */}
      {showServerDiff && baseVersion !== null && targetVersion !== null && (
        <VersionDiffModal
          docTypeCode={docTypeCode}
          schemaId={schemaId}
          baseVersion={baseVersion}
          targetVersion={targetVersion}
          scopeProfileId={scopeProfileId}
          clientDiff={diff}
          onClose={() => setShowServerDiff(false)}
        />
      )}

      {/* P4-E: 되돌리기 확인 모달 (P5-2: recentVersions 전달) */}
      {rollbackTarget !== null && (
        <RollbackDialog
          docTypeCode={docTypeCode}
          currentVersion={latestVersion}
          targetVersion={rollbackTarget}
          scopeProfileId={scopeProfileId}
          recentVersions={versions}
          onClose={() => setRollbackTarget(null)}
        />
      )}
    </section>
  );
}

// ═════════════════════════════════════════════════════════════
// 스키마 상세 패널 (편집·폐기·삭제 + 버전 이력)
// ═════════════════════════════════════════════════════════════

type ConfirmKind = "deprecate" | "delete" | null;

function SchemaDetailPanel({
  schema,
  onClose,
}: {
  schema: ExtractionSchema;
  onClose: () => void;
}) {
  const { data, isError, error } = useQuery({
    queryKey: ["admin", "extraction-schemas", schema.doc_type_code],
    queryFn: () => extractionSchemasApi.get(schema.doc_type_code),
    retry: false,
  });

  const latest: ExtractionSchema = data?.data ?? schema;

  const [editMode, setEditMode] = useState(false);
  const [editedFields, setEditedFields] = useState<
    Record<string, ExtractionSchemaField>
  >(() => latest.fields ?? {});
  const [changeSummary, setChangeSummary] = useState("");
  const [deprecationReason, setDeprecationReason] = useState("");
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, true);

  useEffect(() => {
    // 서버에서 최신 데이터를 받으면 편집 중이 아닐 때만 초기화.
    if (!editMode) {
      setEditedFields(latest.fields ?? {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest.updated_at, latest.version]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && confirmKind === null) onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, confirmKind]);

  const updateMutation = useMutationWithToast({
    mutationFn: (payload: Parameters<typeof extractionSchemasApi.update>[1]) =>
      extractionSchemasApi.update(latest.doc_type_code, payload),
    successMessage: "추출 스키마를 업데이트했습니다.",
    errorMessage: "추출 스키마 업데이트에 실패했습니다.",
    invalidateKeys: [
      ["admin", "extraction-schemas"],
      ["admin", "extraction-schemas", latest.doc_type_code],
      ["admin", "extraction-schemas", latest.doc_type_code, "versions"],
    ],
    onSuccess: () => {
      setEditMode(false);
      setChangeSummary("");
      setValidationError(null);
    },
  });

  const deprecateMutation = useMutationWithToast({
    mutationFn: (reason: string) =>
      extractionSchemasApi.deprecate(latest.doc_type_code, reason),
    successMessage: "추출 스키마를 폐기 처리했습니다.",
    errorMessage: "폐기 처리에 실패했습니다.",
    invalidateKeys: [
      ["admin", "extraction-schemas"],
      ["admin", "extraction-schemas", latest.doc_type_code],
    ],
    onSuccess: () => {
      setDeprecationReason("");
      setConfirmKind(null);
    },
  });

  const deleteMutation = useMutationWithToast({
    mutationFn: () => extractionSchemasApi.delete(latest.doc_type_code),
    successMessage: "추출 스키마를 삭제했습니다.",
    errorMessage: "추출 스키마 삭제에 실패했습니다.",
    invalidateKeys: [["admin", "extraction-schemas"]],
    onSuccess: () => {
      setConfirmKind(null);
      onClose();
    },
  });

  const fieldsMap: Record<string, ExtractionSchemaField> = latest.fields ?? {};
  const fields: ExtractionSchemaField[] = useMemo(
    () => Object.values(fieldsMap),
    [fieldsMap]
  );

  const submitEdit = () => {
    setValidationError(null);
    const result = validateFieldsObject(editedFields);
    if (!result.ok) {
      setValidationError(result.error);
      return;
    }
    updateMutation.mutate({
      fields: editedFields,
      change_summary: changeSummary.trim() || null,
    });
  };

  const startEdit = () => {
    setEditedFields(latest.fields ?? {});
    setChangeSummary("");
    setValidationError(null);
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setValidationError(null);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="bg-white w-full max-w-2xl h-full overflow-y-auto shadow-xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schema-detail-title"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 id="schema-detail-title" className="text-base font-bold text-gray-900">
              {latest.doc_type_code}
            </h2>
            <p className="text-xs text-gray-500">
              v{latest.version}
              {latest.is_deprecated && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">
                  폐기됨
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300"
            aria-label="닫기"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {isError && <ErrorBanner error={error} />}

          {latest.is_deprecated && latest.deprecation_reason && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs font-semibold text-amber-800 mb-0.5">폐기 사유</p>
              <p className="text-xs text-amber-700">{latest.deprecation_reason}</p>
            </div>
          )}

          {/* 메타 정보 */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <dt className="text-gray-500">버전</dt>
              <dd className="font-semibold text-gray-900">v{latest.version}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Scope Profile</dt>
              <dd className="font-mono text-[10px] text-gray-700 break-all">
                {latest.scope_profile_id ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">생성자</dt>
              <dd className="font-mono text-gray-700">{latest.created_by}</dd>
            </div>
            <div>
              <dt className="text-gray-500">마지막 수정자</dt>
              <dd className="font-mono text-gray-700">{latest.updated_by}</dd>
            </div>
            <div>
              <dt className="text-gray-500">생성일</dt>
              <dd className="text-gray-700">
                {new Date(latest.created_at).toLocaleString("ko")}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">수정일</dt>
              <dd className="text-gray-700">
                {new Date(latest.updated_at).toLocaleString("ko")}
              </dd>
            </div>
          </dl>

          {/* 필드 영역 — 조회/편집 전환 */}
          <section aria-labelledby="schema-fields-title">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 id="schema-fields-title" className="text-sm font-bold text-gray-900">
                스키마 필드 ({fields.length}개)
              </h3>
              <div className="flex items-center gap-2">
                {!editMode ? (
                  <button
                    type="button"
                    onClick={startEdit}
                    disabled={latest.is_deprecated}
                    className="text-xs font-semibold text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg min-h-[32px] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:text-gray-400 disabled:bg-gray-50 disabled:border-gray-200 disabled:cursor-not-allowed"
                    title={latest.is_deprecated ? "폐기된 스키마는 수정할 수 없습니다" : undefined}
                  >
                    편집
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-xs font-semibold text-gray-700 border border-gray-300 hover:bg-gray-50 px-3 py-1.5 rounded-lg min-h-[32px] focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      onClick={submitEdit}
                      disabled={updateMutation.isPending}
                      className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg min-h-[32px] focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                      {updateMutation.isPending ? "저장 중…" : "저장"}
                    </button>
                  </>
                )}
              </div>
            </div>

            {editMode ? (
              <div className="space-y-3">
                <div>
                  <label htmlFor="edit-change-summary" className="block text-xs font-semibold text-gray-700 mb-1">
                    변경 요약 (선택)
                  </label>
                  <input
                    id="edit-change-summary"
                    type="text"
                    value={changeSummary}
                    onChange={(e) => setChangeSummary(e.target.value)}
                    placeholder="예: party_b 필드 추가"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={1024}
                    autoComplete="off"
                  />
                </div>
                <div>
                  <label id="edit-fields-label" className="block text-xs font-semibold text-gray-700 mb-1">
                    필드 정의 <span className="text-red-600">*</span>
                  </label>
                  <div role="group" aria-labelledby="edit-fields-label">
                    <FieldsEditor
                      fields={editedFields}
                      onChange={setEditedFields}
                    />
                  </div>
                </div>
                {validationError && <ErrorBanner error={new Error(validationError)} />}
                {updateMutation.isError && <ErrorBanner error={updateMutation.error} />}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500">필드명</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500">타입</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500">필수</th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500">설명</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fields.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-xs text-gray-400">
                          정의된 필드가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      fields.map((f) => (
                        <tr key={f.field_name} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-900 font-mono text-xs">
                            {f.field_name}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 font-mono">
                              {f.field_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {f.required ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700">
                                필수
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">선택</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            {f.description || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 버전 이력 */}
          <VersionHistorySection
            docTypeCode={latest.doc_type_code}
            schemaId={latest.id}
            scopeProfileId={latest.scope_profile_id}
            latestVersion={latest.version}
            isDeprecated={latest.is_deprecated}
          />

          {/* 위험 구역 — 폐기/삭제 */}
          {!editMode && (
            <section
              aria-labelledby="danger-zone-title"
              className="rounded-xl border border-red-200 bg-red-50/40 p-4 space-y-3"
            >
              <h3 id="danger-zone-title" className="text-sm font-bold text-red-800">
                위험 구역
              </h3>
              <p className="text-xs text-red-700">
                폐기는 스키마를 읽기 전용으로 전환합니다. 삭제는 소프트 삭제로 목록에서 숨깁니다 (감사 기록은 유지).
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmKind("deprecate")}
                  disabled={latest.is_deprecated}
                  className="text-xs font-semibold text-amber-800 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg min-h-[32px] focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:text-gray-400 disabled:bg-gray-50 disabled:border-gray-200 disabled:cursor-not-allowed"
                >
                  폐기 표시
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmKind("delete")}
                  className="text-xs font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg min-h-[32px] focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  삭제
                </button>
              </div>
            </section>
          )}
        </div>

        {/* 폐기 사유 모달 */}
        {confirmKind === "deprecate" && (
          <DeprecateDialog
            docTypeCode={latest.doc_type_code}
            reason={deprecationReason}
            onReasonChange={setDeprecationReason}
            onCancel={() => {
              setConfirmKind(null);
              setDeprecationReason("");
            }}
            onConfirm={(reason) => deprecateMutation.mutate(reason)}
            isPending={deprecateMutation.isPending}
            error={deprecateMutation.isError ? deprecateMutation.error : null}
          />
        )}

        {/* 삭제 확인 다이얼로그 */}
        <ConfirmDialog
          open={confirmKind === "delete"}
          title={`${latest.doc_type_code} 스키마를 삭제할까요?`}
          description="소프트 삭제이며 감사 기록은 보존됩니다. 동일 doc_type_code 로 새로 생성할 수 있습니다."
          confirmLabel={deleteMutation.isPending ? "삭제 중…" : "삭제"}
          destructive
          onCancel={() => setConfirmKind(null)}
          onConfirm={() => deleteMutation.mutate()}
        />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// 폐기 사유 입력 다이얼로그
// ═════════════════════════════════════════════════════════════

function DeprecateDialog({
  docTypeCode,
  reason,
  onReasonChange,
  onCancel,
  onConfirm,
  isPending,
  error,
}: {
  docTypeCode: string;
  reason: string;
  onReasonChange: (v: string) => void;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
  error: unknown;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="deprecate-dialog-title"
        className="bg-white w-full max-w-md rounded-xl shadow-xl border border-gray-200 p-6"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <h2 id="deprecate-dialog-title" className="text-base font-semibold text-gray-900 mb-2">
          {docTypeCode} 를 폐기 처리합니다
        </h2>
        <p className="text-xs text-gray-600 mb-4">
          폐기된 스키마는 목록에서 "폐기됨" 으로 표시되며 더 이상 편집할 수 없습니다.
        </p>

        <label htmlFor="deprecate-reason" className="block text-xs font-semibold text-gray-700 mb-1">
          폐기 사유 <span className="text-red-600">*</span>
        </label>
        <textarea
          id="deprecate-reason"
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          className="w-full h-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          placeholder="예: 2026-05 계약 양식 변경으로 사용 중단"
          maxLength={1024}
        />

        {error ? (
          <div className="mt-3">
            <ErrorBanner error={error} />
          </div>
        ) : null}

        <div className="flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={isPending || reason.trim().length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:bg-amber-300 disabled:cursor-not-allowed"
          >
            {isPending ? "처리 중…" : "폐기 처리"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// 페이지 루트
// ═════════════════════════════════════════════════════════════

export function AdminExtractionSchemasPage() {
  const [selected, setSelected] = useState<ExtractionSchema | null>(null);
  const [creating, setCreating] = useState(false);
  const [includeDeprecated, setIncludeDeprecated] = useState(false);

  const { data, isError, error, isLoading } = useQuery({
    queryKey: ["admin", "extraction-schemas", { includeDeprecated }],
    queryFn: () =>
      extractionSchemasApi.list({
        ...(includeDeprecated ? {} : { is_deprecated: false }),
      }),
    retry: false,
  });

  const schemas: ExtractionSchema[] = data?.data ?? [];

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl">
      {selected && (
        <SchemaDetailPanel
          schema={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {creating && <CreateSchemaModal onClose={() => setCreating(false)} />}

      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          추출 스키마 관리
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="inline-flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={includeDeprecated}
              onChange={(e) => setIncludeDeprecated(e.target.checked)}
            />
            폐기된 스키마 포함
          </label>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg min-h-[36px] focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            + 새 스키마
          </button>
        </div>
      </div>

      {isError && <ErrorBanner error={error} />}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  DocumentType
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  버전
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  정의된 필드
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  상태
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  최종 수정일
                </th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-xs text-gray-400">
                    불러오는 중…
                  </td>
                </tr>
              ) : schemas.length === 0 && !isError ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-xs text-gray-400">
                    등록된 추출 스키마가 없습니다.{" "}
                    <button
                      type="button"
                      onClick={() => setCreating(true)}
                      className="underline text-blue-600 hover:text-blue-700"
                    >
                      새 스키마를 만들어보세요
                    </button>
                  </td>
                </tr>
              ) : (
                schemas.map((s) => {
                  const fieldsCount = Object.keys(s.fields ?? {}).length;
                  return (
                    <tr
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${s.doc_type_code} 스키마 상세`}
                      className="hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus-visible:bg-blue-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                      onClick={() => setSelected(s)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(s);
                        }
                      }}
                    >
                      <td className="px-4 py-3 font-semibold text-gray-900 font-mono">
                        {s.doc_type_code}
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-mono text-xs">
                        v{s.version}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {fieldsCount}개
                      </td>
                      <td className="px-4 py-3">
                        {s.is_deprecated ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
                            폐기됨
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">
                            활성
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(s.updated_at).toLocaleDateString("ko")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(s);
                          }}
                          className="text-xs font-semibold text-blue-700 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 min-h-[36px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          상세 보기
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
