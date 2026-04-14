import { api } from "./client";
import { buildQueryString } from "@/lib/utils";
import type {
  DashboardMetrics,
  DashboardHealth,
  RecentError,
  RecentAuditLog,
  AdminUser,
  AdminUserDetail,
  AdminOrg,
  AdminOrgDetail,
  AdminRole,
  AdminRoleDetail,
  PermissionMatrix,
  AuditLog,
  AuditLogDetail,
  AdminDocumentType,
  AdminDocumentTypeDetail,
  DocTypePluginStatus,
  BackgroundJob,
  JobSummary,
  ApiKey,
  ApiKeyWithSecret,
  AuditEventTypeOption,
  ListResponse,
  SingleResponse,
  AllSettingsResponse,
  SettingItem,
  SettingValue,
  SettingCategory,
  ComponentStatusResponse,
  ResponseTimeTrendResponse,
  ErrorTrendResponse,
  AlertRule,
  AlertHistoryResponse,
  AlertMetricsResponse,
  AlertEvaluateStats,
  AlertCondition,
  AlertSeverity,
  AlertChannel,
  JobSchedule,
  JobScheduleDetail,
  CronPreviewResponse,
} from "@/types/admin";

/**
 * Zustand persist store(mimir-authz)에서 actor 정보를 읽어 dev 인증 헤더로 반환한다.
 *
 * Phase 8 JWT 연동 전까지 백엔드의 X-Actor-Id / X-Actor-Role dev 헤더를 사용.
 * production 환경에서는 백엔드가 해당 헤더를 무시하므로, JWT Bearer 토큰 연동 후
 * Authorization 헤더로 교체해야 한다.
 */
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
    // localStorage 접근 실패 시 헤더 없이 진행
  }
  return { headers };
}

// buildQueryString은 @/lib/utils에서 import

// ---- Dashboard ----

