import type { WorkflowStatus } from "./workflow";

export interface Version {
  id: string;
  document_id: string;
  version_number: string;
  workflow_status: WorkflowStatus;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  change_reason?: string;
  metadata?: Record<string, unknown>;
}
