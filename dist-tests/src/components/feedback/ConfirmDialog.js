"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfirmDialog = ConfirmDialog;
const jsx_runtime_1 = require("react/jsx-runtime");
const Button_1 = require("@/components/button/Button");
function ConfirmDialog({ open, title, message, confirmLabel = "확인", cancelLabel = "취소", danger = false, loading = false, onConfirm, onCancel, }) {
    if (!open)
        return null;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute inset-0 bg-black/30", onClick: onCancel }), (0, jsx_runtime_1.jsxs)("div", { className: "relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-base font-semibold text-gray-900", children: title }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-sm text-gray-600", children: message }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-5 flex justify-end gap-2", children: [(0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "ghost", size: "sm", onClick: onCancel, disabled: loading, children: cancelLabel }), (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: danger ? "danger" : "primary", size: "sm", onClick: onConfirm, loading: loading, children: confirmLabel })] })] })] }));
}
