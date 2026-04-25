/**
 * S2 대화 도메인 API 클라이언트.
 *
 * 연결 엔드포인트:
 *  POST   /api/v1/conversations                  대화 생성
 *  GET    /api/v1/conversations/:id              대화 조회
 *  PATCH  /api/v1/conversations/:id              대화 수정
 *  DELETE /api/v1/conversations/:id              대화 삭제
 *  GET    /api/v1/conversations/:id/turns         턴 목록
 *  POST   /api/v1/rag/answer                     S2 RAG 답변
 */

import { toQueryString } from "@/lib/utils/url";
import { api } from "./client";
import type {
  Conversation,
  ConversationCreateRequest,
  ConversationUpdateRequest,
  ConversationListResponse,
  TurnListResponse,
  RAGAnswerRequest,
  RAGAnswerResponse,
} from "@/types/conversation";

// ---------------------------------------------------------------------------
// 내부 응답 래퍼 (SuccessResponse envelope)
// ---------------------------------------------------------------------------

interface Envelope<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

function unwrap<T>(res: Envelope<T>): T {
  if (!res.success) {
    throw new Error(res.error ?? "API 요청이 실패했습니다.");
  }
  return res.data;
}

// ---------------------------------------------------------------------------
// Conversation CRUD
// ---------------------------------------------------------------------------

export const conversationApi = {
  /** 새 대화 생성. */
  create: async (body: ConversationCreateRequest = {}): Promise<Conversation> => {
    const res = await api.post<Envelope<Conversation>>("/api/v1/conversations", body);
    return unwrap(res);
  },

  /** 대화 목록 조회 (페이지네이션 + 필터 + 검색). */
  list: async (
    page = 1,
    limit = 20,
    options: { status?: string; search?: string } = {}
  ): Promise<ConversationListResponse> => {
    const path = `/api/v1/conversations${toQueryString({
      page,
      limit,
      status: options.status,
      search: options.search,
    })}`;
    const res = await api.get<Envelope<ConversationListResponse>>(path);
    return unwrap(res);
  },

  /** 대화 아카이브 (status → archived). */
  archive: async (id: string): Promise<Conversation> => {
    const res = await api.post<Envelope<Conversation>>(
      `/api/v1/conversations/${id}/archive`
    );
    return unwrap(res);
  },

  /** 대화 내보내기 (JSON). */
  exportJson: async (id: string): Promise<Record<string, unknown>> => {
    const res = await api.get<Envelope<Record<string, unknown>>>(
      `/api/v1/conversations/${id}/export`
    );
    return unwrap(res);
  },

  /** 대화 단건 조회. */
  get: async (id: string): Promise<Conversation> => {
    const res = await api.get<Envelope<Conversation>>(`/api/v1/conversations/${id}`);
    return unwrap(res);
  },

  /** 대화 수정 (title, status). */
  update: async (id: string, body: ConversationUpdateRequest): Promise<Conversation> => {
    const res = await api.patch<Envelope<Conversation>>(`/api/v1/conversations/${id}`, body);
    return unwrap(res);
  },

  /** 대화 삭제 (soft delete). */
  delete: async (id: string): Promise<void> => {
    await api.delete<void>(`/api/v1/conversations/${id}`);
  },

  /** 대화의 턴 목록 조회. */
  listTurns: async (conversationId: string): Promise<TurnListResponse> => {
    const res = await api.get<Envelope<TurnListResponse>>(
      `/api/v1/conversations/${conversationId}/turns`
    );
    return unwrap(res);
  },
};

// ---------------------------------------------------------------------------
// S2 RAG 답변 (JSON, non-streaming)
// ---------------------------------------------------------------------------

export const ragAnswerApi = {
  /**
   * S2 멀티턴 RAG 답변.
   * conversation_id 없으면 단발 쿼리 (S1 하위호환).
   */
  answer: async (body: RAGAnswerRequest): Promise<RAGAnswerResponse> => {
    const res = await api.post<Envelope<RAGAnswerResponse>>("/api/v1/rag/answer", body);
    return unwrap(res);
  },
};
