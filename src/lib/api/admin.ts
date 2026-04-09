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
  AuditLog,
  AuditLogDetail,
  AdminDocumentType,
  AdminDocumentTypeDetail,
  BackgroundJob,
  JobSummary,
  ApiKey,
  ListResponse,
  SingleResponse,
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
  } = {}) =>
    api.get<ListResponse<AdminUser>>(
      `/api/v1/admin/users${buildQueryString({ page: params.page ?? 1, page_size: params.page_size ?? 20, search: params.search, status: params.status })}`,
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
  getApiKeys: (params: { page?: number; page_size?: number } = {}) =>
    api.get<ListResponse<ApiKey>>(
      `/api/v1/admin/api-keys${buildQueryString({ page: params.page ?? 1, page_size: params.page_size ?? 20 })}`,
      adminHeaders()
    ),
};
