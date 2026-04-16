"use client";

/**
 * ConversationList 사이드바 상태 관리 — Zustand 스토어 (Task 3-9).
 *
 * 관리 범위:
 *  - conversations: 대화 목록
 *  - selectedConversationId: 현재 선택된 대화 ID
 *  - searchQuery: 검색어 (debounce 후 적용)
 *  - filterTab: 필터 탭 (all/week/month/archived)
 *  - loading: API 요청 중
 *  - hasMore: 더 보기 가능 여부
 *  - page: 현재 페이지 번호
 */

import { create } from "zustand";
import type { Conversation } from "@/types/conversation";

export type FilterTab = "all" | "week" | "month" | "archived";

interface ConversationListState {
  // 상태
  conversations: Conversation[];
  selectedConversationId: string | null;
  searchQuery: string;
  filterTab: FilterTab;
  loading: boolean;
  hasMore: boolean;
  page: number;

  // 액션
  setConversations: (conversations: Conversation[]) => void;
  appendConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, update: Partial<Conversation>) => void;
  removeConversation: (id: string) => void;
  setSelectedConversationId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterTab: (tab: FilterTab) => void;
  setLoading: (loading: boolean) => void;
  setHasMore: (hasMore: boolean) => void;
  incrementPage: () => void;
  resetPage: () => void;
}

export const useConversationListStore = create<ConversationListState>((set) => ({
  conversations: [],
  selectedConversationId: null,
  searchQuery: "",
  filterTab: "all",
  loading: false,
  hasMore: false,
  page: 1,

  setConversations: (conversations) =>
    set({ conversations, page: 1 }),

  appendConversations: (conversations) =>
    set((state) => ({
      conversations: [...state.conversations, ...conversations],
    })),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [conversation, ...state.conversations],
    })),

  updateConversation: (id, update) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, ...update } : c
      ),
    })),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      selectedConversationId:
        state.selectedConversationId === id ? null : state.selectedConversationId,
    })),

  setSelectedConversationId: (id) => set({ selectedConversationId: id }),
  setSearchQuery: (searchQuery) => set({ searchQuery, page: 1 }),
  setFilterTab: (filterTab) => set({ filterTab, page: 1 }),
  setLoading: (loading) => set({ loading }),
  setHasMore: (hasMore) => set({ hasMore }),
  incrementPage: () => set((state) => ({ page: state.page + 1 })),
  resetPage: () => set({ page: 1 }),
}));
