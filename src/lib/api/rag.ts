import { useAuthzStore } from "@/hooks/useAuthz";
import { getAccessToken } from "@/contexts/AuthContext";
import type {
  RAGConversation,
  RAGMessage,
  RAGQueryRequest,
  RAGQueryResponse,
  ConversationDetail,
  ConversationListResponse,
  SSEEvent,
  SSEStartData,
  SSEDeltaData,
  SSECitationData,
  SSEDoneData,
  SSEErrorData,
} from "@/types/rag";
import { api } from "./client";

const IS_DEV = process.env.NODE_ENV === "development";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8050";

// ---------------------------------------------------------------------------
// 비스트리밍 API
// ---------------------------------------------------------------------------

export const ragApi = {
  // 단건 질의 (비스트리밍)
  query: (body: RAGQueryRequest & { stream: false }) =>
    api.post<{ data: RAGQueryResponse }>("/api/v1/rag/query", body),

  // 대화 세션 생성
  createConversation: (body: { title?: string; document_id?: string }) =>
    api.post<{ data: RAGConversation }>("/api/v1/rag/conversations", body),

  // 대화 목록 조회
  listConversations: (page = 1, limit = 20) =>
    api.get<{ data: ConversationListResponse }>(
      `/api/v1/rag/conversations?page=${page}&limit=${limit}`
    ),

  // 대화 상세
  getConversation: (id: string) =>
    api.get<{ data: ConversationDetail }>(`/api/v1/rag/conversations/${id}`),

  // 메시지 목록
  listMessages: (conversationId: string) =>
    api.get<{ data: { messages: RAGMessage[] } }>(
      `/api/v1/rag/conversations/${conversationId}/messages`
    ),

  // 대화 삭제
  deleteConversation: (id: string) =>
    api.delete<void>(`/api/v1/rag/conversations/${id}`),
};

// ---------------------------------------------------------------------------
// SSE 스트리밍
// ---------------------------------------------------------------------------

export interface StreamCallbacks {
  onStart?: (data: SSEStartData) => void;
  onDelta: (text: string) => void;
  onCitation?: (data: SSECitationData) => void;
  onDone?: (data: SSEDoneData) => void;
  onError?: (message: string) => void;
}

/**
 * RAG SSE 스트리밍 질의.
 * AbortController를 반환 — 취소 시 abort() 호출.
 */
export function queryStream(
  body: RAGQueryRequest,
  callbacks: StreamCallbacks
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      };

      const at = getAccessToken();
      if (at) {
        headers["Authorization"] = `Bearer ${at}`;
      } else if (IS_DEV) {
        const { role, actorId } = useAuthzStore.getState();
        if (actorId) headers["X-Actor-Id"] = actorId;
        if (role) headers["X-Actor-Role"] = role;
      }

      const res = await fetch(`${API_BASE}/api/v1/rag/query`, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...body, stream: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`;
        try {
          const data = await res.json();
          errMsg = data?.error?.message ?? data?.detail ?? errMsg;
        } catch {}
        callbacks.onError?.(errMsg);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        callbacks.onError?.("스트림을 읽을 수 없습니다.");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload: SSEEvent = JSON.parse(line.slice(6));
            const d = payload.data as unknown;
            switch (payload.event) {
              case "start":
                callbacks.onStart?.(d as SSEStartData);
                break;
              case "delta":
                callbacks.onDelta((d as SSEDeltaData).text);
                break;
              case "citation":
                callbacks.onCitation?.(d as SSECitationData);
                break;
              case "done":
                callbacks.onDone?.(d as SSEDoneData);
                break;
              case "error":
                callbacks.onError?.((d as SSEErrorData).message);
                break;
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      callbacks.onError?.(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
    }
  })();

  return controller;
}
