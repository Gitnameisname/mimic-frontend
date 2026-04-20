"use client";

/**
 * 배치 작업 관리 페이지 (Phase 14-14)
 *
 * 기능:
 *  - 스케줄 목록 (상태 / 스케줄 / 마지막 실행 / 소요시간 / 작업 버튼)
 *  - 행 클릭 → 상세 패널 (최근 실행 이력 10건)
 *  - 수동 실행 (확인 다이얼로그) / 취소
 *  - 스케줄 변경 모달 (cron 표현식 + 한국어 미리보기 + 다음 실행 3회)
 *  - 실행 중인 작업 있을 때만 5초 폴링
 *
 * UI 리뷰 5회 원칙:
 *  1) 상태 시각화: idle/running/failed 색상 (gray/blue-pulse/red)
 *  2) 권한 분리: SUPER_ADMIN 만 실행/변경/취소
 *  3) 안전성: 수동 실행 확인 모달, 취소는 graceful 고지
 *  4) 반응형: 테이블 overflow-x, 헤더 flex-wrap, 모달 sm:max-w
 *  5) 접근성: role/aria, focus-visible, sr-only 라벨, live region
 */

import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

import { adminApi } from "@/lib/api/admin";
import { useAuth } from "@/contexts/AuthContext";
import { Modal, ModalActions } from "@/components/feedback/Modal";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import type {
  JobSchedule,
  JobScheduleDetail,
  JobScheduleStatus,
  JobScheduleRun,
} from "@/types/admin";

// ─── 상수 ──────────────────────────────────────────────────────────

const STATUS_META: Record<
  JobScheduleStatus,
  { label: string; dotClass: string; textClass: string; pulse?: boolean }
> = {
  idle: { label: "대기", dotClass: "bg-gray-400", textClass: "text-gray-600" },
  running: { label: "실행 중", dotClass: "bg-blue-500", textClass: "text-blue-700", pulse: true },
  failed: { label: "실패", dotClass: "bg-red-500", textClass: "text-red-700" },
};

const RESULT_META: Record<string, { label: string; className: string }> = {
  success: { label: "성공", className: "text-green-700 bg-green-50" },
  failed: { label: "실패", className: "text-red-700 bg-red-50" },
  cancelled: { label: "취소", className: "text-gray-600 bg-gray-100" },
};

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}일 전`;
  return d.toLocaleDateString("ko-KR");
}

function formatDuration(ms: number | null | undefined): string {
  if (ms == null) return "-";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}초`;
  return `${Math.round(ms / 60_000)}분 ${Math.round((ms % 60_000) / 1000)}초`;
}

// ─── 메인 ──────────────────────────────────────────────────────────

