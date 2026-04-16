"use client";

/**
 * S2 채팅 대화 상태 관리 — Zustand 스토어.
 *
 * 관리 범위:
 *  - currentConversation: 현재 활성 대화
 *  - messages: UI 렌더링용 메시지 목록 (user + assistant 교대)
 *  - loading: API 요청 중 여부
 *  - streaming: SSE/응답 생성 중 여부
 *  - streamingContent: 현재 생성 중인 응답 텍스트 (실시간 업데이트)
 */

import { create } from "zustand";
import type { Conversation, Message } from "@/types/conversation";

interface ConversationState {
  // 상태
  currentConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  streaming: boolean;
  streamingContent: string;

  // 액션
  setCurrentConversation: (conversation: Conversation | null) => void;
  addMessage: (message: Message) => void;
  updateMessageById: (id: string, update: Partial<Message>) => void;
  updateStreamingContent: (content: string) => void;
  appendStreamingContent: (chunk: string) => void;
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  clearConversation: () => void;
  loadMessagesFromTurns: (turns: import("@/types/conversation").Turn[]) => void;
}

export const useConversationStore = create<ConversationState>((set) => ({
  currentConversation: null,
  messages: [],
  loading: false,
  streaming: false,
  streamingContent: "",

  setCurrentConversation: (conversation) =>
    set({ currentConversation: conversation, messages: [], streamingContent: "" }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessageById: (id, update) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...update } : m)),
    })),

  updateStreamingContent: (content) =>
    set({ streamingContent: content }),

  appendStreamingContent: (chunk) =>
    set((state) => ({ streamingContent: state.streamingContent + chunk })),

  setLoading: (loading) => set({ loading }),

  setStreaming: (streaming) => set({ streaming }),

  clearConversation: () =>
    set({ currentConversation: null, messages: [], streamingContent: "" }),

  loadMessagesFromTurns: (turns) => {
    const messages: Message[] = [];
    for (const turn of turns) {
      messages.push({
        id: `user-${turn.id}`,
        turn_id: turn.id,
        role: "user",
        content: turn.user_message,
        created_at: turn.created_at,
      });
      if (turn.assistant_response) {
        messages.push({
          id: `asst-${turn.id}`,
          turn_id: turn.id,
          role: "assistant",
          content: turn.assistant_response,
          created_at: turn.created_at,
          citations: turn.retrieval_metadata?.citations
            ? turn.retrieval_metadata.citations.map((c) => ({
                index: c.index,
                snippet: c.snippet,
                citation: {
                  document_id: c.document_id,
                  version_id: "",
                  content_hash: c.content_hash,
                },
              }))
            : undefined,
        });
      }
    }
    set({ messages });
  },
}));
