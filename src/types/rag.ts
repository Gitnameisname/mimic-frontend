// RAG (Retrieval-Augmented Generation) 타입 정의
// Phase 11

export interface Citation {
  index: number;
  chunk_id: string;
  document_id: string;
  document_title?: string;
  node_id?: string;
  node_path: string[];
  source_text: string;
  similarity: number;
}

export interface RetrievedChunk {
  chunk_id: string;
  document_id: string;
  document_title?: string;
  node_id?: string;
  source_text: string;
  similarity: number;
  chunk_index: number;
}

export interface RAGConversation {
  id: string;
  user_id: string;
  title?: string;
  document_id?: string;
  created_at: string;
  updated_at: string;
}

export interface RAGMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  context_chunks: RetrievedChunk[];
  token_used?: number;
  model?: string;
  created_at: string;
}

export interface ConversationDetail {
  conversation: RAGConversation;
  messages: RAGMessage[];
}

export interface ConversationListResponse {
  conversations: RAGConversation[];
  total: number;
}

export interface RAGQueryRequest {
  question: string;
  conversation_id?: string;
  document_id?: string;
  stream?: boolean;
}

export interface RAGQueryResponse {
  answer: string;
  citations: Citation[];
  context_chunks: RetrievedChunk[];
  conversation_id: string;
  message_id: string;
  model: string;
  token_used: number;
}

// SSE 이벤트 타입
export type SSEEventType = "start" | "delta" | "citation" | "done" | "error";

export interface SSEEvent {
  event: SSEEventType;
  data: Record<string, unknown>;
}

export interface SSEStartData {
  conversation_id: string;
  message_id: string;
  model: string;
}

export interface SSEDeltaData {
  text: string;
}

export interface SSECitationData {
  citations: Citation[];
  context_chunks: RetrievedChunk[];
}

export interface SSEDoneData {
  message_id: string;
  answer: string;
  token_used: number;
}

export interface SSEErrorData {
  message: string;
}
