import { api } from "./client";
import { toQueryString } from "@/lib/utils/url";
import type {
  Document,
  DocumentListItem,
  DocumentListResponse,
  DocumentFilters,
  WorkflowStatus,
} from "@/types";

// 프론트엔드 WorkflowStatus → 백엔드 document status 매핑
const WORKFLOW_TO_DOC_STATUS: Partial<Record<string, string>> = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
  DEPRECATED: "deprecated",
};

// 백엔드 document status → 프론트엔드 WorkflowStatus 매핑
const DOC_STATUS_TO_WORKFLOW: Record<string, WorkflowStatus> = {
  draft: "DRAFT",
  published: "PUBLISHED",
  archived: "ARCHIVED",
  deprecated: "ARCHIVED",
};

function buildDocumentListParams(
  filters: DocumentFilters
): Record<string, string | number | boolean | undefined | null> {
  const params: Record<string, string | number | boolean | undefined | null> = {};

  // 페이지네이션: limit → page_size (백엔드는 page_size 사용)
  if (filters.page !== undefined) params.page = filters.page;
  if (filters.limit !== undefined) params.page_size = filters.limit;

  // 정렬: sort + order → 단일 sort 파라미터 (내림차순은 "-" 접두사)
  if (filters.sort) {
    params.sort = filters.order === "desc" ? `-${filters.sort}` : filters.sort;
  }

  // status: WorkflowStatus → 백엔드 document status (매핑 불가 값은 제외)
  if (filters.status) {
    const mapped = WORKFLOW_TO_DOC_STATUS[filters.status as string];
    if (mapped) params.status = mapped;
  }

  // type → document_type
  if (filters.type) params.document_type = filters.type;

  // S3 Phase 2 FG 2-1: 컬렉션 / 폴더 필터
  if (filters.collection) params.collection = filters.collection;
  if (filters.folder) {
    params.folder = filters.folder;
    if (filters.includeSubfolders) params.include_subfolders = "true";
  }

  // S3 Phase 2 FG 2-2 (2026-04-24): 태그 필터 — 서버 정규화된 name 기준
  if (filters.tag) {
    const t = String(filters.tag ?? "").trim();
    if (t) params.tag = t;
  }

  // S3 Phase 2 FG 2-1 UX 3차 (2026-04-24): 제목 부분 일치 검색 (서버 ILIKE).
  // author 는 여전히 백엔드 미지원 → 전송 제외.
  if (filters.q !== undefined) {
    const trimmed = String(filters.q ?? "").trim();
    if (trimmed) params.q = trimmed;
  }

  return params;
}

// 백엔드 응답 { data: [...], meta: { pagination: {...} } } → DocumentListResponse 변환
function adaptListResponse(raw: unknown): DocumentListResponse {
  const r = raw as {
    data: Array<Record<string, unknown>>;
    meta: { pagination?: { page?: number; page_size?: number; total?: number } };
  };
  const items: DocumentListItem[] = (r.data ?? []).map((doc) => ({
    id: doc.id as string,
    title: doc.title as string,
    document_type: doc.document_type as string,
    created_by_name: (doc.created_by as string) ?? "",
    updated_at: doc.updated_at as string,
    version_number: "",
    workflow_status: DOC_STATUS_TO_WORKFLOW[doc.status as string] ?? "DRAFT",
  }));
  const pagination = r.meta?.pagination ?? {};
  const total = pagination.total ?? 0;
  const pageSize = pagination.page_size ?? 20;
  return {
    items,
    total,
    page: pagination.page ?? 1,
    limit: pageSize,
    total_pages: pageSize > 0 ? Math.ceil(total / pageSize) : 1,
  };
}

export const documentsApi = {
  list: async (filters: DocumentFilters = {}): Promise<DocumentListResponse> => {
    const raw = await api.get<unknown>(`/api/v1/documents${toQueryString(buildDocumentListParams(filters))}`);
    return adaptListResponse(raw);
  },

  get: async (id: string): Promise<Document> => {
    const raw = await api.get<unknown>(`/api/v1/documents/${id}`);
    return adaptDocument(raw);
  },

  create: async (body: { title: string; document_type: string; metadata?: Record<string, unknown> }): Promise<Document> => {
    const raw = await api.post<unknown>("/api/v1/documents", body);
    return adaptDocument(raw);
  },

  update: async (id: string, body: { title?: string; metadata?: Record<string, unknown> }): Promise<Document> => {
    const raw = await api.patch<unknown>(`/api/v1/documents/${id}`, body);
    return adaptDocument(raw);
  },
};

// 백엔드 응답 { data: {...}, meta: {...} } → Document 변환
export function adaptDocument(raw: unknown): Document {
  const r = raw as { data?: Record<string, unknown> };
  const d: Record<string, unknown> = r.data ?? (raw as Record<string, unknown>);
  // S3 Phase 2 FG 2-1 UX 2차: 배치 상태 필드 보존
  const folderId =
    d.folder_id === undefined || d.folder_id === null ? null : (d.folder_id as string);
  const inCollectionIds = Array.isArray(d.in_collection_ids)
    ? (d.in_collection_ids as string[])
    : [];
  // S3 Phase 2 FG 2-2: 태그 목록 보존 (서버 파서 기준)
  const rawTags = Array.isArray(d.document_tags) ? (d.document_tags as unknown[]) : [];
  const documentTags = rawTags
    .filter(
      (t): t is { id: string; name: string; source: string } =>
        !!t &&
        typeof t === "object" &&
        typeof (t as Record<string, unknown>).id === "string" &&
        typeof (t as Record<string, unknown>).name === "string",
    )
    .map((t) => ({
      id: t.id,
      name: t.name,
      source: (t.source === "inline" || t.source === "frontmatter" || t.source === "both"
        ? t.source
        : "inline") as "inline" | "frontmatter" | "both",
    }));
  return {
    id: d.id as string,
    title: (d.title as string) ?? "",
    document_type: (d.document_type as string) ?? "",
    created_by: (d.created_by as string) ?? "",
    created_by_name: (d.created_by as string) ?? "",
    created_at: d.created_at as string,
    updated_at: d.updated_at as string,
    current_version_id: (d.current_draft_version_id ?? d.current_published_version_id) as string | undefined,
    metadata: (d.metadata as Record<string, unknown> | undefined),
    folder_id: folderId,
    in_collection_ids: inCollectionIds,
    document_tags: documentTags,
  };
}
