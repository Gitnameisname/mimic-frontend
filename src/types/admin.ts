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
  last_login_at?: string;
  created_at: string;
  updated_at: string;
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

export interface AdminRoleDetail extends AdminRole {
  // Future: permissions list
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
  key_prefix: string;
  scope: string;
  status: string;
  issuer_id?: string;
  expires_at?: string;
  last_used_at?: string;
  created_at: string;
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
