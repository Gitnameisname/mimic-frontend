"use strict";
/**
 * 평가 결과 화면 공용 유틸.
 *
 * - 포맷터: 점수/지속시간/토큰/일시
 * - 에러 분류: #31 의 classifyListError 와 동일 규약 (401·403·404·429·5xx·네트워크)
 *
 * S2 ⑥ 안내 문구는 `403` 분기에만 노출한다 — 서버 장애·네트워크 단절을 권한 문제로
 * 오해하게 만들지 않도록.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.METRIC_LOWER_IS_BETTER = exports.METRIC_THRESHOLDS = exports.STATUS_BADGE_STYLE = exports.METRIC_LABELS = exports.STATUS_LABEL = void 0;
exports.classifyEvalListError = classifyEvalListError;
exports.formatScore = formatScore;
exports.formatInt = formatInt;
exports.formatDuration = formatDuration;
exports.formatCost = formatCost;
exports.scorePasses = scorePasses;
const client_1 = require("@/lib/api/client");
/**
 * 브라우저/런타임별 fetch() 실패 메시지로부터 추정 원인 레이블을 뽑는다.
 *
 * - Chrome/Edge: "Failed to fetch"                 → 대상 서버 미응답 or CORS 프리플라이트 차단
 * - Firefox:     "NetworkError when attempting..." → 동일 카테고리
 * - Safari:      "Load failed"                     → 동일 카테고리
 * - Node undici: "fetch failed"                    → SSR 경로
 *
 * 모두 "브라우저는 응답을 전혀 받지 못했음" 이 공통이며, 실제 원인은 다수 후보가 있으므로
 * 배너에서는 후보 체크리스트를 모두 노출한다.
 */
function _inferNetworkCauseLabel(original) {
    const m = original.toLowerCase();
    if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed") || m.includes("fetch failed")) {
        return "브라우저가 서버로부터 응답을 받지 못했습니다";
    }
    if (m.includes("abort")) {
        return "요청이 취소되었습니다";
    }
    return original;
}
/**
 * NetworkError 진단용 체크리스트 생성기.
 *
 * URL 과 현재 페이지 프로토콜·host 에서 유추 가능한 문제 후보를 순서대로 나열한다.
 * 실제 원인은 네트워크 장비/OS 방화벽 등 브라우저가 모르는 영역일 수 있으므로
 * 단정하지 않고 "가능성" 으로 표현.
 */
