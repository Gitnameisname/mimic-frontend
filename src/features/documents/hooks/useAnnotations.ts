/**
 * useAnnotations / useAnnotationMutations — S3 Phase 3 FG 3-3.
 */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  annotationsApi,
  notificationsApi,
  type Annotation,
  type AnnotationCreateRequest,
  type Notification,
} from "@/lib/api/annotations";

const ANNOTATIONS_KEY = ["annotations"] as const;
const NOTIFICATIONS_KEY = ["notifications"] as const;

export function useAnnotations(
  documentId: string,
  options: {
    includeResolved?: boolean;
    includeOrphans?: boolean;
    enabled?: boolean;
  } = {},
) {
  const { includeResolved = true, includeOrphans = true, enabled = true } = options;
  return useQuery<Annotation[]>({
    queryKey: [
      ...ANNOTATIONS_KEY,
      documentId,
      { includeResolved, includeOrphans },
    ],
    queryFn: () =>
      annotationsApi.list(documentId, {
        include_resolved: includeResolved,
        include_orphans: includeOrphans,
      }),
    enabled: enabled && !!documentId,
    staleTime: 15_000,
  });
}

export function useCreateAnnotation(documentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AnnotationCreateRequest) =>
      annotationsApi.create(documentId, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ANNOTATIONS_KEY, documentId] });
    },
  });
}

export function useUpdateAnnotation(documentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      annotationsApi.update(id, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ANNOTATIONS_KEY, documentId] });
    },
  });
}

export function useResolveAnnotation(documentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => annotationsApi.resolve(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ANNOTATIONS_KEY, documentId] });
    },
  });
}

export function useReopenAnnotation(documentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => annotationsApi.reopen(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ANNOTATIONS_KEY, documentId] });
    },
  });
}

export function useDeleteAnnotation(documentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => annotationsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...ANNOTATIONS_KEY, documentId] });
    },
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function useUnreadNotificationCount(enabled: boolean = true) {
  return useQuery<number>({
    queryKey: [...NOTIFICATIONS_KEY, "unread-count"],
    queryFn: () => notificationsApi.unreadCount(),
    enabled,
    refetchInterval: enabled ? 30_000 : false,
    staleTime: 15_000,
  });
}

export function useNotifications(options: { unreadOnly?: boolean; enabled?: boolean } = {}) {
  const { unreadOnly = false, enabled = true } = options;
  return useQuery<Notification[]>({
    queryKey: [...NOTIFICATIONS_KEY, "list", { unreadOnly }],
    queryFn: () => notificationsApi.list({ unread_only: unreadOnly, limit: 20 }),
    enabled,
    staleTime: 15_000,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => notificationsApi.markRead(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
    },
  });
}
