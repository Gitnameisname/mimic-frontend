/**
 * S2 Phase 3 대화 도메인 타입 정의.
 *
 * S2 /api/v1/conversations/* 엔드포인트에서 사용하는 도메인 모델.
 * S1 rag.ts의 RAGConversation/RAGMessage와 별개.
 */

// ---------------------------------------------------------------------------
// Conversation (대화 세션)
// ---------------------------------------------------------------------------

export interface Conversation {
  id: string;
  owner_id: string;
  organization_id: string;
  title: string;
  status: "active" | "archived" | "expired" | "deleted";
  metadata?: Record<string, unknown>;
  retention_days: number;
  access_level: "private" | "organization" | "public";
  created_at: string;
  updated_at: string;
  expires_at?: string | null;
}

// ---------------------------------------------------------------------------
// Turn (대화 내 질문-응답 쌍)
// ---------------------------------------------------------------------------

export interface Turn {
  id: string;
  conversation_id: string;
  turn_number: number;
  user_message: string;
  assistant_response: string;
  retrieval_metadata?: TurnRetrievalMetadata;
  created_at: string;
}

export interface TurnRetrievalMetadata {
  query_rewritten?: string | null;
  retrieval_time_ms?: number;
  context_window_turns?: string[];
  citations?: TurnCitation[];
}

export interface TurnCitation {
  index: number;
  snippet: string;
  document_id: string;
  content_hash: string;
}

// ---------------------------------------------------------------------------
// Message (UI 렌더링용 메시지 — Turn을 user/assistant 쌍으로 분해)
// ---------------------------------------------------------------------------

export interface Message {
  id: string;
  turn_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  citations?: RAGCitationInfo[];
  isStreaming?: boolean;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// RAG Citation (S2 5-tuple 기반)
// ---------------------------------------------------------------------------

export interface RAGCitationInfo {
  index: number;
  snippet: string;
  citation: {
    document_id: string;
    version_id: string;
    node_id?: string | null;
    span_offset?: number | null;
    content_hash: string;
  };
}

// ---------------------------------------------------------------------------
// API 요청/응답
// ---------------------------------------------------------------------------

export interface ConversationCreateRequest {
  title?: string;
}

export interface ConversationUpdateRequest {
  title?: string;
  status?: "active" | "archived";
}

export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
}

export interface TurnListResponse {
  turns: Turn[];
  total: number;
}

export interface RAGAnswerRequest {
  query: string;
  top_k?: number;
  document_type?: string;
  conversation_id?: string;
  actor_type?: "user" | "agent";
}

export interface RAGAnswerResponse {
  answer: string;
  citations: RAGCitationInfo[];
  rewritten_query?: string | null;
  context_compressed: boolean;
  turn_number: number;
  turn_id?: string | null;
}
