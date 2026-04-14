"use client";

/**
 * 비밀번호 입력 필드 (Phase 14-6).
 *
 * 기능:
 *  - 토글 표시 (눈 아이콘)
 *  - 선택적 비밀번호 강도 표시 바
 *  - paste 허용 (비밀번호 관리자 호환)
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  getPasswordStrength,
  getPasswordStrengthLabel,
} from "@/lib/validations/auth";

interface PasswordInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  showStrength?: boolean;
  autoComplete?: string;
  required?: boolean;
  "aria-required"?: string;
}

export function PasswordInput({
  id,
  value,
  onChange,
  placeholder = "비밀번호",
  error,
  showStrength = false,
  autoComplete = "current-password",
  required,
  "aria-required": ariaRequired,
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const strength = getPasswordStrength(value);
  const { label, color } = getPasswordStrengthLabel(strength);

  return (
    <div>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          aria-required={ariaRequired}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "w-full border rounded-lg px-3 py-2.5 text-sm pr-10 bg-white placeholder-gray-400",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:border-blue-500",
            "transition-colors duration-200",
            error
              ? "border-red-300 focus-visible:ring-red-500 focus-visible:border-red-500"
              : "border-gray-300 hover:border-gray-400",
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-blue-500 rounded transition-colors duration-150 p-1"
          aria-label={visible ? "비밀번호 숨기기" : "비밀번호 표시"}
        >
          {visible ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </button>
      </div>

      {/* 비밀번호 강도 표시 */}
      {showStrength && value.length > 0 && (
        <div className="mt-2.5">
          <div className="flex gap-1">
            {[1, 2, 3].map((level) => (
              <div
                key={level}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-300",
                  strength >= level ? color : "bg-gray-200",
                )}
              />
            ))}
          </div>
          <p className={cn(
            "text-xs mt-2 font-medium",
            strength === 1 && "text-red-600",
            strength === 2 && "text-orange-600",
            strength === 3 && "text-green-600",
          )}>
            {label}
          </p>
        </div>
      )}

      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600 mt-1.5 font-medium">
          {error}
        </p>
      )}
    </div>
  );
}
