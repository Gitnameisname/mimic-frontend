import { api } from "./client";

export interface AgentProposal {
  id: string;
  agent_id: string;
  agent_name: string | null;
  proposal_type: "draft" | "transition";
  reference_id: string;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  reviewed_by: string | null;
  review_notes: string | null;
  review_timestamp: string | null;
  created_at: string;
  updated_at: string | null;
  document_id: string | null;
  document_title: string | null;
  version_title: string | null;
  workflow_status: string | null;
  content_preview?: string;
  content_snapshot?: unknown;
}

export interface ProposalListResponse {
  items: AgentProposal[];
  total: number;
  page: number;
  page_size: number;
  pages?: number;
}

export interface ProposalStats {
  total: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  withdrawn_count: number;
  approval_rate: number;
  draft_proposals: number;
  transition_proposals: number;
}

function extractData<T>(raw: unknown): T {
  const r = raw as { data?: T };
  return (r.data ?? raw) as T;
}

export const proposalsApi = {
  // 내 문서의 에이전트 제안 목록 (일반 사용자)
  listMine: async (params?: {
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<ProposalListResponse> => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    const raw = await api.get<unknown>(`/api/v1/my/proposals?${qs}`);
    return extractData<ProposalListResponse>(raw);
  },

  // 제안 상세 (Admin)
  getAdmin: async (proposalId: string): Promise<AgentProposal> => {
    const raw = await api.get<unknown>(`/api/v1/admin/proposals/${proposalId}`);
    return extractData<AgentProposal>(raw);
  },

  // 제안 목록 (Admin)
  listAdmin: async (params?: {
    status?: string;
    agent_id?: string;
    proposal_type?: string;
    page?: number;
    page_size?: number;
  }): Promise<ProposalListResponse> => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.agent_id) qs.set("agent_id", params.agent_id);
    if (params?.proposal_type) qs.set("proposal_type", params.proposal_type);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.page_size) qs.set("page_size", String(params.page_size));
    const raw = await api.get<unknown>(`/api/v1/admin/proposals?${qs}`);
    return extractData<ProposalListResponse>(raw);
  },

  // 통계 (Admin)
  statsAdmin: async (agentId?: string): Promise<ProposalStats> => {
    const qs = agentId ? `?agent_id=${agentId}` : "";
    const raw = await api.get<unknown>(`/api/v1/admin/proposals/stats${qs}`);
    return extractData<ProposalStats>(raw);
  },

  // Draft 승인
  approveDraft: (draftId: string, body?: { notes?: string }) =>
    api.post<unknown>(`/api/v1/drafts/${draftId}/approve`, body ?? {}),

  // Draft 반려
  rejectDraft: (draftId: string, body: { reason: string }) =>
    api.post<unknown>(`/api/v1/drafts/${draftId}/reject`, body),
};
