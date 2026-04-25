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

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  vectorizationApi,
  getApiErrorMessage,
  type VectorizationStatus,
  type VectorizationStatusResponse,
} from "@/lib/api";
import { toast } from "@/stores/uiStore";
import { Button } from "@/components/button/Button";
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { relativeTime } from "@/lib/utils";

interface Props {
  documentId: string;
  /** 문서 상세 헤더에 임베드할 때 true — 좁은 영역에 compact 표시 */
  compact?: boolean;
}

/** 상태별 뱃지 색상 + 라벨 (UI 리뷰 3회차 확정).
 *  (export: FG 0-5 단위 테스트가 직접 검증) */
export const STATUS_DISPLAY: Record<
  VectorizationStatus,
  { color: string; label: string; icon: string; srText: string }
> = {
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


export function VectorizationPanel({ documentId, compact = false }: Props) {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pollingStartedAt, setPollingStartedAt] = useState<number | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const statusQuery = useQuery<VectorizationStatusResponse>({
    queryKey: ["vectorization-status", documentId],
    queryFn: () => vectorizationApi.getStatus(documentId),
    refetchInterval: () => {
      if (pollingStartedAt === null) return false;
      if (Date.now() - pollingStartedAt > POLL_MAX_DURATION_MS) return false;
      const last = (qc.getQueryData(["vectorization-status", documentId]) as
        | VectorizationStatusResponse
        | undefined)?.status;
      if (last === "indexed" || last === "failed") return false;
      return POLL_INTERVAL_MS;
    },
    refetchOnWindowFocus: false,
  });

  // 폴링 수렴 시 타이머 정리
  useEffect(() => {
    const s = statusQuery.data?.status;
    if (pollingStartedAt !== null && (s === "indexed" || s === "failed")) {
      setPollingStartedAt(null);
    }
    // 60초 상한 후 강제 종료
    if (pollingStartedAt !== null && Date.now() - pollingStartedAt > POLL_MAX_DURATION_MS) {
      setPollingStartedAt(null);
    }
  }, [statusQuery.data?.status, pollingStartedAt]);

  const reindexMutation = useMutation({
    mutationFn: () => vectorizationApi.reindex(documentId),
    onSuccess: () => {
      toast("재벡터화를 시작했습니다. 상태를 추적합니다.", "success");
      setConfirmOpen(false);
      setPollingStartedAt(Date.now());
      // 즉시 상태 재조회 후 폴링 시작
      qc.invalidateQueries({ queryKey: ["vectorization-status", documentId] });
    },
    onError: (err) => {
      const msg = getApiErrorMessage(err, "재벡터화에 실패했습니다");
      // 429 는 서버 쿨다운 — 메시지에 Retry-After 반영
      toast(msg, "error");
      setConfirmOpen(false);
    },
  });

  const data = statusQuery.data;
  const display = useMemo(
    () => (data ? STATUS_DISPLAY[data.status] : null),
    [data],
  );

  if (statusQuery.isLoading) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs bg-neutral-50 text-neutral-500 border-neutral-200 ${
          compact ? "" : "text-sm"
        }`}
        aria-live="polite"
      >
        <span aria-hidden="true">·</span>
        벡터화 상태 조회 중…
      </span>
    );
  }

  if (!data || !display) {
    return (
      <span
        className="text-xs text-neutral-500"
        aria-live="polite"
      >
        벡터화 상태 확인 불가
      </span>
    );
  }

  const isBusy = data.status === "pending" || data.status === "in_progress";
  const cooldownActive = data.reindex_cooldown_sec > 0;
  const inFlight = reindexMutation.isPending;
  const isPolling = pollingStartedAt !== null;

  return (
    <div
      className={`flex ${compact ? "items-center gap-2" : "flex-col gap-1.5"}`}
      role="status"
      aria-live="polite"
      data-testid="vectorization-panel"
    >
      {/* 상태 뱃지 */}
      <span
        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${display.color}`}
        title={display.srText}
        data-status={data.status}
      >
        <span aria-hidden="true">{display.icon}</span>
        <span>{display.label}</span>
        {data.chunk_count > 0 && (
          <span className="opacity-70">· {data.chunk_count}청크</span>
        )}
      </span>

      {/* 마지막 성공 시각 (compact 여부 무관하게 유용) */}
      {data.last_vectorized_at && (
        <span className="text-xs text-neutral-500">
          마지막 색인: {relativeTime(data.last_vectorized_at)}
        </span>
      )}

      {/* 실패 시 1줄 요약 + details 토글 */}
      {data.status === "failed" && data.last_error && (
        <div className={compact ? "w-full" : ""}>
          <button
            type="button"
            className="text-xs text-red-700 underline hover:no-underline"
            onClick={() => setShowDetails((v) => !v)}
            aria-expanded={showDetails}
          >
            {showDetails ? "에러 상세 접기" : "에러 상세 보기"}
          </button>
          {showDetails && (
            <pre
              className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded border border-red-200 bg-red-50 p-2 text-xs text-red-900"
              data-testid="vec-error-details"
            >
              {data.last_error}
            </pre>
          )}
        </div>
      )}

      {/* 재벡터화 버튼 */}
      {data.can_reindex && (
        <div className={compact ? "" : "mt-1"}>
          <Button
            size="sm"
            variant="secondary"
            aria-label="재벡터화 실행"
            disabled={inFlight || cooldownActive || isPolling}
            onClick={() => setConfirmOpen(true)}
            title={
              cooldownActive
                ? `쿨다운 중 (남은 ${data.reindex_cooldown_sec}초)`
                : isPolling
                ? "현재 재벡터화 진행 중"
                : "재벡터화"
            }
          >
            {inFlight
              ? "요청 중…"
              : isPolling
              ? "진행 중…"
              : cooldownActive
              ? `쿨다운 ${data.reindex_cooldown_sec}s`
              : "재벡터화"}
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title="이 문서를 재벡터화합니다"
        message={`현재 상태: ${display.label}. RAG 가 이 문서를 찾지 못하거나 최신 내용이 반영되지 않을 때 실행하세요. 완료까지 수 분 소요될 수 있습니다.`}
        confirmLabel="재벡터화 실행"
        cancelLabel="취소"
        onConfirm={() => reindexMutation.mutate()}
        onCancel={() => setConfirmOpen(false)}
        loading={inFlight}
      />
    </div>
  );
}
