"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORKFLOW_STATUS_COLORS = exports.WORKFLOW_STATUS_LABELS = void 0;
exports.WORKFLOW_STATUS_LABELS = {
    DRAFT: "초안",
    IN_REVIEW: "검토 중",
    APPROVED: "승인됨",
    PUBLISHED: "발행됨",
    REJECTED: "반려됨",
    ARCHIVED: "보관됨",
};
exports.WORKFLOW_STATUS_COLORS = {
    DRAFT: {
        bg: "bg-gray-100",
        text: "text-gray-700",
        border: "border-gray-200",
    },
    IN_REVIEW: {
        bg: "bg-blue-100",
        text: "text-blue-700",
        border: "border-blue-200",
    },
    APPROVED: {
        bg: "bg-green-100",
        text: "text-green-700",
        border: "border-green-200",
    },
    PUBLISHED: {
        bg: "bg-teal-100",
        text: "text-teal-700",
        border: "border-teal-200",
    },
    REJECTED: {
        bg: "bg-red-100",
        text: "text-red-700",
        border: "border-red-200",
    },
    ARCHIVED: {
        bg: "bg-zinc-100",
        text: "text-zinc-600",
        border: "border-zinc-200",
    },
};
