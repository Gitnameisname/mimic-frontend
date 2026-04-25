"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { extractionQueueApi } from "@/lib/api/s2admin";
import { adminApi } from "@/lib/api/admin";
import type { ExtractionResult, ExtractionResultDetail } from "@/types/s2admin";
import type { AdminDocumentType } from "@/types/admin";
import { cn } from "@/lib/utils";
import { BADGE_BASE } from "@/lib/styles/tokens";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { normalizeDocTypeCode } from "@/features/admin/extraction-schemas/docTypeNormalize";

import {
  EXTRACTION_STATUS,
  EXTRACTION_STATUS_LABELS,
  EXTRACTION_STATUS_BADGE_CLASSES,
  EXTRACTION_STATUS_VALUES,
} from "./constants";
import {
  mutationErrorMessage,
  formatFieldValue,
  buildApprovePayload,
  parseFiltersFromUrl,
  toSearchParamsString,
  validateRejectReason,
  DEFAULT_QUEUE_FILTERS,
  REJECT_REASON_MAX_LENGTH,
  type QueueFilters,
} from "./helpers";

// ─── 고지 배너 ───────────────────────────────────────────────────────────

/**
 * 에러 배너.
 *
 * B 스코프(2026-04-22) 이후 백엔드 `/api/v1/admin/extraction-results` 가
 * 구현되었으므로 "mock" variant 는 제거했다. 남은 사용처는 목록/상세/승인/반려
 * 경로의 실제 에러 표시뿐이다.
 */
function NoticeBanner({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border p-4 flex items-start gap-3",
        "bg-red-50 border-red-200",
      )}
    >
      <svg
        className="w-5 h-5 shrink-0 mt-0.5 text-red-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div>
        <p className="text-sm font-bold text-red-800">요청 실패</p>
        <p className="text-xs mt-0.5 text-red-700">{children}</p>
      </div>
    </div>
  );
}

// ─── 상태 배지 ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ExtractionResult["status"] }) {
  return (
    <span
      className={cn(BADGE_BASE, EXTRACTION_STATUS_BADGE_CLASSES[status])}
    >
      {EXTRACTION_STATUS_LABELS[status]}
    </span>
  );
}

// ─── 추출 결과 상세 패널 ──────────────────────────────────────────────────

