import { api } from "./client";
import { buildQueryString } from "@/lib/utils";
import type {
  LLMProvider,
  ProviderTestResult,
  Prompt,
  PromptVersion,
  ABTestConfig,
  SystemCapabilities,
  UsageDashboard,
  Agent,
  AgentDetail,
  AgentRateLimits,
  AgentApiKeyWithSecret,
  AuditEvent,
  ScopeProfile,
  ScopeProfileDetail,
  ScopeEntry,
  Proposal,
  ProposalDetail,
  AgentActivityDashboard,
  GoldenSet,
  GoldenSetItem,
  EvaluationRun,
  EvaluationMetricSeries,
  ExtractionSchema,
  ExtractionSchemaField,
  ExtractionResult,
  ExtractionResultDetail,
  PagedResponse,
  SingleResponse,
} from "@/types/s2admin";

// [보안 임시 구현] localStorage 기반 dev 헤더 — S3 Phase 1에서 JWT Bearer로 전환 예정
// TODO(S3-Phase1): Authorization: Bearer <JWT> 헤더로 교체, localStorage 의존성 제거
function adminHeaders(): RequestInit {
  const headers: Record<string, string> = {};
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem("mimir-authz") : null;
    if (raw) {
      const { state } = JSON.parse(raw) as { state?: { actorId?: string; role?: string } };
      if (state?.actorId) headers["X-Actor-Id"] = state.actorId;
      if (state?.role) headers["X-Actor-Role"] = state.role;
    }
  } catch {
    // ignore
  }
  return { headers };
}

// ── FG6.1: AI Platform ──

export interface ProviderFormData {
  name: string;
  type: "llm" | "embedding";
  model_name: string;
  api_base_url?: string;
  api_key?: string;
  description?: string;
  is_default?: boolean;
}

export const providersApi = {
  list: () =>
    api.get<SingleResponse<LLMProvider[]>>("/api/v1/admin/providers", adminHeaders()),

  create: (body: ProviderFormData) =>
    api.post<SingleResponse<LLMProvider>>("/api/v1/admin/providers", body, adminHeaders()),

  update: (id: string, body: Partial<ProviderFormData> & { status?: string }) =>
    api.patch<SingleResponse<LLMProvider>>(
      `/api/v1/admin/providers/${id}`,
      body,
      adminHeaders()
    ),

  delete: (id: string) =>
    api.delete<void>(`/api/v1/admin/providers/${id}`, adminHeaders()),

  test: (id: string) =>
    api.post<SingleResponse<ProviderTestResult>>(
      `/api/v1/admin/providers/${id}/test`,
      {},
      adminHeaders()
    ),

  setDefault: (id: string, type: "llm" | "embedding") =>
    api.post<SingleResponse<LLMProvider>>(
      `/api/v1/admin/providers/${id}/set-default`,
      { type },
      adminHeaders()
    ),
};

export const promptsApi = {
  list: (params?: { page?: number; page_size?: number }) =>
    api.get<PagedResponse<Prompt>>(
      `/api/v1/admin/prompts${buildQueryString(params ?? {})}`,
      adminHeaders()
    ),

  get: (id: string) =>
    api.get<SingleResponse<Prompt>>(`/api/v1/admin/prompts/${id}`, adminHeaders()),

  create: (body: { name: string; description?: string; content: string }) =>
    api.post<SingleResponse<Prompt>>("/api/v1/admin/prompts", body, adminHeaders()),

  newVersion: (id: string, body: { content: string }) =>
    api.post<SingleResponse<PromptVersion>>(
      `/api/v1/admin/prompts/${id}/versions`,
      body,
      adminHeaders()
    ),

  activateVersion: (id: string, versionId: string) =>
    api.post<SingleResponse<Prompt>>(
      `/api/v1/admin/prompts/${id}/versions/${versionId}/activate`,
      {},
      adminHeaders()
    ),

  setABTest: (id: string, config: ABTestConfig | null) =>
    api.patch<SingleResponse<Prompt>>(
      `/api/v1/admin/prompts/${id}/ab-test`,
      { ab_test_config: config },
      adminHeaders()
    ),
};

export const capabilitiesApi = {
  get: () =>
    api.get<SingleResponse<SystemCapabilities>>(
      "/api/v1/system/capabilities",
      adminHeaders()
    ),
};

