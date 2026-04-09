"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ragApi, queryStream } from "@/lib/api/rag";
import { formatDate } from "@/lib/utils";
import type { Citation, RetrievedChunk, RAGConversation } from "@/types/rag";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  citations?: Citation[];
  chunks?: RetrievedChunk[];
}

export function RagPage() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const convsQuery = useQuery({
    queryKey: ["rag-conversations"],
    queryFn: async () => {
      const res = await ragApi.listConversations();
      return res.data;
    },
    retry: false,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const loadConversation = useCallback(async (convId: string) => {
    try {
      const res = await ragApi.getConversation(convId);
      const detail = res.data;
      setConversationId(convId);
      setSelectedConvId(convId);
      setMessages(
        detail.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.citations,
          chunks: m.context_chunks,
        }))
      );
    } catch {}
  }, []);

  const handleNewConversation = () => {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setSelectedConvId(null);
    setIsLoading(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = useCallback(async () => {
    const q = question.trim();
    if (!q || isLoading) return;

    setQuestion("");
    setIsLoading(true);

    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [...prev, { id: userMsgId, role: "user", content: q }]);

    const asstMsgId = `asst-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: asstMsgId, role: "assistant", content: "", isStreaming: true },
    ]);

    const controller = queryStream(
      { question: q, conversation_id: conversationId ?? undefined, stream: true },
      {
        onStart: (data) => {
          setConversationId(data.conversation_id);
          setSelectedConvId(data.conversation_id);
          convsQuery.refetch();
        },
        onDelta: (text) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === asstMsgId ? { ...m, content: m.content + text } : m))
          );
        },
        onCitation: (data) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstMsgId
                ? { ...m, citations: data.citations as Citation[], chunks: data.context_chunks as RetrievedChunk[] }
                : m
            )
          );
        },
        onDone: () => {
          setMessages((prev) =>
            prev.map((m) => (m.id === asstMsgId ? { ...m, isStreaming: false } : m))
          );
          setIsLoading(false);
          convsQuery.refetch();
        },
        onError: (msg) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === asstMsgId
                ? { ...m, content: `오류: ${msg}`, isStreaming: false }
                : m
            )
          );
          setIsLoading(false);
        },
      }
    );
    abortRef.current = controller;
  }, [question, isLoading, conversationId, convsQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    );
    setIsLoading(false);
  };

  return (
    <div className="flex h-full">
      {/* 사이드바: 대화 이력 */}
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100">
          <button
            className="w-full text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-2 transition-colors"
            onClick={handleNewConversation}
          >
            + 새 대화
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {convsQuery.isLoading && (
            <div className="px-4 py-3 text-xs text-gray-400">불러오는 중…</div>
          )}
          {convsQuery.isError && (
            <div className="px-4 py-3 text-xs text-gray-400">로그인이 필요합니다.</div>
          )}
          {convsQuery.data?.conversations.map((conv: RAGConversation) => (
            <button
              key={conv.id}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 ${
                selectedConvId === conv.id ? "bg-blue-50 border-l-2 border-l-blue-500" : ""
              }`}
              onClick={() => loadConversation(conv.id)}
            >
              <p className="text-xs font-medium text-gray-700 truncate">
                {conv.title || "새 대화"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDate(conv.updated_at)}
              </p>
            </button>
          ))}
        </div>
      </aside>

      {/* 메인 영역 */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        {/* 페이지 헤더 */}
        <div className="shrink-0 px-6 py-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">AI 지식 질의</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                문서를 기반으로 자연어로 질문하세요. 답변에 근거 문서가 포함됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-600 font-medium mb-1">문서 기반 AI 질의</p>
                <p className="text-sm text-gray-400">
                  등록된 문서를 검색해 답변을 생성합니다.
                  <br />
                  답변에는 근거 문서 링크가 포함됩니다.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 w-full max-w-sm mt-2">
                {["이 시스템의 주요 기능은 무엇인가요?", "현재 진행 중인 작업 목록은?", "보안 정책 요약을 알려주세요."].map((q) => (
                  <button
                    key={q}
                    className="text-sm text-left px-4 py-3 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-blue-200 transition-colors"
                    onClick={() => setQuestion(q)}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <FullMessageBubble
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
          <div className="absolute bottom-24 left-6 right-6 z-10 bg-white rounded-xl shadow-xl border border-gray-200 p-4 max-w-lg">
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                출처 [{activeCitation.index}]
              </span>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setActiveCitation(null)}>×</button>
            </div>
            {activeCitation.document_title && (
              <p className="text-sm font-medium text-gray-700 mb-1">{activeCitation.document_title}</p>
            )}
            {activeCitation.node_path.length > 0 && (
              <p className="text-xs text-gray-400 mb-2">{activeCitation.node_path.join(" › ")}</p>
            )}
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed line-clamp-5">
              {activeCitation.source_text}
            </p>
            <Link
              href={`/documents/${activeCitation.document_id}`}
              className="mt-2 block text-xs text-blue-600 hover:underline"
              onClick={() => setActiveCitation(null)}
            >
              원본 문서로 이동 →
            </Link>
          </div>
        )}

        {/* 입력 영역 */}
        <div className="shrink-0 border-t border-gray-200 bg-white px-6 py-4">
          <div className="max-w-3xl mx-auto relative">
            <textarea
              ref={textareaRef}
              className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 pr-24 resize-none focus:outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100 placeholder-gray-400 bg-gray-50 leading-relaxed"
              placeholder="질문을 입력하세요... (Enter로 전송, Shift+Enter 줄바꿈)"
              rows={2}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            {isLoading ? (
              <button
                className="absolute right-3 bottom-3 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
                onClick={handleStop}
              >
                중단
              </button>
            ) : (
              <button
                className={`absolute right-3 bottom-3 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  question.trim()
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
                onClick={handleSubmit}
                disabled={!question.trim()}
              >
                전송
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 풀 메시지 버블 (메인 RAG 페이지용)
// ---------------------------------------------------------------------------

function FullMessageBubble({
  message,
  onCitationClick,
}: {
  message: DisplayMessage;
  onCitationClick: (c: Citation) => void;
}) {
  const isUser = message.role === "user";
  const citationMap = new Map((message.citations ?? []).map((c) => [c.index, c]));

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

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-2xl bg-blue-600 text-white rounded-2xl rounded-tr-sm px-5 py-3 text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-3xl">
        <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-5 py-4 text-sm text-gray-800 leading-relaxed">
          <div className="whitespace-pre-wrap">
            {renderContent(message.content)}
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-gray-400 rounded animate-pulse ml-0.5 align-middle" />
            )}
          </div>

          {/* Citation 근거 목록 */}
          {!message.isStreaming && message.citations && message.citations.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2 font-medium">참고 문서</p>
              <div className="flex flex-wrap gap-1.5">
                {message.citations.map((c) => (
                  <button
                    key={c.chunk_id}
                    className="inline-flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full hover:border-blue-300 hover:text-blue-600 transition-colors"
                    onClick={() => onCitationClick(c)}
                  >
                    <span className="font-bold text-blue-600">[{c.index}]</span>
                    <span className="truncate max-w-[140px]">{c.document_title ?? "문서"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
