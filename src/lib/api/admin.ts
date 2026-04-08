import { api } from "./client";
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

const ADMIN_KEY =
  process.env.NEXT_PUBLIC_ADMIN_KEY ?? "dev-admin-key";

function adminHeaders(): RequestInit {
  return { headers: { "X-Admin-Key": ADMIN_KEY } };
}

function qs(params: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

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
      `/api/v1/admin/users${qs({ page: params.page ?? 1, page_size: params.page_size ?? 20, search: params.search, status: params.status })}`,
      adminHeaders()
    ),
  getUser: (userId: string) =>
    api.get<SingleResponse<AdminUserDetail>>(
      `/api/v1/admin/users/${userId}`,
      adminHeaders()
    ),

  // Organizations
  getOrgs: (params: { page?: number; page_size?: number } = {}) =>
    api.get<ListResponse<AdminOrg>>(
      `/api/v1/admin/organizations${qs({ page: params.page ?? 1, page_size: params.page_size ?? 20 })}`,
      adminHeaders()
    ),
  getOrg: (orgId: string) =>
    api.get<SingleResponse<AdminOrgDetail>>(
      `/api/v1/admin/organizations/${orgId}`,
      adminHeaders()
    ),

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
      `/api/v1/admin/audit-logs${qs({
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
  getDocumentTypes: () =>
    api.get<ListResponse<AdminDocumentType>>(
      "/api/v1/admin/document-types",
      adminHeaders()
    ),
  getDocumentType: (typeCode: string) =>
    api.get<SingleResponse<AdminDocumentTypeDetail>>(
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
      `/api/v1/admin/jobs${qs({ page: params.page ?? 1, page_size: params.page_size ?? 30, status: params.status, job_type: params.job_type })}`,
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
      `/api/v1/admin/indexing/jobs${qs({ page: params.page ?? 1, page_size: params.page_size ?? 30, status: params.status })}`,
      adminHeaders()
    ),

  // API Keys
  getApiKeys: (params: { page?: number; page_size?: number } = {}) =>
    api.get<ListResponse<ApiKey>>(
      `/api/v1/admin/api-keys${qs({ page: params.page ?? 1, page_size: params.page_size ?? 20 })}`,
      adminHeaders()
    ),
};
