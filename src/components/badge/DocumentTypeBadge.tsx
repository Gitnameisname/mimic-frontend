import { cn } from "@/lib/utils";

interface Props {
  type: string;
  className?: string;
}

export function DocumentTypeBadge({ type, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200",
        className
      )}
    >
      {type}
    </span>
  );
}