export function AdminJobSchedulesPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole?.("SUPER_ADMIN") ?? false;
  const qc = useQueryClient();

  const schedulesQuery = useQuery({
    queryKey: ["admin", "jobs", "schedules"],
    queryFn: () => adminApi.getJobSchedules(),
    // 실행 중인 작업이 있으면 5초 폴링
    refetchInterval: (query) => {
      const data = query.state.data?.data;
      return data?.some((s) => s.status === "running") ? 5000 : false;
    },
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmRun, setConfirmRun] = useState<JobSchedule | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<JobSchedule | null>(null);
  const [scheduleEdit, setScheduleEdit] = useState<JobSchedule | null>(null);

  const schedules = schedulesQuery.data?.data ?? [];

  const runMutation = useMutationWithToast({
    mutationFn: (jobId: string) => adminApi.runJobSchedule(jobId),
    successMessage: "작업이 시작되었습니다.",
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "jobs", "schedules"] }),
  });

  const cancelMutation = useMutationWithToast({
    mutationFn: (jobId: string) => adminApi.cancelJobSchedule(jobId),
    successMessage: "작업 취소가 요청되었습니다.",
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "jobs", "schedules"] }),
  });

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">배치 작업 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            재인덱싱·동기화·정리 배치의 스케줄을 확인하고 수동으로 실행합니다.
          </p>
        </div>
        {schedulesQuery.isFetching && (
          <span
            className="text-xs text-gray-400"
            role="status"
            aria-live="polite"
          >
            새로고침 중...
          </span>
        )}
      </header>

      <section aria-labelledby="jobs-heading" className="space-y-3">
        <h2 id="jobs-heading" className="sr-only">배치 작업 목록</h2>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th scope="col" className="w-8" aria-label="확장" />
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">작업 이름</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상태</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">스케줄</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">마지막 실행</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">소요 시간</th>
                  <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">작업</th>
                </tr>
              </thead>
              <tbody>
                {schedulesQuery.isLoading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400" role="status">로딩 중...</td></tr>
                ) : schedules.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">등록된 작업이 없습니다.</td></tr>
                ) : schedules.map((s) => {
                  const meta = STATUS_META[s.status] ?? STATUS_META.idle;
                  const isOpen = expandedId === s.id;
                  return (
                    <JobScheduleRow
                      key={s.id}
                      schedule={s}
                      meta={meta}
                      isOpen={isOpen}
                      canEdit={canEdit}
                      onToggle={() => setExpandedId(isOpen ? null : s.id)}
                      onRun={() => setConfirmRun(s)}
                      onCancel={() => setConfirmCancel(s)}
                      onEditSchedule={() => setScheduleEdit(s)}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 수동 실행 확인 */}
      {confirmRun && (
        <Modal title="이 작업을 실행하시겠습니까?" onClose={() => setConfirmRun(null)} maxWidth="max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!runMutation.isPending) {
                runMutation.mutate(confirmRun.id, {
                  onSuccess: () => setConfirmRun(null),
                });
              }
            }}
            className="space-y-3"
          >
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{confirmRun.name}</span> 작업을 즉시 실행합니다.
            </p>
            <p className="text-xs text-gray-500">스케줄된 다음 실행과 별개로 큐에 등록됩니다.</p>
            <ModalActions
              onClose={() => setConfirmRun(null)}
              isPending={runMutation.isPending}
              submitLabel="실행"
              pendingLabel="실행 중..."
            />
          </form>
        </Modal>
      )}

      {/* 취소 확인 */}
      {confirmCancel && (
        <Modal title="실행 중인 작업을 취소하시겠습니까?" onClose={() => setConfirmCancel(null)} maxWidth="max-w-md">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!cancelMutation.isPending) {
                cancelMutation.mutate(confirmCancel.id, {
                  onSuccess: () => setConfirmCancel(null),
                });
              }
            }}
            className="space-y-3"
          >
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{confirmCancel.name}</span> 작업의 취소를 요청합니다.
            </p>
            <p className="text-xs text-gray-500">
              Graceful shutdown 을 요청하며, 즉시 중단되지 않을 수 있습니다.
            </p>
            <ModalActions
              onClose={() => setConfirmCancel(null)}
              isPending={cancelMutation.isPending}
              submitLabel="취소 요청"
              pendingLabel="요청 중..."
              destructive
            />
          </form>
        </Modal>
      )}

      {/* 스케줄 변경 */}
      {scheduleEdit && (
        <ScheduleEditorModal
          schedule={scheduleEdit}
          onClose={() => setScheduleEdit(null)}
          onSaved={() => {
            setScheduleEdit(null);
            qc.invalidateQueries({ queryKey: ["admin", "jobs", "schedules"] });
          }}
        />
      )}
    </div>
  );
}

// ─── 행 + 상세 ──────────────────────────────────────────────────────

