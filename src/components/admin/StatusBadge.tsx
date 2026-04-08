import { cn } from "@/lib/utils";

type Variant = "success" | "warning" | "danger" | "info" | "neutral";

const VARIANT_CLASSES: Record<Variant, string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  neutral: "bg-gray-100 text-gray-600",
};

function resolveVariant(value: string): Variant {
  const v = value.toUpperCase();
  if (["ACTIVE", "COMPLETED", "OK", "ENABLED"].includes(v)) return "success";
  if (["RUNNING", "PENDING", "IN_REVIEW"].includes(v)) return "info";
  if (["FAILED", "INACTIVE", "SUSPENDED", "REVOKED"].includes(v)) return "danger";
  if (["WARNING", "DEGRADED", "SKIPPED"].includes(v)) return "warning";
  return "neutral";
}

interface Props {
  value: string;
  label?: string;
  variant?: Variant;
  className?: string;
}

export function StatusBadge({ value, label, variant, className }: Props) {
  const resolved = variant ?? resolveVariant(value);
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        VARIANT_CLASSES[resolved],
        className
      )}
    >
      {label ?? value}
    </span>
  );
}

// Severity badge for audit logs
export function SeverityBadge({ severity }: { severity: "CRITICAL" | "HIGH" | "NORMAL" }) {
  const map = {
    CRITICAL: "bg-red-100 text-red-700",
    HIGH: "bg-orange-100 text-orange-700",
    NORMAL: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", map[severity])}>
      {severity}
    </span>
  );
}
