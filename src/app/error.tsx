"use client";

import { useEffect } from "react";
import { Button } from "@/components/button/Button";
import { logError } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError(error, "GlobalError");
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 text-center px-4">
      <div className="text-4xl text-red-400">!</div>
      <h1 className="text-lg font-semibold text-gray-900">오류가 발생했습니다</h1>
      <p className="text-sm text-gray-500 max-w-sm">
        예기치 못한 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.
      </p>
      {error.digest && (
        <p className="text-xs text-gray-400 font-mono">오류 코드: {error.digest}</p>
      )}
      <Button variant="secondary" size="sm" onClick={reset}>
        다시 시도
      </Button>
    </div>
  );
}
