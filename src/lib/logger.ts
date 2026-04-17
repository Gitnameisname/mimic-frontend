/**
 * 클라이언트 에러 로거.
 *
 * 개발: console.error로 출력.
 * 프로덕션: TODO(S3) — Sentry 또는 내부 에러 수집 서버 연동.
 */
export function logError(error: unknown, context?: string): void {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[${context ?? "Error"}]`, error);
    return;
  }
  // TODO(S3-Phase1): Sentry.captureException(error, { tags: { context } });
  // 프로덕션에서 외부 모니터링 미연동 시 조용히 무시 (사용자에게 노출 없음)
}
