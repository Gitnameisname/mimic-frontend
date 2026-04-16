"use client";

/**
 * SearchBox — 대화 검색 입력 (debounce 500ms).
 *
 * 접근성 (WCAG 2.1 AA):
 *  - role="search" 컨테이너
 *  - aria-label input
 *  - focus-visible ring
 *  - 지우기 버튼 aria-label
 */

import { useState, useEffect } from "react";

interface SearchBoxProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
}

export default function SearchBox({
  value,
  onChange,
  placeholder = "대화 검색…",
}: SearchBoxProps) {
  const [input, setInput] = useState(value);

  useEffect(() => {
    setInput(value);
  }, [value]);

  // debounce 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (input !== value) onChange(input);
    }, 500);
    return () => clearTimeout(timer);
  }, [input, onChange, value]);

  return (
    <div role="search" className="px-3 py-2 border-b border-gray-100">
      <div className="relative">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1110.5 3a7.5 7.5 0 016.15 13.65z" />
          </svg>
        </span>
        <input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="w-full text-xs pl-7 pr-6 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-200 bg-gray-50 placeholder-gray-400 transition-colors"
          aria-label="대화 검색"
        />
        {input && (
          <button
            onClick={() => { setInput(""); onChange(""); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-400 rounded"
            aria-label="검색어 지우기"
            type="button"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
