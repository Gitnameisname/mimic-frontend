import { toQueryString } from "@/lib/utils/url";
import { api } from "./client";
import type {
  ExtractionCandidate,
  ExtractionListResponse,
  ApproveExtractionRequest,
  ModifyExtractionRequest,
  RejectExtractionRequest,
  BatchApproveRequest,
  BatchRejectRequest,
} from "@/types/extraction";

function extractData<T>(raw: unknown): T {
  const r = raw as { data?: T };
  return (r.data ?? raw) as T;
}

export const extractionsApi = {
  listPending: async (params?: {
    scope_profile_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<ExtractionListResponse> => {
    const path = `/api/v1/extractions/pending${toQueryString({
      scope_profile_id: params?.scope_profile_id,
      limit: params?.limit,
      offset: params?.offset,
    })}`;
    const raw = await api.get<unknown>(path);
    return extractData<ExtractionListResponse>(raw);
  },

  getById: async (id: string): Promise<ExtractionCandidate> => {
    const raw = await api.get<unknown>(`/api/v1/extractions/${id}`);
    return extractData<ExtractionCandidate>(raw);
  },

  approve: async (id: string, body?: ApproveExtractionRequest): Promise<unknown> => {
    return api.post<unknown>(`/api/v1/extractions/${id}/approve`, body ?? {});
  },

  modify: async (id: string, body: ModifyExtractionRequest): Promise<unknown> => {
    return api.post<unknown>(`/api/v1/extractions/${id}/modify`, body);
  },

  reject: async (id: string, body: RejectExtractionRequest): Promise<void> => {
    await api.post<unknown>(`/api/v1/extractions/${id}/reject`, body);
  },

  batchApprove: async (body: BatchApproveRequest): Promise<unknown> => {
    return api.post<unknown>(`/api/v1/extractions/batch-approve`, body);
  },

  batchReject: async (body: BatchRejectRequest): Promise<unknown> => {
    return api.post<unknown>(`/api/v1/extractions/batch-reject`, body);
  },
};
