import type { ReactNode } from "react";
import { ErrorState } from "./ErrorState";

interface QueryLoaderProps<TData> {
  query: {
    isLoading: boolean;
    isError: boolean;
    data: TData | undefined;
    refetch?: () => void;
  };
  /** 로딩 중 표시할 스켈레톤. 기본값: SkeletonBlock rows=3 */
  skeleton?: ReactNode;
  /** 에러/데이터 없음 표시할 컴포넌트 */
  error?: ReactNode;
  /** data가 존재할 때 렌더링할 함수 */
  children: (data: TData) => ReactNode;
}

/**
 * TanStack Query 결과의 loading/error/success 상태를 처리하는 래퍼.
 *
 * 사용 예:
 * ```tsx
 * <QueryLoader query={query}>
 *   {(data) => <MyContent data={data} />}
 * </QueryLoader>
 * ```
 */
export function QueryLoader<TData>({
  query,
  skeleton,
  error,
  children,
}: QueryLoaderProps<TData>) {
  if (query.isLoading) {
    return (
      <>
        {skeleton ?? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        )}
      </>
    );
  }

  if (query.isError || query.data === undefined) {
    return (
      <>
        {error ?? <ErrorState retry={query.refetch} />}
      </>
    );
  }

  return <>{children(query.data)}</>;
}
