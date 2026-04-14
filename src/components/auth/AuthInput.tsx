"use client";

/**
 * Auth 폼 텍스트 입력 필드 (Phase 14-6).
 */

import { cn } from "@/lib/utils";

interface AuthInputProps {
  id?: string;
  type?: "text" | "email";
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  autoComplete?: string;
  autoFocus?: boolean;
}

export function AuthInput({
  id,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
  autoFocus,
}: AuthInputProps) {
  return (
    <div>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? ""}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "w-full border rounded-lg px-3 py-2.5 text-sm bg-white placeholder-gray-400",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:border-blue-500",
          "transition-colors duration-200",
          error
            ? "border-red-300 focus-visible:ring-red-500 focus-visible:border-red-500"
            : "border-gray-300 hover:border-gray-400",
        )}
      />
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600 mt-1.5 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
