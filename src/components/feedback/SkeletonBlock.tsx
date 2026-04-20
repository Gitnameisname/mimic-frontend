import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  rows?: number;
}

export function SkeletonBlock({ className, rows = 1 }: Props) {
  return (
    <div className={cn("animate-pulse space-y-2", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 rounded bg-[var(--color-surface-subtle)]",
            i === rows - 1 && rows > 1 ? "w-3/4" : "w-full",
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div
      aria-hidden="true"
      className="doc-grid animate-pulse border-b border-[var(--color-border)] px-4 py-3 last:border-b-0"
    >
      <div data-col="title" className="h-4 w-3/4 rounded bg-[var(--color-surface-subtle)]" />
      <div data-col="type" className="h-5 w-16 rounded-full bg-[var(--color-surface-subtle)]" />
      <div data-col="status" className="h-5 w-16 rounded-full bg-[var(--color-surface-subtle)]" />
      <div data-col="author" className="h-3 w-20 rounded bg-[var(--color-surface-subtle)]" />
      <div data-col="updated" className="h-3 w-14 rounded bg-[var(--color-surface-subtle)]" />
    </div>
  );
}
