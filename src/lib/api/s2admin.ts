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
    api.get<SingleResponse<LLMProvider[]>>("/api/v1/admin/providers"),

  create: (body: ProviderFormData) =>
    api.post<SingleResponse<LLMProvider>>("/api/v1/admin/providers", body),

  update: (id: string, body: Partial<ProviderFormData> & { status?: string }) =>
    api.patch<SingleResponse<LLMProvider>>(
      `/api/v1/admin/providers/${id}`,
      body
    ),

  delete: (id: string) =>
    api.delete<void>(`/api/v1/admin/providers/${id}`),

  test: (id: string) =>
    api.post<SingleResponse<ProviderTestResult>>(
      `/api/v1/admin/providers/${id}/test`,
      {}
    ),

  setDefault: (id: string, type: "llm" | "embedding") =>
    api.post<SingleResponse<LLMProvider>>(
      `/api/v1/admin/providers/${id}/set-default`,
      { type }
    ),
};

export const promptsApi = {
  list: (params?: { page?: number; page_size?: number }) =>
    api.get<PagedResponse<Prompt>>(
      `/api/v1/admin/prompts${buildQueryString(params ?? {})}`
    ),

  get: (id: string) =>
    api.get<SingleResponse<Prompt>>(`/api/v1/admin/prompts/${id}`),

  create: (body: { name: string; description?: string; content: string }) =>
    api.post<SingleResponse<Prompt>>("/api/v1/admin/prompts", body),

  newVersion: (id: string, body: { content: string }) =>
    api.post<SingleResponse<PromptVersion>>(
      `/api/v1/admin/prompts/${id}/versions`,
      body
    ),

  activateVersion: (id: string, versionId: string) =>
    api.post<SingleResponse<Prompt>>(
      `/api/v1/admin/prompts/${id}/versions/${versionId}/activate`,
      {}
    ),

  setABTest: (id: string, config: ABTestConfig | null) =>
    api.patch<SingleResponse<Prompt>>(
      `/api/v1/admin/prompts/${id}/ab-test`,
      { ab_test_config: config }
    ),
};

export const capabilitiesApi = {
  get: () =>
    api.get<SingleResponse<SystemCapabilities>>(
      "/api/v1/system/capabilities"
    ),
};

export const usageApi = {
  getDashboard: (params?: { days?: number; provider?: string }) =>
    api.get<SingleResponse<UsageDashboard>>(
      `/api/v1/admin/usage${buildQueryString(params ?? {})}`
    ),

  exportCsv: (params?: { days?: number }) =>
    `/api/v1/admin/usage/export${buildQueryString(params ?? {})}`,
};

// ── FG6.2: Agents & Scope ──

export const agentsApi = {
  list: (params?: { page?: number; page_size?: number; status?: string }) =>
    api.get<PagedResponse<Agent>>(
      `/api/v1/admin/agents${buildQueryString(params ?? {})}`
    ),

  get: (id: string) =>
    api.get<SingleResponse<AgentDetail>>(`/api/v1/admin/agents/${id}`),

  create: (body: { name: string; description?: string }) =>
    api.post<SingleResponse<Agent>>("/api/v1/admin/agents", body),

  revokeDelegation: (agentId: string, userId: string) =>
    api.delete<SingleResponse<null>>(
      `/api/v1/admin/agents/${agentId}/delegations/${userId}`
    ),

  block: (id: string, body: { duration: "1h" | "24h" | "permanent"; reject_pending?: boolean; reason?: string }) =>
    api.post<SingleResponse<Agent>>(
      `/api/v1/admin/agents/${id}/block`,
      body
    ),

  unblock: (id: string) =>
    api.post<SingleResponse<Agent>>(`/api/v1/admin/agents/${id}/unblock`, {}),

  reissueApiKey: (id: string, body: { expires_at: string }) =>
    api.post<SingleResponse<AgentApiKeyWithSecret>>(
      `/api/v1/admin/agents/${id}/api-keys`,
      body
    ),

  getRateLimits: (id: string) =>
    api.get<SingleResponse<AgentRateLimits>>(
      `/api/v1/admin/agents/${id}/rate-limits`
    ),

  updateRateLimits: (id: string, limits: AgentRateLimits) =>
    api.patch<SingleResponse<AgentRateLimits>>(
      `/api/v1/admin/agents/${id}/rate-limits`,
      limits
    ),

  getAuditHistory: (
    id: string,
    params?: { start_date?: string; end_date?: string; action_type?: string; page?: number; page_size?: number }
  ) =>
    api.get<PagedResponse<AuditEvent>>(
      `/api/v1/admin/agents/${id}/audit${buildQueryString(params ?? {})}`
    ),
};

