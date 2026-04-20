"use client";

/**
 * 알림 관리 페이지 (Phase 14-13)
 *
 * 구성:
 *  - 탭: 규칙(rules) | 이력(history)
 *  - 규칙 탭: 목록 + 추가/편집/삭제 + 활성화 토글 + 즉시 평가
 *  - 이력 탭: 상태/심각도/기간 필터 + 페이지네이션 + 확인(acknowledge)
 *
 * UI 설계 원칙 (CLAUDE.md §4 — 리뷰 5회):
 *  1) 정보 밀도: 두 탭으로 도메인 분리
 *  2) 권한 분리: SUPER_ADMIN 만 편집/삭제/생성 가능
 *  3) 안전성: 삭제 시 destructive 모달 확인, 웹훅 URL 미리보기
 *  4) 반응형: 모바일에서 테이블은 overflow-x-auto
 *  5) 접근성: role/aria 속성, focus-visible, aria-live 피드백
 */

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApi } from "@/lib/api/admin";
import { useAuth } from "@/contexts/AuthContext";
import { Modal, ModalActions } from "@/components/feedback/Modal";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import type {
  AlertRule,
  AlertHistoryItem,
  AlertCondition,
  AlertOperator,
  AlertSeverity,
  AlertChannel,
  AlertStatus,
} from "@/types/admin";

// ─── 상수 ──────────────────────────────────────────────────────────

const OPERATOR_LABELS: Record<AlertOperator, string> = {
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  eq: "=",
  ne: "≠",
};

const SEVERITY_OPTIONS: { value: AlertSeverity; label: string; className: string }[] = [
  { value: "info", label: "정보", className: "bg-blue-100 text-blue-700" },
  { value: "warning", label: "경고", className: "bg-amber-100 text-amber-700" },
  { value: "critical", label: "심각", className: "bg-red-100 text-red-700" },
];

const STATUS_OPTIONS: { value: AlertStatus | ""; label: string }[] = [
  { value: "", label: "전체" },
  { value: "firing", label: "Firing" },
  { value: "resolved", label: "Resolved" },
];

function severityBadge(severity: AlertSeverity | null | undefined) {
  const match = SEVERITY_OPTIONS.find((s) => s.value === severity);
  return match ?? { value: "info" as AlertSeverity, label: "-", className: "bg-gray-100 text-gray-600" };
}

// ─── 메인 페이지 ───────────────────────────────────────────────────

export function AdminAlertsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole?.("SUPER_ADMIN") ?? false;

  const [tab, setTab] = useState<"rules" | "history">("rules");

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <header>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">알림 관리</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          시스템 메트릭 기반 알림 규칙을 정의하고 발생 이력을 추적합니다.
        </p>
      </header>

      {/* 탭 */}
      <div
        role="tablist"
        aria-label="알림 관리 섹션"
        className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5 w-fit"
      >
        {(["rules", "history"] as const).map((v) => (
          <button
            key={v}
            role="tab"
            aria-selected={tab === v}
            type="button"
            onClick={() => setTab(v)}
            className={`px-4 py-1.5 text-sm font-medium rounded min-h-[36px]
              focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none
              ${tab === v
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"}`}
          >
            {v === "rules" ? "규칙" : "이력"}
          </button>
        ))}
      </div>

      {tab === "rules" ? (
        <RulesTab canEdit={canEdit} />
      ) : (
        <HistoryTab canEdit={canEdit} />
      )}
    </div>
  );
}

// ─── 규칙 탭 ──────────────────────────────────────────────────────

