"use client";

/**
 * API 키 관리 페이지 (Phase 14-15)
 *
 * 기능:
 *  - 활성/폐기 API 키 목록 + 검색/상태 필터
 *  - 생성 모달 → 생성 직후 full_key 1회 표시 (복사 버튼)
 *  - 폐기 모달 — 이름 재확인으로 오인 방지
 *
 * UI 리뷰 5회 원칙:
 *  1) 안전성: full_key 는 1회 표시 후 재확인 불가 경고 문구
 *  2) 권한 분리: SUPER_ADMIN 만 생성/폐기
 *  3) 실수 방지: 폐기 확인 모달에서 키 이름 입력 일치 시에만 활성
 *  4) 반응형: 테이블 overflow-x, 헤더 flex-wrap, 모달 max-w
 *  5) 접근성: role/aria, focus-visible, sr-only, aria-live
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { adminApi } from "@/lib/api/admin";
import { useAuth } from "@/contexts/AuthContext";
import { Modal, ModalActions } from "@/components/feedback/Modal";
import { Pagination } from "@/components/admin/Pagination";
import { useMutationWithToast } from "@/hooks/useMutationWithToast";
import { toast } from "@/stores/uiStore";
import type { ApiKey, ApiKeyWithSecret } from "@/types/admin";
import { cn } from "@/lib/utils";

const SCOPE_LABEL: Record<string, string> = {
  READ_ONLY: "읽기 전용",
  READ_WRITE: "읽기/쓰기",
  "admin.read": "Admin 읽기",
  "admin.write": "Admin 쓰기",
};

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "활성", className: "bg-green-50 text-green-700 border-green-200" },
  REVOKED: { label: "폐기됨", className: "bg-gray-100 text-gray-500 border-gray-200" },
  EXPIRED: { label: "만료", className: "bg-amber-50 text-amber-700 border-amber-200" },
};

const EXPIRY_OPTIONS = [
  { value: 30, label: "30일" },
  { value: 90, label: "90일" },
  { value: 180, label: "180일" },
  { value: 365, label: "1년" },
  { value: 0, label: "무기한" },
];

function formatDateTime(iso?: string | null): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("ko");
  } catch {
    return iso;
  }
}

function formatRelative(iso?: string | null): string {
  if (!iso) return "-";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (diff < 0) return formatDateTime(iso);
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "방금 전";
  if (mins < 60) return `${mins}분 전`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}시간 전`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}일 전`;
  return formatDateTime(iso);
}

export function AdminApiKeysPage() {
  const { hasRole } = useAuth();
  const canEdit = hasRole?.("SUPER_ADMIN") ?? false;

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [openCreate, setOpenCreate] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);
  const [issuedKey, setIssuedKey] = useState<ApiKeyWithSecret | null>(null);

  const keysQuery = useQuery({
    queryKey: ["admin", "api-keys", page, status, search],
    queryFn: () =>
      adminApi.getApiKeys({ page, page_size: 20, status: status || undefined, search: search || undefined }),
  });

  const items = keysQuery.data?.data ?? [];
  const total = keysQuery.data?.total ?? 0;

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">API 키 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            외부 시스템이 Mimir API 를 호출할 때 사용하는 키를 발급 · 폐기합니다.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setOpenCreate(true)}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            + API 키 생성
          </button>
        )}
      </header>

      {/* 필터 */}
      <section
        aria-label="API 키 필터"
        className="bg-white rounded-xl border border-gray-200 p-4"
      >
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-xs text-gray-500">
            <span className="block mb-1">이름/발급자</span>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="예: 검색 API"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-56"
            />
          </label>
          <label className="text-xs text-gray-500">
            <span className="block mb-1">상태</span>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">전체</option>
              <option value="ACTIVE">활성</option>
              <option value="REVOKED">폐기됨</option>
              <option value="EXPIRED">만료</option>
            </select>
          </label>
          {(status || search) && (
            <button
              onClick={() => { setStatus(""); setSearch(""); setPage(1); }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              초기화
            </button>
          )}
        </div>
      </section>

      {/* 목록 */}
      <section aria-labelledby="keys-heading">
        <h2 id="keys-heading" className="sr-only">API 키 목록</h2>
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-sm text-gray-500" role="status" aria-live="polite">
            총 {total} 건{keysQuery.isFetching ? " (새로고침 중...)" : ""}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">이름</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">프리픽스</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">범위</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">발급자</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">마지막 사용</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">만료</th>
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">상태</th>
                  <th scope="col" className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase">작업</th>
                </tr>
              </thead>
              <tbody>
                {keysQuery.isLoading ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400" role="status">로딩 중...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">등록된 API 키가 없습니다.</td></tr>
                ) : items.map((k) => {
                  const st = STATUS_LABEL[k.status] ?? { label: k.status, className: "bg-gray-50 text-gray-600 border-gray-200" };
                  return (
                    <tr key={k.id} className="border-b border-gray-100 hover:bg-gray-50/60">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-gray-800">{k.name}</div>
                        {k.description && <div className="text-xs text-gray-400">{k.description}</div>}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{k.key_prefix}...</td>
                      <td className="px-4 py-2.5">{SCOPE_LABEL[k.scope] ?? k.scope}</td>
                      <td className="px-4 py-2.5">{k.issuer_name ?? "-"}</td>
                      <td className="px-4 py-2.5 text-gray-600">{formatRelative(k.last_used_at)}</td>
                      <td className="px-4 py-2.5 text-gray-600">{k.expires_at ? formatDateTime(k.expires_at) : "무기한"}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs border", st.className)}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {canEdit && k.status === "ACTIVE" ? (
                          <button
                            onClick={() => setRevokeTarget(k)}
                            className="text-xs text-red-600 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 px-2 py-1 rounded"
                          >
                            폐기
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={20} total={total} onPageChange={setPage} />
        </div>
      </section>

      {/* 생성 모달 */}
      {openCreate && (
        <CreateApiKeyModal
          onClose={() => setOpenCreate(false)}
          onIssued={(issued) => {
            setOpenCreate(false);
            setIssuedKey(issued);
            keysQuery.refetch();
          }}
        />
      )}

      {/* 발급된 키 1회 표시 */}
      {issuedKey && (
        <IssuedKeyModal issued={issuedKey} onClose={() => setIssuedKey(null)} />
      )}

      {/* 폐기 모달 */}
      {revokeTarget && (
        <RevokeApiKeyModal
          target={revokeTarget}
          onClose={() => setRevokeTarget(null)}
          onRevoked={() => {
            setRevokeTarget(null);
            keysQuery.refetch();
          }}
        />
      )}
    </div>
  );
}

// ─── 생성 모달 ───────────────────────────────────────────────────

function CreateApiKeyModal({
  onClose,
  onIssued,
}: {
  onClose: () => void;
  onIssued: (k: ApiKeyWithSecret) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState("READ_ONLY");
  const [expiresInDays, setExpiresInDays] = useState(90);

  const mutation = useMutationWithToast({
    mutationFn: () =>
      adminApi.createApiKey({
        name: name.trim(),
        description: description.trim() || undefined,
        scope,
        expires_in_days: expiresInDays,
      }),
    successMessage: "API 키가 발급되었습니다.",
    onSuccess: (resp) => onIssued(resp.data),
  });

  const canSubmit = name.trim().length > 0 && !mutation.isPending;

  return (
    <Modal title="API 키 생성" onClose={onClose} maxWidth="max-w-md">
      <form
        onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutation.mutate(); }}
        className="space-y-3"
      >
        <label className="block">
          <span className="text-xs text-gray-500">이름 <span className="text-red-500">*</span></span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            placeholder="예: 검색 API"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">설명</span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            placeholder="키 사용 용도"
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-gray-500">범위</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="READ_ONLY">읽기 전용</option>
              <option value="READ_WRITE">읽기/쓰기</option>
              <option value="admin.read">Admin 읽기</option>
              <option value="admin.write">Admin 쓰기</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">만료</span>
            <select
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {EXPIRY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>
        <div
          className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2"
          role="note"
        >
          ⚠️ 생성된 키는 <strong>한 번만</strong> 표시됩니다. 안전한 곳에 즉시 복사하세요.
        </div>
        <ModalActions
          onClose={onClose}
          isPending={mutation.isPending}
          submitLabel="생성"
        />
      </form>
    </Modal>
  );
}

// ─── 발급된 키 1회 표시 모달 ─────────────────────────────────────

function IssuedKeyModal({
  issued,
  onClose,
}: {
  issued: ApiKeyWithSecret;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(issued.full_key);
      setCopied(true);
      toast("키가 클립보드에 복사되었습니다.", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("자동 복사에 실패했습니다. 직접 선택해 복사해 주세요.", "error");
    }
  }

  return (
    <Modal title="API 키가 발급되었습니다" onClose={onClose} maxWidth="max-w-md">
      <div className="space-y-3">
        <div
          className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3"
          role="alert"
        >
          ⚠️ 이 키는 <strong>이 화면에서 한 번만</strong> 표시됩니다. 닫으면 다시 확인할 수 없으니 안전한 곳에 복사해 두세요.
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">이름</div>
          <div className="text-sm text-gray-800">{issued.name}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">API 키</div>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={issued.full_key}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="발급된 API 키"
              className="flex-1 font-mono text-xs border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-700 select-all"
            />
            <button
              onClick={copy}
              className={cn(
                "px-3 py-2 text-xs rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                copied
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50",
              )}
              aria-live="polite"
            >
              {copied ? "복사됨" : "복사"}
            </button>
          </div>
        </div>
        <div className="flex pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-blue-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            닫기
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── 폐기 모달 (이름 재확인) ─────────────────────────────────────

function RevokeApiKeyModal({
  target,
  onClose,
  onRevoked,
}: {
  target: ApiKey;
  onClose: () => void;
  onRevoked: () => void;
}) {
  const [confirmName, setConfirmName] = useState("");
  const [reason, setReason] = useState("");

  const mutation = useMutationWithToast({
    mutationFn: () => adminApi.revokeApiKey(target.id, reason.trim() || undefined),
    successMessage: "API 키가 폐기되었습니다.",
    onSuccess: () => onRevoked(),
  });

  const nameMatches = useMemo(
    () => confirmName.trim() === target.name,
    [confirmName, target.name],
  );
  const canSubmit = nameMatches && !mutation.isPending;

  return (
    <Modal title="API 키 폐기" onClose={onClose} maxWidth="max-w-md">
      <form
        onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutation.mutate(); }}
        className="space-y-3"
      >
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3" role="alert">
          폐기된 키는 즉시 사용이 불가능하며 복구할 수 없습니다.
          확인을 위해 아래에 키 이름 <strong className="font-mono">{target.name}</strong> 를 입력하세요.
        </div>
        <label className="block">
          <span className="text-xs text-gray-500">키 이름 확인</span>
          <input
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </label>
        <label className="block">
          <span className="text-xs text-gray-500">폐기 사유 (선택)</span>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </label>
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 bg-red-700 text-white text-sm font-medium rounded-lg py-2 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            {mutation.isPending ? "폐기 중..." : "폐기"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-600 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
        </div>
      </form>
    </Modal>
  );
}
