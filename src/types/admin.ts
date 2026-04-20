// ============================================================
// Admin Types — Phase 7
// ============================================================

// --- Dashboard ---

export interface DashboardMetrics {
  total_users: number;
  total_documents: number;
  running_jobs: number;
  failed_jobs_24h: number;
  audit_events_24h: number;
  indexing_failed: number;
  // Phase 10: 벡터화 현황
  vectorization?: {
    current_chunks: number;
    embedded_chunks: number;
    pending_chunks: number;
    vectorized_docs: number;
  };
}

export interface ComponentHealth {
  name: string;
  status: "ok" | "degraded" | "down";
  detail?: string;
}

export interface DashboardHealth {
  overall: "ok" | "degraded" | "down";
  components: ComponentHealth[];
}

export interface RecentError {
  id: string;
  job_type: string;
  resource_name: string;
  error_code?: string;
  error_message?: string;
  ended_at?: string;
}

export interface RecentAuditLog {
  id: string;
  event_type: string;
  actor_id?: string;
  actor_name?: string;
  severity: "CRITICAL" | "HIGH" | "NORMAL";
  result: string;
  created_at: string;
}

// --- User ---

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  status: string;
  role_name: string;
  organizations?: string | null;
  last_login_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface UserOrgRole {
  org_id: string;
  org_name: string;
  role_name: string;
  joined_at: string;
}

export interface AdminUserDetail extends AdminUser {
  org_roles: UserOrgRole[];
  recent_audit_events: RecentAuditLog[];
}

// --- Organization ---

export interface AdminOrg {
  id: string;
  name: string;
  description?: string;
  status: string;
  member_count: number;
  created_at: string;
}

export interface OrgMember {
  user_id: string;
  email: string;
  display_name: string;
  role_name: string;
  joined_at: string;
}

export interface AdminOrgDetail extends AdminOrg {
  members: OrgMember[];
}

// --- Role ---

export interface AdminRole {
  id: string;
  name: string;
  description?: string;
  is_system: boolean;
  user_count: number;
  created_at: string;
}

// F-05 시정(2026-04-18): 빈 interface extends 는 @typescript-eslint/no-empty-object-type
//   위반(상위 타입과 동일). 향후 permissions 가 추가되기 전까지 type alias 로 유지하여
//   동일한 의미를 표현하되 lint 는 통과시킴.
export type AdminRoleDetail = AdminRole;

// --- Permission Matrix (Task 14-10) ---

export interface PermissionMatrixItem {
  action: string;
  verb: string;
  allowed_roles: string[];
}

export interface PermissionMatrixGroup {
  name: string;
  items: PermissionMatrixItem[];
}

export interface PermissionMatrix {
  roles: string[];
  groups: PermissionMatrixGroup[];
}

// --- Audit Log ---