function RulesTab({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();

  const rulesQuery = useQuery({
    queryKey: ["admin", "alerts", "rules"],
    queryFn: () => adminApi.getAlertRules(),
  });
  const metricsQuery = useQuery({
    queryKey: ["admin", "alerts", "metrics"],
    queryFn: () => adminApi.getAlertMetrics(),
  });

  const [editing, setEditing] = useState<AlertRule | null>(null);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<AlertRule | null>(null);

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      adminApi.updateAlertRule(id, { enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "alerts", "rules"] }),
  });

  const deleteMutation = useMutationWithToast({
    mutationFn: (id: string) => adminApi.deleteAlertRule(id),
    successMessage: "규칙이 삭제되었습니다.",
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "alerts", "rules"] }),
  });

  const evaluateMutation = useMutationWithToast({
    mutationFn: () => adminApi.evaluateAlertsNow(),
    successMessage: "평가가 완료되었습니다.",
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "alerts", "rules"] });
      qc.invalidateQueries({ queryKey: ["admin", "alerts", "history"] });
    },
  });

  const rules = rulesQuery.data?.data ?? [];
  const metrics = metricsQuery.data?.data?.metrics ?? [];

  return (
    <section aria-labelledby="rules-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 id="rules-heading" className="text-sm font-semibold text-gray-700">
          규칙 ({rules.length})
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => evaluateMutation.mutate()}
            disabled={evaluateMutation.isPending}
            className="px-3 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg
              hover:bg-gray-50 transition-colors min-h-[36px] disabled:opacity-50
              focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            즉시 평가
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={() => setIsNewOpen(true)}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg
                hover:bg-blue-700 transition-colors min-h-[36px]
                focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              + 규칙 추가
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">이름</th>
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">메트릭</th>
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">조건</th>
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">심각도</th>
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">채널</th>
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">활성</th>
                <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">작업</th>
              </tr>
            </thead>
            <tbody>
              {rulesQuery.isLoading ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400" role="status">로딩 중...</td></tr>
              ) : rules.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-400">
                  등록된 알림 규칙이 없습니다.
                </td></tr>
              ) : rules.map((r) => {
                const sev = severityBadge(r.severity);
                return (
                  <tr key={r.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2.5 text-sm text-gray-900 font-medium">{r.name}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-gray-600">{r.metric_name}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-gray-700">
                      {OPERATOR_LABELS[r.condition.operator]} {r.condition.threshold}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${sev.className}`}>
                        {sev.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">
                      {r.channels.length ? r.channels.join(", ") : <span className="text-gray-300">없음</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={r.enabled}
                        aria-label={`${r.name} ${r.enabled ? "비활성화" : "활성화"}`}
                        disabled={!canEdit || toggleMutation.isPending}
                        onClick={() => toggleMutation.mutate({ id: r.id, enabled: !r.enabled })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                          focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none
                          disabled:opacity-50 ${r.enabled ? "bg-blue-600" : "bg-gray-300"}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform
                            ${r.enabled ? "translate-x-5" : "translate-x-1"}`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {canEdit && (
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditing(r)}
                            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded
                              focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                          >
                            편집
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(r)}
                            className="px-2 py-1 text-xs text-red-700 hover:bg-red-50 rounded
                              focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                          >
                            삭제
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(isNewOpen || editing) && (
        <RuleEditorModal
          metrics={metrics}
          rule={editing}
          onClose={() => { setIsNewOpen(false); setEditing(null); }}
          onSaved={() => {
            setIsNewOpen(false);
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["admin", "alerts", "rules"] });
          }}
        />
      )}

      {confirmDelete && (
        <Modal
          title="알림 규칙을 삭제하시겠습니까?"
          onClose={() => setConfirmDelete(null)}
          maxWidth="max-w-md"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!deleteMutation.isPending) {
                deleteMutation.mutate(confirmDelete.id, {
                  onSuccess: () => setConfirmDelete(null),
                });
              }
            }}
            className="space-y-3"
          >
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{confirmDelete.name}</span> 규칙과 모든 관련 이력이 함께 삭제됩니다.
            </p>
            <p className="text-xs text-gray-500">이 작업은 되돌릴 수 없습니다.</p>
            <ModalActions
              onClose={() => setConfirmDelete(null)}
              isPending={deleteMutation.isPending}
              submitLabel="삭제"
              pendingLabel="삭제 중..."
              destructive
            />
          </form>
        </Modal>
      )}
    </section>
  );
}

// ─── 규칙 편집 모달 ─────────────────────────────────────────────────

interface RuleEditorProps {
  metrics: { name: string; label: string }[];
  rule: AlertRule | null;
  onClose: () => void;
  onSaved: () => void;
}

