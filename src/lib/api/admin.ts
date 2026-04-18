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

// buildQueryString은 @/lib/utils에서 import

// ---- Dashboard ----

export const adminApi = {
  // Dashboard
  getMetrics: () =>
    api.get<SingleResponse<DashboardMetrics>>(
      "/api/v1/admin/dashboard/metrics"
    ),
  getHealth: () =>
    api.get<SingleResponse<DashboardHealth>>(
      "/api/v1/admin/dashboard/health"
    ),
  getRecentErrors: () =>
    api.get<SingleResponse<RecentError[]>>(
      "/api/v1/admin/dashboard/errors"
    ),
  getRecentAuditLogs: () =>
    api.get<SingleResponse<RecentAuditLog[]>>(
      "/api/v1/admin/dashboard/recent-audit-logs"
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
      `/api/v1/admin/users${buildQueryString({ page: params.page ?? 1, page_size: params.page_size ?? 20, search: params.search, status: params.status, role: params.role })}`
    ),
  getUser: (userId: string) =>
    api.get<SingleResponse<AdminUserDetail>>(
      `/api/v1/admin/users/${userId}`
    ),
  createUser: (body: { email: string; display_name: string; role_name?: string; status?: string }) =>
    api.post<SingleResponse<AdminUser>>(
      "/api/v1/admin/users",
      body
    ),
  updateUser: (userId: string, body: { display_name?: string; role_name?: string; status?: string }) =>
    api.patch<SingleResponse<AdminUser>>(
      `/api/v1/admin/users/${userId}`,
      body
    ),
  activateUser: (userId: string) =>
    api.post<SingleResponse<AdminUser>>(
      `/api/v1/admin/users/${userId}/activate`,
      {}
    ),
  deleteUser: (userId: string) =>
    api.delete<void>(`/api/v1/admin/users/${userId}`),
  assignOrgRole: (userId: string, body: { org_id: string; role_name: string }) =>
    api.post<SingleResponse<unknown>>(
      `/api/v1/admin/users/${userId}/org-roles`,
      body
    ),
  removeOrgRole: (userId: string, orgId: string) =>
    api.delete<void>(`/api/v1/admin/users/${userId}/org-roles/${orgId}`),

  // Organizations
  getOrgs: (params: { page?: number; page_size?: number; search?: string } = {}) =>
    api.get<ListResponse<AdminOrg>>(
      `/api/v1/admin/organizations${buildQueryString({ page: params.page ?? 1, page_size: params.page_size ?? 20, search: params.search })}`
    ),
  getOrg: (orgId: string) =>
    api.get<SingleResponse<AdminOrgDetail>>(
      `/api/v1/admin/organizations/${orgId}`
    ),
  createOrg: (body: { name: string; description?: string }) =>
    api.post<SingleResponse<AdminOrg>>(
      "/api/v1/admin/organizations",
      body
    ),
  updateOrg: (orgId: string, body: { name?: string; description?: string; status?: string }) =>
    api.patch<SingleResponse<AdminOrg>>(
      `/api/v1/admin/organizations/${orgId}`,
      body
    ),
  deleteOrg: (orgId: string) =>
    api.delete<void>(`/api/v1/admin/organizations/${orgId}`),

  // Roles
  getRoles: () =>
    api.get<ListResponse<AdminRole>>(
      "/api/v1/admin/roles"
    ),
  getPermissionMatrix: () =>
    api.get<SingleResponse<PermissionMatrix>>(
      "/api/v1/admin/roles/permissions/matrix"
    ),

  // System Settings (Phase 14-11)
  getAllSettings: () =>
    api.get<SingleResponse<AllSettingsResponse>>(
      "/api/v1/admin/settings"
    ),
  getSettingsByCategory: (category: string) =>
    api.get<SingleResponse<SettingCategory>>(
      `/api/v1/admin/settings/${encodeURIComponent(category)}`
    ),
  updateSetting: (category: string, key: string, value: SettingValue) =>
    api.patch<SingleResponse<SettingItem>>(
      `/api/v1/admin/settings/${encodeURIComponent(category)}/${encodeURIComponent(key)}`,
      { value }
    ),

  // Monitoring (Phase 14-12)
  getMonitoringComponents: () =>
    api.get<SingleResponse<ComponentStatusResponse>>(
      "/api/v1/admin/monitoring/components"
    ),
  getResponseTimeTrend: (period: string = "24h") =>
    api.get<SingleResponse<ResponseTimeTrendResponse>>(
      `/api/v1/admin/monitoring/response-times?period=${encodeURIComponent(period)}`
    ),
  getErrorTrend: (period: string = "24h") =>
    api.get<SingleResponse<ErrorTrendResponse>>(
      `/api/v1/admin/monitoring/error-trends?period=${encodeURIComponent(period)}`
    ),
  getRole: (roleId: string) =>
    api.get<SingleResponse<AdminRoleDetail>>(
      `/api/v1/admin/roles/${roleId}`
    ),
  createRole: (body: { name: string; description?: string }) =>
    api.post<SingleResponse<AdminRole>>(
      "/api/v1/admin/roles",
      body
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
      })}`
    ),
  getAuditLog: (eventId: string) =>
    api.get<SingleResponse<AuditLogDetail>>(
      `/api/v1/admin/audit-logs/${eventId}`
    ),

  // Document Types
  getDocumentTypes: (params: { status?: string; search?: string } = {}) =>
    api.get<ListResponse<AdminDocumentType>>(
      `/api/v1/admin/document-types${buildQueryString({ status: params.status, search: params.search })}`
    ),
  getDocumentType: (typeCode: string) =>
    api.get<SingleResponse<AdminDocumentTypeDetail>>(
      `/api/v1/admin/document-types/${typeCode}`
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
      body
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
      body
    ),
  deactivateDocumentType: (typeCode: string) =>
    api.delete<void>(
      `/api/v1/admin/document-types/${typeCode}`
    ),

  // Phase 12: 플러그인 설정 관리
  getDocumentTypePlugin: (typeCode: string) =>
    api.get<SingleResponse<DocTypePluginStatus>>(
      `/api/v1/admin/document-types/${typeCode}/plugin`
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
      body
    ),
  getDocumentTypeMetadataSchema: (typeCode: string) =>
    api.get<SingleResponse<{ type_code: string; schema: Record<string, unknown>; ui_schema: Record<string, unknown> }>>(
      `/api/v1/admin/document-types/${typeCode}/plugin/schema`
    ),

  // Background Jobs
  getJobs: (params: {
    page?: number;
    page_size?: number;
    status?: string;
    job_type?: string;
  } = {}) =>
    api.get<ListResponse<BackgroundJob>>(
      `/api/v1/admin/jobs${buildQueryString({ page: params.page ?? 1, page_size: params.page_size ?? 30, status: params.status, job_type: params.job_type })}`
    ),
  getJobSummary: () =>
    api.get<SingleResponse<JobSummary>>(
      "/api/v1/admin/jobs/summary"
    ),
  getJob: (jobId: string) =>
    api.get<SingleResponse<BackgroundJob>>(
      `/api/v1/admin/jobs/${jobId}`
    ),

  // Indexing
  getIndexingJobs: (params: { page?: number; page_size?: number; status?: string } = {}) =>
    api.get<ListResponse<BackgroundJob>>(
      `/api/v1/admin/indexing/jobs${buildQueryString({ page: params.page ?? 1, page_size: params.page_size ?? 30, status: params.status })}`
    ),

  // API Keys
  getApiKeys: (params: { page?: number; page_size?: number; status?: string; search?: string } = {}) =>
    api.get<ListResponse<ApiKey>>(
      `/api/v1/admin/api-keys${buildQueryString({
        page: params.page ?? 1,
        page_size: params.page_size ?? 20,
        status: params.status,
        search: params.search,
      })}`
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
      body
    ),
  revokeApiKey: (keyId: string, reason?: string) =>
    api.post<SingleResponse<{ id: string; name: string; status: string }>>(
      `/api/v1/admin/api-keys/${encodeURIComponent(keyId)}/revoke`,
      { reason }
    ),
  getAuditEventTypes: () =>
    api.get<SingleResponse<{ items: AuditEventTypeOption[] }>>(
      "/api/v1/admin/audit-logs/event-types"
    ),

  // Phase 10: Vectorization
  getVectorizationStats: () =>
    api.get<SingleResponse<VectorizationStats>>(
      "/api/v1/vectorization/stats"
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
      })}`
    ),
  reindexDocument: (documentId: string) =>
    api.post<SingleResponse<ReindexResult>>(
      `/api/v1/vectorization/documents/${documentId}`,
      {}
    ),
  reindexAll: (body: { document_type?: string; limit?: number } = {}) =>
    api.post<SingleResponse<BatchReindexResult>>(
      "/api/v1/vectorization/reindex-all",
      body
    ),
  cleanupChunks: (daysOld = 30) =>
    api.post<SingleResponse<{ deleted: number }>>(
      `/api/v1/vectorization/cleanup?days_old=${daysOld}`,
      {}
    ),
  getTokenUsage: (params: { page?: number; limit?: number } = {}) =>
    api.get<SingleResponse<TokenUsageListResponse>>(
      `/api/v1/vectorization/token-usage${buildQueryString({ page: params.page ?? 1, limit: params.limit ?? 20 })}`
    ),

  // Alerts (Phase 14-13)
  getAlertMetrics: () =>
    api.get<SingleResponse<AlertMetricsResponse>>(
      "/api/v1/admin/alerts/metrics"
    ),
  getAlertRules: (enabledOnly = false) =>
    api.get<SingleResponse<AlertRule[]>>(
      `/api/v1/admin/alerts/rules${buildQueryString({ enabled_only: enabledOnly })}`
    ),
  getAlertRule: (ruleId: string) =>
    api.get<SingleResponse<AlertRule>>(
      `/api/v1/admin/alerts/rules/${encodeURIComponent(ruleId)}`
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
      body
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
      body
    ),
  deleteAlertRule: (ruleId: string) =>
    api.delete<SingleResponse<{ deleted: boolean }>>(
      `/api/v1/admin/alerts/rules/${encodeURIComponent(ruleId)}`
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
      })}`
    ),
  acknowledgeAlert: (historyId: string) =>
    api.post<SingleResponse<unknown>>(
      `/api/v1/admin/alerts/history/${encodeURIComponent(historyId)}/acknowledge`,
      {}
    ),
  evaluateAlertsNow: () =>
    api.post<SingleResponse<AlertEvaluateStats>>(
      "/api/v1/admin/alerts/evaluate",
      {}
    ),

  // Job Schedules (Phase 14-14)
  getJobSchedules: () =>
    api.get<SingleResponse<JobSchedule[]>>(
      "/api/v1/admin/jobs/schedules"
    ),
  getJobSchedule: (jobId: string) =>
    api.get<SingleResponse<JobScheduleDetail>>(
      `/api/v1/admin/jobs/schedules/${encodeURIComponent(jobId)}`
    ),
  runJobSchedule: (jobId: string) =>
    api.post<SingleResponse<{ message: string; run_id: string }>>(
      `/api/v1/admin/jobs/schedules/${encodeURIComponent(jobId)}/run`,
      {}
    ),
  updateJobSchedule: (
    jobId: string,
    body: { schedule?: string; enabled?: boolean }
  ) =>
    api.patch<SingleResponse<JobSchedule>>(
      `/api/v1/admin/jobs/schedules/${encodeURIComponent(jobId)}`,
      body
    ),
  cancelJobSchedule: (jobId: string) =>
    api.post<SingleResponse<{ message: string; run_id: string }>>(
      `/api/v1/admin/jobs/schedules/${encodeURIComponent(jobId)}/cancel`,
      {}
    ),
  previewCron: (schedule: string) =>
    api.post<SingleResponse<CronPreviewResponse>>(
      "/api/v1/admin/jobs/schedules/cron/preview",
      { schedule }
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