function JobScheduleRow({
  schedule,
  meta,
  isOpen,
  canEdit,
  onToggle,
  onRun,
  onCancel,
  onEditSchedule,
}: {
  schedule: JobSchedule;
  meta: typeof STATUS_META[JobScheduleStatus];
  isOpen: boolean;
  canEdit: boolean;
  onToggle: () => void;
  onRun: () => void;
  onCancel: () => void;
  onEditSchedule: () => void;
}) {
  const isRunning = schedule.status === "running";
  return (
    <>
      <tr
        className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60 transition-colors cursor-pointer"
        onClick={onToggle}
      >
        <td className="pl-3 pr-1 py-2.5">
          <button
            type="button"
            aria-label={isOpen ? "상세 닫기" : "상세 열기"}
            aria-expanded={isOpen}
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className="p-1 text-gray-400 hover:text-gray-700 rounded
              focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <span aria-hidden="true" className={`inline-block transition-transform ${isOpen ? "rotate-90" : ""}`}>▶</span>
          </button>
        </td>
        <td className="px-4 py-2.5 text-sm text-gray-900 font-medium">{schedule.name}</td>
        <td className="px-4 py-2.5">
          <span className={`inline-flex items-center gap-1.5 text-xs ${meta.textClass}`}>
            <span
              aria-hidden="true"
              className={`inline-block w-1.5 h-1.5 rounded-full ${meta.dotClass} ${meta.pulse ? "animate-pulse" : ""}`}
            />
            {meta.label}
          </span>
        </td>
        <td className="px-4 py-2.5 text-xs text-gray-600">
          {schedule.schedule_description ?? <span className="text-gray-300">없음</span>}
          {schedule.schedule && (
            <div className="font-mono text-[11px] text-gray-400 mt-0.5">{schedule.schedule}</div>
          )}
        </td>
        <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
          {formatRelative(schedule.last_run_at)}
          {schedule.last_run_result && (
            <span className={`ml-2 inline-flex px-1.5 py-0.5 text-[11px] rounded ${RESULT_META[schedule.last_run_result]?.className ?? ""}`}>
              {RESULT_META[schedule.last_run_result]?.label ?? schedule.last_run_result}
            </span>
          )}
        </td>
        <td className="px-4 py-2.5 text-xs text-gray-600">{formatDuration(schedule.last_run_duration_ms)}</td>
        <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
          <div className="inline-flex gap-1.5">
            {isRunning ? (
              canEdit && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-2 py-1 text-xs text-red-700 bg-red-50 hover:bg-red-100 rounded
                    focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none min-h-[32px]"
                >
                  취소
                </button>
              )
            ) : (
              canEdit && (
                <>
                  <button
                    type="button"
                    onClick={onRun}
                    className="px-2 py-1 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded
                      focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none min-h-[32px]"
                  >
                    실행
                  </button>
                  <button
                    type="button"
                    onClick={onEditSchedule}
                    className="px-2 py-1 text-xs text-gray-700 hover:bg-gray-100 rounded
                      focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none min-h-[32px]"
                  >
                    설정
                  </button>
                </>
              )
            )}
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr>
          <td colSpan={7} className="bg-gray-50/60 border-b border-gray-100">
            <ExpandedDetail scheduleId={schedule.id} />
          </td>
        </tr>
      )}
    </>
  );
}