export const scopeProfilesApi = {
  list: (params?: { page?: number; page_size?: number }) =>
    api.get<PagedResponse<ScopeProfile>>(
      `/api/v1/admin/scope-profiles${buildQueryString(params ?? {})}`
    ),

  get: (id: string) =>
    api.get<SingleResponse<ScopeProfileDetail>>(
      `/api/v1/admin/scope-profiles/${id}`
    ),

  create: (body: { name: string; description?: string }) =>
    api.post<SingleResponse<ScopeProfile>>(
      "/api/v1/admin/scope-profiles",
      body
    ),

  update: (id: string, body: { name?: string; description?: string }) =>
    api.patch<SingleResponse<ScopeProfile>>(
      `/api/v1/admin/scope-profiles/${id}`,
      body
    ),

  delete: (id: string) =>
    api.delete<SingleResponse<null>>(
      `/api/v1/admin/scope-profiles/${id}`
    ),

  addScope: (id: string, scope: ScopeEntry) =>
    api.post<SingleResponse<ScopeProfileDetail>>(
      `/api/v1/admin/scope-profiles/${id}/scopes`,
      scope
    ),

  updateScope: (id: string, scopeName: string, scope: ScopeEntry) =>
    api.patch<SingleResponse<ScopeProfileDetail>>(
      `/api/v1/admin/scope-profiles/${id}/scopes/${scopeName}`,
      scope
    ),

  deleteScope: (id: string, scopeName: string) =>
    api.delete<SingleResponse<null>>(
      `/api/v1/admin/scope-profiles/${id}/scopes/${scopeName}`
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
      `/api/v1/admin/proposals${buildQueryString(params ?? {})}`
    ),

  get: (id: string) =>
    api.get<SingleResponse<ProposalDetail>>(
      `/api/v1/admin/proposals/${id}`
    ),

  approve: (id: string, feedback?: string) =>
    api.post<SingleResponse<Proposal>>(
      `/api/v1/admin/proposals/${id}/approve`,
      { feedback }
    ),

  reject: (id: string, feedback?: string) =>
    api.post<SingleResponse<Proposal>>(
      `/api/v1/admin/proposals/${id}/reject`,
      { feedback }
    ),

  batchApprove: (ids: string[]) =>
    api.post<SingleResponse<{ approved: number }>>(
      "/api/v1/admin/proposals/batch-approve",
      { ids }
    ),

  batchReject: (ids: string[], feedback?: string) =>
    api.post<SingleResponse<{ rejected: number }>>(
      "/api/v1/admin/proposals/batch-reject",
      { ids, feedback }
    ),

  batchRollback: (ids: string[], original_action: "approve" | "reject") =>
    api.post<SingleResponse<{ rolled_back: number; skipped: number; skipped_ids: string[] }>>(
      "/api/v1/admin/proposals/batch-rollback",
      { ids, original_action }
    ),
};

export const agentActivityApi = {
  getDashboard: (params?: { days?: number }) =>
    api.get<SingleResponse<AgentActivityDashboard>>(
      `/api/v1/admin/agent-activity${buildQueryString(params ?? {})}`
    ),
};

// ── FG6.3: Evaluation & Extraction (Skeleton) ──

export const goldenSetsApi = {
  list: (params?: { page?: number; page_size?: number }) =>
    api.get<PagedResponse<GoldenSet>>(
      `/api/v1/admin/golden-sets${buildQueryString(params ?? {})}`
    ),

  get: (id: string) =>
    api.get<SingleResponse<GoldenSet & { items: GoldenSetItem[] }>>(
      `/api/v1/admin/golden-sets/${id}`
    ),

  create: (body: { name: string; description?: string }) =>
    api.post<SingleResponse<GoldenSet>>(
      "/api/v1/admin/golden-sets",
      body
    ),
};

export const evaluationsApi = {
  listRuns: (params?: { page?: number; page_size?: number; golden_set_id?: string }) =>
    api.get<PagedResponse<EvaluationRun>>(
      `/api/v1/admin/evaluation-runs${buildQueryString(params ?? {})}`
    ),

  getMetricSeries: (params?: { days?: number }) =>
    api.get<SingleResponse<EvaluationMetricSeries[]>>(
      `/api/v1/admin/evaluation-runs/metrics${buildQueryString(params ?? {})}`
    ),
};

export const extractionSchemasApi = {
  list: () =>
    api.get<SingleResponse<ExtractionSchema[]>>(
      "/api/v1/admin/extraction-schemas"
    ),

  get: (docTypeCode: string) =>
    api.get<SingleResponse<ExtractionSchema & { fields: ExtractionSchemaField[] }>>(
      `/api/v1/admin/extraction-schemas/${docTypeCode}`
    ),
};

export const extractionQueueApi = {
  list: (params?: { page?: number; page_size?: number; document_type?: string; status?: string }) =>
    api.get<PagedResponse<ExtractionResult>>(
      `/api/v1/admin/extraction-results${buildQueryString(params ?? {})}`
    ),

  get: (id: string) =>
    api.get<SingleResponse<ExtractionResultDetail>>(
      `/api/v1/admin/extraction-results/${id}`
    ),

  approve: (id: string, overrides?: Record<string, unknown>) =>
    api.post<SingleResponse<ExtractionResult>>(
      `/api/v1/admin/extraction-results/${id}/approve`,
      { overrides }
    ),

  reject: (id: string, reason?: string) =>
    api.post<SingleResponse<ExtractionResult>>(
      `/api/v1/admin/extraction-results/${id}/reject`,
      { reason }
    ),
};
