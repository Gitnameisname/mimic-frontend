/**
 * Window 전역 타입 확장.
 *
 * __mimir_at: 레거시 호환용 AT 저장소 (Task 14-6/7).
 * TODO(S3-Phase1): JWT Bearer 전환 후 제거
 */
declare global {
  interface Window {
    __mimir_at?: string;
  }
}

export {};
