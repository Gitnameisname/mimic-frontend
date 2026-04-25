"use strict";
/**
 * EditCollectionModal — 컬렉션 이름 + 설명 풀 편집 모달.
 *
 * S3 Phase 2 FG 2-1 UX 6차 (2026-04-24).
 *
 * RowMenu 의 "편집..." 항목에서 여는 모달.
 *  - 이름: 기존 CollectionsTree 의 인라인 rename 과 같은 규약 (Trim + 1-200자)
 *  - 설명: textarea + 2000자 상한
 *  - 저장 실패 시 toast (useUpdateCollection), 성공 시 토스트 + 모달 닫기
 *  - 인라인 rename 은 빠른 경로로 그대로 유지, 이 모달은 **설명까지 편집하는 풀 편집** 전용
 */
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EditCollectionModal = EditCollectionModal;
exports.computeUpdateBody = computeUpdateBody;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const Button_1 = require("@/components/button/Button");
const useCollections_1 = require("./hooks/useCollections");
const NAME_MAX = 200;
const DESC_MAX = 2000;
function EditCollectionModal({ open, collection, onCancel, onSuccess }) {
    const updateMut = (0, useCollections_1.useUpdateCollection)();
    const [name, setName] = (0, react_1.useState)("");
    const [description, setDescription] = (0, react_1.useState)("");
    const [nameError, setNameError] = (0, react_1.useState)(null);
    // 모달이 열릴 때마다 현재 컬렉션 값으로 리셋
    (0, react_1.useEffect)(() => {
        if (open && collection) {
            setName(collection.name);
            setDescription(collection.description ?? "");
            setNameError(null);
        }
    }, [open, collection]);
    if (!open || !collection)
        return null;
    const trimmedName = name.trim();
    const descLen = description.length;
    const nameLen = trimmedName.length;
    const handleSubmit = async () => {
        if (nameLen < 1) {
            setNameError("이름을 입력하세요");
            return;
        }
        if (nameLen > NAME_MAX) {
            setNameError(`이름은 ${NAME_MAX}자 이하여야 합니다`);
            return;
        }
        if (descLen > DESC_MAX)
            return;
        const nextDescription = description.trim() ? description : null;
        const nextName = trimmedName === collection.name ? undefined : trimmedName;
        const descChanged = (collection.description ?? null) !== nextDescription;
        if (nextName === undefined && !descChanged) {
            // 변경 없음 — 그냥 닫기
            onSuccess?.();
            return;
        }
        try {
            await updateMut.mutateAsync({
                id: collection.id,
                body: {
                    ...(nextName !== undefined ? { name: nextName } : {}),
                    ...(descChanged ? { description: nextDescription } : {}),
                },
            });
            onSuccess?.();
        }
        catch {
            // 훅이 toast 로 에러 처리
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", "aria-label": "\uB2EB\uAE30", className: "absolute inset-0 bg-black/30", onClick: onCancel }), (0, jsx_runtime_1.jsxs)("div", { role: "dialog", "aria-modal": "true", "aria-labelledby": "edit-collection-title", className: "relative mx-4 flex w-full max-w-md flex-col rounded-xl bg-[var(--color-surface)] shadow-xl", children: [(0, jsx_runtime_1.jsxs)("header", { className: "border-b border-[var(--color-border)] px-5 py-4", children: [(0, jsx_runtime_1.jsx)("h3", { id: "edit-collection-title", className: "text-base font-semibold text-[var(--color-text)]", children: "\uCEEC\uB809\uC158 \uD3B8\uC9D1" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-xs text-[var(--color-text-muted)]", children: "\uC774\uB984\uACFC \uC124\uBA85\uC744 \uD55C\uAEBC\uBC88\uC5D0 \uC218\uC815\uD569\uB2C8\uB2E4." })] }), (0, jsx_runtime_1.jsxs)("form", { className: "flex flex-col gap-4 px-5 py-4", onSubmit: (e) => {
                            e.preventDefault();
                            handleSubmit();
                        }, children: [(0, jsx_runtime_1.jsxs)("label", { className: "flex flex-col gap-1 text-sm text-[var(--color-text)]", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs text-[var(--color-text-muted)]", children: "\uC774\uB984" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: name, maxLength: NAME_MAX, onChange: (e) => {
                                            setName(e.target.value);
                                            if (nameError)
                                                setNameError(null);
                                        }, "aria-label": "\uCEEC\uB809\uC158 \uC774\uB984", "aria-invalid": nameError ? "true" : undefined, className: "rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]", disabled: updateMut.isPending }), nameError && ((0, jsx_runtime_1.jsx)("span", { className: "text-xs text-[var(--color-danger-600)]", role: "alert", children: nameError }))] }), (0, jsx_runtime_1.jsxs)("label", { className: "flex flex-col gap-1 text-sm text-[var(--color-text)]", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs text-[var(--color-text-muted)]", children: "\uC124\uBA85 (\uC120\uD0DD)" }), (0, jsx_runtime_1.jsxs)("span", { className: descLen > DESC_MAX
                                                    ? "text-xs text-[var(--color-danger-600)]"
                                                    : "text-[11px] text-[var(--color-text-muted)]", children: [descLen, "/", DESC_MAX] })] }), (0, jsx_runtime_1.jsx)("textarea", { value: description, onChange: (e) => setDescription(e.target.value), rows: 4, "aria-label": "\uCEEC\uB809\uC158 \uC124\uBA85", className: "resize-y rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2.5 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]", placeholder: "\uC774 \uCEEC\uB809\uC158\uC774 \uC5B4\uB5A4 \uBB38\uC11C \uBB36\uC74C\uC778\uC9C0 \uD55C\uB450 \uBB38\uC7A5\uC73C\uB85C\u2026", disabled: updateMut.isPending })] })] }), (0, jsx_runtime_1.jsxs)("footer", { className: "flex items-center justify-end gap-2 border-t border-[var(--color-border)] px-5 py-3", children: [(0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "ghost", size: "sm", onClick: onCancel, disabled: updateMut.isPending, children: "\uCDE8\uC18C" }), (0, jsx_runtime_1.jsx)(Button_1.Button, { variant: "primary", size: "sm", onClick: handleSubmit, loading: updateMut.isPending, disabled: nameLen < 1 || nameLen > NAME_MAX || descLen > DESC_MAX, children: "\uC800\uC7A5" })] })] })] }));
}
// 테스트용 내부 헬퍼 — 저장 버튼이 보낼 body 페이로드 조합 규약만 추출
function computeUpdateBody(current, next) {
    const trimmedName = next.name.trim();
    if (trimmedName.length < 1 || trimmedName.length > NAME_MAX)
        return null;
    if (next.description.length > DESC_MAX)
        return null;
    const nextDescription = next.description.trim() ? next.description : null;
    const nameChanged = trimmedName !== current.name;
    const descChanged = (current.description ?? null) !== nextDescription;
    if (!nameChanged && !descChanged)
        return {}; // 변경 없음
    const body = {};
    if (nameChanged)
        body.name = trimmedName;
    if (descChanged)
        body.description = nextDescription;
    return body;
}