export interface AuditLog {
  id: string;
  event_type: string;
  actor_id?: string;
  actor_name?: string;
  target_type?: string;
  target_id?: string;
  target_name?: string;
  severity: "CRITICAL" | "HIGH" | "NORMAL";
  result: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export interface AuditLogDetail extends AuditLog {
  before_state?: Record<string, unknown>;
  after_state?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// --- Document Type ---

export interface SchemaField {
  name: string;
  type: string;
  required: boolean;
  description?: string;
}

export interface PluginConfig {
  editor?: string;
  renderer?: string;
  workflow?: string;
  chunking?: string;
  [key: string]: unknown;
}

export interface AdminDocumentType {
  type_code: string;
  display_name: string;
  description?: string;
  status: string;
  schema_field_count: number;
  document_count: number;
  is_builtin?: boolean;
  plugin_registered?: boolean;
  created_at: string | null;
  updated_at?: string;
}

export interface AdminDocumentTypeDetail {
  type_code: string;
  display_name: string;
  description?: string;
  status: string;
  schema_fields: SchemaField[];
  plugin_config: PluginConfig;
  document_count: number;
  created_at: string;
  updated_at: string;
}

// Phase 12: 플러그인 설정 관련 타입
export interface ChunkingPluginConfig {
  strategy?: string;
  max_chunk_tokens?: number;
  min_chunk_tokens?: number;
  overlap_tokens?: number;
  include_parent_context?: boolean;
  parent_context_depth?: number;
  index_version_policy?: string;
  exclude_node_types?: string[];
  merge_strategy?: string;
}

export interface RAGPluginConfig {
  max_context_tokens?: number;
  top_n?: number;
  system_prompt?: string;
}

export interface SearchPluginConfig {
  boost?: Record<string, number>;
  searchable_node_types?: string[];
  snippet?: { max_length?: number; highlight?: boolean };
}

export interface DocTypePluginStatus {
  type_code: string;
  is_builtin: boolean;
  display_name: string;
  description: string;
  effective_config: {
    chunking: Record<string, unknown>;
    rag: Record<string, unknown>;
    search_boost: Record<string, number>;
    metadata_schema: Record<string, unknown>;
    metadata_ui_schema: Record<string, unknown>;
    workflow: { requires_approval: boolean; review_roles: string[] };
    editor: { allowed_node_types: string[]; default_structure: unknown[] };
  };
  db_override: Record<string, unknown>;
}

// --- Background Job ---

export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";

export interface BackgroundJob {
  id: string;
  job_type: string;
  resource_type?: string;
  resource_id?: string;
  resource_name?: string;
  status: JobStatus;
  progress?: number;
  requester_id?: string;
  error_code?: string;
  error_message?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface JobSummary {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  skipped: number;
}

// --- API Key ---

export interface ApiKey {
  id: string;
  name: string;
  description?: string | null;
  key_prefix: string;
  scope: string;
  status: string;
  issuer_id?: string;
  issuer_name?: string | null;
  expires_at?: string | null;
  last_used_at?: string | null;
  last_used_ip?: string | null;
  use_count?: number;
  created_at: string;
}

// Phase 14-15: 생성 응답은 full_key 를 1회만 반환
export interface ApiKeyWithSecret extends ApiKey {
  full_key: string;
}

export interface AuditEventTypeOption {
  value: string;
  label: string;
}

// --- System Settings (Phase 14-11) ---

export type SettingValue = string | number | boolean | null | object;

export interface SettingItem {
  key: string;
  value: SettingValue;
  description: string | null;
  updated_at: string | null;
}

export interface SettingCategory {
  name: string;
  label: string;
  items: SettingItem[];
}

export interface AllSettingsResponse {
  categories: SettingCategory[];
}

// --- Monitoring (Phase 14-12) ---

export interface ComponentStatus {
  name: string;
  status: "HEALTHY" | "DOWN" | "UNKNOWN";
  latency_ms: number | null;
  metadata: Record<string, unknown>;
}

export interface ComponentStatusResponse {
  components: ComponentStatus[];
}

export interface ResponseTimePoint {
  timestamp: string;
  p50: number;
  p95: number;
  p99: number;
  sample_count: number;
}

export interface ResponseTimeTrendResponse {
  period: string;
  interval_seconds: number;
  data: ResponseTimePoint[];
}

export interface ErrorTrendPoint {
  timestamp: string;
  client_errors: number;
  server_errors: number;
}

export interface ErrorTrendResponse {
  period: string;
  interval_seconds: number;
  data: ErrorTrendPoint[];
}

// --- Alerts (Phase 14-13) ---

export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "firing" | "resolved";
export type AlertOperator = "gt" | "gte" | "lt" | "lte" | "eq" | "ne";
export type AlertChannel = "email" | "webhook";

export interface AlertCondition {
  operator: AlertOperator;
  threshold: number;
  duration_seconds?: number | null;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string | null;
  metric_name: string;
  condition: AlertCondition;
  severity: AlertSeverity;
  channels: AlertChannel[];
  channel_config: Record<string, unknown>;
  enabled: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AlertHistoryItem {
  id: string;
  rule_id: string;
  rule_name?: string | null;
  severity?: AlertSeverity | null;
  triggered_at: string;
  resolved_at?: string | null;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  status: AlertStatus;
  metric_value?: number | null;
  message?: string | null;
  notified_channels: string[];
}

export interface AlertHistoryResponse {
  items: AlertHistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface AlertMetric {
  name: string;
  label: string;
}

export interface AlertMetricsResponse {
  metrics: AlertMetric[];
}

export interface AlertEvaluateStats {
  evaluated: number;
  fired: number;
  resolved: number;
  skipped: number;
}

// --- Job Schedules (Phase 14-14) ---

export type JobScheduleStatus = "idle" | "running" | "failed";
export type JobRunResult = "success" | "failed" | "cancelled";

export interface JobScheduleRun {
  id: string;
  status: string;
  started_at?: string | null;
  ended_at?: string | null;
  duration_ms?: number | null;
  items_processed?: number | null;
  result?: JobRunResult | null;
  error_code?: string | null;
  error_message?: string | null;
}

export interface JobSchedule {
  id: string;
  name: string;
  description?: string | null;
  schedule?: string | null;
  schedule_description?: string | null;
  enabled: boolean;
  last_run_at?: string | null;
  last_run_duration_ms?: number | null;
  last_run_result?: JobRunResult | null;
  last_run_id?: string | null;
  next_run_at?: string | null;
  status: JobScheduleStatus;
  current_run_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobScheduleDetail extends JobSchedule {
  recent_runs: JobScheduleRun[];
}

export interface CronPreviewResponse {
  description: string;
  next_runs: string[];
}

// --- Common ---

export interface ListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface SingleResponse<T> {
  success: boolean;
  data: T;
}
