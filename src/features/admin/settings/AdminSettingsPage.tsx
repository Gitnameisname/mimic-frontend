"use client";

/**
 * 시스템 설정 페이지 (Phase 14-11)
 *
 * - 카테고리 탭으로 인증/시스템/알림/보안 설정 그룹 표시
 * - 타입에 맞는 입력 컴포넌트 (number/toggle/text/json)
 * - 변경 시 확인 다이얼로그 후 저장
 * - 변경된 항목만 PATCH (낙관적 업데이트 지양 — 서버 응답으로 갱신)
 * - SUPER_ADMIN 외에는 모든 입력이 disabled (백엔드도 admin.write로 차단)
 */

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api/admin";
import { useAuth } from "@/contexts/AuthContext";
import { Modal, ModalActions } from "@/components/feedback/Modal";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import type {
  AllSettingsResponse,
  SettingCategory,
  SettingItem,
  SettingValue,
} from "@/types/admin";

// ---- 한국어 키 라벨 (백엔드 description이 있으면 그것을 우선 사용, 없을 때 fallback) ----

const KEY_LABELS: Record<string, string> = {
  session_timeout_minutes: "세션 타임아웃 (분)",
  max_login_attempts: "최대 로그인 시도 횟수",
  lockout_duration_minutes: "로그인 잠금 시간 (분)",
  password_min_length: "최소 비밀번호 길이",
  auto_create_gitlab_users: "GitLab 자동 가입",
  platform_name: "플랫폼 이름",
  default_user_role: "신규 사용자 기본 역할",
  maintenance_mode: "유지보수 모드",
  email_enabled: "이메일 알림",
  webhook_enabled: "웹훅 알림",
  api_rate_limit_per_minute: "API 분당 요청 제한",
  require_email_verification: "이메일 인증 필수",
};

function valueType(v: SettingValue): "bool" | "number" | "string" | "json" {
  if (typeof v === "boolean") return "bool";
  if (typeof v === "number") return "number";
  if (typeof v === "string") return "string";
  return "json";
}

// ---------------------------------------------------------------
// 토글 (boolean) 입력
// ---------------------------------------------------------------

function ToggleInput({
  checked,
  onChange,
  disabled,
  ariaLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
        focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:outline-none
        ${checked ? "bg-red-600" : "bg-gray-300"}
        ${disabled ? "opacity-50 cursor-not-allowed" : "active:scale-95"}`}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200
          ${checked ? "translate-x-5" : "translate-x-0.5"}`}
      />
    </button>
  );
}

// ---------------------------------------------------------------
// 단일 설정 행
// ---------------------------------------------------------------

interface SettingRowProps {
  item: SettingItem;
  draftValue: SettingValue;
  isDirty: boolean;
  isInvalid: boolean;
  errorText?: string;
  onChange: (v: SettingValue) => void;
  disabled: boolean;
}

