"use client";

import { create } from "zustand";
import type { ExtractionCandidate } from "@/types/extraction";

interface ExtractionState {
  selectedId: string | null;
  editedFields: Record<string, unknown>;
  editReasons: Record<string, string>;
  selectedIds: Set<string>;

  setSelectedId: (id: string | null) => void;
  setFieldValue: (fieldName: string, value: unknown) => void;
  setFieldReason: (fieldName: string, reason: string) => void;
  resetEdits: () => void;
  initEdits: (candidate: ExtractionCandidate) => void;
  toggleSelectId: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
}

export const useExtractionStore = create<ExtractionState>((set) => ({
  selectedId: null,
  editedFields: {},
  editReasons: {},
  selectedIds: new Set(),

  setSelectedId: (id) => set({ selectedId: id, editedFields: {}, editReasons: {} }),

  setFieldValue: (fieldName, value) =>
    set((s) => ({ editedFields: { ...s.editedFields, [fieldName]: value } })),

  setFieldReason: (fieldName, reason) =>
    set((s) => ({ editReasons: { ...s.editReasons, [fieldName]: reason } })),

  resetEdits: () => set({ editedFields: {}, editReasons: {} }),

  initEdits: (candidate) =>
    set({ editedFields: { ...candidate.extracted_fields }, editReasons: {} }),

  toggleSelectId: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),

  selectAll: (ids) => set({ selectedIds: new Set(ids) }),

  clearSelection: () => set({ selectedIds: new Set() }),
}));