function ExtractionDetailPanel({
  result,
  scopeProfileId,
  onClose,
  onReviewed,
}: {
  result: ExtractionResult;
  scopeProfileId: string;
  onClose: () => void;
  onReviewed: () => void;
}) {
  const [rejectReason, setRejectReason] = useState("");
  const [editMode, setEditMode] = useState(false);
  // 편집된 필드만 저장 (원본 필드는 displayDetail.extracted_fields 에 유지).
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const rejectHintId = useId();
  const rejectErrorId = useId();

  useFocusTrap(panelRef, true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const trimmedScope = scopeProfileId.trim();
  const detailQ = useQuery({
    queryKey: ["admin", "extraction-results", result.id, trimmedScope],
    queryFn: () =>
      extractionQueueApi.get(result.id, {
        scope_profile_id: trimmedScope || undefined,
      }),
    retry: false,
  });

  // 반려 사유 선-검증 (서버 최종 권위 1024자 + 공백/제어문자 차단).
  const rejectValidation = useMemo(
    () => validateRejectReason(rejectReason),
    [rejectReason],
  );

  const approveMut = useMutation({
    mutationFn: () => {
      // 편집 모드인 경우에만 overrides 를 전송. 빈 dict/미지정은 helpers 쪽에서 정규화.
      const parsedOverrides: Record<string, unknown> = {};
      for (const [k, raw] of Object.entries(overrides)) {
        parsedOverrides[k] = tryParseOverrideValue(raw);
      }
      const payload = buildApprovePayload(
        editMode ? parsedOverrides : undefined,
      );
      return extractionQueueApi.approve(result.id, payload);
    },
    onSuccess: () => {
      onReviewed();
      onClose();
    },
  });

  const rejectMut = useMutation({
    mutationFn: () =>
      extractionQueueApi.reject(
        result.id,
        rejectValidation.normalized || undefined,
      ),
    onSuccess: () => {
      onReviewed();
      onClose();
    },
  });

  const detail: ExtractionResultDetail | undefined = detailQ.data?.data;
  const detailFetchFailed = Boolean(detailQ.error);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <div
        ref={panelRef}
        className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            <h2
              id={titleId}
              className="text-base font-bold text-gray-900 truncate"
            >
              {result.document_title}
            </h2>
            <StatusBadge status={result.status} />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            aria-label="닫기 (Esc)"
          >
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {detailFetchFailed && (
            <NoticeBanner>{mutationErrorMessage(detailQ.error)}</NoticeBanner>
          )}

          {detailQ.isPending && (
            <div
              role="status"
              aria-live="polite"
              className="text-xs text-gray-500"
            >
              상세 정보를 불러오는 중입니다…
            </div>
          )}

          {detail && (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">DocumentType</p>
                  <p className="font-semibold text-gray-900 font-mono text-xs">
                    {detail.document_type_code}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">추출 시각</p>
                  <p className="font-semibold text-gray-900 text-xs">
                    {new Date(detail.extracted_at).toLocaleString("ko")}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">
                  원본 문서 미리보기
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 text-xs text-gray-700 font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {detail.original_content_preview || "(본문 없음)"}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">
                    추출된 필드 값
                  </h3>
                  {result.status === EXTRACTION_STATUS.PENDING_REVIEW && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditMode((v) => !v);
                        if (editMode) setOverrides({});
                      }}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-800 px-2 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      {editMode ? "편집 취소" : "필드 수정"}
                    </button>
                  )}
                </div>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">
                          필드
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">
                          값
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">
                          위치
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {Object.entries(detail.extracted_fields).map(([k, v]) => (
                        <tr key={k} className="hover:bg-gray-50 align-top">
                          <td className="px-4 py-2.5 font-semibold text-gray-900 font-mono text-xs">
                            {k}
                          </td>
                          <td className="px-4 py-2.5 text-gray-700 text-xs break-all">
                            {editMode ? (
                              <input
                                type="text"
                                className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                                defaultValue={formatFieldValue(v)}
                                onChange={(e) =>
                                  setOverrides((prev) => ({
                                    ...prev,
                                    [k]: e.target.value,
                                  }))
                                }
                                aria-label={`${k} 수정`}
                              />
                            ) : (
                              formatFieldValue(v)
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-gray-400 text-xs">
                            {detail.field_spans[k] ?? "-"}
                          </td>
                        </tr>
                      ))}
                      {Object.keys(detail.extracted_fields).length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-4 py-8 text-center text-xs text-gray-400"
                          >
                            추출된 필드가 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {editMode && (
                  <p className="mt-2 text-[11px] text-gray-500">
                    수정된 값은 승인 시에만 저장됩니다. 빈 필드는 원본이 유지됩니다.
                  </p>
                )}
              </div>
            </>
          )}

          {/* 승인/반려 액션 */}
          {result.status === EXTRACTION_STATUS.PENDING_REVIEW && (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="reject-reason"
                  className="block text-sm font-semibold text-gray-700 mb-1.5"
                >
                  반려 사유 (선택)
                </label>
                <textarea
                  id="reject-reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={2}
                  maxLength={REJECT_REASON_MAX_LENGTH + 64}
                  className={cn(
                    "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none",
                    rejectValidation.valid
                      ? "border-gray-300 focus:ring-blue-500"
                      : "border-red-400 focus:ring-red-500 bg-red-50/30",
                  )}
                  placeholder="반려 시 사유 입력 (3자 이상 권장, 최대 1,024자)"
                  aria-invalid={rejectValidation.valid ? "false" : "true"}
                  aria-describedby={
                    rejectValidation.errorMessage
                      ? `${rejectHintId} ${rejectErrorId}`
                      : rejectHintId
                  }
                />
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p
                    id={rejectHintId}
                    className="text-[11px] text-gray-500"
                  >
                    비워두면 사유 없이 반려됩니다.
                  </p>
                  <p
                    className={cn(
                      "text-[11px] font-mono tabular-nums",
                      rejectValidation.remaining < 0
                        ? "text-red-700 font-semibold"
                        : rejectValidation.remaining < 64
                          ? "text-amber-700"
                          : "text-gray-400",
                    )}
                    aria-live="polite"
                  >
                    {rejectValidation.remaining >= 0
                      ? `남은 글자수 ${rejectValidation.remaining.toLocaleString("ko")}`
                      : `초과 ${Math.abs(rejectValidation.remaining).toLocaleString("ko")}자`}
                  </p>
                </div>
                {rejectValidation.errorMessage && (
                  <p
                    id={rejectErrorId}
                    role="alert"
                    className="mt-1 text-[11px] text-red-700"
                  >
                    {rejectValidation.errorMessage}
                  </p>
                )}
              </div>
              {(approveMut.isError || rejectMut.isError) && (
                <NoticeBanner>
                  {mutationErrorMessage(approveMut.error ?? rejectMut.error)}
                </NoticeBanner>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={
                    rejectMut.isPending ||
                    approveMut.isPending ||
                    !rejectValidation.valid
                  }
                  onClick={() => rejectMut.mutate()}
                  className="flex-1 py-2.5 rounded-lg bg-red-50 border border-red-300 text-red-700 text-sm font-semibold hover:bg-red-100 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                >
                  {rejectMut.isPending ? "처리 중..." : "반려"}
                </button>
                <button
                  type="button"
                  disabled={approveMut.isPending || rejectMut.isPending}
                  onClick={() => approveMut.mutate()}
                  className="flex-1 py-2.5 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
                >
                  {approveMut.isPending
                    ? "처리 중..."
                    : editMode && Object.keys(overrides).length > 0
                      ? "수정 후 승인"
                      : "모두 승인"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 사용자가 입력한 override 문자열을 서버가 기대하는 타입으로 최소 파싱.
 *
 * - JSON 으로 파싱 가능(숫자/boolean/object) → 그 값
 * - 아니면 문자열 그대로 전송 (서버가 Dict[str, Any] 로 받으므로 안전)
 */
function tryParseOverrideValue(raw: string): unknown {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  try {
    return JSON.parse(trimmed);
  } catch {
    return raw;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 스켈레톤 로딩 행 — 목록 로드 중 시각적 placeholder
// ═══════════════════════════════════════════════════════════════════════════

function SkeletonRows({ rows }: { rows: number }) {
  // 접근성: 단일 live-region 으로 로딩 상태 알림. 각 셀은 aria-hidden.
  return (
    <>
      <tr aria-hidden="false">
        <td colSpan={5} className="sr-only">
          <span role="status" aria-live="polite">
            추출 결과 목록을 불러오는 중입니다…
          </span>
        </td>
      </tr>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={`skeleton-${i}`} aria-hidden="true">
          <td className="px-4 py-3">
            <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 bg-gray-100 rounded animate-pulse w-1/2" />
          </td>
          <td className="px-4 py-3">
            <div className="h-4 bg-gray-100 rounded animate-pulse w-24" />
          </td>
          <td className="px-4 py-3">
            <div className="h-5 bg-gray-100 rounded-full animate-pulse w-16" />
          </td>
          <td className="px-4 py-3 text-right">
            <div className="h-6 bg-gray-100 rounded animate-pulse w-12 ml-auto" />
          </td>
        </tr>
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AdminExtractionQueuePage
// ═══════════════════════════════════════════════════════════════════════════

const PAGE_SIZE = 20;

export function AdminExtractionQueuePage() {
  const qc = useQueryClient();

  // ─ URL state (C 스코프) ──────────────────────────────────────────────
  // `useSearchParams()` 는 내비게이션마다 새 참조를 반환하므로, 마운트 시
  // 1회만 parse 해 초기값으로 사용하고 이후 state → URL 단방향 동기화를 건다.
  // (그 반대로 URL → state 를 계속 싱크하면 useEffect loop 위험이 있어
  //  이 페이지는 "마운트 시 1회 복원 + 이후 state 가 진실" 정책을 택했다.)
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<QueueFilters>(() =>
    parseFiltersFromUrl(searchParams ?? new URLSearchParams()),
  );

  // 편의 접근자 — 기존 코드의 변경 폭을 줄이기 위해 펼친다.
  const { status: statusFilter, documentType: typeFilter, page } = filters;
  const [scopeProfileIdRaw, setScopeProfileIdRaw] = useState<string>(
    filters.scopeProfileId,
  );

  const setStatusFilter = useCallback((v: string) => {
    setFilters((f) => ({ ...f, status: v, page: 1 }));
  }, []);
  const setTypeFilter = useCallback((v: string) => {
    setFilters((f) => ({ ...f, documentType: v, page: 1 }));
  }, []);
  const setPage = useCallback((updater: number | ((p: number) => number)) => {
    setFilters((f) => ({
      ...f,
      page:
        typeof updater === "function"
          ? Math.max(1, updater(f.page))
          : Math.max(1, updater),
    }));
  }, []);

  const [scopeError, setScopeError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ExtractionResult | null>(null);

  const docTypesQ = useQuery({
    queryKey: ["admin", "document-types", "active"],
    queryFn: () => adminApi.getDocumentTypes({ status: "active" }),
    retry: 1,
    staleTime: 60_000,
  });

  const docTypeOptions = useMemo<AdminDocumentType[]>(() => {
    const list = docTypesQ.data?.data ?? [];
    return list.map((dt) => ({
      ...dt,
      type_code: normalizeDocTypeCode(dt.type_code),
    }));
  }, [docTypesQ.data]);

  const trimmedScope = scopeProfileIdRaw.trim();
  useEffect(() => {
    if (!trimmedScope) {
      setScopeError(null);
      setFilters((f) =>
        f.scopeProfileId === "" ? f : { ...f, scopeProfileId: "", page: 1 },
      );
      return;
    }
    if (trimmedScope.length < 32) {
      setScopeError("scope_profile_id 는 UUID 형식이어야 합니다.");
    } else {
      setScopeError(null);
      setFilters((f) =>
        f.scopeProfileId === trimmedScope
          ? f
          : { ...f, scopeProfileId: trimmedScope, page: 1 },
      );
    }
  }, [trimmedScope]);

  const scopeValid = !scopeError;

  // state → URL 단방향 동기화. 기본값만 있으면 쿼리 없이 깔끔한 URL 로.
  useEffect(() => {
    if (!pathname) return;
    const qs = toSearchParamsString(filters);
    const nextUrl = qs ? `${pathname}?${qs}` : pathname;
    const currentQs = searchParams?.toString() ?? "";
    if (qs === currentQs) return;
    router.replace(nextUrl, { scroll: false });
    // searchParams 는 router.replace 후 React 가 갱신하므로 의존에서 제외.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, pathname, router]);

  // 필터 변경 시 page 자동 리셋은 setter 안에서 이미 처리됨.
  // 현재 적용된 필터가 "기본값이 아닌지" 여부 — 빈 상태 렌더에서 사용.
  const filtersDiverged = useMemo(() => {
    return (
      filters.status !== DEFAULT_QUEUE_FILTERS.status ||
      filters.documentType !== "" ||
      filters.scopeProfileId !== ""
    );
  }, [filters]);

  const resetFilters = useCallback(() => {
    setFilters({ ...DEFAULT_QUEUE_FILTERS });
    setScopeProfileIdRaw("");
  }, []);

  const listQ = useQuery({
    queryKey: [
      "admin",
      "extraction-results",
      statusFilter,
      typeFilter,
      trimmedScope,
      page,
    ],
    queryFn: () =>
      extractionQueueApi.list({
        status: statusFilter || undefined,
        document_type: typeFilter || undefined,
        scope_profile_id: scopeValid ? trimmedScope || undefined : undefined,
        page,
        page_size: PAGE_SIZE,
      }),
    retry: false,
    enabled: scopeValid,
  });

  const results: ExtractionResult[] = listQ.data?.data ?? [];
  const pagination = listQ.data?.meta?.pagination;
  const total = pagination?.total ?? null;
  const hasNext = pagination?.has_next ?? (total !== null ? page * PAGE_SIZE < total : false);
  const hasError = listQ.isError;

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-7xl">
      {selected && (
        <ExtractionDetailPanel
          result={selected}
          scopeProfileId={scopeProfileIdRaw}
          onClose={() => setSelected(null)}
          onReviewed={() =>
            qc.invalidateQueries({ queryKey: ["admin", "extraction-results"] })
          }
        />
      )}

      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-gray-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          추출 결과 검토 큐
        </h1>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px]"
            aria-label="상태 필터"
          >
            <option value="">전체 상태</option>
            {EXTRACTION_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {EXTRACTION_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[40px]"
            aria-label="DocumentType 필터"
            disabled={docTypesQ.isLoading}
          >
            <option value="">
              {docTypesQ.isLoading
                ? "타입 로드 중..."
                : docTypeOptions.length === 0
                  ? "등록된 타입 없음"
                  : "전체 타입"}
            </option>
            {docTypeOptions.map((dt) => (
              <option key={dt.type_code} value={dt.type_code}>
                {dt.display_name} ({dt.type_code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* scope_profile_id 입력 — ACL 경로 */}
      <div className="flex items-end gap-2 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <label
            htmlFor="extraction-queue-scope-profile-id"
            className="block text-xs font-semibold text-gray-700 mb-1"
          >
            Scope Profile ID (선택)
          </label>
          <input
            id="extraction-queue-scope-profile-id"
            type="text"
            value={scopeProfileIdRaw}
            onChange={(e) => setScopeProfileIdRaw(e.target.value)}
            placeholder="UUID — 비우면 사용자 기본 스코프"
            className="w-full px-3 py-2 text-[11px] border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            autoComplete="off"
            aria-invalid={scopeError ? "true" : "false"}
            aria-describedby={scopeError ? "scope-profile-error" : undefined}
          />
          {scopeError && (
            <p
              id="scope-profile-error"
              role="alert"
              className="mt-1 text-[11px] text-red-700"
            >
              {scopeError}
            </p>
          )}
        </div>
        {filtersDiverged && (
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-2 text-xs font-semibold text-gray-700 border border-gray-300 rounded-lg bg-white hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[38px]"
            aria-label="모든 필터를 기본값으로 재설정"
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* 에러 배너 */}
      {hasError && (
        <NoticeBanner>
          {mutationErrorMessage(listQ.error)}{" "}
          <button
            type="button"
            onClick={() => listQ.refetch()}
            className="underline underline-offset-2 font-semibold hover:text-red-900"
          >
            다시 시도
          </button>
        </NoticeBanner>
      )}
      {docTypesQ.isError && (
        <NoticeBanner>
          문서 타입 목록을 불러오지 못했습니다. 드롭다운이 비어 있을 수 있습니다.
        </NoticeBanner>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  문서
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  DocumentType
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  추출 시각
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  상태
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {listQ.isPending && scopeValid && (
                <SkeletonRows rows={5} />
              )}
              {!scopeValid && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-xs text-amber-700"
                  >
                    scope_profile_id 형식 오류로 조회를 수행하지 않았습니다.
                  </td>
                </tr>
              )}
              {!listQ.isPending && hasError && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-xs text-gray-500"
                  >
                    불러오기에 실패했습니다. 위의 &quot;다시 시도&quot; 를 눌러 주세요.
                  </td>
                </tr>
              )}
              {!listQ.isPending && !hasError && results.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-sm font-semibold text-gray-700">
                        {filtersDiverged
                          ? "현재 필터 조건에 해당하는 추출 결과가 없습니다."
                          : "검토 대기 중인 추출 결과가 없습니다."}
                      </p>
                      <p className="text-xs text-gray-500">
                        {filtersDiverged
                          ? "필터를 조정하거나 초기화 후 다시 조회해 보세요."
                          : "새로운 문서가 처리되면 이 목록에 표시됩니다."}
                      </p>
                      {filtersDiverged && (
                        <button
                          type="button"
                          onClick={resetFilters}
                          className="mt-1 px-3 py-1.5 text-xs font-semibold text-blue-700 border border-blue-300 rounded-lg bg-blue-50 hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          필터 초기화
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
              {results.map((r) => (
                <tr
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${r.document_title} 추출 결과 검토`}
                  className="hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus-visible:bg-blue-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                  onClick={() => setSelected(r)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(r);
                    }
                  }}
                >
                  <td className="px-4 py-3 font-semibold text-gray-900 max-w-xs truncate">
                    {r.document_title}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                    {r.document_type_code}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(r.extracted_at).toLocaleString("ko", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.status} />
                  </td>
                  <td
                    className="px-4 py-3 text-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setSelected(r)}
                      className="text-xs font-semibold text-blue-700 hover:text-blue-800 px-3 py-1.5 rounded-lg hover:bg-blue-50 min-h-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      검토
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 바 */}
        {!listQ.isPending && !hasError && results.length > 0 && (
          <nav
            aria-label="페이지네이션"
            className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-600"
          >
            <div>
              {total !== null
                ? `총 ${total.toLocaleString("ko")}건 중 ${(page - 1) * PAGE_SIZE + 1}~${(page - 1) * PAGE_SIZE + results.length}번`
                : `페이지 ${page}`}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[32px]"
                aria-label="이전 페이지"
              >
                이전
              </button>
              <span className="px-2 font-semibold text-gray-900">{page}</span>
              <button
                type="button"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 min-h-[32px]"
                aria-label="다음 페이지"
              >
                다음
              </button>
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
