export type ExtractionStatus = "pending" | "approved" | "rejected" | "modified";
export type ExtractionMode = "deterministic" | "creative";

export interface ExtractionConfidenceScore {
  field_name: string;
  confidence: number;
  reason?: string;
}

export interface HumanEdit {
  field_name: string;
  before_value: unknown;
  after_value: unknown;
  edited_at: string;
  edited_by: string;
  reason?: string;
}

export interface ExtractionCandidate {
  id: string;
  document_id: string;
  document_version: number;
  extraction_schema_id: string;
  extraction_schema_version: number;
  extracted_fields: Record<string, unknown>;
  confidence_scores: ExtractionConfidenceScore[];
  extraction_model: string;
  extraction_mode: ExtractionMode;
  extraction_latency_ms: number;
  extraction_tokens: Record<string, number> | null;
  extraction_cost_estimate: number | null;
  status: ExtractionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  human_feedback: string | null;
  human_edits: HumanEdit[];
  created_at: string;
  updated_at: string;
  actor_type: string;
  scope_profile_id: string | null;
}

export interface ExtractionListResponse {
  items: ExtractionCandidate[];
  total: number;
  pending_count: number;
  page: number;
  page_size: number;
}

export interface ApproveExtractionRequest {
  notes?: string;
}

export interface ModifyExtractionRequest {
  modifications: Record<string, unknown>;
  reasons?: Record<string, string>;
}

export interface RejectExtractionRequest {
  reason: string;
}

export interface BatchApproveRequest {
  candidate_ids: string[];
  notes?: string;
}

export interface BatchRejectRequest {
  candidate_ids: string[];
  reason: string;
}
