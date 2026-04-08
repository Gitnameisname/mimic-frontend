export type WorkflowStatus =
  | "DRAFT"
  | "IN_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "REJECTED"
  | "ARCHIVED";

export type WorkflowAction =
  | "submit-review"
  | "approve"
  | "reject"
  | "publish"
  | "archive"
  | "return-to-draft";

export type UserRole = "VIEWER" | "AUTHOR" | "REVIEWER" | "APPROVER";

export interface WorkflowHistoryItem {
  id: string;
  action: WorkflowAction;
  from_status: WorkflowStatus;
  to_status: WorkflowStatus;
  actor_id: string;
  actor_name: string;
  actor_role: UserRole;
  comment?: string;
  reason?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface ReviewActionItem {
  id: string;
  action: WorkflowAction;
  actor_id: string;
  actor_name: string;
  actor_role: UserRole;
  comment?: string;
  reason?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  DRAFT: "초안",
  IN_REVIEW: "검토 중",
  APPROVED: "승인됨",
  PUBLISHED: "발행됨",
  REJECTED: "반려됨",
  ARCHIVED: "보관됨",
};

export const WORKFLOW_STATUS_COLORS: Record<
  WorkflowStatus,
  { bg: string; text: string; border: string }
> = {
  DRAFT: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-200",
  },
  IN_REVIEW: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
  },
  APPROVED: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-200",
  },
  PUBLISHED: {
    bg: "bg-teal-100",
    text: "text-teal-700",
    border: "border-teal-200",
  },
  REJECTED: {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-200",
  },
  ARCHIVED: {
    bg: "bg-zinc-100",
    text: "text-zinc-600",
    border: "border-zinc-200",
  },
};
