import { cn } from "@/lib/utils";
import { Button } from "@/components/button/Button";

interface Props {
  title?: string;
  description?: string;
  retry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "오류가 발생했습니다",
  description = "데이터를 불러오지 못했습니다. 다시 시도해 주세요.",
  retry,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className
      )}
    >
      <div className="w-12 h-12 mb-4 rounded-full bg-red-50 flex items-center justify-center">
        <svg
          className="w-6 h-6 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-900">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
      {retry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={retry}>
          다시 시도
        </Button>
      )}
    </div>
  );
}

export function PermissionDenied({
  message = "이 페이지에 대한 접근 권한이 없습니다.",
  backTo,
}: {
  message?: string;
  backTo?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <svg
          className="w-6 h-6 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-900">접근 권한 없음</p>
      <p className="mt-1 text-sm text-gray-500">{message}</p>
      {backTo && (
        <a
          href={backTo}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700"
        >
          돌아가기
        </a>
      )}
    </div>
  );
}
