"use client";

import { create } from "zustand";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number; // ms, undefined = 수동 닫기
}

interface UiState {
  sidebarCollapsed: boolean;
  toasts: Toast[];
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  toasts: [],

  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  addToast: (toast) =>
    set((s) => ({
      toasts: [
        ...s.toasts.slice(-2), // 최대 3개
        { ...toast, id: crypto.randomUUID() },
      ],
    })),

  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

// 편의 함수
export function toast(
  message: string,
  type: ToastType = "info",
  duration?: number
) {
  useUiStore
    .getState()
    .addToast({ message, type, duration: duration ?? (type === "success" || type === "info" ? 2500 : undefined) });
}
