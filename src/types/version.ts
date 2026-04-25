import type { WorkflowStatus } from "./workflow";
import type { ProseMirrorDoc } from "./prosemirror";

export interface Version {
  id: string;
  document_id: string;
  version_number: string;
  workflow_status: WorkflowStatus;
  created_by: string;
  created_by_name: string;
  created_at: string;
  updated_at: string;
  change_reason?: string;
  metadata?: Record<string, unknown>;
  /** Draft/Publish 시점에 저장된 문서 제목. 에디터 초기 제목 로드에 사용. */
  title_snapshot?: string;
  summary_snapshot?: string;
  /**
   * Phase 1 FG 1-1 단일 정본. 버전 상세(`versionsApi.get`) 응답에만 포함되며
   * 목록(`versionsApi.list`) / 최신(`versionsApi.getLatest` 기본) 응답에는 없을 수 있다.
   */
  content_snapshot?: ProseMirrorDoc;
}
