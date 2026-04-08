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
            "h-4 bg-gray-200 rounded",
            i === rows - 1 && rows > 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-4 p-4 border-b border-gray-100">
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
      <div className="h-5 w-16 bg-gray-200 rounded-full" />
      <div className="h-5 w-16 bg-gray-100 rounded-full" />
      <div className="h-3 w-20 bg-gray-100 rounded" />
    </div>
  );
}
