/**
 * Folders API 클라이언트 — S3 Phase 2 FG 2-1.
 *
 * 백엔드 `/api/v1/folders` + `/api/v1/documents/{id}/folder` 의 wrapper.
 * 응답 envelope `{ data, meta }` 는 data 만 꺼내 반환.
 */

import { api } from "./client";

export interface Folder {
  id: string;
  owner_id: string;
  parent_id: string | null;
  name: string;
  path: string;
  depth: number;
  created_at: string;
  updated_at: string;
}

export interface FolderListResponse {
  items: Folder[];
  total: number;
}

export interface FolderCreateRequest {
  name: string;
  parent_id?: string | null;
}

export interface FolderMoveRequest {
  new_parent_id: string | null;
}

export interface SetDocumentFolderRequest {
  folder_id: string | null;
}

type Envelope<T> = { data: T; meta?: unknown };
type ListEnvelope<T> = { data: T[]; meta?: { total?: number } };

function unwrap<T>(raw: unknown): T {
  const r = raw as Envelope<T>;
  if (r && typeof r === "object" && "data" in r) return r.data;
  return raw as T;
}

function unwrapList<T>(raw: unknown): { items: T[]; total: number } {
  const r = raw as ListEnvelope<T>;
  if (r && typeof r === "object" && Array.isArray(r.data)) {
    return { items: r.data, total: r.meta?.total ?? r.data.length };
  }
  const arr = raw as T[];
  return { items: Array.isArray(arr) ? arr : [], total: Array.isArray(arr) ? arr.length : 0 };
}

export const foldersApi = {
  list: async (): Promise<FolderListResponse> => {
    const raw = await api.get<unknown>("/api/v1/folders");
    return unwrapList<Folder>(raw);
  },

  get: async (id: string): Promise<Folder> => {
    const raw = await api.get<unknown>(`/api/v1/folders/${id}`);
    return unwrap<Folder>(raw);
  },

  create: async (body: FolderCreateRequest): Promise<Folder> => {
    const raw = await api.post<unknown>("/api/v1/folders", body);
    return unwrap<Folder>(raw);
  },

  rename: async (id: string, newName: string): Promise<Folder> => {
    const raw = await api.patch<unknown>(`/api/v1/folders/${id}`, { name: newName });
    return unwrap<Folder>(raw);
  },

  move: async (id: string, body: FolderMoveRequest): Promise<Folder> => {
    const raw = await api.post<unknown>(`/api/v1/folders/${id}/move`, body);
    return unwrap<Folder>(raw);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete<void>(`/api/v1/folders/${id}`);
  },

  setDocumentFolder: async (
    documentId: string,
    folderId: string | null,
  ): Promise<void> => {
    await api.put<unknown>(`/api/v1/documents/${documentId}/folder`, {
      folder_id: folderId,
    });
  },
};
