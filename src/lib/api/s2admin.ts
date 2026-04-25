import { api } from "./client";
import { toQueryString } from "@/lib/utils/url";
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
  GoldenSetDetail,
  GoldenSetDomain,
  GoldenSetStatus,
  GoldenSetVersionInfo,
  GoldenSetImportResult,
  SourceRef,
  Citation5Tuple,
  EvaluationRun,
  EvaluationRunDetail,
  EvaluationCompareResult,
  ExtractionSchema,
  ExtractionSchemaField,
  ExtractionSchemaVersion,
  ExtractionSchemaDiff,
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
  embed_endpoint?: string;
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
      `/api/v1/admin/prompts${toQueryString(params ?? {})}`
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
      "/api/v1/admin/system/capabilities"
    ),
};

export const usageApi = {
  getDashboard: (params?: { days?: number; provider?: string }) =>
    api.get<SingleResponse<UsageDashboard>>(
      `/api/v1/admin/usage${toQueryString(params ?? {})}`
    ),

  exportCsv: (params?: { days?: number }) =>
    `/api/v1/admin/usage/export${toQueryString(params ?? {})}`,
};

// ── FG6.2: Agents & Scope ──

export const agentsApi = {
  list: (params?: { page?: number; page_size?: number; status?: string }) =>
    api.get<PagedResponse<Agent>>(
      `/api/v1/admin/agents${toQueryString(params ?? {})}`
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
      `/api/v1/admin/agents/${id}/audit${toQueryString(params ?? {})}`
    ),
};

export const scopeProfilesApi = {
  list: (params?: { page?: number; page_size?: number }) =>
    api.get<PagedResponse<ScopeProfile>>(
      `/api/v1/admin/scope-profiles${toQueryString(params ?? {})}`
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
      `/api/v1/admin/proposals${toQueryString(params ?? {})}`
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
      `/api/v1/admin/agent-activity${toQueryString(params ?? {})}`
    ),
};

// ── FG6.3 / Phase 7 FG7.1: Golden Set 관리 (실 API 연결) ──

// 백엔드 `backend/app/api/v1/golden_sets.py` 와 1:1 매핑.
// list_golden_sets 는 offset/limit 로 페이지네이션하므로 프론트에서 그 파라미터명을 직접 사용한다.

export interface GoldenSetCreateFormData {
  name: string;
  description?: string;
  domain?: GoldenSetDomain;
  extra_metadata?: Record<string, unknown>;
}

export interface GoldenSetUpdateFormData {
  name?: string;
  description?: string;
  domain?: GoldenSetDomain;
  status?: GoldenSetStatus;
  extra_metadata?: Record<string, unknown>;
}

export interface GoldenItemCreateFormData {
  question: string;
  expected_answer: string;
  expected_source_docs: SourceRef[];
  expected_citations?: Citation5Tuple[];
  notes?: string;
}

export interface GoldenItemUpdateFormData {
  question?: string;
  expected_answer?: string;
  expected_source_docs?: SourceRef[];
  expected_citations?: Citation5Tuple[];
  notes?: string;
}

