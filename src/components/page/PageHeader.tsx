import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * 페이지 제목 + 우측 액션 영역
 * - 좁은 화면에서 액션이 줄바꿈되어 잘리지 않도록 flex-wrap
 * - 제목은 h1, description 은 보조 텍스트
 */
export function PageHeader({ title, description, actions, className }: Props) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--color-text)] truncate">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-[var(--color-text-subtle)]">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}
