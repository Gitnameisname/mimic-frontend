// S2 Admin TypeScript types for Phase 6

// ─── Common ───

export interface PageMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PagedResponse<T> {
  data: T[];
  meta: PageMeta;
}

export interface SingleResponse<T> {
  data: T;
}

// ─── FG6.1: AI Platform ───

export type ProviderType = "llm" | "embedding";
export type ProviderStatus = "active" | "inactive" | "error";

export interface LLMProvider {
  id: string;
  name: string;
  type: ProviderType;
  model_name: string;
  api_base_url: string | null;
  embed_endpoint: string | null;
  description: string | null;
  status: ProviderStatus;
  is_default: boolean;
  last_tested_at: string | null;
  last_test_result: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderTestResult {
  success: boolean;
  latency_ms: number | null;
  http_status: number | null;
  error: string | null;
  error_detail: string | null;
  tested_at: string;
}

export interface PromptVersion {
  id: string;
  prompt_id: string;
  version_number: number;
  content: string;
  created_by: string | null;
  created_at: string;
  is_active: boolean;
}

export interface Prompt {
  id: string;
  name: string;
  description: string | null;
  active_version: number | null;
  active_version_id: string | null;
  ab_test_config: ABTestConfig | null;
  created_at: string;
  updated_at: string;
  versions?: PromptVersion[];
}

export interface ABTestConfig {
  version_a_id: string;
  version_b_id: string;
  ratio_a: number;
  ratio_b: number;
}

export interface SystemCapabilities {
  rag_available: boolean;
  embedding_model: string | null;
  llm_providers_count: number;
  active_llm_providers: number;
  chunking_enabled: boolean;
  vector_store: string | null;
  fts_enabled: boolean;
  degraded: boolean;
  degraded_reasons: string[];
}

export interface UsageMetric {
  date: string;
  model_name: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  call_count: number;
  avg_latency_ms: number;
  estimated_cost_usd: number;
}

export interface UsageSummary {
  model_name: string;
  provider: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_calls: number;
  avg_latency_ms: number;
  total_cost_usd: number;
}

export interface UsageDashboard {
  period_days: number;
  daily_metrics: UsageMetric[];
  summary_by_model: UsageSummary[];
  total_cost_usd: number;
}

// ─── FG6.2: Agents & Scope ───

export type AgentStatus = "active" | "blocked";

export interface Agent {
  id: string;
  name: string;
  description: string | null;
  status: AgentStatus;
  delegated_users_count: number;
  last_activity_at: string | null;
  created_at: string;
  rate_limits: AgentRateLimits | null;
}

export interface AgentRateLimits {
  tool_call: number;
  stream: number;
  read: number;
  init: number;
}

export interface AgentDelegation {
  user_id: string;
  user_email: string;
  user_name: string | null;
  delegated_at: string;
  scope_names: string[];
}

export interface AgentDetail extends Agent {
  delegations: AgentDelegation[];
  scope_names: string[];
  kill_switch_history: KillSwitchEvent[];
}

export interface KillSwitchEvent {
  id: string;
  blocked_at: string;
  unblocked_at: string | null;
  duration: "1h" | "24h" | "permanent";
  reason: string | null;
  triggered_by: string;
}

export interface AgentApiKey {
  id: string;
  agent_id: string;
  key_prefix: string;
  expires_at: string;
  created_at: string;
}

export interface AgentApiKeyWithSecret extends AgentApiKey {
  secret: string;
}

export interface AuditEvent {
  id: string;
  event_type: string;
  occurred_at: string;
  actor_type: "user" | "agent";
  acting_on_behalf_of: string | null;
  resource_type: string | null;
  resource_id: string | null;
  previous_state: Record<string, unknown> | null;
  new_state: Record<string, unknown> | null;
  action_result: "success" | "failure" | "partial";
  reason: string | null;
}

export interface ScopeProfile {
  id: string;
  name: string;
  description: string | null;
  scopes_count: number;
  api_keys_count: number;
  created_at: string;
  updated_at: string;
  // S3 Phase 3 FG 3-2 (2026-04-27): 운영 설정. 응답에 항상 포함됨 (default false).
  settings?: ScopeProfileSettings;
  // S3 Phase 4 FG 4-0 §2.1.6 (2026-04-28): MCP tool-level ACL 화이트리스트.
  // 빈 배열 = default-deny (모든 도구 거부). 등록 가능 도구 이름은 백엔드 known_tool_names() 참조.
  allowed_tools?: string[];
}

// S3 Phase 3 FG 3-2 (2026-04-27)
export interface ScopeProfileSettings {
  /** Contributors 패널의 viewers 섹션 노출 정책. False (기본) 면 정책 게이트 강제 false. */
  expose_viewers: boolean;
}

export interface ScopeEntry {
  name: string;
  filter: FilterExpression | null;
}

export interface ScopeProfileDetail extends ScopeProfile {
  scopes: ScopeEntry[];
  api_key_refs: ScopeProfileApiKeyRef[];
}

export interface ScopeProfileApiKeyRef {
  id: string;
  key_prefix: string;
  owner_id: string | null;
}

export type FilterOperator = "eq" | "neq" | "in" | "nin" | "contains" | "gt" | "gte" | "lt" | "lte";

export interface FilterCondition {
  field: string;
  op: FilterOperator;
  value: unknown;
}

export interface FilterExpression {
  and?: FilterExpression[];
  or?: FilterExpression[];
  condition?: FilterCondition;
}

export type ProposalStatus = "pending" | "approved" | "rejected";

export interface Proposal {
  id: string;
  agent_id: string;
  agent_name: string;
  document_id: string;
  document_title: string;
  summary: string;
  status: ProposalStatus;
  proposed_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  feedback: string | null;
}

export interface ProposalDetail extends Proposal {
  original_content: string;
  proposed_content: string;
  target_status: string | null;
  proposal_reason: string | null;
}

export interface AgentActivityStats {
  agent_id: string;
  agent_name: string;
  total_proposals: number;
  approved: number;
  rejected: number;
  pending: number;
  approval_rate: number;
  avg_review_hours: number | null;
  top_rejection_reasons: string[];
  top_document_types: string[];
}

export interface AgentActivitySeries {
  date: string;
  agent_id: string;
  agent_name: string;
  proposals: number;
  approved: number;
  approval_rate: number;
}

export interface AgentActivityDashboard {
  period_days: number;
  series: AgentActivitySeries[];
  stats_by_agent: AgentActivityStats[];
  anomalies: AgentAnomaly[];
}

export interface AgentAnomaly {
  agent_id: string;
  agent_name: string;
  type: "high_rejection_rate" | "kill_switch_triggered";
  detail: string;
  detected_at: string;
}

// ─── FG6.3 / Phase 7: Evaluation & Extraction ───

// Phase 7 FG7.1: GoldenSet / GoldenItem 은 backend 모델과 1:1 일치한다.
// backend/app/models/golden_set.py 참조.

export type GoldenSetDomain =
  | "policy"
  | "regulation"
  | "technical_guide"
  | "manual"
  | "faq"
  | "custom";

export type GoldenSetStatus = "draft" | "published" | "archived";

export interface SourceRef {
  document_id: string;
  version_id: string;
  node_id: string;
}

export interface Citation5Tuple {
  document_id: string;
  version_id: string;
  node_id: string;
  span_offset: number | null;
  content_hash: string;
}

export interface GoldenSet {
  id: string;
  scope_id: string;
  name: string;
  description: string | null;
  domain: GoldenSetDomain;
  status: GoldenSetStatus;
  version: number;
  item_count: number | null;
  extra_metadata: Record<string, unknown>;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string | null;
  is_deleted: boolean;
}

export interface GoldenSetItem {
  id: string;
  golden_set_id: string;
  version: number;
  question: string;
  expected_answer: string;
  expected_source_docs: SourceRef[];
  expected_citations: Citation5Tuple[];
  notes: string | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string | null;
}

export interface GoldenSetDetail extends GoldenSet {
  items: GoldenSetItem[];
}

export interface GoldenSetVersionInfo {
  version: number;
  created_at: string;
  created_by: string;
  item_count: number;
}

export interface GoldenSetImportResult {
  golden_set_id: string;
  total_items: number;
  successful_items: number;
  failed_items: number;
  errors: string[];
}

// ── Phase 7 FG7.2: Evaluation Runner (백엔드 /api/v1/evaluations 와 1:1 매핑) ──
//
// 백엔드 (backend/app/repositories/evaluation_repository.py::EvaluationRunRepository) 의
// list/get SELECT 컬럼을 그대로 반영한다. 필드 추가·변경 시 양쪽을 동시에 맞춘다.

export type EvaluationRunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export interface EvaluationRun {
  id: string;
  batch_id: string;
  status: EvaluationRunStatus;
  scope_id: string;
  actor_id: string;
  actor_type: "user" | "agent";
  total_items: number;
  successful_items: number | null;
  failed_items: number | null;
  overall_score: number | null;
  duration_seconds: number | null;
  created_at: string;
  completed_at: string | null;
  // get_by_id 에서만 채워지는 확장 필드
  total_tokens?: number | null;
  total_latency_ms?: number | null;
  total_cost?: number | null;
  started_at?: string | null;
}

export interface EvaluationResultRecord {
  id: string;
  item_id: string;
  question: string;
  answer: string;
  faithfulness: number | null;
  answer_relevance: number | null;
  context_precision: number | null;
  context_recall: number | null;
  citation_present_rate: number | null;
  hallucination_rate: number | null;
  overall_score: number | null;
  total_latency_ms: number | null;
  total_tokens: number | null;
  estimated_cost: number | null;
  created_at: string;
}

export interface EvaluationRunDetail extends EvaluationRun {
  results: EvaluationResultRecord[];
}

export interface EvaluationMetricComparisonEntry {
  eval1: number | null;
  eval2: number | null;
  difference: number;
}

export type EvaluationMetricKey =
  | "faithfulness"
  | "answer_relevance"
  | "context_precision"
  | "context_recall"
  | "citation_present_rate"
  | "hallucination_rate";

export interface EvaluationCompareResult {
  eval_id_1: string;
  eval_id_2: string;
  metric_comparison: Record<EvaluationMetricKey, EvaluationMetricComparisonEntry>;
  overall_score_1: number | null;
  overall_score_2: number | null;
  improvement: number;
}

/**
 * 백엔드 `ExtractionFieldDef` (app/models/extraction.py) 와 정합.
 *
 * 필드명은 snake_case 강제(서버 검증). 필드 타입은 S1 원칙 ①에 따라
 * 하드코딩 금지가 아니라 "열거 가능한 스키마 타입 집합"으로 고정한다.
 */
export type ExtractionFieldType =
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "array"
  | "object"
  | "enum";

export interface ExtractionSchemaField {
  field_name: string;
  field_type: ExtractionFieldType;
  required: boolean;
  description: string;
  // 검증 규칙
  pattern?: string | null;
  instruction?: string | null;
  examples?: string[];
  // 크기/범위 제약
  max_length?: number | null;
  min_value?: number | null;
  max_value?: number | null;
  // 타입별 추가 속성
  date_format?: string | null;
  enum_values?: string[] | null;
  default_value?: unknown;
  // object 중첩
  nested_schema?: Record<string, ExtractionSchemaField> | null;
}

/**
 * 백엔드 `ExtractionSchemaResponse` (app/schemas/extraction.py) 와 정합.
 *
 * - fields 는 객체(field_name → ExtractionSchemaField) 구조. 필드 개수는
 *   Object.keys(fields).length 로 계산.
 * - created_at/updated_at 은 ISO8601 문자열 (백엔드 .isoformat()).
 * - scope_profile_id 는 S2 원칙 ⑥ ACL 슬롯 (optional).
 */
export interface ExtractionSchema {
  id: string;
  doc_type_code: string;
  version: number;
  fields: Record<string, ExtractionSchemaField>;
  is_deprecated: boolean;
  deprecation_reason: string | null;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  scope_profile_id: string | null;
  extra_metadata: Record<string, unknown>;
}

/** 백엔드 `ExtractionSchemaVersionResponse` 와 정합.
 *
 * P5-2: `rolled_back_from_version` — 해당 버전이 롤백으로 생성되었다면 복원 기준이 된
 * 과거 버전 번호. 일반 편집/최초 생성은 null. 프론트 "반복 rollback 경고" 의 입력.
 */
export interface ExtractionSchemaVersion {
  id: string;
  schema_id: string;
  version: number;
  fields: Record<string, ExtractionSchemaField>;
  is_deprecated: boolean;
  deprecation_reason: string | null;
  change_summary: string | null;
  changed_fields: string[];
  created_at: string;
  created_by: string;
  rolled_back_from_version?: number | null;
}

// ─── P4-A: 서버 정본 버전 Diff 응답 ───

/**
 * 백엔드 `ExtractionSchemaDiffResponse` 와 정합.
 *
 * - base_version → target_version 방향 차이.
 * - added: target 에만 있는 필드명
 * - removed: base 에만 있는 필드명
 * - modified: 양쪽에 있고 속성 값이 다른 필드 + 속성별 before/after
 * - unchanged_count: 양쪽에 있고 동일한 필드 수
 */
export interface ExtractionSchemaPropertyDiff {
  key: string;
  before: unknown;
  after: unknown;
}

export interface ExtractionSchemaModifiedFieldDiff {
  name: string;
  changes: ExtractionSchemaPropertyDiff[];
}

export interface ExtractionSchemaDiff {
  doc_type_code: string;
  base_version: number;
  target_version: number;
  added: string[];
  removed: string[];
  modified: ExtractionSchemaModifiedFieldDiff[];
  unchanged_count: number;
}

export interface ExtractionResult {
  id: string;
  document_id: string;
  document_title: string;
  document_type_code: string;
  extracted_at: string;
  status: "pending_review" | "approved" | "rejected";
  reviewer_id: string | null;
  reviewed_at: string | null;
}

export interface ExtractionResultDetail extends ExtractionResult {
  original_content_preview: string;
  extracted_fields: Record<string, unknown>;
  field_spans: Record<string, string | null>;
}
