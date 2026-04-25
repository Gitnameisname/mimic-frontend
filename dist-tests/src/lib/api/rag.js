"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ragApi = void 0;
exports.queryStream = queryStream;
const useAuthz_1 = require("@/hooks/useAuthz");
const AuthContext_1 = require("@/contexts/AuthContext");
const client_1 = require("./client");
const IS_DEV = process.env.NODE_ENV === "development";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8050";
// ---------------------------------------------------------------------------
// 비스트리밍 API
// ---------------------------------------------------------------------------
exports.ragApi = {
    // 단건 질의 (비스트리밍)
    query: (body) => client_1.api.post("/api/v1/rag/query", body),
    // 대화 세션 생성
    createConversation: (body) => client_1.api.post("/api/v1/rag/conversations", body),
    // 대화 목록 조회
    listConversations: (page = 1, limit = 20) => client_1.api.get(`/api/v1/rag/conversations?page=${page}&limit=${limit}`),
    // 대화 상세
    getConversation: (id) => client_1.api.get(`/api/v1/rag/conversations/${id}`),
    // 메시지 목록
    listMessages: (conversationId) => client_1.api.get(`/api/v1/rag/conversations/${conversationId}/messages`),
    // 대화 삭제
    deleteConversation: (id) => client_1.api.delete(`/api/v1/rag/conversations/${id}`),
};
/**
 * RAG SSE 스트리밍 질의.
 * AbortController를 반환 — 취소 시 abort() 호출.
 */
function queryStream(body, callbacks) {
    const controller = new AbortController();
    (async () => {
        try {
            const headers = {
                "Content-Type": "application/json",
                Accept: "text/event-stream",
            };
            const at = (0, AuthContext_1.getAccessToken)();
            if (at) {
                headers["Authorization"] = `Bearer ${at}`;
            }
            else if (IS_DEV) {
                const { role, actorId } = useAuthz_1.useAuthzStore.getState();
                if (actorId)
                    headers["X-Actor-Id"] = actorId;
                if (role)
                    headers["X-Actor-Role"] = role;
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
                }
                catch { }
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
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                    if (!line.startsWith("data: "))
                        continue;
                    try {
                        const payload = JSON.parse(line.slice(6));
                        const d = payload.data;
                        switch (payload.event) {
                            case "start":
                                callbacks.onStart?.(d);
                                break;
                            case "delta":
                                callbacks.onDelta(d.text);
                                break;
                            case "citation":
                                callbacks.onCitation?.(d);
                                break;
                            case "done":
                                callbacks.onDone?.(d);
                                break;
                            case "error":
                                callbacks.onError?.(d.message);
                                break;
                        }
                    }
                    catch {
                        // JSON 파싱 실패 무시
                    }
                }
            }
        }
        catch (err) {
            if (err instanceof DOMException && err.name === "AbortError")
                return;
            callbacks.onError?.(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
        }
    })();
    return controller;
}
