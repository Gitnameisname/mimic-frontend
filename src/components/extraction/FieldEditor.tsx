"use client";

import { useState } from "react";
import { useExtractionStore } from "@/stores/extractionStore";
import { cn } from "@/lib/utils";
import type { ExtractionConfidenceScore } from "@/types/extraction";
import { isString } from "@/lib/utils/guards";

interface FieldEditorProps {
  fieldName: string;
  originalValue: unknown;
  confidenceScores: ExtractionConfidenceScore[];
  readOnly?: boolean;
}

function ConfidencePip({ score }: { score: number }) {
  const color =
    score >= 0.85 ? "bg-green-500" : score >= 0.70 ? "bg-yellow-400" : "bg-red-400";
  return (
    <span
      className={cn("inline-block w-2 h-2 rounded-full mr-1.5 shrink-0", color)}
      aria-hidden="true"
    />
  );
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function detectType(value: unknown): "text" | "date" | "number" | "json" {
  if (value === null || value === undefined) return "text";
  if (typeof value === "number") return "number";
  if (isString(value)) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return "date";
  }
  if (typeof value === "object") return "json";
  return "text";
}

export function FieldEditor({
  fieldName,
  originalValue,
  confidenceScores,
  readOnly = false,
}: FieldEditorProps) {
  const editedFields = useExtractionStore((s) => s.editedFields);
  const editReasons = useExtractionStore((s) => s.editReasons);
  const setFieldValue = useExtractionStore((s) => s.setFieldValue);
  const setFieldReason = useExtractionStore((s) => s.setFieldReason);

  const [jsonError, setJsonError] = useState<string | null>(null);

  const confidence = confidenceScores.find((c) => c.field_name === fieldName);
  const currentValue = fieldName in editedFields ? editedFields[fieldName] : originalValue;
  const isDirty = fieldName in editedFields && editedFields[fieldName] !== originalValue;
  const fieldType = detectType(originalValue);

  const handleChange = (raw: string) => {
    if (fieldType === "number") {
      const n = parseFloat(raw);
      setFieldValue(fieldName, isNaN(n) ? raw : n);
    } else if (fieldType === "json") {
      try {
        setFieldValue(fieldName, JSON.parse(raw));
        setJsonError(null);
      } catch {
        setJsonError("유효하지 않은 JSON 형식입니다. 저장 전 수정하세요.");
      }
    } else {
      setFieldValue(fieldName, raw);
    }
  };

  const displayValue =
    fieldType === "json" && typeof currentValue === "object"
      ? JSON.stringify(currentValue, null, 2)
      : String(currentValue ?? "");

  return (
    <div
      className={cn(
        "border rounded-md p-3 space-y-2 transition-colors",
        isDirty ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"
      )}
      role="group"
      aria-label={`필드: ${fieldName}`}
    >
      <div className="flex items-center gap-2">
        {confidence && <ConfidencePip score={confidence.confidence} />}
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          {fieldName}
        </span>
        {confidence && (
          <span className="ml-auto text-xs text-gray-400">
            신뢰도 {Math.round(confidence.confidence * 100)}%
          </span>
        )}
        {isDirty && (
          <span className="text-xs font-medium text-blue-600 ml-1">수정됨</span>
        )}
      </div>

      {readOnly ? (
        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
          {renderValue(currentValue)}
        </p>
      ) : fieldType === "json" ? (
        <>
          <textarea
            className={cn(
              "w-full text-xs font-mono border rounded p-2 min-h-[80px] focus:outline-none focus:ring-2",
              jsonError
                ? "border-red-400 focus:ring-red-500"
                : "border-gray-200 focus:ring-blue-500"
            )}
            value={displayValue}
            onChange={(e) => handleChange(e.target.value)}
            aria-label={`${fieldName} 값 편집`}
            aria-describedby={jsonError ? `json-error-${fieldName}` : undefined}
            aria-invalid={jsonError ? true : undefined}
            spellCheck={false}
          />
          {jsonError && (
            <p id={`json-error-${fieldName}`} role="alert" className="text-xs text-red-600 mt-1">
              {jsonError}
            </p>
          )}
        </>
      ) : fieldType === "date" ? (
        <input
          type="date"
          className="w-full text-sm border border-gray-200 rounded p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          aria-label={`${fieldName} 날짜 편집`}
        />
      ) : fieldType === "number" ? (
        <input
          type="number"
          className="w-full text-sm border border-gray-200 rounded p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          aria-label={`${fieldName} 숫자 편집`}
        />
      ) : (
        <input
          type="text"
          className="w-full text-sm border border-gray-200 rounded p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={displayValue}
          onChange={(e) => handleChange(e.target.value)}
          aria-label={`${fieldName} 텍스트 편집`}
        />
      )}

      {isDirty && !readOnly && (
        <div>
          <label
            htmlFor={`reason-${fieldName}`}
            className="text-xs text-gray-500 block mb-0.5"
          >
            수정 사유 (선택)
          </label>
          <input
            id={`reason-${fieldName}`}
            type="text"
            className="w-full text-xs border border-gray-200 rounded p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="수정 이유를 입력하세요"
            value={editReasons[fieldName] ?? ""}
            onChange={(e) => setFieldReason(fieldName, e.target.value)}
          />
        </div>
      )}

      {confidence?.reason && (
        <p className="text-xs text-gray-400 italic">{confidence.reason}</p>
      )}
    </div>
  );
}