function SettingRow({
  item,
  draftValue,
  isDirty,
  isInvalid,
  errorText,
  onChange,
  disabled,
}: SettingRowProps) {
  const label = item.description ?? KEY_LABELS[item.key] ?? item.key;
  const t = valueType(item.value);
  const fieldId = `setting-${item.key}`;

  let input: React.ReactNode;
  if (t === "bool") {
    input = (
      <ToggleInput
        checked={Boolean(draftValue)}
        onChange={onChange}
        disabled={disabled}
        ariaLabel={label}
      />
    );
  } else if (t === "number") {
    input = (
      <input
        id={fieldId}
        type="number"
        inputMode="numeric"
        value={typeof draftValue === "number" ? draftValue : Number(draftValue) || 0}
        onChange={(e) => {
          const n = e.target.value === "" ? NaN : Number(e.target.value);
          onChange(Number.isFinite(n) ? n : (draftValue as number));
        }}
        disabled={disabled}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? `${fieldId}-err` : undefined}
        className={`w-32 px-3 py-1.5 text-sm font-mono border rounded-lg
          focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none
          disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
          ${isInvalid ? "border-red-400 bg-red-50" : "border-gray-300"}`}
      />
    );
  } else {
    input = (
      <input
        id={fieldId}
        type="text"
        value={typeof draftValue === "string" ? draftValue : String(draftValue ?? "")}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? `${fieldId}-err` : undefined}
        className={`w-full max-w-xs px-3 py-1.5 text-sm border rounded-lg
          focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none
          disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed
          ${isInvalid ? "border-red-400 bg-red-50" : "border-gray-300"}`}
      />
    );
  }

  return (
    <tr
      className={`border-b border-gray-100 last:border-b-0 hover:bg-gray-50/60 transition-colors
        ${isDirty ? "bg-amber-50/40" : ""}`}
    >
      <td className="px-4 py-3 align-top">
        <div className="flex items-center gap-2 flex-wrap">
          <label
            htmlFor={fieldId}
            className="text-sm font-medium text-gray-900"
          >
            {label}
          </label>
          {isDirty && (
            <span
              className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded"
              aria-label="변경됨"
            >
              변경됨
            </span>
          )}
        </div>
        <div className="text-xs text-gray-400 font-mono mt-0.5">{item.key}</div>
      </td>
      <td className="px-4 py-3 align-top w-48">
        <div className="flex flex-col gap-1">
          {input}
          {isInvalid && errorText && (
            <p
              id={`${fieldId}-err`}
              role="alert"
              className="text-xs text-red-600"
            >
              {errorText}
            </p>
          )}
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="text-xs text-gray-500">
          현재 값:{" "}
          <span className="font-mono text-gray-700">
            {String(item.value)}
          </span>
        </div>
        {item.updated_at && (
          <div className="text-[11px] text-gray-400 mt-0.5">
            업데이트: {new Date(item.updated_at).toLocaleString("ko-KR")}
          </div>
        )}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------
// 변경 확인 다이얼로그
// ---------------------------------------------------------------

interface ConfirmModalProps {
  changes: Array<{ category: string; item: SettingItem; newValue: SettingValue }>;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

function ConfirmModal({ changes, onClose, onConfirm, isPending }: ConfirmModalProps) {
  return (
    <Modal title="설정을 변경하시겠습니까?" onClose={onClose} maxWidth="max-w-lg">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isPending) onConfirm();
        }}
        className="space-y-3"
      >
        <p className="text-sm text-gray-600">
          다음 {changes.length}개 항목이 저장됩니다. 일부 설정은 캐시 TTL(5분) 경과 후 적용될 수 있습니다.
        </p>
        <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {changes.map((c) => {
            const label = c.item.description ?? KEY_LABELS[c.item.key] ?? c.item.key;
            return (
              <li
                key={`${c.category}.${c.item.key}`}
                className="text-sm bg-gray-50 rounded-lg px-3 py-2 border border-gray-200"
              >
                <div className="font-medium text-gray-900">{label}</div>
                <div className="text-xs text-gray-500 font-mono mt-1">
                  <span className="text-gray-400">{c.category}.</span>
                  {c.item.key}
                </div>
                <div className="text-xs mt-1 flex items-center gap-2 flex-wrap">
                  <span className="text-gray-500 line-through font-mono">
                    {String(c.item.value)}
                  </span>
                  <span className="text-gray-400">→</span>
                  <span className="text-red-700 font-mono font-semibold">
                    {String(c.newValue)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
        <ModalActions
          onClose={onClose}
          isPending={isPending}
          submitLabel="저장"
          destructive
        />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------
// 메인 페이지
// ---------------------------------------------------------------

export function AdminSettingsPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole?.("SUPER_ADMIN") ?? false;

  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: () => adminApi.getAllSettings(),
  });

  const categories: SettingCategory[] = data?.data?.categories ?? [];
  const [activeTab, setActiveTab] = useState<string>("");
  const [drafts, setDrafts] = useState<Record<string, SettingValue>>({}); // "category.key" → value
  const [showConfirm, setShowConfirm] = useState(false);

  // F-05 시정(2026-04-18): 첫 로드 시 activeTab 기본값을 useEffect 동기 setState 로
  //   할당하면 set-state-in-effect 위반. 선택된 탭이 유효하지 않거나 비어 있으면
  //   렌더 단계에서 "첫 카테고리" 로 fallback 하여 표시. 사용자가 탭을 클릭하면
  //   setActiveTab 으로 상태가 실제 채워진다.
  const effectiveTab =
    activeTab && categories.some((c) => c.name === activeTab)
      ? activeTab
      : categories[0]?.name ?? "";

  // 변경 항목 산출
  const dirtyChanges = useMemo(() => {
    const out: Array<{ category: string; item: SettingItem; newValue: SettingValue }> = [];
    for (const cat of categories) {
      for (const item of cat.items) {
        const k = `${cat.name}.${item.key}`;
        if (k in drafts && !valuesEqual(drafts[k], item.value)) {
          out.push({ category: cat.name, item, newValue: drafts[k] });
        }
      }
    }
    return out;
  }, [drafts, categories]);

  const dirtyCount = dirtyChanges.length;

  // 단건 PATCH 직렬 처리 — 부분 실패도 정확히 보고
  const saveMutation = useMutationWithToast({
    mutationFn: async () => {
      const successes: string[] = [];
      const failures: Array<{ key: string; reason: string }> = [];
      for (const c of dirtyChanges) {
        try {
          await adminApi.updateSetting(c.category, c.item.key, c.newValue);
          successes.push(`${c.category}.${c.item.key}`);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "알 수 없는 오류";
          failures.push({ key: `${c.category}.${c.item.key}`, reason: msg });
        }
      }
      if (failures.length > 0) {
        throw new Error(
          `${successes.length}건 성공 / ${failures.length}건 실패: ${failures
            .map((f) => f.key)
            .join(", ")}`,
        );
      }
      return { saved: successes.length };
    },
    successMessage: "설정이 저장되었습니다.",
    errorMessage: "일부 설정 저장에 실패했습니다.",
    invalidateKeys: [["admin", "settings"]],
    onSuccess: () => {
      setDrafts({});
      setShowConfirm(false);
      // 캐시 서버 측 invalidation은 백엔드가 처리. queryClient도 즉시 refetch.
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
  });

  function setDraft(category: string, key: string, value: SettingValue) {
    setDrafts((prev) => ({ ...prev, [`${category}.${key}`]: value }));
  }

  function resetAll() {
    setDrafts({});
  }

  // ------- 렌더링 -------

  if (isError) {
    return (
      <div className="p-4 sm:p-6">
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-xl p-6 text-center"
        >
          <p className="text-sm text-red-700 font-medium">설정을 불러오지 못했습니다.</p>
          <button
            onClick={() => refetch()}
            className="mt-3 px-4 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const activeCategory = categories.find((c) => c.name === effectiveTab);

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
            시스템 설정
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            플랫폼 전반의 동작을 제어하는 관리자 설정입니다.
            {!canEdit && (
              <span className="ml-2 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                읽기 전용 — SUPER_ADMIN만 변경 가능
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {dirtyCount > 0 && (
            <span
              className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg"
              aria-live="polite"
            >
              변경 {dirtyCount}건
            </span>
          )}
          <button
            type="button"
            onClick={resetAll}
            disabled={dirtyCount === 0 || saveMutation.isPending}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg
              hover:bg-gray-50 transition-colors min-h-[40px]
              focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed"
          >
            되돌리기
          </button>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            disabled={!canEdit || dirtyCount === 0 || saveMutation.isPending}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg
              hover:bg-red-700 transition-colors min-h-[40px]
              focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            저장
          </button>
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div
        role="tablist"
        aria-label="설정 카테고리"
        className="flex items-center gap-1 border-b border-gray-200 overflow-x-auto"
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-9 w-20 bg-gray-100 rounded animate-pulse"
                role="status"
                aria-label="로딩 중"
              />
            ))
          : categories.map((cat) => {
              const dirtyInCat = Object.keys(drafts).filter((k) => {
                if (!k.startsWith(`${cat.name}.`)) return false;
                const item = cat.items.find((i) => i.key === k.slice(cat.name.length + 1));
                return item && !valuesEqual(drafts[k], item.value);
              }).length;
              const active = cat.name === effectiveTab;
              return (
                <button
                  key={cat.name}
                  role="tab"
                  aria-selected={active}
                  aria-controls={`tabpanel-${cat.name}`}
                  id={`tab-${cat.name}`}
                  onClick={() => setActiveTab(cat.name)}
                  className={`relative px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap
                    focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded-t-md
                    ${active
                      ? "text-red-600 border-b-2 border-red-600 -mb-px"
                      : "text-gray-500 hover:text-gray-900"}`}
                >
                  {cat.label}
                  {dirtyInCat > 0 && (
                    <span
                      className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1
                        text-[10px] font-semibold text-white bg-amber-500 rounded-full"
                      aria-label={`변경 ${dirtyInCat}건`}
                    >
                      {dirtyInCat}
                    </span>
                  )}
                </button>
              );
            })}
      </div>

      {/* 활성 탭 패널 */}
      <div
        id={activeCategory ? `tabpanel-${activeCategory.name}` : undefined}
        role="tabpanel"
        aria-labelledby={activeCategory ? `tab-${activeCategory.name}` : undefined}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      >
        {isLoading ? (
          <div className="p-8 space-y-3" role="status" aria-label="설정 로딩 중">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 bg-gray-50 rounded animate-pulse"
                style={{ animationDelay: `${i * 60}ms` }}
              />
            ))}
            <span className="sr-only">설정을 불러오는 중입니다.</span>
          </div>
        ) : !activeCategory ? (
          <div className="p-8 text-center text-sm text-gray-400">
            표시할 설정이 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    설정 항목
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-48"
                  >
                    값
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    상세
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeCategory.items.map((item) => {
                  const dKey = `${activeCategory.name}.${item.key}`;
                  const draftValue = dKey in drafts ? drafts[dKey] : item.value;
                  const dirty = dKey in drafts && !valuesEqual(drafts[dKey], item.value);

                  // 타입 검증 (UI 단계에서 즉시 피드백)
                  const tOrig = valueType(item.value);
                  const tDraft = valueType(draftValue);
                  const invalid =
                    tOrig !== tDraft ||
                    (tOrig === "number" && !Number.isFinite(draftValue as number));
                  const errorText = invalid
                    ? `값은 ${tOrig === "number" ? "숫자" : tOrig === "bool" ? "true/false" : "문자열"}이어야 합니다.`
                    : undefined;

                  return (
                    <SettingRow
                      key={item.key}
                      item={item}
                      draftValue={draftValue}
                      isDirty={dirty}
                      isInvalid={invalid}
                      errorText={errorText}
                      onChange={(v) => setDraft(activeCategory.name, item.key, v)}
                      disabled={!canEdit || saveMutation.isPending}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmModal
          changes={dirtyChanges}
          onClose={() => !saveMutation.isPending && setShowConfirm(false)}
          onConfirm={() => saveMutation.mutate()}
          isPending={saveMutation.isPending}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// 유틸: 단순 동치 비교 (primitives + JSON serialise)
// ---------------------------------------------------------------

function valuesEqual(a: SettingValue, b: SettingValue): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a === "object" && typeof b === "object") {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}
