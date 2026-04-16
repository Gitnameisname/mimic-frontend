"use client";

/**
 * MessageBubble — 단일 채팅 메시지 버블.
 *
 * - user: 우측 정렬, 파란색 배경
 * - assistant: 좌측 정렬, 흰색 배경 + 그림자, CitationBlock 포함
 * - streaming: ARIA live="polite" + 타이핑 커서
 *
 * 접근성 (WCAG 2.1 AA):
 *  - role="article" + aria-label 메시지 컨테이너
 *  - aria-live="polite" 스트리밍 영역
 *  - 시간 정보는 <time> 요소 사용
 *  - Citation 버튼: focus-visible ring
 */

import type { Message, RAGCitationInfo } from "@/types/conversation";
import CitationBlock from "./CitationBlock";

interface MessageBubbleProps {
  message: Message;
  onCitationClick?: (citation: RAGCitationInfo) => void;
}

export default function MessageBubble({ message, onCitationClick }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const citationMap = new Map(
    (message.citations ?? []).map((c) => [c.index, c])
  );

  const formattedTime = new Date(message.created_at).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  /** 인라인 [숫자] → 클릭 가능 citation 버튼으로 교체 */
  const renderContent = (text: string) => {
    if (!message.citations?.length) {
      return <span className="whitespace-pre-wrap break-words">{text}</span>;
    }
    const parts = text.split(/(\[\d+\])/g);
    return (
      <>
        {parts.map((part, i) => {
          const match = part.match(/^\[(\d+)\]$/);
          if (match) {
            const idx = parseInt(match[1], 10);
            const cit = citationMap.get(idx);
            if (cit && onCitationClick) {
              return (
                <button
                  key={i}
                  className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors mx-0.5 align-middle"
                  onClick={() => onCitationClick(cit)}
                  aria-label={`인용 출처 ${idx} 보기`}
                  title={`출처 ${idx}`}
                >
                  <span aria-hidden="true">{idx}</span>
                </button>
              );
            }
          }
          return <span key={i} className="whitespace-pre-wrap break-words">{part}</span>;
        })}
      </>
    );
  };

  if (isUser) {
    return (
      <div
        role="article"
        aria-label={`사용자 메시지: ${message.content.slice(0, 50)}`}
        className="flex justify-end mb-4"
      >
        <div className="max-w-[85%] sm:max-w-md lg:max-w-2xl bg-blue-600 text-white rounded-2xl rounded-tr-sm px-5 py-3 text-sm leading-relaxed shadow-sm">
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
          <time
            dateTime={message.created_at}
            className="block text-xs opacity-60 mt-2 text-right"
            aria-label={`전송 시간: ${formattedTime}`}
          >
            {formattedTime}
          </time>
        </div>
      </div>
    );
  }

  return (
    <div
      role="article"
      aria-label="AI 어시스턴트 답변"
      className="flex justify-start mb-4"
    >
      <div className="max-w-[90%] sm:max-w-md lg:max-w-2xl">
        {/* AI 아바타 */}
        <div className="flex items-start gap-2">
          <div
            className="shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mt-0.5"
            aria-hidden="true"
          >
            <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 4a2 2 0 100 4 2 2 0 000-4zm0 12c-2.667 0-8 1.333-8 4v1h16v-1c0-2.667-5.333-4-8-4z"/>
            </svg>
          </div>

          {/* 메시지 본문 */}
          <div className="flex-1 min-w-0 bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-5 py-4 text-sm text-gray-800 leading-relaxed shadow-sm">
            {/* 스트리밍 중 ARIA live 영역 */}
            <div
              aria-live={message.isStreaming ? "polite" : "off"}
              aria-atomic="false"
            >
              {renderContent(message.content)}
              {message.isStreaming && (
                <span
                  className="inline-block w-1.5 h-4 bg-gray-400 rounded animate-pulse ml-0.5 align-middle"
                  aria-label="응답 생성 중"
                  role="status"
                />
              )}
            </div>

            {/* CitationBlock */}
            {!message.isStreaming && (
              <CitationBlock
                citations={message.citations}
                turnId={message.turn_id}
              />
            )}

            {!message.isStreaming && (
              <time
                dateTime={message.created_at}
                className="block text-xs text-gray-400 mt-2"
                aria-label={`수신 시간: ${formattedTime}`}
              >
                {formattedTime}
              </time>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
