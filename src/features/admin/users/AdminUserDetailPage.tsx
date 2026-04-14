"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api/admin";
import { StatusBadge, SeverityBadge } from "@/components/admin/StatusBadge";
import { QueryLoader } from "@/components/feedback/QueryLoader";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  userId: string;
}

const ROLES = ["VIEWER", "AUTHOR", "REVIEWER", "APPROVER", "ORG_ADMIN", "SUPER_ADMIN"] as const;

// ---- 사용자 수정 모달 ----

function EditUserModal({
  userId,
  initial,
  onClose,
}: {
  userId: string;
  initial: { display_name: string; role_name: string; status: string };
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      adminApi.updateUser(userId, {
        display_name: form.display_name.trim(),
        role_name: form.role_name,
        status: form.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">사용자 수정</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            if (!form.display_name.trim()) return setError("이름을 입력하세요.");
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">역할</label>
            <select
              value={form.role_name}
              onChange={(e) => setForm((f) => ({ ...f, role_name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">상태</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              <option value="ACTIVE">활성</option>
              <option value="INACTIVE">비활성</option>
              <option value="SUSPENDED">정지</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 bg-red-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? "저장 중..." : "저장"}
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- 조직 역할 부여 모달 ----

function AssignOrgRoleModal({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [orgId, setOrgId] = useState("");
  const [roleName, setRoleName] = useState("VIEWER");
  const [error, setError] = useState("");

  const { data: orgsData } = useQuery({
    queryKey: ["admin", "orgs-for-assign"],
    queryFn: () => adminApi.getOrgs({ page_size: 100 }),
  });

  const mutation = useMutation({
    mutationFn: () => adminApi.assignOrgRole(userId, { org_id: orgId, role_name: roleName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-5">조직 역할 부여</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            if (!orgId) return setError("조직을 선택하세요.");
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              조직 <span className="text-red-500">*</span>
            </label>
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              <option value="">선택...</option>
              {(orgsData?.data ?? []).map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">역할</label>
            <select
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            >
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={mutation.isPending} className="flex-1 bg-red-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-red-700 disabled:opacity-50 transition-colors">
              {mutation.isPending ? "처리 중..." : "부여"}
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors">
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- 메인 페이지 ----

export function AdminUserDetailPage({ userId }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const canDelete = hasRole?.("SUPER_ADMIN") ?? false;
  const [showEdit, setShowEdit] = useState(false);
  const [showAssignOrg, setShowAssignOrg] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const query = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => adminApi.getUser(userId),
  });

  const removeOrgRoleMutation = useMutation({
    mutationFn: (orgId: string) => adminApi.removeOrgRole(userId, orgId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "user", userId] }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteUser(userId),
    onSuccess: () => router.push("/admin/users"),
  });

  return (
    <QueryLoader
      query={{ isLoading: query.isLoading, isError: query.isError, data: query.data?.data, refetch: query.refetch }}
      error={
        <div className="p-6">
          <p className="text-red-600">사용자 정보를 불러올 수 없습니다.</p>
          <button onClick={() => router.back()} className="mt-2 text-sm text-gray-500 hover:underline">
            ← 뒤로
          </button>
        </div>
      }
    >
    {(user) => (
    <div className="p-6 space-y-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        사용자 목록
      </button>

      {/* User Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{user.display_name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge value={user.status} />
            <button
              onClick={() => setShowEdit(true)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              수정
            </button>
            {canDelete && (
              <button
                onClick={() => setDeleteConfirm(true)}
                title="SUPER_ADMIN만 사용 가능"
                className="px-3 py-1.5 text-sm border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors min-h-[36px]"
              >
                삭제
              </button>
            )}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoItem label="역할" value={user.role_name} />
          <InfoItem
            label="마지막 로그인"
            value={user.last_login_at ? new Date(user.last_login_at).toLocaleString("ko") : "-"}
          />
          <InfoItem label="가입일" value={new Date(user.created_at).toLocaleDateString("ko")} />
          <InfoItem label="최근 수정" value={new Date(user.updated_at).toLocaleDateString("ko")} />
        </div>
      </div>

      {/* Org Roles */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">조직 역할</h2>
          <button
            onClick={() => setShowAssignOrg(true)}
            className="text-xs text-red-600 font-medium hover:text-red-700 transition-colors"
          >
            + 조직 역할 부여
          </button>
        </div>
        {user.org_roles.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">소속 조직이 없습니다.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">조직</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">역할</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">합류일</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 uppercase">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {user.org_roles.map((or) => (
                <tr key={or.org_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-700">{or.org_name}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                      {or.role_name}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {new Date(or.joined_at).toLocaleDateString("ko")}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => removeOrgRoleMutation.mutate(or.org_id)}
                      disabled={removeOrgRoleMutation.isPending}
                      className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                    >
                      제거
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Audit Events */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">최근 감사 이벤트</h2>
        </div>
        {user.recent_audit_events.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">감사 이벤트가 없습니다.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">이벤트</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">심각도</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">결과</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">시간</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {user.recent_audit_events.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-medium text-gray-700">{log.event_type}</td>
                  <td className="px-4 py-2.5">
                    <SeverityBadge severity={log.severity} />
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge value={log.result} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">
                    {new Date(log.created_at).toLocaleString("ko")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 수정 모달 */}
      {showEdit && (
        <EditUserModal
          userId={userId}
          initial={{ display_name: user.display_name, role_name: user.role_name, status: user.status }}
          onClose={() => setShowEdit(false)}
        />
      )}

      {/* 조직 역할 부여 모달 */}
      {showAssignOrg && (
        <AssignOrgRoleModal userId={userId} onClose={() => setShowAssignOrg(false)} />
      )}

      {/* 삭제 확인 */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">사용자 삭제</h2>
            <p className="text-sm text-gray-600 mb-5">
              <strong>{user.display_name}</strong> ({user.email}) 계정을 삭제합니다.
              이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 bg-red-600 text-white text-sm font-medium rounded-lg py-2 hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? "삭제 중..." : "삭제"}
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 border border-gray-200 text-gray-600 text-sm rounded-lg py-2 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    )}
    </QueryLoader>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-700">{value}</p>
    </div>
  );
}