function _buildNetworkChecklist(target) {
    const items = [];
    // 1. 가장 흔한 원인: 백엔드가 떠있지 않음 (로컬 개발 기본 포트 가정)
    items.push({
        title: "백엔드 서버가 실행 중인지 확인",
        detail: `대상 URL: ${target} — 해당 호스트/포트에서 API 서버가 기동 중이어야 합니다. 로컬이라면 \`cd backend && uvicorn app.main:app --port 8050\`.`,
    });
    // 2. API_BASE 설정
    items.push({
        title: "NEXT_PUBLIC_API_URL 환경 변수 확인",
        detail: `프론트엔드는 \`${client_1.API_BASE}\` 를 API 베이스로 사용합니다. 잘못된 호스트·포트를 가리키면 모든 요청이 실패합니다.`,
    });
    // 3. CORS
    try {
        const apiOrigin = new URL(target).origin;
        const pageOrigin = typeof window !== "undefined" ? window.location.origin : "(서버 렌더)";
        if (pageOrigin !== "(서버 렌더)" && apiOrigin !== pageOrigin) {
            items.push({
                title: "CORS 허용 origin 확인",
                detail: `프론트엔드(${pageOrigin}) 와 API(${apiOrigin}) 가 다른 origin 입니다. 백엔드 CORS 설정에 \`${pageOrigin}\` 이 포함되어야 합니다.`,
            });
        }
        // 4. Mixed content
        if (typeof window !== "undefined" &&
            window.location.protocol === "https:" &&
            apiOrigin.startsWith("http://")) {
            items.push({
                title: "Mixed content 차단 가능성",
                detail: `HTTPS 페이지에서 HTTP API(${apiOrigin}) 를 호출하면 브라우저가 차단합니다. API 도 HTTPS 로 노출하거나 동일 origin 프록시를 사용해 주세요.`,
            });
        }
    }
    catch {
        // URL 파싱 실패 시 무시 — 체크리스트는 앞 2개로도 충분.
    }
    // 5. 개발자 도구 네트워크 탭 안내
    items.push({
        title: "브라우저 개발자 도구(네트워크 탭) 확인",
        detail: "실패한 요청을 선택하면 상태 코드·CORS 오류·TLS 오류 등 구체적 원인이 표시됩니다.",
    });
    return items;
}
function classifyEvalListError(err, resource) {
    const fallback = `${resource} 을(를) 불러오지 못했습니다.`;
    if (err instanceof client_1.ApiError) {
        if (err.status === 401) {
            return {
                title: "세션이 만료되었습니다",
                body: "다시 로그인한 뒤 이 화면으로 돌아와 주세요.",
                canRetry: false,
            };
        }
        if (err.status === 403) {
            return {
                title: `${resource} 을(를) 볼 권한이 없습니다`,
                body: (0, client_1.getApiErrorMessage)(err, fallback),
                hint: "Scope Profile 바인딩 또는 역할을 확인해 주세요. (S2 ⑥)",
                canRetry: false,
                technical: err.code ? [{ label: "error.code", value: err.code }] : undefined,
            };
        }
        if (err.status === 404) {
            return {
                title: "엔드포인트를 찾을 수 없습니다",
                body: (0, client_1.getApiErrorMessage)(err, fallback),
                hint: "배포 버전 또는 API 경로 설정을 확인해 주세요.",
                canRetry: false,
                technical: [
                    { label: "HTTP", value: "404 Not Found" },
                    ...(err.code ? [{ label: "error.code", value: err.code }] : []),
                ],
            };
        }
        if (err.status === 429) {
            return {
                title: "요청이 너무 잦습니다",
                body: "잠시 후 다시 시도해 주세요.",
                canRetry: true,
                technical: [{ label: "HTTP", value: "429 Too Many Requests" }],
            };
        }
        if (err.status >= 500) {
            return {
                title: "서버에서 일시적 오류가 발생했습니다",
                body: (0, client_1.getApiErrorMessage)(err, fallback),
                hint: "잠시 후 다시 시도해 주세요. 문제가 지속되면 백엔드 로그를 확인해 주세요.",
                canRetry: true,
                technical: [
                    { label: "HTTP", value: `${err.status} ${err.message || "Server Error"}` },
                    ...(err.code ? [{ label: "error.code", value: err.code }] : []),
                ],
            };
        }
        return {
            title: `${resource} 을(를) 불러오지 못했습니다`,
            body: (0, client_1.getApiErrorMessage)(err, fallback),
            canRetry: true,
            technical: [
                { label: "HTTP", value: `${err.status} ${err.message || ""}`.trim() },
                ...(err.code ? [{ label: "error.code", value: err.code }] : []),
            ],
        };
    }
    if (err instanceof client_1.NetworkError) {
        return {
            title: "서버에 연결하지 못했습니다",
            body: _inferNetworkCauseLabel(err.originalMessage),
            hint: "HTTP 응답을 받기 전 단계에서 실패했습니다. 아래 가능한 원인을 차례대로 확인해 주세요.",
            canRetry: true,
            technical: [
                { label: "요청", value: `${err.method} ${err.url}` },
                { label: "원본 오류", value: err.originalMessage },
            ],
            checklist: _buildNetworkChecklist(err.url),
        };
    }
    // 레거시 경로: NetworkError 래핑 전의 fetch 실패
    if (err instanceof TypeError) {
        return {
            title: "서버에 연결하지 못했습니다",
            body: _inferNetworkCauseLabel(err.message),
            hint: "HTTP 응답을 받기 전 단계에서 실패했습니다. 아래 가능한 원인을 차례대로 확인해 주세요.",
            canRetry: true,
            technical: [{ label: "원본 오류", value: err.message || "(빈 메시지)" }],
            checklist: _buildNetworkChecklist(client_1.API_BASE),
        };
    }
    return {
        title: `${resource} 을(를) 불러오지 못했습니다`,
        body: fallback,
        canRetry: true,
        technical: err instanceof Error
            ? [
                { label: "오류 유형", value: err.name || "Error" },
                { label: "메시지", value: err.message || "(빈 메시지)" },
            ]
            : undefined,
    };
}
// ─── 포맷터 ───
function formatScore(value) {
    if (value === null || value === undefined || Number.isNaN(value))
        return "-";
    return `${(value * 100).toFixed(1)}%`;
}
function formatInt(value) {
    if (value === null || value === undefined)
        return "-";
    return value.toLocaleString("ko");
}
function formatDuration(seconds) {
    if (seconds === null || seconds === undefined)
        return "-";
    if (seconds < 1)
        return `${Math.round(seconds * 1000)}ms`;
    if (seconds < 60)
        return `${seconds.toFixed(1)}초`;
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds - m * 60);
    return `${m}분 ${s}초`;
}
function formatCost(usd) {
    if (usd === null || usd === undefined)
        return "-";
    if (usd < 0.01)
        return `$${usd.toFixed(4)}`;
    return `$${usd.toFixed(2)}`;
}
// ─── 상태 / 지표 라벨 / 배지 ───
//
// 도서관 §1.7 FE-G3 (2026-04-25): 정의 위치를 `@/lib/constants/{labels,badges}/evaluation.ts`
// 로 이전. 본 모듈은 thin re-export 로 외부 import 호환을 보존한다 (기존 호출지 그대로 동작).
// 정책 상수 (METRIC_THRESHOLDS / METRIC_LOWER_IS_BETTER / scorePasses) 는 도메인 정책
// 이라 본 helper 에 그대로 둔다.
var evaluation_1 = require("@/lib/constants/labels/evaluation");
Object.defineProperty(exports, "STATUS_LABEL", { enumerable: true, get: function () { return evaluation_1.EVALUATION_RUN_STATUS_LABELS; } });
Object.defineProperty(exports, "METRIC_LABELS", { enumerable: true, get: function () { return evaluation_1.EVALUATION_METRIC_LABELS; } });
var evaluation_2 = require("@/lib/constants/badges/evaluation");
Object.defineProperty(exports, "STATUS_BADGE_STYLE", { enumerable: true, get: function () { return evaluation_2.EVALUATION_RUN_STATUS_BADGE_CLASSES; } });
/**
 * 지표별 임계치 — Phase 7 README.md 와 CLAUDE.md 산출물 규약 (F≥0.80, Citation≥0.90) 기준.
 * Hallucination 은 낮을수록 좋음 → 임계치 초과 시 경고.
 */
exports.METRIC_THRESHOLDS = {
    faithfulness: 0.8,
    answer_relevance: 0.75,
    context_precision: 0.75,
    context_recall: 0.75,
    citation_present_rate: 0.9,
    hallucination_rate: 0.1, // inverted: lower is better
};
exports.METRIC_LOWER_IS_BETTER = {
    faithfulness: false,
    answer_relevance: false,
    context_precision: false,
    context_recall: false,
    citation_present_rate: false,
    hallucination_rate: true,
};
function scorePasses(metric, value) {
    if (value === null || value === undefined)
        return null;
    const threshold = exports.METRIC_THRESHOLDS[metric];
    return exports.METRIC_LOWER_IS_BETTER[metric] ? value <= threshold : value >= threshold;
}
