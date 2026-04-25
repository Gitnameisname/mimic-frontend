"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useUiStore = void 0;
exports.toast = toast;
const zustand_1 = require("zustand");
exports.useUiStore = (0, zustand_1.create)((set) => ({
    sidebarCollapsed: false,
    toasts: [],
    setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    addToast: (toast) => set((s) => ({
        toasts: [
            ...s.toasts.slice(-2), // 최대 3개
            { ...toast, id: crypto.randomUUID() },
        ],
    })),
    removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
// 편의 함수
function toast(message, type = "info", duration) {
    exports.useUiStore
        .getState()
        .addToast({ message, type, duration: duration ?? (type === "success" || type === "info" ? 2500 : undefined) });
}
