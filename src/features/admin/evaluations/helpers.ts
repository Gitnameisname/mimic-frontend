/**
 * 평가 결과 화면 공용 유틸.
 *
 * - 포맷터: 점수/지속시간/토큰/일시
 * - 에러 분류: #31 의 classifyListError 와 동일 규약 (401·403·404·429·5xx·네트워크)
 *
 * S2 ⑥ 안내 문구는 `403` 분기에만 노출한다 — 서버 장애·네트워크 단절을 권한 문제로
 * 오해하게 만들지 않도록.
 */

import {
  ApiError,
  API_BASE,
  NetworkError,
  getApiErrorMessage,
} from "@/lib/api/client";
import type {
  EvaluationMetricKey,
  EvaluationRunStatus,
} from "@/types/s2admin";

/**
 * 상세 진단 항목 — 배너 본문 아래 체크리스트로 렌더링한다.
 * title 은 짧은 제목, detail 은 관리자가 확인해야 할 구체적 조치.
 */
export interface DiagnosticItem {
  title: string;
  detail: string;
}

export interface ListErrorInfo {
  title: string;
  body: string;
  hint?: string;
  canRetry: boolean;
  /**
   * 관리자 진단용 기술 정보 — `classifyEvalListError` 가 필요시 채움.
   * 화면은 `<details>` 로 접힌 형태로 렌더링해 일반 사용자에게는 노출 최소화.
   */
  technical?: {
    label: string;
    value: string;
  }[];
  /** 관리자 조치 체크리스트 — 네트워크/5xx/404 등 근본 원인 가설이 복수일 때만 제공. */
  checklist?: DiagnosticItem[];
}

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
function _inferNetworkCauseLabel(original: string): string {
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
function _buildNetworkChecklist(target: string): DiagnosticItem[] {
  const items: DiagnosticItem[] = [];

  // 1. 가장 흔한 원인: 백엔드가 떠있지 않음 (로컬 개발 기본 포트 가정)
  items.push({
    title: "백엔드 서버가 실행 중인지 확인",
    detail: `대상 URL: ${target} — 해당 호스트/포트에서 API 서버가 기동 중이어야 합니다. 로컬이라면 \`cd backend && uvicorn app.main:app --port 8050\`.`,
  });

  // 2. API_BASE 설정
  items.push({
    title: "NEXT_PUBLIC_API_URL 환경 변수 확인",
    detail: `프론트엔드는 \`${API_BASE}\` 를 API 베이스로 사용합니다. 잘못된 호스트·포트를 가리키면 모든 요청이 실패합니다.`,
  });

  // 3. CORS
  try {
    const apiOrigin = new URL(target).origin;
    const pageOrigin =
      typeof window !== "undefined" ? window.location.origin : "(서버 렌더)";
    if (pageOrigin !== "(서버 렌더)" && apiOrigin !== pageOrigin) {
      items.push({
        title: "CORS 허용 origin 확인",
        detail: `프론트엔드(${pageOrigin}) 와 API(${apiOrigin}) 가 다른 origin 입니다. 백엔드 CORS 설정에 \`${pageOrigin}\` 이 포함되어야 합니다.`,
      });
    }
    // 4. Mixed content
    if (
      typeof window !== "undefined" &&
      window.location.protocol === "https:" &&
      apiOrigin.startsWith("http://")
    ) {
      items.push({
        title: "Mixed content 차단 가능성",
        detail: `HTTPS 페이지에서 HTTP API(${apiOrigin}) 를 호출하면 브라우저가 차단합니다. API 도 HTTPS 로 노출하거나 동일 origin 프록시를 사용해 주세요.`,
      });
    }
  } catch {
    // URL 파싱 실패 시 무시 — 체크리스트는 앞 2개로도 충분.
  }

  // 5. 개발자 도구 네트워크 탭 안내
  items.push({
    title: "브라우저 개발자 도구(네트워크 탭) 확인",
    detail: "실패한 요청을 선택하면 상태 코드·CORS 오류·TLS 오류 등 구체적 원인이 표시됩니다.",
  });

  return items;
}

export function classifyEvalListError(
  err: unknown,
  resource: string,
): ListErrorInfo {
  const fallback = `${resource} 을(를) 불러오지 못했습니다.`;

  if (err instanceof ApiError) {
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
        body: getApiErrorMessage(err, fallback),
        hint: "Scope Profile 바인딩 또는 역할을 확인해 주세요. (S2 ⑥)",
        canRetry: false,
        technical: err.code ? [{ label: "error.code", value: err.code }] : undefined,
      };
    }
    if (err.status === 404) {
      return {
        title: "엔드포인트를 찾을 수 없습니다",
        body: getApiErrorMessage(err, fallback),
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
        body: getApiErrorMessage(err, fallback),
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
      body: getApiErrorMessage(err, fallback),
      canRetry: true,
      technical: [
        { label: "HTTP", value: `${err.status} ${err.message || ""}`.trim() },
        ...(err.code ? [{ label: "error.code", value: err.code }] : []),
      ],
    };
  }

  if (err instanceof NetworkError) {
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
      checklist: _buildNetworkChecklist(API_BASE),
    };
  }

  return {
    title: `${resource} 을(를) 불러오지 못했습니다`,
    body: fallback,
    canRetry: true,
    technical:
      err instanceof Error
        ? [
            { label: "오류 유형", value: err.name || "Error" },
            { label: "메시지", value: err.message || "(빈 메시지)" },
          ]
        : undefined,
  };
}