// 경로 정정(2026-04-20): 백엔드 router.py L107 기준 prefix 는 `/golden-sets` 이며 admin 하위가 아님.
// 따라서 전체 호출부를 `/api/v1/golden-sets*` 로 교체한다.  ACL 은 scope_profile_id 바인딩으로 보장되므로
// admin 경로가 아니어도 S2 ⑥ 원칙은 유지된다.
export const goldenSetsApi = {
  list: (params?: { offset?: number; limit?: number; domain?: string; status?: string }) =>
    api.get<PagedResponse<GoldenSet>>(
      `/api/v1/golden-sets${toQueryString(params ?? {})}`
    ),

  get: (id: string) =>
    api.get<SingleResponse<GoldenSetDetail>>(
      `/api/v1/golden-sets/${id}`
    ),

  create: (body: GoldenSetCreateFormData) =>
    api.post<SingleResponse<GoldenSet>>(
      "/api/v1/golden-sets",
      body
    ),

  update: (id: string, body: GoldenSetUpdateFormData) =>
    api.put<SingleResponse<GoldenSet>>(
      `/api/v1/golden-sets/${id}`,
      body
    ),

  delete: (id: string) =>
    api.delete<void>(`/api/v1/golden-sets/${id}`),

  listItems: (id: string, params?: { offset?: number; limit?: number }) =>
    api.get<PagedResponse<GoldenSetItem>>(
      `/api/v1/golden-sets/${id}/items${toQueryString(params ?? {})}`
    ),

  addItem: (id: string, body: GoldenItemCreateFormData) =>
    api.post<SingleResponse<GoldenSetItem>>(
      `/api/v1/golden-sets/${id}/items`,
      body
    ),

  updateItem: (id: string, itemId: string, body: GoldenItemUpdateFormData) =>
    api.put<SingleResponse<GoldenSetItem>>(
      `/api/v1/golden-sets/${id}/items/${itemId}`,
      body
    ),

  deleteItem: (id: string, itemId: string) =>
    api.delete<void>(`/api/v1/golden-sets/${id}/items/${itemId}`),

  versions: (id: string) =>
    api.get<SingleResponse<GoldenSetVersionInfo[]>>(
      `/api/v1/golden-sets/${id}/versions`
    ),

  // Import/Export: FormData 기반 업로드 + JSON 다운로드
  // Export 는 같은 JSON API 계약(success_response) 으로 내려오므로 그대로 data 사용.
  exportJson: (id: string) =>
    api.get<SingleResponse<Record<string, unknown>>>(
      `/api/v1/golden-sets/${id}/export`
    ),

  importJson: (id: string, file: File) => {
    // 주의: 백엔드는 application/json, text/json, text/plain MIME 만 수락하며 확장자도 .json 이어야 한다.
    const form = new FormData();
    form.append("file", file);
    return api.post<SingleResponse<GoldenSetImportResult>>(
      `/api/v1/golden-sets/${id}/import`,
      form
    );
  },
};

// Phase 7 FG7.2: 평가 실행 API.
// 경로는 /api/v1/evaluations (admin prefix 아님). ACL 은 ActorContext 의 scope_profile_id 로 보장.
export const evaluationsApi = {
  listRuns: (params?: { offset?: number; limit?: number; status?: string }) =>
    api.get<PagedResponse<EvaluationRun>>(
      `/api/v1/evaluations${toQueryString(params ?? {})}`
    ),

  get: (evalId: string) =>
    api.get<SingleResponse<EvaluationRunDetail>>(
      `/api/v1/evaluations/${evalId}`
    ),

  compare: (evalId1: string, evalId2: string) =>
    api.get<SingleResponse<EvaluationCompareResult>>(
      `/api/v1/evaluations/${evalId1}/compare${toQueryString({ eval_id2: evalId2 })}`
    ),
};

export const extractionSchemasApi = {
  list: (params?: {
    is_deprecated?: boolean;
    include_deleted?: boolean;
    scope_profile_id?: string;
    limit?: number;
    offset?: number;
  }) =>
    api.get<PagedResponse<ExtractionSchema>>(
      `/api/v1/extraction-schemas${toQueryString(params ?? {})}`
    ),

  get: (docTypeCode: string, params?: { include_deprecated?: boolean }) =>
    api.get<SingleResponse<ExtractionSchema>>(
      `/api/v1/extraction-schemas/${encodeURIComponent(docTypeCode)}${toQueryString(params ?? {})}`
    ),

  getVersions: (
    docTypeCode: string,
    params?: {
      limit?: number;
      offset?: number;
      // P3 후속-B: versions 페이지네이션에도 현재 스키마의 scope_profile_id 를
      // 함께 전달해 ACL 필터가 초기 로드와 일관되도록 한다.
      scope_profile_id?: string | null;
    }
  ) =>
    api.get<PagedResponse<ExtractionSchemaVersion>>(
      `/api/v1/extraction-schemas/${encodeURIComponent(docTypeCode)}/versions${toQueryString(params ?? {})}`
    ),

  // P4-A: 서버 정본 버전 diff.
  // GET /extraction-schemas/{doc_type}/versions/diff?base_version=X&target_version=Y
  diffVersions: (
    docTypeCode: string,
    params: {
      base_version: number;
      target_version: number;
      scope_profile_id?: string | null;
    }
  ) =>
    api.get<SingleResponse<ExtractionSchemaDiff>>(
      `/api/v1/extraction-schemas/${encodeURIComponent(docTypeCode)}/versions/diff${toQueryString(params)}`
    ),

  // P4-B: 특정 버전으로 되돌리기 (새 버전 생성).
  rollback: (
    docTypeCode: string,
    body: {
      target_version: number;
      change_summary?: string | null;
      scope_profile_id?: string | null;
    }
  ) =>
    api.post<SingleResponse<ExtractionSchema>>(
      `/api/v1/extraction-schemas/${encodeURIComponent(docTypeCode)}/rollback`,
      body
    ),

  create: (body: {
    doc_type_code: string;
    fields: Record<string, ExtractionSchemaField>;
    scope_profile_id?: string | null;
    extra_metadata?: Record<string, unknown> | null;
  }) =>
    api.post<SingleResponse<ExtractionSchema>>(
      "/api/v1/extraction-schemas",
      body
    ),

  update: (
    docTypeCode: string,
    body: {
      fields: Record<string, ExtractionSchemaField>;
      change_summary?: string | null;
    }
  ) =>
    api.put<SingleResponse<ExtractionSchema>>(
      `/api/v1/extraction-schemas/${encodeURIComponent(docTypeCode)}`,
      body
    ),

  deprecate: (docTypeCode: string, reason: string) =>
    api.patch<SingleResponse<ExtractionSchema>>(
      `/api/v1/extraction-schemas/${encodeURIComponent(docTypeCode)}/deprecate`,
      { reason }
    ),

  delete: (docTypeCode: string) =>
    api.delete<void>(
      `/api/v1/extraction-schemas/${encodeURIComponent(docTypeCode)}`
    ),
};

