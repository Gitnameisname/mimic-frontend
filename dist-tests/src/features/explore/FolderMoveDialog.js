"use strict";
/**
 * FolderMoveDialog — 폴더 이동 선택 모달.
 *
 * S3 Phase 2 FG 2-1 UX 다듬기.
 *
 *  - 새 부모 폴더 선택 (select). 자기 자신 + 모든 하위는 선택 불가
 *  - "(루트로 이동)" 선택지 제공
 *  - 서버는 순환 참조 / 깊이 상한 재검증 → 실패 시 toast (훅에서 처리)
 */
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.__test__ = void 0;
exports.computeMoveCandidates = computeMoveCandidates;
exports.FolderMoveDialog = FolderMoveDialog;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const Button_1 = require("@/components/button/Button");
/** path 경로를 ` › ` 로 표시 */
function formatPath(f) {
    return f.path.split("/").filter(Boolean).join(" › ");
}
/**
 * 이동 대상 후보 필터 — 자기 자신 + 모든 하위 폴더 제외.
 * 테스트 편의상 export.
 */
function computeMoveCandidates(current, all) {
    return all.filter((f) => {
        if (f.id === current.id)
            return false;
        if (f.path.startsWith(current.path))
            return false;
        return true;
    });
}
// 테스트용 export
exports.__test__ = { computeMoveCandidates, formatPath };
function FolderMoveDialog({ open, current, allFolders, loading = false, onConfirm, onCancel, }) {
    const [selected, setSelected] = (0, react_1.useState)("");
    // 자기 자신 + 하위는 target 후보에서 제외
    const candidates = (0, react_1.useMemo)(() => {
        if (!current)
            return [];
        return allFolders.filter((f) => {
            if (f.id === current.id)
                return false;
            // 하위 (path prefix 매칭) 제외
            if (f.path.startsWith(current.path))
                return false;
            return true;
        });
    }, [allFolders, current]);
    if (!open || !current)
        return null;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", "aria-label": "\uB2EB\uAE30", className: "absolute inset-0 bg-black/30", onClick: onCancel }), (0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "folder-move-title", className: "relative mx-4 w-full max-w-md rounded-xl bg-[var(--color-surface)] p-6 shadow-xl", children: [(0, jsx_runtime_1.jsxs)("h3", { id: "folder-move-title", className: "text-base font-semibold text-[var(--color-text)]", children: ["\"", current.name, "\" \uC774\uB3D9"] }), (0, jsx_runtime_1.jsxs)("p", { className: "mt-1 text-xs text-[var(--color-text-muted)]", children: ["\uD604\uC7AC \uACBD\uB85C: ", (0, jsx_runtime_1.jsx)("code", { children: current.path })] }), (0, jsx_runtime_1.jsxs)("label", { className: "mt-4 block text-sm text-[var(--color-text)]", children: [(0, jsx_runtime_1.jsx)("span", { className: "block pb-1 text-xs text-[var(--color-text-muted)]", children: "\uC0C8 \uBD80\uBAA8 \uD3F4\uB354" }), (0, jsx_runtime_1.jsxs)("select", { className: "w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]", value: selected, disabled: loading, onChange: (e) => setSelected(e.target.value), "aria-label": "\uC0C8 \uBD80\uBAA8 \uD3F4\uB354", children: [(0, jsx_runtime_1.jsx)("option", { value: "", children: "(\uB8E8\uD2B8\uB85C \uC774\uB3D9)" }), candidates.map((f) => ((0, jsx_runtime_1.jsx)("option", { value: f.id, children: formatPath(f) }, f.id)))] })] }), (0, jsx_runtime_1.jsx)("p", { className: "mt-2 text-[11px] text-[var(--color-text-muted)]", children: "\uC790\uAE30 \uC790\uC2E0\uACFC \uD558\uC704 \uD3F4\uB354\uB294 \uB300\uC0C1\uC5D0\uC11C \uC81C\uC678\uB418\uBA70, \uC774\uB3D9 \uD6C4 \uD558\uC704 \uD3F4\uB354\uC758 \uACBD\uB85C\uAC00 \uD568\uAED8 \uAC31\uC2E0\uB429\uB2C8\uB2E4." }), (0, jsx_runtime_1.jsxs)("div", { className: "mt-5 flex justify-end gap-2", children: [(0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "ghost", size: "sm", onClick: onCancel, disabled: loading, children: "\uCDE8\uC18C" }), (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "primary", size: "sm", onClick: () => onConfirm(selected || null), loading: loading, children: "\uC774\uB3D9" })] })] })] }));
}
