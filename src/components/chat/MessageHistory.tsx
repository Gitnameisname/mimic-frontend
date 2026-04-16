"use client";

/**
 * MessageHistory — 턴별 메시지 시퀀스 렌더링.
 *
 * - 스크롤 컨테이너 (ref를 통해 scroll-to-bottom)
 * - streaming 중 assistantId 메시지에 streamingContent 반영
 * - 빈 상태(empty state) 포함
 *
 * 접근성 (WCAG 2.1 AA):
 *  - role="log" + aria-label (대화 기록 landmark)
 *  - aria-live="polite" + aria-atomic="false"
 *  - 빈 상태: role="status"
 *  - 반응형 패딩 (px-3 sm:px-4 lg:px-6)
 */

import { forwardRef } from "react";
import MessageBubble from "./MessageBubble";
import type { Message, RAGCitationInfo } from "@/types/conversation";

interface MessageHistoryProps {
  messages: Message[];
  streamingContent?: string;
  streamingMsgId?: string;
  onCitationClick?: (citation: RAGCitationInfo) => void;
}

const MessageHistory = forwardRef<HTMLDivElement, MessageHistoryProps>(
  function MessageHistory(
    { messages, streamingContent, streamingMsgId, onCitationClick },
    ref
  ) {
    return (
      <div
        ref={ref}
        role="log"
        aria-label="대화 기록"
        aria-live="polite"
        aria-atomic="false"
        className="flex-1 overflow-y-auto px-3 sm:px-4 lg:px-8 py-4 space-y-2"
      >
        {messages.length === 0 ? (
          <div
            role="status"
            className="flex flex-col items-center justify-center h-full text-center gap-4 py-12"
          >
            <div
              className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center"
              aria-hidden="true"
            >
              <svg className="w-7 h-7 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-600 font-medium mb-1">멀티턴 AI 대화</p>
              <p className="text-sm text-gray-400">
                질문을 입력하여 대화를 시작하세요.
                <br />
                이전 대화 맥락을 기억하며 답변합니다.
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const displayMsg =
                streamingMsgId && msg.id === streamingMsgId && streamingContent !== undefined
                  ? { ...msg, content: streamingContent, isStreaming: true }
                  : msg;
              return (
                <MessageBubble
                  key={msg.id}
                  message={displayMsg}
                  onCitationClick={onCitationClick}
                />
              );
            })}
          </>
        )}
        {/* scroll anchor */}
        <div aria-hidden="true" />
      </div>
    );
  }
);

export default MessageHistory;
