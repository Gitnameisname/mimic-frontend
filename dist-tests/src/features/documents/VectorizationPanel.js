"use strict";
/**
 * FG 0-5 (2026-04-23) — 문서 상세 벡터화 상태 패널.
 *
 * 설계 (UI 리뷰 5회 반영본, `FG0-5_UI리뷰로그.md` 참조):
 *  - 문서 헤더 우측 영역에 배치 (옵션 A 채택 — 리뷰 2회차 결론)
 *  - 상태 뱃지 + 라벨 + 마지막 벡터화 시각(relative)
 *  - `can_reindex=true` 사용자에게만 재벡터화 버튼 노출
 *  - 클릭 → ConfirmDialog → API 호출 → 2초 간격 폴링 (최대 60초)
 *  - 접근성: `aria-live="polite"` 뱃지, `aria-label` 버튼
 *
 * 폐쇄망 (S2 ⑦):
 *  - 상태 조회는 Milvus off 에서도 정상 동작 (백엔드 보증)
 *  - 재벡터화 버튼 클릭 시 서비스 다운이면 `status=failed` 로 수렴
 */
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATUS_DISPLAY = void 0;
exports.VectorizationPanel = VectorizationPanel;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_query_1 = require("@tanstack/react-query");
const api_1 = require("@/lib/api");
const uiStore_1 = require("@/stores/uiStore");
const Button_1 = require("@/components/button/Button");
const ConfirmDialog_1 = require("@/components/feedback/ConfirmDialog");
const utils_1 = require("@/lib/utils");
/** 상태별 뱃지 색상 + 라벨 (UI 리뷰 3회차 확정).
 *  (export: FG 0-5 단위 테스트가 직접 검증) */
