"use strict";
/**
 * RowMenu — 사이드바 컬렉션/폴더 항목에 hover 시 `···` 버튼 + 팝오버 메뉴.
 *
 * S3 Phase 2 FG 2-1 UX 다듬기 (2026-04-24).
 *
 * 설계
 * ----
 *  - 버튼은 평소 숨김, 부모 `group-hover:visible` 또는 포커스 시에만 표시
 *  - 팝오버: 위치는 버튼 오른쪽 아래. 바깥 클릭/ESC 시 닫힘
 *  - 메뉴 항목: label + onSelect + danger 여부 + optional icon
 *  - 키보드: ArrowUp/Down 으로 항목 이동, Enter 실행, Esc 닫기
 */
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RowMenu = RowMenu;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const utils_1 = require("@/lib/utils");
function RowMenu({ items, ariaLabel, className }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    const [cursor, setCursor] = (0, react_1.useState)(-1);
    const rootRef = (0, react_1.useRef)(null);
    const close = (0, react_1.useCallback)(() => {
        setOpen(false);
        setCursor(-1);
    }, []);
    (0, react_1.useEffect)(() => {
        if (!open)
            return;
        const onDocClick = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target))
                close();
        };
        const onKey = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                close();
            }
        };
        document.addEventListener("mousedown", onDocClick);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDocClick);
            document.removeEventListener("keydown", onKey);
        };
    }, [open, close]);
    const onMenuKeyDown = (0, react_1.useCallback)((e) => {
        const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);
        if (!enabled.length)
            return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setCursor((c) => {
                const pos = enabled.indexOf(c);
                return enabled[(pos + 1 + enabled.length) % enabled.length];
            });
        }
        else if (e.key === "ArrowUp") {
            e.preventDefault();
            setCursor((c) => {
                const pos = enabled.indexOf(c);
                return enabled[(pos - 1 + enabled.length) % enabled.length];
            });
        }
        else if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (cursor >= 0 && cursor < items.length && !items[cursor].disabled) {
                items[cursor].onSelect();
                close();
            }
        }
    }, [items, cursor, close]);
    return ((0, jsx_runtime_1.jsxs)("div", { ref: rootRef, className: "relative inline-block", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", "aria-haspopup": "menu", "aria-expanded": open, "aria-label": ariaLabel, title: ariaLabel, onClick: (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpen((v) => !v);
                    setCursor(-1);
                }, className: (0, utils_1.cn)("invisible inline-flex h-5 w-5 items-center justify-center rounded", "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)]", "group-hover:visible focus-visible:visible focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]", open && "visible bg-[var(--color-surface-strong)] text-[var(--color-text)]", className), children: (0, jsx_runtime_1.jsxs)("svg", { className: "h-3.5 w-3.5", fill: "currentColor", viewBox: "0 0 20 20", "aria-hidden": "true", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "10", cy: "4", r: "1.3" }), (0, jsx_runtime_1.jsx)("circle", { cx: "10", cy: "10", r: "1.3" }), (0, jsx_runtime_1.jsx)("circle", { cx: "10", cy: "16", r: "1.3" })] }) }), open && ((0, jsx_runtime_1.jsx)("div", { role: "menu", "aria-label": ariaLabel, onKeyDown: onMenuKeyDown, tabIndex: -1, className: "absolute right-0 top-full z-40 mt-1 min-w-[10rem] overflow-hidden rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface)] py-1 shadow-[var(--shadow-pop)] focus:outline-none", children: items.map((it, i) => {
                    const active = i === cursor;
                    return ((0, jsx_runtime_1.jsxs)("button", { role: "menuitem", type: "button", disabled: it.disabled, onClick: (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (it.disabled)
                                return;
                            it.onSelect();
                            close();
                        }, onMouseEnter: () => setCursor(i), className: (0, utils_1.cn)("flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm", "disabled:cursor-not-allowed disabled:opacity-50", it.danger
                            ? "text-[var(--color-danger-600)] hover:bg-[var(--color-danger-50)] focus:bg-[var(--color-danger-50)]"
                            : "text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] focus:bg-[var(--color-surface-subtle)]", active && (it.danger ? "bg-[var(--color-danger-50)]" : "bg-[var(--color-surface-subtle)]")), children: [it.icon && (0, jsx_runtime_1.jsx)("span", { className: "shrink-0", "aria-hidden": "true", children: it.icon }), (0, jsx_runtime_1.jsx)("span", { className: "truncate", children: it.label })] }, it.key));
                }) }))] }));
}