export const adminApi = {
  // Dashboard
  getMetrics: () =>
    api.get<SingleResponse<DashboardMetrics>>(
      "/api/v1/admin/dashboard/metrics",
      adminHeaders()
    ),
  getHealth: () =>
    api.get<SingleResponse<DashboardHealth>>(
      "/api/v1/admin/dashboard/health",
      adminHeaders()
    ),
  getRecentErrors: () =>
    api.get<SingleResponse<RecentError[]>>(
      "/api/v1/admin/dashboard/errors",
      adminHeaders()
    ),
  getRecentAuditLogs: () =>
    api.get<SingleResponse<RecentAuditLog[]>>(
      "/api/v1/admin/dashboard/recent-audit-logs",
      adminHeaders()
    ),

  // Users
  getUsers: (params: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: string;
    role?: string;
  } = {}) =>
    api.get<ListResponse<AdminUser>>(
      `/api/v1/admin/users${buildQueryString({ page: params.page ?? 1, page_size: params.page_size ?? 20, search: params.search, status: params.status, role: params.role })}`,
      adminHeaders()
    ),
  getUser: (userId: string) =>
    api.get<SingleResponse<AdminUserDetail>>(
      `/api/v1/admin/users/${userId}`,
      adminHeaders()
    ),
  createUser: (body: { email: string; display_name: string; role_name?: string; status?: string }) =>
    api.post<SingleResponse<AdminUser>>(
      "/api/v1/admin/users",
      body,
      adminHeaders()
    ),
  updateUser: (userId: string, body: { display_name?: string; role_name?: string; status?: string }) =>
    api.patch<SingleResponse<AdminUser>>(
      `/api/v1/admin/users/${userId}`,
      body,
      adminHeaders()
    ),
  deleteUser: (userId: string) =>
    api.delete<void>(`/api/v1/admin/users/${userId}`, adminHeaders()),
  assignOrgRole: (userId: string, body: { org_id: string; role_name: string }) =>
    api.post<SingleResponse<unknown>>(
      `/api/v1/admin/users/${userId}/org-roles`,
      body,
      adminHeaders()
    ),
  removeOrgRole: (userId: string, orgId: string) =>
    api.delete<void>(`/api/v1/admin/users/${userId}/org-roles/${orgId}`, adminHeaders()),

  // Organizations
  getOrgs: (params: { page?: number; page_size?: number; search?: string } = {}) =>
    api.get<ListResponse<AdminOrg>>(
      `/api/v1/admin/organizations${buildQueryString({ page: params.page ?? 1, page_size: params.page_size ?? 20, search: params.search })}`,
      adminHeaders()
    ),
  getOrg: (orgId: string) =>
    api.get<SingleResponse<AdminOrgDetail>>(
      `/api/v1/admin/organizations/${orgId}`,
      adminHeaders()
    ),
  createOrg: (body: { name: string; description?: string }) =>
    api.post<SingleResponse<AdminOrg>>(
      "/api/v1/admin/organizations",
      body,
      adminHeaders()
    ),
  updateOrg: (orgId: string, body: { name?: string; description?: string; status?: string }) =>
    api.patch<SingleResponse<AdminOrg>>(
      `/api/v1/admin/organizations/${orgId}`,
      body,
      adminHeaders()
    ),
  deleteOrg: (orgId: string) =>
    api.delete<void>(`/api/v1/admin/organizations/${orgId}`, adminHeaders()),

  // Roles
  getRoles: () =>
    api.get<ListResponse<AdminRole>>(
      "/api/v1/admin/roles",
      adminHeaders()
    ),
  getPermissionMatrix: () =>
    api.get<SingleResponse<PermissionMatrix>>(
      "/api/v1/admin/roles/permissions/matrix",
      adminHeaders()
    ),

  // System Settings (Phase 14-11)
  getAllSettings: () =>
    api.get<SingleResponse<AllSettingsResponse>>(
      "/api/v1/admin/settings",
      adminHeaders()
    ),
  getSettingsByCategory: (category: string) =>
    api.get<SingleResponse<SettingCategory>>(
      `/api/v1/admin/settings/${encodeURIComponent(category)}`,
      adminHeaders()
    ),
  updateSetting: (category: string, key: string, value: SettingValue) =>
    api.patch<SingleResponse<SettingItem>>(
      `/api/v1/admin/settings/${encodeURIComponent(category)}/${encodeURIComponent(key)}`,
      { value },
      adminHeaders()
    ),

  // Monitoring (Phase 14-12)
  getMonitoringComponents: () =>
    api.get<SingleResponse<ComponentStatusResponse>>(
      "/api/v1/admin/monitoring/components",
      adminHeaders()
    ),
  getResponseTimeTrend: (period: string = "24h") =>
    api.get<SingleResponse<ResponseTimeTrendResponse>>(
      `/api/v1/admin/monitoring/response-times?period=${encodeURIComponent(period)}`,
      adminHeaders()
    ),
  getErrorTrend: (period: string = "24h") =>
    api.get<SingleResponse<ErrorTrendResponse>>(
      `/api/v1/admin/monitoring/error-trends?period=${encodeURIComponent(period)}`,
      adminHeaders()
    ),
  getRole: (roleId: string) =>
    api.get<SingleResponse<AdminRoleDetail>>(
      `/api/v1/admin/roles/${roleId}`,
      adminHeaders()
    ),
  createRole: (body: { name: string; description?: string }) =>
    api.post<SingleResponse<AdminRole>>(
      "/api/v1/admin/roles",
      body,
      adminHeaders()
    ),

  // Audit Logs
  getAuditLogs: (params: {
    page?: number;
    page_size?: number;
    from?: string;
    to?: string;
    actor_id?: string;
    event_type?: string;
    result?: string;
  } = {}) =>
    api.get<ListResponse<AuditLog>>(
      `/api/v1/admin/audit-logs${buildQueryString({
        page: params.page ?? 1,
        page_size: params.page_size ?? 50,
        from: params.from,
        to: params.to,
        actor_id: params.actor_id,
        event_type: params.event_type,
        result: params.result,
      })}`,
      adminHeaders()
    ),
  getAuditLog: (eventId: string) =>
    api.get<SingleResponse<AuditLogDetail>>(
      `/api/v1/admin/audit-logs/${eventId}`,
      adminHeaders()
    ),

  // Document Types
  getDocumentTypes: (params: { status?: string; search?: string } = {}) =>
    api.get<ListResponse<AdminDocumentType>>(
      `/api/v1/admin/document-types${buildQueryString({ status: params.status, search: params.search })}`,
      adminHeaders()
    ),
  getDocumentType: (typeCode: string) =>
    api.get<SingleResponse<AdminDocumentTypeDetail>>(
      `/api/v1/admin/document-types/${typeCode}`,
      adminHeaders()
    ),
  createDocumentType: (body: {
    type_code: string;
    display_name: string;
    description?: string;
    schema_fields?: object[];
    plugin_config?: Record<string, unknown>;
  }) =>
    api.post<SingleResponse<AdminDocumentTypeDetail>>(
      "/api/v1/admin/document-types",
      body,
      adminHeaders()
    ),
  updateDocumentType: (
    typeCode: string,
    body: {
      display_name?: string;
      description?: string;
      status?: string;
      schema_fields?: object[];
      plugin_config?: Record<string, unknown>;
    }
  ) =>
    api.patch<SingleResponse<AdminDocumentTypeDetail>>(
      `/api/v1/admin/document-types/${typeCode}`,
      body,
      adminHeaders()
    ),
  deactivateDocumentType: (typeCode: string) =>
    api.delete<void>(
      `/api/v1/admin/document-types/${typeCode}`,
      adminHeaders()
    ),

  // Phase 12: 플러그인 설정 관리
  getDocumentTypePlugin: (typeCode: string) =>
    api.get<SingleResponse<DocTypePluginStatus>>(
      `/api/v1/admin/document-types/${typeCode}/plugin`,
      adminHeaders()
    ),
  updateDocumentTypePlugin: (
    typeCode: string,
    body: {
      chunking_config?: Record<string, unknown>;
      rag_config?: Record<string, unknown>;
      search_config?: Record<string, unknown>;
      metadata_schema?: Record<string, unknown>;
      editor_config?: Record<string, unknown>;
      renderer_config?: Record<string, unknown>;
      workflow_config?: Record<string, unknown>;
    }
  ) =>
    api.put<SingleResponse<{ type_code: string; updated_fields: string[] }>>(
      `/api/v1/admin/document-types/${typeCode}/plugin`,
      body,
      adminHeaders()
    ),
  getDocumentTypeMetadataSchema: (typeCode: string) =>
    api.get<SingleResponse<{ type_code: string; schema: Record<string, unknown>; ui_schema: Record<string, unknown> }>>(
      `/api/v1/admin/document-types/${typeCode}/plugin/schema`,
      adminHeaders()
    ),

  // Background Jobs
  getJobs: (params: {
    page?: number;
    page_size?: number;
    status?: string;
    job_type?: string;
  } = {}) =>
    api.get<ListResponse<BackgroundJob>>(
      `/api/v1/admin/jobs${buildQueryString({ page: params.page ?? 1, page_size: params.page_size ?? 30, status: params.status, job_type: params.job_type })}`,
      adminHeaders()
    ),
  getJobSummary: () =>
    api.get<SingleResponse<JobSummary>>(
      "/api/v1/admin/jobs/summary",
      adminHeaders()
    ),
  getJob: (jobId: string) =>
    api.get<SingleResponse<BackgroundJob>>(
      `/api/v1/admin/jobs/${jobId}`,
      adminHeaders()
    ),

  // Indexing
  getIndexingJobs: (params: { page?: number; page_size?: number; status?: string } = {}) =>
    api.get<ListResponse<BackgroundJob>>(
      `/api/v1/admin/indexing/jobs${buildQueryString({ page: params.page ?? 1, page_size: params.page_size ?? 30, status: params.status })}`,
      adminHeaders()
    ),

  // API Keys
  getApiKeys: (params: { page?: number; page_size?: number; status?: string; search?: string } = {}) =>
    api.get<ListResponse<ApiKey>>(
      `/api/v1/admin/api-keys${buildQueryString({
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
        status: params.status,
        search: params.search,
      })}`,
      adminHeaders()
    ),
  // Phase 14-15
  createApiKey: (body: {
    name: string;
    description?: string;
    scope: string;
    expires_in_days: number;
  }) =>
    api.post<SingleResponse<ApiKeyWithSecret>>(
      "/api/v1/admin/api-keys",
      body,
      adminHeaders()
    ),
  revokeApiKey: (keyId: string, reason?: string) =>
    api.post<SingleResponse<{ id: string; name: string; status: string }>>(
      `/api/v1/admin/api-keys/${encodeURIComponent(keyId)}/revoke`,
      { reason },
      adminHeaders()
    ),
  getAuditEventTypes: () =>
    api.get<SingleResponse<{ items: AuditEventTypeOption[] }>>(
      "/api/v1/admin/audit-logs/event-types",
      adminHeaders()
    ),

  // Phase 10: Vectorization
  getVectorizationStats: () =>
    api.get<SingleResponse<VectorizationStats>>(
      "/api/v1/vectorization/stats",
      adminHeaders()
    ),
  getChunks: (params: {
    page?: number;
    limit?: number;
    document_id?: string;
    document_type?: string;
    is_current?: boolean;
    has_embedding?: boolean;
  } = {}) =>
    api.get<SingleResponse<ChunkListResponse>>(
      `/api/v1/vectorization/chunks${buildQueryString({
        page: params.page ?? 1,
        limit: params.limit ?? 20,
        document_id: params.document_id,
        document_type: params.document_type,
        is_current: params.is_current ?? true,
        has_embedding: params.has_embedding,
      })}`,
      adminHeaders()
    ),
  reindexDocument: (documentId: string) =>
    api.post<SingleResponse<ReindexResult>>(
      `/api/v1/vectorization/documents/${documentId}`,
      {},
      adminHeaders()
    ),
  reindexAll: (body: { document_type?: string; limit?: number } = {}) =>
    api.post<SingleResponse<BatchReindexResult>>(
      "/api/v1/vectorization/reindex-all",
      body,
      adminHeaders()
    ),
  cleanupChunks: (daysOld = 30) =>
    api.post<SingleResponse<{ deleted: number }>>(
      `/api/v1/vectorization/cleanup?days_old=${daysOld}`,
      {},
      adminHeaders()
    ),
  getTokenUsage: (params: { page?: number; limit?: number } = {}) =>
    api.get<SingleResponse<TokenUsageListResponse>>(
      `/api/v1/vectorization/token-usage${buildQueryString({ page: params.page ?? 1, limit: params.limit ?? 20 })}`,
      adminHeaders()
    ),

  // Alerts (Phase 14-13)
  getAlertMetrics: () =>
    api.get<SingleResponse<AlertMetricsResponse>>(
      "/api/v1/admin/alerts/metrics",
      adminHeaders()
    ),
  getAlertRules: (enabledOnly = false) =>
    api.get<SingleResponse<AlertRule[]>>(
      `/api/v1/admin/alerts/rules${buildQueryString({ enabled_only: enabledOnly })}`,
      adminHeaders()
    ),
  getAlertRule: (ruleId: string) =>
    api.get<SingleResponse<AlertRule>>(
      `/api/v1/admin/alerts/rules/${encodeURIComponent(ruleId)}`,
      adminHeaders()
    ),
  createAlertRule: (body: {
    name: string;
    description?: string;
    metric_name: string;
    condition: AlertCondition;
    severity: AlertSeverity;
    channels: AlertChannel[];
    channel_config?: Record<string, unknown>;
    enabled?: boolean;
  }) =>
    api.post<SingleResponse<AlertRule>>(
      "/api/v1/admin/alerts/rules",
      body,
      adminHeaders()
    ),
  updateAlertRule: (
    ruleId: string,
    body: Partial<{
      name: string;
      description: string;
      metric_name: string;
      condition: AlertCondition;
      severity: AlertSeverity;
      channels: AlertChannel[];
      channel_config: Record<string, unknown>;
      enabled: boolean;
    }>
  ) =>
    api.patch<SingleResponse<AlertRule>>(
      `/api/v1/admin/alerts/rules/${encodeURIComponent(ruleId)}`,
      body,
      adminHeaders()
    ),
  deleteAlertRule: (ruleId: string) =>
    api.delete<SingleResponse<{ deleted: boolean }>>(
      `/api/v1/admin/alerts/rules/${encodeURIComponent(ruleId)}`,
      adminHeaders()
    ),
  getAlertHistory: (params: {
    status?: string;
    severity?: string;
    from?: string;
    to?: string;
    page?: number;
    page_size?: number;
  } = {}) =>
    api.get<SingleResponse<AlertHistoryResponse>>(
      `/api/v1/admin/alerts/history${buildQueryString({
        status: params.status,
        severity: params.severity,
        from: params.from,
        to: params.to,
        page: params.page ?? 1,
        page_size: params.page_size ?? 50,
      })}`,
      adminHeaders()
    ),
  acknowledgeAlert: (historyId: string) =>
    api.post<SingleResponse<unknown>>(
      `/api/v1/admin/alerts/history/${encodeURIComponent(historyId)}/acknowledge`,
      {},
      adminHeaders()
    ),
  evaluateAlertsNow: () =>
    api.post<SingleResponse<AlertEvaluateStats>>(
      "/api/v1/admin/alerts/evaluate",
      {},
      adminHeaders()
    ),

  // Job Schedules (Phase 14-14)
  getJobSchedules: () =>
    api.get<SingleResponse<JobSchedule[]>>(
      "/api/v1/admin/jobs/schedules",
      adminHeaders()
    ),
  getJobSchedule: (jobId: string) =>
    api.get<SingleResponse<JobScheduleDetail>>(
      `/api/v1/admin/jobs/schedules/${encodeURIComponent(jobId)}`,
      adminHeaders()
    ),
  runJobSchedule: (jobId: string) =>
    api.post<SingleResponse<{ message: string; run_id: string }>>(
      `/api/v1/admin/jobs/schedules/${encodeURIComponent(jobId)}/run`,
      {},
      adminHeaders()
    ),
  updateJobSchedule: (
    jobId: string,
    body: { schedule?: string; enabled?: boolean }
  ) =>
    api.patch<SingleResponse<JobSchedule>>(
      `/api/v1/admin/jobs/schedules/${encodeURIComponent(jobId)}`,
      body,
      adminHeaders()
    ),
  cancelJobSchedule: (jobId: string) =>
    api.post<SingleResponse<{ message: string; run_id: string }>>(
      `/api/v1/admin/jobs/schedules/${encodeURIComponent(jobId)}/cancel`,
      {},
      adminHeaders()
    ),
  previewCron: (schedule: string) =>
    api.post<SingleResponse<CronPreviewResponse>>(
      "/api/v1/admin/jobs/schedules/cron/preview",
      { schedule },
      adminHeaders()
    ),
};

// Vectorization types
export interface VectorizationStats {
  chunks: { total: number; current: number; embedded: number; pending: number };
  documents: { vectorized: number; total_published: number };
  by_type: { document_type: string; chunk_count: number }[];
  token_usage: { total_tokens: number; total_chunks_processed: number; total_jobs: number };
}

export interface ChunkItem {
  id: string;
  document_id: string;
  version_id: string;
  node_id: string | null;
  chunk_index: number;
  source_text: string;
  node_path: string[];
  document_type: string;
  document_status: string;
  embedding_model: string | null;
  token_count: number;
  is_current: boolean;
  has_embedding: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChunkListResponse {
  items: ChunkItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ReindexResult {
  document_id: string;
  version_id: string;
  chunks_created: number;
  chunks_failed: number;
  total_tokens: number;
  model: string;
  error: string | null;
}

export interface BatchReindexResult {
  total: number;
  succeeded: number;
  failed: number;
}

export interface TokenUsageItem {
  id: string;
  job_id: string | null;
  document_id: string | null;
  model: string;
  total_tokens: number;
  chunk_count: number;
  created_at: string;
}

export interface TokenUsageListResponse {
  items: TokenUsageItem[];
  total: number;
  page: number;
  limit: number;
}
