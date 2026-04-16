"use client";

/**
 * InputArea — 채팅 입력 영역.
 *
 * - multiline textarea (Shift+Enter 줄바꿈, Enter 전송)
 * - 전송/중단 버튼
 * - 5000자 제한 + 잔여 글자 수 표시
 * - 자동 높이 조정 (최대 200px)
 * - 로딩/스트리밍 중 비활성화
 *
 * 접근성 (WCAG 2.1 AA):
 *  - aria-label on textarea
 *  - aria-describedby 글자 수 안내
 *  - role="status" 글자 수 (스크린 리더가 폴링 가능)
 *  - focus-visible ring
 *  - 전송 버튼 disabled 시 aria-disabled
 */

import { useState, useRef, useCallback, useId } from "react";

interface InputAreaProps {
  disabled?: boolean;
  loading?: boolean;
  onSend: (query: string) => void;
  onStop?: () => void;
  placeholder?: string;
}

const MAX_LENGTH = 5000;

export default function InputArea({
  disabled = false,
  loading = false,
  onSend,
  onStop,
  placeholder = "질문을 입력하세요… (Enter 전송 · Shift+Enter 줄바꿈)",
}: InputAreaProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const counterId = useId();

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, loading, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const canSend = input.trim().length > 0 && !loading && !disabled;
  const remaining = MAX_LENGTH - input.length;
  const isNearLimit = remaining <= 200;

  return (
    <div className="shrink-0 border-t border-gray-200 bg-white px-3 sm:px-4 py-3">
      <div className="relative flex gap-2 items-end">
        <label className="sr-only" htmlFor="chat-input">
          질문 입력
        </label>
        <textarea
          id="chat-input"
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-200 placeholder-gray-400 bg-gray-50 leading-relaxed transition-colors"
          rows={1}
          maxLength={MAX_LENGTH}
          disabled={disabled || loading}
          aria-describedby={counterId}
          aria-multiline="true"
        />

        {loading && onStop ? (
          <button
            onClick={onStop}
            className="shrink-0 px-3 py-2 rounded-lg text-xs font-medium bg-red-500 text-white hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 transition-colors h-10"
            aria-label="AI 응답 중단"
          >
            중단
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!canSend}
            aria-disabled={!canSend}
            className={`shrink-0 px-4 py-2 rounded-lg text-xs font-medium transition-colors h-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
              canSend
                ? "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
            aria-label="메시지 전송"
          >
            전송
          </button>
        )}
      </div>

      <div className="flex justify-between items-center mt-1 px-0.5">
        <p className="text-xs text-gray-400">
          {loading ? (
            <span role="status" aria-live="polite">AI가 답변 중입니다…</span>
          ) : (
            <span>Enter로 전송</span>
          )}
        </p>
        <p
          id={counterId}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className={`text-xs ${isNearLimit ? "text-orange-500 font-medium" : "text-gray-400"} ${input.length >= MAX_LENGTH ? "text-red-500 font-semibold" : ""}`}
        >
          {input.length >= MAX_LENGTH
            ? "최대 글자 수에 도달했습니다"
            : isNearLimit
            ? `${remaining}자 남음`
            : `${input.length.toLocaleString()} / ${MAX_LENGTH.toLocaleString()}`}
        </p>
      </div>
    </div>
  );
}
