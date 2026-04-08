import { cn } from "@/lib/utils";
import {
  WORKFLOW_STATUS_LABELS,
  WORKFLOW_STATUS_COLORS,
  type WorkflowStatus,
} from "@/types/workflow";

interface Props {
  status: WorkflowStatus;
  className?: string;
}

export function WorkflowStatusBadge({ status, className }: Props) {
  const colors = WORKFLOW_STATUS_COLORS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
    >
      {WORKFLOW_STATUS_LABELS[status]}
    </span>
  );
}
