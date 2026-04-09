"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { queryStream } from "@/lib/api/rag";
import type { Citation, RetrievedChunk } from "@/types/rag";

interface Props {
  documentId?: string;
  onClose: () => void;
}

const EXAMPLE_QUESTIONS = [
  "이 문서의 핵심 목적은?",
  "주요 제약 사항은?",
  "다음 단계는 무엇인가요?",
];

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  citations?: Citation[];
  chunks?: RetrievedChunk[];
}

export function RagPanel({ documentId, onClose }: Props) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 패널 닫힐 때 스트리밍 중단
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleSubmit = useCallback(async () => {
    const q = question.trim();
    if (!q || isLoading) return;

    setQuestion("");
    setIsLoading(true);

    // 사용자 메시지 추가
    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: q },
    ]);

    // 어시스턴트 스트리밍 메시지 추가 (빈 상태로 시작)
    const asstMsgId = `asst-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: asstMsgId, role: "assistant", content: "", isStreaming: true },
    ]);

    const controller = queryStream(
      {
        question: q,
        conversation_id: conversationId ?? undefined,
        document_id: documentId,
        stream: true,
      },
      {
        onStart: (data) => {
          setConversationId(data.conversation_id);
        },
        onDelta: (text) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstMsgId ? { ...m, content: m.content + text } : m
            )
          );
        },
        onCitation: (data) => {
          const citations = data.citations as Citation[];
          const chunks = data.context_chunks as RetrievedChunk[];
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstMsgId ? { ...m, citations, chunks } : m
            )
          );
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstMsgId ? { ...m, isStreaming: false } : m
            )
          );
          setIsLoading(false);
        },
        onError: (msg) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstMsgId
                ? {
                    ...m,
                    content: `오류가 발생했습니다: ${msg}`,
                    isStreaming: false,
                  }
                : m
            )
          );
          setIsLoading(false);
        },
      }
    );

    abortRef.current = controller;
  }, [question, isLoading, conversationId, documentId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setMessages((prev) =>
      prev.map((m) =>
        m.isStreaming ? { ...m, isStreaming: false } : m
      )
    );
    setIsLoading(false);
  };

  const handleClear = () => {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setIsLoading(false);
  };

  return (
    <div className="w-96 shrink-0 border-l border-gray-200 bg-white flex flex-col h-full relative">
      {/* 헤더 */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-800">AI 질의</span>
          <span className="text-xs bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded">
            RAG
          </span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              onClick={handleClear}
              title="대화 초기화"
            >
              초기화
            </button>
          )}
          <button
            className="text-gray-400 hover:text-gray-600 text-lg leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
            onClick={onClose}
            title="닫기"
          >
            ×
          </button>
        </div>
      </div>

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="space-y-4">
            {/* 안내 문구 */}
            <p className="text-xs text-gray-500 text-center">
              {documentId
                ? "이 문서를 기반으로 질문에 답변합니다."
                : "등록된 문서를 기반으로 질문에 답변합니다."}
            </p>
            {/* 예시 질문 */}
            <div>
              <p className="text-xs text-gray-400 mb-2 font-medium">예시 질문</p>
              <div className="space-y-1.5">
                {EXAMPLE_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    className="w-full text-left text-xs px-3 py-2 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-blue-200 transition-colors"
                    onClick={() => setQuestion(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onCitationClick={setActiveCitation}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Citation 팝업 */}
      {activeCitation && (
        <CitationPopup
          citation={activeCitation}
          onClose={() => setActiveCitation(null)}
        />
      )}

      {/* 입력 영역 */}
      <div className="shrink-0 border-t border-gray-200 p-3">
        <div className="relative">
          <textarea
            ref={textareaRef}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 pr-16 resize-none focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-200 placeholder-gray-400 bg-gray-50 disabled:opacity-50"
            placeholder="문서에 대해 질문하세요... (Enter로 전송)"
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          {isLoading ? (
            <button
              className="absolute right-2 bottom-2 text-xs px-2.5 py-1 rounded-md bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              onClick={handleStop}
            >
              중단
            </button>
          ) : (
            <button
              className={`absolute right-2 bottom-2 text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                question.trim()
                  ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                  : "bg-blue-200 text-blue-400 cursor-not-allowed"
              }`}
              onClick={handleSubmit}
              disabled={!question.trim()}
            >
              전송
            </button>
          )}
        </div>
        <p className="text-xs text-gray-300 mt-1 text-right">
          {isLoading ? "답변 생성 중…" : conversationId ? `대화 ${conversationId.slice(0, 8)}…` : "새 대화"}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 메시지 버블
// ---------------------------------------------------------------------------

function MessageBubble({
  message,
  onCitationClick,
}: {
  message: DisplayMessage;
  onCitationClick: (c: Citation) => void;
}) {
  const isUser = message.role === "user";
  const citationMap = new Map(
    (message.citations ?? []).map((c) => [c.index, c])
  );

  // [n] 마커를 클릭 가능한 배지로 변환
  const renderContent = (text: string) => {
    if (!message.citations?.length) return text;
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((part, i) => {
      const match = part.match(/^\[(\d+)\]$/);
      if (match) {
        const idx = parseInt(match[1]);
        const citation = citationMap.get(idx);
        if (citation) {
          return (
            <button
              key={i}
              className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors cursor-pointer mx-0.5 align-middle"
              onClick={() => onCitationClick(citation)}
              title={citation.document_title ?? citation.document_id}
            >
              {idx}
            </button>
          );
        }
      }
      return part;
    });
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white rounded-tr-sm"
            : "bg-gray-100 text-gray-800 rounded-tl-sm"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="whitespace-pre-wrap">
            {renderContent(message.content)}
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-gray-400 rounded animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        )}
        {/* 근거 배지 목록 */}
        {!isUser && message.citations && message.citations.length > 0 && !message.isStreaming && (
          <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-1">
            {message.citations.map((c) => (
              <button
                key={c.chunk_id}
                className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full hover:border-blue-300 hover:text-blue-600 transition-colors truncate max-w-[160px]"
                onClick={() => onCitationClick(c)}
                title={c.document_title}
              >
                [{c.index}] {c.document_title ?? "문서"}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Citation 팝업
// ---------------------------------------------------------------------------

function CitationPopup({
  citation,
  onClose,
}: {
  citation: Citation;
  onClose: () => void;
}) {
  return (
    <div className="absolute bottom-20 left-2 right-2 z-10 bg-white rounded-xl shadow-xl border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
            출처 [{citation.index}]
          </span>
          {citation.document_title && (
            <p className="text-xs font-medium text-gray-700 mt-1.5">
              {citation.document_title}
            </p>
          )}
        </div>
        <button
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {/* 경로 */}
      {citation.node_path.length > 0 && (
        <p className="text-xs text-gray-400 mb-2">
          {citation.node_path.join(" › ")}
        </p>
      )}

      {/* 근거 텍스트 */}
      <p className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed line-clamp-4">
        {citation.source_text}
      </p>

      {/* 문서 링크 */}
      <Link
        href={`/documents/${citation.document_id}`}
        className="mt-2 block text-xs text-blue-600 hover:underline"
        onClick={onClose}
      >
        원본 문서로 이동 →
      </Link>

      {/* 유사도 */}
      <p className="text-xs text-gray-300 mt-1">
        유사도: {(citation.similarity * 100).toFixed(1)}%
      </p>
    </div>
  );
}
