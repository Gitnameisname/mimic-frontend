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

const FALLBACK_COLORS = { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" };

export function WorkflowStatusBadge({ status, className }: Props) {
  const colors = WORKFLOW_STATUS_COLORS[status] ?? FALLBACK_COLORS;
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
      {WORKFLOW_STATUS_LABELS[status] ?? status ?? "—"}
    </span>
  );
}
