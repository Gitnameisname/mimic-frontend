"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  documentId: string;
  onClose: () => void;
}

const EXAMPLE_QUESTIONS = [
  "이 문서의 핵심 목적은?",
  "주요 제약 사항은?",
  "다음 단계는 무엇인가요?",
];

export function RagPanel({ documentId: _documentId, onClose }: Props) {
  const [question, setQuestion] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 패널 열릴 때 포커스
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Phase 11에서 실제 API 연결 예정
    }
  };

  return (
    <div className="w-80 shrink-0 border-l border-gray-200 bg-white flex flex-col h-full">
      {/* 패널 헤더 */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">AI 질의</span>
          <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
            준비 중
          </span>
        </div>
        <button
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          onClick={onClose}
          title="닫기"
        >
          ×
        </button>
      </div>

      {/* 준비 중 안내 */}
      <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
        <p className="text-xs text-amber-700">
          RAG 질의 기능은 Phase 11에서 활성화될 예정입니다.
          현재는 UI 구조만 제공됩니다.
        </p>
      </div>

      {/* 질의 입력 영역 */}
      <div className="flex-1 flex flex-col px-4 py-4 gap-4 overflow-y-auto">
        {/* 예시 질문 */}
        <div>
          <p className="text-xs text-gray-500 mb-2">예시 질문</p>
          <div className="space-y-1.5">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                className="w-full text-left text-xs px-3 py-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                onClick={() => setQuestion(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* 답변 영역 플레이스홀더 */}
        <div className="flex-1 flex items-center justify-center text-center">
          <p className="text-xs text-gray-400">
            질문을 입력하면 이 문서를 기반으로
            <br />
            답변이 표시됩니다.
          </p>
        </div>
      </div>

      {/* 입력 푸터 */}
      <div className="shrink-0 border-t border-gray-200 p-3">
        <div className="relative">
          <textarea
            ref={textareaRef}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-16 resize-none focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-200 placeholder-gray-400 bg-gray-50 disabled:opacity-50"
            placeholder="이 문서에 대해 질문하세요..."
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled
          />
          <button
            className="absolute right-2 bottom-2 text-xs px-2.5 py-1 rounded-md bg-blue-600 text-white font-medium opacity-40 cursor-not-allowed"
            disabled
          >
            전송
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">
          Phase 11에서 활성화 예정
        </p>
      </div>
    </div>
  );
}