function RuleEditorModal({ metrics, rule, onClose, onSaved }: RuleEditorProps) {
  const isEdit = rule !== null;
  const [name, setName] = useState(rule?.name ?? "");
  const [description, setDescription] = useState(rule?.description ?? "");
  const [metricName, setMetricName] = useState(rule?.metric_name ?? metrics[0]?.name ?? "");
  const [operator, setOperator] = useState<AlertOperator>(rule?.condition.operator ?? "gt");
  const [threshold, setThreshold] = useState<string>(String(rule?.condition.threshold ?? ""));
  const [severity, setSeverity] = useState<AlertSeverity>(rule?.severity ?? "warning");
  const [channels, setChannels] = useState<AlertChannel[]>(rule?.channels ?? []);
  const [emailRecipients, setEmailRecipients] = useState<string>(
    Array.isArray((rule?.channel_config as { email_recipients?: string[] } | undefined)?.email_recipients)
      ? ((rule!.channel_config as { email_recipients: string[] }).email_recipients).join(", ")
      : ""
  );
  const [webhookUrl, setWebhookUrl] = useState<string>(
    typeof (rule?.channel_config as { webhook_url?: string } | undefined)?.webhook_url === "string"
      ? (rule!.channel_config as { webhook_url: string }).webhook_url
      : ""
  );
  const [enabled, setEnabled] = useState<boolean>(rule?.enabled ?? true);
  const [error, setError] = useState<string | null>(null);

  const saveMutation = useMutationWithToast({
    mutationFn: async () => {
      const thresholdNum = Number(threshold);
      if (!Number.isFinite(thresholdNum)) {
        throw new Error("threshold 는 숫자여야 합니다.");
      }
      if (!name.trim()) throw new Error("이름을 입력하세요.");

      const condition: AlertCondition = { operator, threshold: thresholdNum };
      const channel_config: Record<string, unknown> = {};
      if (channels.includes("email")) {
        channel_config.email_recipients = emailRecipients
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s.includes("@"));
      }
      if (channels.includes("webhook")) {
        channel_config.webhook_url = webhookUrl.trim();
      }

      if (isEdit && rule) {
        return adminApi.updateAlertRule(rule.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          metric_name: metricName,
          condition,
          severity,
          channels,
          channel_config,
          enabled,
        });
      } else {
        return adminApi.createAlertRule({
          name: name.trim(),
          description: description.trim() || undefined,
          metric_name: metricName,
          condition,
          severity,
          channels,
          channel_config,
          enabled,
        });
      }
    },
    successMessage: isEdit ? "규칙이 업데이트되었습니다." : "규칙이 생성되었습니다.",
    onSuccess: () => onSaved(),
  });

  function toggleChannel(ch: AlertChannel) {
    setChannels((prev) => prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch]);
  }

  return (
    <Modal
      title={isEdit ? "알림 규칙 편집" : "새 알림 규칙"}
      onClose={onClose}
      maxWidth="max-w-xl"
    >
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
        <Field label="이름" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={255}
            required
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
              focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          />
        </Field>

        <Field label="설명">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
              focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="메트릭" required>
            <select
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white
                focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              {metrics.map((m) => (
                <option key={m.name} value={m.name}>{m.label}</option>
              ))}
            </select>
          </Field>
          <Field label="심각도" required>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as AlertSeverity)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white
                focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2 items-end">
          <Field label="연산자" required>
            <select
              value={operator}
              onChange={(e) => setOperator(e.target.value as AlertOperator)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white
                focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            >
              {(Object.keys(OPERATOR_LABELS) as AlertOperator[]).map((op) => (
                <option key={op} value={op}>{op} ({OPERATOR_LABELS[op]})</option>
              ))}
            </select>
          </Field>
          <Field label="임계값" required>
            <input
              type="number"
              step="any"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono
                focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
            />
          </Field>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-gray-700">알림 채널</legend>
          <div className="flex items-center gap-4">
            {(["email", "webhook"] as AlertChannel[]).map((ch) => (
              <label key={ch} className="inline-flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={channels.includes(ch)}
                  onChange={() => toggleChannel(ch)}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500"
                />
                {ch === "email" ? "이메일" : "웹훅"}
              </label>
            ))}
          </div>
          {channels.includes("email") && (
            <Field label="이메일 수신자 (콤마 구분)">
              <input
                type="text"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                placeholder="admin@example.com, oncall@example.com"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                  focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              />
            </Field>
          )}
          {channels.includes("webhook") && (
            <Field label="웹훅 URL (HTTPS 권장)">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.example.com/alerts"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono
                  focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
              />
              <p className="mt-1 text-xs text-gray-400">
                내부/루프백 주소는 차단됩니다 (SSRF 방어).
              </p>
            </Field>
          )}
        </fieldset>

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
          submitLabel={isEdit ? "저장" : "생성"}
          pendingLabel={isEdit ? "저장 중..." : "생성 중..."}
        />
      </form>
    </Modal>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-gray-600">
      <span>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

// ─── 이력 탭 ──────────────────────────────────────────────────────

function HistoryTab({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"" | AlertStatus>("");
  const [severity, setSeverity] = useState<"" | AlertSeverity>("");

  const historyQuery = useQuery({
    queryKey: ["admin", "alerts", "history", status, severity],
    queryFn: () =>
      adminApi.getAlertHistory({
        status: status || undefined,
        severity: severity || undefined,
        page: 1,
        page_size: 100,
      }),
  });

  const ackMutation = useMutationWithToast({
    mutationFn: (id: string) => adminApi.acknowledgeAlert(id),
    successMessage: "알림이 확인되었습니다.",
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "alerts", "history"] }),
  });

  const items: AlertHistoryItem[] = historyQuery.data?.data?.items ?? [];
  const total = historyQuery.data?.data?.total ?? 0;

  const counts = useMemo(() => {
    let firing = 0, resolved = 0;
    for (const it of items) {
      if (it.status === "firing") firing++;
      else if (it.status === "resolved") resolved++;
    }
    return { firing, resolved };
  }, [items]);

  return (
    <section aria-labelledby="history-heading" className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 id="history-heading" className="text-sm font-semibold text-gray-700">
          이력 ({total})
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="sr-only" htmlFor="filter-status">상태 필터</label>
          <select
            id="filter-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as "" | AlertStatus)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white min-h-[36px]
              focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>상태: {o.label}</option>
            ))}
          </select>
          <label className="sr-only" htmlFor="filter-severity">심각도 필터</label>
          <select
            id="filter-severity"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as "" | AlertSeverity)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white min-h-[36px]
              focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            <option value="">심각도: 전체</option>
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>심각도: {s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div
        className="flex items-center gap-3 text-xs text-gray-500"
        aria-live="polite"
      >
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" aria-hidden="true" />
          Firing {counts.firing}
        </span>
        <span>
          <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-1" aria-hidden="true" />
          Resolved {counts.resolved}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">발생 시간</th>
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">규칙</th>
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">심각도</th>
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">값</th>
                <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">상태</th>
                <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">작업</th>
              </tr>
            </thead>
            <tbody>
              {historyQuery.isLoading ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-400" role="status">로딩 중...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-400">
                  이력이 없습니다.
                </td></tr>
              ) : items.map((it) => {
                const sev = severityBadge(it.severity);
                const isFiring = it.status === "firing";
                return (
                  <tr key={it.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(it.triggered_at).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-gray-900" title={it.message ?? undefined}>
                      {it.rule_name ?? "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${sev.className}`}>
                        {sev.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono text-gray-700">
                      {it.metric_value?.toFixed(2) ?? "-"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs ${isFiring ? "text-red-700" : "text-gray-500"}`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${isFiring ? "bg-red-500 animate-pulse" : "bg-gray-400"}`} aria-hidden="true" />
                        {isFiring ? "Firing" : "Resolved"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isFiring && !it.acknowledged_at && canEdit ? (
                        <button
                          type="button"
                          onClick={() => ackMutation.mutate(it.id)}
                          disabled={ackMutation.isPending}
                          className="px-2 py-1 text-xs text-red-700 bg-red-50 hover:bg-red-100 rounded
                            focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none
                            disabled:opacity-50"
                        >
                          확인
                        </button>
                      ) : it.acknowledged_at ? (
                        <span className="text-xs text-gray-400">확인됨</span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
