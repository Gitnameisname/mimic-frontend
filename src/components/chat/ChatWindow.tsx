"use client";

/**
 * ChatWindow — 채팅 메인 컨테이너.
 *
 * 책임:
 *  - 대화 로딩 및 초기화
 *  - S2 RAG 답변 요청 처리 (POST /rag/answer)
 *  - 메시지 목록 렌더링 (MessageHistory)
 *  - 헤더 (ChatHeader) + 입력 (InputArea) 조합
 *  - 스크롤 자동 하단 이동
 *  - Citation 팝업 오버레이 (focus trap + Escape)
 *
 * 접근성 (WCAG 2.1 AA):
 *  - Citation 팝업: role="dialog", aria-modal, focus trap
 *  - Escape 키로 팝업 닫기
 *  - 로딩 상태: aria-busy
 */

import { useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import { useConversationStore } from "@/stores/conversationStore";
import { conversationApi, ragAnswerApi } from "@/lib/api/conversation";
import ConfirmDialog from "@/components/common/ConfirmDialog";
import ChatHeader from "./ChatHeader";
import MessageHistory from "./MessageHistory";
import InputArea from "./InputArea";
import type { RAGCitationInfo } from "@/types/conversation";

interface ChatWindowProps {
  conversationId?: string;
  onConversationChange?: (id: string) => void;
}

export default function ChatWindow({
  conversationId: initialConvId,
  onConversationChange,
}: ChatWindowProps) {
  const {
    currentConversation,
    messages,
    loading,
    streaming,
    streamingContent,
    setCurrentConversation,
    addMessage,
    updateMessageById,
    setLoading,
    setStreaming,
    updateStreamingContent,
    clearConversation,
    loadMessagesFromTurns,
  } = useConversationStore();

  const historyRef = useRef<HTMLDivElement>(null);
  const [activeCitation, setActiveCitation] = useState<RAGCitationInfo | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const popupCloseRef = useRef<HTMLButtonElement>(null);
  const streamingMsgIdRef = useRef<string | null>(null);

  // 메시지 변경 시 스크롤 하단으로
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // 초기 대화 로드
  useEffect(() => {
    if (initialConvId) {
      loadConversation(initialConvId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConvId]);

  // Citation 팝업 — 열리면 닫기 버튼에 포커스, Escape로 닫기
  useEffect(() => {
    if (activeCitation) {
      popupCloseRef.current?.focus();
    }
  }, [activeCitation]);

  useEffect(() => {
    if (!activeCitation) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveCitation(null);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [activeCitation]);

  const loadConversation = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [conv, turnsRes] = await Promise.all([
        conversationApi.get(id),
        conversationApi.listTurns(id),
      ]);
      setCurrentConversation(conv);
      loadMessagesFromTurns(turnsRes.turns);
    } catch (err) {
      console.error("대화 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, [setLoading, setCurrentConversation, loadMessagesFromTurns]);

  const handleNewConversation = useCallback(async () => {
    clearConversation();
    onConversationChange?.("");
  }, [clearConversation, onConversationChange]);

  const handleDeleteConversation = useCallback(() => {
    if (!currentConversation) return;
    setDeleteDialogOpen(true);
  }, [currentConversation]);

  const handleDeleteConfirm = useCallback(async () => {
    setDeleteDialogOpen(false);
    if (!currentConversation) return;
    try {
      await conversationApi.delete(currentConversation.id);
      clearConversation();
      onConversationChange?.("");
    } catch (err) {
      console.error("대화 삭제 실패:", err);
    }
  }, [currentConversation, clearConversation, onConversationChange]);

  const handleSend = useCallback(async (query: string) => {
    if (loading || streaming) return;

    const userMsgId = `user-${Date.now()}`;
    addMessage({
      id: userMsgId,
      turn_id: "",
      role: "user",
      content: query,
      created_at: new Date().toISOString(),
    });

    const asstMsgId = `asst-${Date.now()}`;
    streamingMsgIdRef.current = asstMsgId;
    addMessage({
      id: asstMsgId,
      turn_id: "",
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
      isStreaming: true,
    });
    updateStreamingContent("");
    setStreaming(true);
    setLoading(true);

    try {
      let convId = currentConversation?.id;
      if (!convId) {
        const newConv = await conversationApi.create({
          title: query.slice(0, 50),
        });
        setCurrentConversation(newConv);
        convId = newConv.id;
        onConversationChange?.(newConv.id);
      }

      const resp = await ragAnswerApi.answer({
        query,
        conversation_id: convId,
        actor_type: "user",
      });

      updateMessageById(asstMsgId, {
        content: resp.answer,
        turn_id: resp.turn_id ?? "",
        isStreaming: false,
        citations: resp.citations,
        metadata: resp.rewritten_query
          ? { rewritten_query: resp.rewritten_query }
          : undefined,
      });
      updateStreamingContent("");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      updateMessageById(asstMsgId, {
        content: `오류: ${errMsg}`,
        isStreaming: false,
      });
      updateStreamingContent("");
    } finally {
      setStreaming(false);
      setLoading(false);
      streamingMsgIdRef.current = null;
    }
  }, [
    loading, streaming, currentConversation, addMessage, updateMessageById,
    updateStreamingContent, setStreaming, setLoading, setCurrentConversation,
    onConversationChange,
  ]);

  return (
    <div
      className="flex flex-col h-full w-full bg-gray-50"
      aria-busy={loading || streaming}
    >
      {/* 헤더 */}
      {currentConversation ? (
        <ChatHeader
          conversation={currentConversation}
          loading={loading || streaming}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />
      ) : (
        <div className="shrink-0 border-b border-gray-200 bg-white px-4 py-3 pl-14 md:pl-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-gray-900">멀티턴 AI 대화</h1>
            <p className="text-xs text-gray-400 mt-0.5">새로운 질문으로 대화를 시작하세요</p>
          </div>
          <button
            onClick={handleNewConversation}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded-lg transition-colors"
            aria-label="새 대화 시작"
          >
            + 새 대화
          </button>
        </div>
      )}

      {/* 메시지 히스토리 */}
      <MessageHistory
        ref={historyRef}
        messages={messages}
        streamingContent={streamingContent}
        streamingMsgId={streamingMsgIdRef.current ?? undefined}
        onCitationClick={setActiveCitation}
      />

      {/* Citation 팝업 (role=dialog, focus trap) */}
      {activeCitation && (
        <>
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 z-10"
            aria-hidden="true"
            onClick={() => setActiveCitation(null)}
          />
          {/* 팝업 */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="citation-popup-title"
            className="absolute bottom-24 left-4 right-4 z-20 bg-white rounded-xl shadow-xl border border-gray-200 p-4 max-w-lg mx-auto"
          >
            <div className="flex items-start justify-between mb-2">
              <span
                id="citation-popup-title"
                className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full"
              >
                출처 [{activeCitation.index}]
              </span>
              <button
                ref={popupCloseRef}
                className="text-gray-400 hover:text-gray-700 ml-2 p-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                onClick={() => setActiveCitation(null)}
                aria-label="출처 팝업 닫기"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 leading-relaxed line-clamp-5">
              {activeCitation.snippet}
            </p>
            <Link
              href={`/documents/${activeCitation.citation.document_id}`}
              className="mt-2 block text-xs text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              onClick={() => setActiveCitation(null)}
            >
              원본 문서로 이동 →
            </Link>
          </div>
        </>
      )}

      {/* 입력 영역 */}
      <InputArea
        loading={loading || streaming}
        onSend={handleSend}
      />

      {/* 대화 삭제 확인 다이얼로그 */}
      <ConfirmDialog
        open={deleteDialogOpen}
        title="대화를 삭제하시겠습니까?"
        description="삭제된 대화는 복구할 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </div>
  );
}
