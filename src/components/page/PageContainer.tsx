import { cn } from "@/lib/utils";

interface Props {
  children: React.ReactNode;
  className?: string;
  /** 기본(normal)은 1280px 최대폭. wide 는 full width */
  size?: "normal" | "wide" | "narrow";
}

/**
 * 페이지 공통 래퍼
 * - 데스크탑/웹/모바일 공통 패딩·최대 폭 토큰 기반
 * - 페이지별 max-w-* 하드코딩 금지 (CLAUDE.md: UI 웹·데스크탑 호환)
 */
export function PageContainer({ children, className, size = "normal" }: Props) {
  return (
    <div
      className={cn(
        "mx-auto w-full",
        "px-4 sm:px-6 lg:px-8",
        "py-4 sm:py-6",
        size === "normal" && "max-w-[80rem]",
        size === "narrow" && "max-w-[56rem]",
        size === "wide" && "max-w-none",
        className,
      )}
    >
      {children}
    </div>
  );
}
