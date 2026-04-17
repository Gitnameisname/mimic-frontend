"use client";

import { useEffect } from "react";
import { Button } from "@/components/button/Button";
import { AppLayout } from "@/components/layout/AppLayout";
import { logError } from "@/lib/logger";

export default function DocumentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error, "DocumentsError");
  }, [error]);

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
        <p className="text-4xl text-red-300">!</p>
        <h2 className="text-base font-semibold text-gray-900">오류가 발생했습니다</h2>
        <p className="text-sm text-gray-500">
          페이지를 불러오는 중 문제가 발생했습니다.
        </p>
        <Button variant="secondary" size="sm" onClick={reset}>
          다시 시도
        </Button>
      </div>
    </AppLayout>
  );
}