/**
 * 백엔드 `/api/v1/admin/extraction-results` 목록 응답 계약(B 스코프, 2026-04-22).
 *
 * 내부 `list_response` helper 는 아래 envelope 을 그대로 내려준다:
 *   { data: [...], meta: { request_id, trace_id, pagination: { page, page_size,
 *     total, has_next, next_cursor } } }
 *
 * 기존 `PagedResponse<T>` 는 meta 를 flat 하게 선언해 pagination 필드에 접근할
 * 수 없으므로, 본 API 는 전용 envelope 타입을 사용한다.
 */
export interface ExtractionQueuePagedResponse<T> {
  data: T[];
  meta?: {
    request_id?: string | null;
    trace_id?: string | null;
    pagination?: {
      page?: number;
      page_size?: number;
      total?: number | null;
      has_next?: boolean | null;
      next_cursor?: string | null;
    };
  };
}

export interface ExtractionQueueApproveBody {
  approval_comment?: string | null;
  /**
   * 일부 필드를 승인 전 덮어쓰려면 여기에 실어 보낸다. 빈 dict 또는 미지정이면
   * 원본 추출값을 그대로 승인(서버 계약상 동일).
   */
  overrides?: Record<string, unknown>;
}

export const extractionQueueApi = {
  /**
   * 추출 결과 목록.
   *
   * Q1-A5: `scope_profile_id` 는 S2 ⑥ 원칙(ACL 필터링 의무) 에 따라
   * 모든 조회 API 에 전달되어야 한다. 서버가 scope_profile_id 를 받아
   * 접근 가능한 문서의 추출 결과만 반환하도록 게이트한다.
   * 빈 문자열은 "전역 스코프(혹은 사용자 기본 스코프)" 로 취급.
   *
   * B 스코프(2026-04-22): 응답 타입을 envelope 에 맞춰 `ExtractionQueuePagedResponse`
   * 로 교체. 페이지네이션 total/has_next 가 표시된다.
   */
  list: (params?: {
    page?: number;
    page_size?: number;
    document_type?: string;
    status?: string;
    scope_profile_id?: string;
  }) =>
    api.get<ExtractionQueuePagedResponse<ExtractionResult>>(
      `/api/v1/admin/extraction-results${toQueryString(params ?? {})}`
    ),

  get: (id: string, params?: { scope_profile_id?: string }) =>
    api.get<SingleResponse<ExtractionResultDetail>>(
      `/api/v1/admin/extraction-results/${id}${toQueryString(params ?? {})}`
    ),

  approve: (id: string, body?: ExtractionQueueApproveBody) =>
    api.post<SingleResponse<ExtractionResultDetail>>(
      `/api/v1/admin/extraction-results/${id}/approve`,
      body ?? {}
    ),

  reject: (id: string, reason?: string) =>
    api.post<SingleResponse<ExtractionResultDetail>>(
      `/api/v1/admin/extraction-results/${id}/reject`,
      { reason }
    ),
};