// ─── 포맷터 ───

export function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

export function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("ko");
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "-";
  if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
  if (seconds < 60) return `${seconds.toFixed(1)}초`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds - m * 60);
  return `${m}분 ${s}초`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("ko");
  } catch {
    return "-";
  }
}

export function formatCost(usd: number | null | undefined): string {
  if (usd === null || usd === undefined) return "-";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

// ─── 상태 ───

export const STATUS_LABEL: Record<EvaluationRunStatus, string> = {
  queued: "대기 중",
  running: "실행 중",
  completed: "완료",
  failed: "실패",
};

export const STATUS_BADGE_STYLE: Record<EvaluationRunStatus, string> = {
  queued: "bg-gray-100 text-gray-700 border border-gray-200",
  running: "bg-blue-50 text-blue-700 border border-blue-200",
  completed: "bg-green-50 text-green-700 border border-green-200",
  failed: "bg-red-50 text-red-700 border border-red-200",
};

// ─── 지표 메타 ───

export const METRIC_LABELS: Record<EvaluationMetricKey, string> = {
  faithfulness: "Faithfulness",
  answer_relevance: "Answer Relevance",
  context_precision: "Context Precision",
  context_recall: "Context Recall",
  citation_present_rate: "Citation-present",
  hallucination_rate: "Hallucination",
};

/**
 * 지표별 임계치 — Phase 7 README.md 와 CLAUDE.md 산출물 규약 (F≥0.80, Citation≥0.90) 기준.
 * Hallucination 은 낮을수록 좋음 → 임계치 초과 시 경고.
 */
export const METRIC_THRESHOLDS: Record<EvaluationMetricKey, number> = {
  faithfulness: 0.8,
  answer_relevance: 0.75,
  context_precision: 0.75,
  context_recall: 0.75,
  citation_present_rate: 0.9,
  hallucination_rate: 0.1, // inverted: lower is better
};

export const METRIC_LOWER_IS_BETTER: Record<EvaluationMetricKey, boolean> = {
  faithfulness: false,
  answer_relevance: false,
  context_precision: false,
  context_recall: false,
  citation_present_rate: false,
  hallucination_rate: true,
};

export function scorePasses(
  metric: EvaluationMetricKey,
  value: number | null | undefined,
): boolean | null {
  if (value === null || value === undefined) return null;
  const threshold = METRIC_THRESHOLDS[metric];
  return METRIC_LOWER_IS_BETTER[metric] ? value <= threshold : value >= threshold;
}