function ExpandedDetail({ scheduleId }: { scheduleId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "jobs", "schedules", scheduleId],
    queryFn: () => adminApi.getJobSchedule(scheduleId),
  });
  const detail: JobScheduleDetail | undefined = data?.data;

  return (
    <div className="px-6 py-4 space-y-3">
      {isLoading || !detail ? (
        <p className="text-sm text-gray-400" role="status">로딩 중...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-400">스케줄</div>
              <div className="text-gray-700 mt-0.5">
                {detail.schedule_description ?? "-"}
                {detail.schedule && (
                  <div className="font-mono text-[11px] text-gray-400 mt-0.5">{detail.schedule}</div>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">다음 실행</div>
              <div className="text-gray-700 mt-0.5">
                {detail.next_run_at ? new Date(detail.next_run_at).toLocaleString("ko-KR") : "-"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">활성</div>
              <div className="text-gray-700 mt-0.5">{detail.enabled ? "예" : "아니오"}</div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-600 mb-1.5">최근 실행 이력</div>
            <RecentRunsTable runs={detail.recent_runs} />
          </div>
        </>
      )}
    </div>
  );
}

function RecentRunsTable({ runs }: { runs: JobScheduleRun[] }) {
  if (runs.length === 0) {
    return <p className="text-xs text-gray-400 py-2">실행 이력이 없습니다.</p>;
  }
  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th scope="col" className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">시작</th>
            <th scope="col" className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">종료</th>
            <th scope="col" className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">소요</th>
            <th scope="col" className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">결과</th>
            <th scope="col" className="px-3 py-1.5 text-left font-semibold text-gray-500 uppercase tracking-wide">상세</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-b border-gray-100 last:border-b-0">
              <td className="px-3 py-1.5 text-gray-600 whitespace-nowrap">
                {r.started_at ? new Date(r.started_at).toLocaleString("ko-KR") : "-"}
              </td>
              <td className="px-3 py-1.5 text-gray-600 whitespace-nowrap">
                {r.ended_at ? new Date(r.ended_at).toLocaleString("ko-KR") : "-"}
              </td>
              <td className="px-3 py-1.5 text-gray-600">{formatDuration(r.duration_ms)}</td>
              <td className="px-3 py-1.5">
                {r.result ? (
                  <span className={`inline-flex px-1.5 py-0.5 rounded ${RESULT_META[r.result]?.className ?? ""}`}>
                    {RESULT_META[r.result]?.label ?? r.result}
                  </span>
                ) : (
                  <span className="text-gray-400">{r.status}</span>
                )}
              </td>
              <td className="px-3 py-1.5 text-gray-500 text-[11px]">
                {r.error_code ? `${r.error_code}: ${r.error_message ?? ""}` : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── 스케줄 변경 모달 ──────────────────────────────────────────────

function ScheduleEditorModal({
  schedule,
  onClose,
  onSaved,
}: {
  schedule: JobSchedule;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [expr, setExpr] = useState<string>(schedule.schedule ?? "");
  const [enabled, setEnabled] = useState<boolean>(schedule.enabled);
  const [preview, setPreview] = useState<{ description: string; nextRuns: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewMutation = useMutation({
    mutationFn: (val: string) => adminApi.previewCron(val),
  });

  const saveMutation = useMutationWithToast({
    mutationFn: () =>
      adminApi.updateJobSchedule(schedule.id, { schedule: expr.trim(), enabled }),
    successMessage: "스케줄이 업데이트되었습니다.",
    onSuccess: () => onSaved(),
  });

  async function handlePreview() {
    setError(null);
    try {
      const res = await previewMutation.mutateAsync(expr.trim());
      setPreview({
        description: res.data.description,
        nextRuns: res.data.next_runs,
      });
    } catch (e) {
      setPreview(null);
      setError(e instanceof Error ? e.message : "cron 표현식 오류");
    }
  }

  return (
    <Modal title="스케줄 변경" onClose={onClose} maxWidth="max-w-lg">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          saveMutation.mutate(undefined, {
            onError: (err) => setError(err instanceof Error ? err.message : "저장 실패"),
          });
        }}
        className="space-y-3"
      >
        <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
          <div><span className="text-gray-500">작업: </span><span className="font-medium">{schedule.name}</span></div>
          <div><span className="text-gray-500">현재: </span>
            <span className="font-mono">{schedule.schedule ?? "-"}</span>
            {schedule.schedule_description && <span className="text-gray-500 ml-1">({schedule.schedule_description})</span>}
          </div>
        </div>

        <label className="block text-xs font-medium text-gray-600">
          <span>Cron 표현식 (분 시 일 월 요일)</span>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={expr}
              onChange={(e) => setExpr(e.target.value)}
              placeholder="0 3 * * *"
              maxLength={120}
              required
              className="flex-1 px-3 py-2 text-sm font-mono border border-gray-300 rounded-lg
                focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            />
            <button
              type="button"
              onClick={handlePreview}
              disabled={!expr.trim() || previewMutation.isPending}
              className="px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg
                hover:bg-gray-50 min-h-[36px] disabled:opacity-50
                focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              미리보기
            </button>
          </div>
        </label>

        {preview && (
          <div
            role="status"
            aria-live="polite"
            className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-900 space-y-1"
          >
            <div><span className="font-semibold">{preview.description}</span> 에 실행됩니다.</div>
            {preview.nextRuns.length > 0 && (
              <div>
                <span className="text-blue-700/70">다음 3회: </span>
                {preview.nextRuns.map((t, i) => (
                  <span key={i} className="font-mono mr-2">
                    {new Date(t).toLocaleString("ko-KR")}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500"
          />
          활성화
        </label>

        {error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <ModalActions
          onClose={onClose}
          isPending={saveMutation.isPending}
          submitLabel="저장"
          pendingLabel="저장 중..."
        />
      </form>
    </Modal>
  );
}
