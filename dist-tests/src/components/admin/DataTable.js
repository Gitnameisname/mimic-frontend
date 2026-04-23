"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataTable = DataTable;
const jsx_runtime_1 = require("react/jsx-runtime");
const utils_1 = require("@/lib/utils");
function DataTable({ columns, rows, rowKey, onRowClick, loading = false, emptyMessage = "데이터가 없습니다.", className, ariaLabel, }) {
    return ((0, jsx_runtime_1.jsx)("div", { className: (0, utils_1.cn)("overflow-x-auto", className), children: (0, jsx_runtime_1.jsxs)("table", { className: "min-w-full text-sm", "aria-label": ariaLabel, "aria-busy": loading || undefined, children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsx)("tr", { className: "border-b border-gray-200 bg-gray-50", children: columns.map((col) => ((0, jsx_runtime_1.jsx)("th", { scope: "col", style: col.width ? { width: col.width } : undefined, className: "px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap", children: col.header }, col.key))) }) }), (0, jsx_runtime_1.jsx)("tbody", { className: "divide-y divide-gray-100", children: loading ? (Array.from({ length: 5 }).map((_, i) => ((0, jsx_runtime_1.jsx)("tr", { children: columns.map((col) => ((0, jsx_runtime_1.jsx)("td", { className: "px-4 py-3", children: (0, jsx_runtime_1.jsx)("div", { className: "h-4 bg-gray-100 rounded animate-pulse" }) }, col.key))) }, i)))) : rows.length === 0 ? ((0, jsx_runtime_1.jsx)("tr", { children: (0, jsx_runtime_1.jsx)("td", { colSpan: columns.length, className: "px-4 py-10 text-center text-gray-400", children: emptyMessage }) })) : (rows.map((row) => {
                        const isInteractive = Boolean(onRowClick);
                        return ((0, jsx_runtime_1.jsx)("tr", { onClick: onRowClick ? () => onRowClick(row) : undefined, onKeyDown: isInteractive
                                ? (e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        onRowClick?.(row);
                                    }
                                }
                                : undefined, role: isInteractive ? "button" : undefined, tabIndex: isInteractive ? 0 : undefined, className: (0, utils_1.cn)("bg-white transition-colors", isInteractive &&
                                "cursor-pointer hover:bg-gray-50 focus:outline-none focus-visible:bg-blue-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"), children: columns.map((col) => ((0, jsx_runtime_1.jsx)("td", { className: "px-4 py-3 text-gray-700", children: col.render(row) }, col.key))) }, rowKey(row)));
                    })) })] }) }));
}