export const usageApi = {
  getDashboard: (params?: { days?: number; provider?: string }) =>
    api.get<SingleResponse<UsageDashboard>>(
      `/api/v1/admin/usage${buildQueryString(params ?? {})}`,
      adminHeaders()
    ),

  exportCsv: (params?: { days?: number }) =>
    `/api/v1/admin/usage/export${buildQueryString(params ?? {})}`,
};

// ── FG6.2: Agents & Scope ──

export const agentsApi = {
  list: (params?: { page?: number; page_size?: number; status?: string }) =>
    api.get<PagedResponse<Agent>>(
      `/api/v1/admin/agents${buildQueryString(params ?? {})}`,
      adminHeaders()
    ),

  get: (id: string) =>
    api.get<SingleResponse<AgentDetail>>(`/api/v1/admin/agents/${id}`, adminHeaders()),

  create: (body: { name: string; description?: string }) =>
    api.post<SingleResponse<Agent>>("/api/v1/admin/agents", body, adminHeaders()),

  revokeDelegation: (agentId: string, userId: string) =>
    api.delete<SingleResponse<null>>(
      `/api/v1/admin/agents/${agentId}/delegations/${userId}`,
      adminHeaders()
    ),

  block: (id: string, body: { duration: "1h" | "24h" | "permanent"; reject_pending?: boolean; reason?: string }) =>
    api.post<SingleResponse<Agent>>(
      `/api/v1/admin/agents/${id}/block`,
      body,
      adminHeaders()
    ),

  unblock: (id: string) =>
    api.post<SingleResponse<Agent>>(`/api/v1/admin/agents/${id}/unblock`, {}, adminHeaders()),

  reissueApiKey: (id: string, body: { expires_at: string }) =>
    api.post<SingleResponse<AgentApiKeyWithSecret>>(
      `/api/v1/admin/agents/${id}/api-keys`,
      body,
      adminHeaders()
    ),

  getRateLimits: (id: string) =>
    api.get<SingleResponse<AgentRateLimits>>(
      `/api/v1/admin/agents/${id}/rate-limits`,
      adminHeaders()
    ),

  updateRateLimits: (id: string, limits: AgentRateLimits) =>
    api.patch<SingleResponse<AgentRateLimits>>(
      `/api/v1/admin/agents/${id}/rate-limits`,
      limits,
      adminHeaders()
    ),

  getAuditHistory: (
    id: string,
    params?: { start_date?: string; end_date?: string; action_type?: string; page?: number; page_size?: number }
  ) =>
    api.get<PagedResponse<AuditEvent>>(
      `/api/v1/admin/agents/${id}/audit${buildQueryString(params ?? {})}`,
      adminHeaders()
    ),
};

export const scopeProfilesApi = {
  list: (params?: { page?: number; page_size?: number }) =>
    api.get<PagedResponse<ScopeProfile>>(
      `/api/v1/admin/scope-profiles${buildQueryString(params ?? {})}`,
      adminHeaders()
    ),

  get: (id: string) =>
    api.get<SingleResponse<ScopeProfileDetail>>(
      `/api/v1/admin/scope-profiles/${id}`,
      adminHeaders()
    ),

  create: (body: { name: string; description?: string }) =>
    api.post<SingleResponse<ScopeProfile>>(
      "/api/v1/admin/scope-profiles",
      body,
      adminHeaders()
    ),

  update: (id: string, body: { name?: string; description?: string }) =>
    api.patch<SingleResponse<ScopeProfile>>(
      `/api/v1/admin/scope-profiles/${id}`,
      body,
      adminHeaders()
    ),

  delete: (id: string) =>
    api.delete<SingleResponse<null>>(
      `/api/v1/admin/scope-profiles/${id}`,
      adminHeaders()
    ),

  addScope: (id: string, scope: ScopeEntry) =>
    api.post<SingleResponse<ScopeProfileDetail>>(
      `/api/v1/admin/scope-profiles/${id}/scopes`,
      scope,
      adminHeaders()
    ),

  updateScope: (id: string, scopeName: string, scope: ScopeEntry) =>
    api.patch<SingleResponse<ScopeProfileDetail>>(
      `/api/v1/admin/scope-profiles/${id}/scopes/${scopeName}`,
      scope,
      adminHeaders()
    ),

  deleteScope: (id: string, scopeName: string) =>
    api.delete<SingleResponse<null>>(
      `/api/v1/admin/scope-profiles/${id}/scopes/${scopeName}`,
      adminHeaders()
    ),
};

