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

// ─── FG6.3: Evaluation & Extraction (Skeleton types) ───

export interface GoldenSet {
  id: string;
  name: string;
  description: string | null;
  item_count: number;
  current_version: number;
  created_at: string;
  updated_at: string;
}

export interface GoldenSetItem {
  id: string;
  golden_set_id: string;
  question: string;
  expected_answer: string;
  expected_source_doc_id: string | null;
  expected_citation: string | null;
}

export interface EvaluationRun {
  id: string;
  golden_set_id: string;
  golden_set_name: string;
  prompt_version_id: string | null;
  model_name: string | null;
  ran_at: string;
  item_count: number;
  avg_faithfulness: number | null;
  avg_answer_relevance: number | null;
  citation_present_rate: number | null;
  passed_ci: boolean | null;
}

export interface EvaluationMetricSeries {
  date: string;
  faithfulness: number | null;
  answer_relevance: number | null;
  citation_present_rate: number | null;
}

export interface ExtractionSchema {
  id: string;
  document_type_code: string;
  fields_count: number;
  extraction_mode: "deterministic" | "probabilistic";
  updated_at: string;
}

export interface ExtractionSchemaField {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  required: boolean;
  description: string | null;
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
