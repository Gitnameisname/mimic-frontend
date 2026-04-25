"use strict";
/**
 * FoldersTree — 사이드바 "탐색" 섹션의 계층 폴더 트리.
 *
 * S3 Phase 2 FG 2-1.
 *  - 서버에서 path 순으로 정렬된 flat list 를 받아 계층 렌더
 *  - 각 노드: 접기/펼치기 (로컬 상태) + 클릭 시 `/documents?folder=<id>` 이동
 *  - 루트에 "+ 폴더 추가" / 노드 hover 시 + (하위 추가)
 *  - 뷰 레이어. ACL 에는 영향 없음 (FG 2-0 / FG 2-1 절대 규칙)
 */
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.__test__ = void 0;
exports.FoldersTree = FoldersTree;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const link_1 = __importDefault(require("next/link"));
const navigation_1 = require("next/navigation");
const utils_1 = require("@/lib/utils");
const ConfirmDialog_1 = require("@/components/feedback/ConfirmDialog");
const FolderMoveDialog_1 = require("./FolderMoveDialog");
const RowMenu_1 = require("./RowMenu");
const useFolders_1 = require("./hooks/useFolders");
/** flat list → 계층 트리 (parent_id 기반) */
function buildTree(folders) {
    const byId = new Map();
    const roots = [];
    for (const f of folders)
        byId.set(f.id, { folder: f, children: [] });
    for (const f of folders) {
        const node = byId.get(f.id);
        if (f.parent_id && byId.has(f.parent_id)) {
            byId.get(f.parent_id).children.push(node);
        }
        else {
            roots.push(node);
        }
    }
    // path 순으로 안정 정렬 (서버가 이미 path 순이지만 재확인)
    const sortByPath = (a, b) => a.folder.path.localeCompare(b.folder.path);
    roots.sort(sortByPath);
    const walk = (n) => {
        n.children.sort(sortByPath);
        n.children.forEach(walk);
    };
    roots.forEach(walk);
    return roots;
}
function FoldersTree({ compact = false }) {
    const { data: folders, isLoading, isError } = (0, useFolders_1.useFolders)();
    const createMut = (0, useFolders_1.useCreateFolder)();
    const renameMut = (0, useFolders_1.useRenameFolder)();
    const moveMut = (0, useFolders_1.useMoveFolder)();
    const deleteMut = (0, useFolders_1.useDeleteFolder)();
    const searchParams = (0, navigation_1.useSearchParams)();
    const activeId = searchParams.get("folder");
    const tree = (0, react_1.useMemo)(() => buildTree(folders ?? []), [folders]);
    const [expanded, setExpanded] = (0, react_1.useState)(new Set());
    const [addingUnder, setAddingUnder] = (0, react_1.useState)(null);
    const [newName, setNewName] = (0, react_1.useState)("");
    const inputRef = (0, react_1.useRef)(null);
    // UX 다듬기 — 인라인 rename / 이동 모달 / 삭제 확인
    const [renamingId, setRenamingId] = (0, react_1.useState)(null);
    const [renameDraft, setRenameDraft] = (0, react_1.useState)("");
    const renameInputRef = (0, react_1.useRef)(null);
    const [moveTarget, setMoveTarget] = (0, react_1.useState)(null);
    const [deleteTarget, setDeleteTarget] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (renamingId)
            renameInputRef.current?.select();
    }, [renamingId]);
    const submitRename = (0, react_1.useCallback)(async () => {
        if (!renamingId)
            return;
        const next = renameDraft.trim();
        if (!next) {
            setRenamingId(null);
            return;
        }
        const current = folders?.find((f) => f.id === renamingId);
        if (current && current.name === next) {
            setRenamingId(null);
            return;
        }
        try {
            await renameMut.mutateAsync({ id: renamingId, newName: next });
            setRenamingId(null);
        }
        catch {
            // toast 처리됨
        }
    }, [renamingId, renameDraft, folders, renameMut]);
    const confirmMove = (0, react_1.useCallback)(async (newParentId) => {
        if (!moveTarget)
            return;
        try {
            await moveMut.mutateAsync({ id: moveTarget.id, newParentId });
        }
        finally {
            setMoveTarget(null);
        }
    }, [moveTarget, moveMut]);
    const confirmDelete = (0, react_1.useCallback)(async () => {
        if (!deleteTarget)
            return;
        try {
            await deleteMut.mutateAsync(deleteTarget.id);
        }
        finally {
            setDeleteTarget(null);
        }
    }, [deleteTarget, deleteMut]);
    // 활성 폴더 조상 자동 전개
    (0, react_1.useEffect)(() => {
        if (!activeId || !folders)
            return;
        const ancestors = new Set();
        let current = folders.find((f) => f.id === activeId);
        while (current && current.parent_id) {
            ancestors.add(current.parent_id);
            current = folders.find((f) => f.id === current.parent_id);
        }
        setExpanded((prev) => {
            const next = new Set(prev);
            ancestors.forEach((id) => next.add(id));
            return next;
        });
    }, [activeId, folders]);
    (0, react_1.useEffect)(() => {
        if (addingUnder !== null)
            inputRef.current?.focus();
    }, [addingUnder]);
    const toggleExpand = (0, react_1.useCallback)((id) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    }, []);
    const submitAdd = (0, react_1.useCallback)(async () => {
        const name = newName.trim();
        if (!name || addingUnder === null) {
            setAddingUnder(null);
            setNewName("");
            return;
        }
        const parentId = addingUnder === "root" ? null : addingUnder;
        try {
            await createMut.mutateAsync({ name, parent_id: parentId });
            setNewName("");
            setAddingUnder(null);
            // 생성한 하위가 보이도록 부모 전개
            if (parentId) {
                setExpanded((prev) => new Set(prev).add(parentId));
            }
        }
        catch {
            // toast 는 훅에서 처리, 입력 유지
        }
    }, [newName, addingUnder, createMut]);
    if (compact) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "px-2 py-1", children: (0, jsx_runtime_1.jsx)(link_1.default, { href: "/documents", title: "\uD3F4\uB354", className: (0, utils_1.cn)("flex h-9 w-9 items-center justify-center rounded-md", "text-[var(--color-text-muted)] hover:text-[var(--color-text)]", "hover:bg-[var(--color-surface-subtle)]"), "aria-label": "\uD3F4\uB354", children: (0, jsx_runtime_1.jsx)("svg", { className: "h-5 w-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.6, d: "M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" }) }) }) }));
    }
    return ((0, jsx_runtime_1.jsxs)("section", { "aria-labelledby": "folders-heading", className: "px-3 py-2", children: [(0, jsx_runtime_1.jsxs)("header", { className: "flex items-center justify-between px-1 pb-1", children: [(0, jsx_runtime_1.jsx)("h3", { id: "folders-heading", className: "text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]", children: "\uD3F4\uB354" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setAddingUnder("root"), className: "inline-flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]", "aria-label": "\uB8E8\uD2B8 \uD3F4\uB354 \uCD94\uAC00", title: "\uB8E8\uD2B8 \uD3F4\uB354 \uCD94\uAC00", children: (0, jsx_runtime_1.jsx)("svg", { className: "h-3.5 w-3.5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 4v16m8-8H4" }) }) })] }), addingUnder === "root" && ((0, jsx_runtime_1.jsx)(InlineInput, { inputRef: inputRef, value: newName, onChange: setNewName, onSubmit: submitAdd, onCancel: () => {
                    setAddingUnder(null);
                    setNewName("");
                }, placeholder: "\uC0C8 \uD3F4\uB354 \uC774\uB984", disabled: createMut.isPending, indentPx: 0 })), isLoading && ((0, jsx_runtime_1.jsx)("ul", { className: "space-y-1 px-1", "aria-busy": "true", children: [0, 1, 2].map((i) => ((0, jsx_runtime_1.jsx)("li", { className: "h-6 animate-pulse rounded bg-[var(--color-surface-subtle)]" }, i))) })), isError && ((0, jsx_runtime_1.jsx)("p", { className: "px-1 py-2 text-xs text-[var(--color-danger-600)]", role: "alert", children: "\uD3F4\uB354\uB97C \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4." })), !isLoading && !isError && tree.length === 0 && addingUnder === null && ((0, jsx_runtime_1.jsx)("p", { className: "px-1 py-2 text-xs text-[var(--color-text-muted)]", children: "\uD3F4\uB354\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. + \uB97C \uB20C\uB7EC \uCD94\uAC00\uD558\uC138\uC694." })), tree.length > 0 && ((0, jsx_runtime_1.jsx)("ul", { className: "space-y-0.5", role: "tree", "aria-label": "\uD3F4\uB354 \uD2B8\uB9AC", children: tree.map((node) => ((0, jsx_runtime_1.jsx)(FolderTreeNode, { node: node, depth: 0, expanded: expanded, toggle: toggleExpand, activeId: activeId, addingUnder: addingUnder, onRequestAddUnder: setAddingUnder, inputValue: newName, onInputChange: setNewName, onSubmit: submitAdd, onCancel: () => {
                        setAddingUnder(null);
                        setNewName("");
                    }, inputRef: inputRef, inputDisabled: createMut.isPending, renamingId: renamingId, renameInputRef: renameInputRef, renameDisabled: renameMut.isPending, onRequestRename: (f) => {
                        setRenameDraft(f.name);
                        setRenamingId(f.id);
                    }, onRenameDraftChange: setRenameDraft, onRenameSubmit: submitRename, onRenameCancel: () => setRenamingId(null), onRequestMove: setMoveTarget, onRequestDelete: setDeleteTarget }, node.folder.id))) })), (0, jsx_runtime_1.jsx)(FolderMoveDialog_1.FolderMoveDialog, { open: moveTarget != null, current: moveTarget, allFolders: folders ?? [], loading: moveMut.isPending, onConfirm: confirmMove, onCancel: () => setMoveTarget(null) }), (0, jsx_runtime_1.jsx)(ConfirmDialog_1.ConfirmDialog, { open: deleteTarget != null, title: `폴더 "${deleteTarget?.name ?? ""}" 을(를) 삭제할까요?`, message: "\uD558\uC704 \uD3F4\uB354 \uB610\uB294 \uBB38\uC11C\uAC00 \uC788\uB294 \uD3F4\uB354\uB294 \uC0AD\uC81C\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uBB38\uC11C\uB294 \uD3F4\uB354\uC5D0\uC11C\uB9CC \uD574\uC81C\uB429\uB2C8\uB2E4.", confirmLabel: "\uC0AD\uC81C", cancelLabel: "\uCDE8\uC18C", danger: true, loading: deleteMut.isPending, onConfirm: confirmDelete, onCancel: () => setDeleteTarget(null) })] }));
}
function FolderTreeNode(props) {
    const { node, depth, expanded, toggle, activeId, addingUnder, onRequestAddUnder, inputValue, onInputChange, onSubmit, onCancel, inputRef, inputDisabled, renamingId, renameInputRef, renameDisabled, onRequestRename, onRenameDraftChange, onRenameSubmit, onRenameCancel, onRequestMove, onRequestDelete, } = props;
    const hasChildren = node.children.length > 0;
    const isOpen = expanded.has(node.folder.id);
    const active = node.folder.id === activeId;
    const isRenaming = renamingId === node.folder.id;
    const indent = depth * 12;
    return ((0, jsx_runtime_1.jsxs)("li", { role: "treeitem", "aria-expanded": hasChildren ? isOpen : undefined, children: [(0, jsx_runtime_1.jsxs)("div", { className: (0, utils_1.cn)("group flex items-center gap-1 rounded-md px-1 py-1 text-sm", active
                    ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)] font-medium"
                    : "text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]"), style: { paddingLeft: 4 + indent }, children: [hasChildren ? ((0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => toggle(node.folder.id), "aria-label": isOpen ? "접기" : "펼치기", className: "inline-flex h-5 w-5 items-center justify-center rounded hover:bg-[var(--color-surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]", children: (0, jsx_runtime_1.jsx)("svg", { className: (0, utils_1.cn)("h-3 w-3 transition-transform", isOpen && "rotate-90"), fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2.4, d: "M9 6l6 6-6 6" }) }) })) : ((0, jsx_runtime_1.jsx)("span", { className: "inline-block h-5 w-5", "aria-hidden": "true" })), isRenaming ? ((0, jsx_runtime_1.jsx)("form", { className: "min-w-0 flex-1", onSubmit: (e) => {
                            e.preventDefault();
                            onRenameSubmit();
                        }, children: (0, jsx_runtime_1.jsx)("input", { ref: renameInputRef, type: "text", defaultValue: node.folder.name, onChange: (e) => onRenameDraftChange(e.target.value), onBlur: onRenameSubmit, onKeyDown: (e) => {
                                if (e.key === "Escape") {
                                    e.preventDefault();
                                    onRenameCancel();
                                }
                            }, maxLength: 200, "aria-label": "\uD3F4\uB354 \uC774\uB984 \uBCC0\uACBD", className: "w-full rounded border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-0.5 text-sm text-[var(--color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]", disabled: renameDisabled }) })) : ((0, jsx_runtime_1.jsx)(link_1.default, { href: `/documents?folder=${encodeURIComponent(node.folder.id)}`, "aria-current": active ? "page" : undefined, className: "min-w-0 flex-1 truncate focus-visible:outline-none focus-visible:underline", title: node.folder.path, children: node.folder.name })), !isRenaming && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => onRequestAddUnder(node.folder.id), "aria-label": `"${node.folder.name}" 안에 폴더 추가`, title: "\uD558\uC704 \uD3F4\uB354 \uCD94\uAC00", className: "invisible inline-flex h-5 w-5 items-center justify-center rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)] group-hover:visible focus-visible:visible focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]", children: (0, jsx_runtime_1.jsx)("svg", { className: "h-3 w-3", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", "aria-hidden": "true", children: (0, jsx_runtime_1.jsx)("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 4v16m8-8H4" }) }) }), (0, jsx_runtime_1.jsx)(RowMenu_1.RowMenu, { ariaLabel: `"${node.folder.name}" 메뉴`, items: [
                                    {
                                        key: "rename",
                                        label: "이름 변경",
                                        onSelect: () => onRequestRename(node.folder),
                                    },
                                    {
                                        key: "move",
                                        label: "이동",
                                        onSelect: () => onRequestMove(node.folder),
                                    },
                                    {
                                        key: "delete",
                                        label: "삭제",
                                        danger: true,
                                        onSelect: () => onRequestDelete(node.folder),
                                    },
                                ] })] }))] }), addingUnder === node.folder.id && ((0, jsx_runtime_1.jsx)(InlineInput, { inputRef: inputRef, value: inputValue, onChange: onInputChange, onSubmit: onSubmit, onCancel: onCancel, placeholder: `"${node.folder.name}" 의 하위 폴더 이름`, disabled: inputDisabled, indentPx: indent + 24 })), isOpen && hasChildren && ((0, jsx_runtime_1.jsx)("ul", { role: "group", className: "space-y-0.5", children: node.children.map((child) => ((0, jsx_runtime_1.jsx)(FolderTreeNode, { ...props, node: child, depth: depth + 1 }, child.folder.id))) }))] }));
}
function InlineInput({ inputRef, value, onChange, onSubmit, onCancel, placeholder, disabled, indentPx, }) {
    return ((0, jsx_runtime_1.jsx)("form", { className: "px-1 py-1", style: { paddingLeft: 4 + indentPx }, onSubmit: (e) => {
            e.preventDefault();
            onSubmit();
        }, children: (0, jsx_runtime_1.jsx)("input", { ref: inputRef, type: "text", value: value, onChange: (e) => onChange(e.target.value), onKeyDown: (e) => {
                if (e.key === "Escape") {
                    e.preventDefault();
                    onCancel();
                }
            }, onBlur: onSubmit, placeholder: placeholder, maxLength: 200, "aria-label": placeholder, className: "w-full rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]", disabled: disabled }) }));
}
// 테스트용 내부 헬퍼 export
exports.__test__ = { buildTree };
