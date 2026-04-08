"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { adminApi } from "@/lib/api/admin";
import { StatusBadge, SeverityBadge } from "@/components/admin/StatusBadge";

interface Props {
  userId: string;
}

export function AdminUserDetailPage({ userId }: Props) {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin", "user", userId],
    queryFn: () => adminApi.getUser(userId),
  });

  const user = data?.data;

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="p-6">
        <p className="text-red-600">사용자 정보를 불러올 수 없습니다.</p>
        <button
          onClick={() => router.back()}
          className="mt-2 text-sm text-gray-500 hover:underline"
        >
          ← 뒤로
        </button>
      </div>
    );
  }

  return (
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
          <StatusBadge value={user.status} />
        </div>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          <InfoItem label="역할" value={user.role_name} />
          <InfoItem label="마지막 로그인" value={user.last_login_at ? new Date(user.last_login_at).toLocaleString("ko") : "-"} />
          <InfoItem label="가입일" value={new Date(user.created_at).toLocaleDateString("ko")} />
          <InfoItem label="최근 수정" value={new Date(user.updated_at).toLocaleDateString("ko")} />
        </div>
      </div>

      {/* Org Roles */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">조직 역할</h2>
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
    </div>
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
