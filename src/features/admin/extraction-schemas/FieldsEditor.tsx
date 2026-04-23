"use client";

/**
 * FieldsEditor — 추출 스키마 필드 딕셔너리의 GUI 편집기 (P2-A / P3-A).
 *
 * fields: Record<string, ExtractionSchemaField> 를 폼/JSON 두 모드로 편집.
 * - 폼 모드: 필드별로 collapsible 카드, 타입별 옵션 위젯(pattern, enum_values,
 *   min/max_value, max_length, date_format, instruction, examples, default_value)
 * - JSON 모드: textarea — 고급 자유 편집. 최상위(root)에서만 노출됨(P3-A).
 *
 * P3-A: object 타입 필드의 nested_schema 재귀 편집 지원.
 * - FieldsEditor 자체가 자기 자신을 재귀적으로 호출한다.
 * - depth 는 "현재 편집 중인 레벨" (root=0, nested_schema 안쪽은 +1).
 * - maxDepth(default 3, backend MAX_NESTED_DEPTH 와 일치) 이상에서는
 *   object 필드를 더 중첩시킬 수 없다는 안내만 표시.
 *
 * CLAUDE.md S1 ① 원칙: DocumentType 하드코딩 금지.
 * → 이 컴포넌트는 field_type 만 인지하고, 특정 doc_type 에 대해 분기하지 않는다.
 */

import {
  useEffect,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type ReactNode,
} from "react";
import type {
  ExtractionSchemaField,
  ExtractionFieldType,
} from "@/types/s2admin";

// ───────────────────────────────────────────────────────────
// 공용 유틸
// ───────────────────────────────────────────────────────────

const FIELD_TYPES: ExtractionFieldType[] = [
  "string",
  "number",
  "date",
  "boolean",
  "array",
  "object",
  "enum",
];

const SNAKE_CASE_RE = /^[a-z][a-z0-9_]*$/;

/** backend app/schemas/extraction.py MAX_NESTED_DEPTH 와 동일 (중첩 최대 3단). */
const DEFAULT_MAX_NESTED_DEPTH = 3;

/** JSON.parse 를 시도하되 실패하면 원본 문자열을 반환. */
function tryParseJson(raw: string): unknown {
  const t = raw.trim();
  if (t === "") return undefined;
  try {
    return JSON.parse(t);
  } catch {
    return raw;
  }
}

/** unknown → 입력창 표시용 문자열 (undefined 면 빈 문자열). */
function toInputString(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

// ───────────────────────────────────────────────────────────
// TagsInput — 쉼표/엔터로 태그 추가, 태그별 제거 버튼
// ───────────────────────────────────────────────────────────

function TagsInput({
  id,
  tags,
  onChange,
  placeholder,
  ariaLabel,
}: {
  id: string;
  tags: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState("");

  const addTag = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return;
    if (tags.includes(cleaned)) return;
    onChange([...tags, cleaned]);
  };

  const removeTag = (t: string) => {
    onChange(tags.filter((x) => x !== t));
  };

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-300 px-2 py-1.5 focus-within:ring-2 focus-within:ring-blue-500">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-100 text-[11px] font-mono"
        >
          {t}
          <button
            type="button"
            onClick={() => removeTag(t)}
            className="text-gray-500 hover:text-red-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-400 rounded"
            aria-label={`${t} 제거`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            if (draft.trim()) {
              addTag(draft);
              setDraft("");
            }
          } else if (
            e.key === "Backspace" &&
            draft === "" &&
            tags.length > 0
          ) {
            e.preventDefault();
            removeTag(tags[tags.length - 1]);
          }
        }}
        onBlur={() => {
          if (draft.trim()) {
            addTag(draft);
            setDraft("");
          }
        }}
        placeholder={placeholder ?? "Enter 로 추가"}
        aria-label={ariaLabel}
        className="flex-1 min-w-[80px] text-xs bg-transparent focus:outline-none"
        autoComplete="off"
      />
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// DefaultValueWidget — field_type 에 따라 다른 입력 위젯 (P3-B)
// ───────────────────────────────────────────────────────────

