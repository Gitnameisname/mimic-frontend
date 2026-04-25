"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const utils_1 = require("@/lib/utils");
const react_1 = require("react");
const variantStyles = {
    primary: (0, utils_1.cn)("bg-[var(--color-brand-600)] text-white", "hover:bg-[var(--color-brand-700)] active:bg-[var(--color-brand-800)]", "disabled:bg-[var(--color-brand-300)] disabled:text-white/80", "shadow-[var(--shadow-soft)]"),
    secondary: (0, utils_1.cn)("bg-[var(--color-surface)] text-[var(--color-text)]", "border border-[var(--color-border-strong)]", "hover:bg-[var(--color-surface-subtle)] active:bg-[var(--color-border)]", "disabled:bg-[var(--color-surface-subtle)] disabled:text-[var(--color-text-subtle)]"),
    ghost: (0, utils_1.cn)("bg-transparent text-[var(--color-text-muted)]", "hover:bg-[var(--color-surface-subtle)] active:bg-[var(--color-border)]", "disabled:text-[var(--color-text-subtle)]/60"),
    danger: (0, utils_1.cn)("bg-red-600 text-white", "hover:bg-red-700 active:bg-red-800", "disabled:bg-red-300", "shadow-[var(--shadow-soft)]"),
};
const sizeStyles = {
    sm: "h-8 px-3 text-sm rounded-md",
    md: "h-9 px-4 text-sm rounded-md",
    lg: "h-11 px-5 text-base rounded-lg",
};
exports.Button = (0, react_1.forwardRef)(({ variant = "secondary", size = "md", loading, className, children, disabled, ...props }, ref) => {
    return ((0, jsx_runtime_1.jsxs)("button", { ref: ref, disabled: disabled || loading, "aria-busy": loading || undefined, className: (0, utils_1.cn)("inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap", "transition-colors duration-150 cursor-pointer select-none", "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2", "focus-visible:ring-offset-[var(--color-surface)] focus-visible:ring-[var(--color-brand-500)]", "disabled:cursor-not-allowed", variantStyles[variant], sizeStyles[size], className), ...props, children: [loading && ((0, jsx_runtime_1.jsxs)("svg", { className: "h-4 w-4 animate-spin", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", "aria-hidden": "true", children: [(0, jsx_runtime_1.jsx)("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), (0, jsx_runtime_1.jsx)("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" })] })), children] }));
});
exports.Button.displayName = "Button";