exports.STATUS_DISPLAY = {
    indexed: {
        color: "bg-green-100 text-green-800 border-green-300",
        label: "색인됨",
        icon: "✓",
        srText: "벡터 색인 완료 — RAG 답변에 사용 가능",
    },
    stale: {
        color: "bg-amber-100 text-amber-800 border-amber-300",
        label: "최신 미반영",
        icon: "↻",
        srText: "최근 발행된 버전이 아직 색인되지 않았습니다",
    },
    pending: {
        color: "bg-gray-100 text-gray-700 border-gray-300",
        label: "대기 중",
        icon: "…",
        srText: "벡터화 대기 또는 진행 중",
    },
    in_progress: {
        color: "bg-blue-100 text-blue-800 border-blue-300",
        label: "실행 중",
        icon: "⟳",
        srText: "벡터화 실행 중",
    },
    failed: {
        color: "bg-red-100 text-red-800 border-red-300",
        label: "실패",
        icon: "✕",
        srText: "최근 벡터화 실패 — 재시도 필요",
    },
    not_applicable: {
        color: "bg-neutral-100 text-neutral-600 border-neutral-300",
        label: "해당 없음",
        icon: "—",
        srText: "발행된 버전이 없어 벡터화 대상이 아닙니다",
    },
};
/** "indexed" 또는 "failed" 가 되면 폴링 종료. 60초 상한. */
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_DURATION_MS = 60_000;
function VectorizationPanel({ documentId, compact = false }) {
    const qc = (0, react_query_1.useQueryClient)();
    const [confirmOpen, setConfirmOpen] = (0, react_1.useState)(false);
    const [pollingStartedAt, setPollingStartedAt] = (0, react_1.useState)(null);
    const [showDetails, setShowDetails] = (0, react_1.useState)(false);
    const statusQuery = (0, react_query_1.useQuery)({
        queryKey: ["vectorization-status", documentId],
        queryFn: () => api_1.vectorizationApi.getStatus(documentId),
        refetchInterval: () => {
            if (pollingStartedAt === null)
                return false;
            if (Date.now() - pollingStartedAt > POLL_MAX_DURATION_MS)
                return false;
            const last = qc.getQueryData(["vectorization-status", documentId])?.status;
            if (last === "indexed" || last === "failed")
                return false;
            return POLL_INTERVAL_MS;
        },
        refetchOnWindowFocus: false,
    });
    // 폴링 수렴 시 타이머 정리
    (0, react_1.useEffect)(() => {
        const s = statusQuery.data?.status;
        if (pollingStartedAt !== null && (s === "indexed" || s === "failed")) {
            setPollingStartedAt(null);
        }
        // 60초 상한 후 강제 종료
        if (pollingStartedAt !== null && Date.now() - pollingStartedAt > POLL_MAX_DURATION_MS) {
            setPollingStartedAt(null);
        }
    }, [statusQuery.data?.status, pollingStartedAt]);
    const reindexMutation = (0, react_query_1.useMutation)({
        mutationFn: () => api_1.vectorizationApi.reindex(documentId),
        onSuccess: () => {
            (0, uiStore_1.toast)("재벡터화를 시작했습니다. 상태를 추적합니다.", "success");
            setConfirmOpen(false);
            setPollingStartedAt(Date.now());
            // 즉시 상태 재조회 후 폴링 시작
            qc.invalidateQueries({ queryKey: ["vectorization-status", documentId] });
        },
        onError: (err) => {
            const msg = (0, api_1.getApiErrorMessage)(err, "재벡터화에 실패했습니다");
            // 429 는 서버 쿨다운 — 메시지에 Retry-After 반영
            (0, uiStore_1.toast)(msg, "error");
            setConfirmOpen(false);
        },
    });
    const data = statusQuery.data;
    const display = (0, react_1.useMemo)(() => (data ? exports.STATUS_DISPLAY[data.status] : null), [data]);
    if (statusQuery.isLoading) {
        return ((0, jsx_runtime_1.jsxs)("span", { className: `inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs bg-neutral-50 text-neutral-500 border-neutral-200 ${compact ? "" : "text-sm"}`, "aria-live": "polite", children: [(0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", children: "\u00B7" }), "\uBCA1\uD130\uD654 \uC0C1\uD0DC \uC870\uD68C \uC911\u2026"] }));
    }
    if (!data || !display) {
        return ((0, jsx_runtime_1.jsx)("span", { className: "text-xs text-neutral-500", "aria-live": "polite", children: "\uBCA1\uD130\uD654 \uC0C1\uD0DC \uD655\uC778 \uBD88\uAC00" }));
    }
    const isBusy = data.status === "pending" || data.status === "in_progress";
    const cooldownActive = data.reindex_cooldown_sec > 0;
    const inFlight = reindexMutation.isPending;
    const isPolling = pollingStartedAt !== null;
    return ((0, jsx_runtime_1.jsxs)("div", { className: `flex ${compact ? "items-center gap-2" : "flex-col gap-1.5"}`, role: "status", "aria-live": "polite", "data-testid": "vectorization-panel", children: [(0, jsx_runtime_1.jsxs)("span", { className: `inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${display.color}`, title: display.srText, "data-status": data.status, children: [(0, jsx_runtime_1.jsx)("span", { "aria-hidden": "true", children: display.icon }), (0, jsx_runtime_1.jsx)("span", { children: display.label }), data.chunk_count > 0 && ((0, jsx_runtime_1.jsxs)("span", { className: "opacity-70", children: ["\u00B7 ", data.chunk_count, "\uCCAD\uD06C"] }))] }), data.last_vectorized_at && ((0, jsx_runtime_1.jsxs)("span", { className: "text-xs text-neutral-500", children: ["\uB9C8\uC9C0\uB9C9 \uC0C9\uC778: ", (0, utils_1.relativeTime)(data.last_vectorized_at)] })), data.status === "failed" && data.last_error && ((0, jsx_runtime_1.jsxs)("div", { className: compact ? "w-full" : "", children: [(0, jsx_runtime_1.jsx)("button", { type: "button", className: "text-xs text-red-700 underline hover:no-underline", onClick: () => setShowDetails((v) => !v), "aria-expanded": showDetails, children: showDetails ? "에러 상세 접기" : "에러 상세 보기" }), showDetails && ((0, jsx_runtime_1.jsx)("pre", { className: "mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded border border-red-200 bg-red-50 p-2 text-xs text-red-900", "data-testid": "vec-error-details", children: data.last_error }))] })), data.can_reindex && ((0, jsx_runtime_1.jsx)("div", { className: compact ? "" : "mt-1", children: (0, jsx_runtime_1.jsx)(Button_1.Button, { size: "sm", variant: "secondary", "aria-label": "\uC7AC\uBCA1\uD130\uD654 \uC2E4\uD589", disabled: inFlight || cooldownActive || isPolling, onClick: () => setConfirmOpen(true), title: cooldownActive
                        ? `쿨다운 중 (남은 ${data.reindex_cooldown_sec}초)`
                        : isPolling
                            ? "현재 재벡터화 진행 중"
                            : "재벡터화", children: inFlight
                        ? "요청 중…"
                        : isPolling
                            ? "진행 중…"
                            : cooldownActive
                                ? `쿨다운 ${data.reindex_cooldown_sec}s`
                                : "재벡터화" }) })), (0, jsx_runtime_1.jsx)(ConfirmDialog_1.ConfirmDialog, { open: confirmOpen, title: "\uC774 \uBB38\uC11C\uB97C \uC7AC\uBCA1\uD130\uD654\uD569\uB2C8\uB2E4", message: `현재 상태: ${display.label}. RAG 가 이 문서를 찾지 못하거나 최신 내용이 반영되지 않을 때 실행하세요. 완료까지 수 분 소요될 수 있습니다.`, confirmLabel: "\uC7AC\uBCA1\uD130\uD654 \uC2E4\uD589", cancelLabel: "\uCDE8\uC18C", onConfirm: () => reindexMutation.mutate(), onCancel: () => setConfirmOpen(false), loading: inFlight })] }));
}