/**
 * default_value 입력 위젯. field_type 에 따라:
 *  - string/array/object: 자유 텍스트 (array/object 는 JSON 리터럴)
 *  - number: number input (빈값 → undefined)
 *  - boolean: checkbox (undefined → "unset" 상태도 표현)
 *  - date:  date input (YYYY-MM-DD)
 *  - enum:  enum_values 에서 선택하는 select
 *
 * default_value 가 현재 field_type 과 호환되지 않으면(예: boolean 타입인데
 * 값이 숫자) 경고를 표시하고, 사용자가 다시 입력하도록 비워 둔 상태로 렌더.
 */
function DefaultValueWidget({
  id,
  field,
  onChange,
}: {
  id: string;
  field: ExtractionSchemaField;
  onChange: (next: unknown) => void;
}) {
  const value = field.default_value;
  const ft = field.field_type;

  // 호환성 감지
  const mismatch = (() => {
    if (value === undefined || value === null) return null;
    switch (ft) {
      case "string":
        return typeof value === "string" ? null : "string 타입과 호환되지 않음";
      case "number":
        return typeof value === "number" ? null : "number 타입과 호환되지 않음";
      case "boolean":
        return typeof value === "boolean" ? null : "boolean 타입과 호환되지 않음";
      case "date":
        return typeof value === "string" ? null : "date 타입은 문자열(YYYY-MM-DD)이어야 함";
      case "enum":
        return typeof value === "string" ? null : "enum 타입과 호환되지 않음";
      case "array":
        return Array.isArray(value) ? null : "array 타입과 호환되지 않음";
      case "object":
        return value !== null && typeof value === "object" && !Array.isArray(value)
          ? null
          : "object 타입과 호환되지 않음";
      default:
        return null;
    }
  })();

  const commonCls =
    "w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono";

  let input: ReactNode;
  switch (ft) {
    case "number": {
      const numStr =
        typeof value === "number" && Number.isFinite(value) ? String(value) : "";
      input = (
        <input
          id={id}
          type="number"
          value={numStr}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(undefined);
            } else {
              const n = Number(raw);
              if (Number.isFinite(n)) onChange(n);
            }
          }}
          className={commonCls}
          autoComplete="off"
          placeholder="선택"
        />
      );
      break;
    }
    case "boolean": {
      const state: "unset" | "true" | "false" =
        value === true ? "true" : value === false ? "false" : "unset";
      input = (
        <select
          id={id}
          value={state}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "true") onChange(true);
            else if (v === "false") onChange(false);
            else onChange(undefined);
          }}
          className={`${commonCls} bg-white`}
        >
          <option value="unset">(기본값 없음)</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
      break;
    }
    case "date": {
      const dateStr = typeof value === "string" ? value : "";
      input = (
        <input
          id={id}
          type="date"
          value={dateStr}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === "" ? undefined : raw);
          }}
          className={commonCls}
          autoComplete="off"
        />
      );
      break;
    }
    case "enum": {
      const options = field.enum_values ?? [];
      const str = typeof value === "string" ? value : "";
      input = (
        <select
          id={id}
          value={str}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === "" ? undefined : raw);
          }}
          className={`${commonCls} bg-white`}
          disabled={options.length === 0}
        >
          <option value="">(기본값 없음)</option>
          {options.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );
      if (options.length === 0) {
        return (
          <div>
            {input}
            <p className="text-[10px] text-gray-500 mt-0.5">
              enum_values 를 먼저 추가해야 기본값을 선택할 수 있습니다.
            </p>
          </div>
        );
      }
      break;
    }
    case "string": {
      const str = typeof value === "string" ? value : "";
      input = (
        <input
          id={id}
          type="text"
          value={str}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === "" ? undefined : raw);
          }}
          className={commonCls}
          autoComplete="off"
          placeholder='예: "N/A"'
        />
      );
      break;
    }
    // array/object 는 JSON 리터럴 입력 유지 (복잡한 구조를 타입-awar e 위젯으로 표현하기엔 비용 대비 이득 낮음).
    case "array":
    case "object":
    default: {
      input = (
        <input
          id={id}
          type="text"
          value={toInputString(value)}
          onChange={(e) => {
            const raw = e.target.value;
            if (raw === "") {
              onChange(undefined);
            } else {
              onChange(tryParseJson(raw));
            }
          }}
          className={commonCls}
          autoComplete="off"
          placeholder={ft === "array" ? '예: ["a","b"]' : '예: {"k":1}'}
        />
      );
      break;
    }
  }

  return (
    <div>
      {input}
      {mismatch && (
        <p className="text-[10px] text-amber-700 mt-0.5">
          ⚠ 현재 값이 {mismatch}. 새 값을 입력해 덮어쓰세요.
        </p>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// FieldRowEditor — 필드 한 개의 편집 UI (접이식)
// ───────────────────────────────────────────────────────────

function FieldRowEditor({
  fieldKey,
  field,
  isDuplicateName,
  isInvalidName,
  expanded,
  depth,
  maxDepth,
  canMoveUp,
  canMoveDown,
  isDragging,
  isDragOver,
  onToggle,
  onRename,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  fieldKey: string;
  field: ExtractionSchemaField;
  isDuplicateName: boolean;
  isInvalidName: boolean;
  expanded: boolean;
  /** 현재 FieldRow 가 속한 편집기의 depth (root=0). P3-A */
  depth: number;
  /** 중첩 허용 최대 depth (backend MAX_NESTED_DEPTH 와 일치). P3-A */
  maxDepth: number;
  /** 같은 레벨에서 위로 이동 가능한가 (idx > 0). P3 후속-C */
  canMoveUp: boolean;
  /** 같은 레벨에서 아래로 이동 가능한가 (idx < len-1). P3 후속-C */
  canMoveDown: boolean;
  /** 이 row 가 현재 drag 중인가. 시각 피드백용. P3 후속-C */
  isDragging: boolean;
  /** 이 row 위로 다른 row 가 올려져 있는가. P3 후속-C */
  isDragOver: boolean;
  onToggle: () => void;
  onRename: (nextName: string) => void;
  onUpdate: (next: ExtractionSchemaField) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDragStart: (e: ReactDragEvent<HTMLElement>) => void;
  onDragOver: (e: ReactDragEvent<HTMLLIElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: ReactDragEvent<HTMLLIElement>) => void;
  onDragEnd: () => void;
}) {
  const setProp = <K extends keyof ExtractionSchemaField>(
    k: K,
    v: ExtractionSchemaField[K]
  ) => onUpdate({ ...field, [k]: v });

  const onTypeChange = (next: ExtractionFieldType) => {
    // 타입 전환 시 해당 타입에 허용되지 않는 속성 자동 정리 (ExtractionFieldDef validator 와 일치).
    const base: ExtractionSchemaField = { ...field, field_type: next };
    if (next !== "string") {
      delete base.pattern;
      delete base.max_length;
    }
    // min/max_value 는 number 타입에서만 유효.
    if (next !== "number") {
      delete base.min_value;
      delete base.max_value;
    }
    if (next !== "date") delete base.date_format;
    if (next !== "enum") delete base.enum_values;
    if (next !== "object") {
      delete base.nested_schema;
    } else {
      // object 타입은 nested_schema 가 필수(서버 validator). 비어있으면 빈 객체로 초기화.
      // P3-A: UI 가 재귀 편집기를 렌더할 수 있도록 항상 Record 형태를 유지.
      if (!base.nested_schema) {
        base.nested_schema = {};
      }
    }
    onUpdate(base);
  };

  /** 중첩을 더 허용해도 되는지 (이 필드의 nested_schema 가 depth+1 에 위치). */
  const canNestDeeper = depth < maxDepth;

  const idPrefix = `field-${fieldKey}`;

  const nameError =
    isDuplicateName
      ? "동일 이름의 필드가 이미 존재합니다."
      : isInvalidName
      ? "snake_case (소문자/숫자/언더스코어) 로 입력하세요."
      : null;

  return (
    <li
      // <li> 는 drop TARGET 역할만 수행. 드래그 시작은 아래 drag handle 에서만 가능하게 하여
      // 확장 상태에서 <input>/<textarea> 의 텍스트 선택이 방해받지 않도록 한다.
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`rounded-lg border transition-colors ${
        nameError ? "border-red-300" : "border-gray-200"
      } bg-white ${
        isDragging ? "opacity-50" : ""
      } ${
        isDragOver ? "ring-2 ring-blue-400 ring-offset-1" : ""
      }`}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-3 py-2">
        {/* 드래그 핸들 — 유일한 drag source. <li> 전체를 draggable 로 두면
            확장된 행의 <input> 에서 텍스트 선택이 드래그로 오인됨. */}
        <span
          role="button"
          aria-label={`필드 ${field.field_name || fieldKey} 드래그하여 순서 변경`}
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          title="드래그하여 순서 변경"
          className="shrink-0 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-700 select-none px-1 text-sm leading-none"
        >
          ⋮⋮
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={`${idPrefix}-body`}
          className="flex-1 flex items-center gap-2 text-left min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded"
        >
          <span
            aria-hidden="true"
            className={`text-gray-500 text-[10px] transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          >
            ▶
          </span>
          <span className="font-mono font-semibold text-gray-900 text-xs truncate">
            {field.field_name || "(이름 없음)"}
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-700 font-mono">
            {field.field_type}
          </span>
          {field.required && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
              필수
            </span>
          )}
          {nameError && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
              ⚠ 오류
            </span>
          )}
        </button>
        {/* 키보드 접근성용 이동 버튼 (드래그를 쓸 수 없는 환경용). */}
        <div className="flex items-center">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            aria-label={`필드 ${field.field_name || fieldKey} 을(를) 위로 이동`}
            title="위로 이동"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="p-1.5 rounded-lg text-gray-500 hover:text-blue-700 hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed"
            aria-label={`필드 ${field.field_name || fieldKey} 을(를) 아래로 이동`}
            title="아래로 이동"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg text-gray-500 hover:text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          aria-label={`필드 ${field.field_name || fieldKey} 삭제`}
          title="필드 삭제"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M11 7V4a1 1 0 011-1h0a1 1 0 011 1v3" />
          </svg>
        </button>
      </div>

      {/* 본문 */}
      {expanded && (
        <div id={`${idPrefix}-body`} className="border-t border-gray-200 px-3 py-3 space-y-3">
          {/* 필드명 */}
          <div>
            <label htmlFor={`${idPrefix}-name`} className="block text-[11px] font-semibold text-gray-700 mb-1">
              필드명 (snake_case) <span className="text-red-600">*</span>
            </label>
            <input
              id={`${idPrefix}-name`}
              type="text"
              value={field.field_name}
              onChange={(e) => onRename(e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              autoComplete="off"
              aria-invalid={nameError !== null}
              aria-describedby={nameError ? `${idPrefix}-name-err` : undefined}
            />
            {nameError && (
              <p id={`${idPrefix}-name-err`} className="text-[10px] text-red-700 mt-0.5">
                {nameError}
              </p>
            )}
          </div>

          {/* 타입 + 필수 */}
          <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
            <div>
              <label htmlFor={`${idPrefix}-type`} className="block text-[11px] font-semibold text-gray-700 mb-1">
                타입
              </label>
              <select
                id={`${idPrefix}-type`}
                value={field.field_type}
                onChange={(e) => onTypeChange(e.target.value as ExtractionFieldType)}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono bg-white"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-gray-700 pb-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={field.required}
                onChange={(e) => setProp("required", e.target.checked)}
              />
              필수
            </label>
          </div>

          {/* 설명 */}
          <div>
            <label htmlFor={`${idPrefix}-desc`} className="block text-[11px] font-semibold text-gray-700 mb-1">
              설명 <span className="text-red-600">*</span>
            </label>
            <input
              id={`${idPrefix}-desc`}
              type="text"
              value={field.description}
              onChange={(e) => setProp("description", e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="off"
              maxLength={1024}
              placeholder="이 필드가 무엇을 뜻하는지 한 줄 설명"
            />
          </div>

          {/* ── 타입별 옵션 ── */}

          {field.field_type === "string" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${idPrefix}-pattern`} className="block text-[11px] font-semibold text-gray-700 mb-1">
                  정규식 (pattern)
                </label>
                <input
                  id={`${idPrefix}-pattern`}
                  type="text"
                  value={field.pattern ?? ""}
                  onChange={(e) =>
                    setProp("pattern", e.target.value ? e.target.value : undefined)
                  }
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  autoComplete="off"
                  placeholder="예: ^[A-Z]{2}\\d{4}$"
                />
              </div>
              <div>
                <label htmlFor={`${idPrefix}-max-len`} className="block text-[11px] font-semibold text-gray-700 mb-1">
                  최대 길이 (max_length)
                </label>
                <input
                  id={`${idPrefix}-max-len`}
                  type="number"
                  min={1}
                  max={65536}
                  value={field.max_length ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setProp("max_length", v === "" ? undefined : Number(v));
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="선택"
                />
              </div>
            </div>
          )}

          {field.field_type === "number" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${idPrefix}-min`} className="block text-[11px] font-semibold text-gray-700 mb-1">
                  최소값 (min_value)
                </label>
                <input
                  id={`${idPrefix}-min`}
                  type="number"
                  value={field.min_value ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setProp("min_value", v === "" ? undefined : Number(v));
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="선택"
                />
              </div>
              <div>
                <label htmlFor={`${idPrefix}-max`} className="block text-[11px] font-semibold text-gray-700 mb-1">
                  최대값 (max_value)
                </label>
                <input
                  id={`${idPrefix}-max`}
                  type="number"
                  value={field.max_value ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setProp("max_value", v === "" ? undefined : Number(v));
                  }}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  placeholder="선택"
                />
              </div>
            </div>
          )}

          {field.field_type === "date" && (
            <div>
              <label htmlFor={`${idPrefix}-date-fmt`} className="block text-[11px] font-semibold text-gray-700 mb-1">
                날짜 형식 (date_format)
              </label>
              <input
                id={`${idPrefix}-date-fmt`}
                type="text"
                value={field.date_format ?? ""}
                onChange={(e) =>
                  setProp("date_format", e.target.value || undefined)
                }
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                autoComplete="off"
                placeholder="예: YYYY-MM-DD (기본)"
              />
            </div>
          )}

          {field.field_type === "enum" && (
            <div>
              <label htmlFor={`${idPrefix}-enum`} className="block text-[11px] font-semibold text-gray-700 mb-1">
                허용 값 (enum_values) <span className="text-red-600">*</span>
              </label>
              <TagsInput
                id={`${idPrefix}-enum`}
                tags={field.enum_values ?? []}
                onChange={(next) =>
                  setProp("enum_values", next.length > 0 ? next : undefined)
                }
                placeholder="값을 입력 후 Enter"
                ariaLabel="enum 허용 값 태그"
              />
            </div>
          )}

          {field.field_type === "object" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-semibold text-gray-700">
                  중첩 스키마 (nested_schema){" "}
                  <span className="text-red-600">*</span>
                </label>
                <span className="text-[10px] text-gray-500 font-mono">
                  depth {depth + 1} / {maxDepth}
                </span>
              </div>

              {canNestDeeper ? (
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3">
                  <FieldsEditor
                    fields={field.nested_schema ?? {}}
                    onChange={(next) => setProp("nested_schema", next)}
                    depth={depth + 1}
                    maxDepth={maxDepth}
                  />
                </div>
              ) : (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-[11px] text-amber-900">
                  중첩 허용 최대 깊이({maxDepth}) 도달. 이 위치의 object 필드는
                  새로운 하위 필드를 추가할 수 없습니다.
                  하위 구조가 꼭 필요하다면 상위 레벨에서 필드 구조를 재설계하세요.
                </div>
              )}

              {field.nested_schema &&
                Object.keys(field.nested_schema).length === 0 && (
                  <p className="text-[10px] text-red-700">
                    object 타입은 최소 1개 이상의 하위 필드가 필요합니다.
                  </p>
                )}
            </div>
          )}

          {field.field_type === "array" && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-[11px] text-gray-700">
              array 타입은 기본적으로 항목 타입 제약이 없습니다. 엄격한 요소 검증은
              현재 폼에서 지원하지 않으며, 필요 시 JSON 모드로 전환하세요.
            </div>
          )}

          {/* 공통 부가 옵션 */}

          <div>
            <label htmlFor={`${idPrefix}-instr`} className="block text-[11px] font-semibold text-gray-700 mb-1">
              AI 지시문 (instruction)
            </label>
            <textarea
              id={`${idPrefix}-instr`}
              value={field.instruction ?? ""}
              onChange={(e) =>
                setProp("instruction", e.target.value || undefined)
              }
              rows={2}
              maxLength={2048}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="LLM 에게 추출 방법을 지시하는 자연어 문장 (선택)"
            />
          </div>

          <div>
            <label htmlFor={`${idPrefix}-examples`} className="block text-[11px] font-semibold text-gray-700 mb-1">
              예시 (examples)
            </label>
            <TagsInput
              id={`${idPrefix}-examples`}
              tags={field.examples ?? []}
              onChange={(next) => setProp("examples", next)}
              placeholder="예시를 입력 후 Enter"
              ariaLabel="예시 값 태그"
            />
          </div>

          <div>
            <label htmlFor={`${idPrefix}-default`} className="block text-[11px] font-semibold text-gray-700 mb-1">
              기본값 (default_value)
            </label>
            <DefaultValueWidget
              id={`${idPrefix}-default`}
              field={field}
              onChange={(next) =>
                setProp(
                  "default_value",
                  next as ExtractionSchemaField["default_value"]
                )
              }
            />
          </div>
        </div>
      )}
    </li>
  );
}

// ───────────────────────────────────────────────────────────
// FieldsEditor — 본체
// ───────────────────────────────────────────────────────────

export interface FieldsEditorHandle {
  /** 현재 JSON 모드라면 parse 결과를 상위에 반영하고, 성공 여부 반환. */
  commit: () => boolean;
}

export interface FieldsEditorProps {
  fields: Record<string, ExtractionSchemaField>;
  onChange: (next: Record<string, ExtractionSchemaField>) => void;
  /** 현재 편집기의 중첩 깊이. root=0. P3-A. */
  depth?: number;
  /** 허용 최대 깊이 (backend MAX_NESTED_DEPTH 와 일치해야 함). P3-A. */
  maxDepth?: number;
}

export default function FieldsEditor({
  fields,
  onChange,
  depth = 0,
  maxDepth = DEFAULT_MAX_NESTED_DEPTH,
}: FieldsEditorProps) {
  // JSON 모드는 root 편집기에서만 토글 가능. 중첩 편집기는 항상 form 모드.
  const isRoot = depth === 0;
  const [mode, setMode] = useState<"form" | "json">("form");
  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(fields, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  // P3 후속-C: drag-and-drop 재배치.
  //   instanceId 는 같은 편집기 인스턴스 내에서만 drop 을 허용하기 위한 스코프 식별자.
  //   중첩 편집기는 별도의 FieldsEditor 인스턴스이므로 자동으로 분리된다.
  const instanceIdRef = useRef<string>(
    `fields-editor-${depth}-${Math.random().toString(36).slice(2, 10)}`
  );
  const [draggedKey, setDraggedKey] = useState<string | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  // 폼 모드에서 외부 fields 가 변할 때 JSON 버퍼를 동기화. 편집 중이 아니면 그대로 갱신.
  const lastSyncedRef = useRef<string>("");
  useEffect(() => {
    const serialized = JSON.stringify(fields, null, 2);
    if (mode === "form") {
      // 폼 모드에서는 JSON 버퍼를 상시 최신 상태로 유지.
      if (serialized !== lastSyncedRef.current) {
        setJsonText(serialized);
        lastSyncedRef.current = serialized;
        setJsonError(null);
      }
    }
  }, [fields, mode]);

  const keys = Object.keys(fields);

  const addField = () => {
    let base = "new_field";
    let name = base;
    let idx = 1;
    while (fields[name]) {
      idx += 1;
      name = `${base}_${idx}`;
    }
    onChange({
      ...fields,
      [name]: {
        field_name: name,
        field_type: "string",
        required: false,
        description: "",
        examples: [],
      },
    });
    setExpandedKey(name);
  };

  const renameField = (oldKey: string, nextName: string) => {
    // 동일 이름으로 바뀌지 않으면 key 도 함께 변경.
    const next: Record<string, ExtractionSchemaField> = {};
    for (const [k, v] of Object.entries(fields)) {
      if (k === oldKey) {
        // key 는 새 이름으로, field_name 도 함께 갱신
        next[nextName] = { ...v, field_name: nextName };
      } else {
        next[k] = v;
      }
    }
    // 중복 키가 존재하면(`나중 덮어쓰기` 방지) 변경 취소.
    // — rename 경로에서 중복은 상위 FieldsEditor 가 감지하여 오류 표시만 하고 저장은 막는다.
    if (
      oldKey !== nextName &&
      Object.prototype.hasOwnProperty.call(fields, nextName)
    ) {
      // 중복: 외부 fields 는 바꾸지 않고 이름만 바꾸되 값의 field_name 만 갱신해 UX 상 보이게 함.
      // 그러나 실 저장 키는 그대로 유지하여 충돌 방지.
      onChange({
        ...fields,
        [oldKey]: { ...fields[oldKey], field_name: nextName },
      });
      return;
    }
    onChange(next);
    if (oldKey !== nextName) {
      setExpandedKey(nextName);
    }
  };

  const updateField = (key: string, nextField: ExtractionSchemaField) => {
    onChange({ ...fields, [key]: nextField });
  };

  const removeField = (key: string) => {
    const next = { ...fields };
    delete next[key];
    onChange(next);
    if (expandedKey === key) setExpandedKey(null);
  };

  // P3 후속-C: 새로운 키 순서로 Record 를 재구성. JS 객체 키 순회는 문자열 삽입 순서를 따른다.
  const applyOrder = (orderedKeys: string[]) => {
    const next: Record<string, ExtractionSchemaField> = {};
    for (const k of orderedKeys) {
      if (Object.prototype.hasOwnProperty.call(fields, k)) {
        next[k] = fields[k];
      }
    }
    // 혹시 중간에 빠진 키가 있으면(이론상 없음) 말미에 부착해 데이터 손실 방지.
    for (const k of Object.keys(fields)) {
      if (!Object.prototype.hasOwnProperty.call(next, k)) {
        next[k] = fields[k];
      }
    }
    onChange(next);
  };

  const moveKey = (key: string, delta: number) => {
    const current = Object.keys(fields);
    const idx = current.indexOf(key);
    if (idx < 0) return;
    const to = idx + delta;
    if (to < 0 || to >= current.length) return;
    const next = [...current];
    const [moved] = next.splice(idx, 1);
    next.splice(to, 0, moved);
    applyOrder(next);
  };

  const moveKeyBefore = (sourceKey: string, targetKey: string) => {
    if (sourceKey === targetKey) return;
    const current = Object.keys(fields);
    const from = current.indexOf(sourceKey);
    const to = current.indexOf(targetKey);
    if (from < 0 || to < 0) return;
    const next = [...current];
    const [moved] = next.splice(from, 1);
    // splice 이후 target 인덱스를 재계산 (source 가 target 앞에 있었다면 target 이 한 칸 당겨짐).
    const targetIdxAfterRemove = next.indexOf(targetKey);
    next.splice(targetIdxAfterRemove, 0, moved);
    applyOrder(next);
  };

  // drag handler: 드롭 대상 row 의 "앞" 에 source 를 삽입.
  // 드래그 시작은 <span> 핸들, 드롭 타겟은 <li> — 두 대상의 타입이 다르므로 HTMLElement 로 일반화.
  const onRowDragStart = (e: ReactDragEvent<HTMLElement>, key: string) => {
    e.dataTransfer.effectAllowed = "move";
    // payload 로 instanceId:key 를 전달하여 다른 편집기 인스턴스 간 교차 드롭을 차단.
    e.dataTransfer.setData("text/plain", `${instanceIdRef.current}|${key}`);
    setDraggedKey(key);
  };
  const onRowDragOver = (e: ReactDragEvent<HTMLLIElement>, key: string) => {
    // drop 을 허용하려면 preventDefault 호출 필수.
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverKey !== key) setDragOverKey(key);
  };
  const onRowDragLeave = (key: string) => {
    // 빠르게 다른 row 위로 올라갈 때 깜빡임을 최소화하기 위해 동일 key 일 때만 clear.
    setDragOverKey((cur) => (cur === key ? null : cur));
  };
  const onRowDrop = (e: ReactDragEvent<HTMLLIElement>, targetKey: string) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    setDragOverKey(null);
    setDraggedKey(null);
    if (!raw) return;
    const [scope, sourceKey] = raw.split("|");
    // 다른 편집기에서 시작된 드롭은 무시 (중첩 교차 이동 방지).
    if (scope !== instanceIdRef.current) return;
    if (!sourceKey || sourceKey === targetKey) return;
    if (!Object.prototype.hasOwnProperty.call(fields, sourceKey)) return;
    moveKeyBefore(sourceKey, targetKey);
  };
  const onRowDragEnd = () => {
    setDraggedKey(null);
    setDragOverKey(null);
  };

  const switchToJson = () => {
    const serialized = JSON.stringify(fields, null, 2);
    setJsonText(serialized);
    lastSyncedRef.current = serialized;
    setJsonError(null);
    setMode("json");
  };

  const commitJson = (): boolean => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setJsonError("fields 는 객체(Dict) 형태여야 합니다.");
        return false;
      }
      // 최소 검증: 각 value 가 객체 + field_name/field_type/description 존재.
      for (const [k, v] of Object.entries(parsed)) {
        if (!v || typeof v !== "object" || Array.isArray(v)) {
          setJsonError(`필드 '${k}' 의 값이 객체가 아닙니다.`);
          return false;
        }
        const fd = v as Record<string, unknown>;
        if (typeof fd.field_name !== "string" || !fd.field_name) {
          setJsonError(`필드 '${k}' 에 field_name(string) 이 필요합니다.`);
          return false;
        }
        if (typeof fd.field_type !== "string") {
          setJsonError(`필드 '${k}' 에 field_type(string) 이 필요합니다.`);
          return false;
        }
        if (typeof fd.description !== "string" || !fd.description) {
          setJsonError(`필드 '${k}' 에 description(string) 이 필요합니다.`);
          return false;
        }
      }
      onChange(parsed as Record<string, ExtractionSchemaField>);
      setJsonError(null);
      return true;
    } catch (e) {
      setJsonError(
        `JSON 파싱 실패: ${e instanceof Error ? e.message : String(e)}`
      );
      return false;
    }
  };

  const switchToForm = () => {
    if (commitJson()) {
      setMode("form");
    }
  };

  // 중복/무효 이름 감지 — field_name 이 key 와 다른 경우도 함께 검사.
  const duplicateNames = new Set<string>();
  const seen = new Set<string>();
  for (const k of keys) {
    const name = fields[k].field_name;
    if (seen.has(name)) duplicateNames.add(name);
    else seen.add(name);
  }

  return (
    <div className="space-y-3">
      {/* 툴바 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-[11px] text-gray-600">
          <span aria-live="polite">필드 {keys.length}개</span>
          {mode === "form" && (
            <button
              type="button"
              onClick={addField}
              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg min-h-[28px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              + 필드 추가
            </button>
          )}
        </div>
        {isRoot && (
          <div
            role="tablist"
            aria-label="편집 모드"
            className="inline-flex rounded-lg border border-gray-300 overflow-hidden"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "form"}
              onClick={switchToForm}
              className={`px-3 py-1 text-[11px] font-semibold ${
                mode === "form"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`}
            >
              폼 모드
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "json"}
              onClick={switchToJson}
              className={`px-3 py-1 text-[11px] font-semibold ${
                mode === "json"
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400`}
            >
              JSON 모드
            </button>
          </div>
        )}
      </div>

      {mode === "form" || !isRoot ? (
        <div>
          {keys.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-xs text-gray-500">
              아직 필드가 없습니다.{" "}
              <button
                type="button"
                onClick={addField}
                className="underline text-blue-700 hover:text-blue-900"
              >
                첫 필드 추가
              </button>
            </div>
          ) : (
            <ul className="space-y-2">
              {keys.map((k, idx) => {
                const f = fields[k];
                const name = f.field_name;
                const isDup = duplicateNames.has(name);
                const isInvalidName = !SNAKE_CASE_RE.test(name);
                return (
                  <FieldRowEditor
                    key={k}
                    fieldKey={k}
                    field={f}
                    isDuplicateName={isDup}
                    isInvalidName={isInvalidName}
                    expanded={expandedKey === k}
                    depth={depth}
                    maxDepth={maxDepth}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < keys.length - 1}
                    isDragging={draggedKey === k}
                    isDragOver={dragOverKey === k && draggedKey !== k}
                    onToggle={() =>
                      setExpandedKey((cur) => (cur === k ? null : k))
                    }
                    onRename={(nextName) => renameField(k, nextName)}
                    onUpdate={(nextField) => updateField(k, nextField)}
                    onRemove={() => removeField(k)}
                    onMoveUp={() => moveKey(k, -1)}
                    onMoveDown={() => moveKey(k, +1)}
                    onDragStart={(e) => onRowDragStart(e, k)}
                    onDragOver={(e) => onRowDragOver(e, k)}
                    onDragLeave={() => onRowDragLeave(k)}
                    onDrop={(e) => onRowDrop(e, k)}
                    onDragEnd={onRowDragEnd}
                  />
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div>
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setJsonError(null);
            }}
            onBlur={() => {
              commitJson();
            }}
            className="w-full h-80 px-3 py-2 text-[11px] border border-gray-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            spellCheck={false}
            aria-label="fields JSON 편집"
          />
          {jsonError && (
            <p role="alert" className="mt-1 text-[11px] text-red-700">
              {jsonError}
            </p>
          )}
          <p className="text-[10px] text-gray-500 mt-1">
            JSON 편집 후 blur 시 자동 커밋. "폼 모드" 로 전환해도 검증 후 반영됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