export const proposalsApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    agent_id?: string;
    document_id?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }) =>
    api.get<PagedResponse<Proposal>>(
      `/api/v1/admin/proposals${buildQueryString(params ?? {})}`,
      adminHeaders()
    ),

  get: (id: string) =>
    api.get<SingleResponse<ProposalDetail>>(
      `/api/v1/admin/proposals/${id}`,
      adminHeaders()
    ),

  approve: (id: string, feedback?: string) =>
    api.post<SingleResponse<Proposal>>(
      `/api/v1/admin/proposals/${id}/approve`,
      { feedback },
      adminHeaders()
    ),

  reject: (id: string, feedback?: string) =>
    api.post<SingleResponse<Proposal>>(
      `/api/v1/admin/proposals/${id}/reject`,
      { feedback },
      adminHeaders()
    ),

  batchApprove: (ids: string[]) =>
    api.post<SingleResponse<{ approved: number }>>(
      "/api/v1/admin/proposals/batch-approve",
      { ids },
      adminHeaders()
    ),

  batchReject: (ids: string[], feedback?: string) =>
    api.post<SingleResponse<{ rejected: number }>>(
      "/api/v1/admin/proposals/batch-reject",
      { ids, feedback },
      adminHeaders()
    ),

  batchRollback: (ids: string[], original_action: "approve" | "reject") =>
    api.post<SingleResponse<{ rolled_back: number; skipped: number; skipped_ids: string[] }>>(
      "/api/v1/admin/proposals/batch-rollback",
      { ids, original_action },
      adminHeaders()
    ),
};

export const agentActivityApi = {
  getDashboard: (params?: { days?: number }) =>
    api.get<SingleResponse<AgentActivityDashboard>>(
      `/api/v1/admin/agent-activity${buildQueryString(params ?? {})}`,
      adminHeaders()
    ),
};

// ── FG6.3: Evaluation & Extraction (Skeleton) ──

export const goldenSetsApi = {
  list: (params?: { page?: number; page_size?: number }) =>
    api.get<PagedResponse<GoldenSet>>(
      `/api/v1/admin/golden-sets${buildQueryString(params ?? {})}`,
      adminHeaders()
    ),

  get: (id: string) =>
    api.get<SingleResponse<GoldenSet & { items: GoldenSetItem[] }>>(
      `/api/v1/admin/golden-sets/${id}`,
      adminHeaders()
    ),

  create: (body: { name: string; description?: string }) =>
    api.post<SingleResponse<GoldenSet>>(
      "/api/v1/admin/golden-sets",
      body,
      adminHeaders()
    ),
};

export const evaluationsApi = {
  listRuns: (params?: { page?: number; page_size?: number; golden_set_id?: string }) =>
    api.get<PagedResponse<EvaluationRun>>(
      `/api/v1/admin/evaluation-runs${buildQueryString(params ?? {})}`,
      adminHeaders()
    ),

  getMetricSeries: (params?: { days?: number }) =>
    api.get<SingleResponse<EvaluationMetricSeries[]>>(
      `/api/v1/admin/evaluation-runs/metrics${buildQueryString(params ?? {})}`,
      adminHeaders()
    ),
};

export const extractionSchemasApi = {
  list: () =>
    api.get<SingleResponse<ExtractionSchema[]>>(
      "/api/v1/admin/extraction-schemas",
      adminHeaders()
    ),

  get: (docTypeCode: string) =>
    api.get<SingleResponse<ExtractionSchema & { fields: ExtractionSchemaField[] }>>(
      `/api/v1/admin/extraction-schemas/${docTypeCode}`,
      adminHeaders()
    ),
};

export const extractionQueueApi = {
  list: (params?: { page?: number; page_size?: number; document_type?: string; status?: string }) =>
    api.get<PagedResponse<ExtractionResult>>(
      `/api/v1/admin/extraction-results${buildQueryString(params ?? {})}`,
      adminHeaders()
    ),

  get: (id: string) =>
    api.get<SingleResponse<ExtractionResultDetail>>(
      `/api/v1/admin/extraction-results/${id}`,
      adminHeaders()
    ),

  approve: (id: string, overrides?: Record<string, unknown>) =>
    api.post<SingleResponse<ExtractionResult>>(
      `/api/v1/admin/extraction-results/${id}/approve`,
      { overrides },
      adminHeaders()
    ),

  reject: (id: string, reason?: string) =>
    api.post<SingleResponse<ExtractionResult>>(
      `/api/v1/admin/extraction-results/${id}/reject`,
      { reason },
      adminHeaders()
    ),
};
